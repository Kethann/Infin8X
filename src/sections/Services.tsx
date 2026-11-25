import { useEffect, useRef, type CSSProperties } from 'react';
import { services, accentVar } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ServiceScene } from './ServiceScene';

const EVERY_MS = 15000;
const PLAY_MS = 5000;   // about one cycle of the longest scene

/** Four compact service cards in one row (2×2 on tablets, stacked on phones): icon + name, outcome, animated scene, points, contact link. */
export function Services() {
  // the scenes rest; they play while a card is hovered or focused, and all play together once every 15 s while in view
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = grid.current!;
    let visible = false, stop = 0;
    const play = () => {
      if (!visible || document.hidden) return;
      el.setAttribute('data-play', '');
      window.clearTimeout(stop);
      stop = window.setTimeout(() => el.removeAttribute('data-play'), PLAY_MS);
    };
    const io = new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) play(); }, { threshold: 0.25 });
    io.observe(el);
    const every = window.setInterval(play, EVERY_MS);
    return () => { io.disconnect(); window.clearInterval(every); window.clearTimeout(stop); };
  }, []);
  return (
    <section id="services" className="section services-sec" data-chapter="services" data-chapter-label="Services"
      style={{ '--section-accent': accentVar(services.accent) } as CSSProperties} aria-labelledby="services-h">
      <div className="page">
        <Chapter id="services" titleId="services-h" title={services.title} lead={services.lead} />
        <div ref={grid} className="svc-grid">
          {services.items.map((s) => (
            <article key={s.name} className="svc" data-light data-reveal aria-labelledby={`service-${s.icon}`} style={{ '--c': accentVar(s.accent) } as CSSProperties}>
              <i className="svc__beam" aria-hidden="true" />
              <div className="svc__top">
                <span className="svc__icon" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
                <h3 id={`service-${s.icon}`}>{s.name}</h3>
              </div>
              <p className="svc__outcome">{s.outcome}</p>
              <ServiceScene kind={s.icon} />
              <ul className="svc__points">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <a className="svc__link" href="#contact" aria-label={`${services.cta}: ${s.name}`}>
                <span>{services.cta}</span><Icon name="arrow" size={18} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
