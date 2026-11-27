/**
 * Site background (fixed behind every section after the hero): a volume of light, particles and floating 3D logos.
 *
 * One light drives everything, and it follows the visitor's clock: the key light travels like the sun (morning
 * low from the left and warm, midday high and white, evening from the right in amber, night a dim blue moon) and
 * drifts a little while the page is open. `?hour=20` previews any time of day.
 *
 *  - Floating logos (floatingLogos.ts): extruded marks that materialise, float through focus and disintegrate…
 *  - …and the disintegration disperses: a soft glitter cloud with faint wisps and a few rays that are born as a
 *    white star, split into the spectrum and stretch along their path before they fade.
 *  - Particle clouds: blue / gold glitter ribbons with soft glow masses and bokeh, drifting through the volume.
 *  - Depth of field + bloom pass: far things small and soft, bright things glow.
 *  - Overlay: small prismatic streak flares, a fine anamorphic flare, a soft beam from the light's side, a coloured
 *    leak, grain, vignette and a reading scrim.
 * Scroll pushes the drift and tilts the camera, the mouse adds parallax, the section accent tints the cool light.
 * Reduced motion: one still frame, no logos or sparks.
 */
import * as THREE from 'three';
import { createFloatingLogos } from './floatingLogos';

export interface LightFieldHandle { setProgress(p: number, velocity: number): void; setVisible(v: number): void; setDim(d: number): void; setAccent(hex: string): void; dispose(): void }

const NEAR_Z = 6, FAR_Z = -46, DEPTH = NEAR_Z - FAR_Z, CAM_Z = 8;

