import { LOGO_GEOMETRY as G } from './logoGeometry';

/**
 * Arc-length parametrised access to the logo centreline.
 * u ∈ [0,1): 0 = the crossing (prism point), heading up-right into the RIGHT (spectrum) lobe.
 * u = SPLIT is the crossing again; [SPLIT,1) is the LEFT (white) lobe, travelled top-arc first.
 */
export const VIEW_W = G.viewBox[0];
export const VIEW_H = G.viewBox[1];
export const N = G.samples.length;
export const SPLIT: number = G.split;
export const CROSS = { x: G.cross[0], y: G.cross[1] };

const xs = new Float32Array(N);
const ys = new Float32Array(N);
const rgb = new Float32Array(N * 3);
G.samples.forEach((p, i) => { xs[i] = p[0]; ys[i] = p[1]; });
G.colors.forEach((h, i) => {
  // boost saturation: the artwork's sheen washes hues towards white; light should read as pure spectrum
  const c = [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16));
  const m = (c[0] + c[1] + c[2]) / 3;
  const v = c.map((x) => Math.max(0, Math.min(255, m + (x - m) * 1.9)));
  const mx = Math.max(...v, 1);
  for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.round((v[k] * 255) / mx);
});

const wrap = (u: number) => ((u % 1) + 1) % 1;

/** Index of extreme points, used as storyboard anchors. */
function extreme(from: number, to: number, cmp: (a: number, b: number) => boolean) {
  let best = Math.floor(from * N);
  for (let i = Math.floor(from * N); i < Math.floor(to * N); i++) if (cmp(xs[i], xs[best])) best = i;
  return best / N;
}
/** Leftmost point of the white lobe: where the incoming beam is absorbed. */
export const U_LEFT = extreme(SPLIT, 1, (a, b) => a < b);
/** Rightmost point of the spectrum lobe: where the two dispersed streams meet (violet). */
export const U_RIGHT = extreme(0, SPLIT, (a, b) => a > b);

export interface Pt { x: number; y: number }

export function pointAt(u: number, out: Pt = { x: 0, y: 0 }): Pt {
  const f = wrap(u) * N;
  const i = Math.floor(f) % N;
  const j = (i + 1) % N;
  const t = f - Math.floor(f);
  out.x = xs[i] + (xs[j] - xs[i]) * t;
  out.y = ys[i] + (ys[j] - ys[i]) * t;
  return out;
}

/** Light colour of the artwork at u (brightness-normalised hue), as [r,g,b] 0-255. */
export function colorAt(u: number): [number, number, number] {
  const i = Math.floor(wrap(u) * N) % N;
  return [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
}

export function isLeftLobe(u: number) { return wrap(u) >= SPLIT; }

/** Leftmost x of the tube's outer rim at the beam's impact row (artwork px). */
export const IMPACT = { x: 4, y: pointAt(U_LEFT).y };
