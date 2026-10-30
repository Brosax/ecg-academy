// DEV-ONLY: headless Edge (CDP) check of the Heart Lab dev mount page (src/lab/dev/index.html) — 23 checks: load,
// 3D heart + ECG render, lang/theme follow the host, shortcuts scoping, fixed-drawer containment, About dialog, skip link,
// deep link, host styles unaffected by the lab CSS, unmount/remount (listeners, scene disposal), 1366 and phone layout,
// console clean. Node 24+ (global WebSocket), no dependencies. Start the dev server first:
//   npx vite --port 5391 --strictPort --host 127.0.0.1
//   node src/lab/dev/browser-check.mjs http://127.0.0.1:5391/src/lab/dev/index.html <outDir for screenshots + results>
// Edge runs headless with SwiftShader WebGL and is closed at the end; outDir also holds its throwaway profile.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:5391/src/lab/dev/index.html';
const OUT = process.argv[3] ?? join(tmpdir(), 'heart-lab-browser-check');
const PORT = 9341;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync(OUT, { recursive: true });
const profile = join(OUT, 'edge-profile');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const edge = spawn(
  EDGE,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let ws;
let id = 0;
const pending = new Map();
const consoleMsgs = [];

function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(mid, { resolve, reject, method });
    setTimeout(() => {
      if (pending.has(mid)) {
        pending.delete(mid);
        reject(new Error(`timeout ${method}`));
      }
    }, 60000);
  });
}

async function evaluate(expr, opts = {}) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, includeCommandLineAPI: true, ...opts });
  if (r.exceptionDetails) throw new Error(`eval failed: ${expr.slice(0, 80)} → ${JSON.stringify(r.exceptionDetails).slice(0, 400)}`);
  return r.result.value;
}

async function waitFor(expr, timeoutMs = 120000, every = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(expr)) return Date.now() - t0;
    } catch {
      /* page not ready */
    }
    await sleep(every);
  }
  return -1;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
}

async function key(k, code, text, vk) {
  const kc = vk ?? (k === 'Escape' ? 27 : k === 'Enter' ? 13 : text ? text.toUpperCase().charCodeAt(0) : 0);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
}

const LISTENERS = `(() => { const c = (t) => Object.fromEntries(Object.entries(getEventListeners(t)).map(([k, v]) => [k, v.length])); return { win: c(window), doc: c(document) }; })()`;
const total = (l) => Object.values(l.win).reduce((a, b) => a + b, 0) + Object.values(l.doc).reduce((a, b) => a + b, 0);

/** Fraction of non-paper pixels in the lab's 12-lead foreground canvas (ECG traces drawn). */
const ECG_INK = `(() => {
  const cs = [...document.querySelectorAll('.lab-root canvas')].filter((c) => !c.classList.contains('hv-canvas') && c.width > 200 && c.height > 100);
  let best = 0;
  for (const c of cs) {
    const ctx = c.getContext('2d'); if (!ctx) continue;
    const d = ctx.getImageData(0, 0, c.width, c.height).data; let ink = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) ink++;
    best = Math.max(best, ink / (d.length / 16));
  }
  return { canvases: cs.length, best };
})()`;

/** Colour sample of the WebGL heart canvas via a 2D copy (preserveDrawingBuffer may be false: copy right after a render). */
const HEART = `(() => {
  const s = window.__heartScene; const c = document.querySelector('.lab-root canvas.hv-canvas');
  if (!s || !c) return { ok: false };
  s.renderer.render(s.scene, s.camera);
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.drawImage(c, 0, 0);
  const d = x.getImageData(0, 0, o.width, o.height).data; const bg = s.scene.background?.getHexString?.();
  const cnt = new Map(); for (let i = 0; i < d.length; i += 4 * 7) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  const n = [...cnt.values()].reduce((a, b) => a + b, 0); const top = Math.max(...cnt.values());
  return { ok: true, w: c.width, h: c.height, bg, distinctColours: cnt.size, nonBgShare: 1 - top / n, gl: !!s.renderer.getContext() };
})()`;

