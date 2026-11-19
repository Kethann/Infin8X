/**
 * Living spectrum shared by the 3D shader (GLSL copy below) and the 2D light heads, so a head always
 * glows in exactly the colour of the glass it is travelling through. Colours stream outward from the
 * prism point (red → orange → yellow → green → blue → violet → magenta → red …).
 */
import { SPLIT } from '../brand/pathMath';

export const PALETTE: [number, number, number][] = [
  [255, 45, 85], [255, 138, 31], [255, 214, 10], [46, 232, 138], [30, 167, 255], [106, 75, 255], [208, 59, 255],
];
export const FLOW_SPEED = 0.035;          // spectrum cycles per second along the lobe
export const HUE_SPAN = 0.86;            // how much of the palette one half-lobe shows

const fract = (x: number) => x - Math.floor(x);
export function specAt(x: number): [number, number, number] {
  const f = fract(x) * PALETTE.length, i = Math.floor(f), t0 = f - i, t = t0 * t0 * (3 - 2 * t0);
  const a = PALETTE[i % PALETTE.length], b = PALETTE[(i + 1) % PALETTE.length];
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
/** 0 at the prism point → 1 at the far right of the spectrum lobe. */
export const hueParam = (u: number) => Math.min(u, SPLIT - u) / (SPLIT * 0.5);

export function flowColor(u: number, time: number, flow = FLOW_SPEED): [number, number, number] {
  const w = fract(u);
  if (w >= SPLIT) return [235, 242, 255];
  return specAt(hueParam(w) * HUE_SPAN - time * flow);
}

export const SPECTRUM_GLSL = /* glsl */ `
vec3 palC(float i){ i = mod(i, 7.0);
  if (i < 0.5) return vec3(1.0, 0.176, 0.333);
  if (i < 1.5) return vec3(1.0, 0.541, 0.122);
  if (i < 2.5) return vec3(1.0, 0.839, 0.039);
  if (i < 3.5) return vec3(0.18, 0.91, 0.541);
  if (i < 4.5) return vec3(0.118, 0.655, 1.0);
  if (i < 5.5) return vec3(0.416, 0.294, 1.0);
  return vec3(0.816, 0.231, 1.0); }
vec3 specAt(float x){ x = fract(x) * 7.0; float i = floor(x); float f = x - i; f = f * f * (3.0 - 2.0 * f);
  return mix(palC(i), palC(i + 1.0), f); }
`;
