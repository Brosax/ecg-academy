/**
 * Fastest-route activation (Dijkstra, indexed binary heap, Float32 times) on the voxel grid plus optional graph layers
 * (Purkinje network, Bachmann cable).
 *
 * Muscle edges: stencil offsets to voxels of the SAME compartment only (compOfTissue), so diagonal edges cannot leak
 * through a one-voxel fibrous ring; the His bundle (a seed) is the only normal AV connection (plan "Dijkstra").
 * Edge cost (ms) = sqrt((d·n)²/v_n² + |d_t|²/v_t²), n = transmural direction (grid.transDir, ∇wallDepth) averaged over
 * the two end voxels, v_n = transmural speed, v_t = along-wall speed. Where transDir is zero (grid edge, flat
 * wallDepth) the edge falls back to isotropic conduction at v_t.
 *
 * Layers: nodes with their own adjacency (ms), layer→muscle couplings (ms, e.g. PMJ delay) and optional muscle→layer
 * couplings (retrograde; omitted when blocked). Seeds may sit on either layer.
 */
import type { Comp, Seed, VoxelGrid } from '../types';
import { compMask } from './gridUtil';
import type { Stencil } from './params';

/** Offsets (di, dj, dk), 3 per entry. 26: Chebyshev radius 1. 50: 0 < i²+j²+k² ≤ 5 minus multiples of shorter steps. */
export function stencilOffsets(s: Stencil): Int8Array {
  const out: number[] = [];
  for (let k = -2; k <= 2; k++)
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const r2 = i * i + j * j + k * k;
        if (r2 === 0) continue;
        if (s === 26) {
          if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) > 1) continue;
        } else {
          if (r2 > 5) continue;
          // (±2,0,0) and permutations duplicate two unit steps — never shorter, so drop them (56 → 50).
          if (gcd3(Math.abs(i), Math.abs(j), Math.abs(k)) > 1) continue;
        }
        out.push(i, j, k);
      }
  return Int8Array.from(out);
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}
const gcd3 = (a: number, b: number, c: number) => gcd(gcd(a, b), c);

// ---------------------------------------------------------------- layers

export interface GraphLayer {
  readonly size: number;
  /** CSR adjacency within the layer (node → node, ms). */
  readonly adjStart: Uint32Array;
  readonly adjNode: Uint32Array;
  readonly adjMs: Float32Array;
  /** CSR layer → muscle coupling (node → voxel, ms). */
  readonly outStart: Uint32Array;
  readonly outVoxel: Uint32Array;
  readonly outMs: Float32Array;
  /** Muscle → layer coupling as linked lists keyed by voxel (inHead[voxel] = first entry, −1 = none); null = none. */
  readonly inHead: Int32Array | null;
  readonly inNext: Int32Array | null;
  readonly inNode: Uint32Array | null;
  readonly inMs: Float32Array | null;
}

/** Builds CSR arrays from per-node edge lists. */
export function toCsr(lists: readonly { to: number; ms: number }[][]): { start: Uint32Array; to: Uint32Array; ms: Float32Array } {
  let m = 0;
  for (const l of lists) m += l.length;
  const start = new Uint32Array(lists.length + 1);
  const to = new Uint32Array(m);
  const ms = new Float32Array(m);
  let e = 0;
  for (let i = 0; i < lists.length; i++) {
    start[i] = e;
    for (const x of lists[i]) {
      to[e] = x.to;
      ms[e] = x.ms;
      e++;
    }
  }
  start[lists.length] = e;
  return { start, to, ms };
}

/** Reverse coupling (muscle → layer) as linked lists over the grid. Entries with non-finite delay are dropped. */
export function buildReverse(
  nVoxels: number,
  entries: readonly { voxel: number; node: number; ms: number }[],
): { inHead: Int32Array; inNext: Int32Array; inNode: Uint32Array; inMs: Float32Array } | null {
  const ok = entries.filter((e) => Number.isFinite(e.ms));
  if (ok.length === 0) return null;
  const inHead = new Int32Array(nVoxels).fill(-1);
  const inNext = new Int32Array(ok.length);
  const inNode = new Uint32Array(ok.length);
  const inMs = new Float32Array(ok.length);
  ok.forEach((e, i) => {
    inNode[i] = e.node;
    inMs[i] = e.ms;
    inNext[i] = inHead[e.voxel];
    inHead[e.voxel] = i;
  });
  return { inHead, inNext, inNode, inMs };
}

