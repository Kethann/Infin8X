import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { canPlayIntro } from '../lib/env';
import { useReducedMotion } from '../lib/useReducedMotion';
import { brand } from '../content/site';
import { WordmarkReveal } from '../components/WordmarkReveal';
import { Icon } from '../components/Icon';

gsap.registerPlugin(ScrollTrigger);
const SEEN_KEY = 'infin8x:intro-seen';
const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };

/** The intro plays at twice its authored pace (all timings above stay relative to each other). */
const INTRO_SPEED = 2;

export function HeroIntro({ onIntroDone }: { onIntroDone?: () => void }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const skipRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [rotationReady, setRotationReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current!, logo = logoRef.current!, stage = stageRef.current!;
    const lite = !canPlayIntro();
    let disposed = false, visible = true, contextLost = false, raf = 0, last = performance.now();
    let backdrop: Awaited<ReturnType<typeof import('./artworkBackdrop').createArtworkBackdrop>> | undefined;
    let heroScroll=0;
    let drag: {id:number;x:number;y:number} | null = null;
    setRotationReady(false);
    const copy = root.querySelectorAll('[data-reveal]');
    const wordmark=root.querySelector('.hero__brand')!;
    const wordmarkFace=root.querySelector('.wordmark-reveal__face')!;
    const wordmarkSlices=root.querySelectorAll('[data-wordmark-slice]');
    const wordmarkBeams=root.querySelectorAll('[data-wordmark-beam]');
    const finish = () => {
      if (disposed) return;
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private browsing */ }
      gsap.set(wordmark,{clearProps:'opacity,transform'});
      setPlaying(false); root.classList.add('is-settled'); onIntroDone?.();
      window.dispatchEvent(new CustomEvent('infin8x:intro-done'));
    };
    root.classList.remove('hero--lite', 'hero--artwork', 'hero--sculpture', 'hero--atmosphere');
    root.classList.add(lite ? 'hero--lite' : 'hero--artwork');
    const exit = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: self => {
        heroScroll=self.progress;
        backdrop?.scroll(heroScroll,self.getVelocity());
        root.style.setProperty('--hero-exit', self.progress.toFixed(4));
        const fade=Math.min(1,self.progress/0.85);
        root.style.setProperty('--hero-atmosphere-opacity', (1-fade*fade*(3-2*fade)).toFixed(4));
        window.dispatchEvent(new CustomEvent('infin8x:hero-progress', {detail:self.progress}));
      },
    });
    const ctx = gsap.context(() => {}, root);
    const short = seen();
    skipRef.current = false;
    root.classList.remove('is-settled', 'hero--sculpture');
    setPlaying(!reduced && !lite);
    const tick = (now: number) => {
      raf = 0;
      if (disposed || contextLost || !visible || document.hidden) return;
      const dt = Math.min((now-last)/1000, 0.05); last = now;
      backdrop?.render(reduced ? 0 : now, dt);
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    const updatePlayback = () => {
      cancelAnimationFrame(raf); raf = 0;
      if (disposed || contextLost) return;
      const active = visible && !document.hidden;
      tlRef.current?.paused(!active);
      if (!active || !backdrop) return;
      last = performance.now();
      if (reduced) backdrop.render(0, 0);
      else raf = requestAnimationFrame(tick);
    };
    if (lite) finish();
    else import('./artworkBackdrop').then(async ({createArtworkBackdrop}) => {
      if (disposed) return;
      await logo.decode().catch(() => {});
      if (disposed) return;
      const scene = await createArtworkBackdrop(glRef.current!, reduced, stage);
      if (disposed || contextLost) { scene.dispose(); return; }
      backdrop = scene;
      scene.scroll(heroScroll,0);
      setRotationReady(true);
      // Present the dark opening state before making the canvas the visible artwork.
      scene.render(reduced ? 0 : performance.now(), 0);
      root.classList.add('hero--atmosphere', 'hero--sculpture');
      if (reduced || skipRef.current) {
        Object.assign(scene.state, {reveal:1, turn:1, sweep:1, aurora:1, trace:1, calm:1, rush:0, flash:0}); finish();
      } else ctx.add(() => {
        const tl = gsap.timeline({paused:true, onComplete:finish});
        // Incoming energy builds the white ribbon, then the colour ribbon as it is absorbed. The shared tween keeps
        // absorption and formation locked together, including seeking and repeat visits.
        const S = short ? 0.55 : 1, st = scene.state;
        const formationDuration=4.8*S;
        // Give repeat visits a readable opening too. Zero starting velocity lets
        // the outer fibres emerge gently before their inward movement gathers pace.
        const openingDuration=short ? 0.95 : 1.35;
        tl.to(st, {aurora:1, duration:openingDuration, ease:'sine.inOut'}, 0)
          .to(st, {rush:1, duration:openingDuration*0.8, ease:'sine.inOut'}, openingDuration*0.2)
          .addLabel('absorb', openingDuration)
          .addLabel('formed', openingDuration+formationDuration)
          .to(st, {flash:0.45, duration:0.22*S, ease:'sine.out'}, 'absorb')
          .to(st, {flash:0, duration:0.9*S, ease:'sine.inOut'}, `absorb+=${0.22*S}`)
          .to(st, {reveal:1, duration:0.2*S, ease:'sine.out'}, 'absorb')
          .to(st, {trace:1, calm:1, duration:formationDuration, ease:'none'}, 'absorb')
          .to(st, {turn:1, duration:2.6*S, ease:'power2.out'}, 'absorb')
          .to(st, {sweep:1, duration:formationDuration, ease:'sine.inOut'}, 'absorb')
          .to(st, {rush:0, duration:1.1*S, ease:'sine.inOut'}, `formed-=${1.1*S}`);
        const W=short ? 0.72 : 1;
        const wordmarkStart=tl.labels.formed-0.35*S;
        tl.addLabel('wordmark',wordmarkStart)
          .addLabel('wordmarkReady',wordmarkStart+1.15*W)
          .set(wordmark,{opacity:0},0)
          .set(wordmark,{opacity:1},'wordmark')
          .fromTo(wordmarkFace,{filter:'brightness(1.6) blur(0.8px)'},
            {filter:'brightness(1) blur(0px)',duration:1.1*W,ease:'sine.out'},'wordmark')
          .set(wordmarkFace,{clearProps:'filter'},'wordmarkReady');
        wordmarkSlices.forEach((slice,index)=>{
          // The central pair ignites first. Stable variation lets neighbouring
          // columns race gently outward without a rigid, mirrored wipe or flicker.
          const fromBelow=index%3===0;
          const centre=(wordmarkSlices.length-1)/2;
          const distance=(Math.abs(index-centre)-0.5)/(centre-0.5);
          const hash=Math.sin((index+1)*127.1)*43758.5453;
          const variation=hash-Math.floor(hash);
          const delay=(Math.pow(distance,0.85)*0.5+(variation-0.5)*0.1*distance)*W;
          const at=wordmarkStart+delay;
          tl.fromTo(slice,{attr:{y:fromBelow?1:0,height:0}},
            {attr:{y:0,height:1},duration:(0.42+variation*0.08)*W,ease:'power2.inOut'},at+0.05*W)
            .fromTo(wordmarkBeams[index],{opacity:0,yPercent:fromBelow?35:-35,scaleY:1.4},
              {opacity:0.42+variation*0.18,yPercent:0,scaleY:1,duration:0.16*W,ease:'sine.out'},at)
            .to(wordmarkBeams[index],{opacity:0,scaleY:0.25,duration:(0.34+variation*0.06)*W,ease:'sine.inOut'},at+0.16*W);
        });
        tl.fromTo(copy,{opacity:0,y:14},{opacity:1,y:0,duration:0.7*S,stagger:0.1*S,ease:'power3.out'},wordmarkStart+0.8*W);
        tlRef.current=tl;
        tl.timeScale(INTRO_SPEED).play(0);
      });
      if (import.meta.env.DEV) (window as unknown as {__sculpture: unknown}).__sculpture = {scene, timeline:tlRef.current};
      updatePlayback();
    }).catch((error) => { if (!disposed) { console.warn('[hero] Using source artwork fallback', error); root.classList.add('hero--lite'); finish(); } });
    const resize = () => { if (contextLost) return; backdrop?.resize(); if (reduced) backdrop?.render(0, 0); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : undefined;
    ro?.observe(root); window.addEventListener('resize', resize);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updatePlayback(); }) : undefined;
    io?.observe(root);
    const renderInteraction = () => { if (reduced && !contextLost) backdrop?.render(0,0); };
    const canRotate = () => !!backdrop && !contextLost && root.classList.contains('is-settled');
    const down = (event:PointerEvent) => {
      if (!canRotate() || drag || !event.isPrimary || event.button!==0 || (event.target as Element).closest('button')) return;
      if (event.pointerType === 'mouse') event.preventDefault();
      stage.focus({preventScroll:true});
      stage.setPointerCapture(event.pointerId);
      backdrop?.beginRotation();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY};
      stage.classList.add('is-dragging');
    };
    const dragMove = (event:PointerEvent) => {
      if (!drag || event.pointerId!==drag.id) return;
      const radians=Math.PI*2/Math.max(stage.clientWidth,1);
      backdrop?.rotate((event.clientX-drag.x)*radians,(event.clientY-drag.y)*radians);
      drag.x=event.clientX; drag.y=event.clientY;
      renderInteraction();
    };
    const endDrag = (event:PointerEvent) => {
      if (!drag || event.pointerId!==drag.id) return;
      drag=null; stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      backdrop?.resetRotation();
      renderInteraction();
    };
    const reset = () => { if (canRotate()) { backdrop?.resetRotation(); renderInteraction(); } };
    const cancelInteraction = () => {
      if (drag) {
        const id=drag.id;drag=null;stage.classList.remove('is-dragging');
        if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
      }
      reset();
    };
    const visibilityChange = () => { if (document.hidden) cancelInteraction(); updatePlayback(); };
    const canvas = glRef.current!;
    const lostContext = () => {
      contextLost = true; cancelAnimationFrame(raf); raf = 0;
      tlRef.current?.kill(); cancelInteraction();
      setRotationReady(false);
      root.classList.remove('hero--sculpture', 'hero--atmosphere');
      root.classList.add('hero--lite');
      gsap.set(copy, {clearProps:'opacity,transform'});
      finish();
    };
    canvas.addEventListener('webglcontextlost', lostContext);
    const key = (event:KeyboardEvent) => {
      if (!canRotate() || event.target!==stage) return;
      const step=Math.PI/12*(event.shiftKey?3:1);
      const delta:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
      if (event.key==='Home') { event.preventDefault(); reset(); }
      else if (delta[event.key]) { event.preventDefault(); backdrop?.rotate(...delta[event.key]); renderInteraction(); }
    };
    const keyRelease = (event:KeyboardEvent) => {
      if (event.target===stage && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) reset();
    };
    stage.addEventListener('pointerdown',down);
    stage.addEventListener('pointermove',dragMove);
    stage.addEventListener('pointerup',endDrag);
    stage.addEventListener('pointercancel',endDrag);
    stage.addEventListener('lostpointercapture',endDrag);
    stage.addEventListener('keydown',key);
    stage.addEventListener('keyup',keyRelease);
    stage.addEventListener('blur',cancelInteraction);
    window.addEventListener('blur',cancelInteraction);
    document.addEventListener('visibilitychange',visibilityChange);
    return () => {
      disposed = true; canvas.removeEventListener('webglcontextlost', lostContext); cancelAnimationFrame(raf); ctx.revert(); tlRef.current = null;
      gsap.killTweensOf(stage); backdrop?.dispose(); ro?.disconnect(); io?.disconnect(); window.removeEventListener('resize', resize); exit.kill();
      stage.removeEventListener('pointerdown',down); stage.removeEventListener('pointermove',dragMove);
      stage.removeEventListener('pointerup',endDrag); stage.removeEventListener('pointercancel',endDrag);
      stage.removeEventListener('lostpointercapture',endDrag); stage.removeEventListener('keydown',key);
      stage.removeEventListener('keyup',keyRelease);stage.removeEventListener('blur',cancelInteraction);
      window.removeEventListener('blur',cancelInteraction);document.removeEventListener('visibilitychange',visibilityChange);
      if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
      stage.classList.remove('is-dragging');
    };
  }, [onIntroDone, reduced]);

  return (
    <section ref={rootRef} id="top" className="hero hero--exact" aria-label="Infin8X introduction">
      <canvas ref={glRef} className="hero__gl" aria-hidden="true" />
      <h1 className="sr-only">{brand.name}: {brand.coreLine}</h1>
      <div ref={stageRef} className="hero__artwork-stage" role="group" aria-label="Interactive 3D infinity logo" aria-describedby="logo-rotation-help" tabIndex={rotationReady && !playing ? 0 : -1}>
        <img ref={logoRef} className="hero__original" src="/brand/infinity-white-entry.webp" width="2787" height="936" alt="Infin8X infinity symbol" draggable={false} onError={event => {
          if (!event.currentTarget.src.endsWith('.png')) event.currentTarget.src = '/brand/infinity-extracted.png';
        }} />
        <span id="logo-rotation-help" className="sr-only">Drag to rotate through 360 degrees. On touch screens, drag horizontally to rotate or swipe vertically to scroll. Release to return to the original pose. Hold the arrow keys to turn, Shift for larger steps, and Home to return to the original pose.</span>
      </div>
      <div className="hero__details">
        <div className="hero__brand"><WordmarkReveal /></div>
        <p className="hero__tagline" data-reveal>{brand.coreLine}</p>
        <p className="hero__summary" data-reveal>{brand.servicesLine}</p>
        <div className="hero__ctas" data-reveal>
          <a className="btn btn--primary" href="#contact">{brand.projectCta}<Icon name="arrow" size={15} /></a>
          <a className="btn btn--ghost" href="#projects">{brand.workCta}<Icon name="down" size={15} /></a>
        </div>
      </div>
      {playing && <button type="button" className="hero__skip" onClick={() => { skipRef.current = true; tlRef.current?.progress(1); }}>Skip intro <span aria-hidden="true">→</span></button>}
    </section>
  );
}
