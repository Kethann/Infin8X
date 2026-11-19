import { useEffect, useId, useRef } from 'react';
import gsap from 'gsap';
import { brand } from '../content/site';
import { BrandWordmark } from './BrandWordmark';
import { useReducedMotion } from '../lib/useReducedMotion';

const columns=Array.from({length:48},(_,index)=>index);
const cadence=4.8;

/** Both faces occupy one fixed footprint; only their vertical apertures change. */
export function CyclingWordmark() {
  const ref=useRef<HTMLSpanElement>(null);
  const id=`wordmark-cycle-${useId().replace(/:/g,'')}`;
  const reduced=useReducedMotion();
  useEffect(()=>{
    const root=ref.current!;
    const faces=Array.from(root.querySelectorAll<HTMLElement>('[data-cycle-face]'));
    const beams=Array.from(root.querySelectorAll<HTMLElement>('[data-cycle-glow]'));
    const slices=faces.map((_,index)=>Array.from(root.querySelectorAll<SVGRectElement>(`[data-cycle-slice="${index}"]`)));
    let ready=!!root.closest('.hero.is-settled'), visible=false, started=false;
    const reset=()=>{
      faces.forEach((face,index)=>{
        gsap.set(face,{opacity:index===0?1:0,clearProps:'filter'});
        face.style.pointerEvents=index===0?'auto':'none';
        gsap.set(slices[index],{attr:{y:0,height:index===0?1:0}});
      });
      root.dataset.wordmarkState='brand';
      gsap.set(beams,{opacity:0});
    };
    reset();
    if(reduced)return reset;
    const timeline=gsap.timeline({paused:true,repeat:-1});
    // A real hold tween retains its remaining time when the tab/hero is hidden.
    const openingHold=gsap.to({},{duration:cadence,paused:true,onComplete:()=>{timeline.play();}});
    const transition=(from:number,to:number,at:number)=>{
      timeline.call(()=>{
        root.dataset.wordmarkState='transition';
        faces[from].style.pointerEvents='none';
        // Clear a hover gracefully before hiding its face.
        faces[from].querySelector('.brand-wordmark')?.dispatchEvent(new Event('pointerleave'));
      },[],at);
      timeline.set(faces[to],{opacity:1,filter:'brightness(1.06)',immediateRender:false},at);
      columns.forEach(index=>{
        const distance=Math.abs(index-23.5)/23.5;
        const hash=Math.sin((index+1)*127.1)*43758.5453;
        const variation=hash-Math.floor(hash);
        const stagger=distance*.24+variation*.025;
        const fromBelow=index%3===0;
        timeline.to(slices[from][index],{attr:{y:fromBelow?0:1,height:0},duration:.55,ease:'sine.inOut'},at+stagger*.65);
        timeline.fromTo(slices[to][index],{attr:{y:fromBelow?1:0,height:0}},
          {attr:{y:0,height:1},duration:.72,ease:'sine.inOut',immediateRender:false},at+.24+stagger);
        // Stable, subdued filaments follow the longer overlapping reveal.
        // Keep each flare on its own column, with a soft head and a long fade.
        timeline.fromTo(beams[index],{opacity:0,yPercent:fromBelow?18:-18,scaleY:1.05},
          {opacity:index%4===0?.18+variation*.1:0,yPercent:0,scaleY:.85,
            duration:.22,ease:'sine.out',immediateRender:false},at+.2+stagger)
          .to(beams[index],{opacity:0,scaleY:.25,duration:.6,ease:'sine.inOut'},at+.42+stagger);
      });
      timeline.set(faces[from],{opacity:0},at+.75)
        .to(faces[to],{filter:'brightness(1)',duration:.8,ease:'sine.out'},at+.3)
        .call(()=>{
          root.dataset.wordmarkState=to===0?'brand':'experience';
          faces[to].style.pointerEvents='auto';
        },[],at+1.32);
    };
    transition(0,1,0);
    transition(1,0,cadence);
    // Give both faces a readable hold between the soft reveals.
    timeline.call(()=>{},[],cadence*2);
    const playback=()=>{
      const active=ready&&visible&&!document.hidden;
      if(active&&!started){started=true;openingHold.play();}
      else if(started){
        openingHold.paused(!active);
        if(openingHold.progress()===1)timeline.paused(!active);
      }
    };
    const revealed=()=>{ready=true;playback();};
    const observer=new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting;playback();
    },{threshold:.1});
    observer.observe(root);
    window.addEventListener('infin8x:intro-done',revealed);
    document.addEventListener('visibilitychange',playback);
    return ()=>{
      openingHold.kill();timeline.kill();observer.disconnect();
      window.removeEventListener('infin8x:intro-done',revealed);
      document.removeEventListener('visibilitychange',playback);
      reset();
    };
  },[reduced]);

  return <span ref={ref} className="wordmark-cycle" role="img" aria-label={`${brand.name} — ${brand.reading}`} data-wordmark-state="brand">
    <svg className="wordmark-reveal__definitions" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-down`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white"/><stop offset=".9" stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={`${id}-up`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0"/><stop offset=".1" stopColor="white"/><stop offset="1" stopColor="white"/>
        </linearGradient>
        {[0,1].map(face=><mask key={face} id={`${id}-${face}`} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
          {columns.map(index=><rect key={index} data-cycle-slice={face} x={index/48} y="0" width={1/48+.0005} height={face===0?1:0} fill={`url(#${id}-${index%3===0?'up':'down'})`}/>)}
        </mask>)}
      </defs>
    </svg>
    <span className="wordmark-cycle__brand" data-cycle-face="0" aria-hidden="true" style={{maskImage:`url(#${id}-0)`,WebkitMaskImage:`url(#${id}-0)`}}><BrandWordmark/></span>
    <span className="wordmark-cycle__experience" data-cycle-face="1" aria-hidden="true" style={{maskImage:`url(#${id}-1)`,WebkitMaskImage:`url(#${id}-1)`}}>{brand.reading}</span>
    <span className="wordmark-cycle__glows" aria-hidden="true">
      {columns.map(index=><span key={index} data-cycle-glow style={{left:`${(index+.5)/48*100}%`,
        color:index%5===0?'#edb8eb':index%3===0?'#b6a4ff':'#9acbff',width:index%4===0?'1.25px':'.75px'}}/>)}
    </span>
  </span>;
}
