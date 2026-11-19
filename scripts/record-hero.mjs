// Record the full hero intro (fresh session) to docs/hero-intro.webm. Usage: node scripts/record-hero.mjs [url]
import { chromium } from 'playwright';
import { renameSync, mkdirSync } from 'node:fs';
const url = process.argv[2] ?? 'http://localhost:4173/';
mkdirSync('shots/video', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'shots/video', size: { width: 1440, height: 900 } } });
const p = await ctx.newPage();
await p.goto(url); await p.waitForTimeout(10500);
await p.mouse.move(400, 300, { steps: 30 }); await p.mouse.move(1100, 420, { steps: 60 }); await p.waitForTimeout(1500);
const v = p.video(); await ctx.close(); renameSync(await v.path(), 'docs/hero-intro.webm');
await b.close(); console.log('saved docs/hero-intro.webm');
