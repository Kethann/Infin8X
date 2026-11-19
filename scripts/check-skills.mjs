import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
const errors = [];
try {
  for (const [width, height, reducedMotion] of [[1440,1050,'reduce'], [390,844,'reduce'], [768,1024,'no-preference'], [320,800,'reduce']]) {
    const page = await browser.newPage({ viewport: {width,height}, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://localhost:5173/#skills');
    await page.waitForSelector('#contact');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#skills').scrollIntoViewIfNeeded();
    const tabs = page.getByRole('tab', {name: /./});
    assert.equal(await tabs.count(), 7);
    assert.equal(await page.getByRole('tabpanel').count(), 1);
    assert.equal(await page.getByRole('tab', {selected:true}).innerText(), width >= 800 ? '02\nFrontend\n↗' : 'Frontend');
    await page.getByRole('tab', {selected:true}).focus();
    await page.keyboard.press(width >= 800 ? 'ArrowDown' : 'ArrowRight');
    await page.getByRole('tabpanel').getByRole('heading', {name:'Backend',exact:true}).waitFor();
    await page.keyboard.press('End');
    await page.getByRole('tabpanel').getByRole('heading', {name:'Data & ML',exact:true}).waitFor();
    await page.keyboard.press(width >= 800 ? 'ArrowDown' : 'ArrowRight');
    await page.getByRole('tabpanel').getByRole('heading', {name:'Languages',exact:true}).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('tabpanel').evaluate(el=>el===document.activeElement),true);
    let total = 0;
    for (let i=0;i<7;i++) {
      await tabs.nth(i).click();
      const panel=page.getByRole('tabpanel');
      total += await panel.locator('li').count();
      assert.equal(await panel.locator('li p').evaluateAll(elements=>elements.every(el=>el.textContent.trim().length>0)),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: horizontal overflow`);
      const tab=await tabs.nth(i).boundingBox();
      assert.ok(tab.x>=0 && tab.x+tab.width<=width+1,`${width}: selected category is clipped`);
    }
    assert.equal(total,30);
    assert.equal(await page.locator('.spectrum, .tool__level, #process, .prismflow, .hero__grain').count(),0);
    await tabs.nth(1).click();
    await page.evaluate(()=>window.scrollTo(0, document.querySelector('#skills').offsetTop-92));
    await page.screenshot({path:`shots/skills-${width}.png`});
    if (width===390) {
      await tabs.nth(5).click();
      await page.getByRole('tabpanel').scrollIntoViewIfNeeded();
      await page.screenshot({path:'shots/skills-mobile-robotics.png'});
    }
    console.log(`PASS ${width}px: all 30 tools, seven categories, keyboard navigation, focus and overflow.`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: no browser errors.');
} finally { await browser.close(); }
