"""Shared rounded profile and colour-tip boundary for the source artwork."""
import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt
from shapely.geometry import Polygon

HALF_THICKNESS = 14
REAR_DEPTH = 36
REAR_CENTRE = 1340
REAR_WIDTH = 300

def colour_tip_mask(source):
    outline = source['shapes'][2]['outer']
    index = min(range(len(outline)), key=lambda i: np.linalg.norm(np.array(outline[i])-[1128.892,240.46]))
    tip = Polygon(outline[index-2:index+6])
    # A one-texel gutter keeps linear texture filtering from sampling pearl at
    # the acute endpoint. It stays in the existing slit, outside the white face.
    gutter = tip.buffer(1.2)
    mask = np.zeros((source['height'],source['width']),np.uint8)
    cv2.fillPoly(mask,[np.rint(gutter.exterior.coords).astype(np.int32)],1)
    return mask.astype(bool)

def extend_colour_tip(rgb, image, source, valid_colour):
    nearest = distance_transform_edt(~valid_colour,return_distances=False,return_indices=True)
    tip = colour_tip_mask(source)
    rgb[tip] = image[nearest[0][tip],nearest[1][tip],:3]
    return rgb
