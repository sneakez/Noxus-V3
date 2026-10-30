import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const results = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: true, cases: [], errors: [] };
page.on('pageerror', e => results.errors.push(String(e)));
page.on('dialog', d => d.accept());
const snap = () => page.evaluate(() => JSON.parse(localStorage.getItem('nexus_mock_db_v2')));
const button = async text => { const s = `xpath/.//button[normalize-space(.)='${text}']`; await page.waitForSelector(s); await page.click(s); };
const task = async id => { await page.waitForSelector(`[data-task="${id}"]`); await page.click(`[data-task="${id}"]`); };
const input = async (name, value) => { const s = `[aria-label="${name}"]`; await page.waitForSelector(s); await page.click(s); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); if (String(value)) await page.type(s, String(value)); };
const labels = { owner: '👑 Chủ Doanh Nghiệp (Owner)', admin: '⚡ Admin Quản Trị', manager: '📊 Trưởng Phòng OMS', warehouse: '📦 Nhân Viên Kho', growth: '🚀 Tăng Trưởng & Ads' };
const role = async r => {
  await page.click('button[title="Nhấn để chuyển đổi vai trò (Role Switcher)"]');
  const s = `xpath/.//button[.//p[normalize-space(.)='${labels[r]}']]`; await page.waitForSelector(s); await page.click(s);
  await page.waitForFunction(r => document.querySelector('[data-testid="work-queue"]')?.innerText.includes(`${r} ·`), {}, r);
};
const report = async (name, expected, actual) => {
  assert.deepEqual(actual, expected, name); results.cases.push({ name, status: 'PASS', expected, actual });
  await new Promise(resolve => setTimeout(resolve, 450)); // wait for modal exit/card entrance before evidence capture
  await page.screenshot({ path: `artifacts/uat/edge-${results.cases.length}.png`, fullPage: true });
};
try {
  await page.goto(`${base}/app`); await page.waitForSelector('[data-testid="work-queue"]');
  await button('Nạp ca nhiều dòng');
  await role('admin'); await task('sync:acceptance-event-A'); await button('Kết nối lại shop demo'); await button('Retry sự kiện nguồn');
  await role('manager'); await task('release:acceptance-A'); await button('Giữ tồn & giao kho');
  await role('warehouse'); await task('warehouse:acceptance-A'); await input('Ngoại lệ kho', 'Ảnh kiểm đếm: thiếu hộp ngoài, dừng đóng gói'); await button('Báo chặn cho Vận hành');
  await role('manager'); await task('monitor:acceptance-A'); assert.match(await page.$eval('[data-testid="task-detail"]', e => e.innerText), /thiếu hộp ngoài/); await button('Đã xử lý bằng chứng · cho kho làm tiếp');
  await role('warehouse'); await task('warehouse:acceptance-A'); await input('SKU hoặc serial', 'RAM-X,WRONG'); await button('Kiểm SKU & nhặt hàng');
  await report('Wrong serial blocks picking after operational handoff', 'allocated', (await snap()).orders[0].fulfillment_status);
  await input('SKU hoặc serial', 'RAM-X,SERIAL-SECOND'); await button('Kiểm SKU & nhặt hàng'); await button('Đóng gói · chi phí demo 20.000 ₫');
  await input('Mã vận đơn', 'MULTILINE-TRACK'); const popupPromise = new Promise(resolve => page.once('popup', resolve)); await button('In nhãn kiện demo'); const popup = await popupPromise; await popup.waitForFunction(() => document.body.innerText.includes('MULTILINE-TRACK')); assert.match(await popup.evaluate(() => document.body.innerText), /RAM-X × 2/); await popup.close();
  await report('Printable label carries tracking and actual multi-line quantities', true, true);
  await button('Xác nhận kho bàn giao'); await role('manager'); await task('carrier:acceptance-A'); await button('Sàn báo giao thành công');
  await page.click('xpath/.//summary[normalize-space(.)="Tạo phiếu trả theo dòng hàng"]');
  await page.select('[aria-label="Đơn trả một phần"]', 'acceptance-A'); await input('Lượng trả ram-x', 2); await input('Tiền đề nghị hoàn', 2000000); await input('Lý do trả hàng', 'Trả hai RAM, giữ dòng SECOND'); await button('Tạo phiếu & giao nhóm Kho');
  let state = await snap(); const ret = state.returns[0]; const line = state.returnItems.find(i => i.return_id === ret.id);
  await report('Partial RMA only includes requested product, money still independent', [1, 'delivered', 3000000], [state.returnItems.length, state.orders[0].status, state.orders[0].total]);
  await role('warehouse'); await task(`return:${ret.id}`); await input(`Nhận ${line.id}`, 1); await button('Lưu thực nhận'); await input(`Đạt ${line.id}`, 1); await button('Lưu kết quả QC');
  await page.reload(); await page.waitForSelector('[data-testid="work-queue"]'); await task(`return:${ret.id}`); await input(`Nhận ${line.id}`, 1); await button('Lưu thực nhận'); await input(`Lỗi ${line.id}`, 1); await button('Lưu kết quả QC');
  state = await snap();
  await report('Two receipt batches, mixed QC; remaining product stays shipped', [10, 9, 1, 4], [state.inventory5State[0].physical, state.inventory5State[0].available, state.inventory5State[0].damaged, state.inventory5State[1].physical]);
  assert.equal(state.returnReceipts.length, 2);
  await role('manager'); await task(`discrepancy:${ret.id}`); await input('Kết quả khiếu nại', 'Đủ hai đợt, một RAM hỏng; lưu ảnh và hồ sơ yêu cầu bồi thường'); await button('Chốt xử lý chênh lệch');
  await page.goto(`${base}/app?page=dashboard&sourceOrder=acceptance-A`); await page.waitForSelector('[data-testid="work-queue"]'); await task('source:acceptance-A'); await input('Số tiền nguồn', 2000000); await button('Nhận sự kiện refund');
  state = await snap(); await report('Partial refund preserves delivered status and remaining line, sales 1000000', ['delivered', 2000000, 'partially_paid'], [state.orders[0].status, state.orders[0].refunded_amount, state.orders[0].payment_status]);
  await role('growth'); assert.match(await page.$eval('[data-testid="commerce-summary"]', e => e.innerText), /1\.000\.000/);
  await role('owner'); await page.click('xpath/.//summary[normalize-space(.)="Tài khoản demo & phạm vi được giao"]');
  await page.select('[aria-label="Tài khoản cấu hình scope"]', 'mship_warehouse'); await input('Scope kho', 'wh_south_01'); await button('Lưu phạm vi tài khoản');
  await role('warehouse'); await report('Warehouse scoped away from source warehouse sees no tasks or RAM inventory', [0, false], [await page.$$eval('[data-task]', e => e.length), await page.$eval('[data-testid="work-queue"]', e => e.innerText.includes('RAM-X ·'))]);
  await role('owner'); await page.click('xpath/.//summary[normalize-space(.)="Tài khoản demo & phạm vi được giao"]');
  await page.select('[aria-label="Tài khoản cấu hình scope"]', 'mship_warehouse'); await input('Scope kho', ''); await button('Lưu phạm vi tài khoản');
  await role('warehouse'); await page.goto(`${base}/app?page=purchaseOrders`);
  await page.waitForSelector('xpath/.//span[normalize-space(.)="PO-ACCEPTANCE"]'); await page.click('xpath/.//span[normalize-space(.)="PO-ACCEPTANCE"]');
  await page.waitForSelector('xpath/.//button[contains(.,"Nhận Hàng Vào Kho")]'); await page.click('xpath/.//button[contains(.,"Nhận Hàng Vào Kho")]');
  await input('Nhận PO acceptance-po-item', 1); await button('Lưu đợt nhận PO');
  let poState = await snap(); await report('PO UI first receipt is partial and stock +1', ['partial', 11], [poState.purchaseOrders[0].status, poState.inventory5State[0].physical]);
  await page.waitForSelector('xpath/.//button[contains(.,"Nhận Hàng Vào Kho")]'); await page.click('xpath/.//button[contains(.,"Nhận Hàng Vào Kho")]');
  await input('Nhận PO acceptance-po-item', 4); await button('Lưu đợt nhận PO');
  assert.match(await page.$eval('[role="alert"]', e => e.innerText), /không hợp lệ/);
  await input('Nhận PO acceptance-po-item', 3); await button('Lưu đợt nhận PO');
  poState = await snap(); await report('PO UI next receipt completes only remaining 3; preserves weighted MAC precision', ['received', 14, 685714], [poState.purchaseOrders[0].status, poState.inventory5State[0].physical, Math.round(poState.products[0].moving_avg_cost)]);
  assert.deepEqual(results.errors, []); results.status = 'PASS';
} catch (e) {
  results.status = 'FAIL'; results.failure = String(e); await page.screenshot({ path: 'artifacts/uat/edge-failure.png', fullPage: true }); throw e;
} finally {
  results.finishedAt = new Date().toISOString(); await fs.writeFile('artifacts/uat/ui-edge-results.json', JSON.stringify(results, null, 2)); await browser.close();
}
console.log(JSON.stringify({ status: results.status, cases: results.cases.length }));
