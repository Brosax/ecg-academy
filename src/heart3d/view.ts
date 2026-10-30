/**
 * The three.js side of the small 3D heart. Thin by design: geometry and colours come from the pure modules
 * (format.ts, model.ts, colors.ts, phase.ts); this file uploads them, renders ON DEMAND only (cursor change, drag,
 * resize, theme/option change — never a continuous loop), raycasts for hover labels and disposes every GPU resource.
 */
import type { Signal } from '@preact/signals';
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LessEqualDepth,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Spherical,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RegionStates } from '../core/ecg';
import type { Lang } from '../core/l10n';
import { REGIONS, type RegionId } from '../core/regions';
import {
  classifyState,
  conductionColor,
  conductionLevel,
  emphasisTint,
  myocardiumColor,
  srgbToLinear,
  vesselColor,
  type HeartPalette,
  type HighlightTag,
  type MyocardiumKind,
  type Rgb,
} from './colors';
import type { HeartAsset, HeartLabel, Vec3 } from './format';
import { keyAction, orbitStep } from './keys';
import { anyConductionShown, isConductionId as isConduction, labelName, shownConduction, tooltipLines } from './legend';
import {
  arcFractions,
  boundingSphere,
  buildTube,
  computeNormals,
  inflate,
  labelMask,
  mergeTubes,
  pathwayBridge,
  pointAtFraction,
  regionAnchors,
  regionOutline,
  ringPoints,
  vertexNeighbors,
  type Anchor,
  type TubeData,
} from './model';
import { cardiacPhase, type CardiacPhase } from './phase';

export interface HeartViewOptions {
  readonly regions: RegionStates | null;
  readonly emphasize: readonly RegionId[];
  readonly showConduction: boolean;
  readonly labels: boolean;
  readonly lang: Lang;
}

/** What the caption under the heart says: a cardiac phase, 'none' (no cursor yet) or 'anatomy' (no states). */
export type PhaseKey = CardiacPhase | 'none' | 'anatomy';

/** Tube radii (mm) of the conduction system: nodes thicker, Purkinje fibres thin. */
const CONDUCTION_RADIUS: Readonly<Record<string, number>> = {
  'sa-node': 2.2,
  'av-node': 2.0,
  his: 1.6,
  lbb: 1.4,
  rbb: 1.3,
  laf: 1.2,
  lpf: 1.2,
  purkinje: 0.7,
};
/** Wall thickening (mm) drawn for a 'hypertrophy' highlight. */
const HYPERTROPHY_MM = 4;
/** Myocardium opacity while the conduction overlay is shown (x-ray view of the endocardial fibres). */
const XRAY_OPACITY = 0.5;
const FOV = 28;
const INITIAL_DIR = new Vector3(0.22, 0.12, 1).normalize(); // anterior view, a little from the patient's left and above

interface ConductionTube {
  readonly id: RegionId;
  /** index of `id` in regions.ids (−1 = not reported); refreshed when the regions object changes */
  stateIdx: number;
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly along: Float32Array;
  readonly colors: Float32Array;
  readonly points: Float32Array;
  readonly fr: Float32Array;
  readonly head: Mesh<SphereGeometry, MeshBasicMaterial> | null;
}

function kindOf(id: HeartLabel): MyocardiumKind | 'vessel' {
  if (id === 'aorta' || id === 'pulmonary-trunk') return 'vessel';
  return REGIONS[id].group === 'atria' ? 'atria' : 'ventricle';
}

function tubeGeometry(t: TubeData, withColor: boolean): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(t.positions, 3));
  g.setAttribute('normal', new BufferAttribute(t.normals, 3));
  if (withColor) g.setAttribute('color', new BufferAttribute(new Float32Array(t.positions.length), 3));
  g.setIndex(new BufferAttribute(t.indices, 1));
  return g;
}

