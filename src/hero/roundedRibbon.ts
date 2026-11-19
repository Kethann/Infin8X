import * as THREE from 'three';

/** Exact-contour, closed lens surfaces baked by scripts/build-rounded-ribbons.py. */
export async function loadRoundedRibbon(name:'front'|'rear') {
  const response=await fetch(`/brand/ribbon-${name}.bin`);
  if (!response.ok) throw new Error(`Cannot load ${name} ribbon: ${response.status}`);
  const buffer=await response.arrayBuffer();
  const [magic,count,indexCount]=new Uint32Array(buffer,0,3);
  if (magic!==0x52494231 || buffer.byteLength!==12+count*32+indexCount*4) throw new Error('Invalid rounded ribbon geometry');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,12,count*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(buffer,12+count*12,count*3),3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(buffer,12+count*24,count*2),2));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,12+count*32,indexCount),1));
  geometry.computeBoundingSphere();
  return geometry;
}
