"""Bake one continuous reveal route, including separate front/rear crossing coordinates."""
from pathlib import Path
import json
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
route = json.loads((root/'src/brand/formationRoute.json').read_text())
W, H = 2787, 936
legs, offset = [], 0.0
for leg in route['legs']:
    segments = []
    for control in leg['curves']:
        a,b,c,d = np.array(control,dtype=float)
        t = np.linspace(0,1,1200,endpoint=False)[:,None]
        segments.append((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d)
    points = np.vstack([*segments,np.array(leg['curves'][-1][-1])[None,:]])
    distance = np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    tangent = np.gradient(points,axis=0)
    tangent /= np.linalg.norm(tangent,axis=1)[:,None]
    legs.append((leg['surface'],points,distance+offset,tangent,leg.get('pigment')))
    offset += distance[-1]

w = 1400; h = round(H*w/W)
y,x = np.mgrid[:h,:w]
grid = np.column_stack([(x.ravel()+.5)*W/w,(y.ravel()+.5)*H/h])
for surface in ['front','rear']:
    selected = [leg for leg in legs if leg[0]==surface]
    # The foreground contains adjacent white and coloured strokes travelling in
    # opposite directions. Classify their existing pigment once at bake time,
    # so the nearer stroke cannot steal the other stroke's reveal coordinates.
    pigment = np.asarray(Image.open(root/f'public/brand/ribbon-pigment-{surface}.webp')
                         .convert('RGB').resize((w,h),Image.Resampling.NEAREST),dtype=float)/255
    linear = np.where(pigment<=.04045,pigment/12.92,((pigment+.055)/1.055)**2.4)
    coloured = (np.ptp(linear,axis=2)/np.maximum(linear.max(2),.001)>.185).ravel()
    progress = np.zeros(len(grid)); transverse = np.zeros(len(grid))
    for _,points,distance,tangent,kind in selected:
        use = coloured if kind=='colour' else ~coloured if kind=='white' else np.ones(len(grid),dtype=bool)
        _, nearest = cKDTree(points).query(grid[use])
        delta = grid[use]-points[nearest]
        # Project beyond endpoints too: clamping a whole tip to one value makes it pop in.
        along = (distance[nearest]+(delta*tangent[nearest]).sum(1))/offset
        progress[use] = route['start']+(route['end']-route['start'])*np.clip(along,0,1)
        normal = np.column_stack([-tangent[nearest,1],tangent[nearest,0]])
        transverse[use] = np.clip((delta*normal).sum(1)/800+.5,0,1)
    phase = np.rint(progress*65535).astype(np.uint16)
    # RGB only: an alpha data channel would risk browser premultiplication.
    rgb = np.column_stack([phase//256,phase%256,np.rint(transverse*255)]).astype(np.uint8)
    Image.fromarray(rgb.reshape(h,w,3)).save(root/f'public/brand/formation-field-{surface}.png')

# A reviewable route preview; source alpha is composited before annotations.
base = Image.new('RGBA',(W,H),(2,6,17,255))
base.alpha_composite(Image.open(root/'public/brand/infinity-white-entry.webp').convert('RGBA'))
draw = ImageDraw.Draw(base)
for index, (_,points,_,_,_) in enumerate(legs):
    colour = ['#54efff','#ffffff','#ffb65a'][index]
    draw.line([tuple(p) for p in points[::20]],fill=colour,width=7)
    for at in np.linspace(60,len(points)-80,5).astype(int):
        p=points[at]; direction=points[at+20]-p; direction/=np.linalg.norm(direction)
        side=np.array([-direction[1],direction[0]])
        draw.polygon([tuple(p+direction*20),tuple(p-direction*12+side*11),tuple(p-direction*12-side*11)],fill=colour)
base.convert('RGB').resize((1394,468)).save('/tmp/infin8x-formation-route.jpg')
print(f'Baked {offset:.0f}px continuous route into two {w}×{h} formation fields.')
