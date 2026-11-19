import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const yaw=Number(process.argv[2]??0);
const browser=await chromium.launch({executablePath:process.env.CHROME??'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://localhost:5173/?gl=force');
  await page.waitForSelector('.hero--sculpture',{timeout:60000});
  await page.evaluate(()=>{const s=window.__sculpture;s.timeline.progress(1);s.scene.render(5000,.016);});
  await page.waitForSelector('.hero.is-settled');
  if (yaw) {
    await page.evaluate(angle=>window.__sculpture.scene.rotate(angle,0),yaw);
    await page.waitForFunction(()=>{const o=window.__sculpture.scene.orientation;return Math.abs(o.yaw-o.targetYaw)<.01;},{},{timeout:30000});
  }
  await page.screenshot({path:'shots/colour-flow-a.png'});
  await page.waitForTimeout(2500);
  await page.screenshot({path:'shots/colour-flow-b.png'});
  assert.deepEqual(errors,[]);
  console.log(`Captured successive frames at ${yaw} radians; no browser or shader errors.`);
} finally {await browser.close();}
