import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { processSteps, accentVar, isTodo } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../lib/useReducedMotion';
import { isLowEnd } from '../lib/env';

/** The prism order: white light first, then the spectrum. */
const SPEC = ['#ffffff', '#FF3B5C', '#FF9A3C', '#FFD93C', '#D94CFF', '#3CA9FF'];
/** Ink on each sphere: dark on the light colours, white on the deep ones. */
const INK = ['#0b1020', '#ffffff', '#1a0f05', '#1a1405', '#ffffff', '#06121f'];
const ICONS = ['eye', 'check', 'net', 'cube', 'replay', 'up'];
const N = 6;
const STEP_DEG = 360 / N;
const AUTO_MS = 5200;
const pad = (n: number) => String(n).padStart(2, '0');

/* the track between neighbouring spheres, in the SVG's own -50..50 space (radius 36) */
const R = 36, GAP = 17;
const pt = (deg: number) => [R * Math.cos((deg * Math.PI) / 180), R * Math.sin((deg * Math.PI) / 180)].map(v => v.toFixed(2)).join(' ');
const ARCS = Array.from({ length: N }, (_, i) => {
  const a = i * STEP_DEG;
  return `M ${pt(a + GAP)} A ${R} ${R} 0 0 1 ${pt(a + STEP_DEG - GAP)}`;
});

/**
 * Process as a clock dial: six glossy spheres on a bezel, joined by arcs in path order (06 loops back to 01). The dial
 * turns so the current step comes round to the marker that faces the details (right on desktop, bottom on phones);
 * the spheres counter-rotate and stay upright. It cycles through all six while in view, pausing while the pointer or
 * focus is on it and for a few seconds after a manual pick. Hold and drag turns it by hand; it snaps to the nearest step.
 * One registered angle (--turn) drives the ring and every sphere, so they can never drift apart mid-turn.
 */
