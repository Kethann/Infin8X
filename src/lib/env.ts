export const isBrowser = typeof window !== 'undefined';

export function prefersReducedMotion() {
  return isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function isTouch() {
  return isBrowser && window.matchMedia('(hover: none), (pointer: coarse)').matches;
}
let glCache: { available: boolean; software: boolean } | null = null;
/** One cached probe: is WebGL available, and is it CPU-emulated (SwiftShader / llvmpipe)? */
export function glInfo() {
  if (glCache) return glCache;
  if (!isBrowser) return (glCache = { available: false, software: true });
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    if (!gl) return (glCache = { available: false, software: true });
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return (glCache = { available: true, software: /swiftshader|llvmpipe|software|softpipe|basic render/i.test(r) });
  } catch { return (glCache = { available: false, software: true }); }
}
/** True when WebGL is missing or CPU-emulated: 3D would crawl. */
export const isSoftwareGL = () => glInfo().software;
/** `?gl=force` bypasses the low-end checks (testing 3D in headless browsers). */
export const forceGL = () => isBrowser && new URLSearchParams(location.search).get('gl') === 'force';

/** Heuristic low-end check: few cores, little memory, data saver, or software-only WebGL. */
export function isLowEnd() {
  if (!isBrowser) return true;
  if (forceGL()) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return true;
  if ((nav.deviceMemory ?? 8) <= 4) return true;
  return isSoftwareGL();
}
/**
 * The intro has its own rendering budget. CPU/RAM hints tune its quality, never exclude a phone with a real GPU.
 * The heavier site background still uses isLowEnd(); software WebGL and Data Saver keep the still artwork.
 */
export function canPlayIntro() {
  if (!isBrowser) return false;
  if (forceGL()) return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  return !isSoftwareGL();
}
export function hasDebug() {
  return isBrowser && new URLSearchParams(location.search).has('debug');
}
