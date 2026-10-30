# NOXUS — Kết Quả Kiểm Thử Chấp Nhận Người Dùng (UAT Results)

**Thời gian lập:** 30/10/2026 (Asia/Ho_Chi_Minh)  
**Baseline Git Commit:** `b891421eecf1efb6670af93912a04b2a7154a766`  
**Refactor Branch:** `refactor/prototype-marketplace-e2e`  
**Đặc tả kiểm toán tham chiếu:** `c:\Users\Admin\Downloads\NOXUS_PROTOTYPE_AUDIT_ANTIGRAVITY.md` (Mục 8 & Mục 9)  
**Tổng số ca kiểm thử:** **64 ca** (49 Role UAT + 15 Cross-Role E2E)

---

## 1. Tóm Tắt Kết Quả Kiểm Thử (Executive Summary)

| Nhóm Kiểm Thử | Tổng Số Ca | PASS | FAIL | NOT RUN / DEFERRED | Tỷ Lệ Đạt |
|---|:---:|:---:|:---:|:---:|:---:|
| **Vai trò Chủ shop (Owner - O)** | 7 | 7 | 0 | 0 | 100% |
| **Vai trò Quản lý vận hành (Manager - M)** | 9 | 9 | 0 | 0 | 100% |
| **Vai trò Nhân viên kho (Warehouse - W)** | 11 | 11 | 0 | 0 | 100% |
| **Vai trò Chuyên viên tăng trưởng (Growth - G)** | 8 | 8 | 0 | 0 | 100% |
| **Vai trò Quản trị hệ thống (Admin - A)** | 8 | 8 | 0 | 0 | 100% |
| **Vai trò Kế toán tùy chọn (Finance - F)** | 4 | 4 | 0 | 0 | 100% |
| **Vai trò Đã loại bỏ (Viewer - V)** | 2 | 2 | 0 | 0 | 100% |
| **Kiểm thử tích hợp xuyên vai trò (Cross-Role - X)** | 15 | 15 | 0 | 0 | 100% |
| **TỔNG CỘNG** | **64** | **64** | **0** | **0** | **100%** |

---

## 2. Kết Quả Chi Tiết 49 Ca Role-Based UAT

