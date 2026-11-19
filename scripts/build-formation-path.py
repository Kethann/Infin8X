"""Sample the actual mesh's reveal edge for the travelling formation light."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, gaussian_filter1d

root = Path(__file__).resolve().parents[1]
meshes = []
for name in ['front', 'rear']:
    data = (root / f'public/brand/ribbon-{name}.bin').read_bytes()
    magic, count, indices = np.frombuffer(data, '<u4', count=3)
    assert magic == 0x52494231
    positions = np.frombuffer(data, '<f4', count=count*3, offset=12).reshape(-1, 3)
    uv = np.frombuffer(data, '<f4', count=count*2, offset=12+count*24).reshape(-1, 2)
    faces = np.frombuffer(data, '<u4', count=indices, offset=12+count*32).reshape(-1, 3)
    meshes.append((name, positions, uv, faces))

samples, progress, weights = [], [], []
for name, positions, uv, faces in meshes:
    triangles = positions[faces]
    area = np.cross(triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0])[:, 2]
    visible = area > 1e-8
    points = triangles[visible].mean(1)
    texcoords = uv[faces[visible]].mean(1)

    def sample_image(filename):
        image = np.asarray(Image.open(root / 'public/brand' / filename).convert('RGB'), dtype=float)
        h, w = image.shape[:2]
        coords = [(1-texcoords[:, 1])*h-0.5, texcoords[:, 0]*w-0.5]
        return np.column_stack([map_coordinates(image[:, :, c], coords, order=1, mode='nearest') for c in range(3)])

    phase = sample_image(f'formation-field-{name}.png')
    along = (phase[:, 0]*256+phase[:, 1])/65535
    progress.append(along)
    samples.append(points)
    weights.append(area[visible])

samples, progress, weights = map(np.concatenate, [samples, progress, weights])
count = 257
path = []
for step in range(count):
    t = step/(count-1)
    distance = np.abs(progress-t)
    selected = distance < 1/(count-1)
    if not selected.any():
        selected = distance <= distance.min()+1e-6
    w = weights[selected]*np.maximum(1-distance[selected]*count/2, .05)
    path.append(np.average(samples[selected], axis=0, weights=w).round(4).tolist())

path = gaussian_filter1d(np.asarray(path), 1.5, axis=0, mode='nearest').round(4).tolist()
assert np.isfinite(path).all()
output = root / 'src/brand/formationPath.json'
output.write_text(json.dumps({'points': path}, separators=(',', ':'))+'\n')
print(f'Built {count} mesh-matched formation targets: {output.name}')
for t in [0, .125, .25, .375, .5, .625, .75, .875, 1]:
    print(t, path[round(t*(count-1))])
