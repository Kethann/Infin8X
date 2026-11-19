import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:5174';
const isolate=process.argv.includes('--isolate-hero');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
 for(const [width,height] of [[960,700],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});page.setDefaultTimeout(120000);
  if(isolate)await page.route('**/src/sections/BelowFold.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const SECTIONS = [];'}));
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using source artwork fallback'))errors.push(m.text());});
  await page.addInitScript(()=>{let value;Object.defineProperty(window,'__sculpture',{get:()=>value,set:v=>{value=v;v.timeline?.pause(0);}});});
  await page.goto(`${base}/?gl=force`);await page.waitForFunction(()=>!!window.__sculpture?.timeline,null,{polling:100});
  if(isolate)await page.evaluate(()=>{document.body.style.minHeight='300vh';});
  await page.evaluate(()=>{const {scene,timeline}=window.__sculpture;timeline.pause().seek(timeline.labels.wordmarkReady,false);scene.render(10000,0);scene.render=()=>{};return document.fonts.ready;});
  const root=page.locator('.brand-wordmark');
  const style=()=>root.evaluate(el=>({a:el.style.getPropertyValue('--wm-a-phase'),b:el.style.getPropertyValue('--wm-b-phase'),column:el.style.getPropertyValue('--wm-a-column'),strength:el.style.getPropertyValue('--wm-a-strength')}));
  assert.equal((await style()).strength,'','Ambient light waits for the completed intro');
  await page.locator('.hero__skip').click();await page.locator('.hero.is-settled').waitFor();
  const bounds=await root.boundingBox();
  await page.waitForFunction(()=>{const el=document.querySelector('.brand-wordmark');if(!el)return false;const s=el.style;const p=parseFloat(s.getPropertyValue('--wm-a-phase'));const lit=Number(s.getPropertyValue('--wm-a-strength'))>.3&&p>-.8&&p<-.15;if(lit){Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}return lit;},null,{polling:50,timeout:15000});
  const first=await style();
  const gradient=await page.locator('.brand-wordmark__middle').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(gradient.includes('linear-gradient')&&!gradient.includes('none'),'Colour lines render as clipped gradients');
  await page.screenshot({path:`shots/wordmark-light-${width}.png`});
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(250);assert.notEqual((await style()).a,first.a,'Reveal-style strands travel vertically within the text');
  assert.equal((await style()).column,first.column,'Ambient strands stay in fixed columns rather than sweeping sideways');
  const after=await root.boundingBox();
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-bounds[key])<0.1,'Light never moves or resizes the lettering');
  await page.evaluate(()=>window.scrollTo(0,innerHeight*1.7));await page.waitForTimeout(250);
  const paused=await style();await page.waitForTimeout(300);assert.deepEqual(await style(),paused,'Offscreen light pauses');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(previous=>document.querySelector('.brand-wordmark').style.getPropertyValue('--wm-a-phase')!==previous,paused.a,{polling:50,timeout:12000});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.hero.is-settled').waitFor();
  await page.waitForTimeout(100);assert.deepEqual(await style(),{a:'',b:'',column:'',strength:''},'Reduced motion restores the steady silver lettering');
  console.log(`PASS ${width}px: post-reveal vertical strands, stable text, offscreen pause/resume and reduced motion.`);await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{if(errors.length)console.error(errors);await browser.close();}
