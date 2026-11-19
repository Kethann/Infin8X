"""Shared arc-length coordinates for light travelling along the two 3D colour surfaces."""
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
W,H=2787,936
# One continuous path: hidden crossing -> upper spectrum arc -> right turn -> lower arc.
curves=[[(1270,510),(1460,350),(1750,80),(2180,90)],
        [(2180,90),(2470,75),(2740,200),(2690,480)],
        [(2690,480),(2650,760),(2450,900),(2090,770)],
        [(2090,770),(1660,680),(1380,420),(1130,240)]]
points=[]
for control in curves:
    a,b,c,d=np.array(control,dtype=float)
    t=np.linspace(0,1,1200,endpoint=False)[:,None]
    points.append((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d)
points=np.vstack([*points,np.array(curves[-1][-1])[None,:]])
length=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
tangent=np.gradient(points,axis=0); tangent/=np.linalg.norm(tangent,axis=1)[:,None]
normal=np.column_stack([-tangent[:,1],tangent[:,0]])
w=1400;h=round(H*w/W)
y,x=np.mgrid[:h,:w]; grid=np.column_stack([(x.ravel()+.5)*W/w,(y.ravel()+.5)*H/h])
for name,lo,hi in [('rear',0,2401),('front',2400,len(points))]:
    _,nearest=cKDTree(points[lo:hi]).query(grid);nearest+=lo
    signed=((grid-points[nearest])*normal[nearest]).sum(axis=1)
    progress=length[nearest]/length[-1]
    lateral=np.rint(np.clip(signed/800+.5,0,1)*65535).astype(np.uint16)
    # RGB, no colour space conversion: G/B encode a 16-bit transverse distance.
    out=np.column_stack([np.rint(progress*255),lateral//256,lateral%256]).astype(np.uint8).reshape(h,w,3)
    Image.fromarray(out).save(root/f'public/brand/colour-flow-{name}.png')
    # Separate linear 16-bit progress avoids visible bands across smooth gradients.
    # RGB only: PNG alpha is never used to store data that a decoder could premultiply.
    phase=np.rint(progress*65535).astype(np.uint16)
    fine=np.column_stack([phase//256,phase%256,np.zeros_like(phase)]).astype(np.uint8).reshape(h,w,3)
    Image.fromarray(fine).save(root/f'public/brand/colour-phase-{name}.png')
assert np.all(np.diff(length)>0)
print('Shared flow path:',round(length[-1]),'source pixels; front/rear join at',round(length[2400]/length[-1],4))
