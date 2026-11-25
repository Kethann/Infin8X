"""Extract the five original symbol components, preserving source colours and antialiased tips."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[1]
im = np.asarray(Image.open(root / 'source-assets/logo/logo-source-render.png').convert('RGB'))
bright = im.max(axis=2)
_, labels, stats, _ = cv2.connectedComponentsWithStats((bright > 45).astype(np.uint8))
ids = [i for i, (x,y,w,h,a) in enumerate(stats) if i and y < 850 and a > 1000]
assert len(ids) == 5, 'Source changed: inspect symbol components before extracting.'
mask = np.isin(labels, ids).astype(np.uint8)
# Include the soft edge pixels around each component, without reconnecting any text.
edge = cv2.dilate(mask, np.ones((5,5), np.uint8))
alpha = np.clip((bright.astype(float) - 24) / 21, 0, 1) * edge
alpha[mask == 1] = 1
rgb = im.astype(float)
bg = np.median(im[:40,:400], axis=(0,1))
rgb = np.clip((rgb - bg * (1-alpha[...,None])) / np.maximum(alpha[...,None], 1/255),0,255)
rgb[alpha == 0] = 0
ys,xs = np.where(alpha > 0)
box = (xs.min()-4, ys.min()-4, xs.max()+5, ys.max()+5)
out = Image.fromarray(np.dstack((rgb.astype('uint8'), (alpha*255).astype('uint8'))), 'RGBA').crop(box)
folder = root / 'public/brand'
out.save(folder / 'infinity-extracted.png')
out.save(folder / 'infinity-extracted.webp', lossless=True)
preview = out.copy(); preview.thumbnail((1200,400)); preview.save('/tmp/extracted-logo.png')
print('Extracted', out.size, 'from', box, '— five symbol components, no lettering or sparkle')
