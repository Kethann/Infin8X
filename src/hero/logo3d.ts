/**
 * The Infin8X loop as a real 3D object (Three.js).
 *
 * Geometry: the centreline fitted to the artwork, lifted into 3D (one strand passes in front at the X),
 * swept with a flattened elliptical section that twists edge-on at the crossing — like the glossy band in the logo.
 * Material: physically based clear-coated glass-paint with a faint iridescent (prism) film, studio reflections,
 * coloured rim lights. The spectrum lobe is a living shader: colours stream outward from the prism point.
 * The glass forms in the shader behind the travelling light (front = state.leftForm / rightForm).
 * Interaction: drag to rotate (inertia). Position is locked; it eases back to the front view when idle or scrolling.
 */
import * as THREE from 'three';
import { COSMIC_GLSL } from './cosmicField';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { pointAt, SPLIT, CROSS, VIEW_W, VIEW_H, type Pt } from '../brand/pathMath';
import { SPECTRUM_GLSL, FLOW_SPEED, HUE_SPAN } from './logoColor';
import { createMetalTunnel, type MetalTunnel } from './spaceBg';
import type { Bridge3D, HeroState } from './heroRenderer';

const CX = VIEW_W / 2, CY = VIEW_H / 2;
const Z_AMP = 105;
const wrap = (u: number) => ((u % 1) + 1) % 1;
const sstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Depth along the loop: back at the first pass of the X, front at the second (as in the artwork). */
export function zAt(u: number) {
  const w = wrap(u);
  return w < SPLIT ? -Z_AMP * Math.cos((Math.PI * w) / SPLIT) : Z_AMP * Math.cos((Math.PI * (w - SPLIT)) / (1 - SPLIT));
}

/** Lobe centres (world units) — used to find the outward side of the ribbon. */
const LOBE_L = new THREE.Vector3(470 - CX, 0, 0), LOBE_R = new THREE.Vector3(1440 - CX, 0, 0);

/**
 * The original flat logo as a 3D ribbon: a thin band (rounded edges) whose width tapers toward the X like a
 * calligraphic stroke, twisting gently on the arcs to catch light but staying face-on at the crossing so the
 * centre is a solid, filled X. Thin "echo" crescents ride the outer curves of each lobe, as in the original mark.
 */
function buildGeometry(segments: number, radial: number) {
  const K = 260, ctrl: THREE.Vector3[] = [], p: Pt = { x: 0, y: 0 };
  for (let k = 0; k < K; k++) { const u = k / K; pointAt(u, p); ctrl.push(new THREE.Vector3(p.x - CX, CY - p.y, zAt(u))); }
  const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal');
  const pos: number[] = [], au: number[] = [], index: number[] = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const B2 = new THREE.Vector3(), N2 = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), v = new THREE.Vector3(), C = new THREE.Vector3();

  /** Sweep a flat rounded section along the curve. halfW(u)/halfT(u)=0 → skipped; offset(u) moves it outward. */
  const sweep = (halfW: (u: number) => number, halfT: number, offset: (u: number, w: number) => number, depth: number, twistAmt: number) => {
    const base = pos.length / 3, per = radial + 1;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, tt = u % 1;
      curve.getPoint(tt, P); curve.getTangent(tt, T);
      N.copy(Z).addScaledVector(T, -Z.dot(T)).normalize();
      B.crossVectors(T, N).normalize();
      C.copy(tt >= SPLIT ? LOBE_L : LOBE_R);
      if (B.dot(v.copy(P).sub(C)) < 0) B.negate();                     // B now points outward from the lobe centre
      const isL = tt >= SPLIT, s = isL ? (tt - SPLIT) / (1 - SPLIT) : tt / SPLIT;
      const th = twistAmt * Math.sin(Math.PI * 2 * s);                 // 0 at the X and at the lobe tips → filled centre
      B2.copy(B).multiplyScalar(Math.cos(th)).addScaledVector(N, Math.sin(th));
      N2.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(B, -Math.sin(th));
      const a = Math.max(0.01, halfW(tt)), b = halfT, off = offset(tt, a);
      for (let j = 0; j < per; j++) {
        const ph = (j / radial) * Math.PI * 2, c = Math.cos(ph), sn = Math.sin(ph);
        // superellipse section: flat faces with softly rounded edges
        const ex = Math.sign(c) * Math.pow(Math.abs(c), 0.6), ey = Math.sign(sn) * Math.pow(Math.abs(sn), 0.6);
        const camber = 0.16 * a * (1 - ex * ex);                       // the band bows toward the viewer across its width
        v.copy(P).addScaledVector(B, off).addScaledVector(Z, depth).addScaledVector(B2, ex * a).addScaledVector(N2, ey * b + camber);
        pos.push(v.x, v.y, v.z); au.push(u);
      }
    }
    for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) {
      const a = base + i * per + j, b = base + (i + 1) * per + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  };

  const dCross = (u: number) => Math.min(u, Math.abs(u - SPLIT), 1 - u);
  // main band: calligraphic width — full on the arcs, tapering (but never closing) toward the X
  sweep((u) => {
    const right = u < SPLIT ? 1 : 0;
    return (48 + 4 * right) * (0.62 + 0.38 * sstep(0.0, 0.11, dCross(u)));
  }, 19, () => 0, 0, 0.52);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * Particle swarm that forms the ∞: at impact it bursts out of the X (blue starburst), then — just ahead of the
 * travelling light — each particle is pulled out of the cloud onto its place on the loop. Spectrum-lobe particles
 * take on the spectrum colour as they land. Lives inside the logo group, so it follows rotation and the ∞→8 morph.
 */