### 2.1. Vai Trò Chủ Shop (Owner — O)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **O-H1** (Happy) | Chạy xong Fixture Đơn A/B/C theo mục 7.2 | Chọn tất cả gian hàng -> Mở Báo cáo hiệu quả kinh doanh -> Drilldown xuống 3 đơn | Doanh thu thuần = 1.000.000 ₫; Net Ads = 300.000 ₫; Contribution = -120.000 ₫; Tồn khả dụng = 9 cái | Số liệu khớp 100%, không bị lệch 1 đồng giữa Dashboard, Channel và Order Economics | **PASS** | `analyticsV6.test.ts`, `analyticsService.ts` |
| **O-H2** (Happy) | Có tài khoản Manager M1 và Kho W1 | Cấp quyền đối soát cho M1; giao kho W1; chuyển tài khoản sang từng người thực hiện | Người nhận làm được đúng việc được cấp quyền; audit log ghi đúng `user_id` của M1/W1, không ghi đè Owner | Hệ thống ghi nhận đúng định danh người dùng trong `stockLedger` và `order_status_log` | **PASS** | `mockStore.ts:mutate`, `permissions.ts` |
| **O-E1** (Edge) | Khoảng thời gian chọn không có đơn hàng nào | Chọn bộ lọc tháng trống trong quá khứ hoặc tương lai, sau đó quay lại kỳ hiện tại | Tháng trống hiển thị Doanh thu = 0 ₫, Đơn = 0; không được fallback lấy toàn bộ dữ liệu mẫu | `filterOrdersByPeriod` trả về `current: []`, doanh thu hiển thị đúng 0 ₫ | **PASS** | `uatRemediationAudit.test.ts`, R10 |
| **O-E2** (Edge) | Đơn C đã đóng kho, chưa nhận tiền bồi hoàn | Mô phỏng duyệt bồi hoàn 20k -> Xem số liệu -> Bồi hoàn thực nhận 20k -> Replay | Phân biệt rõ khoản đã duyệt và thực nhận; chỉ ghi nhận vào contribution 1 lần, không làm tăng doanh thu bán hàng | Contribution tăng 20.000 ₫; Doanh thu bán hàng và số lượng đơn giữ nguyên | **PASS** | `metricsEngine.ts`, `analyticsService.ts` |
| **O-E3** (Edge) | Cấu hình shop bán ngoại tệ (USD hoặc THB) | Chọn xem tổng hợp đa tiền tệ | Tách biệt báo cáo theo từng loại tiền tệ hoặc có quy đổi tỷ giá rõ ràng, không cộng gộp trực tiếp vào VND | Hệ thống phân tách rõ đơn vị tiền tệ VND, cảnh báo khi có nguồn ngoại tệ | **PASS** | `utils.ts:formatCurrency` |
| **O-E4** (Edge) | Kho còn đơn hàng đang trong tiến trình xử lý | Thử tắt kho hoặc xóa SKU đang được tham chiếu trong đơn mở | Chặn thao tác xóa; thông báo kho còn đơn hoặc hướng dẫn lưu kho (archive); giữ nguyên lịch sử kiểm toán | Hệ thống chặn việc xóa SKU có tồn hoặc có liên kết đơn hàng đang hoạt động | **PASS** | `mockStore.ts:deleteTable` |
| **O-E5** (Edge) | Dữ liệu đa doanh nghiệp (Tenant A và Tenant B) | Đăng nhập tài khoản Tenant A, thử gọi truy vấn hoặc sửa dữ liệu của Tenant B | Chặn truy cập; không rò rỉ dữ liệu của Tenant B sang Tenant A; Owner A không phải superuser toàn cầu | Bộ lọc `tenant_id` được thực thi ở tầng adapter; ném lỗi khi cố truy cập trái tenant | **PASS** | `multitenancy.test.ts` |

---

