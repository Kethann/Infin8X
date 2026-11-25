import { useEffect, useState, type CSSProperties } from 'react';
import { projects, categories } from '../content/projects';
import { work, accentVar } from '../content/sections';
import { TransitionLink } from '../components/PageTransition';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ProjectCover } from './ProjectCover';

const WIDE = '(min-width: 960px)';

/**
 * 04 Work. On wide screens: a compact index of names on the left and, on the right, one 16:10 screen split 2×2 (like a
 * split watch face) with every project's full site in a quarter. At rest the quarters are equal; hovering or focusing
 * a name (or a tile) widens its column and row 3:1, so it enlarges into focus while the others shrink. Every tile is
 * filled by the version of its site that suits its shape, like resizing a browser: desktop when wide, the tablet
 * capture when near square, the phone capture when tall (container queries, cross-faded). The details follow it. On narrow screens every project is a card with its own cover.
 * Every entry is a real link to the project page.
 */
export function Projects() {
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const list = projects.filter((p) => cat === 'All' || p.category === cat);
  const [activeSlug, setActive] = useState<string | undefined>(list[0]?.slug);
  // the slice that is expanded right now (null = all equal); the details keep the last one shown
  const [hovered, setHovered] = useState<string | null>(null);
  const focusOn = (slug: string) => { setActive(slug); setHovered(slug); };
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
          <div className="reel" data-reveal onMouseLeave={() => setHovered(null)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(null); }}>
            <ol className="reel__index">
              {list.map((p) => (
                <li key={p.slug} className={p.slug === active?.slug ? 'is-active' : ''} style={{ '--c': accentVar(p.accent) } as CSSProperties}>
                  <TransitionLink to={`/work/${p.slug}`} className="reel__link" aria-label={`${p.title}: view project`}
                    onMouseEnter={() => focusOn(p.slug)} onFocus={() => focusOn(p.slug)}>
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
                <div className={`reel__split${hovered ? ' has-focus' : ''}`} style={(() => {
                  const i = hovered ? list.findIndex((p) => p.slug === hovered) : -1;
                  const big = 3, col = i % 2, row = Math.floor(i / 2);
                  return i < 0 ? undefined : {
                    gridTemplateColumns: `${col === 0 ? big : 1}fr ${col === 1 ? big : 1}fr`,
                    gridTemplateRows: `${row === 0 ? big : 1}fr ${row === 1 ? big : 1}fr`,
                  };
                })()}>
                  {list.slice(0, 4).map((p) => (
                    <TransitionLink key={p.slug} to={`/work/${p.slug}`} tabIndex={-1} aria-hidden="true"
                      className={`reel__slice${p.slug === hovered ? ' is-open' : ''}`} style={{ '--c': accentVar(p.accent) } as CSSProperties}
                      onMouseEnter={() => focusOn(p.slug)}>
                      <span className="reel__slice-view"><ProjectCover accent={p.accent} label={p.title} slug={p.slug} src={p.cover} srcMobile={p.coverMobile} srcTablet={p.coverTablet} eager /></span>
                      <span className="reel__slice-tag">{p.name}</span>
                    </TransitionLink>
                  ))}
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
