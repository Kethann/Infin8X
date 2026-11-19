import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
try{
 const page=await browser.newPage({viewport:{width:1050,height:500}});
 for(const file of ['INFIN8X-animated-full-logo.gif','INFIN8X-animated-text-only.gif','INFIN8X-animated-logo.webp','INFIN8X-animated-text-only.webp']){
  await page.setContent(`<style>body{margin:0;background:#020611}img{display:block;max-width:100%}</style><img src="http://localhost:5173/exports/${file}" alt="INFIN8X animation">`);
  await page.locator('img').evaluate(img=>img.decode());
  await page.waitForTimeout(250);const first=await page.locator('img').screenshot();
  await page.waitForTimeout(1300);const second=await page.locator('img').screenshot({path:`shots/export-${file}.png`});
  assert.equal(first.equals(second),false,`${file} must animate in browser`);
  console.log(`PASS browser playback: ${file}`);
 }
 await page.goto('http://localhost:5173/exports/INFIN8X-animation-preview.html');
 assert.equal(await page.locator('img').count(),2);
 for(const image of await page.locator('img').all())await image.evaluate(img=>img.decode());
 await page.getByRole('button',{name:'Toggle transparency preview'}).click();
 assert.equal(await page.locator('body').getAttribute('class'),'checker');
 console.log('PASS offline preview: both embedded animations and transparency toggle.');
}finally{await browser.close();}
