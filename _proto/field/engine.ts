// engine.ts — event-driven eikonal activation on a directed node graph with refractoriness and APD restitution.
// For a single wave on recovered tissue this is exactly multi-source Dijkstra (fastest route); with repeated
// sources it handles re-entry, fibrillatory conduction, block and concealment.

export interface Graph {
  n: number;
  start: Int32Array;      // CSR (n+1)
  to: Int32Array;
  w: Float32Array;        // travel time (ms)
  blockUntil: Float64Array; // per edge: edge unusable for arrival times < blockUntil
  apdMax: Float32Array;   // APD at long diastolic interval (ms)
  restA: Float32Array;    // restitution depth A: APD = apdMax * (1 - A exp(-DI/tau))
  restTau: Float32Array;  // ms
  erpFrac: Float32Array;  // ERP = erpFrac * APD
}

export class GraphBuilder {
  n = 0;
  from: number[] = [];
  dst: number[] = [];
  wt: number[] = [];
  blk: number[] = [];
  apdMax: number[] = []; restA: number[] = []; restTau: number[] = []; erpFrac: number[] = [];
  addNode(apd: number, A: number, tau: number, erp: number): number {
    this.apdMax.push(apd); this.restA.push(A); this.restTau.push(tau); this.erpFrac.push(erp);
    return this.n++;
  }
  addEdge(i: number, j: number, w: number, blockUntil = -Infinity): void { this.from.push(i); this.dst.push(j); this.wt.push(w); this.blk.push(blockUntil); }
  build(): Graph {
    const n = this.n, m = this.from.length;
    const start = new Int32Array(n + 1);
    for (let e = 0; e < m; e++) start[this.from[e] + 1]++;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    const fill = start.slice(0, n);
    const to = new Int32Array(m), w = new Float32Array(m), blockUntil = new Float64Array(m);
    for (let e = 0; e < m; e++) { const k = fill[this.from[e]]++; to[k] = this.dst[e]; w[k] = this.wt[e]; blockUntil[k] = this.blk[e]; }
    return { n, start, to, w, blockUntil, apdMax: Float32Array.from(this.apdMax), restA: Float32Array.from(this.restA), restTau: Float32Array.from(this.restTau), erpFrac: Float32Array.from(this.erpFrac) };
  }
}

export interface Activations {
  node: Int32Array; t: Float64Array; apd: Float32Array; count: number;
  // per node: indices into the record arrays, in time order
  first: Int32Array; next: Int32Array;
}

class Heap {
  t: Float64Array; v: Int32Array; size = 0;
  constructor(cap: number) { this.t = new Float64Array(cap); this.v = new Int32Array(cap); }
  push(t: number, v: number): void {
    if (this.size === this.t.length) { const nt = new Float64Array(this.size * 2); nt.set(this.t); this.t = nt; const nv = new Int32Array(this.size * 2); nv.set(this.v); this.v = nv; }
    let i = this.size++;
    while (i > 0) { const p = (i - 1) >> 1; if (this.t[p] <= t) break; this.t[i] = this.t[p]; this.v[i] = this.v[p]; i = p; }
    this.t[i] = t; this.v[i] = v;
  }
  pop(): number { // returns index 0 data in (popT, popV)
    const t = this.t[0], v = this.v[0];
    const lt = this.t[--this.size], lv = this.v[this.size];
    let i = 0; const n = this.size;
    while (true) {
      let c = 2 * i + 1; if (c >= n) break;
      if (c + 1 < n && this.t[c + 1] < this.t[c]) c++;
      if (this.t[c] >= lt) break;
      this.t[i] = this.t[c]; this.v[i] = this.v[c]; i = c;
    }
    this.t[i] = lt; this.v[i] = lv;
    this.popT = t; return v;
  }
  popT = 0;
}

export interface RunOpts {
  tEnd: number;
  external: { t: number; node: number }[];
  // special handler: called when a node in `special` is popped; return true to activate normally, false to drop.
  special?: Set<number>;
  onSpecial?: (node: number, t: number, push: (node: number, t: number) => void) => boolean;
  onActivate?: (node: number, t: number) => void;
}

export function run(g: Graph, o: RunOpts): Activations {
  const n = g.n;
  const lastT = new Float64Array(n).fill(-1e12);
  const lastApd = new Float32Array(n);
  const pending = new Float64Array(n).fill(Infinity);
  const heap = new Heap(1 << 16);
  for (const e of o.external) heap.push(e.t, e.node);
  let cap = 1 << 16;
  let rn = new Int32Array(cap), rt = new Float64Array(cap), ra = new Float32Array(cap);
  let cnt = 0;
  const push = (node: number, t: number) => { if (t < pending[node]) { pending[node] = t; } heap.push(t, node); };
  while (heap.size > 0) {
    const i = heap.pop(); const t = heap.popT;
    if (t > o.tEnd) break;
    if (pending[i] === t) pending[i] = Infinity;
    if (t < lastT[i] + g.erpFrac[i] * lastApd[i]) continue; // refractory
    if (o.special && o.special.has(i)) {
      if (!o.onSpecial!(i, t, push)) continue;
    }
    let di = t - (lastT[i] + lastApd[i]);
    if (di < 0) di = 0;
    const apd = g.apdMax[i] * (1 - g.restA[i] * Math.exp(-di / g.restTau[i]));
    lastT[i] = t; lastApd[i] = apd;
    if (cnt === cap) {
      cap *= 2;
      const a = new Int32Array(cap); a.set(rn); rn = a;
      const b = new Float64Array(cap); b.set(rt); rt = b;
      const c = new Float32Array(cap); c.set(ra); ra = c;
    }
    rn[cnt] = i; rt[cnt] = t; ra[cnt] = apd; cnt++;
    if (o.onActivate) o.onActivate(i, t);
    for (let e = g.start[i]; e < g.start[i + 1]; e++) {
      const j = g.to[e];
      const tj = t + g.w[e];
      if (tj < g.blockUntil[e]) continue;
      if (tj >= pending[j]) continue;
      if (tj < lastT[j] + g.erpFrac[j] * lastApd[j]) continue;
      pending[j] = tj;
      heap.push(tj, j);
    }
  }
  const first = new Int32Array(n).fill(-1), next = new Int32Array(cnt).fill(-1);
  const lastIdx = new Int32Array(n).fill(-1);
  for (let k = 0; k < cnt; k++) {
    const i = rn[k];
    if (lastIdx[i] < 0) first[i] = k; else next[lastIdx[i]] = k;
    lastIdx[i] = k;
  }
  return { node: rn.subarray(0, cnt), t: rt.subarray(0, cnt), apd: ra.subarray(0, cnt), count: cnt, first, next };
}

// seeded PRNG (mulberry32) + gaussian
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number): number {
  const u = Math.max(1e-12, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
