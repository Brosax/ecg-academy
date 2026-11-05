import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { lt } from '../../i18n';
import { l, type L10n } from '../../core/l10n';

export function numberLabel(value: number, digits = 2): string {
  const rounded = Math.abs(value) < .5 * 10 ** -digits ? 0 : value;
  return new Intl.NumberFormat(lt(l('zh-CN', 'en', 'es')), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(rounded);
}

export function Diagram(p: { title: string; children: ComponentChildren; viewBox?: string; class?: string }) {
  return <div class={`fd-diagram ${p.class ?? ''}`}><svg viewBox={p.viewBox ?? '0 0 440 300'} role="img" aria-label={p.title}>{p.children}</svg></div>;
}

/** Min/max-scaled paths must share an explicit scale when they are compared. */
export function tracePath(values: readonly number[], width = 380, height = 160, scale = 60): string {
  return values.map((v, i) => `${i ? 'L' : 'M'}${(30 + i / Math.max(1, values.length - 1) * width).toFixed(2)},${(height / 2 + 38 - v * scale).toFixed(2)}`).join(' ');
}

export function Trace(p: { values: readonly number[]; label: string; progress?: number; color?: string; scale?: number; footer?: string; ghost?: readonly number[] }) {
  const id = useId();
  const progress = Math.max(0, Math.min(1, p.progress ?? 1));
  const last = Math.round(progress * Math.max(0, p.values.length - 1));
  const scale = p.scale ?? 60;
  return <Diagram title={p.label} viewBox="0 0 440 225" class="fd-trace">
    <defs><pattern id={`grid-${id}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--fd-grid)" stroke-width=".7" /></pattern><clipPath id={`clip-${id}`}><rect x="27" y="38" width={386 * progress + 3} height="160" /></clipPath></defs>
    <text x="30" y="24" class="fd-svg-label">{p.label}</text>
    <rect x="30" y="38" width="380" height="160" fill={`url(#grid-${id})`} />
    <path d="M30 118H410" class="fd-baseline" />
    {p.ghost && <path d={tracePath(p.ghost, 380, 160, scale)} class="fd-ghost-trace" />}
    <g clip-path={`url(#clip-${id})`}><path d={tracePath(p.values, 380, 160, scale)} fill="none" stroke={p.color ?? 'var(--c-vector)'} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></g>
    {p.values.length > 0 && <circle cx={30 + progress * 380} cy={118 - (p.values[last] ?? 0) * scale} r="4" fill="var(--c-highlight)" />}
    {p.footer && <text x="30" y="218" class="fd-svg-note">{p.footer}</text>}
  </Diagram>;
}

export function Choices(p: { options: readonly { id: string; label: L10n }[]; value?: string; onChoose: (id: string) => void; label?: string; disabled?: boolean }) {
  return <div class="fd-choices" role="group" aria-label={p.label}>{p.options.map(o => <button type="button" key={o.id} class={`fd-choice ${p.value === o.id ? 'is-selected' : ''}`} aria-pressed={p.value === o.id} disabled={p.disabled} onClick={() => p.onChoose(o.id)}>{lt(o.label)}</button>)}</div>;
}
