import type { TenantRole } from '@/types';

export type Permission =
  | 'orders:view'
  | 'orders:create'
  | 'orders:cancel'
  | 'orders:delete'
  | 'inventory:view'
  | 'inventory:mutate'
  | 'products:manage'
  | 'warehouses:manage'
  | 'finance:view'
  | 'finance:manage'
  | 'audit:view'
  | 'settings:manage'
  | 'users:manage'
  | 'simulator:access'
  | 'webhooks:manage';

const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  owner: [
    'orders:view', 'orders:create', 'orders:cancel', 'orders:delete',
    'inventory:view', 'inventory:mutate', 'products:manage', 'warehouses:manage',
    'finance:view', 'finance:manage', 'audit:view', 'settings:manage',
    'users:manage', 'simulator:access', 'webhooks:manage',
  ],
  admin: [
    'orders:view', 'orders:create', 'orders:cancel', 'orders:delete',
    'inventory:view', 'inventory:mutate', 'products:manage', 'warehouses:manage',
    'finance:view', 'finance:manage', 'audit:view', 'settings:manage',
    'users:manage', 'simulator:access', 'webhooks:manage',
  ],
  manager: [
    'orders:view', 'orders:create', 'orders:cancel',
    'inventory:view', 'inventory:mutate', 'products:manage', 'warehouses:manage',
    'finance:view', 'finance:manage', 'audit:view', 'simulator:access',
  ],
  warehouse: [
    'orders:view',
    'inventory:view', 'inventory:mutate', 'warehouses:manage',
  ],
  finance: [
    'orders:view', 'finance:view', 'finance:manage', 'audit:view',
  ],
  viewer: [
    'orders:view', 'inventory:view',
  ],
};

export function hasPermission(role: TenantRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

export function getAllowedPagesForRole(role: TenantRole | null | undefined): string[] {
  if (!role) return ['dashboard'];
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        'dashboard', 'orders', 'customers', 'complaints', 'returns', 'products',
        'inventory', 'warehouses', 'transfers', 'batches', 'stockLedger',
        'purchaseOrders', 'channelMapping', 'channelConnections', 'syncMonitor',
        'fulfillment', 'ledger', 'feeReconciliation', 'marginControl',
        'salesVelocity', 'revenueReport', 'auditTrail', 'automationRules',
        'webhooks', 'simulator', 'bufferRules', 'routingRules', 'settings', 'flowGuide',
      ];
    case 'manager':
      return [
        'dashboard', 'orders', 'customers', 'complaints', 'returns', 'products',
        'inventory', 'warehouses', 'transfers', 'batches', 'stockLedger',
        'purchaseOrders', 'channelMapping', 'channelConnections', 'syncMonitor',
        'fulfillment', 'ledger', 'feeReconciliation', 'marginControl',
        'salesVelocity', 'revenueReport', 'auditTrail', 'automationRules',
        'simulator', 'bufferRules', 'routingRules', 'flowGuide',
      ];
    case 'warehouse':
      return [
        'dashboard', 'orders', 'products', 'inventory', 'warehouses',
        'transfers', 'batches', 'stockLedger', 'purchaseOrders',
        'fulfillment', 'flowGuide',
      ];
    case 'finance':
      return [
        'dashboard', 'orders', 'ledger', 'feeReconciliation',
        'marginControl', 'salesVelocity', 'revenueReport', 'auditTrail', 'flowGuide',
      ];
    case 'viewer':
      return ['dashboard', 'orders', 'inventory', 'flowGuide'];
    default:
      return ['dashboard', 'flowGuide'];
  }
}
