/*
# NEXUSOMS V4.1 — Security, RBAC & Inventory Integrity Hardening
# Migration: 20261028090000_v4_1_security_rbac_inventory_hardening.sql

## Enhancements:
1. Protect the last Owner of a tenant against demotion/suspension.
2. Tighten cancel_order_atomic to manager, admin, and owner only (remove warehouse).
3. Add non-negative constraint on products.stock if not present.
4. Add function verify_inventory_consistency(p_tenant_id uuid) for audit & verification.
5. Ensure all RPCs have strict search_path and revokes.
*/

-- ============================================================================
-- PART 1: NON-NEGATIVE STOCK CONSTRAINT
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_non_negative'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
  END IF;
END $$;

-- ============================================================================
-- PART 2: PROTECT LAST OWNER IN admin_update_profile
-- ============================================================================
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
  v_current_target_role text;
  v_remaining_owners integer;
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

  -- Validate role elevation: only owner can promote to admin or owner
  IF p_role IN ('owner', 'admin') AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Khong co quyen: chi Owner moi duoc thang chuc len Admin/Owner' USING ERRCODE = '42501';
  END IF;

  -- Check if target user is currently an owner in this tenant
  SELECT role INTO v_current_target_role
    FROM public.tenant_memberships
    WHERE user_id = p_user_id AND tenant_id = v_target_tenant_id;

  -- Protection of last owner
  IF v_current_target_role = 'owner' AND (p_role != 'owner' OR p_is_active = false) THEN
    SELECT count(*) INTO v_remaining_owners
      FROM public.tenant_memberships
      WHERE tenant_id = v_target_tenant_id
        AND role = 'owner'
        AND status = 'active'
        AND user_id != p_user_id;

    IF v_remaining_owners = 0 THEN
      RAISE EXCEPTION 'Bao ve Owner: Khong the ha quyen hoac vo hieu hoa Owner duy nhat cua workspace' USING ERRCODE = '42501';
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, uuid) TO authenticated;

-- ============================================================================
-- PART 3: TIGHTEN cancel_order_atomic (MANAGER / ADMIN / OWNER ONLY)
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
  -- Strict role check: Warehouse cannot cancel commercial orders
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('manager', 'admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: chi Manager, Admin hoac Owner moi duoc huy don hang' USING ERRCODE = '42501';
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
-- PART 4: AUDIT & CONSISTENCY VERIFICATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_inventory_consistency(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_negative_count integer;
  v_unmapped_items integer;
  v_discrepancies jsonb;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT count(*) INTO v_negative_count
    FROM public.products
    WHERE tenant_id = p_tenant_id AND stock < 0;

  SELECT count(*) INTO v_unmapped_items
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.tenant_id = p_tenant_id AND oi.product_id IS NULL;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'negative_stock_count', v_negative_count,
    'unmapped_order_items', v_unmapped_items,
    'is_healthy', (v_negative_count = 0 AND v_unmapped_items = 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_inventory_consistency FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_inventory_consistency TO authenticated;
