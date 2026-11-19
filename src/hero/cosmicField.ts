/** Shared procedural nebula: no texture downloads, continuous across device sizes. */
export const COSMIC_GLSL = /* glsl */ `
float cosmicHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cosmicNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cosmicHash(i), cosmicHash(i + vec2(1,0)), f.x),
    mix(cosmicHash(i + vec2(0,1)), cosmicHash(i + vec2(1,1)), f.x), f.y);
}
float cosmicFbm(vec2 p) {
  float n = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { n += a * cosmicNoise(p); p = mat2(1.6,1.2,-1.2,1.6) * p + 7.3; a *= 0.5; }
  return n;
}
vec3 cosmicField(vec2 p, float t) {
  float cloud = cosmicFbm(p + vec2(t * 0.023, -t * 0.012));
  float fold = cosmicFbm(p * 1.7 + vec2(cloud * 3.2, -cloud * 2.0) + t * 0.009);
  float filament = pow(max(0.0, 1.0 - abs(fold - 0.49) * 11.0), 3.0);
  vec3 c = mix(vec3(0.025,0.035,0.16), vec3(0.38,0.045,0.65), smoothstep(0.22,0.65,cloud));
  c = mix(c, vec3(0.025,0.53,0.75), smoothstep(0.43,0.73,fold));
  c += vec3(0.65,0.12,0.28) * pow(cloud, 3.0) * 1.2;
  c += mix(vec3(0.10,0.30,0.65), vec3(0.8,0.42,0.13), smoothstep(0.46,0.7,cloud)) * filament * 0.6;
  vec2 stars = p * 25.0, cell = floor(stars);
  vec2 center = vec2(cosmicHash(cell), cosmicHash(cell + 19.2)) * 0.6 + 0.2;
  float star = exp(-length(fract(stars) - center) * 48.0) * step(0.965, cosmicHash(cell + 47.0));
  return c + vec3(0.65,0.85,1.0) * star * 2.5;
}
`;
