import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { skillCategories, type SkillItem } from '../content/skills';
import { skills as copy, accentVar } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { prefersReducedMotion, isLowEnd } from '../lib/env';
import { toolLogos } from '../content/toolLogos';
import { SkillLogo, readable } from '../components/SkillLogo';
import { SkillCloud } from '../components/SkillCloud';
import { TransitionLink } from '../components/PageTransition';

/** Counts up from 0 the first time it scrolls into view (final value at once with reduced motion). */
function Count({ to }: { to: number }) {
  const ref = useRef<HTMLElement>(null);
  const still = () => prefersReducedMotion() || isLowEnd();
  const [n, setN] = useState(() => (still() ? to : 0));
  useEffect(() => {
    if (still()) { setN(to); return; }
    const el = ref.current!;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1400); setN(Math.round(to * (1 - Math.pow(1 - k, 4)))); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <dd ref={ref}>{String(n).padStart(2, '0')}</dd>;
}

/** a line icon per discipline, for the filter chips and the row headers */
const CAT_ICON: Record<string, string> = {
  Languages: 'skills', Frontend: 'web', '3D & animation': 'cube', Backend: 'services', Database: 'db', APIs: 'api', 'DevOps & tools': 'cicd',
  'AI tools': 'ai', 'AI & automation': 'net', 'Data & analytics': 'train', 'Data & ML': 'train', 'Python libraries': 'infer', Robotics: 'sensor',
};

/** Stable category colours shared by the filters, labels and skill borders. */
const CAT_COLOUR: Record<string, string> = {
  Languages: '#f0c56a', Frontend: '#68cfea', '3D & animation': '#b6a0ff', Backend: '#7bdbb0',
  Database: '#8eafff', APIs: '#f5a580', 'DevOps & tools': '#a9d879', 'AI tools': '#e8a0c8',
  'AI & automation': '#d7a0fa', 'Data & analytics': '#76d8d0', 'Data & ML': '#99bbed',
  'Python libraries': '#dfce86', Robotics: '#f0a4ac',
};

/** One wrapping sequence in category order, with a responsive animated preview. */
export function Skills() {
  const [filter, setFilter] = useState<string>('All');
  const [hovered, setHovered] = useState<SkillItem | null>(null);
  const [focused, setFocused] = useState<SkillItem | null>(null);
  const total = skillCategories.reduce((sum, c) => sum + c.items.length, 0);
  const shown = useMemo(() => skillCategories.filter((c) => filter === 'All' || c.name === filter), [filter]);
  const items = useMemo(() => shown.flatMap(c => c.items), [shown]);
  const active = items.find(t => t.name === (hovered ?? focused)?.name) ?? null;
  // Fade the right edge only while more categories remain off-screen.
  const filtersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = filtersRef.current; if (!el) return;
    const check = () => el.toggleAttribute('data-overflow', el.scrollWidth - el.clientWidth - el.scrollLeft > 2);
    const ro = new ResizeObserver(check); ro.observe(el); check();
    el.addEventListener('scroll', check, { passive: true });
    document.fonts?.ready.then(check);
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  }, []);
  return (
    <section id="skills" className="section skills" data-chapter="skills" data-chapter-label="Skills"
      style={{ '--section-accent': accentVar(copy.accent) } as CSSProperties} aria-labelledby="skills-h">
      <div className="page">
        <div className="skills__head">
          <Chapter id="skills" titleId="skills-h" title={copy.title} lead={copy.lead} />
        </div>

        <div className="skills__body">
        <div ref={filtersRef} className="skills__filters" role="group" aria-label={copy.indexLabel} data-reveal>
          {['All', ...skillCategories.map((c) => c.name)].map((name) => (
            <button key={name} type="button" aria-pressed={filter === name}
              style={{ '--category-colour': CAT_COLOUR[name] ?? '#8eafff' } as CSSProperties}
              onClick={() => { setFilter(name); setHovered(null); setFocused(null); }}>
              {name !== 'All' && <Icon name={CAT_ICON[name] ?? 'skills'} size={13} />}
              {name}<sup>{name === 'All' ? total : skillCategories.find((c) => c.name === name)!.items.length}</sup>
            </button>
          ))}
        </div>

        {/* Keep filters above the changing preview so selecting a skill cannot move their click targets. */}
        <div className="skills__preview">
          <SkillCloud items={items} active={active} />
            {/* the numbers live inside the preview banner, as an aside on its right (a strip along its foot on phones) */}
            <dl className="skills__stats">
            <div className="stat">
              <Count to={skillCategories.length} />
              <dt>{copy.statDisciplines}</dt>
              <span className="stat__note" aria-hidden="true">{copy.statDisciplinesNote(skillCategories[0].name, skillCategories[skillCategories.length - 1].name)}</span>
            </div>
            <div className="stat">
              <Count to={total} />
              <dt>{copy.statTools}</dt>
              <span className="stat__note" aria-hidden="true">{copy.statToolsNote(skillCategories.length)}</span>
            </div>
          </dl>
        </div>

        <div className="skills__catalogue">
        <ul className="ledger" key={filter} aria-label="Skills by category">
          {shown.map(c => {
            const categoryId = `skill-category-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <li key={c.name} className="ledger__group" style={{ '--category-colour': CAT_COLOUR[c.name] ?? '#8eafff', '--n': c.items.length } as CSSProperties}>
                <h3 id={categoryId} className="ledger__tag">
                  <Icon name={CAT_ICON[c.name] ?? 'skills'} size={12} />
                  <span>{c.name}</span>
                  <span className="ledger__count" aria-hidden="true">{String(c.items.length).padStart(2, '0')}</span>
                </h3>
                <ul className="ledger__chips" aria-labelledby={categoryId}>
                  {c.items.map(t => {
                    const logo = toolLogos[t.name];
                    return (
                      <li key={t.name} className="ledger__entry" style={{ '--tc': logo && 'path' in logo ? readable(logo.hex) : t.color } as CSSProperties}>
                        <span className={`chip${active?.name === t.name ? ' is-active' : ''}`}>
                          <button type="button" className="chip__button" aria-pressed={active?.name === t.name} aria-describedby={categoryId}
                            onPointerMove={(event) => { if (event.pointerType === 'mouse' && hovered !== t) setHovered(t); }}
                            onPointerLeave={() => setHovered(null)}
                            onFocus={() => { setHovered(null); setFocused(t); }} onBlur={() => setFocused(null)}>
                            <span className="chip__mark" aria-hidden="true"><SkillLogo name={t.name} /></span>
                            <span>{t.name}<span className="sr-only">: {t.note}</span></span>
                          </button>
                        </span>
                        {focused?.name === t.name && <p className="ledger__detail"><strong>{t.name}</strong> — {t.note}</p>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
        </div>
        </div>

        <div className="skills__footer" data-reveal>
          <p>{copy.footer}</p>
          <TransitionLink to="/#projects">{copy.footerLink} <Icon name="arrow" size={14} /></TransitionLink>
        </div>
      </div>
    </section>
  );
}
