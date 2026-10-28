import { useState } from 'react';
import { 
  ArrowRight, 
  Zap, 
  Layers, 
  Package, 
  Truck, 
  Calculator, 
  ChevronDown,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  // Ecomflow-style Time Period Selector for Hero Dashboard Preview
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Ecomflow-style Feature Tab Selector
  const [activeFeatureTab, setActiveFeatureTab] = useState<'oms' | 'inventory2' | 'fulfillment' | 'finance'>('inventory2');

  // Interactive ROI Calculator Slider
  const [dailyOrders, setDailyOrders] = useState<number>(1500);

  // Interactive Live Inventory & Flash Sale Simulator state
  const [simStock, setSimStock] = useState({
    sku: 'NEXUS-AIR-PRO',
    name: 'Tai nghe Bluetooth ANC Nexus Pro',
    physical: 100,
    reserved: 35,
    available: 65,
    runwayDays: 14,
    status: 'Healthy' as 'Healthy' | 'Warning' | 'Critical'
  });
  const [simLog, setSimLog] = useState<string>('PostgreSQL Atomic Lock sẵn sàng. Tồn Available: 65 cái (14 ngày bán)');
  const [simRunning, setSimRunning] = useState(false);

  // FAQ Accordion
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Hero KPI dynamic data based on Time Range
  const kpiData = {
    '7d': { avgOrders: '1,280', fulfillmentRate: '99.92%', availableStock: '14,250', inbounds: '1,200', trend: '+8.4%' },
    '30d': { avgOrders: '1,540', fulfillmentRate: '99.85%', availableStock: '13,800', inbounds: '4,500', trend: '+14.6%' },
    '90d': { avgOrders: '1,720', fulfillmentRate: '99.88%', availableStock: '15,600', inbounds: '12,000', trend: '+22.1%' }
  }[timeRange];

  const handleSimulateFlashSale = () => {
    setSimRunning(true);
    setSimLog('🚀 Đang mô phỏng đợt Flash Sale: 20 đơn dồn về trong 500ms...');
    setTimeout(() => {
      setSimStock(prev => {
        const newAvailable = Math.max(0, prev.available - 20);
        const newReserved = prev.reserved + (prev.available >= 20 ? 20 : prev.available);
        const newRunway = Math.max(1, Math.round(newAvailable / 4.5));
        const newStatus = newAvailable <= 10 ? 'Critical' : newAvailable <= 30 ? 'Warning' : 'Healthy';
        return {
          ...prev,
          reserved: newReserved,
          available: newAvailable,
          runwayDays: newRunway,
          status: newStatus
        };
      });
      setSimLog('✓ Đã khóa 20 đơn thành công qua RPC place_order_atomic. Zero bán âm, Stock Ledger ghi nhận!');
      setSimRunning(false);
    }, 600);
  };

  const handleResetSim = () => {
    setSimStock({
      sku: 'NEXUS-AIR-PRO',
      name: 'Tai nghe Bluetooth ANC Nexus Pro',
      physical: 100,
      reserved: 35,
      available: 65,
      runwayDays: 14,
      status: 'Healthy'
    });
    setSimLog('Đã khôi phục trạng thái kho ban đầu.');
  };

  // ROI Calculations based on daily orders
  const savedHoursPerMonth = Math.round((dailyOrders * 0.04) * 30);
  const savedOversellingLoss = Math.round((dailyOrders * 0.015 * 85000) * 30).toLocaleString('vi-VN');
  const speedMultiplier = '4.8x';

  const faqs = [
    {
      q: 'NexusOMS khác gì so với phần mềm bán hàng thông thường?',
      a: 'Khác biệt lớn nhất nằm ở kiến trúc lõi: NexusOMS được xây dựng trên nền tảng PostgreSQL ACID với cơ chế Khóa tồn nguyên tử (Atomic Stock Reservation). Khi có sự kiện Flash Sale hoặc nhiều sàn cùng đổ đơn, hệ thống khóa hàng ở tầng cơ sở dữ liệu (< 15ms), ngăn chặn 100% tình trạng bán âm và không bao giờ sinh đơn trùng lặp.'
    },
    {
      q: 'Tính năng "Inventory 2.0 & Stock Runway" hoạt động như thế nào?',
      a: 'Lấy cảm hứng từ các nền tảng logistics hiện đại như Ecomflow, Inventory 2.0 tính toán trực tiếp "Runway" (số ngày bán còn lại) của từng SKU dựa trên vận tốc bán thực tế (Sales Velocity) và thời gian nhà cung cấp giao hàng (Lead Time), tự động phân loại tình trạng hàng theo Healthy, Warning và Critical để kịp thời bổ sung hàng.'
    },
    {
      q: 'Hệ thống kế toán sổ kép (Double-Entry Bookkeeping) mang lại lợi ích gì?',
      a: 'Mỗi giao dịch bán hàng, phí sàn TMĐT hay nhập kho đều tự động sinh bút toán kép chuẩn mực kế toán (Debit = Credit). Nếu hai bên Nợ và Có chênh lệch dù chỉ 1 đồng, PostgreSQL sẽ tự động hủy giao dịch, đảm bảo báo cáo tài chính luôn khớp tuyệt đối khi đối soát thuế.'
    },
    {
      q: 'Tôi có thể thử nghiệm trước mà không ảnh hưởng dữ liệu thật không?',
      a: 'Có. NexusOMS cung cấp Bản Demo Sandbox tương tác hoạt động hoàn toàn trên bộ nhớ (In-memory simulator). Bạn có thể bấm tạo đơn, thử nghiệm khóa tồn và giả lập tấn công Flash Sale an toàn tuyệt đối.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans selection:bg-[#27B4A0] selection:text-white">
      <PublicHeader currentPath="/" onNavigate={onNavigate} />

      {/* 1. HERO SECTION (ECOMFLOW AESTHETIC) */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Subtle Ambient Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-gradient-to-tr from-[#1E647F]/25 via-[#27B4A0]/20 to-transparent rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Announcement Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#123A52]/90 border border-[#1E647F]/70 text-xs text-wood-aqua mb-6 shadow-sm hover:border-wood-aqua transition-colors cursor-pointer" onClick={() => onNavigate('/demo')}>
              <Sparkles size={14} className="text-wood-aqua" />
              <span className="font-semibold tracking-wide">GIỚI THIỆU DASHBOARD V2 & INVENTORY 2.0</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300 font-normal">Trải nghiệm ngay</span>
              <ArrowRight size={12} className="text-wood-aqua" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-6">
              Vận Hành Kho & Đơn Hàng Đa Kênh <br className="hidden sm:inline" />
              Chuẩn <span className="text-transparent bg-clip-text bg-gradient-to-r from-wood-aqua via-[#2D82B7] to-emerald-400">E-Commerce Thế Hệ Mới</span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Giữ tồn kho chuẩn xác đa kho phân tán, xử lý đơn hàng Shopee, TikTok Shop, Lazada tức thời, 
              và kiểm soát toàn bộ dòng tiền với hạch toán kế toán sổ kép trong một nền tảng duy nhất.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <button
                onClick={() => onNavigate('/register')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-xl shadow-[#27B4A0]/25 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Bắt Đầu Miễn Phí (14 Ngày)</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('/demo')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm text-metal-mist bg-[#123A52]/80 hover:bg-[#123A52] border border-[#1E647F]/60 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Play size={15} className="text-wood-aqua fill-wood-aqua" />
                <span>Trải Nghiệm Bản Demo Trực Tiếp</span>
              </button>
            </div>

            {/* Live Trust Metrics Bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-gray-400 pb-12 border-b border-gray-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-wood-aqua" />
                <span>PostgreSQL ACID Stock Lock</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>100% Cân Đối Sổ Kép</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-cyan-400" />
                <span>Độ trễ &lt; 15ms</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span>SLA Uptime 99.99%</span>
              </div>
            </div>
          </div>

          {/* 2. SIGNATURE HERO DASHBOARD V2 & INVENTORY 2.0 PREVIEW (ECOMFLOW STYLE) */}
          <div className="mt-12 max-w-5xl mx-auto rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 shadow-2xl p-6 lg:p-8 relative">
            {/* Top Bar of the Mockup */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center text-white font-bold">
                  N
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Xin chào, Nexus Flagship Store</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-xs text-gray-400">Trung tâm điều hành kho vận & bán hàng đa kênh</div>
                </div>
              </div>

              {/* Time Range Selector (7d, 30d, 90d) */}
              <div className="flex items-center p-1 rounded-xl bg-[#081B2C] border border-[#1E647F]/50 text-xs">
                {(['7d', '30d', '90d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      timeRange === r ? 'bg-[#1E647F] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Đơn TB / ngày</div>
                <div className="text-2xl font-extrabold text-white">{kpiData.avgOrders}</div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> {kpiData.trend} chu kỳ này
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Tỷ lệ đúng hạn SLA</div>
                <div className="text-2xl font-extrabold text-emerald-400">{kpiData.fulfillmentRate}</div>
                <div className="text-[11px] text-gray-400 mt-1">Đóng gói & bàn giao</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Tồn khả dụng (Available)</div>
                <div className="text-2xl font-extrabold text-cyan-400">{kpiData.availableStock}</div>
                <div className="text-[11px] text-gray-400 mt-1">Sẵn sàng bán đa sàn</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Hàng sắp về (Inbound)</div>
                <div className="text-2xl font-extrabold text-amber-400">{kpiData.inbounds}</div>
                <div className="text-[11px] text-gray-400 mt-1">Đang vận chuyển từ NCC</div>
              </div>
            </div>

            {/* Inventory 2.0 Live Stock Runway & Health Section */}
            <div className="bg-[#081B2C] border border-gray-800 rounded-2xl p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Inventory 2.0 — Dự Báo Hết Hàng & Runway Tồn Kho</span>
                    <span className="text-[10px] bg-wood-aqua/20 text-wood-aqua px-2 py-0.5 rounded-full border border-wood-aqua/30 font-semibold">
                      Tự động tính theo Sales Velocity
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateFlashSale}
                    disabled={simRunning || simStock.available <= 0}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E647F] hover:bg-[#2D82B7] text-white flex items-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Zap size={13} />
                    <span>Giả Lập Flash Sale (-20 Tồn)</span>
                  </button>
                  <button
                    onClick={handleResetSim}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-gray-800/80"
                    title="Đặt lại"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Product Runway Table Row */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400 border-b border-gray-800/80">
                    <tr>
                      <th className="pb-2.5">Sản phẩm & SKU</th>
                      <th className="pb-2.5 text-center">Physical (Vật lý)</th>
                      <th className="pb-2.5 text-center">Reserved (Đã giữ)</th>
                      <th className="pb-2.5 text-center">Available (Bán được)</th>
                      <th className="pb-2.5 text-center">Runway (Số ngày bán)</th>
                      <th className="pb-2.5 text-center">Trạng thái tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    <tr className="text-gray-200">
                      <td className="py-3">
                        <div className="font-bold text-white">{simStock.name}</div>
                        <code className="text-[11px] text-gray-400 font-mono">{simStock.sku}</code>
                      </td>
                      <td className="py-3 text-center font-bold">{simStock.physical}</td>
                      <td className="py-3 text-center font-bold text-amber-400">{simStock.reserved}</td>
                      <td className="py-3 text-center font-bold text-emerald-400 text-sm">
                        {simStock.available}
                      </td>
                      <td className="py-3 text-center">
                        <span className="font-bold text-cyan-300">{simStock.runwayDays} ngày</span>
                        <div className="text-[10px] text-gray-400">Dựa trên 4.5 cái/ngày</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          simStock.status === 'Healthy'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
                            : simStock.status === 'Warning'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
                        }`}>
                          {simStock.status === 'Healthy' ? '✓ Khỏe mạnh' : simStock.status === 'Warning' ? '⚠️ Sắp hết hàng' : '🚨 Cần nhập gấp'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Console log feedback */}
              <div className="mt-4 p-3 rounded-xl bg-black/60 border border-gray-900 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                <span>{simLog}</span>
                <span className="text-gray-500 text-[10px]">PostgreSQL ACID</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => onNavigate('/demo')}
                className="text-xs font-semibold text-wood-aqua hover:underline inline-flex items-center gap-1"
              >
                Mở Bản Demo Đầy Đủ Với Dữ Liệu Mô Phỏng Toàn Diện <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE PLATFORM PILLARS (TABS LIKE ECOMFLOW) */}
      <section className="py-20 bg-[#05121E] border-y border-[#1E647F]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">Kiến trúc sản phẩm</h2>
            <p className="text-3xl font-extrabold text-white">4 Trụ Cột Nền Tảng Của NexusOMS V5</p>
            <p className="text-sm text-gray-400 mt-2">Được thiết kế để giải quyết dứt điểm các điểm nghẽn trong vận hành thương mại điện tử.</p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {[
              { id: 'oms', label: '1. Đơn Hàng Đa Kênh (OMS)', icon: Layers },
              { id: 'inventory2', label: '2. Tồn Kho Thông Minh (Inventory 2.0)', icon: Package },
              { id: 'fulfillment', label: '3. Wave Picking & SLA', icon: Truck },
              { id: 'finance', label: '4. Sổ Kép & Circuit Breaker', icon: Calculator }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as typeof activeFeatureTab)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white shadow-lg shadow-[#27B4A0]/20' 
                      : 'bg-[#0C2739] text-gray-400 hover:text-white border border-[#1E647F]/30'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="max-w-5xl mx-auto bg-[#081B2C] border border-[#1E647F]/50 rounded-3xl p-8 lg:p-10 shadow-2xl">
            {activeFeatureTab === 'oms' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider">
                    <Layers size={16} /> Omnichannel Order Management
                  </div>
                  <h3 className="text-2xl font-bold text-white">Đồng Bộ Đa Sàn Không Độ Trễ & Kháng Trùng Lặp</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Tập trung toàn bộ đơn từ Shopee, TikTok Shop, Lazada, Website và POS vào một nơi. 
                    Mỗi đơn hàng được gán Idempotency Key duy nhất tại tầng cơ sở dữ liệu, loại bỏ hoàn toàn rủi ro nhân bản đơn do sàn gửi webhook trùng lặp.
                  </p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Tự động gom đơn cùng khách hàng, cùng địa chỉ nhận</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Định tuyến kho thông minh ưu tiên kho gần khách nhất</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Hủy đơn an toàn với cơ chế hoàn tồn một lần duy nhất</li>
                  </ul>
                  <button onClick={() => onNavigate('/features/orders')} className="pt-2 text-xs font-bold text-wood-aqua hover:underline inline-flex items-center gap-1">
                    Xem chi tiết tính năng OMS <ArrowRight size={13} />
                  </button>
                </div>
                <div className="bg-[#0C2739] p-6 rounded-2xl border border-gray-800 font-mono text-xs text-gray-300 space-y-2">
                  <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// Idempotency Constraint</div>
                  <div>Request: POST /webhook/tiktok/order_created</div>
                  <div>Payload: {`{ id: "ORD-9821", idempotency_key: "TT_9821" }`}</div>
                  <div className="text-emerald-400 mt-2">✓ DB Unique Check: Validated</div>
                  <div className="text-emerald-400">✓ Atomic Stock Locked: 2x SKU-WATER-PRO</div>
                  <div className="text-gray-500 pt-2 border-t border-gray-800">Retry payload gửi lại: Trả 200 OK (Không trừ trùng tồn)</div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'inventory2' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider">
                    <Package size={16} /> Smart Inventory 2.0
                  </div>
                  <h3 className="text-2xl font-bold text-white">Kiểm Soát 5 Trạng Thái & Dự Báo Runway Bán Hàng</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Phân định rạch ròi giữa hàng vật lý trong kệ (Physical), hàng đã khóa cho đơn (Reserved), và hàng có thể bán (Available). 
                    Tự động tính toán số ngày tồn kho còn lại (Stock Runway) giúp bạn chủ động nhập hàng trước khi đứt gãy nguồn cung.
                  </p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> PostgreSQL CHECK constraint không bao giờ để stock âm</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Quản lý theo số lô FEFO, cận hạn sử dụng và Serial/IMEI</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Sổ giao dịch Stock Ledger bất biến với mã hash SHA-256</li>
                  </ul>
                  <button onClick={() => onNavigate('/features/inventory')} className="pt-2 text-xs font-bold text-wood-aqua hover:underline inline-flex items-center gap-1">
                    Xem chi tiết tính năng Kho <ArrowRight size={13} />
                  </button>
                </div>
                <div className="bg-[#0C2739] p-6 rounded-2xl border border-gray-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                    <span className="text-gray-400">Công thức tồn kho chuẩn:</span>
                    <span className="text-emerald-400 font-bold font-mono">Available = Physical - Reserved</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#081B2C] border border-gray-800 flex justify-between">
                    <span>Physical (Kệ kho):</span>
                    <span className="font-bold text-white">100 cái</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#081B2C] border border-gray-800 flex justify-between">
                    <span>Reserved (Đang đóng gói):</span>
                    <span className="font-bold text-amber-400">35 cái</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#081B2C] border border-emerald-900/50 flex justify-between">
                    <span>Available (Đẩy lên sàn TMĐT):</span>
                    <span className="font-bold text-emerald-400">65 cái (An toàn)</span>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'fulfillment' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider">
                    <Truck size={16} /> Wave Picking & SLA Countdown
                  </div>
                  <h3 className="text-2xl font-bold text-white">Gom Sóng Nhặt Hàng & Quét Mã Chống Nhầm 100%</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Giảm 60% quãng đường di chuyển của nhân viên trong kho bằng thuật toán gom sóng (Wave Picking). 
                    Quy trình Scan-to-Pack bắt buộc quét mã vạch sản phẩm trước khi in tem vận chuyển, triệt tiêu sai sót đóng gói.
                  </p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Tự động phân bổ vị trí Bin (Aisle - Rack - Shelf - Bin)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Đồng hồ đếm ngược SLA bàn giao cho GHN, GHTK, SPX</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Tự động in phiếu giao và phiếu xuất kho hàng loạt</li>
                  </ul>
                  <button onClick={() => onNavigate('/features/fulfillment')} className="pt-2 text-xs font-bold text-wood-aqua hover:underline inline-flex items-center gap-1">
                    Xem chi tiết Fulfillment <ArrowRight size={13} />
                  </button>
                </div>
                <div className="bg-[#0C2739] p-6 rounded-2xl border border-gray-800 space-y-3 text-xs">
                  <div className="text-wood-aqua font-bold pb-2 border-b border-gray-800">Quy Trình Nhặt & Đóng Gói:</div>
                  <div className="p-3 rounded-lg bg-[#081B2C] border border-gray-800">
                    <div className="text-gray-400 font-semibold">1. Gom sóng (Wave #402)</div>
                    <div className="text-white">Gom 80 đơn có chứa cùng 3 SKU hot sale</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#081B2C] border border-gray-800">
                    <div className="text-gray-400 font-semibold">2. Quét mã vạch (Scan-to-Pack)</div>
                    <div className="text-emerald-400">Quét mã SKU-WATER-PRO: Khớp đơn hàng 100%</div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'finance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider">
                    <Calculator size={16} /> Balanced Double-Entry Bookkeeping
                  </div>
                  <h3 className="text-2xl font-bold text-white">Bút Toán Kép Tự Động & Ngắt Mạch Bảo Vệ Lợi Nhuận</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Hạch toán tự động từng đơn hàng với nguyên tắc chuẩn mực kế toán (Debit = Credit). 
                    Circuit Breaker tự động phát hiện và ngắt các đơn hàng bị âm biên lợi nhuận do cấu hình nhầm voucher khuyến mãi.
                  </p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Kiểm tra cân đối Nợ = Có ở cấp database trước khi lưu</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Đối soát chi tiết từng khoản phí sàn TMĐT và phí ship</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Xuất dữ liệu đồng bộ với phần mềm kế toán MISA, Bravo</li>
                  </ul>
                  <button onClick={() => onNavigate('/features/finance')} className="pt-2 text-xs font-bold text-wood-aqua hover:underline inline-flex items-center gap-1">
                    Xem chi tiết Sổ kép <ArrowRight size={13} />
                  </button>
                </div>
                <div className="bg-[#0C2739] p-6 rounded-2xl border border-gray-800 font-mono text-xs space-y-2">
                  <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// Double-Entry Posting</div>
                  <div className="text-emerald-400">NỢ TK 131 (Phải thu sàn): 1.150.000 ₫</div>
                  <div className="text-amber-400">NỢ TK 641 (Chi phí sàn): 100.000 ₫</div>
                  <div className="text-cyan-400">CÓ TK 511 (Doanh thu): 1.250.000 ₫</div>
                  <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-400">
                    Tổng Nợ = Tổng Có = 1.250.000 ₫ <span className="text-emerald-400 font-bold">[CÂN ĐỐI 100%]</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE ROI & RUNWAY CALCULATOR */}
      <section className="py-20 bg-[#081B2C]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 lg:p-12 rounded-3xl bg-[#0C2739] border border-[#1E647F]/50 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider mb-2">
                <Sliders size={16} /> Ước Tính Hiệu Quả Đầu Tư (ROI Calculator)
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Doanh Nghiệp Của Bạn Sẽ Tiết Kiệm Được Bao Nhiêu?</h2>
              <p className="text-xs text-gray-400 mt-2">Kéo thanh trượt bên dưới để chọn sản lượng đơn hàng trung bình mỗi ngày của shop bạn</p>
            </div>

            {/* Slider */}
            <div className="mb-10 max-w-xl mx-auto">
              <div className="flex justify-between text-xs font-bold text-gray-300 mb-2">
                <span>Quy mô đơn hàng:</span>
                <span className="text-wood-aqua text-sm font-mono">{dailyOrders.toLocaleString()} đơn/ngày</span>
              </div>
              <input
                type="range"
                min={200}
                max={10000}
                step={100}
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                className="w-full h-2 bg-[#081B2C] rounded-lg appearance-none cursor-pointer accent-[#27B4A0]"
              />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>200 đơn</span>
                <span>5,000 đơn</span>
                <span>10,000 đơn/ngày</span>
              </div>
            </div>

            {/* 3 Outcome Metric Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-5 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Giờ nhân sự kho tiết kiệm</div>
                <div className="text-3xl font-extrabold text-white">~{savedHoursPerMonth} giờ</div>
                <div className="text-[11px] text-gray-500 mt-1">mỗi tháng nhờ Wave Picking</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#081B2C] border border-emerald-900/40">
                <div className="text-xs text-emerald-300 mb-1">Thiệt hại bán âm tránh được</div>
                <div className="text-3xl font-extrabold text-emerald-400">~{savedOversellingLoss} ₫</div>
                <div className="text-[11px] text-emerald-500 mt-1">tiền bồi thường & phạt sàn TMĐT</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#081B2C] border border-cyan-900/40">
                <div className="text-xs text-cyan-300 mb-1">Tốc độ xử lý đơn hàng</div>
                <div className="text-3xl font-extrabold text-cyan-400">{speedMultiplier}</div>
                <div className="text-[11px] text-cyan-500 mt-1">nhanh hơn quy trình thủ công</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="py-20 bg-[#05121E] border-t border-[#1E647F]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">Giải đáp thắc mắc</h2>
            <p className="text-3xl font-extrabold text-white">Câu Hỏi Thường Gặp</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl bg-[#081B2C] border border-[#1E647F]/40 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-white hover:text-wood-aqua transition-colors"
                >
                  <span className="text-base">{faq.q}</span>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform duration-200 flex-shrink-0 ${activeFaq === idx ? 'rotate-180 text-wood-aqua' : 'text-gray-400'}`} 
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-gray-300 leading-relaxed border-t border-gray-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL ENTERPRISE CTA BANNER */}
      <section className="py-20 bg-gradient-to-b from-[#081B2C] to-[#05121E] border-t border-[#1E647F]/40 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Sẵn Sàng Nâng Tầm Vận Hành Doanh Nghiệp?
          </h2>
          <p className="text-base text-gray-300 max-w-2xl mx-auto mb-8">
            Trải nghiệm NexusOMS V5 ngay hôm nay. Khởi tạo không gian làm việc doanh nghiệp trong 2 phút hoặc thử nghiệm không rủi ro trên bản Demo Sandbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-xl shadow-[#27B4A0]/30 transition-all"
            >
              Bắt Đầu Miễn Phí Ngay
            </button>
            <button
              onClick={() => onNavigate('/demo')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm text-metal-mist bg-[#123A52]/70 hover:bg-[#123A52] border border-[#1E647F]/60 transition-all"
            >
              Mở Bản Demo Sandbox
            </button>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
