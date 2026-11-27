import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isConstrained, isLowEnd, prefersReducedMotion } from '../lib/env';
import type { LightFieldHandle as PrismFlowHandle } from '../three/lightField';

/**
 * Fixed light field behind all content (see three/lightField.ts). Loads after the intro on home, at once on
 * inner pages; driven by page scroll progress + velocity, tinted by the active section's accent.
 */
export function PrismFlow({ home }: { home: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    if (isLowEnd()) { canvas.classList.add('prismflow--fallback'); return; }
    let handle: PrismFlowHandle | null = null, disposed = false;
    const cleanups: (() => void)[] = [];
    const start = () => import('../three/lightField').then(({ startLightField }) => {
      if (disposed) return;
      try {
        // phones, tablets and modest machines: the compressed budget (fewer particles and logos, lower resolution, 30 fps)
        handle = startLightField(canvas, { quality: isConstrained() ? 'low' : 'high', reduced: prefersReducedMotion() });
      } catch (err) { console.warn('[background] falling back to the still version', err); canvas.classList.add('prismflow--fallback'); return; }
      const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => handle?.setProgress(s.progress, s.getVelocity()) });
      cleanups.push(() => st.kill());
      // the hero is opaque and sits above this fixed layer, so it can be lit as soon as it exists:
      // it shows behind every section after the intro and never behind the intro itself
      handle.setVisible(1);
      const accents = () => document.querySelectorAll<HTMLElement>('[data-chapter]').forEach((sec) => {
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
      let started = false;
      const go = () => { if (!started) { started = true; start(); } };
      const t = setTimeout(go, 9000); // fallback if the intro never reports done
      window.addEventListener('infin8x:intro-done', go, { once: true });
      cleanups.push(() => { clearTimeout(t); window.removeEventListener('infin8x:intro-done', go); });
    } else start();
    return () => { disposed = true; cleanups.forEach((f) => f()); handle?.dispose(); };
  }, [home]);
  // the canvas, then a dark-tinted frosted glass layer between it and the content
  return <><canvas ref={ref} className="prismflow" aria-hidden="true" /><div className="prismflow-veil" aria-hidden="true" /></>;
}
