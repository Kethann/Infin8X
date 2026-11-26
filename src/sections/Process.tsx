import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { processSteps, accentVar, isTodo } from '../content/sections';
import { brand } from '../content/site';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../lib/useReducedMotion';
import { isLowEnd } from '../lib/env';

/** The prism order: white light first, then the spectrum (no green). */
const SPEC = ['#eef2fb', '#FF3B5C', '#FF9A3C', '#FFD93C', '#D94CFF', '#3CA9FF'];
/** Text printed on each ribbon: dark on the light colours, white on the deep ones. */
const INK = ['#0b1020', '#ffffff', '#1f1205', '#1f1805', '#ffffff', '#04101d'];
const N = 6;
/** One line icon per step, shown in the note's medallion. */
const ICONS = ['eye', 'check', 'net', 'cube', 'replay', 'up'];
const AUTO_MS = 4200;

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const DARK = '#03060d';

/* ---------- scene geometry (SVG user units) ---------- */
const VB = { x: 40, y: 18, w: 520, h: 996 };
const CX = 300;
/* The ribbon is one helix wound round the pen, seen from slightly above. Every quantity drifts slowly along the ribbon
   (radius, lean, ellipse, spacing, width) so no two turns are alike, and the cloth narrows where it twists round the
   sides. θ = 2πi is the front of turn i; front faces are θ ∈ 2πi ± π/2, the backs run behind the pen. */
const BH = 46, PITCH = 96, Y0 = 156; // a roomy pitch: the turns breathe instead of stacking
const TAU = Math.PI * 2;
const rh = (t: number) => 204 + 9 * Math.sin(0.43 * t + 0.6);
const cx = (t: number) => CX + rh(t) * Math.sin(t) + 5 * Math.sin(0.19 * t + 1.1);
const cy = (t: number) => Y0 + BH / 2 + (PITCH * t) / TAU + (15 + 4 * Math.sin(0.31 * t + 2)) * Math.cos(t) + 6 * Math.sin(0.27 * t + 0.4);
const hw = (t: number) => (BH / 2) * (0.8 + 0.2 * Math.abs(Math.cos(t))) * (1 + 0.07 * Math.sin(0.37 * t + 1.3));
const at = (t: number, side: number) => [cx(t), cy(t) + side * hw(t)] as const;
const pts = (t0: number, t1: number, side: number, n = 56) =>
  Array.from({ length: n + 1 }, (_, k) => { const [x, y] = at(t0 + ((t1 - t0) * k) / n, side); return `${x.toFixed(1)} ${y.toFixed(1)}`; });
const strip = (t0: number, t1: number) => `M${pts(t0, t1, -1).join('L')}L${pts(t0, t1, 1).reverse().join('L')}Z`;
const line = (t0: number, t1: number, side = 0) => `M${pts(t0, t1, side).join('L')}`;
const F0 = (i: number) => TAU * i - Math.PI / 2, F1 = (i: number) => TAU * i + Math.PI / 2;
const front = (i: number) => strip(F0(i), F1(i));
const back = (i: number) => strip(F1(i), F1(i) + Math.PI);
const TOP_TAIL = strip(-1.5 * Math.PI, -Math.PI / 2);
const BOTTOM_TAIL = strip(F1(N - 1), F1(N - 1) + Math.PI);
const L = CX - 222, R = CX + 222; // gradient span
/* where each front face starts and ends (the callout docks there) and its box (its tab button) */
const BANDS = Array.from({ length: N }, (_, i) => {
  const s = Array.from({ length: 41 }, (_, k) => F0(i) + (Math.PI * k) / 40);
  const ys = s.flatMap((t) => [at(t, -1)[1], at(t, 1)[1]]), xs = s.map(cx);
  return { start: at(F0(i), 0), end: at(F1(i), 0), top: Math.min(...ys), bottom: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs) };
});

/* A point a fraction of the way along a band's centre line (by length), with the line's direction there: the step
   badge sits on the cloth and turns with it. */
