import { useEffect, useState, type CSSProperties } from 'react';
import { projects, categories } from '../content/projects';
import { work, accentVar } from '../content/sections';
import { TransitionLink } from '../components/PageTransition';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ProjectCover } from './ProjectCover';

const WIDE = '(min-width: 960px)';

/**
 * 04 Work. A reel: on wide screens the project names form an index on the left and a large preview on the right
 * cross-dissolves to whichever project is hovered or focused, with its details. On narrow screens every project is
 * a card with its own cover. Every entry is a real link to the project page.
 */
export function Projects() {
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const list = projects.filter((p) => cat === 'All' || p.category === cat);
  const [activeSlug, setActive] = useState<string | undefined>(list[0]?.slug);
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const m = window.matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  const filter = (c: typeof cat) => { setCat(c); setActive(projects.find((p) => c === 'All' || p.category === c)?.slug); };
  const active = list.find((p) => p.slug === activeSlug) ?? list[0];

  return (
    <section id="projects" className="section work" data-chapter="projects" data-chapter-label="Work"
      style={{ '--section-accent': accentVar(work.accent) } as CSSProperties} aria-labelledby="projects-h">
      <div className="page">
        <div className="work__head">
          <Chapter id="projects" titleId="projects-h" title={work.title} lead={work.lead} />
          <div className="work__filters" role="group" aria-label="Filter projects" data-reveal>
            {categories.map((c) => {
              const n = projects.filter((p) => c === 'All' || p.category === c).length;
              return <button key={c} type="button" aria-pressed={cat === c} disabled={n === 0} onClick={() => filter(c)}>{c}<sup>{n}</sup></button>;
            })}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="work__empty"><h3>{work.empty}</h3><button type="button" onClick={() => filter('All')}>{work.emptyLink} ↗</button></div>
        ) : (
          <div className="reel" data-reveal>
            <ol className="reel__index">
              {list.map((p) => (
                <li key={p.slug} className={p.slug === active?.slug ? 'is-active' : ''} style={{ '--c': accentVar(p.accent) } as CSSProperties}>
                  <TransitionLink to={`/work/${p.slug}`} className="reel__link" aria-label={`${p.title}: view project`}
                    onMouseEnter={() => setActive(p.slug)} onFocus={() => setActive(p.slug)}>
                    <span className="reel__name">{p.name}</span>
                    <span className="reel__disc">{p.discipline}</span>
                    <Icon name="arrow" size={20} className="reel__arrow" />
                  </TransitionLink>
                  {!wide && (
                    <div className="reel__card">
                      <ProjectCover accent={p.accent} label={p.title} slug={p.slug} src={p.cover} />
                      <p className="reel__summary">{p.summary}</p>
                      <ul className="reel__tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {wide && active && (
              <div className="reel__stage" aria-live="polite">
                <div className="reel__screen">
                  {list.map((p) => (
                    <div key={p.slug} className={`reel__frame ${p.slug === active.slug ? 'is-on' : ''}`} aria-hidden={p.slug !== active.slug}>
                      <ProjectCover accent={p.accent} label={p.title} slug={p.slug} src={p.cover} />
                    </div>
                  ))}
                  <i className="reel__glare" aria-hidden="true" />
                </div>
                <div className="reel__info" key={active.slug} style={{ '--c': accentVar(active.accent) } as CSSProperties}>
                  <p className="reel__cat"><i aria-hidden="true" />{active.category}</p>
                  <p className="reel__summary">{active.summary}</p>
                  <ul className="reel__tags">{active.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                  <TransitionLink to={`/work/${active.slug}`} className="reel__cta" tabIndex={-1} aria-hidden="true">View project <Icon name="arrow" size={16} /></TransitionLink>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="work__footer" data-reveal><span>{work.footer}</span><a href="#contact">{work.footerLink} <Icon name="arrow" size={14} /></a></div>
      </div>
    </section>
  );
}
