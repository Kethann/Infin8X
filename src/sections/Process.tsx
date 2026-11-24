import { useEffect, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { processSteps, accentVar, isTodo } from '../content/sections';
import { Chapter } from '../components/Chapter';
import { useReducedMotion } from '../lib/useReducedMotion';
import { isLowEnd } from '../lib/env';

const SPEC = ['#FF3B5C', '#FF9A3C', '#FFD93C', '#3CD98A', '#3CA9FF', '#7B5CFF'];
/** progress (0–1) at which each step lights up */
const AT = [0.02, 0.18, 0.34, 0.5, 0.66, 0.84];
const DURATION = 4.5;

/**
 * Process: six steps on one line. When the section comes into view the line lights up from step to step
 * (one CSS variable, --p, drives the line, the nodes and the cards). No diagram and no boxed panel.
 * On narrow screens the steps wrap into a readable grid.
 */
export function Process() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (reduced || isLowEnd()) { el.style.setProperty('--p', '1'); return; }
    el.style.setProperty('--p', '0');
    const prog = { p: 0 };
    let tween: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      tween = gsap.to(prog, { p: 1, duration: DURATION, ease: 'none', onUpdate: () => el.style.setProperty('--p', prog.p.toFixed(4)) });
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(list.current!);
    return () => { io.disconnect(); tween?.kill(); };
  }, [reduced]);
  return (
    <section ref={ref} id="process" className="section process" data-chapter="process" data-chapter-label="Process"
      style={{ '--section-accent': accentVar(processSteps.accent) } as CSSProperties} aria-labelledby="process-h">
      <div className="page">
        <Chapter id="process" titleId="process-h" title={processSteps.title} lead={processSteps.lead} />
        <div className="flow" data-reveal>
          <ol ref={list} className="flow__steps">
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
    </section>
  );
}
