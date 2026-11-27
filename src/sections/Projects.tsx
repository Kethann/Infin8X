import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { projects, categories } from '../content/projects';
import { work, accentVar } from '../content/sections';
import { TransitionLink } from '../components/PageTransition';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { ProjectCover } from './ProjectCover';
import { useReducedMotion } from '../lib/useReducedMotion';

const WIDE = '(min-width: 960px)';

/**
 * 04 Work. On wide screens: a compact index of names on the left and, on the right, one 16:10 screen split 2×2 (like a
 * split watch face) with every project's full site in a quarter. A different project expands every two seconds; hovering or focusing
 * a name (or a tile) widens its column and row 3:1, so it enlarges into focus while the others shrink. Every tile is
 * filled by the version of its site that suits its shape, like resizing a browser: desktop when wide, the tablet
 * capture when near square, the phone capture when tall (container queries, cross-faded). The details follow it.
 * Narrow screens use a staggered collage: varied frames, stable reading order, one full-tile link per project.
 * Every entry is a real link to the project page.
 */
export function Projects() {
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const list = useMemo(() => projects.filter((p) => cat === 'All' || p.category === cat), [cat]);
  const [activeSlug, setActive] = useState<string | undefined>(list[0]?.slug);
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  // Manual inspection holds the chosen project until the pointer/focus leaves.
  const [hovered, setHovered] = useState<string | null>(null);
  const focusOn = (slug: string) => { setActive(slug); setHovered(slug); };
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const m = window.matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    const el = splitRef.current;
    if (!wide || !el) { setInView(false); return; }
    const observer = new IntersectionObserver(entries => setInView(entries[entries.length - 1].isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [wide]);
  useEffect(() => {
    if (!wide || !inView || reduced || hovered || list.length < 2) return;
    let timer = 0;
    const schedule = () => {
      window.clearInterval(timer);
      if (!document.hidden) timer = window.setInterval(() => {
        setActive(current => list[(list.findIndex(p => p.slug === current) + 1) % list.length].slug);
      }, 2000);
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [wide, inView, reduced, hovered, list]);
  const filter = (c: typeof cat) => { setCat(c); setHovered(null); setActive(projects.find((p) => c === 'All' || p.category === c)?.slug); };
  const active = list.find((p) => p.slug === activeSlug) ?? list[0];
  const expanded = hovered ?? (reduced ? null : active?.slug);

  return (
    <section id="projects" className="section work" data-chapter="projects" data-chapter-label="Work"
      style={{ '--section-accent': accentVar(work.accent) } as CSSProperties} aria-labelledby="projects-h">
      <div className="page">
        <div className="work__head">
          <Chapter id="projects" titleId="projects-h" title={work.title} lead={work.lead} script="lead" hideTitle />
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
          <div className="reel" data-reveal onMouseLeave={e => { if (!e.currentTarget.querySelector('.reel__link:focus')) setHovered(null); }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(':hover')) setHovered(null); }}>
            {!wide && (
              <div className="work-gallery">
                <p className="work-gallery__hint"><span aria-hidden="true" />{work.galleryHint}<Icon name="arrow" size={14} /></p>
                <ol className="work-gallery__grid">
                  {list.map((p, i) => (
                    <li key={p.slug} className="work-gallery__item" style={{ '--c': accentVar(p.accent) } as CSSProperties}>
                      <TransitionLink to={`/work/${p.slug}`} className="work-gallery__link" aria-label={`${p.title}: ${work.projectLink}`}>
                        <div className="work-gallery__frame">
                          <ProjectCover accent={p.accent} label={p.title} slug={p.slug}
                            src={i % 4 === 1 ? p.cover : (p.coverTablet ?? p.cover)} />
                          <span className="work-gallery__open" aria-hidden="true"><Icon name="arrow" size={17} /></span>
                        </div>
                        <div className="work-gallery__caption">
                          <h3 className="work-gallery__name">{p.name}</h3>
                          <p className="work-gallery__discipline">{p.discipline}</p>
                        </div>
                      </TransitionLink>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {wide && <ol className="reel__index">
              {list.map((p) => (
                <li key={p.slug} className={p.slug === active?.slug ? 'is-active' : ''} style={{ '--c': accentVar(p.accent) } as CSSProperties}>
                  <TransitionLink to={`/work/${p.slug}`} className="reel__link" aria-label={`${p.title}: view project`}
                    onMouseEnter={() => focusOn(p.slug)} onFocus={() => focusOn(p.slug)}>
                    <span className="reel__name">{p.name}</span>
                    <span className="reel__disc">{p.discipline}</span>
                    <Icon name="arrow" size={20} className="reel__arrow" />
                  </TransitionLink>
                </li>
              ))}
            </ol>}
            {wide && active && (
              <div className="reel__stage">
                <div ref={splitRef} className={`reel__split${expanded ? ' has-focus' : ''}`} style={(() => {
                  const i = expanded ? list.findIndex((p) => p.slug === expanded) : -1;
                  const big = 3, col = i % 2, row = Math.floor(i / 2);
                  return i < 0 ? undefined : {
                    gridTemplateColumns: `${col === 0 ? big : 1}fr ${col === 1 ? big : 1}fr`,
                    gridTemplateRows: `${row === 0 ? big : 1}fr ${row === 1 ? big : 1}fr`,
                  };
                })()}>
                  {list.slice(0, 4).map((p) => (
                    <TransitionLink key={p.slug} to={`/work/${p.slug}`} tabIndex={-1} aria-hidden="true"
                      className={`reel__slice${p.slug === expanded ? ' is-open' : ''}`} style={{ '--c': accentVar(p.accent) } as CSSProperties}
                      onMouseEnter={() => focusOn(p.slug)}>
                      <span className="reel__slice-view"><ProjectCover accent={p.accent} label={p.title} slug={p.slug} src={p.cover} srcMobile={p.coverMobile} srcTablet={p.coverTablet} eager /></span>
                      <span className="reel__slice-tag">{p.name}</span>
                    </TransitionLink>
                  ))}
                </div>
              </div>
            )}
            {/* the selected project: its name and discipline on the left, what it is and the way in on the right */}
            {wide && active && <div className="reel__info" key={active.slug} style={{ '--c': accentVar(active.accent) } as CSSProperties}>
              <div className="reel__head">
                <p className="reel__cat"><i aria-hidden="true" />{active.discipline}</p>
                <h3 className="reel__title">{active.name}</h3>
              </div>
              <div className="reel__body">
                <p className="reel__summary">{active.summary}</p>
                <ul className="reel__tags">{active.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                <TransitionLink to={`/work/${active.slug}`} className="reel__cta" tabIndex={-1} aria-hidden="true">{work.projectLink} <Icon name="arrow" size={16} /></TransitionLink>
              </div>
            </div>}
          </div>
        )}
        <div className="work__footer" data-reveal><span>{work.footer}</span><a href="#contact">{work.footerLink} <Icon name="arrow" size={14} /></a></div>
      </div>
    </section>
  );
}
