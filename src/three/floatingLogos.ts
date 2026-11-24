/**
 * Floating 3D logos for the site background (lives inside the light field's scene, so it shares its light, depth of
 * field, fog and particles). Each mark is the official glyph from Simple Icons (as used in the skills list), extruded
 * into a solid; the code symbol `</>` is a generic glyph drawn here.
 *
 * Life of a logo: it materialises from noise → floats and tumbles slowly for a while → disintegrates (a glowing
 * dissolve edge eats through it while its fragments leave as particles) → reappears somewhere else.
 * Logos lean to the sides of the frame, away from the reading column.
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { siReact, siJavascript, siTypescript, siPython, siNodedotjs, siThreedotjs, siGit, siDocker } from 'simple-icons';

/** emit(x, y, z, nx, ny, nz, count): releases dispersal particles at a point, leaving along a direction */
export type Emit = (x: number, y: number, z: number, nx: number, ny: number, nz: number, count: number) => void;

interface Mark { path: string; hex: string }
const CODE_SYMBOL: Mark = {
  // `</>`: two chevrons and a slash, 24×24 like the Simple Icons glyphs
  path: 'M7.4 5.6 8.8 7 3.8 12l5 5-1.4 1.4L1 12Zm9.2 0L23 12l-6.4 6.4-1.4-1.4 5-5-5-5ZM13.6 3.5l1.9.5-5.1 16.5-1.9-.5Z',
  hex: '9FC4FF',
};
const MARKS: Mark[] = [siReact, siJavascript, siTypescript, siPython, siNodedotjs, siThreedotjs, siGit, siDocker, CODE_SYMBOL, CODE_SYMBOL]
  .map((m) => ({ path: m.path, hex: m.hex }));

/** SVG path (24×24, y down) → centred extruded solid about 1 unit across. */
function markGeometry(path: string): THREE.BufferGeometry {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}"/></svg>`);
  const shapes: THREE.Shape[] = [];
  data.paths.forEach((p) => shapes.push(...SVGLoader.createShapes(p)));
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 2, curveSegments: 10 });
  g.scale(1, -1, 1);                                                   // SVG y runs down
  g.center();
  g.computeBoundingBox();
  const s = g.boundingBox!.getSize(new THREE.Vector3());
  g.scale(1 / Math.max(s.x, s.y), 1 / Math.max(s.x, s.y), 1 / Math.max(s.x, s.y));
  g.computeVertexNormals();
  return g;
}

