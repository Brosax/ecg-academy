/**
 * Bake-time loading of the raw HRA GLBs into welded, hole-capped meshes in the BODY frame (mm). The GLBs are
 * gitignored (assets/models/raw); only the baked asset ships.
 */
import type { ValveId } from '../../types';
import { VALVES } from '../../types';
import { readGlbMeshes, weldMesh } from './glb';
import type { Mesh } from './mesh';
import { capHoles, mergeMeshes } from './mesh';
import type { VesselSpec } from './parts';
import { PAPILLARY, VALVE_NODES, VESSELS, WALLS } from './parts';

export interface HraSource {
  /** Wall meshes, body mm, holes capped (parity-safe). */
  readonly walls: Readonly<Record<keyof typeof WALLS, Mesh>>;
  /** Original (uncapped) wall meshes for rendering. */
  readonly wallsRender: Readonly<Record<keyof typeof WALLS, Mesh>>;
  readonly papillary: readonly { readonly key: string; readonly chamber: number; readonly mesh: Mesh; readonly render: Mesh }[];
  /** Full valve (leaflet) meshes, body mm. */
  readonly valves: Readonly<Record<ValveId, Mesh>>;
  /** Vessels: capped (for voxelization) and render meshes (uncapped), body mm, untrimmed. */
  readonly vessels: readonly { readonly spec: VesselSpec; readonly mesh: Mesh; readonly render: Mesh }[];
}

const toMm = (m: { position: Float64Array; index: Uint32Array }): Mesh => ({ position: Float64Array.from(m.position, (x) => x * 1000), index: m.index });

export function loadHraSource(heartGlb: Uint8Array, vesselGlb: Uint8Array): HraSource {
  const heart = new Map(readGlbMeshes(heartGlb).map((m) => [m.name, toMm(weldMesh(m, 2e-5))]));
  const need = (map: Map<string, Mesh>, name: string): Mesh => {
    const m = map.get(name);
    if (!m) throw new Error(`HRA: node ${name} missing`);
    return m;
  };
  const wallsRender = Object.fromEntries(Object.entries(WALLS).map(([k, n]) => [k, need(heart, n)])) as Record<keyof typeof WALLS, Mesh>;
  const walls = Object.fromEntries(Object.entries(wallsRender).map(([k, m]) => [k, capHoles(m) as Mesh])) as unknown as Record<keyof typeof WALLS, Mesh>;
  const papillary = PAPILLARY.map((p) => {
    const render = need(heart, p.node);
    return { key: p.key, chamber: p.chamber, mesh: capHoles(render), render };
  });
  const valves = Object.fromEntries(VALVES.map((v) => [v, need(heart, VALVE_NODES[v])])) as Record<ValveId, Mesh>;
  const wanted = new Set(VESSELS.flatMap((v) => v.nodes));
  const vas = new Map(readGlbMeshes(vesselGlb, (n) => wanted.has(n)).map((m) => [m.name, toMm(weldMesh(m, 2e-5))]));
  const vessels = VESSELS.map((spec) => {
    const parts = spec.nodes.map((n) => need(vas, n));
    const render = mergeMeshes(parts);
    return { spec, mesh: mergeMeshes(parts.map((p) => capHoles(p))), render };
  });
  return { walls, wallsRender, papillary, valves, vessels };
}

