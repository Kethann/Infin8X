import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The light that detached from the hero continues down the page as a thin vertical beam:
 * white at the top, shifting through the spectrum section by section. Its head takes the active section's accent.
 */
export function ProgressBeam() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const st = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (s) => el.style.setProperty('--p', s.progress.toFixed(4)),
    });
    let triggers: ScrollTrigger[] = [];
    const bind = () => {
      triggers.forEach((t) => t.kill());
      triggers = gsap.utils.toArray<HTMLElement>('[data-chapter]').map((sec) => ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: (s) => { if (s.isActive) el.style.setProperty('--head', getComputedStyle(sec).getPropertyValue('--section-accent')); },
      }));
    };
    bind(); window.addEventListener('infin8x:sections-ready', bind);
    const onHero = (e: Event) => el.style.setProperty('--on', (e as CustomEvent<number>).detail > 0.85 ? '1' : '0');
    const onScroll = () => { if (window.scrollY > window.innerHeight * 2.4) el.style.setProperty('--on', '1'); };
    window.addEventListener('infin8x:hero-progress', onHero); window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('infin8x:sections-ready', bind); st.kill(); triggers.forEach((t) => t.kill()); window.removeEventListener('infin8x:hero-progress', onHero); window.removeEventListener('scroll', onScroll); };
  }, []);
  return <div ref={ref} className="beam" aria-hidden="true"><i className="beam__line" /><i className="beam__head" /></div>;
}
