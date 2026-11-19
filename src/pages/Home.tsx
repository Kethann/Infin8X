import { useEffect, useState, type ComponentType } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroIntro } from '../hero/HeroIntro';

type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/**
 * Below-the-fold sections load as a separate chunk and mount one per idle slice, so the hero paints first
 * and the main thread is never blocked by one large render. A deep link (#contact) mounts everything at once.
 */
export function Home() {
  const [sections, setSections] = useState<ComponentType[] | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    import('../sections/BelowFold').then((m) => {
      if (!alive) return;
      setSections(m.SECTIONS);
      if (location.hash) setN(m.SECTIONS.length);
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!sections) return;
    if (n >= sections.length) {
      requestAnimationFrame(() => { ScrollTrigger.refresh(); window.dispatchEvent(new Event('infin8x:sections-ready')); });
      if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
      return;
    }
    const w = window as IdleWin;
    const next = () => setN((v) => v + 1);
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(next, { timeout: 400 }); return () => w.cancelIdleCallback?.(id); }
    const t = setTimeout(next, 30); return () => clearTimeout(t);
  }, [n, sections]);
  return (
    <>
      <HeroIntro />
      {/* holds the sections' room while they mount one by one, so the footer never jumps down in view (CLS) */}
      <div className={`home__sections ${sections && n >= sections.length ? 'is-ready' : ''}`}>
        {sections?.slice(0, n).map((S, i) => <S key={i} />)}
      </div>
    </>
  );
}
