import { describe, it, expect } from 'vitest';
import { hasPermission, getAllowedPagesForRole, type Permission } from '@/lib/permissions';

describe('RBAC Permission Registry — Hardened (Workstream 4)', () => {
  it('owner has all critical permissions', () => {
    const criticalPerms: Permission[] = [
      'orders:create', 'orders:cancel', 'orders:delete',
      'inventory:mutate', 'finance:manage', 'settings:manage', 'users:manage',
    ];
    for (const perm of criticalPerms) {
      expect(hasPermission('owner', perm)).toBe(true);
    }
  });

  it('admin has administrative permissions', () => {
    expect(hasPermission('admin', 'settings:manage')).toBe(true);
    expect(hasPermission('admin', 'users:manage')).toBe(true);
    expect(hasPermission('admin', 'orders:delete')).toBe(true);
  });

  it('manager can manage orders and finance but cannot manage settings or users', () => {
    expect(hasPermission('manager', 'orders:create')).toBe(true);
    expect(hasPermission('manager', 'orders:cancel')).toBe(true);
    expect(hasPermission('manager', 'finance:manage')).toBe(true);
    expect(hasPermission('manager', 'settings:manage')).toBe(false);
    expect(hasPermission('manager', 'users:manage')).toBe(false);
    expect(hasPermission('manager', 'orders:delete')).toBe(false);
  });

  it('warehouse can mutate inventory and fulfill but CANNOT cancel orders, edit master products, or view finance', () => {
    expect(hasPermission('warehouse', 'inventory:mutate')).toBe(true);
    expect(hasPermission('warehouse', 'orders:view')).toBe(true);
    // Hardened RBAC assertions:
    expect(hasPermission('warehouse', 'orders:cancel')).toBe(false);
    expect(hasPermission('warehouse', 'products:manage')).toBe(false);
    expect(hasPermission('warehouse', 'finance:view')).toBe(false);
    expect(hasPermission('warehouse', 'finance:manage')).toBe(false);
    expect(hasPermission('warehouse', 'settings:manage')).toBe(false);
    expect(hasPermission('warehouse', 'users:manage')).toBe(false);
  });

  it('finance role can access ledger and fee reconciliation but cannot mutate inventory or create orders', () => {
    expect(hasPermission('finance', 'finance:view')).toBe(true);
    expect(hasPermission('finance', 'finance:manage')).toBe(true);
    expect(hasPermission('finance', 'inventory:mutate')).toBe(false);
    expect(hasPermission('finance', 'orders:create')).toBe(false);
    expect(hasPermission('finance', 'orders:cancel')).toBe(false);
  });

  it('viewer has read-only access and no mutate permissions', () => {
    expect(hasPermission('viewer', 'orders:view')).toBe(true);
    expect(hasPermission('viewer', 'inventory:view')).toBe(true);
    expect(hasPermission('viewer', 'orders:create')).toBe(false);
    expect(hasPermission('viewer', 'inventory:mutate')).toBe(false);
    expect(hasPermission('viewer', 'finance:manage')).toBe(false);
  });

  it('returns false for null or undefined role', () => {
    expect(hasPermission(null, 'orders:view')).toBe(false);
    expect(hasPermission(undefined, 'orders:view')).toBe(false);
  });

  it('hides sensitive finance and settings routes from warehouse users in navigation', () => {
    const allowed = getAllowedPagesForRole('warehouse');
    expect(allowed).toContain('inventory');
    expect(allowed).toContain('fulfillment');
    expect(allowed).toContain('warehouses');
    expect(allowed).not.toContain('ledger');
    expect(allowed).not.toContain('feeReconciliation');
    expect(allowed).not.toContain('marginControl');
    expect(allowed).not.toContain('settings');
  });
});
