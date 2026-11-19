import { useEffect, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { processSteps, accentVar, isTodo } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../lib/useReducedMotion';
import { isLowEnd } from '../lib/env';

const SPEC = ['#FF3B5C', '#FF9A3C', '#FFD93C', '#3CD98A', '#3CA9FF', '#7B5CFF'];
/*
 * One stage, six columns. The diagram is laid out so every step's moment sits exactly above its column
 * (column centres x = 100, 300 … 1100 in a 1200-wide space):
 *   01 idea: white beam · 02 understanding: the prism · 03 planning: the fan into six lanes
 *   04 build: six parallel lanes · 05 feedback: the loop back · 06 live: the lanes recombine into one point.
 */
const Y = 150;
const rayY = (i: number) => Y + (i - 2.5) * 22;
const rayD = (i: number) => `M338 ${Y} C410 ${Y} 452 ${rayY(i)} 560 ${rayY(i)} H930 C1010 ${rayY(i)} 1040 ${Y} 1100 ${Y}`;
const LOOP = `M960 ${rayY(0) - 4} C960 22 840 22 840 ${rayY(0) - 4}`;
/** progress (0–1) at which each step lights up; shared by the diagram, the drop lines and the cards */
const AT = [0.02, 0.15, 0.3, 0.46, 0.64, 0.86];
const DURATION = 6;

/**
 * 03 Process. The light tells the whole story by itself once the chapter is in view, and each step sits in a line
 * directly under the part of the prism story it belongs to: a drop line connects the moment in the light to its
 * card, and the card lights up when the light reaches it. One CSS variable (--p) drives everything.
 * On narrow screens the diagram scales down and the steps wrap into a readable grid.
 */
export function Process() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const prog = useRef({ p: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);
  const set = (p: number) => {
    ref.current?.style.setProperty('--p', p.toFixed(4));
  };
  const play = () => {
    tween.current?.kill();
    if (reduced || isLowEnd()) { set(1); return; }
    prog.current.p = 0;
    tween.current = gsap.to(prog.current, { p: 1, duration: DURATION, ease: 'none', onUpdate: () => set(prog.current.p) });
  };
  useEffect(() => {
    const el = ref.current!;
    const s = strip.current!;
    if (reduced || isLowEnd()) { el.style.setProperty('--p', '1'); return; }
    el.style.setProperty('--p', '0');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(s);
    return () => {
      io.disconnect(); tween.current?.kill();
    };
  }, [reduced]);
  return (
    <section ref={ref} id="process" className="section process" data-chapter="process" data-chapter-label="Process"
      style={{ '--section-accent': accentVar(processSteps.accent) } as CSSProperties} aria-labelledby="process-h">
      <div className="page">
        <Chapter id="process" titleId="process-h" title={processSteps.title} lead={processSteps.lead} />
        <div className="flow" data-reveal>
          <div className="flow__key" aria-label={processSteps.legendTitle}>
            <p className="flow__key-title" aria-hidden="true">{processSteps.legendTitle}</p>
            {processSteps.legend.map((l) => (
              <dl key={l.kind}><dt><i className={`flow__swatch flow__swatch--${l.kind}`} aria-hidden="true" />{l.term}</dt><dd>{l.meaning}</dd></dl>
            ))}
          </div>
          <div ref={strip} className="flow__strip" role="region" aria-label="Process: six steps along the light">
            <div className="flow__stage">
              <svg className="flow__svg" viewBox="0 0 1200 270" aria-hidden="true">
                <defs>
                  <linearGradient id="flow-loop" x1="960" x2="840" y1="0" y2="0" gradientUnits="userSpaceOnUse">{SPEC.map((c, i) => <stop key={c} offset={i / 5} stopColor={c} />)}</linearGradient>
                  <linearGradient id="flow-prism" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".5" stopColor="#9fc4ff" stopOpacity=".1" /><stop offset="1" stopColor="#fff" stopOpacity=".3" /></linearGradient>
                  <radialGradient id="flow-point"><stop offset="0" stopColor="#fff" /><stop offset=".22" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
                  <filter id="flow-glow" filterUnits="userSpaceOnUse" x="0" y="-20" width="1200" height="310"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                {/* drop lines: from each moment in the light down to its step */}
                <g className="flow__drops">
                  {[100, 300, 500, 700, 900, 1100].map((x, i) => <line key={x} x1={x} x2={x} y1={i === 4 ? 30 : i === 1 ? 214 : 190} y2="270" style={{ '--at': AT[i] } as CSSProperties} />)}
                </g>
                <g className="flow__guides">
                  <path d={`M0 ${Y} H262`} />{SPEC.map((_, i) => <path key={i} d={rayD(i)} />)}<path d={LOOP} />
                </g>
                <path className="flow__light flow__light--beam" d={`M0 ${Y} H262`} pathLength={1} stroke="#fff" strokeWidth="3" filter="url(#flow-glow)" />
                <g className="flow__prism">
                  <polygon points="300,86 362,206 238,206" fill="url(#flow-prism)" />
                  <polygon points="300,86 362,206 238,206" className="flow__prism-edge" />
                </g>
                {SPEC.map((c, i) => <path key={c} className="flow__light flow__light--ray" d={rayD(i)} pathLength={1} stroke={c} strokeWidth="2.4" filter="url(#flow-glow)" style={{ '--ri': i } as CSSProperties} />)}
                {/* energy keeps flowing along the lanes once the light has arrived */}
                <g className="flow__pulses">
                  <path d={`M0 ${Y} H262`} pathLength={1} stroke="#fff" />
                  {SPEC.map((c, i) => <path key={c} d={rayD(i)} pathLength={1} stroke={c} style={{ '--ri': i } as CSSProperties} />)}
                </g>
                <path className="flow__light flow__light--loop" d={LOOP} pathLength={1} stroke="url(#flow-loop)" strokeWidth="2.4" filter="url(#flow-glow)" />
                <circle className="flow__point" cx="1100" cy={Y} r="44" fill="url(#flow-point)" />
                <text className="flow__live" x="1100" y="214" textAnchor="middle">{processSteps.stage.live}</text>
              </svg>
              <ol className="flow__steps">
                {processSteps.steps.map((st, i) => (
                  <li key={st.n} className="flow__step" style={{ '--at': AT[i], '--c': i === 0 ? '#ffffff' : SPEC[i - 1] } as CSSProperties}>
                    <i className="flow__node" aria-hidden="true" />
                    <h3>{st.name}</h3>
                    <p className="flow__text">{st.text}</p>
                    <dl>
                      <div><dt>{processSteps.deliverableLabel}</dt><dd>{st.deliverable}</dd></div>
                      {!isTodo(st.time) && <div><dt>{processSteps.timeLabel}</dt><dd>{st.time}</dd></div>}
                    </dl>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <button type="button" className="flow__replay" onClick={play}><Icon name="replay" size={14} />{processSteps.replay}</button>
        </div>
      </div>
    </section>
  );
}
