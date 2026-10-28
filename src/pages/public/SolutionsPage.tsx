import { Store, Building2, Warehouse, Truck, Check, ArrowRight, Zap } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface SolutionsPageProps {
  onNavigate: (path: string) => void;
}

export function SolutionsPage({ onNavigate }: SolutionsPageProps) {
  const solutions = [
    {
      icon: Store,
      badge: 'Thương Mại Điện Tử & D2C',
      title: 'Dành Cho Nhà Bán Hàng Đa Sàn Tốc Độ Cao',
      desc: 'Quản lý tập trung Shopee, TikTok Shop, Lazada, Tiki và Website Brand. Chống bán âm trong các chiến dịch Mega Sale và tự động đẩy tồn kho 5 trạng thái.',
      features: [
        'Đồng bộ tồn kho tức thì qua Webhook với độ trễ < 3 giây',
        'Tự động phân bổ tồn an toàn (Safety Stock Buffer)',
        'Gom đơn đa kênh in phiếu hàng loạt trong 1 thao tác',
        'Quản lý combo/bundle tự trừ tồn kho các SKU thành phần'
      ],
      cta: 'Khám phá giải pháp D2C'
    },
    {
      icon: Building2,
      badge: 'Chuỗi Bán Lẻ & Đa Chi Nhánh',
      title: 'Hợp Nhất Tồn Kho Online & Cửa Hàng Vật Lý (Omnichannel)',
      desc: 'Xóa bỏ khoảng cách giữa kho trung tâm và hệ thống cửa hàng. Điều chuyển hàng hóa minh bạch với quy trình duyệt phiếu 2 chiều.',
      features: [
        'Định tuyến đơn tự động đến cửa hàng gần người mua nhất',
        'Chuyển kho nội bộ (Inter-warehouse transfer) theo dõi in-transit',
        'Kiểm kê định kỳ không cần dừng hoạt động bán hàng',
        'Phân quyền chặt chẽ theo từng chi nhánh kho'
      ],
      cta: 'Khám phá giải pháp Chuỗi'
    },
    {
      icon: Warehouse,
      badge: 'Kho Tổng & Nhà Phân Phối B2B',
      title: 'Quản Lý Kho Chuyên Nghiệp Theo Số Lô & Hạn Sử Dụng',
      desc: 'Đáp ứng tiêu chuẩn khắt khe của ngành Thực phẩm, Mỹ phẩm, Dược phẩm và Điện tử với quản lý FEFO và Serial/IMEI chi tiết.',
      features: [
        'Tự động xuất hàng theo quy tắc cận hạn (FEFO/FIFO)',
        'Quản lý vị trí kệ/bin (Aisle - Rack - Shelf - Bin)',
        'Gom nhóm nhặt hàng Wave Picking và quét mã vạch chống nhầm',
        'Quản lý đơn vị tính linh hoạt: Thùng - Hộp - Cái'
      ],
      cta: 'Khám phá giải pháp B2B'
    },
    {
      icon: Truck,
      badge: 'Trung Tâm Fulfillment & 3PL',
      title: 'Dịch Vụ Kho Vận Cho Nhiều Đối Tác (Multi-Tenant)',
      desc: 'Vận hành kho cho hàng chục nhãn hàng đối tác trên cùng một hệ thống với dữ liệu và báo cáo tách biệt hoàn toàn.',
      features: [
        'Cách ly dữ liệu 100% bằng PostgreSQL Row-Level Security',
        'Tự động tính phí lưu kho và phí bốc dỡ theo ngày',
        'Cổng thông tin riêng cho đối tác tự tra cứu đơn và tồn',
        'Đối soát COD và chi phí giao vận chi tiết từng bưu kiện'
      ],
      cta: 'Khám phá giải pháp 3PL'
    }
  ];

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/solutions" onNavigate={onNavigate} />

      {/* Hero Banner */}
      <section className="py-20 relative overflow-hidden border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Zap size={14} />
            <span>GIẢI PHÁP ĐO NI ĐÓNG GIÀY TỪNG MÔ HÌNH</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Thiết Kế Cho Từng Giai Đoạn Phát Triển Của Doanh Nghiệp
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Từ nhà bán hàng triệu đơn TMĐT đến chuỗi bán lẻ đa điểm và trung tâm fulfillment phân tán.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {solutions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 p-8 hover:border-wood-aqua transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center">
                        <Icon size={24} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-wood-aqua bg-[#123A52] px-3 py-1 rounded-full border border-water-teal/40">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-6">{item.desc}</p>

                    <div className="space-y-3 pt-4 border-t border-gray-800">
                      {item.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                          <Check size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 mt-6">
                    <button
                      onClick={() => onNavigate('/register')}
                      className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <span>{item.cta}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