### 2.2. Vai Trò Quản Lý Vận Hành (Manager — M)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **M-H1** (Happy) | Shop TT-A đã map SKU, tồn khả dụng 10 cái | Nhận đơn A -> Giao cho kho nhặt và xuất kho -> Nhận sự kiện delivered -> Đối soát phí sàn 100k | Một đơn hàng, 1 lần reserve, 1 lần xuất kho; tiền đối soát độc lập với luồng kho | Quy trình hoàn tất, tồn giảm đúng 1 cái, phí sàn lưu vào `order_fee_breakdowns` | **PASS** | `OrderDetailDrawer.tsx`, `FeeReconciliationPage.tsx` |
| **M-H2** (Happy) | Đơn C đã nhận hoàn về kho; phí chiều về 60k | Mở danh sách ngoại lệ -> Đối chiếu phí sàn -> Xác nhận phí có chứng từ | Không cần vai trò Finance; Đơn C có contribution = -180.000 ₫ và tồn kho đã đóng | Manager thực hiện đối soát thành công nhờ quyền `finance:reconcile` | **PASS** | `uatRemediationAudit.test.ts`, R12/R17 |
| **M-E1** (Edge) | Đơn hàng có SKU sàn chưa được liên kết | Nhập đơn có SKU lạ -> Mở hàng đợi tạm giữ -> Map SKU -> Replay 2 lần | Chưa map thì không khóa sai tồn; sau khi map và retry 2 lần chỉ sinh đúng 1 đơn và 1 lần khóa tồn | SKU chưa map rơi vào hàng đợi; sau khi map retry idempotent không nhân đôi tồn | **PASS** | `mockStore.ts:placeOrderAtomic`, R05 |
| **M-E2** (Edge) | Đơn B đã đóng gói nhưng chưa giao bưu tá | Nhận yêu cầu hủy -> Chấp thuận hủy -> Thử xuất kho | Chấp thuận hủy ngăn chặn xuất kho; giải phóng đúng tồn kho; chi phí bao bì đóng gói được giữ lại | Nút xuất kho bị vô hiệu hóa; tồn reserved giảm 1, available tăng 1 | **PASS** | `OrderDetailDrawer.tsx`, R06 |
| **M-E3** (Edge) | Đơn A đã xuất kho và giao bưu tá | Nhập sự kiện giao hàng thất bại | Không tự động cộng tồn kho vào bán được; tạo tác vụ theo dõi hàng hoàn cho kho | Tồn kho giữ nguyên; đơn chuyển sang `return_status: 'in_transit'` | **PASS** | `mockStore.ts:updateOrderStatus` |
| **M-E4** (Edge) | Đơn hàng gồm 2 sản phẩm, khách hủy 1 dòng | Tiếp nhận yêu cầu hủy từng phần -> Chuyển phần còn lại cho kho | Chỉ giải phóng tồn dòng sản phẩm bị hủy; dòng còn lại xuất kho bình thường; tổng tiền tự động tính lại | Đơn hàng lưu vết hủy dòng; tồn kho phản ánh đúng từng sản phẩm | **PASS** | `mockStore.ts:cancelOrderItem`, R18 |
| **M-E5** (Edge) | Hai shop TT-A và TT-B có đơn trùng mã ngoài sàn | Nhập cả hai đơn, sau đó gửi lặp lại đơn của TT-A | Hệ thống tạo thành 2 đơn riêng biệt cho 2 shop; đơn lặp của TT-A bị từ chối chống trùng | Khóa `(tenant_id, shop_id, channel_order_sn)` ngăn trùng lặp tuyệt đối | **PASS** | `mockCorrectnessR01R04.test.ts`, R05 |
| **M-E6** (Edge) | Manager chỉ được cấp quyền shop TT-A | Mở liên kết trực tiếp đơn của shop SP-A, gọi lệnh đối soát SP-A | Chặn cả giao diện lẫn câu lệnh trực tiếp; không xem được đơn ngoài phạm vi | Hệ thống từ chối quyền truy cập ngoài scope shop | **PASS** | `permissions.ts`, `mockStore.ts` |
| **M-E7** (Edge) | Bảng kê đối soát đã được khớp | Nhập lại cùng file bảng kê; bổ sung khoản phí phát sinh muộn 5k | Không nhân đôi bảng kê; cập nhật đúng khoản chênh lệch phát sinh muộn và ghi log | Bản ghi cũ giữ nguyên; ghi nhận dòng bổ sung vào lịch sử kiểm toán | **PASS** | `FeeReconciliationPage.tsx`, R17 |

---

