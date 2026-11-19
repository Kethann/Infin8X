import { useEffect, useRef, useState } from 'react';
import palette from '../brand/flowPalette.json';
import { useReducedMotion } from '../lib/useReducedMotion';
import { Mark } from './Mark';

const smooth = (a: number, b: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const linear = (value: number) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const srgb = (value: number) => Math.round(255 * Math.min(1, value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055));
// Same linear-light palette as the 3D ribbon, sampled once instead of per pixel/frame.
const spectrum = new Float32Array(2048 * 3);
for (let index = 0; index < 2048; index++) {
  const phase = index / 2048;
  const stop = palette.findIndex((_, i) => phase < (palette[i + 1]?.position ?? 1));
  const a = palette[stop], b = palette[(stop + 1) % palette.length];
  const mix = smooth(a.position, palette[stop + 1]?.position ?? 1, phase);
  for (let channel = 0; channel < 3; channel++) spectrum[index * 3 + channel] = a.rgb[channel] ** 2.2 * (1 - mix) + b.rgb[channel] ** 2.2 * mix;
}
const spectrumIndex = (phase: number) => Math.floor((phase - Math.floor(phase)) * 2048) * 3;

/** A small 2D renderer uses the original alpha and the 3D ribbon's flow coordinates. */
export function FlowMark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    const controller = new AbortController();
    let disposed = false, visible = false, frame = 0, previous = 0, elapsed = 0;
    let draw: ((time: number) => void) | undefined;
    setReady(false);
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || reduced || !draw) return;
      if (!previous || now - previous >= 1000 / 24) {
        if (previous) elapsed += Math.min((now - previous) / 1000, .25);
        previous = now;
        draw(elapsed);
      }
      frame = requestAnimationFrame(tick);
    };
    const playback = () => {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      if (!disposed && visible && !document.hidden && !reduced && draw) frame = requestAnimationFrame(tick);
    };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; playback(); }) : undefined;
    if (observer) observer.observe(canvas); else visible = true;
    document.addEventListener('visibilitychange', playback);
    const image = new Image();
    image.src = '/brand/wordmark-flow-source.png';
    const coordinates = fetch('/brand/wordmark-flow.bin', {signal: controller.signal}).then(response => {
      if (!response.ok) throw new Error('Flow coordinates unavailable');
      return response.arrayBuffer();
    });
    Promise.all([image.decode(), coordinates]).then(([, buffer]) => {
      if (disposed) return;
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const source = context.getImageData(0, 0, canvas.width, canvas.height);
      const output = new ImageData(new Uint8ClampedArray(source.data), canvas.width, canvas.height);
      const fields = new Float32Array(buffer);
      const base = new Float32Array(source.data.length);
      for (let i = 0; i < source.data.length; i++) base[i] = linear(source.data[i] / 255);
      draw = time => {
        // Same drift, folded currents, interleaving and white entry as colourFlow.ts.
        for (let i = 0; i < fields.length; i += 5) {
          const pixel = fields[i] * 4, along = fields[i + 1], across = fields[i + 2];
          const mask = fields[i + 3], pigment = fields[i + 4];
          const emergence = smooth(.035, .09, along), white = mask * (1 - emergence);
          const phase = along * 1.10 - time * .035 + .022 * Math.sin(across * .012 + along * 10 - time * .22) + across * .0013;
          const interleave = .10 + .04 * Math.sin(across * .018 - along * 8 + time * .19);
          const a = spectrumIndex(phase), b = spectrumIndex(phase + .065);
          for (let channel = 0; channel < 3; channel++) {
            const colour = (spectrum[a + channel] * (1 - interleave) + spectrum[b + channel] * interleave) * pigment;
            const mixed = base[pixel + channel] * (1 - mask) + colour * mask;
            output.data[pixel + channel] = srgb(mixed * (1 - white) + (channel === 2 ? .85 : .835) * white);
          }
        }
        context.putImageData(output, 0, 0);
      };
      draw(0); setReady(true); playback();
    }).catch(() => { /* Keep the source logo visible if canvas or assets are unavailable. */ });
    return () => {
      disposed = true; controller.abort(); cancelAnimationFrame(frame);
      observer?.disconnect(); document.removeEventListener('visibilitychange', playback);
    };
  }, [reduced]);
  return <span className={`flow-mark ${ready ? 'flow-mark--ready' : ''}`}>
    <Mark size={80} /><canvas ref={canvasRef} aria-hidden="true" />
  </span>;
}
