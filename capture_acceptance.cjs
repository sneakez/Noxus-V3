const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'design', 'screenshots', 'final-acceptance');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser with chrome:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Helper to ensure mock session
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nexus_mock_auth_session', JSON.stringify({
      user: {
        id: 'usr_owner_01',
        email: 'owner@nexusoms.io',
        role: 'authenticated'
      },
      tenant: {
        id: 'tenant_flagship',
        slug: 'nexus-flagship',
        name: 'Nexus Flagship Store'
      },
      role: 'owner'
    }));
  });

  console.log('1. Navigating to Dashboard...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_01_dashboard_live.png'), fullPage: false });
  console.log('✓ Captured verified_01_dashboard_live.png');

  console.log('2. Navigating to Inventory (Canonical 5-State)...');
  await page.goto('http://localhost:5173/app?page=inventory', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_02_inventory_canonical.png'), fullPage: false });
  console.log('✓ Captured verified_02_inventory_canonical.png');

  console.log('3. Triggering Inventory Simulation Modal...');
  const qcButtons = await page.$$('button');
  for (const btn of qcButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Nghiệm thu QC')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_03_inventory_simulation_modal.png'), fullPage: false });
  console.log('✓ Captured verified_03_inventory_simulation_modal.png');

  console.log('4. Navigating to Orders & opening Order Detail Drawer...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table tbody tr');
  await new Promise(r => setTimeout(r, 1200));

  // Click first order row
  const firstRow = await page.$('table tbody tr');
  if (firstRow) {
    await firstRow.click();
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_04_order_drawer_lifecycle_pod.png'), fullPage: false });
  console.log('✓ Captured verified_04_order_drawer_lifecycle_pod.png');

  console.log('5. Clicking POD verification modal inside drawer...');
  const podButtons = await page.$$('button');
  for (const btn of podButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('POD Bắt buộc') || text.includes('Xác nhận POD') || text.includes('Bằng chứng Giao hàng'))) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_05_order_pod_modal.png'), fullPage: false });
  console.log('✓ Captured verified_05_order_pod_modal.png');

  console.log('6. Navigating to Returns (Multi-Branch RMA)...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1200));

  // Click create RMA modal
  const rmaBtns = await page.$$('button');
  for (const btn of rmaBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Tạo yêu cầu RMA')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_06_returns_multibranch.png'), fullPage: false });
  console.log('✓ Captured verified_06_returns_multibranch.png');

  console.log('7. Navigating to Business Rules Review page...');
  await page.goto('http://localhost:5173/app?page=businessRules', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_07_business_rules_review.png'), fullPage: false });
  console.log('✓ Captured verified_07_business_rules_review.png');

  await browser.close();
  console.log('=== All 7 browser acceptance screenshots captured successfully! ===');
}

run().catch(err => {
  console.error('Puppeteer script failed:', err);
  process.exit(1);
});