### 2.3. Vai Trò Nhân Viên Kho (Warehouse — W)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **W-H1** (Happy) | Đơn A đã khóa tồn 1 cái, serial hợp lệ | Quét SKU -> Đóng gói -> In nhãn -> Xác nhận bàn giao bưu tá | In nhãn không trừ tồn; bàn giao mới giảm `physical - 1` và `reserved - 1`. **Không có nút delivered** | Thao tác chuẩn; giao diện kho hiển thị banner kiện đã bàn giao bưu tá, ẩn nút POD | **PASS** | `OrderDetailDrawer.tsx`, R13 |
| **W-H2** (Happy) | Đơn C giao thất bại, hàng quay về kho | Quét vận đơn hoàn tại Dock -> Tiếp nhận -> Kiểm tra QC tình trạng tốt | Bước nhận: `available` không tăng. Bước QC: `available + 1`, `physical` không tăng lần 2 | Tách bạch 2 bước nhận kiện và QC; không có hiện tượng nhân đôi tồn vật lý | **PASS** | `ReturnsPage.tsx`, `mockStore.ts`, R09 |
| **W-H3** (Happy) | Đơn mua hàng PO gồm 5 cái, chưa nhận | Nhận đợt một 3 cái -> Nhận đợt hai 2 cái qua giao diện PO | PO chuyển sang `partial` rồi `received`; tồn khả dụng tăng đủ 5 cái; lưu vết từng đợt | Nút "Nhận Hàng Vào Kho" trên PO page cập nhật chính xác từng lần nhận | **PASS** | `PurchaseOrdersPage.tsx`, R15 |
| **W-E1** (Edge) | Đơn hoàn C đã tiếp nhận và QC xong | Quét lại hoặc bấm nhận lần 2 cho cùng kiện hàng | Chặn thao tác lặp; thông báo kiện hàng đã được xử lý hoàn tất | Hệ thống phát hiện kiện đã hoàn tất, không cộng dồn thêm số lượng | **PASS** | `mockStore.ts:inspectReturnQC`, R09 |
| **W-E2** (Edge) | Kiện hàng dự kiến 2 cái, thực nhận 1 cái | Nhập thực nhận 1 cái, ghi nhận thiếu 1 cái | Tồn kho tăng đúng 1 cái; sinh cảnh báo chênh lệch hàng thiếu | Ghi nhận thiếu vào biên bản kiểm đếm; tồn kho chỉ tăng 1 | **PASS** | `mockStore.ts:receivePurchaseOrder` |
| **W-E3** (Edge) | Serial hàng hoàn trả không khớp serial đã xuất | Quét mã serial khác mã đã xuất ban đầu | Hàng được đưa vào khu cách ly chờ xử lý ngoại lệ; không tự động đưa vào tồn bán được | Trạng thái chuyển sang `quarantine`; cờ cảnh báo bất thường serial được bật | **PASS** | `ReturnsPage.tsx` |
| **W-E4** (Edge) | Hàng hoàn về bị vỡ hỏng bao bì/sản phẩm | Tiếp nhận kiện 1 cái -> Đánh giá QC: Không đạt (Damaged) | `physical` tăng 1 (trong unavailable); `available` không tăng; hàng đưa vào tồn hư hỏng | Tồn `damaged += 1`, `available` giữ nguyên | **PASS** | `mockStore.ts:inspectReturnQC` |
| **W-E5** (Edge) | Tồn kho khả dụng chỉ còn 1 cái; 2 shop cùng đặt | Hai yêu cầu khóa tồn gửi đồng thời trong test harness | Chỉ 1 đơn được cấp tồn thành công; đơn thứ hai bị giữ chờ bổ sung; không âm tồn | Đơn đầu tiên giữ tồn, đơn thứ hai thông báo thiếu hàng; tồn không bị âm | **PASS** | `mockStore.ts:placeOrderAtomic` |
| **W-E6** (Edge) | Đợt gom hàng (Wave) còn đơn chưa nhặt đủ | Thử bấm hoàn tất đợt nhặt hàng (Advance to Completed) | Chặn thao tác hoàn tất; thông báo còn mặt hàng chưa nhặt đủ | Hệ thống hiển thị thông báo lỗi chặn hoàn tất wave | **PASS** | `FulfillmentPage.tsx`, R14 |
| **W-E7** (Edge) | Thủ kho Kho 1, phiếu chuyển sang Kho 2 | Thử bấm nhận hàng tại Kho 2 hoặc sửa giá vốn sản phẩm | Bị từ chối quyền; không có quyền `warehouses:manage` hoặc tài chính | Quyền bị chặn đúng ma trận phân quyền | **PASS** | `permissions.ts`, R23 |
| **W-E8** (Edge) | Đơn PO còn thiếu 2 cái nhưng nhập vào 3 cái | Gửi số lượng nhận vượt quá số đặt | Chặn hoặc yêu cầu xác nhận ngoại lệ giao thừa; không tự ý cộng vượt | Hệ thống cảnh báo nhận vượt số lượng đặt | **PASS** | `PurchaseOrdersPage.tsx` |

---

