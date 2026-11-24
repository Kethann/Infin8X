import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Home } from './pages/Home';
import { CaseStudy } from './pages/CaseStudy';
import { DebugOverlay } from './pages/DebugOverlay';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { Wipe } from './components/PageTransition';
import { PrismFlow } from './components/PrismFlow';
import { trackChapters } from './lib/chapters';
import { useReducedMotion } from './lib/useReducedMotion';
import { hasDebug, isTouch, isLowEnd } from './lib/env';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

function useSmoothScroll(reduced: boolean) {
  useEffect(() => {
    if (reduced || isTouch() || isLowEnd()) return;
    // light inertia: close to native scrolling, just softened (no heavy glide, no overscroll hold)
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => lenis?.raf(t * 1000);
    gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);
    // anchor links glide through Lenis
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]');
      if (!a || location.pathname !== '/') return;
      const id = a.getAttribute('href')!.replace('/', '');
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault(); lenis?.scrollTo(target, { offset: 0, duration: 1.4 });
      history.replaceState(null, '', id);
      target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
    };
    document.addEventListener('click', onClick);
    return () => { gsap.ticker.remove(raf); lenis?.destroy(); lenis = null; document.removeEventListener('click', onClick); };
  }, [reduced]);
}

/**
 * Reveals: elements marked `data-reveal` get `.is-in` once they cross the bottom tenth of the viewport; the
 * entrance itself is CSS (blur → sharp, rise, expo-out). `data-reveal="words"` resolves word by word and
 * `data-reveal="draw"` draws its light lines. Never hides content on reduced-motion or low-power devices.
 */
function useReveals(key: string, reduced: boolean) {
  useEffect(() => {
    if (reduced || isLowEnd()) return;
    const root = document.documentElement;
    root.classList.add('motion');
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        // already scrolled past (deep link, nav jump, fast fling): show it at once, never leave it hidden
        if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
        el.style.setProperty('--rd', `${Math.min(n++, 6) * 70}ms`);
        el.classList.add('is-in');
        io.unobserve(el);
      }
    }, { rootMargin: '0px 0px -9% 0px' });
    const bind = () => document.querySelectorAll<HTMLElement>('.section [data-reveal]:not(.is-in), .footer [data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    bind();
    const mo = new MutationObserver(bind);
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true });
    window.addEventListener('infin8x:sections-ready', bind);
    return () => {
      io.disconnect(); mo.disconnect(); window.removeEventListener('infin8x:sections-ready', bind);
      root.classList.remove('motion');
    };
  }, [key, reduced]);
}

/** One delegated listener gives every `[data-light]` surface a soft light that follows the mouse. */
function usePointerLight(reduced: boolean) {
  useEffect(() => {
    if (reduced || isLowEnd() || isTouch()) return;
    let raf = 0, target: HTMLElement | null = null, x = 0, y = 0;
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-light]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      target = el; x = e.clientX - r.left; y = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; target?.style.setProperty('--mx', `${x}px`); target?.style.setProperty('--my', `${y}px`); });
    };
    document.addEventListener('pointermove', move, { passive: true });
    return () => { document.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [reduced]);
}

function useChapterTracking(key: string) {
  useEffect(() => trackChapters(), [key]);
}

/** Glass catches the light as it moves through the viewport: sets --ly (0 top → 1 bottom) on visible glass. */
function useGlassLight(reduced: boolean) {
  useEffect(() => {
    if (reduced || isLowEnd() || isTouch()) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      if (document.hidden) return;
      const vh = innerHeight;
      document.querySelectorAll<HTMLElement>('.glass, .nav__bar').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        el.style.setProperty('--ly', ((r.top + r.height / 2) / vh).toFixed(3));
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on); on();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [reduced]);
}

export function App() {
  const [loc] = useLocation();
  const reduced = useReducedMotion();
  useSmoothScroll(reduced);
  useReveals(loc, reduced);
  useGlassLight(reduced);
  usePointerLight(reduced);
  useChapterTracking(loc);
  useEffect(() => {
    if (isTouch()) document.documentElement.classList.add('touch');
    if (isLowEnd()) document.documentElement.classList.add('lowend');
    if (loc === '/') document.title = 'Infin8X: Turning ideas into digital reality';
    if (location.hash && loc === '/') {
      const go = () => document.querySelector(location.hash)?.scrollIntoView();
      window.addEventListener('infin8x:intro-done', go, { once: true });
      return () => window.removeEventListener('infin8x:intro-done', go);
    }
  }, [loc]);
  if (hasDebug()) return <DebugOverlay />;
  const home = loc === '/';
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <PrismFlow home={home} />
      <Nav home={home} />
      <main id="main" tabIndex={-1}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/work/:slug">{(p) => <CaseStudy key={p.slug} slug={p.slug} />}</Route>
          <Route><section className="section page case"><h1>Page not found</h1><a className="link-arrow" href="/">← Back home</a></section></Route>
        </Switch>
      </main>
      <Footer />
      <Wipe />
    </>
  );
}