/* ------------------------------------------------------------------ the clock light */
interface ClockLight { dir: THREE.Vector3; color: THREE.Color; intensity: number; x: number; elev: number; day: number }
const SUN_LOW = new THREE.Color(1.0, 0.56, 0.24), SUN_HIGH = new THREE.Color(1.0, 0.95, 0.88), MOON = new THREE.Color(0.55, 0.7, 1.0);
function hourNow(): number {
  const q = new URLSearchParams(location.search).get('hour');
  if (q !== null && !Number.isNaN(+q)) return ((+q % 24) + 24) % 24;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
/** Sun by day, moon by night; continuous through dawn and dusk. */
function clockLight(hour: number, t: number, out: ClockLight): ClockLight {
  const phase = (hour - 6) / 12;                                     // 0 sunrise … 1 sunset … 2 next sunrise
  const sunY = Math.sin(Math.PI * phase);                            // > 0 day, < 0 night
  const x = -Math.cos(Math.PI * phase) + 0.12 * Math.sin(t * 0.045); // day: left → right; night: back right → left
  const elev = Math.abs(sunY) * (sunY > 0 ? 1 : 0.7);
  const day = THREE.MathUtils.smoothstep(sunY, -0.12, 0.12);
  out.x = x; out.elev = elev; out.day = day;
  out.dir.set(x * 8, 1.5 + elev * 8, 5).normalize();
  out.color.copy(SUN_LOW).lerp(SUN_HIGH, THREE.MathUtils.smoothstep(elev, 0.15, 0.8)).lerp(MOON, 1 - day);
  out.intensity = THREE.MathUtils.lerp(5.5, 9 + elev * 4, day);
  return out;
}

/* ------------------------------------------------------------------ geometry + environment */
/** The light the logos reflect: dark room with a warm leak, cyan streaks and a soft white strip. */
function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x010204);
  const glow = (color: number, w: number, h: number, pos: [number, number, number], rot: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  glow(0xff6a1a, 14, 9, [-9, -2, -6], [0, 0.9, 0]);
  glow(0xff8a3a, 3, 12, [-4, 1, -10], [0, 0.3, 0.6]);
  glow(0x2fb8ff, 16, 1.2, [3, 4, -9], [0, -0.2, -0.35]);
  glow(0x3a7dff, 10, 0.6, [6, 1, -8], [0, -0.6, 0.5]);
  glow(0xdfe8ff, 30, 1.6, [0, 9, -4], [Math.PI / 2.4, 0, 0]);
  glow(0xb06cff, 4, 4, [9, -1, 2], [0, -1.2, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  env.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
  return tex;
}

/* ------------------------------------------------------------------ shaders */
const SPEC_GLSL = /* glsl */ `
vec3 spec(float x){
  vec3 c = clamp(abs(mod(clamp(x, 0.0, 1.0) * 4.6 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}`;

/**
 * Dispersal: a disintegrating logo releases a soft glitter cloud. Particles leave gently, slow down with drag and are
 * carried by a smooth swirling flow (wispy curls). Three kinds share one pool:
 *   glitter (most): tiny twinkling specks · wisps (~1 in 6): large, very faint glow puffs that make the cloud ·
 *   rays (~1 in 4 of the rest): born as a star, split into the spectrum and stretch into a thin light ray.
 */
const SPARK_VERT = /* glsl */ `
attribute vec3 aPos, aVel; attribute vec4 aMeta;   // x birth time, y travel at birth, z life, w random
uniform float uTime, uTravel;
varying vec2 vQ; varying float vK, vHue, vKind;
void main(){
  float age = uTime - aMeta.x, k = age / aMeta.z;
  vK = k; vHue = aMeta.w; vQ = position.xy;
  if (k < 0.0 || k > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float r = aMeta.w;
  float wisp = step(0.83, fract(r * 13.7));
  float ray = (1.0 - wisp) * step(fract(r * 7.3), 0.14);
  vKind = wisp > 0.5 ? 2.0 : (ray > 0.5 ? 1.0 : 0.0);
  // gentle launch with drag, then a smooth swirling flow carries it into curls
  float drag = 1.1;
  vec3 p = aPos + aVel * (1.0 - exp(-age * drag)) / drag;
  vec3 sw = vec3(sin(p.y * 1.3 + age * 0.7 + r * 6.0), cos(p.x * 1.1 - age * 0.6 + r * 4.0), sin((p.x + p.y) * 0.9 + age * 0.5 + r * 9.0));
  p += sw * 0.45 * age * (0.6 + 0.4 * r);
  p.y += age * 0.05;
  p.z += uTravel - aMeta.y;                                         // ride along with the drifting field
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec2 v = (modelViewMatrix * vec4(aVel + sw * 0.6, 0.0)).xy;
  vec2 along = length(v) > 1e-4 ? normalize(v) : vec2(1.0, 0.0);
  vec2 across = vec2(-along.y, along.x);
  float stretch = ray * smoothstep(0.2, 1.0, k);
  float size = wisp > 0.5 ? mix(0.12, 0.34, k) : (ray > 0.5 ? 0.028 : 0.016 + 0.01 * fract(r * 31.0));
  float halfLen = size * (1.0 + 4.5 * stretch), halfW = size * (1.0 - 0.6 * stretch);
  mv.xy += along * position.x * halfLen + across * position.y * halfW;
  gl_Position = projectionMatrix * mv;
}`;
const SPARK_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uLight; uniform float uTime;
varying vec2 vQ; varying float vK, vHue, vKind;
${SPEC_GLSL}
void main(){
  float r2 = dot(vQ, vQ);
  float fade = smoothstep(0.0, 0.08, vK) * (1.0 - smoothstep(0.45, 1.0, vK));
  vec3 col;
  if (vKind > 1.5) {
    // wisp: a very soft glow puff in the light's colour, cooled slightly
    col = mix(uLight, vec3(0.45, 0.65, 1.0), 0.45) * exp(-r2 * 2.2) * 0.07;
  } else if (vKind > 0.5) {
    float core = exp(-r2 * 9.0);
    float star = (exp(-vQ.y * vQ.y * 160.0) * exp(-abs(vQ.x) * 3.0) + exp(-vQ.x * vQ.x * 160.0) * exp(-abs(vQ.y) * 3.0)) * (1.0 - smoothstep(0.0, 0.3, vK));
    float ray = exp(-vQ.y * vQ.y * 7.0) * (1.0 - smoothstep(0.55, 1.0, abs(vQ.x)));
    float shape = mix(core + star * 0.8, ray, smoothstep(0.15, 0.5, vK));
    vec3 c = mix(mix(vec3(1.0), uLight, 0.25), spec(vHue + vQ.x * 0.28), smoothstep(0.06, 0.4, vK));
    c = mix(c, vec3(1.0), exp(-vQ.y * vQ.y * 60.0) * 0.4);
    col = c * shape * 1.8;
  } else {
    // glitter: a soft twinkling speck, white at birth, drifting into a light spectral tint
    float tw = 0.55 + 0.45 * sin(uTime * (4.0 + vHue * 6.0) + vHue * 50.0);
    vec3 c = mix(vec3(1.0), mix(uLight, spec(vHue), 0.45), smoothstep(0.05, 0.5, vK));
    col = c * exp(-r2 * 4.0) * tw * 1.6;
  }
  gl_FragColor = vec4(col * fade, 1.0);
}`;

/**
 * Particle clouds (refs: blue glitter nebulae, gold glitter with bokeh): most motes gather in a few flowing ribbons
 * — dense clusters with soft glow masses inside — the rest drift sparsely between them. Some clusters are cool
 * blue, some warm gold glitter tinted by the clock light. Wrapped through the depth of the scene.
 * aSeed: xy normalised x/y, z start z, w random · aKind: x 0 speck / 1 bokeh / 2 glow mass, y 1 = warm cluster
 */
const DUST_VERT = /* glsl */ `
attribute vec4 aSeed; attribute vec2 aKind;
uniform float uTime, uTravel, uAspect, uPx; uniform vec2 uDrift;
varying float vA, vKind, vWarm, vW;
void main(){
  float far = ${FAR_Z.toFixed(1)}, depth = ${DEPTH.toFixed(1)}, camZ = ${CAM_Z.toFixed(1)};
  float z = far + mod(aSeed.z + uTravel * 0.8 - far, depth);
  float dist = max(camZ - z, 1.0);
  vec2 hb = vec2(dist * 0.62 * uAspect + 1.5, dist * 0.5 + 1.0);
  vec3 p = vec3(aSeed.xy * 2.0 * hb, z);
  // the cloud breathes and flows: a slow shared swirl plus the light's drift
  p.xy += uDrift * uTime * (0.3 + 0.4 * aSeed.w);
  p.xy += 0.35 * vec2(sin(p.y * 0.35 + uTime * 0.16 + aSeed.w * 2.0), cos(p.x * 0.3 - uTime * 0.13 + aSeed.w * 3.0));
  p.xy = mod(p.xy + hb, 2.0 * hb) - hb;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vKind = aKind.x; vWarm = aKind.y; vW = aSeed.w;
  float size = aKind.x > 1.5 ? 2.6 : (aKind.x > 0.5 ? 0.5 + 0.35 * aSeed.w : 0.03 + 0.03 * fract(aSeed.w * 17.0));
  gl_PointSize = min(size * uPx * 520.0 / -mv.z, 256.0);
  float edge = smoothstep(0.0, 4.0, z - far) * smoothstep(0.0, 2.0, ${NEAR_Z.toFixed(1)} - z);
  float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed.w * 3.0) + aSeed.w * 90.0);
  vA = edge * (aKind.x > 1.5 ? 0.05 : (aKind.x > 0.5 ? 0.14 : 0.35 + 0.65 * tw));
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uLight, uCool;
varying float vA, vKind, vWarm, vW;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  // every kind is a soft falloff: specks a tight glow, bokeh a broad soft disc that melts at the rim, glow masses a haze
  float a = vKind > 1.5 ? exp(-r2 * 2.2) : (vKind > 0.5 ? smoothstep(1.0, 0.35, r2) * (0.75 + 0.25 * r2) : exp(-r2 * 6.0));
  vec3 gold = uLight * vec3(1.0, 0.78, 0.42) + vec3(0.12, 0.06, 0.0);
  vec3 blue = mix(uCool, vec3(0.55, 0.8, 1.0), fract(vW * 5.3) * 0.5);
  vec3 col = mix(blue, gold, vWarm);
  gl_FragColor = vec4(col * a * vA * 1.7, 1.0);
}`;

/** Depth of field + bloom + grade. */
const DOF_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uColor, uDepth, uBloom; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uMaxR, uExposure, uBloomGain;
varying vec2 vUv;
float viewZ(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float coc(float d){
  float z = viewZ(d);
  float far = smoothstep(uFocus, uFocus + 22.0, z);
  float near = smoothstep(uFocus, uFocus - 5.5, z) * 0.55;
  return clamp(max(far, near), 0.0, 1.0);
}
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 uv = vUv;
  float c0 = coc(texture2D(uDepth, uv).r);
  float r = c0 * uMaxR;
  vec3 sum = texture2D(uColor, uv).rgb; float wsum = 1.0;
  // golden-angle disk, rotated per pixel: the blur reads as smooth grainless softness, never as repeated copies
  float rot = hash(gl_FragCoord.xy) * 6.2831853;
  for (int i = 0; i < 12; i++){
    float fi = float(i) + 0.5;
    float a = fi * 2.39996323 + rot;
    vec2 o = vec2(cos(a), sin(a)) * sqrt(fi / 12.0) * r * uTexel;
    float ct = coc(texture2D(uDepth, uv + o).r);
    float w = mix(0.25, 1.0, smoothstep(0.0, 0.6, ct + 0.3 * c0));
    sum += texture2D(uColor, uv + o).rgb * w; wsum += w;
  }
  vec3 base = sum / wsum + texture2D(uBloom, uv).rgb * uBloomGain;
  vec3 col = aces(base * uExposure);
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;

/** Bloom chain: bright pass (13-tap downsample) into a quarter-res buffer, then separable gaussian blur. */
const BRIGHT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThreshold;
varying vec2 vUv;
vec3 bp(vec2 o){ vec3 c = texture2D(uSrc, vUv + o * uTexel).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(uThreshold, uThreshold + 0.35, l); }
void main(){
  vec3 c = bp(vec2(0.0)) * 0.2;
  c += (bp(vec2(-1.5, -1.5)) + bp(vec2(1.5, -1.5)) + bp(vec2(-1.5, 1.5)) + bp(vec2(1.5, 1.5))) * 0.125;
  c += (bp(vec2(-3.0, 0.0)) + bp(vec2(3.0, 0.0)) + bp(vec2(0.0, -3.0)) + bp(vec2(0.0, 3.0))) * 0.075;
  gl_FragColor = vec4(c, 1.0);
}`;
const BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uSrc; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(uSrc, vUv).rgb * 0.1964825501511404;
  c += (texture2D(uSrc, vUv + uDir * 1.411764705882353).rgb + texture2D(uSrc, vUv - uDir * 1.411764705882353).rgb) * 0.2969069646728344;
  c += (texture2D(uSrc, vUv + uDir * 3.2941176470588234).rgb + texture2D(uSrc, vUv - uDir * 3.2941176470588234).rgb) * 0.09447039785044732;
  c += (texture2D(uSrc, vUv + uDir * 5.176470588235294).rgb + texture2D(uSrc, vUv - uDir * 5.176470588235294).rgb) * 0.010381362401148057;
  gl_FragColor = vec4(c, 1.0);
}`;

/** Overlay: prismatic streak flares along the light, a volumetric beam, a coloured leak, grain, vignette, scrim. */
const LEAK_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes, uSun, uLeak, uLeakDir; uniform float uT, uE, uDim, uN, uDay; uniform vec3 uAccent, uLight, uLeakCol;
varying vec2 vUv;
float h1(float n){ return fract(sin(n * 127.1 + 11.3) * 43758.5453); }
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
${SPEC_GLSL}
void main(){
  float A = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(A, 1.0);
  float t = uT;
  vec3 col = vec3(0.0);
  vec2 L = normalize(vec2(0.0, -0.15) - uSun);                       // the way the light travels across the screen

  // ---- soft volumetric beam falling from the light's side
  for (int b = 0; b < 2; b++){
    float fb = float(b);
    vec2 bd = normalize(L + vec2(-L.y, L.x) * (fb - 0.5) * 0.5 + vec2(0.04 * sin(t * 0.05 + fb), 0.0));
    vec2 q = p - uSun;
    float along = dot(q, bd), across = dot(q, vec2(-bd.y, bd.x));
    float w = 0.05 + along * 0.16;
    col += uLight * exp(-across * across / (w * w)) * smoothstep(0.0, 0.3, along) * exp(-along * 0.9) * mix(0.05, 0.03, fb);
  }

  // ---- prismatic streak flares: thin rays with a star core and chromatic fringes, drifting along the light
  for (int i = 0; i < 16; i++){
    float fi = float(i);
    if (fi >= uN) break;
    float life = fract(t * mix(0.018, 0.04, h1(fi * 3.1)) * (1.0 + uE * 2.0) + h1(fi * 7.7));
    vec2 dir = normalize(L + vec2(-L.y, L.x) * (h1(fi * 5.9) - 0.5) * 0.35);
    vec2 start = uSun + vec2(-dir.y, dir.x) * (h1(fi * 2.3) - 0.5) * A * 1.6;
    vec2 c = start + dir * (0.2 + life * 1.9);
    vec2 q = p - c;
    float along = dot(q, dir), across = dot(q, vec2(-dir.y, dir.x));
    float Ls = mix(0.025, 0.07, h1(fi * 9.1)), W = mix(0.0012, 0.0024, h1(fi * 4.4));
    float fall = exp(-along * along / (Ls * Ls));
    // chromatic dispersion across the streak: red, green and blue peak at slightly different offsets
    vec3 xs = vec3(across) + vec3(-1.0, 0.0, 1.0) * W * 1.4;
    vec3 line = exp(-xs * xs / (W * W)) * fall;
    vec3 tint = spec(0.5 + along / Ls * 0.45 + (h1(fi) - 0.5) * 0.4);
    vec3 streak = line * mix(vec3(1.0), tint, 0.65);
    // star core at the head
    float r2 = dot(q, q);
    float core = exp(-r2 / (W * W * 10.0)) + (exp(-across * across / (W * W * 0.5)) * exp(-abs(along) * 110.0) + exp(-along * along / (W * W * 0.5)) * exp(-abs(across) * 110.0)) * 0.5;
    float fade = smoothstep(0.0, 0.15, life) * smoothstep(1.0, 0.6, life) * mix(0.45, 1.0, h1(fi * 6.6));
    col += (streak * 0.6 + mix(vec3(1.0), uLight, 0.3) * core * 0.75) * fade;
  }

  // ---- anamorphic flare: one long horizontal streak at the light's height, blue-violet, slowly breathing
  {
    float y0 = uSun.y - 0.32;
    float dy = p.y - y0, dx = p.x - uSun.x * 0.6;
    float breathe = 0.75 + 0.25 * sin(t * 0.21);
    float line = exp(-dy * dy / 0.000015) * exp(-abs(dx) * 2.0) * 0.18 + exp(-dy * dy / 0.0005) * exp(-abs(dx) * 2.6) * 0.04;
    col += mix(vec3(0.45, 0.55, 1.0), vec3(0.75, 0.5, 1.0), smoothstep(-0.6, 0.6, dx)) * line * breathe;
  }

  // ---- coloured leak on the light's side, a cool haze opposite
  // the spotlight travels round the screen edge with the scroll and takes the section's colour: a soft stretched glow
  // pointing in toward the content (uLeak: where it sits, uLeakDir: the way it shines)
  vec2 wl = p - (uLeak + uLeakDir * 0.18);
  float la = dot(wl, uLeakDir), lc = dot(wl, vec2(-uLeakDir.y, uLeakDir.x));
  col += uLeakCol * (0.26 * exp(-la * la * 1.5 - lc * lc * 3.4) + 0.05 * exp(-length(wl) * 1.4));
  vec2 cl = p - vec2(-uSun.x * 0.4, 0.25);
  col += mix(vec3(0.12, 0.35, 0.8), uAccent, 0.3) * exp(-dot(cl * vec2(0.6, 1.4), cl * vec2(0.6, 1.4)) * 3.0) * 0.06;

  col += (hash(gl_FragCoord.xy + fract(t * 0.61) * 731.0) - 0.5) * 0.02;
  float vig = smoothstep(0.25, 0.95, length((vUv - 0.5) * vec2(1.0, 1.15)));
  float scrim = 0.3 * exp(-pow(p.x / (0.55 * A), 2.0));
  float a = 1.0 - (1.0 - vig * 0.75) * (1.0 - scrim) * uDim;
  gl_FragColor = vec4(col * uDim, clamp(a, 0.0, 1.0));
}`;

