import {chromium} from 'playwright';
import {mkdir,readFile} from 'node:fs/promises';
const folder='/tmp/infin8x-wordmark-animation-frames';
await mkdir(folder,{recursive:true});
const palette=JSON.parse(await readFile('src/brand/flowPalette.json','utf8'));
const fps=24,frames=312;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:700,height:160},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',error=>console.error(error));
 await page.goto('http://localhost:5173/');await page.locator('.flow-mark--ready').waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:`
  html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important}
  .nav,.footer,.skip-link,.hero__tagline,.hero__ctas,.hero__scrollcue,.hero__skip,.hero__rotation-controls{display:none!important}
  .hero{width:700px!important;height:160px!important;min-height:0!important;background:transparent!important}
  .hero__gl,.hero__artwork-stage{display:none!important}
  .hero__artwork-stage{width:900px!important;top:24px!important;left:50px!important;right:auto!important;margin:0!important}
  .hero__original{opacity:0!important}
  .hero__details{top:24px!important;padding:0!important}
  .hero__brand{margin:0!important}
  .brand-wordmark{font-size:104px!important;filter:none!important}
 `});
 await page.evaluate(async palette=>{
  const canvas=document.querySelector('.flow-mark canvas'),ctx=canvas.getContext('2d');
  const img=new Image();img.src='/brand/wordmark-flow-source.png';await img.decode();
  ctx.drawImage(img,0,0);const source=ctx.getImageData(0,0,canvas.width,canvas.height);
  const output=new ImageData(new Uint8ClampedArray(source.data),canvas.width,canvas.height);
  const fields=new Float32Array(await (await fetch('/brand/wordmark-flow.bin')).arrayBuffer());
  const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const base=Float32Array.from(source.data,x=>linear(x/255));
  const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const stops=palette.map(p=>p.rgb.map(x=>x**2.2));
  const spectrum=p=>{p=((p%1)+1)%1;const i=palette.findIndex((_,i)=>p<(palette[i+1]?.position??1));const mix=smooth(palette[i].position,palette[i+1]?.position??1,p);return stops[i].map((x,c)=>x*(1-mix)+stops[(i+1)%stops.length][c]*mix);};
  window.renderExport=(frame,fps)=>{
   const time=frame/fps;
   for(let i=0;i<fields.length;i+=5){
    const pixel=fields[i]*4,along=fields[i+1],across=fields[i+2],mask=fields[i+3],pigment=fields[i+4];
    const phase=along*1.1-time*.035+.022*Math.sin(across*.012+along*10-time*.22)+across*.0013;
    const mix=.10+.04*Math.sin(across*.018-along*8+time*.19),a=spectrum(phase),b=spectrum(phase+.065);
    const white=mask*(1-smooth(.035,.09,along));
    for(let c=0;c<3;c++){
     const colour=(a[c]*(1-mix)+b[c]*mix)*pigment;
     const value=(base[pixel+c]*(1-mask)+colour*mask)*(1-white)+(c===2?.85:.835)*white;
     output.data[pixel+c]=Math.round(255*Math.min(1,value<=.0031308?value*12.92:1.055*value**(1/2.4)-.055));
    }
   }
   ctx.putImageData(output,0,0);
  };
  window.renderExport(0,24);

 },palette);
 for(let frame=0;frame<frames;frame++){
  await page.evaluate(({frame,fps})=>window.renderExport(frame,fps),{frame,fps});
  await page.screenshot({path:`${folder}/${String(frame).padStart(4,'0')}.png`,omitBackground:true});
  if(frame%24===0)console.log(`Rendered ${frame}/${frames} frames`);
 }
 console.log(`DONE: ${frames} frames at ${fps} fps in ${folder}`);
}finally{await browser.close();}
