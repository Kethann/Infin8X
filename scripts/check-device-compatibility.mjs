import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
const observe=page=>page.on('pageerror',e=>errors.push(e.message));
try {
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[600,960],[768,1024],[1024,768],[1366,768],[1920,1080],[2560,1440],[844,390],[640,450]]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<1100,isMobile:width<900});observe(page);
  await page.goto('http://localhost:5173/');await page.waitForSelector('#contact');await page.waitForSelector('.hero.is-settled');await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{const hero=document.querySelector('.hero').getBoundingClientRect();const cta=document.querySelector('.hero__ctas').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,hero:hero.height,bottom:cta.bottom,top:cta.top};});
  assert.equal(layout.overflow,false,`${width}x${height}: page overflow`);
  assert.ok(layout.bottom<=layout.hero,`${width}x${height}: CTA clipped ${JSON.stringify(layout)}`);
  for(const id of ['about','skills','services','projects','contact']) {
   await page.locator(`#${id}`).scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id} ${width}: overflow`);
  }
  assert.equal(await page.locator('.section [data-reveal]').evaluateAll(els=>els.some(el=>getComputedStyle(el).opacity==='0')),false);
  if(width===320||height===390)await page.screenshot({path:`shots/device-${width}-${height}.png`});
  console.log(`PASS layout ${width}x${height}`);await page.close();
 }
 const fallback=await browser.newPage({viewport:{width:390,height:700},reducedMotion:'no-preference'});observe(fallback);
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args);};});
 await fallback.goto('http://localhost:5173/');await fallback.waitForSelector('.hero--lite.is-settled');
 assert.equal(await fallback.locator('.hero__original').evaluate(el=>el.complete&&el.naturalWidth>0),true);
 await fallback.getByRole('button',{name:'Open menu'}).click();
 await fallback.setViewportSize({width:1200,height:700});
 await fallback.waitForFunction(()=>document.body.style.overflow!=='hidden');
 await fallback.setViewportSize({width:844,height:390});await fallback.getByRole('button',{name:'Open menu'}).click();
 await fallback.locator('#mobile-menu a').last().scrollIntoViewIfNeeded();
 const menu=await fallback.locator('#mobile-menu').boundingBox();assert.ok(menu.y+menu.height<=390);
 await fallback.keyboard.press('Escape');assert.equal(await fallback.locator('#mobile-menu').isVisible(),false);
 await fallback.locator('.hero__original').dispatchEvent('error');await fallback.locator('.hero__original').evaluate(el=>el.decode());
 assert.match(await fallback.locator('.hero__original').getAttribute('src'),/\.png$/);
 console.log('PASS WebGL unavailable, PNG fallback, landscape menu, resize unlock, Escape.');await fallback.close();
 const gpu=await browser.newPage({viewport:{width:390,height:700},hasTouch:true,isMobile:true,deviceScaleFactor:3});observe(gpu);
 await gpu.goto('http://localhost:5173/?gl=force');await gpu.waitForSelector('.hero--sculpture',{timeout:60000});
 await gpu.evaluate(()=>window.__sculpture.timeline.progress(1));await gpu.waitForSelector('.hero.is-settled');
 assert.ok(await gpu.locator('.hero__gl').evaluate(el=>el.width*el.height<=1200001),'Mobile render budget');
 await gpu.evaluate(()=>{const scene=window.__sculpture.scene;window.renderCount=0;const render=scene.render;scene.render=(...args)=>{window.renderCount++;return render(...args);};});
 await gpu.locator('#contact').scrollIntoViewIfNeeded();await gpu.waitForTimeout(300);
 const paused=await gpu.evaluate(()=>window.renderCount);await gpu.waitForTimeout(300);assert.equal(await gpu.evaluate(()=>window.renderCount),paused,'Offscreen renderer stopped');
 await gpu.evaluate(()=>window.scrollTo(0,0));await gpu.waitForFunction(previous=>window.renderCount>previous,paused);
 await gpu.evaluate(()=>window.previousScene=window.__sculpture.scene);
 await gpu.emulateMedia({reducedMotion:'reduce'});
 await gpu.waitForFunction(()=>window.__sculpture.scene!==window.previousScene&&document.querySelector('.hero--sculpture.is-settled'),{},{timeout:60000});
 assert.equal(await gpu.evaluate(()=>document.documentElement.classList.contains('motion')),false);
 await gpu.locator('.hero__artwork-stage').focus();await gpu.keyboard.down('ArrowRight');
 assert.ok(await gpu.evaluate(()=>{const o=window.__sculpture.scene.orientation;return o.yaw>0&&o.yaw===o.targetYaw;}),'Live reduced-motion manual rotation');
 await gpu.keyboard.up('ArrowRight');
 assert.equal(await gpu.evaluate(()=>window.__sculpture.scene.orientation.yaw),0);
 await gpu.locator('.hero__gl').evaluate(el=>el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await gpu.waitForSelector('.hero--lite.is-settled');
 assert.equal(await gpu.locator('.hero').evaluate(el=>el.classList.contains('hero--sculpture')),false);
 assert.equal(await gpu.locator('.hero__original').evaluate(el=>getComputedStyle(el).opacity),'1');
 console.log('PASS high-DPR GPU budget, offscreen pause/resume, live motion preference, manual rotation, context-loss fallback.');
 await gpu.close();assert.deepEqual(errors,[]);console.log('PASS no page errors.');
} finally {await browser.close();}