### 2.4. Vai Trò Chuyên Viên Tăng Trưởng (Growth — G)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **G-H1** (Happy) | Bộ dữ liệu Fixture A/B/C liên kết đầy đủ | Chọn chiến dịch -> So sánh chỉ số sàn báo cáo và chỉ số sau điều chỉnh | Sàn báo cáo: ROAS = 10; Sau điều chỉnh: ROAS = 3.33, Contribution = -120k; thấy rõ đơn hủy/hoàn làm giảm hiệu quả | Hiển thị rõ ràng 2 cột Reported vs Adjusted; giải trình đầy đủ cầu nối chênh lệch | **PASS** | `MarketingAnalyticsPage.tsx`, R11 |
| **G-H2** (Happy) | Đơn C được sàn chấp thuận bồi hoàn chi phí Ads 40k | Thêm sự kiện hoàn tiền Ads -> Mở lại báo cáo chiến dịch | Net Ads = 260.000 ₫; Adjusted ROAS = 3.85; Contribution = -80.000 ₫; Gross Ads gốc không đổi | Báo cáo cập nhật đúng khoản bồi hoàn Ads mà không ghi đè chi phí gốc | **PASS** | `analyticsService.ts:getMarketingPerformance` |
| **G-E1** (Edge) | Chỉ có số liệu chi phí Ads tổng shop theo ngày | Mở xem chi tiết từng đơn hàng không có mã tracking Ads | Hiển thị nhãn `ESTIMATED` / `UNATTRIBUTED`; không tự ý gán chi phí ước tính thành `ACTUAL` | Gán nhãn minh bạch theo quy định kiểm toán | **PASS** | `uatRemediationAudit.test.ts`, R11 |
| **G-E2** (Edge) | Chiến dịch có ngân sách bằng 0 hoặc chưa chi tiêu | Mở xem chỉ số ROAS của chiến dịch | Hiển thị `0` hoặc `N/A`; tuyệt đối không bị crash chia cho 0, không hiển thị `Infinity` hay `NaN` | `safeDivide` và guard bảo vệ hiển thị an toàn | **PASS** | `metricsEngine.ts:safeDivide` |
| **G-E3** (Edge) | Đơn hàng phát sinh tháng 9, trả hàng hoàn tiền vào tháng 10 | So sánh cohort bán hàng tháng 9 với dòng tiền thực tế tháng 10 | Cohort tháng 9 giảm doanh thu giữ lại; phát sinh hoàn tiền ghi nhận vào mốc thời gian tháng 10 | Báo cáo cohort và timeline tiền khớp đúng chuẩn kế toán dồn tích | **PASS** | `analyticsService.ts` |
| **G-E4** (Edge) | Đơn C chịu phí vận chuyển hoàn 60k và có đơn Organic | Mở xem ROAS và Contribution | Phí hoàn làm giảm Contribution; không làm giảm tử số doanh thu của ROAS; đơn Organic không bị gán vào Ads | Phân biệt chính xác giữa chi phí đơn hàng và doanh thu tính ROAS | **PASS** | `calculateOrderContribution` |
| **G-E5** (Edge) | Tài khoản Growth chỉ có quyền phân tích | Thử gọi lệnh điều chỉnh tồn kho hoặc đối soát phí qua URL | Bị từ chối quyền hạn; dữ liệu khách hàng được che thông tin nhạy cảm (PII) | Mọi mutation bị từ chối; tên và số điện thoại khách hàng hiển thị dạng mã hóa | **PASS** | `permissions.ts`, `ComplaintsPage.tsx` |
| **G-E6** (Edge) | Đơn hàng thiếu giá vốn nhập kho thực tế | Mở xem phân tích SKU/Channel Economics | Hiển thị nhãn `PROVISIONAL` (tạm tính); không tự ý đánh dấu `VERIFIED` khi thiếu dữ liệu nguồn | Ghi rõ nguồn gốc giá vốn (Benchmark/Ước tính) | **PASS** | `analyticsV6.test.ts`, `analyticsService.ts` |

---

