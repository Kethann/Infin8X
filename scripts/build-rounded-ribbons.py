"""Closed rounded ribbons, clipped to the exact original contours (never expanded)."""
from pathlib import Path
import json
import cv2
import numpy as np
import shapely
from shapely.geometry import Polygon
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates
from PIL import Image
from ribbon_profile import HALF_THICKNESS, REAR_DEPTH, REAR_CENTRE, REAR_WIDTH, extend_colour_tip

root=Path(__file__).resolve().parents[1]
source=json.loads((root/'src/brand/extractedContours.json').read_text())
rear=json.loads((root/'src/brand/rearCrossing.json').read_text())['surface']
W,H=source['width'],source['height'];unit=1000/W
step=2.5/unit
front_polygon=Polygon(source['shapes'][2]['outer'],source['shapes'][2]['holes'])
rear_polygon=Polygon(rear['outer'],rear['holes'])
xmin,_,xmax,_=front_polygon.intersection(rear_polygon).bounds
clearance=REAR_DEPTH*np.exp(-((np.linspace(xmin,xmax,1000)-REAR_CENTRE)/REAR_WIDTH)**4)-2*HALF_THICKNESS
assert clearance.min()>7, 'Rear ribbon must clear the full rounded foreground thickness.'
print(f'Conservative crossing clearance: {clearance.min():.2f} units.')