// ---------------------------------------------------------------- heap

/** Indexed binary min-heap over node ids, keyed by an external Float32Array. */
class IndexedHeap {
  private readonly heap: Int32Array;
  /** Position in heap, −1 = never pushed, −2 = popped (settled). */
  readonly pos: Int32Array;
  size = 0;
  constructor(n: number, private readonly key: Float32Array) {
    this.heap = new Int32Array(n);
    this.pos = new Int32Array(n).fill(-1);
  }
  pushOrDecrease(v: number): void {
    let i = this.pos[v];
    if (i === -1) {
      i = this.size++;
      this.heap[i] = v;
      this.pos[v] = i;
    }
    this.up(i);
  }
  pop(): number {
    const top = this.heap[0];
    this.pos[top] = -2;
    const last = this.heap[--this.size];
    if (this.size > 0) {
      this.heap[0] = last;
      this.pos[last] = 0;
      this.down(0);
    }
    return top;
  }
  private up(i: number): void {
    const h = this.heap, k = this.key, p = this.pos;
    const v = h[i];
    const kv = k[v];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const u = h[parent];
      if (k[u] <= kv) break;
      h[i] = u;
      p[u] = i;
      i = parent;
    }
    h[i] = v;
    p[v] = i;
  }
  private down(i: number): void {
    const h = this.heap, k = this.key, p = this.pos, n = this.size;
    const v = h[i];
    const kv = k[v];
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && k[h[c + 1]] < k[h[c]]) c++;
      const u = h[c];
      if (k[u] >= kv) break;
      h[i] = u;
      p[u] = i;
      i = c;
    }
    h[i] = v;
    p[v] = i;
  }
}

// ---------------------------------------------------------------- solver

export interface LayerSeed {
  readonly layer: number;
  readonly node: number;
  readonly tMs: number;
}

export interface FastestRouteInput {
  readonly grid: VoxelGrid;
  readonly comp: Comp;
  readonly stencil: Stencil;
  /** Along-wall speed (m/s = mm/ms). */
  readonly vLongMps: number;
  /** Transmural speed (along grid.transDir). Set equal to vLongMps for isotropic tissue. */
  readonly vTransMps: number;
  /** Optional per-voxel speed multiplier. */
  readonly speedScale?: Float32Array;
  /**
   * Optional per-voxel multiplier of the TRANSMURAL speed only (edge value = mean of the two end voxels), e.g. 1/k for
   * a wall k-fold thicker than the voxel geometry (hypertrophy: the same tissue crosses a k-fold longer path).
   */
  readonly transScale?: Float32Array;
  /** Muscle seeds (voxels outside `comp` are ignored). */
  readonly seeds: readonly Seed[];
  readonly layers?: readonly GraphLayer[];
  readonly layerSeeds?: readonly LayerSeed[];
}

export interface FastestRouteResult {
  /** Per grid voxel; +Infinity outside the compartment or unreachable. */
  readonly tAct: Float32Array;
  /** Per layer, per node. */
  readonly layerT: readonly Float32Array[];
  readonly tMinMs: number;
  readonly tMaxMs: number;
}