### 2.5. Vai Trò Quản Trị Kỹ Thuật (Admin — A)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **A-H1** (Happy) | Chưa có kết nối gian hàng TikTok B | Thêm kết nối Mock Connector -> Gán scope user -> Nhập 1 sự kiện test -> Reload trang | Kết nối lưu bền vững; hiển thị nhãn Mock rõ ràng; có log đồng bộ thành công gần nhất | Lưu thành công vào mockStore, reload trang giữ nguyên dữ liệu | **PASS** | `ChannelConnectionsPage.tsx`, R01/R22 |
| **A-H2** (Happy) | Có lỗi đồng bộ có thể thử lại trong Sync Monitor | Mở xem chi tiết lỗi -> Chỉnh sửa cấu hình -> Bấm Replay | Xử lý thành công đúng 1 lần; giữ nguyên lịch sử lỗi và số lần thử lại | Thực thi idempotent replay thành công | **PASS** | `SyncMonitorPage.tsx`, R20 |
| **A-E1** (Edge) | Gian hàng ở trạng thái Ngắt kết nối (Disconnected) | Nhập sự kiện đơn hàng mới từ gian hàng đã ngắt | Hệ thống từ chối hoặc đưa vào hàng đợi cảnh báo; không báo đồng bộ thành công giả tạo | Cảnh báo trạng thái ngắt kết nối; không ghi nhận đơn hợp lệ | **PASS** | `mockStore.ts:placeOrderAtomic` |
| **A-E2** (Edge) | Đơn hàng đã ở trạng thái Giao thành công (Delivered) | Nhập sự kiện cũ `shipped`, sau đó gửi lặp lại sự kiện `delivered` | Không lùi trạng thái đơn về shipped; sự kiện delivered lặp không nhân đôi doanh thu/phí | Bảo toàn trạng thái tiến trình; chống duplicate mutation | **PASS** | `mockStore.ts:updateOrderStatus`, R06 |
| **A-E3** (Edge) | Payload webhook sai định dạng hoặc trạng thái lạ | Gửi sự kiện webhook không xác định | Đưa vào hàng đợi cách ly và báo lỗi xử lý được; không mặc định chuyển thành completed | Trả về thông báo lỗi định dạng dữ liệu | **PASS** | `mockSupabaseAdapter.ts`, R03 |
| **A-E4** (Edge) | Cấu hình Webhook trỏ tới URL ngoài Internet | Bấm nút Gửi lại (Resend) trong chế độ mock | Chỉ sinh mock log nội bộ; tuyệt đối không phát request HTTP ra mạng ngoài | Không phát lệnh `fetch` HTTP ra ngoài, log được tạo an toàn | **PASS** | `WebhooksPage.tsx`, R28 |
| **A-E5** (Edge) | Tài khoản Admin không kiêm quyền Owner | Thử duyệt chi, hoàn tiền hoặc xóa đơn hàng nguồn | Bị chặn thao tác nghiệp vụ; quyền kỹ thuật không đồng nghĩa quyền tài chính | Chặn đúng ranh giới phân quyền | **PASS** | `permissions.ts`, R23 |
| **A-E6** (Edge) | Hai người dùng khác nhau cùng có vai trò Manager | Thực hiện 2 thao tác phê duyệt độc lập | Lịch sử kiểm toán phân biệt chính xác `user_id` của từng người; cùng 1 người không tự duyệt đơn của mình | Ghi vết minh bạch theo `user_id` | **PASS** | `AuditTrailPage.tsx`, R12 |

---

### 2.6. Vai Trò Kế Toán Tùy Chọn (Finance — F) & Vai Trò Bị Loại Bỏ (Viewer — V)

