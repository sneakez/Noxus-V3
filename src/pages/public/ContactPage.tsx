import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export function ContactPage({ onNavigate }: ContactPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    orderVolume: '1000-5000',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/contact" onNavigate={onNavigate} />

      {/* Header */}
      <section className="py-20 text-center border-b border-[#1E647F]/30 bg-gradient-to-b from-[#081B2C] to-[#0C2739]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/60 text-xs text-wood-aqua mb-4">
            <Sparkles size={14} />
            <span>TƯ VẤN KIẾN TRÚC & TRIỂN KHAI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Liên Hệ Đội Ngũ Kỹ Sư Giải Pháp NexusOMS
          </h1>
          <p className="text-base text-gray-300 max-w-2xl mx-auto">
            Chúng tôi luôn sẵn sàng lắng nghe bài toán vận hành của bạn và đề xuất mô hình tối ưu nhất.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Information Column */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Kết Nối Trực Tiếp</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Dù bạn cần demo chi tiết giải pháp, báo giá gói Enterprise hay tư vấn di chuyển dữ liệu từ hệ thống cũ, chuyên gia của chúng tôi sẽ phản hồi trong vòng 2 giờ làm việc.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#0C2739] border border-[#1E647F]/40 flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-[#1E647F]/30 text-wood-aqua">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Email Hỗ Trợ Kỹ Thuật & Kinh Doanh</div>
                    <div className="text-sm font-semibold text-white">support@nexusoms.vn</div>
                    <div className="text-xs text-gray-400 mt-0.5">Tiếp nhận 24/7/365</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0C2739] border border-[#1E647F]/40 flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-[#1E647F]/30 text-wood-aqua">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Hotline Tư Vấn Doanh Nghiệp</div>
                    <div className="text-sm font-semibold text-white">1900 6868 (Ext: 2)</div>
                    <div className="text-xs text-gray-400 mt-0.5">Thứ 2 - Thứ 7: 8:00 - 20:00</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0C2739] border border-[#1E647F]/40 flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-[#1E647F]/30 text-wood-aqua">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Văn Phòng Điều Hành</div>
                    <div className="text-sm font-semibold text-white">Tòa nhà Nexus Tower, Khu Đô Thị Mới Thủ Thiêm</div>
                    <div className="text-xs text-gray-400 mt-0.5">TP. Thủ Đức, TP. Hồ Chí Minh</div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#05121E] border border-gray-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Cam Kết Bảo Mật Thông Tin Doanh Nghiệp</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mọi thông tin về doanh thu, số lượng đơn và cơ cấu kho bãi của bạn được bảo mật tuyệt đối theo tiêu chuẩn NDA trước khi tiếp cận kỹ thuật.
                </p>
              </div>
            </div>

            {/* Form Column */}
            <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl p-8 shadow-2xl">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Yêu Cầu Đã Được Tiếp Nhận!</h3>
                  <p className="text-sm text-gray-300 max-w-sm mx-auto">
                    Cảm ơn bạn đã quan tâm đến NexusOMS. Chuyên gia giải pháp của chúng tôi sẽ liên hệ lại qua số điện thoại hoặc email của bạn trong ít phút.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#123A52] text-white hover:bg-[#1E647F] transition-colors"
                  >
                    Gửi yêu cầu khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-xl font-bold text-white mb-2">Đăng Ký Tư Vấn & Nhận Demo 1-1</h3>
                  <p className="text-xs text-gray-400 mb-6">Điền thông tin bên dưới để được kết nối với Kỹ sư phụ trách khu vực của bạn.</p>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">Email doanh nghiệp *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="a.nguyen@company.vn"
                        className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">Số điện thoại *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0912 345 678"
                        className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">Tên công ty / Shop</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Thương hiệu ABC"
                        className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">Sản lượng đơn dự kiến</label>
                      <select
                        value={formData.orderVolume}
                        onChange={(e) => setFormData({ ...formData, orderVolume: e.target.value })}
                        className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-wood-aqua"
                      >
                        <option value="under-1000">&lt; 1.000 đơn/tháng</option>
                        <option value="1000-5000">1.000 - 5.000 đơn/tháng</option>
                        <option value="5000-20000">5.000 - 20.000 đơn/tháng</option>
                        <option value="over-20000">&gt; 20.000 đơn/tháng (Enterprise)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Nhu cầu cụ thể cần tư vấn</label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Mô tả sơ lược quy mô kho, số kênh bán hàng hoặc vấn đề đang gặp phải..."
                      className="w-full rounded-lg bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#27B4A0]/20"
                  >
                    <Send size={15} />
                    <span>Gửi Yêu Cầu Tư Vấn Ngay</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
