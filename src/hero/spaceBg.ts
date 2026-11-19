/**
 * Hero backdrop — restraint. A near-black field with fine, slow dust at several depths (a little depth of field
 * on the nearest motes). Nothing competes with the light that draws the mark.
 * Drawn inside the logo's WebGL context (see logo3d.ts) — one context for the whole hero.
 */
import * as THREE from 'three';
import { COSMIC_GLSL } from './cosmicField';

export interface Level { a: number; neb: number; pull: number; xNdc?: [number, number] }
export interface MetalTunnel { warmup(): Promise<void>; render(now: number, dt: number, level: Level): void; resize(w: number, h: number): void; pointer(x: number, y: number): void; dispose(): void }

export function createMetalTunnel(renderer: THREE.WebGLRenderer, reduced: boolean): MetalTunnel {
  const mobile = innerWidth < 768;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  const skyGeo = new THREE.PlaneGeometry(2, 2);
  const skyMat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, uLevel: { value: 0.6 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.999,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime, uAspect, uLevel;
${COSMIC_GLSL}
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect,1.0);
        float cloudBand = exp(-pow((p.y + p.x * 0.23) * 3.8,2.0));
        float vignette = 1.0 - smoothstep(0.25,1.1,length(p * vec2(0.65,1.0)));
        vec3 nebula = cosmicField(p * 3.4 + vec2(4.0,1.0), uTime * 0.3);
        // Dark centre preserves the title; light gathers at the sides.
        float centre = 0.35 + 0.65 * smoothstep(0.1,0.65,abs(p.x));
        vec3 col = vec3(0.003,0.007,0.019) + nebula * cloudBand * vignette * centre * uLevel * 0.36;
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const N = mobile ? 700 : 1500;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, 8 - Math.random() * 34], i * 3); seed[i] = Math.random(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPx: { value: Math.min(devicePixelRatio || 1, 2) }, uA: { value: 1 } },
    vertexShader: /* glsl */ `attribute float aSeed; uniform float uT, uPx; varying float vA; varying float vBlur;
      void main(){ vec3 p = position;
        p.x += uT * 0.035 * (aSeed - 0.45); p.y += sin(uT * 0.08 + aSeed * 40.0) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float depth = -mv.z, near = clamp((7.0 - depth) / 5.0, 0.0, 1.0);   // only the closest motes go soft
        gl_PointSize = ((0.55 + aSeed * 0.8) * (13.0 / depth) + near * near * 10.0) * uPx;
        vA = (0.25 + 0.75 * pow(abs(sin(uT * (0.25 + aSeed * 0.6) + aSeed * 90.0)), 2.0)) * mix(0.75, 0.14, near) * smoothstep(-26.0, -10.0, p.z);
        vBlur = near; }`,
    fragmentShader: /* glsl */ `varying float vA; varying float vBlur; uniform float uA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float a = mix(pow(1.0 - d, 2.4), (1.0 - smoothstep(0.75, 1.0, d)) * 0.6, vBlur);
        gl_FragColor = vec4(vec3(0.72, 0.84, 1.0) * a * vA * uA * 0.8, 1.0); }`,
  });
  scene.add(new THREE.Points(geo, mat));

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  return {
    async warmup() { try { await renderer.compileAsync(scene, camera); } catch { renderer.compile(scene, camera); } },
    resize(w, h) { skyMat.uniforms.uAspect.value = w / Math.max(1, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); },
    pointer(x, y) { tmx = x - 0.5; tmy = y - 0.5; },
    render(now, _dt, L) {
      mat.uniforms.uT.value = reduced ? 0 : now / 1000;
      skyMat.uniforms.uTime.value = mat.uniforms.uT.value; skyMat.uniforms.uLevel.value = 0.55 + 0.45 * L.neb;
      mat.uniforms.uA.value = 0.5 + 0.5 * L.a;
      mx += (tmx - mx) * 0.02; my += (tmy - my) * 0.02;
      camera.position.set(mx * 0.6, -my * 0.4, 12); camera.lookAt(0, 0, -6);
      const tm = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x010309, 1); renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.toneMapping = tm; renderer.clearDepth();
    },
    dispose() { geo.dispose(); mat.dispose(); skyGeo.dispose(); skyMat.dispose(); },
  };
}
