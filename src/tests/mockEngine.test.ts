import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/mock/store';
import { executeScenario } from '@/mock/scenarios/scenarioRunner';

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
