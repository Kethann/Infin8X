import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

const colours=['121 181 255','175 145 255','235 147 218','157 198 255'];
const between=(min:number,max:number)=>min+Math.random()*(max-min);

/** Fixed vertical columns carry light through the letters, like the intro's strands. */
export function useWordmarkLight(ref:RefObject<HTMLSpanElement>) {
  const reduced=useReducedMotion();
  useEffect(()=>{
    const root=ref.current;
    if (!root) return;
    const letters=Array.from(root.querySelectorAll<HTMLElement>('.brand-wordmark__end, .brand-wordmark__middle'));
    const timelines:(gsap.core.Timeline|undefined)[]=[];
    let hoverTracks:gsap.core.Tween[]=[];
    let hoverReveal:gsap.core.Timeline|undefined, hoverFade:gsap.core.Tween|undefined;
    let hovering=false, disposed=false, visible=false, started=false;
    let ready=!!root.closest('.hero.is-settled');
    const active=()=>ready&&visible&&!!root.closest('.hero.is-settled')&&!document.hidden&&!disposed;
    const measure=()=>{
      if (disposed) return;
      const bounds=root.getBoundingClientRect();
      root.style.setProperty('--wm-flow-width',`${bounds.width}px`);
      root.style.setProperty('--wm-flow-height',`${bounds.height}px`);
      letters.forEach(letter=>letter.style.setProperty('--wm-flow-offset',`${letter.getBoundingClientRect().left-bounds.left}px`));
    };
    const stopHoverTracks=()=>{hoverTracks.forEach(tween=>tween.kill());hoverTracks=[];};
    const clearHover=(immediate=false)=>{
      hovering=false;hoverReveal?.kill();hoverFade?.kill();
      if (immediate||reduced) {
        root.style.setProperty('--wm-hover-strength','0');stopHoverTracks();
      } else {
        // Let strands keep travelling vertically during the fade. Quick re-entry
        // resumes their current phase rather than restarting visible light.
        hoverFade=gsap.to(root,{'--wm-hover-strength':0,duration:0.45,ease:'sine.out',
          onComplete:()=>{if(!hovering)stopHoverTracks();}});
      }
    };
    const pointer=(event:PointerEvent)=>{
      if (event.pointerType==='touch'||!active()) return;
      const bounds=root.getBoundingClientRect();
      const fraction=Math.min(1,Math.max(0,(event.clientX-bounds.left)/Math.max(bounds.width,1)));
      // Match the intro's 48-column grid. The pointer selects columns; their
      // animation never travels horizontally across the name.
      root.style.setProperty('--wm-hover-column',`${Math.round(fraction*48)/48}`);
      if (reduced) {
        hovering=true;root.style.setProperty('--wm-hover-strength','0.6');
        for(let index=0;index<5;index++)root.style.setProperty(`--wm-hover-phase-${index}`,`${-0.3+index*0.09}`);
        return;
      }
      if (hovering) return;
      hovering=true;hoverFade?.kill();hoverReveal?.kill();
      if (!hoverTracks.length) {
        hoverTracks=Array.from({length:5},(_,index)=>{
          const upward=index%2===0;
          const phase=`--wm-hover-phase-${index}`;
          return gsap.fromTo(root,{[phase]:upward?1.1:-1.45},
            {[phase]:upward?-1.45:1.1,duration:[1.73,1.46,1.58,1.89,1.65][index],
              // The touched column answers first; neighbouring strands follow
              // at slightly uneven intervals, echoing the centre-out reveal.
              delay:[0.16,0.075,0,0.11,0.21][index],
              repeat:-1,yoyo:true,repeatDelay:0.18+index*0.035,ease:'sine.inOut'});
        });
      }
      hoverReveal=gsap.timeline()
        .to(root,{'--wm-hover-strength':0.9,duration:0.24,ease:'sine.out'})
        .to(root,{'--wm-hover-strength':0.68,duration:0.6,ease:'sine.inOut'});
    };
    const leave=()=>clearHover();
    const blur=()=>clearHover(true);
    const pass=(channel:number,first=false)=>{
      if (disposed) return;
      timelines[channel]?.kill();
      const name=channel===0?'a':'b';
      const phase=`--wm-${name}-phase`, strength=`--wm-${name}-strength`;
      const upward=Math.random()>0.5;
      const duration=between(2.2,3.6);
      const wait=first ? (channel===0?0.85:2.1) : between(1.2,3.5);
      const bounds=root.getBoundingClientRect();
      const letter=letters[Math.floor(Math.random()*letters.length)].getBoundingClientRect();
      const column=(letter.left-bounds.left+letter.width*between(0.18,0.82))/Math.max(bounds.width,1);
      const tl=gsap.timeline({paused:true,onComplete:()=>pass(channel)});
      timelines[channel]=tl;
      // Choose a new column only while invisible. During each pass x is fixed;
      // the coloured head and its feathered tail move up or down through the glyph.
      tl.set(root,{[`--wm-${name}-column`]:column,[phase]:upward?1.1:-1.45,[strength]:0,
        [`--wm-${name}-length`]:between(0.85,1.3),[`--wm-${name}-width`]:`${between(1.4,2.4)}px`,
        [`--wm-${name}-colour`]:colours[Math.floor(Math.random()*colours.length)]},wait)
        .to(root,{[phase]:upward?-1.45:1.1,duration,ease:'sine.inOut'},wait)
        .to(root,{[strength]:between(0.65,0.85),duration:duration*0.2,ease:'sine.inOut'},wait)
        .to(root,{[strength]:0,duration:duration*0.25,ease:'sine.inOut'},wait+duration*0.75);
      if (active()) tl.play();
    };
    const playback=()=>{
      if (active()&&!started&&!reduced) {started=true;pass(0,true);pass(1,true);}
      timelines.forEach(tl=>tl?.paused(!active()));
      if (!active()) clearHover(true);
    };
    const revealed=()=>{ready=true;playback();};
    const visibility=()=>playback();
    const observer=typeof IntersectionObserver!=='undefined' ? new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting;playback();
    },{threshold:0.1}) : undefined;
    if (observer) observer.observe(root); else visible=true;
    const resize=typeof ResizeObserver!=='undefined' ? new ResizeObserver(measure) : undefined;
    resize?.observe(root);
    window.addEventListener('resize',measure);
    window.addEventListener('infin8x:intro-done',revealed);
    window.addEventListener('blur',blur);
    document.addEventListener('visibilitychange',visibility);
    root.addEventListener('pointerenter',pointer);
    root.addEventListener('pointermove',pointer);
    root.addEventListener('pointerleave',leave);
    root.addEventListener('pointercancel',leave);
    measure();document.fonts.ready.then(measure);playback();
    return ()=>{
      disposed=true;clearHover(true);timelines.forEach(tl=>tl?.kill());observer?.disconnect();resize?.disconnect();
      window.removeEventListener('resize',measure);
      window.removeEventListener('infin8x:intro-done',revealed);
      window.removeEventListener('blur',blur);
      document.removeEventListener('visibilitychange',visibility);
      root.removeEventListener('pointerenter',pointer);
      root.removeEventListener('pointermove',pointer);
      root.removeEventListener('pointerleave',leave);
      root.removeEventListener('pointercancel',leave);
      for(const channel of ['a','b'])for(const property of ['column','phase','strength','colour','length','width'])root.style.removeProperty(`--wm-${channel}-${property}`);
      for(const property of ['column','strength',...Array.from({length:5},(_,i)=>`phase-${i}`)])root.style.removeProperty(`--wm-hover-${property}`);
      root.style.removeProperty('--wm-flow-width');root.style.removeProperty('--wm-flow-height');
      letters.forEach(letter=>letter.style.removeProperty('--wm-flow-offset'));
    };
  },[ref,reduced]);
}