export function fastestRoute(inp: FastestRouteInput): FastestRouteResult {
  const g = inp.grid;
  const [nx, ny, nz] = g.dims;
  const N = nx * ny * nz;
  const h = g.hMm;
  const layers = inp.layers ?? [];
  const offsets: number[] = [];
  let total = N;
  for (const L of layers) {
    offsets.push(total);
    total += L.size;
  }

  const inComp = compMask(g, inp.comp);

  const st = stencilOffsets(inp.stencil);
  const nOff = st.length / 3;
  const di = new Int32Array(nOff), dj = new Int32Array(nOff), dk = new Int32Array(nOff), dv = new Int32Array(nOff);
  const ddx = new Float64Array(nOff), ddy = new Float64Array(nOff), ddz = new Float64Array(nOff), dlen2 = new Float64Array(nOff);
  for (let o = 0; o < nOff; o++) {
    di[o] = st[3 * o];
    dj[o] = st[3 * o + 1];
    dk[o] = st[3 * o + 2];
    dv[o] = di[o] + nx * (dj[o] + ny * dk[o]);
    ddx[o] = di[o] * h;
    ddy[o] = dj[o] * h;
    ddz[o] = dk[o] * h;
    dlen2[o] = ddx[o] * ddx[o] + ddy[o] * ddy[o] + ddz[o] * ddz[o];
  }
  const invVL2 = 1 / (inp.vLongMps * inp.vLongMps);
  const invVT2 = 1 / (inp.vTransMps * inp.vTransMps);
  const ts = inp.transScale;
  const isotropic = inp.vLongMps === inp.vTransMps && !ts;
  const td = g.transDir;
  const sp = inp.speedScale;

  const dist = new Float32Array(total).fill(Infinity);
  const heap = new IndexedHeap(total, dist);
  const relax = (v: number, t: number) => {
    if (t < dist[v] && heap.pos[v] !== -2) {
      dist[v] = t;
      heap.pushOrDecrease(v);
    }
  };
  for (const s of inp.seeds) if (s.voxel >= 0 && s.voxel < N && inComp[s.voxel]) relax(s.voxel, s.tMs);
  for (const s of inp.layerSeeds ?? []) relax(offsets[s.layer] + s.node, s.tMs);

  while (heap.size > 0) {
    const u = heap.pop();
    const du = dist[u];
    if (u < N) {
      const i = u % nx, j = ((u / nx) | 0) % ny, k = (u / (nx * ny)) | 0;
      const tux = td[3 * u], tuy = td[3 * u + 1], tuz = td[3 * u + 2];
      for (let o = 0; o < nOff; o++) {
        const ii = i + di[o], jj = j + dj[o], kk = k + dk[o];
        if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
        const v = u + dv[o];
        if (!inComp[v] || heap.pos[v] === -2) continue;
        let cost: number;
        if (isotropic) cost = Math.sqrt(dlen2[o] * invVL2);
        else {
          const sx = tux + td[3 * v], sy = tuy + td[3 * v + 1], sz = tuz + td[3 * v + 2];
          const nn = sx * sx + sy * sy + sz * sz;
          if (nn < 1e-6) cost = Math.sqrt(dlen2[o] * invVL2);
          else {
            const dn = ddx[o] * sx + ddy[o] * sy + ddz[o] * sz;
            const dn2 = (dn * dn) / nn;
            const dt2 = Math.max(0, dlen2[o] - dn2);
            const tsc = ts ? 0.5 * (ts[u] + ts[v]) : 1;
            cost = Math.sqrt((dn2 * invVT2) / (tsc * tsc) + dt2 * invVL2);
          }
        }
        if (sp) cost /= 0.5 * (sp[u] + sp[v]);
        relax(v, du + cost);
      }
      for (let l = 0; l < layers.length; l++) {
        const L = layers[l];
        if (!L.inHead) continue;
        for (let e = L.inHead[u]; e >= 0; e = L.inNext![e]) relax(offsets[l] + L.inNode![e], du + L.inMs![e]);
      }
    } else {
      let l = layers.length - 1;
      while (u < offsets[l]) l--;
      const L = layers[l];
      const n = u - offsets[l];
      for (let e = L.adjStart[n]; e < L.adjStart[n + 1]; e++) relax(offsets[l] + L.adjNode[e], du + L.adjMs[e]);
      for (let e = L.outStart[n]; e < L.outStart[n + 1]; e++) {
        const v = L.outVoxel[e];
        if (inComp[v]) relax(v, du + L.outMs[e]);
      }
    }
  }

  const tAct = dist.slice(0, N);
  let tMin = Infinity, tMax = -Infinity;
  for (let v = 0; v < N; v++) {
    const t = tAct[v];
    if (t !== Infinity) {
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
  }
  const layerT = layers.map((L, l) => dist.slice(offsets[l], offsets[l] + L.size));
  return { tAct, layerT, tMinMs: tMin, tMaxMs: tMax };
}