export function Process() {
  const reduced = useReducedMotion();
  const [state, setState] = useState({ active: 0, turn: 0 }); // turn: unwrapped steps, so the dial takes the short way
  const [hold, setHold] = useState(false);       // pointer or focus inside: wait
  const [pickedAt, setPickedAt] = useState(0);  // a manual pick pauses the cycle for a while
  const [inView, setInView] = useState(false);
  const dial = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLDivElement>(null);
  // hold and drag: the dial follows the pointer round its centre and snaps to the nearest step on release
  const drag = useRef<{ id: number; x: number; y: number; last: number; deg: number; on: boolean } | null>(null);
  const justDragged = useRef(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const { active, turn } = state;

  const go = (next: number, user = false) => {
    const target = ((next % N) + N) % N;
    setState(s => ({ active: target, turn: s.turn + ((((target - s.active) % N) + N + N / 2) % N) - N / 2 }));
    if (user) setPickedAt(Date.now());
  };

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(dial.current!);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (hold || !inView || reduced) return;
    // the cycle goes through all six steps and keeps going; after a manual pick it waits a little longer first
    const wait = Math.max(AUTO_MS, pickedAt + 9000 - Date.now());
    const t = window.setTimeout(() => {
      if (!document.hidden && !drag.current?.on) setState(s => ({ active: (s.active + 1) % N, turn: s.turn + 1 }));
    }, wait);
    return () => window.clearTimeout(t);
  }, [hold, inView, reduced, pickedAt, state]);

  // a gentle tilt toward the pointer (mouse, full motion, capable devices only)
  const tiltOK = !reduced && !isLowEnd();
  const frame = useRef(0);
  const onTilt = (e: PointerEvent<HTMLDivElement>) => {
    if (!tiltOK || e.pointerType !== 'mouse') return;
    const el = dial.current!, x = e.clientX, y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${((x - r.left) / r.width - .5) * 10}deg`);
      el.style.setProperty('--ty', `${(.5 - (y - r.top) / r.height) * 10}deg`);
    });
  };
  const angleAt = (x: number, y: number) => {
    const r = dial.current!.getBoundingClientRect();
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, last: angleAt(e.clientX, e.clientY), deg: 0, on: false };
  };
  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      d.on = true;
      dial.current!.setPointerCapture(e.pointerId);
      clock.current!.setAttribute('data-dragging', '');
    }
    const a = angleAt(e.clientX, e.clientY);
    d.deg += ((a - d.last + 540) % 360) - 180;   // unwrapped, so whole turns keep counting
    d.last = a;
    clock.current!.style.setProperty('--turn', `${-turn * STEP_DEG + d.deg}deg`);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.on) return;
    justDragged.current = true;
    window.setTimeout(() => { justDragged.current = false; }, 0);
    const k = Math.round(d.deg / STEP_DEG);
    const nextTurn = turn - k;
    const el = clock.current!;
    void getComputedStyle(el).getPropertyValue('--turn'); // commit the dragged angle before turning transitions back on
    el.removeAttribute('data-dragging');
    el.style.setProperty('--turn', `${-nextTurn * STEP_DEG}deg`); // settle from where the hand let go
    setState({ active: (((active - k) % N) + N) % N, turn: nextTurn });
    setPickedAt(Date.now());
  };
  const onTiltEnd = () => { cancelAnimationFrame(frame.current); dial.current?.style.setProperty('--tx', '0deg'); dial.current?.style.setProperty('--ty', '0deg'); };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const next = k === 'ArrowRight' || k === 'ArrowDown' ? active + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? active - 1
      : k === 'Home' ? 0 : k === 'End' ? N - 1 : null;
    if (next === null) return;
    e.preventDefault();
    go(next, true);
    tabs.current[((next % N) + N) % N]?.focus();
  };

  const steps = processSteps.steps;
  const cur = steps[active];
  return (
    <section id="process" className="section process" data-chapter="process" data-chapter-label="Process"
      style={{ '--section-accent': accentVar(processSteps.accent) } as CSSProperties} aria-labelledby="process-h">
      <div className="page">
        <Chapter id="process" titleId="process-h" title={processSteps.title} lead={processSteps.lead} />
        <div className="clock-reveal" data-reveal>
        <div ref={clock} className="clock" data-live={inView || undefined}
          style={{ '--turn': `${-turn * STEP_DEG}deg`, '--c': SPEC[active] } as CSSProperties}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHold(true); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHold(false); }}
          onFocus={() => setHold(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false); }}>
          <div ref={dial} className="clock__dial" onPointerDown={onDown} onPointerMove={(e) => { onDragMove(e); if (!drag.current?.on) onTilt(e); }}
            onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onTiltEnd}>
            <div className="clock__body">
              <span className="clock__bezel" aria-hidden="true" />
              <span className="clock__sweep" aria-hidden="true" />
              <span className="clock__marker" aria-hidden="true" />
              <div className="clock__ring">
                <svg className="clock__track" viewBox="-50 -50 100 100" aria-hidden="true">
                  <circle r={R} className="clock__groove" />
                  {ARCS.map((d, i) => (
                    <path key={i} d={d} pathLength={1} className={`clock__arc${i === N - 1 ? ' clock__arc--loop' : ''}${i < active ? ' is-lit' : ''}`}
                      style={{ '--c': SPEC[i] } as CSSProperties} />
                  ))}
                </svg>
                <div className="clock__steps" role="tablist" aria-label={processSteps.dialLabel} onKeyDown={onKey}>
                  {steps.map((st, i) => (
                    <button key={st.n} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`process-tab-${i}`}
                      aria-selected={i === active} aria-controls={`process-panel-${i}`} tabIndex={i === active ? 0 : -1}
                      className={`clock__orb${i === active ? ' is-active' : ''}${i < active ? ' is-done' : ''}`}
                      style={{ '--a': `${i * STEP_DEG}deg`, '--c': SPEC[i], '--ink': INK[i] } as CSSProperties}
                      onClick={() => { if (!justDragged.current) go(i, true); }}>
                      <span className="clock__orb-body"><Icon name={ICONS[i]} size={24} /></span>
                      <span className="sr-only">{st.n} {st.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="clock__hub" aria-hidden="true">
                <span className="clock__hub-label">{processSteps.stepLabel}</span>
                <span className="clock__hub-n" key={cur.n}>{cur.n}</span>
                <span className="clock__hub-of">{processSteps.ofLabel} {pad(N)}</span>
              </div>
            </div>
            <span className="clock__floor" aria-hidden="true" />
          </div>

          <div className="clock__panels">
            <div className="clock__stack">
              {steps.map((st, i) => (
                <div key={st.n} id={`process-panel-${i}`} role="tabpanel" aria-labelledby={`process-tab-${i}`}
                  className={`clock__panel${i === active ? ' is-active' : ''}`} aria-hidden={i !== active}
                  style={{ '--c': SPEC[i] } as CSSProperties}>
                  <p className="clock__step">{processSteps.stepLabel} {st.n} <span>/ {pad(N)}</span></p>
                  <h3>{st.name}</h3>
                  <p className="clock__text">{st.text}</p>
                  <dl>
                    <div><dt>{processSteps.deliverableLabel}</dt><dd>{st.deliverable}</dd></div>
                    {!isTodo(st.time) && <div><dt>{processSteps.timeLabel}</dt><dd>{st.time}</dd></div>}
                  </dl>
                </div>
              ))}
            </div>
            <div className="clock__nav">
              <button type="button" className="clock__btn clock__btn--prev" aria-label={processSteps.prevLabel} onClick={() => go(active - 1, true)}><Icon name="up" size={16} /></button>
              <span className="clock__pips" aria-hidden="true">
                {steps.map((st, i) => <i key={st.n} className={i === active ? 'is-active' : i < active ? 'is-done' : ''} style={{ '--c': SPEC[i] } as CSSProperties} />)}
              </span>
              <button type="button" className="clock__btn clock__btn--next" aria-label={processSteps.nextLabel} onClick={() => go(active + 1, true)}><Icon name="up" size={16} /></button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
