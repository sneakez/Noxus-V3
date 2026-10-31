import { launchUatBrowser } from './uat-browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const dir = process.env.UAT_OUTPUT_DIR || 'artifacts/uat';
await fs.mkdir(dir, { recursive: true });
const browser = await launchUatBrowser();
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
  await page.goto(`${base}/app`); await page.waitForSelector('[data-testid="work-queue"]'); await click('Nạp fixture RAM-X');
  await role('admin'); await task('sync:acceptance-event-A'); await click('Kết nối lại shop demo'); await click('Retry sự kiện nguồn');
  await task('sync:acceptance-event-B'); await click('Retry sự kiện nguồn');
  await role('manager'); await task('release:acceptance-A'); await click('Giữ tồn & giao kho'); await task('monitor:acceptance-A');
  await page.select('[aria-label="Phân công kho"]','usr_warehouse_01');
  assert.equal((await snap()).handoffAssignments['warehouse:acceptance-A'].assignee_id,'usr_warehouse_01');
  await click('Ghi nhận yêu cầu hủy');
  await role('warehouse'); await task('warehouse:acceptance-A'); await input('SKU hoặc serial','RAM-X');await click('Kiểm SKU & nhặt hàng');
  assert.match(await page.$eval('[role="status"]',e=>e.textContent),/chặn/);
  await role('manager'); await task('monitor:acceptance-A'); await input('Lý do kết quả hủy','Nguồn xác nhận không hủy');await click('Sàn từ chối hủy · tiếp tục kho');
  await page.reload();await page.waitForSelector('[data-testid="work-queue"]'); await role('warehouse'); await task('warehouse:acceptance-A');
  assert.match(await page.$eval('[data-task="warehouse:acceptance-A"]',e=>e.innerText),/usr_warehouse_01/);
  await input('SKU hoặc serial','RAM-X');await click('Kiểm SKU & nhặt hàng');await click('Đóng gói · chi phí demo 20.000 ₫');await input('Mã vận đơn','FOLLOWUP');await click('Xác nhận kho bàn giao');
  evidence.steps.push({name:'Manager assigns Warehouse; rejected cancellation preserves allocation and resumes dispatch after reload',status:'PASS'});
  await role('manager');await task('carrier:acceptance-A');await click('Sàn báo giao thành công');
  await role('growth');await click('Đề xuất rà soát');
  await role('owner');await page.click('xpath/.//summary[normalize-space(.)="Tài khoản demo & phạm vi được giao"]');await page.select('[aria-label="Tài khoản cấu hình scope"]','mship_growth');await input('Scope shop','acceptance-shop-1');await click('Lưu phạm vi tài khoản');
  await role('growth');await page.reload();await page.waitForSelector('[data-testid="work-queue"]');
  assert.doesNotMatch(await page.$eval('[data-testid="commerce-summary"]',e=>e.innerText),/nguồn MOCK_SOURCE/);
  evidence.steps.push({name:'Growth cannot see prior recommendation from a different shop after scope change and reload',status:'PASS'});
  await role('manager');await page.click('xpath/.//summary[normalize-space(.)="Tạo phiếu trả theo dòng hàng"]');
  await page.select('[aria-label="Đơn trả một phần"]','acceptance-A');await input('Lượng trả ram-x',1);await input('Tiền đề nghị hoàn',100000);await input('Lý do trả hàng','Refund without goods');await page.click('[aria-label="Hoàn tiền không nhận hàng"]');await click('Tạo phiếu hoàn tiền · không giao kho');
  const returnless=(await snap()).returns[0];assert.equal(returnless.is_refund_without_return,true);
  await role('warehouse');assert.equal(await page.$$eval('[data-task^="return:"]',es=>es.length),0);
  evidence.steps.push({name:'Returnless refund UI creates no physical warehouse task',status:'PASS'});
  await role('manager');await page.goto(`${base}/app?page=dashboard&sourceOrder=acceptance-A`);await page.waitForSelector('[data-testid="work-queue"]');await task('source:acceptance-A');await input('Số tiền nguồn',100000);await click('Nhận sự kiện refund');
  await page.goto(`${base}/app?page=orders&order=acceptance-A`);await page.waitForSelector('[role="dialog"][aria-label="A"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="A"]')?.textContent.includes('Đã hoàn tiền một phần'));
  assert.match(await page.$eval('[role="dialog"][aria-label="A"]',e=>e.innerText),/Đã hoàn tiền một phần/);
  evidence.steps.push({name:'Partial refund shows refund label, not underpayment',status:'PASS'});
  await page.goto(`${base}/app?page=dashboard`);await page.waitForSelector('[data-testid="work-queue"]');await page.click('xpath/.//summary[normalize-space(.)="Tạo phiếu trả theo dòng hàng"]');
  await page.select('[aria-label="Đơn trả một phần"]','acceptance-A');await input('Lượng trả ram-x',1);await input('Tiền đề nghị hoàn',100000);await input('Lý do trả hàng','Parcel missing');await click('Tạo phiếu & giao nhóm Kho');
  const ret=(await snap()).returns[0];await task(`returnMonitor:${ret.id}`);await input('Kết quả khiếu nại','Carrier investigating missing parcel');await click('Theo dõi chờ bồi thường');await click('Chốt thực nhận · xác nhận phần thiếu');
  await role('warehouse');assert.equal(await page.$$eval('[data-task^="return:"]',es=>es.length),0);
  await role('manager');await task(`claim:${ret.id}`);assert.match(await page.$eval('[data-testid="task-detail"]',e=>e.innerText),/Chờ bồi thường/);
  await input('Kết quả khiếu nại','Carrier rejected claim with evidence');await click('Đóng yêu cầu · không được bồi thường');
  await page.click('xpath/.//summary[normalize-space(.)="Hàng đến muộn sau khi đã chốt thực nhận"]');await page.select('[aria-label="Phiếu đã chốt thực nhận"]',ret.id);await input('Lý do mở lại nhận hàng','Parcel found');await click('Mở lại phiếu nhận hàng');
  await role('warehouse');await task(`return:${ret.id}`);
  const line=(await snap()).returnItems.find(i=>i.return_id===ret.id);await input(`Nhận ${line.id}`,1);await click('Lưu thực nhận');await input(`Đạt ${line.id}`,1);await click('Lưu kết quả QC');
  assert.equal((await snap()).inventory5State[0].available,10);
  evidence.steps.push({name:'Missing parcel can close receiving, retain claim, then reopen and QC a late physical return exactly once',status:'PASS'});
  assert.deepEqual(evidence.errors,[]);evidence.status='PASS';await page.screenshot({path:`${dir}/followup-final.png`,fullPage:true});
} catch(error) {evidence.status='FAIL';evidence.failure=String(error);await page.screenshot({path:`${dir}/followup-failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally {evidence.finishedAt=new Date().toISOString();await fs.writeFile(`${dir}/ui-followup-results.json`,JSON.stringify(evidence,null,2));await browser.close();}
console.log(JSON.stringify({status:evidence.status,groups:evidence.steps.length}));
