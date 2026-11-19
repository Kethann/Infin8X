import {firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
for(const [name,engine] of Object.entries({firefox,webkit})) {
 if(process.argv[2] && process.argv[2]!==name)continue;
 const browser=await engine.launch();
 try {
  for(const width of [390,1440]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://localhost:5173/');await page.waitForSelector('#contact');await page.waitForSelector('.hero.is-settled',{timeout:60000});
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#skills').scrollIntoViewIfNeeded();
   const tabs=page.getByRole('tab');await tabs.last().click();
   assert.equal(await page.getByRole('tabpanel').getByRole('heading',{level:3}).textContent(),'Data & ML');
   await page.locator('#projects').scrollIntoViewIfNeeded();
   const projects=page.locator('.work-entry');await projects.last().getByRole('button').click();
   await page.waitForFunction(()=>document.querySelector('.work-entry.is-open').getBoundingClientRect().height>300);
   assert.equal(await page.locator('.work-entry.is-open').getByRole('button').getAttribute('aria-expanded'),'true');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
   await page.waitForFunction(()=>!document.documentElement.classList.contains('motion'));
   await page.waitForFunction(()=>[...document.querySelectorAll('.section [data-reveal]')].every(el=>getComputedStyle(el).opacity!=='0'));
   if(width===390) {
    await page.getByRole('button',{name:'Open menu'}).click();
    await page.keyboard.press('Escape');assert.equal(await page.locator('#mobile-menu').isVisible(),false);
   }
   await projects.first().getByRole('button').click();
   await projects.first().getByRole('link').click();await page.waitForURL('**/work/kaaya-cafe');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.waitForFunction(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('.idea__fill')).transform);return m.a>.99&&m.d>.99;});
   await page.screenshot({path:`shots/compatibility-${name}-${width}.png`});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${name} ${browser.version()} ${width}px: layout, skills, project reveal, live motion settings, routes and responsive timeline.`);
   await page.close();
  }
 } finally {await browser.close();}
}
