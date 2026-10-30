import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const dir = 'artifacts/uat';
await fs.mkdir(dir, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const evidence = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: true, startedAt: new Date().toISOString(), steps: [], errors: [] };
const page = await browser.newPage();
page.on('pageerror', e => evidence.errors.push(String(e)));
page.on('dialog', d => d.accept());
await page.setViewport({ width: 1440, height: 1000 });
const snap = () => page.evaluate(() => JSON.parse(localStorage.getItem('nexus_mock_db_v2')));
const click = async text => {
  const selector = `xpath/.//button[normalize-space(.)='${text}']`;
  await page.waitForSelector(selector);
  await page.click(selector);
};
const input = async (label, value) => { const selector = `[aria-label="${label}"]`; await page.waitForSelector(selector); await page.click(selector); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); if (String(value)) await page.type(selector, String(value)); };
const task = async id => { await page.waitForSelector(`[data-task="${id}"]`); await page.click(`[data-task="${id}"]`); };
const checkpoint = async (name, expected) => {
  const s = await snap(); const i = s.inventory5State[0];
  const actual = [i.physical, i.reserved, i.pending_qc, i.available];
  assert.deepEqual(actual, expected, name);
  evidence.steps.push({ name, status: 'PASS', expected, actual, role: s.activeRole, user: s.activeUserId });
  await page.screenshot({ path: `${dir}/${String(evidence.steps.length).padStart(2, '0')}.png`, fullPage: true });
};
const roleLabels = { owner: '👑 Chủ Doanh Nghiệp (Owner)', admin: '⚡ Admin Quản Trị', manager: '📊 Trưởng Phòng OMS', warehouse: '📦 Nhân Viên Kho', growth: '🚀 Tăng Trưởng & Ads' };
const role = async id => {
  await page.click('button[title="Nhấn để chuyển đổi vai trò (Role Switcher)"]');
  await page.waitForSelector(`xpath/.//button[.//p[normalize-space(.)='${roleLabels[id]}']]`);
  await page.click(`xpath/.//button[.//p[normalize-space(.)='${roleLabels[id]}']]`);
  await page.waitForFunction(r => document.querySelector('[data-testid="work-queue"]')?.innerText.includes(`${r} ·`), {}, id);
};

