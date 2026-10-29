import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Boxes,
  ArrowLeftRight,
  ScrollText,
  ClipboardList,
  Layers,
  Truck,
  Receipt,
  ShieldCheck,
  PackageCheck,
  BadgePercent,
  Link2,
  TrendingUp,
  Settings,
  LogOut,
  CheckCircle2,
  Calculator,
  Target,
  HeartHandshake,
  Wallet,
  Activity,
  CheckSquare,
  Building2,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import type { UserRole, TenantRole } from '@/types';

export type PageId =
  // 1. Command Center
  | 'dashboard'
  | 'operationsAnalytics'
  // 2. Commerce Operations
  | 'orders'
  | 'fulfillment'
  | 'returns'
  | 'customers'
  // 3. Product & Inventory
  | 'products'
  | 'inventory'
  | 'purchaseOrders'
  | 'transfers'
  | 'stockLedger'
  | 'batches'
  | 'warehouses'
  // 4. Finance & Economics
  | 'orderEconomics'
  | 'skuEconomics'
  | 'channelEconomics'
  | 'cashWorkingCapital'
  | 'pricingCalculator'
  // 5. Growth & Marketing
  | 'marketingAnalytics'
  | 'customerAnalytics'
  | 'salesAnalytics'
  | 'inventoryAnalytics'
  // 6. Founder Execution
  | 'founderExecution'
  // Governance & Admin / Utilities
  | 'channelConnections'
  | 'settings'
  | 'auditTrail'
  | 'ownerValidation'
  | 'businessRules'
  | 'simulator'
  // Legacy retained routes (accessible via deep-link or redirect)
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
  // 1. Command Center
  {
    label: '01 — Bảng Điều Hành',
    items: [
      { id: 'dashboard', label: 'Bảng điều hành kinh doanh', icon: LayoutDashboard },
      { id: 'operationsAnalytics', label: 'Vận hành & SLA kho', icon: Activity },
    ],
  },
  // 2. Commerce Operations
  {
    label: '02 — Vận Hành Đơn Hàng',
    items: [
      { id: 'orders', label: 'Đơn hàng đa kênh', icon: ShoppingCart },
      { id: 'fulfillment', label: 'Xử lý đơn & Đóng gói', icon: Truck },
      { id: 'returns', label: 'Đổi trả & Xử lý RMA', icon: PackageCheck },
      { id: 'customers', label: 'Khách hàng (CRM)', icon: Users },
    ],
  },
  // 3. Kho Vận & Sản Phẩm
  {
    label: '03 — Kho Vận & Sản Phẩm',
    items: [
      { id: 'products', label: 'Sản phẩm & SKU', icon: Package },
      { id: 'inventory', label: 'Tồn kho 5 trạng thái', icon: Boxes },
      { id: 'purchaseOrders', label: 'Đơn mua hàng (PO)', icon: ClipboardList },
      { id: 'transfers', label: 'Chuyển kho chi nhánh', icon: ArrowLeftRight },
      { id: 'stockLedger', label: 'Sổ cái thẻ kho', icon: ScrollText },
    ],
  },
  // 4. Finance & Economics
  {
    label: '04 — Tài Chính & P&L',
    items: [
      { id: 'orderEconomics', label: 'Kinh tế đơn hàng (P&L)', icon: Receipt },
      { id: 'skuEconomics', label: 'Biên lợi nhuận SKU', icon: BadgePercent },
      { id: 'channelEconomics', label: 'Hiệu quả kênh & Phí sàn', icon: Layers },
      { id: 'cashWorkingCapital', label: 'Dòng tiền & Vốn lưu động', icon: Wallet },
      { id: 'pricingCalculator', label: 'Định giá & Hòa vốn', icon: Calculator },
    ],
  },
  // 5. Growth & Marketing
  {
    label: '05 — Tăng Trưởng & Tiếp Thị',
    items: [
      { id: 'marketingAnalytics', label: 'Hiệu quả Ads & ROAS', icon: Target },
      { id: 'customerAnalytics', label: 'Khách hàng & Cohorts', icon: HeartHandshake },
      { id: 'salesAnalytics', label: 'Phân tích bán hàng', icon: TrendingUp },
    ],
  },
  // 6. Founder Execution
  {
    label: '06 — Điều Hành Chiến Lược',
    items: [
      { id: 'founderExecution', label: 'Kế hoạch OKRs & Quyết định', icon: CheckSquare },
    ],
  },
  // System Settings & Utilities
  {
    label: '07 — Hệ Thống & Cấu Hình',
    items: [
      { id: 'channelConnections', label: 'Kênh bán & Kết nối API', icon: Link2 },
      { id: 'settings', label: 'Cài đặt & Phân quyền', icon: Settings },
      { id: 'auditTrail', label: 'Nhật ký hệ thống (Audit)', icon: ShieldCheck },
      ...(isMockMode
        ? [
            { id: 'ownerValidation' as PageId, label: 'Nghiệm thu nghiệp vụ', icon: CheckCircle2, badge: 'Demo' },
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
  finance: '💰 Kế Toán Tài Chính',
  growth: '🚀 Tăng Trưởng & Ads',
  viewer: '👁️ Người Xem (Chỉ Đọc)',
};

const ALL_ROLES: Array<{ id: TenantRole; label: string; desc: string }> = [
  { id: 'owner', label: '👑 Chủ Doanh Nghiệp (Owner)', desc: 'Toàn quyền quản trị & duyệt tài chính' },
  { id: 'admin', label: '⚡ Admin Quản Trị', desc: 'Quản trị hệ thống & nhân sự' },
  { id: 'manager', label: '📊 Trưởng Phòng OMS', desc: 'Quản lý đơn hàng, xuất nhập tồn' },
  { id: 'warehouse', label: '📦 Nhân Viên Kho', desc: 'Soạn hàng, đóng gói & kiểm định' },
  { id: 'finance', label: '💰 Kế Toán Tài Chính', desc: 'Sổ kép, đối soát sàn & chi phí' },
  { id: 'growth', label: '🚀 Tăng Trưởng & Ads', desc: 'Chiến dịch, ROAS & Cohorts' },
  { id: 'viewer', label: '👁️ Người Xem (Chỉ Đọc)', desc: 'Chỉ đọc, không được sửa đổi' },
];

export function Sidebar({ current, onNavigate, stats, mobileOpen, onMobileClose }: SidebarProps) {
  const { profile, signOut, switchRole, activeRole } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setShowRoleSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        if (activeRole === 'owner' || activeRole === 'admin') return true;
        if (activeRole === 'viewer') return true;
        if (activeRole === 'finance') {
          return ['dashboard', 'orders', 'orderEconomics', 'skuEconomics', 'channelEconomics', 'pricingCalculator', 'cashWorkingCapital', 'founderExecution'].includes(item.id);
        }
        if (activeRole === 'warehouse') {
          return ['dashboard', 'orders', 'inventory', 'fulfillment', 'transfers', 'returns', 'operationsAnalytics'].includes(item.id);
        }
        if (activeRole === 'growth') {
          return ['dashboard', 'orders', 'products', 'inventory', 'marketingAnalytics', 'customerAnalytics', 'salesAnalytics', 'skuEconomics', 'channelEconomics', 'founderExecution'].includes(item.id);
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
          'w-64 shrink-0 bg-[#081B2C] text-slate-100 flex flex-col h-screen overflow-y-auto overflow-x-hidden fixed lg:sticky top-0 z-50 transition-transform duration-300 font-sans border-r border-slate-800',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="relative px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1E647F] flex items-center justify-center shadow-xs">
              <Boxes size={20} className="text-white" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">Dream Terus</span>
              <p className="text-[11px] text-[#27B4A0] font-semibold flex items-center gap-1">
                Terus Tech • Commerce OS
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="relative flex-1 px-3 py-3 space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = current === item.id;
                  const Icon = item.icon;
                  const badge =
                    item.id === 'orders'
                      ? stats.pendingOrders > 0
                        ? `${stats.pendingOrders}`
                        : undefined
                      : item.id === 'inventory'
                      ? stats.lowStock > 0
                        ? `${stats.lowStock}`
                        : undefined
                      : item.badge;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onMobileClose();
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer group',
                        active
                          ? 'bg-[#1E647F] text-white shadow-xs font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          size={16}
                          className={cn(
                            'shrink-0 transition-colors',
                            active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {badge && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono',
                            active
                              ? 'bg-white/20 text-white'
                              : item.id === 'orders'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.id === 'inventory'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-[#1E647F]/30 text-teal-300 border border-[#1E647F]/40'
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

        {/* User Profile & Interactive Role Switcher Footer */}
        <div className="relative p-3 border-t border-white/5 shrink-0 bg-[#081B2C]" ref={roleSwitcherRef}>
          {/* Quick Role Switcher Popover */}
          {showRoleSwitcher && (
            <div className="absolute bottom-full left-3 right-3 mb-2 p-2 bg-[#0C2739] border border-[#1E647F] rounded-2xl shadow-2xl z-50 animate-scale-in text-xs space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider border-b border-slate-700/60 mb-1 flex items-center justify-between">
                <span>Chuyển Đổi Vai Trò</span>
                <span className="text-slate-400 font-mono">7 ROLES</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {ALL_ROLES.map((r) => {
                  const isCurrent = activeRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        switchRole(r.id);
                        setShowRoleSwitcher(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group',
                        isCurrent
                          ? 'bg-[#1E647F] text-white font-bold'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs truncate">{r.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.desc}</p>
                      </div>
                      {isCurrent && <Check size={14} className="text-[#27B4A0] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer group"
              title="Nhấn để chuyển đổi vai trò (Role Switcher)"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1E647F]/40 border border-[#1E647F]/60 flex items-center justify-center font-bold text-teal-200 text-xs shrink-0 group-hover:border-teal-400 transition-colors">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {profile?.full_name || 'Phan Phúc Thịnh'}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-[#27B4A0] truncate font-mono">
                    {ROLE_LABELS[activeRole]}
                  </p>
                  <ChevronDown size={11} className={cn('text-slate-400 transition-transform', showRoleSwitcher && 'rotate-180')} />
                </div>
              </div>
            </button>

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
