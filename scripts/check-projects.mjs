import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
 for(const [width,height,motion] of [[1440,1000,'no-preference'],[768,1024,'reduce'],[390,844,'reduce'],[320,800,'no-preference']]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/#projects');
  await page.waitForSelector('#contact');await page.evaluate(()=>document.fonts.ready);
  await page.locator('#projects').scrollIntoViewIfNeeded();
  const rows=page.locator('.work-entry');
  assert.equal(await rows.count(),4);
  for(const [name,count] of [['Web',3],['AI & Robotics',1],['App',0]]) {
   await page.getByRole('group',{name:'Filter projects'}).getByRole('button',{name:new RegExp(`^${name}`)}).click();
   assert.equal(await rows.count(),count);
  }
  await page.getByRole('button',{name:'View all projects'}).click();
  assert.equal(await rows.count(),4);
  const settle=async()=>page.locator('.work-index').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
  for(let i=0;i<4;i++) {
   const button=rows.nth(i).getByRole('button');
   if(await button.getAttribute('aria-expanded')==='false')await button.click();
   await settle();
   assert.equal(await page.locator('.work-entry__toggle[aria-expanded="true"]').count(),1);
   assert.equal(await page.getByRole('region',{name:/Kaaya|Dolly|UC8|KA/}).count(),1);
   assert.equal(await page.locator('.work-entry__link[tabindex="0"]').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const image=await rows.nth(i).locator('.project-study__scene').boundingBox();
   assert.ok(image.width>150 && image.height>150,'Design study has a visible canvas');
   if(width===1440) {
    await rows.nth(i).scrollIntoViewIfNeeded();
    await page.screenshot({path:`shots/work-index-${i}.png`});
   }
  }
  await rows.first().getByRole('button').focus();
  await page.keyboard.press('Enter');await settle();
  assert.equal(await rows.first().getByRole('button').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Tab');assert.equal(await rows.first().locator('.work-entry__link').evaluate(el=>el===document.activeElement),true);
  await rows.first().getByRole('button').focus();await page.keyboard.press('Space');await settle();
  assert.equal(await rows.first().getByRole('button').getAttribute('aria-expanded'),'false');
  await page.keyboard.press('Tab');assert.equal(await rows.nth(1).getByRole('button').evaluate(el=>el===document.activeElement),true);
  await rows.first().getByRole('button').click();await settle();
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#projects').offsetTop+70));
  await page.screenshot({path:`shots/work-redesign-${width}.png`});
  await rows.first().getByRole('link').click();await page.waitForURL('**/work/kaaya-cafe');
  await page.getByRole('heading',{name:'Kaaya Cafe: QR ordering',exact:true}).waitFor();
  assert.equal(await page.locator('.cover__caption').textContent(),'DESIGN STUDY');
  console.log(`PASS ${width}px: filters, reveal/collapse, focus order, artwork, overflow and project route.`);
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: no browser errors.');
} finally {await browser.close();}
