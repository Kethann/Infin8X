/**
 * Hero backdrop — the warp fan (intro: incoming fibres are absorbed as their light forms the white
 * ribbon followed by the spectrum ribbon, then disappear into a quiet background). Bundles of long-exposure light fibres sweep in from both screen edges and
 * curve into a fixed core: broad and soft at the screen edges, narrowing as they
 * converge. Surface energy then travels along the growing ribbon. Cool white-blue light arrives on the white-lobe
 * side, hot spectrum (red/magenta/amber) on the coloured side. Energy streaks race inwards and speed up as
 * they converge (log-space flow), always travelling inward. Above: nebula and stars. Below: a glossy floor that
 * carries the logo's live mirrored reflection (rendered by artworkBackdrop.ts into `reflection`).
 * Graded like a film: filmic shoulder, S-curve, anamorphic flare, grain, vignette.
 */
import * as THREE from 'three';
import palette from '../brand/flowPalette.json';

// The logo's own vivid ribbon stops (dark shades dropped), cyclic, normalised to full brightness in the shader.
const vivid = palette.filter(({ name }) => !['crimson', 'maroon', 'burgundy'].includes(name));
const vividStops = vivid.map(({ rgb }) => `vec3(${rgb.map(v => Math.pow(v, 2.2).toFixed(5)).join(',')})`);
const LOGO_PALETTE = `vec3 logoPalette(float p){
  float s = fract(p) * ${vivid.length}.0;
  ${vividStops.map((c, i) => `if (s < ${i + 1}.0) return mix(${c}, ${vividStops[(i + 1) % vividStops.length]}, smoothstep(0.0, 1.0, s - ${i}.0));`).join('\n  ')}
  return ${vividStops[0]};
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uFlow, uAspect, uLevel, uHorizon, uRush, uFlash, uCalm, uTrace;
uniform float uWaterSpread, uWaterMotion;
uniform vec2 uLogo, uLogoSize, uAbsorb, uFormation;
uniform sampler2D uReflection;

float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
${LOGO_PALETTE}
vec3 vivid(vec3 c){ return c / max(max(c.r, c.g), max(c.b, 0.001)); }

// A slow, occasional breath of light. Each window has a different onset and strength,
// with darkness at both boundaries so changing the seed never causes a flash.
// The renderer starts at t=40; reduced motion holds there, outside every pulse.
float ambientPulse(float t){
  float elapsed=max(t-40.0,0.0);
  float windowId=floor(elapsed/24.0);
  float localTime=mod(elapsed,24.0);
  float centre=8.0+8.0*h11(windowId+31.7);
  float halfWidth=2.0+h11(windowId+83.2);
  float envelope=1.0-smoothstep(0.0,halfWidth,abs(localTime-centre));
  return envelope*mix(0.65,1.0,h11(windowId+117.3));
}

// One layer of the converging fan. L: 0 = near (thick, soft), 1 = far (fine, dense, more curved).
vec3 fan(vec2 q, float L, float t){
  float s = abs(q.x), side = step(0.0, q.x);                     // side 1 = spectrum (right) lobe
  float W = max(uAspect * 0.5 + mix(uAbsorb.x,-uAbsorb.x,side),0.01);
  float k = s / W;                                                // 0 at the absorbing edge, 1 at the screen edge
  float g = pow(k, mix(1.9, 2.7, L)) + 0.0015;                    // sweeping: flat at the crossing, steep at the edges
  float H = mix(0.8, 1.15, step(0.0, q.y)) * mix(1.0, 0.85, L);  // wider sweep upwards than down
  // Fibre coordinate: every fibre is a curve of constant a through the crossing.
  float a = q.y / (g * H);
  // Keep fibre identities fixed: moving the cell grid changes its random seeds and
  // can replace an already absorbed strand with a fresh, still-visible one.
  a *= 1.0 + 0.08 * sin(L * 4.0 + side);
  a += (n1(L * 11.0 + side * 5.0) - 0.5) * 0.3;
  float F = mix(10.0, 24.0, L);
  float af = a * F, cell = floor(af), f = fract(af);
  float sd = cell + L * 91.0 + side * 517.0;
  float r1 = h11(sd), r2 = h11(sd * 1.37 + 7.0), r3 = h11(sd * 0.71 + 3.1), r4 = h11(sd * 2.13 + 1.7);
  float on = 0.88 + 0.12 * r1;
  // Consistent density and softness keep the flow even across neighbouring fibres.
  float soft = 1.0;
  float kk = min(k, 1.2);
  // A short arrival window feeds the core before formation; no late second wave.
  float ig = clamp(uLevel, 0.0, 1.0);
  float front = 1.08 - ig * 1.16;
  float drawn = smoothstep(front - mix(0.015, 0.06, soft), front + mix(0.05, 0.12, soft), kk);
  float arrival = smoothstep(0.0, 0.25, ig);
  float travelling = arrival * (1.0 - smoothstep(0.8, 1.0, ig));
  float igHead = (exp(-pow((kk - front) / mix(0.03, 0.07, soft), 2.0)) * 1.6 + exp(-max(kk - front, 0.0) * 9.0) * smoothstep(front - 0.04, front + 0.04, kk) * 0.6) * travelling;
  // A continuous density envelope draws energy inward without a bright moving cutoff.
  // At every position the density only decreases as formation advances.
  float ab = clamp(uTrace, 0.0, 1.0);
  float remaining = 1.0 - ab;
  float radius = max(remaining, 0.04);
  float remain = exp(-pow(kk / radius, 2.0) * ab * 1.8) * sqrt(remaining);
  float w = max(mix(0.24, 0.28, r3), fwidth(af) * 1.2);
  float d = (f - (0.46 + 0.08 * r2)) / w;
  // Feather each cell boundary so wider glows never end at a hard seam.
  float feather = mix(1.0, smoothstep(0.0, 0.14, f) * (1.0 - smoothstep(0.86, 1.0, f)), soft);
  float core = exp(-d * d * mix(3.0, 1.4, soft)) * mix(0.75, 0.2, soft) * feather;
  // Where fibres crowd (towards the crossing) they merge into a smooth glow instead of aliasing.
  float aa = clamp(fwidth(af) * 1.4 - 0.2, 0.0, 1.0);
  float halo = exp(-d * d * 0.45) * mix(0.14, 0.24, soft) * feather;
  // Merged region near the core: use the field's average state so per-fibre masks don't speckle.
  float fieldState = clamp(uLevel * 1.5 - 0.45, 0.0, 1.0) * (1.0 - ab);
  float line = mix((core + halo) * (0.65 + 0.15 * r2) * on * drawn * remain, 0.2 * fieldState, aa);
  float bundle = mix(0.8, 1.0, n1(a * 1.3 + L * 7.0 + side * 13.0));
  float extent = 1.0 - smoothstep(0.55, 1.45, abs(a));
  // One shared velocity field gently accelerates toward the core. Smooth, broad
  // packets replace independently flickering comet heads; small phase offsets avoid rigid bands.
  float flowPhase = pow(k + 0.025, 1.4) * 5.0 + uFlow * 0.32 + r2 * 0.22 + L * 0.12;
  float wave = 0.5 + 0.5 * cos(flowPhase * 6.2831853);
  float tex = 0.78 + 0.22 * wave;
  float pulse = pow(wave, 3.0) * 0.15 * (1.0 - aa);
  float conc = mix(0.65, 1.15, 1.0 - smoothstep(0.04, 0.95, k)) * (1.0 + uRush * 0.6 * exp(-k * 3.0));
  // Cool white-blue light on the white lobe, hot spectrum on the coloured lobe, violet-white where they meet.
  vec3 cool = mix(vec3(0.08, 0.36, 1.0), vec3(0.2, 0.85, 1.0), sqrt(r2)) * 1.6;   // blue reads darker than red: extra gain
  cool = mix(cool, vec3(0.7, 0.85, 1.0), step(0.9, r4) * 0.7);
  cool = mix(cool, vec3(0.42, 0.24, 1.0), step(0.7, r3) * step(r4, 0.86) * 0.6);
  // The spectrum side wears the logo's own ribbon colours; neighbouring fibres share a hue family.
  vec3 warm = vivid(logoPalette(n1(a * 0.7 + side * 9.0 + L * 2.0 + t * 0.01) * 1.4 + r2 * 0.18)) * 1.15;
  vec3 col = mix(cool, warm, side);
  col = mix(col, vec3(0.78, 0.62, 1.0), exp(-k * k * 50.0) * 0.6);
  float m = bundle * extent;
  float lit = mix(drawn * remain, fieldState, aa);
  vec3 c = col * line * tex * conc * m;
  c += mix(col, vec3(1.0), 0.2) * pulse * core * on * m * lit * mix(2.0, 0.6, soft);
  // Diffuse arrival and absorption heads retain colour instead of clipping to white.
  float headProfile = exp(-d * d * mix(1.6, 0.8, soft)) * feather * mix(0.8, 0.25, soft) * on * (1.0 - aa) * extent * (0.45 + 0.55 * bundle);
  vec3 hot = mix(col, vec3(1.0), mix(0.4, 0.15, soft));
  c += hot * igHead * remain * headProfile * 0.25;
  c += vec3(1.0) * core * core * on * tex * conc * m * lit * 0.09 * (1.0 - aa);   // hot white cores
  // Broad volumetric glow around the brightest bundles (the reference's bloom).
  float broad = mix(0.6, 0.8, n1(a * 0.55 + L * 3.0 + side * 9.0)) * exp(-abs(a) * 0.9);
  c += col * broad * conc * fieldState * 0.07;
  return c * arrival * mix(1.65, 0.85, L) * mix(1.0, 0.42, uCalm) * (1.0 + uRush * 0.35)
           * (1.0 - smoothstep(0.9, 1.0, ab));   // fully consumed trails cannot return
}

// Prismatic shards (reference: crystal light leaks): soft elongated slivers with a white core and the spectrum
// along their length, streaking in from both edges on the shared energy clock, stretching as they accelerate and
// absorbed at the crossing. They live in the aurora → rush window and fade out as the trace begins.
vec3 specRamp(float x){
  vec3 c = clamp(abs(mod(clamp(x, 0.0, 1.0) * 4.6 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}
vec3 shards(vec2 a, float t){
  float env = smoothstep(0.08, 0.5, uLevel) * (1.0 - smoothstep(0.0, 0.3, uTrace)) * (1.0 + uRush * 0.8);
  if (env < 0.002) return vec3(0.0);
  vec3 c = vec3(0.0);
#ifdef AURORA_LITE
  const int N = 12;
#else
  const int N = 26;
#endif
  for (int i = 0; i < N; i++){
    float fi = float(i);
    float side = step(0.5, h11(fi * 3.7 + 1.0));                    // 1 = spectrum (right) lobe
    float rate = mix(0.09, 0.17, h11(fi * 5.1 + 2.0));
    float life = fract(uFlow * rate + h11(fi * 7.3 + 4.0));
    float acc = pow(life, 1.7);                                     // accelerates into the core
    float ang = mix(3.14159265, 0.0, side) + (h11(fi * 9.9 + 6.0) - 0.5) * 2.4 + 0.04 * sin(t * 0.2 + fi);
    vec2 dir = vec2(cos(ang), sin(ang) * 0.9);
    float R0 = uAspect * 0.55 * mix(0.85, 1.15, h11(fi * 2.3 + 8.0));
    float rr = R0 * (1.0 - acc);
    vec2 ctr = dir * rr;
    // slight sweep so paths flatten toward the crossing like the fibres
    ctr.y *= mix(0.55, 1.0, rr / R0);
    vec2 mv = normalize(dir * vec2(1.0, mix(0.55, 1.0, rr / R0)));
    vec2 d = a - ctr;
    float along = dot(d, mv), across = dot(d, vec2(-mv.y, mv.x));
    float speed = 1.7 * pow(max(life, 0.02), 0.7);
    float blur = h11(fi * 4.1 + 3.0);                               // some are far out of focus
    float L = mix(0.03, 0.075, h11(fi * 6.7)) * (0.6 + speed * 0.9) * mix(1.0, 1.5, blur);
    float W = mix(0.006, 0.011, h11(fi * 8.2)) * mix(1.0, 3.0, blur * blur);
    float e = exp(-(along * along) / (L * L) - (across * across) / (W * W));
    float fade = smoothstep(0.0, 0.18, life) * smoothstep(0.0, 0.1, rr);   // absorbed, never cut
    vec3 sideTint = mix(vec3(0.55, 0.75, 1.0), vivid(logoPalette(h11(fi * 1.9) * 1.4)), side);
    vec3 sc = mix(specRamp(0.5 + along / L * 0.6 + (h11(fi * 3.3) - 0.5) * 0.25), sideTint, 0.35);
    sc = mix(sc, vec3(1.0), exp(-(across * across) / (W * W * 0.12)) * 0.45 * (1.0 - blur));
    c += sc * e * fade * mix(1.0, 0.3, blur) * mix(0.55, 1.0, h11(fi * 5.5));
  }
  return c * env * 1.25;
}

vec3 scene(vec2 p, float t){
  vec2 q = p - uLogo;
  vec2 absorption = p - uAbsorb;
  float late = smoothstep(0.45, 1.0, uLevel);
  float idlePulse=ambientPulse(t)*smoothstep(0.9,1.0,uTrace);
  vec3 c = vec3(0.0);
  // Deep sky: nebula wash (blue left, magenta right) and stars, strongest above the mark.
  float sky = smoothstep(uHorizon - 0.05, 0.45, p.y);
  float neb = n2(p * 2.6 + vec2(t * 0.01, 0.0)) * 0.6 + n2(p * 6.3 - vec2(0.0, t * 0.012)) * 0.4;
  c += mix(vec3(0.08, 0.16, 0.85), vec3(0.75, 0.1, 0.45), smoothstep(-0.5, 0.5, q.x)) * pow(neb, 3.0) * 0.22 * sky * uLevel;
  vec2 sg = p * 90.0, sid = floor(sg);
  float sh = h21(sid), sd = length(fract(sg) - 0.5 - (vec2(h21(sid + 2.3), h21(sid + 5.9)) - 0.5) * 0.6);
  float star = smoothstep(0.09, 0.0, sd) * step(0.982, sh) * (0.45 + 0.55 * sin(t * (1.0 + sh * 3.0) + sh * 80.0));
  c += mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.7, 0.85), step(0.0, q.x)) * star * 0.4 * sky * uLevel;
  // Incoming energy is absorbed at the core. The surface carries it to formation.
  c += shards(absorption, t);
  c += fan(absorption, 0.0, t);
  c += fan(absorption * vec2(1.0, 1.04), 0.5, t);
#ifndef AURORA_LITE
  c += fan(absorption * vec2(1.0, 0.95), 1.0, t);
#endif
  // Intake glow stays at the core; the separate, much smaller formation light travels.
  vec2 glowQ = mix(absorption,q,smoothstep(0.9,1.0,uTrace));
  vec2 dirv = glowQ / max(length(glowQ), 1e-4);
  float r = length(glowQ * vec2(1.0, 1.7));
  float absorptionR = length(absorption * vec2(1.0,1.7));
  float rays = pow(n2(dirv * 9.0 + t * 0.06), 4.0) * 0.7 + pow(n2(dirv * 23.0 - t * 0.04), 6.0) * 0.5;
  vec3 burstCol = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.35, 0.6), smoothstep(-0.15, 0.15, q.x));
  float burstGain = late * mix(0.65, 0.045, uCalm) + uRush * 0.15 + uFlash * 0.6 + idlePulse * 0.075;
  c += burstCol * rays * exp(-r * mix(4.2,7.0,uCalm)) * 0.75 * burstGain;
  c += vec3(0.55, 0.7, 1.0) * exp(-r * r * 34.0) * 0.3 * burstGain;
  // The local absorption point shares the ribbon's feed pulse at its growing edge.
  float delivery=0.85+0.15*cos(uFlow*0.32*6.2831853);
  float transfer = sin(clamp(uTrace, 0.0, 1.0) * 3.1415927) * uRush * delivery;
  c += mix(vec3(0.4, 0.7, 1.0), vec3(1.0, 0.45, 0.65), smoothstep(-0.08, 0.08, q.x))
     * exp(-absorptionR * absorptionR * 140.0) * transfer * 0.45;
  vec2 forming=p-uFormation;
  float formingRadius=clamp(uLogoSize.y*0.12,0.012,0.035);
  float formingEnvelope=smoothstep(0.0,0.06,uTrace)*(1.0-smoothstep(0.88,1.0,uTrace))*uRush;
  c += mix(vec3(0.6,0.78,1.0),vec3(1.0,0.55,0.65),smoothstep(0.5,0.6,uTrace))
     * exp(-dot(forming,forming)/(formingRadius*formingRadius))*formingEnvelope*0.16;
  // A restrained ignition pulse at the point of absorption.
  c += vec3(0.85, 0.9, 1.0) * exp(-absorptionR * absorptionR * 34.0) * uFlash * 0.5;
  c += vec3(0.55, 0.75, 1.0) * exp(-abs(absorption.y) * 70.0) * exp(-abs(absorption.x) * 1.2) * uFlash * 0.5;
  // Quiet background particles in two depths. Slow drift and broad, low-contrast
  // halos replace the orange embers and rushing sparks; the field never flies at the viewer.
  for (int j = 0; j < 2; j++) {
    float layer = float(j);
    float density = mix(28.0, 43.0, layer);
    vec2 grid = p * density + vec2(t * (0.035 + layer * 0.018), -t * (0.055 + layer * 0.025));
    vec2 cell = floor(grid), local = fract(grid) - 0.5;
    float seed = h21(cell + layer * 71.3);
    vec2 centre = (vec2(h21(cell + 1.7), h21(cell + 8.3)) - 0.5) * 0.55;
    vec2 delta = local - centre;
    float size = mix(0.045, 0.09, h21(cell + 12.8));
    float dotLight = exp(-dot(delta, delta) / (size * size));
    float halo = exp(-dot(delta, delta) / (size * size * 5.0)) * 0.1;
    float presence = smoothstep(0.935, 0.98, seed);
    float breathe = 0.85 + 0.15 * sin(t * 0.3 + seed * 17.0);
    float quietCentre = mix(0.35, 1.0, smoothstep(0.04, 0.3, length(q * vec2(0.65, 1.5))));
    vec3 dustColour = mix(vec3(0.38, 0.55, 0.8), vec3(0.72, 0.68, 0.9), seed);
    c += dustColour * (dotLight + halo) * presence * breathe * quietCentre
       * mix(0.22, 0.11, layer) * uLevel;
  }
  // Anamorphic flare through the crossing.
  c += mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.45, 0.6), smoothstep(-0.2, 0.2, q.x)) * exp(-abs(glowQ.y) * 150.0) * exp(-abs(glowQ.x) * 1.2)
     * 0.35 * late * (mix(1.0,0.15,uCalm)+idlePulse*0.15);
  return c;
}

void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime;
  vec2 q = p - uLogo;
  vec3 base = mix(vec3(0.0003, 0.0006, 0.003), vec3(0.0015, 0.004, 0.018), exp(-length(q * vec2(0.8, 1.6)) * 2.0));
  vec3 c = scene(p, t);
  if (p.y < uHorizon) {
    // A shallow water plane: compressed near the contact line at rest, opening
    // into a wider local footprint as scrolling disturbs the surface.
    float depth = uHorizon - p.y;
    float logoHeight = max(uLogoSize.y, 0.06);
    float spread = uWaterSpread * smoothstep(0.6, 1.0, uTrace);
    float motion = uWaterMotion * smoothstep(0.6, 1.0, uTrace);
    // Expansion stays shallow to the water plane, including at full scroll.
    float compression = mix(0.42, 0.56, spread);
    float maxWidth = max(1.0, min(1.24, uAspect * 0.94 / max(uLogoSize.x, 0.1)));
    float perspective = min(1.0 + depth / logoHeight * (0.18 + spread * 0.55), maxWidth);
    vec2 surface = vec2(q.x / max(uLogoSize.x * 0.58, 0.1), depth / (logoHeight * 0.7));
    float radius = length(surface);
    float localWater = exp(-radius * radius * 1.5) * smoothstep(0.0, 0.025, depth / logoHeight);
    float rings = sin(radius * 23.0 - t * 2.6) + 0.3 * sin(radius * 41.0 - t * 3.7);
    // Broad, gently curved wavelets remain readable on a small screen. Their
    // displacement and light share a phase, so the reflected image rides the water.
    float wavePhase = surface.y * 42.0 - t * 0.85 + sin(surface.x * 4.0 + t * 0.2) * 0.65;
    float wave = sin(wavePhase);
    float crossWave = sin(wavePhase * 1.63 + surface.x * 3.0 - t * 0.35);
    float ripple = (wave * 0.024 + crossWave * 0.006 + rings * motion * 0.028)
                 * logoHeight * localWater;
    // Anchor the UV warp at the horizon; spreading never detaches the reflection.
    vec2 reflected = vec2(uLogo.x + q.x / perspective, uHorizon - depth / compression);
    reflected += vec2(ripple * surface.x * 0.6 + wave * logoHeight * localWater * 0.012, ripple);
    vec2 ruv = reflected / vec2(uAspect, 1.0) + 0.5;
    float blur = 0.001 + depth * (0.018 + spread * 0.045 + motion * 0.02);
    vec4 refl = texture2D(uReflection, ruv) * 0.2;
    for (int k = 0; k < 8; k++) {
      float ang = float(k) * 0.7854 + 0.39;
      refl += texture2D(uReflection, ruv + vec2(cos(ang) * 1.6 / uAspect, sin(ang) * 0.55) * blur) * 0.1;
    }
    // Grazing views reflect more; the nearer, steeper view reveals more of the
    // dark water beneath. Distance and the local footprint soften the far edges.
    float viewCos = depth / sqrt(depth * depth + pow(logoHeight * 0.7, 2.0));
    float fresnel = 0.02 + 0.98 * pow(1.0 - viewCos, 5.0);
    float footprint = exp(-pow(abs(surface.x) / 1.25, 6.0))
                    * exp(-depth / (logoHeight * mix(0.38, 0.48, spread)));
    // As reflected light spreads over more water, it loses contrast and diffuses
    // into the surface, especially toward the foreground and lateral edges.
    float surfaceFade = exp(-spread * (depth / logoHeight * 1.7 + pow(abs(surface.x), 1.6) * 0.85));
    float dilution = 1.0 / (1.0 + spread * 0.85);
    float reflectionWeight = clamp(refl.a, 0.0, 1.0) * fresnel * footprint * surfaceFade * dilution * 0.72;
    // Soft troughs and small highlights reveal the water's shape only where it
    // catches the logo; no bright rings extend into the surrounding dark surface.
    float crest = pow(0.5 + 0.5 * cos(wavePhase + 0.6), 5.0);
    float waterLight = 1.0 + localWater * (wave * 0.32 - 0.12);
    vec3 reflectedLight = min(refl.rgb, vec3(1.2)) * vec3(0.78, 0.87, 1.0) * waterLight;
    reflectedLight += vec3(0.65, 0.8, 1.0) * crest * localWater * 0.09;
    c = mix(c, reflectedLight, reflectionWeight);
    float z = 1.0 / max(depth, 0.004);
    float lane = abs(fract(q.x * z * 0.08) - 0.5);
    c += vec3(0.1, 0.4, 0.9) * smoothstep(0.01 + z * 0.0006, 0.0, lane) * exp(-depth * 8.0) * 0.05 * uLevel;
  }
  // Light pooling on the floor beneath the mark.
  float hz = exp(-abs(p.y - uHorizon) * 30.0) * exp(-abs(q.x) * 1.6);
  c += mix(vec3(0.25, 0.6, 1.0), vec3(1.0, 0.4, 0.55), smoothstep(-0.2, 0.2, q.x)) * hz * 0.35 * smoothstep(0.3, 0.9, uLevel)
     * (mix(1.0,0.3,uCalm)+ambientPulse(t)*smoothstep(0.9,1.0,uTrace)*0.12);
  // Keep the wordmark, tagline and CTAs (which sit on the floor) readable.
  c *= 1.0 - 0.55 * smoothstep(uHorizon + 0.02, uHorizon - 0.04, p.y) * exp(-q.x * q.x / (uLogoSize.x * uLogoSize.x * 0.2))
             * smoothstep(-0.5, uHorizon - 0.12, p.y);
  c += base;
  // Film grade: filmic shoulder, vignette, gamma, S-curve, saturation, grain.
  c = 1.0 - exp(-c * 1.1);
  c *= 1.0 - 0.5 * smoothstep(0.4, 1.1, length(p * vec2(0.75, 1.1)));
  c = pow(c, vec3(1.0 / 2.2));
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.8);
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.2);
  c += (h21(gl_FragCoord.xy + fract(t * 7.0) * 311.0) - 0.5) * 0.022;
  // Fade the graded image too: gamma and grain otherwise make tiny amounts of
  // opening light visible immediately. Every layer emerges from the page together.
  float opening = smoothstep(0.0, 0.5, uLevel);
  gl_FragColor = vec4(max(c, 0.0), opening);
}`;