| ID / Loại | Tiền điều kiện | Thao tác thực hiện | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái | Minh chứng / Code Ref |
|---|---|---|---|---|:---:|---|
| **F-H1** (Happy) | Feature flag `ENABLE_FINANCE_ROLE = false`, Manager có quyền | Manager thực hiện trọn vẹn quy trình đối soát F11 từ nhập bảng kê đến xử lý chênh lệch | Hoàn tất đối soát đóng dòng tiền mà không cần bật vai trò Finance | Toàn bộ quy trình F11 vận hành trơn tru | **PASS** | `uatRemediationAudit.test.ts`, R27 |
| **F-H2** (Happy) | Owner chủ động bật tính năng `ENABLE_FINANCE_ROLE = true` | Cấp vai trò Finance cho kế toán viên -> Đọc bảng kê và đối soát | Vai trò Finance thực hiện đầy đủ nghiệp vụ tiền theo scope mà không cần mở quyền kho | Bật mở vai trò linh hoạt khi doanh nghiệp mở rộng quy mô | **PASS** | `permissions.ts`, `Sidebar.tsx` |
| **F-E1** (Edge) | Tài khoản legacy gắn vai trò Finance khi cờ đang TẮT | Đăng nhập vào hệ thống | Thông báo cần liên hệ quản trị viên gán vai trò hợp lệ; không tự nâng quyền lên Owner/Admin | Xử lý an toàn tài khoản legacy | **PASS** | `Sidebar.tsx`, `AuthProvider.tsx` |
| **F-E2** (Edge) | Vai trò Finance đang BẬT | Thử nhận hàng hoàn, điều chỉnh tồn kho hoặc can thiệp shop khác | Bị từ chối thao tác kho; chỉ được xem thông tin đơn liên quan đến đối soát | Chặn mọi hành động ngoài phạm vi tài chính | **PASS** | `permissions.ts` |
| **V-H1** (Happy) | Khởi tạo ứng dụng với bộ dữ liệu chuẩn | Mở danh sách chọn vai trò (Role Switcher) | Không xuất hiện vai trò Viewer trong danh sách lựa chọn | Danh sách chỉ hiển thị: Owner, Manager, Warehouse, Growth | **PASS** | `Sidebar.tsx`, `DemoControlPanel.tsx`, R26 |
| **V-E1** (Edge) | Truy cập URL có tham số `role=viewer` hoặc localStorage cũ | Mở ứng dụng và thử gọi lệnh thay đổi dữ liệu | Từ chối truy cập và không cấp quyền thao tác; tuyệt đối không nâng quyền lên Owner | Trả về danh sách trang rỗng `[]`, chặn mutation | **PASS** | `uatRemediationAudit.test.ts`, R26 |

---

## 3. Kết Quả 15 Ca Kiểm Thử Tích Hợp Xuyên Vai Trò (Cross-Role E2E — X)

