import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SquaresFour,
  Pulse,
  ShoppingBag,
  Truck,
  ArrowUUpLeft,
  Users,
  Package,
  Warehouse,
  ClipboardText,
  ArrowsLeftRight,
  BookOpenText,
  Receipt,
  Percent,
  ChartBar,
  Wallet,
  Calculator,
  Target,
  Heart,
  ChartLineUp,
  CheckSquare,
  PlugsConnected,
  Gear,
  ShieldCheck,
  CheckCircle,
  SignOut,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  type Icon as PhosphorIcon
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import { getAllowedPagesForRole } from '@/lib/permissions';
import type { TenantRole } from '@/types';

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
  icon: PhosphorIcon;
  badge?: string;
  isMockOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      { id: 'dashboard', label: 'Tổng quan', icon: SquaresFour },
      { id: 'operationsAnalytics', label: 'Vận hành kho', icon: Pulse },
    ],
  },
  {
    label: 'VẬN HÀNH ĐƠN',
    items: [
      { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
      { id: 'fulfillment', label: 'Xử lý đơn', icon: Truck },
      { id: 'returns', label: 'Đổi trả hàng', icon: ArrowUUpLeft },
      { id: 'customers', label: 'Khách hàng', icon: Users },
    ],
  },
  {
    label: 'KHO & HÀNG HÓA',
    items: [
      { id: 'products', label: 'Sản phẩm', icon: Package },
      { id: 'inventory', label: 'Quản lý kho', icon: Warehouse },
      { id: 'purchaseOrders', label: 'Nhập hàng', icon: ClipboardText },
      { id: 'transfers', label: 'Chuyển kho', icon: ArrowsLeftRight },
      { id: 'stockLedger', label: 'Sổ thẻ kho', icon: BookOpenText },
    ],
  },
  {
    label: 'TÀI CHÍNH & P&L',
    items: [
      { id: 'orderEconomics', label: 'Lợi nhuận đơn', icon: Receipt },
      { id: 'skuEconomics', label: 'Lợi nhuận SKU', icon: Percent },
      { id: 'channelEconomics', label: 'Hiệu quả kênh', icon: ChartBar },
      { id: 'cashWorkingCapital', label: 'Dòng tiền', icon: Wallet },
      { id: 'pricingCalculator', label: 'Định giá bán', icon: Calculator },
    ],
  },
  {
    label: 'TĂNG TRƯỞNG & ADS',
    items: [
      { id: 'marketingAnalytics', label: 'Hiệu quả Ads', icon: Target },
      { id: 'customerAnalytics', label: 'Phân tích khách', icon: Heart },
      { id: 'salesAnalytics', label: 'Doanh số bán', icon: ChartLineUp },
    ],
  },
  {
    label: 'DÀNH CHO FOUNDER',
    items: [
      { id: 'founderExecution', label: 'Nhật ký Founder', icon: CheckSquare },
    ],
  },
  {
    label: 'CẤU HÌNH & KẾT NỐI',
    items: [
      { id: 'channelConnections', label: 'Kết nối sàn', icon: PlugsConnected },
      { id: 'settings', label: 'Cấu hình', icon: Gear },
      { id: 'auditTrail', label: 'Nhật ký duyệt', icon: ShieldCheck },
    ],
  },
];