const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

/* ------------------------------------------------------------------ main */
export function startLightField(canvas: HTMLCanvasElement, opts: { quality: 'high' | 'low'; reduced: boolean }): LightFieldHandle {
  const high = opts.quality === 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, alpha: false, powerPreference: 'high-performance' });
  // low: rendered at 80% of CSS pixels (soft depth of field and bloom hide it) — phones and tablets stay cool
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 1.25 : 0.8));
  renderer.setClearColor(0x000001, 1);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000001, 0.034);
  const envTex = buildEnvironment(renderer);
  scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 80);

  // scene → HDR target with depth → depth of field + bloom → screen; overlay on top
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  rt.depthTexture = new THREE.DepthTexture(1, 1);
  rt.depthTexture.type = THREE.UnsignedIntType;
  const post = new THREE.Scene(), oCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // bloom buffers (quarter resolution): bright pass → horizontal blur → vertical blur
  const bloomA = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const bloomB = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const brightMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uSrc: { value: rt.texture }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.4 } },
    vertexShader: QUAD_VERT, fragmentShader: BRIGHT_FRAG });
  const blurMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uSrc: { value: bloomA.texture }, uDir: { value: new THREE.Vector2() } },
    vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG });
  const passScene = new THREE.Scene();
  const passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brightMat);
  passQuad.frustumCulled = false; passScene.add(passQuad);
  const bloomTexel = new THREE.Vector2();
  const dofMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uColor: { value: rt.texture }, uDepth: { value: rt.depthTexture }, uBloom: { value: bloomA.texture }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: camera.near }, uFar: { value: camera.far }, uFocus: { value: 9 }, uMaxR: { value: high ? 9 : 6 }, uExposure: { value: 1.0 }, uBloomGain: { value: 1.15 } },
    vertexShader: QUAD_VERT, fragmentShader: DOF_FRAG,
  });
  const dofQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dofMat);
  dofQuad.frustumCulled = false; post.add(dofQuad);

  const light: ClockLight = { dir: new THREE.Vector3(), color: new THREE.Color(), intensity: 8, x: 0, elev: 0.5, day: 1 };

  const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // seeded: same layout every visit

  const warm = new THREE.PointLight(0xff6a1a, 10, 24, 1.8), cool = new THREE.PointLight(0x2fa8ff, 8, 24, 1.8);
  const key = new THREE.DirectionalLight(0xfff1de, 9);
  const rim = new THREE.DirectionalLight(0x6fc4ff, 3.5);
  scene.add(warm, cool, key, rim);

  // ---- sparks (dispersal from disintegrating logos)
  const S = high ? 600 : 240;
  const sparkGeo = new THREE.InstancedBufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  sparkGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const sPos = new THREE.InstancedBufferAttribute(new Float32Array(S * 3), 3), sVel = new THREE.InstancedBufferAttribute(new Float32Array(S * 3), 3);
  const sMeta = new THREE.InstancedBufferAttribute(new Float32Array(S * 4).fill(-100), 4);
  [sPos, sVel, sMeta].forEach((a) => a.setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('aPos', sPos); sparkGeo.setAttribute('aVel', sVel); sparkGeo.setAttribute('aMeta', sMeta);
  sparkGeo.instanceCount = S;
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uTravel: { value: 0 }, uLight: { value: new THREE.Color() } },
    vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG,
  });
  const sparks = new THREE.Mesh(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkHead = 0;

  // ---- dust + bokeh
  const D = high ? 1800 : 700;
  const dustGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(D * 4), kinds = new Float32Array(D * 2);
  // a few flowing ribbons: each a gently curved path through the volume with a gaussian spread around it
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const CL = 7;
  const ribbons = Array.from({ length: CL }, (_, c) => ({
    x: (rnd() - 0.5) * 0.8, y: (rnd() - 0.5) * 0.6, z: FAR_Z + 4 + rnd() * (DEPTH - 10),
    dx: (rnd() - 0.5) * 0.7, dy: (rnd() - 0.5) * 0.35, bend: (rnd() - 0.5) * 0.5,
    spread: 0.03 + rnd() * 0.05, warm: c % 3 === 1 ? 1 : 0,                        // roughly one in three clusters gold
  }));
  for (let i = 0; i < D; i++) {
    const r = rnd();
    let x: number, y: number, z: number, kind = 0, warm = 0;
    if (r < 0.75) {
      const rb = ribbons[Math.floor(rnd() * CL)], u = rnd() - 0.5;
      x = rb.x + rb.dx * u + gauss() * rb.spread;
      y = rb.y + rb.dy * u + rb.bend * u * u + gauss() * rb.spread * 0.8;
      z = rb.z + u * 6 + gauss() * 1.2;
      warm = rb.warm;
      const k = rnd();
      kind = k < 0.04 ? 2 : k < 0.07 ? 1 : 0;                                         // glow masses and bokeh inside the clouds
    } else {
      x = rnd() - 0.5; y = rnd() - 0.5; z = FAR_Z + rnd() * DEPTH;
      kind = rnd() < 0.05 ? 1 : 0; warm = rnd() < 0.35 ? 1 : 0;
    }
    seeds.set([x, y, z, rnd()], i * 4);
    kinds.set([kind, warm], i * 2);
  }
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  dustGeo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 2));
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(D * 3), 3));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uTravel: { value: 0 }, uAspect: { value: 1 }, uPx: { value: renderer.getPixelRatio() },
      uDrift: { value: new THREE.Vector2() }, uLight: { value: new THREE.Color() }, uCool: { value: new THREE.Color(0x3fb4ff) } },
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---- overlay
  const overlay = new THREE.Scene();
  const leakMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uSun: { value: new THREE.Vector2() }, uLeak: { value: new THREE.Vector2(-0.8, -0.5) }, uLeakDir: { value: new THREE.Vector2(0.7, 0.7) }, uLeakCol: { value: new THREE.Color(1, 0.4, 0.1) }, uT: { value: 0 }, uE: { value: 0 }, uDim: { value: 1 },
      uN: { value: high ? 6 : 4 }, uDay: { value: 1 }, uAccent: { value: new THREE.Color('#4D7CFF') }, uLight: { value: new THREE.Color() } },
    vertexShader: QUAD_VERT, fragmentShader: LEAK_FRAG,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), leakMat);
  quad.frustumCulled = false; overlay.add(quad);

  // ---- state
  let progress = 0, prog = 0, velocity = 0, energy = 0, vis = 0, visT = 0, dim = 1, dimT = 1;
  let raf = 0, last = performance.now(), time = 0, travel = 0, running = true, hourT = 0;
  let hour = hourNow();
  const mouse = new THREE.Vector2(), mouseT = new THREE.Vector2();
  const accent = new THREE.Color('#4D7CFF'), accentT = accent.clone();
  const tmpC = new THREE.Color();

  /** Releases dispersal particles at a point, leaving along a direction and leaning with the light's travel. */
  function emitSparks(x: number, y: number, z: number, nx: number, ny: number, nz: number, count: number) {
    for (let k = 0; k < count; k++) {
      const j = sparkHead; sparkHead = (sparkHead + 1) % S;
      const vx = nx * 0.6 - light.dir.x * 0.5 + (Math.random() - 0.5) * 0.9;
      const vy = ny * 0.6 - light.dir.y * 0.5 + (Math.random() - 0.5) * 0.9;
      const vz = nz * 0.6 - light.dir.z * 0.3 + (Math.random() - 0.5) * 0.6;
      const sp2 = 0.35 + Math.random() * 0.75;
      sPos.setXYZ(j, x, y, z);
      sVel.setXYZ(j, vx * sp2, vy * sp2, vz * sp2);
      sMeta.setXYZW(j, time, travel, 2.5 + Math.random() * 3.0, Math.random());
    }
    sPos.needsUpdate = true; sVel.needsUpdate = true; sMeta.needsUpdate = true;
  }

  // floating 3D logos: materialise, float, disintegrate into the same particles (none on reduced motion)
  const logos = createFloatingLogos(scene, { count: opts.reduced ? 0 : (high ? 6 : 3), far: FAR_Z, near: NEAR_Z, depth: DEPTH, camZ: CAM_Z, emit: emitSparks });

  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    rt.setSize(Math.round(w * pr), Math.round(h * pr));
    const bw = Math.max(1, Math.round(w * pr / 4)), bh = Math.max(1, Math.round(h * pr / 4));
    bloomA.setSize(bw, bh); bloomB.setSize(bw, bh);
    bloomTexel.set(1 / bw, 1 / bh);
    brightMat.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
    dofMat.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
    camera.aspect = w / h; camera.fov = w < h ? 64 : 50; camera.updateProjectionMatrix();
    leakMat.uniforms.uRes.value.set(w, h);
    dustMat.uniforms.uAspect.value = camera.aspect;
  };
  const onMove = (ev: PointerEvent) => { if (ev.pointerType === 'mouse') mouseT.set(ev.clientX / innerWidth * 2 - 1, 1 - ev.clientY / innerHeight * 2); };

  // the page's glass (the nav) reflects this light: publish its colour and where it stands, a few times a second
  let lightPublished = -1;
  const publishLight = () => {
    if (time - lightPublished < 0.5 && lightPublished >= 0) return;
    lightPublished = time;
    const c = light.color, m = Math.max(c.r, c.g, c.b, 0.001);
    const root = document.documentElement.style;
    root.setProperty('--scene-light', `${Math.round(c.r / m * 255)} ${Math.round(c.g / m * 255)} ${Math.round(c.b / m * 255)}`);
    root.setProperty('--sun-x', `${((THREE.MathUtils.clamp(light.x, -1, 1) * 0.5 + 0.5) * 100).toFixed(1)}%`);
    root.setProperty('--sun-glow', (0.12 + 0.18 * light.day * (0.5 + 0.5 * light.elev)).toFixed(3));
  };
  function updateLight() {
    clockLight(hour, time, light);
    publishLight();
    key.color.copy(light.color); key.intensity = light.intensity;
    key.position.copy(light.dir).multiplyScalar(10);
    rim.color.copy(accent).lerp(tmpC.set(0x6fc4ff), 0.65);
    const A = camera.aspect;
    leakMat.uniforms.uSun.value.set(light.x * 0.6 * A, 0.58 - (1 - light.elev) * 0.18);
    // spotlight: lower left at the top of the page, sweeping along the bottom, up the right and over the top as you scroll
    const ang = 3.93 + prog * 3.4 + Math.sin(time * 0.06) * 0.12;
    const lp = leakMat.uniforms.uLeak.value.set(Math.cos(ang) * 0.6 * A, Math.sin(ang) * 0.56);
    leakMat.uniforms.uLeakDir.value.copy(lp).multiplyScalar(-1).normalize();
    // colour: the section's accent warmed by the clock light (accent itself eases between sections)
    const lc = leakMat.uniforms.uLeakCol.value.copy(light.color).multiply(tmpC.setRGB(1.0, 0.62, 0.34)).lerp(accent, 0.65);
    lc.multiplyScalar(1 / Math.max(lc.r, lc.g, lc.b, 0.001));          // full-strength hue: a dim mix would vanish on the dark
    leakMat.uniforms.uLight.value.copy(light.color);
    leakMat.uniforms.uDay.value = light.day;
    sparkMat.uniforms.uLight.value.copy(light.color);
    dustMat.uniforms.uLight.value.copy(light.color);
    dustMat.uniforms.uDrift.value.set(-light.dir.x * 0.05, -0.02);
  }

  function draw() {
    camera.position.set(mouse.x * 0.7, mouse.y * 0.45 + (prog - 0.5) * 0.8, CAM_Z);
    camera.lookAt(mouse.x * 2.2, mouse.y * 1.2 - (prog - 0.5) * 1.5, -12);
    camera.rotateZ(-0.06 + Math.sin(time * 0.05) * 0.025 + mouse.x * -0.02);
    warm.position.set(-8 + 3 * Math.sin(time * 0.13), 2.2, -4 + 4 * Math.sin(time * 0.09));
    cool.position.set(7 + 3 * Math.cos(time * 0.11), 3, -12 + 5 * Math.cos(time * 0.07));
    cool.color.copy(accent).lerp(tmpC.set(0x2fa8ff), 0.6);
    sparkMat.uniforms.uTime.value = time; sparkMat.uniforms.uTravel.value = travel;
    dustMat.uniforms.uTime.value = time; dustMat.uniforms.uTravel.value = travel;
    const u = leakMat.uniforms;
    u.uT.value = time; u.uE.value = energy; u.uDim.value = dim; u.uAccent.value.copy(accent);
    renderer.setRenderTarget(rt); renderer.clear();
    renderer.render(scene, camera);
    // bloom: bright pass to quarter res, then one wide horizontal + vertical gaussian blur
    passQuad.material = brightMat; renderer.setRenderTarget(bloomA); renderer.render(passScene, oCam);
    passQuad.material = blurMat;
    blurMat.uniforms.uSrc.value = bloomA.texture; blurMat.uniforms.uDir.value.set(bloomTexel.x * 1.6, 0);
    renderer.setRenderTarget(bloomB); renderer.render(passScene, oCam);
    blurMat.uniforms.uSrc.value = bloomB.texture; blurMat.uniforms.uDir.value.set(0, bloomTexel.y * 1.6);
    renderer.setRenderTarget(bloomA); renderer.render(passScene, oCam);
    renderer.setRenderTarget(null); renderer.clear();
    renderer.render(post, oCam);
    renderer.render(overlay, oCam);
  }

  // low: ~30 fps is plenty for slow drifting light and halves the GPU work on phones and tablets
  const minFrame = high ? 0 : 1000 / 30 - 2;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < minFrame) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    vis += (visT - vis) * (1 - Math.exp(-dt * 3)); dim += (dimT - dim) * (1 - Math.exp(-dt * 3));
    canvas.style.opacity = vis.toFixed(3);
    if (!running || document.hidden || vis < 0.01) return;
    velocity *= Math.exp(-dt * 2.5);
    energy += (Math.min(1.2, Math.abs(velocity) * 0.0007) - energy) * (1 - Math.exp(-dt * 4));
    prog += (progress - prog) * (1 - Math.exp(-dt * 2.5));
    mouse.lerp(mouseT, 1 - Math.exp(-dt * 1.5));
    accent.lerp(accentT, 1 - Math.exp(-dt * 2));
    time += dt;
    if ((hourT += dt) > 20) { hourT = 0; hour = hourNow(); }           // follow the clock
    travel += dt * (0.7 + energy * 5);
    updateLight();
    logos.update(dt, time, travel, camera.aspect, light.color);
    draw();
  };

  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', onMove, { passive: true });
  const onVis = () => { running = !document.hidden; last = performance.now(); };
  document.addEventListener('visibilitychange', onVis);

  if (opts.reduced) {
    time = 12; travel = 3;
    let still = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      vis += (visT - vis) * (1 - Math.exp(-dt * 6)); dim += (dimT - dim) * (1 - Math.exp(-dt * 6));
      prog += (progress - prog) * (1 - Math.exp(-dt * 10));
      accent.lerp(accentT, 1 - Math.exp(-dt * 6));
      canvas.style.opacity = vis.toFixed(3);
      if (vis > 0.01 && (still++ % 6 === 0)) { updateLight(); draw(); }
    };
    raf = requestAnimationFrame(tick);
  } else raf = requestAnimationFrame(frame);

  if (import.meta.env.DEV) (window as unknown as { __light: unknown }).__light = { logos, leak: leakMat.uniforms };
  return {
    setProgress(p, v) { progress = p; velocity = v; },
    setVisible(v) { visT = v; },
    setDim(d) { dimT = Math.max(d, 0.45); },
    setAccent(hex) { try { accentT.set(hex.trim() || '#4D7CFF'); } catch { /* ignore bad colour */ } },
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      envTex.dispose(); rt.dispose(); dofMat.dispose(); dofQuad.geometry.dispose(); bloomA.dispose(); bloomB.dispose(); brightMat.dispose(); blurMat.dispose(); passQuad.geometry.dispose();
      sparkGeo.dispose(); sparkMat.dispose(); dustGeo.dispose(); dustMat.dispose(); logos.dispose();
      quad.geometry.dispose(); leakMat.dispose(); renderer.dispose();
    },
  };
}
