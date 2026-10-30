/**
 * <Heart3D> — the small secondary 3D heart (contract: src/heart3d/api.ts). Colours anatomical regions with the
 * activation/repolarization state at the shared cursor and says, under the heart, which ECG wave that state produces.
 * Renders on demand only (view.ts); falls back to a short text when WebGL is unavailable.
 */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { RegionId } from '../core/regions';
import { store } from '../app/store';
import { th3 } from '../i18n/heart3d';
import { Icon } from '../ui';
import type { Heart3DProps } from './api';
import { loadHeartAsset } from './asset';
import { paletteFromTokens, toCss, type HeartPalette, type Rgb } from './colors';
import { HEART_CREDIT } from './credit';
import { anyConductionShown, capitalize, legendItems, shownConduction } from './legend';
import { createHeartView, type HeartView, type HeartViewOptions, type PhaseKey } from './view';
import './heart3d.css';

type Status = 'loading' | 'ready' | 'nowebgl' | 'error';

const NONE: readonly RegionId[] = [];
const DEFAULT_SIZE = 280;

const PHASE_KEY = {
  none: 'phaseNone',
  anatomy: 'phaseAnatomy',
  rest: 'phaseRest',
  atrial: 'phaseAtrial',
  av: 'phaseAv',
  qrs: 'phaseQrs',
  st: 'phaseSt',
  t: 'phaseT',
} as const satisfies Record<PhaseKey, string>;

function readPalette(el: Element): HeartPalette {
  const cs = getComputedStyle(el);
  return paletteFromTokens((t) => cs.getPropertyValue(`--${t}`));
}

