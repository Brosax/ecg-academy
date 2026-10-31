/**
 * DrillRunner — a sequence of generated items (lesson mini-drills and the drill page body): item → answer → feedback →
 * next, with a fixed progress bar and a session summary (mean score, pass, missed critical findings). The next item is
 * generated in the background while the learner works on the current one. A family that cannot produce an item (e.g.
 * the synthetic engine is not ready) is skipped after a few seeded retries.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { hashString } from '../../core/rng';
import { tc } from '../../i18n/common';
import { tp } from '../../i18n/practice';
import { Button, Feedback, Icon } from '../../ui/index';
import type { DrillRunnerProps, Item } from '../api';
import type { PlanEntry } from '../core/adaptive';
import { getSpec } from '../core/families';
import { generateItem } from '../core/generate';
import { ItemPlayerCore } from './ItemPlayer';

let sessions = 0;
/** A fresh base seed for an unseeded session (items stay reproducible from their ids). */
export function freshSeed(salt: string): number {
  sessions += 1;
  return hashString(`${salt}:${Date.now()}:${sessions}`) % 2_000_000_000;
}

export interface DrillRunnerInternalProps extends DrillRunnerProps {
  /** explicit plan (adaptive mix, reviews) instead of cycling the families */
  readonly plan?: readonly PlanEntry[];
  readonly collectConfidence?: boolean;
}

interface Result {
  readonly score: number;
  readonly missedCritical: boolean;
}

function entryAt(props: DrillRunnerInternalProps, base: number, i: number): PlanEntry | null {
  if (props.plan) return props.plan[i] ?? null;
  if (props.families.length === 0) return null;
  const fam = props.families[i % props.families.length];
  const spec = getSpec(fam);
  const d = props.difficulty && spec?.difficulties.includes(props.difficulty) ? props.difficulty : (spec?.difficulties[0] ?? 'classic');
  return { family: fam, difficulty: d, seed: (base + i * 7919) % 2_147_483_647 };
}

/** Generate an entry's item; on failure retry other seeds, then the other families of the session. */
async function generateEntry(props: DrillRunnerInternalProps, e: PlanEntry): Promise<Item> {
  let last: unknown = null;
  const fams = [e.family, ...props.families.filter((f) => f !== e.family)];
  for (const fam of fams.slice(0, 4)) {
    for (let k = 0; k < 2; k++) {
      try {
        return await generateItem(fam, e.seed + k * 104_729, fam === e.family ? e.difficulty : props.difficulty, {
          ...(e.focus ? { focus: e.focus } : {}),
          ...(props.topic && fam === e.family ? { topic: props.topic } : {}),
        });
      } catch (err) {
        last = err;
      }
    }
  }
  throw last ?? new Error('no item');
}

export function DrillRunner(props: DrillRunnerInternalProps) {
  const [base, setBase] = useState(() => props.seed ?? freshSeed(props.families.join(',')));
  const count = props.plan ? props.plan.length : props.count;
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [round, setRound] = useState(0);
  const cache = useRef(new Map<number, Promise<Item>>());
  const done = i >= count;
  const passScore = props.passScore ?? 0.8;

  const get = (k: number): Promise<Item> | null => {
    const e = entryAt(props, base, k);
    if (!e) return null;
    let p = cache.current.get(k);
    if (!p) {
      p = generateEntry(props, e);
      p.catch(() => undefined);
      cache.current.set(k, p);
    }
    return p;
  };

  useEffect(() => {
    if (done) return;
    let alive = true;
    setItem(null);
    setError(null);
    const p = get(i);
    if (!p) {
      setError(new Error('empty'));
      return;
    }
    p.then(
      (it) => {
        if (!alive) return;
        setItem(it);
        get(i + 1); // prefetch
      },
      (err: unknown) => alive && setError(err),
    );
    return () => {
      alive = false;
    };
  }, [i, base, round]);

  const summary = useMemo(() => {
    const n = results.length;
    const score = n ? results.reduce((a, r) => a + r.score, 0) / n : 0;
    const missedCritical = results.filter((r) => r.missedCritical).length;
    return { score, missedCritical, passed: n > 0 && score >= passScore - 1e-9 && missedCritical === 0 };
  }, [results, passScore]);

  useEffect(() => {
    if (done && results.length) props.onFinish?.(summary);
  }, [done]);

  const restart = () => {
    cache.current.clear();
    setBase((b) => (b + count * 7919 + 13) % 2_147_483_647);
    setResults([]);
    setI(0);
    setRound((r) => r + 1);
  };

  const pct = Math.round((Math.min(i, count) / Math.max(1, count)) * 100);

  return (
    <section class={`pr-runner ${props.compact ? 'pr-runner--compact' : ''}`}>
      <div class="pr-runner__bar" role="progressbar" aria-valuemin={0} aria-valuemax={count} aria-valuenow={Math.min(i, count)} aria-label={tp('itemOf', { i: Math.min(i + 1, count), n: count })}>
        <span class="pr-runner__fill" style={{ width: `${pct}%` }} />
      </div>
      {done ? (
        <div class="pr-summary">
          <h2 class="pr-h2">{tp('sessionDone')}</h2>
          <p class="pr-summary__score tabular">
            {tp('sessionScore')}: <strong>{Math.round(summary.score * 100)} %</strong>
          </p>
          <Feedback tone={summary.passed ? 'ok' : 'partial'} title={summary.passed ? tp('passed') : tp('notPassed', { n: Math.round(passScore * 100) })}>
            {summary.missedCritical > 0 && (
              <span class="pr-critical">
                <Icon name="flag" size={16} /> {tp('criticalMissed', { n: summary.missedCritical })}
              </span>
            )}
          </Feedback>
          <div class="pr-actions">
            <Button tone="primary" icon="refresh" onClick={restart}>
              {tp('again')}
            </Button>
          </div>
        </div>
      ) : item ? (
        <ItemPlayerCore
          key={`${round}:${i}:${item.id}`}
          item={item}
          compact={props.compact}
          collectConfidence={props.collectConfidence ?? false}
          counter={tp('itemOf', { i: i + 1, n: count })}
          onGraded={(g) => setResults((r) => [...r, { score: g.score, missedCritical: !!g.missedCritical }])}
          onNext={() => setI((x) => x + 1)}
        />
      ) : error ? (
        <div class="pr-runner__err" role="alert">
          <p>{props.families.some((f) => getSpec(f)?.source === 'synth') ? tp('synthUnavailable') : tp('genFailed')}</p>
          <div class="pr-actions">
            <Button icon="next" onClick={() => setI((x) => x + 1)}>
              {tc('skip')}
            </Button>
            <Button
              tone="ghost"
              icon="refresh"
              onClick={() => {
                cache.current.delete(i);
                setRound((r) => r + 1);
              }}
            >
              {tc('retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div class={`pr-ecg-ph ${props.compact ? 'pr-ecg-ph--compact' : ''}`} role="status">
          <span class="pr-ecg-ph__msg">{tp('preparing')}</span>
        </div>
      )}
    </section>
  );
}