/** Computed styles of host elements (outside .lab-root). */
const HOST_STYLES = `(() => {
  const props = ['display','position','height','padding','margin','font-size','font-family','line-height','color','background-color','border','box-sizing','z-index','top'];
  const els = { html: document.documentElement, body: document.body, header: document.querySelector('.app-header'), inner: document.querySelector('.app-header__inner'),
    btn: document.querySelector('.app-header .ui-btn'), select: document.querySelector('.app-header select'), app: document.querySelector('#app > .app'), main: document.querySelector('.app-main') };
  const out = {};
  for (const [k, el] of Object.entries(els)) { if (!el) { out[k] = null; continue; } const cs = getComputedStyle(el); out[k] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])); }
  return out;
})()`;

try {
  // ---- connect
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('Edge did not expose a page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`));
      else p.resolve(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type)) {
      consoleMsgs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      consoleMsgs.push(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    } else if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
      consoleMsgs.push(`log ${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
    }
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // ---- load
  const tLoad = Date.now();
  await send('Page.navigate', { url: URL_ });
  const tReady = await waitFor(`!!document.querySelector('.lab-root .lab-app')`, 180000);
  check('lab loads (engine built, Shell rendered)', tReady >= 0, `${((Date.now() - tLoad) / 1000).toFixed(1)} s after navigation`);
  await sleep(1500);

  // host listeners baseline is taken with the lab unmounted later; first the render checks
  const heart = await evaluate(HEART);
  check('3D heart renders (WebGL canvas, not the fallback)', heart.ok && heart.gl && heart.distinctColours > 20 && heart.nonBgShare > 0.03, JSON.stringify(heart));
  check('no WebGL fallback message', !(await evaluate(`!!document.querySelector('.lab-root .hv-fallback')`)));
  const ink = await evaluate(ECG_INK);
  check('ECG canvases draw traces', ink.canvases >= 1 && ink.best > 0.002, JSON.stringify(ink));
  const t1 = await evaluate(`performance.now()`);
  const time = async () => evaluate(`document.querySelector('.lab-root .time-readout')?.textContent ?? ''`);
  const ta = await time();
  await sleep(700);
  const tb = await time();
  check('clock runs (time readout advances)', ta !== tb, `${ta} → ${tb}`);
  void t1;

  // ---- geometry
  const geo = await evaluate(`(() => { const r = document.querySelector('.lab-root').getBoundingClientRect(); const h = document.querySelector('.app-header').getBoundingClientRect();
    return { rootTop: r.top, rootH: r.height, headerH: h.height, vh: innerHeight, docScrollH: document.documentElement.scrollHeight, docScrollW: document.documentElement.scrollWidth, vw: innerWidth }; })()`);
  check('lab-root fills the viewport below the header', Math.abs(geo.rootTop - geo.headerH) < 0.5 && Math.abs(geo.rootH - (geo.vh - geo.headerH)) < 0.5 && geo.docScrollH <= geo.vh, JSON.stringify(geo));
  check('no horizontal page overflow (desktop)', geo.docScrollW <= geo.vw, JSON.stringify(geo));
  await shot('lab-light-1440.png');

  // ---- language follows the host
  const title = () => evaluate(`document.querySelector('.lab-root .lab-app-header h1')?.textContent`);
  const langs = {};
  for (const l of ['en', 'es', 'zh']) {
    await evaluate(`window.__labDev.setLang('${l}')`);
    await sleep(300);
    langs[l] = { title: await title(), htmlLang: await evaluate(`document.documentElement.lang`) };
  }
  check('language follows the host (en/es/zh)', new Set(Object.values(langs).map((x) => x.title)).size === 3 && langs.en.htmlLang === 'en' && langs.es.htmlLang === 'es', JSON.stringify(langs));
  check('lab has no language/theme switch of its own', (await evaluate(`document.querySelectorAll('.lab-root .lab-app-header .seg').length`)) === 0);

  // ---- theme follows the host
  const themeState = () =>
    evaluate(`(() => { const s = window.__heartScene; return { html: document.documentElement.dataset.theme, sceneBgToken: getComputedStyle(document.querySelector('.lab-root')).getPropertyValue('--scene-bg').trim(),
      hostBg: getComputedStyle(document.body).backgroundColor, labBg: getComputedStyle(document.querySelector('.lab-root')).backgroundColor, three: s?.scene.background?.getHexString?.() }; })()`);
  const light = await themeState();
  await evaluate(`window.__labDev.setTheme('dark')`);
  await sleep(600);
  const dark = await themeState();
  await shot('lab-dark-1440.png');
  const inkDark = await evaluate(`(() => { const c = [...document.querySelectorAll('.lab-root canvas')].find((c) => !c.classList.contains('hv-canvas') && c.width > 200); const d = c.getContext('2d').getImageData(2, 2, 1, 1).data; return [...d]; })()`);
  await evaluate(`window.__labDev.setTheme('light')`);
  await sleep(600);
  const light2 = await themeState();
  check(
    'theme follows the host (tokens, three.js background)',
    dark.html === 'dark' && dark.sceneBgToken === '#0b0e13' && dark.three === '0b0e13' && light.three === 'f3efe8' && light2.three === 'f3efe8',
    JSON.stringify({ light, dark, light2, inkDark }),
  );

  // ---- keyboard: host focus is left alone, body focus drives the lab
  const mode = () => evaluate(`[...document.querySelector('.lab-root .lab-app').classList].find((c) => c.startsWith('mode-'))`);
  await evaluate(`document.querySelector('.app-header .ui-btn').focus()`);
  const m0 = await mode();
  await key('2', 'Digit2', '2');
  await sleep(200);
  const m1 = await mode();
  await evaluate(`document.activeElement.blur()`);
  await key('2', 'Digit2', '2');
  await sleep(200);
  const m2 = await mode();
  await key('1', 'Digit1', '1');
  await sleep(200);
  const m3 = await mode();
  check('shortcuts ignore keys aimed at the host, act on body focus', m0 === m1 && m2 === 'mode-leads' && m3 === 'mode-overview', `${m0} → (host focus) ${m1} → (body) ${m2} → ${m3}`);

  // ---- fixed drawer stays inside the lab
  await evaluate(`[...document.querySelectorAll('.lab-root .lab-app-header .header-tools .btn')][0].click()`);
  await sleep(1500);
  const drawer = await evaluate(`(() => { const d = document.querySelector('.lab-root .quiz-drawer'); if (!d || d.hidden) return null; const r = d.getBoundingClientRect(); const root = document.querySelector('.lab-root').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, rootTop: root.top, rootBottom: root.bottom, rootRight: root.right }; })()`);
  check('quiz drawer (position: fixed) is contained in .lab-root', drawer && drawer.top >= drawer.rootTop - 0.5 && drawer.bottom <= drawer.rootBottom + 0.5, JSON.stringify(drawer));
  await shot('lab-quiz-1440.png');
  await key('Escape', 'Escape');
  await evaluate(`document.querySelector('.lab-root .quiz-drawer .drawer-head button:last-child')?.click()`);
  await sleep(300);

  // ---- About dialog (top layer) keeps the lab tokens; skip link moves focus without touching the hash route
  await evaluate(`[...document.querySelectorAll('.lab-root .lab-app-header .header-tools .btn')][1].click()`);
  await sleep(400);
  const about = await evaluate(`(() => { const d = document.querySelector('.lab-root dialog.about-dialog'); if (!d) return null; const r = d.getBoundingClientRect(); return { open: d.open, modal: d.matches(':modal'), bg: getComputedStyle(d).backgroundColor, swatches: d.querySelectorAll('.lab-swatch').length, w: r.width, h: r.height, credits: /HRA|Human Reference Atlas/.test(d.textContent) }; })()`);
  await shot('lab-about-1440.png');
  await key('Escape', 'Escape');
  await sleep(300);
  const aboutClosed = await evaluate(`!document.querySelector('.lab-root dialog.about-dialog')?.open`);
  check('About dialog opens modal with lab tokens and model credits, Esc closes', about && about.open && about.modal && about.bg === 'rgb(255, 255, 255)' && about.swatches > 0 && about.credits && aboutClosed, JSON.stringify({ about, aboutClosed }));
  const hash0 = await evaluate(`location.hash`);
  await evaluate(`document.querySelector('.lab-root .skip-link').focus()`);
  await key('Enter', 'Enter', String.fromCharCode(13));
  await sleep(200);
  const skip = await evaluate(`({ hash: location.hash, active: document.activeElement?.id })`);
  check('skip link focuses the lab main panel and leaves the hash route alone', skip.hash === hash0 && skip.active === 'lab-main', JSON.stringify({ hash0, ...skip }));
  await evaluate(`document.activeElement.blur()`);

  // ---- deep link
  await evaluate(`window.__labDev.open('lbbb')`);
  const tDz = await waitFor(
    `(() => { const items = [...document.querySelectorAll('.lab-root .dz-item')]; const a = document.querySelector('.lab-root .dz-item.is-active'); return !!document.querySelector('.lab-root .lab-app.mode-disease') && !!a && items.some((b) => !b.disabled); })()`,
    60000,
  );
  const active = await evaluate(`document.querySelector('.lab-root .dz-item.is-active')?.textContent`);
  check('deep link opens disease mode with the scenario selected', tDz >= 0 && /LBBB|左束支|rama izquierda|left bundle/i.test(active ?? ''), `active: ${active}; ${tDz} ms`);
  await shot('lab-lbbb-1440.png');

  // ---- host styles: identical with and without the lab's stylesheets
  const withLab = await evaluate(HOST_STYLES);
  const labStyleCount = await evaluate(`[...document.querySelectorAll('style[data-vite-dev-id]')].filter((s) => /[\\\\/]src[\\\\/]lab[\\\\/]/.test(s.dataset.viteDevId)).length`);
  await evaluate(`[...document.querySelectorAll('style[data-vite-dev-id]')].filter((s) => /[\\\\/]src[\\\\/]lab[\\\\/]/.test(s.dataset.viteDevId)).forEach((s) => (s.disabled = true))`);
  const withoutLab = await evaluate(HOST_STYLES);
  await evaluate(`[...document.querySelectorAll('style[data-vite-dev-id]')].forEach((s) => (s.disabled = false))`);
  const diffs = [];
  for (const k of Object.keys(withLab)) for (const p of Object.keys(withLab[k] ?? {})) if (!(p === 'height' && ['html', 'body', 'app', 'main'].includes(k)) && withLab[k][p] !== withoutLab[k]?.[p]) diffs.push(`${k}.${p}: ${withoutLab[k]?.[p]} → ${withLab[k][p]}`);
  check('host elements styled the same with and without the lab CSS', labStyleCount >= 5 && diffs.length === 0, `${labStyleCount} lab stylesheets; diffs: ${diffs.join('; ') || 'none'}`);

  // ---- unmount / remount
  await evaluate(`window.__labDev.unmount()`);
  await sleep(500);
  const gone = await evaluate(`({ root: !!document.querySelector('.lab-root'), scene: !!window.__heartScene, canvases: document.querySelectorAll('canvas').length })`);
  check('unmount removes the lab and disposes the scene', !gone.root && !gone.scene && gone.canvases === 0, JSON.stringify(gone));
  const base = await evaluate(LISTENERS);
  const tBase = await evaluate(`document.querySelector('.lab-root') ? 'x' : 'none'`);
  void tBase;
  const timeAtUnmount = await evaluate(`performance.now()`);
  void timeAtUnmount;
  const counts = [];
  for (let i = 0; i < 4; i++) {
    const instantInfo = await evaluate(`new Promise((resolve) => { const t0 = performance.now(); let shell = -1, loading = false; const mo = new MutationObserver(() => { if (document.querySelector('.lab-root .lab-app-loading')) loading = true; if (shell < 0 && document.querySelector('.lab-root .lab-app')) shell = performance.now() - t0; }); mo.observe(document.body, { childList: true, subtree: true }); window.__labDev.mount(); const poll = () => { if (window.__heartScene) { mo.disconnect(); resolve({ shellMs: Math.round(shell), sceneMs: Math.round(performance.now() - t0), loading }); } else setTimeout(poll, 5); }; poll(); })`);
    const instant = instantInfo.shellMs;
    await sleep(800);
    const mounted = await evaluate(LISTENERS);
    const h = await evaluate(HEART);
    await evaluate(`window.__labDev.unmount()`);
    await sleep(400);
    const after = await evaluate(LISTENERS);
    counts.push({ info: instantInfo, instantMs: instant, mounted: total(mounted), after: total(after), heartOk: h.ok && h.distinctColours > 20 });
  }
  check(
    'remount: shell without the loading screen (< 200 ms), 3D scene rebuilt (4 cycles)',
    counts.every((c) => c.instantMs >= 0 && c.instantMs < 200 && !c.info.loading && c.heartOk),
    JSON.stringify(counts.map((c) => ({ ...c.info, heart: c.heartOk }))),
  );
  check(
    'global listeners return to the host baseline after every unmount',
    counts.every((c) => c.after === total(base)) && new Set(counts.map((c) => c.mounted)).size === 1,
    `baseline ${total(base)} ${JSON.stringify(base)}; per cycle mounted/after ${counts.map((c) => `${c.mounted}/${c.after}`).join(', ')}`,
  );
  const clockStopped = await evaluate(`(async () => { const a = document.querySelector('.time-readout'); return a === null; })()`);
  check('nothing of the lab left in the DOM after unmount', clockStopped);

  // ---- remount for the phone / small-laptop checks
  await evaluate(`window.__labDev.mount()`);
  await waitFor(`!!document.querySelector('.lab-root .lab-app')`, 5000, 20);
  for (const [w, h, mobile, name] of [
    [1366, 768, false, 'lab-1366.png'],
    [390, 844, true, 'lab-phone.png'],
  ]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    await sleep(1200);
    const g = await evaluate(`(() => { const r = document.querySelector('.lab-root').getBoundingClientRect(); const hd = document.querySelector('.app-header').getBoundingClientRect();
      const tab = getComputedStyle(document.documentElement).getPropertyValue('--app-tabbar-h');
      const wide = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.lab-root')).slice(0, 3).map((e) => e.tagName + '.' + e.className);
      return { wide, w: innerWidth, h: innerHeight, header: hd.height, rootTop: r.top, rootH: r.height, scrollW: document.documentElement.scrollWidth, tab, viewportScrollH: document.querySelector('.lab-viewport').scrollHeight }; })()`);
    const expectH = g.h - g.header - (w <= 760 ? parseFloat(g.tab) || 62 : 0);
    check(`layout at ${w}×${h}`, Math.abs(g.rootH - expectH) < 1.5 && g.scrollW <= g.w, JSON.stringify(g));
    await shot(name);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // ---- console
  await sleep(500);
  const noise = (m) => /\[vite\]|Download the React DevTools|GPU stall due to ReadPixels|WebGL.*(software|SwiftShader)|Automatic fallback to software WebGL|Multiple readback operations using getImageData/i.test(m);
  const errs = consoleMsgs.filter((m) => !noise(m));
  check('no console errors or warnings', errs.length === 0, errs.slice(0, 12).join(' | ') || `(${consoleMsgs.length} filtered noise lines)`);
} catch (err) {
  check('driver', false, String(err && err.stack ? err.stack : err));
} finally {
  try {
    await send('Browser.close');
  } catch {
    /* already closing */
  }
  await sleep(800);
  try {
    edge.kill();
  } catch {
    /* gone */
  }
  writeFileSync(join(OUT, 'cdp-results.json'), JSON.stringify({ results, console: consoleMsgs }, null, 1));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