const along = (i: number, frac: number) => {
  const P = Array.from({ length: 121 }, (_, k) => at(F0(i) + (Math.PI * k) / 120, 0));
  const len = [0];
  for (let k = 1; k < P.length; k++) len.push(len[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const want = frac * len[len.length - 1];
  const k = Math.max(1, len.findIndex((v) => v >= want));
  const [x0, y0] = P[k - 1], [x1, y1] = P[k], u = (want - len[k - 1]) / (len[k] - len[k - 1] || 1);
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, deg: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, total: len[len.length - 1] };
};
/* the step badge: a swept dart (number cut out of it) with a smaller chevron trailing behind, pointing along the ribbon */
const DART = 'M27 0L-15 -18L-4 0L-15 18Z';
const CHEVRON = 'M-10 0L-28 -13L-22 0L-28 13Z';
const MARKS = Array.from({ length: N }, (_, i) => {
  const m = along(i, 0.13);
  return { ...m, name: `${(0.13 + 40 / m.total) * 100}%` }; // the name starts just past the badge
});

/* the pen, top to bottom: finial, posted cap (clip + medallion), engraved lip, barrel, ring, grip section, nib */
const CAP = { top: 40, lip: 309, lipEnd: 335, half: 38 };
/* everything below the ribbon sits DROP lower than the drawing's original coordinates */
const DROP = 96;
const BARREL = { end: 626 + DROP, half: 35 };
const RING = { end: 652 + DROP, half: 34 }; // the barrel's gold ring carries the engraved name (always clear of the ribbon)
const SECTION = { end: 724 + DROP, top: 27, bottom: 22 };
const TIP = 850 + DROP;
const NIB = `M${CX - 22} ${SECTION.end}C${CX - 31} ${760 + DROP} ${CX - 27} ${782 + DROP} ${CX - 4} ${TIP - 4}Q${CX} ${TIP + 2} ${CX + 4} ${TIP - 4}C${CX + 27} ${782 + DROP} ${CX + 31} ${760 + DROP} ${CX + 22} ${SECTION.end}Z`;
const NIB_PLATE = `M${CX - 13} ${SECTION.end}C${CX - 15} ${758 + DROP} ${CX - 9} ${774 + DROP} ${CX} ${784 + DROP}C${CX + 9} ${774 + DROP} ${CX + 15} ${758 + DROP} ${CX + 13} ${SECTION.end}Z`;

/** One continuous spectrum ribbon: each face blends into its neighbours, the undersides carry the blend behind the pen. */
const near = (i: number, d: number) => SPEC[Math.min(N - 1, Math.max(0, i + d))];
const RIBBON = SPEC.map((c, i) => ({
  face: [[0, mix(c, near(i, -1), 0.38)], [0.3, c], [0.7, c], [1, mix(c, near(i, 1), 0.38)]] as [number, string][],
  under: [[0, mix(mix(c, near(i, 1), 0.38), DARK, 0.66)], [0.5, mix(mix(c, near(i, 1), 0.5), DARK, 0.84)], [1, mix(mix(near(i, 1), c, 0.38), DARK, 0.66)]] as [number, string][],
  edge: mix(c, '#ffffff', 0.55),
}));

/**
 * Process as an Infin8X fountain pen: navy lacquer, champagne-gold trim, the logo on the clip medallion and the name
 * engraved on the barrel ring. The six steps are one satin ribbon wound round it in the spectrum order, each step's words
 * set on its curve under the cloth's shading so they turn with it. The details stay out of the way: hovering, focusing
 * or tapping a band opens a small callout docked to that band's end (beside the pen on desktop; on
 * phones the note docks over the nib, below the last band, so every band stays visible and tappable). While nothing is open the bands take turns catching the light to invite a look. Reduced motion and low-end
 * devices get the still scene.
 */
export function Process() {
  const reduced = useReducedMotion();
  const [lite] = useState(isLowEnd);
  const [active, setActive] = useState(0);    // the band catching the light
  const [open, setOpen] = useState<number | null>(null);
  const [shown, setShown] = useState(0);      // the callout's content (kept while it fades out)
  const [inView, setInView] = useState(false);
  const [entered, setEntered] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerType = useRef('');
  const closeT = useRef(0);
  const animated = !reduced && !lite;

  const show = (i: number | null) => {
    window.clearTimeout(closeT.current);
    setOpen(i);
    if (i !== null) { setShown(i); setActive(i); }
  };
  const closeSoon = () => { window.clearTimeout(closeT.current); closeT.current = window.setTimeout(() => setOpen(null), 260); };

  useEffect(() => {
    // entries can arrive batched (slow frames): the latest one is the truth
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; setInView(e.isIntersecting); if (e.isIntersecting) setEntered(true); }, { threshold: 0.2 });
    io.observe(root.current!); // the root, not the stage: the stage's entrance clip-path hides it from the observer
    return () => io.disconnect();
  }, []);
  // while nothing is open, the bands take turns catching the light
  useEffect(() => {
    if (open !== null || !inView || reduced) return;
    const t = window.setTimeout(() => { if (!document.hidden) setActive((a) => (a + 1) % N); }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [open, inView, reduced, active]);
  // a tap anywhere else (or Escape) closes the callout
  useEffect(() => {
    if (open === null) return;
    const away = (e: Event) => { if (!stage.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); tabs.current[open]?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(closeT.current), []);

  // a gentle tilt toward the pointer (mouse, full motion, capable devices only)
  const frame = useRef(0);
  const onTilt = (e: PointerEvent<HTMLDivElement>) => {
    if (!animated || e.pointerType !== 'mouse') return;
    const el = stage.current!, x = e.clientX, y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${((x - r.left) / r.width - 0.5) * 8}deg`);
      el.style.setProperty('--ty', `${(0.5 - (y - r.top) / r.height) * 4}deg`);
    });
  };
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(frame.current); stage.current?.style.setProperty('--tx', '0deg'); stage.current?.style.setProperty('--ty', '0deg');
    if (e.pointerType === 'mouse') closeSoon();
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key, cur = open ?? active;
    const next = k === 'ArrowRight' || k === 'ArrowDown' ? cur + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? cur - 1
      : k === 'Home' ? 0 : k === 'End' ? N - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const i = ((next % N) + N) % N;
    show(i);
    tabs.current[i]?.focus();
  };

  const steps = processSteps.steps;
  const px = (x: number) => `${((x - VB.x) / VB.w) * 100}%`;
  const py = (y: number) => `${((y - VB.y) / VB.h) * 100}%`;
  const card = steps[shown], band = BANDS[shown];
  const side = shown % 2 === 0 ? 'right' : 'left'; // callouts alternate sides, like the ribbon's turns
  return (
    <section id="process" className="section process" data-chapter="process" data-chapter-label="Process"
      style={{ '--section-accent': accentVar(processSteps.accent) } as CSSProperties} aria-labelledby="process-h">
      <div className="page">
        <Chapter id="process" titleId="process-h" title={processSteps.title} lead={processSteps.lead} />
        <div ref={root} className={`pen${animated ? ' pen--anim' : ''}${lite ? ' pen--lite' : ''}`} data-in={entered || undefined}
          data-live={inView || undefined} data-open={open !== null || undefined}>
          {/* Quiet, repeated typography behind the pen; never part of the controls or reading order. */}
          <div className="pen__typewall" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="pen__typeline">{processSteps.backdropText}</span>
            ))}
          </div>
          <div ref={stage} className="pen__stage" onPointerMove={onTilt} onPointerLeave={onLeave}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(null); }}
            style={{ aspectRatio: `${VB.w} / ${VB.h}`, '--c': SPEC[active] } as CSSProperties}>
            <svg className="pen__svg" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="pen-lacquer" x1="0" x2="1">
                  <stop offset="0" stopColor="#02050d" /><stop offset=".08" stopColor="#081430" /><stop offset=".2" stopColor="#173470" />
                  <stop offset=".29" stopColor="#5f80c6" /><stop offset=".325" stopColor="#d6e4ff" /><stop offset=".36" stopColor="#3a5ea8" />
                  <stop offset=".55" stopColor="#0f234d" /><stop offset=".8" stopColor="#09193b" /><stop offset=".9" stopColor="#246a8c" /><stop offset="1" stopColor="#02050d" />
                </linearGradient>
                <linearGradient id="pen-gold" x1="0" x2="1">
                  <stop offset="0" stopColor="#3d2805" /><stop offset=".12" stopColor="#8a6219" /><stop offset=".26" stopColor="#e8c26a" />
                  <stop offset=".33" stopColor="#fff4cf" /><stop offset=".4" stopColor="#d6a646" /><stop offset=".6" stopColor="#9a6f1e" />
                  <stop offset=".82" stopColor="#e2b75a" /><stop offset=".92" stopColor="#7a5414" /><stop offset="1" stopColor="#2e1e04" />
                </linearGradient>
                <linearGradient id="pen-black" x1="0" x2="1">
                  <stop offset="0" stopColor="#000" /><stop offset=".2" stopColor="#15171c" /><stop offset=".3" stopColor="#626875" />
                  <stop offset=".34" stopColor="#e8ecf2" /><stop offset=".38" stopColor="#2a2d34" /><stop offset=".72" stopColor="#0b0c10" />
                  <stop offset=".9" stopColor="#3a4250" /><stop offset="1" stopColor="#000" />
                </linearGradient>
                <linearGradient id="pen-steel" x1="0" x2="1">
                  <stop offset="0" stopColor="#5b616b" /><stop offset=".3" stopColor="#f4f6fa" /><stop offset=".48" stopColor="#b3bac6" />
                  <stop offset=".72" stopColor="#e8ecf2" /><stop offset="1" stopColor="#636974" />
                </linearGradient>
                <radialGradient id="pen-enamel" cx=".4" cy=".35" r=".75">
                  <stop offset="0" stopColor="#1d3470" /><stop offset=".7" stopColor="#07102a" /><stop offset="1" stopColor="#02050d" />
                </radialGradient>
                <radialGradient id="pen-dome" cx=".35" cy=".25" r=".8">
                  <stop offset="0" stopColor="#9aa3b4" /><stop offset=".18" stopColor="#2a2f3a" /><stop offset=".7" stopColor="#07080c" /><stop offset="1" stopColor="#000" />
                </radialGradient>
                <radialGradient id="pen-halo">
                  <stop offset="0" className="pen__halo-stop" stopOpacity=".28" /><stop offset="1" className="pen__halo-stop" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="pen-floor">
                  <stop offset="0" stopColor="#000" stopOpacity=".7" /><stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
                {/* brushed lacquer: fine vertical hairlines (a pattern; SVG filters are avoided on purpose) */}
                <pattern id="pen-brush" width="9" height="40" patternUnits="userSpaceOnUse">
                  <rect x="0" width="1" height="40" fill="#fff" opacity=".5" /><rect x="2.5" width=".6" height="40" fill="#000" opacity=".6" />
                  <rect x="4" width="1.4" height="40" fill="#fff" opacity=".25" /><rect x="6.6" width=".7" height="40" fill="#000" opacity=".45" />
                  <rect x="8.2" width=".5" height="40" fill="#fff" opacity=".4" />
                </pattern>
                <linearGradient id="pen-shadow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset=".55" stopColor="#000" stopOpacity=".5" /><stop offset="1" stopColor="#000" stopOpacity="0" />
                </linearGradient>
                {/* satin: soft light from above across the width, wrap shading across the turn (laid OVER the print) */}
                <linearGradient id="pen-satin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset=".3" stopColor="#fff" stopOpacity=".04" />
                  <stop offset=".62" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".24" />
                </linearGradient>
                <linearGradient id="pen-wrap" gradientUnits="userSpaceOnUse" x1={L} x2={R}>
                  <stop offset="0" stopColor="#000" stopOpacity=".7" /><stop offset=".07" stopColor="#000" stopOpacity=".4" />
                  <stop offset=".2" stopColor="#000" stopOpacity=".08" /><stop offset=".33" stopColor="#fff" stopOpacity=".18" />
                  <stop offset=".41" stopColor="#fff" stopOpacity=".03" /><stop offset=".62" stopColor="#000" stopOpacity=".05" />
                  <stop offset=".82" stopColor="#000" stopOpacity=".18" /><stop offset=".94" stopColor="#000" stopOpacity=".44" /><stop offset="1" stopColor="#000" stopOpacity=".72" />
                </linearGradient>
                <linearGradient id="pen-sheen" gradientUnits="userSpaceOnUse" x1={L} x2={R}>
                  <stop offset=".08" stopColor="#fff" stopOpacity="0" /><stop offset=".34" stopColor="#fff" stopOpacity=".6" />
                  <stop offset=".6" stopColor="#fff" stopOpacity=".12" /><stop offset=".9" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pen-glint" x1="0" x2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pen-tail-in" gradientUnits="userSpaceOnUse" x1={R} x2={L}>
                  <stop offset="0" stopColor={mix(SPEC[0], DARK, 0.7)} stopOpacity="0" /><stop offset=".65" stopColor={mix(SPEC[0], DARK, 0.72)} stopOpacity=".8" />
                  <stop offset="1" stopColor={mix(SPEC[0], DARK, 0.66)} />
                </linearGradient>
                <linearGradient id="pen-tail-out" gradientUnits="userSpaceOnUse" x1={R} x2={L}>
                  <stop offset="0" stopColor={mix(SPEC[N - 1], DARK, 0.66)} /><stop offset=".4" stopColor={mix(SPEC[N - 1], DARK, 0.74)} stopOpacity=".8" />
                  <stop offset="1" stopColor={mix(SPEC[N - 1], DARK, 0.8)} stopOpacity="0" />
                </linearGradient>
                {RIBBON.map((r, i) => (
                  <linearGradient key={`f${i}`} id={`pen-face-${i}`} gradientUnits="userSpaceOnUse" x1={L} x2={R}>
                    {r.face.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
                  </linearGradient>
                ))}
                {RIBBON.map((r, i) => (
                  <linearGradient key={`u${i}`} id={`pen-under-${i}`} gradientUnits="userSpaceOnUse" x1={R} x2={L}>
                    {r.under.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
                  </linearGradient>
                ))}
                {steps.map((_, i) => <clipPath key={i} id={`pen-clip-${i}`}><path d={front(i)} /></clipPath>)}
                {steps.map((_, i) => <path key={i} id={`pen-line-${i}`} d={line(F0(i), F1(i))} />)}
                <clipPath id="pen-body-clip"><rect x={CX - CAP.half} y={CAP.top + 20} width={CAP.half * 2} height={RING.end - CAP.top} /></clipPath>
              </defs>

              {/* light behind the pen in the highlighted step's colour, and its shadow on the floor */}
              <ellipse cx={CX} cy={470} rx={250} ry={470} fill="url(#pen-halo)" />
              <ellipse cx={CX} cy={872 + DROP} rx={150} ry={13} fill="url(#pen-floor)" />

              {/* the ribbon behind the pen: where it comes from, the back of every turn, where it leaves */}
              <g>
                <path d={TOP_TAIL} fill="url(#pen-tail-in)" />
                {steps.slice(0, N - 1).map((_, i) => <path key={i} d={back(i)} fill={`url(#pen-under-${i})`} />)}
                <path d={BOTTOM_TAIL} fill="url(#pen-tail-out)" />
              </g>

              {/* posted cap with finial */}
              <path d={`M${CX - CAP.half} 70Q${CX - CAP.half} ${CAP.top} ${CX} ${CAP.top}Q${CX + CAP.half} ${CAP.top} ${CX + CAP.half} 70V86H${CX - CAP.half}Z`} fill="url(#pen-dome)" />
              <rect x={CX - CAP.half - 0.5} y={86} width={CAP.half * 2 + 1} height={10} fill="url(#pen-gold)" />
              <rect x={CX - CAP.half} y={96} width={CAP.half * 2} height={CAP.lip - 96} fill="url(#pen-lacquer)" />
              <rect x={CX - CAP.half - 0.5} y={CAP.lip} width={CAP.half * 2 + 1} height={CAP.lipEnd - CAP.lip} fill="url(#pen-gold)" />
              {/* barrel, ring, grip section */}
              <rect x={CX - BARREL.half} y={CAP.lipEnd} width={BARREL.half * 2} height={BARREL.end - CAP.lipEnd} fill="url(#pen-lacquer)" />
              <rect x={CX - RING.half} y={BARREL.end} width={RING.half * 2} height={RING.end - BARREL.end} fill="url(#pen-gold)" />
              {/* the name, engraved on the ring */}
              <text x={CX} y={BARREL.end + 17.6} className="pen__engrave pen__engrave--hi" textLength={56} lengthAdjust="spacingAndGlyphs">{brand.name.toUpperCase()}</text>
              <text x={CX} y={BARREL.end + 16.8} className="pen__engrave" textLength={56} lengthAdjust="spacingAndGlyphs">{brand.name.toUpperCase()}</text>
              <path d={`M${CX - SECTION.top} ${RING.end}H${CX + SECTION.top}L${CX + SECTION.bottom} ${SECTION.end}H${CX - SECTION.bottom}Z`} fill="url(#pen-black)" />
              <path d={`M${CX - SECTION.top + 2} ${662 + DROP}H${CX + SECTION.top - 2}M${CX - SECTION.top + 4} ${668 + DROP}H${CX + SECTION.top - 4}`} className="pen__ridge" />
              <rect x={CX - SECTION.bottom - 1.5} y={SECTION.end - 8} width={(SECTION.bottom + 1.5) * 2} height={8} fill="url(#pen-gold)" />
              <g className="pen__grain" fill="url(#pen-brush)">
                <rect x={CX - CAP.half} y={96} width={CAP.half * 2} height={CAP.lip - 96} />
                <rect x={CX - BARREL.half} y={CAP.lipEnd} width={BARREL.half * 2} height={BARREL.end - CAP.lipEnd} />
              </g>
              {/* clip with the logo medallion */}
              <path d={`M${CX - 8} 132H${CX + 8}V256Q${CX + 8} 268 ${CX} 268Q${CX - 8} 268 ${CX - 8} 256Z`} fill="url(#pen-gold)" />
              <path d={`M${CX - 3.5} 140V258`} className="pen__clip-line" />
              <circle cx={CX} cy={122} r={21} fill="url(#pen-gold)" />
              <circle cx={CX} cy={122} r={17} fill="url(#pen-enamel)" />
              <image href="/brand/infinity-extracted.webp" x={CX - 14} y={117.3} width={28} height={9.4} preserveAspectRatio="xMidYMid meet" />
              <circle cx={CX} cy={122} r={17} className="pen__glass" />
              {/* the nib: gold, a steel plate with the mark etched in, breather hole and slit */}
              <path d={NIB} fill="url(#pen-gold)" />
              <path d={NIB_PLATE} fill="url(#pen-steel)" />
              <image href="/brand/infinity-extracted.webp" x={CX - 10} y={738 + DROP} width={20} height={6.7} className="pen__etch" />
              <circle cx={CX} cy={790 + DROP} r={3.4} fill="#120c03" />
              <path d={`M${CX} ${793 + DROP}V${TIP - 3}`} className="pen__slit" />

              {/* shadows the ribbon casts on the pen */}
              <g clipPath="url(#pen-body-clip)" className="pen__shade">
                {steps.map((_, i) => <path key={i} d={front(i)} transform="translate(0 16)" fill="url(#pen-shadow)" />)}
              </g>

              {/* the ribbon in front: one turn per step, the words printed on the satin */}
              {steps.map((st, i) => (
                <g key={st.n} className={`pen__band${i === active ? ' is-active' : ''}${i === open ? ' is-open' : ''}`}>
                  <path d={front(i)} fill={`url(#pen-face-${i})`} />
                  <path d={front(i)} fill="url(#pen-satin)" />
                  <g className="pen__mark" transform={`translate(${MARKS[i].x.toFixed(1)} ${MARKS[i].y.toFixed(1)}) rotate(${MARKS[i].deg.toFixed(1)})`}>
                    <path d={CHEVRON} fill={INK[i]} opacity=".6" />
                    <path d={DART} fill={INK[i]} />
                    <text x="5" y="0.5" className="pen__mark-n" fill={SPEC[i]} dominantBaseline="central" textAnchor="middle">{st.n}</text>
                  </g>
                  <text className="pen__print" fill={INK[i]} dominantBaseline="central">
                    <textPath href={`#pen-line-${i}`} startOffset={MARKS[i].name}>
                      <tspan className="pen__name">{st.name}</tspan>
                    </textPath>
                  </text>
                  <text className="pen__print pen__deliv" fill={INK[i]} dominantBaseline="central" textAnchor="end">
                    <textPath href={`#pen-line-${i}`} startOffset="86%">{st.deliverable}</textPath>
                  </text>
                  <path d={front(i)} fill="url(#pen-wrap)" />
                  <path d={line(F0(i) + 0.4, F1(i) - 0.4, -0.55)} className="pen__sheen" />
                  <path d={line(F0(i), F1(i), -1)} className="pen__edge" style={{ stroke: RIBBON[i].edge } as CSSProperties} />
                  <g clipPath={`url(#pen-clip-${i})`}>
                    <rect className="pen__glint" x={L - 130} y={BANDS[i].top - 6} width={110} height={BANDS[i].bottom - BANDS[i].top + 12} fill="url(#pen-glint)" />
                  </g>
                  <path d={front(i)} className="pen__dim" />
                </g>
              ))}
            </svg>

            {/* the bands are the buttons (transparent, laid over each ribbon front) */}
            <div className="pen__tabs" role="tablist" aria-label={processSteps.dialLabel} onKeyDown={onKey}>
              {steps.map((st, i) => (
                <button key={st.n} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`process-tab-${i}`}
                  aria-selected={i === open} aria-controls="process-card" tabIndex={i === (open ?? active) ? 0 : -1}
                  className="pen__tab"
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(i); }}
                  onPointerDown={(e) => { pointerType.current = e.pointerType; }}
                  onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) show(i); }}
                  onClick={(e) => { show(e.detail === 0 || pointerType.current === 'mouse' ? i : open === i ? null : i); }}
                  style={{ left: px(BANDS[i].left), width: `${((BANDS[i].right - BANDS[i].left) / VB.w) * 100}%`,
                    top: py(BANDS[i].top), height: `${((BANDS[i].bottom - BANDS[i].top) / VB.h) * 100}%` }}>
                  <span className="sr-only">{st.n} {st.name}</span>
                </button>
              ))}
            </div>

            {/* the note: a medallion pinned to the open band's end, and a banner in the band's colour unrolling from it:
                a lighter inset panel with the words, an arrow tip with the step number */}
            <div className={`pen__note pen__note--${side}${open !== null ? ' is-open' : ''}`} aria-hidden={open === null}
              style={{ '--c': SPEC[shown], '--ink': INK[shown], '--x': px(side === 'right' ? band.end[0] : band.start[0]),
                '--y': py(side === 'right' ? band.end[1] : band.start[1]), '--dock': py(BANDS[N - 1].bottom) } as CSSProperties}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') window.clearTimeout(closeT.current); }}>
              <span className="pen__medal" aria-hidden="true"><Icon name={ICONS[shown]} size={24} /></span>
              <article id="process-card" role="tabpanel" aria-labelledby={`process-tab-${shown}`} className="pen__tag">
                <div className="pen__panel">
                  <h3>{card.name}</h3>
                  <p className="pen__text">{card.text}</p>
                  <p className="pen__get"><span>{processSteps.deliverableLabel}</span>{card.deliverable}</p>
                  {!isTodo(card.time) && <p className="pen__get"><span>{processSteps.timeLabel}</span>{card.time}</p>}
                </div>
                <p className="pen__step"><span>{processSteps.stepLabel}</span>{card.n}</p>
              </article>
            </div>
          </div>
          <p className="pen__hint" aria-hidden={open !== null}>{processSteps.hint}</p>
        </div>
      </div>
    </section>
  );
}
