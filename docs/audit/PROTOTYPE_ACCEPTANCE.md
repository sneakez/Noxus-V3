# NOXUS — Biên Bản Nghiệm Thu Prototype (Prototype Acceptance Report)

**Thời gian:** 30/10/2026 (Asia/Ho_Chi_Minh)  
**Baseline Git Commit:** `b891421eecf1efb6670af93912a04b2a7154a766`  
**Nhánh thực hiện:** `refactor/prototype-marketplace-e2e`  

---

## 1. Trạng Thái Baseline (Đợt 0)

| Tiêu chí | Kết quả Baseline | Ghi chú chẩn đoán |
|---|---|---|
| **Bộ kiểm thử Vitest (`npm test`)** | 14 test files, 85 passed (100%) | Đã chạy và kiểm chứng độc lập trên baseline |
| **Kiểm tra kiểu (`npm run typecheck`)** | **FAIL — 203 diagnostics `error TS`** | Lệch kiểu giữa `Order`, `Product`, `SkuEconomics`, `mockSupabaseAdapter` |
| **Đóng gói mã nguồn (`npm run build`)** | PASS trên Windows; **FAIL trên Linux** | Casing sai: `import { Modal } from '@/components/ui/modal'` (file là `Modal.tsx`) |
| **Mock Persistence** | **FAIL** | `insert()` và `delete()` không lưu trữ thật, reload mất dữ liệu |
| **Query Chaining** | **FAIL** | `.insert(...).select().single()` crash do `insert` trả Promise không có method chain |
| **Bảo vệ ranh giới (Mock Boundary)** | **FAIL** | `WebhooksPage` resend gọi `fetch` trực tiếp ra URL ngoài |

---

## 2. Mục Tiêu Đạt Được Qua Các Đợt

- **Đợt 1:** Mock đúng chuẩn Supabase CRUD/Chaining/Persistence, 0 lỗi TypeScript, 0 lỗi build Linux, Webhook safe.
- **Đợt 2:** Chuẩn hóa Shop Identity, trạng thái đa chiều, ma trận phân quyền theo User ID, loại Viewer, Finance optional.
- **Đợt 3:** Luồng luân chuyển hàng hóa thực tế (Nhận PO, Nhận hoàn, QC pass/fail, bàn giao vận chuyển, không hack delivered).
- **Đợt 4:** Khớp số liệu tài chính, Ads ROAS adjusted vs reported, đối soát phí chi tiết theo đơn.
- **Đợt 5:** Thu gọn cấu trúc menu & bảng điều khiển theo vai trò.
- **Đợt 6:** Nghiệm thu toàn diện 64 test cases (49 role UAT + 15 cross-role E2E).

*(Báo cáo này được cập nhật liên tục qua từng đợt thực thi)*
