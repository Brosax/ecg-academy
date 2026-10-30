// Post-build: inline the bundled JS and CSS into dist/index.html so the app is one self-contained file
// (works offline by double-click and as a single-file Artifact).
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const htmlPath = join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const escScript = (s) => s.replace(/<\/script/gi, '<\/script').replace(/<!--/g, '<\!--');
const escStyle = (s) => s.replace(/<\/style/gi, '<\/style');

html = html.replace(/<script\b([^>]*?)\ssrc="\.\/(assets\/[^"]+\.js)"([^>]*)><\/script>/g, (_m, pre, src, post) => {
  const code = readFileSync(join(dist, src), 'utf8');
  const attrs = `${pre}${post}`.replace(/\scrossorigin(="[^"]*")?/g, '');
  return `<script${attrs}>${escScript(code)}</script>`;
});
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_m, href) => {
  const css = readFileSync(join(dist, href), 'utf8');
  return `<style>${escStyle(css)}</style>`;
});
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');

if (/src="\.\/assets\//.test(html) || /href="\.\/assets\/[^"]+\.(js|css)"/.test(html)) {
  console.error('inline-single-file: unresolved asset references remain');
  process.exit(1);
}
writeFileSync(htmlPath, html);
const assets = join(dist, 'assets');
if (existsSync(assets)) {
  const left = readdirSync(assets).filter((f) => !/\.(js|css)$/.test(f));
  if (left.length === 0) rmSync(assets, { recursive: true, force: true });
  else console.warn('inline-single-file: kept non-code assets:', left.join(', '));
}
console.log(`inline-single-file: ${htmlPath} (${(html.length / 1024).toFixed(0)} KB)`);
