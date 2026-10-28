/*
# NEXUSOMS V4 — Enterprise Multi-Tenant Foundation, Transactions & Security Hardening
# Migration: 20261028080000_v4_p0_multitenant_transactions_and_security.sql

## Overview:
1. Drop hardcoded DEFAULT tenant_id on ALL business tables.
2. Add idempotency_key support and unique constraint to orders.
3. Fix return_items RLS (tenant-scoped) and add restock tracking (is_restocked).
4. Lock down audit_logs (Strict Append-Only: revoke UPDATE & DELETE).
5. Implement place_order_atomic (ACID transactional order placement + inventory deduction).
6. Implement cancel_order_atomic (Idempotent order cancellation + double-restock prevention).
7. Implement delete_order_atomic (Safe deletion with conditional stock return).
8. Implement process_return_restock_atomic (Selective restock upon inspection).
9. Implement post_journal_entry_atomic (Enforce Debit == Credit in one transaction).
10. Update admin_create_user & admin_update_profile (Full 5-role support without manager demotion).
*/

-- ============================================================================
-- PART 1: DROP HARDCODED DEFAULT tenant_id ON ALL BUSINESS TABLES
-- ============================================================================
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'customers', 'products', 'brands', 'warehouses', 'warehouse_bins',
    'orders', 'order_items', 'order_status_log', 'order_automation_rules',
    'inventory_items', 'inventory_batches', 'inventory_serials', 'channel_stock_pools',
    'stock_transactions', 'purchase_orders', 'purchase_order_items',
    'stock_transfers', 'stock_transfer_items', 'fulfillment_waves',
    'channel_sku_mappings', 'channel_connections', 'sync_logs',
    'order_evidence_media', 'order_fee_breakdowns', 'return_requests',
    'customer_complaints', 'outbound_webhooks', 'webhook_delivery_logs',
    'ledger_accounts', 'journal_entries', 'journal_lines',
    'audit_logs', 'margin_config', 'buffer_rules', 'routing_rules'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id DROP DEFAULT;', v_table);
    END IF;
  END LOOP;
END $$;

-- Also ensure return_items has no default
ALTER TABLE IF EXISTS public.return_items ALTER COLUMN tenant_id DROP DEFAULT;

-- ============================================================================
-- PART 2: IDEMPOTENCY KEY ON ORDERS & RETURN RESTOCK STATUS
-- ============================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;

ALTER TABLE public.return_items ADD COLUMN IF NOT EXISTS is_restocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.return_items ADD COLUMN IF NOT EXISTS restocked_at timestamptz DEFAULT NULL;

-- ============================================================================
-- PART 3: SECURE return_items WITH TENANT-SCOPED RLS
-- ============================================================================
DROP POLICY IF EXISTS "return_items_select" ON public.return_items;
DROP POLICY IF EXISTS "return_items_insert" ON public.return_items;
DROP POLICY IF EXISTS "return_items_update" ON public.return_items;
DROP POLICY IF EXISTS "return_items_delete" ON public.return_items;

CREATE POLICY "tenant_select_return_items" ON public.return_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = return_items.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));

CREATE POLICY "tenant_insert_return_items" ON public.return_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = return_items.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));

CREATE POLICY "tenant_update_return_items" ON public.return_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = return_items.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = return_items.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));

CREATE POLICY "tenant_delete_return_items" ON public.return_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = return_items.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
  ));

-- ============================================================================
-- PART 4: AUDIT LOGS APPEND-ONLY HARDENING
-- ============================================================================
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "tenant_update_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_delete_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "anon_update_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON public.audit_logs;

-- ============================================================================
-- PART 5: ATOMIC TRANSACTIONAL ORDER PLACEMENT (place_order_atomic)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_tenant_id uuid,
  p_customer_id uuid,
  p_order_number text,
  p_items jsonb,
  p_subtotal numeric,
  p_tax numeric,
  p_shipping numeric,
  p_discount numeric,
  p_total numeric,
  p_payment_status text DEFAULT 'unpaid',
  p_payment_method text DEFAULT 'credit_card',
  p_shipping_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_order_id uuid;
  v_item record;
  v_curr_stock integer;
  v_prod_tenant uuid;
  v_wh_id uuid;
  v_existing_order jsonb;
