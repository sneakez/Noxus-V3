import { useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Shield, 
  Zap, 
  Users, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { mockStore } from '@/mock/store';
import { DEMO_SCENARIOS, executeScenario } from '@/mock/scenarios/scenarioRunner';
import { useToast } from '@/components/ui/Toast';
import type { TenantRole } from '@/types';
import type { DemoScenarioId } from '@/mock/types';

export function DemoControlPanel() {
  const toast = useToast();
  const { activeRole, switchRole, activeTenant, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioId>('SCENARIO_NORMAL_DAY');
  const [isRunning, setIsRunning] = useState(false);

  const roles: Array<{ id: TenantRole; label: string; icon: string; desc: string }> = [
    { id: 'owner', label: 'Owner (Chủ)', icon: '👑', desc: 'Toàn quyền cấu hình & xóa' },
    { id: 'admin', label: 'Admin', icon: '⚡', desc: 'Quản trị hệ thống & nhân sự' },
    { id: 'manager', label: 'Manager', icon: '📊', desc: 'Quản lý đơn hàng & phê duyệt' },
    { id: 'warehouse', label: 'Thủ Kho', icon: '📦', desc: 'Nhặt hàng, đóng gói, nhập kho' },
    { id: 'finance', label: 'Kế Toán', icon: '💰', desc: 'Ghi sổ kép & đối soát sàn' },
    { id: 'viewer', label: 'Chỉ Xem', icon: '👁️', desc: 'Chỉ đọc, không được sửa đổi' },
  ];

  const handleRunScenario = async () => {
    setIsRunning(true);
    try {
      const res = await executeScenario(selectedScenario);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('Lỗi khi thực thi kịch bản mô phỏng', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu về trạng thái gốc của nhà máy?')) {
      mockStore.resetToDefaultSeed();
      toast('✓ Đã khôi phục toàn bộ dữ liệu mẫu về mặc định ban đầu!', 'success');
    }
  };

  return (
    <>
      {/* Mobile Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 font-sans max-w-[calc(100vw-24px)]">
        {/* Floating Trigger Pill */}
        {!isOpen && (
          <>
            {/* Desktop / Tablet Pill */}
            <button
              onClick={() => setIsOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#081B2C] via-[#123A52] to-[#1E647F] text-white text-xs font-bold shadow-2xl border border-[#27B4A0]/60 hover:scale-105 transition-all group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#27B4A0] animate-pulse" />
              <span className="tracking-wide">BẢNG ĐIỀU KHIỂN DEMO & KỊCH BẢN</span>
              <span className="px-2 py-0.5 rounded-full bg-[#27B4A0]/20 text-[#27B4A0] text-[10px] font-mono uppercase">
                {activeRole}
              </span>
              <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Mobile Discreet Floating Button (Never covers content) */}
            <button
              onClick={() => setIsOpen(true)}
              className="sm:hidden w-10 h-10 rounded-full bg-[#081B2C]/90 backdrop-blur-md border border-[#27B4A0]/80 text-[#27B4A0] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Mở bảng điều khiển Demo"
            >
              <Sparkles size={16} />
            </button>
          </>
        )}

        {/* Expanded Control Drawer */}
        {isOpen && (
          <div className="w-[calc(100vw-24px)] sm:w-[420px] max-h-[85vh] rounded-3xl bg-[#081B2C] border border-[#1E647F]/80 shadow-2xl text-white overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#0C2739] to-[#123A52] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Trung Tâm Điều Hành Demo V5</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#27B4A0]/20 text-[#27B4A0] rounded-full font-mono">
                    Mock Engine
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">Chuyển vai trò & giả lập tình huống</div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {/* RBAC Notice */}
            <div className="p-2.5 rounded-2xl bg-[#123A52]/60 border border-[#1E647F]/50 flex items-start gap-2 text-[11px] text-gray-300">
              <Lock size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Prototype RBAC:</strong> Mô phỏng phân quyền giao diện (Sidebar, quyền bấm nút), không phải bảo mật backend production.
              </span>
            </div>

            {/* Role Switcher Grid */}
            <div>
              <div className="text-[11px] font-bold text-wood-aqua uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={13} /> 1. Chuyển Nhanh Vai Trò (Role Switcher)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => {
                  const isActive = activeRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => switchRole(r.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-[#1E647F] border-[#27B4A0] text-white shadow-md'
                          : 'bg-[#0C2739] border-gray-800 text-gray-300 hover:border-gray-700'
                      }`}
                      title={r.desc}
                    >
                      <div className="text-sm mb-0.5">{r.icon}</div>
                      <div className="font-bold text-[11px] truncate">{r.label}</div>
                      <div className="text-[9px] text-gray-400 truncate">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workspace Selector */}
            <div>
              <div className="text-[11px] font-bold text-wood-aqua uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield size={13} /> 2. Không Gian Doanh Nghiệp (Workspace)
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'tenant_flagship', name: 'Flagship Store' },
                  { id: 'tenant_logistics_3pl', name: '3PL Logistics Hub' },
                  { id: 'tenant_retail_hanoi', name: 'Chi Nhánh Hà Nội' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => switchTenant(t.id)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all truncate ${
                      activeTenant?.id === t.id
                        ? 'bg-[#123A52] border-[#27B4A0] text-white'
                        : 'bg-[#0C2739] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Picker */}
            <div>
              <div className="text-[11px] font-bold text-wood-aqua uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Zap size={13} /> 3. Chọn Kịch Bản Nghiệp Vụ (12 Scenarios)
              </div>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value as DemoScenarioId)}
                className="w-full p-2.5 rounded-xl bg-[#0C2739] border border-gray-700 text-white text-xs focus:outline-none focus:border-[#27B4A0]"
              >
                {DEMO_SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Scenario Description Card */}
              {(() => {
                const cur = DEMO_SCENARIOS.find(s => s.id === selectedScenario);
                if (!cur) return null;
                return (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-gray-800/80 text-[11px] text-gray-300 space-y-1">
                    <p className="text-gray-200">{cur.description}</p>
                    <div className="text-[10px] text-wood-aqua pt-1 border-t border-gray-800 flex items-center gap-1">
                      <span>Khuyến nghị vai trò:</span>
                      <strong className="uppercase">{cur.roleRecommended}</strong>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={handleRunScenario}
                disabled={isRunning}
                className="w-full mt-2.5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#1fa390] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#27B4A0]/20 disabled:opacity-50"
              >
                <Play size={14} className="fill-white" />
                <span>{isRunning ? 'Đang thực thi kịch bản...' : 'Kích Hoạt Kịch Bản Này Ngay'}</span>
              </button>
            </div>

            {/* Factory Reset */}
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-[11px] text-gray-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Đặt lại dữ liệu gốc (Factory Seed)</span>
              </button>

              <span className="text-[10px] text-gray-500 font-mono">
                v2.0 • LocalStorage
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