function buildSwarm(n: number) {
  const target = new Float32Array(n * 3), dir = new Float32Array(n * 3), order = new Float32Array(n), seed = new Float32Array(n), hue = new Float32Array(n);
  const p: Pt = { x: 0, y: 0 };
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    pointAt(u, p);
    const r = Math.random() ** 1.4 * 45, a = Math.random() * Math.PI * 2;
    target.set([p.x - CX + Math.cos(a) * r, CY - p.y + Math.sin(a) * r * 0.75, zAt(u) + (Math.random() - 0.5) * 70], i * 3);
    // burst direction: wide horizontal spray with a vertical component (like the reference starburst)
    const th = Math.random() * Math.PI * 2, el = (Math.random() - 0.5) * 0.8;
    const d = new THREE.Vector3(Math.cos(th), Math.sin(th) * 0.7, el).normalize();
    dir.set([d.x, d.y, d.z], i * 3);
    order[i] = ((u - SPLIT) % 1 + 1) % 1;              // X → up-left → … → X → up-right → … → X
    seed[i] = Math.random();
    hue[i] = u < SPLIT ? Math.min(u, SPLIT - u) / (SPLIT * 0.5) : -1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(target, 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aHue', new THREE.BufferAttribute(hue, 1));
  return g;
}

/**
 * Sparks shed by the light pen: each particle is released the moment the pen passes its spot on the loop,
 * drifts gently outward and fades — like the dust of a long-exposure light painting. A few stay as a faint aura.
 */
const SWARM_VS = /* glsl */ `attribute vec3 aDir; attribute float aOrder, aSeed, aHue;
  uniform float uF, uT, uAura, uPx, uRef;
  varying float vA; varying float vLand; varying float vHue; varying float vSeed;
  void main(){
    float age = (uF - aOrder) * 3.0;                       // seconds since the pen passed (pen draws the loop in ~3 s)
    float born = step(0.0, age);
    float drift = (1.0 - exp(-max(age, 0.0) * 0.9)) * (40.0 + aSeed * 150.0);
    vec3 p = position + aDir * drift + vec3(sin(uT * 0.5 + aSeed * 40.0), cos(uT * 0.4 + aSeed * 30.0), 0.0) * 6.0 * born;
    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
    float flash = exp(-max(age, 0.0) * 3.0);
    gl_PointSize = (0.9 + aSeed * 1.4 + flash * 2.2) * uPx * (uRef / -mv.z);
    vA = born * (exp(-max(age, 0.0) * 0.8) * 0.9 + step(0.86, aSeed) * uAura * 0.5);
    vLand = 1.0 - flash; vHue = aHue; vSeed = aSeed;
  }`;
const SWARM_FS = /* glsl */ `varying float vA; varying float vLand; varying float vHue; varying float vSeed; uniform float uT, uFlow;
  ${SPECTRUM_GLSL}
  void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    vec3 blue = vec3(0.92, 0.95, 1.0);   // white light on the first lobe
    vec3 c = vHue < 0.0 ? blue : mix(vec3(1.0), specAt(vHue * ${HUE_SPAN.toFixed(2)} - uT * uFlow), 0.35 + 0.65 * vLand);
    gl_FragColor = vec4(c * pow(1.0 - d * 2.0, 1.8) * vA, 1.0); }`;

const REVEAL_GLSL = /* glsl */ `
float uU = vU; bool isL = uU >= uSplit;
float frm = isL ? uLF : uRF;
if (frm <= 0.0) discard;
float frontU = isL ? uSplit + frm * (1.0 - uSplit) : frm * uSplit;
float behind = frontU - uU;
// crystallising front: a little noise so the glass grows like frost, not a hard wipe
float nz = fract(sin(dot(floor(vObjPos * 0.3), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
if (behind < -0.0045 * nz) discard;
float hParam = isL ? 0.0 : min(uU, uSplit - uU) / (uSplit * 0.5);
float swirl = 0.05 * sin(vObjPos.y * 0.018 + vObjPos.x * 0.006 + uTime * 0.7) + 0.03 * sin(vObjPos.z * 0.05 - uTime * 0.5);
vec3 specC = pow(specAt(hParam * ${HUE_SPAN.toFixed(2)} - uTime * uFlow + swirl), vec3(2.2));   // colours mix and stream continuously
vec2 universeUV = vObjPos.xy * 0.006 + vObjPos.z * 0.001;
vec3 universe = cosmicField(universeUV, uTime);
vec3 baseCol = mix(isL ? vec3(0.65, 0.72, 0.86) : specC, universe, isL ? 0.72 : 0.82);
float heat = (isL ? uHeatL : uHeatR) * exp(-max(behind, 0.0) / 0.035);
vec3 emis = universe * (0.18 + uLit * 0.24) + specC * uSpecGlow * (isL ? 0.04 : 0.35);
emis += mix(vec3(1.0, 0.97, 0.93), specC, isL ? 0.0 : 0.35) * heat * 1.5;
float dg = abs(uU - uGlintU); dg = min(dg, 1.0 - dg);
emis += mix(vec3(1.0), specC * 1.6 + 0.3, isL ? 0.0 : 0.5) * (exp(-pow(dg / 0.022, 2.0)) * 0.9 + exp(-pow(dg / 0.006, 2.0)) * 0.6) * uGlint;   // a soft glow gliding through the glass
`;

export class Logo3D implements Bridge3D {
  canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(18, 1, 50, 30000);
  private group = new THREE.Group();
  private U = {
    uMorph: { value: 0 }, uTime: { value: 0 }, uLF: { value: 0 }, uRF: { value: 0 }, uSplit: { value: SPLIT },
    uHeatL: { value: 0 }, uHeatR: { value: 0 }, uGlintU: { value: 0 }, uGlint: { value: 0 },
    uLit: { value: 0 }, uFlow: { value: FLOW_SPEED }, uSpecGlow: { value: 0.3 },
    uImpact: { value: 0 }, uImpactPos: { value: new THREE.Vector3(CROSS.x - CX, CY - CROSS.y, 0) },
    uTrace: { value: 0 }, uGhost: { value: 0 },
    uBurst: { value: 0 }, uF: { value: 0 }, uAura: { value: 1 }, uPx: { value: 1 }, uRef: { value: 4000 },
    uX: { value: new THREE.Vector3(CROSS.x - CX, CY - CROSS.y, 0) },
  };
  private ptrLight = new THREE.PointLight(0xffffff, 0, 0, 0);
  private w = 1; private h = 1;
  private yaw = 0; private pitch = 0; private vYaw = 0; private vPitch = 0;
  private dragging = false; private lastX = 0; private lastY = 0; private lastInteract = -1e9;
  private showcase = 0; // one-time turn at the end of the intro, showing it is real 3D
  private unlocked = false; private shakeX = 0; private shakeY = 0;
  private ptr = { x: 0, y: 0, a: 0, ta: 0 };
  private v = new THREE.Vector3();
  private cleanup: (() => void)[] = [];
  private reduced: boolean;
  private nowT = 0;
  private penPost = 0;
  private tunnel: MetalTunnel;
  private k = 1; private ox = 0; private oy = 0;
  /** CSS rect of the 8 slot in the wordmark (set by HeroIntro) */
  eightSlot: { cx: number; cy: number; h: number } | null = null;

  constructor(canvas: HTMLCanvasElement, private root: HTMLElement, quality: 'high' | 'low', reduced: boolean) {
    this.canvas = canvas; this.reduced = reduced;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', premultipliedAlpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; // Khronos PBR Neutral: keeps the spectrum saturated
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.tunnel = createMetalTunnel(this.renderer, reduced);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.025);
    this.scene.environment = environment.texture;
    room.dispose();
    this.cleanup.push(() => environment.dispose());
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-700, 900, 1400);
    const rimV = new THREE.DirectionalLight(0x8f7bff, 2.2); rimV.position.set(900, -200, -1000);
    const rimR = new THREE.DirectionalLight(0xff5a7a, 1.2); rimR.position.set(-1000, 300, -700);
    const fill = new THREE.HemisphereLight(0xbfd0ff, 0x120a24, 0.5);
    this.scene.add(key, rimV, rimR, fill, this.ptrLight);

    const geo = buildGeometry(quality === 'high' ? 1100 : 640, quality === 'high' ? 28 : 20);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.18, metalness: 0.48, clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 0.24, iridescenceIOR: 1.46, iridescenceThicknessRange: [180, 420],
      envMapIntensity: 1.15,
    });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aU; varying float vU; varying vec3 vObjPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU; vObjPos = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vU; varying vec3 vObjPos;
