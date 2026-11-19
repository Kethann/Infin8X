import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { skillCategories, type SkillItem } from '../content/skills';
import { skills as copy, accentVar } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { prefersReducedMotion, isLowEnd } from '../lib/env';
import { toolLogos } from '../content/toolLogos';
import { SkillLogo, readable } from '../components/SkillLogo';
import { SkillCloud } from '../components/SkillCloud';

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

/**
 * 05 Skills, laid out as a skills ledger: filter chips per discipline, then one glass row per discipline with its
 * icon and name on the left and every tool as a chip carrying its official logo. Hovering a chip shows what it is
 * for (screen readers hear it with the name). Filtering re-runs a short staggered entrance.
 */
export function Skills() {
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<SkillItem>(() => skillCategories.flatMap(c => c.items).find(t => t.name === 'Three.js')!);
  const total = skillCategories.reduce((sum, c) => sum + c.items.length, 0);
  const shown = skillCategories.filter((c) => filter === 'All' || c.name === filter);
  const items = shown.flatMap(c => c.items);
  const active = items.find(t => t.name === selected.name) ?? items[0];
  const featured = ['Three.js', 'GSAP', 'React', 'Python', 'n8n workflows', 'Power BI'];
  const cloudItems = filter === 'All' ? featured.map(name => items.find(t => t.name === name)!).filter(Boolean) : items;
  return (
    <section id="skills" className="section skills" data-chapter="skills" data-chapter-label="Skills"
      style={{ '--section-accent': accentVar(copy.accent) } as CSSProperties} aria-labelledby="skills-h">
      <div className="page">
        <div className="skills__head">
          <Chapter id="skills" titleId="skills-h" title={copy.title} lead={copy.lead} />
          <dl className="skills__stats" data-reveal>
            <div><dt>Disciplines</dt><Count to={skillCategories.length} /></div>
            <div><dt>Tools & capabilities</dt><Count to={total} /></div>
          </dl>
        </div>

        <div className="skills__filters" role="group" aria-label={copy.indexLabel} data-reveal>
          {['All', ...skillCategories.map((c) => c.name)].map((name) => (
            <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)}>
              {name !== 'All' && <Icon name={CAT_ICON[name] ?? 'skills'} size={13} />}
              {name}<sup>{name === 'All' ? total : skillCategories.find((c) => c.name === name)!.items.length}</sup>
            </button>
          ))}
        </div>

        <div className="skills__body">
        <SkillCloud items={cloudItems} active={active} />
        <ul className="ledger" key={filter}>
          {shown.map((c, ci) => (
            <li key={c.name} className="ledger__row" style={{ '--ri': ci } as CSSProperties}>
              <div className="ledger__cat">
                <span className="ledger__icon" aria-hidden="true"><Icon name={CAT_ICON[c.name] ?? 'skills'} size={16} /></span>
                <h3>{c.name}</h3>
                <span className="ledger__count" aria-hidden="true">{String(c.items.length).padStart(2, '0')}</span>
              </div>
              <ul className="ledger__chips" aria-label={`${c.name}: ${c.blurb}`}>
                {c.items.map((t, ti) => (
                  <li key={t.name} className={`chip${active.name === t.name ? ' is-active' : ''}`} data-note={t.note} style={{ '--tc': (() => { const l = toolLogos[t.name]; return l && 'path' in l ? readable(l.hex) : t.color; })(), '--ti': ti } as CSSProperties}>
                    <button type="button" className="chip__button" aria-pressed={active.name === t.name}
                      onPointerMove={(event) => { if (event.pointerType === 'mouse') setSelected(t); }}
                      onFocus={() => setSelected(t)} onClick={() => setSelected(t)}>
                      <span className="chip__mark" aria-hidden="true"><SkillLogo name={t.name} /></span>
                      <span>{t.name}<span className="sr-only">: {t.note}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              {c.items.some(t => t.name === active.name) && <p className="ledger__detail"><strong>{active.name}</strong> — {active.note}</p>}
            </li>
          ))}
        </ul>
        </div>

        <div className="skills__footer" data-reveal>
          <p>{copy.footer}</p>
          <a href="#projects">{copy.footerLink} <Icon name="arrow" size={14} /></a>
        </div>
      </div>
    </section>
  );
}
