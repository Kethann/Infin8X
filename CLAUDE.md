# Infin8X — project rules

Studio site for **Infin8X (Infinite eXperience)**. Concept: the logo is a prism. White light (an idea) enters at the crossing (the X),
travels the white lobe, returns to the X and disperses into the spectrum lobe. Every section reuses that story.
Art direction: deep navy, teal-cyan particle filaments with depth of field, real 3D glass; titles in Unbounded.

## Commands
| | |
|---|---|
| `npm run dev` | Vite dev server on :5173 (if React reports an "invalid hook call" after adding deps: restart with `npx vite --force`) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve `dist/` on :4173 |
| `npm run shots [url]` | Playwright screenshots at 390 / 768 / 1440 into `shots/` and console-error check |
| `node scripts/check-layout.mjs [url]` | Overflow / CLS / hidden-reveal / console audit at 10 viewports, lite + 3D path (run against `npm run preview`) |
| `node scripts/hero-seek.mjs [url]` | Deterministic hero storyboard: pauses the GSAP timeline and seeks exact timecodes (dev server, use `?gl=force`) |
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
- **Hero:** `HeroIntro.tsx` owns the GSAP timeline; `heroRenderer.ts` (2D overlay: beam, burst, flares, bloom) only draws `state`;
  `logo3d.ts` is the 3D ribbon loop + particle swarm + the background (`spaceBg.ts` filaments) in **one WebGL context**.
  Change timing in the timeline, looks in the renderers.
- **Device tiers:** GPU → full 3D. Software WebGL / ≤4 cores / ≤4 GB / data-saver (`isLowEnd()`) → lite hero (wordmark + flat 8, CSS
  background), no live canvases. This is what keeps Lighthouse ≥ 90 (Lighthouse runs without a GPU).
- Hero backdrop: `hero/auroraCurtain.ts` — full-screen shader: a warp fan of long-exposure light fibres sweeping from both edges into the ∞'s crossing (cool blue on the white lobe side, hot red/magenta on the spectrum side), energy flowing inwards in log space, starburst behind the X, nebula + stars, glossy floor with the logo's live mirrored reflection (`artworkBackdrop.ts` renders the logo flipped about the contact line into `aurora.reflection` first), film grade. Intro story (timeline in `HeroIntro.tsx`, states in `artworkBackdrop.ts`): `aurora` energy enters random fibres as comet heads that draw them edge→core → `rush` energy races into the core → `flash` absorption → `trace` light draws the ribbon in path order (crossing → white lobe → crossing → spectrum lobe; analytic path coordinate in `colourFlow.ts`) → `calm` fibres are absorbed into the core one by one at random (outer end retracts with a glowing tail; ~1 in 7 survive softly). Never pop fibres on/off with a step — retract or draw them. Spectrum-side fibres use `brand/flowPalette.json`.
- Section headers (`Chapter.tsx`): no numbering anywhere; the section name is set large and faded above the h2 (filled gradient, never `-webkit-text-stroke`, which shows the variable font's inner contours). Home nav hides its wordmark while the hero is in view.
- Home sections mount one per idle slice inside `.home__sections`, which holds `min-height: 300vh` until all are mounted: keeps the footer from jumping into view (CLS was 0.22 on phones). Faded effects must bake alpha into colours, not `opacity`: the reveal sets `opacity: 1`.
- Site background after the hero: `three/prismFlow.ts` (scroll-driven dot wave). Process section: `three/processPrism.ts` (glass prism, time-based).
- Cursor is the system cursor (custom cursor removed on request).
- Motion: expo-out entrances, `--ease-light` for light travel, 0.4–1.2 s, stagger 40–80 ms, never bouncy. Everything must have a `prefers-reduced-motion` path (final lit state, no travel).
- Glass: use `<Glass>` / `.glass` + `.glass--e1..3`. Max 3 blurred layers in view on mobile.
- Small accent-coloured text uses `color-mix(in srgb, <accent> 62%, #fff)` to keep 4.5:1 contrast.
- Sections that should drive the progress beam colour need `data-accent` + `--section-accent`.
- Keep Lighthouse mobile ≥ 90 in all four categories (last run: 92 / 100 / 100 / 100).

## Deploy (Cloudflare Pages)
Build command `npm run build`, output `dist`. Functions in `functions/` deploy automatically.
Set env vars `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` for the contact form. Without them the form falls back to `mailto:`.
Update `siteUrl` in `src/content/site.ts`, `index.html` meta, `public/robots.txt` and `public/sitemap.xml` once the real domain is known.
