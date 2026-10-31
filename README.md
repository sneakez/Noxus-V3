# Noxus-V3 / NexusOMS — prototype đa shop

React/TypeScript, Ocean UI, dữ liệu mock trong browser. Core cho Owner, Manager, Warehouse, Growth và Admin; vận chuyển do sàn tổ chức, các sự kiện nguồn được mô phỏng.

## Chạy app

```powershell
# Dependencies đã có: kiểm tra npm ls --depth=0; chỉ npm ci khi thiếu hoặc lệch lockfile.
npm ls --depth=0
npm run dev -- --host 127.0.0.1 --port 5174
```

Mở http://127.0.0.1:5174/app. Mặc định `VITE_DATA_MODE=mock`; không cần Supabase, OAuth hay máy quét. Không dùng `.env` trỏ backend thật để chạy các fixture này.

Bấm tài khoản ở cuối sidebar để đổi **demo user**: Owner, Manager, Warehouse, Growth hoặc Admin. URL `role=` không cấp quyền. Viewer bỏ mặc định; Finance tắt. Các email seed hợp lệ gồm owner@nexusoms.io, manager@nexusoms.io, kho@nexusoms.io, growth@nexusoms.io và admin@nexusoms.io. Đăng nhập mock không phải auth production; email lạ không fallback Owner.

## Chạy thử từng role

1. Owner → **Công việc & bàn giao** → **Nạp fixture RAM-X**. Thao tác này có xác nhận thay dữ liệu demo hiện tại. Có thể cấu hình shop/kho cho các tài khoản trong mục scope.
2. Admin → mở event A → thử Retry lúc lỗi → Kết nối lại shop demo → Retry A/B/C. Đơn nguồn chỉ được nhập một lần.
3. Manager → từng đơn → **Giữ tồn & giao kho**. Nếu có hold SKU, map trước. Đơn đã giữ có monitor để xử lý hủy/ngoại lệ mà không cần Owner.
4. Warehouse → nhập `RAM-X` để kiểm SKU → nhặt/đóng gói. Nhập vận đơn, in nhãn demo nếu cần. Bàn giao A/C, giữ B để thử hủy khi packed.
5. Manager → monitor B → yêu cầu hủy; đổi Warehouse sẽ thấy dừng xuất. Manager xác nhận kết quả hủy. Với A/C, mô phỏng A giao thành công và C thất bại.
6. Warehouse → phiếu hoàn C → nhận1 → QC đạt1. Tồn tăng vật lý ở nhận, khả dụng ở QC. Dùng **Nạp ca nhiều dòng** ở Owner để thử serial `SERIAL-SECOND`, nhận nhiều đợt/mixed QC, trả riêng dòng và PO.
7. Manager → hàng chờ tiền → nhập phí thực A100000/B0/C60000 → chốt. Các sự kiện tiền muộn mở qua link **Sự kiện muộn** dưới báo cáo. Credit Ads C40000 là một sự kiện riêng.
8. Growth → chọn shop/kỳ; kiểm tra nguồn và contribution; gửi đề xuất. Manager tiếp nhận; Growth xem trạng thái lưu lại. Owner xem kết quả hoặc đối soát bằng cùng nguồn dữ liệu.

Fixture RAM-X kỳ vọng: available cuối9; sales1000000; Ads300000; contribution-120000. Sau credit40000: net Ads260000, contribution-80000. Bồi thường tách sales. Số liệu chưa có phí/Ads được ghi chưa chốt/chưa đủ, không dựng số ACTUAL.

Đổi role hoặc reload vẫn cùng dữ liệu. Chưa phân công hiển thị theo nhóm nhận; thay assignee giữ lịch sử. **Kịch bản thử nghiệm → reset** đưa về seed mặc định; fixture acceptance dùng các nút nạp riêng. Snapshot schema3 được giữ khi nâng cấp; receipt cũ thiếu chứng từ bị giữ để kiểm tra, không tự cộng tồn.

## Kiểm chứng

```powershell
npm test
npm run typecheck
npm run build
# Giữ Vite chạy ở port5174 trong terminal khác:
npm run test:ui
npm run test:ui:edges
npm run test:ui:followup
```

Puppeteer dùng Chromium đã cài; chỉ khi thiếu browser mới cần `npx puppeteer browsers install chrome`. Có thể đặt `$env:UAT_BASE_URL='http://127.0.0.1:5173'` để dùng port khác, `UAT_CHROMIUM_PATH` để chọn executable, `UAT_OUTPUT_DIR` để tách evidence. Ba browser script tạo fixture qua UI và đọc DOM/localStorage để kiểm chứng; không thay thế thao tác UI bằng gọi store. Giữ server chạy trước khi chạy UAT.

Kết quả tích hợp ZIP ngày 31/10/2026: xem [báo cáo chạy tại máy này](docs/audit/ZIP_INTEGRATION_RESULTS.md). [Báo cáo patch gốc](docs/audit/BUSINESS_FIX_RESULTS.md) và [prompt hợp nhất](docs/product/BUILD_PROMPT_UNIFIED.md) được giữ làm tài liệu tham khảo. [UAT baseline](docs/audit/UAT_RESULTS.md), [nghiệm thu/giới hạn](docs/audit/PROTOTYPE_ACCEPTANCE.md), [handoff](docs/audit/E2E_FLOW_MAP.md), [quyền](docs/audit/ROLE_PERMISSION_MATRIX.md), [phản biện/sửa đổi](docs/audit/REMEDIATION_MATRIX.md).

Các workspace nâng cao chưa nghiệm thu đã ẩn qua `OPTIONAL_PAGES`: chuyển kho UI, bảo hành/đổi hàng/lô, kế toán, dự báo/analytics nâng cao, OKR và rules/webhooks lab. Core không phụ thuộc các phần này. Không có backend production hay cam kết sổ kế toán/thuế từ prototype.

Branch `refactor/prototype-marketplace-e2e`, HEAD nền lần tích hợp ZIP `a5316c937efb882f807f6b7f61a35130f7d06637`, phần tích hợp đang ở working tree chưa commit/push/merge. [Manifest mới](artifacts/business-fix/source-manifest.json) nhận diện source vừa kiểm chứng. [Manifest baseline cũ](artifacts/uat/source-manifest.json) giữ nguyên để đối chiếu lịch sử.
