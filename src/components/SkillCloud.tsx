import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkillItem } from '../content/skills';
import { skills as copy } from '../content/sections';
import { isLowEnd } from '../lib/env';
import { useReducedMotion } from '../lib/useReducedMotion';
import { SkillLogo } from './SkillLogo';

const positions = [[17, 21, -13], [79, 17, 12], [87, 57, -9], [17, 72, 11], [66, 85, -12], [48, 10, 8]];

/** Optical depth inspired by the portfolio's floating logos. No extra WebGL context. */
export function SkillCloud({ items, active }: { items: SkillItem[]; active: SkillItem }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [paused, setPaused] = useState(false);
  const motion = !reduced && !isLowEnd();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current!);
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  return (
    <aside ref={ref} className={`skill-cloud${motion ? '' : ' is-still'}`} aria-label={copy.previewLabel}
      style={{ '--skill-colour': active.color, '--float-state': motion && visible && !hidden && !paused ? 'running' : 'paused' } as CSSProperties}>
      <div className="skill-cloud__top"><span>{copy.previewLabel}</span>
        {motion && <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? copy.resumeMotion : copy.pauseMotion}</button>}
      </div>
      <div className="skill-cloud__field" aria-hidden="true">
        {items.slice(0, positions.length).map((item, i) => {
          const [x, y, turn] = positions[i];
          return <span className="skill-float" key={item.name} style={{ '--x': `${x}%`, '--y': `${y}%`, '--turn': `${turn}deg`, '--delay': `${-i * 2.3}s`, '--life': `${12 + i * .9}s`, '--tile-colour': item.color } as CSSProperties}>
            <span className="skill-tile"><SkillLogo name={item.name} /></span>
          </span>;
        })}
      </div>
      <div className="skill-spotlight" key={active.name}>
        <span className="skill-spotlight__object" aria-hidden="true"><span className="skill-tile"><SkillLogo name={active.name} /></span></span>
        <h3>{active.name}</h3><p>{active.note}</p>
      </div>
      <p className="skill-cloud__hint">{copy.previewHint}</p>
    </aside>
  );
}
