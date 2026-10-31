/**
 * Settings: language & theme, ECG display defaults (speed, gain, layout, Cabrera, chest half gain), display & motion,
 * a slot for progress export / import / reset (src/practice), and the bank-card screen calibration that makes ECG paper
 * true to size (store.settings.viewer.pxPerMm). The calibration card is last because its outline grows while dragged.
 */
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Lang } from '../core/l10n';
import { LANG_OPTIONS } from '../i18n';
import { tc } from '../i18n/common';
import { tsh } from '../i18n/shell';
import { Card, Icon, Segmented, type IconName } from '../ui';
import {
  CARD_MM,
  CHECK_BOX_PX,
  CHECK_MM,
  clampWidth,
  DEFAULT_PX_PER_MM,
  formatPxPerMm,
  initialOutline,
  isValidPxPerMm,
  keyStep,
  MAX_PX_PER_MM,
  MIN_PX_PER_MM,
  outlineHeight,
  pxPerMmFromWidth,
  widthForPxPerMm,
  type CardEdge,
} from './calibration';
import { assistantSettingsSlot, progressDataSlot } from './slots';
import { LAYOUTS, store, updateSettings, updateViewer, type LayoutId } from './store';
import './pages.css';

type ShellKey = Parameters<typeof tsh>[0];

const LAYOUT_LABEL = {
  '3x4+1': 'layout3x4p1',
  '3x4+3': 'layout3x4p3',
  '6x2': 'layout6x2',
  '12x1': 'layout12x1',
  single: 'layoutSingle',
  strip: 'layoutStrip',
} as const satisfies Record<LayoutId, ShellKey>;

const htmlLang = (l: Lang) => (l === 'zh' ? 'zh-CN' : l);

