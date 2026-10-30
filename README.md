# Noxus-V3 / NexusOMS — prototype đa shop

React/TypeScript, Ocean UI, dữ liệu mock trong browser. Core cho Owner, Manager, Warehouse, Growth và Admin; vận chuyển do sàn tổ chức, các sự kiện nguồn được mô phỏng.

## Chạy app

```powershell
npm ci
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
```

Puppeteer dùng Chromium đã cài; nếu môi trường chưa có browser, cài bằng `npx puppeteer browsers install chrome`. Có thể đặt `$env:UAT_BASE_URL='http://127.0.0.1:5173'` để dùng port khác. Hai browser script tạo fixture qua UI và đọc DOM/localStorage để kiểm chứng; không thay thế thao tác UI bằng gọi store.

Kết quả hiện tại: 118/118 test, typecheck/build Windows PASS; UI chính14 nhóm và edge8 nhóm PASS. [UAT và evidence](docs/audit/UAT_RESULTS.md), [nghiệm thu/giới hạn](docs/audit/PROTOTYPE_ACCEPTANCE.md), [handoff](docs/audit/E2E_FLOW_MAP.md), [quyền](docs/audit/ROLE_PERMISSION_MATRIX.md), [phản biện/sửa đổi](docs/audit/REMEDIATION_MATRIX.md).

Các workspace nâng cao chưa nghiệm thu đã ẩn qua `OPTIONAL_PAGES`: chuyển kho UI, bảo hành/đổi hàng/lô, kế toán, dự báo/analytics nâng cao, OKR và rules/webhooks lab. Core không phụ thuộc các phần này. Không có backend production hay cam kết sổ kế toán/thuế từ prototype.

Branch `refactor/prototype-marketplace-e2e`, base kiểm chứng b70ec985dc7e78ab86e17e579d07242df13269df. Các báo cáo UAT ghi lại base HEAD và working tree tại thời điểm chạy; commit đóng gói xem bằng `git log -1`. Việc push lên nhánh refactor không triển khai hay merge vào main. [Source manifest](artifacts/uat/source-manifest.json) nhận diện chính xác code được kiểm chứng.
