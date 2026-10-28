import { useState, useEffect } from 'react';
import { 
  Building2, 
  Warehouse, 
  Store, 
  Package, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Check 
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface OnboardingWizardProps {
  onComplete: () => void;
  onNavigate?: (path: string) => void;
}

export function OnboardingWizard({ onComplete, onNavigate }: OnboardingWizardProps) {
  const { createTenantOnboarding, activeTenant } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Organization
  const [companyName, setCompanyName] = useState(() => {
    return sessionStorage.getItem('nexus_pending_org') || 'Công Ty Cổ Phần Thương Mại Nexus';
  });
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [industry, setIndustry] = useState('fashion');
  const [companySize, setCompanySize] = useState('10-50');

  // Step 2: First Warehouse
  const [warehouseName, setWarehouseName] = useState('Kho Tổng Trung Tâm (KHO-01)');
  const [warehouseCode, setWarehouseCode] = useState('WH-HCM-01');
  const [warehouseCity, setWarehouseCity] = useState('TP. Hồ Chí Minh');
  const [warehouseAddress, setWarehouseAddress] = useState('Số 10 Đại Lộ Vòng Cung, P. An Khánh');

  // Step 3: Channels
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['shopee', 'tiktok']);

  // Step 4: Sample Catalog
  const [loadSampleCatalog, setLoadSampleCatalog] = useState(true);

  // Step 5: Invite Members
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'warehouse' | 'manager'>('warehouse');
  const [invitedList, setInvitedList] = useState<Array<{ email: string; role: string }>>([
    { email: 'kho.trungtam@nexusoms.vn', role: 'warehouse' }
  ]);

  useEffect(() => {
    if (companyName && !workspaceSlug) {
      setWorkspaceSlug(
        companyName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 24)
      );
    }
  }, [companyName, workspaceSlug]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => 
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const addInvite = () => {
    if (inviteEmail) {
      setInvitedList(prev => [...prev, { email: inviteEmail, role: inviteRole }]);
      setInviteEmail('');
    }
  };

  const handleFinishOnboarding = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. If activeTenant does not exist, create tenant
      let tenantId = activeTenant?.id;
      if (!tenantId) {
        const { tenant, error: createError } = await createTenantOnboarding(companyName, workspaceSlug);
        if (createError) {
          setError(createError);
          setLoading(false);
          return;
        }
        tenantId = tenant?.id;
      }

      if (tenantId) {
        // 2. Insert primary warehouse
        await supabase.from('warehouses').insert({
          tenant_id: tenantId,
          name: warehouseName,
          code: warehouseCode,
          address: warehouseAddress,
          city: warehouseCity,
          is_active: true
        });

        // 3. Insert sample products if requested
        if (loadSampleCatalog) {
          await supabase.from('products').insert([
            {
              tenant_id: tenantId,
              sku: 'NEXUS-WATER-PRO',
              name: 'Tai nghe Bluetooth ANC Chống Ồn Nexus Pro',
              price: 1250000,
              cost_price: 650000,
              stock: 100,
              reorder_level: 15,
              safety_stock: 10
            },
            {
              tenant_id: tenantId,
              sku: 'NEXUS-TITAN-1L',
              name: 'Bình Giữ Nhiệt Thép Không Gỉ Titan 1000ml',
              price: 390000,
              cost_price: 180000,
              stock: 250,
              reorder_level: 30,
              safety_stock: 20
            }
          ]);
        }
      }

      sessionStorage.removeItem('nexus_pending_org');
      setLoading(false);
      onComplete();
    } catch (err: unknown) {
      setError((err as Error).message || 'Có lỗi xảy ra khi hoàn tất');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[#1E647F]/40 bg-[#0C2739] py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/')}
              className="p-1.5 rounded-lg bg-[#081B2C] text-gray-400 hover:text-white mr-1 border border-gray-800"
              title="Về trang chủ"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center text-white font-bold">
            N
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Khởi Tạo Không Gian Doanh Nghiệp (Onboarding)</h1>
            <p className="text-[11px] text-gray-400">Thiết lập cấu hình vận hành chuẩn hóa cho tổ chức của bạn</p>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all ${
                step === i
                  ? 'bg-wood-aqua text-white shadow-md shadow-wood-aqua/30'
                  : step > i
                  ? 'bg-[#1E647F] text-white'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {step > i ? <Check size={13} /> : i}
            </div>
          ))}
        </div>
      </header>

      {/* Main Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-10 w-full flex-1 flex flex-col justify-center">
        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-950/60 border border-rose-800 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* STEP 1: ORGANIZATION */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="p-3 rounded-2xl bg-[#1E647F]/30 text-wood-aqua">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 1: Thông Tin Doanh Nghiệp</h2>
                  <p className="text-xs text-gray-400">Tên tổ chức và định danh không gian làm việc của bạn</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Tên công ty / Tổ chức *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Mã định danh URL (Slug)</label>
                  <div className="flex items-center">
                    <span className="bg-[#123A52] text-gray-400 px-3 py-2.5 rounded-l-xl text-xs border border-r-0 border-[#1E647F]/50">
                      nexusoms.vn/app/
                    </span>
                    <input
                      type="text"
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value)}
                      className="w-full rounded-r-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Ngành hàng chính</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-wood-aqua"
                    >
                      <option value="fashion">Thời trang & Phụ kiện</option>
                      <option value="cosmetics">Mỹ phẩm & Chăm sóc sắc đẹp</option>
                      <option value="electronics">Điện tử & Gia dụng</option>
                      <option value="food">Thực phẩm & Đồ uống (F&B)</option>
                      <option value="general">Bán lẻ Đa ngành hàng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Quy mô nhân sự</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-wood-aqua"
                    >
                      <option value="1-10">1 - 10 nhân sự</option>
                      <option value="10-50">10 - 50 nhân sự</option>
                      <option value="50-200">50 - 200 nhân sự</option>
                      <option value="over-200">&gt; 200 nhân sự</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: WAREHOUSE */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="p-3 rounded-2xl bg-[#1E647F]/30 text-wood-aqua">
                  <Warehouse size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 2: Kho Hàng Đầu Tiên</h2>
                  <p className="text-xs text-gray-400">Kho chính lưu trữ và xuất hàng hóa của doanh nghiệp</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Tên kho *</label>
                    <input
                      type="text"
                      value={warehouseName}
                      onChange={(e) => setWarehouseName(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Mã kho (Code) *</label>
                    <input
                      type="text"
                      value={warehouseCode}
                      onChange={(e) => setWarehouseCode(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Tỉnh / Thành phố *</label>
                    <input
                      type="text"
                      value={warehouseCity}
                      onChange={(e) => setWarehouseCity(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Địa chỉ chi tiết</label>
                    <input
                      type="text"
                      value={warehouseAddress}
                      onChange={(e) => setWarehouseAddress(e.target.value)}
                      className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SALES CHANNELS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="p-3 rounded-2xl bg-[#1E647F]/30 text-wood-aqua">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 3: Kênh Bán Hàng Kết Nối</h2>
                  <p className="text-xs text-gray-400">Chọn các nền tảng thương mại bạn dự định đồng bộ</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'shopee', name: 'Shopee Mall / Shop', desc: 'Đồng bộ đơn & tồn kho thời gian thực' },
                  { id: 'tiktok', name: 'TikTok Shop VN', desc: 'Tự động in vận đơn & trừ tồn kho' },
                  { id: 'lazada', name: 'Lazada Open Platform', desc: 'Khóa tồn nguyên tử và đối soát' },
                  { id: 'pos', name: 'Cửa hàng Bán lẻ / Website', desc: 'Đồng bộ đơn hàng tại quầy POS' }
                ].map((ch) => {
                  const selected = selectedChannels.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selected
                          ? 'bg-[#123A52] border-wood-aqua shadow-md'
                          : 'bg-[#081B2C] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{ch.name}</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${selected ? 'bg-wood-aqua text-white' : 'border border-gray-600'}`}>
                          {selected && <Check size={12} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">{ch.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: PRODUCTS */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="p-3 rounded-2xl bg-[#1E647F]/30 text-wood-aqua">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 4: Danh Mục Sản Phẩm Ban Đầu</h2>
                  <p className="text-xs text-gray-400">Khởi tạo dữ liệu hàng hóa để kiểm thử quy trình vận hành</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#081B2C] border border-[#1E647F]/40 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loadSampleCatalog}
                    onChange={(e) => setLoadSampleCatalog(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-wood-aqua focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">Tự động nạp 2 SKU sản phẩm mẫu eCommerce</span>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Giúp bạn trải nghiệm ngay quy trình khóa tồn, gom nhặt hàng và hạch toán kế toán mà không mất thời gian nhập liệu thủ công.
                    </p>
                  </div>
                </label>

                {loadSampleCatalog && (
                  <div className="pt-3 border-t border-gray-800 space-y-2 text-xs text-metal-mist">
                    <div className="flex justify-between p-2 rounded bg-[#0C2739]">
                      <span>NEXUS-WATER-PRO (Tai nghe ANC)</span>
                      <span className="text-emerald-400 font-bold">100 cái (Tồn kho)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#0C2739]">
                      <span>NEXUS-TITAN-1L (Bình giữ nhiệt Titan)</span>
                      <span className="text-emerald-400 font-bold">250 cái (Tồn kho)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: TEAM INVITES */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="p-3 rounded-2xl bg-[#1E647F]/30 text-wood-aqua">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 5: Mời Đồng Đội Vào Tổ Chức</h2>
                  <p className="text-xs text-gray-400">Phân quyền vai trò rõ ràng theo từng phòng ban</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email.nhanvien@company.vn"
                  className="flex-1 rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'warehouse' | 'manager')}
                  className="rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="warehouse">Kho (Warehouse)</option>
                  <option value="manager">Quản lý (Manager)</option>
                  <option value="admin">Quản trị (Admin)</option>
                </select>
                <button
                  type="button"
                  onClick={addInvite}
                  className="px-4 py-2.5 rounded-xl bg-[#1E647F] hover:bg-[#2D82B7] text-white text-xs font-bold"
                >
                  Thêm
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Danh sách thành viên chờ mời:</div>
                {invitedList.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#081B2C] border border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{m.email}</span>
                    <span className="px-2 py-0.5 rounded bg-[#123A52] text-wood-aqua font-semibold text-[11px]">
                      Vai trò: {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: SUMMARY & ACTIVATE */}
          {step === 6 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#27B4A0]/20">
                <Sparkles size={32} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Sẵn Sàng Vận Hành!</h2>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  Tất cả các cấu hình ban đầu cho <strong>{companyName}</strong> đã hoàn tất. Bạn có thể thay đổi bất kỳ lúc nào tại mục Cài đặt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800 text-left text-xs space-y-2.5 text-gray-300">
                <div className="flex justify-between">
                  <span>Kho hàng khởi tạo:</span>
                  <span className="text-white font-bold">{warehouseName} ({warehouseCode})</span>
                </div>
                <div className="flex justify-between">
                  <span>Kênh bán hàng kết nối:</span>
                  <span className="text-wood-aqua font-bold">{selectedChannels.join(', ').toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Danh mục sản phẩm:</span>
                  <span className="text-emerald-400 font-bold">{loadSampleCatalog ? '2 SKU mẫu sẵn sàng' : 'Chưa tạo'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Đồng đội tham gia:</span>
                  <span className="text-white font-bold">{invitedList.length} thành viên</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-8 mt-6 border-t border-gray-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E647F] hover:bg-[#2D82B7] flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Tiếp tục</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={loading}
                className="px-8 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] flex items-center gap-2 shadow-xl shadow-[#27B4A0]/30 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Đang kích hoạt...' : 'Kích Hoạt & Vào Bàn Làm Việc OMS'}</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
