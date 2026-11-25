import { useLocation } from 'wouter';
import gsap from 'gsap';
import { useEffect, type ReactNode, type MouseEvent } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';
import { prefersReducedMotion } from '../lib/env';

let busy = false;
/** A section a link asked for on another route (e.g. "All projects" → `/#projects`): home jumps there once it exists. */
let pendingSection: string | null = null;
export const takePendingSection = () => { const s = pendingSection; pendingSection = null; return s; };
let activeTransition: gsap.core.Timeline | undefined;
/**
 * Soft light dissolve between routes (no hard edge): a veil of blurred amber/steel light and frosted glass
 * fades up, the route swaps underneath, and the veil breathes out — long, gentle in-out curves.
 */
export function runTransition(swap: () => void) {
  if (busy) return;
  const el = document.querySelector<HTMLElement>('.veil');
  if (!el || prefersReducedMotion()) { swap(); window.scrollTo(0, 0); return; }
  busy = true;
  activeTransition = gsap.timeline({ onComplete: () => { busy = false; activeTransition = undefined; } })
    .set(el, { visibility: 'visible', '--v': 0 })
    .to(el, { '--v': 1, duration: 0.55, ease: 'sine.inOut' })
    .add(() => { swap(); window.scrollTo(0, 0); })
    .to(el, { '--v': 0, duration: 0.9, ease: 'sine.inOut' }, '+=0.08')
    .set(el, { visibility: 'hidden' });
}

export function TransitionLink({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; [k: string]: unknown }) {
  const [loc, navigate] = useLocation();
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (to === loc) { window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); return; }
    const [path, hash] = to.split('#');
    if (hash) pendingSection = `#${hash}`;
    runTransition(() => navigate(hash ? path || '/' : to));
  };
  return <a href={to} onClick={click} className={className} {...rest}>{children}</a>;
}

export function Wipe() {
  const reduced = useReducedMotion();
  useEffect(() => { if (reduced) activeTransition?.progress(1, false); }, [reduced]);
  return <div className="veil" aria-hidden="true"><i /><b /></div>;
}
