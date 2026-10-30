export const ENABLE_FINANCE_ROLE = false;
import type { TenantRole } from '@/types';

export type Permission =
  // Orders
  | 'orders:view'
  | 'orders:create'
  | 'orders:manage'
  | 'orders:cancel'
  | 'orders:delete'
  // Inventory
  | 'inventory:view'
  | 'inventory:receive'
  | 'inventory:move'
  | 'inventory:adjust'
  | 'inventory:mutate'
  // Products & Warehouses
  | 'products:view'
  | 'products:manage'
  | 'warehouses:manage'
  // Purchasing
  | 'purchasing:view'
  | 'purchasing:create'
  | 'purchasing:approve'
  // Finance & Accounting
  | 'finance:view'
  | 'finance:reconcile'
  | 'finance:adjust'
  | 'finance:approve'
  | 'finance:manage'
  // Growth & Marketing
  | 'growth:view'
  | 'growth:manage'
  | 'growth:budget_approve'
  // Analytics & Audit
  | 'analytics:view'
  | 'audit:view'
  // System Governance
  | 'users:manage'
  | 'integrations:manage'
  | 'settings:manage'
  | 'simulator:access'
  | 'webhooks:manage';

const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  // R1 — Owner / Founder: Unrestricted governance, final approvals, audit review
  owner: [
    'orders:view', 'orders:create', 'orders:manage', 'orders:cancel', 'orders:delete',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:adjust', 'inventory:mutate',
    'products:view', 'products:manage', 'warehouses:manage',
    'purchasing:view', 'purchasing:create', 'purchasing:approve',
    'finance:view', 'finance:reconcile', 'finance:adjust', 'finance:approve', 'finance:manage',
    'growth:view', 'growth:manage', 'growth:budget_approve',
    'analytics:view', 'audit:view',
    'users:manage', 'integrations:manage', 'settings:manage',
    'simulator:access', 'webhooks:manage',
  ],

  // R2 — System Administrator: Systems, integrations, users (no financial approvals)
  admin: [
    'orders:view', 'inventory:view', 'products:view', 'audit:view',
    'users:manage', 'integrations:manage', 'settings:manage', 'simulator:access', 'webhooks:manage',
  ],

  // R3 — Operations / Commerce Manager: Multi-channel orders, fulfillment, RMA, inventory
  manager: [
    'orders:view', 'orders:create', 'orders:manage', 'orders:cancel',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:mutate',
    'products:view', 'products:manage', 'warehouses:manage',
    'purchasing:view', 'purchasing:create',
    'finance:view', 'finance:reconcile',
    'growth:view',
    'analytics:view', 'audit:view',
    'simulator:access',
  ],

  // R4 — Warehouse Operator: Stock receipt, wave picking, packing, stock movements
  warehouse: [
    'orders:view',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:mutate',
    'products:view',
    'purchasing:view',
  ],

  // R5 — Finance / Accountant: Ledger, reconciliation, fee audit, financial records
  finance: [
    'orders:view',
    'purchasing:view',
    'finance:view', 'finance:reconcile', 'finance:adjust', 'finance:manage',
    'analytics:view', 'audit:view',
  ],

  // R6 — Growth / Marketing: Campaigns, ROAS, funnel, KOC, attributed orders
  growth: [
    'orders:view',
    'products:view',
    'inventory:view',
    'growth:view', 'growth:manage',
    'analytics:view',
  ],

  // R7 — Read-only Analyst: Authorized reports and analytics
  viewer: [],
};

export function hasPermission(role: TenantRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

function getRolePages(role: TenantRole | null | undefined): string[] {
  if (!role) return ['dashboard'];
  switch (role) {
    case 'owner':
      return [
        // 01 Command Center
        'dashboard', 'operationsAnalytics',
        // 02 Commerce Operations
        'orders', 'fulfillment', 'returns', 'customers',
        // 03 Product Intelligence
        'products', 'inventory', 'purchaseOrders', 'transfers', 'stockLedger', 'batches', 'warehouses',
        // 04 Finance Control Tower
        'orderEconomics', 'skuEconomics', 'channelEconomics', 'cashWorkingCapital', 'pricingCalculator',
        'ledger', 'feeReconciliation', 'marginControl', 'salesVelocity', 'revenueReport',
        // 05 Growth Engine
        'marketingAnalytics', 'customerAnalytics', 'salesAnalytics', 'inventoryAnalytics',
        // 06 Execution OS
        'founderExecution',
        // 07 System & Trust / Demo Lab
        'channelConnections', 'settings', 'auditTrail', 'ownerValidation', 'businessRules', 'simulator',
        'bufferRules', 'routingRules', 'channelMapping', 'syncMonitor', 'complaints', 'automationRules',
        'webhooks', 'flowGuide',
      ];

    case 'admin':
      return ['dashboard', 'orders', 'channelConnections', 'settings', 'auditTrail', 'channelMapping', 'syncMonitor', 'webhooks', 'flowGuide'];

    case 'manager':
      return [
        'dashboard', 'operationsAnalytics',
        'orders', 'fulfillment', 'returns', 'customers',
        'products', 'inventory', 'purchaseOrders', 'transfers', 'stockLedger', 'batches', 'warehouses',
        'orderEconomics', 'skuEconomics', 'channelEconomics', 'feeReconciliation', 'pricingCalculator',
        'salesVelocity', 'revenueReport',
        'marketingAnalytics', 'customerAnalytics', 'salesAnalytics', 'inventoryAnalytics',
        'founderExecution',
        'channelConnections', 'auditTrail', 'ownerValidation', 'businessRules', 'simulator',
        'bufferRules', 'routingRules', 'channelMapping', 'syncMonitor', 'complaints', 'automationRules',
        'flowGuide',
      ];

    case 'warehouse':
      return [
        'dashboard', 'operationsAnalytics',
        'orders', 'fulfillment', 'returns',
        'products', 'inventory', 'purchaseOrders', 'transfers', 'batches', 'warehouses', 'stockLedger',
        'flowGuide',
      ];

    case 'finance':
      if (!ENABLE_FINANCE_ROLE) return [];
      return [
        'dashboard', 'orders',
        'orderEconomics', 'skuEconomics', 'channelEconomics', 'cashWorkingCapital', 'pricingCalculator',
        'ledger', 'feeReconciliation', 'marginControl', 'salesVelocity', 'revenueReport',
        'auditTrail', 'founderExecution', 'flowGuide',
      ];

    case 'growth':
      return [
        'dashboard', 'orders', 'products', 'inventory',
        'marketingAnalytics', 'customerAnalytics', 'salesAnalytics', 'inventoryAnalytics',
        'skuEconomics', 'channelEconomics', 'pricingCalculator',
        'founderExecution', 'flowGuide',
      ];

    case 'viewer':
      // R26: Viewer deprecated, no operational access
      return [];

    default:
      return ['dashboard', 'flowGuide'];
  }
}

// Optional legacy workspaces are hidden until their own complete acceptance is run.
export const OPTIONAL_PAGES = new Set(['operationsAnalytics', 'inventoryAnalytics', 'cashWorkingCapital', 'customerAnalytics', 'salesAnalytics', 'founderExecution', 'marginControl', 'salesVelocity', 'revenueReport', 'transfers', 'batches', 'ledger', 'ownerValidation', 'businessRules', 'simulator', 'automationRules', 'webhooks', 'bufferRules', 'routingRules']);
export function getAllowedPagesForRole(role: TenantRole | null | undefined): string[] {
  return getRolePages(role).filter(page => !OPTIONAL_PAGES.has(page));
}
