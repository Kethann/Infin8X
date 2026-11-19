import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:process.env.CHROME??'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
const errors=[];
const observe=page=>{
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
};
const orientation=page=>page.evaluate(()=>({...window.__sculpture.scene.orientation}));
const home=async page=>{
  try {await page.waitForFunction(()=>{const o=window.__sculpture.scene.orientation;return o.yaw===0&&o.pitch===0&&!o.returning;},{},{timeout:40000});}
  catch(error) {console.log('Return diagnostics',await page.evaluate(()=>({orientation:window.__sculpture.scene.orientation,hidden:document.hidden,scroll:scrollY})));throw error;}
};
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});observe(page);
  await page.goto('http://localhost:5173/?gl=force');
  await page.waitForSelector('.hero--sculpture',{timeout:60000});
  await page.evaluate(()=>window.__sculpture.timeline.progress(1));
  await page.waitForSelector('.hero.is-settled');
  const stage=page.locator('.hero__artwork-stage'),box=await stage.boundingBox();
  const x=box.x+2,y=box.y+box.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+box.width,y,{steps:6});
  assert.ok(Math.abs((await orientation(page)).targetYaw-Math.PI*2)<.03,'Full 360-degree rotation while held');
  await page.mouse.move(x+box.width*.5,y,{steps:4});
  assert.ok(Math.abs((await orientation(page)).targetYaw-Math.PI)<.03,'Leftward drag reverses the rotation');
  await page.mouse.move(x+box.width*.5,y-box.height*.2,{steps:3});
  assert.ok((await orientation(page)).targetPitch<-.3,'Upward rotation');
  await page.mouse.move(x+box.width*.5,y+box.height*.2,{steps:3});
  assert.ok((await orientation(page)).targetPitch>.3,'Downward rotation');
  const before=await orientation(page);
  await page.mouse.move(x+box.width*.4,y+box.height*.1,{steps:3});
  const diagonal=await orientation(page);
  assert.ok(diagonal.targetYaw<before.targetYaw&&diagonal.targetPitch<before.targetPitch,'Diagonal rotation changes both axes');
  // Pointer capture keeps the gesture valid outside the original logo rectangle.
  await page.mouse.move(box.x+box.width+15,box.y+box.height+20,{steps:3});
  await page.mouse.up();
  const released=await orientation(page);
  assert.ok(released.returning,'Release starts return animation');
  assert.ok(Math.abs(released.yaw)>0.001||Math.abs(released.pitch)>0.001,'Return eases instead of snapping');
  await home(page);
  assert.equal(await stage.evaluate(el=>el.classList.contains('is-dragging')),false);
  console.log('Desktop: all drag directions, 360-degree turns and release outside the logo return to the exact original pose.');

  // Interrupt a return with another grab: no jump back to an old target.
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+box.width*.35,y,{steps:4});await page.mouse.up();
  await page.mouse.move(x+box.width*.3,y);await page.mouse.down();
  const grabbed=await orientation(page);
  assert.equal(grabbed.returning,false);
  assert.ok(Math.abs(grabbed.targetYaw-grabbed.yaw)<.0001,'Re-grab starts at the displayed orientation');
  await page.mouse.move(x+box.width*.4,y+15,{steps:2});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.mouse.up();await home(page);
  assert.equal(await stage.evaluate(el=>el.classList.contains('is-dragging')),false);
  await stage.focus();await page.keyboard.down('ArrowDown');
  assert.ok((await orientation(page)).targetPitch>.2);
  await page.keyboard.up('ArrowDown');await home(page);
  await page.screenshot({path:'shots/rotation-front-desktop.png'});
  console.log('Desktop: re-grab, focus loss and keyboard release also recover correctly.');
  await page.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});observe(mobile);
  await mobile.goto('http://localhost:5173/?gl=force');
  await mobile.waitForSelector('.hero--sculpture.is-settled',{timeout:60000});
  const touchStage=mobile.locator('.hero__artwork-stage'),touchBox=await touchStage.boundingBox();
  const cdp=await mobile.context().newCDPSession(mobile);
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
  const tx=touchBox.x+touchBox.width*.2,ty=touchBox.y+touchBox.height*.5;
  await touch('touchStart',tx,ty);await touch('touchMove',tx+touchBox.width*.5,ty);
  let o=await orientation(mobile);
  assert.ok(Math.abs(o.yaw-Math.PI)<.03,'Touch can reach the rear view while held');
  assert.equal(o.yaw,o.targetYaw,'Reduced-motion dragging follows the finger directly');
  await touch('touchEnd');await home(mobile);
  assert.equal(await mobile.evaluate(()=>scrollY),0,'Dragging the logo does not scroll the page');
  await touch('touchStart',tx,ty);await touch('touchMove',tx+touchBox.width*.2,ty+20);
  o=await orientation(mobile);assert.ok(o.yaw>0&&o.pitch>0,'Diagonal touch rotation');
  await touch('touchCancel');await home(mobile);
  assert.equal(await touchStage.evaluate(el=>el.classList.contains('is-dragging')),false,'Cancellation clears drag state');
  await mobile.screenshot({path:'shots/rotation-mobile.png'});
  await touch('touchStart',5,700);await touch('touchMove',5,500);await touch('touchMove',5,350);await touch('touchEnd');
  await mobile.waitForFunction(()=>scrollY>20);
  console.log('Touch: drag, release and cancellation return home; reduced motion and page scrolling preserved.');
  await mobile.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: rotation and return controls have no browser/shader errors.');
} finally {await browser.close();}