export function SettingsPage() {
  const s = store.settings.value;
  const v = s.viewer;
  const ProgressData = progressDataSlot.value;
  const AssistantSettings = assistantSettingsSlot.value;
  return (
    <div class="app-page set-page">
      <header class="app-pagehead">
        <h1>{tc('navSettings')}</h1>
        <p>{tsh('setLead')}</p>
      </header>

      <Section id="set-general" title={tsh('setGeneral')}>
        <Row label={tc('language')} labelId="set-lang">
          <Segmented<Lang>
            value={store.lang.value}
            ariaLabel={tc('language')}
            options={LANG_OPTIONS.map((o) => ({ value: o.id, label: <span lang={htmlLang(o.id)}>{o.label}</span> }))}
            onChange={(l) => (store.lang.value = l)}
          />
        </Row>
        <Row label={tsh('theme')} labelId="set-theme">
          <Segmented<'light' | 'dark'>
            value={store.theme.value}
            ariaLabel={tsh('theme')}
            options={[
              { value: 'light', label: <IconLabel icon="sun" text={tc('themeLight')} /> },
              { value: 'dark', label: <IconLabel icon="moon" text={tc('themeDark')} /> },
            ]}
            onChange={(t) => (store.theme.value = t)}
          />
        </Row>
      </Section>

      <Section id="set-viewer" title={tsh('setViewer')} hint={tsh('setViewerHint')}>
        <Row label={tc('speed')} labelId="set-speed">
          <Segmented<25 | 50>
            value={v.speed}
            ariaLabel={tc('speed')}
            options={[
              { value: 25, label: '25 mm/s' },
              { value: 50, label: '50 mm/s' },
            ]}
            onChange={(speed) => updateViewer({ speed })}
          />
        </Row>
        <Row label={tc('gain')} labelId="set-gain">
          <Segmented<5 | 10 | 20>
            value={v.gain}
            ariaLabel={tc('gain')}
            options={[
              { value: 5, label: '5 mm/mV' },
              { value: 10, label: '10 mm/mV' },
              { value: 20, label: '20 mm/mV' },
            ]}
            onChange={(gain) => updateViewer({ gain })}
          />
        </Row>
        <Row label={tc('layout')} labelId="set-layout" forId="set-layout-select">
          <select
            id="set-layout-select"
            class="set-select"
            value={v.layout}
            onChange={(e) => {
              const val = (e.currentTarget as HTMLSelectElement).value;
              const layout = LAYOUTS.find((x) => x === val);
              if (layout) updateViewer({ layout });
            }}
          >
            {LAYOUTS.map((id) => (
              <option value={id}>{tsh(LAYOUT_LABEL[id])}</option>
            ))}
          </select>
        </Row>
        <SwitchRow id="set-cabrera" label={tsh('setCabrera')} hint={tsh('setCabreraHint')} checked={v.cabrera} onChange={(cabrera) => updateViewer({ cabrera })} />
        <SwitchRow
          id="set-chest-half"
          label={tsh('setChestHalf')}
          hint={tsh('setChestHalfHint')}
          checked={v.chestHalfGain}
          onChange={(chestHalfGain) => updateViewer({ chestHalfGain })}
        />
      </Section>

      <Section id="set-motion" title={tsh('setMotion')}>
        <SwitchRow
          id="set-reduce-motion"
          label={tsh('setReduceMotion')}
          hint={tsh('setReduceMotionHint')}
          checked={s.reduceMotion}
          onChange={(reduceMotion) => updateSettings({ reduceMotion })}
        />
        <SwitchRow
          id="set-show-heart"
          label={tsh('setShowHeart')}
          hint={tsh('setShowHeartHint')}
          checked={s.showHeart}
          onChange={(showHeart) => updateSettings({ showHeart })}
        />
      </Section>

      {/* SLOT progressDataSlot: src/practice plugs in export / import / reset of the learning record */}
      <Section id="set-data" title={tsh('setData')} hint={ProgressData ? undefined : tsh('setDataHint')}>
        {ProgressData ? (
          <ProgressData />
        ) : (
          <div class="set-data" data-slot="progress-data">
            <Btn size="sm" icon="external" disabled>
              {tsh('setExport')}
            </Btn>
            <Btn size="sm" icon="refresh" disabled>
              {tsh('setImport')}
            </Btn>
            <Btn size="sm" tone="danger" disabled>
              {tsh('setReset')}
            </Btn>
          </div>
        )}
      </Section>

      {/* SLOT assistantSettingsSlot: src/assistant plugs in the provider / key / model form of the AI study assistant */}
      {AssistantSettings && (
        <Section id="set-assistant" title={tsh('setAssistant')} hint={tsh('setAssistantHint')}>
          <AssistantSettings />
        </Section>
      )}

      <Section id="set-calibration" title={tsh('calTitle')} hint={tsh('calLead')}>
        <Calibration />
      </Section>
    </div>
  );
}

/**
 * Small action button with the shared ui-btn styling. Local because the shared Button's props do not include the
 * native `disabled` attribute (see contract request); everything else matches src/ui Button.
 */
