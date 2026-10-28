import { useState } from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface PricingPageProps {
  onNavigate: (path: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    {
      name: 'Starter (Khởi Nghiệp)',
      badge: 'Dành cho Shop mới & D2C',
      priceMonthly: '1.200.000 ₫',
      priceYearly: '990.000 ₫',
      desc: 'Tối ưu cho nhà bán hàng muốn tự động hóa xử lý đơn và chặn bán âm trên Shopee, TikTok Shop.',
      orders: 'Tối đa 3.000 đơn/tháng',
      warehouses: '1 Kho hàng vật lý',
      users: '3 Tài khoản truy cập',
      features: [
        'Đồng bộ đơn đa kênh Shopee & TikTok',
        'Khóa tồn nguyên tử (Atomic Lock) chống bán âm',
        'In phiếu giao hàng và nhặt hàng theo đơn',
        'Báo cáo doanh thu & lợi nhuận cơ bản',
        'Hỗ trợ qua Chat & Ticket trong giờ hành chính'
      ],
      isPopular: false,
      cta: 'Bắt đầu dùng thử'
    },
    {
      name: 'Growth (Tăng Trưởng)',
      badge: 'Lựa chọn phổ biến nhất',
      priceMonthly: '3.500.000 ₫',
      priceYearly: '2.800.000 ₫',
      desc: 'Dành cho doanh nghiệp bán lẻ mở rộng chuỗi, cần quản lý đa kho, quản lý số lô FEFO và đối soát sàn.',
      orders: 'Tối đa 25.000 đơn/tháng',
      warehouses: 'Lên đến 5 Kho hàng chi nhánh',
      users: '15 Tài khoản (Phân quyền RBAC)',
      features: [
        'Mọi tính năng của gói Starter',
        'Quản lý 5 trạng thái tồn kho & Vị trí Kệ/Bin',
        'Quản lý Lô FEFO, HSD và Serial/IMEI',
        'Gom nhặt hàng Wave Picking & Scan-to-Pack',
        'Bút toán kế toán kép Debit=Credit tự động',
        'Đối soát chi tiết phí sàn & Circuit Breaker',
        'Hỗ trợ kỹ thuật 24/7 & Kênh Zalo riêng'
      ],
      isPopular: true,
      cta: 'Đăng ký gói Growth'
    },
    {
      name: 'Enterprise (Tùy Biến)',
      badge: 'Doanh nghiệp lớn & 3PL',
      priceMonthly: 'Liên hệ',
      priceYearly: 'Liên hệ',
      desc: 'Giải pháp hạ tầng chuyên dụng với cơ sở dữ liệu riêng biệt, tích hợp ERP SAP/Oracle và SLA 99.99%.',
      orders: 'Không giới hạn đơn hàng',
      warehouses: 'Không giới hạn kho bãi',
      users: 'Không giới hạn người dùng',
      features: [
        'Mọi tính năng của gói Growth',
        'Database chuyên dụng cách ly hoàn toàn',
        'Tùy biến quy tắc định tuyến & phân luồng đơn',
        'Tích hợp ERP (SAP, Oracle, Odoo, Bravo)',
        'Đội ngũ kỹ sư triển khai và Onsite Onboarding',
        'Cam kết chất lượng dịch vụ SLA 99.99%',
        'Hợp đồng bảo mật thông tin & RLS audit độc lập'
      ],
      isPopular: false,
      cta: 'Tư vấn cùng Chuyên gia'
    }
  ];

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/pricing" onNavigate={onNavigate} />

      {/* Header */}
      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Sparkles size={14} />
            <span>BẢNG GIÁ MINH BẠCH • KHÔNG PHÍ ẨN</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Chi Phí Đầu Tư Linh Hoạt Theo Quy Mô Của Bạn
          </h1>
          <p className="text-base text-gray-300 max-w-2xl mx-auto mb-8">
            Dùng thử miễn phí 14 ngày không cần thẻ tín dụng. Nâng cấp hoặc chuyển đổi gói bất kỳ lúc nào.
          </p>

          {/* Billing Switcher */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-xl bg-[#05121E] border border-[#1E647F]/50">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-[#1E647F] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Thanh toán Hàng tháng
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-[#27B4A0] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <span>Thanh toán Hàng năm</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Tiết kiệm 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((p, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl p-8 flex flex-col justify-between transition-all relative ${
                  p.isPopular 
                    ? 'bg-[#0C2739] border-2 border-wood-aqua shadow-2xl shadow-[#27B4A0]/10 scale-105 z-10' 
                    : 'bg-[#081B2C] border border-[#1E647F]/40 hover:border-gray-600'
                }`}
              >
                {p.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white text-[11px] font-bold uppercase tracking-wider shadow">
                    Phổ biến nhất
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-wood-aqua uppercase tracking-wider mb-2">{p.badge}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{p.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-6">{p.desc}</p>

                  <div className="mb-6 pb-6 border-b border-gray-800">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">
                        {billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly}
                      </span>
                      {p.priceMonthly !== 'Liên hệ' && (
                        <span className="text-xs text-gray-400">/ tháng</span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && p.priceMonthly !== 'Liên hệ' && (
                      <span className="text-[11px] text-emerald-400 mt-1 block">Thanh toán theo chu kỳ năm</span>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className="space-y-2 mb-6 text-xs text-metal-mist bg-[#05121E]/60 p-3.5 rounded-xl border border-gray-800">
                    <div><strong>Đơn hàng:</strong> {p.orders}</div>
                    <div><strong>Kho bãi:</strong> {p.warehouses}</div>
                    <div><strong>Tài khoản:</strong> {p.users}</div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tính năng bao gồm:</p>
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => onNavigate(p.name.includes('Enterprise') ? '/contact' : '/register')}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      p.isPopular
                        ? 'bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white hover:from-[#174E64] hover:to-[#10B981] shadow-lg'
                        : 'bg-[#123A52] text-white hover:bg-[#1E647F] border border-[#1E647F]/60'
                    }`}
                  >
                    <span>{p.cta}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
