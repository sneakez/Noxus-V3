# DREAM TERUS — COMMERCE OPERATING SYSTEM (COMMERCE OS)

> **Hệ điều hành vận hành thương mại điện tử chuyên sâu cho Terus Tech**  
> Quản trị biên lợi nhuận đóng góp (CM1, CM2, CM3), tồn kho 5 trạng thái, dòng tiền & kỷ luật ra quyết định của Founder.

---

## 🚀 KHỞI ĐỘNG NHANH TRONG 60 GIÂY (ZERO CONFIG)

Dự án được thiết kế theo kiến trúc **Prototype-First & Dual-Mode Data Architecture**.  
**Người mới clone về hoàn toàn KHÔNG CẦN cài đặt database, KHÔNG CẦN Supabase, và KHÔNG BỊ BẤT KỲ LỖI SCHEMA NÀO!**

```bash
# 1. Clone repository về máy
git clone https://github.com/sneakez/Noxus-V3.git
cd Noxus-V3

# 2. Cài đặt dependencies
npm install

# 3. Khởi động môi trường phát triển
npm run dev
```

Ứng dụng sẽ tự động chạy tại: `http://localhost:5173/`

---

## ❓ TẠI SAO CLONE VỀ KHÔNG BỊ LỖI SCHEMA DATABASE?

1. **Cơ chế Mặc Định An Toàn (`DATA_MODE=mock`):**
   * Nếu không có file `.env` hoặc chưa cấu hình Supabase, hệ thống **tự động kích hoạt Mock Engine** nội bộ (`src/mock/store.ts`).
   * Không có bất kỳ truy vấn mạng nào được gửi ra ngoài, không đòi hỏi kết nối PostgreSQL.
2. **Bộ Dữ Liệu Demo Đầy Đủ & Nhất Quán:**
   * Tự động khởi tạo đầy đủ dữ liệu thương mại điện tử thực tế: 7 vai trò người dùng, đơn hàng TikTok Shop & Shopee, tồn kho 5 trạng thái tại các kho bãi, bảng phân tích tài chính đơn vị (Order Economics, SKU Economics), thẻ kho, v.v.
3. **Thử Nghiệm Toàn Diện Mọi Vai Trò (RBAC):**
   * Chuyển đổi vai trò tức thì bằng cách nhấp vào tên người dùng ở góc dưới Sidebar, hoặc mở trực tiếp đường dẫn URL:
     * 👑 **Chủ Doanh Nghiệp (Owner):** `http://localhost:5173/app?page=dashboard&role=owner`
     * 📦 **Nhân Viên Kho (Warehouse):** `http://localhost:5173/app?page=fulfillment&role=warehouse`
     * 💰 **Kế Toán (Finance):** `http://localhost:5173/app?page=orderEconomics&role=finance`
     * 🚀 **Tăng Trưởng & Ads (Growth):** `http://localhost:5173/app?page=marketingAnalytics&role=growth`
     * 📊 **Trưởng Phòng OMS (Manager):** `http://localhost:5173/app?page=orders&role=manager`
     * 👁️ **Người Xem (Viewer):** `http://localhost:5173/app?page=dashboard&role=viewer`

---

## 🛠️ HƯỚNG DẪN KẾT NỐI BACKEND THẬT (TÙY CHỌN CHO PRODUCTION)

Khi doanh nghiệp sẵn sàng chuyển đổi từ bản Prototype sang kết nối cơ sở dữ liệu thật:

1. **Chuẩn bị Database Supabase:**
   * Tạo một dự án mới trên [Supabase](https://supabase.com).
   * Chạy toàn bộ các file migration trong thư mục `supabase/migrations/` vào dự án (hỗ trợ đầy đủ bảng, RLS Tenant isolation, và các hàm RPC nguyên tử).
2. **Cấu hình file `.env`:**
   ```env
   VITE_DATA_MODE=supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Khởi động lại ứng dụng: `npm run dev`. Toàn bộ giao diện và nghiệp vụ giữ nguyên 100%, tự động kết nối vào PostgreSQL thật.

---

## 🧪 KIỂM THỬ HỆ THỐNG

```bash
# Kiểm tra TypeScript type-check
npm run typecheck   # hoặc: npx tsc --noEmit

# Chạy toàn bộ 85 bài kiểm thử tự động
npm test            # hoặc: npx vitest run
```

---

## 📚 TÀI LIỆU DỰ ÁN CHI TIẾT
* [PROJECT_STATUS_HANDOVER.md](./PROJECT_STATUS_HANDOVER.md) — Bản đặc tả toàn diện cho AI & Kỹ sư.
* [docs/SWAPPING_MOCK_TO_REAL_BACKEND.md](./docs/SWAPPING_MOCK_TO_REAL_BACKEND.md) — Quy trình chuyển đổi Backend.
