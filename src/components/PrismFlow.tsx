import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isLowEnd, prefersReducedMotion } from '../lib/env';
import type { PrismFlowHandle } from '../three/prismFlow';

/**
 * Fixed 3D prism layer behind all content. Visible once the hero hands over (or on inner pages),
 * driven by page scroll progress + velocity, tinted by the active section's accent.
 */
export function PrismFlow({ home }: { home: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    if (isLowEnd()) { canvas.classList.add('prismflow--fallback'); return; }
    let handle: PrismFlowHandle | null = null, disposed = false;
    const cleanups: (() => void)[] = [];
    const start = () => import('../three/prismFlow').then(({ startPrismFlow }) => {
      if (disposed) return;
      try {
        handle = startPrismFlow(canvas, { quality: innerWidth < 900 ? 'low' : 'high', reduced: prefersReducedMotion() });
      } catch { canvas.classList.add('prismflow--fallback'); return; }
      const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => handle?.setProgress(s.progress, s.getVelocity()) });
      cleanups.push(() => st.kill());
      const heroP = (e: Event) => handle?.setVisible(Math.min(1, Math.max(0, ((e as CustomEvent<number>).detail - 0.55) / 0.4)));
      const onScroll = () => { if (!home || scrollY > innerHeight * 2.6) handle?.setVisible(1); else if (scrollY < innerHeight * 0.3) handle?.setVisible(0); };
      window.addEventListener('infin8x:hero-progress', heroP); window.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => { window.removeEventListener('infin8x:hero-progress', heroP); window.removeEventListener('scroll', onScroll); });
      onScroll();
      const accents = () => document.querySelectorAll<HTMLElement>('[data-accent]').forEach((sec) => {
        const t = ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive) handle?.setAccent(getComputedStyle(sec).getPropertyValue('--section-accent')); } });
        cleanups.push(() => t.kill());
      });
      // the Process section draws its own prism diagram: let the 3D layer recede there
      const dims = () => document.querySelectorAll<HTMLElement>('[data-prism-dim]').forEach((sec) => {
        const t = ScrollTrigger.create({ trigger: sec, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => handle?.setDim(s.isActive ? 0.25 : 1) });
        cleanups.push(() => t.kill());
      });
      dims(); window.addEventListener('infin8x:sections-ready', dims);
      cleanups.push(() => window.removeEventListener('infin8x:sections-ready', dims));
      accents(); window.addEventListener('infin8x:sections-ready', accents);
      cleanups.push(() => window.removeEventListener('infin8x:sections-ready', accents));
    });
    // home: load after the intro so it never competes with the hero; inner pages: right away
    if (home) {
      const go = () => start();
      window.addEventListener('infin8x:intro-done', go, { once: true });
      cleanups.push(() => window.removeEventListener('infin8x:intro-done', go));
    } else start();
    return () => { disposed = true; cleanups.forEach((f) => f()); handle?.dispose(); };
  }, [home]);
  return <canvas ref={ref} className="prismflow" aria-hidden="true" />;
}
