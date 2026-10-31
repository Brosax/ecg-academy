# Deploying ECG Academy to Cloudflare (with the AI assistant)

One Cloudflare Worker serves the single-file app (`dist/index.html`, static assets) and the assistant endpoint
`/api/assistant` (`server/worker.ts` → `server/assistant.ts`). The Claude API key is a Worker secret: learners never
see or enter a key. Configuration: `wrangler.jsonc`.

**Live (2026-10-31):** https://ecgacademy.xiangminf.com — Worker `ecg-academy`, custom domain set in `wrangler.jsonc`
(`routes`). The bare `xiangminf.com` is the owner's portfolio and is not touched. The old Vercel site
(`ecg-academy.vercel.app`, project folder `deploy/ecg-academy`) now only redirects there (308, path kept; the browser
keeps the `#/…` route): its content is `scripts/vercel-redirect/` (`vercel deploy --prod` from that folder's copy).

## First deployment

```bash
npx wrangler login
```

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

(paste the key when asked; it is stored encrypted by Cloudflare, never in the repository)

```bash
npm run deploy
```

`npm run deploy` builds `dist/` and uploads the Worker. Later deployments are just `npm run deploy`; the secret stays.

## Your own domain

1. Add the domain to Cloudflare (Dashboard → Add a domain) and switch the nameservers at your registrar to the two
   Cloudflare gives you. Wait until the domain shows as active.
2. Workers & Pages → `ecg-academy` → Settings → Domains & Routes → Add → Custom domain, e.g. `ecg.example.com`
   (or the bare `example.com`). Cloudflare creates the DNS record and the certificate.
3. If the app should be reachable from several hostnames that call the assistant (e.g. both `example.com` and
   `www.example.com`), list them in the `ALLOWED_ORIGINS` var (comma-separated). By default only the hostname the page
   was loaded from may call `/api/assistant`.

## Settings

| Name | Where | Default | Meaning |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | secret | — | the site's Claude key; without it the panel offers the learner's own key instead |
| `ASSISTANT_MODEL` | `vars` in `wrangler.jsonc` | `claude-opus-5-5` | the model the site uses |
| `ALLOWED_ORIGINS` | `vars` | the page's own origin | extra origins allowed to call the endpoint |

`placement.region` (`aws:us-east-1`) runs the Worker next to a US region, so calls to Claude always leave from a
supported region, whatever data centre a visitor reaches.

## Cost control

The endpoint fixes the model, caps request size and `max_tokens` (4096), accepts only same-site browser requests and
allows 12 requests per minute per IP per Worker instance. For a public site also:

- set a monthly spend limit for the key in the Anthropic Console;
- optionally add a Cloudflare rate-limiting rule for `/api/assistant` (Security → WAF → Rate limiting rules).

## Local development

- `npm run dev`: Vite serves the app and `/api/assistant`; put `ANTHROPIC_API_KEY=…` in `.env.local` (see
  `.env.example`). Without it the panel says the site has no AI service and offers the learner's own key.
- `npm run cf:dev`: builds and runs the real Worker locally (`wrangler dev`); its secrets go in `.dev.vars`.

Both files are git-ignored.
