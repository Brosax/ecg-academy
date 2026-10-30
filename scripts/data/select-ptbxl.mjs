// Select a curated, deterministic teaching subset of PTB-XL records (labels from ptbxl_database.csv, reference
// measurements from PTB-XL+ 12SL global features). Writes the selection JSON; downloads nothing.
//
// Usage: node scripts/data/select-ptbxl.mjs <data-raw dir> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , rawDir, outPath] = process.argv;
if (!rawDir || !outPath) {
  console.error('usage: node select-ptbxl.mjs <data-raw dir> <out.json>');
  process.exit(2);
}

/** RFC-4180 CSV parser (quoted fields may contain commas, quotes and newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}

/** "{'NORM': 100.0, 'SR': 0.0}" → { NORM: 100, SR: 0 } */
function parseCodes(s) {
  const out = {};
  for (const m of s.matchAll(/'([^']+)':\s*([\d.]+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

const db = parseCsv(readFileSync(join(rawDir, 'ptbxl', 'ptbxl_database.csv'), 'utf8'));
const statements = parseCsv(readFileSync(join(rawDir, 'ptbxl', 'scp_statements.csv'), 'utf8'));
const kind = Object.fromEntries(statements.map((s) => [s[''], s.diagnostic === '1.0' ? 'diagnostic' : s.form === '1.0' ? 'form' : 'rhythm']));

const featText = readFileSync(join(rawDir, 'ptbxl-plus', 'features', '12sl_features.csv'), 'utf8');
const featHead = featText.slice(0, featText.indexOf('\n')).replace(/\r$/, '').split(',');
const ID_COL = featHead.indexOf('ecg_id');
const GLOBAL = featHead.filter((h) => h.endsWith('_Global'));
const feat = new Map();
for (const line of featText.split('\n').slice(1)) {
  if (!line.trim()) continue;
  const cells = line.replace(/\r$/, '').split(',');
  const rec = {};
  for (const g of GLOBAL) {
    const v = cells[featHead.indexOf(g)];
    rec[g.replace(/_Global$/, '')] = v === '' || v === undefined ? null : Number(v);
  }
  feat.set(Number(cells[ID_COL]), rec);
}

/** Deterministic pseudo-random tie-break (no Math.random): integer hash of the ecg_id. */
const hash = (n) => {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return x >>> 0;
};

const empty = (v) => v === undefined || v.trim() === '' || v.trim() === 'nan';
const recs = [];
for (const r of db) {
  const id = Number(r.ecg_id);
  const codes = parseCodes(r.scp_codes);
  const f = feat.get(id);
  if (!f || f.HR__ == null && f.HR_Ventr == null) continue;
  if (r.validated_by_human !== 'True') continue;
  const clean = empty(r.baseline_drift) && empty(r.static_noise) && empty(r.burst_noise) && empty(r.electrodes_problems);
  if (!clean) continue;
  recs.push({
    ecg_id: id,
    patient_id: Number(r.patient_id),
    age: r.age === '' ? null : Number(r.age),
    sex: r.sex === '0' ? 'M' : r.sex === '1' ? 'F' : null,
    codes,
    heart_axis: r.heart_axis || null,
    infarction_stadium: [r.infarction_stadium1, r.infarction_stadium2].filter((x) => x && x !== '') .join(' / ') || null,
    extra_beats: r.extra_beats || null,
    pacemaker: r.pacemaker || null,
    second_opinion: r.second_opinion === 'True',
    filename_hr: r.filename_hr,
    measures: f,
  });
}

// target counts per teaching class (≤ 300 records in total)
const TARGETS = {
  NORM: 20,
  SBRAD: 6, STACH: 6, SARRH: 6, AFIB: 12, AFLT: 8, SVTAC: 5, PSVT: 4, SVARR: 3, BIGU: 5, TRIGU: 3, PACE: 8,
  PVC: 8, PAC: 7,
  '1AVB': 8, '2AVB': 4, '3AVB': 5, CRBBB: 9, CLBBB: 9, IRBBB: 5, ILBBB: 3, LAFB: 8, LPFB: 4, WPW: 7, IVCD: 4,
  LVH: 9, RVH: 5, 'LAO/LAE': 5, 'RAO/RAE': 4, SEHYP: 2,
  AMI: 6, ASMI: 8, ALMI: 6, IMI: 9, ILMI: 4, IPLMI: 3, IPMI: 3, LMI: 4, PMI: 3,
  INJAS: 3, INJAL: 3, INJIN: 3, INJLA: 2, INJIL: 2,
  ISCAL: 4, ISCAN: 3, ISCIN: 3, ISCIL: 2, ISCAS: 2, ISCLA: 2, ANEUR: 2,
  DIG: 4, LNGQT: 5, EL: 3, NDT: 2, NST_: 2, STE_: 2, STD_: 2, LOWT: 2, INVT: 2, LVOLT: 3, HVOLT: 2, QWAVE: 2, LPR: 2,
};

const taken = new Set();
const takenPatients = new Set();
const selection = [];
const shortfall = {};
for (const [cls, n] of Object.entries(TARGETS)) {
  const isDiag = kind[cls] === 'diagnostic';
  const pool = recs
    .filter((r) => cls in r.codes && (!isDiag || r.codes[cls] >= 80))
    .filter((r) => !taken.has(r.ecg_id))
    .filter((r) => cls === 'PACE' || !r.pacemaker)
    .filter((r) => ['PVC', 'PAC', 'BIGU', 'TRIGU', 'SVARR', 'PRC(S)'].includes(cls) || !r.extra_beats)
    .map((r) => {
      // purity: how many other diagnostic findings compete with the teaching target
      const others = Object.keys(r.codes).filter((c) => c !== cls && c !== 'SR' && kind[c] === 'diagnostic' && r.codes[c] > 0);
      const lowConf = Object.keys(r.codes).filter((c) => c !== cls && kind[c] === 'diagnostic' && r.codes[c] > 0 && r.codes[c] < 100).length;
      return { r, purity: others.length + 0.5 * lowConf + (r.second_opinion ? 0.5 : 0) };
    })
    .sort((a, b) => a.purity - b.purity || hash(a.r.ecg_id) - hash(b.r.ecg_id));
  let got = 0;
  for (const { r } of pool) {
    if (got >= n) break;
    if (takenPatients.has(r.patient_id)) continue;
    if (cls === 'NORM' && Object.keys(r.codes).some((c) => c !== 'NORM' && c !== 'SR')) continue;
    taken.add(r.ecg_id);
    takenPatients.add(r.patient_id);
    selection.push({ ...r, teaching_class: cls });
    got++;
  }
  if (got < n) shortfall[cls] = { wanted: n, got, pool: pool.length };
}

writeFileSync(outPath, JSON.stringify({ source: 'PTB-XL v1.0.3 + PTB-XL+ v1.0.1 (CC BY 4.0)', count: selection.length, shortfall, records: selection }, null, 1));
console.log(`selected ${selection.length} records from ${recs.length} clean human-validated candidates`);
console.log('shortfall:', JSON.stringify(shortfall));
const ages = selection.map((s) => s.age).filter((a) => a != null && a < 300);
console.log('sex M/F:', selection.filter((s) => s.sex === 'M').length, selection.filter((s) => s.sex === 'F').length, ' age min/max:', Math.min(...ages), Math.max(...ages));
