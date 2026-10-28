import { Truck, CheckSquare, Barcode, Clock } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface FeaturePageProps {
  onNavigate: (path: string) => void;
}

export function FulfillmentFeaturePage({ onNavigate }: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/features/fulfillment" onNavigate={onNavigate} />

      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Truck size={14} />
            <span>FULFILLMENT & WAREHOUSE PICKING</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Wave Picking & Đóng Gói Quét Mã Chuẩn Xác 100%
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Tối ưu hóa thời gian nhặt hàng của nhân viên kho bằng thuật toán gom sóng (Wave Picking) và giám sát thời hạn bàn giao sàn TMĐT (SLA Countdown).
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
              <div className="w-10 h-10 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-4">
                <CheckSquare size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Gom Sóng Wave Picking</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tự động gom 50 - 100 đơn có các mặt hàng tương đồng thành một lộ trình nhặt hàng duy nhất, giảm 60% quãng đường di chuyển của nhân viên trong kho.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
              <div className="w-10 h-10 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-4">
                <Barcode size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Scan-to-Pack Chống Nhầm</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Quét mã vạch từng sản phẩm trước khi dán tem vận chuyển. Hệ thống phát âm thanh cảnh báo tức thì nếu sản phẩm không đúng phân loại đơn.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
              <div className="w-10 h-10 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mb-4">
                <Clock size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Đồng Hồ Đếm Ngược SLA</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cảnh báo trực quan các đơn hàng sắp hết hạn bàn giao cho đơn vị vận chuyển (GHN, GHTK, Viettel Post, SPX), tránh phạt trễ hạn từ sàn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#05121E] border-t border-[#1E647F]/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-white mb-4">Tăng Tốc Đóng Gói Kho Ngay Hôm Nay</h3>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => onNavigate('/register')} className="btn-aqua">Đăng Ký Dùng Thử</button>
            <button onClick={() => onNavigate('/demo')} className="btn-secondary">Thử Bản Demo</button>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
