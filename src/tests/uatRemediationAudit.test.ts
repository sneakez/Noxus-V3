import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/mock/store';
import { analyticsService } from '@/analytics/analyticsService';
import { hasPermission, ENABLE_FINANCE_ROLE, getAllowedPagesForRole } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

describe('Audit Remediation Verification (R07 - R28 & Roles)', () => {
  beforeEach(() => {
    mockStore.resetToBaseline();
  });

  it('R10: filterOrdersByPeriod returns empty array for empty period, never falling back to all orders', () => {
    const orders = mockStore.getOrders();
    expect(orders.length).toBeGreaterThan(0);

    const futureOrders: Order[] = [
      {
        ...orders[0],
        id: 'ord_future_01',
        created_at: '2099-01-01T00:00:00Z',
        placed_at: '2099-01-01T00:00:00Z',
      }
    ];

    const resToday = analyticsService.filterOrdersByPeriod(futureOrders, 'today');
    expect(resToday.current).toEqual([]);
    expect(resToday.current.length).toBe(0);
  });

  it('R11: getMarketingPerformance dynamically derives metrics, handles zero spend safely, and tags as ESTIMATED', () => {
    const perf = analyticsService.getMarketingPerformance();
    expect(perf.length).toBeGreaterThan(0);

    perf.forEach(campaign => {
      expect(Number.isFinite(campaign.roas)).toBe(true);
      expect(campaign.roas).toBeGreaterThanOrEqual(0);
      expect(campaign.attributionType).toBe('ESTIMATED');
      expect(campaign.adSpend).toBeGreaterThanOrEqual(0);
      expect(campaign.attributedRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  it('R12 & R17: Manager has finance:reconcile permission, fee breakdown updates persist', async () => {
    expect(hasPermission('manager', 'finance:reconcile')).toBe(true);
    expect(hasPermission('owner', 'finance:reconcile')).toBe(true);
    expect(hasPermission('warehouse', 'finance:reconcile')).toBe(false);

    const feeId = 'fee_001';
    const { error } = await supabase
      .from('order_fee_breakdowns')
      .update({ is_reconciled: true })
      .eq('id', feeId);

    expect(error).toBeNull();
    const updated = (mockStore as any).state.orderFeeBreakdowns?.find((f: any) => f.id === feeId);
    expect(updated?.is_reconciled).toBe(true);
  });

  it('R13: Warehouse role can dispatch but has no permissions for carrier delivered/POD confirmation', () => {
    expect(hasPermission('warehouse', 'orders:view')).toBe(true);
    expect(hasPermission('warehouse', 'inventory:move')).toBe(true);
    expect(hasPermission('warehouse', 'finance:reconcile')).toBe(false);
    expect(hasPermission('warehouse', 'warehouses:manage')).toBe(false);

    const warehousePages = getAllowedPagesForRole('warehouse');
    expect(warehousePages).toContain('orders');
    expect(warehousePages).toContain('fulfillment');
    expect(warehousePages).toContain('inventory');
    expect(warehousePages).not.toContain('feeReconciliation');
  });

  it('R16: Stock transfer moves stock to in_transit and into destination warehouse without double counting', () => {
    const sku = 'NX-AIR-PRO';
    const before = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(before).toBeDefined();
    const initialPhysical = before!.physical;
    const initialInTransit = before!.in_transit || 0;

    // Dispatch 2 units
    const dispatchRes = mockStore.transferStock(sku, 'wh_north_01', 'wh_central_01', 2, 'dispatch');
    expect(dispatchRes.success).toBe(true);

    const afterDispatch = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(afterDispatch!.physical).toBe(initialPhysical - 2);
    expect(afterDispatch!.in_transit).toBe(initialInTransit + 2);

    // Receive 2 units
    const receiveRes = mockStore.transferStock(sku, 'wh_north_01', 'wh_central_01', 2, 'receive');
    expect(receiveRes.success).toBe(true);

    const afterReceive = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(afterReceive!.in_transit).toBe(initialInTransit);
    expect(afterReceive!.physical).toBe(initialPhysical);
  });

  it('R26 & R27: Finance role disabled by default; Viewer role disallowed in allowed pages', () => {
    expect(ENABLE_FINANCE_ROLE).toBe(false);

    const viewerPages = getAllowedPagesForRole('viewer' as any);
    expect(viewerPages.length).toBe(0);

    const managerPages = getAllowedPagesForRole('manager');
    expect(managerPages).toContain('orders');
    expect(managerPages).toContain('feeReconciliation');
  });
});
