import { mockStore } from './store';
import type { MockDatabaseSnapshot } from './types';
import type { Order } from '@/types';

type FilterOp =
  | { col: string; op: 'eq'; val: unknown }
  | { col: string; op: 'neq'; val: unknown }
  | { col: string; op: 'in'; val: unknown[] }
  | { col: string; op: 'is'; val: unknown }
  | { col: string; op: 'not'; subOp: string; val: unknown }
  | { col: string; op: 'gte'; val: unknown }
  | { col: string; op: 'gt'; val: unknown }
  | { col: string; op: 'lte'; val: unknown }
  | { col: string; op: 'lt'; val: unknown }
  | { col: string; op: 'like'; val: string }
  | { col: string; op: 'ilike'; val: string };

const DEFAULT_LEDGER_ACCOUNTS = [
  { id: 'acc_112', account_code: '112', account_name: 'Tiền gửi ngân hàng', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_131', account_code: '131', account_name: 'Phải thu khách hàng & Sàn TMĐT', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_156', account_code: '156', account_name: 'Hàng hóa tồn kho', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_3331', account_code: '3331', account_name: 'Thuế GTGT phải nộp', account_type: 'liability', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_3388', account_code: '3388', account_name: 'Phải trả phí dịch vụ & hoa hồng sàn', account_type: 'liability', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_511', account_code: '511', account_name: 'Doanh thu bán hàng & cung cấp dịch vụ', account_type: 'revenue', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_632', account_code: '632', account_name: 'Giá vốn hàng bán (COGS)', account_type: 'expense', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_641', account_code: '641', account_name: 'Chi phí bán hàng & Logistics', account_type: 'expense', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
];

class MockQueryBuilder {
  private table: string;
  private filters: FilterOp[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private rangeBounds: [number, number] | null = null;

  constructor(table: string) {
    this.table = table;
  }

  public select(_fields: string = '*') {
    void _fields;
    return this;
  }

  public eq(col: string, val: unknown) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  public neq(col: string, val: unknown) {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }

  public in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: 'in', val: vals });
    return this;
  }

  public is(col: string, val: unknown) {
    this.filters.push({ col, op: 'is', val });
    return this;
  }

  public not(col: string, subOp: string, val: unknown) {
    this.filters.push({ col, op: 'not', subOp, val });
    return this;
  }

  public gte(col: string, val: unknown) {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }

  public gt(col: string, val: unknown) {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }

  public lte(col: string, val: unknown) {
    this.filters.push({ col, op: 'lte', val });
    return this;
  }

  public lt(col: string, val: unknown) {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }

  public like(col: string, pattern: string) {
    this.filters.push({ col, op: 'like', val: pattern });
    return this;
  }

  public ilike(col: string, pattern: string) {
    this.filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  public order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  public limit(n: number) {
    this.limitCount = n;
    return this;
  }

  public range(from: number, to: number) {
    this.rangeBounds = [from, to];
    return this;
  }

  private normalizeOrder(o: Record<string, unknown>, snap: MockDatabaseSnapshot): Record<string, unknown> {
    const orderId = String(o.id || '');
    const items = snap.orderItems.filter(i => i.order_id === orderId).map(item => {
      const prod = snap.products.find(p => p.id === item.product_id);
      const unitPrice = Number(item.unit_price || 0);
      const quantity = Number(item.quantity || 1);
      const lineTotal = Number(item.line_total ?? item.total_price ?? (unitPrice * quantity));
      return {
        ...item,
        product_name: item.product_name || prod?.name || 'Sản phẩm Nexus',
        product_sku: item.product_sku || prod?.sku || 'NX-SKU',
        unit_price: unitPrice,
        quantity,
        line_total: lineTotal,
        total_price: lineTotal,
        unit_cost_mac_snapshot: item.unit_cost_mac_snapshot || prod?.cost_price || 0,
        is_free_gift: item.is_free_gift || false
      };
    });

    const subtotal = items.length > 0
      ? items.reduce((s, it) => s + it.line_total, 0)
      : Number(o.subtotal ?? o.total ?? o.total_amount ?? 0);
    const tax = Number(o.tax ?? 0);
    const shipping = Number(o.shipping ?? 0);
    const discount = Number(o.discount ?? 0);
    const total = Number(o.total ?? o.total_amount ?? (subtotal + tax + shipping - discount));
    const customer = snap.customers.find(c => c.id === o.customer_id) || snap.customers[0];

    return {
      ...o,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      total_amount: total,
      channel: o.channel || 'shopee',
      customer,
      order_items: items,
      items_count: items.length
    };
  }

  private getTableData(): Record<string, unknown>[] {
    const snap = mockStore.getSnapshot();

    // 1. Orders (Deep populated & Normalized)
    if (this.table === 'orders') {
      return snap.orders.map(o => this.normalizeOrder(o as unknown as Record<string, unknown>, snap));
    }

    // 2. Order Items (Deep populated)
    if (this.table === 'order_items') {
      return snap.orderItems.map(item => {
        const prod = snap.products.find(p => p.id === item.product_id);
        const unitPrice = Number(item.unit_price || 0);
        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.line_total ?? item.total_price ?? (unitPrice * quantity));
        return {
          ...item,
          product_name: item.product_name || prod?.name || 'Sản phẩm Nexus',
          product_sku: item.product_sku || prod?.sku || 'NX-SKU',
          unit_price: unitPrice,
          quantity,
          line_total: lineTotal,
          total_price: lineTotal,
          product: prod || null
        };
      });
    }

    // 3. Synthetic Inventory Items (Always synced to inventory5State)
    if (this.table === 'inventory_items') {
      return snap.inventory5State.map(inv => {
        const prod = snap.products.find(p => p.id === inv.product_id || p.sku === inv.sku);
        const wh = snap.warehouses.find(w => w.id === inv.warehouse_id) || snap.warehouses[0];
        return {
          id: `inv_${inv.product_id}_${inv.warehouse_id}`,
          tenant_id: snap.activeTenantId,
          warehouse_id: wh?.id || 'wh_north_01',
          product_id: prod?.id || inv.product_id,
          physical_qty: inv.physical,
          reserved_qty: inv.reserved,
          available_qty: inv.available,
          unavailable_qty: (inv.pending_qc || 0) + (inv.damaged || 0),
          pending_qc_qty: inv.pending_qc || 0,
          damaged_qty: inv.damaged || 0,
          in_transit_qty: inv.in_transit || 0,
          incoming_qty: inv.inbound || inv.incoming || 0,
          updated_at: new Date().toISOString(),
          warehouses: wh,
          products: prod ? { id: prod.id, name: prod.name, sku: prod.sku, safety_stock: prod.safety_stock || 10 } : { id: inv.product_id, name: inv.name, sku: inv.sku, safety_stock: 10 }
        };
      });
    }

    // 4. Fulfillment / Picking Waves
    if (this.table === 'fulfillment_waves' || this.table === 'picking_waves') {
      const wh = snap.warehouses[0] || { id: 'wh_north_01', name: 'Tổng kho Miền Bắc (Bắc Ninh)' };
      return snap.pickingWaves.map(w => {
        const matchingOrders = snap.orders
          .filter(o => o.fulfillment_wave_id === w.id || o.status === 'processing')
          .slice(0, 5)
          .map(o => this.normalizeOrder(o as unknown as Record<string, unknown>, snap));
        return {
          ...w,
          wave_code: w.wave_code || w.wave_number || 'WAVE-W410',
          warehouse_id: w.warehouse_id || wh.id,
          warehouse: wh,
          must_ship_by_sla: w.must_ship_by_sla || new Date(Date.now() + 18 * 3600000).toISOString(),
          created_at: w.created_at || new Date().toISOString(),
          orders: matchingOrders,
          order_count: matchingOrders.length || w.total_orders || 1
        };
      });
    }

    // 5. Return Requests / Returns
    if (this.table === 'return_requests' || this.table === 'returns') {
      return snap.returns.map(r => {
        const rawOrd = snap.orders.find(o => o.id === r.order_id) || snap.orders[0];
        const ord = rawOrd ? this.normalizeOrder(rawOrd as unknown as Record<string, unknown>, snap) : null;
        return {
          ...r,
          id: r.id,
          return_number: r.return_number,
          order_id: r.order_id,
          return_type: r.return_type || 'customer_return',
          status: r.status || 'quality_check',
          refund_amount: Number(r.refund_amount || 1250000),
          reason: r.reason || 'Khách muốn đổi sang sản phẩm khác',
          approval_status: r.approval_status || (r.status === 'refunded' ? 'checker_approved' : 'pending'),
          order: ord,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });
    }

    // 6. Stock Transactions / Stock Ledger
    if (this.table === 'stock_transactions' || this.table === 'stock_ledger') {
      return snap.stockLedger.map(sl => {
        const prod = snap.products.find(p => p.id === sl.product_id) || snap.products[0];
        const wh = snap.warehouses.find(w => w.id === sl.warehouse_id) || snap.warehouses[0];
        return {
          ...sl,
          type: sl.transaction_type || 'inbound',
          product: prod ? { id: prod.id, name: prod.name, sku: prod.sku } : null,
          warehouse: wh
        };
      });
    }

    // 7. Ledger Accounts & Journal Entries
    if (this.table === 'ledger_accounts') {
      return DEFAULT_LEDGER_ACCOUNTS.map(a => ({ ...a }));
    }

    if (this.table === 'journal_entries') {
      return snap.journalEntries.map(j => ({
        ...j,
        event_source: (j as unknown as Record<string, string>).event_source || (j as unknown as Record<string, string>).reference_type || 'order_sale',
        reference_id: j.reference_id || null,
        description: j.description || 'Hạch toán tự động nghiệp vụ bán hàng',
        posted_at: j.posted_at || j.created_at || new Date().toISOString()
      }));
    }

    if (this.table === 'journal_lines') {
      return snap.journalLines.map(jl => {
        const acc = DEFAULT_LEDGER_ACCOUNTS.find(a => a.id === jl.account_id || a.account_code === (jl as unknown as Record<string, string>).account_code) || DEFAULT_LEDGER_ACCOUNTS[0];
        return {
          ...jl,
          journal_entry_id: (jl as unknown as Record<string, string>).journal_entry_id || (jl as unknown as Record<string, string>).entry_id || 'je_89021',
          debit_amount: Number((jl as unknown as Record<string, number>).debit_amount ?? (jl as unknown as Record<string, number>).debit ?? 0),
          credit_amount: Number((jl as unknown as Record<string, number>).credit_amount ?? (jl as unknown as Record<string, number>).credit ?? 0),
          account: acc
        };
      });
    }

    // 8. Order Fee Breakdowns (Reconciliation)
    if (this.table === 'order_fee_breakdowns') {
      return snap.orders.map(o => {
        const norm = this.normalizeOrder(o as unknown as Record<string, unknown>, snap);
        const orderTotal = Number(norm.total || 0);
        return {
          id: `fee_${norm.id}`,
          order_id: norm.id,
          order: norm,
          commission_fee: Math.round(orderTotal * 0.05),
          transaction_fee: Math.round(orderTotal * 0.02),
          voucher_co_fund_fee: 15000,
          estimated_shipping_fee: 35000,
          actual_shipping_fee: 35000,
          weight_penalty_fee: 0,
          net_payout: Math.round(orderTotal * 0.93 - 50000),
          is_reconciled: norm.status === 'delivered',
          created_at: norm.placed_at || new Date().toISOString()
        };
      });
    }

    // 9. Margin Config
    if (this.table === 'margin_config') {
      return [
        {
          id: 'mc_default',
          tenant_id: snap.activeTenantId,
          min_margin_percent: 15,
          max_loss_per_order: 500000,
          circuit_breaker_enabled: true,
          auto_zero_stock_on_trigger: false,
          updated_at: new Date().toISOString()
        }
      ];
    }

    // 10. Fallback for other standard tables
    const map: Record<string, keyof MockDatabaseSnapshot> = {
      products: 'products',
      customers: 'customers',
      warehouses: 'warehouses',
      suppliers: 'suppliers',
      purchase_orders: 'purchaseOrders',
      purchase_order_items: 'purchaseOrderItems',
      transfers: 'transfers',
      return_items: 'returnItems',
      batches: 'batches',
      reconciliations: 'reconciliations',
      audit_logs: 'auditLogs',
      business_rules: 'businessRules',
      tenants: 'tenants',
      tenant_memberships: 'memberships',
      profiles: 'profiles'
    };

    const key = map[this.table];
    if (key && Array.isArray(snap[key])) {
      return (snap[key] as unknown as Record<string, unknown>[]).map(item => ({ ...item }));
    }

    return [];
  }

  private applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    let result = rows;
    const snap = mockStore.getSnapshot();

    for (const f of this.filters) {
      if (f.op === 'eq') {
        if (f.col === 'tenant_id' && (f.val === undefined || f.val === null || f.val === '')) {
          result = result.filter(r => r.tenant_id === snap.activeTenantId || !r.tenant_id);
        } else {
          result = result.filter(r => r[f.col] === f.val);
        }
      } else if (f.op === 'neq') {
        result = result.filter(r => r[f.col] !== f.val);
      } else if (f.op === 'in') {
        const arr = Array.isArray(f.val) ? f.val : [];
        result = result.filter(r => arr.includes(r[f.col]));
      } else if (f.op === 'is') {
        if (f.val === null) {
          result = result.filter(r => r[f.col] == null);
        } else {
          result = result.filter(r => r[f.col] === f.val);
        }
      } else if (f.op === 'not') {
        if (f.subOp === 'is') {
          if (f.val === null) {
            result = result.filter(r => r[f.col] != null);
          } else {
            result = result.filter(r => r[f.col] !== f.val);
          }
        }
      } else if (f.op === 'gte') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) >= (f.val as string | number);
        });
      } else if (f.op === 'gt') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) > (f.val as string | number);
        });
      } else if (f.op === 'lte') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) <= (f.val as string | number);
        });
      } else if (f.op === 'lt') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) < (f.val as string | number);
        });
      } else if (f.op === 'like' || f.op === 'ilike') {
        const cleanPattern = f.val.replace(/%/g, '').toLowerCase();
        result = result.filter(r => {
          const val = String(r[f.col] ?? '').toLowerCase();
          return val.includes(cleanPattern);
        });
      }
    }

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA == null) return asc ? -1 : 1;
        if (valB == null) return asc ? 1 : -1;
        if (valA < valB) return asc ? -1 : 1;
        return asc ? 1 : -1;
      });
    }

    if (this.rangeBounds) {
      const [from, to] = this.rangeBounds;
      result = result.slice(from, to + 1);
    } else if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }

  public async then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    await mockStore.delay(20);
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    const res = { data: filtered, error: null };
    return Promise.resolve(res).then(onfulfilled, onrejected);
  }

  public async single() {
    await mockStore.delay(20);
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: filtered.length === 0 ? { message: 'Row not found' } : null };
  }

  public async maybeSingle() {
    await mockStore.delay(20);
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: null };
  }

  public async insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    await mockStore.delay(30);
    const items = Array.isArray(payload) ? payload : [payload];
    return { data: items, error: null };
  }

  public async update(payload: Record<string, unknown>) {
    await mockStore.delay(30);
    return { data: payload, error: null };
  }

  public async delete() {
    await mockStore.delay(30);
    return { data: null, error: null };
  }
}

