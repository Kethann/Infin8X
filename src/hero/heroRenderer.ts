/**
 * Infin8X hero compositor (Canvas 2D overlay).
 *
 * Formation order (one continuous light, the loop is never faded in):
 *   light falls from above into the X → travels up-left around the WHITE lobe → returns to the X
 *   (prism flash) → travels up-right around the SPECTRUM lobe → returns to the X.
 * The glass forms in parallel, right behind the travelling light.
 *
 * Two back-ends share this overlay (beam, light heads, flares, prism, spill, bloom):
 *   • 3D (default): a real Three.js loop (logo3d.ts) — the overlay projects path points through its camera.
 *   • 2D fallback (low-end / no WebGL): the original artwork materialised with stamped masks.
 * All animated values live in `state`, tweened by the GSAP timeline in HeroIntro.
 */
import { pointAt, colorAt, SPLIT, CROSS, VIEW_W, VIEW_H, type Pt } from '../brand/pathMath';
import { LOGO_GEOMETRY } from '../brand/logoGeometry';
import { flowColor } from './logoColor';

export interface HeroState {
  hair: number;        // construction hairline opacity
  ghostTrace: number;  // 0..1 pen tracing the loop (same order as the light)
  ghostAlpha: number;  // dim glass outline brightness
  beamIn: number;      // 0..1 beam head: top of screen → X
  beamOut: number;     // 0..1 beam tail retracting into the X
  beamAlpha: number;
  impact: number;      // 0..1 absorption at the X (flash + ripple through the glass)
  charge: number;      // 0..1 energy gathered at the X before it travels
  leftForm: number;    // 0..1 light + glass: X → up-left → around the white lobe → X
  prism: number;       // 0..1 prism point intensity
  chroma: number;      // RGB separation (px)
  rightForm: number;   // 0..1 light + glass: X → up-right → around the spectrum lobe → X
  spill: number;       // coloured light spilling into space
  ambient: number;     // settled ambient tints
  finish: number;      // 0..1 one specular glint around the whole loop
  lit: number;         // final glow level
  shake: number;       // camera shake amplitude (px)
  flash: number;       // full-frame micro flash
  idle: number;        // 0..1 idle state (orbit glint, breathing, rotation unlocked)
  morph: number;       // 0..1 the ∞ rotates upright into the 8 of the wordmark
  pen: number;         // 0..1 one light draws the whole loop: X → up-left → white lobe → X → spectrum lobe → X
  trail: number;       // 0..1 visibility of the long-exposure light stroke
  scrub: number;       // <0 off, else 0..1 light replays the loop on scroll
  detach: number;      // 0..1 vertical beam leaving the X downward
}

export const initialState = (): HeroState => ({
  hair: 0, ghostTrace: 0, ghostAlpha: 0, beamIn: 0, beamOut: 0, beamAlpha: 0, impact: 0, charge: 0,
  leftForm: 0, prism: 0, chroma: 0, rightForm: 0, spill: 0, ambient: 0, finish: 0, lit: 0,
  shake: 0, flash: 0, idle: 0, morph: 0, pen: 0, trail: 0, scrub: -1, detach: 0,
});

export const finalState = (): HeroState => ({
  ...initialState(), ghostTrace: 1, ghostAlpha: 0.12, leftForm: 1, rightForm: 1, prism: 0.22,
  ambient: 1, finish: 1, lit: 1, idle: 1, morph: 1, pen: 1, impact: 1, beamIn: 1, beamOut: 1,
});

/** What the 3D back-end exposes to the overlay. */
export interface Bridge3D {
  canvas: HTMLCanvasElement;
  layout(w: number, h: number, k: number, ox: number, oy: number): void;
  update(s: HeroState, t: number, dt: number, shakeX: number, shakeY: number): void;
  project(u: number, out: Pt): Pt;                 // path point → CSS px
  projectArt(ax: number, ay: number, out: Pt): Pt; // artwork point on z=0 → CSS px
  frontness(): number;                             // 1 = facing the viewer
  pointer(x: number, y: number, inside: boolean): void;
  busy(): boolean;                                 // needs frames (drag / inertia)
  settle(): void;
  dispose(): void;
  /** CSS rect of the 8 slot in the wordmark; the loop morphs into it as state.morph → 1 */
  eightSlot: { cx: number; cy: number; h: number } | null;
  warmup?(): Promise<void>;
}