uniform float uTime, uLF, uRF, uSplit, uHeatL, uHeatR, uGlintU, uGlint, uLit, uFlow, uSpecGlow;
${SPECTRUM_GLSL}
${COSMIC_GLSL}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${REVEAL_GLSL}`)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = baseCol;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += emis;');
    };
    const mesh = new THREE.Mesh(geo, mat);

    // dim glass outline (fresnel rim) drawn by the blueprint pen, plus the impact ripple through the glass
    const ghostMat = new THREE.ShaderMaterial({
      uniforms: this.U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `attribute float aU; varying float vU; varying vec3 vN; varying vec3 vV; varying vec3 vObjPos;
        void main(){ vU = aU; vObjPos = position; vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `varying float vU; varying vec3 vN; varying vec3 vV; varying vec3 vObjPos;
        uniform float uTrace, uGhost, uSplit, uLF, uRF, uImpact; uniform vec3 uImpactPos;
        void main(){
          bool isL = vU >= uSplit; float frm = isL ? uLF : uRF;
          float frontU = isL ? uSplit + frm * (1.0 - uSplit) : frm * uSplit;
          if (frm > 0.0 && vU <= frontU) discard;            // already solid glass here
          float g = mod(vU - uSplit + 1.0, 1.0);               // pen order: X → up-left → … → X
          float vis = 1.0 - smoothstep(uTrace - 0.004, uTrace, g);
          float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
          vec3 col = vec3(0.68, 0.78, 1.0) * fres * uGhost * vis * 2.6;
          if (uImpact > 0.0 && uImpact < 1.0) {
            float d = distance(vObjPos, uImpactPos);
            float ring = exp(-pow((d - uImpact * 1150.0) / 55.0, 2.0)) + 0.6 * exp(-pow((d - uImpact * 700.0) / 35.0, 2.0));
            col += vec3(0.9, 0.95, 1.0) * (ring * (1.0 - uImpact) * (0.35 + fres) * 1.6 + exp(-d / 110.0) * pow(1.0 - uImpact, 2.0) * 1.4);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const ghost = new THREE.Mesh(geo, ghostMat);
    ghost.renderOrder = 2;
    const swarm = new THREE.Points(buildSwarm(quality === 'high' ? 1800 : 650), new THREE.ShaderMaterial({
      uniforms: this.U, vertexShader: SWARM_VS, fragmentShader: SWARM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    swarm.frustumCulled = false; swarm.renderOrder = 3;
    this.U.uPx.value = this.renderer.getPixelRatio();
    // The two apertures reveal a universe beneath the polished ribbon.
    const apertures: THREE.Shape[] = [];
    for (const [start, end] of [[0, SPLIT], [SPLIT, 1]]) {
      const shape = new THREE.Shape(), pt = { x: 0, y: 0 };
      for (let i = 0; i <= 180; i++) {
        pointAt(start + (end - start) * i / 180, pt);
        if (i === 0) shape.moveTo(pt.x - CX, CY - pt.y);
        else shape.lineTo(pt.x - CX, CY - pt.y);
      }
      shape.closePath(); apertures.push(shape);
    }
    const portalGeo = new THREE.ShapeGeometry(apertures);
    const portalMat = new THREE.ShaderMaterial({
      uniforms: this.U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vP; uniform float uTime, uLF, uRF, uMorph;
${COSMIC_GLSL}
        void main(){
          float form = vP.x < 0.0 ? uLF : uRF;
          vec2 p = vP * 0.005;
          float aperture = smoothstep(0.35,1.0,form) * (1.0 - smoothstep(0.0,0.8,uMorph));
          float edge = 1.0 - smoothstep(0.58,1.04,length(vec2((abs(vP.x)-470.0)/470.0,vP.y/270.0)));
          vec3 c = cosmicField(p, uTime);
          gl_FragColor = vec4(c * 1.35, aperture * edge * 0.82);
        }`,
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.z = -145;
    this.group.add(portal, mesh, ghost, swarm);
    this.cleanup.push(() => { portalGeo.dispose(); portalMat.dispose(); });
    this.cleanup.push(() => { geo.dispose(); mat.dispose(); ghostMat.dispose(); swarm.geometry.dispose(); swarm.material.dispose(); });
    this.scene.add(this.group);
    this.bindDrag();
    if (import.meta.env.DEV) (window as unknown as { __logo3d: unknown }).__logo3d = { mesh, ghost, mat, U: this.U, renderer: this.renderer };
  }

  // ---------- interaction: drag to rotate, position locked ----------
  private bindDrag() {
    const el = this.root;
    const down = (e: PointerEvent) => {
      if (!this.unlocked || (e.target as Element).closest('a, button, input, textarea, select')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; this.lastInteract = this.nowT;
      el.classList.add('is-dragging');
      el.dispatchEvent(new CustomEvent('infin8x:rotated', { bubbles: true }));
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY; this.lastX = e.clientX; this.lastY = e.clientY;
      const touch = e.pointerType !== 'mouse';
      this.vYaw = dx * 0.0062; this.vPitch = touch ? 0 : dy * 0.0055;
      this.yaw += this.vYaw; this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch + this.vPitch));
      this.lastInteract = this.nowT;
    };
    const up = () => { if (!this.dragging) return; this.dragging = false; el.classList.remove('is-dragging'); this.lastInteract = this.nowT; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    this.cleanup.push(() => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); });
  }

  /** Pre-compile the tunnel and the glass shaders (no first-frame stall that would make the intro jump ahead). */
  async warmup() {
    await this.tunnel.warmup();
    try { await this.renderer.compileAsync(this.scene, this.camera); } catch { this.renderer.compile(this.scene, this.camera); }
  }

  layout(w: number, h: number, k: number, ox: number, oy: number) {
    this.w = w; this.h = h; this.k = k; this.ox = ox; this.oy = oy;
    this.renderer.setSize(w, h, false);
    const cam = this.camera, visH = h / k;
    cam.aspect = w / h; cam.updateProjectionMatrix();
    this.tunnel.resize(w, h);
    const D = visH / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // place the camera so artwork px (x, y, z=0) lands exactly where the 2D layout puts it
    const cx = (w / 2 - ox) / k - CX, cy = CY - (h / 2 - oy) / k;
    cam.position.set(cx, cy, D); cam.lookAt(cx, cy, 0); cam.updateMatrixWorld();
    this.U.uRef.value = D * 0.9;
  }

  update(s: HeroState, t: number, dt: number, sx: number, sy: number) {
    this.nowT = t;
    const U = this.U;
    U.uMorph.value = s.morph; U.uTime.value = this.reduced ? 0 : t; U.uLF.value = s.leftForm; U.uRF.value = s.rightForm; U.uLit.value = s.lit;
    U.uFlow.value = this.reduced ? 0 : FLOW_SPEED;
    U.uSpecGlow.value = 0.045 + 0.065 * s.lit + 0.12 * s.spill;
    U.uImpact.value = s.impact; U.uTrace.value = s.ghostTrace;
    // swarm: bursts out of the X on impact, gathers onto the loop just ahead of the light, then lingers as an aura
    if (s.pen >= 1) this.penPost += dt; else this.penPost = 0;
    U.uF.value = s.pen <= 0 ? -1 : s.pen + this.penPost / 3;
    U.uAura.value = Math.max(0, 1 - 0.7 * s.lit - 0.3 * s.morph); U.uGhost.value = 0;
    const decay = Math.exp(-dt / 0.45);
    U.uHeatL.value = s.leftForm > 0 && s.leftForm < 1 ? 1 : U.uHeatL.value * decay;
    U.uHeatR.value = s.rightForm > 0 && s.rightForm < 1 ? 1 : U.uHeatR.value * decay;
    if (s.finish > 0 && s.finish < 1) { U.uGlintU.value = (SPLIT + s.finish) % 1; U.uGlint.value = Math.sin(Math.PI * s.finish) * 0.8; }
    else if (s.scrub >= 0) { U.uGlintU.value = (SPLIT + s.scrub) % 1; U.uGlint.value = 1; }
    else if (s.idle > 0) { U.uGlintU.value = (SPLIT + t / 30) % 1; U.uGlint.value = 0.45 * s.idle; }
    else U.uGlint.value = 0;

    // rotation: locked during the intro, free after; eases home when idle or when the page scrolls
    if (!this.unlocked && s.idle > 0.6) { this.unlocked = true; this.showcase = this.reduced ? 0 : 0.0001; }
    if (this.showcase > 0 && this.showcase < 1) {
      this.showcase = Math.min(1, this.showcase + dt / 3.2);
      const e = this.showcase;
      if (!this.dragging && this.nowT - this.lastInteract > 1) this.yaw = Math.sin(e * Math.PI) * 0.42 * (1 - e * 0.3);
    }
    if (!this.dragging) {
      const damp = Math.exp(-dt * 3.2);
      this.vYaw *= damp; this.vPitch *= damp;
      this.yaw += this.vYaw; this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch + this.vPitch));
      const home = s.scrub > 0.01 || (this.nowT - this.lastInteract > 6 && (this.showcase === 0 || this.showcase >= 1));
      if (home) {
        const k = 1 - Math.exp(-dt * (s.scrub > 0.01 ? 4 : 1.6));
        this.yaw -= Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2 * k; // take the short way home
        this.yaw += (0 - this.yaw) * k; this.pitch += (0 - this.pitch) * k;
      }
    }
    // ∞ → 8: rotate upright, shrink and glide into the wordmark slot (position otherwise locked)
    const m = s.morph * s.morph * (3 - 2 * s.morph);
    if (this.eightSlot && m > 0) {
      const tx = (this.eightSlot.cx - this.ox) / this.k - CX, ty = CY - (this.eightSlot.cy - this.oy) / this.k;
      const sc = this.eightSlot.h / (this.k * 1830);
      this.group.position.set(tx * m, ty * m, 0);
      this.group.scale.setScalar(1 + (sc - 1) * m);
    } else { this.group.position.set(0, 0, 0); this.group.scale.setScalar(1); }
    let introYaw = 0, introPitch = 0;
    if (!this.unlocked && !this.reduced) {
      const f = Math.min(1, (s.leftForm + s.rightForm) / 2);
      const settle = 1 - m;
      introYaw = (0.62 * (1 - f) - 0.22 * Math.sin(f * Math.PI)) * settle;
      introPitch = (-0.24 + 0.34 * f) * settle;
    }
    this.group.rotation.set((this.pitch + introPitch) * (1 - 0.6 * m), this.yaw + introYaw, (Math.PI / 2) * m, 'YXZ');
    this.group.updateMatrixWorld();

    // pointer light: a real light the cursor moves over the glass
    this.ptr.a += (this.ptr.ta * s.idle - this.ptr.a) * (1 - Math.exp(-dt * 4));
    this.v.set((this.ptr.x / this.w) * 2 - 1, -(this.ptr.y / this.h) * 2 + 1, 0.5).unproject(this.camera);
    const dir = this.v.sub(this.camera.position).normalize();
    const dist = (380 - this.camera.position.z) / dir.z;
    this.ptrLight.position.copy(this.camera.position).addScaledVector(dir, dist);
    this.ptrLight.intensity = 2.4 * this.ptr.a;

    if (sx !== this.shakeX || sy !== this.shakeY) {
      this.shakeX = sx; this.shakeY = sy;
      this.canvas.style.transform = sx || sy ? `translate(${sx}px, ${sy}px)` : '';
    }
    // metal tunnel first (own scene / tone mapping), then the logo over it — one context, one canvas
    // the background filaments stream into the X while the light falls, then release as the X bursts
    const lvl = { a: 0.6 + 0.4 * Math.max(s.ambient, s.lit), neb: 0.45 + 0.55 * Math.max(s.ambient, s.spill), pull: 0 };
    this.tunnel.render(this.nowT * 1000, dt, lvl);
    this.renderer.render(this.scene, this.camera);
  }

  private toScreen(x: number, y: number, z: number, out: Pt) {
    this.v.set(x, y, z).applyMatrix4(this.group.matrixWorld).project(this.camera);
    out.x = (this.v.x * 0.5 + 0.5) * this.w; out.y = (-this.v.y * 0.5 + 0.5) * this.h;
    return out;
  }
  project(u: number, out: Pt) { pointAt(u, out); return this.toScreen(out.x - CX, CY - out.y, zAt(u), out); }
  projectArt(ax: number, ay: number, out: Pt) { return this.toScreen(ax - CX, CY - ay, 0, out); }
  frontness() { return Math.cos(this.yaw) * Math.cos(this.pitch); }
  pointer(x: number, y: number, inside: boolean) { this.ptr.x = x; this.ptr.y = y; this.ptr.ta = inside ? 1 : 0; this.tunnel.pointer(x / this.w, y / this.h); }
  busy() { return this.dragging || Math.abs(this.vYaw) > 1e-4 || Math.abs(this.vPitch) > 1e-4 || Math.abs(this.yaw) > 1e-3 || Math.abs(this.pitch) > 1e-3; }
  settle() { this.U.uHeatL.value = 0; this.U.uHeatR.value = 0; }
  dispose() { this.cleanup.forEach((f) => f()); this.tunnel.dispose(); this.renderer.dispose(); }
}
