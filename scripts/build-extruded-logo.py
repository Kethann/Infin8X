"""Trace the extracted alpha silhouette with subpixel simplification for real extrusion."""
from pathlib import Path
import cv2, json
import numpy as np
root = Path(__file__).resolve().parents[1]
im = cv2.imread(str(root/'public/brand/infinity-extracted.png'), cv2.IMREAD_UNCHANGED)
contours, hierarchy = cv2.findContours((im[:,:,3]>127).astype('uint8'), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
shapes = []
def points(c):
    # Remove raster stair-steps before extrusion so long sidewalls reflect smoothly.
    p = c.astype(np.float32)
    wrapped = np.concatenate((p[-4:], p, p[:4]))
    smooth = cv2.GaussianBlur(wrapped, (1, 7), 1.2)[4:-4]
    return cv2.approxPolyDP(smooth, 0.65, True).reshape(-1,2).round(3).tolist()
for i,c in enumerate(contours):
    if hierarchy[0][i][3] != -1 or cv2.contourArea(c)<50: continue
    holes=[]; child=hierarchy[0][i][2]
    while child!=-1:
        hole = points(contours[child])
        if cv2.contourArea(contours[child]) > 8 and len(hole) >= 3: holes.append(hole)
        child=hierarchy[0][child][0]
    shapes.append({'outer':points(c),'holes':holes})
assert 4 <= len(shapes) <= 5  # Two source pieces touch at the central crossing.
out={'width':im.shape[1],'height':im.shape[0],'shapes':shapes}
(root/'src/brand/extractedContours.json').write_text(json.dumps(out,separators=(',',':')))
print('Traced',len(shapes),'pieces;',sum(len(s['outer']) for s in shapes),'vertices; subpixel tracing with raster-edge smoothing')
