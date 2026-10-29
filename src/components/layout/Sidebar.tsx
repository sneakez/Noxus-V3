import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Boxes,
  Sparkles,
  Warehouse,
  ArrowLeftRight,
  FlaskConical,
  ScrollText,
  ClipboardList,
  Layers,
  Truck,
  Receipt,
  ShieldCheck,
  Bot,
  Webhook,
  Zap,
  Activity,
  PackageCheck,
  BadgePercent,
  Banknote,
  Link2,
  RefreshCw,
  Gauge,
  TrendingUp,
  ShieldAlert,
  Settings,
  LogOut,
  CircuitBoard,
  CheckCircle2,
  Calculator,
  Target,
  HeartHandshake,
  Wallet,
  FlaskRound
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth, useRole } from '@/providers/AuthProvider';
import type { UserRole, TenantRole } from '@/types';

export type PageId =
  // Overview
  | 'dashboard'
  // Sales
  | 'orders'
  | 'customers'
  | 'salesAnalytics'
  // Operations & WMS
  | 'inventory'
  | 'fulfillment'
  | 'inventoryAnalytics'
  | 'transfers'
  | 'batches'
  | 'warehouses'
  | 'stockLedger'
  // Procurement
  | 'purchaseOrders'
  | 'products'
  // After-sales
  | 'returns'
  // Unit Economics
  | 'orderEconomics'
  | 'skuEconomics'
  | 'channelEconomics'
  | 'pricingCalculator'
  // Data Analytics
  | 'marketingAnalytics'
  | 'customerAnalytics'
  | 'operationsAnalytics'
  | 'cashWorkingCapital'
  // Governance & Admin
  | 'channelConnections'
  | 'settings'
  | 'auditTrail'
  // Demo Lab
  | 'ownerValidation'
  | 'businessRules'
  | 'simulator'
  // Legacy retained routes (accessible but hidden from primary nav)
  | 'ledger'
  | 'feeReconciliation'
  | 'marginControl'
  | 'salesVelocity'
  | 'revenueReport'
  | 'bufferRules'
  | 'routingRules'
  | 'channelMapping'
  | 'syncMonitor'
  | 'complaints'
  | 'automationRules'
  | 'webhooks'
  | 'flowGuide';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
  badge?: string;
  isMockOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const isMockMode = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_DATA_MODE === 'mock' || true);

