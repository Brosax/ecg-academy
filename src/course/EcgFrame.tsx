/**
 * The ECG inside a lesson: resolve the source (synthetic request or real case), keep a placeholder of the final size
 * while it loads (layout stability), resolve AutoMarks for the way the viewer will draw it, and show the real-data
 * credit under real tracings. Measuring tools are always available; the toolbar opens on request (or by default when
 * the block asks for calipers).
 */
import type { Signal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { store, type LayoutId } from '../app/store';
import type { Ecg } from '../core/ecg';
import type { Lead } from '../core/leads';
import { EcgView } from '../ecg';
import { tc } from '../i18n/common';
import { tco } from '../i18n/course';
import type { EcgSource, ItemView } from '../practice/api';
import { AttributionFooter } from '../real';
import { Badge, Button } from '../ui';
import type { LessonMark } from './api';
import { loadEcg, peekEcg, sourceKey } from './deps';
import { resolveMarks } from './marks';

export type EcgState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly ecg: Ecg } | { readonly status: 'error' };

/** Load an ECG source (cached; a source seen before in this session is ready on the first frame). */
export function useEcg(src: EcgSource | undefined): { readonly state: EcgState; readonly retry: () => void } {
  const key = src ? sourceKey(src) : '';
  const [attempt, setAttempt] = useState(0);
  const initial = (): EcgState => {
    const hit = src ? peekEcg(src) : null;
    return hit ? { status: 'ready', ecg: hit } : { status: 'loading' };
  };
  const [held, setHeld] = useState<{ readonly key: string; readonly st: EcgState }>(() => ({ key, st: initial() }));

  useEffect(() => {
    if (!src) return;
    const hit = peekEcg(src);
    if (hit) {
      setHeld((h) => (h.key === key && h.st.status === 'ready' && h.st.ecg === hit ? h : { key, st: { status: 'ready', ecg: hit } }));
      return;
    }
    let alive = true;
    setHeld({ key, st: { status: 'loading' } });
    loadEcg(src).then(
      (ecg) => {
        if (alive) setHeld({ key, st: { status: 'ready', ecg } });
      },
      (e: unknown) => {
        console.warn('course: ECG not available', key, e);
        if (alive) setHeld({ key, st: { status: 'error' } });
      },
    );
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const state = held.key === key ? held.st : initial();
  return { state, retry: () => setAttempt((a) => a + 1) };
}

/** Width / height of the sheet per layout (10 s at standard settings) — the placeholder keeps this size. */
const RATIO: Readonly<Record<LayoutId, number>> = {
  '3x4+1': 2.12,
  '3x4+3': 1.43,
  '6x2': 1.46,
  '12x1': 0.83,
  single: 5.5,
  strip: 5.5,
};

export interface EcgDisplayProps {
  readonly ecg: Ecg;
  readonly view?: ItemView;
  readonly marks?: readonly LessonMark[];
  readonly highlightLeads?: readonly Lead[];
  readonly cursor?: Signal<number | null>;
  readonly label?: string;
  /** hide the "simulated / real" badge and toolbar toggle row (e.g. inside a compact card) */
  readonly bare?: boolean;
}

/** A loaded ECG in the lesson viewer, with AutoMarks resolved for this layout. */
export function EcgDisplay(props: EcgDisplayProps) {
  const vs = store.settings.value.viewer;
  const lang = store.lang.value;
  const v = props.view;
  const layout = v?.layout ?? vs.layout;
  const [toolbar, setToolbar] = useState(!!v?.calipers);
  const w0 = v?.window?.[0];
  const w1 = v?.window?.[1];
  const marks = useMemo(
    () =>
      resolveMarks(props.ecg, props.marks, {
        layout,
        speed: vs.speed,
        cabrera: vs.cabrera,
        lead: v?.lead,
        window: w0 !== undefined && w1 !== undefined ? [w0, w1] : undefined,
        lang,
      }),
    [props.ecg, props.marks, layout, vs.speed, vs.cabrera, v?.lead, w0, w1, lang],
  );
  const real = props.ecg.origin.kind === 'real';
  return (
    <div class="crs-ecg">
      {!props.bare && (
        <div class="crs-ecg__bar">
          <Badge tone={real ? 'info' : 'neutral'}>{real ? tc('real') : tc('synthetic')}</Badge>
          <Button size="sm" tone="ghost" icon="calipers" class="crs-ecg__tools" aria-pressed={toolbar} onClick={() => setToolbar(!toolbar)}>
            {toolbar ? tco('hideTools') : tco('showTools')}
          </Button>
        </div>
      )}
      <EcgView
        ecg={props.ecg}
        layout={v?.layout}
        lead={v?.lead}
        window={w0 !== undefined && w1 !== undefined ? [w0, w1] : undefined}
        marks={marks}
        highlightLeads={props.highlightLeads ?? v?.highlightLeads}
        cursor={props.cursor}
        toolbar={toolbar}
        tools={{ calipers: true, magnifier: true, crosshair: true }}
        ariaLabel={props.label}
      />
      {real && props.ecg.origin.kind === 'real' && <RealCredit ecgId={props.ecg.origin.ecgId} />}
    </div>
  );
}

/** Same footprint as the loaded viewer: loading text, or the error with a retry. */
export function EcgPlaceholder(props: { readonly layout?: LayoutId; readonly status: 'loading' | 'error'; readonly real?: boolean; readonly onRetry?: () => void }) {
  const layout = props.layout ?? store.settings.value.viewer.layout;
  return (
    <div class="crs-ecg">
      <div class="crs-ecg__bar">
        <Badge tone={props.real ? 'info' : 'neutral'}>{props.real ? tc('real') : tc('synthetic')}</Badge>
      </div>
      <div class={`crs-ecg__ph${props.status === 'error' ? ' is-error' : ''}`} style={{ aspectRatio: String(RATIO[layout]) }} role="status">
        {props.status === 'loading' ? (
          <span class="app-muted">{tc('loading')}</span>
        ) : (
          <span class="crs-ecg__err">
            <span>{props.real ? tco('ecgError') : tco('ecgUnavailable')}</span>
            {props.onRetry && (
              <Button size="sm" icon="refresh" onClick={props.onRetry}>
                {tc('retry')}
              </Button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export interface EcgPanelProps extends Omit<EcgDisplayProps, 'ecg'> {
  readonly source: EcgSource;
}

/** Load + display an ECG source. */
export function EcgPanel(props: EcgPanelProps) {
  const { state, retry } = useEcg(props.source);
  const { source, ...rest } = props;
  if (state.status === 'ready') return <EcgDisplay ecg={state.ecg} {...rest} />;
  return <EcgPlaceholder layout={props.view?.layout} status={state.status} real={source.kind === 'real'} onRetry={retry} />;
}

/** Credit line under every real tracing (CC BY 4.0); the full attribution opens below it. */
export function RealCredit(props: { readonly ecgId?: number }) {
  return (
    <details class="crs-credit">
      <summary>
        <span>{tco('realCredit')}</span>
        <span class="crs-credit__more">{tco('realCreditMore')}</span>
      </summary>
      <AttributionFooter ecgId={props.ecgId} />
    </details>
  );
}
