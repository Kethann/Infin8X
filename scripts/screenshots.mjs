// Section screenshots at 390 / 768 / 1440 + console error capture.
// Usage: node scripts/screenshots.mjs [baseUrl]   (dev server or `npm run preview`)
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:5173';
const q = process.argv[3] ?? '';  // e.g. '?gl=force' to exercise the 3D path in GPU-less headless Chrome
const ids = ['about', 'skills', 'services', 'projects', 'process', 'contact'];
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
let errors = [];
for (const w of [390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${w}] pageerror ${e.message}`));
  await page.goto(base + '/' + q, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('.hero__skip').catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/page${q ? '3d' : ''}-${w}-0-hero.jpg`, type: 'jpeg', quality: 75 });
  await page.waitForSelector('#contact', { timeout: 60000 });
  for (const [i, id] of ids.entries()) {
    const y = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id);
    // step down so scroll-triggered reveals fire as a user would see them
    for (let k = 1; k <= 4; k++) { await page.evaluate(([y, k]) => window.scrollTo(0, y - innerHeight + (innerHeight * k) / 4), [y, k]); await page.waitForTimeout(250); }
    await page.waitForTimeout(id === 'process' ? 5500 : 1100);   // the Process animation plays by itself (~4.6 s)
    await page.screenshot({ path: `shots/page${q ? '3d' : ''}-${w}-${i + 1}-${id}.jpg`, type: 'jpeg', quality: 75 });
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/page${q ? '3d' : ''}-${w}-9-footer.jpg`, type: 'jpeg', quality: 75 });
  // case study route via client-side transition
  await page.goto(base + '/work/kaaya-cafe' + q, { waitUntil: 'networkidle' }); await page.waitForTimeout(2800);
  await page.screenshot({ path: `shots/page${q ? '3d' : ''}-${w}-case.jpg`, type: 'jpeg', quality: 75, fullPage: true });
  // horizontal overflow check
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) errors.push(`[${w}] horizontal overflow ${ov}px on case page`);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const ov2 = await page.evaluate(async () => { window.scrollTo(0, 99999); await new Promise((r) => setTimeout(r, 400)); return document.documentElement.scrollWidth - innerWidth; });
  if (ov2 > 0) errors.push(`[${w}] horizontal overflow ${ov2}px on home`);
  await page.close();
}
console.log(errors.length ? errors.join('\n') : 'NO_CONSOLE_ERRORS');
await browser.close();
