# Infin8X — project rules

Studio site for **Infin8X (Infinite eXperience)**. Concept: the logo is a prism. White light (an idea) enters at the crossing (the X),
travels the white lobe, returns to the X and disperses into the spectrum lobe. Every section reuses that story.
Art direction: deep navy, teal-cyan particle filaments with depth of field, real 3D glass.

## Commands
| | |
|---|---|
| `npm run dev` | Vite dev server on :5173 (if React reports an "invalid hook call" after adding deps: restart with `npx vite --force`) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve `dist/` on :4173 |
| `npm run shots [url]` | Playwright screenshots at 390 / 768 / 1440 into `shots/` and console-error check |
| `node scripts/check-layout.mjs [url]` | Overflow / CLS / hidden-reveal / console audit at 10 viewports, lite + 3D path (run against `npm run preview`) |
| `node scripts/hero-seek.mjs [url]` | Hero storyboard (stale: expects `window.__heroTl`; the dev hook is now `window.__sculpture = {scene, timeline}` — pin `scene.state` instead) |
| `node scripts/hero-frames.mjs [url] shots/hero 1440 900` | Real-time frames (unreliable under software WebGL — prefer hero-seek) |
| `node scripts/record-hero.mjs [url]` | Records the intro to `docs/hero-intro.webm` |
| `npm run assets` | Rebuild webp/rim assets + `src/brand/logoGeometry.ts` from `public/brand/infin8x-logo.png` |
| `python3 -I scripts/build_favicons.py` | Favicons (svg/ico/png/apple/192/512) from the hero artwork on a navy tile |
| `node scripts/render_icons.mjs` | `public/og-image.png` |

Scripts use `/usr/bin/google-chrome` (override with `CHROME=`). Headless Chrome has no GPU: add `?gl=force` to exercise the 3D path
(otherwise the site correctly serves the lite path to software-WebGL devices).

## Conventions
- **Copy lives in `src/content/*.ts`.** Components never hard-code copy. Unknown facts → `[PLACEHOLDER: …]`, unconfirmed seeds → `[CONFIRM]`, and list them in `docs/TODO-CONTENT.md`. Never invent clients, stats or testimonials.
- **Logo geometry is generated.** Do not hand-edit `src/brand/logoGeometry.ts`. Path space is the PNG's own 1904×610. Check alignment at `/?debug`.
- Path parameter `u ∈ [0,1)`: `0` = crossing heading into the right lobe, `SPLIT` = crossing again, `[SPLIT,1)` = left lobe. Use `pointAt`, `colorAt`, `U_LEFT`, `U_RIGHT` from `src/brand/pathMath.ts`.
- **Hero:** `HeroIntro.tsx` owns the GSAP timeline; `hero/artworkBackdrop.ts` renders the logo artwork + `auroraCurtain.ts` backdrop in
  **one WebGL context** and only draws the timeline's state. Change timing in the timeline, looks in the renderers.
- **Files:** raw source material lives in `source-assets/` (`fonts/` original font files incl. uploads, `logo/` the source renders used by
  `scripts/extract-logo.py`); only subset woff2s ship from `public/fonts`. Screenshots go to `shots/` (ignored).
- **Device tiers:** GPU → full 3D. Software WebGL / ≤4 cores / ≤4 GB / data-saver (`isLowEnd()`) → lite hero (wordmark + flat 8, CSS
  background), no live canvases. This is what keeps Lighthouse ≥ 90 (Lighthouse runs without a GPU).