export interface AuroraCurtain {
  scene: THREE.Scene; camera: THREE.Camera;
  /** Off-screen target the caller renders the mirrored logo into. */
  reflection: THREE.WebGLRenderTarget;
  layout(width: number, height: number, logoCx: number, logoCy: number, logoW: number, logoH: number, horizonY: number, bufferW: number, bufferH: number): void;
  focus(x: number, y: number): void;
  formation(x: number, y: number): void;
  water(spread: number, motion: number): void;
  update(seconds: number, flow: number, s: { aurora: number; rush: number; flash: number; calm: number; trace: number }): void;
  dispose(): void;
}

export function createAuroraCurtain(lite: boolean): AuroraCurtain {
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  let viewWidth=1, viewHeight=1;
  const reflection = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  const uniforms = { uTime: { value: 0 }, uFlow: { value: 0 }, uRush: { value: 0 }, uFlash: { value: 0 }, uCalm: { value: 0 }, uTrace: { value: 0 }, uAspect: { value: 1 }, uLevel: { value: 0 }, uHorizon: { value: -0.2 },
    uLogo: { value: new THREE.Vector2(0, 0.1) }, uAbsorb: { value: new THREE.Vector2(0,0.1) },
    uFormation: { value: new THREE.Vector2(0,0.1) }, uLogoSize: { value: new THREE.Vector2(1, 0.33) },
    uWaterSpread: { value: 0 }, uWaterMotion: { value: 0 },
    uReflection: { value: reflection.texture } };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: false, transparent: true,
    defines: lite ? { AURORA_LITE: '' } : {},
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; scene.add(mesh);
  return {
    scene, camera, reflection,
    // CSS px relative to the canvas; shader space is height-normalised, y up, origin at the centre.
    layout(width, height, cx, cy, lw, lh, horizonY, bw, bh) {
      viewWidth=width; viewHeight=height;
      uniforms.uAspect.value = width / height;
      uniforms.uLogo.value.set((cx - width / 2) / height, (height / 2 - cy) / height);
      uniforms.uAbsorb.value.copy(uniforms.uLogo.value);
      uniforms.uFormation.value.copy(uniforms.uLogo.value);
      uniforms.uLogoSize.value.set(lw / height, lh / height);
      uniforms.uHorizon.value = 0.5 - horizonY / height;
      reflection.setSize(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));   // half-res: it is blurred anyway
    },
    focus(x,y) { uniforms.uAbsorb.value.set((x-viewWidth/2)/viewHeight,(viewHeight/2-y)/viewHeight); },
    formation(x,y) { uniforms.uFormation.value.set((x-viewWidth/2)/viewHeight,(viewHeight/2-y)/viewHeight); },
    water(spread,motion) { uniforms.uWaterSpread.value=spread; uniforms.uWaterMotion.value=motion; },
    update(seconds, flow, s) {
      uniforms.uTime.value = seconds; uniforms.uFlow.value = flow; uniforms.uLevel.value = s.aurora;
      uniforms.uRush.value = s.rush; uniforms.uFlash.value = s.flash; uniforms.uCalm.value = s.calm;
      uniforms.uTrace.value = s.trace;
    },
    dispose() { geometry.dispose(); material.dispose(); reflection.dispose(); },
  };
}
