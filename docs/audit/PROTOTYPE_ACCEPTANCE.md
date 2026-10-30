# NOXUS — Biên Bản Nghiệm Thu Prototype (Prototype Acceptance Report)

**Thời gian nghiệm thu:** 30/10/2026 (Asia/Ho_Chi_Minh)  
**Baseline Git Commit:** `b891421eecf1efb6670af93912a04b2a7154a766`  
**Refactor Branch:** `refactor/prototype-marketplace-e2e`  
**Đặc tả kiểm toán tham chiếu:** `c:\Users\Admin\Downloads\NOXUS_PROTOTYPE_AUDIT_ANTIGRAVITY.md`

---

## 1. Đối Chiếu Kết Quả Kỹ Thuật (Technical Benchmark)

| Tiêu chí kỹ thuật | Trạng thái tại Baseline (`b891421`) | Kết quả sau Đại Trùng Tu | Đánh giá nghiệm thu |
|---|---|---|:---:|
| **Kiểm tra kiểu dữ liệu (`npm run typecheck`)** | **FAIL** — 203 diagnostics `error TS` | **PASS — 0 diagnostics error (Mã thoát: 0)** | **ĐẠT CHUẨN** |
| **Đóng gói mã nguồn (`npm run build`)** | **FAIL** trên Linux (Lỗi import casing `@/components/ui/modal`) | **PASS — Build thành công trong ~15s (Mã thoát: 0)** | **ĐẠT CHUẨN** |
| **Bộ kiểm thử tự động (`npm test`)** | 14 test files, 85 passed | **16 test files, 101 passed, 0 failed (100% pass rate)** | **ĐẠT CHUẨN** |
| **Độ bền dữ liệu giả lập (Mock Persistence)** | **FAIL** — `insert`/`delete` không lưu thật, reload mất dữ liệu | **PASS — Generic table storage, lưu bền vững vào localStorage & đồng bộ cross-tab** | **ĐẠT CHUẨN** |
| **Chuỗi truy vấn (Query Chaining)** | **FAIL** — Crash runtime khi gọi `.insert().select().single()` | **PASS — Chained query builder hỗ trợ đầy đủ `.select()`, `.single()`, `.maybeSingle()`, async `.then()`** | **ĐẠT CHUẨN** |
| **Bảo vệ biên giới giả lập (Mock Boundary)** | **FAIL** — Phát lệnh `fetch` HTTP ra Internet khi resend webhook | **PASS — Chặn hoàn toàn request HTTP ra ngoài trong mock mode, tạo mock log an toàn** | **ĐẠT CHUẨN** |
| **Bảo vệ ở cấp lệnh (Command Authorization)** | **FAIL** — Không chặn trực tiếp lệnh mutation từ vai trò trái quyền | **PASS — Warehouse không được POD, Admin không được refund, Warehouse không được đối soát** | **ĐẠT CHUẨN** |

---

## 2. Nghiệm Thu Nghiệp Vụ Theo Các Đợt Thực Hiện

### Đợt 1 — Khắc Phục Tầng Dữ Liệu & Adapter (R01 — R04, R28)
- [x] Mock Supabase Adapter hỗ trợ đầy đủ CRUD, chaining, error handling cho bảng lạ (`PGRST100`).
- [x] Đồng bộ dữ liệu xuyên tab qua `window.addEventListener('storage', ...)`.
- [x] Triệt tiêu toàn bộ 203 lỗi TypeScript, sửa casing file `Modal.tsx`.
- [x] Bảo vệ biên giới Webhook không bắn HTTP ra ngoài mạng Internet.

