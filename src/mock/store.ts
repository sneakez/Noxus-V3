import { INITIAL_MOCK_DATABASE } from './seedData';
import type { 
  MockDatabaseSnapshot, 
  MockEvent, 
  MockEventTopic, 
  SkuInventory5State,
  TenantRole,
  Tenant
} from './types';
import type { 
  Order, 
  OrderItem, 
  StockLedgerEntry, 
  ReturnRecord, 
  PickingWave,
  JournalEntry,
  JournalLine
} from '@/types';

const STORAGE_KEY = 'nexus_mock_db_v2';

type StoreListener = (event?: MockEvent) => void;

class MockDataStore {
  private state: MockDatabaseSnapshot;
  private listeners: Set<StoreListener> = new Set();
  public simulatedLatencyMs: number = 80;

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): MockDatabaseSnapshot {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MockDatabaseSnapshot;
          if (parsed.schemaVersion === INITIAL_MOCK_DATABASE.schemaVersion) {
            return parsed;
          }
        }
      }
    } catch {
      // In-memory fallback
    }
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    this.saveToStorage(fresh);
    return fresh;
  }

  private saveToStorage(nextState: MockDatabaseSnapshot) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      }
    } catch {
      // Ignore in non-browser env
    }
  }

  private mutate(updater: (draft: MockDatabaseSnapshot) => void, eventTopic: MockEventTopic, payload?: unknown) {
    const clone = JSON.parse(JSON.stringify(this.state)) as MockDatabaseSnapshot;
    updater(clone);
    clone.lastUpdated = new Date().toISOString();
    this.state = clone;
    this.saveToStorage(clone);

    const event: MockEvent = {
      topic: eventTopic,
      timestamp: new Date().toISOString(),
      actor: this.state.activeRole,
      payload
    };

    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.error('[MockStore] Listener error:', err);
      }
    });
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async delay(ms?: number): Promise<void> {
    const wait = ms ?? this.simulatedLatencyMs;
    if (wait > 0) {
      await new Promise(res => setTimeout(res, wait));
    }
  }

  public getSnapshot(): MockDatabaseSnapshot {
    return this.state;
  }

  public resetToDefaultSeed(): void {
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    fresh.lastUpdated = new Date().toISOString();
    this.state = fresh;
    this.saveToStorage(fresh);
    this.listeners.forEach(fn => fn({
      topic: 'DATABASE_RESET',
      timestamp: new Date().toISOString(),
      actor: 'system',
      payload: null
    }));
  }

  // ============ Tenant & RBAC Role Management ============

  public getActiveTenant(): Tenant {
    const found = this.state.tenants.find(t => t.id === this.state.activeTenantId);
    return found || this.state.tenants[0];
  }

  public setActiveTenant(tenantId: string): void {
    this.mutate(draft => {
      draft.activeTenantId = tenantId;
    }, 'ROLE_SWITCHED', { tenantId });
  }

  public getActiveRole(): TenantRole {
    return this.state.activeRole;
  }

  public setActiveRole(role: TenantRole): void {
    this.mutate(draft => {
      draft.activeRole = role;
    }, 'ROLE_SWITCHED', { role });
  }

  // ============ Orders & Atomic Reservation ============

  public getOrders(tenantId?: string): Order[] {
    const tId = tenantId || this.state.activeTenantId;
    return this.state.orders.filter(o => o.tenant_id === tId);
  }

  public getOrderWithCustomer(orderId: string): (Order & { customer?: unknown; items?: OrderItem[] }) | null {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return null;
    const customer = this.state.customers.find(c => c.id === order.customer_id);
    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    return { ...order, customer, items };
  }

  public placeOrderAtomic(newOrder: Omit<Order, 'id' | 'created_at' | 'updated_at'>, items: Array<{ product_id: string; sku: string; quantity: number; unit_price: number }>): { success: boolean; orderId?: string; error?: string } {
    // 1. Verify stock availability for all items
    for (const item of items) {
      const inv = this.state.inventory5State.find(i => i.sku === item.sku || i.product_id === item.product_id);
      if (!inv || inv.available < item.quantity) {
        return {
          success: false,
          error: `Sản phẩm SKU ${item.sku} không đủ tồn khả dụng (Còn ${inv?.available || 0}, yêu cầu ${item.quantity}). Đơn hàng đã bị hủy giao dịch an toàn.`
        };
      }
    }

    const orderId = `ord_${Date.now()}`;
    const placedAt = new Date().toISOString();

    this.mutate(draft => {
      // 2. Lock stock reservation for each item
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.sku === item.sku || i.product_id === item.product_id);
        if (inv) {
          inv.reserved += item.quantity;
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
          inv.runway_days = inv.sales_velocity > 0 ? Math.round(inv.available / inv.sales_velocity) : 14;
          inv.status = inv.available <= inv.safety_stock ? 'Critical' : inv.available <= inv.reorder_level ? 'Warning' : 'Healthy';
        }

        // Ledger Entry
        const ledgerId = `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const ledgerEntry: StockLedgerEntry = {
          id: ledgerId,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: 'wh_north_01',
          transaction_type: 'reservation',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Khóa tồn nguyên tử ${item.quantity}x ${item.sku} cho đơn hàng #${newOrder.order_number}`,
          balance_after: inv?.available || 0,
          created_at: placedAt
        };
        draft.stockLedger.unshift(ledgerEntry);
      }

      // 3. Compute Subtotal & Total
      const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
      const total = Number((newOrder as unknown as Record<string, unknown>).total ?? (newOrder as unknown as Record<string, unknown>).total_amount ?? subtotal);
      
      const orderItemsList = items.map((item, idx) => {
        const prod = draft.products.find(p => p.id === item.product_id || p.sku === item.sku);
        return {
          id: `item_${orderId}_${idx + 1}`,
          order_id: orderId,
          product_id: item.product_id,
          product_name: prod?.name || 'Sản phẩm Nexus',
          product_sku: item.sku || prod?.sku || 'NX-SKU',
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
          total_price: item.quantity * item.unit_price,
          created_at: placedAt,
          parent_bundle_product_id: null,
          unit_cost_mac_snapshot: prod?.cost_price || Math.round(item.unit_price * 0.6),
          serial_numbers: null,
          is_free_gift: false
        };
      });

      const createdOrder: Order = {
        subtotal,
        tax: 0,
        shipping: 0,
        discount: 0,
        total,
        total_amount: total,
        channel: (newOrder as unknown as Record<string, unknown>).channel as unknown as Order['channel'] || 'direct',
        ...newOrder,
        id: orderId,
        order_items: orderItemsList,
        created_at: placedAt,
        updated_at: placedAt
      };
      draft.orders.unshift(createdOrder);

      // 4. Insert Order Items
      orderItemsList.forEach(it => draft.orderItems.push(it));

      // 5. Pre-payment Accounting Entry (Debit 112 / Credit 131 Prepayment)
      // Note: Revenue (Credit 511) is NOT recognized upon order creation!
      // It is only recognized upon Delivery with POD (FOB Destination) [ASSUMPTION].
      if (newOrder.payment_status === 'paid') {
        const jeId = `je_prepay_${Date.now()}`;
        draft.journalEntries.unshift({
          id: jeId,
          tenant_id: draft.activeTenantId,
          entry_number: `JE-PAY-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          event_source: 'payment_received',
          reference_type: 'order',
          reference_id: orderId,
          description: `Khách hàng thanh toán tiền trước cho đơn #${newOrder.order_number} [ASSUMPTION: Tiền trả trước, chưa ghi nhận Có 511]`,
          posted_at: placedAt,
          posted_by: 'usr_finance_01',
          status: 'posted',
          created_at: placedAt
        });

        draft.journalLines.push(
          {
            id: `jl_${jeId}_1`,
            journal_entry_id: jeId,
            entry_id: jeId,
            account_id: 'acc_112',
            account_code: '112',
            debit_amount: total,
            credit_amount: 0,
            debit: total,
            credit: 0,
            description: `Tiền gửi ngân hàng thu trước đơn #${newOrder.order_number}`
          },
          {
            id: `jl_${jeId}_2`,
            journal_entry_id: jeId,
            entry_id: jeId,
            account_id: 'acc_131',
            account_code: '131',
            debit_amount: 0,
            credit_amount: total,
            debit: 0,
            credit: total,
            description: `Khách hàng trả trước (Phải thu - Dư Có) #${newOrder.order_number} [ASSUMPTION]`
          }
        );
      }

      // 6. Append Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_ATOMIC_RESERVATION',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeRole,
        details: { order_number: newOrder.order_number, items_count: items.length, total: newOrder.total_amount },
        created_at: placedAt
      });
    }, 'ORDER_CREATED', { orderId, orderNumber: newOrder.order_number });

    return { success: true, orderId };
  }

  public cancelOrderAtomic(orderId: string, reason: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { success: false, error: 'Đơn hàng đã bàn giao vận chuyển, không thể hủy ngang. Phải qua quy trình Đổi trả/Hoàn hàng (RMA).' };
    }
    if (order.status === 'cancelled') {
      return { success: false, error: 'Đơn hàng này đã được hủy trước đó.' };
    }

    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    const now = new Date().toISOString();

    this.mutate(draft => {
      // 1. Release Stock Lock (Available increases, Reserved decreases, Physical UNTOUCHED)
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id);
        if (inv) {
          inv.reserved = Math.max(0, inv.reserved - item.quantity);
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
          inv.runway_days = inv.sales_velocity > 0 ? Math.round(inv.available / inv.sales_velocity) : 14;
          inv.status = inv.available <= inv.safety_stock ? 'Critical' : inv.available <= inv.reorder_level ? 'Warning' : 'Healthy';
        }

        // Ledger Entry
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: 'wh_north_01',
          transaction_type: 'release',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Giải phóng giữ tồn ${item.quantity}x do hủy đơn: ${reason}`,
          balance_after: inv?.available || 0,
          created_at: now
        });
      }

      // 2. Update Order Status
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'cancelled';
        targetOrder.payment_status = 'refunded';
        targetOrder.notes = (targetOrder.notes ? targetOrder.notes + ' | ' : '') + `Đã hủy: ${reason}`;
        targetOrder.updated_at = now;
      }

      // 3. Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_CANCELLED_STOCK_RELEASED',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeRole,
        details: { reason, items_released: items.length },
        created_at: now
      });
    }, 'ORDER_CANCELLED', { orderId, reason });

    return { success: true };
  }

  public dispatchOrder(orderId: string, trackingNumber: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { success: false, error: 'Đơn hàng đã được xuất kho vận chuyển trước đó.' };
    }

    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    const now = new Date().toISOString();

    this.mutate(draft => {
      // 1. Physical stock decreases, Reserved stock released
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id);
        if (inv) {
          inv.physical = Math.max(0, inv.physical - item.quantity);
          inv.reserved = Math.max(0, inv.reserved - item.quantity);
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
        }

        // Product table stock sync
        const prod = draft.products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }

        // Ledger Entry
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: 'wh_north_01',
          transaction_type: 'outbound',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Bàn giao vận chuyển [${trackingNumber}]: trừ tồn vật lý ${item.quantity} cái`,
          balance_after: inv?.physical || 0,
          created_at: now
        });
      }

      // 2. Update Order
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'shipped';
        targetOrder.fulfillment_status = 'dispatched';
        targetOrder.delivery_status = 'in_transit';
        targetOrder.shipped_at = now;
        targetOrder.notes = (targetOrder.notes ? targetOrder.notes + ' | ' : '') + `Mã vận đơn: ${trackingNumber}`;
        targetOrder.updated_at = now;
      }

      // 3. Accounting: COGS Recognition upon Dispatch [ASSUMPTION]
      const totalCost = items.reduce((s, it) => s + (it.quantity * (it.unit_cost_mac_snapshot || 0)), 0);
      if (totalCost > 0) {
        const cogsJeId = `je_cogs_${Date.now()}`;
        draft.journalEntries.unshift({
          id: cogsJeId,
          tenant_id: draft.activeTenantId,
          entry_number: `JE-COGS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          event_source: 'order_cogs',
          reference_type: 'order',
          reference_id: orderId,
          description: `Xuất kho giá vốn hàng bán #${order.order_number} [ASSUMPTION: Hạch toán giá vốn theo MAC khi xuất kho]`,
          posted_at: now,
          posted_by: 'usr_finance_01',
          status: 'posted',
          created_at: now
        });
        draft.journalLines.push(
          {
            id: `jl_${cogsJeId}_1`,
            journal_entry_id: cogsJeId,
            entry_id: cogsJeId,
            account_id: 'acc_632',
            account_code: '632',
            debit_amount: totalCost,
            credit_amount: 0,
            debit: totalCost,
            credit: 0,
            description: `Giá vốn xuất kho đơn #${order.order_number} [ASSUMPTION]`
          },
          {
            id: `jl_${cogsJeId}_2`,
            journal_entry_id: cogsJeId,
            entry_id: cogsJeId,
            account_id: 'acc_156',
            account_code: '156',
            debit_amount: 0,
            credit_amount: totalCost,
            debit: 0,
            credit: totalCost,
            description: `Giảm tồn kho hàng hóa #${order.order_number}`
          }
        );
      }

      // 4. Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_DISPATCHED_TO_CARRIER',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeRole,
        details: { trackingNumber, totalCost },
        created_at: now
      });
    }, 'STOCK_DISPATCHED', { orderId, trackingNumber });

    return { success: true };
  }

  // ============ Proof of Delivery (POD) & FOB Destination Recognition ============

  public markDeliveredWithPOD(orderId: string, podData: import('@/types').PodEvidence): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    if (!podData.tracking_code || !podData.recipient_name) {
      return { success: false, error: 'Thiếu thông tin bằng chứng giao hàng (POD)' };
    }

    const now = podData.delivered_at || new Date().toISOString();

    this.mutate(draft => {
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'delivered';
        targetOrder.delivery_status = 'delivered';
        targetOrder.fulfillment_status = 'fulfilled';
        targetOrder.delivered_at = now;
        targetOrder.pod_evidence = podData;
        targetOrder.revenue_recognized = true;
        targetOrder.revenue_recognized_at = now;
        targetOrder.updated_at = now;
      }

      // Recognized Revenue Double Entry upon POD confirmation
      const total = Number(order.total || order.subtotal || 0);
      const revJeId = `je_rev_${Date.now()}`;
      draft.journalEntries.unshift({
        id: revJeId,
        tenant_id: draft.activeTenantId,
        entry_number: `JE-REV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        event_source: 'order_sale',
        reference_type: 'order',
        reference_id: orderId,
        description: `Ghi nhận doanh thu bán hàng #${order.order_number} [ASSUMPTION: Ghi nhận Có 511 tại POD theo FOB Điểm đến]`,
        posted_at: now,
        posted_by: 'usr_finance_01',
        status: 'posted',
        created_at: now
      });

      draft.journalLines.push(
        {
          id: `jl_${revJeId}_1`,
          journal_entry_id: revJeId,
          entry_id: revJeId,
          account_id: 'acc_131',
          account_code: '131',
          debit_amount: total,
          credit_amount: 0,
          debit: total,
          credit: 0,
          description: `Phải thu đối soát POD #${order.order_number}`
        },
        {
          id: `jl_${revJeId}_2`,
          journal_entry_id: revJeId,
          entry_id: revJeId,
          account_id: 'acc_511',
          account_code: '511',
          debit_amount: 0,
          credit_amount: total,
          debit: 0,
          credit: total,
          description: `Doanh thu bán hàng xác nhận POD #${order.order_number} [ASSUMPTION]`
        }
      );

      // Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_DELIVERED_POD_VERIFIED',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeRole,
        details: { podData, revenue_recognized: total },
        created_at: now
      });
    }, 'ORDER_STATUS_CHANGED', { orderId, status: 'delivered', podData });

    return { success: true };
  }

  // ============ Advanced Inventory Simulation Workflows ============

  public receivePOPendingQC(sku: string, qty: number, poNumber?: string): { success: boolean; error?: string } {
    if (qty <= 0) return { success: false, error: 'Số lượng phải lớn hơn 0' };
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku);
      if (targetInv) {
        targetInv.physical += qty;
        targetInv.pending_qc = (targetInv.pending_qc || 0) + qty;
        targetInv.unavailable = targetInv.pending_qc + (targetInv.damaged || 0);
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
        targetInv.inbound = Math.max(0, (targetInv.inbound || 0) - qty);
        targetInv.incoming = targetInv.inbound;
      }

      draft.stockLedger.unshift({
        id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenant_id: draft.activeTenantId,
        product_id: inv.product_id,
        warehouse_id: inv.warehouse_id,
        transaction_type: 'inbound',
        quantity: qty,
        reference_type: 'purchase_order',
        reference_id: poNumber || 'PO-DOCK-RECEIVE',
        notes: `Cập bến kho từ PO [${poNumber || 'PO-2026'}] — Tồn chuyển vào Chờ kiểm định (Pending QC: +${qty})`,
        balance_after: targetInv?.physical || 0,
        created_at: now
      });
    }, 'PO_RECEIVED', { sku, qty, poNumber });

    return { success: true };
  }

  public inspectInboundQC(sku: string, passQty: number, failQty: number): { success: boolean; error?: string } {
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };
    const totalInspect = passQty + failQty;
    if (totalInspect <= 0) return { success: false, error: 'Số lượng kiểm định phải lớn hơn 0' };
    if ((inv.pending_qc || 0) < totalInspect) {
      return { success: false, error: `Số lượng chờ QC hiện tại (${inv.pending_qc || 0}) không đủ để nghiệm thu ${totalInspect}` };
    }

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku);
      if (targetInv) {
        targetInv.pending_qc = Math.max(0, (targetInv.pending_qc || 0) - totalInspect);
        targetInv.damaged = (targetInv.damaged || 0) + failQty;
        targetInv.unavailable = targetInv.pending_qc + targetInv.damaged;
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
      }

      const prod = draft.products.find(p => p.sku === sku);
      if (prod && targetInv) {
        prod.stock = targetInv.available;
      }

      if (passQty > 0) {
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_1`,
          tenant_id: draft.activeTenantId,
          product_id: inv.product_id,
          warehouse_id: inv.warehouse_id,
          transaction_type: 'adjustment',
          quantity: passQty,
          reference_type: 'qc_inspection',
          reference_id: `QC-PASS-${Date.now().toString().slice(-4)}`,
          notes: `QC Nghiệm thu đạt chuẩn: +${passQty} cái vào Tồn khả dụng (Sellable)`,
          balance_after: targetInv?.available || 0,
          created_at: now
        });
      }

      if (failQty > 0) {
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_2`,
          tenant_id: draft.activeTenantId,
          product_id: inv.product_id,
          warehouse_id: inv.warehouse_id,
          transaction_type: 'scrap',
          quantity: failQty,
          reference_type: 'qc_inspection',
          reference_id: `QC-FAIL-${Date.now().toString().slice(-4)}`,
          notes: `QC Không đạt chuẩn (Lỗi ngoại quan/chức năng): +${failQty} cái chuyển kho Cách ly (Damaged)`,
          balance_after: targetInv?.damaged || 0,
          created_at: now
        });
      }
    }, 'RETURN_INSPECTED', { sku, passQty, failQty });

    return { success: true };
  }

  public quarantineStock(sku: string, qty: number, reason: string): { success: boolean; error?: string } {
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };
    if (inv.available < qty) {
      return { success: false, error: `Tồn khả dụng (${inv.available}) không đủ để cách ly ${qty}` };
    }

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku);
      if (targetInv) {
        targetInv.damaged = (targetInv.damaged || 0) + qty;
        targetInv.unavailable = (targetInv.pending_qc || 0) + targetInv.damaged;
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
      }

      draft.stockLedger.unshift({
        id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenant_id: draft.activeTenantId,
        product_id: inv.product_id,
        warehouse_id: inv.warehouse_id,
        transaction_type: 'scrap',
        quantity: qty,
        reference_type: 'quarantine',
        reference_id: `QUARANTINE-${Date.now().toString().slice(-4)}`,
        notes: `Cách ly hàng lỗi (${reason}): -${qty} khả dụng -> +${qty} hàng hỏng/chờ hủy`,
        balance_after: targetInv?.available || 0,
        created_at: now
      });
    }, 'STOCK_RELEASED', { sku, qty, reason });

    return { success: true };
  }

  public transferStock(sku: string, fromWh: string, toWh: string, qty: number, stage: 'dispatch' | 'receive'): { success: boolean; error?: string } {
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku);
      if (targetInv) {
        if (stage === 'dispatch') {
          targetInv.physical = Math.max(0, targetInv.physical - qty);
          targetInv.in_transit = (targetInv.in_transit || 0) + qty;
          targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - (targetInv.unavailable || 0));
          targetInv.sellable = targetInv.available;
        } else {
          targetInv.in_transit = Math.max(0, (targetInv.in_transit || 0) - qty);
          targetInv.physical += qty;
          targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - (targetInv.unavailable || 0));
          targetInv.sellable = targetInv.available;
        }
      }

      draft.stockLedger.unshift({
        id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenant_id: draft.activeTenantId,
        product_id: inv.product_id,
        warehouse_id: fromWh,
        transaction_type: stage === 'dispatch' ? 'transfer_out' : 'transfer_in',
        quantity: qty,
        reference_type: 'transfer',
        reference_id: `TRF-${Date.now().toString().slice(-4)}`,
        notes: stage === 'dispatch'
          ? `Xuất điều chuyển từ ${fromWh} sang ${toWh} (Hàng chuyển sang In-transit: ${qty} cái)`
          : `Nhập nhận điều chuyển tại ${toWh} từ ${fromWh} (Giải phóng In-transit vào Physical: ${qty} cái)`,
        balance_after: targetInv?.physical || 0,
        created_at: now
      });
    }, 'STOCK_DISPATCHED', { sku, fromWh, toWh, qty, stage });

    return { success: true };
  }

  // ============ Business Rules Config & Governance ============

  public getBusinessRules(): import('@/mock/types').BusinessRuleConfig[] {
    return this.state.businessRules || [];
  }

  public updateBusinessRule(ruleId: string, optionId: string, status: 'approved' | 'assumption' | 'under_review'): { success: boolean } {
    this.mutate(draft => {
      if (!draft.businessRules) return;
      const rule = draft.businessRules.find(r => r.id === ruleId);
      if (rule) {
        rule.selectedOptionId = optionId;
        rule.currentStatus = status;
        rule.updatedAt = new Date().toISOString();
      }
    }, 'DATABASE_RESET', { ruleId, optionId, status });
    return { success: true };
  }

  // ============ Fulfillment & Wave Picking ============

  public getPickingWaves(): PickingWave[] {
    return this.state.pickingWaves.filter(w => w.tenant_id === this.state.activeTenantId);
  }

  public completeWave(waveId: string): void {
    this.mutate(draft => {
      const wave = draft.pickingWaves.find(w => w.id === waveId);
      if (wave) {
        wave.status = 'completed';
        wave.picked_items = wave.total_items;
        wave.completed_at = new Date().toISOString();
      }
    }, 'ITEM_PICKED', { waveId });
  }

  // ============ Returns & Restock / Quarantine ============

  public getReturns(): ReturnRecord[] {
    return this.state.returns.filter(r => r.tenant_id === this.state.activeTenantId);
  }

  public createMultiBranchRma(params: {
    orderId: string;
    rmaBranch: import('@/types').RmaBranch;
    reason: string;
    refundAmount: number;
    items?: Array<{ productId: string; qty: number }>;
    notes?: string;
  }): { success: boolean; rmaNumber: string } {
    const rmaNumber = `RMA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const isReturnless = params.rmaBranch === 'returnless_refund';
    const isDamagedScrap = params.rmaBranch === 'transit_damage';

    this.mutate(draft => {
      const newRet: ReturnRecord = {
        id: `ret_${Date.now()}`,
        tenant_id: draft.activeTenantId,
        return_number: rmaNumber,
        order_id: params.orderId,
        customer_id: 'cust_01',
        reason: params.reason,
        status: isReturnless ? 'approved' : 'pending',
        return_type: 'customer_rma',
        refund_amount: params.refundAmount,
        rma_branch: params.rmaBranch,
        approval_status: params.refundAmount < 1000000 ? 'maker_approved' : 'pending',
        maker_checker_rule: params.refundAmount < 1000000 ? 'Maker duyệt đơn < 1M' : 'Bắt buộc Checker duyệt (Đơn >= 1M)',
        created_at: now,
        updated_at: now
      };
      draft.returns.unshift(newRet);

      if (params.items && params.items.length > 0) {
        params.items.forEach((it, idx) => {
          draft.returnItems.push({
            id: `reti_${Date.now()}_${idx}`,
            return_id: newRet.id,
            product_id: it.productId,
            quantity: it.qty,
            reason: params.reason,
            condition: isDamagedScrap ? 'damaged' : 'opened',
            disposition: isDamagedScrap ? 'scrap' : isReturnless ? 'returnless' : 'restock',
            created_at: now
          });
        });
      }

      const ord = draft.orders.find(o => o.id === params.orderId);
      if (ord) {
        ord.return_status = 'return_requested';
      }

      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'RMA_CREATED_BRANCH',
        entity: 'returns',
        entity_id: newRet.id,
        actor: draft.activeRole,
        details: { rmaNumber, branch: params.rmaBranch, amount: params.refundAmount },
        created_at: now
      });
    }, 'ORDER_STATUS_CHANGED', { rmaNumber });

    return { success: true, rmaNumber };
  }

  public inspectReturnQC(returnId: string, isGoodCondition: boolean): { success: boolean } {
    const ret = this.state.returns.find(r => r.id === returnId);
    if (!ret) return { success: false };

    const items = this.state.returnItems.filter(i => i.return_id === returnId);
    const now = new Date().toISOString();

    this.mutate(draft => {
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id);
        if (inv) {
          if (isGoodCondition) {
            // Restock to sellable
            inv.physical += item.quantity;
            inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
            inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
            inv.sellable = inv.available;
          } else {
            // Quarantine to damaged
            inv.physical += item.quantity;
            inv.damaged += item.quantity;
            inv.unavailable = (inv.pending_qc || 0) + inv.damaged;
            inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
            inv.sellable = inv.available;
          }
        }

        // Ledger Entry
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: 'wh_north_01',
          transaction_type: isGoodCondition ? 'return_in' : 'scrap',
          quantity: item.quantity,
          reference_type: 'return',
          reference_id: returnId,
          notes: isGoodCondition 
            ? `Nhập lại kho khả dụng từ đổi trả (QC Đạt chuẩn)`
            : `Cách ly hàng hỏng/lỗi từ đổi trả (QC Không đạt)`,
          balance_after: isGoodCondition ? (inv?.available || 0) : (inv?.damaged || 0),
          created_at: now
        });
      }

      const targetRet = draft.returns.find(r => r.id === returnId);
      if (targetRet) {
        targetRet.status = isGoodCondition ? 'qc_passed' : 'qc_failed';
        targetRet.updated_at = now;
      }
    }, 'RETURN_INSPECTED', { returnId, isGoodCondition });

    return { success: true };
  }

  // ============ Double-Entry Balanced Bookkeeping ============

  public getJournalEntries(): JournalEntry[] {
    return this.state.journalEntries.filter(j => j.tenant_id === this.state.activeTenantId);
  }

  public postJournalEntry(entry: Omit<JournalEntry, 'id' | 'created_at' | 'status'>, lines: Array<Omit<JournalLine, 'id' | 'entry_id'>>): { success: boolean; error?: string } {
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (totalDebit !== totalCredit) {
      return {
        success: false,
        error: `Bút toán không cân bằng! Tổng Nợ (${totalDebit.toLocaleString()} ₫) khác Tổng Có (${totalCredit.toLocaleString()} ₫). Chênh lệch: ${Math.abs(totalDebit - totalCredit).toLocaleString()} ₫. Hệ thống sổ kép từ chối ghi sổ.`
      };
    }

    const entryId = `je_${Date.now()}`;
    const now = new Date().toISOString();

    this.mutate(draft => {
      draft.journalEntries.unshift({
        ...entry,
        id: entryId,
        status: 'posted',
        created_at: now,
        posted_at: now
      });

      lines.forEach((l, idx) => {
        draft.journalLines.push({
          ...l,
          id: `jl_${entryId}_${idx + 1}`,
          entry_id: entryId
        });
      });
    }, 'JOURNAL_POSTED', { entryId, total: totalDebit });

    return { success: true };
  }

  // ============ Inventory 5-State Queries ============

  public getInventory5State(): SkuInventory5State[] {
    return this.state.inventory5State;
  }

  public getStockLedger(): StockLedgerEntry[] {
    return this.state.stockLedger.filter(s => s.tenant_id === this.state.activeTenantId);
  }
}

export const mockStore = new MockDataStore();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__mockStore = mockStore;
}
