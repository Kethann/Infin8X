// Layout audit: 10 viewports (320 → 1920, plus landscape phone) on the lite and ?gl=force paths. Reports horizontal
// overflow, layout shift (CLS, with the shifting node), reveals left hidden after scrolling, and console errors.
// Usage: node scripts/check-layout.mjs [baseUrl=http://localhost:4173/] [screenshotDir]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const sizes = [[320,640],[360,780],[390,844],[430,932],[768,1024],[1024,768],[1280,800],[1440,900],[1920,1080],[844,390]];
for (const q of ['', '?gl=force']) for (const [w,h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 1000, isMobile: w < 1000 && w < h });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0,150)); });
  await p.addInitScript(() => { window.__cls = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push({ v: e.value, t: Math.round(e.startTime), src: e.sources?.map(s => s.node ? (s.node.className?.toString?.() || s.node.nodeName).slice(0,60) : '?').join(' | ') }); }).observe({ type: 'layout-shift', buffered: true }); });
  const t0 = Date.now();
  await p.goto(base + q, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await p.waitForTimeout(2500);
  const sk = p.locator('.hero__skip'); if (await sk.count()) await sk.click().catch(()=>{});
  await p.waitForTimeout(1500);
  // scroll whole page slowly
  for (let y = 0; y < await p.evaluate(() => document.documentElement.scrollHeight); y += Math.round(h * .8)) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(250); }
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const over = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      const rc = el.getBoundingClientRect(); if (!rc.width) continue;
      if (rc.right > vw + 1 || rc.left < -1) {
        // ignore if an ancestor clips
        let a = el.parentElement, clipped = false;
        while (a && a !== document.body) { const o = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) { const ar = a.getBoundingClientRect(); if (ar.right <= vw + 1 && ar.left >= -1) { clipped = true; break; } } a = a.parentElement; }
        if (!clipped) over.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.()||'').split(' ')[0]} [${Math.round(rc.left)},${Math.round(rc.right)}]`);
      }
    }
    // hidden reveals left behind
    const stuck = [...document.querySelectorAll('[data-reveal]:not(.is-in)')].filter(e => !e.classList.contains('chapter__ghost') && getComputedStyle(e).opacity < .5).map(e => (e.className||e.tagName).toString().slice(0,40));
    const cls = window.__cls.reduce((s, e) => s + e.v, 0);
    return { sw: document.documentElement.scrollWidth, vw, over: [...new Set(over)].slice(0, 8), stuck: stuck.slice(0,6), cls: +cls.toFixed(4), shifts: window.__cls.filter(e => e.v > .002).slice(0, 6), lowend: document.documentElement.classList.contains('lowend') };
  });
  console.log(`${q||'lite'} ${w}x${h} load=${loadMs}ms sw=${r.sw}/${r.vw} cls=${r.cls} lowend=${r.lowend}`);
  if (r.over.length) console.log('  overflow:', r.over.join(' ; '));
  if (r.stuck.length) console.log('  stuck reveals:', r.stuck.join(' ; '));
  for (const s of r.shifts) console.log('  shift', s.v.toFixed(4), '@', s.t, s.src);
  if (errs.length) console.log('  errors:', [...new Set(errs)].slice(0,5).join(' || '));
  if (out && [390,768,1440].includes(w) && !q) await p.screenshot({ path: `${out}/full-${w}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
