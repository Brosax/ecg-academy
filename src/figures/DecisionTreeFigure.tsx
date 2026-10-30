/**
 * Step-by-step decision tree: one question at a time with answer buttons, a breadcrumb of the answers given (each one
 * clickable to go back), and a conclusion card with its findings. Content: src/figures/trees (inline zh/en/es, cited).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { href } from '../app/router';
import { FINDINGS } from '../core/findings';
import { lt } from '../i18n/index';
import { tc } from '../i18n/common';
import { tf } from '../i18n/figures';
import { Icon } from '../ui/index';
import { TREES, type DecisionTree } from './trees/index';
import { FigureFrame } from './shared';

interface Step {
  readonly node: string;
  readonly choice: number;
}

export function DecisionTreeFigure(props: { readonly params?: FigureParams['decision-tree'] }) {
  const tree: DecisionTree = TREES[props.params?.tree ?? 'narrow-tachy'];
  const [path, setPath] = useState<Step[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => setPath([]), [tree.id]);

  const current = path.length ? (() => {
    const last = path[path.length - 1];
    const n = tree.nodes[last.node];
    return n.kind === 'question' ? n.options[last.choice].next : last.node;
  })() : tree.root;
  const node = tree.nodes[current];

  // move focus to the new question / result for keyboard and screen-reader users (not on first render)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    cardRef.current?.focus();
  }, [path.length]);

  const answer = (i: number) => setPath([...path, { node: current, choice: i }]);

  return (
    <FigureFrame id="decision-tree" title={lt(tree.title)}>
      <p class="fg-dt-intro">{lt(tree.intro)}</p>
      <ol class="fg-crumbs" aria-label={tf('dtPath')}>
        {path.map((s, i) => {
          const n = tree.nodes[s.node];
          if (n.kind !== 'question') return null;
          return (
            <li>
              <button type="button" class="fg-crumb" onClick={() => setPath(path.slice(0, i))} title={tf('dtGoBack')}>
                <span class="fg-crumb__q">{lt(n.text)}</span>
                <span class="fg-crumb__a">→ {lt(n.options[s.choice].label)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div class={`fg-dt-card ${node.kind === 'leaf' ? `fg-dt-card--leaf fg-tone--${node.tone}` : ''}`} ref={cardRef} tabIndex={-1} aria-live="polite">
        {node.kind === 'question' ? (
          <>
            <div class="fg-dt-step tabular">{tf('dtStep', { n: path.length + 1 })}</div>
            <div class="fg-dt-q">{lt(node.text)}</div>
            {node.help && (
              <div class="fg-dt-help">
                <Icon name="info" size={16} /> {lt(node.help)}
              </div>
            )}
            <div class="fg-dt-options">
              {node.options.map((o, i) => (
                <button type="button" class="fg-dt-option" onClick={() => answer(i)}>
                  <span class="fg-dt-option__n tabular">{i + 1}</span>
                  <span>{lt(o.label)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div class="fg-dt-step">
              <span class={`fg-pill fg-pill--tone-${node.tone}`}>{tf(`tone_${node.tone}`)}</span> {tf('dtResult')}
            </div>
            <div class="fg-dt-title">{lt(node.title)}</div>
            <p class="fg-dt-text">{lt(node.text)}</p>
            {node.findings && node.findings.length > 0 && (
              <div class="fg-dt-findings">
                <span class="fg-muted">{tf('dtFindings')}:</span>
                {node.findings.map((f) => (
                  <a class="fg-finding" href={href({ name: 'finding', id: f })}>
                    {lt(FINDINGS[f].name)}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div class="fg-dt-nav">
        <button type="button" class="fg-btn" disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>
          <Icon name="prev" size={16} /> {tc('back')}
        </button>
        <button type="button" class="fg-btn" disabled={!path.length} onClick={() => setPath([])}>
          <Icon name="refresh" size={16} /> {tc('restart')}
        </button>
      </div>

      <details class="fg-sources">
        <summary>{tf('dtSources')}</summary>
        <ul>
          {tree.sources.map((s) => (
            <li>{s}</li>
          ))}
        </ul>
      </details>
    </FigureFrame>
  );
}
