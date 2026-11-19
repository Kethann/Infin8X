"""Bake soft inward bevel shading without altering the logo's contour or cut gaps."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
contours = json.loads((root / 'src/brand/extractedContours.json').read_text())
rear = json.loads((root / 'src/brand/rearCrossing.json').read_text())['surface']
W, H = contours['width'], contours['height']
w, h = 1400, round(H * 1400 / W)
pixel_world = 1000 / w

for name, shapes in [('front', [contours['shapes'][2]]), ('rear', [rear])]:
    # Use each solid separately: a cut can never become a bridge in the normal field.
    mask = np.zeros((h, w), np.uint8)
    for part in shapes:
        points = lambda ring: np.rint(np.asarray(ring) * [w / W, h / H]).astype(np.int32)
        cv2.fillPoly(mask, [points(part['outer'])], 255)
        for hole in part['holes']:
            cv2.fillPoly(mask, [points(hole)], 0)
    inside = cv2.distanceTransform(mask, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    outside = cv2.distanceTransform(255 - mask, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    distance = (inside - outside) * pixel_world
    # Broad convex face, smoothly capped at its centre. Signed extension avoids
    # a normal discontinuity at the contour when the GPU filters the texture.
    height = 8 * np.sin(np.clip(distance / 24, -1, 1) * np.pi / 2)
    height = cv2.GaussianBlur(height, (0, 0), 2.0)
    dy, dx = np.gradient(height, pixel_world)
    normal = np.dstack([-dx, dy, np.ones_like(dx)])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    assert np.isfinite(normal).all()
    rgb = np.rint((normal * .5 + .5) * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(root / f'public/brand/ribbon-normal-{name}.png')
    print(f'{name}: {w}×{h} rounded face normals; source contours unchanged.')
