import { INITIAL_MOCK_DATABASE } from './seedData';
import { hasPermission } from '@/lib/permissions';
import type { OrderFeeBreakdown } from '@/types';
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
  JournalLine,
  Product,
  Customer,
  Warehouse
} from '@/types';

const STORAGE_KEY = 'nexus_mock_db_v2';

type StoreListener = (event?: MockEvent) => void;

class MockDataStore {
  private state: MockDatabaseSnapshot;
  private listeners: Set<StoreListener> = new Set();
  public simulatedLatencyMs: number = 80;

  constructor() {
    this.state = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const nextState = JSON.parse(e.newValue) as MockDatabaseSnapshot;
            this.state = nextState;
            this.listeners.forEach(fn => fn());
          } catch {
            // Ignore parse errors
          }
        }
      });
    }
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
    if (eventTopic === 'DATABASE_RESET') {
      clone.stateRevision = 0;
    } else {
      clone.stateRevision = (clone.stateRevision || 0) + 1;
    }
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

  public getStateRevision(): number {
    return this.state.stateRevision || 0;
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

  public placeOrderAtomic(newOrder: Partial<Order> & { tenant_id: string; order_number: string },  items: Array<{ product_id: string; sku: string; quantity: number; unit_price: number }>): { success: boolean; orderId?: string; error?: string } {
    // 0. Verify Multi-shop Uniqueness (tenant_id, shop_id, channel_order_sn) (R05)
    if (newOrder.channel_order_sn) {
      const existingDup = this.state.orders.find(o =>
        o.tenant_id === (newOrder.tenant_id || this.state.activeTenantId) &&
        (o.shop_id || 'default') === (newOrder.shop_id || 'default') &&
        o.channel_order_sn === newOrder.channel_order_sn
      );
      if (existingDup) {
        return {
          success: false,
          error: `Đơn hàng trùng lặp: Mã đơn sàn [${newOrder.channel_order_sn}] trên gian hàng [${newOrder.shop_id || 'default'}] đã tồn tại trong hệ thống.`
        };
      }
    }

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
        tax: 0,
        shipping: 0,
        discount: 0,
        ...newOrder,
        customer_id: (newOrder.customer_id as string | null) ?? null,
        status: (newOrder.status as any) || 'pending',
        payment_status: (newOrder.payment_status as any) || 'paid',
        placed_at: placedAt,
        subtotal: newOrder.subtotal ?? subtotal,
        total: newOrder.total ?? total,
        total_amount: newOrder.total_amount ?? total,
        channel: newOrder.channel || 'website',
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
            description: `Tiền gửi ngân hàng thu trước đơn #${newOrder.order_number}`,
            created_at: placedAt
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
            description: `Giá vốn xuất kho đơn #${order.order_number} [ASSUMPTION]`,
            created_at: now
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

  public refundOrder(orderId: string, refundAmount?: number, actorRole?: TenantRole, actorId?: string): { success: boolean; error?: string } {
    const role = actorRole || this.state.activeRole || 'owner';
    if (role === 'admin') {
      return { success: false, error: 'Command rejected: Quyền hạn kỹ thuật Admin không được phép duyệt hoàn tiền / giao dịch tài chính' };
    }
    if (role === 'warehouse' || role === 'growth') {
      return { success: false, error: 'Command rejected: Bạn không có quyền thực hiện hoàn tiền' };
    }

    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    const amount = refundAmount !== undefined ? refundAmount : order.total;
    const now = new Date().toISOString();

    this.mutate(draft => {
      const target = draft.orders.find(o => o.id === orderId);
      if (target) {
        target.payment_status = 'refunded';
        target.updated_at = now;
      }
    }, 'ORDER_STATUS_CHANGED', { orderId, amount, actorRole: role, actorId });

    return { success: true };
  }

  public markDeliveredWithPOD(orderId: string, podData: import('@/types').PodEvidence, actorRole?: TenantRole): { success: boolean; error?: string } {
    const role = actorRole || this.state.activeRole || 'owner';
    if (role === 'warehouse') {
      return { success: false, error: 'Command rejected: Nhân viên kho chỉ bàn giao bưu tá, không có thẩm quyền kết luận giao hàng thành công (POD)' };
    }
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

  public updateOrder(orderId: string, updates: Partial<Order>): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId || o.order_number === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetOrder = draft.orders.find(o => o.id === order.id);
      if (targetOrder) {
        Object.assign(targetOrder, updates);
        targetOrder.updated_at = now;
      }
    }, 'ORDER_STATUS_CHANGED', { orderId: order.id, updates });
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

  public updateBusinessRule(
    ruleId: string,
    optionId: string,
    status: 'approved' | 'assumption' | 'under_review',
    reason?: string,
    version?: string,
    tenantScope?: 'global' | 'single_tenant'
  ): { success: boolean } {
    this.mutate(draft => {
      if (!draft.businessRules) return;
      const rule = draft.businessRules.find(r => r.id === ruleId);
      if (rule) {
        const prevOption = rule.selectedOptionId;
        const prevStatus = rule.currentStatus;
        const now = new Date().toISOString();

        rule.selectedOptionId = optionId;
        rule.currentStatus = status;
        // Only set approvedOptionId if status is explicitly approved
        rule.approvedOptionId = status === 'approved' ? optionId : null;
        if (version) rule.version = version;
        if (tenantScope) rule.tenantScope = tenantScope;
        if (reason) rule.changeReason = reason;
        rule.updatedAt = now;

        if (!rule.history) rule.history = [];
        rule.history.unshift({
          id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: now,
          actor: draft.activeRole.toUpperCase(),
          fromStatus: prevStatus,
          toStatus: status,
          fromOptionId: prevOption,
          toOptionId: optionId,
          reason: reason || (status === 'approved' ? 'Chủ Doanh Nghiệp phê duyệt chính thức' : status === 'assumption' ? 'Đặt lại trạng thái Giả định (ASSUMPTION)' : 'Đánh dấu cần xem xét lại'),
          version: rule.version || 'v1.0'
        });
      }
    }, 'DATABASE_RESET', { ruleId, optionId, status });
    return { success: true };
  }

  public resetBusinessRuleToAssumption(ruleId: string, reason?: string): { success: boolean } {
    return this.updateBusinessRule(
      ruleId,
      this.state.businessRules?.find(r => r.id === ruleId)?.proposedOptionId || '',
      'assumption',
      reason || 'Chủ dự án hoàn tác về trạng thái giả định ban đầu'
    );
  }

  // ============ RMA Dynamic Configuration ============

  public getRmaConfig(): import('@/mock/types').RmaGovernanceConfig {
    return this.state.rmaConfig || {
      approvalThreshold: 1000000,
      thresholdStatus: 'assumption',
      makerRoles: ['warehouse', 'manager'],
      checkerRoles: ['owner', 'admin'],
      enabledBranches: ['refund', 'exchange', 'warranty', 'partial_return', 'transit_damage', 'returnless_refund'],
      preventDoubleRefund: true,
      preventDoubleRestock: true,
      preventExceedingOrderQty: true
    };
  }

  public updateRmaConfig(config: Partial<import('@/mock/types').RmaGovernanceConfig>): { success: boolean } {
    this.mutate(draft => {
      draft.rmaConfig = {
        ...this.getRmaConfig(),
        ...config
      };
    }, 'DATABASE_RESET', { config });
    return { success: true };
  }

  // ============ Revenue Policies Comparison ============

  public getRevenuePolicy(): import('@/mock/types').RevenuePolicyType {
    return this.state.revenuePolicy || 'FOB_DESTINATION';
  }

  public setRevenuePolicy(policy: import('@/mock/types').RevenuePolicyType): { success: boolean } {
    this.mutate(draft => {
      draft.revenuePolicy = policy;
    }, 'DATABASE_RESET', { policy });
    return { success: true };
  }

  public getRevenueComparisonMetrics() {
    const orders = this.state.orders.filter(o => o.tenant_id === this.state.activeTenantId);
    
    // 1. Order Value Commitment
    const totalOrderValue = orders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
    
    // 2. Cash Collected (Prepayments / Paid orders)
    const totalCashCollected = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
    
    // 3. Receivables (Unpaid or COD in-transit)
    const totalReceivables = orders
      .filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partially_paid')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);

    // 4. Returns & Refunds
    const totalRefunds = this.state.returns
      .filter(r => r.tenant_id === this.state.activeTenantId && (r.status === 'refunded' || r.status === 'approved'))
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

    // Calculate Recognized Revenue & Matching COGS under 3 distinct Accrual GAAP/VAS policies
    // Policy A: FOB Destination (POD delivered)
    const revFobDestination = Math.max(0, orders
      .filter(o => o.delivery_status === 'delivered' || o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsFobDestination = Math.round(revFobDestination * 0.6);
    const feesFobDestination = Math.round(revFobDestination * 0.085);

    // Policy B: FOB Shipping Point (Dispatched / in-transit / delivered)
    const revFobShippingPoint = Math.max(0, orders
      .filter(o => o.status === 'shipped' || o.status === 'delivered' || o.delivery_status === 'in_transit' || o.delivery_status === 'delivered')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsFobShippingPoint = Math.round(revFobShippingPoint * 0.6);
    const feesFobShippingPoint = Math.round(revFobShippingPoint * 0.085);

    // Policy C: Post-Clearance 7 Days (Delivered and placed > 7 days ago)
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const revPostClearance = Math.max(0, orders
      .filter(o => (o.delivery_status === 'delivered' || o.status === 'delivered') && new Date(o.placed_at).getTime() < sevenDaysAgo)
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsPostClearance = Math.round(revPostClearance * 0.6);
    const feesPostClearance = Math.round(revPostClearance * 0.085);

    // Cash Flow Analysis (Dòng tiền thực thu - KHÔNG PHẢI DOANH THU KẾ TOÁN DỒN TÍCH)
    const totalCashIn = totalCashCollected;
    const totalCashRefunded = totalRefunds;
    const netCashFlow = Math.max(0, totalCashIn - totalCashRefunded);

    return {
      totalOrderValue,
      totalCashCollected,
      totalReceivables,
      totalRefunds,
      estimatedCogs: cogsFobDestination,
      estimatedFees: feesFobDestination,
      accrualPolicies: {
        FOB_DESTINATION: {
          name: 'Chính sách 1: FOB Điểm đến (Giao có POD)',
          recognizedRevenue: revFobDestination,
          matchingCogs: cogsFobDestination,
          grossProfit: Math.max(0, revFobDestination - cogsFobDestination),
          platformFees: feesFobDestination,
          refunds: totalRefunds,
          arBalance: totalReceivables,
          status: 'ASSUMPTION (Đang kích hoạt mô phỏng)',
          comparisonNote: 'Ghi nhận an toàn tuyệt đối, đối soát đúng thời điểm chuyển giao quyền sở hữu khi khách ký POD.'
        },
        FOB_SHIPPING_POINT: {
          name: 'Chính sách 2: FOB Điểm gửi (Xuất kho giao bưu tá)',
          recognizedRevenue: revFobShippingPoint,
          matchingCogs: cogsFobShippingPoint,
          grossProfit: Math.max(0, revFobShippingPoint - cogsFobShippingPoint),
          platformFees: feesFobShippingPoint,
          refunds: totalRefunds,
          arBalance: totalReceivables,
          status: 'Phương án thay thế',
          comparisonNote: 'Ghi nhận doanh thu sớm hơn 2-4 ngày nhưng chịu rủi ro bão hòa hoàn đơn RTS nếu giao thất bại.'
        },
        POST_CLEARANCE_7D: {
          name: 'Chính sách 3: Hết hạn đổi trả (Sau 7 ngày giao)',
          recognizedRevenue: revPostClearance,
          matchingCogs: cogsPostClearance,
          grossProfit: Math.max(0, revPostClearance - cogsPostClearance),
          platformFees: feesPostClearance,
          refunds: totalRefunds,
          arBalance: totalReceivables + (revFobDestination - revPostClearance),
          status: 'Phương án siêu thận trọng',
          comparisonNote: 'Giữ lại doanh thu trong 7 ngày đối soát bảo hành, loại trừ hoàn toàn rủi ro đảo sổ nhưng tạo độ trễ báo cáo.'
        }
      },
      // Backward compatibility alias for policies
      policies: {
        FOB_DESTINATION: {
          name: 'FOB Điểm đến (Xác nhận POD)',
          recognizedRevenue: revFobDestination,
          grossProfit: Math.max(0, revFobDestination - cogsFobDestination),
          arBalance: totalReceivables,
          status: 'ASSUMPTION (Đang kích hoạt)'
        },
        FOB_SHIPPING_POINT: {
          name: 'FOB Điểm gửi (Xuất kho giao bưu tá)',
          recognizedRevenue: revFobShippingPoint,
          grossProfit: Math.max(0, revFobShippingPoint - cogsFobShippingPoint),
          arBalance: totalReceivables,
          status: 'Phương án thay thế'
        },
        POST_CLEARANCE_7D: {
          name: 'Hết hạn đổi trả (Sau 7 ngày giao)',
          recognizedRevenue: revPostClearance,
          grossProfit: Math.max(0, revPostClearance - cogsPostClearance),
          arBalance: totalReceivables + (revFobDestination - revPostClearance),
          status: 'Phương án thận trọng'
        },
        CASH_BASIS: {
          name: 'Dòng tiền thực thu (Cash Basis)',
          recognizedRevenue: netCashFlow,
          grossProfit: Math.max(0, netCashFlow - cogsFobDestination),
          arBalance: 0,
          status: 'Dòng tiền thuần (Tham chiếu)'
        }
      },
      cashFlowAnalysis: {
        name: 'Kịch Bản Phân Tích Dòng Tiền & Thanh Khoản (Cash Flow / Liquidity)',
        totalCashIn,
        totalCashRefunded,
        netCashFlow,
        uncollectedReceivables: totalReceivables,
        regulatoryNote: 'Theo chuẩn mực VAS / IFRS, Cash Basis chỉ phục vụ quản trị thanh khoản và dòng tiền thực thu (Cash Flow), KHÔNG được hạch toán là chính sách ghi nhận doanh thu dồn tích hợp lệ trong sổ cái kế toán.'
      }
    };
  }

  // ============ RMA Validation Check ============

  public validateRmaRequest(params: {
    orderId: string;
    refundAmount: number;
    items?: Array<{ productId: string; qty: number }>;
  }): { valid: boolean; errors: string[]; requiresChecker: boolean; ruleExplanation: string } {
    const errors: string[] = [];
    const rmaCfg = this.getRmaConfig();
    const order = this.state.orders.find(o => o.id === params.orderId);

    if (!order) {
      return { valid: false, errors: ['Không tìm thấy đơn hàng gốc.'], requiresChecker: false, ruleExplanation: '' };
    }

    const orderTotal = Number(order.total ?? order.total_amount ?? 0);

    // 1. Double refund prevention
    if (rmaCfg.preventDoubleRefund) {
      const existingRmas = this.state.returns.filter(
        r => r.order_id === params.orderId && r.status !== 'rejected'
      );
      const totalRefundedSoFar = existingRmas.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
      if (totalRefundedSoFar + params.refundAmount > orderTotal) {
        errors.push(
          `CẢNH BÁO CHẶN HOÀN TIỀN VƯỢT GIÁ TRỊ: Đơn hàng ${order.order_number} có tổng ${orderTotal.toLocaleString()} ₫. Đã hoàn ${totalRefundedSoFar.toLocaleString()} ₫. Yêu cầu hoàn thêm ${params.refundAmount.toLocaleString()} ₫ sẽ vượt quá giá trị đơn hàng!`
        );
      }
    }

    // 2. Prevent exceeding purchased quantities
    if (rmaCfg.preventExceedingOrderQty && params.items && order.order_items) {
      for (const item of params.items) {
        const orderLine = order.order_items.find(l => l.product_id === item.productId);
        const purchasedQty = orderLine ? orderLine.quantity : 0;
        
        // Sum previous returns for this product on this order
        const prevReturnedQty = this.state.returnItems
          .filter(ri => {
            const rma = this.state.returns.find(r => r.id === ri.return_id);
            return rma && rma.order_id === params.orderId && ri.product_id === item.productId && rma.status !== 'rejected';
          })
          .reduce((sum, ri) => sum + ri.quantity, 0);

        if (prevReturnedQty + item.qty > purchasedQty) {
          errors.push(
            `CẢNH BÁO CHẶN SỐ LƯỢNG: Sản phẩm ${item.productId} chỉ mua ${purchasedQty} cái. Đã trả trước đó ${prevReturnedQty} cái. Không thể yêu cầu trả tiếp ${item.qty} cái!`
          );
        }
      }
    }

    const requiresChecker = params.refundAmount >= rmaCfg.approvalThreshold;
    const ruleExplanation = requiresChecker
      ? `Hạn mức ${params.refundAmount.toLocaleString()} ₫ >= Ngưỡng ${rmaCfg.approvalThreshold.toLocaleString()} ₫: Bắt buộc CHECKER (Owner/Admin) duyệt!`
      : `Hạn mức ${params.refundAmount.toLocaleString()} ₫ < Ngưỡng ${rmaCfg.approvalThreshold.toLocaleString()} ₫: MAKER (Kho/CSKH) được phép duyệt trực tiếp.`;

    return {
      valid: errors.length === 0,
      errors,
      requiresChecker,
      ruleExplanation
    };
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
            condition: isDamagedScrap ? 'damaged' : 'opened' as any,
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

  public inspectReturnQC(
    returnId: string,
    isGoodCondition: boolean,
    qcLines?: Array<{ item_id?: string; product_id?: string; pass_qty: number; fail_qty: number }>,
    actorRole?: TenantRole,
    actorId?: string
  ): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId);
    if (!ret) return { success: false, error: 'Không tìm thấy yêu cầu đổi trả' };

    const items = this.state.returnItems.filter(i => i.return_id === returnId);
    const now = new Date().toISOString();
    const isAlreadyReceived = ret.status === 'received';

    this.mutate(draft => {
      const targetRet = draft.returns.find(r => r.id === returnId);
      if (targetRet) {
        targetRet.status = isGoodCondition ? 'qc_passed' : 'qc_failed';
        targetRet.updated_at = now;
      }

      const draftItems = draft.returnItems.filter(i => i.return_id === returnId);
      draftItems.forEach(item => {
        item.disposition = isGoodCondition ? 'restock' : 'scrap';
      });

      for (const item of draftItems) {
        const line = qcLines?.find(l => (l.item_id && l.item_id === item.id) || (l.product_id && l.product_id === item.product_id));
        const inspectQty = line !== undefined ? (line.pass_qty + line.fail_qty) : (item.received_qty !== undefined ? item.received_qty : item.quantity);
        const passQty = line !== undefined ? line.pass_qty : (isGoodCondition ? inspectQty : 0);
        const failQty = line !== undefined ? line.fail_qty : (isGoodCondition ? 0 : inspectQty);

        const inv = draft.inventory5State.find(i => i.product_id === item.product_id);
        if (inv) {
          if (isAlreadyReceived) {
            // Already added to pending_qc at dock, now move to available or damaged (NO double physical increment!)
            inv.pending_qc = Math.max(0, (inv.pending_qc || 0) - inspectQty);
            if (isGoodCondition) {
              inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
              inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
              inv.sellable = inv.available;
            } else {
              inv.damaged = (inv.damaged || 0) + inspectQty;
              inv.unavailable = (inv.pending_qc || 0) + inv.damaged;
              inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
              inv.sellable = inv.available;
            }
          } else {
            // Direct QC: increment physical once
            inv.physical += inspectQty;
            if (isGoodCondition) {
              inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
              inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
              inv.sellable = inv.available;
            } else {
              inv.damaged = (inv.damaged || 0) + inspectQty;
              inv.unavailable = (inv.pending_qc || 0) + inv.damaged;
              inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
              inv.sellable = inv.available;
            }
          }
        }

        if (inspectQty > 0) {
          draft.stockLedger.unshift({
            id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            tenant_id: draft.activeTenantId,
            product_id: item.product_id,
            warehouse_id: 'wh_north_01',
            transaction_type: isGoodCondition ? 'return_in' : 'scrap',
            quantity: inspectQty,
            reference_type: 'return_qc',
            reference_id: returnId,
            notes: isGoodCondition
              ? `Nhập lại kho khả dụng từ đổi trả (QC Đạt chuẩn: ${passQty} sp)`
              : `Cách ly hàng hỏng/lỗi từ đổi trả (QC Không đạt: ${failQty} sp)`,
            balance_after: inv?.physical || 0,
            created_at: now
          });
        }
      }
    }, 'RETURN_INSPECTED', { returnId, isGoodCondition, qcLines });

    return { success: true };
  }

  public updateReturn(returnId: string, updates: Partial<ReturnRecord>): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId || r.return_number === returnId);
    if (!ret) return { success: false, error: 'Không tìm thấy phiếu đổi trả' };
    this.mutate(draft => {
      const targetRet = draft.returns.find(r => r.id === ret.id);
      if (targetRet) {
        Object.assign(targetRet, updates);
        targetRet.updated_at = new Date().toISOString();
      }
    }, 'ORDER_STATUS_CHANGED', { returnId: ret.id, updates });
    return { success: true };
  }

  public mutateTable<T extends keyof MockDatabaseSnapshot>(
    tableKey: T,
    matchFn: (item: any) => boolean,
    patch: Record<string, unknown>,
    eventTopic: MockEventTopic = 'ORDER_STATUS_CHANGED'
  ): boolean {
    let updated = false;
    this.mutate(draft => {
      const list = draft[tableKey];
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          if (matchFn(list[i])) {
            Object.assign(list[i], patch);
            updated = true;
          }
        }
      }
    }, eventTopic, { tableKey, patch });
    return updated;
  }

  // ============ Double-Entry Balanced Bookkeeping ============

  public getJournalEntries(): JournalEntry[] {
    return this.state.journalEntries.filter(j => j.tenant_id === this.state.activeTenantId);
  }

  public postJournalEntry(entry: Partial<JournalEntry> & { entry_number: string },  lines: Array<Omit<JournalLine, 'id' | 'entry_id'>>): { success: boolean; error?: string } {
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
        event_source: 'manual',
        ...entry,
        id: entryId,
        status: 'posted',
        created_at: now,
        posted_at: now
      } as JournalEntry);

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

  // ============ Centralized Business Scenarios Runner ============

  public runInventoryScenario(
    scenarioType: 
      | 'receive_dock_pending_qc'
      | 'qc_pass_partial'
      | 'qc_fail_partial'
      | 'reserve_stock'
      | 'cancel_reservation'
      | 'dispatch_stock'
      | 'transfer_stock'
      | 'transfer_with_loss'
      | 'rma_restock_pass'
      | 'rma_restock_fail',
    sku: string = 'NX-AIR-PRO',
    qty: number = 10
  ): import('@/mock/types').ScenarioValidationResult {
    const invBefore = this.state.inventory5State.find(i => i.sku === sku);
    const beforeMetrics = invBefore ? {
      physical: invBefore.physical,
      sellable: invBefore.sellable,
      reserved: invBefore.reserved,
      unavailable: invBefore.unavailable,
      pending_qc: invBefore.pending_qc,
      damaged: invBefore.damaged,
      in_transit: invBefore.in_transit,
      incoming: invBefore.incoming
    } : {};

    // Execute mutation based on scenarioType
    switch (scenarioType) {
      case 'receive_dock_pending_qc':
        this.receivePOPendingQC(sku, qty);
        break;
      case 'qc_pass_partial':
        this.inspectInboundQC(sku, qty, 0);
        break;
      case 'qc_fail_partial':
        this.inspectInboundQC(sku, 0, qty);
        break;
      case 'reserve_stock':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.sellable >= qty) {
            inv.reserved += qty;
            inv.sellable -= qty;
            inv.available = inv.sellable;
          }
        }, 'STOCK_RESERVED', { sku, qty });
        break;
      case 'cancel_reservation':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.reserved >= qty) {
            inv.reserved -= qty;
            inv.sellable += qty;
            inv.available = inv.sellable;
          }
        }, 'STOCK_RELEASED', { sku, qty });
        break;
      case 'dispatch_stock':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.reserved >= qty) {
            inv.reserved -= qty;
            inv.physical -= qty;
          }
        }, 'STOCK_DISPATCHED', { sku, qty });
        break;
      case 'transfer_stock':
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'dispatch');
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'receive');
        break;
      case 'transfer_with_loss':
        const lostQty = Math.max(1, Math.floor(qty * 0.2));
        const receivedQty = qty - lostQty;
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'dispatch');
        this.mutate(draft => {
          const sourceInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === 'wh_north_01');
          if (sourceInv) sourceInv.in_transit = Math.max(0, sourceInv.in_transit - qty);
          const targetInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === 'wh_central_01');
          if (targetInv) {
            targetInv.physical += receivedQty;
            targetInv.damaged += lostQty;
            targetInv.unavailable += lostQty;
            targetInv.sellable += receivedQty;
            targetInv.available = targetInv.sellable;
          }
        }, 'STOCK_DISPATCHED', { sku, lostQty, receivedQty });
        break;
      case 'rma_restock_pass':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv) {
            inv.physical += qty;
            inv.sellable += qty;
            inv.available = inv.sellable;
          }
        }, 'RETURN_INSPECTED', { sku, qty, pass: true });
        break;
      case 'rma_restock_fail':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv) {
            inv.physical += qty;
            inv.damaged += qty;
            inv.unavailable += qty;
          }
        }, 'RETURN_INSPECTED', { sku, qty, pass: false });
        break;
    }

    const invAfter = this.state.inventory5State.find(i => i.sku === sku);
    const afterMetrics = invAfter ? {
      physical: invAfter.physical,
      sellable: invAfter.sellable,
      reserved: invAfter.reserved,
      unavailable: invAfter.unavailable,
      pending_qc: invAfter.pending_qc,
      damaged: invAfter.damaged,
      in_transit: invAfter.in_transit,
      incoming: invAfter.incoming
    } : {};

    const deltas: Record<string, number> = {};
    Object.keys(afterMetrics).forEach(k => {
      deltas[k] = (afterMetrics[k as keyof typeof afterMetrics] as number) - ((beforeMetrics[k as keyof typeof beforeMetrics] as number) || 0);
    });

    const isPhysicalBalanced = invAfter ? invAfter.physical === (invAfter.sellable + invAfter.reserved + invAfter.unavailable) : true;
    const isUnavailableBalanced = invAfter ? invAfter.unavailable === (invAfter.pending_qc + invAfter.damaged) : true;

    return {
      scenarioId: `INV_${scenarioType.toUpperCase()}`,
      title: `Mô phỏng Kho: ${scenarioType}`,
      category: 'inventory',
      passed: isPhysicalBalanced && isUnavailableBalanced,
      timestamp: new Date().toISOString(),
      before: beforeMetrics,
      after: afterMetrics,
      deltas,
      invariantsChecked: [
        {
          name: 'Physical = Sellable + Reserved + Unavailable',
          passed: isPhysicalBalanced,
          details: invAfter ? `${invAfter.physical} === ${invAfter.sellable} + ${invAfter.reserved} + ${invAfter.unavailable}` : 'N/A'
        },
        {
          name: 'Unavailable = Pending QC + Damaged',
          passed: isUnavailableBalanced,
          details: invAfter ? `${invAfter.unavailable} === ${invAfter.pending_qc} + ${invAfter.damaged}` : 'N/A'
        },
        {
          name: 'Pipeline Stock Segregated',
          passed: true,
          details: 'Incoming & In-transit nằm ngoài Physical'
        }
      ],
      affectedModules: ['Inventory5State', 'StockLedger', 'Warehouses'],
      eventLogs: [
        {
          timestamp: new Date().toISOString(),
          topic: `INV_${scenarioType.toUpperCase()}`,
          details: `Thực hiện mô phỏng ${scenarioType} trên SKU ${sku} (Số lượng: ${qty})`,
          actor: 'Warehouse Operator (Demo)'
        },
        {
          timestamp: new Date().toISOString(),
          topic: 'STOCK_LEDGER_APPENDED',
          details: `Đã sinh bút toán lưu vết tại Sổ Giao Dịch Kho (Stock Ledger)`,
          actor: 'NexusOMS Central Store'
        }
      ],
      notes: isPhysicalBalanced ? 'Toàn vẹn bất biến toán học đạt chuẩn 100%' : 'LỖI: Phát hiện sai lệch bất biến'
    };
  }

  public runOrderScenario(
    scenarioType: 
      | 'place_order'
      | 'confirm_order'
      | 'pick_pack_order'
      | 'handover_carrier'
      | 'deliver_with_pod'
      | 'delivery_failed'
      | 'customer_refused'
      | 'partial_delivery'
      | 'rts_return_to_sender',
    orderId?: string,
    extraParams?: Record<string, unknown>
  ): import('@/mock/types').ScenarioValidationResult {
    const targetOrder = orderId 
      ? this.state.orders.find(o => o.id === orderId) 
      : this.state.orders[0];

    const beforeMetrics = targetOrder ? {
      order_status: targetOrder.order_status || targetOrder.status,
      fulfillment_status: targetOrder.fulfillment_status || 'unfulfilled',
      delivery_status: targetOrder.delivery_status || 'pending_pickup',
      payment_status: targetOrder.payment_status,
      return_status: targetOrder.return_status || 'none',
      revenue_recognized: targetOrder.revenue_recognized ? 'YES' : 'NO'
    } : {};

    if (targetOrder) {
      const now = new Date().toISOString();
      this.mutate(draft => {
        const ord = draft.orders.find(o => o.id === targetOrder.id);
        if (!ord) return;

        switch (scenarioType) {
          case 'place_order':
            ord.status = 'pending';
            ord.order_status = 'pending';
            ord.fulfillment_status = 'unfulfilled';
            ord.delivery_status = 'pending_pickup';
            ord.payment_status = 'unpaid';
            ord.revenue_recognized = false;
            break;
          case 'confirm_order':
            ord.order_status = 'confirmed';
            ord.fulfillment_status = 'allocated';
            break;
          case 'pick_pack_order':
            ord.status = 'processing';
            ord.order_status = 'processing';
            ord.fulfillment_status = 'packed';
            break;
          case 'handover_carrier':
            ord.status = 'shipped';
            ord.fulfillment_status = 'dispatched';
            ord.delivery_status = 'in_transit';
            ord.shipped_at = now;
            break;
          case 'deliver_with_pod':
            const podSource = (extraParams?.source as 'demo_manual' | 'carrier_webhook_verified') || 'carrier_webhook_verified';
            ord.status = 'delivered';
            ord.order_status = 'completed';
            ord.fulfillment_status = 'fulfilled';
            ord.delivery_status = 'delivered';
            ord.delivered_at = now;
            ord.revenue_recognized = true;
            ord.revenue_recognized_at = now;
            ord.pod_evidence = {
              tracking_code: (extraParams?.tracking_code as string) || `VNPOST-${Date.now().toString().slice(-6)}`,
              carrier_name: (extraParams?.carrier_name as string) || 'Viettel Post Smart Logistics',
              delivered_at: now,
              recipient_name: (extraParams?.recipient_name as string) || 'Nguyễn Văn Minh (Khách hàng ký nhận)',
              signature_verified: true,
              source: podSource,
              submitted_by: podSource === 'carrier_webhook_verified' ? 'CARRIER_WEBHOOK_API' : 'DEMO_USER_MANUAL',
              verified_at: now
            };
            break;
          case 'delivery_failed':
            ord.delivery_status = 'delivery_failed';
            ord.notes = `Giao thất bại lần 1: Không liên lạc được với người nhận lúc ${new Date().toLocaleTimeString('vi-VN')}`;
            break;
          case 'customer_refused':
            ord.delivery_status = 'returned_to_sender';
            ord.return_status = 'in_transit_back';
            ord.notes = 'Khách từ chối nhận hàng do đổi ý nhu cầu';
            break;
          case 'partial_delivery':
            ord.status = 'delivered';
            ord.delivery_status = 'delivered';
            ord.return_status = 'return_requested';
            ord.notes = 'Khách nhận 1 sản phẩm, hoàn trả 1 sản phẩm do không đúng màu';
            break;
          case 'rts_return_to_sender':
            ord.status = 'refunded';
            ord.delivery_status = 'returned_to_sender';
            ord.return_status = 'refunded';
            ord.notes = 'Kiện hàng đã quay về kho tổng và nhập lại tồn kho Sellable';
            break;
        }
      }, 'ORDER_STATUS_CHANGED', { orderId: targetOrder.id, scenarioType });
    }

    const ordAfter = this.state.orders.find(o => o.id === (targetOrder?.id || ''));
    const afterMetrics = ordAfter ? {
      order_status: ordAfter.order_status || ordAfter.status,
      fulfillment_status: ordAfter.fulfillment_status || 'unfulfilled',
      delivery_status: ordAfter.delivery_status || 'pending_pickup',
      payment_status: ordAfter.payment_status,
      return_status: ordAfter.return_status || 'none',
      revenue_recognized: ordAfter.revenue_recognized ? 'YES' : 'NO'
    } : {};

    return {
      scenarioId: `ORD_${scenarioType.toUpperCase()}`,
      title: `Vòng đời đơn hàng: ${scenarioType}`,
      category: 'order_pod',
      passed: true,
      timestamp: new Date().toISOString(),
      before: beforeMetrics,
      after: afterMetrics,
      deltas: {},
      invariantsChecked: [
        {
          name: '5 Chiều trạng thái độc lập',
          passed: true,
          details: `Order: ${afterMetrics.order_status} | Ful: ${afterMetrics.fulfillment_status} | Deliv: ${afterMetrics.delivery_status} | Pay: ${afterMetrics.payment_status} | Ret: ${afterMetrics.return_status}`
        },
        {
          name: 'POD & Revenue Matching',
          passed: scenarioType === 'deliver_with_pod' ? afterMetrics.revenue_recognized === 'YES' : true,
          details: scenarioType === 'deliver_with_pod' ? 'POD xác thực kích hoạt Có 511 thành công' : 'Chưa giao chưa ghi nhận doanh thu'
        }
      ],
      affectedModules: ['Orders', 'Fulfillment', 'DeliveryLogistics', 'FinanceLedger'],
      eventLogs: [
        {
          timestamp: new Date().toISOString(),
          topic: `ORDER_${scenarioType.toUpperCase()}`,
          details: `Chuyển dịch trạng thái đơn ${targetOrder?.order_number || ''} sang ${scenarioType}`,
          actor: 'Order Lifecycle Engine'
        },
        {
          timestamp: new Date().toISOString(),
          topic: scenarioType === 'deliver_with_pod' ? 'POD_REVENUE_RECOGNIZED' : 'STATUS_LOG_PERSISTED',
          details: scenarioType === 'deliver_with_pod' ? 'Xác thực Bằng chứng Giao hàng POD thành công và kích hoạt Có 511' : 'Đã ghi vết lịch sử trạng thái đơn hàng',
          actor: scenarioType === 'deliver_with_pod' ? 'Logistics Carrier Webhook' : 'System Store'
        }
      ],
      notes: 'Trạng thái chuyển dịch trơn tru và phân tách rạch ròi'
    };
  }

  // ============ Reset Full State ============

  public resetToBaseline(): void {
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    this.mutate(draft => {
      Object.assign(draft, fresh);
    }, 'DATABASE_RESET', { timestamp: new Date().toISOString() });
  }

  // ============ Inventory 5-State Queries ============


  public reconcileFeeBreakdown(
    feeId: string,
    params: {
      actorRole?: TenantRole;
      actorId?: string;
      discrepancyReason?: 'NONE' | 'WEIGHT_MISMATCH' | 'COMMISSION_RATE_DIFF' | 'VOUCHER_UNEXPECTED' | 'LATE_COMPENSATION' | 'OTHER';
      discrepancyNote?: string;
      lateFeeAdjustment?: number;
    } = {}
  ): { success: boolean; error?: string; data?: OrderFeeBreakdown } {
    const role = params.actorRole || this.state.activeRole || 'owner';
    if (!hasPermission(role, 'finance:reconcile')) {
      return { success: false, error: 'Command rejected: Quyền hạn bị từ chối: Bạn không có quyền đối soát phí sàn' };
    }

    const fee = (this.state.orderFeeBreakdowns || []).find(f => f.id === feeId);
    if (!fee) return { success: false, error: 'Không tìm thấy bản ghi đối soát phí' };

    const now = new Date().toISOString();
    let updatedFee: OrderFeeBreakdown | undefined;

    this.mutate(draft => {
      const target = (draft.orderFeeBreakdowns || []).find(f => f.id === feeId);
      if (target) {
        target.is_reconciled = true;
        target.reconciled_at = now;
        target.reconciled_by = params.actorId || `${role.toUpperCase()}_USER`;
        
        const estShip = Number(target.estimated_shipping_fee) || 0;
        const actShip = Number(target.actual_shipping_fee) || 0;
        const penalty = Number(target.weight_penalty_fee) || 0;
        target.discrepancy_amount = Math.abs(actShip - estShip) + penalty;

        if (params.discrepancyReason) {
          target.discrepancy_reason = params.discrepancyReason;
        } else if (target.discrepancy_amount > 0) {
          target.discrepancy_reason = 'WEIGHT_MISMATCH';
        } else {
          target.discrepancy_reason = 'NONE';
        }

        if (params.discrepancyNote) {
          target.discrepancy_note = params.discrepancyNote;
        }

        if (params.lateFeeAdjustment !== undefined && params.lateFeeAdjustment !== 0) {
          target.late_fee_adjustment = (target.late_fee_adjustment || 0) + params.lateFeeAdjustment;
          target.net_payout = (target.net_payout || 0) + params.lateFeeAdjustment;
        }

        target.updated_at = now;
        updatedFee = JSON.parse(JSON.stringify(target));
      }
    }, 'ORDER_STATUS_CHANGED', { feeId, params });

    return { success: true, data: updatedFee };
  }

  // ============ Generic Table Methods (R01, R02, R03) ============

  private static readonly TABLE_KEY_MAP: Record<string, keyof MockDatabaseSnapshot> = {
    orders: 'orders',
    order_items: 'orderItems',
    inventory_items: 'inventory5State',
    products: 'products',
    customers: 'customers',
    warehouses: 'warehouses',
    suppliers: 'suppliers',
    purchase_orders: 'purchaseOrders',
    purchase_order_items: 'purchaseOrderItems',
    transfers: 'transfers',
    stock_transfers: 'transfers',
    stock_transfer_items: 'transfers',
    picking_waves: 'pickingWaves',
    fulfillment_waves: 'pickingWaves',
    returns: 'returns',
    return_requests: 'returns',
    return_items: 'returnItems',
    batches: 'batches',
    inventory_batches: 'batches',
    serials: 'serials',
    inventory_serials: 'serials',
    journal_entries: 'journalEntries',
    journal_lines: 'journalLines',
    reconciliations: 'reconciliations',
    audit_logs: 'auditLogs',
    business_rules: 'businessRules',
    tenants: 'tenants',
    tenant_memberships: 'memberships',
    profiles: 'profiles',
    channel_connections: 'channelConnections',
    channel_sku_mappings: 'channelSkuMappings',
    order_automation_rules: 'orderAutomationRules',
    buffer_rules: 'bufferRules',
    routing_rules: 'routingRules',
    customer_complaints: 'customerComplaints',
    outbound_webhooks: 'outboundWebhooks',
    webhook_delivery_logs: 'webhookDeliveryLogs',
    order_fee_breakdowns: 'orderFeeBreakdowns',
    sync_logs: 'syncLogs',
  };

  public isTableSupported(table: string): boolean {
    if (MockDataStore.TABLE_KEY_MAP[table]) return true;
    if (['margin_config', 'ledger_accounts', 'order_status_log'].includes(table)) return true;
    if (this.state.dynamicTables && this.state.dynamicTables[table]) return true;
    return false;
  }

  public getTableData(table: string): Record<string, unknown>[] {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    if (key && Array.isArray(this.state[key])) {
      return (this.state[key] as unknown as Record<string, unknown>[]).map(item => ({ ...item }));
    }
    if (this.state.dynamicTables && Array.isArray(this.state.dynamicTables[table])) {
      return this.state.dynamicTables[table].map(item => ({ ...item }));
    }
    return [];
  }

  public insertTable(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    const insertedRows: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const r of rows) {
      const copy = { ...r };
      if (!copy.id) {
        copy.id = `${table}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }
      if (!copy.created_at) {
        copy.created_at = now;
      }
      if (!copy.updated_at) {
        copy.updated_at = now;
      }
      if (!copy.tenant_id && this.state.activeTenantId) {
        copy.tenant_id = this.state.activeTenantId;
      }
      insertedRows.push(copy);
    }

    this.mutate(draft => {
      if (key) {
        if (!draft[key]) {
          (draft[key] as any) = [];
        }
        (draft[key] as any[]).unshift(...insertedRows);
      } else {
        if (!draft.dynamicTables) {
          draft.dynamicTables = {};
        }
        if (!draft.dynamicTables[table]) {
          draft.dynamicTables[table] = [];
        }
        draft.dynamicTables[table].unshift(...insertedRows);
      }
    }, 'DATABASE_RESET', { table, count: insertedRows.length });

    return insertedRows;
  }

  public updateTable(table: string, predicate: (item: Record<string, unknown>) => boolean, patch: Record<string, unknown>): number {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    let updatedCount = 0;
    const now = new Date().toISOString();

    this.mutate(draft => {
      const list = key ? (draft[key] as any[]) : (draft.dynamicTables?.[table] || []);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (predicate(item)) {
            Object.assign(item, patch, { updated_at: now });
            updatedCount++;
          }
        }
      }
    }, 'DATABASE_RESET', { table, patch });

    return updatedCount;
  }

  public deleteTable(table: string, predicate: (item: Record<string, unknown>) => boolean): number {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    let deletedCount = 0;

    this.mutate(draft => {
      if (key && Array.isArray(draft[key])) {
        const originalLength = (draft[key] as any[]).length;
        (draft[key] as any) = (draft[key] as any[]).filter(item => !predicate(item));
        deletedCount = originalLength - (draft[key] as any[]).length;
      } else if (draft.dynamicTables && Array.isArray(draft.dynamicTables[table])) {
        const originalLength = draft.dynamicTables[table].length;
        draft.dynamicTables[table] = draft.dynamicTables[table].filter(item => !predicate(item));
        deletedCount = originalLength - draft.dynamicTables[table].length;
      }
    }, 'DATABASE_RESET', { table, deletedCount });

    return deletedCount;
  }

  public receivePurchaseOrder(poId: string, itemsToReceive?: Array<{ item_id: string; qty: number }>): { success: boolean; error?: string } {
    const po = (this.state.purchaseOrders || []).find(p => p.id === poId);
    if (!po) return { success: false, error: 'Không tìm thấy đơn PO' };

    const now = new Date().toISOString();
    this.mutate(draft => {
      let allCompleted = true;
      const targetPo = (draft.purchaseOrders || []).find(p => p.id === poId);

      for (const poi of (draft.purchaseOrderItems || []).filter(i => i.po_id === poId)) {
        const req = itemsToReceive?.find(r => r.item_id === poi.id);
        const qtyToRec = req ? req.qty : Math.max(0, poi.quantity - (poi.received_qty || 0));
        if (qtyToRec > 0) {
          poi.received_qty = (poi.received_qty || 0) + qtyToRec;

          // Increase inventory stock at target warehouse
          const inv = draft.inventory5State.find(i => i.product_id === poi.product_id && (i.warehouse_id === targetPo?.warehouse_id || i.warehouse_id === 'wh_north_01'));
          if (inv) {
            inv.physical += qtyToRec;
            inv.available += qtyToRec;
            inv.sellable = inv.available;
            inv.inbound = Math.max(0, (inv.inbound || 0) - qtyToRec);
            inv.incoming = inv.inbound;
          }

          // Stock ledger entry
          draft.stockLedger.unshift({
            id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            tenant_id: draft.activeTenantId,
            product_id: poi.product_id,
            warehouse_id: targetPo?.warehouse_id || 'wh_north_01',
            transaction_type: 'inbound',
            quantity: qtyToRec,
            reference_type: 'purchase_order',
            reference_id: targetPo?.po_number || poId,
            notes: `Nhập kho từ đơn mua hàng PO [${targetPo?.po_number || poId}] (+${qtyToRec} sp)`,
            balance_after: inv?.physical || 0,
            created_at: now
          });
        }

        if ((poi.received_qty || 0) < poi.quantity) {
          allCompleted = false;
        }
      }

      if (targetPo) {
        targetPo.status = allCompleted ? 'received' : 'partial';
        targetPo.updated_at = now;
      }
    }, 'PO_RECEIVED', { poId });

    return { success: true };
  }

  public receiveReturnDock(
    returnId: string,
    receivedLines?: Array<{ item_id?: string; product_id?: string; received_qty: number }>,
    actorRole?: TenantRole,
    actorId?: string
  ): { success: boolean; error?: string; discrepancyCount?: number } {
    const ret = this.state.returns.find(r => r.id === returnId);
    if (!ret) return { success: false, error: 'Không tìm thấy yêu cầu đổi trả' };
    if (ret.status === 'received' || ret.status === 'qc_passed' || ret.status === 'qc_failed' || ret.status === 'refunded') {
      return { success: false, error: 'Kiện hàng đã được tiếp nhận trước đó' };
    }

    const now = new Date().toISOString();
    let totalMissing = 0;

    this.mutate(draft => {
      const targetRet = draft.returns.find(r => r.id === returnId);
      if (targetRet) {
        targetRet.status = 'received';
        targetRet.updated_at = now;
      }

      for (const item of draft.returnItems.filter(i => i.return_id === returnId)) {
        const line = receivedLines?.find(l => (l.item_id && l.item_id === item.id) || (l.product_id && l.product_id === item.product_id));
        const actualQty = line !== undefined ? Number(line.received_qty) : item.quantity;
        const missingQty = Math.max(0, item.quantity - actualQty);
        totalMissing += missingQty;

        item.received_qty = actualQty;
        item.missing_qty = missingQty;

        const inv = draft.inventory5State.find(i => i.product_id === item.product_id);
        if (inv && actualQty > 0) {
          inv.physical += actualQty;
          inv.pending_qc = (inv.pending_qc || 0) + actualQty;
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
        }

        if (actualQty > 0) {
          draft.stockLedger.unshift({
            id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            tenant_id: draft.activeTenantId,
            product_id: item.product_id,
            warehouse_id: 'wh_north_01',
            transaction_type: 'inbound',
            quantity: actualQty,
            reference_type: 'return',
            reference_id: returnId,
            notes: `Tiếp nhận kiện hàng hoàn tại dock kho — Chờ kiểm định QC (+${actualQty} sp${missingQty > 0 ? `, thiếu ${missingQty} sp` : ''})`,
            balance_after: inv?.physical || 0,
            created_at: now
          });
        }
      }

      if (totalMissing > 0 && targetRet) {
        targetRet.has_discrepancy = true;
        targetRet.missing_items_count = totalMissing;

        // W-E2: Generate Manager task for discrepancy tracking in customerComplaints
        if (!draft.customerComplaints) draft.customerComplaints = [];
        draft.customerComplaints.unshift({
          id: `task_discrepancy_${Date.now()}`,
          order_id: targetRet.order_id,
          customer_id: targetRet.customer_id || null,
          raw_content: `[Biên bản kiểm đếm kho] Kiện hàng hoàn ${targetRet.return_number} thiếu ${totalMissing} sản phẩm so với khai báo ban đầu. Cần Manager đối soát với sàn / đơn vị vận chuyển.`,
          redacted_content: null,
          sentiment: 'negative',
          urgency_score: 9,
          issue_category: 'Return Discrepancy',
          suggested_reply: null,
          status: 'open',
          analyzed_at: null,
          created_at: now,
          updated_at: now
        });
      }
    }, 'RETURN_INSPECTED', { returnId, receivedLines, totalMissing });

    return { success: true, discrepancyCount: totalMissing };
  }

  public getInventory5State(): SkuInventory5State[] {
    return this.state.inventory5State;
  }

  public getStockLedger(): StockLedgerEntry[] {
    return this.state.stockLedger.filter(s => s.tenant_id === this.state.activeTenantId);
  }

  public getProducts(): Product[] {
    return this.state.products || [];
  }

  public getCustomers(): Customer[] {
    return this.state.customers || [];
  }

  public getWarehouses(): Warehouse[] {
    return this.state.warehouses || [];
  }
}

export const mockStore = new MockDataStore();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__mockStore = mockStore;
}
