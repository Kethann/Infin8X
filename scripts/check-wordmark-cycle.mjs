import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
  for(const [width,height] of [[960,700],[390,844]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
    page.setDefaultTimeout(120000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      let scene;
      Object.defineProperty(window,'__sculpture',{get:()=>scene,set:value=>{
        scene=value;value.timeline?.pause(0).timeScale(0);
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      }});
    });
    await page.goto(`${process.argv[2]??'http://127.0.0.1:5176'}/?gl=force`);
    await page.waitForFunction(()=>!!window.__sculpture?.timeline);
    await page.evaluate(()=>document.fonts.ready);
    const cycle=page.locator('.wordmark-cycle');
    assert.equal(await cycle.getAttribute('data-wordmark-state'),'brand');
    assert.equal(await page.locator('[data-cycle-face="1"]').evaluate(el=>getComputedStyle(el).opacity),'0','Intro shows only the original name');
    await page.locator('.hero__skip').click();
    await page.locator('.hero.is-settled').waitFor();
    const before=await cycle.boundingBox();
    await page.evaluate(async()=>{
      const {scene}=window.__sculpture;scene.render(10000,0);scene.render=()=>{};
      // Let the software-rendered first frame present before measuring wall time.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const root=document.querySelector('.wordmark-cycle');
      window.cycleStates=[];window.cycleStart=performance.now();
      window.glowPeak=0;window.glowCount=0;
      const sampleGlow=()=>{
        const strengths=[...root.querySelectorAll('[data-cycle-glow]')].map(el=>Number(el.style.opacity));
        window.glowPeak=Math.max(window.glowPeak,...strengths);
        window.glowCount=Math.max(window.glowCount,strengths.filter(value=>value>.1).length);
        requestAnimationFrame(sampleGlow);
      };
      requestAnimationFrame(sampleGlow);
      new MutationObserver(()=>{
        const state=root.dataset.wordmarkState;
        const face=state==='brand'?0:1;
        window.cycleStates.push({state,time:performance.now()-window.cycleStart,
          complete:[...root.querySelectorAll(`[data-cycle-slice="${face}"]`)].every(el=>Number(el.getAttribute('height'))===1),
          opacity:getComputedStyle(root.querySelector(`[data-cycle-face="${face}"]`)).opacity});
      }).observe(root,{attributes:true,attributeFilter:['data-wordmark-state']});
      delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(()=>document.querySelector('.wordmark-cycle').dataset.wordmarkState==='experience');
    const glow=await page.evaluate(()=>({peak:window.glowPeak,count:window.glowCount,
      resting:[...document.querySelectorAll('[data-cycle-glow]')].every(el=>Number(el.style.opacity)===0)}));
    assert.ok(glow.peak>.1&&glow.peak<=.54&&glow.count>0&&glow.count<48,'A restrained subset of vertical strands glows during formation');
    assert.ok(glow.resting,'The glow clears completely once the phrase has formed');
    await page.screenshot({path:`shots/wordmark-cycle-${width}-experience.png`});
    const after=await cycle.boundingBox();
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-before[key])<.1,'The alternate phrase never shifts the layout');
    assert.ok(after.x>=0&&after.x+after.width<=width,'Both wordmark faces remain within the viewport');
    const textFits=await page.locator('[data-cycle-face="1"]').evaluate(el=>{
      const range=document.createRange();range.selectNodeContents(el);
      const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
      return text.left>=box.left-1&&text.right<=box.right+1;
    });
    assert.ok(textFits,'The entire phrase fits inside its mask');
    await page.waitForFunction(()=>window.cycleStates.filter(x=>x.state==='transition').length>=4);
    const states=await page.evaluate(()=>window.cycleStates);
    const starts=states.filter(x=>x.state==='transition');
    assert.ok(starts[0].time>2200,`The original name holds before the first transition: ${JSON.stringify(starts)}`);
    for(let index=1;index<starts.length;index++)assert.ok(Math.abs(starts[index].time-starts[index-1].time-2600)<300,'Transitions repeat every 2.6 seconds');
    assert.deepEqual(states.filter(x=>x.state!=='transition').slice(0,3).map(x=>x.state),['experience','brand','experience']);
    assert.ok(states.filter(x=>x.state!=='transition').every(x=>x.complete&&x.opacity==='1'),'Every settled face is fully revealed, including after looping');
    await page.waitForFunction(()=>document.querySelector('.wordmark-cycle').dataset.wordmarkState==='brand');
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const count=await page.evaluate(()=>window.cycleStates.length);
    await page.waitForTimeout(2800);
    assert.equal(await page.evaluate(()=>window.cycleStates.length),count,'Hidden tabs pause the cycle');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>document.querySelector('.wordmark-cycle').dataset.wordmarkState==='experience');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('.wordmark-cycle').dataset.wordmarkState==='brand');
    await page.waitForTimeout(2800);
    assert.equal(await cycle.getAttribute('data-wordmark-state'),'brand','Reduced motion keeps the brand static');
    assert.equal(await page.locator('[data-cycle-face="1"]').evaluate(el=>getComputedStyle(el).opacity),'0');
    console.log(`PASS ${width}px: intro gating, 2.6-second cadence, both directions, repeat boundary, stable layout, phrase fit, visibility pause and reduced motion.`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
