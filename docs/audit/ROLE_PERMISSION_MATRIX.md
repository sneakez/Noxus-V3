# NOXUS — Ma Trận Phân Quyền & Phạm Vi Vai Trò (Role & Permission Matrix)

**Ngày ban hành:** 30/10/2026 (Asia/Ho_Chi_Minh)  
**Baseline Git Commit:** `b891421eecf1efb6670af93912a04b2a7154a766`  
**Refactor Branch:** `refactor/prototype-marketplace-e2e`  
**Mục tiêu:** Định nghĩa quyền truy cập route, hành động (action), câu lệnh (command), và phạm vi dữ liệu (scope) cho toàn bộ các vai trò trong hệ sinh thái Noxus OMS.

---

## 1. Nguyên Tắc Thiết Kế Phân Quyền

1. **Định danh theo Người dùng (`user_id`), không chỉ theo Tên vai trò:** Mọi thao tác ghi vết (audit trail), phê duyệt, nhận hàng, đổi trạng thái đều ghi nhận `user_id` thực tế của người thực hiện, ngăn chặn việc giả lập danh tính.
2. **Không vượt rào bằng vai trò Chủ shop (Owner No-Bypass Invariant):** Quyền Owner dù toàn quyền quản trị vẫn không thể phá vỡ các bất biến nghiệp vụ (như không thể tạo tồn kho âm, không thể cộng trùng 2 lần khi nhận hàng hoàn, không thể xác nhận giao hàng cho đơn đã hủy).
3. **Phân định rõ ranh giới Kho và Hãng vận chuyển / Sàn:** Nhân viên Kho (`warehouse`) chỉ có trách nhiệm và thẩm quyền đối với việc nhặt hàng, đóng gói và bàn giao cho bưu tá (`shipped`). Trạng thái giao thành công (`delivered`) và xác nhận POD thuộc thẩm quyền của hãng vận chuyển/sàn hoặc người quản lý (`owner`/`manager`).
4. **Đối soát tài chính không ép buộc kế toán:** Vai trò Kế toán (`finance`) được cấu hình tùy chọn và tắt mặc định (`ENABLE_FINANCE_ROLE = false`). Quyền đối soát phí sàn (`finance:reconcile`) được cấp trực tiếp cho Quản lý vận hành (`manager`) và Chủ shop (`owner`).
5. **Loại bỏ vai trò Người xem (`viewer`):** Loại bỏ hoàn toàn khỏi bộ chọn vai trò đang hoạt động. Các tài khoản legacy gán viewer sẽ bị từ chối truy cập các trang vận hành.

---

## 2. Bảng Phân Quyền Nghiệp Vụ Theo Hành Động (Action Matrix)

| Nghiệp vụ / Thao tác | Owner (Chủ shop) | Manager (Vận hành) | Warehouse (Kho) | Growth (Marketing) | Admin (Hệ thống) | Finance (Tùy chọn - OFF) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Xem danh sách đơn hàng** | Toàn bộ shop | Theo shop được giao | Các đơn cần xử lý kho | Xem phân tích (ẩn PII) | Toàn bộ để chẩn đoán | Xem đơn đối soát |
| **Duyệt / Khóa tồn đơn hàng** | ✓ | ✓ | ✗ | ✗ | ✗ (Không duyệt nghiệp vụ) | ✗ |
| **Hủy đơn & Giải phóng tồn** | ✓ | ✓ | ✗ (Chỉ báo lỗi thiếu hàng) | ✗ | ✗ | ✗ |
| **Tạo đợt nhặt hàng (Wave Picking)** | ✓ | ✓ | ✓ (Thực thi) | ✗ | ✗ | ✗ |
| **Đóng gói & Bàn giao bưu tá (Dispatch)** | ✓ | ✓ | ✓ (Nhiệm vụ chính) | ✗ | ✗ | ✗ |
| **Xác nhận POD / Đơn giao thành công** | ✓ (Mô phỏng) | ✓ (Mô phỏng) | ✗ **(BỊ CHẶN TUYỆT ĐỐI)** | ✗ | ✓ (Mô phỏng) | ✗ |
| **Tạo & Duyệt đơn mua hàng (PO)** | ✓ | ✓ | ✗ (Chỉ xem để nhận) | ✗ | ✗ | ✗ |
| **Nhận hàng PO vào kho** | ✓ | ✓ | ✓ (Kiểm đếm thực tế) | ✗ | ✗ | ✗ |
| **Nhận kiện hoàn tại Dock (Pending QC)** | ✓ | ✓ | ✓ (Quét vận đơn hoàn) | ✗ | ✗ | ✗ |
| **Kiểm tra QC hàng hoàn (Pass / Fail)** | ✓ | ✓ | ✓ (Phân loại chất lượng) | ✗ | ✗ | ✗ |
| **Chuyển kho (Xuất / Nhận transfer)** | ✓ | ✓ | ✓ (Tại kho phụ trách) | ✗ | ✗ | ✗ |
| **Điều chỉnh tồn kho ngoài giao dịch** | ✓ (Duyệt lý do) | Đề xuất (Kiểm duyệt) | Ghi nhận chênh lệch kiểm kê | ✗ | ✗ | ✗ |
| **Đối soát phí sàn (Reconcile Fees)** | ✓ | ✓ (Scope reconcile) | ✗ | ✗ | ✗ | ✓ (Nếu bật) |
| **Xem báo cáo P&L, CM1, CM2, CM3** | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| **Xem & Tối ưu chiến dịch Ads / ROAS** | ✓ | Xem tổng quan | ✗ | ✓ (Nhiệm vụ chính) | ✗ | ✗ |
| **Cấu hình kết nối sàn (Channel Mappings)** | ✓ | ✓ | Xem | Xem | ✓ (Cấu hình kỹ thuật) | ✗ |
| **Quản trị người dùng & Phân quyền** | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |

