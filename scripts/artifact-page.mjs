// Turns the single-file build (dist/index.html) into an Artifact page body: the publisher wraps the page in its own
// <!doctype html><head><body> skeleton, so our document tags are dropped and <title> + styles come first.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(dist + 'index.html', 'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0];
const styles = html.match(/<style>[\s\S]*?<\/style>/g) ?? [];
const scripts = html.match(/<script type="module">[\s\S]*?<\/script>/g) ?? [];
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '';
const bodyNoScripts = body.replace(/<script[\s\S]*?<\/script>/g, '').trim();
if (!title || scripts.length !== 1 || !bodyNoScripts.includes('id="app"')) {
  console.error('artifact-page: unexpected build layout', { title: !!title, scripts: scripts.length });
  process.exit(1);
}
const page = [title, ...styles, bodyNoScripts, ...scripts].join('\n');
if (page.indexOf('<title>') > 8192) throw new Error('title must be within the first 8 KB');
writeFileSync(dist + 'artifact.html', page);
console.log(`artifact-page: ${dist}artifact.html (${(page.length / 1024).toFixed(0)} KB)`);
