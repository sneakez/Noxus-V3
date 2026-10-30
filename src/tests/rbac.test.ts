import { describe, it, expect } from 'vitest';
import { hasPermission, getAllowedPagesForRole, type Permission } from '@/lib/permissions';
import type { TenantRole } from '@/types';

describe('Unified RBAC Permission Registry — Dream Terus (Terus Tech)', () => {
  it('owner (R1) has all critical governance and approval permissions', () => {
    const criticalPerms: Permission[] = [
      'orders:create', 'orders:cancel', 'orders:delete',
      'inventory:mutate', 'inventory:adjust',
      'purchasing:create', 'purchasing:approve',
      'finance:view', 'finance:reconcile', 'finance:adjust', 'finance:approve', 'finance:manage',
      'growth:view', 'growth:manage', 'growth:budget_approve',
      'settings:manage', 'users:manage', 'integrations:manage'
    ];
    for (const perm of criticalPerms) {
      expect(hasPermission('owner', perm)).toBe(true);
    }
  });

  it('admin (R2) has systems and integrations access but CANNOT approve financial disbursements or budget increases', () => {
    expect(hasPermission('admin', 'settings:manage')).toBe(true);
    expect(hasPermission('admin', 'users:manage')).toBe(true);
    expect(hasPermission('admin', 'integrations:manage')).toBe(true);
    expect(hasPermission('admin', 'orders:delete')).toBe(false);
    // Separation of duties: Admin cannot approve finance exceptions or budgets
    expect(hasPermission('admin', 'finance:approve')).toBe(false);
    expect(hasPermission('admin', 'growth:budget_approve')).toBe(false);
  });

  it('manager (R3) can manage orders, inventory movements and create POs, but cannot manage users or settings', () => {
    expect(hasPermission('manager', 'orders:create')).toBe(true);
    expect(hasPermission('manager', 'orders:cancel')).toBe(true);
    expect(hasPermission('manager', 'inventory:receive')).toBe(true);
    expect(hasPermission('manager', 'inventory:move')).toBe(true);
    expect(hasPermission('manager', 'purchasing:create')).toBe(true);
    expect(hasPermission('manager', 'purchasing:approve')).toBe(false);
    expect(hasPermission('manager', 'settings:manage')).toBe(false);
    expect(hasPermission('manager', 'users:manage')).toBe(false);
    expect(hasPermission('manager', 'orders:delete')).toBe(false);
  });

  it('warehouse (R4) can receive, pick, pack and move stock but CANNOT cancel orders, edit master products, or view finance', () => {
    expect(hasPermission('warehouse', 'inventory:receive')).toBe(true);
    expect(hasPermission('warehouse', 'inventory:move')).toBe(true);
    expect(hasPermission('warehouse', 'orders:view')).toBe(true);
    // Hardened boundaries
    expect(hasPermission('warehouse', 'orders:cancel')).toBe(false);
    expect(hasPermission('warehouse', 'products:manage')).toBe(false);
    expect(hasPermission('warehouse', 'finance:view')).toBe(false);
    expect(hasPermission('warehouse', 'finance:manage')).toBe(false);
    expect(hasPermission('warehouse', 'settings:manage')).toBe(false);
    expect(hasPermission('warehouse', 'users:manage')).toBe(false);
  });

  it('finance (R5) can access ledger, reconcile fees and adjust journals, but cannot mutate inventory or create orders', () => {
    expect(hasPermission('finance', 'finance:view')).toBe(true);
    expect(hasPermission('finance', 'finance:reconcile')).toBe(true);
    expect(hasPermission('finance', 'finance:adjust')).toBe(true);
    expect(hasPermission('finance', 'finance:manage')).toBe(true);
    expect(hasPermission('finance', 'inventory:mutate')).toBe(false);
    expect(hasPermission('finance', 'orders:create')).toBe(false);
    expect(hasPermission('finance', 'orders:cancel')).toBe(false);
  });

  it('growth / marketing (R6) can manage campaigns and view ROAS, but CANNOT mutate stock or approve budgets', () => {
    expect(hasPermission('growth', 'growth:view')).toBe(true);
    expect(hasPermission('growth', 'growth:manage')).toBe(true);
    expect(hasPermission('growth', 'analytics:view')).toBe(true);
    expect(hasPermission('growth', 'orders:view')).toBe(true);
    expect(hasPermission('growth', 'inventory:view')).toBe(true);
    // Strict boundaries: Growth cannot approve budget increases or mutate inventory
    expect(hasPermission('growth', 'growth:budget_approve')).toBe(false);
    expect(hasPermission('growth', 'inventory:mutate')).toBe(false);
    expect(hasPermission('growth', 'finance:manage')).toBe(false);
    expect(hasPermission('growth', 'orders:create')).toBe(false);
  });

  it('viewer (R7) has read-only access and no mutate permissions', () => {
    expect(hasPermission('viewer', 'orders:view')).toBe(false);
    expect(hasPermission('viewer', 'inventory:view')).toBe(false);
    expect(hasPermission('viewer', 'orders:create')).toBe(false);
    expect(hasPermission('viewer', 'inventory:mutate')).toBe(false);
    expect(hasPermission('viewer', 'finance:manage')).toBe(false);
  });

  it('returns false for null or undefined role', () => {
    expect(hasPermission(null, 'orders:view')).toBe(false);
    expect(hasPermission(undefined, 'orders:view')).toBe(false);
  });

  it('whitelists all 7 area pages appropriately per role', () => {
    const warehousePages = getAllowedPagesForRole('warehouse');
    expect(warehousePages).toContain('inventory');
    expect(warehousePages).toContain('fulfillment');
    expect(warehousePages).toContain('warehouses');
    expect(warehousePages).not.toContain('ledger');
    expect(warehousePages).not.toContain('feeReconciliation');
    expect(warehousePages).not.toContain('orderEconomics');
    expect(warehousePages).not.toContain('settings');

    // Finance is optional and disabled in the prototype's default configuration.
    expect(getAllowedPagesForRole('finance')).toEqual([]);

    const growthPages = getAllowedPagesForRole('growth');
    expect(growthPages).toContain('marketingAnalytics');
    expect(growthPages).not.toContain('customerAnalytics'); // optional, unaudited cohort workspace hidden
    expect(growthPages).toContain('skuEconomics');
    expect(growthPages).toContain('channelEconomics');
    expect(growthPages).not.toContain('settings');
    expect(growthPages).not.toContain('warehouses');
  });
});
