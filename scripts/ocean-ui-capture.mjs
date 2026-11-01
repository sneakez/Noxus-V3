import { launchUatBrowser } from './uat-browser.mjs';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const phase = process.env.UI_PHASE || 'before';
const dir = `artifacts/ocean-restore/${phase}`;
await fs.mkdir(dir, { recursive: true });
const browser = await launchUatBrowser();
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
const result = { phase, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pages: [], errors: [] };
page.on('pageerror', e => result.errors.push(String(e)));
try {
  for (const route of ['dashboard','fulfillment','returns','syncMonitor','marketingAnalytics','auditTrail','cashWorkingCapital','transfers']) {
    await page.goto(`http://127.0.0.1:5174/app?page=${route}`);
    await page.waitForNetworkIdle({ idleTime: 500 });
    await page.screenshot({ path: `${dir}/${route}.png`, fullPage: true });
    result.pages.push({ route, text: await page.$eval('main', e => e.innerText) });
  }
} finally { await fs.writeFile(`${dir}/screens.json`, JSON.stringify(result, null, 2)); await browser.close(); }
console.log(JSON.stringify({ phase, pages: result.pages.length, errors: result.errors }));
