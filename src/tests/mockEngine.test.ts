import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/mock/store';
import { executeScenario } from '@/mock/scenarios/scenarioRunner';
import { formatCurrency } from '@/lib/utils';

describe('Centralized Mock Data Engine & Workflows', () => {
  beforeEach(() => {
    mockStore.resetToDefaultSeed();
  });

  it('correctly seeds initial multi-tenant data with 5-state inventory', () => {
    const snap = mockStore.getSnapshot();
    expect(snap.tenants.length).toBeGreaterThanOrEqual(3);
    expect(snap.products.length).toBeGreaterThanOrEqual(6);
    expect(snap.inventory5State.length).toBeGreaterThanOrEqual(6);

    const airPro = snap.inventory5State.find(i => i.sku === 'NX-AIR-PRO');
    expect(airPro).toBeDefined();
    expect(airPro!.available).toBe(airPro!.physical - airPro!.reserved);
  });

  it('verifies order data integrity: every order has valid numeric totals and items', () => {
    const snap = mockStore.getSnapshot();
    expect(snap.orders.length).toBeGreaterThanOrEqual(5);

    for (const order of snap.orders) {
      // 1. Total must be finite positive number
      expect(typeof order.total).toBe('number');
      expect(Number.isFinite(order.total)).toBe(true);
      expect(order.total).toBeGreaterThan(0);
      expect(isNaN(order.total)).toBe(false);

      // 2. formatCurrency must never return NaN
      const formatted = formatCurrency(order.total);
      expect(formatted).not.toContain('NaN');
      expect(formatted).toContain('₫');

      // 3. Every order must have items
      const items = snap.orderItems.filter(i => i.order_id === order.id);
      expect(items.length).toBeGreaterThanOrEqual(1);

      // 4. Line totals must sum to subtotal
      const sumLineTotals = items.reduce((sum, it) => sum + it.line_total, 0);
      expect(sumLineTotals).toBe(order.subtotal);

      // 5. Grand total invariant
      expect(order.total).toBe(order.subtotal + (order.tax || 0) + (order.shipping || 0) - (order.discount || 0));
    }
  });

  it('verifies no orphan records exist across domains', () => {
    const snap = mockStore.getSnapshot();

    // Every order item references an existing order and product
    for (const item of snap.orderItems) {
      const orderExists = snap.orders.some(o => o.id === item.order_id);
      expect(orderExists).toBe(true);
      const productExists = snap.products.some(p => p.id === item.product_id);
      expect(productExists).toBe(true);
    }

    // Every return references an existing order
    for (const ret of snap.returns) {
      const orderExists = snap.orders.some(o => o.id === ret.order_id);
      expect(orderExists).toBe(true);
    }

    // Every journal line references an existing journal entry
    for (const line of snap.journalLines) {
      const entryId = (line as unknown as Record<string, string>).journal_entry_id || (line as unknown as Record<string, string>).entry_id;
      const entryExists = snap.journalEntries.some(j => j.id === entryId);
      expect(entryExists).toBe(true);
    }
  });

  it('verifies strict inventory domain invariants across mutations', () => {
    const beforeStock = mockStore.getInventory5State().find(i => i.sku === 'NX-AIR-PRO')!;
    
    // Invariant 1: Available = Physical - Reserved
    expect(beforeStock.available).toBe(beforeStock.physical - beforeStock.reserved);

    // Place Order for 5 items
    const orderRes = mockStore.placeOrderAtomic(
      {
        tenant_id: 'tenant_flagship',
        order_number: 'ORD-INV-TEST',
        customer_id: 'cust_01',
        status: 'pending',
        payment_status: 'paid',
        subtotal: 6250000,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 6250000,
        total_amount: 6250000,
        placed_at: new Date().toISOString()
      },
      [{ product_id: beforeStock.product_id, sku: 'NX-AIR-PRO', quantity: 5, unit_price: 1250000 }]
    );
    expect(orderRes.success).toBe(true);

    const afterOrderStock = mockStore.getInventory5State().find(i => i.sku === 'NX-AIR-PRO')!;
    // Invariant 2: After reservation, Physical is UNCHANGED, Reserved increases by 5, Available decreases by 5
    expect(afterOrderStock.physical).toBe(beforeStock.physical);
    expect(afterOrderStock.reserved).toBe(beforeStock.reserved + 5);
    expect(afterOrderStock.available).toBe(beforeStock.available - 5);
    expect(afterOrderStock.available).toBe(afterOrderStock.physical - afterOrderStock.reserved);

    // Dispatch Order
    const dispatchRes = mockStore.dispatchOrder(orderRes.orderId!, 'TRACK-999');
    expect(dispatchRes.success).toBe(true);

    const afterDispatchStock = mockStore.getInventory5State().find(i => i.sku === 'NX-AIR-PRO')!;
    // Invariant 3: After dispatch, Physical decreases by 5, Reserved decreases by 5, Available is UNCHANGED
    expect(afterDispatchStock.physical).toBe(afterOrderStock.physical - 5);
    expect(afterDispatchStock.reserved).toBe(afterOrderStock.reserved - 5);
    expect(afterDispatchStock.available).toBe(afterOrderStock.available);
    expect(afterDispatchStock.available).toBe(afterDispatchStock.physical - afterDispatchStock.reserved);
  });

  it('placeOrderAtomic locks reservation and decrements available stock', () => {
    const beforeStock = mockStore.getInventory5State().find(i => i.sku === 'NX-AIR-PRO')!;
    const initialAvailable = beforeStock.available;
    const initialReserved = beforeStock.reserved;

    const res = mockStore.placeOrderAtomic(
      {
        tenant_id: 'tenant_flagship',
        order_number: 'ORD-TEST-001',
        customer_id: 'cust_01',
        status: 'pending',
        payment_status: 'paid',
        total_amount: 2500000,
        placed_at: new Date().toISOString()
      },
      [{ product_id: beforeStock.product_id, sku: 'NX-AIR-PRO', quantity: 2, unit_price: 1250000 }]
    );

    expect(res.success).toBe(true);

    const afterStock = mockStore.getInventory5State().find(i => i.sku === 'NX-AIR-PRO')!;
    expect(afterStock.reserved).toBe(initialReserved + 2);
    expect(afterStock.available).toBe(initialAvailable - 2);
    expect(afterStock.physical).toBe(beforeStock.physical); // Physical stock MUST remain untouched until dispatch!
  });

  it('cancelOrderAtomic releases reservation and restores available stock safely', () => {
    const orders = mockStore.getOrders();
    const targetOrder = orders.find(o => o.status === 'processing')!;
    const targetItem = mockStore.getOrderWithCustomer(targetOrder.id)?.items?.[0];
    expect(targetItem).toBeDefined();

    const beforeStock = mockStore.getInventory5State().find(i => i.product_id === targetItem!.product_id)!;
    const reservedBefore = beforeStock.reserved;
    const availableBefore = beforeStock.available;

    const res = mockStore.cancelOrderAtomic(targetOrder.id, 'Khách hàng đổi ý');
    expect(res.success).toBe(true);

    const afterStock = mockStore.getInventory5State().find(i => i.product_id === targetItem!.product_id)!;
    expect(afterStock.reserved).toBe(Math.max(0, reservedBefore - targetItem!.quantity));
    expect(afterStock.available).toBe(availableBefore + targetItem!.quantity);
    expect(afterStock.physical).toBe(beforeStock.physical);
  });

  it('dispatchOrder decreases physical stock and clears reservation', () => {
    const orders = mockStore.getOrders();
    const processingOrder = orders.find(o => o.status === 'processing')!;
    const orderDetails = mockStore.getOrderWithCustomer(processingOrder.id);
    const item = orderDetails?.items ? orderDetails.items[0] : null;
    expect(item).not.toBeNull();
    if (!item) return;
    const beforeStock = mockStore.getInventory5State().find(i => i.product_id === item.product_id)!;

    const res = mockStore.dispatchOrder(processingOrder.id, 'SPX-VN-902148');
    expect(res.success).toBe(true);

    const afterStock = mockStore.getInventory5State().find(i => i.product_id === item.product_id)!;
    expect(afterStock.physical).toBe(beforeStock.physical - item.quantity);
    expect(afterStock.reserved).toBe(beforeStock.reserved - item.quantity);
  });

  it('inspectReturnQC adds to available if good, moves to damaged if bad', () => {
    const ret = mockStore.getReturns()[0];
    const snap = mockStore.getSnapshot();
    const retItem = snap.returnItems.find(i => i.return_id === ret.id)!;
    const invBefore = snap.inventory5State.find(i => i.product_id === retItem.product_id)!;
    const availBefore = invBefore.available;

    // Test QC Good
    mockStore.inspectReturnQC(ret.id, true);
    const invAfterGood = mockStore.getInventory5State().find(i => i.product_id === retItem.product_id)!;
    expect(invAfterGood.available).toBe(availBefore + retItem.quantity);

    // Test QC Bad on another return
    const damagedBefore = invAfterGood.damaged;
    mockStore.inspectReturnQC(ret.id, false);
    const invAfterBad = mockStore.getInventory5State().find(i => i.product_id === retItem.product_id)!;
    expect(invAfterBad.damaged).toBe(damagedBefore + retItem.quantity);
  });

  it('postJournalEntry enforces Debit == Credit balance rule', () => {
    // Balanced entry
    const balancedRes = mockStore.postJournalEntry(
      {
        tenant_id: 'tenant_flagship',
        entry_number: 'JE-BALANCED',
        reference_type: 'order',
        reference_id: 'ord_90214',
        description: 'Bút toán cân đối',
        posted_at: new Date().toISOString(),
        posted_by: 'usr_finance_01'
      },
      [
        { account_id: 'a1', account_code: '131', debit: 1000000, credit: 0, description: 'Nợ 131' },
        { account_id: 'a2', account_code: '511', debit: 0, credit: 1000000, description: 'Có 511' }
      ]
    );
    expect(balancedRes.success).toBe(true);

    // Unbalanced entry
    const unbalancedRes = mockStore.postJournalEntry(
      {
        tenant_id: 'tenant_flagship',
        entry_number: 'JE-UNBALANCED',
        reference_type: 'order',
        reference_id: 'ord_90214',
        description: 'Bút toán lệch',
        posted_at: new Date().toISOString(),
        posted_by: 'usr_finance_01'
      },
      [
        { account_id: 'a1', account_code: '131', debit: 1000000, credit: 0, description: 'Nợ 131' },
        { account_id: 'a2', account_code: '511', debit: 0, credit: 950000, description: 'Có 511 lệch 50k' }
      ]
    );
    expect(unbalancedRes.success).toBe(false);
    expect(unbalancedRes.error).toContain('không cân bằng');
  });

  it('executes demo scenarios correctly', async () => {
    const flashSale = await executeScenario('SCENARIO_FLASH_SALE');
    expect(flashSale.success).toBe(true);

    const stockout = await executeScenario('SCENARIO_STOCKOUT');
    expect(stockout.success).toBe(true);
    expect(stockout.message).toContain('không đủ tồn khả dụng');

    const cancellation = await executeScenario('SCENARIO_CANCELLATION');
    expect(cancellation.success).toBe(true);
  });
});