---

## 3. Danh Mục Trang Được Phép Truy Cập (Route Matrix)

Hàm `getAllowedPagesForRole(role)` thực thi kiểm soát truy cập route như sau:

### 3.1. Chủ Shop (`owner`) & Quản Trị Hệ Thống (`admin`)
- **Chỉ huy & Điều hành:** `dashboard`, `operationsAnalytics`, `founderExecution`.
- **Vận hành thương mại:** `orders`, `fulfillment`, `returns`, `customers`.
- **Sản phẩm & Tồn kho:** `products`, `inventory`, `purchaseOrders`, `transfers`, `stockLedger`, `batches`, `warehouses`.
- **Kiểm soát tài chính:** `orderEconomics`, `skuEconomics`, `channelEconomics`, `cashWorkingCapital`, `pricingCalculator`, `ledger`, `feeReconciliation`, `marginControl`, `salesVelocity`, `revenueReport`.
- **Tăng trưởng & Marketing:** `marketingAnalytics`, `customerAnalytics`, `salesAnalytics`, `inventoryAnalytics`.
- **Cấu hình kỹ thuật & Thử nghiệm:** `channelConnections`, `settings`, `auditTrail`, `ownerValidation`, `businessRules`, `simulator`, `bufferRules`, `routingRules`, `channelMapping`, `syncMonitor`, `complaints`, `automationRules`, `webhooks`, `flowGuide`.

### 3.2. Quản Lý Vận Hành (`manager`)
- **Giám sát & Vận hành:** `dashboard`, `operationsAnalytics`, `orders`, `fulfillment`, `returns`, `customers`.
- **Hàng hóa & Kho bãi:** `products`, `inventory`, `purchaseOrders`, `transfers`, `stockLedger`, `batches`, `warehouses`.
- **Kinh tế đơn & Đối soát:** `orderEconomics`, `skuEconomics`, `channelEconomics`, `feeReconciliation`, `pricingCalculator`, `salesVelocity`, `revenueReport`.
- **Phân tích nghiệp vụ:** `marketingAnalytics`, `customerAnalytics`, `salesAnalytics`, `inventoryAnalytics`, `founderExecution`.
- **Quy tắc & Khiếu nại:** `channelConnections`, `auditTrail`, `ownerValidation`, `businessRules`, `simulator`, `bufferRules`, `routingRules`, `channelMapping`, `syncMonitor`, `complaints`, `automationRules`, `flowGuide`.

### 3.3. Nhân Viên Kho (`warehouse`)
- **Trang làm việc:** `dashboard`, `operationsAnalytics`.
- **Thực thi đơn:** `orders` (chỉ xem thông tin giao nhận), `fulfillment` (wave picking & packing).
- **Xử lý hàng:** `returns` (tiếp nhận kiện và kiểm tra QC), `inventory` (tra cứu vị trí kệ và trạng thái 5 tầng), `purchaseOrders` (nhận hàng PO), `transfers` (xuất/nhận chuyển kho), `batches`, `warehouses`, `stockLedger`, `flowGuide`.
- **Bị ẩn hoàn toàn:** Toàn bộ các trang tài chính (`feeReconciliation`, `orderEconomics`, `skuEconomics`, `ledger`), marketing, cấu hình sàn, và quản trị hệ thống.

### 3.4. Chuyên Viên Tăng Trưởng (`growth`)
- **Trang làm việc:** `dashboard`, `orders` (ẩn PII khách hàng), `products`, `inventory`.
- **Phân tích hiệu quả:** `marketingAnalytics`, `customerAnalytics`, `salesAnalytics`, `inventoryAnalytics`, `skuEconomics`, `channelEconomics`, `pricingCalculator`, `founderExecution`, `flowGuide`.
- **Bị ẩn hoàn toàn:** Các trang thao tác xuất nhập kho, xác nhận đơn, duyệt PO, đối soát thanh toán chi tiết.

### 3.5. Người Xem Bị Loại Bỏ (`viewer`)
- **Chính sách:** Trả về mảng rỗng `[]`. Mọi thao tác mutation từ URL hoặc command API đều bị từ chối với thông báo yêu cầu quản trị viên cấp vai trò hợp lệ.

---

## 4. Kiểm Soát Phạm Vi Dữ Liệu (Scope Hierarchy)

```
Tenant (Doanh nghiệp sở hữu)
  └── Channel (Kênh bán: TikTok Shop, Shopee, Lazada, Website)
        └── Shop Identity (Shop ID: ví dụ shop_tiktok_vn_01)
              └── Warehouse Location (Kho: wh_north_01, wh_central_01)
                    └── Inventory 5-State Bucket
                          ├── Physical (Tổng tồn vật lý)
                          ├── Available / Sellable (Khả dụng bán)
                          ├── Reserved (Đang khóa theo đơn)
                          └── Unavailable (Chờ kiểm tra QC / Hư hỏng)
```

- **Scope Shop:** Người dùng được gán shop nào chỉ xem và xử lý đơn hàng thuộc shop đó; không có tình trạng rò rỉ đơn giữa hai shop trên cùng một sàn thương mại điện tử.
- **Scope Kho:** Thao tác nhận hàng và chuyển kho kiểm tra nghiêm ngặt `warehouse_id`. Nhân viên kho W1 không thể xác nhận nhận hàng thay cho kho W2.