export function Heart3D(props: Heart3DProps) {
  const size = props.size ?? DEFAULT_SIZE;
  const lang = store.lang.value;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<HeartView | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [phase, setPhase] = useState<PhaseKey>(props.regions ? 'none' : 'anatomy');
  const [palette, setPalette] = useState<HeartPalette | null>(null);
  const [info, setInfo] = useState(false);
  const captionId = useId();
  const infoId = useId();
  const infoRef = useRef<HTMLDivElement>(null);
  /** close the key; focus inside it (its links, its close button) goes back to the toggle instead of being lost */
  const closeInfo = () => {
    const panel = infoRef.current;
    if (panel && panel.contains(document.activeElement)) infoBtnRef.current?.focus();
    setInfo(false);
  };

  const emphasize = props.emphasize ?? NONE;
  const emphKey = emphasize.join(',');
  const opts: HeartViewOptions = {
    regions: props.regions,
    emphasize,
    showConduction: props.showConduction === true,
    labels: props.labels !== false,
    lang,
  };
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const cursorRef = useRef(props.cursor);
  cursorRef.current = props.cursor;

  // create the view once the asset is decoded; dispose every GPU resource on unmount
  useEffect(() => {
    let alive = true;
    const host = hostRef.current;
    if (!host) return;
    let last = ''; // serialized palette last handed to the view
    loadHeartAsset().then(
      (asset) => {
        const canvas = canvasRef.current, overlay = overlayRef.current;
        if (!alive || !canvas || !overlay) return;
        const p = readPalette(host);
        last = JSON.stringify(p);
        const v = createHeartView(canvas, overlay, asset, cursorRef.current, p, optsRef.current, setPhase);
        if (!v) {
          setStatus('nowebgl');
          return;
        }
        viewRef.current = v;
        setPalette(p);
        setStatus('ready');
      },
      () => {
        if (alive) setStatus('error');
      },
    );
    // theme switch → re-read the tokens (one observer per instance; disconnected on unmount); unrelated attribute
    // changes on <html> leave the palette as it is and cost nothing
    const mo =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            const p = readPalette(host);
            const key = JSON.stringify(p);
            if (key === last) return;
            last = key;
            setPalette(p);
            viewRef.current?.setPalette(p);
          })
        : null;
    mo?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    return () => {
      alive = false;
      mo?.disconnect();
      viewRef.current?.dispose();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.setOptions(optsRef.current);
  }, [props.regions, emphKey, props.showConduction, props.labels, lang, status]);

  useEffect(() => {
    viewRef.current?.setCursor(props.cursor);
  }, [props.cursor]);

  const ready = status === 'ready';
  const failed = status === 'nowebgl' || status === 'error';
  const conductionVisible = anyConductionShown(shownConduction(opts.showConduction, emphasize, props.regions));

  return (
    <div
      ref={hostRef}
      class={`h3d${info ? ' is-info' : ''}`}
      style={{ width: `${size}px` }}
      role="group"
      aria-label={th3('title')}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && info) {
          e.stopPropagation();
          closeInfo();
        }
      }}
    >
      {/* the stage holds the canvas; the caption has its own strip below it, so text never sits on the heart */}
      <div class="h3d__stage">
        <canvas
          ref={canvasRef}
          class="h3d__canvas"
          hidden={failed}
          tabIndex={ready ? 0 : -1}
          role="img"
          aria-label={props.ariaLabel ?? th3('aria')}
          aria-describedby={captionId}
        />
        <div ref={overlayRef} class="h3d__overlay" aria-hidden="true" />
      </div>
      {status === 'loading' && <div class="h3d__msg">{th3('loading')}</div>}
      {failed && (
        <div class="h3d__msg h3d__msg--fail" role="note">
          {th3(status === 'nowebgl' ? 'noWebgl' : 'loadError')}
        </div>
      )}
      {ready && (
        <div class="h3d__tools">
          <button type="button" class="h3d__btn" aria-label={th3('resetView')} title={th3('resetView')} onClick={() => viewRef.current?.resetView()}>
            <Icon name="refresh" size={16} />
          </button>
          <button
            ref={infoBtnRef}
            type="button"
            class={`h3d__btn${info ? ' is-on' : ''}`}
            aria-label={th3('info')}
            title={th3('info')}
            aria-expanded={info}
            aria-controls={info ? infoId : undefined}
            onClick={() => setInfo(!info)}
          >
            <Icon name="info" size={16} />
          </button>
        </div>
      )}
      {!failed && (
        <div id={captionId} class="h3d__phase">
          <span>{th3(PHASE_KEY[phase])}</span>
        </div>
      )}
      {info && palette && (
        <div ref={infoRef} id={infoId} class="h3d__info" role="region" aria-label={th3('legend')}>
          <ul class="h3d__legend">
            {legendItems(props.regions, conductionVisible, palette).map((it) => (
              <Swatch key={it.key} c={it.color} label={capitalize(th3(it.key))} line={it.shape === 'line'} ring={it.shape === 'ring'} />
            ))}
          </ul>
          {conductionVisible && <p class="h3d__note">{th3('conductionNote')}</p>}
          <p class="h3d__credit">
            {th3('credit')}{' '}
            <a href={HEART_CREDIT.doi} target="_blank" rel="noopener noreferrer">
              DOI
            </a>
            {' · '}
            <a href={HEART_CREDIT.licenseUrl} target="_blank" rel="noopener noreferrer">
              {HEART_CREDIT.license}
            </a>
          </p>
          <button type="button" class="h3d__close" onClick={closeInfo}>
            {th3('closeInfo')}
          </button>
        </div>
      )}
    </div>
  );
}

function Swatch(props: { readonly c: Rgb; readonly label: string; readonly line?: boolean; readonly ring?: boolean }) {
  const cls = `h3d__sw${props.line ? ' h3d__sw--line' : ''}${props.ring ? ' h3d__sw--ring' : ''}`;
  const css = toCss(props.c);
  return (
    <li>
      <span class={cls} style={props.ring ? { borderColor: css } : { background: css }} aria-hidden="true" />
      {props.label}
    </li>
  );
}
