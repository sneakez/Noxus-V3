import { Layers, ShieldCheck, GitFork, Check } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface FeaturePageProps {
  onNavigate: (path: string) => void;
}

export function OrdersFeaturePage({ onNavigate }: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/features/orders" onNavigate={onNavigate} />

      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Layers size={14} />
            <span>ORDER MANAGEMENT SYSTEM (OMS)</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Trung Tâm Xử Lý Đơn Hàng Đa Kênh Tốc Độ Cao
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Hợp nhất đơn hàng từ Shopee, TikTok Shop, Lazada, Haravan và POS. Xử lý đồng thời hàng nghìn đơn/phút với độ tin cậy chuẩn ngân hàng.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider mb-2">
                <ShieldCheck size={16} /> Chống trùng lặp tuyệt đối
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Idempotency Key & Deduplication Engine</h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Khi các sàn TMĐT kích hoạt cơ chế retry webhook hoặc người dùng bấm đặt hàng 2 lần liên tiếp, hệ thống dựa vào Idempotency Key duy nhất để nhận diện và trả về kết quả ban đầu ngay lập tức, triệt tiêu 100% tình trạng trừ trùng tồn kho hay sinh 2 đơn trùng nhau.
              </p>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Unique constraint `(tenant_id, idempotency_key)`</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Tự động khóa token chống race condition</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Bảo toàn lịch sử audit log minh bạch</div>
              </div>
            </div>
            <div className="bg-[#0C2739] border border-[#1E647F]/40 p-6 rounded-2xl shadow-xl font-mono text-xs text-metal-mist">
              <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// PostgreSQL Idempotency Constraint</div>
              <div className="text-gray-400 mt-3">CREATE UNIQUE INDEX orders_tenant_idempotency_idx</div>
              <div className="text-gray-400">ON orders (tenant_id, idempotency_key)</div>
              <div className="text-gray-400">WHERE idempotency_key IS NOT NULL;</div>
              <div className="mt-4 p-3 rounded bg-black/40 text-emerald-400 text-[11px]">
                ✓ Request 1: 201 Created (ORD-8821)<br />
                ✓ Request 2 (Duplicate): 200 OK (Trả về lại ORD-8821, không trừ tồn kho lặp)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 bg-[#0C2739] border border-[#1E647F]/40 p-6 rounded-2xl shadow-xl font-mono text-xs text-metal-mist">
              <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// Smart Warehouse Routing Matrix</div>
              <div className="text-gray-300 mt-3">1. Khách hàng: Quận 1, TP. Hồ Chí Minh</div>
              <div className="text-emerald-400">→ Định tuyến: Kho Tân Bình (Khoảng cách: 4.2 km)</div>
              <div className="text-gray-300 mt-2">2. Kiểm tra tồn: Đủ 3 SKU sản phẩm</div>
              <div className="text-wood-aqua">→ Tự động gộp kiện duy nhất, tiết kiệm 35.000 ₫ phí ship</div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider mb-2">
                <GitFork size={16} /> Tối ưu chi phí vận chuyển
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Định Tuyến Kho & Phân Luồng Thông Minh</h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Hệ thống tự động phân tích địa chỉ nhận hàng, số lượng tồn kho từng chi nhánh và năng lực đóng gói để chỉ định kho xuất hàng tối ưu nhất, rút ngắn thời gian giao hàng và giảm chi phí vận chuyển.
              </p>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Tự động tách đơn nếu không kho nào có đủ toàn bộ hàng</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Tự động gộp đơn cùng người nhận và cùng ngày đặt</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Cảnh báo rủi ro bùng hàng (Blacklist khách hàng)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#05121E] border-t border-[#1E647F]/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-white mb-4">Trải Nghiệm Tính Năng Quản Lý Đơn Hàng Ngay</h3>
          <p className="text-sm text-gray-400 mb-6">Đăng ký để dùng thử miễn phí hoặc mở bản demo tương tác trong 30 giây.</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => onNavigate('/register')} className="btn-aqua">Đăng Ký Miễn Phí</button>
            <button onClick={() => onNavigate('/demo')} className="btn-secondary">Thử Bản Demo</button>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
