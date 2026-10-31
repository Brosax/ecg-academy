/**
 * The assistant's server endpoint (`/api/assistant`): the site's own Claude key stays on the server, so learners use
 * the assistant without entering anything. Written on web-standard Request / Response, so the same handler runs as a
 * Cloudflare Worker (server/worker.ts), inside the Vite dev server (vite.config.ts) and on any modern runtime.
 *
 *   GET  /api/assistant  → { enabled, model }           (the panel probes this once)
 *   POST /api/assistant  { system, messages, maxTokens? } → SSE stream:
 *        data: {"t":"…"}  text delta · data: {"stop":"done"|"truncated"|"refused"} · data: {"error":{code,message}}
 *
 * Environment: ANTHROPIC_API_KEY (secret, required), ASSISTANT_MODEL (default claude-opus-5-5), ALLOWED_ORIGINS
 * (comma-separated; default = the request's own origin), ANTHROPIC_BASE_URL (testing / a relay).
 * Guard rails for a public key: the model is fixed here, request sizes and max_tokens are capped, requests must come
 * from an allowed browser origin, and each client IP gets a small per-minute budget. Claude is called through the
 * official SDK with the same model-gated parameters as the browser provider (src/assistant/providers/anthropic.ts).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AssistantErrorCode, ChatTurn, StopKind } from '../src/assistant/api';
import { buildAnthropicParams, mapAnthropicError, type ClientFactory } from '../src/assistant/providers/anthropic';
import { cleanKey, isValidKey } from '../src/assistant/settings';

export const ASSISTANT_PATH = '/api/assistant';
export const DEFAULT_SERVER_MODEL = 'claude-opus-5-5';

export interface AssistantEnv {
  readonly ANTHROPIC_API_KEY?: string;
  readonly ASSISTANT_MODEL?: string;
  readonly ALLOWED_ORIGINS?: string;
  readonly ANTHROPIC_BASE_URL?: string;
}

export const LIMITS = {
  turns: 24,
  turnChars: 8000,
  systemChars: 12000,
  totalChars: 60000,
  minTokens: 16,
  maxTokens: 4096,
  /** requests per client IP per minute (per server instance) */
  perMinute: 12,
} as const;

export interface ServerRequestBody {
  readonly system: string;
  readonly messages: readonly ChatTurn[];
  readonly maxTokens: number;
}

/** Validate a POST body; a string is the reason it was rejected. */
export function parseBody(raw: unknown): ServerRequestBody | string {
  if (typeof raw !== 'object' || raw === null) return 'body must be a JSON object';
  const r = raw as Record<string, unknown>;
  if (typeof r.system !== 'string' || r.system.length > LIMITS.systemChars) return 'invalid system';
  if (!Array.isArray(r.messages) || r.messages.length === 0 || r.messages.length > LIMITS.turns) return 'invalid messages';
  const messages: ChatTurn[] = [];
  let total = r.system.length;
  for (const [i, m] of (r.messages as unknown[]).entries()) {
    const t = (typeof m === 'object' && m !== null ? m : {}) as Record<string, unknown>;
    const role = t.role;
    if (role !== 'user' && role !== 'assistant') return `invalid role at ${i}`;
    if (typeof t.content !== 'string' || t.content.trim() === '' || t.content.length > LIMITS.turnChars) return `invalid content at ${i}`;
    if (role !== (i % 2 === 0 ? 'user' : 'assistant')) return 'turns must alternate, starting with the user';
    total += t.content.length;
    messages.push({ role, content: t.content });
  }
  if (messages[messages.length - 1].role !== 'user') return 'the last turn must be the user';
  if (total > LIMITS.totalChars) return 'request too long';
  const mt = typeof r.maxTokens === 'number' && Number.isFinite(r.maxTokens) ? Math.round(r.maxTokens) : LIMITS.maxTokens;
  return { system: r.system, messages, maxTokens: Math.min(LIMITS.maxTokens, Math.max(LIMITS.minTokens, mt)) };
}

