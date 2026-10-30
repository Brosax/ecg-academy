/**
 * Review gallery (DECISION §8.2 T10): renders every scenario (and its variants) to tests/out/gallery/<id>.png
 * (3×4 + II rhythm strip, 25 mm/s, 10 mm/mV) and <id>-beat.png (one beat per lead, 50 mm/s, 20 mm/mV) with the
 * harness renderer, plus a real PTB-XL case of the same class beside it (<id>-real.png) when one exists in the shipped
 * bundle. Dev-only (Node); tests/out/ is git-ignored.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/gallery.ts [id …] [--seed N] [--no-real]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { STD_LEADS } from '../../src/core/leads';
import { assembleLeads, decodeStoredLeads, type SignalFormat } from '../../src/real/decode';
import { generate, scenarios } from '../../src/synth/index';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}tests/out/gallery`;
const RENDER = `${ROOT}_proto/harness/render.py`;
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const si = args.indexOf('--seed');
const seed = si >= 0 ? Number(args[si + 1]) : 1;
const withReal = !args.includes('--no-real');
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--seed'));

/** PTB-XL class shown beside each scenario (teaching class of the curated bundle). */
const REAL_CLASS: Readonly<Record<string, string>> = {
  normal: 'NORM', 'sinus-bradycardia': 'SBRAD', 'sinus-tachycardia': 'STACH', 'sinus-arrhythmia': 'SARRH', irbbb: 'IRBBB',
  rbbb: 'CRBBB', lbbb: 'CLBBB', 'stemi-anterior': 'AMI', 'stemi-inferior': 'IMI', 'lvh-strain': 'LVH', wpw: 'WPW',
  'atrial-flutter': 'AFLT', 'atrial-fibrillation': 'AFIB', hyperkalemia: 'NDT', 'early-repolarization': 'NORM', athlete: 'SBRAD',
};

function render(name: string, fs: number, leads: Readonly<Record<string, ArrayLike<number>>>, title: string): void {
  const json = `${OUT}/${name}.json`;
  const L: Record<string, number[]> = {};
  for (const l of STD_LEADS) L[l] = Array.from(leads[l], (v) => Math.round(v * 1e5) / 1e5);
  writeFileSync(json, JSON.stringify({ fs, title, leads: L }));
  execFileSync('python', ['-I', RENDER, json, `${OUT}/${name}`], { stdio: 'pipe' });
}

interface RawMeta extends SignalFormat {
  readonly records: readonly { readonly id: number; readonly cls: string; readonly offset: number; readonly length: number }[];
}
let meta: RawMeta | null = null;
let bin: Uint8Array | null = null;
function realCase(cls: string): { id: number; fs: number; leads: Record<string, Float32Array> } | null {
  meta ??= JSON.parse(readFileSync(`${ROOT}src/data/real/ptbxl-meta.json`, 'utf8')) as RawMeta;
  bin ??= new Uint8Array(readFileSync(`${ROOT}src/data/real/ptbxl-signals.bin`));
  const r = meta.records.find((x) => x.cls === cls);
  if (!r) return null;
  const stored = decodeStoredLeads(new Uint8Array(inflateRawSync(bin.subarray(r.offset, r.offset + r.length))), meta);
  return { id: r.id, fs: meta.fs, leads: assembleLeads(stored, meta) as unknown as Record<string, Float32Array> };
}

const list = scenarios().filter((d) => !ids.length || ids.includes(d.id));
for (const d of list) {
  const variants: (string | undefined)[] = [undefined, ...Object.keys(d.variants ?? {})];
  for (const v of variants) {
    const res = generate({ scenario: d.id, variant: v, seed });
    const t = res.ecg.truth!;
    const name = v ? `${d.id}--${v}` : d.id;
    const title = `${name}  seed ${seed}  HR ${t.hrBpm.toFixed(0)}  PR ${t.prMs?.toFixed(0) ?? '-'}  QRS ${t.qrsMs.toFixed(0)}  QT ${t.qtMs.toFixed(0)}  axis ${t.axisDeg.qrs.toFixed(0)}  [${t.findings.join(', ')}]`;
    render(name, res.ecg.signal.fs, res.ecg.signal.leads, title);
    console.log(`rendered ${name}`);
  }
  const cls = REAL_CLASS[d.id];
  if (withReal && cls) {
    const rc = realCase(cls);
    if (rc) {
      render(`${d.id}-real`, rc.fs, rc.leads, `PTB-XL ${rc.id} (${cls}) — Wagner et al. 2020, PhysioNet, CC BY 4.0`);
      console.log(`rendered ${d.id}-real (PTB-XL ${rc.id})`);
    }
  }
}
