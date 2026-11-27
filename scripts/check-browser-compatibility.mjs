// Current routes and controls, tested in Firefox and WebKit. Start a dev or preview server first.
// Usage: node scripts/check-browser-compatibility.mjs [baseUrl] [firefox|webkit]
import { firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function checkLayout(page, label) {
  const issues = await page.evaluate(() => {
    const problems = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('page overflow');
    const selectors = 'main h1:not(.sr-only), main h2, .chapter__lead, .pen__note.is-open, .work-gallery__link, .reel__link, .contact__form, .ledger__group, .case__facts, .case__next, .nav__bar';
    for (const el of document.querySelectorAll(selectors)) {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (!r.width || s.visibility === 'hidden' || s.display === 'none') continue;
      if (r.left < -1 || r.right > innerWidth + 1) problems.push(`${el.tagName}.${el.className} outside viewport`);
    }
    // Check text, not transformed collage frames or decorative glow layers.
    for (const el of document.querySelectorAll('.pen__note.is-open h3, .pen__note.is-open .pen__text, .work-gallery__discipline, .case__subtitle, .reel__disc')) {
      if (el.clientWidth && el.scrollWidth > el.clientWidth + 2) problems.push(`${el.className || el.tagName} text clipped`);
    }
    return problems;
  });
  assert.deepEqual(issues, [], label);
}

export async function checkViewport(browser, base, width, height, { mobile = false, touch = width <= 1024, textScale = 1 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: touch, isMobile: mobile });
  const label = `${browser.browserType().name()} ${width}x${height}${textScale > 1 ? ` text ${textScale * 100}%` : ''}`;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (textScale !== 1) await page.addInitScript(scale => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${scale * 100}%`; });
  }, textScale);
  const go = async path => {
    await page.goto(new URL(path, base).href);
    await page.locator(path === '/' ? '#contact' : path === '/skills' ? '.ledger__group' : '.case__facts').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const activate = async locator => touch ? locator.tap() : locator.click();
  try {
    await go('/');
    await page.locator('.hero.is-settled').waitFor();
    const ctaInside = await page.evaluate(() => document.querySelector('.hero__ctas').getBoundingClientRect().bottom <= document.querySelector('.hero').getBoundingClientRect().bottom + 1);
    assert.ok(ctaInside, `${label}: hero actions clipped`);
    for (const id of ['about', 'services', 'process', 'projects', 'contact']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await checkLayout(page, `${label} ${id}`);
    }
    for (let i = 0; i < 6; i++) {
      const tab = page.locator('.pen__tab').nth(i);
      await activate(tab);
      await page.locator('.pen__note.is-open').waitFor();
      assert.equal(await tab.getAttribute('aria-selected'), 'true', `${label}: first activation of step ${i + 1}`);
      await checkLayout(page, `${label} step ${i + 1}`);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.pen__note.is-open').count(), 0);
    }
    await page.locator('.pen__tab').first().focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.pen__tab').nth(1).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('.pen__tab').last().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Escape');
    // The menu button exists under 360px and from 1000px; 360–999px uses the icon pill instead (by design).
    const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
    const hasMenu = await toggle.isVisible();
    if (hasMenu) {
      await toggle.click();
      await page.locator('#mobile-menu a').last().scrollIntoViewIfNeeded();
      const menu = await page.locator('#mobile-menu').boundingBox();
      assert.ok(menu.y >= 0 && menu.y + menu.height <= height + 1, `${label}: menu outside viewport`);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobile-menu').isVisible(), false);
      assert.equal(await page.locator('#main').evaluate(el => el.inert), false);
      assert.notEqual(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
    }
    // Real route from the menu (or the icon pill), then a category at the end of the horizontally scrolling filters.
    if (hasMenu) {
      await toggle.click();
      await page.locator('#mobile-menu a[href="/skills"]').click();
    } else {
      await page.locator('.nav__links a[href="/skills"]').click();
    }
    await page.waitForURL('**/skills');
    await page.locator('.ledger__group').first().waitFor();
    await page.locator('.skills__filters button').last().click();
    assert.equal(await page.locator('.ledger__group').count(), 1);
    await activate(page.locator('.chip__button').first());
    await page.locator('.ledger__detail').waitFor();
    await checkLayout(page, `${label} filtered skills`);
    await page.locator('.skills__filters button').first().click();
    await checkLayout(page, `${label} all skills`);
    await page.locator('.skills__footer a').click();
    await page.waitForURL('**/#projects');
    await page.locator('#projects').waitFor();
    const links = page.locator(width < 960 ? '.work-gallery__link' : '.reel__index a');
    assert.equal(await links.count(), 4);
    await activate(links.first());
    await page.waitForURL('**/work/kaaya-cafe');
    await page.locator('.case__facts').waitFor();
    await checkLayout(page, `${label} Kaaya`);
    for (let i = 0; i < 3; i++) {
      await page.locator('.case__next').click();
      await page.locator('.case__facts').waitFor();
      await checkLayout(page, `${label} next project ${i + 1}`);
    }
    await page.locator('.case__back').click();
    await page.waitForURL('**/#projects');
    await page.locator('#contact').waitFor();
    assert.deepEqual(errors, [], label);
    console.log(`PASS ${label}: home, six process steps, menu, skills filters, all four project routes, return links.`);
  } catch (error) {
    console.error(`FAIL ${label} at ${page.url()}`, errors);
    await page.screenshot({ path: `/tmp/infin8x-compat-${browser.browserType().name()}-${width}.png` }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[2] || 'http://localhost:4173/';
  for (const [name, engine] of Object.entries({ firefox, webkit })) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    const browser = await engine.launch();
    try {
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900], [844, 390]]) {
        await checkViewport(browser, base, w, h, { mobile: name === 'webkit' && w <= 1024 });
      }
      console.log(`PASS ${name} ${browser.version()}`);
    } finally { await browser.close(); }
  }
}
