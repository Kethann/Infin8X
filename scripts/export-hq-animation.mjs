import {chromium} from 'playwright';
import {mkdir,readFile,access} from 'node:fs/promises';
const kind=process.argv[2]??'full';
if(!['full','text'].includes(kind))throw new Error('Choose full or text');
const full=kind==='full',width=full?2000:2400,height=full?880:550;
const scale=full?2:24/7,fps=30,frames=390;
const folder=`/tmp/infin8x-hq-${kind}-frames`;
await mkdir(folder,{recursive:true});
const palette=JSON.parse(await readFile('src/brand/flowPalette.json','utf8'));
const source=await readFile('/tmp/infin8x-logo-export/wordmark-flow-source.png');
const field=await readFile('/tmp/infin8x-logo-export/wordmark-flow.bin');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',error=>console.error(error));
 await page.route('**/brand/wordmark-flow-source.png',route=>route.fulfill({contentType:'image/png',body:source}));
 await page.route('**/brand/wordmark-flow.bin',route=>route.fulfill({contentType:'application/octet-stream',body:field}));
 await page.goto('http://localhost:5173/');await page.locator('.flow-mark--ready').waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:`
 html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important}
 .nav,.footer,.skip-link,.hero__tagline,.hero__ctas,.hero__scrollcue,.hero__skip,.hero__rotation-controls{display:none!important}
 .hero{width:${width}px!important;height:${height}px!important;min-height:0!important;background:transparent!important}
 .hero__gl{display:${full?'block':'none'}!important;opacity:1!important;transform:none!important}
 .hero__artwork-stage{display:${full?'block':'none'}!important;width:${900*scale}px!important;top:${24*scale}px!important;left:${50*scale}px!important;right:auto!important;margin:0!important}
 .hero__original{opacity:0!important}.hero__details{top:${(full?344:24)*scale}px!important;padding:0!important}
 .hero__brand{margin:0!important}.brand-wordmark{font-size:${(full?52:104)*scale}px!important;filter:none!important}
 `});
 await page.evaluate(async({palette,full,width,height})=>{
  document.documentElement.classList.remove('lowend');
  let scene,gl,presentation;
  if(full){
   const {createArtworkBackdrop}=await import('/src/hero/artworkBackdrop.ts');
   gl=document.querySelector('.hero__gl');scene=await createArtworkBackdrop(gl,false,document.querySelector('.hero__artwork-stage'));
   Object.assign(scene.state,{reveal:1,turn:1,sweep:1});
   if(gl.width!==width||gl.height!==height)throw new Error(`Unexpected render resolution ${gl.width}×${gl.height}`);
   const shown=document.createElement('canvas');shown.width=width;shown.height=height;
   shown.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none';
   document.querySelector('.hero').append(shown);presentation=shown.getContext('2d');
  }
  const canvas=document.querySelector('.flow-mark canvas'),ctx=canvas.getContext('2d');
  const img=new Image();img.src='/brand/wordmark-flow-source.png';await img.decode();
  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx.drawImage(img,0,0);
  const source=ctx.getImageData(0,0,canvas.width,canvas.height),output=new ImageData(new Uint8ClampedArray(source.data),canvas.width,canvas.height);
  const fields=new Float32Array(await(await fetch('/brand/wordmark-flow.bin')).arrayBuffer());
  const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const base=Float32Array.from(source.data,x=>linear(x/255));
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const spectrum=new Float32Array(8192*3);
  for(let i=0;i<8192;i++){
   const p=i/8192,j=palette.findIndex((_,j)=>p<(palette[j+1]?.position??1)),mix=smooth(palette[j].position,palette[j+1]?.position??1,p);
   for(let c=0;c<3;c++)spectrum[i*3+c]=palette[j].rgb[c]**2.2*(1-mix)+palette[(j+1)%palette.length].rgb[c]**2.2*mix;
  }
  const spec=p=>Math.floor((p-Math.floor(p))*8192)*3;
  let lastTime=0;
  window.renderHQ=(frame,fps)=>{
   const time=frame/fps;
   if(scene){
    // Resume unfinished exports without changing the shader's elapsed-time clock.
    while(time-lastTime>=1){lastTime+=.5;scene.render(lastTime*1000,.5);}
    scene.render(time*1000,frame?1/fps:0);lastTime=time;
    presentation.clearRect(0,0,width,height);presentation.drawImage(gl,0,0);
   }
   for(let i=0;i<fields.length;i+=5){
    const pixel=fields[i]*4,along=fields[i+1],across=fields[i+2],mask=fields[i+3],pigment=fields[i+4];
    const phase=along*1.1-time*.035+.022*Math.sin(across*.012+along*10-time*.22)+across*.0013;
    const mix=.10+.04*Math.sin(across*.018-along*8+time*.19),a=spec(phase),b=spec(phase+.065);
    const white=mask*(1-smooth(.035,.09,along));
    for(let c=0;c<3;c++){
     const colour=(spectrum[a+c]*(1-mix)+spectrum[b+c]*mix)*pigment;
     const value=(base[pixel+c]*(1-mask)+colour*mask)*(1-white)+(c===2?.85:.835)*white;
     output.data[pixel+c]=Math.round(255*Math.min(1,value<=.0031308?value*12.92:1.055*value**(1/2.4)-.055));
    }
   }
   ctx.putImageData(output,0,0);
  };
  window.renderHQ(0,30);
  if(full&&!presentation.getImageData(0,0,width,height/2).data.some((v,i)=>i%4===3&&v>0))throw new Error('Missing main logo');
 },{palette,full,width,height});
 for(let frame=0;frame<frames;frame++){
  const file=`${folder}/${String(frame).padStart(4,'0')}.png`;
  if(await access(file).then(()=>true,()=>false))continue;
  await page.evaluate(({frame,fps})=>window.renderHQ(frame,fps),{frame,fps});
  await page.screenshot({path:file,omitBackground:true});
  if(frame%30===0)console.log(`${kind}: ${frame}/${frames} native ${width}×${height} frames`);
 }
 console.log(`DONE ${kind}: ${frames} frames at ${fps} fps`);
}finally{await browser.close();}