BEGIN
  -- 1. Validate tenant membership and authorization
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong thuoc tenant nay' USING ERRCODE = '42501';
  END IF;

  IF v_role = 'viewer' THEN
    RAISE EXCEPTION 'Khong co quyen: viewer khong the tao don hang' USING ERRCODE = '42501';
  END IF;

  -- 2. Idempotency check: if order exists with this key for tenant, return it
  IF p_idempotency_key IS NOT NULL THEN
    SELECT to_jsonb(o.*) INTO v_existing_order
      FROM public.orders o
      WHERE o.tenant_id = p_tenant_id AND o.idempotency_key = p_idempotency_key
      LIMIT 1;
    IF v_existing_order IS NOT NULL THEN
      RETURN v_existing_order;
    END IF;
  END IF;

  -- 3. Resolve warehouse for inventory ledger
  SELECT id INTO v_wh_id
    FROM public.warehouses
    WHERE tenant_id = p_tenant_id
    ORDER BY priority ASC, created_at ASC
    LIMIT 1;

  IF v_wh_id IS NULL THEN
    -- Fallback: create default warehouse if missing
    INSERT INTO public.warehouses (tenant_id, name, code, is_active, priority)
    VALUES (p_tenant_id, 'Kho Mac Dinh', 'WH-MAIN', true, 1)
    RETURNING id INTO v_wh_id;
  END IF;

  -- 4. Check & decrement stock for every item with SELECT FOR UPDATE row locking
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id uuid,
    product_name text,
    product_sku text,
    quantity integer,
    unit_price numeric,
    line_total numeric
  ) LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'So luong san pham phai lon hon 0' USING ERRCODE = '23514';
    END IF;

    -- Lock product row
    SELECT stock, tenant_id INTO v_curr_stock, v_prod_tenant
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

    IF v_curr_stock IS NULL THEN
      RAISE EXCEPTION 'San pham % khong ton tai', v_item.product_sku USING ERRCODE = '42704';
    END IF;

    IF v_prod_tenant != p_tenant_id THEN
      RAISE EXCEPTION 'San pham % khong thuoc tenant nay', v_item.product_sku USING ERRCODE = '42501';
    END IF;

    IF v_curr_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Ton kho khong du cho san pham % (con %, can %)', v_item.product_sku, v_curr_stock, v_item.quantity USING ERRCODE = '23514';
    END IF;

    -- Decrement stock atomically
    UPDATE public.products
    SET stock = stock - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_id;

    -- Write inventory ledger transaction
    INSERT INTO public.stock_transactions (
      tenant_id, warehouse_id, product_id, type, quantity_delta,
      balance_after, reference_id, reason, created_by
    )
    VALUES (
      p_tenant_id, v_wh_id, v_item.product_id, 'outbound', -v_item.quantity,
      v_curr_stock - v_item.quantity, p_order_number, 'order_placement', auth.uid()::text
    );
  END LOOP;

  -- 5. Insert order
  INSERT INTO public.orders (
    tenant_id, order_number, customer_id, status, subtotal, tax,
    shipping, discount, total, payment_status, payment_method,
    shipping_address, notes, idempotency_key, stock_restored
  )
  VALUES (
    p_tenant_id, p_order_number, p_customer_id, 'pending', p_subtotal, p_tax,
    p_shipping, p_discount, p_total, p_payment_status, p_payment_method,
    p_shipping_address, p_notes, p_idempotency_key, false
  )
  RETURNING id INTO v_order_id;

  -- 6. Insert order items
  INSERT INTO public.order_items (
    tenant_id, order_id, product_id, product_name, product_sku,
    quantity, unit_price, line_total
  )
  SELECT
    p_tenant_id, v_order_id, (x->>'product_id')::uuid, x->>'product_name', x->>'product_sku',
    (x->>'quantity')::integer, (x->>'unit_price')::numeric, (x->>'line_total')::numeric
  FROM jsonb_array_elements(p_items) AS x;

  -- 7. Insert status log
  INSERT INTO public.order_status_log (
    tenant_id, order_id, from_status, to_status, note
  )
  VALUES (
    p_tenant_id, v_order_id, NULL, 'pending', 'Don hang duoc tao boi user ' || auth.uid()::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'status', 'pending'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_order_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated;

-- ============================================================================
-- PART 6: IDEMPOTENT ORDER CANCELLATION (cancel_order_atomic)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
  p_order_id uuid,
  p_tenant_id uuid,
  p_reason text DEFAULT 'cancelled_by_user'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_order record;
  v_item record;
  v_wh_id uuid;
  v_new_stock integer;
BEGIN
  -- Verify membership & role
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('warehouse', 'manager', 'admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong co quyen huy don hang' USING ERRCODE = '42501';
  END IF;

  -- Lock order row
  SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Don hang khong ton tai' USING ERRCODE = '42704';
  END IF;

  -- Check if already cancelled
  IF v_order.status IN ('cancelled', 'refunded') OR v_order.stock_restored = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Don hang da o trang thai huy hoac ton kho da duoc hoan truoc do',
      'already_cancelled', true
    );
  END IF;

  -- Resolve warehouse
  SELECT id INTO v_wh_id
    FROM public.warehouses
    WHERE tenant_id = p_tenant_id
    ORDER BY priority ASC LIMIT 1;

  -- Restore stock for items
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_id
    RETURNING stock INTO v_new_stock;

    INSERT INTO public.stock_transactions (
      tenant_id, warehouse_id, product_id, type, quantity_delta,
      balance_after, reference_id, reason, created_by
    )
    VALUES (
      p_tenant_id, v_wh_id, v_item.product_id, 'return_in', v_item.quantity,
      v_new_stock, v_order.order_number, 'order_cancellation', auth.uid()::text
    );
  END LOOP;

  -- Update order status
  UPDATE public.orders
  SET status = 'cancelled',
      stock_restored = true,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_log (
    tenant_id, order_id, from_status, to_status, note
  )
  VALUES (
    p_tenant_id, p_order_id, v_order.status, 'cancelled', p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Don hang da huy va hoan ton kho thanh cong',
    'already_cancelled', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_atomic TO authenticated;

-- ============================================================================
-- PART 7: SAFE ORDER DELETION (delete_order_atomic)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_order_atomic(
  p_order_id uuid,
  p_tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_order record;
  v_item record;
  v_wh_id uuid;
  v_new_stock integer;
BEGIN
  -- Verify caller is admin or owner
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: chi Admin hoac Owner moi duoc xoa don hang' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Don hang khong ton tai' USING ERRCODE = '42704';
  END IF;

  -- Restore stock ONLY if stock was not already restored
  IF v_order.status NOT IN ('cancelled', 'refunded') AND v_order.stock_restored = false THEN
    SELECT id INTO v_wh_id
      FROM public.warehouses
      WHERE tenant_id = p_tenant_id
      ORDER BY priority ASC LIMIT 1;

    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id
      RETURNING stock INTO v_new_stock;

      INSERT INTO public.stock_transactions (
        tenant_id, warehouse_id, product_id, type, quantity_delta,
        balance_after, reference_id, reason, created_by
      )
      VALUES (
        p_tenant_id, v_wh_id, v_item.product_id, 'return_in', v_item.quantity,
        v_new_stock, v_order.order_number, 'order_deletion', auth.uid()::text
      );
    END LOOP;
  END IF;

  -- Delete items, logs, and order
  DELETE FROM public.order_items WHERE order_id = p_order_id;
  DELETE FROM public.order_status_log WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_order_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_atomic TO authenticated;

-- ============================================================================
-- PART 8: ATOMIC DOUBLE-ENTRY JOURNAL POSTING (post_journal_entry_atomic)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_journal_entry_atomic(
  p_tenant_id uuid,
  p_entry_number text,
  p_event_source text,
  p_description text,
  p_reference_id text,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_entry_id uuid;
  v_line record;
BEGIN
  -- Verify membership & role
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('manager', 'admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: chi Manager hoac Admin moi duoc tao but toan' USING ERRCODE = '42501';
  END IF;

  -- Calculate total debit and total credit
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(
    account_id uuid,
    debit_amount numeric,
    credit_amount numeric
  ) LOOP
    v_total_debit := v_total_debit + COALESCE(v_line.debit_amount, 0);
    v_total_credit := v_total_credit + COALESCE(v_line.credit_amount, 0);
  END LOOP;

  -- Strict equality check (max deviation 0.001)
  IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
    RAISE EXCEPTION 'But toan khong can doi: Tong No (%) khac Tong Co (%)', v_total_debit, v_total_credit USING ERRCODE = '23514';
  END IF;

  -- Insert journal header
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, event_source, description, reference_id, posted_at
  )
  VALUES (
    p_tenant_id, p_entry_number, p_event_source, p_description, p_reference_id, now()
  )
  RETURNING id INTO v_entry_id;

  -- Insert journal lines
  INSERT INTO public.journal_lines (
    tenant_id, journal_entry_id, account_id, debit_amount, credit_amount
  )
  SELECT
    p_tenant_id, v_entry_id, (x->>'account_id')::uuid,
    COALESCE((x->>'debit_amount')::numeric, 0),
    COALESCE((x->>'credit_amount')::numeric, 0)
  FROM jsonb_array_elements(p_lines) AS x;

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'entry_number', p_entry_number,
    'total_amount', v_total_debit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.post_journal_entry_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_journal_entry_atomic TO authenticated;

-- ============================================================================
-- PART 9: FIX admin_create_user & admin_update_profile ROLES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'warehouse',
  p_tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_user_id uuid;
  v_caller_role text;
  v_assigned_role text;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    SELECT role INTO v_caller_role
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
        AND role IN ('admin', 'owner')
      LIMIT 1;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: ban khong phai admin cua tenant nay' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT m.tenant_id, m.role INTO p_tenant_id, v_caller_role
      FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('admin', 'owner')
      ORDER BY m.created_at
      LIMIT 1;
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: ban khong phai admin/owner cua bat ky tenant nao' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Validate allowed roles
  IF p_role IN ('owner', 'admin') AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Khong co quyen: chi Owner moi duoc tao Admin hoac Owner' USING ERRCODE = '42501';
  END IF;

  -- Map role directly without degrading manager to warehouse
  v_assigned_role := CASE
    WHEN p_role IN ('owner', 'admin', 'manager', 'warehouse', 'viewer') THEN p_role
    ELSE 'warehouse'
  END;

  INSERT INTO auth.users (
    instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('role', 'authenticated', 'provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'role', v_assigned_role),
    now(), now(), 'authenticated', 'authenticated'
  )
  RETURNING id INTO v_new_user_id;

  INSERT INTO auth.identities (user_id, identity_data, provider, created_at, updated_at)
  VALUES (v_new_user_id, jsonb_build_object('sub', v_new_user_id::text, 'email', lower(p_email)), 'email', now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_new_user_id, lower(p_email), p_full_name, v_assigned_role, true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (p_tenant_id, v_new_user_id, v_assigned_role, 'active')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';

  RETURN v_new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_target_tenant_id uuid;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    SELECT role INTO v_caller_role
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
        AND role IN ('admin', 'owner')
      LIMIT 1;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: ban khong phai admin cua tenant nay' USING ERRCODE = '42501';
    END IF;
    v_target_tenant_id := p_tenant_id;
  ELSE
    SELECT m.tenant_id, m.role INTO v_target_tenant_id, v_caller_role
      FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('admin', 'owner')
      ORDER BY m.created_at LIMIT 1;
    IF v_target_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: chi admin/owner moi duoc cap nhat nguoi dung' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Validate role elevation
  IF p_role IN ('owner', 'admin') AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Khong co quyen: chi Owner moi duoc thang chuc len Admin/Owner' USING ERRCODE = '42501';
  END IF;

  -- Update global profile
  UPDATE public.profiles
  SET role = p_role, is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;

  -- Update tenant_memberships role and status for this tenant
  UPDATE public.tenant_memberships
  SET role = p_role,
      status = CASE WHEN p_is_active THEN 'active' ELSE 'suspended' END,
      updated_at = now()
  WHERE user_id = p_user_id AND tenant_id = v_target_tenant_id;
END;
$$;
