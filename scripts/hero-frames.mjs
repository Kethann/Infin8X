// Capture the hero storyboard at fixed timecodes. Usage: node scripts/hero-frames.mjs [url] [outDir] [width] [height]
import { chromium } from 'playwright';
const [url = 'http://localhost:5173/', out = 'shots/hero', w = '1440', h = '900'] = process.argv.slice(2);
const times = [1.2, 2.2, 2.7, 3.4, 4.3, 5.4, 6.4, 7.6, 8.4, 10.5];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.gsap !== undefined || true);
const t0 = Date.now();
for (const t of times) {
  const wait = t * 1000 - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}-${w}-${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 80 });
}
console.log(errors.length ? errors.join('\n') : 'NO_CONSOLE_ERRORS');
await browser.close();
