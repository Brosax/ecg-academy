// Build the shipped real-ECG bundle from the curated PTB-XL selection.
//
//   node scripts/data/build-real-bundle.mjs <data-raw dir> <selection.json> <out dir>
//
// Writes <out>/ptbxl-signals.bin and <out>/ptbxl-meta.json.
// Signal coding (per record, decoded lazily in the browser with DecompressionStream('deflate-raw')):
//   - leads stored: I, II, V1..V6 (III, aVR, aVL, aVF are derived exactly in the app: PTB-XL limb leads obey
//     Einthoven/Goldberger to within ±1.5 µV);
//   - 500 Hz → 250 Hz after a 31-tap windowed-sinc low-pass (cut-off 100 Hz);
//   - quantized to 5 µV (0.005 mV); per lead: zigzag-varint of the first sample then of successive differences;
//   - each record deflate-raw compressed on its own, concatenated; offsets in the meta file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const [, , rawDir, selPath, outDir] = process.argv;
if (!rawDir || !selPath || !outDir) {
  console.error('usage: node build-real-bundle.mjs <data-raw dir> <selection.json> <out dir>');
  process.exit(2);
}

const FS_IN = 500, FS_OUT = 250, N_IN = 5000, N_OUT = 2500, Q_MV = 0.005;
const SRC_LEADS = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const KEEP = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

// 31-tap Hamming-windowed sinc, cut-off 100 Hz at fs 500 (normalized 0.2 of fs), unity DC gain.
const TAPS = 31, FC = 100 / FS_IN;
const h = [];
for (let i = 0; i < TAPS; i++) {
  const m = i - (TAPS - 1) / 2;
  const sinc = m === 0 ? 2 * FC : Math.sin(2 * Math.PI * FC * m) / (Math.PI * m);
  h.push(sinc * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (TAPS - 1))));
}
const hs = h.reduce((a, b) => a + b, 0);
for (let i = 0; i < TAPS; i++) h[i] /= hs;

function readHeader(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
  const [, nsig, fs, n] = lines[0].split(/\s+/);
  if (Number(nsig) !== 12 || Number(fs) !== FS_IN || Number(n) !== N_IN) throw new Error(`unexpected header ${path}`);
  return lines.slice(1, 13).map((l) => {
    const p = l.split(/\s+/);
    const gain = parseFloat(p[2]); // "1000.0(0)/mV"
    const baseline = /\((-?\d+)\)/.exec(p[2])?.[1];
    return { gain, baseline: baseline ? Number(baseline) : 0, name: p[8].toUpperCase(), fmt: p[1] };
  });
}

function zigzag(v) { return v >= 0 ? v * 2 : -v * 2 - 1; }
function pushVarint(out, v) {
  let u = zigzag(v);
  while (u >= 0x80) { out.push((u & 0x7f) | 0x80); u = Math.floor(u / 128); }
  out.push(u);
}

const sel = JSON.parse(readFileSync(selPath, 'utf8'));
mkdirSync(outDir, { recursive: true });
const blobs = [];
const meta = [];
let offset = 0;
for (const r of sel.records) {
  const hdr = readHeader(join(rawDir, 'ptbxl', r.filename_hr + '.hea'));
  if (hdr.some((x, k) => x.name !== SRC_LEADS[k] || x.fmt !== '16')) throw new Error(`lead order/format ${r.ecg_id}`);
  const dat = readFileSync(join(rawDir, 'ptbxl', r.filename_hr + '.dat'));
  const bytes = [];
  for (const lead of KEEP) {
    const li = SRC_LEADS.indexOf(lead);
    const { gain, baseline } = hdr[li];
    const x = new Float64Array(N_IN);
    for (let k = 0; k < N_IN; k++) x[k] = (dat.readInt16LE((k * 12 + li) * 2) - baseline) / gain; // mV
    let prev = 0;
    for (let j = 0; j < N_OUT; j++) {
      const c = j * 2;
      let acc = 0;
      for (let t = 0; t < TAPS; t++) {
        const k = Math.min(N_IN - 1, Math.max(0, c + t - (TAPS - 1) / 2)); // edge: clamp
        acc += h[t] * x[k];
      }
      const q = Math.round(acc / Q_MV);
      pushVarint(bytes, j === 0 ? q : q - prev);
      prev = q;
    }
  }
  const blob = deflateRawSync(Buffer.from(bytes), { level: 9 });
  blobs.push(blob);
  const m = r.measures;
  meta.push({
    id: r.ecg_id,
    cls: r.teaching_class,
    codes: r.codes,
    age: r.age != null && r.age < 300 ? r.age : null, // PTB-XL codes ages > 89 as 300
    sex: r.sex,
    heartAxis: r.heart_axis,
    infarctionStadium: r.infarction_stadium,
    extraBeats: r.extra_beats,
    pacemaker: r.pacemaker,
    ref: {
      hrBpm: m.HR_Ventr ?? m.HR_,
      atrialRateBpm: m.HR_Atrial,
      rrMs: m.RR_Mean,
      prMs: m.PR_Int,
      pDurMs: m.P_Dur,
      qrsMs: m.QRS_Dur,
      qtMs: m.QT_Int,
      qtcBazettMs: m.QT_IntBazett,
      qtcFridericiaMs: m.QT_IntFridericia,
      qtcFraminghamMs: m.QT_IntFramingham,
      pAxisDeg: m.P_AxisFront,
      qrsAxisDeg: m.R_AxisFrontal,
      tAxisDeg: m.T_AxisFront,
      pFound: m.P_Found,
    },
    offset,
    length: blob.length,
  });
  offset += blob.length;
}

writeFileSync(join(outDir, 'ptbxl-signals.bin'), Buffer.concat(blobs));
writeFileSync(
  join(outDir, 'ptbxl-meta.json'),
  JSON.stringify({
    source: 'PTB-XL v1.0.3 (Wagner et al. 2020) and PTB-XL+ v1.0.1 (Strodthoff et al. 2023), PhysioNet, CC BY 4.0',
    changes: 'Curated subset of 300 records; 500 Hz → 250 Hz (31-tap low-pass, 100 Hz); quantized to 5 µV; leads III, aVR, aVL, aVF re-derived from I and II',
    fs: FS_OUT,
    samples: N_OUT,
    quantumMv: Q_MV,
    leads: KEEP,
    records: meta,
  }),
);
const total = offset;
console.log(`records ${meta.length}, signals ${(total / 1024).toFixed(0)} KB (${(total / meta.length / 1024).toFixed(1)} KB/record)`);
