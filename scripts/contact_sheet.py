import cv2, glob, sys, numpy as np, re
pat, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(pat), key=lambda f: float(re.findall(r'-(\d+(?:_\d+)?)\.jpg$', f)[0].replace('_', '.')))
ims = []
for f in fs:
    im = cv2.imread(f); im = cv2.resize(im, (720, int(im.shape[0] * 720 / im.shape[1])))
    cv2.putText(im, re.findall(r'-(\d+(?:_\d+)?)\.jpg$', f)[0].replace('_', '.') + 's', (12, 30), 0, 0.8, (0, 255, 255), 2)
    ims.append(im)
while len(ims) % 3: ims.append(np.zeros_like(ims[0]))
rows = [np.hstack(ims[i:i+3]) for i in range(0, len(ims), 3)]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 82])
