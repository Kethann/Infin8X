import {chromium, firefox, webkit} from 'playwright';
import assert from 'node:assert/strict';
const name=process.argv[2]??'chromium';
const base=process.env.BASE_URL??'http://localhost:5173';
const browser=await ({chromium,firefox,webkit}[name]).launch(name==='chromium'?{executablePath:'/usr/bin/google-chrome'}:{});
try {
 for(const width of [320,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/');await page.locator('.flow-mark--ready').waitFor();await page.evaluate(()=>document.fonts.ready);
  const pixels=()=>page.locator('.flow-mark canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));
  const first=await pixels();await page.waitForTimeout(1400);const second=await pixels();
  const sourceWidth=await page.locator('.flow-mark canvas').evaluate(canvas=>canvas.width);
  let changed=0,whiteChanged=0,alphaChanged=0;
  for(let i=0;i<first.length;i+=4){
   if(first[i+3]!==second[i+3])alphaChanged++;
   if(first.slice(i,i+3).some((value,c)=>value!==second[i+c])){changed++;if((i/4)%sourceWidth<sourceWidth*90/256)whiteChanged++;}
  }
  assert.ok(changed>500,'Colour region animates');assert.equal(whiteChanged,0,'White half stays clean');assert.equal(alphaChanged,0,'Exact silhouette stays fixed');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.hero__details').screenshot({path:`shots/flow-wordmark-${name}-${width}.png`});
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  const paused=await pixels();await page.waitForTimeout(200);assert.deepEqual(await pixels(),paused,'Offscreen rendering pauses');
  const pausedImage=await page.locator('.flow-mark canvas').evaluate(canvas=>canvas.toDataURL());
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(previous=>document.querySelector('.flow-mark canvas').toDataURL()!==previous,pausedImage,{timeout:5000});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250);await page.locator('.flow-mark--ready').waitFor();
  const reduced=await pixels();await page.waitForTimeout(250);assert.deepEqual(await pixels(),reduced,'Reduced motion stays still');
  assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}px: colour flow, white region, silhouette, layout, offscreen pause/resume and reduced motion.`);await page.close();
 }
 const fallback=await browser.newPage();await fallback.route('**/wordmark-flow.bin',route=>route.abort());
 await fallback.goto(base+'/');await fallback.locator('.flow-mark > img').evaluate(img=>img.decode());
 assert.equal(await fallback.locator('.flow-mark > img').evaluate(img=>getComputedStyle(img).opacity),'1');
 console.log(`PASS ${name}: missing flow asset retains source logo.`);
}finally{await browser.close();}
