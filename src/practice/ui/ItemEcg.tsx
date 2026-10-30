/**
 * The ECG of an item (the protagonist): resolved through ecgOf (synthetic or real), shown in the viewer with the item's
 * view settings. No overlays before grading (drills never reveal answers); the item's reveal marks after grading;
 * answer pins for locate items. A fixed-ratio placeholder holds the space while the tracing is prepared.
 */
import type { ReadonlySignal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import type { Lead } from '../../core/leads';
import { EcgView, type CaliperMeasure, type EcgMark, type EcgPin, type PickEvent } from '../../ecg/index';
import { tp } from '../../i18n/practice';
import { Badge, Button } from '../../ui/index';
import type { EcgSource } from '../api';
import type { ItemViewX } from '../core/extras';
import { ecgOf, peekEcg, sourceKey } from '../core/ports';

export interface EcgState {
  readonly ecg: Ecg | null;
  readonly error: unknown;
  readonly retry: () => void;
}

/** Resolve an EcgSource (cached; synchronous when already resolved). */
export function useEcg(source: EcgSource | null): EcgState {
  const key = source ? sourceKey(source) : '';
  const [state, setState] = useState<{ key: string; ecg: Ecg | null; error: unknown }>(() => ({ key, ecg: source ? peekEcg(source) : null, error: null }));
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!source) return;
    let alive = true;
    const hit = peekEcg(source);
    if (hit) {
      setState({ key, ecg: hit, error: null });
      return;
    }
    setState({ key, ecg: null, error: null });
    ecgOf(source).then(
      (ecg) => alive && setState({ key, ecg, error: null }),
      (error: unknown) => alive && setState({ key, ecg: null, error }),
    );
    return () => {
      alive = false;
    };
  }, [key, nonce]);
  const current = state.key === key ? state : { ecg: source ? peekEcg(source) : null, error: null };
  return { ecg: current.ecg, error: current.error, retry: () => setNonce((n) => n + 1) };
}

export interface ItemEcgProps {
  readonly source: EcgSource;
  readonly view?: ItemViewX;
  readonly marks?: readonly EcgMark[];
  readonly pins?: readonly EcgPin[];
  readonly onPick?: (e: PickEvent) => void;
  readonly onCaliper?: (m: CaliperMeasure) => void;
  readonly compact?: boolean;
  readonly ariaLabel?: string;
  /** show the PTB-XL attribution / simulated badge line */
  readonly showSource?: boolean;
  /** a caliper signal to mirror (the report slot) */
  readonly caliper?: ReadonlySignal<CaliperMeasure | null>;
  readonly highlightLeads?: readonly Lead[];
}

export function ItemEcg(props: ItemEcgProps) {
  const { ecg, error, retry } = useEcg(props.source);
  const v = props.view ?? {};
  const single = v.layout === 'single' || v.layout === 'strip';
  if (!ecg) {
    return (
      <div class={`pr-ecg-ph ${single ? 'pr-ecg-ph--strip' : ''} ${props.compact ? 'pr-ecg-ph--compact' : ''}`} role="status" aria-live="polite">
        {error ? (
          <div class="pr-ecg-ph__err">
            <p>{tp('genFailed')}</p>
            <Button size="sm" icon="refresh" onClick={retry}>
              {tp('tryAnother')}
            </Button>
          </div>
        ) : (
          <span class="pr-ecg-ph__msg">{tp('preparing')}</span>
        )}
      </div>
    );
  }
  const tools = v.calipers === false ? false : undefined;
  return (
    <div class="pr-ecg">
      <EcgView
        ecg={ecg}
        layout={v.layout}
        lead={v.lead}
        window={v.window}
        speed={v.speed}
        gain={v.gain}
        highlightLeads={props.highlightLeads ?? v.highlightLeads}
        marks={props.marks}
        pins={props.pins}
        onPick={props.onPick}
        onCaliper={props.onCaliper}
        toolbar={v.toolbar ?? !props.compact}
        tools={tools}
        height={props.compact ? (single ? 180 : 300) : undefined}
        ariaLabel={props.ariaLabel ?? tp('ecgAria')}
      />
      {props.showSource !== false && (
        <p class="pr-ecg__src">
          <Badge tone={props.source.kind === 'real' ? 'info' : 'neutral'}>{props.source.kind === 'real' ? tp('realBadge') : tp('synthBadge')}</Badge>
          {props.source.kind === 'real' && <span class="app-muted">{tp('sourceLine')}</span>}
        </p>
      )}
    </div>
  );
}
