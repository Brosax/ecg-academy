/**
 * The assistant UI: a floating button (bottom-right, above the phone tab bar) that opens a NON-modal panel — the
 * learner keeps the ECG in view while reading the answer. Panel: a context line (which page the assistant knows
 * about), the messages (Markdown rendered to VNodes), suggestion chips, the composer (Enter sends, Shift+Enter breaks
 * a line, IME composition is respected) and a settings view (provider, key, base URL, model, remember). Selecting
 * text in the page shows an "ask AI about this" bubble. Esc closes the panel and returns focus to the button.
 * Layout stability: status lines and the context line have reserved heights; no looping animation.
 * Styles: assistant.css (theme tokens only).
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { route } from '../app/router';
import { store } from '../app/store';
import { tai } from '../i18n/assistant';
import { tc } from '../i18n/common';
import { Icon, Segmented, type IconName } from '../ui';
import type { AssistantErrorCode, AssistantSettings, ProviderId } from './api';
import { pageContext, type ContextKind } from './context';
import { Markdown } from './MarkdownView';
import { cleanKey, DEFAULT_BASE_URL, DEFAULT_MODEL, isConfigured, isValidBaseUrl, isValidKey } from './settings';
import {
  assistant,
  checkServer,
  clearConversation,
  closeAssistant,
  configured,
  openAssistant,
  sendMessage,
  showChat,
  showSettings,
  stopGeneration,
  testConnection,
  updateAssistantSettings,
  type AssistantKey,
  type ChatMessage,
  type ConnectionTest,
} from './store';
import './assistant.css';

/** Suggestion chips per page kind (dictionary keys). */
export const CHIPS: Readonly<Record<ContextKind, readonly AssistantKey[]>> = {
  general: ['chipGeneral1', 'chipGeneral2', 'chipGeneral3'],
  lab: ['chipGeneral1', 'chipGeneral2', 'chipGeneral3'],
  lesson: ['chipLesson1', 'chipLesson2', 'chipLesson3'],
  finding: ['chipFinding1', 'chipFinding2', 'chipFinding3'],
  case: ['chipCase1', 'chipCase2', 'chipCase3'],
  drill: ['chipDrill1', 'chipDrill2', 'chipDrill3'],
};

const ERROR_KEY: Readonly<Record<AssistantErrorCode, AssistantKey>> = {
  auth: 'errAuth',
  network: 'errNetwork',
  rate: 'errRate',
  request: 'errRequest',
  server: 'errServer',
  aborted: 'stopped',
  unknown: 'errUnknown',
};

export function errorText(code: AssistantErrorCode, detail: string): string {
  return tai(ERROR_KEY[code], { msg: detail || '—' });
}

/** Phone layout up to this width; keep in sync with assistant.css and shell.css. */
const PHONE_MAX_PX = 760;

function SparkIcon(props: { readonly size?: number }) {
  const s = props.size ?? 22;
  return (
    <svg class="ui-icon" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 3l2 5.6 5.6 2-5.6 2L11 18.2 9 12.6 3.4 10.6 9 8.6z" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  );
}

/** Return focus to the button once it is rendered again (a timeout, not rAF: it also fires in a background tab). */
function focusFab(): void {
  setTimeout(() => document.querySelector<HTMLElement>('.ai-fab')?.focus(), 0);
}

export function AssistantDock() {
  const open = assistant.open.value;
  return (
    <div class="ai-root">
      {open ? <Panel /> : <Fab />}
      <SelectionAsk />
    </div>
  );
}

function Fab() {
  const label = tai('fabOpen');
  return (
    <button type="button" class="ai-fab" aria-label={label} title={label} aria-haspopup="dialog" onClick={() => openAssistant()}>
      <SparkIcon />
    </button>
  );
}

function IconButton(props: { readonly label: string; readonly icon: IconName; readonly onClick: () => void; readonly disabled?: boolean }) {
  return (
    <button type="button" class="ui-icon-btn" aria-label={props.label} title={props.label} disabled={props.disabled} onClick={props.onClick}>
      <Icon name={props.icon} />
    </button>
  );
}

function Panel() {
  const view = assistant.view.value;
  const busy = assistant.busy.value;
  const empty = assistant.messages.value.length === 0;
  const close = (): void => {
    closeAssistant();
    focusFab();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAssistant();
        focusFab();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <section class="ai-panel" role="dialog" aria-modal="false" aria-labelledby="ai-title">
      <header class="ai-head">
        <h2 id="ai-title" class="ai-title">
          <SparkIcon size={18} />
          <span>{tai('title')}</span>
        </h2>
        <div class="ai-head__tools">
          {view === 'chat' ? (
            <>
              <IconButton label={tai('newChat')} icon="refresh" disabled={empty && !busy} onClick={clearConversation} />
              <IconButton label={tai('settings')} icon="settings" onClick={showSettings} />
            </>
          ) : (
            <IconButton label={tai('backToChat')} icon="prev" onClick={showChat} />
          )}
          <IconButton label={tc('close')} icon="close" onClick={close} />
        </div>
      </header>
      {view === 'chat' ? (
        <Chat />
      ) : (
        <div class="ai-settings-wrap">
          <AssistantSettingsForm onSaved={showChat} />
        </div>
      )}
    </section>
  );
}

function Chat() {
  const msgs = assistant.messages.value;
  const busy = assistant.busy.value;
  const ctx = pageContext(route.value, store.lang.value);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  // follow the stream while the learner is at the bottom; stop following once they scroll up to re-read
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  });
  const onScroll = (): void => {
    const el = list.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  const last = msgs[msgs.length - 1];
  return (
    <>
      <p class="ai-context">{ctx.title ? tai('ctxLabel', { title: ctx.title }) : tai('ctxNone')}</p>
      <div class="ai-msgs" ref={list} onScroll={onScroll} aria-busy={busy}>
        {msgs.length === 0 ? <Empty kind={ctx.kind} /> : msgs.map((m) => <Message key={m.id} m={m} live={m === last} />)}
      </div>
      <Composer />
      <p class="ai-foot">{tai('disclaimer')}</p>
    </>
  );
}

