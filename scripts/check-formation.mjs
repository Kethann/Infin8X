import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  for (const [width, height, repeat] of [[960, 700, false], [390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || message.text().includes('Using source artwork fallback')) {
        errors.push(message.text());
        console.error(message.text());
      }
    });
    // Pause as soon as the scene is ready, before its first automatic frame. Keep the
    // page visible during texture loading and shader compilation; render each seek explicitly.
    await page.addInitScript(repeat => {
      if (repeat) sessionStorage.setItem('infin8x:intro-seen', '1');
      let sculpture;
      Object.defineProperty(window, '__sculpture', {
        configurable: true,
        get: () => sculpture,
        set: value => {
          sculpture = value;
          value.timeline?.pause(0);
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        },
      });
    }, repeat);
    await page.goto(`${base}/?gl=force`);
    await page.waitForFunction(() => !!window.__sculpture?.timeline, null, { timeout: 120000, polling: 100 }).catch(async error => {
      console.error(await page.evaluate(() => ({
        hero: document.querySelector('.hero')?.className,
        scene: !!window.__sculpture,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        state: window.__sculpture?.scene.state,
      })));
      throw error;
    });
    await page.evaluate(() => document.fonts.ready);
    for (const fraction of [0, 0.1, 0.3, 0.6, 1]) {
      const opening = await page.evaluate(fraction => {
        const { timeline, scene } = window.__sculpture;
        const time = timeline.labels.absorb * fraction;
        timeline.pause().seek(time, false);
        scene.render(time * 1000, 0);
        return { ...scene.state, duration: timeline.labels.absorb };
      }, fraction);
      assert.ok(opening.duration >= 0.9, 'Even repeat visits allow a gradual energy entrance');
      assert.equal(opening.trace, 0, 'The opening leads directly into formation');
      if (fraction <= 0.1) {
        assert.ok(opening.aurora < 0.03, 'The first energy frames ease in from darkness');
        assert.equal(opening.rush, 0, 'The core does not flare before the fibres arrive');
      }
      await page.screenshot({ path: `shots/opening-${width}-${fraction}.png` });
    }
    const onset = await page.evaluate(repeat => {
      const { timeline, scene } = window.__sculpture;
      timeline.pause().seek(timeline.labels.absorb + 0.1 * (repeat ? 0.55 : 1), false);
      return { ...scene.state };
    }, repeat);
    assert.equal(onset.aurora, 1, 'All trails have arrived before absorption starts');
    assert.ok(onset.trace > 0.015, 'Formation and absorption start without a second delay');
    assert.equal(onset.trace, onset.calm);
    let previous = 0;
    for (const fraction of [0.04, 0.18, 0.34, 0.5, 0.65, 0.78, 0.9, 0.99]) {
      const state = await page.evaluate(({ fraction, repeat }) => {
        const { timeline, scene } = window.__sculpture;
        const time = timeline.labels.absorb + fraction * (timeline.labels.formed-timeline.labels.absorb);
        timeline.pause().seek(time, false);
        scene.render(time * 1000, 0);
        const stage=document.querySelector('.hero__artwork-stage').getBoundingClientRect();
        return { ...scene.state, target: scene.formationTarget.toArray(), intake: scene.absorptionTarget.toArray(),
          centre: stage.left+stage.width/2, centreY: stage.top+stage.height/2, logoWidth: stage.width };
      }, { fraction, repeat });
      assert.ok(state.trace > previous && state.trace < 1, 'Logo grows throughout absorption');
      assert.equal(state.trace, state.calm, 'Absorption and formation advance together');
      if (fraction<0.9) assert.ok(state.rush > 0.1, 'Incoming energy continues to feed the forming logo');
      assert.ok(state.reveal > 0.9, 'Forming geometry is visible');
      assert.ok(state.target.every(Number.isFinite), 'Formation front projects into the scene');
      assert.ok(Math.hypot(state.intake[0]-state.centre,state.intake[1]-state.centreY)<state.logoWidth*0.03, 'Energy intake stays at the core');
      if (fraction===0.04) {
        assert.ok(state.target[0]>state.centre, 'Formation starts at the white tip to the right of the crossing');
        assert.ok(state.target[1]>state.centreY, 'The starting white tip is below the crossing');
      }
      if (fraction===0.18) {
        assert.ok(state.target[0]<state.centre, 'White formation travels back toward the left loop');
        assert.ok(state.target[1]<state.centreY, 'White formation rises around the left loop');
      }
      if (fraction===0.34) assert.ok(state.target[1]>state.centreY && state.target[0]<state.centre, 'Formation rounds the lower-left loop');
      if (fraction===0.65) assert.ok(state.target[1]<state.centreY, 'Formation rises into the upper colour arc');
      if (fraction===0.78) assert.ok(state.target[0]>state.centre+state.logoWidth*0.1, 'Formation rounds the coloured right loop');
      console.log(width, fraction, state.target.map((v,i)=>Number(((v-(i?state.centreY:state.centre))/state.logoWidth).toFixed(3))));
      previous = state.trace;
      await page.screenshot({ path: `shots/formation-${width}-${fraction}.png` });
    }
    await page.locator('.hero__skip').click();
    await page.locator('.hero.is-settled').waitFor();
    const settled = await page.evaluate(() => {
      const { scene } = window.__sculpture;
      scene.render(6000, 0);
      return { ...scene.state, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    for (const key of ['trace', 'calm', 'turn', 'reveal']) assert.equal(settled[key], 1);
    assert.equal(settled.rush, 0);
    assert.equal(settled.flash, 0);
    assert.equal(settled.overflow, false);
    await page.screenshot({ path: `shots/formation-${width}-settled.png` });
    console.log(`PASS ${width}px ${repeat ? 'repeat' : 'first'} visit: fixed core intake, lower white tip start and continuous white-to-colour formation, synchronized energy, skip and layout.`);
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  reduced.on('pageerror', error => errors.push(error.message));
  await reduced.goto(`${base}/?gl=force`);
  await reduced.locator('.hero--sculpture.is-settled').waitFor({ timeout: 120000 });
  const state = await reduced.evaluate(() => ({ ...window.__sculpture.scene.state }));
  assert.equal(state.trace, 1);
  assert.equal(state.calm, 1);
  assert.equal(state.rush, 0);
  assert.equal(state.flash, 0);
  assert.equal(await reduced.locator('.hero__skip').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS reduced motion: completed logo without absorption animation; no browser or shader errors.');
} finally {
  if (errors.length) console.error(errors);
  await browser.close();
}
