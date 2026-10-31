import { launchUatBrowser } from './uat-browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const dir = process.env.UAT_OUTPUT_DIR || 'artifacts/login-fix';
await fs.mkdir(dir, { recursive: true });
const evidence = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: true, startedAt: new Date().toISOString(), steps: [], errors: [] };
const browser = await launchUatBrowser();
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
await page.setViewport({ width: 1440, height: 1000 });
page.on('pageerror', e => evidence.errors.push(String(e)));
const snap = () => page.evaluate(() => JSON.parse(localStorage.getItem('nexus_mock_db_v2')));
const submit = () => page.click('button[type="submit"]');
const logout = async () => {
  // Activate by keyboard so the lifecycle assertion is independent of sidebar entrance geometry.
  await page.waitForSelector('button[title="Đăng xuất"]');
  await page.waitForNetworkIdle({ idleTime: 500 });
  await page.focus('button[title="Đăng xuất"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#login-email');
};
const accounts = [
  ['owner', 'owner@nexusoms.io', 'usr_owner_01'],
  ['admin', 'admin@nexusoms.io', 'usr_admin_01'],
  ['manager', 'manager@nexusoms.io', 'usr_manager_01'],
  ['warehouse', 'kho@nexusoms.io', 'usr_warehouse_01'],
  ['growth', 'growth@nexusoms.io', 'usr_growth_01'],
];

try {
  await page.goto(`${base}/app`);
  await page.waitForSelector('[data-testid="work-queue"]');
  await logout();
  await page.type('#login-email', 'admin@nexusoms.vn');
  await page.type('#login-password', 'demo');
  await submit();
  await page.waitForSelector('[role="alert"]');
  assert.match(await page.$eval('[role="alert"]', e => e.textContent), /không hoạt động|membership/);
  assert.equal((await snap()).activeUserId, null);
  assert.equal(await page.$('[data-testid="work-queue"]'), null);
  evidence.steps.push({ name: 'Unknown legacy email cannot log in or fall back to Owner', status: 'PASS' });
  assert.equal(await page.$$eval('[data-demo-role]', els => els.length), 5);
  await page.screenshot({ path: `${dir}/login-options.png`, fullPage: true });
  for (const [role, email, userId] of accounts) {
    await page.click(`[data-demo-role="${role}"]`);
    assert.equal(await page.$eval('#login-email', e => e.value), email);
    await submit();
    await page.waitForFunction(role => document.querySelector('[data-testid="work-queue"]')?.textContent.includes(`${role} ·`), {}, role);
    let state = await snap();
    assert.equal(state.activeUserId, userId); assert.equal(state.activeRole, role);
    await page.reload();
    await page.waitForFunction(role => document.querySelector('[data-testid="work-queue"]')?.textContent.includes(`${role} ·`), {}, role);
    state = await snap(); assert.equal(state.activeUserId, userId);
    await logout(); assert.equal((await snap()).activeUserId, null);
    evidence.steps.push({ name: `${role}: quick fill → sign in as exact user → reload → sign out`, status: 'PASS', email, userId });
  }
  await page.setViewport({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${dir}/login-mobile.png`, fullPage: true });
  assert.deepEqual(evidence.errors, []);
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL'; evidence.failure = String(error);
  evidence.failedState = { activeUserId: (await snap())?.activeUserId, activeRole: (await snap())?.activeRole };
  await page.screenshot({ path: `${dir}/login-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${dir}/ui-login-results.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: evidence.status, groups: evidence.steps.length }));
