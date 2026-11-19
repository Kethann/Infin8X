"""Stream full-colour lossless WebP and improved GIF exports without retaining all frames."""
from pathlib import Path
from PIL import Image, _webp, GifImagePlugin
import numpy as np
import json
import sys
import time

kind=sys.argv[1] if len(sys.argv)>1 else 'full'
assert kind in ['full','text']
live='--live' in sys.argv
folder=Path(f'/tmp/infin8x-hq-{kind}-frames')
out=Path('exports/high-quality');out.mkdir(parents=True,exist_ok=True)
label='full-logo' if kind=='full' else 'text-only'
fps,count,fade=30,360,30

def read_frame(i):
    deadline=time.monotonic()+120
    while True:
        try: return Image.open(folder/f'{i:04d}.png').convert('RGBA')
        except (OSError, EOFError):
            if not live or time.monotonic()>deadline: raise
            time.sleep(.25)

def frame_at(i):
    if live: i=(i+fade)%count
    frame=read_frame(i)
    if i<fade:
        end=read_frame(count+i)
        amount=i/fade;amount=amount*amount*(3-2*amount)
        frame=Image.blend(end,frame,amount)
    return frame

gif_size=(1600,704) if kind=='full' else (1800,412)
gif=out/f'INFIN8X-{label}-HQ.gif'
def write_gif_frame(stream,frame,i):
    image=frame.resize(gif_size,Image.Resampling.LANCZOS)
    # Quantize each frame directly: avoids a single palette covering unrelated hues.
    indexed=image.convert('RGB').quantize(colors=255,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    indexed.paste(255,mask=image.getchannel('A').point(lambda alpha:255 if alpha<128 else 0))
    palette=indexed.getpalette();palette+= [0]*(768-len(palette));indexed.putpalette(palette)
    duration=(round((i+1)*100/fps)-round(i*100/fps))*10
    info={'loop':0,'duration':duration,'transparency':255,'background':255,'disposal':2,'optimize':False,'include_color_table':i>0}
    if i==0:
        for block in GifImagePlugin._get_global_header(indexed,info):stream.write(block)
    GifImagePlugin._write_frame_data(stream,indexed,(0,0),info)
    if i%60==0:print(f'{kind}: GIF frame {i}/{count}',flush=True)

first=frame_at(0)
width,height=first.size
assert width==(2000 if kind=='full' else 2400)
assert first.getchannel('A').getpixel((0,0))==0
first.save(out/f'INFIN8X-{label}-HQ-poster.png')
webp=out/f'INFIN8X-{label}-HQ-lossless.webp'
# Lossless=True preserves the source pixels; quality here controls encoding effort.
encoder=_webp.WebPAnimEncoder(width,height,0,0,False,9,17,False,False)
gif_stream=gif.open('wb') if live else None
for i in range(count):
    frame=frame_at(i)
    encoder.add(frame.tobytes(),round(i*1000/fps),width,height,'RGBA',True,80,4)
    if gif_stream: write_gif_frame(gif_stream,frame,i)
    if i%60==0: print(f'{kind}: lossless frame {i}/{count}',flush=True)
encoder.add(None,12000,0,0,'',True,80,0)
webp.write_bytes(encoder.assemble('','',''))
del encoder
if gif_stream:
    gif_stream.write(b';');gif_stream.close()
# Verify decoded frames against the exact PNG originals, including soft alpha.
with Image.open(webp) as decoded:
    assert decoded.n_frames==count
    assert decoded.info['loop']==0
    for index in [0,29,60,180,359]:
        decoded.seek(index);actual=np.array(decoded.convert('RGBA'));expected=np.array(frame_at(index))
        assert np.array_equal(actual[:,:,3],expected[:,:,3]),f'Alpha changed at {index}'
        visible=expected[:,:,3]>0
        assert np.array_equal(actual[:,:,:3][visible],expected[:,:,:3][visible]),f'Colour changed at {index}'
    duration=0
    for i in range(count): decoded.seek(i);decoded.load();duration+=decoded.info['duration']
    assert duration==12000
print(f'PASS {webp.name}: decoded RGBA matches source at sampled frames; {webp.stat().st_size/1024/1024:.2f} MB',flush=True)

# Keep GIF compatibility, with more pixels and a fresh palette for every frame.
# Palette conversion is intrinsically lossy; the WebP above is the quality master.
if not live:
    with gif.open('wb') as stream:
        for i in range(count): write_gif_frame(stream,frame_at(i),i)
        stream.write(b';')
with Image.open(gif) as decoded:
    assert decoded.n_frames==count
    total=0
    for i in range(count):
        decoded.seek(i);total+=decoded.info['duration']
        if i in [0,180,359]:assert decoded.convert('RGBA').getpixel((0,0))[3]==0
    assert total==12000
print(f'PASS {gif.name}: {gif_size}, 360 frames, 12 seconds, transparency; {gif.stat().st_size/1024/1024:.2f} MB',flush=True)
(out/f'{kind}-verification.json').write_text(json.dumps({'kind':kind,'resolution':[width,height],'fps':fps,'frames':count,'duration_ms':12000,'loop':0,'lossless_samples':[0,29,60,180,359],'cycle_start_frame':fade if live else 0,'visible_rgb_exact':True,'alpha_exact':True,'gif_resolution':gif_size},indent=2))