for name,part,texture_name in [('front',source['shapes'][2],'infinity-extracted.png'),('rear',rear,'infinity-rear.webp')]:
    polygon=Polygon(part['outer'],part['holes'])
    assert polygon.is_valid
    # Clip a shared grid before triangulating. Adjacent cells keep identical edge
    # vertices, including the narrow decorative cuts and their pointed endpoints.
    xmin,ymin,xmax,ymax=polygon.bounds
    xx,yy=np.meshgrid(np.arange(np.floor(xmin/step)*step,xmax,step),np.arange(np.floor(ymin/step)*step,ymax,step))
    cells=shapely.box(xx.ravel(),yy.ravel(),xx.ravel()+step,yy.ravel()+step)
    clipped=shapely.intersection(cells,polygon)
    clipped=clipped[shapely.area(clipped)>1e-9]
    triangles=shapely.get_parts(shapely.constrained_delaunay_triangles(clipped))
    triangles=triangles[shapely.area(triangles)>1e-10]
    assert abs(shapely.area(triangles).sum()-polygon.area)<1e-4, 'Projected surface must preserve every cut.'
    coords=shapely.get_coordinates(triangles).reshape(-1,4,2)[:,:3]
    xy,indices=np.unique(np.round(coords.reshape(-1,2),7),axis=0,return_inverse=True)
    front_faces=indices.reshape(-1,3)
    dist=shapely.distance(shapely.points(xy),polygon.boundary)
    boundary=dist<1e-5
    # A narrow cut may leave a triangle spanning only outline vertices. Split its
    # internal chords so front/back cannot collapse together across that ribbon.
    planar_edges=np.sort(np.concatenate([front_faces[:,[0,1]],front_faces[:,[1,2]],front_faces[:,[2,0]]]),axis=1)
    planar_edges,incidence=np.unique(planar_edges,axis=0,return_counts=True)
    chords=planar_edges[(incidence==2)&boundary[planar_edges[:,0]]&boundary[planar_edges[:,1]]]
    points=list(xy)
    mids={}
    for a,b in chords:
        mids[(a,b)]=len(points); points.append((xy[a]+xy[b])/2)
    refined=[]
    for tri in front_faces:
        ring=[]
        for a,b in zip(tri,np.roll(tri,-1)):
            ring.append(a)
            mid=mids.get(tuple(sorted((a,b))))
            if mid is not None: ring.append(mid)
        if len(ring)>3 or boundary[tri].all():
            centre=len(points);points.append(xy[tri].mean(0))
            refined.extend([[a,b,centre] for a,b in zip(ring,ring[1:]+ring[:1])])
        else: refined.append(tri)
    xy=np.array(points);front_faces=np.array(refined)
    dist=shapely.distance(shapely.points(xy),polygon.boundary)
    boundary=dist<1e-5
    # Resolve the high-curvature shoulders densely. Shared midpoint indices keep
    # the refinement conforming, while outline points remain on their source cuts.
    for _ in range(2):
        edges=np.unique(np.sort(np.concatenate([front_faces[:,[0,1]],front_faces[:,[1,2]],front_faces[:,[2,0]]]),axis=1),axis=0)
        lengths=np.linalg.norm(xy[edges[:,0]]-xy[edges[:,1]],axis=1)*unit
        shoulder=np.minimum(dist[edges[:,0]],dist[edges[:,1]])*unit<3.5
        split=edges[shoulder&(lengths>.8)]
        if not len(split): break
        points=list(xy);mids={}
        for a,b in split:
            mids[(a,b)]=len(points);points.append((xy[a]+xy[b])/2)
        refined=[]
        for tri in front_faces:
            a,b,c=tri
            ab=mids.get(tuple(sorted((a,b))));bc=mids.get(tuple(sorted((b,c))));ca=mids.get(tuple(sorted((c,a))))
            count=sum(mid is not None for mid in [ab,bc,ca])
            if count==0: refined.append(tri)
            elif count==3: refined.extend([[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])
            else:
                # Rotate to a canonical one-edge or two-edge split.
                for _ in range(3):
                    if (count==1 and ab is not None) or (count==2 and ca is None): break
                    a,b,c=b,c,a;ab,bc,ca=bc,ca,ab
                if count==1: refined.extend([[a,ab,c],[ab,b,c]])
                else: refined.extend([[b,bc,ab],[a,ab,c],[ab,bc,c]])
        xy=np.array(points);front_faces=np.array(refined)
        dist=shapely.distance(shapely.points(xy),polygon.boundary)
        boundary=dist<1e-5
    # A continuous lens cross-section replaces the slab and its metallic bevel.
    # Both faces meet at the exact outline; thickness smoothly vanishes at tips.
    height=HALF_THICKNESS*np.sqrt(-np.expm1(-dist*unit/5))
    height[boundary]=0
    count=len(xy)
    back_index=np.arange(count)
    back_index[~boundary]=np.arange(count,count+(~boundary).sum())
    xy_all=np.concatenate([xy,xy[~boundary]])
    z=np.concatenate([-16+height,-16-height[~boundary]])
    if name=='rear': z-=REAR_DEPTH*np.exp(-((xy_all[:,0]-REAR_CENTRE)/REAR_WIDTH)**4)
    positions=np.column_stack([(xy_all[:,0]-W/2)*unit,(H/2-xy_all[:,1])*unit,z])
    winding=np.cross(positions[front_faces[:,1]]-positions[front_faces[:,0]],positions[front_faces[:,2]]-positions[front_faces[:,0]])[:,2]
    front_faces[winding<0]=front_faces[winding<0][:,[0,2,1]]
    faces=np.concatenate([front_faces,back_index[front_faces[:,[0,2,1]]]])
    # Every edge must belong to two triangles: no cracks, open seams, or attached cuts.
    edges=np.sort(np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]]),axis=1)
    unique_edges,edge_counts=np.unique(edges,axis=0,return_counts=True)
    assert np.all(edge_counts==2), f'{name}: non-manifold edges: {(edge_counts!=2).sum()}'
    face_normals=np.cross(positions[faces[:,1]]-positions[faces[:,0]],positions[faces[:,2]]-positions[faces[:,0]])
    normals=np.zeros_like(positions)
    for column in range(3): np.add.at(normals,faces[:,column],face_normals)
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
    # Area-weighted triangle normals vary with the skinny grid triangles around
    # the sides. Use the continuous lens derivative there instead, so rotating
    # studio highlights do not reveal the triangulation. Positions never move.
    mask=np.zeros((H,W),np.uint8)
    cv2.fillPoly(mask,[np.rint(part['outer']).astype(np.int32)],255)
    for hole in part['holes']: cv2.fillPoly(mask,[np.rint(hole).astype(np.int32)],0)
    pad=12
    inside=np.pad(mask>0,pad)
    signed=(distance_transform_edt(inside)-distance_transform_edt(~inside))*unit
    signed=gaussian_filter(signed,3.0)
    gy,gx=np.gradient(signed,unit)
    samples=[xy[:,1]+pad,xy[:,0]+pad]
    outward=np.column_stack([-map_coordinates(gx,samples,order=1),map_coordinates(gy,samples,order=1)])
    # Let the gradient fade at thin ribbon crests instead of amplifying tiny noise.
    outward/=np.maximum(np.linalg.norm(outward,axis=1,keepdims=True),1)
    outward=np.concatenate([outward,outward[~boundary]])
    distance_all=np.concatenate([dist,dist[~boundary]])*unit
    relative_z=np.concatenate([height,-height[~boundary]])
    slope=19.6*np.exp(-distance_all/5)
    analytic=np.column_stack([slope[:,None]*outward,relative_z])
    if name=='rear':
        u=(xy_all[:,0]-REAR_CENTRE)/REAR_WIDTH
        bend_slope=4*REAR_DEPTH*u**3*np.exp(-u**4)/(REAR_WIDTH*unit)
        analytic[:,0]-=relative_z*bend_slope
    magnitude=np.linalg.norm(analytic,axis=1,keepdims=True)
    analytic/=np.maximum(magnitude,1e-12)
    # Use the same smooth derivative over the whole curved profile: switching
    # back to triangle normals halfway around a shoulder leaves a visible band.
    blend=np.ones(len(positions))
    # Preserve the existing orientation at exceptionally sharp, hairline tips.
    blend[(magnitude[:,0]<1e-8)|((analytic*normals).sum(1)<.15)]=0
    normals=normals*(1-blend[:,None])+analytic*blend[:,None]
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
    assert np.isfinite(normals).all()
    assert np.allclose(np.linalg.norm(normals,axis=1),1,atol=1e-6)
    uv=np.column_stack([xy_all[:,0]/W,1-xy_all[:,1]/H])
    assert np.allclose(xy.min(0),[xmin,ymin]) and np.allclose(xy.max(0),[xmax,ymax])
    # Compact typed buffers: magic/version, vertex count, index count, then attributes.
    with (root/f'public/brand/ribbon-{name}.bin').open('wb') as out:
        out.write(np.array([0x52494231,len(positions),faces.size],dtype='<u4').tobytes())
        for attribute in [positions,normals,uv]: out.write(attribute.astype('<f4').tobytes())
        out.write(faces.astype('<u4').tobytes())

    # Extend pigment to the exact boundary so rounded sides never sample the dark
    # background or the other ribbon. Geometry, not image alpha, defines the cuts.
    image=np.asarray(Image.open(root/'public/brand'/texture_name).convert('RGBA')).copy()
    interior=cv2.erode(mask,np.ones((7,7),np.uint8))>0
    channels=image[:,:,:3].astype(float)
    clean_white=(channels.min(2)>190)&(np.ptp(channels,axis=2)<22)
    peak=channels.max(2)
    colour=(np.ptp(channels,axis=2)/np.maximum(peak,1)>.28)&(peak>100)
    # Ignore the old antialiased dark-background fringe. Keep clean pearl pixels
    # even on hairline tips, so a nearby coloured area cannot tint the white lip.
    valid=(mask>0)&(image[:,:,3]>245)&(clean_white|(interior&colour))
    nearest=distance_transform_edt(~valid,return_distances=False,return_indices=True)
    rgb=image[nearest[0],nearest[1],:3].copy()
    if name=='front':
        rgb=extend_colour_tip(rgb,image,source,valid&colour)
    rgb=rgb.astype(float)/255
    linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    peak=linear.max(2)
    saturation=np.ptp(linear,axis=2)/np.maximum(peak,.001)
    colour_weight=np.clip((saturation-.09)/(.28-.09),0,1)
    colour_weight=colour_weight*colour_weight*(3-2*colour_weight)
    # Side pixels cover a larger curved area when viewed obliquely. Remove baked
    # image grain there; real geometry and lighting now provide the surface detail.
    inset=distance_transform_edt(mask>0)*unit
    shoulder=np.clip((inset-3.5)/3.5,0,1)
    shoulder=1-shoulder*shoulder*(3-2*shoulder)
    pigment=linear*(.9/np.maximum(peak,.001))[:,:,None]
    polished=pigment*colour_weight[:,:,None]+np.array([.835,.835,.85])*(1-colour_weight[:,:,None])
    linear=linear*(1-shoulder[:,:,None])+polished*shoulder[:,:,None]
    rgb=np.where(linear<=.0031308,linear*12.92,1.055*np.maximum(linear,0)**(1/2.4)-.055)
    rgb=np.rint(np.clip(rgb,0,1)*255).astype(np.uint8)
    Image.fromarray(rgb).save(root/f'public/brand/ribbon-pigment-{name}.webp',lossless=True)
    print(f'{name}: {len(positions):,} vertices, {len(faces):,} triangles; watertight, original outline/cuts preserved.')
