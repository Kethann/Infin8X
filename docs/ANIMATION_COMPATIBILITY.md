# Animation compatibility

The logo keeps its geometry, cuts, materials and drag-to-rotate behaviour. Rendering quality adapts to screen size and input type; touch devices use a smaller render budget. Rendering pauses when the hero is outside the viewport or the document is hidden.

Reduced-motion preferences are observed live. Automatic motion stops, reveal content stays visible, and deliberate logo rotation remains available. Touch devices use native page scrolling. Missing WebGL2, software rendering, limited device resources or a lost graphics context use the source logo fallback. A PNG fallback also covers failed WebP loading.

The layout includes safe-area padding, landscape menu scrolling, touch targets and menu cleanup when switching to desktop width. Older CSS engines receive simpler project artwork when container units are unavailable.

The wordmark's infinity “8” uses a 256×86 canvas with sparse colour updates at up to 24 fps. It shares `src/brand/flowPalette.json` and the main ribbon's flow coordinates and colour equations; its cutout alpha and white region remain fixed during animation. `src/brand/wordmarkCuts.json` defines the tapered secondary cuts, enhanced for small-size readability without changing the main logo. It pauses offscreen/in hidden tabs and renders a still frame for reduced motion. The original image remains available if the canvas or flow assets fail. Rebuild the compact flow assets with `python3 scripts/build-wordmark-flow.py` after changing the source artwork, cuts or flow maps.

## Verification

- `npm run build`: TypeScript and production build.
- `node scripts/check-device-compatibility.mjs`: 12 portrait/landscape viewport sizes from 320 to 2560 pixels, menu behaviour, graphics/image fallbacks, render budget, offscreen pause, live reduced motion and context loss.
- `node scripts/check-rotation.mjs`: desktop and touch rotation, release/reset, keyboard controls and gesture cancellation.
- `node scripts/check-wordmark-flow.mjs`: changing colour pixels, unchanged white region and alpha, mobile/desktop layout, offscreen pause/resume, reduced motion and failed-asset fallback. Accepts `firefox` or `webkit` to select another installed engine.
- `node scripts/check-browser-compatibility.mjs`: Firefox and WebKit at 390 and 1440 pixels, navigation, skills, project expansion, live reduced motion and responsive case-study timeline. An optional `firefox` or `webkit` argument selects one engine.

Browser checks use Playwright; its browser binaries and Linux dependencies must be available. This verification covers desktop browser engines and emulated viewport/touch conditions, not every physical device, embedded browser or historical OS version. Unsupported graphics receive a static logo rather than an unusable 3D animation.
