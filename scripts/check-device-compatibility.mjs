// Run against a production preview. No private development hooks or live form submissions.
// Usage: node scripts/check-device-compatibility.mjs [baseUrl] [width ...]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { checkViewport, checkLayout } from './check-browser-compatibility.mjs';
const base = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
try {
  for (const [w, h] of [[320,568],[360,640],[390,844],[430,932],[600,960],[768,1024],[960,768],[1024,768],[1366,768],[1920,1080],[2560,1440],[844,390],[640,360]]) {
    if (process.argv.length > 3 && !process.argv.slice(3).map(Number).includes(w)) continue;
    await checkViewport(browser, base, w, h, { mobile: w <= 1024 });
  }
  await checkViewport(browser, base, 390, 844, { mobile: true, textScale: 2 });
  await checkViewport(browser, base, 1280, 800, { textScale: 2 });
  const page = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // No WebGL: visitors must still see the artwork and reach every section.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto(base);
  await page.locator('.hero--lite.is-settled').waitFor();
  assert.ok(await page.locator('.hero__original').evaluate(el => el.complete && el.naturalWidth > 0));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('.contact__form').waitFor();
  // Mock both outcomes locally; never send a real message during the audit.
  await page.route('**/api/contact', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
  await page.locator('#f-name').fill('Compatibility test');
  await page.locator('#f-email').fill('test@example.com');
  await page.locator('#f-idea').fill('Local mocked request.');
  await page.locator('.contact__send').click();
  await page.locator('.contact__form.is-error').waitFor();
  assert.equal(await page.locator('#f-idea').inputValue(), 'Local mocked request.');
  await page.unroute('**/api/contact');
  await page.route('**/api/contact', route => route.fulfill({ contentType: 'application/json', body: '{"ok":true}' }));
  await page.locator('.contact__send').click();
  await page.locator('.contact__form.is-sent').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('motion'));
  await checkLayout(page, 'No WebGL and live reduced motion');
  assert.deepEqual(errors, []);
  await page.close();
  console.log('PASS no-WebGL fallback, normal motion, live reduced motion, mocked contact error and success.');

  const gpu = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  gpu.on('pageerror', e => errors.push(e.message));
  await gpu.goto(new URL('?gl=force', base).href);
  await gpu.locator('.hero--sculpture').waitFor({ timeout: 60000 });
  await gpu.locator('.hero__skip').click();
  await gpu.locator('.hero.is-settled').waitFor();
  assert.ok(await gpu.locator('.hero__gl').evaluate(el => el.width * el.height <= 1200001), 'Mobile render budget');
  await gpu.locator('#projects').scrollIntoViewIfNeeded();
  await gpu.waitForFunction(() => getComputedStyle(document.querySelector('.reel')).opacity === '1', null, { timeout: 15000 });
  await checkLayout(gpu, 'High-DPR WebGL');
  assert.equal(await gpu.locator('.reel').evaluate(el => getComputedStyle(el).opacity), '1');
  await gpu.locator('.hero__gl').evaluate(el => el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await gpu.locator('.hero--lite.is-settled').waitFor();
  assert.deepEqual(errors, []);
  await gpu.close();
  console.log('PASS high-DPR WebGL budget, animated reveals, context-loss fallback; no page errors.');
} finally { await browser.close(); }
