// Behavioral scrolling checks: smooth wheel/anchors, menu isolation, chapter tracking and real touch gestures.
// Usage: node scripts/check-scrolling.mjs [previewUrl]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const errors = [];
const ready = async page => {
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.locator('.home__sections.is-ready').waitFor();
  await page.locator('.hero.is-settled').waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
};
const sample = page => page.evaluate(() => {
  window.scrollSamples = [];
  const tick = () => { window.scrollSamples.push(scrollY); if (window.scrollSamples.length < 240) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const settled = page => page.waitForFunction(() => {
  const samples = window.scrollSamples;
  return scrollY > 100 && samples.length >= 30 && Math.max(...samples.slice(-12)) - Math.min(...samples.slice(-12)) < 1;
});
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await ready(desktop);
  assert.equal(await desktop.locator('html').evaluate(el => el.classList.contains('lenis')), true, 'Wheel smoothing also works with graphics fallback');
  await desktop.waitForTimeout(200);
  await desktop.evaluate(() => {
    window.chapterReads = 0;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function() { if (this.hasAttribute('data-chapter')) window.chapterReads++; return original.call(this); };
  });
  await sample(desktop); await desktop.mouse.wheel(0, 600); await settled(desktop);
  const wheel = await desktop.evaluate(() => ({ y: scrollY, steps: new Set(window.scrollSamples.map(Math.round)).size, reads: window.chapterReads }));
  assert.ok(wheel.y > 400 && wheel.y < 650 && wheel.steps > 8, JSON.stringify(wheel));
  assert.ok(wheel.reads <= 12, `Too many chapter layout reads during a wheel glide: ${wheel.reads}`);
  await desktop.getByRole('button', { name: 'Open menu', exact: true }).click();
  const before = await desktop.evaluate(() => scrollY);
  const sheet = desktop.locator('#mobile-menu');
  await sheet.hover(); await desktop.mouse.wheel(0, 500);
  await desktop.waitForTimeout(250);
  assert.ok(Math.abs(await desktop.evaluate(() => scrollY) - before) < 2, 'Menu wheel must not move the page');
  await desktop.locator('#mobile-menu a[href="#projects"]').click();
  await desktop.waitForFunction(() => Math.abs(document.querySelector('#projects').getBoundingClientRect().top - parseFloat(getComputedStyle(document.querySelector('#projects')).scrollMarginTop)) < 3);
  assert.equal(await desktop.locator('.nav__links a[aria-current]').getAttribute('data-id'), 'projects');
  const progress = await desktop.evaluate(() => ({actual:parseFloat(document.querySelector('.nav__progress').style.getPropertyValue('--p')), expected:scrollY/(document.documentElement.scrollHeight-innerHeight)}));
  assert.ok(Math.abs(progress.actual-progress.expected)<0.01);
  await desktop.locator('.reel__index a').first().click();
  await desktop.waitForURL('**/work/kaaya-cafe');
  await desktop.locator('.case__facts').waitFor();
  await desktop.waitForTimeout(1000);
  assert.ok(await desktop.evaluate(() => scrollY < 2), 'New route starts without old scroll momentum');
  await desktop.locator('.case__explore').click();
  await desktop.waitForFunction(() => Math.abs(document.querySelector('.case__overview').getBoundingClientRect().top - 110) < 3);
  await desktop.locator('.case__back').click();
  await desktop.waitForURL('**/#projects');
  await desktop.waitForFunction(() => Math.abs(document.querySelector('#projects')?.getBoundingClientRect().top - 32) < 3);
  console.log(`PASS desktop wheel glide (${wheel.steps} distinct positions; ${wheel.reads} chapter layout reads), menu isolation, anchor offsets, progress and routes.`);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ready(mobile);
  assert.equal(await mobile.locator('html').evaluate(el => el.classList.contains('lenis')), false, 'Keep native touch momentum');
  await sample(mobile); await mobile.locator('.hero__ctas a[href="#projects"]').tap(); await settled(mobile);
  assert.ok(await mobile.evaluate(() => new Set(window.scrollSamples.map(Math.round)).size > 8), 'Mobile anchor glides instead of jumping');
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.locator('.nav__cta').tap();
  await mobile.waitForFunction(() => Math.abs(document.querySelector('#contact').getBoundingClientRect().top - 52) < 3);
  assert.equal(await mobile.evaluate(() => document.activeElement.id), 'contact');
  console.log('PASS native mobile momentum, smooth section links, and reduced-motion anchor/focus behavior.');
  await mobile.close();

  const touch = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  await touch.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(p) { return p === 0x9246 || p === 0x1f01 ? 'Mobile GPU (gesture test)' : original.call(this, p); };
  });
  await ready(touch);
  await touch.locator('.hero--sculpture.is-settled').waitFor();
  const stage = await touch.locator('.hero__artwork-stage').boundingBox();
  const cdp = await touch.context().newCDPSession(touch);
  const x = stage.x + stage.width/2, y = stage.y + stage.height/2;
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++) { await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]}); await new Promise(resolve=>setTimeout(resolve,20)); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.waitForFunction(()=>scrollY>40);
  assert.equal(await touch.locator('.hero__artwork-stage.is-dragging').count(),0, 'Vertical pan releases logo rotation');
  console.log('PASS real touch swipe over the animated logo scrolls the page.');
  await touch.close();
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
