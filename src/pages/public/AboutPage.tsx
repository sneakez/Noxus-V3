import { Boxes, ShieldCheck, HeartHandshake, Sparkles, Award } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/about" onNavigate={onNavigate} />

      {/* Hero */}
      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Sparkles size={14} />
            <span>SỨ MỆNH & TRIẾT LÝ PHÁT TRIỂN</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
            Kiến Tạo Nền Móng Vận Hành Vững Chắc Cho Thương Mại Số
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            NexusOMS được tạo ra để giải quyết nỗi đau lớn nhất của doanh nghiệp e-commerce: 
            sự phân mảnh dữ liệu, bán âm đơn hàng và sai lệch số sách kế toán khi mở rộng quy mô.
          </p>
        </div>
      </section>

      {/* Astrological & Architectural Philosophy */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#0C2739] border border-[#1E647F]/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#27B4A0]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center text-white">
                <Boxes size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Triết Lý Thiết Kế Tuyền Trung Thủy</h3>
                <p className="text-xs text-gray-400">Nước trong suối nguồn tinh khiết • Thủy nhị cục • Kim tương sinh</p>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
              <p>
                Trong phong thủy bản mệnh và kiến trúc phần mềm, dòng nước suối nguồn (<strong>Tuyền Trung Thủy</strong>) tượng trưng cho dòng chảy hàng hóa và đơn hàng: luôn thanh khiết, luân chuyển liên tục không bao giờ ngừng trệ hay tắc nghẽn.
              </p>
              <p>
                Kết hợp với yếu tố <strong>Kim (Tương sinh)</strong> biểu trưng cho kỷ luật, tính toán học chuẩn xác và sự bảo mật kiên cố của PostgreSQL ACID; cùng <strong>Mộc (Phát triển)</strong> đại diện cho sự sinh sôi của doanh thu và thịnh vượng của khách hàng khi đồng hành cùng NexusOMS.
              </p>
              <p>
                Chúng tôi không chấp nhận những giải pháp chắp vá hay "chữa cháy". Mỗi dòng mã nguồn, mỗi bảng cơ sở dữ liệu và từng quy trình khóa tồn nguyên tử đều được tôi luyện với chuẩn mực kỹ thuật cao nhất.
              </p>
            </div>

            {/* Core Values Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 pt-8 border-t border-gray-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-wood-aqua font-bold text-sm">
                  <ShieldCheck size={18} />
                  <span>Chính Xác Tuyệt Đối</span>
                </div>
                <p className="text-xs text-gray-400">
                  Bút toán kép cân đối từng đồng. Tồn kho Available khóa nguyên tử ở tầng database.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-wood-aqua font-bold text-sm">
                  <Award size={18} />
                  <span>Minh Bạch & Bất Biến</span>
                </div>
                <p className="text-xs text-gray-400">
                  Audit trail mã hóa SHA-256 không thể xóa hay sửa, bảo vệ nhà sáng lập và kiểm toán viên.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-wood-aqua font-bold text-sm">
                  <HeartHandshake size={18} />
                  <span>Đồng Hành Lâu Dài</span>
                </div>
                <p className="text-xs text-gray-400">
                  Hệ thống mở rộng linh hoạt theo từng bước tăng trưởng từ 100 đơn đến 100.000 đơn/ngày.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-16 bg-[#05121E] border-y border-[#1E647F]/30 text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-wood-aqua mb-6">Nền Tảng Công Nghệ Hiện Đại</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-sm font-semibold text-gray-300">
            <span className="flex items-center gap-2">⚡ React 18 & Vite</span>
            <span className="flex items-center gap-2">🛡️ TypeScript Strict Mode</span>
            <span className="flex items-center gap-2">🐘 PostgreSQL ACID Transactions</span>
            <span className="flex items-center gap-2">🔒 Row-Level Security Multi-Tenancy</span>
            <span className="flex items-center gap-2">🚀 Vitest Automated QA Suite</span>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