function disposeTree(o: Object3D): void {
  o.traverse((c) => {
    const m = c as Partial<Mesh>;
    m.geometry?.dispose();
    const mat = m.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/** Create the view, or null when WebGL is unavailable (the caller shows the fallback text). */
export function createHeartView(
  canvas: HTMLCanvasElement,
  overlay: HTMLElement,
  asset: HeartAsset,
  cursor: Signal<number | null>,
  palette: HeartPalette,
  opts: HeartViewOptions,
  onPhase: (p: PhaseKey) => void,
): HeartView | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  return new HeartView(renderer, canvas, overlay, asset, cursor, palette, opts, onPhase);
}

export class HeartView {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 1, 2000);
  private readonly controls: OrbitControls;
  private readonly root = new Group();
  private readonly geometry = new BufferGeometry();
  private readonly heartMat: MeshStandardMaterial;
  private readonly prepassMat: MeshBasicMaterial;
  private readonly heart: Mesh;
  private readonly prepass: Mesh;
  private readonly baseNormals: Float32Array;
  private readonly colorAttr: BufferAttribute;
  private readonly conduction: ConductionTube[] = [];
  private readonly conductionGroup = new Group();
  private readonly headGeo = new SphereGeometry(1.7, 12, 8);
  /** rebuilt when regions / emphasis / palette change */
  private decor = new Group();
  private positions: Float32Array;
  private neighbors: ReturnType<typeof vertexNeighbors> | null = null;
  private readonly center: Vec3;
  private readonly home: { readonly pos: Vector3; readonly dist: number };
  /** label / marker anchors: myocardial regions from the mesh, conduction ids from the bake (mid-polyline) */
  private readonly anchors: Partial<Record<string, Anchor>>;
  /** ids the camera last turned toward (emphasized + highlighted myocardial regions) */
  private focusKey = '';

  private opts: HeartViewOptions;
  private palette: HeartPalette;
  private cursor: Signal<number | null>;
  private unsubCursor: () => void;
  private stateBuf = new Float32Array(0);
  /** per label index → index into regions.ids (−1 = not reported) */
  private stateIndex = new Int16Array(0);
  private statesValid = false;
  private phase: PhaseKey | null = null;
  private colorsDirty = true;
  private raf = 0;
  private hoverRaf = 0;
  private disposed = false;
  private readonly ro: ResizeObserver | null;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private hover: { x: number; y: number; label: HeartLabel | null } | null = null;
  private readonly tip: HTMLDivElement;
  private chips: { id: RegionId; el: HTMLDivElement; p: Vector3; n: Vector3 }[] = [];
  private readonly listeners: [EventTarget, string, EventListener][] = [];

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly canvas: HTMLCanvasElement,
    private readonly overlay: HTMLElement,
    private readonly asset: HeartAsset,
    cursor: Signal<number | null>,
    palette: HeartPalette,
    opts: HeartViewOptions,
    private readonly onPhase: (p: PhaseKey) => void,
  ) {
    this.opts = opts;
    this.palette = palette;
    this.cursor = cursor;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;

    // ---- myocardium (+ vessel stubs): one indexed mesh with per-vertex colours
    this.positions = asset.positions;
    this.baseNormals = computeNormals(asset.positions, asset.indices);
    const bs = boundingSphere(asset.positions);
    this.center = bs.center;
    this.anchors = { ...regionAnchors(asset, this.baseNormals) };
    for (const [id, a] of Object.entries(asset.header.anchors)) {
      if (!a || !isConduction(id)) continue;
      const d = [a.p[0] - bs.center[0], a.p[1] - bs.center[1], a.p[2] - bs.center[2]];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      this.anchors[id] = { p: a.p, n: [0, 0, 0], out: [d[0] / l, d[1] / l, d[2] / l] };
    }
    this.geometry.setAttribute('position', new BufferAttribute(Float32Array.from(asset.positions), 3));
    this.geometry.setAttribute('normal', new BufferAttribute(this.baseNormals, 3));
    this.colorAttr = new BufferAttribute(new Float32Array(asset.positions.length), 3);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setIndex(new BufferAttribute(asset.indices, 1));
    this.geometry.computeBoundingSphere();
    this.heartMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: DoubleSide });
    this.heart = new Mesh(this.geometry, this.heartMat);
    this.heart.renderOrder = 1;
    // depth-only pre-pass: in x-ray mode only the nearest surface is drawn (no inner-wall clutter)
    this.prepassMat = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide });
    this.prepass = new Mesh(this.geometry, this.prepassMat);
    this.prepass.renderOrder = 0;
    this.prepass.visible = false;
    this.root.add(this.prepass, this.heart, this.conductionGroup, this.decor);
    this.root.position.set(-this.center[0], -this.center[1], -this.center[2]);
    this.scene.add(this.root);

    // ---- lights: soft ambient + a head-light that follows the camera
    this.scene.add(new AmbientLight(undefined, 1.35)); // neutral (white) light
    const head = new DirectionalLight(undefined, 2.1);
    head.position.set(-0.4, 0.6, 1);
    this.camera.add(head);
    this.scene.add(this.camera);

    // ---- conduction system: one tube per polyline, vertex colours (dim → bright along the activated part)
    for (const pl of asset.polylines) {
      if (pl.kind !== 'conduction' || !isConduction(pl.label)) continue;
      const id = pl.label as RegionId;
      const tube = buildTube(pl.points, CONDUCTION_RADIUS[id] ?? 0.8, id === 'purkinje' ? 5 : 8);
      const geo = tubeGeometry(tube, true);
      // transparent (opacity 1) only to be drawn after the translucent myocardium; depthTest off = always on top
      const mat = new MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, transparent: true });
      const mesh = new Mesh(geo, mat);
      mesh.renderOrder = 5;
      mesh.userData.label = id;
      let headMesh: Mesh<SphereGeometry, MeshBasicMaterial> | null = null;
      if (id !== 'purkinje') {
        headMesh = new Mesh(this.headGeo, new MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true }));
        headMesh.renderOrder = 6;
        headMesh.visible = false;
        this.conductionGroup.add(headMesh);
      }
      this.conductionGroup.add(mesh);
      this.conduction.push({
        id,
        stateIdx: -1,
        mesh,
        along: tube.along,
        colors: (geo.getAttribute('color') as BufferAttribute).array as Float32Array,
        points: pl.points,
        fr: arcFractions(pl.points),
        head: headMesh,
      });
    }

    // ---- camera + controls
    const dist = (bs.radius / Math.sin(((FOV / 2) * Math.PI) / 180)) * 0.9;
    this.home = { pos: INITIAL_DIR.clone().multiplyScalar(dist), dist };
    this.camera.near = dist / 20;
    this.camera.far = dist * 5;
    this.camera.position.copy(this.home.pos);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = false; // enabled while focused, so the page still scrolls over the heart
    this.controls.minDistance = dist * 0.45;
    this.controls.maxDistance = dist * 2.2;
    this.controls.rotateSpeed = 0.9;
    this.controls.addEventListener('change', this.requestRender);
    // OrbitControls sets touch-action 'none' inline, which traps page scrolling on phones: keep vertical swipes for the
    // page (a horizontal drag still turns the heart; arrow keys tilt it)
    canvas.style.touchAction = 'pan-y';

    // ---- hover tooltip
    this.tip = document.createElement('div');
    this.tip.className = 'h3d__tip';
    this.tip.hidden = true;
    overlay.appendChild(this.tip);
    this.on(canvas, 'pointermove', this.onPointerMove as EventListener);
    this.on(canvas, 'pointerleave', this.onPointerLeave);
    this.on(canvas, 'pointerdown', this.onPointerLeave);
    this.on(canvas, 'focus', () => (this.controls.enableZoom = true));
    this.on(canvas, 'blur', () => (this.controls.enableZoom = false));
    this.on(canvas, 'keydown', this.onKey as EventListener);
    // WebGLRenderer cancels 'webglcontextlost' itself, so the browser restores the context; repaint when it does
    this.on(canvas, 'webglcontextrestored', () => {
      this.colorsDirty = true;
      this.requestRender();
    });

    this.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
    this.ro?.observe(canvas);
    this.unsubCursor = cursor.subscribe(() => this.markDirty());
    this.rebuild(true);
    this.resize();
  }

  // ------------------------------------------------------------------------------------------ public API

  setOptions(next: HeartViewOptions): void {
    const prev = this.opts;
    this.opts = next;
    const regionsChanged = prev.regions !== next.regions;
    const emphChanged = prev.emphasize.join() !== next.emphasize.join();
    if (regionsChanged || emphChanged || prev.showConduction !== next.showConduction || prev.labels !== next.labels || prev.lang !== next.lang) {
      this.rebuild(regionsChanged);
    }
  }

  setCursor(cursor: Signal<number | null>): void {
    if (cursor === this.cursor) return;
    this.unsubCursor();
    this.cursor = cursor;
    this.unsubCursor = cursor.subscribe(() => this.markDirty());
  }

  setPalette(p: HeartPalette): void {
    this.palette = p;
    this.rebuild(false);
  }

  resetView(): void {
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(this.home.pos);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
    this.requestRender();
  }

  readonly requestRender = (): void => {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.hoverRaf);
    this.unsubCursor();
    this.ro?.disconnect();
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.dispose();
    disposeTree(this.scene);
    this.headGeo.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.tip.remove();
    this.chips.forEach((c) => c.el.remove());
    this.chips = [];
  }

  // ------------------------------------------------------------------------------------------ building

  private on(t: EventTarget, type: string, fn: EventListener): void {
    t.addEventListener(type, fn);
    this.listeners.push([t, type, fn]);
  }

  private markDirty(): void {
    this.colorsDirty = true;
    this.requestRender();
  }

  private tagOf(id: RegionId): HighlightTag | undefined {
    return this.opts.regions?.highlights[id];
  }

  private rebuild(regionsChanged: boolean): void {
    const { asset, opts } = this;
    const P = this.palette;

    if (regionsChanged) {
      // state lookup per label
      const ids = opts.regions?.ids ?? [];
      this.stateBuf = new Float32Array(ids.length);
      this.stateIndex = Int16Array.from(asset.labelIds, (id) => ids.indexOf(id as RegionId));
      for (const c of this.conduction) c.stateIdx = ids.indexOf(c.id);
      // wall thickening for hypertrophy
      const hyp = Object.entries(opts.regions?.highlights ?? {})
        .filter(([, tag]) => tag === 'hypertrophy')
        .map(([id]) => id as RegionId);
      if (hyp.length) {
        this.neighbors ??= vertexNeighbors(asset.indices, asset.labels.length);
        this.positions = inflate(asset.positions, this.baseNormals, this.neighbors, labelMask(asset, hyp), HYPERTROPHY_MM, 3);
      } else this.positions = asset.positions;
      const posAttr = this.geometry.getAttribute('position') as BufferAttribute;
      (posAttr.array as Float32Array).set(this.positions);
      posAttr.needsUpdate = true;
      this.geometry.computeBoundingSphere();
    }

    // ---- decorations (outlines, glows, markers) — rebuilt from scratch, they are small
    this.root.remove(this.decor);
    disposeTree(this.decor);
    this.decor = new Group();
    this.root.add(this.decor);
    const shown = shownConduction(opts.showConduction, opts.emphasize, opts.regions);
    const xray = anyConductionShown(shown);
    this.heartMat.transparent = xray;
    this.heartMat.opacity = xray ? XRAY_OPACITY : 1;
    this.heartMat.depthWrite = !xray;
    this.heartMat.depthFunc = LessEqualDepth;
    this.heartMat.needsUpdate = true;
    this.prepass.visible = xray;
    for (const c of this.conduction) {
      const vis = shown === 'all' || shown.has(c.id);
      c.mesh.visible = vis;
      if (c.head) c.head.visible = false;
    }

    const basic = (rgb: Rgb, extra: Partial<{ depthTest: boolean; opacity: number }> = {}): MeshBasicMaterial => {
      const m = new MeshBasicMaterial({ side: DoubleSide });
      m.color.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);
      if (extra.depthTest === false) {
        m.depthTest = false;
        m.depthWrite = false;
        m.transparent = true; // drawn in the transparent pass, after the (possibly translucent) myocardium
      }
      if (extra.opacity !== undefined && extra.opacity < 1) {
        m.transparent = true;
        m.opacity = extra.opacity;
        m.depthWrite = false;
      }
      return m;
    };
    const addTube = (t: TubeData, mat: MeshBasicMaterial, order: number) => {
      const mesh = new Mesh(tubeGeometry(t, false), mat);
      mesh.renderOrder = order;
      this.decor.add(mesh);
    };

    // emphasis: outline of each emphasized myocardial region, glow around emphasized conduction fibres
    const outlines: TubeData[] = [];
    for (const id of opts.emphasize) {
      if (isConduction(id)) {
        const glow = this.conduction.filter((c) => c.id === id).map((c) => buildTube(c.points, (CONDUCTION_RADIUS[id] ?? 0.8) * 2.6, 8));
        if (glow.length) addTube(mergeTubes(glow), basic(P.highlight, { depthTest: false, opacity: 0.38 }), 4);
      } else {
        const mask = labelMask(asset, [id]);
        for (const pl of regionOutline(this.positions, this.baseNormals, asset.indices, mask, 0.7)) outlines.push(buildTube(pl, 0.5, 5));
      }
    }
    if (outlines.length) addTube(mergeTubes(outlines), basic(P.highlight), 3);

    // highlights drawn as geometry: accessory pathway (gold bridge), ectopic focus (ring), conduction block (cuff)
    const hl = opts.regions?.highlights ?? {};
    for (const [rid, tag] of Object.entries(hl) as [RegionId, HighlightTag][]) {
      if (tag === 'pathway' && !isConduction(rid)) {
        const path = pathwayBridge(asset, this.baseNormals, rid);
        if (path) addTube(buildTube(path, 1.8, 8), basic(P.conduction), 3);
      } else if (tag === 'focus') {
        const a = this.anchors[rid];
        if (!a) continue;
        const cond = isConduction(rid);
        const n: Vec3 = Math.hypot(a.n[0], a.n[1], a.n[2]) > 0.1 ? a.n : a.out;
        const c: Vec3 = [a.p[0] + 1.5 * n[0], a.p[1] + 1.5 * n[1], a.p[2] + 1.5 * n[2]];
        // drawn on top (no depth test): a marker must stay a full ring on a curved wall or inside the x-ray view
        addTube(buildTube(ringPoints(c, n, 5.5), 0.75, 6), basic(P.highlight, { depthTest: false }), 7);
        const dot = new Mesh(this.headGeo.clone(), basic(P.highlight, { depthTest: false }));
        dot.position.set(c[0], c[1], c[2]);
        dot.scale.setScalar(0.8);
        dot.renderOrder = 7;
        this.decor.add(dot);
      } else if (tag === 'block' && isConduction(rid)) {
        for (const c of this.conduction.filter((x) => x.id === rid)) {
          const f = 0.12;
          const p = pointAtFraction(c.points, c.fr, f);
          const q = pointAtFraction(c.points, c.fr, Math.min(1, f + 0.05));
          const t: Vec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
          const r = (CONDUCTION_RADIUS[rid] ?? 1) + 1.4;
          addTube(buildTube(ringPoints(p, t, r), 0.6, 6), basic(P.fg, { depthTest: false }), 7);
        }
      }
    }

    // heads take the bright conduction colour
    for (const c of this.conduction) c.head?.material.color.setRGB(P.conduction[0], P.conduction[1], P.conduction[2], SRGBColorSpace);

    this.buildChips();
    // turn toward newly emphasized / highlighted walls (a jump, no animation; the learner can rotate back)
    const focusIds = [...new Set([...opts.emphasize, ...(Object.keys(hl) as RegionId[])])].filter((id) => !isConduction(id)).sort();
    const key = focusIds.join(',');
    if (key !== this.focusKey) {
      this.focusKey = key;
      if (focusIds.length) this.faceRegions(focusIds);
    }
    this.colorsDirty = true;
    this.requestRender();
  }

  /** Point the camera at the mean outward direction of some regions (kept a little anterior and off the poles). */
  private faceRegions(ids: readonly RegionId[]): void {
    const sum = new Vector3();
    for (const id of ids) {
      const a = this.anchors[id];
      if (a) sum.add(new Vector3(a.out[0], a.out[1], a.out[2]));
    }
    if (sum.length() < 0.3 * ids.length) return; // regions on opposite sides: keep the current view
    const dir = sum.normalize().addScaledVector(INITIAL_DIR, 0.35).normalize();
    dir.y = Math.max(-0.75, Math.min(0.75, dir.y));
    dir.normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    this.camera.position.copy(this.controls.target).addScaledVector(dir, dist);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  private buildChips(): void {
    this.chips.forEach((c) => c.el.remove());
    this.chips = [];
    if (!this.opts.labels) return;
    for (const id of this.opts.emphasize) {
      const a = this.anchors[id];
      if (!a) continue;
      const el = document.createElement('div');
      el.className = 'h3d__chip';
      el.textContent = labelName(id, this.opts.lang);
      this.overlay.appendChild(el);
      this.chips.push({ id, el, p: new Vector3(a.p[0], a.p[1], a.p[2]), n: new Vector3(a.n[0], a.n[1], a.n[2]) });
    }
  }

  // ------------------------------------------------------------------------------------------ per frame

  private sampleStates(): void {
    const r = this.opts.regions;
    const t = this.cursor.peek();
    this.statesValid = false;
    if (!r || t === null || !Number.isFinite(t)) return;
    r.stateAt(t, this.stateBuf);
    this.statesValid = true;
  }

  /** State code of a label at the cursor (null = anatomy only / no cursor → resting colours). */
  private stateOf(labelIdx: number): number | null {
    if (!this.opts.regions) return null;
    if (!this.statesValid) return 0;
    const k = this.stateIndex[labelIdx];
    return k >= 0 ? this.stateBuf[k] : 0;
  }

  private updateColors(): void {
    const { asset, palette: P, opts } = this;
    this.sampleStates();
    const emph = new Set<string>(opts.emphasize);
    const lin = asset.labelIds.map((id, k): Rgb => {
      const kind = kindOf(id);
      let c: Rgb;
      if (kind === 'vessel') c = vesselColor(P);
      else {
        c = myocardiumColor(this.stateOf(k), kind, this.tagOf(id as RegionId), P);
        if (emph.has(id)) c = emphasisTint(c, P);
      }
      return srgbToLinear(c);
    });
    const col = this.colorAttr.array as Float32Array;
    const L = asset.labels;
    for (let v = 0; v < L.length; v++) {
      const c = lin[L[v]];
      col[3 * v] = c[0];
      col[3 * v + 1] = c[1];
      col[3 * v + 2] = c[2];
    }
    this.colorAttr.needsUpdate = true;

    // conduction: dim at rest, bright along the activated part; heads mark the travelling front
    for (const c of this.conduction) {
      if (!c.mesh.visible) continue;
      const k = c.stateIdx;
      const state = !opts.regions ? 1 : this.statesValid && k >= 0 ? this.stateBuf[k] : 0;
      const blocked = this.tagOf(c.id) === 'block';
      const dim = srgbToLinear(conductionColor(0, blocked, P));
      const bright = srgbToLinear(conductionColor(1, blocked, P));
      for (let v = 0; v < c.along.length; v++) {
        const lv = conductionLevel(state, c.along[v]);
        c.colors[3 * v] = dim[0] + (bright[0] - dim[0]) * lv;
        c.colors[3 * v + 1] = dim[1] + (bright[1] - dim[1]) * lv;
        c.colors[3 * v + 2] = dim[2] + (bright[2] - dim[2]) * lv;
      }
      (c.mesh.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
      if (c.head) {
        const s = classifyState(state);
        c.head.visible = !blocked && s.phase === 'depolarizing';
        if (c.head.visible) {
          const p = pointAtFraction(c.points, c.fr, s.fraction);
          c.head.position.set(p[0], p[1], p[2]);
        }
      }
    }

    // caption
    let phase: PhaseKey;
    if (!opts.regions) phase = 'anatomy';
    else if (!this.statesValid) phase = 'none';
    else phase = cardiacPhase(opts.regions.ids, this.stateBuf);
    if (phase !== this.phase) {
      this.phase = phase;
      this.onPhase(phase);
    }
  }

  private resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private render(): void {
    if (this.disposed) return;
    if (this.colorsDirty) {
      this.colorsDirty = false;
      this.updateColors();
    }
    this.renderer.render(this.scene, this.camera);
    this.placeChips();
    if (this.hover) this.updateTip();
  }

  private placeChips(): void {
    if (!this.chips.length) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const off = this.root.position;
    const cam = this.camera.position;
    const placed: { x: number; y: number; w: number }[] = [];
    const items = this.chips.map((c) => {
      const p = c.p.clone().add(off);
      const facing = c.n.lengthSq() < 0.01 || c.n.dot(cam.clone().sub(p)) > 0;
      const s = p.clone().project(this.camera);
      return { c, x: ((s.x + 1) / 2) * w, y: ((1 - s.y) / 2) * h, facing };
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const cw = it.c.el.offsetWidth || 60;
      let y = it.y;
      for (const q of placed) if (Math.abs(q.x - it.x) < (q.w + cw) / 2 && Math.abs(q.y - y) < 18) y = q.y + 18;
      placed.push({ x: it.x, y, w: cw });
      const x = Math.max(cw / 2 + 2, Math.min(w - cw / 2 - 2, it.x));
      it.c.el.style.transform = `translate(${Math.round(x - cw / 2)}px, ${Math.round(y - 9)}px)`;
      it.c.el.classList.toggle('is-back', !it.facing);
    }
  }

  // ------------------------------------------------------------------------------------------ interaction

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.buttons || !this.opts.labels) return this.onPointerLeave();
    const r = this.canvas.getBoundingClientRect();
    this.hover = { x: e.clientX - r.left, y: e.clientY - r.top, label: this.hover?.label ?? null };
    this.pointer.set((this.hover.x / r.width) * 2 - 1, -(this.hover.y / r.height) * 2 + 1);
    if (this.hoverRaf) return;
    this.hoverRaf = requestAnimationFrame(() => {
      this.hoverRaf = 0;
      if (!this.hover) return;
      this.hover.label = this.pick();
      this.updateTip();
    });
  };

  private readonly onPointerLeave = (): void => {
    this.hover = null;
    this.tip.hidden = true;
  };

  /** Label under the pointer: a visible conduction fibre first (drawn on top), then the myocardium. */
  private pick(): HeartLabel | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const fibres = this.conduction.filter((c) => c.mesh.visible).map((c) => c.mesh);
    const hitF = fibres.length ? this.raycaster.intersectObjects(fibres, false)[0] : undefined;
    if (hitF) return hitF.object.userData.label as RegionId;
    const hit = this.raycaster.intersectObject(this.heart, false)[0];
    if (!hit || !hit.face) return null;
    const local = this.heart.worldToLocal(hit.point.clone());
    const P = this.positions;
    let best = hit.face.a, bd = Infinity;
    for (const v of [hit.face.a, hit.face.b, hit.face.c]) {
      const d = (P[3 * v] - local.x) ** 2 + (P[3 * v + 1] - local.y) ** 2 + (P[3 * v + 2] - local.z) ** 2;
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return this.asset.labelIds[this.asset.labels[best]];
  }

  /** State code of a label at the cursor, or null when there is none to report (no states, no cursor, not reported). */
  private hoverState(id: HeartLabel): number | null {
    const r = this.opts.regions;
    if (!r || !this.statesValid) return null;
    const k = this.asset.labelIds.indexOf(id);
    const idx = k >= 0 ? this.stateIndex[k] : r.ids.indexOf(id as RegionId);
    return idx >= 0 ? this.stateBuf[idx] : null;
  }

  private updateTip(): void {
    const h = this.hover;
    if (!h || !h.label) {
      this.tip.hidden = true;
      return;
    }
    const id = h.label;
    const [name, ...rest] = tooltipLines(id, this.hoverState(id), this.opts.regions?.highlights[id as RegionId], this.opts.lang);
    this.tip.replaceChildren();
    const b = document.createElement('strong');
    b.textContent = name;
    this.tip.appendChild(b);
    for (const l of rest) {
      const s = document.createElement('span');
      s.textContent = l;
      this.tip.appendChild(s);
    }
    this.tip.hidden = false;
    const w = this.canvas.clientWidth;
    const tw = this.tip.offsetWidth || 120;
    const x = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, h.x));
    const below = h.y < 56;
    this.tip.style.transform = `translate(${Math.round(x - tw / 2)}px, ${Math.round(below ? h.y + 18 : h.y - 14 - (this.tip.offsetHeight || 32))}px)`;
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    // modified keys (Ctrl+0, Ctrl+=, …) are the browser's own shortcuts: keyAction() leaves them alone
    const action = keyAction(e);
    if (!action) return;
    e.preventDefault();
    if (action === 'reset') {
      this.resetView();
      return;
    }
    const sph = new Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const o = orbitStep(sph, action, this.controls);
    sph.set(o.radius, o.phi, o.theta);
    this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(sph));
    this.camera.lookAt(this.controls.target);
    this.controls.update();
    this.requestRender();
  };
}
