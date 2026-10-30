/**
 * Realism envelopes (DECISION §8.2 T4, §8.3): PTB-XL+ 12SL features × PTB-XL labels → per-class 5th / 50th / 95th
 * percentiles of per-lead amplitudes and global intervals / axes, for classes with ≥ 30 clean records. Dev-only:
 * reads data-raw/ (never shipped) and writes tests/synth/fixtures/ptbxl-envelopes.json.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/envelopes.ts
 *
 * Membership: diagnostic statements with likelihood ≥ 50 (form / rhythm statements carry likelihood 0 in PTB-XL and
 * count when present); NORM additionally requires SR. Excluded: records with any noise / electrode flag, pacemakers,
 * and records with a second classes' conduction disorder where it would change the morphology (see EXCLUDE).
 * 12SL units: amplitudes in mV (P_Amp, Q_Amp, R_Amp, S_Amp, ST_Amp, T_Amp, QRS_AmpPP), durations / intervals in ms.
 * Data: PTB-XL v1.0.3 (Wagner P et al., Sci Data 2020) and PTB-XL+ v1.0.1 (Strodthoff N et al., Sci Data 2023),
 * PhysioNet, CC BY 4.0.
 */
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DB = `${ROOT}data-raw/ptbxl/ptbxl_database.csv`;
const FEAT = `${ROOT}data-raw/ptbxl-plus/features/12sl_features.csv`;
const OUT = `${ROOT}tests/synth/fixtures/ptbxl-envelopes.json`;

const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
const PER_LEAD = ['P_Amp', 'Q_Amp', 'Q_Dur', 'R_Amp', 'S_Amp', 'ST_Amp', 'T_Amp', 'QRS_AmpPP'] as const;
const GLOBAL = {
  pr: 'PR_Int_Global', qrs: 'QRS_Dur_Global', qt: 'QT_Int_Global', qtcF: 'QT_IntFridericia_Global', hr: 'HR_Ventr_Global',
  pAxis: 'P_AxisFront_Global', qrsAxis: 'R_AxisFrontal_Global', tAxis: 'T_AxisFront_Global', pDur: 'P_Dur_Global',
} as const;

