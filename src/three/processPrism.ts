/**
 * Process section — a fixed, physically based glass prism telling the six steps with light:
 * 01 white light enters · 02 the prism disperses it · 03–04 the spectrum fans out and runs in parallel ·
 * 05 a loop-back arc carries the colours back for review · 06 everything recombines into one bright point (Live).
 * Driven by a time-based progress value (0..1) set from outside; light keeps flowing once complete.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SPECTRUM = ['#FF2D55', '#FF8A1F', '#FFD60A', '#2EE88A', '#1EA7FF', '#6A4BFF', '#C23BFF'];
const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

const BEAM_VS = /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  uniform vec3 uColor; uniform float uP, uFlow, uA, uHalo;
  void main(){
    float along = vUv.x;
    if (along > uP + 0.002) discard;
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float core = mix(pow(facing, 3.0), pow(1.0 - facing, 1.5) * 0.6 + 0.2, uHalo);
    float pulse = 0.7 + 0.3 * sin(along * 40.0 - uFlow * 7.0);
    float head = exp(-pow((along - uP) / 0.018, 2.0)) * step(uP, 0.999);
    vec3 col = uColor * core * pulse * uA + vec3(1.0) * head * 1.6 * uA;
    gl_FragColor = vec4(col, 1.0);
  }`;

function beam(curve: THREE.Curve<THREE.Vector3>, color: THREE.Color, radius: number, halo = false) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color }, uP: { value: 0 }, uFlow: { value: 0 }, uA: { value: halo ? 0.22 : 1 }, uHalo: { value: halo ? 1 : 0 } },
  });
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 160, radius, 10, false), mat);
}

export interface ProcessPrismHandle { setProgress(p: number): void; dispose(): void }

export function startProcessPrism(canvas: HTMLCanvasElement, reduced: boolean): ProcessPrismHandle | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x030a18, 1);   // opaque: additive light must never punch alpha holes into the page
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2.4, 0.1, 100);
  camera.position.set(0.6, 0.35, 15); camera.lookAt(0.6, 0.25, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  scene.add(new THREE.DirectionalLight(0xffffff, 2).translateX(-4).translateY(6).translateZ(8));
  const rim = new THREE.PointLight(0xffb070, 25, 0, 2); rim.position.set(-6, -2, -3); scene.add(rim);
  const rim2 = new THREE.PointLight(0x9cc6ff, 25, 0, 2); rim2.position.set(6, 2, -3); scene.add(rim2);

  // glass prism (bevelled, physically based transmission with dispersion)
  const s = 1.9, h = (s * Math.sqrt(3)) / 2, shape = new THREE.Shape();
  shape.moveTo(0, (2 * h) / 3); shape.lineTo(-s / 2, -h / 3); shape.lineTo(s / 2, -h / 3); shape.closePath();
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 6, curveSegments: 1 });
  pg.translate(0, 0, -0.9); pg.computeVertexNormals();
  const prism = new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 1.4, ior: 1.52, dispersion: 6, clearcoat: 1, clearcoatRoughness: 0.02,
    envMapIntensity: 2.2, attenuationColor: new THREE.Color(0xf2f4ff), attenuationDistance: 10, iridescence: 0.25,
  }));
  const PX = -3.6; prism.position.set(PX, 0.15, 0); prism.rotation.y = -0.32; scene.add(prism);
  const glowLight = new THREE.PointLight(0xffffff, 0, 3, 2); glowLight.position.set(PX, 0.15, 0.6); scene.add(glowLight);

  const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  const entry = V(PX - 0.45, 0.2), exit = V(PX + 0.45, 0.2);
  const parts: { mesh: THREE.Mesh; at: (p: number) => number }[] = [];
  const add = (curve: THREE.Curve<THREE.Vector3>, color: THREE.Color, r: number, at: (p: number) => number) => {
    for (const halo of [false, true]) { const m = beam(curve, color, halo ? r * 5 : r, halo); scene.add(m); parts.push({ mesh: m, at }); }
  };
  const white = new THREE.Color(1, 1, 1);
  add(new THREE.LineCurve3(V(-11, 1.0), entry), white, 0.035, (p) => seg(p, 0, 0.14));                     // 01 client idea
  add(new THREE.LineCurve3(entry, exit), new THREE.Color(0.95, 0.95, 1), 0.03, (p) => seg(p, 0.12, 0.18)); // inside the glass
  SPECTRUM.forEach((hex, i) => {
    const y = 1.15 - i * 0.38, c = new THREE.Color(hex);
    const path = new THREE.CatmullRomCurve3([exit, V(PX + 1.6, 0.2 + y * 0.35), V(-0.6, y), V(1.4, y), V(2.9, y), V(4.6, y * 0.35), V(5.7, 0.05)], false, 'centripetal');
    // 02–04 fan + run parallel to ~x=2.9 (62% of the path), 06 then converge
    add(path, c, 0.028, (p) => seg(p, 0.16, 0.62) * 0.66 + seg(p, 0.78, 0.94) * 0.34);
  });
  // 05 feedback: the colours loop back for review (gradient arc)
  const arc = new THREE.CatmullRomCurve3([V(2.9, 1.4), V(2.7, 2.7), V(1.5, 3.1), V(0.3, 2.7), V(0.1, 1.4)], false, 'centripetal');
  SPECTRUM.forEach((hex, i) => {
    const off = (i - 3) * 0.07, c = new THREE.Color(hex);
    const a2 = new THREE.CatmullRomCurve3(arc.points.map((pt) => pt.clone().add(V(0, off * (pt.y > 2 ? 1 : 0.4), 0))), false, 'centripetal');
    add(a2, c, 0.018, (p) => seg(p, 0.6, 0.78));
  });
  // recombined point
  const pointMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform float uA, uT; void main(){ vec2 d = (vUv - .5) * 2.0; float r = length(d);
      float core = exp(-r * r * 40.0), halo = exp(-r * 3.2) * .35, streak = exp(-abs(d.y) * 60.0) * exp(-abs(d.x) * 2.0) * .6;
      gl_FragColor = vec4(vec3(1.0, .97, .94) * (core + halo + streak) * uA * (0.9 + 0.1 * sin(uT * 3.0)), 1.0); }`,
  });
  const point = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), pointMat);
  point.position.set(5.7, 0.05, 0.1); scene.add(point);

  let progress = reduced ? 1 : 0, flow = 0, raf = 0, last = performance.now(), visible = true;
  const resize = () => {
    const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), hh = Math.max(1, r.height);
    renderer.setSize(w, hh, false); camera.aspect = w / hh;
    camera.position.z = w / hh < 1.4 ? 22 : 15; camera.updateProjectionMatrix();
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    flow += dt * (reduced ? 0 : 1);
    const p = progress;
    for (const { mesh, at } of parts) { const u = (mesh.material as THREE.ShaderMaterial).uniforms; u.uP.value = at(p); u.uFlow.value = flow; }
    glowLight.intensity = 6 * seg(p, 0.12, 0.2);
    pointMat.uniforms.uA.value = seg(p, 0.86, 0.98); pointMat.uniforms.uT.value = now / 1000;
    prism.rotation.y = -0.32 + Math.sin(now / 4000) * 0.04;
    renderer.render(scene, camera);
  };
  resize(); addEventListener('resize', resize);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(canvas);
  raf = requestAnimationFrame(frame);
  return {
    setProgress(p) { progress = p; },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', resize); renderer.dispose(); },
  };
}
