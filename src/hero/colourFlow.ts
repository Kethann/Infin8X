import * as THREE from 'three';
import palette from '../brand/flowPalette.json';

// Give colour families deliberate coverage instead of one equal slot per named shade.
// Precompute linear-light stops so the fragment shader need not repeatedly convert them.
const stops=palette.map(({rgb})=>`vec3(${rgb.map(value=>Math.pow(value,2.2).toFixed(6)).join(',')})`);
const spectrumBody=palette.map((stop,i)=>{
  const end=palette[i+1]?.position??1;
  return `if(p<${end.toFixed(6)}) return mix(${stops[i]},${stops[(i+1)%stops.length]},smoothstep(${stop.position.toFixed(6)},${end.toFixed(6)},p));`;
}).join('\n');

/** Light is part of the physical face shader: cuts and foreground geometry occlude it naturally. */
/** One continuous reveal: white ribbon first, then the spectrum ribbon in its colour-flow order. */
export interface TraceUniforms {
  uTrace: {value:number};
  uFeedTime: {value:number}; uFeedStrength: {value:number};
}

export function addColourFlow(material: THREE.MeshPhysicalMaterial, field: THREE.Texture, phaseField: THREE.Texture, formationField: THREE.Texture, clock: {value:number}, trace?: TraceUniforms) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uColourFlow= {value:field};
    shader.uniforms.uColourPhase= {value:phaseField};
    shader.uniforms.uFormationField= {value:formationField};
    shader.uniforms.uFlowTime=clock;
    shader.uniforms.uTrace=trace?.uTrace ?? {value:1};
    shader.uniforms.uFeedTime=trace?.uFeedTime ?? {value:0};
    shader.uniforms.uFeedStrength=trace?.uFeedStrength ?? {value:0};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vColourUV;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvColourUV = uv;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uColourFlow;
        uniform sampler2D uColourPhase;
        uniform sampler2D uFormationField;
        uniform float uFlowTime, uTrace;
        uniform float uFeedTime, uFeedStrength;
        varying vec2 vColourUV;
        vec3 ribbonSpectrum(float phase) {
          float p=fract(phase);
          ${spectrumBody}
          return ${stops[0]};
        }
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sourcePeak=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
        float sourceFloor=min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
        float sourceColourMask=smoothstep(0.09,0.28,(sourcePeak-sourceFloor)/max(sourcePeak,0.001));
        // Source pigments have different brightness (blue/purple are much darker than yellow).
        // Do not bake that fixed dark patch into every animated hue; lighting supplies depth.
        float pigmentLevel=max(sourcePeak,0.82);
        vec3 flow=texture2D(uColourFlow,vColourUV).rgb;
        vec2 precisePhase=texture2D(uColourPhase,vColourUV).rg;
        float along=(precisePhase.r*65280.0+precisePhase.g*255.0)/65535.0;
        // The two mesh surfaces have separate coordinates at the crossing, but
        // share one continuous distance along the authored formation route.
        vec3 formation=texture2D(uFormationField,vColourUV).rgb;
        float tracePos=(formation.r*65280.0+formation.g*255.0)/65535.0;
        float across=((flow.g*65280.0+flow.b*255.0)/65535.0-0.5)*800.0;
        // Stable variation across the ribbon gives the growing edge small wispy tips.
        // The seed does not change with time: a revealed strand never retreats or flickers.
        float tipLane=(formation.b-0.5)*800.0/12.0;
        float tipCell=floor(tipLane), tipMix=smoothstep(0.0,1.0,fract(tipLane));
        float tipA=fract(sin(tipCell*127.1+19.7)*43758.5453);
        float tipB=fract(sin((tipCell+1.0)*127.1+19.7)*43758.5453);
        float tipVariation=mix(tipA,tipB,tipMix)-0.5;
        // Ease the wispy leading edge in and out without a midpoint reset.
        float tipWindow=smoothstep(0.0,0.05,uTrace)*(1.0-smoothstep(0.94,1.0,uTrace));
        float tipProgress=clamp(uTrace+tipVariation*0.024*tipWindow,0.0,1.0);
        if (tracePos>tipProgress) discard;
        float formationBehind=max(tipProgress-tracePos,0.0);
        // The route ends at 0.93, leaving time for every tip to settle naturally.
        // No final blanket reveal: all material must be reached by the moving front.
        float formationAlpha=smoothstep(0.0,0.012,formationBehind);
        float formationBody=smoothstep(0.006,0.055,formationBehind);
        if (formationAlpha<0.01) discard;
        diffuseColor.a*=formationAlpha;
        float feedEnvelope=smoothstep(0.0,0.06,uTrace)*(1.0-smoothstep(0.82,1.0,uTrace))*uFeedStrength;
        float feedWave=0.5+0.5*cos((tracePos*3.0-uFeedTime*0.32)*6.2831853);
        float feedPacket=pow(feedWave,6.0);
        // Fade in from the rear white half only. The foreground ribbon keeps its
        // colours all the way to the upper-left tip, following the original artwork.
        float emergence=smoothstep(0.035,0.09,along);
        float colourMask=sourceColourMask*emergence;
        // Interleaved, softly warped spectral currents show several hues across the ribbon.
        float drift=along*1.10-uFlowTime*0.035;
        float fold=0.022*sin(across*0.012+along*10.0-uFlowTime*0.22);
        float phase=drift+fold+across*0.0013;
        float interleave=0.10+0.04*sin(across*0.018-along*8.0+uFlowTime*0.19);
        vec3 spectrum=mix(ribbonSpectrum(phase),ribbonSpectrum(phase+0.065),interleave);
        vec3 movingColour=spectrum*pigmentLevel;
        // Apply the palette from the first frame, including reduced-motion rendering.
        diffuseColor.rgb=mix(diffuseColor.rgb,movingColour,sourceColourMask);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.835,0.835,0.85),sourceColourMask*(1.0-emergence));
        // Give the moving supply a little contrast on the bright white surface.
        // The original material returns as formation completes.
        diffuseColor.rgb *= mix(1.0,0.72+0.28*feedPacket,feedEnvelope);
        // Light arrives first; the original material resolves smoothly in its wake.
        diffuseColor.rgb *= mix(0.24,1.0,formationBody);
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float peak = max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
        float lane = across/12.0;
        float laneId = floor(lane+0.5);
        float seed = fract(sin(laneId*127.1)*43758.5453);
        float distanceToLine = abs(fract(lane+0.5)-0.5);
        float aa = max(fwidth(lane),0.018);
        float core = 1.0-smoothstep(0.025,0.025+aa,distanceToLine);
        float halo = exp(-distanceToLine*distanceToLine/0.028);
        // All lanes have the same direction and a shared timebase across front and rear.
        float travel = fract(along*2.8-uFlowTime*0.14+seed);
        float head = exp(-pow((travel-0.78)/0.035,2.0));
        float tail = smoothstep(0.14,0.78,travel)*(1.0-smoothstep(0.78,0.86,travel));
        float intensity = (core*(0.025+tail*0.42+head*0.72)+halo*(tail*0.06+head*0.10));
        vec3 localHue = diffuseColor.rgb/max(peak,0.08);
        vec3 lightColour = mix(localHue,vec3(1.0),0.035);
        totalEmissiveRadiance += lightColour*intensity*colourMask*0.35;
        // Absorbed light leaves the fixed core and flows through the visible ribbon.
        // The timebase and pulse rate match the incoming absorption field.
        // The same formation distance carries the supply through both lobes.
        if (uTrace<1.0) {
          float behind=formationBehind;
          vec3 formingLight=mix(localHue,vec3(1.0,0.97,0.94),0.75);
          float cooling=1.0-smoothstep(0.9,1.0,uTrace);
          float sourceGlow=exp(-tracePos*70.0);
          vec3 feedColour=mix(vec3(0.78,0.88,1.0),localHue,sourceColourMask*0.7);
          totalEmissiveRadiance += feedColour*(0.07+feedPacket*0.65+sourceGlow*0.18)*feedEnvelope;
          // A soft hot tip and cooling wake connect the flowing supply to solid material.
          float filament=0.6+0.4*pow(0.5+0.5*cos(tipLane*6.2831853),2.0);
          totalEmissiveRadiance += formingLight*(exp(-behind*55.0)*1.35*filament+exp(-behind*14.0)*0.2)*cooling;
        }
      `);
  };
  material.customProgramCacheKey=()=> `infin8x-colour-flow-v16:${spectrumBody}`;
}
