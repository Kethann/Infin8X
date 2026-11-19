import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base);
  const { samples, brighteningPixels, opening } = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const { createAuroraCurtain } = await import('/src/hero/auroraCurtain.ts');
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 0);
    const target = new THREE.WebGLRenderTarget(256, 144);
    const curtain = createAuroraCurtain(false);
    const material = curtain.scene.children[0].material;
    curtain.layout(256, 144, 128, 64, 200, 68, 110, 256, 144);
    const pixels = new Uint8Array(256 * 144 * 4);
    // Check the complete, graded field: neither grain, stars nor edge fibres
    // should leak a bright first frame before the opening has begun.
    const opening = [0, 0.001, 0.01, 0.025, 0.1, 0.5, 1].map(aurora => {
      curtain.update(40, 40, { aurora, rush: 0, flash: 0, calm: 0, trace: 0 });
      renderer.setRenderTarget(target);
      renderer.render(curtain.scene, curtain.camera);
      renderer.readRenderTargetPixels(target, 0, 0, 256, 144, pixels);
      let total = 0, alpha = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        total += pixels[i] + pixels[i+1] + pixels[i+2];
        alpha = Math.max(alpha, pixels[i+3]);
      }
      return { aurora, total, alpha };
    });
    // Render the actual absorption shader independently of the sky and logo so
    // persistent ambient light cannot hide a returning trail in the regression check.
    material.fragmentShader = material.fragmentShader.split('void main(){')[0] + `
      void main(){
        vec2 q=(vUv-0.5)*vec2(uAspect,1.0)-uAbsorb;
        vec3 c=fan(q,0.0,uTime)+fan(q,0.5,uTime)+fan(q,1.0,uTime);
        gl_FragColor=vec4(c,1.0);
      }`;
    material.needsUpdate = true;
    curtain.layout(256, 144, 128, 64, 200, 68, 110, 256, 144);
    const sample = (trace, time) => {
      curtain.update(time, time * 2, { aurora: 1, rush: trace < 1 ? 1 : 0, flash: 0, calm: trace, trace });
      renderer.setRenderTarget(target);
      renderer.render(curtain.scene, curtain.camera);
      renderer.readRenderTargetPixels(target, 0, 0, 256, 144, pixels);
      let total = 0, edge = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const light = pixels[i] + pixels[i + 1] + pixels[i + 2];
        total += light;
        const x = (i / 4) % 256;
        if (x < 32 || x >= 224) edge += light;
      }
      return { trace, time, total, edge };
    };
    const result = [sample(0, 40), sample(0.35, 40), ...[40, 45, 70, 160].map(time => sample(1, time))];
    for (const [x,y] of [[48,40],[220,90]]) {
      curtain.focus(x,y);
      result.push(sample(1,180));
    }
    curtain.focus(128,64);
    // Freeze the flowing texture and advance absorption alone: a consuming trail
    // must fade at every pixel, without a bright rim or a fresh patch appearing.
    let previous;
    let brighteningPixels = 0;
    for (const trace of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 1]) {
      sample(trace, 40);
      if (previous) for (let i = 0; i < pixels.length; i += 4) {
        if ([0, 1, 2].some(channel => pixels[i + channel] > previous[i + channel] + 1)) brighteningPixels++;
      }
      previous = pixels.slice();
    }
    curtain.dispose(); target.dispose(); renderer.dispose();
    return { samples: result, brighteningPixels, opening };
  });
  assert.equal(opening[0].total, 0, 'No visible energy at the start');
  assert.equal(opening[0].alpha, 0, 'The opening starts seamlessly over the page background');
  for (const frame of opening.slice(1, 4)) {
    assert.ok(frame.alpha < 3, 'No opacity jump in the earliest energy frames');
    assert.ok(frame.total < opening.at(-1).total * 0.001, 'The first energy emerges gently');
  }
  assert.equal(opening.at(-1).alpha, 255, 'The full atmosphere is restored before formation');
  assert.ok(samples[0].total > 10000, 'Absorption trails render before they are consumed');
  assert.ok(samples[1].edge < samples[0].edge * 0.5, 'Outer trails are already absorbed during early formation');
  for (const sample of samples.slice(2)) assert.equal(sample.total, 0, `No trail reappears at time ${sample.time}`);
  assert.equal(brighteningPixels, 0, 'Absorption fades uniformly without a bright moving edge');
  assert.deepEqual(errors, []);
  console.log('PASS: uniform inward fading without a bright moving edge; no reappearing trails through 120 seconds after completion.', samples);
} finally {
  await browser.close();
}
