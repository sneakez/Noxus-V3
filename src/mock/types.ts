import type {
  Tenant,
  TenantRole,
  TenantMembership,
  Profile,
  Product,
  Warehouse,
  Customer,
  Order,
  OrderItem,
  StockLedgerEntry,
  PurchaseOrder,
  PurchaseOrderItem,
  Transfer,
  PickingWave,
  ReturnRecord,
  ReturnItem,
  Batch,
  JournalEntry,
  JournalLine,
  Channel,
  SerialStatus
} from '@/types';

// ============ 5-State Inventory Model ============
export interface SkuInventory5State {
  sku: string;
  product_id: string;
  name: string;
  warehouse_id: string;
  warehouse_name: string;
  physical: number;    // Actual items on shelf
  reserved: number;    // Locked for pending/processing orders
  available: number;   // physical - reserved (safe to sell)
  damaged: number;     // Quarantined / QC failed / defective
  inbound: number;     // En-route from PO / supplier
  safety_stock: number;
  reorder_level: number;
  sales_velocity: number; // Avg units sold per day
  runway_days: number;    // available / sales_velocity
  status: 'Healthy' | 'Warning' | 'Critical';
}

// ============ Supplier Model ============
export interface Supplier {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  rating: number;
  created_at: string;
}

// ============ Warranty & Serial Item ============
export interface SerialWarrantyRecord {
  id: string;
  tenant_id: string;
  serial_number: string;
  sku: string;
  product_name: string;
  status: SerialStatus;
  warehouse_id: string;
  order_id?: string;
  customer_name?: string;
  warranty_start?: string;
  warranty_months: number;
  warranty_end?: string;
  rma_history: Array<{
    date: string;
    issue: string;
    resolution: string;
  }>;
}

// ============ Marketplace Reconciliation Item ============
export interface MarketplaceReconciliation {
  id: string;
  tenant_id: string;
  settlement_id: string;
  channel: Channel;
  period_start: string;
  period_end: string;
  order_count: number;
  gross_sales: number;
  platform_fees: number;
  commission: number;
  shipping_subsidies: number;
  net_payout: number;
  system_calculated_payout: number;
  discrepancy: number;
  status: 'matched' | 'discrepancy_flagged' | 'reconciled';
  settled_at: string;
}

// ============ Demo Scenarios ============
export type DemoScenarioId =
  | 'SCENARIO_NORMAL_DAY'
  | 'SCENARIO_FLASH_SALE'
  | 'SCENARIO_STOCKOUT'
  | 'SCENARIO_CANCELLATION'
  | 'SCENARIO_MISMATCH_PICK'
  | 'SCENARIO_FAILED_DELIVERY'
  | 'SCENARIO_PARTIAL_RETURN'
  | 'SCENARIO_DAMAGED_QC'
  | 'SCENARIO_WARRANTY_RMA'
  | 'SCENARIO_SUPPLIER_SHORTAGE'
  | 'SCENARIO_FEE_MISMATCH'
  | 'SCENARIO_UNAUTHORIZED_ACTION';

export interface DemoScenario {
  id: DemoScenarioId;
  name: string;
  description: string;
  category: 'Orders' | 'Inventory' | 'Fulfillment' | 'Returns' | 'Finance' | 'RBAC';
  roleRecommended: TenantRole;
  steps: string[];
}

// ============ Event Bus Payload ============
export type MockEventTopic =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'STOCK_RESERVED'
  | 'STOCK_RELEASED'
  | 'STOCK_DISPATCHED'
  | 'WAVE_CREATED'
  | 'ITEM_PICKED'
  | 'ITEM_PACKED'
  | 'RETURN_INSPECTED'
  | 'REFUND_PROCESSED'
  | 'PO_RECEIVED'
  | 'JOURNAL_POSTED'
  | 'DATABASE_RESET'
  | 'SCENARIO_TRIGGERED'
  | 'ROLE_SWITCHED';

export interface MockEvent<T = unknown> {
  topic: MockEventTopic;
  timestamp: string;
  actor: string;
  payload: T;
}

// ============ Database Snapshot Structure ============
export interface MockDatabaseSnapshot {
  schemaVersion: number;
  lastUpdated: string;
  activeTenantId: string;
  activeRole: TenantRole;
  tenants: Tenant[];
  memberships: TenantMembership[];
  profiles: Profile[];
  products: Product[];
  warehouses: Warehouse[];
  inventory5State: SkuInventory5State[];
  stockLedger: StockLedgerEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  orderItems: OrderItem[];
  purchaseOrders: PurchaseOrder[];
  purchaseOrderItems: PurchaseOrderItem[];
  transfers: Transfer[];
  pickingWaves: PickingWave[];
  returns: ReturnRecord[];
  returnItems: ReturnItem[];
  batches: Batch[];
  serials: SerialWarrantyRecord[];
  journalEntries: JournalEntry[];
  journalLines: JournalLine[];
  reconciliations: MarketplaceReconciliation[];
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entity_id: string;
    actor: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}
