/**
 * Cloudflare Worker: serves the single-file app (dist/, static assets) and the assistant endpoint. wrangler.jsonc runs
 * this script first only for /api/*; everything else is served straight from the assets.
 * Secrets / vars: ANTHROPIC_API_KEY (`npx wrangler secret put ANTHROPIC_API_KEY`), ASSISTANT_MODEL, ALLOWED_ORIGINS.
 */
import { ASSISTANT_PATH, handleAssistant, type AssistantEnv } from './assistant';

interface Env extends AssistantEnv {
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === ASSISTANT_PATH) return handleAssistant(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
