import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const label=process.argv[2]??'after';
const poses=label==='before'?[['side',1.15]]:[['front',0],['side',1.15],['opposite',-1.15],['rear',Math.PI]];
const browser=await chromium.launch({executablePath:process.env.CHROME??'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://localhost:5173/?gl=force');
  await page.waitForSelector('.hero--sculpture.is-settled',{timeout:60000});
  for (const [name,yaw] of poses) {
    await page.evaluate(angle=>{
      const scene=window.__sculpture.scene;
      scene.resetRotation();scene.render(0,0);
      scene.rotate(angle,0);scene.render(0,0);
    },yaw);
    await page.screenshot({path:`shots/surface-${label}-${name}.png`});
    console.log(`${label}: ${name} surface captured at fixed lighting and colour phase.`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: no browser or shader errors.');
} finally {await browser.close();}
