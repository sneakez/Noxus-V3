import { useState } from 'react';
import { 
  ArrowRight, 
  Zap, 
  Layers, 
  Package, 
  Truck, 
  Calculator, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  // Interactive Simulation State in Hero/Sandbox
  const [demoStock, setDemoStock] = useState({ physical: 100, reserved: 20, available: 80 });
  const [demoOrders, setDemoOrders] = useState([
    { id: 'ORD-9021', channel: 'Shopee', sku: 'SKU-WATER-PRO', qty: 2, status: 'Đã khóa tồn', time: 'Vừa xong' },
    { id: 'ORD-9020', channel: 'TikTok', sku: 'SKU-WATER-LITE', qty: 1, status: 'Đang đóng gói', time: '2 phút trước' }
  ]);
  const [demoLogs, setDemoLogs] = useState<string[]>([
    'Hệ thống khởi chạy: PostgreSQL ACID Stock Lock sẵn sàng',
    'Bút toán kép tự động: Debit 131 = Credit 511 (Cân bằng 100%)'
  ]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Quick simulation triggers
  const handleSimulateOrder = () => {
    if (demoStock.available < 2) return;
    const newId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    setDemoStock(prev => ({
      ...prev,
      reserved: prev.reserved + 2,
      available: prev.available - 2
    }));
    setDemoOrders(prev => [
      { id: newId, channel: 'TikTok Shop', sku: 'SKU-WATER-PRO', qty: 2, status: 'Đã khóa tồn (Atomic)', time: 'Vừa xong' },
      ...prev.slice(0, 3)
    ]);
    setDemoLogs(prev => [
      `[${new Date().toLocaleTimeString()}] RPC place_order_atomic: Đã khóa 2 tồn SKU-WATER-PRO cho ${newId}`,
      ...prev.slice(0, 4)
    ]);
  };

  const handleSimulateCancel = () => {
    if (demoStock.reserved < 2) return;
    setDemoStock(prev => ({
      ...prev,
      reserved: prev.reserved - 2,
      available: prev.available + 2
    }));
    setDemoLogs(prev => [
      `[${new Date().toLocaleTimeString()}] RPC cancel_order_atomic: Hoàn 2 tồn về kho Available thành công`,
      ...prev.slice(0, 4)
    ]);
  };

  const faqs = [
    {
      q: 'Tại sao NexusOMS sử dụng kiến trúc Khóa tồn nguyên tử (Atomic Stock Lock) thay vì cập nhật thông thường?',
      a: 'Trong các sự kiện Flash Sale hoặc khi đồng bộ từ 3 sàn TMĐT cùng lúc, nếu cập nhật tồn kho bằng nhiều câu lệnh tách biệt (SELECT tồn rồi UPDATE), race condition sẽ khiến nhiều khách hàng cùng mua được 1 sản phẩm còn lại, dẫn đến bán âm (overselling) và bị phạt điểm vận hành sàn. NexusOMS sử dụng RPC PostgreSQL với lệnh "SELECT ... FOR UPDATE", khóa hàng ở tầng cơ sở dữ liệu trong chưa đầy 15ms, đảm bảo Available stock không bao giờ âm.'
    },
    {
      q: 'Bút toán kép (Double-Entry Bookkeeping) trong NexusOMS hoạt động như thế nào?',
      a: 'Mỗi khi một đơn hàng hoàn tất hoặc đơn nhập kho được duyệt, hệ thống tự động sinh bút toán kép chuẩn mực kế toán (Debit = Credit). Ví dụ: Nợ TK 131 (Phải thu sàn) và Có TK 511 (Doanh thu bán hàng). Nếu tổng Nợ khác tổng Có dù chỉ 1 đồng, PostgreSQL sẽ tự động rollback giao dịch, ngăn chặn hoàn toàn sai lệch số sách tài chính.'
    },
    {
      q: 'Tôi có thể quản lý nhiều chi nhánh kho và định tuyến đơn hàng tự động không?',
      a: 'Có. NexusOMS hỗ trợ mô hình Multi-Warehouse. Bạn có thể định nghĩa các quy tắc định tuyến tự động (Routing Rules): ưu tiên kho gần khách hàng nhất để giảm phí ship, hoặc kho có đủ toàn bộ sản phẩm để tránh tách đơn.'
    },
    {
      q: 'Dữ liệu giữa các khách thuê (Tenants) có bị lẫn vào nhau không?',
      a: 'Hoàn toàn không. NexusOMS áp dụng kiến trúc Multi-Tenant cấp cơ sở dữ liệu với PostgreSQL Row-Level Security (RLS). Mọi câu truy vấn bắt buộc phải có tenant_id và token xác thực, ngăn chặn 100% rủi ro truy cập chéo dữ liệu.'
    },
    {
      q: 'Làm thế nào để di chuyển dữ liệu từ hệ thống cũ sang NexusOMS?',
      a: 'NexusOMS cung cấp các công cụ nhập dữ liệu hàng loạt qua file Excel/CSV chuẩn hóa (Sản phẩm, Khách hàng, Tồn kho ban đầu, Nhà cung cấp). Ngoài ra, bộ phận kỹ sư hỗ trợ sẽ đồng hành cùng quý doanh nghiệp chuyển đổi dữ liệu không làm gián đoạn bán hàng.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/" onNavigate={onNavigate} />

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 lg:pt-28 lg:pb-36 overflow-hidden">
        {/* Astrological & Cosmic Water Lighting Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#1E647F]/30 via-[#27B4A0]/20 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-[#2D82B7]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#123A52]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#123A52]/80 border border-[#1E647F]/60 text-xs text-wood-aqua mb-6 shadow-sm">
              <Sparkles size={14} className="animate-spin text-wood-aqua" />
              <span className="font-semibold tracking-wide">THẾ HỆ OMS 5.0 • MỆNH TUYỀN TRUNG THỦY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
              Động Cơ Quản Lý Đơn Hàng & Kho Vận Đa Kênh Chuẩn <span className="text-transparent bg-clip-text bg-gradient-to-r from-wood-aqua via-water-cerulean to-emerald-400">ACID PostgreSQL</span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10">
              Chấm dứt hoàn toàn tình trạng bán âm tồn kho đa sàn. Đồng bộ thời gian thực Shopee, TikTok Shop, Lazada & POS. 
              Tự động hóa toàn diện từ Khóa tồn nguyên tử, Wave Picking đến Hạch toán sổ kế toán kép.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <button
                onClick={() => onNavigate('/register')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-xl shadow-[#27B4A0]/25 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Khởi Tạo Doanh Nghiệp Miễn Phí</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('/demo')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base text-metal-mist bg-[#123A52]/70 hover:bg-[#123A52] border border-[#1E647F]/60 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Zap size={18} className="text-wood-aqua" />
                <span>Trải Nghiệm Bản Demo Trực Tiếp</span>
              </button>
            </div>

            {/* Key Trust & Metric Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-gray-800">
              <div className="p-4 rounded-xl bg-[#0C2739]/60 border border-[#1E647F]/30 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-wood-aqua mb-1">&lt; 15 ms</div>
                <div className="text-xs text-gray-400 font-medium">Khóa Tồn Nguyên Tử (RPC)</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0C2739]/60 border border-[#1E647F]/30 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mb-1">100%</div>
                <div className="text-xs text-gray-400 font-medium">Cân Đối Bút Toán Sổ Kép</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0C2739]/60 border border-[#1E647F]/30 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mb-1">0</div>
                <div className="text-xs text-gray-400 font-medium">Bán Âm / Lỗi Trùng Đơn</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0C2739]/60 border border-[#1E647F]/30 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">99.99%</div>
                <div className="text-xs text-gray-400 font-medium">Uptime Khả Dụng Vận Hành</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE INTERACTIVE DEMO SANDBOX PREVIEW */}
      <section className="py-16 bg-[#05121E] border-y border-[#1E647F]/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">Trực quan hóa công nghệ độc quyền</h2>
            <p className="text-2xl sm:text-3xl font-bold text-white">Thử Nghiệm Cơ Chế Khóa Tồn Nguyên Tử Ngay Tại Đây</p>
            <p className="text-sm text-gray-400 mt-2">Bấm nút bên dưới để mô phỏng một đơn hàng sàn TMĐT đổ về và quan sát phản ứng tức thời của kho</p>
          </div>

          <div className="max-w-4xl mx-auto bg-[#081B2C] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-6 lg:p-8">
            {/* Top Interactive Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-sm font-semibold text-white">Trạng thái kho SKU-WATER-PRO (Sản phẩm mẫu):</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSimulateOrder}
                  disabled={demoStock.available < 2}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1E647F] text-white hover:bg-[#2D82B7] transition-all disabled:opacity-40"
                >
                  ⚡ Giả lập đơn mới (-2 Tồn)
                </button>
                <button
                  onClick={handleSimulateCancel}
                  disabled={demoStock.reserved < 2}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-900/60 text-rose-200 border border-rose-700/60 hover:bg-rose-900 transition-all disabled:opacity-40"
                >
                  ↩️ Giả lập hủy đơn (+2 Hoàn tồn)
                </button>
              </div>
            </div>

            {/* 3 Stock Gauges */}
            <div className="grid grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-[#0C2739] border border-gray-800 text-center">
                <div className="text-xs text-gray-400 mb-1">Physical (Vật lý)</div>
                <div className="text-2xl font-bold text-white">{demoStock.physical}</div>
                <div className="text-[10px] text-gray-500 mt-1">Tổng hàng trong kệ</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0C2739] border border-amber-900/40 text-center">
                <div className="text-xs text-amber-300 mb-1">Reserved (Đã giữ chỗ)</div>
                <div className="text-2xl font-bold text-amber-400">{demoStock.reserved}</div>
                <div className="text-[10px] text-amber-500 mt-1">Đơn đang chờ đóng gói</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0C2739] border border-emerald-900/40 text-center">
                <div className="text-xs text-emerald-300 mb-1">Available (Có thể bán)</div>
                <div className="text-2xl font-bold text-emerald-400">{demoStock.available}</div>
                <div className="text-[10px] text-emerald-500 mt-1">Đang hiển thị trên sàn</div>
              </div>
            </div>

            {/* Recent Orders in Simulation */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Đơn hàng vừa đồng bộ qua API:</div>
              <div className="space-y-2">
                {demoOrders.map((o) => (
                  <div key={o.id} className="p-3 rounded-lg bg-[#0C2739]/80 border border-gray-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-wood-aqua">{o.id}</span>
                      <span className="px-2 py-0.5 rounded bg-water-teal/30 text-white border border-water-teal/40">{o.channel}</span>
                      <span className="text-gray-400">SL: {o.qty} x {o.sku}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-semibold">{o.status}</span>
                      <span className="text-gray-500">{o.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Console log simulation */}
              <div className="p-3 rounded-lg bg-black/60 border border-gray-900 font-mono text-[11px] text-emerald-400 space-y-1">
                {demoLogs.map((l, idx) => (
                  <div key={idx} className="truncate">{l}</div>
                ))}
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => onNavigate('/demo')}
                className="text-xs text-wood-aqua hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Mở Môi Trường Thử Nghiệm Toàn Diện (Interactive Sandbox) <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PILLARS & ARCHITECTURE */}
      <section className="py-20 bg-[#081B2C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">Hạ Tầng Cấp Doanh Nghiệp</h2>
            <p className="text-3xl font-extrabold text-white">4 Trụ Cột Công Nghệ Tạo Nên Sự Khác Biệt</p>
            <p className="text-sm text-gray-400 mt-3">Được xây dựng dựa trên các tiêu chuẩn nghiêm ngặt nhất về hiệu năng, bảo mật và toàn vẹn dữ liệu.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 hover:border-wood-aqua transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Đơn Hàng Đa Kênh (OMS)</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Tập trung mọi đơn hàng từ Shopee, TikTok, Lazada, Haravan và POS vào một giao diện. Khử trùng đơn bằng Idempotency Key và tự động phân luồng.
              </p>
              <button onClick={() => onNavigate('/features/orders')} className="text-xs font-semibold text-wood-aqua inline-flex items-center gap-1 hover:underline">
                Xem chi tiết OMS <ArrowRight size={12} />
              </button>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 hover:border-wood-aqua transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Package size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Kho Vận 5 Trạng Thái (WMS)</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Phân định rạch ròi Physical, Reserved, Available, Unavailable và Incoming. Quản lý theo số lô FEFO, HSD và Serial/IMEI từng sản phẩm.
              </p>
              <button onClick={() => onNavigate('/features/inventory')} className="text-xs font-semibold text-wood-aqua inline-flex items-center gap-1 hover:underline">
                Xem chi tiết WMS <ArrowRight size={12} />
              </button>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 hover:border-wood-aqua transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Truck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Wave Picking & Đóng Gói</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Gom nhóm đơn thông minh (Wave Picking) tối ưu lộ trình nhặt hàng trong kho. Quy trình Scan-to-pack quét mã vạch chống đóng gói nhầm lẫn 100%.
              </p>
              <button onClick={() => onNavigate('/features/fulfillment')} className="text-xs font-semibold text-wood-aqua inline-flex items-center gap-1 hover:underline">
                Xem chi tiết Fulfillment <ArrowRight size={12} />
              </button>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 hover:border-wood-aqua transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Calculator size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sổ Kép & Đối Soát Sàn</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Hạch toán tự động từng giao dịch bán hàng, phí sàn, phí vận chuyển, công nợ. Circuit Breaker tự động cảnh báo và ngắt đơn khi biên lợi nhuận bị âm.
              </p>
              <button onClick={() => onNavigate('/features/finance')} className="text-xs font-semibold text-wood-aqua inline-flex items-center gap-1 hover:underline">
                Xem chi tiết Tài chính <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL COMPARISON */}
      <section className="py-20 bg-[#05121E] border-t border-[#1E647F]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">So sánh chuyên sâu</h2>
            <p className="text-3xl font-extrabold text-white">Tại Sao Doanh Nghiệp Chọn NexusOMS V5?</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#081B2C] rounded-2xl overflow-hidden border border-[#1E647F]/40">
              <thead>
                <tr className="border-b border-[#1E647F]/50 bg-[#0C2739]">
                  <th className="py-4 px-6 text-sm font-semibold text-white">Tiêu Chí Kỹ Thuật & Nghiệp Vụ</th>
                  <th className="py-4 px-6 text-sm font-bold text-wood-aqua bg-[#123A52]/80">NexusOMS Enterprise V5</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-400">Phần Mềm Bán Hàng Thông Thường</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-200">Cơ chế khóa tồn kho</td>
                  <td className="py-4 px-6 font-semibold text-emerald-400 bg-[#123A52]/40">
                    Atomic Transaction (RPC) với hàng đợi cấp DB, chặn bán âm 100%
                  </td>
                  <td className="py-4 px-6 text-gray-400">Cập nhật rời rạc (Race condition trong Flash Sale)</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-200">Đồng bộ Webhook từ sàn TMĐT</td>
                  <td className="py-4 px-6 font-semibold text-emerald-400 bg-[#123A52]/40">
                    Idempotency Key độc quyền, kháng trùng lặp đơn tuyệt đối
                  </td>
                  <td className="py-4 px-6 text-gray-400">Dễ bị ghi đè hoặc sinh 2 đơn trùng khi sàn retry</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-200">Hạch toán kế toán & Sổ cái</td>
                  <td className="py-4 px-6 font-semibold text-emerald-400 bg-[#123A52]/40">
                    Bút toán kép Debit = Credit tự động sinh, kiểm tra cân bằng 100%
                  </td>
                  <td className="py-4 px-6 text-gray-400">Chỉ có báo cáo doanh thu một chiều, khó đối soát thuế</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-200">Kiến trúc đa khách thuê (Multi-Tenancy)</td>
                  <td className="py-4 px-6 font-semibold text-emerald-400 bg-[#123A52]/40">
                    PostgreSQL Row-Level Security (RLS) cách ly tuyệt đối từng tenant
                  </td>
                  <td className="py-4 px-6 text-gray-400">Phụ thuộc logic WHERE tenant_id ở mã ứng dụng (dễ lọt bug)</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-200">Kiểm toán thay đổi (Audit Trail)</td>
                  <td className="py-4 px-6 font-semibold text-emerald-400 bg-[#123A52]/40">
                    Bất biến (Append-Only), thu hồi quyền DELETE/UPDATE, hash SHA-256
                  </td>
                  <td className="py-4 px-6 text-gray-400">Dữ liệu log có thể bị chỉnh sửa hoặc xóa bởi admin</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 bg-[#081B2C]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-2">Giải đáp thắc mắc</h2>
            <p className="text-3xl font-extrabold text-white">Câu Hỏi Thường Gặp Về NexusOMS</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-xl bg-[#0C2739] border border-[#1E647F]/40 overflow-hidden transition-all"
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

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-b from-[#081B2C] to-[#05121E] border-t border-[#1E647F]/40 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#27B4A0]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Sẵn Sàng Nâng Tầm Vận Hành Kho & Bán Hàng Đa Kênh?
          </h2>
          <p className="text-base text-gray-300 max-w-2xl mx-auto mb-8">
            Trải nghiệm hệ thống ngay hôm nay. Khởi tạo tổ chức chỉ trong 2 phút hoặc thử nghiệm không rủi ro trên bản Demo Sandbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-xl shadow-[#27B4A0]/30 transition-all"
            >
              Bắt Đầu Miễn Phí Ngay
            </button>
            <button
              onClick={() => onNavigate('/contact')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base text-metal-mist bg-[#123A52]/70 hover:bg-[#123A52] border border-[#1E647F]/60 transition-all"
            >
              Đặt Lịch Tư Vấn Kiến Trúc 1-1
            </button>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
