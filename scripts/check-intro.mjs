import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const errors = [];
try {
  for (const [width, height, mode] of [[768,900,'lite'], [390,844,'reduced'], [390,844,'3d'], [1440,900,'3d']]) {
    const page = await browser.newPage({ viewport: {width, height}, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
    page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log(m.text()); } if(m.type() === 'warning') console.log(m.text()); });
    console.log(`Loading ${mode} ${width}`);
    await page.goto(`${base}/${mode === 'lite' ? '' : '?gl=force'}`);
    await page.locator('.hero__original').evaluate(image => image.decode());
    if (mode !== 'lite') await page.waitForSelector('.hero--sculpture', {timeout:60000});
    if (mode === '3d' && width === 1440) {
      await page.evaluate(() => { const s=window.__sculpture; s.timeline.pause(); s.timeline.seek(1.1, false); s.scene.render(1100, .016); });
      await page.screenshot({path:'shots/extruded-angle-desktop.png'});
    }
    if (mode === '3d') await page.evaluate(() => { const s=window.__sculpture; s.timeline.progress(1); s.scene.render(5000,.016); });
    await page.waitForSelector('.hero.is-settled', {timeout:60000});
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, cta: document.querySelector('.hero__ctas').getBoundingClientRect().bottom, height: document.querySelector('.hero').clientHeight, three: document.querySelector('.hero').classList.contains('hero--3d') }));
    assert.equal(state.overflow, false, `${width} overflow`);
    assert.ok(state.cta < state.height, `${width} clipped CTA`);
    assert.equal(await page.locator('.hero__wm').count(), 0, 'No visible name wordmark');
    assert.equal(await page.locator('.hero__original').getAttribute('src'), '/brand/infinity-white-entry.webp');
    if (mode !== 'lite') await page.waitForSelector('.hero--atmosphere', { timeout: 60000 });
    await page.screenshot({path:`shots/extruded-intro-${mode}-${width}.png`});
    console.log(`${mode} ${width}: layout, completion and console checked`);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: no browser or shader errors');
} finally { await browser.close(); }
