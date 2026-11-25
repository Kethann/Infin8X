import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkillItem } from '../content/skills';
import { skills as copy } from '../content/sections';
import { useReducedMotion } from '../lib/useReducedMotion';
import { SkillLogo } from './SkillLogo';

const DUST = 8;          // background icons
const MORPH_MS = 900;    // centre icon hand-off (keep in step with the CSS morph keyframes)

/** A free spot for a background icon: anywhere in the panel except the centre, where the spotlight sits. */
function spot() {
  for (;;) {
    const x = 8 + Math.random() * 84, y = 6 + Math.random() * 82;
    if (!(x > 28 && x < 72 && y > 16 && y < 78)) return { x, y };
  }
}
interface Mote { item: number; x: number; y: number; turn: number; size: number; life: number; delay: number; gen: number }
const mote = (n: number, first = false, gen = 0): Mote => {
  const life = 9 + Math.random() * 7;
  return { item: Math.floor(Math.random() * Math.max(1, n)), ...spot(), turn: Math.random() * 30 - 15, size: 34 + Math.random() * 24, life,
  // the first round starts at random points of its cycle, so the icons never appear together
  delay: first ? -Math.random() * life : Math.random() * 2.5, gen };
};

/** Particle updates stay inside this layer; changing the preview does not rerender it. */
const FloatingSkills = memo(function FloatingSkills({ items }: { items: SkillItem[] }) {
  const [motes, setMotes] = useState<Mote[]>(() => Array.from({ length: DUST }, () => mote(items.length, true)));
  const respawn = (i: number) => setMotes(list => list.map((m, k) => (k === i ? mote(items.length, false, m.gen + 1) : m)));
  return <div className="skill-cloud__field" aria-hidden="true">
    {items.length > 0 && motes.map((m, i) => {
      const item = items[m.item % items.length];
      return <span className="skill-float" key={`${i}-${m.gen}`} onAnimationEnd={(e) => { if (e.target === e.currentTarget) respawn(i); }}
        style={{ '--x': `${m.x}%`, '--y': `${m.y}%`, '--turn': `${m.turn}deg`, '--size': `${m.size}px`, '--delay': `${m.delay}s`, '--life': `${m.life}s`, '--tile-colour': item.color } as CSSProperties}>
        <span className="skill-tile"><SkillLogo name={item.name} /></span>
      </span>;
    })}
  </div>;
});

/** Hidden grid samples reserve the tallest copy at the current width. They only change with the category. */
const PreviewSizer = memo(function PreviewSizer({ items }: { items: SkillItem[] }) {
  return <div className="skill-spotlight__sizer" aria-hidden="true">
    {items.map(item => <div className="skill-spotlight__sample" key={item.name}>
      <span className="skill-spotlight__sample-name">{item.name}</span><p>{item.note}</p>
    </div>)}
  </div>;
});

/**
 * The tool in focus, with icons drifting behind it like dust. Each background icon fades in, drifts and dissolves on
 * its own random clock, and only takes a new tool and position once it has faded out (one cycle per mount), so
 * nothing ever swaps in view. The centre icon uses an elastic transform and opacity hand-off without animated filters.
 * Hover sets the tool; otherwise it cycles.
 */
export function SkillCloud({ items, active }: { items: SkillItem[]; active: SkillItem | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [step, setStep] = useState(() => Math.max(0, items.findIndex(item => item.name === 'Three.js')));
  const motion = !reduced;
  const running = motion && visible && !hidden;
  const spotlight = active ?? items[step % items.length] ?? items[0];

  // the centre hand-off: the outgoing tool stays mounted for the length of the morph
  const [leaving, setLeaving] = useState<SkillItem | null>(null);
  const shownRef = useRef(spotlight);
  useEffect(() => {
    if (!running) { shownRef.current = spotlight; setLeaving(null); return; }
    if (!spotlight || shownRef.current?.name === spotlight.name) return;
    const prev = shownRef.current;
    shownRef.current = spotlight;
    if (!prev) return;
    setLeaving(prev);
    const t = window.setTimeout(() => setLeaving(null), MORPH_MS);
    return () => window.clearTimeout(t);
  }, [spotlight, running]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current!);
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  useEffect(() => {
    if (!running || items.length < 2) return;
    // Hover changes only the preview; the cycle and floating animations keep running.
    const timer = window.setInterval(() => setStep(value => (value + 1) % items.length), 3600);
    return () => window.clearInterval(timer);
  }, [running, items.length]);

  const outgoing = running ? leaving : null;
  if (!spotlight) return null;
  return (
    <aside ref={ref} className={`skill-cloud${motion ? '' : ' is-still'}`} aria-label={copy.previewLabel}
      style={{ '--skill-colour': spotlight.color, '--float-state': running ? 'running' : 'paused' } as CSSProperties}>
      <FloatingSkills items={items} />
      <div className="skill-spotlight">
        <span className={`skill-spotlight__object${outgoing ? ' is-morphing' : ''}`} aria-hidden="true">
          <span className="skill-spotlight__stage">
            {outgoing && <span className="skill-spotlight__layer is-out" key={`out-${outgoing.name}`}><span className="skill-tile"><SkillLogo name={outgoing.name} /></span></span>}
            <span className={`skill-spotlight__layer${outgoing ? ' is-in' : ''}`} key={`in-${spotlight.name}`}><span className="skill-tile"><SkillLogo name={spotlight.name} /></span></span>
          </span>
        </span>
        <div className="skill-spotlight__copy">
          <PreviewSizer items={items} />
          <div className="skill-spotlight__text" key={spotlight.name}><h3>{spotlight.name}</h3><p>{spotlight.note}</p></div>
        </div>
      </div>
    </aside>
  );
}
