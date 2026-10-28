import { Package, Cpu, Check } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface FeaturePageProps {
  onNavigate: (path: string) => void;
}

export function InventoryFeaturePage({ onNavigate }: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/features/inventory" onNavigate={onNavigate} />

      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Package size={14} />
            <span>WAREHOUSE MANAGEMENT SYSTEM (WMS)</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Quản Trị Kho 5 Trạng Thái & Khóa Tồn Nguyên Tử
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Không còn nỗi lo bán âm tồn kho. Kiểm soát chi tiết từng đơn vị hàng hóa theo vị trí kệ bin, số lô sản xuất FEFO và Serial/IMEI.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* 5-State breakdown */}
          <div className="p-8 rounded-3xl bg-[#0C2739] border border-[#1E647F]/40 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2 text-center">Mô Hình Tồn Kho 5 Trạng Thái Chuẩn Quốc Tế</h2>
            <p className="text-xs text-gray-400 text-center mb-8 max-w-xl mx-auto">
              Định nghĩa chính xác số lượng hàng hóa giúp bộ phận kinh doanh biết chắc chắn những gì có thể cam kết bán cho khách.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-center">
              <div className="p-4 rounded-xl bg-[#081B2C] border border-gray-800">
                <div className="text-xs font-semibold text-gray-400 mb-1">1. Physical</div>
                <div className="text-sm font-bold text-white">Tồn vật lý</div>
                <div className="text-[11px] text-gray-400 mt-2">Tổng số hàng thực tế đang nằm trong kho bãi</div>
              </div>
              <div className="p-4 rounded-xl bg-[#081B2C] border border-amber-900/50">
                <div className="text-xs font-semibold text-amber-300 mb-1">2. Reserved</div>
                <div className="text-sm font-bold text-amber-400">Đã khóa giữ chỗ</div>
                <div className="text-[11px] text-gray-400 mt-2">Hàng thuộc các đơn đã đặt, đang chờ nhặt/đóng gói</div>
              </div>
              <div className="p-4 rounded-xl bg-[#081B2C] border border-emerald-900/50">
                <div className="text-xs font-semibold text-emerald-300 mb-1">3. Available</div>
                <div className="text-sm font-bold text-emerald-400">Có thể bán</div>
                <div className="text-[11px] text-gray-400 mt-2">Physical trừ đi Reserved; số đẩy lên sàn TMĐT</div>
              </div>
              <div className="p-4 rounded-xl bg-[#081B2C] border border-rose-900/50">
                <div className="text-xs font-semibold text-rose-300 mb-1">4. Unavailable</div>
                <div className="text-sm font-bold text-rose-400">Không khả dụng</div>
                <div className="text-[11px] text-gray-400 mt-2">Hàng hỏng hóc, lỗi bao bì, hết hạn hoặc chờ tiêu hủy</div>
              </div>
              <div className="p-4 rounded-xl bg-[#081B2C] border border-cyan-900/50">
                <div className="text-xs font-semibold text-cyan-300 mb-1">5. Incoming</div>
                <div className="text-sm font-bold text-cyan-400">Hàng sắp về</div>
                <div className="text-[11px] text-gray-400 mt-2">Hàng thuộc Purchase Order đã duyệt, đang trên đường về</div>
              </div>
            </div>
          </div>

          {/* Atomic stock locking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider mb-2">
                <Cpu size={16} /> PostgreSQL Atomic Concurrency
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Khóa Tồn Nguyên Tử Trong Giao Dịch ACID</h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Khi 100 khách hàng cùng bấm mua 1 chiếc áo cuối cùng trong đợt Sale, NexusOMS sử dụng hàm RPC `place_order_atomic` với câu lệnh `SELECT FOR UPDATE` tuần tự hóa các yêu cầu ở cấp engine PostgreSQL. Khách hàng đầu tiên thành công, 99 khách còn lại nhận thông báo hết hàng tức thì mà không gây lỗi hoặc bán âm.
              </p>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Ràng buộc `products_stock_non_negative` ở tầng schema</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Tự động rollback 100% nếu bất kỳ bước nào thất bại</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Ghi nhận vào Stock Ledger bất biến có mã tham chiếu đơn</div>
              </div>
            </div>
            <div className="bg-[#0C2739] border border-[#1E647F]/40 p-6 rounded-2xl shadow-xl font-mono text-xs text-metal-mist">
              <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// Stock Ledger Append-Only Record</div>
              <div className="text-gray-400 mt-3">{`{`}</div>
              <div className="text-gray-300 ml-4">"ledger_id": "LED-99104",</div>
              <div className="text-gray-300 ml-4">"event": "ORDER_RESERVATION",</div>
              <div className="text-gray-300 ml-4">"sku": "IPHONE-15-PRO",</div>
              <div className="text-emerald-400 ml-4">"delta_reserved": +1,</div>
              <div className="text-rose-400 ml-4">"delta_available": -1,</div>
              <div className="text-gray-300 ml-4">"warehouse": "Kho Trung Tâm Q7",</div>
              <div className="text-gray-300 ml-4">"hash_sha256": "8a71b...d91c"</div>
              <div className="text-gray-400">{`}`}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#05121E] border-t border-[#1E647F]/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-white mb-4">Kiểm Soát Tồn Kho Của Bạn Ngay Hôm Nay</h3>
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
