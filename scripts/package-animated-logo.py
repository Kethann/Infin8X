"""Package rendered frames as transparent looping WebP files and an offline preview."""
from pathlib import Path
from PIL import Image, ImageChops
import base64
import json
import numpy as np

source=Path('/tmp/infin8x-animation-frames')
out=Path('exports')
fps=24
count=288
fade=24
frames=[]
for i in range(count):
    image=Image.open(source/f'{i:04d}.png').convert('RGBA')
    if i<fade:
        continuation=Image.open(source/f'{count+i:04d}.png').convert('RGBA')
        weight=i/fade
        weight=weight*weight*(3-2*weight)
        image=Image.blend(continuation,image,weight)
    frames.append(image)
assert frames[0].getchannel('A').getbbox()[1]<50, 'Main infinity logo missing'
assert ImageChops.difference(frames[36],frames[180]).convert('RGB').getbbox(), 'Animation is static'
# The stationary white half and typography should remain unchanged.
a=np.asarray(frames[36]);b=np.asarray(frames[180])
assert np.array_equal(a[50:250,70:350],b[50:250,70:350]), 'White half changed'
durations=[round((i+1)*1000/fps)-round(i*1000/fps) for i in range(count)]
for label,size,quality in [('logo',(1000,440),88),('watermark',(500,220),84)]:
    images=frames if size==frames[0].size else [frame.resize(size,Image.Resampling.LANCZOS) for frame in frames]
    path=out/f'INFIN8X-animated-{label}.webp'
    images[0].save(path,save_all=True,append_images=images[1:],duration=durations,loop=0,quality=quality,method=4,minimize_size=True)
    with Image.open(path) as check:
        assert check.n_frames==count
        assert check.info.get('loop')==0
        check.seek(36)
        assert check.convert('RGBA').getpixel((0,0))[3]==0
        elapsed=0
        for i in range(check.n_frames):
            check.seek(i);check.load();elapsed+=check.info['duration']
        assert elapsed==12000,elapsed
    print(f'{path}: {size[0]}×{size[1]}, {count} frames, 12 seconds, {path.stat().st_size/1024/1024:.2f} MB',flush=True)
