# Infin8X design system

## 1. Story
**One idea in, a spectrum of crafted work out.** White light enters, is absorbed, travels, hits the prism point (the X) and disperses.
The spectrum is a *reward*: it appears at moments of interaction and progress, and is never used as decoration wallpaper.

## 2. Tokens (`src/styles/tokens.css`)
| Token | Value | Use |
|---|---|---|
| `--c-base` | `#0B0B10` | page |
| `--c-void` | `#050508` | hero edges |
| `--c-surface` | `#14141C` | solid cards / glass fallback |
| `--c-text` | `#F5F5F7` | text |
| `--c-muted` | `#A9A9BC` | secondary text (≥ 4.5:1 on base) |
| `--c-accent` | `#4D7CFF` | focus rings, default accent |
| spectrum | `#FF3B5C #FF9A3C #FFD93C #3CD98A #3CA9FF #7B5CFF` | `--s-red … --s-violet` |

**Section accents:** About red · Services orange · Process yellow · Projects green · Skills blue · Contact violet.
The navigation highlight and page atmosphere follow the active section. The top-bar checkpoint strip has been removed.

**Type:** Space Grotesk 500 for headings, buttons and navigation (`--font-display`); Inter for body (`--font-body`); JetBrains Mono for small chapter labels. Unbounded remains in decorative chapter numerals. The custom wordmark uses Turbo Driver and Ariovex with the infinity symbol, shared by the hero, navigation and footer.
The fluid scale is `--fs-mono … --fs-h1`, all built with `clamp()`.

## 3. Glass
- **Surface:** `rgba(255,255,255,.06)` + `backdrop-filter: blur(24px) saturate(160%)` (14 px below 768 px), inner top highlight, 5% noise.
- **Edge:** 1 px spectrum conic border via mask-composite, opacity 0 → 0.75 on hover / focus-within (the prism edge dispersing).
- **Specular:** a radial gradient at `--mx/--my` (pointer), tinted by `--glass-accent`.
- **Depth:** `.glass--e1/e2/e3`, with coloured (never grey) shadows.
- **Fallbacks:** without `backdrop-filter` → solid `rgba(20,20,28,.92)`. `prefers-contrast: more` → solid surface with a 50% white border.

## 4. Motion
| Rule | Value |
|---|---|
| Entrances | `expo.out` / `--ease-out`, blur 3px→0, y 18→0, 0.7–0.9 s; word stagger 35 ms |
| Light travel | `power2.inOut` / `--ease-light` |
| Durations | 0.4 – 1.2 s (hero exceptions are storyboarded) |
| Never | bounce, elastic, overshoot |
| Page transition | Soft light veil fades in (0.55 s), route swaps, veil fades out (0.9 s); sine easing |
| Cursor | Native system cursor |
| Reduced motion | Final lit states, no travel, no smooth scroll, Process stays fully lit, including replay and live preference changes |

## 5. Hero — "light painting, one gesture"
Principle: **restraint**. One idea at a time on screen; every effect must mean something in the brand story.
Background: near-black with fine, slow dust only. Logo: real 3D calligraphic ribbon (clear-coat, faint iridescence), spectrum flowing.

| t (s) | What happens |
|---|---|
| 0.2–0.9 | A seed of light breathes at the X (the idea) |
| 0.9–4.1 | The light draws the whole ∞ in **one continuous stroke** (long-exposure trail): up-left around the white lobe, back through the X — where it **refracts** (soft bloom) and turns spectral — around the right lobe, home. Sparks peel off the pen and drift away. The glass condenses a beat behind the light; the loop forms on a slight 3D angle and swings to face the viewer |
| 3.9–5.3 | The light stroke fades as the material takes over; quiet settle |
| 4.8–6.4 | The ∞ turns upright and becomes the **8 of Infin8X**; letters resolve from blur (Unbounded 300, silver fill) |
| 6.0 → | Tagline, CTAs; idle: a soft glow glides inside the glass; drag to rotate (position locked) |

Removed on purpose (they read as decoration): code rain/terminals, comets, beam from the sky, starburst, prism rays, lens streaks,
ghost outlines, blueprint line, colour washes, drag hint.

## 6. Components
`Glass`, `SectionHeader`, `Mark` (flat logo), `Nav`, `ProgressBeam`, `Cursor`, `TransitionLink`/`Wipe`, `Footer`, `LogoPath`
(SVG centreline, `variant="full|split"`) and `useLightTravel()` (stroke-dash light along any `<path>`, scroll-scrubbed or played once).

## Responsive refinement
- Shared page gutters range from 20 to 32 px; content is constrained to 1240 px.
- Service cards use two columns from 760 px, and one below. Process steps wrap below 1100 px rather than scrolling sideways.
- Filter controls wrap on small screens and use at least 44 px touch targets.
- Mobile navigation keeps background content inert while open and restores it on close.
- Contact uses the supplied Kethan Artzz name, an optional free-text budget, and a LinkedIn fallback until an email is supplied. Unconfirmed time estimates are omitted.