/** Browser requests must come from an allowed origin (default: the site itself). */
export function originAllowed(request: Request, env: AssistantEnv): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  const list = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (list.length > 0) return list.includes(origin);
  return origin === new URL(request.url).origin;
}

/** A fixed-window counter per key (client IP). In-memory: it limits per server instance, which is the point. */
export function createRateLimiter(limit: number, windowMs = 60_000) {
  const hits = new Map<string, { start: number; n: number }>();
  return (key: string, now = Date.now()): boolean => {
    const h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { start: now, n: 1 });
      return true;
    }
    h.n++;
    return h.n <= limit;
  };
}

const defaultLimiter = createRateLimiter(LIMITS.perMinute);

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ?? 'local';
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

const fail = (status: number, code: AssistantErrorCode, message: string): Response => json(status, { error: { code, message } });

/**
 * An SDK failure as the browser should see it. Problems with the server's own key or region are the site's problem,
 * not the learner's: they are reported as `server`, never as `auth` (which would tell the learner to fix a key).
 */
export function serverError(e: unknown): { code: AssistantErrorCode; message: string } {
  const err = mapAnthropicError(e);
  if (err.code === 'auth' || err.code === 'network') return { code: 'server', message: 'The site’s Claude API is not reachable or not configured correctly.' };
  return { code: err.code, message: err.detail };
}

export interface HandlerDeps {
  readonly makeClient?: ClientFactory;
  readonly allow?: (key: string) => boolean;
}

export async function handleAssistant(request: Request, env: AssistantEnv, deps: HandlerDeps = {}): Promise<Response> {
  // a secret pasted into a Windows console can carry a carriage return or other invisible characters, which make the
  // x-api-key header invalid (the API front end then answers 400 with no body)
  const key = cleanKey(env.ANTHROPIC_API_KEY ?? '');
  const keyOk = key !== '' && isValidKey(key);
  const model = (env.ASSISTANT_MODEL ?? '').trim() || DEFAULT_SERVER_MODEL;

  if (request.method === 'GET') return json(200, { enabled: keyOk, model: keyOk ? model : '' });
  if (request.method !== 'POST') return fail(405, 'request', 'method not allowed');
  if (key === '') return fail(503, 'server', 'The assistant is not configured on this server.');
  if (!keyOk) return fail(503, 'server', 'The server’s API key contains invalid characters; store it again.');
  if (!originAllowed(request, env)) return fail(403, 'request', 'origin not allowed');
  if (!(deps.allow ?? defaultLimiter)(clientIp(request))) return fail(429, 'rate', 'Too many requests. Wait a minute and try again.');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(400, 'request', 'body must be JSON');
  }
  const body = parseBody(raw);
  if (typeof body === 'string') return fail(400, 'request', body);

  const make = deps.makeClient ?? ((opts) => new Anthropic(opts));
  const client = make({ apiKey: key, maxRetries: 1, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });
  const params = buildAnthropicParams(model, { system: body.system, messages: body.messages }, body.maxTokens);
  const ac = new AbortController();
  request.signal?.addEventListener('abort', () => ac.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (obj: unknown): void => {
        try {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* the client went away */
        }
      };
      try {
        const s = client.beta.messages.stream(params, { signal: ac.signal });
        s.on('text', (t) => send({ t }));
        const final = await s.finalMessage();
        const stop: StopKind = final.stop_reason === 'refusal' ? 'refused' : final.stop_reason === 'max_tokens' ? 'truncated' : 'done';
        send({ stop });
      } catch (e) {
        if (!ac.signal.aborted) {
          // for the operator (Cloudflare logs): status and request id, never the key or the conversation
          const api = e instanceof Anthropic.APIError ? e : null;
          console.error('assistant: Claude API call failed', { model, status: api?.status, requestId: api?.requestID, message: e instanceof Error ? e.message : String(e) });
          send({ error: serverError(e) });
        }
      }
      try {
        ctrl.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      ac.abort();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
