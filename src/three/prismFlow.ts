/**
 * Site-wide live background (fixed behind every section after the hero): a 3D sheet of fine dots that
 * undulates and twists into a funnel — like a particle wave. Scroll position drives the shape (phase, twist,
 * camera), scroll speed adds energy, and the active section's accent tints the crests. Time keeps it alive.
 * (File name kept for history; it used to hold the floating glass prism, now in the Process section.)
 */
import * as THREE from 'three';

export interface PrismFlowHandle { setProgress(p: number, velocity: number): void; setVisible(v: number): void; setDim(d: number): void; setAccent(hex: string): void; dispose(): void }

export function startPrismFlow(canvas: HTMLCanvasElement, opts: { quality: 'high' | 'low'; reduced: boolean }): PrismFlowHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.quality === 'high' ? 1.5 : 1.25));
  renderer.setClearColor(0x020611, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);

  const COLS = opts.quality === 'high' ? 230 : 130, ROWS = opts.quality === 'high' ? 130 : 80;
  const n = COLS * ROWS, grid = new Float32Array(n * 3);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    grid.set([(c / (COLS - 1) - 0.5) * 30, 0, -(r / (ROWS - 1)) * 26 + 4], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(grid, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uP: { value: 0 }, uE: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uAccent: { value: new THREE.Color('#4D7CFF') } },
    vertexShader: /* glsl */ `uniform float uT, uP, uE, uPx; varying float vA; varying float vCrest;
      void main(){
        vec3 p = position;
        float ph = uT * 0.35 + uP * 7.0;
        // layered waves + a travelling vortex funnel whose position and twist follow the scroll
        float w = sin(p.x * 0.32 + ph) * cos(p.z * 0.24 - ph * 0.7) * (1.1 + uE);
        w += sin(p.x * 0.11 - p.z * 0.18 + ph * 0.6) * 0.9;
        float fx = sin(uP * 6.2831 * 0.75) * 7.0, fz = -9.0 + cos(uP * 6.2831 * 0.5) * 3.0;
        float r = length(vec2(p.x - fx, (p.z - fz) * 1.2));
        float funnel = exp(-r * r / 18.0);
        float ang = funnel * (2.4 + uP * 2.0) + uT * 0.1;
        vec2 q = vec2(p.x - fx, p.z - fz);
        q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
        p.x = q.x + fx; p.z = q.y + fz;
        p.y = w - funnel * (4.5 + uE * 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(2.1 * uPx * (9.0 / -mv.z), 1.0, 3.8 * uPx);
        vCrest = smoothstep(0.4, 1.8, w) + funnel * 0.6;
        vA = smoothstep(-22.0, -6.0, p.z) * smoothstep(5.0, 1.0, p.z) * (0.35 + 0.65 * vCrest);
      }`,
    fragmentShader: /* glsl */ `uniform vec3 uAccent; varying float vA; varying float vCrest;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        vec3 c = mix(vec3(0.62, 0.68, 0.78), mix(vec3(0.85, 0.92, 1.0), uAccent, 0.45), clamp(vCrest, 0.0, 1.0));
        gl_FragColor = vec4(c * smoothstep(0.5, 0.1, d) * vA * 1.35, 1.0); }`,
  });
  const dots = new THREE.Points(geo, mat);
  dots.frustumCulled = false;
  scene.add(dots);

  let progress = 0, velocity = 0, energy = 0, vis = 0, visT = 0, dim = 1, dimT = 1, raf = 0, last = performance.now(), running = true;
  const accent = new THREE.Color('#4D7CFF'), accentT = new THREE.Color('#4D7CFF');
  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    vis += (visT - vis) * (1 - Math.exp(-dt * 3)); dim += (dimT - dim) * (1 - Math.exp(-dt * 3));
    canvas.style.opacity = (vis * dim).toFixed(3);
    if (!running || document.hidden || vis < 0.01) return;
    velocity *= Math.exp(-dt * 2.5);
    energy += (Math.min(1.5, Math.abs(velocity) * 0.0009) - energy) * (1 - Math.exp(-dt * 4));
    accent.lerp(accentT, 1 - Math.exp(-dt * 2));
    const u = mat.uniforms;
    u.uT.value = opts.reduced ? 0 : now / 1000; u.uP.value += (progress - u.uP.value) * (1 - Math.exp(-dt * 5)); u.uE.value = energy; u.uAccent.value.copy(accent);
    const p = u.uP.value;
    camera.position.set(Math.sin(p * Math.PI * 1.5) * 3, 3.2 + Math.cos(p * Math.PI) * 1.2, 7.5);
    camera.lookAt(Math.sin(p * Math.PI * 1.5) * 1.5, -0.8, -8);
    renderer.render(scene, camera);
  };
  resize(); addEventListener('resize', resize);
  const onVis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);
  return {
    setProgress(p, v) { progress = p; velocity = v; },
    setVisible(v) { visT = v; },
    setDim(d) { dimT = Math.max(d, 0.5); },
    setAccent(hex) { try { accentT.set(hex.trim() || '#4D7CFF'); } catch { /* ignore bad colour */ } },
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); geo.dispose(); renderer.dispose(); },
  };
}
