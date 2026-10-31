/**
 * PUBLIC CONTRACT of the AI study assistant (src/assistant): an opt-in chat panel that answers the learner's questions
 * about ECG terms, criteria and mechanisms through the LLM API the learner configures (their own key, called straight
 * from the browser). It is the one runtime network exception of CLAUDE.md: nothing is sent until the learner saves a
 * key; only the question, the conversation and a short description of the current page travel — never ECG signal
 * data, never the hidden answer of a case or an exercise — and no page, grade or truth depends on it.
 */
export const PROVIDERS = ['anthropic', 'openai'] as const;
/** 'anthropic' = the Claude Messages API through @anthropic-ai/sdk; 'openai' = any OpenAI-compatible chat endpoint. */
export type ProviderId = (typeof PROVIDERS)[number];

export interface AssistantSettings {
  readonly provider: ProviderId;
  readonly apiKey: string;
  /** API origin with path prefix ('' = the provider's default); OpenAI-compatible: up to and including /v1 */
  readonly baseUrl: string;
  /** model id ('' = the provider's default; required for OpenAI-compatible endpoints, which have none) */
  readonly model: string;
  /** keep the key in localStorage (false: sessionStorage, i.e. this tab only) */
  readonly remember: boolean;
}

export type ChatRole = 'user' | 'assistant';

/** A turn sent to the API. */
export interface ChatTurn {
  readonly role: ChatRole;
  readonly content: string;
}

/** How a reply ended. */
export type StopKind = 'done' | 'truncated' | 'refused';

export interface ChatRequest {
  readonly system: string;
  readonly messages: readonly ChatTurn[];
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
  /** called with each text fragment as it streams in */
  readonly onDelta?: (text: string) => void;
}

export interface ChatResult {
  readonly text: string;
  readonly stop: StopKind;
}

export type AssistantErrorCode = 'auth' | 'network' | 'rate' | 'request' | 'server' | 'aborted' | 'unknown';

/** Every provider failure is mapped to one of these codes (the UI translates the code; `detail` is the provider's text). */
export class AssistantError extends Error {
  constructor(
    readonly code: AssistantErrorCode,
    readonly detail: string,
  ) {
    super(detail || code);
    this.name = 'AssistantError';
  }
}
