# Device and browser compatibility

Verified on 26 November 2026 against a local production build.

## Coverage

- Chrome 158: 320×568, 360×640, 390×844, 430×932, 600×960, 768×1024, 960×768, 1024×768, 1366×768, 1920×1080, 2560×1440, 844×390 and 640×360.
- Firefox 132 and WebKit 18.2: 320×568, 390×844, 768×1024, 1440×900 and 844×390.
- 200% root text size at 390×844 and 1280×800 in Chrome.
- Home sections, all six Process controls, the scrollable navigation menu, Skills categories and details, all four project pages and their return links.
- Touch activation, Process keyboard arrows/Home/End/Escape, reduced motion, and no horizontal content overflow in the checked layouts.
- No-WebGL artwork fallback; forced WebGL at device pixel ratio 3, canvas render budget, gallery reveal, and context-loss fallback.
- Mobile intro eligibility for 4 GB Android, 2 GB Android and two-core devices with no memory hint. An emulated two-core / 2 GB phone plays the intro to completion without `?gl=force`, keeps the canvas visible, resizes to landscape and respects reduced motion. Renderer metadata is stubbed to exercise hardware eligibility; rendering remains software-based in the test environment.
- Contact failure preserves the message; success resets the form. Both responses were mocked locally; no message was sent.
- Scrolling: Chrome wheel easing, menu scroll isolation, chapter/progress tracking, route return offsets, mobile anchor animation, reduced-motion focus and a CDP touch swipe over the animated logo. Chapter tracking performed no layout measurements during the sampled wheel glide.

## Fixes from this audit

- Process notes open on the first tap. Pointer focus no longer opens a note immediately before the click closes it.
- Process touch targets are at least 44px high. Small-phone notes give more space to the text, and enlarged headings wrap at every width.
- The Skills footer navigates back to the home page's Work section.
- Project overview and facts grids can shrink without clipping long headings or enlarged text.
- Low CPU/RAM hints select a lighter intro rather than disabling it: lite shader, no MSAA, pixel ratio at most 1 and an 800,000-pixel rendering cap. Data Saver and unavailable/software-only WebGL retain the still artwork.
- Desktop wheel smoothing works independently of WebGL capability; phones keep native touch momentum and section links scroll smoothly. Reduced motion and skip links remain immediate. Vertical swipes over the logo can scroll the page, while horizontal dragging rotates it. Chapter positions are cached until layout changes, reducing work during scrolling.

## Repeat the checks

```sh
npm run build
npm run preview
node scripts/check-device-compatibility.mjs http://localhost:4173/
node scripts/check-mobile-intro.mjs http://localhost:4173/
node scripts/check-scrolling.mjs http://localhost:4173/
node scripts/check-browser-compatibility.mjs http://localhost:4173/
```

The device script uses `/usr/bin/google-chrome`, or the `CHROME` environment variable. Install the browsers matching the repository's Playwright version and their runtime dependencies before running the Firefox/WebKit suite. An optional final browser argument selects `firefox` or `webkit`; optional width arguments on the device script restrict the viewport matrix while retaining text-size and fallback checks.

Use a stable production build for the entire run: deleting its hashed assets during a test can interrupt lazy route loading. The forced-WebGL check uses software rendering in a headless environment and waits for the reveal to complete rather than assuming a fixed frame rate.

These are browser-engine and viewport-emulation checks, not physical-device tests. WebKit coverage does not certify every Safari/iOS release, and forced software WebGL does not measure real mobile GPU performance.
