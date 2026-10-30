import { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Boxes,
  Warehouse,
  Truck,
  Banknote,
  Receipt,
  TrendingUp,
  PackageCheck,
  ClipboardList,
  Link2,
  Layers,
  RefreshCw,
  Zap,
  Webhook,
  ShieldCheck,
  Activity,
  Gauge,
  BadgePercent,
  FlaskConical,
  Settings,
  ArrowDown,
  Users,
  LayoutDashboard,
  Rocket,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type PhaseId = 'day1' | 'day2' | 'week1' | 'daily' | 'weekly' | 'advanced';

interface Phase {
  id: PhaseId;
  label: string;
  sublabel: string;
  icon: typeof Rocket;
  color: string;
  description: string;
  role: string;
  loginAs: string;
  steps: OnboardStep[];
}

interface OnboardStep {
  num: number;
  page: string;
  icon: typeof ShoppingCart;
  title: string;
  what: string;
  why: string;
  tips: string;
}

const PHASES: Phase[] = [
  {
    id: 'day1',
    label: 'Ngày 1',
    sublabel: 'Khởi tạo hệ thống',
    icon: Rocket,
    color: 'brand',
    description: 'Đăng nhập lần đầu, tạo kho, thêm sản phẩm, nhập tồn kho đầu kỳ',
    role: 'Quản trị viên',
    loginAs: 'admin@nexusoms.vn / Admin@123',
    steps: [
      {
        num: 1, page: 'Đăng nhập', icon: LayoutDashboard,
        title: 'Đăng nhập bằng tài khoản admin',
        what: 'Mở trang đăng nhập, nhập admin@nexusoms.vn / Admin@123. Sau khi đăng nhập bạn thấy Dashboard tổng quan.',
        why: 'Đây là tài khoản có quyền cao nhất. Chỉ admin mới tạo kho, thêm người dùng, cấu hình webhook.',
        tips: 'Trang đăng nhập hiện 3 tài khoản demo. Admin thấy tất cả 28 trang, manager thấy 22, warehouse thấy 10.',
      },
      {
        num: 2, page: 'Kho & Vị trí', icon: Warehouse,
        title: 'Tạo các kho của bạn',
        what: 'Vào Kho & Vị trí > nhấn "Thêm kho". Nhập mã kho (VD: WH-HN), tên kho, địa chỉ, độ ưu tiên. Tạo ít nhất 1 kho để bắt đầu.',
        why: 'Mỗi đơn hàng cần gán vào 1 kho để xử lý. Tồn kho đếm theo từng kho riêng. Mặc định đã có 3 kho: HN, HCM, ĐN.',
        tips: 'Độ ưu tiên (1, 2, 3...) quyết định kho nào được chọn trước khi định tuyến đơn. Kho P1 được ưu tiên nhất.',
      },
      {
        num: 3, page: 'Sản phẩm & BOM', icon: Package,
        title: 'Thêm danh mục sản phẩm',
        what: 'Vào Sản phẩm > "Thêm sản phẩm". Nhập SKU, tên, mô tả, danh mục, giá bán, giá vốn, tồn kho ban đầu. Nhấn Lưu.',
        why: 'Không có sản phẩm thì không thể tạo đơn hàng. Giá vốn (cost) cần thiết để tính margin. SKU là mã duy nhất không trùng.',
        tips: 'Nếu bạn có sản phẩm combo (VD: 3 áo thun), tạo sản phẩm cha rồi thêm thành phần (bundle). Mặc định đã có 10 SP mẫu.',
      },
      {
        num: 4, page: 'Tồn kho 5 trạng thái', icon: Boxes,
        title: 'Kiểm tra tồn kho đầu kỳ',
        what: 'Vào Tồn kho 5 trạng thái. Hệ thống tự động tạo bản ghi tồn kho khi bạn thêm sản phẩm. 5 trạng thái: Physical, Reserved, Available, Unavailable, Incoming.',
        why: 'Available = Physical - Reserved. Khi tạo đơn, hệ thống tự Reserved thêm số lượng. Khi giao hàng, Physical giảm.',
        tips: 'Huy hiệu đỏ trên sidebar hiện khi tồn kho <= reorder level. Mặc định đã có tồn kho cho 3 kho x 10 sản phẩm.',
      },
      {
        num: 5, page: 'Khách hàng', icon: Users,
        title: 'Thêm danh sách khách hàng',
        what: 'Vào Khách hàng > "Thêm khách hàng". Nhập tên, email, điện thoại, địa chỉ giao hàng, công ty (nếu có).',
        why: 'Cần có khách hàng trước khi tạo đơn. Hệ thống tự động tính tổng chi tiêu, tỉ lệ đổi trả, xếp hạng VIP/Thường.',
        tips: 'Khách VIP có tỉ lệ mua cao, được ưu tiên. Hệ thống tự động đề xuất lệnh bổ hàng khi khách mua nhiều. Đã có 8 khách mẫu.',
      },
    ],
  },
  {
    id: 'day2',
    label: 'Ngày 2',
    sublabel: 'Bán đơn đầu tiên',
    icon: ShoppingCart,
    color: 'brand',
    description: 'Tạo đơn hàng đầu tiên, gán kho, xuất wave picking, cập nhật trạng thái giao hàng',
    role: 'Admin hoặc Quản lý',
    loginAs: 'admin@nexusoms.vn hoặc manager@nexusoms.vn',
    steps: [
      {
        num: 1, page: 'Đơn hàng', icon: ShoppingCart,
        title: 'Tạo đơn hàng đầu tiên',
        what: 'Vào Đơn hàng > "Tạo đơn". Chọn khách hàng, chọn sản phẩm, nhập số lượng. Hệ thống tự tính subtotal, VAT 10%, phí ship. Chọn kho giao, chọn kênh (website/shopee/tiktok/lazada). Nhấn Lưu.',
        why: 'Khi lưu đơn, hệ thống tự động: (1) trừ tồn kho Reserved, (2) tạo log trạng thái "pending", (3) gán mã đơn DH-XXXX.',
        tips: 'Đơn COD mặc định payment_status = unpaid. Đơn bank_transfer/momo mặc định = paid. SLA = 3 ngày kể từ khi tạo.',
      },
      {
        num: 2, page: 'Wave Picking & SLA', icon: Truck,
        title: 'Tạo wave picking và gán đơn',
        what: 'Vào Wave Picking > "Tạo wave". Chọn kho, chọn nhiều đơn cần gom. Wave chuyển qua 4 trạng thái: Mở > Đang nhặt > Đang đóng gói > Hoàn thành.',
        why: 'Wave gom nhiều đơn thành 1 lần nhặt hàng để tiết kiệm thời gian đi lại trong kho. SLA countdown đếm ngược cho mỗi đơn.',
        tips: 'Nhấn vào wave để xem danh sách đơn. Khi chuyển sang "Đang đóng gói", đơn tự chuyển sang "processing". Mặc định đã có WAVE-001.',
      },
      {
        num: 3, page: 'Đơn hàng', icon: ShoppingCart,
        title: 'Cập nhật trạng thái đơn',
        what: 'Quay lại Đơn hàng, nhấn vào 1 đơn. Trong drawer chi tiết, cập nhật trạng thái: pending > processing > shipped > delivered. Mỗi lần đổi trạng thái, log tự ghi lại.',
        why: 'Trạng thái shipped đánh dấu đơn đã giao cho đơn vị vận chuyển. Delivered đánh dấu khách đã nhận. Cancelled = hủy, trả lại tồn kho.',
        tips: 'Mỗi bước chuyển trạng thái ghi vào order_status_log. Bạn có thể xem lịch sử trong drawer chi tiết đơn hàng.',
      },
      {
        num: 4, page: 'Sổ kép', icon: Banknote,
        title: 'Kiểm tra bút toán tự động',
        what: 'Vào Sổ kép. Khi đơn hàng chuyển sang "delivered", hệ thống tự tạo bút toán: Nợ Phải thu khách / Có Doanh thu bán hàng. Mỗi bút toán Debit = Credit.',
        why: 'Sổ kép là bắt buộc để báo cáo tài chính chính xác. 10 tài khoản đã cấu hình: Tiền mặt, Phải thu, Hàng tồn, Phải trả, Vốn, Doanh thu, Giá vốn, Phí vận chuyển...',
        tips: 'Mặc định đã có 2 bút toán mẫu (JE-0001, JE-0002) cho đơn DH-0001. Mỗi bút toán có nhiều dòng, mỗi dòng gắn với 1 tài khoản.',
      },
    ],
  },
  {
    id: 'week1',
    label: 'Tuần 1',
    sublabel: 'Kết nối đa kênh',
    icon: Link2,
    color: 'sky',
    description: 'Kết nối shop Shopee/TikTok, ánh xạ SKU, cấu hình định tuyến kho, đồng bộ tồn kho',
    role: 'Quản lý',
    loginAs: 'manager@nexusoms.vn / Manager@123',
    steps: [
      {
        num: 1, page: 'Kết nối kênh', icon: Link2,
        title: 'Kết nối shop TMĐT',
        what: 'Vào Kết nối kênh > "Thêm kết nối". Chọn kênh (shopee/tiktok/lazada), nhập tên shop, shop ID, API key. Hệ thống kiểm tra kết nối và hiện trạng thái connected/error.',
        why: 'Khi kết nối thành công, đơn hàng từ shop tự động đổ về hệ thống. Tồn kho tự động đẩy lên shop khi có thay đổi.',
        tips: 'Mặc định đã có 3 shop: Shopee (connected), TikTok (connected), Lazada (error - token hết hạn). Click vào shop để xem chi tiết sync.',
      },
      {
        num: 2, page: 'Ánh xạ SKU kênh', icon: Layers,
        title: 'Ánh xạ SKU nội bộ sang SKU kênh',
        what: 'Vào Ánh xạ SKU > "Thêm ánh xạ". Chọn kênh, nhập SKU trên kênh (VD: SHOPEE-AO-001), chọn sản phẩm nội bộ (SP-AO-001). Lưu.',
        why: 'Khi đơn từ Shopee về với SKU SHOPEE-AO-001, hệ thống tự map sang SP-AO-001 để trừ tồn kho đúng. Không ánh xạ = đơn không gán được sản phẩm.',
        tips: 'Mặc định đã có 5 ánh xạ. 1 sản phẩm có thể ánh xạ nhiều kênh. Ánh xạ là điều kiện bắt buộc trước khi đồng bộ tồn kho.',
      },
      {
        num: 3, page: 'Định tuyến kho', icon: Activity,
        title: 'Cấu hình luật định tuyến đơn',
        what: 'Vào Định tuyến kho > "Thêm quy tắc". Chọn kênh (VD: shopee), chọn kho ưu tiên (VD: WH-HCM), chọn strategy (priority/nearest/most_stock). Cài đặt độ ưu tiên.',
        why: 'Khi đơn từ kênh về, hệ thống tự gán kho theo routing rule. VD: đơn Shopee -> WH-HCM. Không có rule -> gán kho theo độ ưu tiên kho.',
        tips: 'Strategy nearest = chọn kho gần khách nhất. most_stock = chọn kho có nhiều tồn nhất. priority = chọn kho cụ thể. Đã có 5 routing rule mẫu.',
      },
      {
        num: 4, page: 'Giám sát đồng bộ', icon: RefreshCw,
        title: 'Giám sát đồng bộ tồn kho',
        what: 'Vào Giám sát đồng bộ. Mỗi 15 phút hệ thống tự động đẩy tồn kho lên tất cả shop. Log hiện trạng thái: success / failed / retrying.',
        why: 'Nếu tồn kho trên shop không đồng bộ, bạn sẽ bị bán ảo (bán mà kho không còn) hoặc mất đơn (không bán dù kho còn). Log retry cho biết có cần cảnh báo không.',
        tips: 'Mặc định đã có 5 sync log. Lazada đang lỗi token - cần làm mới API key. Click vào log để xem chi tiết retry count và message.',
      },
    ],
  },
  {
    id: 'daily',
    label: 'Hằng ngày',
    sublabel: 'Vận hành mỗi ngày',
    icon: Calendar,
    color: 'emerald',
    description: 'Công việc lặp lại mỗi ngày: xử lý đơn, giao hàng, nhập kho, đổi trả',
    role: 'Tất cả vai trò',
    loginAs: 'warehouse@nexusoms.vn (kho) / manager (vận hành)',
    steps: [
      {
        num: 1, page: 'Dashboard', icon: LayoutDashboard,
        title: 'Sáng: Mở Dashboard kiểm tra tình hình',
        what: 'Vào Dashboard. Xem: số đơn pending/processing, đơn quá SLA, tồn kho thấp, doanh thu hôm nay, margin trung bình.',
        why: 'Dashboard là điểm bắt đầu mỗi ngày. Huy hiệu đỏ trên sidebar cho biết có bao nhiêu đơn chờ xử lý và bao nhiêu SP sắp hết hàng.',
        tips: 'Click vào mỗi thẻ để đi nhanh đến trang tương ứng. Dashboard cập nhật mỗi 30 giây.',
      },
      {
        num: 2, page: 'Đơn hàng', icon: ShoppingCart,
        title: 'Sáng: Xử lý đơn mới',
        what: 'Vào Đơn hàng. Lọc theo status = pending. Mở từng đơn, kiểm tra thông tin, chuyển sang processing. Tạo wave picking cho nhóm đơn cùng kho.',
        why: 'Đơn pending cần được chuyển sang processing trong ngày. Đơn quá SLA (must_ship_by_sla) sẽ bị cảnh báo đỏ.',
        tips: 'Nhấn "Tạo đơn" ở góc trên bên phải. Đơn COD cần xác nhận thanh toán khi giao. Đơn bank_transfer/momo đã thanh toán trước.',
      },
      {
        num: 3, page: 'Wave Picking & SLA', icon: Truck,
        title: 'Sáng - Chiều: Nhặt hàng và đóng gói',
        what: 'Vào Wave Picking. Wave đang "picking" -> nhân viên nhặt xong -> chuyển sang "packing" -> đóng gói xong -> "completed". Đơn tự chuyển sang shipped.',
        why: 'Wave gom đơn để nhặt 1 lần cho nhiều đơn. Nhân viên kho chỉ cần làm theo danh sách trong wave, không cần đi lại nhiều lần.',
        tips: 'SLA countdown hiện ngay trên mỗi đơn trong wave. Đơn chưa ship quá SLA hiện đỏ. Có thể quét mã vạch barcode để pack.',
      },
      {
        num: 4, page: 'Đơn hàng', icon: ShoppingCart,
        title: 'Chiều: Đánh dấu giao thành công',
        what: 'Vào Đơn hàng. Đơn "shipped" -> khi đơn vị vận chuyển xác nhận đã giao -> chuyển sang "delivered". Hệ thống tự tạo bút toán doanh thu.',
        why: 'Delivered là bước cuối của 1 đơn happy case. Sau delivered, doanh thu được ghi nhận vào sổ kép, margin được tính.',
        tips: 'Nếu khách từ chối nhận -> chuyển sang "cancelled" + payment_status = refunded. Tồn kho tự trả lại.',
      },
      {
        num: 5, page: 'Tồn kho 5 trạng thái', icon: Boxes,
        title: 'Chiều: Kiểm tra cảnh báo tồn kho',
        what: 'Vào Tồn kho. Kiểm tra SP nào có Available <= reorder_point. SP đó cần được nhập thêm. Chuyển sang Đơn mua hàng để tạo PO.',
        why: 'Bán hết hàng = mất đơn. Hệ thống tự cảnh báo khi tồn kho đến mức reorder. Buffer rule cho phép đặt safety stock riêng từng SP/kho.',
        tips: 'Huy hiệu đỏ trên sidebar đếm số SP đang cảnh báo. Vào Tồn kho an toàn để xem/cập nhật safety stock và reorder point.',
      },
      {
        num: 6, page: 'Đổi trả / RMA', icon: PackageCheck,
        title: 'Khi có: Xử lý đổi trả',
        what: 'Vào Đổi trả / RMA > "Tạo yêu cầu". Chọn đơn gốc, nhập lý do, số tiền hoàn. RMA chuyển: pending > approved > received > quality_check > refunded > closed.',
        why: 'Khi khách đổi trả, cần tạo RMA để theo dõi. Hàng trả nhập lại kho (Physical tăng). Hoàn tiền ghi âm doanh thu trong sổ kép.',
        tips: 'RMA-0001 (refunded) và RMA-0002 (quality_check) đã có sẵn. Nhấn vào RMA để xem lịch sử trạng thái.',
      },
    ],
  },
  {
    id: 'weekly',
    label: 'Hằng tuần',
    sublabel: 'Tài chính & Báo cáo',
    icon: Banknote,
    color: 'amber',
    description: 'Cuối tuần: đối soát phí kênh, báo cáo doanh thu, kiểm tra margin, phân tích vận tốc bán',
    role: 'Quản lý hoặc Admin',
    loginAs: 'manager@nexusoms.vn / Manager@123',
    steps: [
      {
        num: 1, page: 'Đối soát phí', icon: Receipt,
        title: 'Đối soát phí TMĐT',
        what: 'Vào Đối soát phí. Xem từng đơn kênh: phí hoa hồng, phí giao hàng, phí voucher. So sánh phí ước tính vs phí thực tế. Đánh dấu đã đối soát.',
        why: 'Shopee/TikTok trừ phí trực tiếp. Nếu không đối soát, bạn không biết chênh lệch phí. 3 đơn mẫu đã có fee breakdown, 1 đơn có chênh lệch 5.000 VNĐ.',
        tips: 'Đơn có "discrepancy_note" cần kiểm tra thủ công. Click "Đã đối soát" để đánh dấu đã xong.',
      },
      {
        num: 2, page: 'Báo cáo doanh thu', icon: TrendingUp,
        title: 'Xem báo cáo doanh thu',
        what: 'Vào Báo cáo doanh thu. Biểu đồ doanh thu theo ngày/tháng/năm. Phân tích theo danh mục, theo kênh, theo kho. Có thể xuất Excel/PDF.',
        why: 'Cuối tuần cần báo cáo cho ban quản lý. Báo cáo hiện doanh thu, lợi nhuận, margin theo nhiều chiều. Tự động tính từ dữ liệu đơn hàng.',
        tips: 'Click vào biểu đồ để xem chi tiết. Sử dụng bộ lọc theo ngày để xem 1 tuần/tháng cụ thể.',
      },
      {
        num: 3, page: 'Margin Circuit Breaker', icon: BadgePercent,
        title: 'Kiểm tra margin',
        what: 'Vào Margin Circuit Breaker. Xem đơn nào có margin âm. Hệ thống tự HOLD đơn margin âm và cảnh báo. Cấu hình ngưỡng thất thoát tối đa.',
        why: 'Bán đơn margin âm = mất tiền. Circuit breaker tự động ngắt bán khi vượt ngưỡng. Tự động khóa tồn kho khi SP có margin âm liên tục.',
        tips: 'Cài đặt min_margin_percent và max_loss_per_order. Khi kích hoạt, đơn tự động gán hold_reason = "negative_margin".',
      },
      {
        num: 4, page: 'Vận tốc bán', icon: Gauge,
        title: 'Phân tích vận tốc bán',
        what: 'Vào Vận tốc bán. Xem doanh thu/giờ, tốc độ xuất kho/tồn. SP nào bán nhanh nhất, SP nào chậm nhất. Đề xuất bổ hàng dựa trên vận tốc.',
        why: 'Vận tốc bán giúp quyết định nhập thêm SP nào, ngừng SP nào. SP bán chậm chiếm kho = đọng vốn. SP bán nhanh cần nhập thêm để không đứt hàng.',
        tips: 'Combobox SP = combo 3 áo thun đang bán tốt. Túi tote (SP-TG-001) có tồn kho 300 nhưng bán chậm.',
      },
      {
        num: 5, page: 'Đơn mua hàng', icon: ClipboardList,
        title: 'Tạo đơn mua hàng (PO) nhập thêm',
        what: 'Vào Đơn mua hàng > "Tạo PO". Chọn kho, nhà cung cấp, sản phẩm, số lượng, ngày dự kiến nhận. PO chuyển: draft > ordered > partial > received.',
        why: 'Khi PO nhận hàng, tồn kho Physical tăng, Incoming giảm. Hệ thống ghi giao dịch vào Sổ giao dịch tồn. 2 PO mẫu đã có: PO-0001 (ordered), PO-0002 (partial).',
        tips: 'PO partial = đã nhận 1 phần. Click vào PO để xem danh mục và cập nhật received_qty.',
      },
    ],
  },
  {
    id: 'advanced',
    label: 'Nâng cao',
    sublabel: 'Tự động hóa & Quản trị',
    icon: Zap,
    color: 'violet',
    description: 'Luật IF-THEN, webhook, audit trail, chaos test, tạo người dùng',
    role: 'Quản trị viên',
    loginAs: 'admin@nexusoms.vn / Admin@123',
    steps: [
      {
        num: 1, page: 'Luật tự động', icon: Zap,
        title: 'Tạo luật tự động IF-THEN',
        what: 'Vào Luật tự động > "Tạo luật". Nhập tên luật, điều kiện (IF), hành động (THEN), trigger event. VD: IF order_total >= 500K THEN add_free_gift.',
        why: 'Luật tự động giảm công việc thủ công. Khi điều kiện IF thỏa mãn, action THEN tự chạy không cần người can thiệp. 3 luật mẫu đã có.',
        tips: 'Độ ưu tiên nhỏ = chạy trước. Trigger: order_created, status_changed, payment_received. Có thể tạo nhiều luật cho 1 trigger.',
      },
      {
        num: 2, page: 'Outbound Webhooks', icon: Webhook,
        title: 'Cấu hình webhook gửi ra ngoài',
        what: 'Vào Outbound Webhooks > "Thêm webhook". Nhập tên, target URL, event types, secret. Hệ thống gửi HTTP POST + HMAC khi có sự kiện.',
        why: 'Webhook đồng bộ hệ thống NexusOMS với ERP kế toán, CRM, Slack. VD: khi đơn delivered -> gửi sang ERP để ghi nhận doanh thu. 3 webhook mẫu đã có.',
        tips: 'Max retries = số lần gửi lại khi lỗi. Chữ ký HMAC dùng để xác thực webhook không bị giả mạo.',
      },
      {
        num: 3, page: 'Cài đặt & Phân quyền', icon: Settings,
        title: 'Tạo người dùng và gán vai trò',
        what: 'Vào Cài đặt > tab Phân quyền > "Thêm người dùng". Nhập email, mật khẩu, họ tên, chọn vai trò (admin/manager/warehouse). Lưu.',
        why: 'Mỗi người dùng thấy trang khác nhau. Admin thấy tất cả, manager không thấy audit/webhook/simulator, warehouse chỉ thấy đơn hàng + tồn kho.',
        tips: 'Có thể đổi vai trò và kích hoạt/vô hiệu hóa người dùng bất kỳ lúc nào. 3 tài khoản mẫu: admin, manager, warehouse.',
      },
      {
        num: 4, page: 'Nhật ký Audit', icon: ShieldCheck,
        title: 'Kiểm tra nhật ký audit',
        what: 'Vào Nhật ký Audit. Xem lịch sử mọi thay đổi quan trọng: tạo đơn, đổi trạng thái, xóa dữ liệu, đổi giá. Mỗi bản ghi có hash SHA-256 liên kết.',
        why: 'Audit trail chống xóa/sửa dữ liệu âm thầm. Nếu ai đó sửa dữ liệu, chuỗi hash sẽ bị phá vỡ. Đây là bắt buộc cho kiểm toán.',
        tips: 'Hash liên kết: bản ghi sau chứa hash của bản ghi trước. Sửa 1 bản ghi = phá cả chuỗi. Bộ lọc theo actor, action, entity.',
      },
      {
        num: 5, page: 'Chaos Simulator', icon: FlaskConical,
        title: 'Kiểm thử độ bền hệ thống',
        what: 'Vào Chaos Simulator. Chạy các kịch bản: Flash Sale Surge (20 đơn cùng lúc), Duplicate Webhook, Margin Attack, Tamper Audit, Concurrent Inventory.',
        why: 'Trước khi lên production, cần kiểm thử hệ thống có chịu được tải cao không. Simulator tạo dữ liệu giả lập và xem hệ thống phản hồi ra sao.',
        tips: 'Flash Sale Surge tạo 20 đơn SIM-FLASH để kiểm tra khóa tồn kho (inventory reservation). Tamper Audit DB phát hiện chuỗi hash bị phá vỡ.',
      },
    ],
  },
];

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; stepBg: string; stepBorder: string; line: string; activeBg: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', stepBg: 'bg-brand-100', stepBorder: 'border-brand-300', line: 'bg-brand-300', activeBg: 'bg-brand-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', stepBg: 'bg-sky-100', stepBorder: 'border-sky-300', line: 'bg-sky-300', activeBg: 'bg-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', stepBg: 'bg-amber-100', stepBorder: 'border-amber-300', line: 'bg-amber-300', activeBg: 'bg-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', stepBg: 'bg-emerald-100', stepBorder: 'border-emerald-300', line: 'bg-emerald-300', activeBg: 'bg-emerald-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', stepBg: 'bg-violet-100', stepBorder: 'border-violet-300', line: 'bg-violet-300', activeBg: 'bg-violet-600' },
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-rose-100', text: 'text-rose-700' },
  manager: { bg: 'bg-sky-100', text: 'text-sky-700' },
  warehouse: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function getRoleBadge(role: string): { bg: string; text: string } {
  if (role.toLowerCase().includes('admin')) return ROLE_BADGE.admin;
  if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('quản lý')) return ROLE_BADGE.manager;
  if (role.toLowerCase().includes('warehouse') || role.toLowerCase().includes('kho')) return ROLE_BADGE.warehouse;
  return { bg: 'bg-ink-100', text: 'text-ink-600' };
}

