import puppeteer from 'puppeteer';
export async function launchUatBrowser() {
  return puppeteer.launch({ headless: true,
    ...(process.env.UAT_CHROMIUM_PATH ? { executablePath: process.env.UAT_CHROMIUM_PATH } : {}),
    args: process.env.UAT_NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : [],
  });
}
