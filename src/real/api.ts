/**
 * PUBLIC CONTRACT of the real-ECG library (src/real). Other modules import only from src/real/index.tsx.
 * Data: src/data/real/ptbxl-meta.json + ptbxl-signals.bin (built by scripts/data/build-real-bundle.mjs; format documented
 * there). PTB-XL v1.0.3 / PTB-XL+ v1.0.1, PhysioNet, CC BY 4.0 — attribution must be visible wherever a case is shown.
 */
import type { Ecg } from '../core/ecg';
import type { FindingId } from '../core/findings';
import type { L10n } from '../core/l10n';

/** Reference measurements from the GE 12SL algorithm (PTB-XL+); null when unavailable. */
export interface RealReference {
  readonly hrBpm: number | null;
  readonly atrialRateBpm: number | null;
  readonly rrMs: number | null;
  readonly prMs: number | null;
  readonly pDurMs: number | null;
  readonly qrsMs: number | null;
  readonly qtMs: number | null;
  readonly qtcBazettMs: number | null;
  readonly qtcFridericiaMs: number | null;
  readonly qtcFraminghamMs: number | null;
  readonly pAxisDeg: number | null;
  readonly qrsAxisDeg: number | null;
  readonly tAxisDeg: number | null;
}

export interface RealCaseMeta {
  readonly id: number;
  /** teaching class used for curation (an SCP code, e.g. 'CLBBB') */
  readonly cls: string;
  /** SCP statement codes with their likelihood (PTB-XL convention: diagnostic 0–100; form/rhythm 0) */
  readonly codes: Readonly<Record<string, number>>;
  /** app findings derived from the SCP codes (only codes with a confident mapping) */
  readonly findings: readonly FindingId[];
  readonly age: number | null;
  readonly sex: 'M' | 'F' | null;
  readonly heartAxis: string | null;
  readonly infarctionStadium: string | null;
  readonly ref: RealReference;
}

export interface RealLibrary {
  readonly cases: readonly RealCaseMeta[];
  readonly attribution: L10n;
}

export interface ScpStatement {
  readonly code: string;
  readonly name: L10n;
  readonly kind: 'diagnostic' | 'form' | 'rhythm';
}
