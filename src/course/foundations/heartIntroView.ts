/** Isolated lesson scene. All moving layers share normal-engine time and the same displacement uniforms. */
import { Box3, BufferAttribute, BufferGeometry, Data3DTexture, DirectionalLight, DoubleSide, FrontSide, Group, HalfFloatType, HemisphereLight, LinearFilter, Mesh, MeshStandardMaterial, NearestFilter, PerspectiveCamera, RedFormat, RGBAFormat, Scene, Spherical, UnsignedByteType, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BodyModel } from '../../lab/sim/types';
import { VALVES } from '../../lab/sim/types';
import type { Engine } from '../../lab/sim/engine';
import { localToApp } from '../../lab/sim/frame';
import { fitDistance } from '../../lab/view3d/cameras';
import { createSharedUniforms } from '../../lab/view3d/shaders/uniforms';
import { setClipDefine } from '../../lab/view3d/shaders/chunks';
import { buildHeartAttributes, mechReference } from '../../lab/view3d/core/attributes';
import { packFieldVolume } from '../../lab/view3d/core/fieldTexture';
import { packBeatSnapshot } from '../../lab/view3d/core/beats';
import { createHeartGeometry, createHeartMaterial, setHeartXray } from '../../lab/view3d/heartMaterial';
import { createConductionTubes } from '../../lab/view3d/conductionTubes';
import { vTimeScale } from '../../lab/view3d/conductionTiming';
import { createValves } from '../../lab/view3d/valves';
import { createOverlays } from '../../lab/view3d/overlays';
import { createBloodFlow } from '../../lab/view3d/bloodFlow';
import { buildFlowNetwork } from '../../lab/view3d/core/vesselPaths';
import { FlowContextCache, flowAt, leafletOpenness } from '../../lab/view3d/core/flowTiming';
import { FLOW_STATE_LEN } from '../../lab/view3d/core/flowTypes';
import { VenousCache, venousAt, VENOUS_STATE_LEN } from '../../lab/view3d/core/venousTiming';
import { introStep, type HeartIntroMode } from './heartIntroModel';
import { cycleFrame, type HeartCycle } from './heartCycle';