- Hero backdrop: `hero/auroraCurtain.ts` — full-screen shader: a warp fan of long-exposure light fibres sweeping from both edges into the ∞'s crossing (cool blue on the white lobe side, hot red/magenta on the spectrum side), energy flowing inwards in log space, starburst behind the X, nebula + stars, glossy floor with the logo's live mirrored reflection (`artworkBackdrop.ts` renders the logo flipped about the contact line into `aurora.reflection` first), film grade. Intro story (timeline in `HeroIntro.tsx`, states in `artworkBackdrop.ts`): `aurora` energy enters random fibres as comet heads that draw them edge→core → `rush` energy races into the core → `flash` absorption → `trace` light draws the ribbon in path order (crossing → white lobe → crossing → spectrum lobe; analytic path coordinate in `colourFlow.ts`) → `calm` fibres are absorbed into the core one by one at random (outer end retracts with a glowing tail; ~1 in 7 survive softly). Never pop fibres on/off with a step — retract or draw them. Spectrum-side fibres use `brand/flowPalette.json`.
- Section headers (`Chapter.tsx`): no numbering anywhere; the section name is set large and faded above the h2 (filled gradient, never `-webkit-text-stroke`, which shows the variable font's inner contours). Home nav hides its wordmark while the hero is in view. Never add a drop-shadow/halo to it (it reads as a box shadow over the bright background).
- **Type** (tokens in `styles/tokens.css`, woff2 subsets in `public/fonts`, sources in `source-assets/fonts/`): `--font-display` **Baserona** (wide geometric caps: headings, buttons, nav, card titles), `--font-body` **Unique** (paragraphs, UI, forms), `--font-label` / `--font-figure` **Biscora** (condensed caps: small tracked labels; big project names, stats, step numbers), `--font-ghost` **Esthoria 72 Italic** (the faded section names only; demo cut subset to A–Z/a–z/space because its period is a watermark and it has no digits), `--font-accent` **Epstonik** `ss03` only for the "Infinite Experience" reading, `--font-read` **Manrope** (variable, `@fontsource-variable/manrope`) for section descriptions, Services card titles, skill tags and the Process details. Never restyle the logo, the Infin8X wordmark (Ariovex + Turbo Driver), "Infinite Experience", or `.hero__wm` (Unbounded). Unusable uploads: Starstone, Bellina (watermarked glyphs), Cravelo (no digits/punctuation), Dusty Grunge (texture off-brand). Esthoria/Cravelo/Starstone/Bellina are personal-use demos: license before commercial launch.
- Section header (`Chapter.tsx`): Esthoria italic name, the h2 tucked into its lower edge; `--fs-h2` is compact so title and lead sit on one line from tablet up. Reveals: no blur-in — titles rise word by word out of a mask, leads rise softly, the section name wipes on left→right.
- No green anywhere outside the logo artwork: the spectrum's fourth stop is `--s-magenta` (#D94CFF), used by Work, the Apps card and Process step 05.
- Nav (desktop ≥1000px): wordmark alone on the left, one glass pill on the right — icon-only section buttons (dark-glass name tag on hover/focus), the current section a capsule in its accent colour **sized to its measured label** (`--w`/`--cap`/`--capmax` from `Nav.tsx`, label opens behind a feathered mask edge), round send (contact) and menu buttons. The row is as wide as the widest capsule and buttons are right-aligned in it by **transform**; the pill's glass is `.nav__pill::before`, trimmed to the visible buttons with `clip-path` (`--trim`), so the pill always fits its content and scrolling causes no layout shift; keep it that way. Behind the **wordmark** `.nav::before` is a compact slanted navy-glass streak from the LEFT screen edge (≈1.7× the wordmark's height, ends just past it; outer veil + core band; hidden while the hero shows the logo, slides in with the wordmark; blur-free on `.lowend`). Phones: wordmark + menu sheet.
- Intro plays at 2× its authored timings (`INTRO_SPEED` in `HeroIntro.tsx`); change speed there, not per tween.
- Services scenes rest; they play on card hover/focus and all together for 5 s every 15 s while in view (`data-play` on `.svc-grid`).
- Buttons (`.btn`): Manrope 700, plain words + a small direction icon. Nav icons are their own `nav-*` set in `Icon.tsx`.
- Screen edges: fixed soft dark fades at the top and bottom (`body::before/::after`, below the nav).
- Removed on request: the Process prism diagram and its legend box, then the six-step line (Process is now a clock dial in `Process.tsx`: six glossy spectrum spheres on a ticked bezel joined by arcs, 06 loops back to 01 dashed; one registered `--turn` angle turns the track and places the counter-rotated upright spheres so the current step comes round to the marker facing the details — right on desktop, bottom ≤899px; tabs pattern with arrow keys; auto-advances every 5.2 s while in view until the visitor hovers/clicks; mouse tilt only on capable devices), the About "Building since 2021" milestone timeline, the footer's section links (they live in the top nav), the SN15 and Amuse projects.
- Services: four short cards in one row (≥1100px; 2×2 from 640px; ~377px tall at 1440): icon+name, outcome, animated `ServiceScene` (104px), points side by side in two columns, link. Never drop the scenes. Skills: one block per category (small tag heading + its chips), packed like a watch-face grid: `flex: var(--n) 1 calc(var(--n) * 5.4rem)` so the blocks fill every row.
- Work: Kaaya, Dolly (dollydstudio.pages.dev), UC8 (uc8.vercel.app), KA (kethan.pages.dev); the last three use screenshots of the live sites in `public/work/` (1600×1000 webp).
- Work layout (≥960px): narrow name index left (.44fr); right a 16:10 glass screen split **2×2** (`.reel__split` grid). Equal quarters at rest; hovering/focusing a name or tile sets its column and row to `3fr 1fr` inline (grid-template transition .55s, cubic-bezier(.2,.8,.2,1)), so it enlarges into focus and the others shrink. Each tile always shows the whole site: the largest 16:10 that fits (`width: min(100cqw, 160cqh)`), never cropped. Narrow screens: cards.
- Home sections mount one per idle slice inside `.home__sections`, which holds `min-height: 300vh` until all are mounted: keeps the footer from jumping into view (CLS was 0.22 on phones). Faded effects must bake alpha into colours, not `opacity`: the reveal sets `opacity: 1`.
- Site background after the hero: `three/lightField.ts` via `components/PrismFlow.tsx` (fixed canvas) + `.prismflow-veil` (dark-tinted frosted glass between it and the copy, strongest in the reading column). One light drives everything and follows the visitor's **clock** (`clockLight()`: sun left→right by day, warm low / white high, dim blue moon at night; `?hour=20` previews). Scene: clustered blue/gold particle clouds with soft bokeh, and `three/floatingLogos.ts` — 3D-extruded Simple Icons marks (+ a generic `</>`) that materialise, float near the focus plane and disintegrate into a swirling glitter/wisp/ray particle burst. Post: depth of field (per-pixel rotated disk — no ghost copies) + quarter-res gaussian bloom; overlay: small prismatic streak flares, a fine anamorphic flare, beam, leak, scrim. Counts are deliberately minimal for CPU/GPU; low-end gets the CSS fallback. Rejected before: glass shards (removed on request), ray fans, the mist flow, hard discs, text halos/box shadows behind copy.
- Intro prismatic shards: `shards()` in `hero/auroraCurtain.ts` — slow spectral slivers on the energy clock (`uFlow`) streaking into the crossing during `aurora`/`rush`, each absorbed at its own random distance; they stop completely as `trace` starts (requested: no rays after the absorption).
- Intro sky follows the visitor's clock like the site background: `uSun` (same rule as `clockLight`, re-read every 20 s, `?hour=` previews) moves the pink light at the top (rises left, high at noon, sets right; dim violet at night) and the warm side of the nebula. Drifting blue/gold bokeh dust (`dust()`, one disc per grid cell, constant cost) sits in the intro background.
- Performance: the backdrop shader is shaded at 60% of the drawing buffer (50% on the lite shader) into a target and blended up (`aurora.draw`); the logo stays full resolution. Keep new backdrop effects soft/cheap; never render the backdrop at full res again.
- Navigation into a home section from another route (e.g. "All projects" → `/#projects`, shared `/#contact`): `TransitionLink` records the section, home waits until it has mounted, finishes the intro and jumps there (App.tsx).
- Section names: fully opaque gradient in the section's own colour; it drifts slowly on its own (14 s) and scroll carries it further (`--ghost-drift` + `--ghost-scroll`, registered). The pointer lights the letters under it (a radial layer clipped to the text, only while the pointer is over the text's line boxes) with a faint soft spill (`::before`). The box is padded on all sides (offset by margins) so the italic is never cut; the reveal clip is generous for the same reason. Section padding `clamp(48px, 5vw, 72px)` (≈144px between sections on desktop).
- Skills: category filters are tiny one-line capsules (no icons; the row scrolls with an edge fade only when it overflows); the preview has no hint line; background icons drift like dust on random clocks and only change while invisible; the centre icon hands over with a goo ("symbiote") morph.
- Work tiles show the site version that fits the tile (desktop / `coverTablet` / `coverMobile` captures in `public/work/`; very wide strips show the whole desktop shot fitted over a blurred copy). The desktop shot is the base and never fades; the others fade in over it (no flicker).
- Cursor is the system cursor (custom cursor removed on request).
- Motion: expo-out entrances, `--ease-light` for light travel, 0.4–1.2 s, stagger 40–80 ms, never bouncy. Everything must have a `prefers-reduced-motion` path (final lit state, no travel).
- Glass: use `.glass` + `.glass--e1..3`. Max 3 blurred layers in view on mobile.
- Small accent-coloured text uses `color-mix(in srgb, <accent> 62%, #fff)` to keep 4.5:1 contrast.
- Sections drive the progress beam and the background's spotlight/cool-light colour through `data-chapter` + `--section-accent` (the old `data-accent` selector matched nothing).
- Keep Lighthouse mobile ≥ 90 in all four categories (last run: 92 / 100 / 100 / 100).

## Docker
`docker compose up --build` (or `docker build -t infin8x . && docker run -p 8080:80 infin8x`) builds with Node 22 and serves `dist` from
nginx (`docker/nginx.conf`: SPA fallback, long cache for hashed assets). The Cloudflare contact function does not run there; the
form falls back to email / LinkedIn.

## Deploy (Cloudflare Pages)
Build command `npm run build`, output `dist`. Functions in `functions/` deploy automatically.
Set env vars `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` for the contact form. Without them the form falls back to `mailto:`.
Update `siteUrl` in `src/content/site.ts`, `index.html` meta, `public/robots.txt` and `public/sitemap.xml` once the real domain is known.