export function FlowGuidePage() {
  const [activePhase, setActivePhase] = useState<PhaseId>('day1');
  const phase = PHASES.find((p) => p.id === activePhase)!;
  const colors = PHASE_COLORS[phase.color];
  const roleBadge = getRoleBadge(phase.role);

  const currentIndex = PHASES.findIndex((p) => p.id === activePhase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === PHASES.length - 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/30">
          <Rocket size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">Hướng dẫn Onboarding — Khởi đầu triển khai</h2>
          <p className="text-sm text-ink-500 mt-0.5">Thực hiện tuần tự theo từng giai đoạn từ Ngày 1 đến khi vận hành toàn diện</p>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="card p-4">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            const isActive = activePhase === p.id;
            const isDone = i < currentIndex;
            const c = PHASE_COLORS[p.color];

            return (
              <div key={p.id} className="flex items-center shrink-0">
                <button
                  onClick={() => setActivePhase(p.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 sm:px-4 py-2.5 transition-all duration-200 border-2',
                    isActive
                      ? `${c.bg} ${c.border} shadow-sm`
                      : isDone
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-ink-50 border-ink-100 hover:border-ink-200'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive ? c.stepBg : isDone ? 'bg-emerald-100' : 'bg-white'
                  )}>
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <Icon size={16} className={isActive ? c.text : 'text-ink-400'} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className={cn('text-xs font-bold', isActive ? c.text : isDone ? 'text-emerald-700' : 'text-ink-500')}>
                      {p.label}
                    </p>
                    <p className="text-[10px] text-ink-400">{p.sublabel}</p>
                  </div>
                </button>
                {!isLast && i < PHASES.length - 1 && (
                  <div className={cn('h-0.5 w-3 sm:w-6 shrink-0', isDone ? 'bg-emerald-300' : 'bg-ink-200')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase detail */}
      <div className="card p-6 lg:p-8">
        {/* Phase header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors.stepBg)}>
              {(() => {
                const Icon = phase.icon;
                return <Icon size={24} className={colors.text} />;
              })()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-ink-900">{phase.label}: {phase.sublabel}</h3>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full', roleBadge.bg, roleBadge.text)}>
                  {phase.role}
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-0.5">{phase.description}</p>
            </div>
          </div>
          <div className="rounded-lg bg-ink-50 border border-ink-200 px-4 py-2.5">
            <p className="text-[10px] text-ink-400 font-medium uppercase tracking-wider mb-0.5">Đăng nhập bằng</p>
            <code className="text-xs text-ink-700 font-mono">{phase.loginAs}</code>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {phase.steps.map((s, i) => {
            const Icon = s.icon;
            const isLastStep = i === phase.steps.length - 1;
            return (
              <div key={i} className="flex gap-4 relative">
                {/* Step number + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all',
                    colors.stepBg, colors.stepBorder, colors.text
                  )}>
                    {s.num}
                  </div>
                  {!isLastStep && (
                    <div className={cn('w-0.5 flex-1 my-1 min-h-[2rem]', colors.line)} />
                  )}
                </div>

                {/* Step content */}
                <div className={cn('flex-1 pb-6 rounded-xl border p-5 mb-2', colors.border, colors.bg)}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/90')}>
                      <Icon size={18} className={colors.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-ink-900 text-sm">{s.title}</h4>
                        <span className={cn('text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90', colors.text)}>
                          {s.page}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 ml-12">
                    {/* What */}
                    <div className="flex items-start gap-2">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0', colors.text)}>Làm gì:</span>
                      <p className="text-sm text-ink-700 leading-relaxed">{s.what}</p>
                    </div>
                    {/* Why */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 text-ink-400">Tại sao:</span>
                      <p className="text-sm text-ink-600 leading-relaxed">{s.why}</p>
                    </div>
                    {/* Tips */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 text-amber-600">Mẹo:</span>
                      <p className="text-sm text-ink-500 leading-relaxed">{s.tips}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
          <button
            onClick={() => !isFirst && setActivePhase(PHASES[currentIndex - 1].id)}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              isFirst
                ? 'bg-ink-50 text-ink-300 cursor-not-allowed'
                : 'bg-white border border-ink-200 text-ink-700 hover:border-ink-300 hover:shadow-sm'
            )}
          >
            <ArrowDown size={14} className="rotate-90" />
            {isFirst ? 'Bắt đầu' : PHASES[currentIndex - 1].label}
          </button>

          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentIndex ? cn('w-6', colors.activeBg) : i < currentIndex ? 'bg-emerald-400' : 'bg-ink-200'
                )}
              />
            ))}
          </div>

          <button
            onClick={() => !isLast && setActivePhase(PHASES[currentIndex + 1].id)}
            disabled={isLast}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              isLast
                ? 'bg-ink-50 text-ink-300 cursor-not-allowed'
                : cn('text-white shadow-sm hover:shadow-md', colors.activeBg)
            )}
          >
            {isLast ? 'Hoàn thành' : PHASES[currentIndex + 1].label}
            <ArrowDown size={14} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* Quick reference: roles overview */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink-900 mb-1">3 tài khoản demo — Dùng để đào tạo nội bộ</h3>
        <p className="text-sm text-ink-500 mb-4">Đăng nhập bằng từng tài khoản để xem giao diện phân quyền tương ứng</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-rose-600" />
              <h4 className="font-semibold text-rose-800 text-sm">Quản trị viên</h4>
            </div>
            <code className="text-xs bg-white/80 text-rose-600 px-2 py-1 rounded font-mono block mb-3">admin@nexusoms.vn / Admin@123</code>
            <div className="space-y-1.5 text-xs text-rose-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard, Đơn hàng, Khách hàng</div>
              <div className="flex items-center gap-2"><Package size={13} /> Sản phẩm, Tồn kho, Chuyển kho, Kho</div>
              <div className="flex items-center gap-2"><Banknote size={13} /> Tài chính, Sổ kép, Báo cáo</div>
              <div className="flex items-center gap-2"><Settings size={13} /> Phân quyền, Audit, Webhook, Simulator</div>
            </div>
            <p className="text-[10px] text-rose-400 mt-2 font-medium">Truy cập toàn bộ 28 phân hệ</p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={18} className="text-sky-600" />
              <h4 className="font-semibold text-sky-800 text-sm">Quản lý</h4>
            </div>
            <code className="text-xs bg-white/80 text-sky-600 px-2 py-1 rounded font-mono block mb-3">manager@nexusoms.vn / Manager@123</code>
            <div className="space-y-1.5 text-xs text-sky-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard, Đơn hàng, Khách hàng</div>
              <div className="flex items-center gap-2"><Package size={13} /> Sản phẩm, Tồn kho, Chuyển kho, Kho</div>
              <div className="flex items-center gap-2"><Banknote size={13} /> Tài chính, Sổ kép, Báo cáo</div>
              <div className="flex items-center gap-2"><Zap size={13} /> Luật tự động, Đa kênh, Giao hàng</div>
            </div>
            <p className="text-[10px] text-sky-400 mt-2 font-medium">Truy cập 22 trang (không thấy audit, webhook, simulator, phân quyền)</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Boxes size={18} className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-800 text-sm">Nhân viên kho</h4>
            </div>
            <code className="text-xs bg-white/80 text-emerald-600 px-2 py-1 rounded font-mono block mb-3">warehouse@nexusoms.vn / Warehouse@123</code>
            <div className="space-y-1.5 text-xs text-emerald-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard</div>
              <div className="flex items-center gap-2"><ShoppingCart size={13} /> Đơn hàng</div>
              <div className="flex items-center gap-2"><Boxes size={13} /> Tồn kho, Chuyển kho, Lô & Serial</div>
              <div className="flex items-center gap-2"><Truck size={13} /> Wave Picking & SLA</div>
              <div className="flex items-center gap-2"><PackageCheck size={13} /> Đổi trả / RMA</div>
            </div>
            <p className="text-[10px] text-emerald-400 mt-2 font-medium">Truy cập 10 trang (không thấy tài chính, quản trị, sản phẩm)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
