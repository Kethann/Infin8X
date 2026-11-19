// Deterministic storyboard frames: pauses the hero timeline and seeks to exact timecodes (dev server only).
// Usage: node scripts/hero-seek.mjs [url] [outPrefix] [w] [h]
import { chromium } from 'playwright';
const [url = 'http://localhost:5173/?gl=force', out = 'shots/seek', w = '1440', h = '900'] = process.argv.slice(2);
const times = [1.6, 2.2, 2.8, 3.4, 4.0, 9.0];
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__heroTl, null, { timeout: 60000 });
for (const t of times) {
  await p.evaluate((t) => { const tl = window.__heroTl; tl.pause(); tl.seek(t, false); }, t);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}-${w}-${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 82 });
}
await b.close(); console.log('done');
