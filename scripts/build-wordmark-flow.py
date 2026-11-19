"""Small source image and sparse flow coordinates for the wordmark's animated 8."""
from pathlib import Path
import argparse
import json
import cv2
import numpy as np
from PIL import Image
from ribbon_profile import colour_tip_mask
root = Path(__file__).resolve().parents[1]
out = root / 'public/brand'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--width', type=int, default=384)
parser.add_argument('--output-dir', type=Path, default=out)
args = parser.parse_args()
args.output_dir.mkdir(parents=True, exist_ok=True)
source = np.asarray(Image.open(out / 'infinity-extracted.png').convert('RGBA')).copy()
h, w = source.shape[:2]
contours = json.loads((root / 'src/brand/extractedContours.json').read_text())
tip = colour_tip_mask(contours)
source[tip, :3] = np.asarray(Image.open(out / 'ribbon-pigment-front.webp'))[tip, :3]
# Open the source's secondary slits just enough to survive the small italic mark.
# Each cut follows an existing sweep and tapers to zero at its pointed ends.
cuts = json.loads((root / 'src/brand/wordmarkCuts.json').read_text())
cut_mask = np.zeros((h, w), np.uint8)
for cut in cuts['curves']:
    a, b, c, d = np.asarray(cut['points'], dtype=float)
    t = np.linspace(0, 1, 180)
    points = ((1-t[:, None])**3*a + 3*(1-t[:, None])**2*t[:, None]*b
              + 3*(1-t[:, None])*t[:, None]**2*c + t[:, None]**3*d)
    for index in range(len(points)-1):
        thickness = max(1, round(cuts['width'] * np.sin(np.pi * t[index])**.8))
        cv2.line(cut_mask, tuple(np.rint(points[index]).astype(int)),
                 tuple(np.rint(points[index+1]).astype(int)), 255, thickness, cv2.LINE_AA)
source[:, :, 3] = np.rint(source[:, :, 3].astype(float) * (1 - cut_mask / 255)).astype(np.uint8)
rear = np.zeros((h, w), np.uint8)
for index in [0, 1, 3]:
    shape = contours['shapes'][index]
    cv2.fillPoly(rear, [np.rint(shape['outer']).astype(np.int32)], 1)
    for hole in shape['holes']:
        cv2.fillPoly(rear, [np.rint(hole).astype(np.int32)], 0)
size = (args.width, round(h * args.width / w))
# Decode 16-bit channels before resizing so channel carries never introduce stripes.
coords = []
for name in ['front', 'rear']:
    phase = np.asarray(Image.open(out / f'colour-phase-{name}.png')).astype(float)
    field = np.asarray(Image.open(out / f'colour-flow-{name}.png')).astype(float)
    along = (phase[:, :, 0] * 256 + phase[:, :, 1]) / 65535
    across = ((field[:, :, 1] * 256 + field[:, :, 2]) / 65535 - .5) * 800
    coords.append([cv2.resize(channel, size) for channel in [along, across]])
small_rear = cv2.resize(rear, size, interpolation=cv2.INTER_NEAREST) > 0
along = np.where(small_rear, coords[1][0], coords[0][0])
across = np.where(small_rear, coords[1][1], coords[0][1])
small = np.asarray(Image.fromarray(source).resize(size, Image.Resampling.LANCZOS))
Image.fromarray(small).save(args.output_dir / 'wordmark-flow-source.png')
rgb = small[:, :, :3] / 255
linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
peak = linear.max(2)
t = np.clip(((peak - linear.min(2)) / np.maximum(peak, .001) - .09) / .19, 0, 1)
mask = t * t * (3 - 2 * t)
# Very faint antialiased pixels have unstable unpremultiplied RGB; never turn
# those neutral fringe pixels into moving colour. Keep their source shading.
mask[small[:, :, 3] < 64] = 0
selected = (mask > .001) & (small[:, :, 3] > 0)
indices = np.arange(size[0] * size[1]).reshape(size[1], size[0])
records = np.column_stack([indices[selected], along[selected], across[selected], mask[selected], np.maximum(peak[selected], .82)])
records.astype('<f4').tofile(args.output_dir / 'wordmark-flow.bin')
print(f'Built {size[0]}×{size[1]} wordmark, {len(records)} animated pixels; tapered source cuts enhanced, white region preserved.')
