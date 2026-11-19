import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:5176';
const isolate=process.argv.includes('--isolate-hero');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
 for(const [width,height] of [[960,700],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using source artwork fallback'))errors.push(m.text());});
  if(isolate)await page.route('**/src/sections/BelowFold.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const SECTIONS=[];'}));
  // Visibility observers may resume a paused intro while fonts/GL initialise.
  // Freeze its clock until Skip seeks to completion, making the pre-reveal check stable.
  await page.addInitScript(()=>{let s;Object.defineProperty(window,'__sculpture',{get:()=>s,set:v=>{s=v;v.timeline?.pause(0).timeScale(0);}});});
  await page.goto(`${base}/?gl=force`);await page.waitForFunction(()=>!!window.__sculpture?.timeline,null,{polling:100});
  await page.evaluate(()=>{window.__sculpture.timeline.pause(0);document.body.style.minHeight='300vh';return document.fonts.ready;});
  const root=page.locator('.brand-wordmark');
  const read=()=>root.evaluate(el=>({strength:Number(el.style.getPropertyValue('--wm-hover-strength')||0),column:parseFloat(el.style.getPropertyValue('--wm-hover-column')||'.5'),phases:Array.from({length:5},(_,i)=>Number(el.style.getPropertyValue('--wm-hover-phase-'+i)||'-1.45'))}));
  let bounds=await root.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height*.5);await page.waitForTimeout(100);
  assert.equal((await read()).strength,0,'Hover does not interrupt the intro reveal');
  await page.mouse.move(5,100);await page.locator('.hero__skip').click();await page.locator('.hero.is-settled').waitFor();
  await page.evaluate(()=>{const {scene}=window.__sculpture;scene.render(10000,0);scene.render=()=>{};});
  bounds=await root.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.22,bounds.y+bounds.height*.5);
  await page.waitForTimeout(150);const gathering=await read();
  assert.ok(gathering.strength>.2&&gathering.strength<=.91,'Hover light rises smoothly');
  assert.ok(gathering.phases.every(v=>v>=-1.45&&v<=1.1),'Strands travel within the vertical formation range');
  await page.waitForTimeout(700);const formed=await read();
  assert.ok(Math.abs(formed.column-.22)<.015,'Highlight forms only around the hovered part');
  await page.screenshot({path:`shots/wordmark-hover-${width}-left.png`});
  const vertical=await read();await page.waitForTimeout(250);const advanced=await read();
  assert.equal(advanced.column,vertical.column,'Hover strands do not animate sideways');
  assert.ok(advanced.phases.some((p,i)=>Math.abs(p-vertical.phases[i])>.02),'Light moves vertically like the reveal');
  await page.mouse.move(bounds.x+bounds.width*.57,bounds.y+bounds.height*.5);await page.waitForTimeout(250);
  assert.ok(Math.abs((await read()).column-.57)<.015,'The highlight follows the hovered letters');
  await page.screenshot({path:`shots/wordmark-hover-${width}-middle.png`});
  const after=await root.boundingBox();
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-bounds[key])<.1,'Hover never changes text placement');
  await page.mouse.move(5,100);await page.waitForTimeout(90);
  assert.ok((await read()).strength>=0&&(await read()).strength<formed.strength,'Pointer exit reduces the local highlight');
  await page.mouse.move(bounds.x+bounds.width*.9,bounds.y+bounds.height*.5);await page.waitForTimeout(80);
  assert.ok((await read()).strength>.1,'Rapid re-entry preserves the existing light');
  await page.mouse.move(5,100);await page.waitForTimeout(600);assert.equal((await read()).strength,0,'The highlight fully clears on exit');
  await root.dispatchEvent('pointerenter',{pointerType:'touch',clientX:bounds.x+20,clientY:bounds.y+10});
  await root.dispatchEvent('pointermove',{pointerType:'touch',clientX:bounds.x+40,clientY:bounds.y+10});
  assert.equal((await read()).strength,0,'Touch does not leave a stuck hover highlight');
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.waitForTimeout(100);
  await page.evaluate(()=>window.scrollTo(0,innerHeight*1.7));await page.waitForTimeout(300);
  assert.equal((await read()).strength,0,'Leaving the viewport clears hover state');
  await page.evaluate(()=>window.scrollTo(0,0));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__sculpture?.timeline===null&&document.querySelector('.hero').classList.contains('is-settled'),null,{polling:100});
  await page.waitForTimeout(150);bounds=await root.boundingBox();
  await page.mouse.move(5,100);await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height*.5);await page.waitForTimeout(100);
  const still=await read();assert.equal(still.strength,.6);
  await page.waitForTimeout(250);assert.deepEqual(await read(),still,'Reduced motion uses a steady highlight');
  await page.mouse.move(5,100);assert.equal((await read()).strength,0);
  console.log(`PASS ${width}px: fixed vertical strands, local pointer selection, smooth exit/re-entry, unchanged layout, touch and reduced motion.`);
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{if(errors.length)console.error(errors);await browser.close();}
