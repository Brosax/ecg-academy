/**
 * HeartScene — the imperative three.js side of <HeartView>. Owns renderer, camera, controls, render loop and every
 * scene object; follows the store through @preact/signals effects and reads store.time.peek() in its own loop.
 *
 * Frames: the scene is in the app frame (cm). Heart content sits under `poseGroup`, whose matrix maps heart-local mm
 * to app cm (scale 0.1, then pose.R, then pose.tCm). The heart vector and the lead axis are drawn from the ventricular
 * centroid (app frame); the torso and electrodes use ELECTRODE_POS_CM (app frame).
 * Per frame: beat uniforms (CPU float64 → beat-relative), conduction pulses, valves, blood-flow phase, H arrow, lead
 * projection, VCG trail — all written into preallocated objects; no attribute of the heart mesh is ever re-uploaded.
 * The blood-flow layer (streams, jets, cells) is built the first time it is shown (its paths are cached per geometry).
 */
import { AF_MAX_ROTORS, AF_STRIDE } from '../sim/source/afField';
import { vfFrameOf } from '../sim/source/vfDriver';
import { VF_FRAME_FLOATS, VF_HEADER_OFFSET, VF_MAX_ROTORS } from '../sim/source/vfField';
import {
  Color, Data3DTexture, DirectionalLight, DoubleSide, FrontSide, Group, HalfFloatType, HemisphereLight, LinearFilter, Mesh,
  NearestFilter, NeutralToneMapping, PerspectiveCamera, Raycaster, RedFormat, RGBAFormat, Scene, Timer,
  UnsignedByteType, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { Box3 as ThreeBox3, Matrix4, Sphere } from 'three';
import type { MeshStandardMaterial } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { effect } from '@preact/signals';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import type { Layers, SliceState } from '../app/store';
import { readThemeColors, themeVersion } from '../app/theme';
import type { ThemeColors } from '../app/theme';
import { tc } from '../i18n/common';
import { tv } from '../i18n/view3d';
import { localToApp } from '../sim/frame';
import type { Scenario } from '../sim/scenarios/types';
import type { CycleTruth, ElectrodeId, EngineFields, LeadName, Pose, SimEngine, StructureId, ValveEvents, ValveId, Vec3, VoxelGrid, WaveSegment } from '../sim/types';
import { CHAMBER, STRUCTURE_NONE, STRUCTURES, VALVES } from '../sim/types';
import { createBloodFlow } from './bloodFlow';
import type { BloodFlow } from './bloodFlow';
import { createConductionTubes } from './conductionTubes';
import type { ConductionTubes } from './conductionTubes';
import { DEFAULT_AV_GAP_MS, vTimeScale } from './conductionTiming';
import { CameraTween, fitDistance, presetDirection } from './cameras';
import type { CameraPreset } from './cameras';
import { structureAnchors, ventricularCentroid } from './core/anchors';
import { buildHeartAttributes, mechReference } from './core/attributes';
import type { HeartAttributes } from './core/attributes';
import { avGapMs, packBeatSnapshot } from './core/beats';
import { packFieldVolume } from './core/fieldTexture';
import type { FieldVolume } from './core/fieldTexture';
import { FlowContextCache, flowAt, flowCaption, leafletOpenness } from './core/flowTiming';
import { FLOW_STATE_LEN } from './core/flowTypes';
import { lvotSliceKey } from './core/lvotSlice';
import { VENOUS_STATE_LEN, VenousCache, venousAt } from './core/venousTiming';
import { buildFlowNetwork } from './core/vesselPaths';
import { computeSliceArrows, gridBox, sliceRect } from './core/slice';
import type { Box3 } from './core/slice';
import { CM_PER_MV, frankToAppInto, leadAxisSpec, leadValue } from './core/vectors';
import type { LeadAxisSpec } from './core/vectors';
// leaf module (never ./viewControls, which imports this file at module scope)
import { bloodFlow, FLOW_LABEL_KEYS, FLOW_TOUR, flowNow, flowPaletteForBg, flowStyle, flowTourStep, flowXray } from './flowControls';
import type { FlowLabelId } from './flowControls';
import { flowLabelAnchors } from './core/flowLabels';
import { MAX_HIGHLIGHT } from './gpuContract';
import { createHeartGeometry, createHeartMaterial, setHeartXray } from './heartMaterial';
import type { HeartMaterial } from './heartMaterial';
import { createLeadAxis } from './leadAxis';
import { createOverlays } from './overlays';
import type { Overlays } from './overlays';
import type { LeadAxisView } from './leadAxis';
import { setClipDefine } from './shaders/chunks';
import { createSharedUniforms } from './shaders/uniforms';
import type { SharedUniforms } from './shaders/uniforms';
import { createSliceArrows, createSlicePlane } from './slicePlane';
import type { SliceArrowLayer, SlicePlane } from './slicePlane';
import { createTorso, TORSO_SHAPE } from './torso';
import type { Torso } from './torso';
import { createValves } from './valves';
import type { Valves } from './valves';
import { createVectorArrow, TRAIL_POINTS } from './vectorArrow';
import type { VectorArrow } from './vectorArrow';

const ARROW_SPACING_MM = 6;
const TRAIL_MS = 400;
const HEART_RADIUS_CM = 8.5;
const TORSO_RADIUS_CM = 38;
const TORSO_TARGET = new Vector3(TORSO_SHAPE.midX, -9, TORSO_SHAPE.midZ);
/** Activation-front band colour: near-white so it reads on both amber and magenta (not a theme token). */
export const FRONT_CSS = '#fff8e1';

interface Content {
  readonly poseGroup: Group;
  readonly heart: Mesh;
  readonly heartMat: HeartMaterial;
  readonly attr: HeartAttributes;
  readonly textures: Data3DTexture[];
  readonly slice: SlicePlane;
  readonly arrows: SliceArrowLayer;
  readonly tubes: ConductionTubes;
  readonly valves: Valves;
  /** Built on first show (syncFlow); null while the layer has never been on for this content. */
  flow: BloodFlow | null;
  /** Name tags of the flow layer (chambers, vessels), built with it; shown while it is. */
  flowLabels: Map<FlowLabelId, { obj: CSS2DObject; el: HTMLDivElement; p: Vec3 }> | null;
  readonly overlays: Overlays;
  readonly labelGroup: Group;
  readonly labels: Map<StructureId, { obj: CSS2DObject; el: HTMLDivElement }>;
  readonly anchors: Partial<Record<StructureId, Vec3>>;
  readonly centre: Vector3;
  /** Bounding sphere of the heart mesh in the app frame (cm) — default camera framing. */
  readonly fitCentre: Vector3;
  readonly fitRadius: number;
  readonly box: Box3;
  readonly vScale: number;
  readonly pose: Pose;
}

/**
 * Packed field volumes per engine-fields object (Heart Lab: the engine outlives the view, so a remount reuses the
 * volume instead of re-dilating the fields, ≈ 0.6 s). An engine's fields never change after construction; a scenario
 * switch brings a new fields object, i.e. a new key.
 */
const fieldVolumes = new WeakMap<EngineFields, { readonly grid: VoxelGrid; readonly vol: FieldVolume }>();
function fieldVolumeOf(grid: VoxelGrid, fields: EngineFields): FieldVolume {
  const hit = fieldVolumes.get(fields);
  if (hit && hit.grid === grid) return hit.vol;
  const vol = packFieldVolume(grid, fields);
  fieldVolumes.set(fields, { grid, vol });
  return vol;
}

/** A cycle's events for one valve (allocation-free). */
function valveEventsOf(c: CycleTruth | null, id: ValveId): ValveEvents | undefined {
  if (c) for (let j = 0; j < c.valves.length; j++) if (c.valves[j].id === id) return c.valves[j];
  return undefined;
}

function setPoseMatrix(m: Matrix4, pose: Pose): void {
  const R = pose.R, t = pose.tCm, s = 0.1;
  m.set(R[0] * s, R[1] * s, R[2] * s, t[0], R[3] * s, R[4] * s, R[5] * s, t[1], R[6] * s, R[7] * s, R[8] * s, t[2], 0, 0, 0, 1);
}

function makeTexture(data: Uint16Array | Uint8Array, dims: readonly number[], rgba: boolean, half: boolean, linear: boolean): Data3DTexture {
  const tex = new Data3DTexture(data, dims[0], dims[1], dims[2]);
  tex.format = rgba ? RGBAFormat : RedFormat;
  tex.type = half ? HalfFloatType : UnsignedByteType;
  tex.minFilter = tex.magFilter = linear ? LinearFilter : NearestFilter;
  tex.unpackAlignment = 1;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export class HeartScene {
  private readonly renderer: WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.5, 900);
  private readonly controls: OrbitControls;
  private readonly timer = new Timer();
  private readonly U: SharedUniforms = createSharedUniforms();
  private readonly hemi = new HemisphereLight(0xffffff, 0x8a7f78, 1.5);
  private readonly key = new DirectionalLight(0xffffff, 2.1);
  private readonly rim = new DirectionalLight(0xffffff, 0.9);
  private readonly root = new Group();
  private readonly centreGroup = new Group();
  private readonly torso: Torso;
  private readonly vector: VectorArrow;
  private readonly leadAxis: LeadAxisView;
  private readonly disposers: (() => void)[] = [];
  private readonly tween = new CameraTween(new Vector3(), new Vector3(), new Vector3(), new Vector3());
  private readonly raycaster = new Raycaster();
  private content: Content | null = null;
  private layers: Layers = store.layers.peek();
  private leadSpec: LeadAxisSpec | null = null;
  private colors: ThemeColors | null = null;
  private hlStrength = 0;
  private avGap = DEFAULT_AV_GAP_MS;
  private lastTrailT = NaN;
  private lastValueMs = 0;
  private cycle: { cur: CycleTruth | null; prev: CycleTruth | null; from: number; to: number } = { cur: null, prev: null, from: 1, to: 0 };
  // frame scratch (no allocation in the loop)
  private readonly beatBuf = new Float32Array(16);
  private readonly afBuf = new Float32Array(AF_STRIDE * AF_MAX_ROTORS);
  private readonly vfBuf = new Float32Array(VF_FRAME_FLOATS);
  /** Blood flow: context per cycle identity, A / q state, leaflet openness (VALVES order), gates mutated in place. */
  private readonly flowCache = new FlowContextCache();
  private readonly flowBuf = new Float32Array(FLOW_STATE_LEN);
  private readonly flowOpen = new Float32Array(VALVES.length);
  private readonly flowGates = { vf: false, af: false };
  /** Venous inflow: windows per flow context, A / q per side. */
  private readonly venCache = new VenousCache();
  private readonly venBuf = new Float32Array(VENOUS_STATE_LEN);
  private lastFlowMs = 0;
  private readonly hA = new Float32Array(3);
  private readonly hV = new Float32Array(3);
  private readonly trA: Float32Array;
  private readonly trV: Float32Array;
  private readonly app3 = [0, 0, 0];
  private readonly dir = new Vector3();
  private readonly cTmp = new Color();
  private readonly segColors: Record<WaveSegment | 'none', Color> = {
    P: new Color(), PR: new Color(), QRS: new Color(), ST: new Color(), T: new Color(), TP: new Color(), none: new Color(),
  };
  private readonly bgColor = new Color();
  private readonly pointerDown = new Vector2();
  /** CSS2D labels are DOM: re-render them only when the camera, the labels or the lead projection change. */
  private labelsDirty = true;
  private readonly lastCam = new Matrix4();
  private lastLabelT = NaN;
  /** Canvas CSS width, cached in resize() (no layout reads in the 10 Hz highlight effect). */
  private hostWidth = 0;
  /** Set after the first resize; later aspect changes keep the framing (see resize()). */
  private sized = false;
  private pointerDownT = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly engine: SimEngine,
    private readonly commands: AppCommands,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.domElement.className = 'hv-canvas';
    host.appendChild(this.renderer.domElement);
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'hv-labels';
    host.appendChild(this.labelRenderer.domElement);

    const n = Math.round((TRAIL_MS * engine.fsHz) / 1000) + 1;
    this.trA = new Float32Array(3 * n);
    this.trV = new Float32Array(3 * n);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 260;
    this.timer.connect(document);

    this.key.position.set(-30, 45, 55);
    this.rim.position.set(45, 10, -45);
    this.scene.add(this.hemi, this.key, this.rim, this.root);
    this.root.add(this.centreGroup);

    this.torso = createTorso(engine.geometry.body);
    this.vector = createVectorArrow();
    this.leadAxis = createLeadAxis();
    this.scene.add(this.torso.body, this.torso.electrodes);
    this.centreGroup.add(this.vector.group, this.vector.trail, this.leadAxis.group);

    this.buildContent();
    this.resize(host.clientWidth || 640, host.clientHeight || 480);
    this.placeCamera('anterior', false);

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) this.resize(r.width, r.height);
    });
    ro.observe(host);
    this.disposers.push(() => ro.disconnect());

    const el = this.renderer.domElement;
    const onDown = (e: PointerEvent) => {
      this.pointerDown.set(e.clientX, e.clientY);
      this.pointerDownT = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) < 5 && performance.now() - this.pointerDownT < 400) this.pick(e);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    this.disposers.push(() => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    });

    this.disposers.push(engine.onChange(() => this.rebuild()));
    // Store → scene. Each effect re-runs only when the signals it reads change.
    this.disposers.push(effect(() => this.applyLayers(store.layers.value)));
    this.disposers.push(effect(() => this.applySlice(store.slice.value)));
    this.disposers.push(
      effect(() => {
        void bloodFlow.value;
        void flowXray.value;
        this.syncFlow();
      }),
    );
    this.disposers.push(
      effect(() => {
        void flowTourStep.value;
        this.applyFlowTour();
      }),
    );
    this.disposers.push(
      effect(() => {
        const st = flowStyle.value;
        this.content?.flow?.setStyle(st);
      }),
    );
    this.disposers.push(
      effect(() => {
        const explicit = store.highlight.value;
        const auto = explicit.length === 0 && store.autoHighlight.value ? store.now.value.responsible : null;
        void store.playing.value; // labels for automatic highlights appear only while paused
        void store.slice.value; // labels in the cut-away half are hidden
        this.applyHighlight(explicit, auto);
      }),
    );
    this.disposers.push(effect(() => this.applyLead(store.selectedLead.value, store.layers.value.leadAxis)));
    this.disposers.push(
      effect(() => {
        void themeVersion.value;
        void store.electrodeStandard.value;
        this.applyTheme();
      }),
    );
    this.disposers.push(effect(() => this.applyLang(store.lang.value)));

    this.renderer.setAnimationLoop(this.frame);
    // dev-only handle for browser debugging (stripped from production builds)
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__heartScene = this;
  }

  // ---------------------------------------------------------------- content (rebuilt on engine.onChange)

  private buildContent(): void {
    const geo = this.engine.geometry, f = this.engine.fields, U = this.U;
    const poseGroup = new Group();
    poseGroup.name = 'heartLocal';
    poseGroup.matrixAutoUpdate = false;
    setPoseMatrix(poseGroup.matrix, geo.pose);
    poseGroup.matrixWorldNeedsUpdate = true;

    const attr = buildHeartAttributes(geo, f);
    const heartMat = createHeartMaterial(U);
    const heart = new Mesh(createHeartGeometry(geo.mesh, attr), heartMat);
    heart.name = 'heart';
    heart.frustumCulled = false;

    const vol = fieldVolumeOf(geo.grid, f);
    const textures = [
      makeTexture(vol.rgbaHalf, vol.dims, true, true, true),
      makeTexture(vol.label, vol.dims, false, false, false),
      makeTexture(vol.chamberW, vol.dims, true, false, true),
    ];
    U.uFieldTex.value = textures[0];
    U.uLabelTex.value = textures[1];
    U.uChamberTex.value = textures[2];
    U.uGridOrigin.value.fromArray(vol.boxMinMm);
    U.uGridSize.value.fromArray(vol.boxSizeMm);

    U.uChamberRadius.value.fill(0);
    U.uChamberLength.value.fill(1);
    const order = [CHAMBER.LA, CHAMBER.RA, CHAMBER.LV, CHAMBER.RV];
    for (const ch of geo.chambers) {
      const i = order.indexOf(ch.chamber as (typeof order)[number]);
      if (i < 0) continue;
      U.uChamberCenter.value[i].fromArray(ch.centerMm);
      U.uChamberAxis.value[i].fromArray(ch.axis).normalize();
      U.uChamberRadius.value[i] = ch.radiusMm;
      U.uChamberLength.value[i] = ch.lengthMm;
    }
    const mr = mechReference(geo.grid, f);
    U.uMechRef.value.set(mr.tActA, mr.tActV, mr.apdA, mr.apdV);
    U.uApTauUp.value = f.apVentricular.tauUpMs;
    U.uApTauRepV.value = f.apVentricular.tauRepMs;
    U.uApTauRepA.value = f.apAtrial.tauRepMs;

    const slice = createSlicePlane(U);
    const arrows = createSliceArrows(U);
    const tubes = createConductionTubes(geo, U);
    {
      // scenario conduction state (duck-typed: the engine may be a ScenarioEngine or the bare engine)
      const sc = (this.engine as { scenario?: Scenario }).scenario;
      const vm = sc?.ventricular.main;
      const blocked = new Set<StructureId>(vm?.blockTerminals ?? []);
      if (blocked.has('LAF') && blocked.has('LPF') && blocked.has('LSF')) blocked.add('LBB');
      if (vm?.ectopic) for (const id of ['HIS', 'LBB', 'LAF', 'LPF', 'LSF', 'RBB'] as const) blocked.add(id);
      // atria driven by a re-entry circuit (flutter) or retrogradely from the junction (junctional rhythm, AVNRT): the
      // A events are not sinus firings, so the sinus node must not flash with them
      if (sc?.atrial.main.circuit || sc?.rhythm.junctional) blocked.add('SA');
      tubes.setBlocked(blocked, !!sc?.ventricular.alt?.ectopic);
    }
    const valves = createValves(geo, U);
    const overlays = createOverlays(geo, U);
    {
      // culprit vessel of the scenario (e.g. RCA in inferior STEMI)
      const sc = (this.engine as { scenario?: Scenario }).scenario;
      overlays.setHighlight(new Set(sc?.teach?.overlays ?? []), this.colors?.['c-highlight'] ?? '#ff7a00');
    }
    const labelGroup = new Group();
    poseGroup.add(heart, slice.mesh, arrows.mesh, tubes.group, valves.group, overlays.group, labelGroup);
    this.root.add(poseGroup);

    const c = localToApp(geo.pose, ventricularCentroid(geo));
    const centre = new Vector3(c[0], c[1], c[2]);
    this.centreGroup.position.copy(centre);
    // default framing: bounding sphere of the heart mesh plus the vessel overlays (aortic arch, venae cavae…)
    poseGroup.updateMatrixWorld(true);
    const heartBox = new ThreeBox3().setFromObject(heart);
    const allBox = heartBox.clone().union(new ThreeBox3().setFromObject(overlays.group));
    const heartSphere = heartBox.getBoundingSphere(new Sphere());
    const allSphere = allBox.getBoundingSphere(new Sphere());
    // centre on the heart; radius covers the heart with margin and most of the vessel stubs
    const fitCentre = heartSphere.center.clone().lerp(allSphere.center, 0.25);
    const fitRadius = Math.max(heartSphere.radius * 0.95, allSphere.radius * 0.7);

    this.content = {
      poseGroup, heart, heartMat, attr, textures, slice, arrows, tubes, valves, flow: null, flowLabels: null, overlays, labelGroup,
      labels: new Map(),
      anchors: structureAnchors(geo),
      centre,
      fitCentre,
      fitRadius,
      box: gridBox(geo.grid),
      vScale: vTimeScale(f.ventricular[0].tMinMs),
      pose: geo.pose,
    };
  }

  private disposeContent(): void {
    const c = this.content;
    if (!c) return;
    this.root.remove(c.poseGroup);
    c.heart.geometry.dispose();
    c.heartMat.dispose();
    c.textures.forEach((t) => t.dispose());
    c.slice.dispose();
    c.arrows.dispose();
    c.tubes.dispose();
    c.valves.dispose();
    c.flow?.dispose();
    if (c.flowLabels) for (const l of c.flowLabels.values()) l.el.remove();
    c.overlays.dispose();
    for (const l of c.labels.values()) l.el.remove();
    this.content = null;
  }

  private rebuild(): void {
    this.disposeContent();
    this.buildContent();
    this.cycle = { cur: null, prev: null, from: 1, to: 0 };
    // a ScenarioEngine keeps its identity across scenario switches, so the flow cache cannot see the change itself
    this.flowCache.invalidate();
    this.lastFlowMs = 0;
    this.hlKey = '';
    this.labelsDirty = true;
    this.applyLayers(store.layers.peek());
    this.applySlice(store.slice.peek());
    this.applyHighlight(store.highlight.peek(), store.autoHighlight.peek() ? store.now.peek().responsible : null);
    this.applyLead(store.selectedLead.peek(), store.layers.peek().leadAxis);
    this.applyTheme();
    this.applyLang(store.lang.peek());
  }

  // ---------------------------------------------------------------- store → scene

  private applyLayers(l: Layers): void {
    this.labelsDirty = true;
    const prev = this.layers;
    this.layers = l;
    const c = this.content;
    if (c) {
      c.tubes.group.visible = l.conduction;
      c.valves.group.visible = l.valves;
      // heart-structure labels are unreadable at torso scale (leads mode) — keep them for the heart close-up
      c.labelGroup.visible = l.labels && !l.torso;
    }
    this.syncFlow();
    this.vector.group.visible = l.vector;
    this.vector.trail.visible = l.vector && l.vcgTrail;
    this.torso.body.visible = l.torso;
    this.torso.electrodes.visible = l.electrodes;
    this.leadAxis.group.visible = l.leadAxis;
    this.U.uContraction.value = Math.max(0, Math.min(1, l.contraction));
    if (prev.torso !== l.torso || prev.electrodes !== l.electrodes) this.reframe();
  }

  /** Last slice key ('off' or the preset id) — the camera turns to face the cut only when it changes. */
  private sliceKey = 'off';

  private applySlice(s: SliceState): void {
    const c = this.content, U = this.U;
    const nl = Math.hypot(s.normal[0], s.normal[1], s.normal[2]) || 1;
    const n: Vec3 = [s.normal[0] / nl, s.normal[1] / nl, s.normal[2] / nl];
    const d = s.offsetMm / nl;
    U.uRestClip.value.set(n[0], n[1], n[2], d);
    U.uClipOn.value = s.enabled ? 1 : 0;
    if (!c) return;
    // discard (and DoubleSide sliver filling) only while cutting: keeps early-z for the intact heart
    setClipDefine(c.heartMat, s.enabled);
    c.heartMat.side = s.enabled ? DoubleSide : FrontSide;
    c.tubes.setClip(s.enabled);
    c.valves.setClip(s.enabled);
    c.flow?.setClip(s.enabled);
    c.overlays.setClip(s.enabled);
    this.syncFlow();
    const rect = sliceRect(c.box, n, d);
    c.slice.mesh.visible = s.enabled && rect.valid;
    if (rect.valid) c.slice.setRect(rect);
    if (s.enabled && s.arrows && rect.valid) {
      c.arrows.set(computeSliceArrows(this.engine.geometry.grid, this.engine.fields, rect, ARROW_SPACING_MM), n, ARROW_SPACING_MM);
      c.arrows.mesh.visible = c.arrows.mesh.count > 0;
    } else c.arrows.mesh.visible = false;
    // the LVOT cut is a 'custom' plane until the store has the preset (core/lvotSlice.ts): face it like a preset
    const key = s.enabled ? lvotSliceKey(this.engine.geometry, s) ?? s.preset : 'off';
    if (key !== this.sliceKey) {
      this.sliceKey = key;
      if (s.enabled) this.faceSlice(n);
    }
  }

  /**
   * Blood-flow layer: drawn while switched on, except at torso scale (like the structure labels; the same gate as the
   * caption chip and the legends). While cutting, the slice plane leaves the cavity fill out so the cut opens onto it.
   */
  private syncFlow(): void {
    const c = this.content;
    if (!c) return;
    const show = bloodFlow.peek() && !this.layers.torso;
    const flow = show ? this.ensureFlow(c) : c.flow;
    if (flow) {
      if (show && !flow.group.visible) this.lastFlowMs = 0; // caption at the next frame
      flow.group.visible = show;
    }
    const sl = store.slice.peek();
    c.slice.setFlowOpen(show && !!flow && sl.enabled);
    // X-ray wall while the flow is drawn, so the cavity streams are not hidden behind the myocardium
    const xray = show && !!flow && flowXray.peek();
    setHeartXray(c.heartMat, xray);
    c.overlays.setXray(xray);
    if (c.flowLabels) {
      // tags in the half removed by the cross-section are hidden (as for the structure labels)
      const nl = Math.hypot(sl.normal[0], sl.normal[1], sl.normal[2]) || 1;
      for (const l of c.flowLabels.values()) {
        const cut = sl.enabled && (l.p[0] * sl.normal[0] + l.p[1] * sl.normal[1] + l.p[2] * sl.normal[2]) / nl > sl.offsetMm / nl;
        l.obj.visible = show && !cut;
      }
      this.labelsDirty = true;
    }
    if ((!show || !flow) && flowNow.peek() !== 'idle') flowNow.value = 'idle';
  }

  /** Walkthrough step → stream emphasis and tag emphasis (flowControls.FLOW_TOUR). */
  private applyFlowTour(): void {
    const c = this.content;
    if (!c) return;
    const i = flowTourStep.peek();
    const st = i === null ? null : FLOW_TOUR[i] ?? null;
    c.flow?.setFocus(st ? new Set(st.focus) : null);
    if (c.flowLabels)
      for (const [id, l] of c.flowLabels) {
        const on = !!st && st.labels.includes(id);
        l.el.classList.toggle('is-focus', on);
        l.el.classList.toggle('is-dim', !!st && !on);
      }
    this.labelsDirty = true;
  }

  /**
   * Builds the blood-flow layer for this content on first show: heart and vessel streams (cached per geometry, so a
   * scenario switch on the same heart only rebuilds the GPU objects), jets, and the cells when that style is chosen.
   */
  private ensureFlow(c: Content): BloodFlow | null {
    if (c.flow) return c.flow;
    const geo = this.engine.geometry;
    let flow: BloodFlow;
    let anchors: ReturnType<typeof flowLabelAnchors>;
    try {
      const net = buildFlowNetwork(geo);
      flow = createBloodFlow(geo, [...net.heart, ...net.vessels], this.U);
      anchors = flowLabelAnchors(geo, net.vessels);
    } catch (err) {
      console.error('[view3d] blood-flow paths could not be built', err);
      return null;
    }
    flow.setClip(store.slice.peek().enabled);
    const fp = flowPaletteForBg(this.colors?.['scene-bg'] ?? '#ffffff');
    flow.setColors(fp.rich, fp.poor);
    flow.setStyle(flowStyle.peek());
    flow.group.visible = false;
    c.poseGroup.add(flow.group);
    c.flow = flow;
    const lang = store.lang.peek();
    const tags = new Map<FlowLabelId, { obj: CSS2DObject; el: HTMLDivElement; p: Vec3 }>();
    for (const [id, p] of Object.entries(anchors) as [FlowLabelId, Vec3][]) {
      const el = document.createElement('div');
      el.className = 'hv-label hv-flow-label';
      el.dataset.flow = id;
      el.textContent = tv.in(lang, FLOW_LABEL_KEYS[id]);
      const obj = new CSS2DObject(el);
      obj.position.set(p[0], p[1], p[2]);
      obj.visible = false;
      c.poseGroup.add(obj);
      tags.set(id, { obj, el, p });
    }
    c.flowLabels = tags;
    this.applyFlowTour();
    return flow;
  }

  private hlKey = '';
  private applyHighlight(explicit: readonly StructureId[], auto: readonly { id: StructureId; w: number }[] | null): void {
    const ids: StructureId[] = explicit.length ? [...explicit] : (auto ?? []).filter((r) => r.w >= 0.5).map((r) => r.id);
    const playing = store.playing.peek();
    const sl = store.slice.peek();
    const key = (explicit.length ? 'e:' : 'a:') + ids.join(',') + (playing ? '|p' : '|s') + (sl.enabled ? `|${sl.normal.join(',')},${sl.offsetMm}` : '');
    if (key === this.hlKey && this.content) return;
    this.hlKey = key;
    this.labelsDirty = true;
    // explicit highlights (tour, quiz, click) glow fully; automatic "responsible structure" highlights stay subtle
    this.hlStrength = ids.length === 0 ? 0 : explicit.length ? 1 : 0.45;
    const arr = this.U.uHighlight.value;
    arr.fill(-1);
    let k = 0;
    for (const id of ids) {
      const r = STRUCTURES.indexOf(id);
      if (r >= 0 && k < MAX_HIGHLIGHT) arr[k++] = r;
    }
    const c = this.content;
    if (!c) return;
    const set = new Set<StructureId>(ids);
    c.tubes.setHighlight(set);
    c.valves.setHighlight(set);
    // Text labels: explicit highlights (tour, quiz, click) always; automatic "responsible structure" highlights only while
    // paused — during playback that set changes several times per beat and the labels would flicker. Never on a
    // phone-width view for automatic ones, and never for anchors in the half removed by the cross-section.
    const auto0 = !explicit.length;
    const labelled = new Set<StructureId>();
    if (!auto0 || (!playing && this.hostWidth >= 420)) {
      for (const id of set) {
        const p = c.anchors[id];
        if (sl.enabled && p && p[0] * sl.normal[0] + p[1] * sl.normal[1] + p[2] * sl.normal[2] > sl.offsetMm) continue;
        labelled.add(id);
      }
    }
    for (const [id, l] of c.labels) l.obj.visible = labelled.has(id);
    const lang = store.lang.peek();
    for (const id of labelled) {
      if (c.labels.has(id)) continue;
      const p = c.anchors[id];
      if (!p) continue;
      const el = document.createElement('div');
      el.className = 'hv-label hv-struct';
      el.textContent = tc.in(lang, `struct.${id}`);
      const obj = new CSS2DObject(el);
      obj.position.set(p[0], p[1], p[2]);
      c.labelGroup.add(obj);
      c.labels.set(id, { obj, el });
    }
  }

  private applyLead(lead: LeadName, show: boolean): void {
    this.labelsDirty = true;
    const spec = leadAxisSpec(this.engine.projector, lead);
    this.leadSpec = spec;
    const c = this.content;
    if (c) this.leadAxis.setSpec(spec, this.torso.drawPos, c.centre);
    const cols = this.colors;
    const neg: readonly ElectrodeId[] = spec.wct ? ['RA', 'LA', 'LL'] : spec.negative;
    this.torso.setRoles(show ? spec.positive : null, show ? neg : [], cols?.['c-highlight'] ?? '#ff7a00', cols?.fg ?? '#1f2328');
    this.applyLang(store.lang.peek());
  }

  private applyTheme(): void {
    const col = readThemeColors(this.host);
    this.colors = col;
    const U = this.U;
    this.scene.background = new Color().setStyle(col['scene-bg']);
    this.bgColor.setStyle(col['scene-bg']);
    this.hemi.color.setStyle(col['scene-ambient']);
    U.uColRest.value.setStyle(col['c-myo-rest']);
    U.uColAtrial.value.setStyle(col['c-atrial']);
    U.uColQrs.value.setStyle(col['c-qrs']);
    U.uColRepol.value.setStyle(col['c-repol']);
    U.uColFront.value.setStyle(FRONT_CSS);
    U.uColRing.value.setStyle(col['c-ring']);
    U.uColVessel.value.setStyle(col['c-vessel']);
    U.uColBlood.value.setStyle(col['c-blood']);
    U.uColHighlight.value.setStyle(col['c-highlight']);
    U.uColConduction.value.setStyle(col['c-conduction']);
    U.uColPulse.value.setStyle(col['c-conduction']).lerp(this.cTmp.setRGB(1, 1, 1), 0.55);
    U.uColArrowRest.value.setStyle(col['fg-muted']);
    this.torso.setColors(col.torso, store.electrodeStandard.peek(), col['fg-muted']);
    this.vector.setColor(col['c-vector']);
    this.leadAxis.setColors(col['fg-muted'], col['c-highlight'], col.fg, col['c-vector']);
    this.content?.valves.setColor(col['c-ring']);
    const fp = flowPaletteForBg(col['scene-bg']);
    this.content?.flow?.setColors(fp.rich, fp.poor);
    const s = this.segColors;
    s.P.setStyle(col['c-atrial']);
    s.PR.setStyle(col['fg-muted']);
    s.QRS.setStyle(col['c-qrs']);
    s.ST.setStyle(col['c-repol']);
    s.T.setStyle(col['c-repol']);
    s.TP.setStyle(col['fg-muted']);
    s.none.setStyle(col['fg-muted']);
    if (this.leadSpec) {
      const neg: readonly ElectrodeId[] = this.leadSpec.wct ? ['RA', 'LA', 'LL'] : this.leadSpec.negative;
      const show = this.layers.leadAxis;
      this.torso.setRoles(show ? this.leadSpec.positive : null, show ? neg : [], col['c-highlight'], col.fg);
    }
    this.lastTrailT = NaN;
  }

  private applyLang(lang: 'zh' | 'en' | 'es'): void {
    this.labelsDirty = true;
    this.torso.setLabels((id, long) => (long ? tc.in(lang, `electrode.${id}`) : id));
    this.torso.setGuideLabels((id) => tv.in(lang, `guide.${id}`));
    const lead = this.leadSpec?.lead ?? 'II';
    this.leadAxis.setLabels(tv.in(lang, 'lead.plus', { lead }), tv.in(lang, 'lead.minus'), tv.in(lang, 'lead.wct'));
    this.lastValueMs = 0;
    const c = this.content;
    if (c) for (const [id, l] of c.labels) l.el.textContent = tc.in(lang, `struct.${id}`);
    if (c?.flowLabels) for (const [id, l] of c.flowLabels) l.el.textContent = tv.in(lang, FLOW_LABEL_KEYS[id]);
  }

  // ---------------------------------------------------------------- camera

  setCameraPreset(p: CameraPreset): void {
    this.placeCamera(p, true);
  }

  private framing(): { target: Vector3; radius: number } {
    const big = this.layers.torso || this.layers.electrodes;
    const body = this.engine.geometry.body;
    if (big && body) {
      // frame the precordial electrodes (and the heart behind them); zoom out for the limb electrodes
      const ids = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
      const c = new Vector3();
      for (const id of ids) c.add(new Vector3(...body.electrodes[id].pos));
      c.multiplyScalar(1 / ids.length);
      c.y -= 3;
      let r = 0;
      for (const id of ids) r = Math.max(r, c.distanceTo(new Vector3(...body.electrodes[id].pos)));
      return { target: c, radius: Math.max(16, r * 1.9) };
    }
    if (big) return { target: TORSO_TARGET, radius: TORSO_RADIUS_CM };
    return { target: this.content?.fitCentre ?? TORSO_TARGET, radius: this.content?.fitRadius ?? HEART_RADIUS_CM };
  }

  private placeCamera(p: CameraPreset, animate: boolean): void {
    const pose = this.content?.pose ?? this.engine.geometry.pose;
    const d = presetDirection(p, pose.R, this.leadSpec?.dirApp ?? null);
    const { target, radius } = this.framing();
    const dist = fitDistance(radius, this.camera.fov, this.camera.aspect);
    const pos = new Vector3(d[0], d[1], d[2]).multiplyScalar(dist).add(target);
    if (animate) this.tween.start(this.camera, this.controls.target, pos, target, performance.now());
    else {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  /**
   * Turns the camera to look straight at the cut face: from the removed half (+normal side) toward the heart.
   * On the realistic anatomy the four-chamber plane is near-horizontal, so the default anterior view sees it edge-on.
   */
  private faceSlice(nLocal: Vec3): void {
    if (!this.content || this.layers.torso || this.layers.electrodes) return;
    const R = this.content.pose.R;
    let d: Vec3 = [
      R[0] * nLocal[0] + R[1] * nLocal[1] + R[2] * nLocal[2],
      R[3] * nLocal[0] + R[4] * nLocal[1] + R[5] * nLocal[2],
      R[6] * nLocal[0] + R[7] * nLocal[1] + R[8] * nLocal[2],
    ];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    d = [d[0] / l, d[1] / l, d[2] / l];
    // keep OrbitControls' fixed +y up usable: avoid looking exactly along the vertical
    if (Math.abs(d[1]) > 0.94) {
      const t: Vec3 = [d[0], d[1], d[2] + 0.4];
      const m = Math.hypot(t[0], t[1], t[2]);
      d = [t[0] / m, t[1] / m, t[2] / m];
    }
    const { target, radius } = this.framing();
    const pos = new Vector3(d[0], d[1], d[2]).multiplyScalar(fitDistance(radius, this.camera.fov, this.camera.aspect)).add(target);
    this.tween.start(this.camera, this.controls.target, pos, target, performance.now());
  }

  /** Keep the viewing direction, refit distance/target (torso shown or hidden). */
  private reframe(): void {
    if (!this.content) return;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const { target, radius } = this.framing();
    const pos = dir.multiplyScalar(fitDistance(radius, this.camera.fov, this.camera.aspect)).add(target);
    this.tween.start(this.camera, this.controls.target, pos, target, performance.now());
  }

  /** Pixels at the bottom of the view covered by an overlay (the flow walkthrough card); see setViewInset. */
  private insetBottom = 0;
  private viewW = 0;
  private viewH = 0;

  /**
   * Keep the heart clear of an overlay covering the bottom `px` of the view: the camera renders the lower part of a
   * frame taller by `px`, so the framing centre moves to the middle of the free area above it (and the heart shrinks a
   * little). Labels and picking follow, since both use the camera's projection. 0 restores the normal view.
   */
  setViewInset(px: number): void {
    this.insetBottom = Math.max(0, Math.round(px));
    this.applyViewOffset();
  }

  private applyViewOffset(): void {
    const w = this.viewW, h = this.viewH, b = this.insetBottom;
    if (w < 2 || h < 2) return;
    if (b > 0 && b < 0.7 * h) this.camera.setViewOffset(w, h + b, 0, b, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.labelsDirty = true;
  }

  private resize(w: number, h: number): void {
    if (w < 2 || h < 2) return;
    const oldAspect = this.camera.aspect;
    this.hostWidth = w;
    this.viewW = w;
    this.viewH = h;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.labelsDirty = true;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.insetBottom > 0) this.applyViewOffset();
    // When the pane changes shape later (window resize, layout switch), keep the framing: scale the viewing distance by
    // the ratio of the fit distances, which also preserves the student's own zoom. The first resize precedes placeCamera.
    if (this.sized && Math.abs(oldAspect - this.camera.aspect) > 1e-3 && !this.tween.active) {
      const k = fitDistance(1, this.camera.fov, this.camera.aspect) / fitDistance(1, this.camera.fov, oldAspect);
      this.camera.position.sub(this.controls.target).multiplyScalar(k).add(this.controls.target);
      this.controls.update();
    }
    this.sized = true;
  }

  // ---------------------------------------------------------------- picking

  private pick(e: PointerEvent): void {
    const c = this.content;
    if (!c) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    // rest-pose raycast (GPU contract); skip hits in the half removed by the cross-section
    const hits = this.raycaster.intersectObject(c.heart, false);
    const s = store.slice.peek();
    for (const h of hits) {
      const local = c.poseGroup.worldToLocal(h.point.clone());
      if (s.enabled && local.x * s.normal[0] + local.y * s.normal[1] + local.z * s.normal[2] > s.offsetMm) continue;
      const region = h.face ? c.attr.region[h.face.a] : STRUCTURE_NONE;
      if (region === STRUCTURE_NONE || region >= STRUCTURES.length) return;
      const id = STRUCTURES[region];
      const cur = store.highlight.peek();
      if (cur.length === 1 && cur[0] === id) this.commands.clearHighlight();
      else this.commands.highlight([id]);
      return;
    }
  }

  // ---------------------------------------------------------------- frame loop

  private cycleAt(t: number): CycleTruth | null {
    const cc = this.cycle;
    if (t >= cc.from && t < cc.to) return cc.cur;
    const cur = this.engine.cycleAt(t);
    let from = t - 20, to = t + 20;
    if (cur) {
      from = cur.pOn ?? cur.qrsOn ?? t;
      to = from;
      for (const s of cur.segments) to = Math.max(to, s.t1);
      if (to <= t) to = t + 20;
    }
    cc.cur = cur;
    cc.prev = cur && from > 1 ? this.engine.cycleAt(from - 1) : null;
    cc.from = from;
    cc.to = to;
    return cur;
  }

  private segmentColor(t: number): Color {
    const cc = this.cycle;
    const cyc = cc.cur && t >= cc.from ? cc.cur : cc.prev;
    if (cyc) for (let i = 0; i < cyc.segments.length; i++) {
      const s = cyc.segments[i];
      if (t >= s.t0 && t < s.t1) return this.segColors[s.seg];
    }
    return this.segColors.none;
  }

  private readonly frame = (ts: number): void => {
    this.timer.update(ts);
    const now = performance.now();
    if (this.content) this.updateSim(this.content, now);
    this.tween.update(this.camera, this.controls.target, now);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const t = store.time.peek();
    if (this.labelsDirty || !this.lastCam.equals(this.camera.matrixWorld) || (this.layers.leadAxis && t !== this.lastLabelT)) {
      this.labelRenderer.render(this.scene, this.camera);
      this.lastCam.copy(this.camera.matrixWorld);
      this.lastLabelT = t;
      this.labelsDirty = false;
    }
  };

  private updateSim(c: Content, now: number): void {
    const t = store.time.peek();
    const U = this.U, L = this.layers;
    const snap = this.engine.activeBeats(t);
    packBeatSnapshot(snap, this.beatBuf);
    U.uBeatA.value[0].fromArray(this.beatBuf, 0);
    U.uBeatA.value[1].fromArray(this.beatBuf, 4);
    U.uBeatV.value[0].fromArray(this.beatBuf, 8);
    U.uBeatV.value[1].fromArray(this.beatBuf, 12);
    const nAf = this.engine.afFrame(t, this.afBuf);
    U.uAfOn.value = nAf > 0 ? 1 : 0;
    U.uAfN.value = nAf;
    for (let i = 0; i < 5 * nAf; i++) U.uAf.value[i].fromArray(this.afBuf, 4 * i);
    // ventricular scroll-wave field (VF / torsades run): rotor slots + run header; mode in the header
    const nVf = vfFrameOf(this.engine, t, this.vfBuf);
    U.uVfOn.value = nVf > 0 ? this.vfBuf[VF_HEADER_OFFSET + 7] : 0;
    U.uVfN.value = nVf;
    if (nVf > 0) {
      for (let i = 0; i < 5 * VF_MAX_ROTORS; i++) U.uVf.value[i].fromArray(this.vfBuf, 4 * i);
      U.uVfRun.value[0].fromArray(this.vfBuf, VF_HEADER_OFFSET);
      U.uVfRun.value[1].fromArray(this.vfBuf, VF_HEADER_OFFSET + 4);
    }
    this.avGap = avGapMs(snap, this.avGap);
    if (L.conduction) c.tubes.update(snap, this.avGap, c.vScale);
    const cyc = this.cycleAt(t);
    // cycleAt(t) ran just above: this.cycle.prev is the cycle before cyc
    if (L.valves) c.valves.update(cyc, this.cycle.prev, t);
    if (c.flow?.group.visible) this.updateFlow(c.flow, cyc, t, nVf > 0, nAf > 0, now);
    U.uHighlightMix.value = this.hlStrength * (0.75 + 0.25 * Math.sin(this.timer.getElapsed() * 5));

    if (L.vector || L.leadAxis) {
      const hA = this.hA, hV = this.hV, a = this.app3;
      this.engine.sampleH(t, 1, hA, hV);
      frankToAppInto(a, hA[0] + hV[0], hA[1] + hV[1], hA[2] + hV[2]);
      const mv = Math.hypot(a[0], a[1], a[2]);
      if (mv > 1e-6) this.dir.set(a[0] / mv, a[1] / mv, a[2] / mv);
      this.vector.update(this.dir, mv * CM_PER_MV);
      const spec = this.leadSpec;
      if (L.leadAxis && spec) {
        const val = leadValue(this.engine.projector, spec.lead, hA, hV);
        this.leadAxis.setProjection(val * CM_PER_MV);
        if (now - this.lastValueMs > 100) {
          this.lastValueMs = now;
          const mvText = (val >= 0 ? '+' : '−') + Math.abs(val).toFixed(2);
          this.leadAxis.setValueText(tv.in(store.lang.peek(), 'lead.value', { lead: spec.lead, mv: mvText }));
        }
      }
    }
    if (L.vector && L.vcgTrail && t !== this.lastTrailT) {
      this.lastTrailT = t;
      this.updateTrail(t);
    }
  }

  /**
   * Blood flow at t (allocation-free): A / q from the cycle-identity context, the venous A / q from the same context;
   * jet openness from the current cycle and the one before it (leafletOpenness), so a previous ejection that outlasts
   * the next P onset keeps its jets.
   */
  private updateFlow(flow: BloodFlow, cyc: CycleTruth | null, t: number, vf: boolean, af: boolean, now: number): void {
    const g = this.flowGates;
    g.vf = vf;
    g.af = af;
    // stable fallback RR (used only for an unknown neighbouring beat): a value drifting per frame would defeat the cache
    const ctx = this.flowCache.get(this.engine, t, 60000 / Math.max(1, store.heartRate.peek()));
    flowAt(ctx, t, g, this.flowBuf);
    const open = this.flowOpen, prev = this.cycle.prev; // cycleAt(t) ran this frame: prev is the cycle before cyc
    for (let i = 0; i < VALVES.length; i++) open[i] = leafletOpenness(VALVES[i], valveEventsOf(prev, VALVES[i]), valveEventsOf(cyc, VALVES[i]), t);
    venousAt(ctx, this.venCache.get(ctx), t, g, this.venBuf);
    flow.update(this.flowBuf, open, this.venBuf);
    // "blood now" chip: at most 10 Hz, published only on change
    if (now - this.lastFlowMs > 100) {
      this.lastFlowMs = now;
      const id = flowCaption(ctx, t, g);
      if (id !== flowNow.peek()) flowNow.value = id;
    }
  }

  private updateTrail(t: number): void {
    const fs = this.engine.fsHz;
    const n = this.trA.length / 3;
    const step = 1000 / fs;
    const t0 = t - (n - 1) * step;
    this.engine.sampleH(t0, n, this.trA, this.trV);
    const k = Math.max(1, Math.ceil(n / TRAIL_POINTS));
    let count = 0;
    const a = this.app3, A = this.trA, V = this.trV;
    for (let s = 0; s < n && count < TRAIL_POINTS; s += k) {
      const j = 3 * s;
      frankToAppInto(a, A[j] + V[j], A[j + 1] + V[j + 1], A[j + 2] + V[j + 2]);
      const age = s / (n - 1); // 0 oldest … 1 newest
      this.cTmp.copy(this.bgColor).lerp(this.segmentColor(t0 + s * step), 0.25 + 0.75 * age);
      this.vector.setTrailPoint(count++, a[0] * CM_PER_MV, a[1] * CM_PER_MV, a[2] * CM_PER_MV, this.cTmp);
    }
    this.vector.commitTrail(count);
  }

  // ---------------------------------------------------------------- teardown

  dispose(): void {
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__heartScene;
    this.renderer.setAnimationLoop(null);
    this.disposers.forEach((d) => d());
    this.disposers.length = 0;
    this.controls.dispose();
    this.timer.dispose();
    this.disposeContent();
    this.torso.dispose();
    this.vector.dispose();
    this.leadAxis.dispose();
    this.key.dispose();
    this.rim.dispose();
    this.hemi.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
