// CPU/RAM policy regressions plus a mobile intro that plays without ?gl=force.
// Chrome renders through SwiftShader here; only renderer metadata is stubbed to exercise normal hardware eligibility.
// This verifies behavior, not real-phone GPU frame rate. Usage: node scripts/check-mobile-intro.mjs [previewUrl]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(await readFile(new URL('../src/lib/env.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
for (const [name, cores, memory, renderer, saveData, expected] of [
  ['typical Android', 4, 4, 'Adreno', false, true],
  ['2 GB Android', 4, 2, 'Adreno', false, true],
  ['two-core iPhone-style hints', 2, undefined, 'Apple GPU', false, true],
  ['Data Saver', 4, 2, 'Adreno', true, false],
  ['software renderer', 4, 4, 'SwiftShader', false, false],
  ['no WebGL', 4, 4, null, false, false],
]) {
  const exports = {};
  const gl = renderer ? { RENDERER: 0x1f01, getExtension: () => null, getParameter: () => renderer } : null;
  runInNewContext(code, { exports, window: {}, navigator: { hardwareConcurrency: cores, deviceMemory: memory, connection: { saveData } },
    document: { createElement: () => ({ getContext: () => gl }) }, location: { search: '' }, URLSearchParams });
  assert.equal(exports.canPlayIntro(), expected, name);
  if (expected) assert.equal(exports.isLowEnd(), true, `${name}: still keep the heavy site background lightweight`);
  console.log(`PASS intro eligibility: ${name}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const base = process.argv[2] || 'http://localhost:4173/';
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
    const get = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      return parameter === 0x9246 || parameter === 0x1f01 ? 'Mobile GPU (eligibility test)' : get.call(this, parameter);
    };
  });
  await page.goto(base);
  await page.locator('.hero__skip').waitFor();
  await page.locator('.hero--sculpture').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.hero--lite').count(), 0);
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('lowend')), true);
  const canvas = await page.locator('.hero__gl').evaluate(el => ({
    pixels: el.width * el.height, width: el.width, cssWidth: el.clientWidth,
    display: getComputedStyle(el).display, antialias: el.getContext('webgl2').getContextAttributes().antialias,
  }));
  assert.ok(canvas.pixels <= 800000, 'Constrained phone pixel budget');
  assert.ok(canvas.width <= canvas.cssWidth + 1, 'Constrained phone DPR cap');
  assert.notEqual(canvas.display, 'none', 'lowend CSS must not hide the animated intro');
  assert.equal(canvas.antialias, false);
  // Let the actual animation finish; do not skip or seek it.
  await page.locator('.hero.is-settled').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.hero__skip').count(), 0);
  assert.equal(await page.locator('.hero__ctas').evaluate(el => getComputedStyle(el).opacity), '1');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.hero__gl');
    return Math.abs(canvas.width - canvas.clientWidth) <= 1;
  });
  assert.ok(await page.locator('.hero__gl').evaluate(el => el.width * el.height <= 800000));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.hero.is-settled').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.hero__skip').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS phone intro without force override, natural completion, visible canvas, low-memory budget, orientation change and reduced motion.');
  await page.close();
} finally { await browser.close(); }
