"""Join only the central cut; preserve every source contour outside the new connector."""
from pathlib import Path
import json
import numpy as np
import cv2
from PIL import Image
from shapely.geometry import Polygon
from shapely.ops import unary_union
from ribbon_profile import HALF_THICKNESS, REAR_DEPTH, REAR_CENTRE, REAR_WIDTH
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'src/brand/extractedContours.json').read_text())
# Source pieces: lower-left ribbon and upper-right spectrum ribbon.
indices=[0,3]
parts=[Polygon(source['shapes'][i]['outer'],source['shapes'][i]['holes']) for i in indices]
# Overlap both cut ends so the union has no coincident caps or surface seam.
connector=Polygon([(1170,465),(1399,380),(1435,357),(1500,403),(1470,430),(1288,547)])
joined=unary_union([*parts,connector])
assert joined.geom_type=='Polygon', 'Rear strand must be one connected solid.'
assert joined.is_valid
assert joined.difference(unary_union(parts)).difference(connector).area < 0.001
rear={'outer':list(joined.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in joined.interiors]}
# Continue the clipped white rear lip under the foreground instead of exposing its cap.
accent_source=Polygon(source['shapes'][1]['outer'],source['shapes'][1]['holes'])
accent_extension=Polygon([(1244,424),(1291,452),(1420,366),(1378,337)])
accent_joined=unary_union([accent_source,accent_extension])
assert accent_joined.geom_type=='Polygon' and accent_joined.is_valid
assert accent_joined.difference(accent_source).difference(accent_extension).area < 0.001
accent={'outer':list(accent_joined.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in accent_joined.interiors]}
# One rear solid: the lip and ribbon may overlap in projection, never as coplanar meshes.
surface=unary_union([joined,accent_joined])
assert surface.geom_type=='Polygon' and surface.is_valid
surface_data={'outer':list(surface.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in surface.interiors]}
# Validate physical clearance everywhere the rear solid crosses the foreground.
foreground=Polygon(source['shapes'][2]['outer'],source['shapes'][2]['holes'])
overlap=surface.intersection(foreground)
assert not overlap.is_empty
xmin,_,xmax,_=overlap.bounds
sample_x=np.linspace(xmin,xmax,1000)
clearance=REAR_DEPTH*np.exp(-((sample_x-REAR_CENTRE)/REAR_WIDTH)**4)-2*HALF_THICKNESS
assert clearance.min()>7, f'Rear ribbon intersects front solid: {clearance.min()}'
(root/'src/brand/rearCrossing.json').write_text(json.dumps({'indices':indices,'surface':surface_data},separators=(',',':')))

im=np.array(Image.open(root/'public/brand/infinity-extracted.png').convert('RGBA'))
mask=np.zeros(im.shape[:2],np.uint8); cv2.fillPoly(mask,[np.rint(connector.exterior.coords).astype(np.int32)],255)
y,x=np.indices(mask.shape)
t=np.clip((x-1310)/95,0,1); t=t*t*(3-2*t)
colour=np.array([235,235,238])[None,None,:]*(1-t[...,None])+np.array([192,21,35])[None,None,:]*t[...,None]
original=np.zeros_like(mask)
for part in parts:
    cv2.fillPoly(original,[np.rint(part.exterior.coords).astype(np.int32)],255)
    for hole in part.interiors: cv2.fillPoly(original,[np.rint(hole.coords).astype(np.int32)],0)
new_pixels=(mask>0)&(original==0)
im[new_pixels,:3]=colour[new_pixels].astype(np.uint8);im[new_pixels,3]=255
accent_mask=np.zeros_like(mask)
cv2.fillPoly(accent_mask,[np.rint(accent_extension.exterior.coords).astype(np.int32)],255)
original_accent=np.zeros_like(mask)
cv2.fillPoly(original_accent,[np.rint(accent_source.exterior.coords).astype(np.int32)],255)
extension_pixels=(accent_mask>0)&(original_accent==0)
im[extension_pixels]=[235,235,238,255]
# Remove antialiased pixels from the former end cap, now an interior part of the lip.
old_cap=np.zeros_like(mask)
cv2.line(old_cap,(1355,354),(1401,382),255,5,cv2.LINE_AA)
accent_interior=np.zeros_like(mask)
cv2.fillPoly(accent_interior,[np.rint(accent_joined.exterior.coords).astype(np.int32)],255)
accent_interior=cv2.erode(accent_interior,np.ones((3,3),np.uint8))
im[(old_cap>0)&(accent_interior>0)]=[235,235,238,255]
# Former red and white end caps are now interior pixels, not transparent cut edges.
interior=np.zeros_like(mask)
cv2.fillPoly(interior,[np.rint(surface.exterior.coords).astype(np.int32)],255)
for hole in surface.interiors: cv2.fillPoly(interior,[np.rint(hole.coords).astype(np.int32)],0)
interior=cv2.erode(interior,np.ones((5,5),np.uint8))
cap_cleanup=np.zeros_like(mask)
for start,end in [((1193,451),(1310,530)),((1405,384),(1470,425))]:
    cv2.line(cap_cleanup,start,end,255,7)
cap_cleanup=cv2.bitwise_and(cap_cleanup,interior)
im[:,:,:3]=cv2.inpaint(im[:,:,:3].copy(),cap_cleanup,4,cv2.INPAINT_TELEA)
im[interior>0,3]=255
assert np.all(im[interior>0,3]==255)
Image.fromarray(im).save(root/'public/brand/infinity-rear.webp',lossless=True)
print(f'One connected rear solid; minimum foreground clearance {clearance.min():.2f} units; former interior caps opaque.')