/** u at which the light is, for a given form progress. Order: X → white lobe → X → spectrum lobe → X. */
export const uLeft = (f: number) => SPLIT + f * (1 - SPLIT);
export const uRight = (f: number) => f * SPLIT;
export const uLoop = (f: number) => (SPLIT + f) % 1;

const L_ART = LOGO_GEOMETRY.length;
const BRUSH_R = 112;
const PAD = 190;

type C2D = CanvasRenderingContext2D;
const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
};
const ctxOf = (c: HTMLCanvasElement) => c.getContext('2d')!;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

function supportsCtxFilter() {
  try { const c = ctxOf(mk(2, 2)); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; }
}

interface Mote { x: number; y: number; s: number; p: number; v: number }

export class HeroRenderer {
  state: HeroState = initialState();
  private ctx: C2D;
  private dpr = 1;
  private w = 0; private h = 0;
  private k = 1; private ox = 0; private oy = 0;
  private ptr = { x: -9999, y: -9999, a: 0, ta: 0 };
  private filterOK = supportsCtxFilter();
  private motes: Mote[] = [];
  private time = 0;
  quality: 'high' | 'low';
  /** software / weak GPU: render at 1× and let the caller halve the frame rate */
  lowEnd = false;
  // 2D fallback layers
  private logoC!: HTMLCanvasElement; private whiteC!: HTMLCanvasElement; private rimC!: HTMLCanvasElement;
  private chan: HTMLCanvasElement[] = [];
  private mask!: HTMLCanvasElement; private heat!: HTMLCanvasElement; private ghost!: HTMLCanvasElement; private ghostC!: HTMLCanvasElement;
  private formed!: HTMLCanvasElement; private tmp!: HTMLCanvasElement; private brush!: HTMLCanvasElement;
  private lw = 0; private lh = 0; private ls = 1;
  private stamped = { a: SPLIT, c: 0, g: 0 };
  private maskDirty = true; private heatLive = 0; private bloomDirty = true; private ghostDirty = true; private suppressHeat = false;
  // shared
  private bloom!: HTMLCanvasElement; private bloom2!: HTMLCanvasElement;
  private p0: Pt = { x: 0, y: 0 }; private p1: Pt = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private art: { logo: CanvasImageSource; rim: CanvasImageSource } | null,
    quality: 'high' | 'low',
    private bridge: Bridge3D | null = null,
    lowEnd = false,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.quality = quality;
    this.lowEnd = lowEnd;
    for (let i = 0; i < 70; i++) this.motes.push({ x: Math.random(), y: (Math.random() - 0.5) * 2, s: 0.4 + Math.random() * 1.4, p: Math.random() * 6.28, v: 0.2 + Math.random() * 0.8 });
    this.resize();
  }

  get is3D() { return !!this.bridge; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.lowEnd ? 1 : 1.25);
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    const mobile = this.w < 768;
    const logoW = mobile ? this.w * 0.92 : Math.min(this.w * 0.8, 1280, this.h * 0.6 * (VIEW_W / VIEW_H));
    this.k = logoW / VIEW_W;
    this.ox = (this.w - logoW) / 2;
    this.oy = this.h * (mobile ? 0.4 : 0.43) - (VIEW_H * this.k) / 2;
    this.canvas.parentElement?.style.setProperty('--logo-bottom', `${this.oy + VIEW_H * this.k}px`);
    this.canvas.parentElement?.style.setProperty('--logo-top', `${this.oy}px`);

    if (this.bridge) {
      this.bridge.layout(this.w, this.h, this.k, this.ox, this.oy);
      // full-frame bloom (the 3D loop may rotate anywhere in the frame)
      const s1 = this.filterOK ? 0.25 : 0.125;
      this.bloom = mk(this.w * s1, this.h * s1); this.bloom2 = mk(this.w * s1 * 0.5, this.h * s1 * 0.5);
      return;
    }
    // ----- 2D fallback layers -----
    this.ls = this.k * this.dpr;
    this.lw = Math.ceil((VIEW_W + 2 * PAD) * this.ls); this.lh = Math.ceil((VIEW_H + 2 * PAD) * this.ls);
    const W = this.lw, H = this.lh, p = PAD * this.ls, aw = VIEW_W * this.ls, ah = VIEW_H * this.ls;
    this.logoC = mk(W, H); ctxOf(this.logoC).drawImage(this.art!.logo, p, p, aw, ah);
    this.whiteC = mk(W, H);
    { const c = ctxOf(this.whiteC); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'destination-in'; c.drawImage(this.logoC, 0, 0); }
    this.rimC = mk(W, H); ctxOf(this.rimC).drawImage(this.art!.rim, p, p, aw, ah);
    this.chan = ['#ff0000', '#00ff00', '#0000ff'].map((col) => {
      const c = mk(W, H); const x = ctxOf(c);
      x.drawImage(this.logoC, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(this.logoC, 0, 0);
      return c;
    });
    this.mask = mk(W, H); this.heat = mk(W, H); this.ghost = mk(W, H); this.ghostC = mk(W, H); this.formed = mk(W, H); this.tmp = mk(W, H);
    const bs = Math.min(1, Math.max(this.filterOK ? 0.25 : 0.125, 360 / W));
    const bs2 = Math.min(1, Math.max(bs * 0.5, 240 / W));
    this.bloom = mk(W * bs, H * bs); this.bloom2 = mk(W * bs2, H * bs2);
    const br = Math.max(4, Math.round(BRUSH_R * this.ls));
    this.brush = mk(br * 2, br * 2);
    { const c = ctxOf(this.brush); const g = c.createRadialGradient(br, br, 0, br, br, br);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, br * 2, br * 2); }
    this.stamped = { a: SPLIT, c: 0, g: 0 };
    this.suppressHeat = true; this.stampAll(); this.suppressHeat = false;
    this.maskDirty = true; this.bloomDirty = true; this.ghostDirty = true;
  }

  /** Jump to the formed state without a heat flash (Skip intro / reduced motion). */
  settle() {
    if (this.bridge) { this.bridge.settle(); return; }
    this.suppressHeat = true; this.stampAll(); this.suppressHeat = false;
    ctxOf(this.heat).clearRect(0, 0, this.lw, this.lh); this.heatLive = 0;
  }

  setPointer(clientX: number, clientY: number, inside: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.ptr.x = clientX - r.left; this.ptr.y = clientY - r.top; this.ptr.ta = inside ? 1 : 0;
    this.bridge?.pointer(this.ptr.x, this.ptr.y, inside);
  }

  /** Overlay wants frames: always while animating; in reduced motion only while the 3D loop is dragged. */
  busy() { return this.bridge?.busy() ?? false; }

  dispose() { this.bridge?.dispose(); }

  // ---------- coordinates ----------
  private lx(a: number) { return (a + PAD) * this.ls; }
  private cx(a: number) { return this.ox + a * this.k; }
  private cy(a: number) { return this.oy + a * this.k; }
  /** Path point u → CSS px (through the 3D camera when available). */
  private scr(u: number, out: Pt): Pt {
    if (this.bridge) return this.bridge.project(u, out);
    pointAt(u, out); out.x = this.cx(out.x); out.y = this.cy(out.y); return out;
  }
  private crossScr(out: Pt): Pt {
    if (this.bridge) return this.bridge.projectArt(CROSS.x, CROSS.y, out);
    out.x = this.cx(CROSS.x); out.y = this.cy(CROSS.y); return out;
  }
  private colAt(u: number): [number, number, number] {
    return this.bridge ? flowColor(u, this.time) : colorAt(u);
  }

  // ---------- 2D fallback stamping ----------
  private stampRange(target: HTMLCanvasElement[], u0: number, u1: number) {
    if (u1 - u0 < 1e-6) return;
    const step = (BRUSH_R * 0.16) / L_ART, n = Math.ceil((u1 - u0) / step);
    const pt: Pt = { x: 0, y: 0 }, bh = this.brush.width / 2, ctxs = target.map(ctxOf);
    for (let i = 1; i <= n; i++) {
      pointAt(u0 + ((u1 - u0) * i) / n, pt);
      const x = this.lx(pt.x) - bh, y = this.lx(pt.y) - bh;
      for (const c of ctxs) c.drawImage(this.brush, x, y);
    }
  }
  private stampAll() {
    const s = this.state, st = this.stamped, heatT = this.suppressHeat ? [] : [this.heat];
    const tA = uLeft(s.leftForm), tC = uRight(s.rightForm);
    let any = false;
    if (s.leftForm > 0 && tA > st.a) { this.stampRange([this.mask, ...heatT], st.a, tA); st.a = tA; any = true; }
    if (s.rightForm > 0 && tC > st.c) { this.stampRange([this.mask, ...heatT], st.c, tC); st.c = tC; any = true; }
    if (s.ghostTrace > st.g) { this.stampRange([this.ghost], SPLIT + st.g, SPLIT + s.ghostTrace); st.g = s.ghostTrace; this.ghostDirty = true; }
    if (any) { this.maskDirty = true; if (!this.suppressHeat) this.heatLive = 1; }
  }

  // ---------- frame ----------
  render(t: number, dt: number) {
    const s = this.state, c = this.ctx, d = this.dpr;
    this.time = t % 1000;
    const sh = s.shake;
    const sx = sh ? (Math.sin(t * 91.7) + Math.sin(t * 57.3)) * 0.5 * sh : 0;
    const sy = sh ? (Math.sin(t * 77.1) + Math.cos(t * 63.9)) * 0.5 * sh : 0;
    const ease = 1 - Math.exp(-dt * 4);
    this.ptr.a += (this.ptr.ta * s.idle - this.ptr.a) * ease;

    if (this.bridge) this.bridge.update(s, this.time, dt, sx, sy);
    else this.prepare2D(dt);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(d, 0, 0, d, 0, 0);
    c.save(); c.translate(sx, sy); // camera shake only — the logo's position is locked (no parallax)

    if (this.bridge) this.draw3DBloom(t);
    else this.draw2DLogo(t);

    if (s.hair > 0.001) this.drawHairline(s.ghostTrace, s.hair);
    if (s.impact > 0 && s.impact < 1) { this.drawImpactSpot(s.impact); this.drawBurst(s.impact, t); }

    // light heads (fade when the user has rotated the loop away from the front)
    const front = this.bridge ? smooth(0.6, 0.95, this.bridge.frontness()) : 1;
    c.globalAlpha = 1;
    // one continuous light-painting stroke (long exposure), then the pen itself
    if (s.trail > 0.01 && s.pen > 0) this.drawLightTrail(s.pen, s.trail);
    if (s.pen > 0 && s.pen < 1) {
      const u = uLoop(s.pen), p = this.scr(u, this.p0);
      const [r, g, b] = s.pen > 1 - SPLIT ? this.colAt(u) : [235, 242, 255];
      this.drawGlow(p.x, p.y, 0.95, [r, g, b], 0.55);
      this.drawGlow(p.x, p.y, 0.6, [255, 255, 255], 0.16);
    }
    if (s.finish > 0 && s.finish < 1) this.drawHead(uLoop(s.finish), -1, Math.sin(Math.PI * s.finish) * 0.7 * front, 0.1, 0.75, true, 0.75);
    if (s.idle > 0.01 && s.scrub < 0 && front > 0.01) { const u = uLoop(t / 30), p = this.scr(u, this.p0); this.drawGlow(p.x, p.y, 0.32 * s.idle * front * (1 - 0.5 * s.morph), this.colAt(u), 1 - 0.75 * s.morph); }
    if (s.scrub >= 0) { const sc = clamp01(s.scrub); this.drawHead(uLoop(sc), -1, smooth(0, 0.03, sc), 0.16, 1.1, true); }

    if (s.prism > 0.01) { const p = this.crossScr(this.p1); this.drawGlow(p.x, p.y, 0.55 * s.prism * (1 - 0.8 * s.morph), [235, 240, 255], 0.9); }
    c.restore();

    if (s.beamAlpha > 0.001 && s.beamIn > 0) this.drawBeam(t);
    if (s.detach > 0) this.drawDetach(s.detach);
    if (s.flash > 0.001) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = s.flash; c.fillStyle = '#fff'; c.fillRect(0, 0, this.w, this.h);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // ---------- 3D path: bloom from the WebGL canvas ----------
  private draw3DBloom(t: number) {
    const s = this.state, c = this.ctx, src = this.bridge!.canvas;
    const b = ctxOf(this.bloom), bw = this.bloom.width, bh = this.bloom.height, sc = bw / this.w;
    b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, bw, bh);
    // threshold first (only the glowing glass blooms, not the dark metal tunnel), then blur
    if (this.filterOK) b.filter = `brightness(1.6) contrast(3.2) brightness(0.55) blur(${Math.max(0.5, 14 * this.k * sc)}px)`;
    b.drawImage(src, 0, 0, bw, bh); b.filter = 'none';
    const b2 = ctxOf(this.bloom2), w2 = this.bloom2.width, h2 = this.bloom2.height;
    b2.clearRect(0, 0, w2, h2);
    if (this.filterOK) b2.filter = `blur(${Math.max(0.5, 40 * this.k * (w2 / this.w))}px)`;
    b2.drawImage(this.bloom, 0, 0, w2, h2); b2.filter = 'none';
    const breathe = s.idle * 0.05 * Math.sin((t * Math.PI * 2) / 5.5);
    const A = 0.12 + 0.04 * s.lit + breathe * 0.4;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp01(A * 0.6); c.drawImage(this.bloom, 0, 0, this.w, this.h);
    c.globalAlpha = clamp01(A * 0.55); c.drawImage(this.bloom2, 0, 0, this.w, this.h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // ---------- 2D fallback path ----------
  private prepare2D(dt: number) {
    this.stampAll();
    if (this.heatLive > 0.002) {
      const hc = ctxOf(this.heat); hc.globalCompositeOperation = 'destination-out';
      hc.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt / 0.45)})`; hc.fillRect(0, 0, this.lw, this.lh);
      hc.globalCompositeOperation = 'source-over';
      this.heatLive *= Math.exp(-dt / 0.45); this.bloomDirty = true;
    }
    if (this.maskDirty) {
      const f = ctxOf(this.formed); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, this.lw, this.lh);
      f.drawImage(this.mask, 0, 0); f.globalCompositeOperation = 'source-in'; f.drawImage(this.logoC, 0, 0);
      f.globalCompositeOperation = 'source-over'; this.maskDirty = false; this.bloomDirty = true;
    }
  }

  private draw2DLogo(t: number) {
    const s = this.state, c = this.ctx, d = this.dpr;
    const lox = this.ox - PAD * this.k, loy = this.oy - PAD * this.k, lW = this.lw / d, lH = this.lh / d;
    const blit = (img: CanvasImageSource, alpha = 1, op: GlobalCompositeOperation = 'source-over', dx = 0, dy = 0) => {
      c.globalAlpha = alpha; c.globalCompositeOperation = op; c.drawImage(img, lox + dx, loy + dy, lW, lH);
    };
    if (s.ghostAlpha > 0.001) {
      if (this.ghostDirty) {
        const g = ctxOf(this.ghostC); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
        g.drawImage(this.ghost, 0, 0); g.globalCompositeOperation = 'source-in'; g.drawImage(this.rimC, 0, 0);
        g.globalCompositeOperation = 'source-over'; this.ghostDirty = false;
      }
      blit(this.ghostC, s.ghostAlpha * (1 - 0.5 * s.lit));
    }
    if (s.impact > 0 && s.impact < 1) {
      const g = ctxOf(this.tmp), ix = this.lx(CROSS.x), iy = this.lx(CROSS.y), v = s.impact;
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
      const gr = g.createRadialGradient(ix, iy, 0, ix, iy, (80 + v * 1100) * this.ls);
      gr.addColorStop(0, `rgba(255,255,255,${(1 - v) ** 1.2})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, this.lw, this.lh);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.rimC, 0, 0);
      blit(this.tmp, 1, 'lighter');
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
      for (const [spd, wd] of [[1, 26], [0.62, 14]] as const) {
        const rr = (20 + v * 900 * spd) * this.ls;
        g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - v)})`; g.lineWidth = wd * this.ls * (1 - v * 0.6);
        g.beginPath(); g.ellipse(ix, iy, rr, rr * 0.55, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.whiteC, 0, 0);
      blit(this.tmp, 0.55, 'lighter');
    }
    if (s.chroma > 0.05) {
      const g = ctxOf(this.tmp), off = [[-1, -0.35], [0, 0], [1, 0.35]];
      this.chan.forEach((ch, i) => {
        g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
        g.drawImage(this.mask, 0, 0); g.globalCompositeOperation = 'source-in'; g.drawImage(ch, 0, 0);
        blit(this.tmp, 1, i === 0 ? 'source-over' : 'lighter', off[i][0] * s.chroma, off[i][1] * s.chroma);
      });
    } else blit(this.formed, 1);
    if (this.heatLive > 0.002) {
      const g = ctxOf(this.tmp); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
      g.drawImage(this.heat, 0, 0); g.globalCompositeOperation = 'source-in'; g.drawImage(this.logoC, 0, 0);
      blit(this.tmp, 0.9, 'lighter');
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
      g.drawImage(this.heat, 0, 0); g.globalCompositeOperation = 'source-in'; g.drawImage(this.whiteC, 0, 0);
      blit(this.tmp, 0.4, 'lighter');
    }
    if (this.bloomDirty) {
      const b = ctxOf(this.bloom), bw = this.bloom.width, bh = this.bloom.height;
      b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, bw, bh);
      if (this.filterOK) b.filter = `blur(${Math.max(0.5, 14 * this.ls * (bw / this.lw))}px)`;
      b.drawImage(this.formed, 0, 0, bw, bh);
      if (this.heatLive > 0.002) { b.globalCompositeOperation = 'lighter'; b.drawImage(this.heat, 0, 0, bw, bh); }
      b.filter = 'none'; b.globalCompositeOperation = 'source-over';
      const b2 = ctxOf(this.bloom2), w2 = this.bloom2.width, h2 = this.bloom2.height;
      b2.clearRect(0, 0, w2, h2);
      if (this.filterOK) b2.filter = `blur(${Math.max(0.5, 40 * this.ls * (w2 / this.lw))}px)`;
      b2.drawImage(this.bloom, 0, 0, w2, h2); b2.filter = 'none';
      this.bloomDirty = false;
    }
    const A = 0.14 + 0.1 * s.lit + 0.55 * this.heatLive + s.idle * 0.05 * Math.sin((t * Math.PI * 2) / 5.5);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp01(A * 0.55); c.drawImage(this.bloom, lox, loy, lW, lH);
    c.globalAlpha = clamp01(A * 0.5); c.drawImage(this.bloom2, lox, loy, lW, lH);
    if (this.ptr.a > 0.01) {
      const g = ctxOf(this.tmp); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.lw, this.lh);
      const mx = (this.ptr.x - lox) * d, my = (this.ptr.y - loy) * d, rr = 260 * this.ls;
      const gr = g.createRadialGradient(mx, my, 0, mx, my, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, this.lw, this.lh);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.formed, 0, 0);
      blit(this.tmp, 0.45 * this.ptr.a, 'lighter');
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }


  /** Blueprint pen: starts at the X, goes up-left and follows the loop's flow. */
  private drawHairline(trace: number, alpha: number) {
    const c = this.ctx, steps = Math.max(2, Math.floor(trace * 360)), pt = this.p0;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha; c.strokeStyle = 'rgba(200,215,255,0.55)';
    c.lineWidth = 1; c.beginPath();
    for (let i = 0; i <= steps; i++) { this.scr(SPLIT + (trace * i) / steps, pt); i ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y); }
    c.stroke();
    if (trace > 0 && trace < 1) {
      this.scr(SPLIT + trace, pt);
      const g = c.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 14);
      g.addColorStop(0, 'rgba(230,238,255,0.9)'); g.addColorStop(1, 'rgba(230,238,255,0)');
      c.fillStyle = g; c.fillRect(pt.x - 14, pt.y - 14, 28, 28);
    }
    c.globalAlpha = 1;
  }

  private drawImpactSpot(v: number) {
    const c = this.ctx, p = this.crossScr(this.p0), hr = 160 * this.k + 30;
    const hg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
    hg.addColorStop(0, `rgba(255,255,255,${0.75 * (1 - v) ** 2.5})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1; c.fillStyle = hg; c.fillRect(p.x - hr, p.y - hr, hr * 2, hr * 2);
  }

  /** Starburst at impact: fine radial light streaks shooting out of the X (blue-white, wide horizontal spray). */
  private burstRays: { a: number; l: number; w: number; s: number; c: string }[] = [];
  private drawBurst(v: number, _t: number) {
    if (!this.burstRays.length) for (let i = 0; i < 150; i++) {
      const horiz = Math.random() < 0.7, a = horiz ? (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2;
      this.burstRays.push({ a, l: 0.25 + Math.random() ** 1.5, w: 0.5 + Math.random() * 1.6, s: 0.6 + Math.random() * 0.4, c: Math.random() < 0.7 ? '120,190,255' : '220,240,255' });
    }
    const c = this.ctx, p = this.crossScr(this.p0), R = Math.max(this.w, this.h) * 0.7, e = 1 - (1 - v) ** 3;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (const r of this.burstRays) {
      const r1 = R * r.l * e * r.s, r0 = r1 * (0.35 + 0.4 * v), al = (1 - v) ** 1.4 * 0.75;
      if (al < 0.01) continue;
      const x0 = p.x + Math.cos(r.a) * r0, y0 = p.y + Math.sin(r.a) * r0 * 0.6, x1 = p.x + Math.cos(r.a) * r1, y1 = p.y + Math.sin(r.a) * r1 * 0.6;
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(${r.c},0)`); g.addColorStop(1, `rgba(${r.c},${al})`);
      c.strokeStyle = g; c.lineWidth = r.w; c.globalAlpha = 1;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    // blue core bloom of the burst
    const hr = (120 + 380 * e) * (0.3 + this.k);
    const hg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
    hg.addColorStop(0, `rgba(170,215,255,${0.5 * (1 - v)})`); hg.addColorStop(0.4, `rgba(40,120,255,${0.18 * (1 - v)})`); hg.addColorStop(1, 'rgba(20,60,255,0)');
    c.fillStyle = hg; c.fillRect(p.x - hr, p.y - hr, hr * 2, hr * 2);
  }

  /** Light head with tapering trail. dir=-1: the trail lies at smaller u (head moving forward). */
  private drawHead(u: number, dir: number, intensity: number, trail: number, size: number, spectral: boolean, white = 0) {
    if (intensity <= 0.005) return;
    const c = this.ctx, segs = this.quality === 'high' ? 40 : 22, base = Math.max(1.4, 10 * this.k) * size;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    if (trail > 0) {
      const prev = this.scr(u, { x: 0, y: 0 }), pt = this.p1;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs, uu = u + dir * trail * f;
        this.scr(uu, pt);
        const [r, g, b] = spectral ? this.colAt(uu) : [235, 242, 255];
        c.globalAlpha = intensity * (1 - f) ** 1.6 * 0.9;
        c.strokeStyle = `rgb(${mix(r, 255, white)},${mix(g, 255, white)},${mix(b, 255, white)})`;
        c.lineWidth = base * (1.6 - f * 1.2);
        c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(pt.x, pt.y); c.stroke();
        prev.x = pt.x; prev.y = pt.y;
      }
    }
    const p = this.scr(u, this.p0);
    const [r, g, b] = spectral ? this.colAt(u) : [235, 242, 255];
    this.drawFlare(p.x, p.y, intensity, [mix(r, 255, white), mix(g, 255, white), mix(b, 255, white)], size);
  }

  /**
   * Long-exposure stroke: everything the pen has drawn so far stays lit — a wide soft halo plus a fine bright core.
   * White on the first lobe; after the pen passes through the X the light has been refracted, so it turns spectral.
   */
  private drawLightTrail(pen: number, alpha: number) {
    const c = this.ctx, steps = Math.max(8, Math.floor(pen * (this.quality === 'high' ? 420 : 240)));
    const a = this.p0, b = this.p1, split = 1 - SPLIT;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [width, al] of [[Math.max(6, 26 * this.k), 0.07], [Math.max(2.5, 8 * this.k), 0.22], [Math.max(1, 2.2 * this.k), 0.95]] as const) {
      c.lineWidth = width;
      this.scr(uLoop(0), a);
      for (let i = 1; i <= steps; i++) {
        const f = (pen * i) / steps, u = uLoop(f);
        this.scr(u, b);
        const age = pen - f;                                   // the oldest light dims as the glass takes over
        const fade = alpha * (0.35 + 0.65 * Math.exp(-age * 3.2));
        const [r, g, bl] = f > split ? this.colAt(u) : [236, 243, 255];
        c.strokeStyle = `rgba(${r},${g},${bl},${al * fade})`;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        a.x = b.x; a.y = b.y;
      }
    }
    c.globalAlpha = 1;
  }

  /** Soft travelling glow (no streak, no trail): light moving inside the glass. */
  private drawGlow(x: number, y: number, a: number, [r, g, b]: [number, number, number], size: number) {
    if (a < 0.005) return;
    const c = this.ctx, R = (60 + 160 * this.k) * size;
    const gr = c.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(${mix(r, 255, 0.5)},${mix(g, 255, 0.5)},${mix(b, 255, 0.5)},${a})`);
    gr.addColorStop(0.25, `rgba(${r},${g},${b},${a * 0.35})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1; c.fillStyle = gr; c.fillRect(x - R, y - R, R * 2, R * 2);
  }

  private drawFlare(x: number, y: number, intensity: number, [r, g, b]: [number, number, number], size: number) {
    const c = this.ctx, R = (34 + 90 * this.k) * size;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1;
    const gr = c.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(255,255,255,${intensity})`);
    gr.addColorStop(0.06, `rgba(${r},${g},${b},${0.8 * intensity})`);
    gr.addColorStop(0.22, `rgba(${r},${g},${b},${0.16 * intensity})`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = gr; c.fillRect(x - R, y - R, R * 2, R * 2);
    const sw = R * 1.5, shh = Math.max(0.8, R * 0.022);
    const sg = c.createLinearGradient(x - sw, 0, x + sw, 0);
    sg.addColorStop(0, 'rgba(120,160,255,0)'); sg.addColorStop(0.5, `rgba(${mix(r, 170, 0.5)},${mix(g, 200, 0.5)},255,${0.28 * intensity})`); sg.addColorStop(1, 'rgba(120,160,255,0)');
    c.fillStyle = sg; c.fillRect(x - sw, y - shh, sw * 2, shh * 2);
  }


  /** Thin white beam falling from the top edge into the X (volumetric bands, dust motes, tip flare). */
  private drawBeam(t: number) {
    const s = this.state, c = this.ctx, end = this.crossScr(this.p1);
    const sx = end.x, sy = -40, L = end.y - sy;
    const head = L * s.beamIn, tail = L * s.beamOut;
    if (head - tail < 0.5) return;
    const A = s.beamAlpha;
    c.save(); c.translate(sx, sy); c.rotate(Math.PI / 2); // local +x points down the screen
    c.globalCompositeOperation = 'lighter';
    const band = (hh: number, a: number) => {
      const g = c.createLinearGradient(0, -hh, 0, hh);
      g.addColorStop(0, 'rgba(200,215,255,0)'); g.addColorStop(0.5, `rgba(225,235,255,${a})`); g.addColorStop(1, 'rgba(200,215,255,0)');
      c.globalAlpha = A; c.fillStyle = g; c.fillRect(tail, -hh, head - tail, hh * 2);
    };
    band(70, 0.05); band(16, 0.2); band(4, 0.5);
    c.globalAlpha = A; c.fillStyle = '#fff'; c.fillRect(tail, -1, head - tail, 2);
    for (const m of this.motes) {
      const mx = ((m.x + t * 0.012 * m.v) % 1) * L;
      if (mx < tail || mx > head) continue;
      const my = m.y * 34 + Math.sin(t * m.v + m.p) * 3;
      c.globalAlpha = A * (0.25 + 0.75 * Math.abs(Math.sin(t * 2 * m.v + m.p))) * Math.exp(-(m.y * m.y) * 2.2) * 0.8;
      c.fillStyle = '#e8eeff'; c.beginPath(); c.arc(mx, my, m.s * 0.6, 0, 6.283); c.fill();
    }
    c.restore();
    if (s.beamIn < 1) this.drawFlare(sx, sy + head, 0.9 * A, [225, 235, 255], 0.55);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.05 * A; c.fillStyle = '#9fb6ff'; c.fillRect(sx - 0.5, 0, 1, this.h);
    c.globalAlpha = 1;
  }

  private drawDetach(v: number) {
    const c = this.ctx, p = this.crossScr(this.p0), x = p.x, y0 = p.y, y1 = y0 + (this.h - y0 + 4) * v;
    c.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[22, 0.08], [6, 0.3], [2, 0.95]] as const) {
      const g = c.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, 'rgba(220,230,255,0)'); g.addColorStop(0.5, `rgba(240,245,255,${a})`); g.addColorStop(1, 'rgba(220,230,255,0)');
      c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x - w, y0, w * 2, y1 - y0);
    }
    this.drawFlare(x, y1, 0.8 * (1 - smooth(0.9, 1, v)), [235, 242, 255], 0.5);
  }
}