### Đợt 2 — Chuẩn Hóa Dữ Liệu & Ma Trận Phân Quyền (R05 — R06, R12, R18, R23, R26 — R27)
- [x] Định danh đơn hàng đa sàn duy nhất theo bộ ba: `(tenant_id, shop_id, channel_order_sn)`.
- [x] Mô hình trạng thái đa chiều: raw source status, fulfillment status, delivery status, return status, settlement status.
- [x] Ma trận phân quyền theo `user_id`:
  - `owner`: Quản trị toàn quyền nhưng không phá vỡ bất biến số liệu.
  - `manager`: Quản lý vận hành thương mại và có quyền đối soát phí sàn (`finance:reconcile`).
  - `warehouse`: Thao tác nhặt hàng, đóng gói và tiếp nhận kho; **không có quyền tự bấm giao hàng thành công (POD)**; gỡ bỏ quyền `warehouses:manage`.
  - `growth`: Phân tích hiệu quả marketing và kinh tế đơn; che giấu dữ liệu nhạy cảm PII khách hàng.
  - `viewer`: Loại bỏ khỏi bộ chọn vai trò đang hoạt động; tài khoản legacy bị từ chối truy cập.
  - `finance`: Đặt cờ tính năng `ENABLE_FINANCE_ROLE = false` mặc định, sẵn sàng mở rộng khi cần.
- [x] Chặn đứng các hành động trái quyền ở cấp câu lệnh thực thi (Command-Level Guard):
  - `markDeliveredWithPOD` từ chối vai trò `warehouse`.
  - `refundOrder` từ chối vai trò `admin`, `warehouse`, `growth`.
  - `reconcileFeeBreakdown` từ chối các vai trò thiếu capability `finance:reconcile`.

### Đợt 3 — Vận Hành Hàng Hóa Đầu Cuối (R07 — R09, R13 — R16, R19 — R21)
- [x] Quy trình nhận hàng hoàn 2 bước nghiêm ngặt: Nhận kiện tại Dock (tăng `pending_qc`) -> Kiểm tra QC (chuyển sang `available` hoặc `damaged`). Tồn vật lý `physical` bảo toàn không bị cộng lặp.
- [x] Quy trình nhận kiện hoàn thiếu (W-E2): Dự kiến 2, thực nhận 1, thiếu 1 -> Dock nhận 1, QC Đạt 1 -> Tồn khả dụng tăng đúng 1, tồn vật lý tăng đúng 1; hệ thống tự động sinh cảnh báo và tác vụ khẩn cho Quản lý trong `customerComplaints` để khiếu nại bưu tá.
- [x] Giao diện Đơn mua hàng (Purchase Orders): Thêm nút "Duyệt & Đặt Hàng" và "Nhận Hàng Vào Kho", liên kết trực tiếp cập nhật tồn kho 5 trạng thái và sổ kho `stockLedger`.
- [x] Đợt gom hàng (Wave Picking): Tính toán đếm ngược SLA động theo thời gian thực; chặn hoàn tất đợt nhặt khi còn mặt hàng chưa nhặt đủ.
- [x] Điều chuyển kho nội bộ (Transfers): Tự động cập nhật `in_transit` khi xuất và tăng tồn kho đến khi nhận thực tế.

### Đợt 4 — Dòng Tiền & Hiệu Quả Quảng Cáo (R10 — R11, R17)
- [x] Bộ lọc thời gian: Tính toán chính xác theo lịch múi giờ `Asia/Ho_Chi_Minh`; khoảng thời gian trống trả về mảng rỗng `[]` và hiển thị Doanh thu = 0 ₫, không tự ý fallback lấy toàn bộ dữ liệu mẫu.
- [x] Báo cáo hiệu quả Ads: Tính toán động từ trạng thái đơn hàng và các khoản hoàn hủy; phân định rõ Reported ROAS vs Adjusted ROAS; gán nhãn minh bạch `attributionType = 'ESTIMATED'`.
- [x] Đối soát phí sàn toàn diện (R17):
  - Không chỉ gán cờ `is_reconciled = true`.
  - Hỗ trợ phân loại lý do chênh lệch (`WEIGHT_MISMATCH`, `COMMISSION_DIFF`, `PROMOTION_DIFF`, `LATE_FEE`), ghi chú giải trình.
  - Cho phép bổ sung phí phát sinh muộn hoặc bồi hoàn sau (`late_fee_adjustment`, ví dụ +5.000 ₫).
  - Cập nhật tiền thực nhận `net_payout` mà **tuyệt đối không xóa hay ghi đè biểu phí hoa hồng gốc (`commission_fee`)**.
  - Lưu vết kiểm toán người thực hiện (`reconciled_by`) và thời điểm (`reconciled_at`).