export const mockSupabaseClient = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  rpc(fnName: string, params: Record<string, unknown> = {}) {
    return {
      async then(resolve: (val: { data: unknown; error: { code?: string; message: string } | null }) => void) {
        await mockStore.delay(25);
        const snap = mockStore.getSnapshot();

        // 1. Dashboard Metrics (Fully Computed from Valid Orders)
        if (fnName === 'get_dashboard_metrics') {
          const nonCancelledOrders = snap.orders.filter(o => o.status !== 'cancelled');
          const recognizedRevenue = nonCancelledOrders
            .filter(o => o.status === 'shipped' || o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
          
          const collectedCash = snap.orders
            .filter(o => o.payment_status === 'paid' && o.status !== 'cancelled')
            .reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);

          const refundAmount = snap.returns
            .filter(r => r.status === 'refunded')
            .reduce((sum, r) => sum + Number(r.refund_amount || 1250000), 0);

          const revenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);

          resolve({
            data: {
              revenue,
              prev_revenue: Math.round(revenue * 0.85),
              recognized_revenue: recognizedRevenue,
              collected_cash: collectedCash,
              refund_amount: refundAmount,
              total_orders: snap.orders.length,
              recent_orders_count: snap.orders.length,
              pending_orders: snap.orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
              active_customers: snap.customers.length,
              total_customers: snap.customers.length,
              total_products: snap.products.length,
              low_stock_count: snap.products.filter(p => p.stock <= (p.safety_stock || 15)).length,
              status_counts: {
                pending: snap.orders.filter(o => o.status === 'pending').length,
                processing: snap.orders.filter(o => o.status === 'processing').length,
                shipped: snap.orders.filter(o => o.status === 'shipped').length,
                delivered: snap.orders.filter(o => o.status === 'delivered').length,
                cancelled: snap.orders.filter(o => o.status === 'cancelled').length,
                refunded: snap.orders.filter(o => o.status === 'refunded').length,
              }
            },
            error: null
          });
          return;
        }

        // 2. Dashboard Daily Revenue (7 Days Array Calculated Directly from Real Orders)
        if (fnName === 'get_dashboard_daily') {
          const daily: Array<{ day: string; revenue: number; order_count: number }> = [];
          const now = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dayStr = `${y}-${m}-${dayNum}`;

            // Filter real orders placed on this date (excluding cancelled)
            const matchedOrders = snap.orders.filter(o => {
              if (o.status === 'cancelled') return false;
              const oDate = new Date(o.placed_at);
              const oDayStr = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
              return oDayStr === dayStr;
            });

            const dayRev = matchedOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);

            daily.push({
              day: dayStr,
              revenue: dayRev,
              order_count: matchedOrders.length
            });
          }
          resolve({ data: daily, error: null });
          return;
        }

        // 3. Low Stock Products
        if (fnName === 'get_low_stock_products') {
          const low = snap.products
            .filter(p => p.stock <= (p.safety_stock || 20))
            .map(p => ({
              id: p.id,
              name: p.name,
              stock: p.stock,
              reorder_level: p.safety_stock || 20
            }));
          resolve({ data: low, error: null });
          return;
        }

        // 4. Inventory Consistency Check
        if (fnName === 'verify_inventory_consistency') {
          resolve({ data: { checked: true, discrepancies: [] }, error: null });
          return;
        }

        // 5. Sequence Generators
        if (fnName === 'next_order_number') {
          resolve({ data: `ORD-${Math.floor(10000 + Math.random() * 90000)}`, error: null });
          return;
        }

        if (fnName === 'next_return_number') {
          resolve({ data: `RMA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`, error: null });
          return;
        }

        if (fnName === 'next_journal_entry_number') {
          resolve({ data: `JE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`, error: null });
          return;
        }

        // 6. Audit Chain Verification
        if (fnName === 'verify_audit_chain') {
          resolve({ data: { valid: true, audited_records: snap.auditLogs.length || 128 }, error: null });
          return;
        }

        // 7. Atomic Business Mutations
        if (fnName === 'place_order_atomic') {
          const rawItems = (params.p_items as Array<{ product_id: string; product_name?: string; product_sku?: string; quantity: number; unit_price: number }>) || [];
          const items = rawItems.map(i => {
            const prod = snap.products.find(p => p.id === i.product_id);
            return {
              product_id: i.product_id,
              sku: prod?.sku || i.product_sku || 'NX-SKU',
              quantity: Number(i.quantity || 1),
              unit_price: Number(i.unit_price || prod?.price || 0)
            };
          });

          const total = Number(params.p_total) || items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
          const subtotal = Number(params.p_subtotal) || total;
          const tax = Number(params.p_tax) || 0;
          const shipping = Number(params.p_shipping) || 0;
          const discount = Number(params.p_discount) || 0;

          const res = mockStore.placeOrderAtomic(
            {
              tenant_id: (params.p_tenant_id as string) || snap.activeTenantId,
              order_number: (params.p_order_number as string) || `ORD-${Date.now()}`,
              customer_id: (params.p_customer_id as string) || snap.customers[0]?.id || 'cust_01',
              status: (params.p_status as unknown as Order['status']) || 'pending',
              payment_status: (params.p_payment_status as unknown as Order['payment_status']) || 'paid',
              subtotal,
              tax,
              shipping,
              discount,
              total,
              total_amount: total,
              channel: 'website',
              notes: (params.p_notes as string) || null,
              shipping_address: (params.p_shipping_address as string) || null,
              placed_at: new Date().toISOString()
            },
            items
          );

          if (!res.success) {
            resolve({ data: null, error: { message: res.error || 'Lỗi khóa tồn nguyên tử' } });
            return;
          }

          resolve({ data: { success: true, order_id: res.orderId }, error: null });
          return;
        }

        if (fnName === 'cancel_order_atomic') {
          const res = mockStore.cancelOrderAtomic(params.p_order_id as string, (params.p_reason as string) || 'Hủy theo yêu cầu');
          if (!res.success) {
            resolve({ data: null, error: { message: res.error || 'Lỗi hủy đơn' } });
            return;
          }
          resolve({ data: { success: true }, error: null });
          return;
        }

        if (fnName === 'process_return_restock_atomic') {
          const res = mockStore.inspectReturnQC(params.p_return_id as string, params.p_is_good !== false);
          resolve({ data: { success: res.success }, error: null });
          return;
        }

        if (fnName === 'post_journal_entry_atomic') {
          resolve({ data: { success: true, entry_id: `je_${Date.now()}` }, error: null });
          return;
        }

        resolve({ data: { success: true }, error: null });
      }
    };
  },
  auth: {
    async getSession() {
      const snap = mockStore.getSnapshot();
      const user = {
        id: snap.profiles[0]?.id || 'usr_owner_01',
        email: snap.profiles[0]?.email || 'owner@nexusoms.io'
      };
      return {
        data: {
          session: {
            user,
            access_token: 'mock-prototype-token',
            expires_at: 9999999999
          }
        },
        error: null
      };
    },
    async signInWithPassword({ email }: { email: string }) {
      await mockStore.delay(50);
      return { data: { user: { id: 'usr_owner_01', email } }, error: null };
    },
    async signUp({ email }: { email: string }) {
      await mockStore.delay(50);
      return { data: { user: { id: `usr_${Date.now()}`, email } }, error: null };
    },
    async signOut() {
      await mockStore.delay(30);
      return { error: null };
    },
    onAuthStateChange(cb: (event: string, session: unknown) => void) {
      cb('SIGNED_IN', {
        user: { id: 'usr_owner_01', email: 'owner@nexusoms.io' }
      });
      return { data: { subscription: { unsubscribe() {} } } };
    }
  }
};
