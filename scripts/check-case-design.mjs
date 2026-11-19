import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const slugs=['kaaya-cafe','dolly-design-studio','delivery-robot-sn15','amuse-portfolio'];
try {
 for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:width===390?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const slug of slugs) {
   await page.goto(`http://localhost:5173/work/${slug}`);
   await page.locator('.case__title').waitFor();await page.evaluate(()=>document.fonts.ready);
   await page.locator('.case__frame').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${slug} overflows at ${width}`);
   assert.equal(await page.locator('.case__notes li').count(),4);
   assert.equal(await page.locator('.case').innerText().then(text=>/PLACEHOLDER|CONFIRM/.test(text)),false);
   const bounds=await page.locator('.case__frame').boundingBox();assert.ok(bounds.width>270&&bounds.height>200);
   if(width===1440||width===390)await page.screenshot({path:`shots/case-${slug}-${width}.png`,fullPage:true});
   await page.locator('.case__explore').click();
   await page.waitForFunction(()=>{const r=document.querySelector('#project-overview').getBoundingClientRect();return r.top>=0&&r.top<150;});
   await page.getByRole('link',{name:/Next project:/}).click();
   await page.waitForURL(`**/work/${slugs[(slugs.indexOf(slug)+1)%slugs.length]}`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.case__hero').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.getByRole('link',{name:'All projects',exact:true}).click();await page.waitForURL('http://localhost:5173/');
  await page.locator('#projects').waitFor();
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: four routes, overflow, concept labels, anchor, next/back navigation, reduced motion and console.`);
  await page.close();
 }
}finally{await browser.close();}