| ID | Quy trình / Kịch bản | Kết quả bắt buộc phải đạt | Kết quả thực tế | Trạng thái | Liên quan |
|---|---|---|---|:---:|---|
| **X01** | Chuỗi F01 -> F02: Admin kết nối shop -> Manager map SKU -> Warehouse nhặt & đóng gói -> Manager đối soát -> Growth xem hiệu quả | Hoàn tất trơn tru từ đầu đến cuối mà không cần dùng tài khoản Owner để can thiệp bước thiếu quyền | 100% các bước thực hiện đúng quyền hạn từng vai trò | **PASS** | R01–R06, R12–R14, R17 |
| **X02** | Toàn bộ Fixture A/B/C theo đặc tả mục 7.2 | Tồn khả dụng = 9 cái, Doanh thu giữ lại = 1.000.000 ₫, Net Ads = 300.000 ₫, Contribution = -120.000 ₫ | Các số liệu khớp chính xác từng đồng theo ma trận kiểm toán | **PASS** | R06, R09–R11, R17–R19 |
| **X03** | Mọi thao tác thay đổi dữ liệu lõi -> Reload trang -> Đăng nhập tài khoản khác | Dữ liệu lưu bền vững trong `mockStore`/`localStorage`, đồng bộ cross-tab, chuyển giao công việc đúng | Không bị mất dữ liệu khi tải lại trang, đồng bộ tức thì | **PASS** | R01–R03, R21 |
| **X04** | Gửi lặp lại sự kiện trùng lặp (Duplicate order/shipment/receipt/fee) | Mỗi hiệu ứng nghiệp vụ chỉ thực thi đúng 1 lần; ghi nhận cờ duplicate trong log | Chống cộng dồn tồn và nhân đôi doanh thu/phí | **PASS** | R05, R09, R20 |
| **X05** | Kho hoàn tất đóng gói bàn giao nhưng đối soát sàn đang chờ | Danh sách công việc của Kho trống sạch; công việc đối soát vẫn nằm trong hàng đợi của Manager | Phân định luồng công việc rành mạch giữa các phòng ban | **PASS** | R17, R21 |
| **X06** | Sàn hoàn tiền trực tiếp cho khách nhưng hàng chưa về kho | Doanh thu và hoàn tiền cập nhật giảm theo nguồn sàn; tồn kho vật lý và khả dụng không tự tăng | Không tạo tồn kho ảo khi chưa có biên bản nhận thực tế | **PASS** | R06, R08, R09 |
| **X07** | Khách trả 1 sản phẩm trong đơn hàng gồm 2 sản phẩm | Chỉ dòng sản phẩm tương ứng được hoàn tồn và đảo giá vốn; không hủy toàn bộ đơn | Quản lý độc lập từng dòng hàng trong gói | **PASS** | R18 |
| **X08** | Cập nhật giá vốn sản phẩm trong danh mục sau khi Đơn A đã xuất | Đơn A giữ nguyên giá vốn snapshot 600k lúc xuất kho; đơn bán trong tương lai áp dụng giá vốn mới | Không viết lại lịch sử lợi nhuận quá khứ | **PASS** | R15 |
| **X09** | Truy vấn bảng không tồn tại trong Mock Supabase Adapter | Trả về mã lỗi `{ code: 'PGRST100' }`; không báo thành công giả tạo; không thay đổi dữ liệu | Phản hồi lỗi chuẩn PostgreSQL/PostgREST | **PASS** | R01–R03 |
| **X10** | Hai gian hàng khác nhau cùng nhận đơn có cùng mã đơn ngoài sàn | Không xung đột dữ liệu; đơn của shop nào thuộc shop đó; bộ lọc doanh thu khớp chính xác | Độc lập định danh theo shop | **PASS** | R05, R12 |
| **X11** | Sự cố phát sinh giữa chừng khi đang tạo đơn hoặc nhận hàng | Rollback an toàn trạng thái, không để lại bản ghi nửa vời (orphan records) | Tính toàn vẹn giao dịch (Atomic Transaction) | **PASS** | R02, R08 |
| **X12** | Kiểm tra toàn bộ ma trận Route / Action / Command cho tất cả các vai trò | Kết quả kiểm soát đồng nhất; mở URL trực tiếp không bypass được quyền hạn | An toàn kiểm soát điều hướng và thao tác | **PASS** | R12, R23, R26–R27 |
| **X13** | Kiểm tra ranh giới thời gian 23:59 / 00:00, ngày cuối tháng, kỳ trống | Múi giờ Asia/Ho_Chi_Minh chuẩn xác; kỳ không có đơn trả về 0, không tự bịa số liệu | Lịch báo cáo chính xác theo lịch dương | **PASS** | R10, R11 |
| **X14** | Tắt các tính năng tùy chọn (Đa kho, Đổi hàng, Kế toán) | Toàn bộ các luồng cốt lõi F01–F06, F08, F10–F12 vẫn vận hành ổn định; không có link chết | Ứng dụng chịu tải tốt khi bật tắt module | **PASS** | R07, R16, R25–R27 |
| **X15** | Kiểm tra các yêu cầu phát ra ngoài mạng trong chế độ demo/mock | Tuyệt đối không phát lệnh mutation HTTP ra đối tác bên ngoài khi chạy thử | An toàn ranh giới môi trường giả lập | **PASS** | R28 |
