// Ayudantes de las pruebas de navegador (Playwright + Chromium).
// - Sirve la carpeta del repositorio por HTTP en 127.0.0.1 (el service worker y el localStorage necesitan http).
// - Cada página anota en p.ext las peticiones fuera de 127.0.0.1, en p.csp las violaciones de CSP y en p.errors los errores.
// - Cada archivo *.test.js define una suite con suite(nombre, async ({ b, URL }) => { … }) y pruebas con test(nombre, fn).
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
function loadPlaywright() {
  const tries = [() => require('playwright'), () => require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))];
  let last;
  for (const t of tries) { try { return t(); } catch (e) { last = e; } }
  throw new Error('No se encuentra Playwright (npm install): ' + last.message);
}
const { chromium } = loadPlaywright();

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' };
function serve() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(REPO, name);
    if (name.includes('..') || /^(\.git|node_modules|tests|tools)\//.test(name) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true };
const SEEN = { v: 1, seen: true };   // estado guardado para que no salga la guía

// opts.state: objeto que se guarda en localStorage antes de cargar (por defecto SEEN); null = primera visita
async function page(b, URL, opts = {}) {
  const { state = SEEN, hash = '', sw = false, ...o } = opts;
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, locale: 'es-ES', serviceWorkers: sw ? 'allow' : 'block', ...o });
  if (state) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('multimetronomo-v1', s); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} }, JSON.stringify(state));
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  const p = await ctx.newPage();
  p.ext = []; p.errors = [];
  p.on('request', r => { const u = r.url(); if (!/^(https?:\/\/127\.0\.0\.1[:/]|data:|blob:|about:)/.test(u)) p.ext.push(u); });
  p.on('pageerror', e => p.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.csp = () => p.evaluate(() => window.__csp);
  await p.goto(URL + hash);
  await p.evaluate(() => document.fonts.ready);
  return p;
}

let pass = 0, fail = 0, suiteName = '';
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ok    ' + name); }
  catch (e) { fail++; console.log('  FALLA ' + name + '\n        ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n        ')); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'distinto'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
async function clean(p) {   // sin errores, sin violaciones de CSP y sin peticiones externas
  eq(p.errors, [], 'errores en la consola'); eq(await p.csp(), [], 'violaciones de CSP'); eq(p.ext, [], 'peticiones externas');
}

async function suite(name, fn) {
  suiteName = name; console.log('# ' + name);
  const server = await serve();
  const URL = `http://127.0.0.1:${server.address().port}/index.html`;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try { await fn({ b, URL }); }
  catch (e) { fail++; console.log('  FALLA (la suite se detuvo) ' + (e && e.stack || e)); }
  finally { await b.close(); server.close(); }
  console.log(`# ${suiteName}: ${pass} ok, ${fail} fallos`);
  process.exit(fail ? 1 : 0);
}

module.exports = { suite, test, page, eq, ok, clean, MOB, SEEN, REPO };