try {
  await page.goto(`${base}/app`); await page.waitForSelector('[data-testid="work-queue"]');
  await click('Nạp fixture RAM-X'); await checkpoint('Owner loads isolated fixture', [10, 0, 0, 10]);
  await role('admin');
  await task('sync:acceptance-event-A'); await click('Retry sự kiện nguồn');
  assert.match(await page.$eval('[role="status"]', e => e.textContent), /chưa kết nối/);
  evidence.steps.push({ name: 'Admin disconnected connector blocks retry', status: 'PASS', expected: 'No order inserted', actual: (await snap()).orders.length });
  await click('Kết nối lại shop demo'); await click('Retry sự kiện nguồn');
  for (const name of ['B', 'C']) { await task(`sync:acceptance-event-${name}`); await click('Retry sự kiện nguồn'); }
  await page.reload(); await page.waitForSelector('[data-testid="work-queue"]');
  assert.equal((await snap()).orders.length, 3);
  await role('manager');
  for (const name of ['A', 'B', 'C']) { await task(`release:acceptance-${name}`); await click('Giữ tồn & giao kho'); }
  await checkpoint('Manager reserves A B C, three shop handoffs', [10, 3, 0, 7]);
  await page.reload(); await page.waitForSelector('[data-testid="work-queue"]');
  await role('warehouse');
  await task('warehouse:acceptance-A'); await input('SKU hoặc serial', 'WRONG'); await click('Kiểm SKU & nhặt hàng');
  assert.match(await page.$eval('[role="status"]', e => e.textContent), /chưa khớp/);
  for (const name of ['A', 'B', 'C']) {
    await task(`warehouse:acceptance-${name}`); await input('SKU hoặc serial', 'RAM-X'); await click('Kiểm SKU & nhặt hàng');
    await click('Đóng gói · chi phí demo 20.000 ₫');
  }
  for (const name of ['A', 'C']) { await task(`warehouse:acceptance-${name}`); await input('Mã vận đơn', `TRACK-${name}`); await click('Xác nhận kho bàn giao'); }
  await checkpoint('Warehouse hands over A C; only B remains in preparation queue', [8, 1, 0, 7]);
  assert.equal(await page.$$eval('[data-task^="warehouse:"]', e => e.length), 1);
  await role('manager');
  // B is still assigned to Warehouse, so the manager uses Owner-independent order actions via Orders UI.
  await page.goto(`${base}/app?page=orders&order=acceptance-B`);
  await page.waitForSelector('[role="dialog"][aria-label="B"]');
  evidence.steps.push({ name: 'Order deep link opens the specific B document', status: 'PASS', expected: 'B', actual: await page.$eval('[role="dialog"][aria-label="B"] h2', e => e.innerText) });
  // Return to queue; Manager needs to see cancellation controls for work already handed to warehouse.
  await page.goto(`${base}/app?page=dashboard`); await page.waitForSelector('[data-testid="work-queue"]');
  await task('monitor:acceptance-B'); await click('Ghi nhận yêu cầu hủy');
  await role('warehouse'); await task('warehouse:acceptance-B'); await input('Mã vận đơn', 'TRACK-B'); await click('Xác nhận kho bàn giao');
  assert.match(await page.$eval('[role="status"]', e => e.textContent), /hủy/);
  await role('manager'); await task('monitor:acceptance-B'); await click('Sàn demo xác nhận hủy');
  await checkpoint('Packed cancellation releases B but retains packaging and Ads', [8, 0, 0, 8]);
  await task('carrier:acceptance-A'); await click('Sàn xác nhận tiếp nhận'); await click('Sàn báo giao thành công');
  await task('carrier:acceptance-C'); await click('Sàn báo giao thất bại');
  await checkpoint('Source failed delivery does not restock', [8, 0, 0, 8]);
  await role('warehouse'); await task('return:return-acceptance-C');
  await input('Nhận return-item-acceptance-item-C', 1); await click('Lưu thực nhận');
  await checkpoint('Actual return receipt is pending QC', [9, 0, 1, 8]);
  await page.reload(); await page.waitForSelector('[data-testid="work-queue"]'); await task('return:return-acceptance-C');
  await input('Đạt return-item-acceptance-item-C', 1); await input('Lỗi return-item-acceptance-item-C', 0); await click('Lưu kết quả QC');
  await checkpoint('QC releases C once and removes warehouse task', [9, 0, 0, 9]);
  assert.equal(await page.$$eval('[data-task]', e => e.length), 0);
  await role('manager');
  for (const [name, fee] of [['A', 100000], ['B', 0], ['C', 60000]]) {
    await task(`settlement:acceptance-${name}`); await input('Số tiền nguồn', fee); await click('Nhận phí sàn thực tế'); await click('Chốt đối soát khoản đã đủ');
  }
  await role('growth');
  const beforeCredit = await page.$eval('[data-testid="commerce-summary"]', e => e.innerText);
  assert.match(beforeCredit, /-120\.000/); assert.match(beforeCredit, /3\.3333/);
  await page.screenshot({ path: `${dir}/growth-before-credit.png`, fullPage: true });
  await page.select('[aria-label="Kỳ báo cáo"]', 'last_month');
  assert.match(await page.$eval('[data-testid="commerce-summary"]', e => e.innerText), /Không có dữ liệu/);
  await page.select('[aria-label="Kỳ báo cáo"]', 'all');
  evidence.steps.push({ name: 'Growth empty period returns no cohort, no fallback revenue', status: 'PASS', expected: 'No data', actual: 'No data' });
  await click('Đề xuất rà soát'); await role('manager');
  const recommendation = await page.$eval('[data-task^="recommendation:"]', e => e.getAttribute('data-task'));
  await task(recommendation); await click('Tiếp nhận đề xuất');
  // Late source event: expose source controls for settled orders through the report drilldown.
  await page.goto(`${base}/app?page=dashboard&sourceOrder=acceptance-C`); await page.waitForSelector('[data-testid="work-queue"]');
  await task('source:acceptance-C'); await input('Số tiền nguồn', 40000); await click('Nhận Ads credit');
  await role('growth');
  const afterCredit = await page.$eval('[data-testid="commerce-summary"]', e => e.innerText);
  assert.match(afterCredit, /-80\.000/); assert.match(afterCredit, /3\.8462/);
  await page.reload(); await page.waitForSelector('[data-testid="work-queue"]');
  assert.match(await page.$eval('[data-testid="commerce-summary"]', e => e.innerText), /-80\.000/);
  await page.screenshot({ path: `${dir}/growth-after-credit.png`, fullPage: true });
  evidence.steps.push({ name: 'Growth source 10, retained ratio 3.3333, contribution -120000; late Ads credit gives 3.8462 and -80000', status: 'PASS', expected: [-120000, -80000], actual: [beforeCredit, afterCredit] });
  await role('manager'); await page.goto(`${base}/app?page=feeReconciliation`);
  await page.waitForSelector('[data-fee="fee-acceptance-A"]'); await page.click('[data-fee="fee-acceptance-A"]');
  await input('Khoản điều chỉnh mới', 5000); await input('Lý do điều chỉnh', 'UI credit reference 5000');
  await click('Xác Nhận & Lưu Bền Vững');
  await page.waitForSelector('[data-fee="fee-acceptance-A"]'); await page.click('[data-fee="fee-acceptance-A"]');
  assert.equal(await page.$eval('[aria-label="Khoản điều chỉnh mới"]', e => e.value), '0');
  await click('Xác Nhận & Lưu Bền Vững');
  const adjusted = (await snap()).orderFeeBreakdowns.find(f => f.id === 'fee-acceptance-A');
  assert.equal(adjusted.net_payout, 905000); assert.equal(adjusted.adjustments.length, 1);
  evidence.steps.push({ name: 'Fee modal new credit +5000; reopen/save adds zero, retains one transaction', status: 'PASS', expected: [905000, 1], actual: [adjusted.net_payout, adjusted.adjustments.length] });
  await page.screenshot({ path: `${dir}/fee-reopen.png`, fullPage: true });
  await page.goto(`${base}/app?page=dashboard`); await page.waitForSelector('[data-testid="work-queue"]');
  await role('owner'); await page.goto(`${base}/app?page=feeReconciliation`); await page.waitForSelector('[data-fee="fee-acceptance-A"]'); await page.click('[data-fee="fee-acceptance-A"]');
  await click('Xác Nhận & Lưu Bền Vững'); assert.equal((await snap()).orderFeeBreakdowns.find(f => f.id === 'fee-acceptance-A').net_payout, 905000);
  evidence.steps.push({ name: 'Owner reviews and saves reconciliation without replaying prior credit', status: 'PASS', expected: 905000, actual: 905000 });
  await page.goto(`${base}/app?page=dashboard`); await page.waitForSelector('[data-testid="work-queue"]');
  await role('warehouse'); await page.goto(`${base}/app?page=feeReconciliation`);
  await page.waitForSelector('[role="alert"]'); assert.match(await page.$eval('[role="alert"]', e => e.innerText), /Không có quyền/);
  evidence.steps.push({ name: 'Warehouse finance deep link denied', status: 'PASS' });
  await page.goto(`${base}/app?page=dashboard`); await page.waitForSelector('[data-testid="work-queue"]');
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/mobile-warehouse.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(evidence.errors, []);
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL'; evidence.failure = String(error);
  await page.screenshot({ path: `${dir}/failure.png`, fullPage: true });
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${dir}/ui-results.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: evidence.status, steps: evidence.steps.length, evidence: `${dir}/ui-results.json` }));