function Btn(props: {
  readonly tone?: 'default' | 'primary' | 'danger';
  readonly size?: 'sm' | 'md';
  readonly icon?: IconName;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly children?: ComponentChildren;
}) {
  return (
    <button
      type="button"
      class={`ui-btn ui-btn--${props.tone ?? 'default'} ui-btn--${props.size ?? 'md'}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.icon && <Icon name={props.icon} />}
      {props.children != null && <span>{props.children}</span>}
    </button>
  );
}

function IconLabel(props: { readonly icon: 'sun' | 'moon'; readonly text: string }) {
  return (
    <span class="set-iconlabel">
      <Icon name={props.icon} size={15} />
      {props.text}
    </span>
  );
}

function Section(props: { readonly id: string; readonly title: string; readonly hint?: string; readonly children?: ComponentChildren }) {
  return (
    <Card as="section" pad="lg" class="set-section">
      <div aria-labelledby={`${props.id}-h`} role="group">
        <h2 id={`${props.id}-h`} class="set-section__title">
          {props.title}
        </h2>
        {props.hint && <p class="set-section__hint">{props.hint}</p>}
        <div class="set-section__body">{props.children}</div>
      </div>
    </Card>
  );
}

function Row(props: { readonly label: string; readonly labelId: string; readonly forId?: string; readonly hint?: string; readonly children?: ComponentChildren }) {
  return (
    <div class="set-row">
      <div class="set-row__text">
        {props.forId ? (
          <label class="set-row__label" id={props.labelId} for={props.forId}>
            {props.label}
          </label>
        ) : (
          <span class="set-row__label" id={props.labelId}>
            {props.label}
          </span>
        )}
        {props.hint && <p class="set-row__hint">{props.hint}</p>}
      </div>
      <div class="set-row__control">{props.children}</div>
    </div>
  );
}

function SwitchRow(props: { readonly id: string; readonly label: string; readonly hint?: string; readonly checked: boolean; readonly onChange: (v: boolean) => void }) {
  const hintId = `${props.id}-hint`;
  return (
    <div class="set-row">
      <div class="set-row__text">
        <label class="set-row__label" for={props.id}>
          {props.label}
        </label>
        {props.hint && (
          <p class="set-row__hint" id={hintId}>
            {props.hint}
          </p>
        )}
      </div>
      <div class="set-row__control">
        <input
          id={props.id}
          type="checkbox"
          role="switch"
          class="set-switch"
          checked={props.checked}
          aria-describedby={props.hint ? hintId : undefined}
          onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        />
      </div>
    </div>
  );
}

// ── screen calibration ──────────────────────────────────────────────────────────────────────────────────────────────

/** ID-1 card corner radius (mm). */
const CARD_CORNER_MM = 3.18;
/** Room kept on the right of the stage for the drag handle (px); keep in sync with `.cal-card` max-width in pages.css. */
const HANDLE_ROOM = 16;

function Calibration() {
  const lang = store.lang.value;
  const savedRaw = store.settings.value.viewer.pxPerMm;
  const saved = isValidPxPerMm(savedRaw) ? savedRaw : null;

  const [edge, setEdge] = useState<CardEdge>(() => initialOutline(Infinity, saved).edge);
  const [width, setWidth] = useState(() => initialOutline(Infinity, saved).width);
  const edgeRef = useRef(edge);
  edgeRef.current = edge;
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ readonly x: number; readonly w: number } | null>(null);

  /** Width the outline may take: the stage's content box (phones: the full screen width) minus the handle. */
  const available = () => {
    const el = stage.current;
    if (!el) return Infinity;
    const cs = globalThis.getComputedStyle?.(el);
    const pad = cs ? (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) : 0;
    const w = el.clientWidth - pad;
    return w > 0 ? w - HANDLE_ROOM : Infinity;
  };
  const apply = (w: number) => setWidth(clampWidth(w, edge, available()));

  // Mount, before the first paint: measure the stage, start with the edge that fits (phones: the short one) and fit the
  // outline into it — one decision with one edge, so a saved value is never re-clamped for the other edge and phones never
  // see the long-edge outline jump. Afterwards keep the outline inside the stage when the window shrinks.
  useLayoutEffect(() => {
    const start = initialOutline(available(), saved);
    edgeRef.current = start.edge;
    setEdge(start.edge);
    setWidth(start.width);
    const fit = () => setWidth((w) => clampWidth(w, edgeRef.current, available()));
    globalThis.addEventListener('resize', fit);
    return () => globalThis.removeEventListener('resize', fit);
  }, []);

  const ppm = pxPerMmFromWidth(width, edge);
  const dirty = saved == null || Math.abs(ppm - saved) >= 0.001;
  const edgeMm = CARD_MM[edge];
  const edgeText = (lang === 'es' ? edgeMm.toFixed(2).replace('.', ',') : edgeMm.toFixed(2)) + ' mm';
  const valueText = tsh('calValue', { v: formatPxPerMm(ppm, lang) });

  const changeEdge = (e: CardEdge) => {
    setEdge(e);
    setWidth(clampWidth(widthForPxPerMm(ppm, e), e, available()));
  };

  return (
    <div class="cal">
      <p class="cal-how">{tsh('calHow')}</p>
      <p class="set-row__hint">{tsh('calNarrow')}</p>

      <div class="cal-top">
        <div class="cal-controls">
          <div class="cal-field">
            <span class="set-row__label" id="cal-edge-label">
              {tsh('calEdge')}
            </span>
            <Segmented<CardEdge>
              size="sm"
              value={edge}
              ariaLabel={tsh('calEdge')}
              options={[
                { value: 'long', label: tsh('calEdgeLong') },
                { value: 'short', label: tsh('calEdgeShort') },
              ]}
              onChange={changeEdge}
            />
          </div>
          <p class="cal-readout tabular" aria-live="off">
            {valueText}
          </p>
          <div class="cal-actions">
            <Btn tone="primary" size="sm" icon="check" disabled={!dirty} onClick={() => updateViewer({ pxPerMm: ppm })}>
              {tsh('calSave')}
            </Btn>
            <Btn
              size="sm"
              icon="refresh"
              disabled={saved == null}
              onClick={() => {
                updateViewer({ pxPerMm: null });
                setWidth(clampWidth(widthForPxPerMm(DEFAULT_PX_PER_MM, edge), edge, available()));
              }}
            >
              {tsh('calReset')}
            </Btn>
          </div>
          <p class="cal-status" role="status">
            {saved != null ? tsh('calStatusSaved', { v: formatPxPerMm(saved, lang) }) : tsh('calStatusFit')}
          </p>
          <p class="set-row__hint">
            {tsh('calKeys')} {tsh('calZoom')}
          </p>
        </div>

        {/* fixed-size box (the figure at the maximum px/mm): dragging must not move the card outline below */}
        <figure class="cal-check" style={{ width: `${CHECK_BOX_PX.w}px` }}>
          <figcaption class="set-row__hint">{tsh('calCheck')}</figcaption>
          <div class="cal-check__box" style={{ height: `${CHECK_BOX_PX.h}px` }}>
            <svg width={CHECK_MM.w * ppm} height={CHECK_MM.h * ppm} viewBox={`0 0 ${CHECK_MM.w} ${CHECK_MM.h}`} aria-hidden="true">
              <rect class="paper-bg" x="0" y="0" width={CHECK_MM.w} height={CHECK_MM.h} />
              {Array.from({ length: CHECK_MM.w + 1 }, (_, i) => (
                <line class={i % 5 === 0 ? 'paper-major' : 'paper-minor'} x1={i} y1={0} x2={i} y2={CHECK_MM.h} />
              ))}
              {Array.from({ length: CHECK_MM.h + 1 }, (_, i) => (
                <line class={i % 5 === 0 ? 'paper-major' : 'paper-minor'} x1={0} y1={i} x2={CHECK_MM.w} y2={i} />
              ))}
              <rect class="paper-frame" x="0" y="0" width={CHECK_MM.w} height={CHECK_MM.h} />
            </svg>
          </div>
        </figure>
      </div>

      <div class="cal-stage" ref={stage}>
        <div
          class="cal-card"
          style={{ width: `${width}px`, height: `${outlineHeight(width, edge)}px`, borderRadius: `${CARD_CORNER_MM * ppm}px` }}
        >
          <span class="cal-card__dim tabular">{edgeText}</span>
          <div
            class="cal-handle"
            role="slider"
            tabIndex={0}
            aria-label={tsh('calHandle')}
            aria-orientation="horizontal"
            aria-valuemin={Math.round(MIN_PX_PER_MM * edgeMm)}
            aria-valuemax={Math.round(MAX_PX_PER_MM * edgeMm)}
            aria-valuenow={Math.round(width)}
            aria-valuetext={valueText}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, w: width };
            }}
            onPointerMove={(e) => {
              if (drag.current) apply(drag.current.w + e.clientX - drag.current.x);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = keyStep(e.key, e.shiftKey);
              if (step !== 0) {
                e.preventDefault();
                apply(width + step);
              }
            }}
          >
            <Icon name="calipers" size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
