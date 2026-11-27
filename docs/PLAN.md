# Infin8X — Build Plan

## Repo state at start
Empty folder with one file, `infi8x.png` (1904×610, **already RGBA with a transparent background**). It was copied to
`public/brand/infin8x-logo.png`, and the original was left untouched. No alpha-conversion step was needed.

## Stack decision
| Area | Choice | Why |
|---|---|---|
| Build | Vite 5 + React 18 + TypeScript | As briefed. Fast and static, so it deploys to Cloudflare Pages unchanged. |
| Styling | Tailwind 3 (layout) + CSS custom properties (design tokens) | Tokens live in `src/styles/tokens.css`; Tailwind reads them. |
| Motion | GSAP 3 + ScrollTrigger, Lenis | Timelines, scrubbing and pinning. **Framer Motion dropped**: GSAP already covers the small UI states, which saves ~40 KB. |
| Hero renderer | **Canvas 2D compositor** driven by a GSAP timeline, with geometry taken from the shared SVG path | See "Hero rendering decision" below. |
| WebGL layer | **Raw WebGL fragment shader** (volumetric haze + caustics), lazy-loaded | Replaces react-three-fiber. One full-screen shader is ~4 KB versus ~600 KB for three + r3f, for the same visual. Skipped on low-end devices and with reduced motion. |
| Routing | wouter (2 KB) | `/` plus `/work/:slug` case studies. |
| Fonts | Self-hosted @fontsource: Space Grotesk, JetBrains Mono, Inter | No third-party font requests, and better LCP. |
| Form | Cloudflare Pages Function `functions/api/contact.ts` → Resend API (env `RESEND_API_KEY`, `CONTACT_TO`), `mailto:` fallback | No secrets in code. |

### Hero rendering decision (deviation from "SVG first")
The brief asks for the loop to **form** (not fade in) and to look as close to real as possible. The most realistic material
available is the artwork itself (a glossy 3D render), so the hero **materialises the real logo along its own centreline**
instead of redrawing a flat vector stroke. Doing that needs per-frame masked compositing, additive light blending ("lighter"),
bloom and RGB channel separation. In SVG that means stacked `feGaussianBlur`/mask filters, which stutter on mobile. Canvas 2D
does it on the GPU in about 10 draw calls per frame. The **SVG path is still the source of truth**: `<LogoPath/>`, the
`?debug` overlay, the favicon, the Process section and the progress beam all use it, and the canvas samples the same path.

## Logo geometry
`scripts/build-assets.py` fits the centreline from the PNG's alpha mask: rays cast from each lobe centre find the midpoint
of the tube, and a Catmull-Rom → cubic Bézier conversion smooths them. **100% of sampled curve points land on the tube.**
The path uses the PNG's native space (`viewBox 0 0 1904 610`) rather than 400×200, so the overlay is exact with no scaling.
Visit `/?debug` to see it drawn over the artwork.

## File structure
```
public/brand/            logo png + webp variants + rim, favicon, og image
functions/api/contact.ts Cloudflare Pages Function
scripts/                 asset builder (python), screenshots (playwright)
src/brand/               LogoPath, logoGeometry (generated), useLightTravel, pathMath
src/hero/                HeroIntro (timeline), heroRenderer (canvas), webglHaze (lazy)
src/components/          Glass, Nav, Cursor, ProgressBeam, PageTransition, Footer, SectionHeader
src/sections/            About, Journey, Skills, Services, Projects, Process, Contact
src/pages/               Home, CaseStudy
src/content/             typed copy (edit here, not in components)
src/styles/              tokens.css, globals.css
```

## Milestones (status 2026-11-17: all 9 complete)
1. Setup, tokens, fonts, glass components, CLAUDE.md, DESIGN.md
2. Logo path + debug overlay + favicon mark
3. Hero storyboard + skip + scroll-scrub + vertical beam (the most effort goes here)
4. About, Journey, Skills
5. Services, Projects grid, case-study route
6. Process (light path, prism pane, recombination)
7. Contact + Pages Function, footer, page transitions, cursor
8. WebGL haze layer + low-end fallbacks
9. A11y / perf / SEO pass, Lighthouse, screenshots, hero recording

Each milestone is checked with `npm run build` and `npm run shots` (Playwright screenshots at 390, 768 and 1440 px, with console errors captured).

## Risks
- **backdrop-filter cost on mobile.** Blur is reduced below 768 px, and at most 3 glass layers are in view at once.
- **Canvas hero on low-end phones.** DPR is capped at 1.5, the bloom pass is half resolution, and the 30 s idle orbit pauses when the hero is off-screen or the tab is hidden.
- **Content.** Every client name and project is unconfirmed, so all of it is marked `[CONFIRM]` / `[PLACEHOLDER]` (see `docs/TODO-CONTENT.md`).

## Results (milestone 9)
- Lighthouse mobile (production preview): **Performance 93 · Accessibility 100 · Best Practices 100 · SEO 100**.
  LCP 2.4 s, TBT 170 ms, CLS 0. Report: `docs/lighthouse-mobile.report.html`.
- No console errors at 390 / 768 / 1440 on home, case studies, `?debug` or reduced motion.
- Hero recording: `docs/hero-intro.webm`.
- Fixes found during verification: an overexposed bloom was tamed; a bloom buffer clipped into a visible rectangle on mobile;
  the hero pin was created late, which broke the Process scroll mapping; the hero copy shifted layout (CLS 0.099 → 0);
  small accent text failed contrast; React mounted every section in one long task (sections now mount progressively).
