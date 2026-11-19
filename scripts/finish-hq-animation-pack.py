from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json
out=Path('exports/high-quality')
for kind in ['full','text']:
    report=json.loads((out/f'{kind}-verification.json').read_text())
    assert report['visible_rgb_exact'] and report['alpha_exact']
readme='''INFIN8X HIGH-QUALITY ANIMATIONS

QUALITY MASTERS (recommended)
INFIN8X-full-logo-HQ-lossless.webp — 2000 × 880, 30 fps.
INFIN8X-text-only-HQ-lossless.webp — 2400 × 550, 30 fps.
Both are 12-second loops with full-colour, soft alpha transparency.
These files are encoded losslessly from newly rendered native-resolution frames.
They are not enlargements of the earlier GIFs.
The infinity inside the name uses a 1536-pixel source instead of the small website asset.

GIF COMPATIBILITY COPIES
INFIN8X-full-logo-HQ.gif — 1600 × 704.
INFIN8X-text-only-HQ.gif — 1800 × 412.
GIF still restricts the palette to 256 colours and transparency to on/off.
These copies use per-frame palettes and avoid the previous spatial dithering.
Use the lossless WebP masters when visual quality is the priority.

Open preview.html after extracting this folder to inspect the animations.
The PNG posters are lossless stills for reduced-motion or fallback use.
The JSON reports record decoded-pixel, alpha, duration and loop verification.

WEBSITE EXAMPLE
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="/INFIN8X-full-logo-HQ-poster.png">
  <img src="/INFIN8X-full-logo-HQ-lossless.webp" alt="INFIN8X" width="2000" height="880" style="width:100%;max-width:1000px;height:auto">
</picture>
'''
(out/'README.txt').write_text(readme)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INFIN8X — lossless animation masters</title><style>body{margin:0;padding:24px;background:#020611;color:#edf2fa;font:16px system-ui}main{max-width:1600px;margin:auto}h1{font-size:24px}p{color:#a8b6c9}section{padding:24px;margin:24px 0;border:1px solid #28374e;border-radius:16px;overflow:auto}img{display:block;max-width:100%;height:auto;margin:auto}h2{font-size:15px;font-weight:500}button{font:inherit;background:#142034;color:white;border:1px solid #53647d;padding:10px 16px;border-radius:20px;margin:4px;cursor:pointer}.actual img{max-width:none}.checker section{background-color:#15202e;background-image:conic-gradient(#223042 25%,transparent 0 50%,#223042 0 75%,transparent 0);background-size:32px 32px}</style><main><h1>INFIN8X · Lossless animation masters</h1><p>Native-resolution renders. Full colour. Soft transparent edges. 30 fps.</p><button id="scale">Toggle actual pixels / fit</button><button id="background">Toggle transparency grid</button><section><h2>Full logo + name · 2000 × 880</h2><img src="INFIN8X-full-logo-HQ-lossless.webp" width="2000" height="880" alt="Full animated INFIN8X logo"></section><section><h2>Text only · 2400 × 550</h2><img src="INFIN8X-text-only-HQ-lossless.webp" width="2400" height="550" alt="Animated INFIN8X wordmark"></section></main><script>document.getElementById('scale').onclick=()=>document.body.classList.toggle('actual');document.getElementById('background').onclick=()=>document.body.classList.toggle('checker');</script></html>'''
(out/'preview.html').write_text(html)
files=[p for p in out.iterdir() if p.suffix in ['.webp','.gif','.png','.json','.txt','.html']]
with ZipFile('exports/INFIN8X-high-quality-animation-pack.zip','w',ZIP_DEFLATED) as archive:
    for p in files:archive.write(p,arcname=p.name)
for p in files:print(p.name,round(p.stat().st_size/1024/1024,2),'MB')
print('High-quality pack ready.')
