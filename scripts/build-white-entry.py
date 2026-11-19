"""Static fallback matching the shader's white-to-spectrum entry; source artwork stays intact."""
from pathlib import Path
import json
import numpy as np
import cv2
from PIL import Image
from ribbon_profile import colour_tip_mask
root=Path(__file__).resolve().parents[1]
im=np.asarray(Image.open(root/'public/brand/infinity-extracted.png').convert('RGBA')).copy()
h,w=im.shape[:2]
rear=np.zeros((h,w),np.uint8)
contours=json.loads((root/'src/brand/extractedContours.json').read_text())
tip=colour_tip_mask(contours)
pigment=np.asarray(Image.open(root/'public/brand/ribbon-pigment-front.webp'))
im[tip,:3]=pigment[tip,:3]
for index in [0,1,3]:
    part=contours['shapes'][index]
    cv2.fillPoly(rear,[np.rint(part['outer']).astype(np.int32)],1)
    for hole in part['holes']: cv2.fillPoly(rear,[np.rint(hole).astype(np.int32)],0)
fields=[];phases=[]
for name in ['front','rear']:
    field=np.asarray(Image.open(root/f'public/brand/colour-flow-{name}.png'))/255.0
    fields.append(cv2.resize(field,(w,h),interpolation=cv2.INTER_LINEAR))
    phase=np.asarray(Image.open(root/f'public/brand/colour-phase-{name}.png')).astype(float)
    phase=(phase[:,:,0]*256+phase[:,:,1])/65535
    phases.append(cv2.resize(phase,(w,h),interpolation=cv2.INTER_LINEAR))
field=np.where((rear>0)[:,:,None],fields[1],fields[0])
along=np.where(rear>0,phases[1],phases[0])
across=((field[:,:,1]*65280+field[:,:,2]*255)/65535-.5)*800
def smooth(a,b,v):
    t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
rgb=im[:,:,:3]/255.0
linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
peak=linear.max(2);floor=linear.min(2)
mask=smooth(.09,.28,(peak-floor)/np.maximum(peak,.001))
# Match the physical face shader at time zero, including the no-green spectrum.
palette=json.loads((root/'src/brand/flowPalette.json').read_text())
stops=np.array([stop['rgb'] for stop in palette])**2.2
positions=np.array([stop['position'] for stop in palette]+[1.0])
def spectrum(phase):
    p=np.mod(phase,1)
    index=np.searchsorted(positions,p,side='right')-1
    f=(p-positions[index])/(positions[index+1]-positions[index]);f=f*f*(3-2*f)
    return stops[index]*(1-f[:,:,None])+stops[(index+1)%len(stops)]*f[:,:,None]
phase=along*1.10+.022*np.sin(across*.012+along*10)+across*.0013
interleave=(.10+.04*np.sin(across*.018-along*8))[:,:,None]
colour=(spectrum(phase)*(1-interleave)+spectrum(phase+.065)*interleave)*np.maximum(peak,.82)[:,:,None]
linear=linear*(1-mask[:,:,None])+colour*mask[:,:,None]
emergence=smooth(.035,.09,along)
white=mask*(1-emergence)
linear=linear*(1-white[:,:,None])+np.array([.835,.835,.85])*white[:,:,None]
rgb=np.where(linear<=.0031308,linear*12.92,1.055*np.maximum(linear,0)**(1/2.4)-.055)
im[:,:,:3]=np.rint(np.clip(rgb,0,1)*255).astype(np.uint8)
Image.fromarray(im).save(root/'public/brand/infinity-white-entry.webp',lossless=True)
print('Built matching white-entry fallback; original extraction preserved.')
