import { Calculator, ShieldAlert, FileText, Check } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface FeaturePageProps {
  onNavigate: (path: string) => void;
}

export function FinanceFeaturePage({ onNavigate }: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/features/finance" onNavigate={onNavigate} />

      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Calculator size={14} />
            <span>KẾ TOÁN SỔ KÉP & ĐỐI SOÁT TÀI CHÍNH</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Bút Toán Kép Tự Động & Circuit Breaker Biên Lợi Nhuận
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Hạch toán tự động từng đơn hàng với nguyên tắc chuẩn mực kế toán (Debit = Credit). 
            Đối soát chi tiết phí sàn, phí thanh toán, voucher và tự động ngắt đơn khi biên lợi nhuận bị âm.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-wood-aqua uppercase tracking-wider mb-2">
                <FileText size={16} /> Cân bằng toán học tuyệt đối
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Kế Toán Sổ Kép (Double-Entry Bookkeeping)</h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Mỗi khi giao dịch xuất kho hoặc nhận tiền từ sàn TMĐT diễn ra, PostgreSQL RPC `post_journal_entry_atomic` tự động kiểm tra tổng số tiền Nợ (Debit) và Có (Credit). Nếu hai bên không bằng nhau, giao dịch lập tức bị hủy bỏ, đảm bảo sổ sách tài chính luôn khớp 100% khi quyết toán thuế.
              </p>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Hệ thống tài khoản theo Thông tư 200 / 133</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Tự động tính giá vốn xuất kho theo bình quân gia quyền</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Xuất dữ liệu sẵn sàng nhập vào phần mềm kế toán (MISA, Bravo, SAP)</div>
              </div>
            </div>
            <div className="bg-[#0C2739] border border-[#1E647F]/40 p-6 rounded-2xl shadow-xl text-xs text-metal-mist">
              <div className="text-wood-aqua pb-2 border-b border-gray-800 font-bold">// Atomic Balanced Journal Entry</div>
              <div className="text-gray-300 mt-3 font-semibold">Đơn ORD-7729 (Shopee - 850.000 ₫)</div>
              <div className="mt-2 text-emerald-400">NỢ TK 131 (Phải thu Shopee): 790.000 ₫</div>
              <div className="text-amber-400">NỢ TK 641 (Chi phí sàn & Voucher): 60.000 ₫</div>
              <div className="text-cyan-400">CÓ TK 511 (Doanh thu bán hàng TMĐT): 850.000 ₫</div>
              <div className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-gray-400">
                Tổng Nợ: 850.000 ₫ == Tổng Có: 850.000 ₫ <span className="text-emerald-400 font-bold">[CÂN ĐỐI]</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 bg-[#0C2739] border border-rose-900/40 p-6 rounded-2xl shadow-xl font-mono text-xs text-rose-300">
              <div className="text-rose-400 pb-2 border-b border-rose-900/60 font-bold">⚠️ CIRCUIT BREAKER KÍCH HOẠT</div>
              <div className="mt-3 text-gray-300">SKU: TAI-NGHE-BLUETOOTH-X</div>
              <div className="text-gray-400">Giá bán áp dụng voucher: 120.000 ₫</div>
              <div className="text-gray-400">Giá vốn (COGS) + Phí sàn: 145.000 ₫</div>
              <div className="text-rose-400 font-bold mt-2">Biên lợi nhuận ròng: -25.000 ₫ (-20.8%)</div>
              <div className="text-wood-aqua mt-2">Hành động: Tự động giữ đơn chờ duyệt, chặn xuất kho bán lỗ!</div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                <ShieldAlert size={16} /> Bảo vệ dòng tiền
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Circuit Breaker Bảo Vệ Biên Lợi Nhuận</h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Khi nhân viên cấu hình nhầm voucher chồng chéo hoặc sàn TMĐT thu phí vượt quá tính toán, cơ chế tự động ngắt mạch (Circuit Breaker) lập tức chặn đơn hàng xuất kho, gửi thông báo cảnh báo tức thì cho ban giám đốc.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#05121E] border-t border-[#1E647F]/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-white mb-4">Minh Bạch Số Liệu Tài Chính Cùng NexusOMS</h3>
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
