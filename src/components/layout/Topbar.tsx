import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, Menu, ChevronDown, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import type { TenantRole } from '@/types';

interface TopbarProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onMobileMenu?: () => void;
}

export function Topbar({
  title,
  subtitle,
  search,
  onSearch,
  searchPlaceholder = 'Tim kiem...',
  onPrimaryAction,
  primaryActionLabel = 'Them moi',
  onMobileMenu,
}: TopbarProps) {
  const { activeTenant, memberships, switchTenant, activeRole, switchRole } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D9E3E8]">
      <div className="px-4 lg:px-8 py-3.5 flex items-center gap-3">
        {onMobileMenu && (
          <button
            onClick={onMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-[#123A52] tracking-tight truncate">
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>
        </div>

        {/* Quick Role Switcher (Prototype RBAC) */}
        <div className="relative shrink-0 hidden sm:block">
          <select
            value={activeRole || 'owner'}
            onChange={(e) => switchRole(e.target.value as TenantRole)}
            className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-[#D9E3E8] bg-white text-[#123A52] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20 shadow-2xs"
            title="Chuyển vai trò Demo (Prototype RBAC)"
          >
            <option value="owner">👑 Owner (Chủ)</option>
            <option value="admin">⚡ Admin</option>
            <option value="manager">📊 Manager (OMS)</option>
            <option value="warehouse">📦 Thủ Kho</option>
            <option value="finance">💰 Kế Toán</option>
            <option value="viewer">👁️ Chỉ Xem</option>
          </select>
        </div>
        {memberships.length > 0 && (
          <div className="relative shrink-0" ref={switcherRef}>
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D9E3E8] bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Building2 size={15} className="text-[#1E647F]" />
              <span className="text-xs font-semibold text-[#123A52] hidden sm:inline truncate max-w-32">
                {activeTenant?.name ?? 'Chọn workspace'}
              </span>
              <ChevronDown size={13} className={cn('text-slate-400 transition-transform', showSwitcher && 'rotate-180')} />
            </button>

            {showSwitcher && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#D9E3E8] shadow-lg overflow-hidden animate-scale-in z-50">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {memberships.map((m) => (
                    <button
                      key={m.tenant_id}
                      onClick={() => {
                        switchTenant(m.tenant_id);
                        setShowSwitcher(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer',
                        activeTenant?.id === m.tenant_id && 'bg-teal-50/60'
                      )}
                    >
                      <Building2 size={15} className="text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#123A52] truncate">
                          {m.tenant?.name ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                      </div>
                      {activeTenant?.id === m.tenant_id && (
                        <Check size={14} className="text-[#1E647F] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative hidden md:block group shrink-0">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1E647F] transition-colors"
          />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-48 lg:w-64 rounded-lg border border-[#D9E3E8] bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-[#123A52] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20 focus:border-[#1E647F] focus:bg-white transition-all duration-150"
          />
        </div>

        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all shrink-0 cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="btn-primary shrink-0"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{primaryActionLabel}</span>
          </button>
        )}

      </div>

      {/* Mobile search - in normal flow so header expands and never overlaps page content */}
      <div className="md:hidden border-t border-ink-200/50 bg-white/95 px-4 py-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-ink-200 bg-ink-50/80 pl-9 pr-3 py-1.5 text-xs text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>
    </header>
  );
}