interface SidebarProps {
  current: PageId;
  onNavigate: (pageId: PageId) => void;
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
  const currentRole: TenantRole = activeRole ?? 'owner';
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  // Persistent sidebar collapse state (True: icon-only mini sidebar, False: full expanded sidebar)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_sidebar_collapsed', String(next));
      } catch {}
      // Fire window resize so all responsive charts immediately adapt to the expanded canvas
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 310);
      return next;
    });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setShowRoleSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allowedPages = useMemo(
    () => new Set(getAllowedPagesForRole(currentRole)),
    [currentRole]
  );

  const filteredGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowedPages.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [allowedPages]);

  useEffect(() => {
    if (!allowedPages.has(current)) {
      onNavigate('dashboard');
    }
  }, [allowedPages, current, onNavigate]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'shrink-0 bg-sidebar-gradient text-slate-100 flex flex-col h-screen overflow-y-auto overflow-x-hidden fixed lg:sticky top-0 z-50 transition-all duration-300 font-sans border-r border-white/5 shadow-2xl',
          isCollapsed ? 'w-[68px]' : 'w-56',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="relative px-3 py-3.5 border-b border-white/5 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] border border-white/10 flex items-center justify-center shadow-md shrink-0">
                  <Warehouse size={18} weight="duotone" className="text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[15px] font-black text-white tracking-tight truncate block">Dream Terus</span>
                  <p className="text-[10.5px] text-[#38BDF8] font-semibold flex items-center gap-1 truncate">
                    Commerce OS
                  </p>
                </div>
              </div>

              {/* Collapse Button (Chevron Left - Matching Image 1) */}
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Thu gọn menu"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
            </div>
          ) : (
            /* Collapsed Header: Centered Expand Button (Chevron Right - Matching Image 2) */
            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-xs cursor-pointer"
                title="Mở rộng menu"
              >
                <CaretRight size={17} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="relative flex-1 px-2 py-3 space-y-2.5">
          {filteredGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Group Label / Separator */}
              {!isCollapsed ? (
                <p className="px-2 text-[11px] font-bold text-slate-400/90 uppercase tracking-wider mb-1 font-mono">
                  {group.label}
                </p>
              ) : (
                groupIdx > 0 && <div className="my-2 border-t border-white/10 mx-1.5" />
              )}

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

                  // 1. Expanded Menu Item View
                  if (!isCollapsed) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          onMobileClose();
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13.5px] transition-all duration-150 cursor-pointer group',
                          active
                            ? 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-sky-950/40 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08] font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={19}
                            weight={active ? 'bold' : 'regular'}
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
                              'text-xs px-1.5 py-0.5 rounded-full font-bold font-mono shrink-0',
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
                  }

                  // 2. Collapsed Mini Menu Item View (Centered Icon with Hover Tooltip)
                  return (
                    <div key={item.id} className="relative group flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          onMobileClose();
                        }}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer relative',
                          active
                            ? 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-sky-950/40'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                        )}
                        title={item.label}
                      >
                        <Icon
                          size={20}
                          weight={active ? 'bold' : 'regular'}
                          className={cn(
                            'shrink-0 transition-colors',
                            active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                          )}
                        />

                        {badge && (
                          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#102A41]">
                            {badge}
                          </span>
                        )}
                      </button>

                      {/* Floating Tooltip to the right on hover */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-[#0C2438] text-white text-xs font-semibold whitespace-nowrap shadow-2xl border border-white/15 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                        {badge && <span className="ml-1.5 text-sky-300 font-bold">({badge})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Interactive Role Switcher Footer */}
        <div className="relative p-2.5 border-t border-white/5 shrink-0 bg-transparent" ref={roleSwitcherRef}>
          {/* Quick Role Switcher Popover */}
          {showRoleSwitcher && (
            <div
              className={cn(
                'p-2 bg-[#0C2739] border border-[#1E647F] rounded-xl shadow-2xl z-50 animate-scale-in text-xs space-y-1',
                isCollapsed
                  ? 'absolute left-full bottom-2 ml-3 w-64'
                  : 'absolute bottom-full left-3 right-3 mb-2'
              )}
            >
              <div className="px-2 py-1.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider border-b border-slate-700/60 mb-1 flex items-center justify-between">
                <span>Chuyển Đổi Vai Trò</span>
                <span className="text-slate-400 font-mono">7 ROLES</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {ALL_ROLES.map((r) => {
                  const isCurrent = currentRole === r.id;
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

          {!isCollapsed ? (
            /* Expanded Footer: User Avatar + Name + Role + Logout Button */
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer group"
                title="Nhấn để chuyển đổi vai trò (Role Switcher)"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0284C7]/60 to-[#0369A1] border border-[#0284C7]/60 flex items-center justify-center font-bold text-sky-200 text-xs shrink-0 group-hover:border-sky-400 transition-colors">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {profile?.full_name || 'Phan Phúc Thịnh'}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-[#38BDF8] truncate font-medium">
                      {ROLE_LABELS[currentRole]}
                    </p>
                    <CaretDown size={11} className={cn('text-slate-400 transition-transform', showRoleSwitcher && 'rotate-180')} />
                  </div>
                </div>
              </button>

              <button
                onClick={() => signOut()}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                title="Đăng xuất"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : (
            /* Collapsed Footer: Centered Avatar Icon + Logout Icon */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0284C7]/60 to-[#0369A1] border border-[#0284C7]/60 flex items-center justify-center font-bold text-sky-200 text-xs hover:border-sky-400 transition-colors cursor-pointer"
                title={`Vai trò: ${ROLE_LABELS[currentRole]} (Bấm để đổi)`}
              >
                {profile?.full_name?.charAt(0) || 'U'}
              </button>

              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <SignOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
