import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../lib/env';

gsap.registerPlugin(ScrollTrigger);

interface Options {
  /** Scroll-scrub against this element (ScrollTrigger). If omitted the light plays once when in view. */
  scrub?: boolean;
  start?: string;
  end?: string;
  duration?: number;
  onProgress?: (p: number) => void;
}

/**
 * Make light travel along any SVG <path> by animating stroke-dashoffset.
 * Attach the returned ref to the <path>. Reduced motion → path shown fully lit.
 */
export function useLightTravel<T extends SVGPathElement>({ scrub = true, start = 'top 75%', end = 'bottom 40%', duration = 1.6, onProgress }: Options = {}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    if (prefersReducedMotion()) { el.style.strokeDashoffset = '0'; onProgress?.(1); return; }
    el.style.strokeDashoffset = `${len}`;
    const st = {
      trigger: (el.closest('section') ?? el) as Element,
      start, end, scrub: scrub ? 0.6 : false,
      onUpdate: (self: ScrollTrigger) => onProgress?.(self.progress),
    };
    const tween = gsap.to(el, { strokeDashoffset: 0, ease: scrub ? 'none' : 'power2.inOut', duration, scrollTrigger: st });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [scrub, start, end, duration, onProgress]);
  return ref;
}
