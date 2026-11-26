import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { addColourFlow } from './colourFlow';
import { isTouch } from '../lib/env';
import { loadRoundedRibbon } from './roundedRibbon';
import { createAuroraCurtain } from './auroraCurtain';
import formationPath from '../brand/formationPath.json';

/** Rounded solid ribbons preserve the source outline and share pigment across every side. */
export async function createArtworkBackdrop(canvas: HTMLCanvasElement, reduced: boolean, stage: HTMLElement) {
  // Limited hardware gets the same intro story at a smaller rendering cost, including phones that report only 2 GB.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const constrained = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !constrained, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(), group = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 12000);
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04); room.dispose(); pmrem.dispose();
  scene.environment = environment.texture;
  const aurora = createAuroraCurtain(constrained || isTouch() || innerWidth < 768);
  const resources: {dispose():void}[] = [environment, aurora];
  const dispose = () => { resources.forEach(r=>r.dispose()); renderer.dispose(); };
  try {
    const texture = await new THREE.TextureLoader().loadAsync('/brand/ribbon-pigment-front.webp');
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    resources.push(texture);
    const geometry=await loadRoundedRibbon('front'); resources.push(geometry);
    const rearGeometry=await loadRoundedRibbon('rear'); resources.push(rearGeometry);
    // One soft dielectric material covers the face, curved shoulders and back.
    // No metallic side band, separate bevel, or normal-map highlight strip.
    const face=new THREE.MeshPhysicalMaterial({map:texture, color:0xffffff, metalness:0,
      roughness:0.34, clearcoat:0.3, clearcoatRoughness:0.32, envMapIntensity:0.65,
      ior:1.42, specularIntensity:0.7});
    resources.push(face);
    const rearTexture=await new THREE.TextureLoader().loadAsync('/brand/ribbon-pigment-rear.webp');
    rearTexture.colorSpace=THREE.SRGBColorSpace; rearTexture.anisotropy=texture.anisotropy;
    const rearFace=face.clone(); rearFace.map=rearTexture;
    resources.push(rearFace,rearTexture);
    const fields: THREE.Texture[]=[], phases: THREE.Texture[]=[], formations: THREE.Texture[]=[];
    for (const name of ['front','rear']) {
      const field=await new THREE.TextureLoader().loadAsync(`/brand/colour-flow-${name}.png`);
      field.colorSpace=THREE.NoColorSpace; field.generateMipmaps=false;
      field.minFilter=THREE.LinearFilter; field.magFilter=THREE.LinearFilter;
      resources.push(field); fields.push(field);
      const phase=await new THREE.TextureLoader().loadAsync(`/brand/colour-phase-${name}.png`);
      phase.colorSpace=THREE.NoColorSpace;phase.generateMipmaps=false;
      phase.minFilter=THREE.LinearFilter;phase.magFilter=THREE.LinearFilter;
      resources.push(phase);phases.push(phase);
      const formation=await new THREE.TextureLoader().loadAsync(`/brand/formation-field-${name}.png`);
      formation.colorSpace=THREE.NoColorSpace; formation.generateMipmaps=false;
      formation.minFilter=THREE.LinearFilter; formation.magFilter=THREE.LinearFilter;
      resources.push(formation); formations.push(formation);
    }
    const flowClock={value:0};
    // Keep incoming absorption anchored to the combined logo centre.
    geometry.computeBoundingBox(); rearGeometry.computeBoundingBox();
    const bounds=geometry.boundingBox!.clone().union(rearGeometry.boundingBox!);
    const centre=bounds.getCenter(new THREE.Vector3());
    const trace={uTrace:{value:reduced ? 1 : 0}, uFeedTime:{value:40}, uFeedStrength:{value:0}};
    const formationPoint=new THREE.Vector3(), formationNext=new THREE.Vector3(), corePoint=new THREE.Vector3();
    const absorptionTarget=new THREE.Vector2(), formationTarget=new THREE.Vector2();
    addColourFlow(face,fields[0],phases[0],formations[0],flowClock,trace);
    addColourFlow(rearFace,fields[1],phases[1],formations[1],flowClock,trace);
    const mesh = new THREE.Mesh(geometry,face);
    const rearMesh = new THREE.Mesh(rearGeometry,rearFace);
    group.add(mesh,rearMesh);
    // The holder mirrors the logo about the floor's contact line for the reflection pass.
    const holder=new THREE.Group(); holder.add(group); scene.add(holder);
    const key = new THREE.DirectionalLight(0xfff7ef,2.8); key.position.set(-700,900,1200);
    const fill = new THREE.DirectionalLight(0xbadfff,1.5); fill.position.set(900,100,700);
    const rim = new THREE.DirectionalLight(0xba8fff,3.5); rim.position.set(-600,500,-500);
    const backFill = new THREE.DirectionalLight(0xf4f6ff,1.8); backFill.position.set(700,400,-1000);
    scene.add(key,fill,rim,backFill,new THREE.HemisphereLight(0xdce8ff,0x141324,1.5));
    // aurora: fibres arrive · rush: energy charging into the core · flash: absorption · trace: light draws the ribbon · calm: fibres settle low
    const state = { reveal: reduced ? 1 : 0, turn: reduced ? 1 : 0, sweep: reduced ? 1 : 0, aurora: reduced ? 1 : 0, rush: 0, flash: 0, trace: reduced ? 1 : 0, calm: reduced ? 1 : 0 };
    const orientation = {pitch:0, yaw:0, targetPitch:0, targetYaw:0, returning:false};
    const water = {spread:0, target:0, motion:0, impulse:0};
    const scroll = (progress:number, velocity:number) => {
      if (reduced) return;
      water.target=THREE.MathUtils.smoothstep(progress,0,0.42);
      water.impulse=Math.max(water.impulse,Math.min(Math.abs(velocity)/Math.max(height,1)*0.45,1));
    };
    const beginRotation = () => {
      // Re-grabbing during the return starts from the currently displayed pose.
      orientation.targetYaw=orientation.yaw; orientation.targetPitch=orientation.pitch;
      orientation.returning=false;
    };
    const rotate = (yaw:number, pitch:number) => {
      if (orientation.returning) beginRotation();
      orientation.targetYaw+=yaw; orientation.targetPitch+=pitch;
    };
    const resetRotation = () => {
      // Return to the nearest front view, even after several complete revolutions.
      const fullTurn=Math.PI*2;
      orientation.targetYaw=Math.round(orientation.yaw/fullTurn)*fullTurn;
      orientation.targetPitch=Math.round(orientation.pitch/fullTurn)*fullTurn;
      orientation.returning=true;
    };
    let width=1, height=1, scale=1, horizon=1;
    const resize = () => {
      const rect=canvas.getBoundingClientRect(), target=stage.getBoundingClientRect();
      width=Math.max(rect.width,1); height=Math.max(rect.height,1);
      // Bound the render buffer on Retina phones and large external displays.
      const pixelBudget=constrained ? 800_000 : isTouch() ? 2_500_000 : 5_000_000;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, constrained ? 1 : 2, Math.sqrt(pixelBudget/(width*height))));
      renderer.setSize(width,height,false);
      camera.aspect=width/height; camera.position.z=height/(2*Math.tan(THREE.MathUtils.degToRad(13))); camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      group.position.set(target.left-rect.left+target.width/2-width/2,height/2-(target.top-rect.top+target.height/2),0);
      scale=target.width/1000;
      // The glossy floor meets the mark just beneath its lowest point.
      horizon=target.bottom-rect.top+height*0.012;
      const buffer=renderer.getDrawingBufferSize(new THREE.Vector2());
      aurora.layout(width,height,target.left-rect.left+target.width/2,target.top-rect.top+target.height/2,target.width,target.height,horizon,buffer.x,buffer.y);
    };
    let lastFlowTime: number | undefined, energyClock=40;
    const render = (time: number, dt: number) => {
      // Use visible elapsed time, not the camera's capped physics delta: slow frames must not
      // slow the colour currents. Reset the gap after a hidden tab or a paused renderer.
      const elapsed=lastFlowTime===undefined ? dt : (time-lastFlowTime)/1000;
      if (!reduced) flowClock.value += elapsed>=0 && elapsed<1 ? elapsed : Math.min(dt,0.05);
      lastFlowTime=time;
      // Use elapsed wall time: the capped animation delta would make return-to-pose
      // take many seconds on a slow renderer. Cap long hidden-tab gaps separately.
      const rotationDelta=elapsed>0 ? Math.min(elapsed,0.25) : dt;
      // Scroll position opens the reflection; scroll speed supplies a short-lived
      // disturbance. Both settle smoothly, including when scrolling back to the top.
      const waterDelta=Math.max(0,Math.min(rotationDelta,0.25));
      water.spread+=(water.target-water.spread)*(1-Math.exp(-waterDelta*5));
      water.motion+=(water.impulse-water.motion)*(1-Math.exp(-waterDelta*8));
      water.impulse*=Math.exp(-waterDelta*3);
      aurora.water(water.spread,water.motion);
      const rotationEase=reduced ? 1 : 1-Math.exp(-rotationDelta*(orientation.returning?7:14));
      orientation.yaw+=(orientation.targetYaw-orientation.yaw)*rotationEase;
      orientation.pitch+=(orientation.targetPitch-orientation.pitch)*rotationEase;
      if (orientation.returning && Math.abs(orientation.yaw-orientation.targetYaw)<0.0001 && Math.abs(orientation.pitch-orientation.targetPitch)<0.0001) {
        // Equivalent complete turns collapse to the exact original pose at rest.
        Object.assign(orientation,{pitch:0,yaw:0,targetPitch:0,targetYaw:0,returning:false});
      }
      const turn=state.turn;
      group.visible=state.reveal>0.001;
      group.rotation.set((1-turn)*0.22+orientation.pitch*turn, (1-turn)*-0.82+orientation.yaw*turn, (1-turn)*-0.055);
      group.scale.setScalar(scale*(0.91+0.09*turn));
      // A moving studio key follows the continuous rounded surface.
      key.position.x=-1100+state.sweep*1700;
      face.opacity=rearFace.opacity=state.reveal;
      // The travelling front is feathered; completed material returns to the opaque path.
      face.transparent=rearFace.transparent=state.reveal<1 || state.trace<1;
      // Backdrop first (aurora curtain), then the logo on top in the same context.
      // Energy along the fibres runs on its own clock so the rush can accelerate it without jumps.
      if (!reduced) energyClock += (elapsed>=0 && elapsed<1 ? elapsed : Math.min(dt,0.05))*(1+3.5*state.rush);
      trace.uTrace.value=state.trace;
      trace.uFeedTime.value=energyClock;
      trace.uFeedStrength.value=reduced ? 0 : state.rush;
      // Energy enters at the fixed core, then travels to a separate formation front.
      // Project both through the logo transform so the surface light stays attached.
      const pathPosition=Math.min(1,Math.max(0,state.trace))*(formationPath.points.length-1);
      const pathIndex=Math.floor(pathPosition);
      formationPoint.fromArray(formationPath.points[pathIndex]);
      formationNext.fromArray(formationPath.points[Math.min(pathIndex+1,formationPath.points.length-1)]);
      formationPoint.lerp(formationNext,pathPosition-pathIndex);
      group.updateWorldMatrix(true,false);
      formationPoint.applyMatrix4(group.matrixWorld).project(camera);
      formationTarget.set((formationPoint.x+1)*width/2,(1-formationPoint.y)*height/2);
      corePoint.set(centre.x,centre.y,0).applyMatrix4(group.matrixWorld).project(camera);
      absorptionTarget.set((corePoint.x+1)*width/2,(1-corePoint.y)*height/2);
      aurora.focus(absorptionTarget.x,absorptionTarget.y);
      aurora.formation(formationTarget.x,formationTarget.y);
      aurora.update(reduced ? 40 : 40+flowClock.value, energyClock, state);
      renderer.autoClear=false; renderer.setClearColor(0x000000,0);
      // 1. The logo mirrored about the contact line, off-screen, for the floor to reflect.
      holder.scale.y=-1; holder.position.y=2*(height/2-horizon);
      renderer.setRenderTarget(aurora.reflection); renderer.clear(true,true,true);
      if (group.visible) renderer.render(scene,camera);
      renderer.setRenderTarget(null); holder.scale.y=1; holder.position.y=0;
      // 2. Backdrop (streams + floor), 3. the logo itself.
      renderer.clear(true,true,true);
      aurora.draw(renderer);
      renderer.clearDepth();
      renderer.render(scene,camera);
    };
    resize();
    try { await renderer.compileAsync(scene,camera); await renderer.compileAsync(aurora.scene,aurora.camera); } catch { renderer.compile(scene,camera); renderer.compile(aurora.scene,aurora.camera); }
    return {state,orientation,water,scroll,absorptionTarget,formationTarget,beginRotation,rotate,resetRotation,resize,render,dispose};
  } catch(error) { dispose(); throw error; }
}