function Empty(props: { readonly kind: ContextKind }) {
  const ok = configured.value;
  const viaServer = assistant.settings.value.provider === 'server';
  const srv = assistant.server.value.status;
  const checking = viaServer && (srv === 'unknown' || srv === 'checking');
  const text = ok ? tai('intro') : checking ? tai('serverChecking') : viaServer ? tai('serverOff') : tai('introUnconfigured');
  return (
    <div class="ai-empty">
      <p class="ai-empty__text">{text}</p>
      {checking && !ok ? null : ok ? (
        <div class="ai-chips">
          {CHIPS[props.kind].map((k) => (
            <button key={k} type="button" class="ai-chip" onClick={() => void sendMessage(tai(k))}>
              {tai(k)}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" onClick={showSettings}>
            <Icon name="settings" />
            <span>{tai('setupButton')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Message(props: { readonly m: ChatMessage; readonly live: boolean }) {
  const { m } = props;
  if (m.role === 'user') {
    return (
      <div class="ai-msg ai-msg--user">
        <div class="ai-msg__bubble">
          <p class="ai-msg__text">{m.content}</p>
        </div>
      </div>
    );
  }
  const showBubble = m.content !== '' || m.status === 'streaming';
  return (
    <div class="ai-msg ai-msg--assistant">
      {showBubble && (
        <div class="ai-msg__bubble">
          {m.content !== '' ? (
            <Markdown text={m.content} />
          ) : (
            <span class="ai-dots" aria-hidden="true">
              ···
            </span>
          )}
        </div>
      )}
      <MessageStatus m={m} live={props.live} />
    </div>
  );
}

function MessageStatus(props: { readonly m: ChatMessage; readonly live: boolean }) {
  const { m } = props;
  let text = '';
  let err = false;
  switch (m.status) {
    case 'streaming':
      text = tai('generating');
      break;
    case 'stopped':
      text = tai('stopped');
      break;
    case 'truncated':
      text = tai('truncated');
      break;
    case 'refused':
      text = tai('refused');
      break;
    case 'error':
      text = m.error ? errorText(m.error.code, m.error.detail) : tai('errUnknown', { msg: '—' });
      err = true;
      break;
    default:
      break;
  }
  return (
    <p class={`ai-msg__status${err ? ' ai-msg__status--err' : ''}`} role={props.live ? 'status' : undefined}>
      {text}
    </p>
  );
}

function Composer() {
  const busy = assistant.busy.value;
  const draft = assistant.draft.value;
  const notice = assistant.notice.value;
  const ta = useRef<HTMLTextAreaElement>(null);
  // focus the input on open — not on phones, where that would pop the keyboard over the panel
  useEffect(() => {
    if (globalThis.matchMedia?.(`(min-width: ${PHONE_MAX_PX + 1}px)`).matches) ta.current?.focus();
  }, []);
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);
  const submit = (): void => {
    const t = draft.trim();
    if (t === '' || busy) return;
    assistant.draft.value = '';
    void sendMessage(t);
  };
  return (
    <form
      class="ai-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p class="ai-notice" role="status">
        {notice ? tai(notice) : ''}
      </p>
      <div class="ai-composer__row">
        <textarea
          ref={ta}
          class="ai-input"
          rows={1}
          value={draft}
          placeholder={tai('placeholder')}
          aria-label={tai('inputLabel')}
          onInput={(e) => (assistant.draft.value = e.currentTarget.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter breaks a line; an Enter that commits an IME composition (zh / es dead keys) does neither
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <button type="button" class="ui-btn ui-btn--default ui-btn--md ai-send" onClick={stopGeneration}>
            <Icon name="pause" />
            <span>{tai('stop')}</span>
          </button>
        ) : (
          <button type="submit" class="ui-btn ui-btn--primary ui-btn--md ai-send" disabled={draft.trim() === ''}>
            <Icon name="next" />
            <span>{tai('send')}</span>
          </button>
        )}
      </div>
    </form>
  );
}

/** Provider / key / base URL / model / remember. Used inside the panel and on the settings page. */
export function AssistantSettingsForm(props: { readonly onSaved?: () => void }) {
  const saved = assistant.settings.value;
  const [draft, setDraft] = useState<AssistantSettings>(saved);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<'idle' | 'testing' | ConnectionTest>('idle');
  const [flash, setFlash] = useState(false);
  const idp = useId();
  useEffect(() => setDraft(saved), [saved]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  const set = (patch: Partial<AssistantSettings>): void => setDraft((d) => ({ ...d, ...patch }));
  const dirty =
    draft.provider !== saved.provider ||
    draft.apiKey.trim() !== saved.apiKey ||
    draft.baseUrl.trim() !== saved.baseUrl ||
    draft.model.trim() !== saved.model ||
    draft.remember !== saved.remember;
  const urlOk = isValidBaseUrl(draft.baseUrl);
  const keyOk = isValidKey(draft.apiKey);
  const p = draft.provider;
  const save = (): void => {
    updateAssistantSettings(draft);
    setFlash(true);
    props.onSaved?.();
  };
  const runTest = async (): Promise<void> => {
    setTest('testing');
    setTest(await testConnection(draft));
  };

  let status = '';
  let tone = '';
  if (flash) {
    status = tai('saved');
    tone = 'ok';
  } else if (test === 'testing') {
    status = tai('testing');
  } else if (test !== 'idle') {
    if (test.ok) {
      status = tai('testOk', { model: test.model });
      tone = 'ok';
    } else {
      status = tai('testFail', { msg: errorText(test.error.code, test.error.detail) });
      tone = 'err';
    }
  }

  return (
    <div class="ai-settings">
      <div class="ai-field">
        <span class="ai-field__label">{tai('setProvider')}</span>
        <Segmented<ProviderId>
          size="sm"
          value={p}
          ariaLabel={tai('setProvider')}
          options={[
            { value: 'server', label: tai('provServer') },
            { value: 'anthropic', label: 'Anthropic · Claude' },
            { value: 'openai', label: tai('provOpenai') },
          ]}
          onChange={(v) => set({ provider: v })}
        />
      </div>

      {p === 'server' ? (
        <ServerStatus />
      ) : (
      <>
      <div class="ai-field">
        <label class="ai-field__label" for={`${idp}-key`}>
          {tai('setKey')}
        </label>
        <div class="ai-field__row">
          <input
            id={`${idp}-key`}
            class="ai-text"
            type={showKey ? 'text' : 'password'}
            value={draft.apiKey}
            autocomplete="off"
            spellcheck={false}
            aria-invalid={!keyOk}
            onInput={(e) => set({ apiKey: cleanKey(e.currentTarget.value) })}
          />
          <button type="button" class="ui-icon-btn" aria-label={showKey ? tai('hideKey') : tai('showKey')} aria-pressed={showKey} onClick={() => setShowKey(!showKey)}>
            <Icon name="eye" />
          </button>
        </div>
        <p class={`ai-field__hint${keyOk ? '' : ' ai-field__hint--err'}`}>{keyOk ? tai('setKeyHint') : tai('setKeyInvalid')}</p>
      </div>

      <div class="ai-field">
        <label class="ai-field__label" for={`${idp}-url`}>
          {tai('setBaseUrl')}
        </label>
        <input
          id={`${idp}-url`}
          class="ai-text"
          type="text"
          inputMode="url"
          value={draft.baseUrl}
          placeholder={DEFAULT_BASE_URL[p]}
          autocomplete="off"
          spellcheck={false}
          aria-invalid={!urlOk}
          onInput={(e) => set({ baseUrl: e.currentTarget.value })}
        />
        <p class={`ai-field__hint${urlOk ? '' : ' ai-field__hint--err'}`}>
          {urlOk ? tai(p === 'anthropic' ? 'setBaseUrlHintAnthropic' : 'setBaseUrlHintOpenai') : tai('setBaseUrlInvalid')}
        </p>
      </div>

      <div class="ai-field">
        <label class="ai-field__label" for={`${idp}-model`}>
          {tai('setModel')}
        </label>
        <input
          id={`${idp}-model`}
          class="ai-text"
          type="text"
          value={draft.model}
          placeholder={p === 'anthropic' ? DEFAULT_MODEL.anthropic : tai('setModelPlaceholder')}
          autocomplete="off"
          spellcheck={false}
          onInput={(e) => set({ model: e.currentTarget.value })}
        />
        <p class="ai-field__hint">{p === 'anthropic' ? tai('setModelHintAnthropic', { model: DEFAULT_MODEL.anthropic }) : tai('setModelHintOpenai')}</p>
      </div>

      <div class="ai-field ai-field--switch">
        <div>
          <label class="ai-field__label" for={`${idp}-remember`}>
            {tai('setRemember')}
          </label>
          <p class="ai-field__hint">{tai('setRememberHint')}</p>
        </div>
        <input id={`${idp}-remember`} type="checkbox" role="switch" class="ai-switch" checked={draft.remember} onChange={(e) => set({ remember: e.currentTarget.checked })} />
      </div>
      </>
      )}

      <div class="ai-settings__actions">
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" disabled={!dirty || !urlOk || !keyOk} onClick={save}>
          <Icon name="check" />
          <span>{tai('save')}</span>
        </button>
        <button type="button" class="ui-btn ui-btn--default ui-btn--sm" disabled={test === 'testing' || (p !== 'server' && !isConfigured(draft))} onClick={() => void runTest()}>
          <Icon name="bolt" />
          <span>{tai('test')}</span>
        </button>
      </div>
      <p class={`ai-settings__status${tone ? ` ai-settings__status--${tone}` : ''}`} role="status">
        {status}
      </p>
    </div>
  );
}

/** The site's own endpoint: whether it is there, and which model it uses. */
function ServerStatus() {
  const s = assistant.server.value;
  useEffect(() => {
    void checkServer();
  }, []);
  const text = s.status === 'ready' ? tai('serverReady', { model: s.model || '—' }) : s.status === 'off' ? tai('serverOff') : tai('serverChecking');
  return (
    <div class="ai-field">
      <p class={`ai-server ai-server--${s.status}`} role="status">
        {text}
      </p>
    </div>
  );
}

interface SelectionHit {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly below: boolean;
}

/** "Ask AI about this": a bubble over a text selection inside the page (not inside inputs or the panel itself). */
function SelectionAsk() {
  const [hit, setHit] = useState<SelectionHit | null>(null);
  const pageKey = route.value;
  useEffect(() => setHit(null), [pageKey]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = (): void => {
      timer = null;
      const sel = document.getSelection();
      // collapse whitespace and drop quotation marks the selection may have swept in with the term
      const text = (sel?.toString() ?? '').replace(/\s+/g, ' ').trim().replace(/^[“”"'«»「」『』]+|[“”"'«»「」『』]+$/g, '').trim();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || text.length < 2 || text.length > 160) {
        setHit(null);
        return;
      }
      const node = sel.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      const main = document.getElementById('main');
      if (!el || !main?.contains(el) || el.closest('.ai-root, input, textarea, select, [contenteditable]')) {
        setHit(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      // nothing drawn, or the selection scrolled out of view (below the header, above the bottom edge)
      if ((r.width === 0 && r.height === 0) || r.bottom < 56 || r.top > window.innerHeight - 8) {
        setHit(null);
        return;
      }
      const below = r.top < 104;
      const half = Math.min(170, window.innerWidth / 2 - 8);
      const x = Math.min(Math.max(half, r.left + r.width / 2), window.innerWidth - half);
      setHit({ text, x, y: below ? r.bottom : r.top, below });
    };
    const schedule = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, 180);
    };
    // scrolling (the page or any inner scroller) and resizing move the selection: the bubble follows it
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (timer) clearTimeout(timer);
    };
  }, []);
  if (!hit) return null;
  const short = hit.text.length > 28 ? `${hit.text.slice(0, 27)}…` : hit.text;
  return (
    <button
      type="button"
      class={`ai-selask${hit.below ? ' ai-selask--below' : ''}`}
      style={{ left: `${hit.x}px`, top: `${hit.y}px` }}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => {
        const question = tai('askTemplate', { term: hit.text });
        setHit(null);
        document.getSelection()?.removeAllRanges();
        openAssistant({ prefill: question, send: true });
      }}
    >
      <SparkIcon size={14} />
      <span>{tai('selAsk', { term: short })}</span>
    </button>
  );
}
