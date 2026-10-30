/**
 * Shell slot components: ReviewsDueCard (home "reviews due today", content only — the shell draws the frame) and
 * ProgressDataControls (settings: export / import / reset of the learning record).
 */
import { useRef, useState } from 'preact/hooks';
import { href } from '../../app/router';
import { tp } from '../../i18n/practice';
import { Button, Dialog, Icon } from '../../ui/index';
import { dueReviews, exportProgress, importProgress, progressVersion, resetProgress } from '../core/progress';

export function ReviewsDueCard() {
  void progressVersion.value; // re-render after every write
  const n = dueReviews(Date.now()).length;
  return (
    <>
      <h3 class="home-slot__title">
        <Icon name="refresh" />
        {tp('homeReviewsTitle')}
      </h3>
      <p class="home-slot__text tabular">{n > 0 ? tp('homeReviewsDue', { n }) : tp('homeReviewsNone')}</p>
      <a class="home-slot__action" href={n > 0 ? href({ name: 'drill', id: 'review' }) : href({ name: 'practice' })}>
        {n > 0 ? tp('homeReviewsStart') : tp('homePractice')}
        <Icon name="next" size={16} />
      </a>
    </>
  );
}

function today(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ProgressDataControls() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const doExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecg-academy-progress-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const text = await f.text();
    const ok = importProgress(text);
    setMsg({ ok, text: ok ? tp('imported') : tp('importFailed') });
  };
  return (
    <div class="pr-data">
      <p class="app-muted">{tp('dataLead')}</p>
      <div class="pr-actions">
        <Button size="sm" icon="external" onClick={doExport}>
          {tp('exportBtn')}
        </Button>
        <Button size="sm" icon="refresh" onClick={() => file.current?.click()}>
          {tp('importBtn')}
        </Button>
        <Button size="sm" tone="danger" onClick={() => setConfirm(true)}>
          {tp('resetBtn')}
        </Button>
        <input ref={file} type="file" accept="application/json,.json" class="app-sr" tabIndex={-1} aria-hidden="true" onChange={onFile} />
      </div>
      <p class={`pr-data__msg ${msg ? (msg.ok ? 'is-ok' : 'is-err') : ''}`} role="status" aria-live="polite">
        {msg?.text ?? ''}
      </p>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={tp('resetBtn')}>
        <p>{tp('resetConfirm')}</p>
        <div class="pr-actions">
          <Button
            tone="danger"
            onClick={() => {
              resetProgress();
              setConfirm(false);
              setMsg({ ok: true, text: '' });
            }}
          >
            {tp('resetDo')}
          </Button>
          <Button tone="ghost" onClick={() => setConfirm(false)}>
            {tp('cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