/** class → required codes (all present) and excluded codes (none present) */
const CLASSES: Readonly<Record<string, { all: readonly string[]; none: readonly string[] }>> = {
  NORM: { all: ['NORM', 'SR'], none: [] },
  SBRAD: { all: ['SBRAD'], none: ['CRBBB', 'CLBBB', 'WPW', 'LVH', 'IMI', 'AMI', 'ASMI'] },
  STACH: { all: ['STACH'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  SARRH: { all: ['SARRH'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  CRBBB: { all: ['CRBBB'], none: ['LAFB', 'LPFB', 'CLBBB', 'WPW', 'PACE'] },
  IRBBB: { all: ['IRBBB'], none: ['LAFB', 'LPFB', 'CRBBB', 'CLBBB', 'WPW'] },
  CLBBB: { all: ['CLBBB'], none: ['CRBBB', 'WPW', 'PACE'] },
  LAFB: { all: ['LAFB'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  LVH: { all: ['LVH'], none: ['CRBBB', 'CLBBB', 'WPW', 'LAFB'] },
  IMI: { all: ['IMI'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  ASMI: { all: ['ASMI'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  AMI: { all: ['AMI'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  '1AVB': { all: ['1AVB'], none: ['CRBBB', 'CLBBB', 'WPW'] },
  AFIB: { all: ['AFIB'], none: ['CRBBB', 'CLBBB', 'WPW', 'PACE'] },
  AFLT: { all: ['AFLT'], none: ['CRBBB', 'CLBBB', 'WPW', 'PACE'] },
  WPW: { all: ['WPW'], none: [] },
};
const DIAGNOSTIC = new Set(['NORM', 'CRBBB', 'IRBBB', 'CLBBB', 'LAFB', 'LVH', 'IMI', 'ASMI', 'AMI', '1AVB', 'WPW']);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// 1. labels
const dbLines = readFileSync(DB, 'utf8').split(/\r?\n/).filter(Boolean);
const dbHead = parseCsvLine(dbLines[0]);
const col = (n: string): number => dbHead.indexOf(n);
const classOf = new Map<number, string[]>();
const sexOf = new Map<number, string>();
for (const line of dbLines.slice(1)) {
  const r = parseCsvLine(line);
  const id = Number(r[col('ecg_id')]);
  if (['baseline_drift', 'static_noise', 'burst_noise', 'electrodes_problems'].some((k) => r[col(k)]?.trim())) continue;
  if (r[col('pacemaker')]?.trim()) continue;
  const codes = new Map<string, number>();
  for (const m of r[col('scp_codes')].matchAll(/'(\w+)': ([\d.]+)/g)) codes.set(m[1], Number(m[2]));
  const has = (c: string): boolean => codes.has(c) && (!DIAGNOSTIC.has(c) || (codes.get(c) ?? 0) >= 50);
  const cls = Object.entries(CLASSES).filter(([, d]) => d.all.every(has) && !d.none.some((c) => codes.has(c))).map(([k]) => k);
  if (cls.length) classOf.set(id, cls);
  sexOf.set(id, r[col('sex')] === '1' ? 'F' : 'M');
}

// 2. features (streamed: 93 MB)
type Row = Record<string, number>;
const rowsByClass = new Map<string, Row[]>();
const rl = createInterface({ input: createReadStream(FEAT, 'utf8'), crlfDelay: Infinity });
let head: string[] | null = null;
const wanted = new Set<string>([...LEADS.flatMap((l) => PER_LEAD.map((f) => `${f}_${l}`)), ...Object.values(GLOBAL)]);
for await (const line of rl) {
  if (!head) {
    head = line.split(',');
    continue;
  }
  const v = line.split(',');
  const id = Number(v[head.indexOf('ecg_id')]);
  const cls = classOf.get(id);
  if (!cls) continue;
  const row: Row = {};
  head.forEach((h, i) => {
    if (wanted.has(h)) row[h] = Number(v[i]);
  });
  for (const c of cls) {
    let list = rowsByClass.get(c);
    if (!list) rowsByClass.set(c, (list = []));
    list.push(row);
  }
}

// 3. percentiles
const pct = (xs: number[], p: number): number => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const x = (s.length - 1) * p;
  const i = Math.floor(x);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (x - i) : s[i];
};
const r3 = (x: number): number => Math.round(x * 1000) / 1000;
interface Env { p5: number; p50: number; p95: number }
const out: Record<string, { n: number; global: Record<string, Env>; leads: Record<string, Record<string, Env>> }> = {};
for (const [cls, rows] of rowsByClass) {
  if (rows.length < 30) continue;
  const env = (key: string, valid: (x: number) => boolean = Number.isFinite): Env => {
    const xs = rows.map((r) => r[key]).filter(valid);
    return { p5: r3(pct(xs, 0.05)), p50: r3(pct(xs, 0.5)), p95: r3(pct(xs, 0.95)) };
  };
  const global: Record<string, Env> = {};
  for (const [k, col_] of Object.entries(GLOBAL)) global[k] = env(col_, (x) => Number.isFinite(x) && x !== 0);
  const leads: Record<string, Record<string, Env>> = {};
  for (const l of LEADS) {
    leads[l] = {};
    for (const f of PER_LEAD) leads[l][f] = env(`${f}_${l}`);
  }
  out[cls] = { n: rows.length, global, leads };
}
const fixture = {
  _source: 'PTB-XL v1.0.3 (Wagner P et al., Sci Data 2020) and PTB-XL+ v1.0.1 (Strodthoff N et al., Sci Data 2023), PhysioNet, CC BY 4.0. GE 12SL features (12sl_features.csv) × PTB-XL labels; derived by scripts/synth/envelopes.ts.',
  _units: 'amplitudes mV (P_Amp, Q_Amp, R_Amp, S_Amp, ST_Amp, T_Amp, QRS_AmpPP), durations and intervals ms, axes degrees; percentiles 5 / 50 / 95',
  _membership: 'diagnostic likelihood ≥ 50 (form / rhythm statements: present); noise / electrode flags and pacemakers excluded; per-class exclusions in the script',
  classes: out,
};
writeFileSync(OUT, JSON.stringify(fixture, null, 1));
for (const [c, v] of Object.entries(out)) console.log(`${c.padEnd(6)} n=${String(v.n).padStart(5)}  QRS ${v.global.qrs.p50}  PR ${v.global.pr.p50}  axis ${v.global.qrsAxis.p50}  R_V1 ${v.leads.V1.R_Amp.p50}  S_V1 ${v.leads.V1.S_Amp.p50}  R_V5 ${v.leads.V5.R_Amp.p50}  T_V2 ${v.leads.V2.T_Amp.p50}  T_II ${v.leads.II.T_Amp.p50}`);