export const navGroups: NavGroup[] = [
  // 1. Tổng quan
  {
    label: '1. Tổng quan',
    items: [
      { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    ],
  },
  // 2. Bán hàng
  {
    label: '2. Bán hàng',
    items: [
      { id: 'orders', label: 'Đơn hàng đa kênh', icon: ShoppingCart },
      { id: 'customers', label: 'Khách hàng (CRM)', icon: Users },
      { id: 'salesAnalytics', label: 'Phân tích bán hàng', icon: TrendingUp },
    ],
  },
  // 3. Kho vận
  {
    label: '3. Kho vận',
    items: [
      { id: 'inventory', label: 'Tồn kho 5 trạng thái', icon: Boxes },
      { id: 'fulfillment', label: 'Wave Picking & SLA', icon: Truck },
      { id: 'inventoryAnalytics', label: 'Phân tích kho & Tái đặt', icon: Gauge },
      { id: 'transfers', label: 'Chuyển kho chi nhánh', icon: ArrowLeftRight },
      { id: 'batches', label: 'Lô & Hạn sử dụng', icon: FlaskConical },
    ],
  },
  // 4. Mua hàng
  {
    label: '4. Mua hàng',
    items: [
      { id: 'purchaseOrders', label: 'Đơn mua hàng (PO)', icon: ClipboardList },
      { id: 'products', label: 'Sản phẩm & SKU', icon: Package },
    ],
  },
  // 5. Hậu mãi
  {
    label: '5. Hậu mãi',
    items: [
      { id: 'returns', label: 'Đổi trả / RMA 6 Nhánh', icon: PackageCheck },
    ],
  },
  // 6. Unit Economics
  {
    label: '6. Unit Economics',
    items: [
      { id: 'orderEconomics', label: 'Order Economics', icon: Receipt },
      { id: 'skuEconomics', label: 'SKU Economics & Portfolio', icon: BadgePercent },
      { id: 'channelEconomics', label: 'Channel Economics', icon: Layers },
      { id: 'pricingCalculator', label: 'Pricing Intelligence', icon: Calculator, badge: 'Simulator' },
    ],
  },
  // 7. Data Analytics
  {
    label: '7. Data Analytics',
    items: [
      { id: 'marketingAnalytics', label: 'Marketing & ROAS', icon: Target },
      { id: 'customerAnalytics', label: 'Khách hàng & Cohorts', icon: HeartHandshake },
      { id: 'operationsAnalytics', label: 'Vận hành & Chu kỳ SLA', icon: Activity },
      { id: 'cashWorkingCapital', label: 'Dòng tiền & Vốn lưu động', icon: Wallet },
    ],
  },
  // 8. Quản trị & Demo Lab
  {
    label: '8. Quản trị & Demo Lab',
    items: [
      { id: 'channelConnections', label: 'Kênh bán & Kết nối', icon: Link2 },
      { id: 'settings', label: 'Cài đặt & RBAC', icon: Settings },
      { id: 'auditTrail', label: 'Nhật ký Audit', icon: ShieldCheck },
      // Demo Lab entries (Only in Mock mode)
      ...(isMockMode
        ? [
            { id: 'ownerValidation' as PageId, label: '🧪 Nghiệm Thu Nghiệp Vụ', icon: CheckCircle2, badge: 'Demo Lab' },
            { id: 'businessRules' as PageId, label: '⚖️ Phê Duyệt Quy Tắc', icon: ShieldAlert, badge: 'Demo Lab' },
            { id: 'simulator' as PageId, label: '⚡ Chaos Simulator', icon: Zap, badge: 'Demo Lab' },
          ]
        : []),
    ],
  },
];

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  stats: { pendingOrders: number; lowStock: number };
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const ROLE_LABELS: Record<TenantRole, string> = {
  owner: '👑 Chủ Doanh Nghiệp',
  admin: '⚡ Admin Quản Trị',
  manager: '📊 Trưởng Phòng OMS',
  warehouse: '📦 Nhân Viên Kho',
  finance: '💰 Kế Toán Sổ Kép',
  viewer: '👁️ Người Xem (Chỉ Đọc)',
};

export function Sidebar({ current, onNavigate, stats, mobileOpen, onMobileClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { tenantRole } = useRole();
  const activeRole: TenantRole = tenantRole ?? 'owner';

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        if (activeRole === 'owner' || activeRole === 'admin') return true;
        if (activeRole === 'viewer') return true;
        if (activeRole === 'finance') {
          return ['dashboard', 'orders', 'orderEconomics', 'skuEconomics', 'channelEconomics', 'pricingCalculator', 'cashWorkingCapital'].includes(item.id);
        }
        if (activeRole === 'warehouse') {
          return ['dashboard', 'orders', 'inventory', 'fulfillment', 'transfers', 'batches', 'returns', 'operationsAnalytics'].includes(item.id);
        }
        return item.roles.includes(activeRole as UserRole);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'w-64 shrink-0 bg-ink-950 text-ink-100 flex flex-col h-screen overflow-y-auto overflow-x-hidden fixed lg:sticky top-0 z-50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

        <div className="relative px-5 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Boxes size={22} className="text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse-glow" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">NexusOMS</h1>
              <p className="text-[11px] text-ink-400 font-medium flex items-center gap-1">
                <Sparkles size={9} className="text-brand-400" />
                V6 Analytics Edition
              </p>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-3 space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = current === item.id;
                  const Icon = item.icon;
                  const badge =
                    item.id === 'orders'
                      ? stats.pendingOrders
                      : item.id === 'inventory' || item.id === 'products'
                      ? stats.lowStock
                      : 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onMobileClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                        active
                          ? 'bg-brand-600/15 text-brand-200 border border-brand-600/20'
                          : 'text-ink-300 hover:bg-white/5 hover:text-white border border-transparent'
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-brand-400" />
                      )}
                      <Icon
                        size={16}
                        className={cn(
                          'transition-transform duration-200 group-hover:scale-110 shrink-0',
                          active ? 'text-brand-300' : ''
                        )}
                      />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {item.badge}
                        </span>
                      )}
                      {badge > 0 && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold rounded-full px-1.5 py-0.5 transition-all shrink-0',
                            active
                              ? 'bg-brand-500 text-white'
                              : 'bg-white/10 text-ink-200 group-hover:bg-white/15'
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative px-4 py-4 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-900/30">
              {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink-950" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-[11px] text-ink-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {ROLE_LABELS[activeRole as keyof typeof ROLE_LABELS] ?? activeRole}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              title="Đăng xuất"
              className="p-2 rounded-lg text-ink-400 hover:text-rose-400 hover:bg-white/5 transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
