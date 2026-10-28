import { mockStore } from './store';
import type { MockDatabaseSnapshot } from './types';
import type { Order } from '@/types';

type FilterOp = { col: string; op: 'eq' | 'neq' | 'in'; val: unknown };

class MockQueryBuilder {
  private table: string;
  private filters: FilterOp[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;

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

  public order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  public limit(n: number) {
    this.limitCount = n;
    return this;
  }

  private getTableData(): Record<string, unknown>[] {
    const snap = mockStore.getSnapshot();
    const map: Record<string, keyof MockDatabaseSnapshot> = {
      orders: 'orders',
      order_items: 'orderItems',
      products: 'products',
      customers: 'customers',
      warehouses: 'warehouses',
      suppliers: 'suppliers',
      purchase_orders: 'purchaseOrders',
      purchase_order_items: 'purchaseOrderItems',
      transfers: 'transfers',
      picking_waves: 'pickingWaves',
      returns: 'returns',
      return_items: 'returnItems',
      batches: 'batches',
      stock_ledger: 'stockLedger',
      journal_entries: 'journalEntries',
      journal_lines: 'journalLines',
      reconciliations: 'reconciliations',
      audit_logs: 'auditLogs',
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

    for (const f of this.filters) {
      if (f.op === 'eq') {
        result = result.filter(r => r[f.col] === f.val);
      } else if (f.op === 'neq') {
        result = result.filter(r => r[f.col] !== f.val);
      } else if (f.op === 'in') {
        const arr = Array.isArray(f.val) ? f.val : [];
        result = result.filter(r => arr.includes(r[f.col]));
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

    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }

  public async then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    await mockStore.delay();
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);

    // Deep populate common relations if requested
    if (this.table === 'orders') {
      const snap = mockStore.getSnapshot();
      filtered.forEach(o => {
        o.customer = snap.customers.find(c => c.id === o.customer_id);
      });
    }

    const res = { data: filtered, error: null };
    return Promise.resolve(res).then(onfulfilled, onrejected);
  }

  public async single() {
    await mockStore.delay();
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: filtered.length === 0 ? { message: 'Row not found' } : null };
  }

  public async maybeSingle() {
    await mockStore.delay();
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: null };
  }

  public async insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    await mockStore.delay();
    const items = Array.isArray(payload) ? payload : [payload];
    // In prototype mock, return success
    return { data: items, error: null };
  }

  public async update(payload: Record<string, unknown>) {
    await mockStore.delay();
    return { data: payload, error: null };
  }

  public async delete() {
    await mockStore.delay();
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
        await mockStore.delay(40);
        console.log(`[MockRPC] Executing ${fnName}:`, params);

        if (fnName === 'next_order_number') {
          resolve({ data: `ORD-${Math.floor(10000 + Math.random() * 90000)}`, error: null });
          return;
        }

        if (fnName === 'place_order_atomic') {
          const rawItems = (params.p_items as Array<{ product_id: string; product_sku?: string; quantity: number; unit_price: number }>) || [];
          const snap = mockStore.getSnapshot();
          const items = rawItems.map(i => {
            const prod = snap.products.find(p => p.id === i.product_id);
            return {
              product_id: i.product_id,
              sku: prod?.sku || i.product_sku || 'NX-SKU',
              quantity: i.quantity,
              unit_price: i.unit_price
            };
          });

          const res = mockStore.placeOrderAtomic(
            {
              tenant_id: (params.p_tenant_id as string) || snap.activeTenantId,
              order_number: (params.p_order_number as string) || `ORD-${Date.now()}`,
              customer_id: params.p_customer_id as string,
              status: 'pending',
              payment_status: (params.p_payment_status as unknown as Order['payment_status']) || 'unpaid',
              total_amount: Number(params.p_total) || 0,
              notes: (params.p_notes as string) || null,
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
