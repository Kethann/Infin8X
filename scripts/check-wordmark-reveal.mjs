import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:5174';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
try {
 for(const [width,height,repeat] of [[960,700,false],[390,844,true]]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'no-preference'});p.setDefaultTimeout(120000);
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'||m.text().includes('Using source artwork fallback'))errors.push(m.text());});
  await p.addInitScript(repeat=>{
   if(repeat)sessionStorage.setItem('infin8x:intro-seen','1');
   let sculpture;
   Object.defineProperty(window,'__sculpture',{get:()=>sculpture,set:value=>{
    sculpture=value;value.timeline?.pause(0);
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
   }});
  },repeat);
  await p.goto(`${base}/?gl=force`);
  await p.waitForFunction(()=>!!window.__sculpture?.timeline,null,{polling:100});
  await p.evaluate(()=>document.fonts.ready);
  let previous=Array(48).fill(0);
  for(const fraction of [0,0.25,0.55,0.85,1]){
   const result=await p.evaluate(fraction=>{
    const {scene,timeline}=window.__sculpture;
    const time=timeline.labels.wordmark+fraction*(timeline.labels.wordmarkReady-timeline.labels.wordmark);
    timeline.pause().seek(time,false);scene.render(time*1000,0);
    return {
     heights:[...document.querySelectorAll('[data-wordmark-slice]')].map(r=>Number(r.getAttribute('height'))),
     beams:[...document.querySelectorAll('[data-wordmark-beam]')].map(r=>Number(getComputedStyle(r).opacity)),
     overflow:document.documentElement.scrollWidth>innerWidth,
     text:document.querySelector('.brand-wordmark').getAttribute('aria-label'),
    };
   },fraction);
   assert.equal(result.heights.length,48);
   assert.equal(result.text,'Infin8X');assert.equal(result.overflow,false);
   assert.ok(result.heights.every((h,i)=>h>=previous[i]&&h<=1),'Every vertical slice reveals monotonically');
   if(fraction===0)assert.ok(result.heights.every(h=>h===0),'No wordmark pops in before its light arrives');
   if(fraction===0.25){
    assert.ok(result.beams.some(v=>v>0.1),'Vertical beams lead the reveal');
    assert.ok(result.heights.slice(21,27).some(h=>h>0.1),'The name starts forming at its centre');
    assert.ok([...result.heights.slice(0,6),...result.heights.slice(-6)].every(h=>h===0),'Outer letters wait for the outward flow');
   }
   if(fraction===1){assert.ok(result.heights.every(h=>h===1));assert.ok(result.beams.every(v=>v===0));}
   previous=result.heights;
   await p.screenshot({path:`shots/wordmark-reveal-${width}-${fraction}.png`});
  }
  await p.locator('.hero__skip').click();await p.locator('.hero.is-settled').waitFor();
  const settled=await p.evaluate(()=>({mask:getComputedStyle(document.querySelector('.wordmark-reveal__face')).maskImage,beams:getComputedStyle(document.querySelector('.wordmark-reveal__beams')).display,opacity:getComputedStyle(document.querySelector('.hero__brand')).opacity}));
  assert.deepEqual(settled,{mask:'none',beams:'none',opacity:'1'});
  console.log(`PASS ${width}px ${repeat?'repeat':'first'} visit: vertical light reveal, continuous letter formation, settled lettering, Skip and layout.`);
  await p.close();
 }
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${base}/?gl=force`);await p.locator('.hero--sculpture.is-settled').waitFor({timeout:120000});
 const reduced=await p.evaluate(()=>({mask:getComputedStyle(document.querySelector('.wordmark-reveal__face')).maskImage,beams:getComputedStyle(document.querySelector('.wordmark-reveal__beams')).display}));
 assert.deepEqual(reduced,{mask:'none',beams:'none'});
 assert.deepEqual(errors,[]);console.log('PASS reduced motion: fully readable text without light animation; no browser/shader errors.');
}finally{await b.close();}
