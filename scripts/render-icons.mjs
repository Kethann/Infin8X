// Render the Open Graph image from the brand assets. Usage: node scripts/render-icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' });
// favicons now come from scripts/build-favicons.py (hero artwork); this script renders only the OG image
const sg = readFileSync('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2').toString('base64');
const logo = readFileSync('public/brand/infin8x-logo-1904.webp').toString('base64');
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<html><head><style>@font-face{font-family:'Space Grotesk';font-weight:700;src:url(data:font/woff2;base64,${sg}) format('woff2')}
  body{margin:0;width:1200px;height:630px;background:radial-gradient(90% 90% at 55% 35%,#16161f,#050508 70%);font-family:'Space Grotesk',system-ui,sans-serif;color:#F5F5F7;overflow:hidden;position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(40% 50% at 72% 40%,rgba(123,92,255,.18),transparent),radial-gradient(40% 50% at 60% 30%,rgba(255,59,92,.12),transparent)}
  img{position:absolute;left:150px;top:70px;width:900px;filter:drop-shadow(0 0 30px rgba(255,255,255,.18))}
  h1{position:absolute;left:0;right:0;bottom:92px;text-align:center;margin:0;font-size:56px;letter-spacing:-.03em;font-weight:700}
  p{position:absolute;left:0;right:0;bottom:52px;text-align:center;margin:0;font:500 18px ui-monospace,monospace;letter-spacing:.3em;color:#A9A9BC;text-transform:uppercase}
</style></head><body><div class="glow"></div><img src="data:image/webp;base64,${logo}"><h1>Turning ideas into digital reality.</h1><p>Infin8X · Infinite eXperience</p></body></html>`);
await p.waitForTimeout(300);
await p.screenshot({ path: 'public/og-image.png' });
await b.close(); console.log('og rendered');