const NOISE_GLSL = /* glsl */ `
float dh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dh(i), dh(i + vec3(1, 0, 0)), f.x), mix(dh(i + vec3(0, 1, 0)), dh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(dh(i + vec3(0, 0, 1)), dh(i + vec3(1, 0, 1)), f.x), mix(dh(i + vec3(0, 1, 1)), dh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

interface Live {
  mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; dissolve: { value: number }; edge: { value: THREE.Color };
  x: number; y: number; z0: number; rot: THREE.Euler; spin: THREE.Vector3; size: number;
  phase: 'in' | 'float' | 'out' | 'wait'; t: number; hold: number;
}

export function createFloatingLogos(scene: THREE.Scene, opts: { count: number; far: number; near: number; depth: number; camZ: number; emit: Emit }) {
  const geos = new Map<string, THREE.BufferGeometry>();
  const geoFor = (m: Mark) => { let g = geos.get(m.path); if (!g) { g = markGeometry(m.path); geos.set(m.path, g); } return g; };
  const rnd = Math.random;
  const live: Live[] = [];
  let travelNow = 0;                                                  // field travel at the latest update (spawn depth is relative to it)
  const tmp = new THREE.Vector3(), lightCol = new THREE.Color(1, 1, 1);

  for (let i = 0; i < opts.count; i++) {
    const mark = MARKS[i % MARKS.length];
    const brand = new THREE.Color(`#${mark.hex}`);
    const dissolve = { value: 1 }, edge = { value: new THREE.Color() };
    const mat = new THREE.MeshPhysicalMaterial({
      color: brand.clone().multiplyScalar(0.55).lerp(new THREE.Color(0x1a2130), 0.35),
      metalness: 0.4, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.2,   // satin: faces catch the light without burning out
      iridescence: 0.35, iridescenceIOR: 1.35, envMapIntensity: 1.0,
      emissive: brand, emissiveIntensity: 0.2,
    });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDissolve = dissolve; sh.uniforms.uEdge = edge;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vLocal; uniform float uDissolve; uniform vec3 uEdge;\n${NOISE_GLSL}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          // broad noise (two soft octaves): the logo breaks into large flowing patches, never a fine mosaic
          float dn = dnoise(vLocal * 3.2) * 0.7 + dnoise(vLocal * 8.5) * 0.3;
          if (dn < uDissolve) discard;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float burn = 1.0 - smoothstep(uDissolve, uDissolve + 0.12, dn);
          float rimGlow = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
          totalEmissiveRadiance += uEdge * (burn * burn * step(0.001, uDissolve) * 2.6 + rimGlow * 0.4);`);
    };
    const mesh = new THREE.Mesh(geoFor(mark), mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    const l: Live = { mesh, mat, dissolve, edge, x: 0, y: 0, z0: 0, rot: new THREE.Euler(), spin: new THREE.Vector3(), size: 1, phase: 'wait', t: 0, hold: 0 };
    spawn(l, i * 1.7);
    live.push(l);
  }

  function spawn(l: Live, delay: number) {
    const side = rnd() < 0.5 ? -1 : 1;
    l.x = side * (0.16 + rnd() * 0.3);                                  // normalised; scaled by distance like the particle clouds
    l.y = (rnd() - 0.5) * 0.7;
    // start a little behind the focus plane (≈9 units from the camera) so each logo drifts through focus while it lives
    l.z0 = opts.camZ - (13 + rnd() * 6) - travelNow;
    l.rot.set((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 0.5);
    l.spin.set((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.08);
    l.size = 1.25 + rnd() * 0.6;
    l.phase = 'wait'; l.t = -delay; l.hold = 8 + rnd() * 6;
    l.dissolve.value = 1;
  }

  return {
    /** dev check: bring every logo in now, floating */
    showAll() { live.forEach((l) => { l.phase = 'float'; l.t = 0; l.hold = 999; l.dissolve.value = 0; l.z0 = opts.camZ - (9 + rnd() * 4) - travelNow; }); },
    /** dev check: hold every logo part-way through its disintegration */
    dissolveAll(k: number) { live.forEach((l) => { l.phase = 'out'; l.t = k * 2.6; l.z0 = opts.camZ - 10 - travelNow; }); },
    update(dt: number, time: number, travel: number, aspect: number, light: THREE.Color) {
      lightCol.copy(light); travelNow = travel;
      for (const l of live) {
        l.t += dt;
        const z = l.z0 + travel;
        const dist = Math.max(opts.camZ - z, 1);
        const hw = dist * 0.62 * aspect + 1.5, hh = dist * 0.5 + 1;
        const x = l.x * 2 * hw, y = l.y * 2 * hh + 0.3 * Math.sin(time * 0.35 + l.z0);
        if (l.phase === 'wait') { l.dissolve.value = 1; if (l.t >= 0) { l.phase = 'in'; l.t = 0; } }
        else if (l.phase === 'in') { l.dissolve.value = 1 - THREE.MathUtils.smootherstep(l.t, 0, 1.8); if (l.t > 1.8) { l.phase = 'float'; l.t = 0; } }
        else if (l.phase === 'float') { l.dissolve.value = 0; if (l.t > l.hold || z > opts.near - 4) { l.phase = 'out'; l.t = 0; } }
        else if (l.phase === 'out') {
          const k = THREE.MathUtils.smootherstep(l.t, 0, 2.6);
          l.dissolve.value = k;
          // fragments leave from the burning edge as the logo disintegrates
          if (k > 0.02 && k < 0.98 && rnd() < 0.85) {
            tmp.set((rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5) * 0.3).multiplyScalar(l.size).applyEuler(l.mesh.rotation);
            opts.emit(x + tmp.x, y + tmp.y, z + tmp.z, tmp.x * 1.4, tmp.y * 1.4 + 0.15, tmp.z * 1.4, 2);
          }
          if (l.t > 2.7) { spawn(l, 1 + rnd() * 3); continue; }
        }
        if (z > opts.near) { spawn(l, 0.5); continue; }
        l.mesh.position.set(x, y, z);
        l.mesh.rotation.set(l.rot.x + l.spin.x * time, l.rot.y + l.spin.y * time, l.rot.z + l.spin.z * time);
        l.mesh.scale.setScalar(l.size);
        l.mesh.visible = l.dissolve.value < 0.999;
        // closer to the glass (the camera) → brighter body and edge, so it shows through the frosted layer
        const near = THREE.MathUtils.smoothstep(z, opts.camZ - 12, opts.camZ - 4);
        l.mat.emissiveIntensity = 0.2 + 0.6 * near;
        l.edge.value.copy(lightCol).lerp((l.mat.emissive as THREE.Color), 0.35).multiplyScalar(1 + 1.6 * near);
      }
    },
    dispose() {
      live.forEach((l) => { scene.remove(l.mesh); l.mat.dispose(); });
      geos.forEach((g) => g.dispose());
    },
  };
}
