import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { services, accentVar } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ServiceScene } from './ServiceScene';
import { prefersReducedMotion } from '../lib/env';

const EVERY_MS = 15000;
const PLAY_MS = 5000;   // about one cycle of the longest scene
/** Phones: small square cards, two per row, that expand on tap (must match the CSS media query). */
const PHONE = '(min-width: 360px) and (max-width: 639px)';
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const MOVE_MS = 550;

/**
 * Four service cards: icon + name, outcome, animated scene, points, contact link. One row on desktop, 2×2 on tablets.
 * Phones show small square cards (icon, name, scene), two per row. Tapping one opens it across the top row (outcome,
 * points, a full-width scene) and the other three tuck into one compact row of mini cards right under it. Every card
 * glides from where it was (FLIP): moving or shrinking cards translate + scale, the growing card reveals its new size.
 */
export function Services() {
  const grid = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const before = useRef<DOMRect[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);

  // the scenes rest; they play while a card is hovered or focused, and all play together once every 15 s while in view
  useEffect(() => {
    const el = grid.current!;
    let visible = false, stop = 0;
    const play = () => {
      if (!visible || document.hidden) return;
      el.setAttribute('data-play', '');
      window.clearTimeout(stop);
      stop = window.setTimeout(() => el.removeAttribute('data-play'), PLAY_MS);
    };
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; const was = visible; visible = e.isIntersecting; if (visible && !was) play(); }, { threshold: 0.25 });
    io.observe(el);
    const every = window.setInterval(play, EVERY_MS);
    return () => { io.disconnect(); window.clearInterval(every); window.clearTimeout(stop); };
  }, []);

  // expanding only exists on phones: leaving that width closes any open card
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => { setPhone(mq.matches); if (!mq.matches) setOpen(null); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const toggle = (i: number) => {
    before.current = cards.current.map((c) => c!.getBoundingClientRect());
    setOpen((o) => (o === i ? null : i));
  };

  // FLIP: after the grid has re-laid out, every card starts from its old place and glides to the new one; the card
  // that grew reveals its new width and height (clip) instead of stretching
  useLayoutEffect(() => {
    const old = before.current;
    before.current = null;
    if (!old || prefersReducedMotion()) return;
    cards.current.forEach((c, i) => {
      if (!c) return;
      const now = c.getBoundingClientRect(), was = old[i];
      const dx = was.left - now.left, dy = was.top - now.top;
      const grew = now.width > was.width + 1 || now.height > was.height + 1;
      const sx = was.width / now.width, sy = was.height / now.height;
      let frames: Keyframe[];
      if (grew) {
        // the growing card stays sharp: it starts clipped to its old box and opens to its new one
        frames = [{ transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(0 ${Math.max(0, now.width - was.width)}px ${Math.max(0, now.height - was.height)}px 0 round 26px)` },
          { transform: 'translate(0, 0)', clipPath: 'inset(0 0 0 0 round 26px)' }];
      } else {
        frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: '0 0' }, { transform: 'translate(0, 0) scale(1, 1)', transformOrigin: '0 0' }];
      }
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || grew || Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01)
        c.animate(frames, { duration: MOVE_MS, easing: EASE });
    });
    if (open !== null) {
      const el = cards.current[open];
      window.setTimeout(() => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), MOVE_MS);
    }
  }, [open]);

  return (
    <section id="services" className="section services-sec" data-chapter="services" data-chapter-label="Services"
      style={{ '--section-accent': accentVar(services.accent) } as CSSProperties} aria-labelledby="services-h">
      <div className="page">
        <Chapter id="services" titleId="services-h" title={services.title} lead={services.lead} script="title" />
        <div ref={grid} className="svc-grid" data-open={phone && open !== null ? '' : undefined}>
          {services.items.map((s, i) => {
            const isOpen = phone && open === i;
            // the open card takes the top row; the others keep their order in the compact row below
            const order = isOpen ? -1 : i;
            return (
              <article key={s.name} ref={(el) => { cards.current[i] = el; }} className={`svc${isOpen ? ' is-open' : ''}`} data-light data-reveal
                aria-labelledby={`service-${s.icon}`} style={{ '--c': accentVar(s.accent), order } as CSSProperties}>
                <i className="svc__beam" aria-hidden="true" />
                <button type="button" className="svc__more" aria-expanded={isOpen} aria-controls={`svc-more-${i}`} onClick={() => toggle(i)}>
                  <span className="sr-only">{isOpen ? services.hideDetails : services.showDetails}: {s.name}</span>
                </button>
                <div className="svc__top">
                  <span className="svc__icon" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
                  <h3 id={`service-${s.icon}`}>{s.name}</h3>
                </div>
                <div id={`svc-more-${i}`} className="svc__more-copy">
                  <p className="svc__outcome">{s.outcome}</p>
                </div>
                <ServiceScene kind={s.icon} />
                <ul className="svc__points">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
                <a className="svc__link" href="#contact" aria-label={`${s.cta ?? services.cta}: ${s.name}`}>
                  <span>{s.cta ?? services.cta}</span><Icon name="arrow" size={18} />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