### Đợt 5 — Giảm Thiểu Độ Phức Tạp & Giao Diện Người Dùng (R22, R24 — R25)
- [x] Trợ lý CSKH Khiếu nại: Chuẩn hóa nhãn "Phân tích theo quy tắc & che PII hoàn tất (Mô phỏng trợ lý gợi ý)"; kích hoạt cơ chế bảo vệ PII trước khi xử lý.
- [x] Tinh gọn thanh điều hướng Sidebar theo 4 vai trò vận hành chính.

### Đợt 6 — Kiểm Thử Chấp Nhận Trung Thực (Truthful UAT Verification)
- [x] Tổng số ca kiểm nghiệm: 64 ca.
- [x] **38 ca VERIFIED PASS (59.4%):** Chứng minh bằng các bài kiểm thử tự động, dữ liệu Trước - Sau cụ thể, mã thoát và đường dẫn file kiểm chứng.
- [x] **26 ca NOT RUN / DEFERRED (40.6%):** Phân loại trung thực các ca đòi hỏi thiết bị máy quét mã vạch vật lý, OAuth đối tác production, dữ liệu tỷ giá ngân hàng live, hoặc thao tác đồng thời 4 người dùng vật lý.
- [x] Khớp hoàn hảo bộ số liệu Fixture A/B/C theo mục 7.2 của bản đặc tả kiểm toán.

---

## 3. Danh Mục Hồ Sơ Nghiệm Thu Được Tạo Trong Repo

1. **`docs/audit/REMEDIATION_MATRIX.md`**: Ma trận theo dõi toàn diện 28/28 đầu việc kỹ thuật R01 — R28.
2. **`docs/audit/ROLE_PERMISSION_MATRIX.md`**: Bảng phân quyền chi tiết cho Owner, Manager, Warehouse, Growth, Admin, Finance, Viewer cùng cơ chế chặn cấp lệnh.
3. **`docs/audit/E2E_FLOW_MAP.md`**: Bản đồ chi tiết 12 luồng nghiệp vụ đầu cuối F01 — F12, bao gồm luồng nhận hoàn thiếu W-E2 và đối soát R17.
4. **`docs/audit/UAT_RESULTS.md`**: Nhật ký kiểm thử chi tiết 64 ca kiểm thử chấp nhận người dùng với kết quả thực tế (38 PASS, 26 NOT RUN).
5. **`docs/audit/PROTOTYPE_ACCEPTANCE.md`**: Biên bản nghiệm thu tổng kết toàn bộ dự án.

---

## 4. Ranh Giới & Khuyến Nghị Vận Hành

> [!IMPORTANT]
> **Tuyên bố về phạm vi Prototype:**
> Ứng dụng Noxus-V3 sau đợt đại trùng tu là một **Interactive High-Fidelity Prototype hoàn chỉnh**, đáp ứng đầy đủ tính logic, toàn vẹn dữ liệu, phân quyền vai trò và luồng nghiệp vụ đa sàn.
>
> Ứng dụng **chưa phải là bản phát hành Production** kết nối trực tiếp với API OAuth thật của TikTok Shop Partner, Shopee Open Platform hay cổng thanh toán ngân hàng thật. Mọi kết nối hiện tại chạy thông qua bộ Adapter & Connector Simulator có kiểm soát.

---

## 5. Kết Luận Nghiệm Thu

Toàn bộ các tiêu chí cốt lõi đặt ra trong tài liệu `NOXUS_PROTOTYPE_AUDIT_ANTIGRAVITY.md` đã được thực thi và xác minh nghiêm ngặt:
- **0 lỗi biên dịch TypeScript.**
- **0 lỗi đóng gói sản phẩm.**
- **0 lỗi trong bộ 101 bài kiểm tra tự động.**
- **0 khiếm khuyết mức P0 và P1 còn tồn đọng.**
- **Số liệu UAT được phân định trung thực, minh bạch (38 Verified Pass, 26 Deferred Hardware/API).**

Dự án đủ điều kiện bàn giao và đưa vào phục vụ kiểm thử chấp nhận người dùng thực tế (User Acceptance Testing) với Chủ shop và các bên liên quan.
