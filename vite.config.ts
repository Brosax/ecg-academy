/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { ASSISTANT_PATH, handleAssistant, type AssistantEnv } from './server/assistant';

/**
 * `npm run dev` serves the assistant endpoint too (server/assistant.ts), with the key from `.env.local`
 * (ANTHROPIC_API_KEY=…; never committed). Node request → web Request → Response streamed back.
 */
function assistantDevEndpoint(env: AssistantEnv): Plugin {
  return {
    name: 'ecg-academy-assistant',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || req.url.split('?')[0] !== ASSISTANT_PATH) return next();
        try {
          const ac = new AbortController();
          res.on('close', () => {
            if (!res.writableEnded) ac.abort();
          });
          const chunks: Uint8Array[] = [];
          if (req.method === 'POST') for await (const c of req) chunks.push(c as Uint8Array);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v);
            else if (Array.isArray(v)) headers.set(k, v.join(', '));
          }
          const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
            method: req.method,
            headers,
            body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
            signal: ac.signal,
          });
          const response = await handleAssistant(request, env);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

// Single-file build: no code splitting; scripts/inline-single-file.mjs inlines JS/CSS afterwards.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [
      assistantDevEndpoint({
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        ASSISTANT_MODEL: env.ASSISTANT_MODEL,
        ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
        ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
      }),
    ],
    oxc: {
      jsx: { runtime: 'automatic', importSource: 'preact' },
    },
    build: {
      target: 'es2022',
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
      rolldownOptions: {
        output: { codeSplitting: false },
      },
    },
    test: {
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/out/**', 'node_modules/**'],
      environment: 'node',
      testTimeout: 120_000,
      // engine builds on the realistic heart run in beforeAll hooks; parallel load can exceed the 10 s default
      hookTimeout: 120_000,
    },
  };
});