export class HeartIntroView {
  private renderer:WebGLRenderer;
  private scene=new Scene();
  private camera=new PerspectiveCamera(34,1,.1,1000);
  private controls:OrbitControls;
  private u=createSharedUniforms();
  private heart; private tubes; private valves; private flow; private overlays;
  private textures:Data3DTexture[]=[];
  private body:Mesh<BufferGeometry,MeshStandardMaterial>;
  private centre:Vector3; private radius:number; private bounds:Box3;
  private observer:ResizeObserver;
  private raf=0; private alive=true;
  private mode:HeartIntroMode='position'; private step=-1;
  private anchor=new Vector3();
  private onLost:(e:Event)=>void;
  private flowCache=new FlowContextCache(); private venCache=new VenousCache();
  private beatBuf=new Float32Array(16); private flowBuf=new Float32Array(FLOW_STATE_LEN);
  private venBuf=new Float32Array(VENOUS_STATE_LEN); private open=new Float32Array(4);
  constructor(private canvas:HTMLCanvasElement,private tag:HTMLElement,private engine:Engine,skin:BodyModel,private cycle:HeartCycle,onFailure:()=>void) {
    const geo=engine.geometry,f=engine.fields,u=this.u;
    this.renderer=new WebGLRenderer({canvas,antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.scene.add(new HemisphereLight(0xe5efff,0x514c61,2.3));
    const light=new DirectionalLight(0xffe2d0,2.8);light.position.set(-12,20,30);this.scene.add(light);
    const fill=new DirectionalLight(0xa6caff,1.5);fill.position.set(20,5,-20);this.scene.add(fill);
    const root=new Group(),R=geo.pose.R,t=geo.pose.tCm;
    root.matrixAutoUpdate=false;root.matrix.set(R[0]*.1,R[1]*.1,R[2]*.1,t[0],R[3]*.1,R[4]*.1,R[5]*.1,t[1],R[6]*.1,R[7]*.1,R[8]*.1,t[2],0,0,0,1);
    root.matrixWorldNeedsUpdate=true;this.scene.add(root);
    const vol=packFieldVolume(geo.grid,f);
    const texture=(data:Uint16Array|Uint8Array,rgba:boolean,half:boolean,linear:boolean)=>{
      const tex=new Data3DTexture(data,...vol.dims);tex.format=rgba?RGBAFormat:RedFormat;tex.type=half?HalfFloatType:UnsignedByteType;
      tex.minFilter=tex.magFilter=linear?LinearFilter:NearestFilter;tex.unpackAlignment=1;tex.needsUpdate=true;this.textures.push(tex);return tex;
    };
    u.uFieldTex.value=texture(vol.rgbaHalf,true,true,true);u.uLabelTex.value=texture(vol.label,false,false,false);u.uChamberTex.value=texture(vol.chamberW,true,false,true);
    u.uGridOrigin.value.fromArray(vol.boxMinMm);u.uGridSize.value.fromArray(vol.boxSizeMm);
    for(const ch of geo.chambers){const i=ch.chamber-1;if(i<0||i>3)continue;u.uChamberCenter.value[i].fromArray(ch.centerMm);u.uChamberAxis.value[i].fromArray(ch.axis).normalize();u.uChamberRadius.value[i]=ch.radiusMm;u.uChamberLength.value[i]=ch.lengthMm;}
    const mr=mechReference(geo.grid,f);u.uMechRef.value.set(mr.tActA,mr.tActV,mr.apdA,mr.apdV);
    u.uApTauUp.value=f.apVentricular.tauUpMs;u.uApTauRepV.value=f.apVentricular.tauRepMs;u.uApTauRepA.value=f.apAtrial.tauRepMs;
    u.uColRest.value.set('#79616f');u.uColAtrial.value.set('#f3c268');u.uColQrs.value.set('#e991db');u.uColRepol.value.set('#6cd5b4');u.uColFront.value.set('#fff4cd');
    u.uColRing.value.set('#b3c4db');u.uColVessel.value.set('#6e809a');u.uColBlood.value.set('#5a3442');u.uColHighlight.value.set('#fff2ae');u.uColConduction.value.set('#f1bf62');u.uColPulse.value.set('#fff4c8');
    this.heart=new Mesh(createHeartGeometry(geo.mesh,buildHeartAttributes(geo,f)),createHeartMaterial(u));setHeartXray(this.heart.material,true);this.heart.frustumCulled=false;
    this.tubes=createConductionTubes(geo,u);this.valves=createValves(geo,u);this.valves.setColor('#becce0');this.overlays=createOverlays(geo,u);this.overlays.setXray(true);
    const net=buildFlowNetwork(geo);this.flow=createBloodFlow(geo,[...net.heart,...net.vessels],u);this.flow.setColors('#ff8b87','#78baff');this.flow.setStyle('comets');
    root.add(this.heart,this.tubes.group,this.valves.group,this.overlays.group,this.flow.group);root.updateMatrixWorld(true);
    this.bounds=new Box3().setFromObject(this.heart);this.centre=this.bounds.getCenter(new Vector3());this.radius=this.bounds.getSize(new Vector3()).length()/2;
    const bodyGeo=new BufferGeometry();bodyGeo.setAttribute('position',new BufferAttribute(skin.skin.position,3));bodyGeo.setIndex(new BufferAttribute(skin.skin.index,1));bodyGeo.computeVertexNormals();
    this.body=new Mesh(bodyGeo,new MeshStandardMaterial({color:0x7991ae,transparent:true,opacity:.06,depthWrite:false,side:DoubleSide}));this.body.visible=false;this.scene.add(this.body);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.enableDamping=false;this.controls.addEventListener('change',this.draw);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas.parentElement!);
    this.onLost=e=>{e.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',this.onLost);
    this.update('position',0,false,.55);this.animate(0,.8);this.resize();
  }
  private resize=()=>{
    const el=this.canvas.parentElement!,w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight),old=this.camera.aspect;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    if(this.camera.position.lengthSq()<1)this.reset();
    else {const factor=fitDistance(1,34,this.camera.aspect)/fitDistance(1,34,old);this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.draw();}
  };
  private draw=()=>{
    if(!this.alive||this.raf)return;
    this.raf=requestAnimationFrame(()=>{this.raf=0;if(!this.alive)return;this.renderer.render(this.scene,this.camera);
      const p=this.anchor.clone().project(this.camera),w=this.canvas.clientWidth,h=this.canvas.clientHeight;
      this.tag.style.visibility=p.z<1&&p.z>-1?'visible':'hidden';this.tag.style.left=`${Math.max(85,Math.min(w-85,(p.x+1)*w/2))}px`;this.tag.style.top=`${Math.max(82,Math.min(h-24,(1-p.y)*h/2))}px`;
    });
  };
  reset=()=>{
    this.controls.target.copy(this.centre);const back=introStep(this.mode,this.step).posterior;
    this.camera.position.copy(this.centre).add(new Vector3(0,.08,back?-1:1).normalize().multiplyScalar(fitDistance(this.radius*.75,34,this.camera.aspect)*1.05));this.controls.update();this.draw();
  };
  rotate=(horizontal:number,vertical=0)=>{const s=new Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));s.theta+=horizontal;s.phi=Math.max(.15,Math.min(Math.PI-.15,s.phi+vertical));this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(s));this.controls.update();this.draw();};
  zoom=(factor:number)=>{const d=this.camera.position.clone().sub(this.controls.target);this.camera.position.copy(this.controls.target).add(d.setLength(Math.max(this.radius*1.2,Math.min(300,d.length()*factor))));this.controls.update();this.draw();};
  /** Anatomy choices move the label/camera only: they never hide any of the three animated layers. */
  update(mode:HeartIntroMode,step:number,cut:boolean,depth:number) {
    const changed=this.mode!==mode||this.step!==step;this.mode=mode;this.step=step;const geo=this.engine.geometry,item=introStep(mode,step);
    this.body.visible=mode==='position'&&step===0;
    this.anchor.copy(this.centre);
    const chamber=geo.chambers.find(c=>item.chambers.length===1&&c.chamber===item.chambers[0]);
    const valve=geo.valves.find(v=>v.id===item.valve),structure=item.structures?.[0];
    const point=valve?.centerMm??(structure?geo.landmarks[structure]:undefined)??chamber?.centerMm;
    if(point)this.anchor.set(...localToApp(geo.pose,point));
    this.tubes.setHighlight(new Set(item.structures??[]));
    // Front in world coordinates, transformed into local rest-space.
    const R=geo.pose.R,n=new Vector3(R[6],R[7],R[8]);
    const worldZ=this.bounds.min.z+(this.bounds.max.z-this.bounds.min.z)*depth;
    this.u.uRestClip.value.set(n.x,n.y,n.z,(worldZ-geo.pose.tCm[2])*10);this.u.uClipOn.value=cut?1:0;
    setClipDefine(this.heart.material,cut);this.heart.material.side=cut?DoubleSide:FrontSide;
    this.tubes.setClip(cut);this.valves.setClip(cut);this.flow.setClip(cut);this.overlays.setClip(cut);
    if(changed)this.reset();this.draw();
  }
  animate(progress:number,amplitude:number) {
    const {time}=cycleFrame(this.cycle,progress),u=this.u,snap=this.engine.activeBeats(time);
    packBeatSnapshot(snap,this.beatBuf);u.uBeatA.value[0].fromArray(this.beatBuf,0);u.uBeatA.value[1].fromArray(this.beatBuf,4);u.uBeatV.value[0].fromArray(this.beatBuf,8);u.uBeatV.value[1].fromArray(this.beatBuf,12);u.uContraction.value=Math.max(0,Math.min(1,amplitude));
    this.tubes.update(snap,this.engine.timing.atrioNodalMs+this.engine.timing.ahMs,vTimeScale(this.engine.fields.ventricular[0].tMinMs));
    this.valves.update(this.cycle.truth,this.cycle.previous,time);
    const ctx=this.flowCache.get(this.engine,time,this.cycle.knots[6]-this.cycle.knots[0]),gates={vf:false,af:false};
    flowAt(ctx,time,gates,this.flowBuf);venousAt(ctx,this.venCache.get(ctx),time,gates,this.venBuf);
    for(let i=0;i<VALVES.length;i++)this.open[i]=leafletOpenness(VALVES[i],this.cycle.previous?.valves.find(v=>v.id===VALVES[i]),this.cycle.truth.valves.find(v=>v.id===VALVES[i]),time);
    this.flow.update(this.flowBuf,this.open,this.venBuf);
    // No temporal accumulation on seek: a second identical sample clears comet motion blur.
    this.flow.update(this.flowBuf,this.open,this.venBuf);this.draw();
  }
  dispose(){this.alive=false;cancelAnimationFrame(this.raf);this.observer.disconnect();this.controls.dispose();this.canvas.removeEventListener('webglcontextlost',this.onLost);this.tubes.dispose();this.valves.dispose();this.flow.dispose();this.overlays.dispose();this.textures.forEach(t=>t.dispose());this.heart.geometry.dispose();this.heart.material.dispose();this.body.geometry.dispose();this.body.material.dispose();this.renderer.dispose();}
}
