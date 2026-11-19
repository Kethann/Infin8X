import type { CSSProperties } from 'react';
import { services, accentVar } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ServiceScene } from './ServiceScene';

/** Four service cards with a consistent reading order and a direct path to contact. */
export function Services() {
  return (
    <section id="services" className="section services-sec" data-chapter="services" data-chapter-label="Services"
      style={{ '--section-accent': accentVar(services.accent) } as CSSProperties} aria-labelledby="services-h">
      <div className="page">
        <Chapter id="services" titleId="services-h" title={services.title} lead={services.lead} />
        <div className="svc-grid">
          {services.items.map((s) => (
            <article key={s.name} className="svc" data-light data-reveal aria-labelledby={`service-${s.icon}`} style={{ '--c': accentVar(s.accent) } as CSSProperties}>
              <i className="svc__beam" aria-hidden="true" />
              <div className="svc__top">
                <span className="svc__icon" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
              </div>
              <h3 id={`service-${s.icon}`}>{s.name}</h3>
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
