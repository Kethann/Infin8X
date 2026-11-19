import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.argv[2]??'http://127.0.0.1:5174';
const browser=await chromium.launch({executablePath:process.env.CHROME??'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
  for (const [width,height] of [[960,700],[390,844]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
    page.setDefaultTimeout(120000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'||m.text().includes('Using source artwork fallback'))errors.push(m.text());});
    await page.addInitScript(()=>{
      let sculpture;
      Object.defineProperty(window,'__sculpture',{configurable:true,get:()=>sculpture,set:value=>{
        sculpture=value;
        value.timeline?.pause().progress(1);
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      }});
    });
    await page.goto(`${base}/?gl=force`);
    await page.waitForFunction(()=>!!window.__sculpture?.scene,null,{polling:100,timeout:120000});
    await page.evaluate(()=>document.fonts.ready);
    let time=10000;
    const advance=async(progress,velocity,frames)=>{
      const result=await page.evaluate(({progress,velocity,frames,time})=>{
        const {scene}=window.__sculpture;
        scene.scroll(progress,velocity);
        for(let i=0;i<frames;i++)scene.render(time+i*250,0.25);
        return {...scene.water};
      },{progress,velocity,frames,time});
      time+=frames*250;
      assert.ok(Object.values(result).every(Number.isFinite));
      return result;
    };
    const rest=await advance(0,0,1);
    assert.equal(rest.spread,0);
    assert.equal(rest.motion,0);
    await page.screenshot({path:`shots/water-${width}-rest.png`});
    const moving=await advance(0.35,height*2,2);
    assert.ok(moving.spread>0.65&&moving.spread<1,'Scrolling gradually spreads the reflection');
    assert.ok(moving.motion>0.2&&moving.motion<1,'Scroll velocity produces a bounded ripple');
    await page.screenshot({path:`shots/water-${width}-moving.png`});
    const stopped=await advance(0.35,0,12);
    assert.ok(stopped.motion<moving.motion*0.03,'Ripples settle after scrolling stops');
    assert.ok(stopped.spread>moving.spread,'The reflection holds the current scroll perspective');
    await page.screenshot({path:`shots/water-${width}-spread.png`});
    const returned=await advance(0,0,10);
    assert.ok(returned.spread<0.001&&returned.motion<0.001,'Returning to the top restores calm, close reflection');
    // Exercise the real ScrollTrigger connection as well as deterministic rendering.
    await page.evaluate(()=>window.scrollTo(0,innerHeight*0.2));
    await page.waitForFunction(()=>window.__sculpture.scene.water.target>0.1,null,{polling:100,timeout:10000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log(`PASS ${width}px: close reflection, local scroll spread, velocity response, damping, return and real scroll wiring.`);
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/?gl=force`);
  await page.waitForFunction(()=>!!window.__sculpture?.scene,null,{polling:100,timeout:120000});
  const water=await page.evaluate(()=>{
    const {scene}=window.__sculpture;
    scene.scroll(0.5,2000);scene.render(1000,0.1);
    return {...scene.water};
  });
  assert.deepEqual(water,{spread:0,target:0,motion:0,impulse:0},'Reduced motion keeps a calm water surface');
  assert.deepEqual(errors,[]);
  console.log('PASS reduced motion and no browser/shader errors.');
} finally {await browser.close();}