frames[0].save(out/'INFIN8X-animated-logo-poster.png')
encoded=base64.b64encode((out/'INFIN8X-animated-watermark.webp').read_bytes()).decode()
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INFIN8X animated logo</title><style>body{margin:0;background:#020611;color:#e8edf7;font:16px system-ui;min-height:100vh;display:grid;place-items:center}main{width:min(100% - 32px,1000px);text-align:center}img{display:block;width:100%;height:auto}p{color:#a9b6c9;font-size:14px}button{font:inherit;padding:10px 18px;border:1px solid #465168;border-radius:30px;background:#111c2b;color:white;cursor:pointer;margin-top:24px}body.checker{background-color:#15202e;background-image:conic-gradient(#223042 25%,transparent 0 50%,#223042 0 75%,transparent 0);background-size:32px 32px}</style><main><img src="data:image/webp;base64,ANIMATION" width="500" height="220" alt="Animated INFIN8X infinity logo with name"><button onclick="document.body.classList.toggle('checker')">Toggle transparency preview</button><p>12-second looping colour flow · transparent background</p></main></html>'''.replace('ANIMATION',encoded)
(out/'INFIN8X-animation-preview.html').write_text(html)
(out/'INFIN8X-animation-usage.txt').write_text('''INFIN8X animated logo\n\nINFIN8X-animated-logo.webp — 1000 × 440, transparent, 12-second looping animation.\nINFIN8X-animated-watermark.webp — 500 × 220, smaller website/watermark version.\nINFIN8X-animated-logo-poster.png — static fallback / reduced motion.\nINFIN8X-animation-preview.html — self-contained offline animation preview.\n\nWebsite example (copy both image assets to the same public folder):\n<picture>\n  <source media="(prefers-reduced-motion: reduce)" srcset="/INFIN8X-animated-logo-poster.png">\n  <img src="/INFIN8X-animated-watermark.webp" alt="INFIN8X" width="500" height="220" style="width:150px;height:auto">\n</picture>\n\nWhite lettering reads best against a dark background. The image itself has no background.\n''')
print('Verified transparency, motion, fixed white half, duration and loop metadata. Offline preview and usage notes written.',flush=True)

# The separate wordmark is rendered at twice its size in the full composition.
text_source=Path('/tmp/infin8x-wordmark-animation-frames')
text_frames=[]
for i in range(count):
    image=Image.open(text_source/f'{i:04d}.png').convert('RGBA')
    if i<fade:
        continuation=Image.open(text_source/f'{count+i:04d}.png').convert('RGBA')
        weight=i/fade;weight=weight*weight*(3-2*weight)
        image=Image.blend(continuation,image,weight)
    text_frames.append(image)
text_frames[0].save(out/'INFIN8X-animated-text-only.webp',save_all=True,append_images=text_frames[1:],duration=durations,loop=0,quality=90,method=4,minimize_size=True)
text_frames[0].save(out/'INFIN8X-text-only-poster.png')

# GIF uses a shared 255-colour palette and reserves index 255 for transparency.
gif_durations=[(round((i+1)*100/fps)-round(i*100/fps))*10 for i in range(count)]
for label,original,size in [('full-logo',frames,(800,352)),('text-only',text_frames,(700,160))]:
    gif_frames=[image.resize(size,Image.Resampling.LANCZOS) for image in original]
    samples=[image.convert('RGB').resize((400,round(size[1]*400/size[0]))) for image in gif_frames[::12]]
    sheet=Image.new('RGB',(400*6,samples[0].height*4))
    for i,sample in enumerate(samples): sheet.paste(sample,((i%6)*400,(i//6)*sample.height))
    colours=sheet.quantize(colors=255,method=Image.Quantize.MEDIANCUT)
    indexed=[]
    for image in gif_frames:
        frame=image.convert('RGB').quantize(palette=colours,dither=Image.Dither.FLOYDSTEINBERG)
        frame.paste(255,mask=image.getchannel('A').point(lambda a:255 if a<128 else 0))
        frame.info['transparency']=255
        indexed.append(frame)
    path=out/f'INFIN8X-animated-{label}.gif'
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=gif_durations,loop=0,transparency=255,background=255,disposal=2,optimize=False)
    with Image.open(path) as check:
        assert check.n_frames==count
        assert sum((check.seek(i) or check.info['duration']) for i in range(count))==12000
        check.seek(0);assert check.convert('RGBA').getpixel((0,0))[3]==0
    print(f'{path}: {size[0]}×{size[1]}, transparent GIF, {path.stat().st_size/1024/1024:.2f} MB',flush=True)

full_data=base64.b64encode((out/'INFIN8X-animated-watermark.webp').read_bytes()).decode()
text_data=base64.b64encode((out/'INFIN8X-animated-text-only.webp').read_bytes()).decode()
preview='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INFIN8X animations</title><style>body{margin:0;padding:32px;background:#020611;color:#edf2fa;font:16px system-ui}main{max-width:900px;margin:auto;text-align:center}section{padding:24px;border:1px solid #263146;border-radius:20px;margin-bottom:24px}img{display:block;max-width:100%;height:auto;margin:auto}h1{font-size:24px}h2{font-size:16px;font-weight:500;color:#a9b6c9}button{font:inherit;padding:10px 18px;border:1px solid #465168;border-radius:30px;background:#111c2b;color:white;cursor:pointer}body.checker section{background-color:#15202e;background-image:conic-gradient(#223042 25%,transparent 0 50%,#223042 0 75%,transparent 0);background-size:32px 32px}</style><main><h1>INFIN8X animated logos</h1><section><h2>Full logo with name</h2><img src="data:image/webp;base64,__FULL_ANIMATION__" width="500" height="220" alt="Animated full INFIN8X logo"></section><section><h2>Text only</h2><img src="data:image/webp;base64,__TEXT_ANIMATION__" width="700" height="160" alt="Animated INFIN8X wordmark"></section><button onclick="document.body.classList.toggle('checker')">Toggle transparency preview</button><p>12-second loops · transparent backgrounds</p></main></html>'''.replace('__FULL_ANIMATION__',full_data).replace('__TEXT_ANIMATION__',text_data)
(out/'INFIN8X-animation-preview.html').write_text(preview)
with (out/'INFIN8X-animation-usage.txt').open('a') as notes:
    notes.write('\nAdditional requested versions:\nINFIN8X-animated-full-logo.gif — full logo and name, 800 × 352.\nINFIN8X-animated-text-only.gif — name only, 700 × 160.\nINFIN8X-animated-text-only.webp — name only with smooth alpha transparency.\nGIF supports binary transparency; WebP preserves smoother transparent edges.\n')
from zipfile import ZipFile, ZIP_DEFLATED
with ZipFile(out/'INFIN8X-animation-pack.zip','w',ZIP_DEFLATED) as archive:
    for name in ['INFIN8X-animated-full-logo.gif','INFIN8X-animated-text-only.gif','INFIN8X-animated-logo.webp','INFIN8X-animated-watermark.webp','INFIN8X-animated-text-only.webp','INFIN8X-animated-logo-poster.png','INFIN8X-text-only-poster.png','INFIN8X-animation-preview.html','INFIN8X-animation-usage.txt']:
        archive.write(out/name,arcname=name)
print('Both GIFs, both logo layouts, offline preview and ZIP pack are ready.',flush=True)
