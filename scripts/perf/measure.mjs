#!/usr/bin/env node
/**
 * Frame-cost measurement for EduLevel: the public landing page, the student cabinet and the owner panel.
 *
 * For every scenario (page x viewport x CPU throttle) it reads Chrome DevTools counters and page probes:
 *  - idle.sharePct: main-thread busy time over a 3 s idle window (Performance.TaskDuration / wall time)
 *  - idle.scriptMsPerSec, layoutMsPerSec, styleMsPerSec and their counts per second (ScriptDuration,
 *    LayoutDuration, RecalcStyleDuration, LayoutCount, RecalcStyleCount)
 *  - idle.longTasks: tasks over 50 ms (PerformanceObserver "longtask") while idle
 *  - scroll: a scripted scroll from the top to the bottom of the page. Frames are counted with
 *    requestAnimationFrame; a frame is dropped when it comes more than 25 ms after the previous one (60 Hz).
 *    Also the long tasks during the scroll and the same DevTools counters per second.
 *  - animations: document.getAnimations() at idle, grouped by kind, name, animated properties and iteration count
 *
 * Usage (against a running server, never against production):
 *   BASE_URL=http://localhost:3108 OWNER_PASSWORD=... STUDENT_LOGIN=... STUDENT_PASSWORD=... \
 *     node scripts/perf/measure.mjs --label baseline [--pages landing,student,owner] [--widths 1440,390] [--rates 1,2,4] [--out file.json]
 *
 * Environment:
 *   BASE_URL            server to measure (default http://localhost:3000)
 *   OWNER_LOGIN         owner login (default jasurbek); OWNER_PASSWORD is required for the owner panel
 *   STUDENT_LOGIN, STUDENT_PASSWORD  a student account for the cabinet
 *   PLAYWRIGHT_MODULE   path to Playwright's index.js when it is not in node_modules
 *   PLAYWRIGHT_CHROMIUM path to the Chromium executable when Playwright's own browser is not installed
 *
 * Options: --inject <file.css> adds a stylesheet after load (an experiment: measure what switching a cost off saves).
 * Output: a JSON report on stdout and in --out (default ./perf-<label>.json), plus a short table on stderr.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const LABEL = option('label', 'run');
const PAGES = option('pages', 'landing,student,owner').split(',').map((s) => s.trim()).filter(Boolean);
const WIDTHS = option('widths', '1440,390').split(',').map((s) => Number(s.trim()));
const RATES = option('rates', '1,2,4').split(',').map((s) => Number(s.trim()));
const OUT = option('out', path.resolve(`perf-${LABEL}.json`));
/** An experiment: a CSS file added to the page after it has loaded, to measure the cost of what it switches off. */
const INJECT = option('inject', '');
const INJECT_CSS = INJECT ? fs.readFileSync(INJECT, 'utf8') : '';
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const IDLE_MS = 3000;
const DROPPED_FRAME_MS = 25;

const PAGE_SPECS = {
  landing: { path: '/', role: null },
  student: { path: '/#/student', role: 'student' },
  owner: { path: '/#/admin', role: 'owner' }
};

const round = (n, digits = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** digits) / 10 ** digits : null);

async function loadPlaywright() {
  const attempts = [];
  if (process.env.PLAYWRIGHT_MODULE) attempts.push(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  attempts.push('playwright');
  for (const spec of attempts) {
    try {
      const mod = await import(spec);
      return mod.chromium ? mod : mod.default;
    } catch {
      /* try the next location */
    }
  }
  throw new Error('Playwright was not found. Install it, or set PLAYWRIGHT_MODULE to its index.js.');
}

async function login(pw, role) {
  const loginInput = role === 'owner' ? process.env.OWNER_LOGIN || 'jasurbek' : process.env.STUDENT_LOGIN;
  const password = role === 'owner' ? process.env.OWNER_PASSWORD : process.env.STUDENT_PASSWORD;
  if (!loginInput || !password) {
    throw new Error(role === 'owner' ? 'Set OWNER_PASSWORD for the owner panel.' : 'Set STUDENT_LOGIN and STUDENT_PASSWORD for the student cabinet.');
  }
  const api = await pw.request.newContext({ baseURL: BASE });
  try {
    const res = await api.post('/api/auth/login', { data: { loginInput, password } });
    if (!res.ok()) throw new Error(`${role} login failed with HTTP ${res.status()}`);
    const body = await res.json().catch(() => ({}));
    const state = await api.storageState();
    return { cookies: state.cookies, user: body.user || null };
  } finally {
    await api.dispose();
  }
}

/** Runs before the page scripts: skips the opening sequence, restores the signed-in state and installs the probes. */
function initScript({ role, user }) {
  try {
    sessionStorage.setItem('edulevel_intro_seen', '1');
  } catch {
    /* storage blocked */
  }
  try {
    if (role === 'student' && user) localStorage.setItem('edulevel_current_user', JSON.stringify(user));
    if (role === 'owner') localStorage.setItem('edulevel_is_owner_auth', 'true');
  } catch {
    /* storage blocked */
  }
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.__rafCount = 0;
  window.requestAnimationFrame = (cb) =>
    nativeRaf((t) => {
      window.__rafCount += 1;
      cb(t);
    });
  window.__longTasks = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longTasks.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    /* longtask entries not supported */
  }
  let frameRaf = 0;
  window.__frameLog = null;
  window.__startFrameLog = () => {
    window.__frameLog = [];
    const loop = (t) => {
      if (!window.__frameLog) return;
      window.__frameLog.push(t);
      frameRaf = nativeRaf(loop);
    };
    frameRaf = nativeRaf(loop);
  };
  window.__stopFrameLog = () => {
    const log = window.__frameLog || [];
    window.__frameLog = null;
    cancelAnimationFrame(frameRaf);
    return log;
  };
}

/** Running and finished animations, grouped so the sources of endless motion are easy to see. */
function animationProbe() {
  const all = document.getAnimations();
  const running = all.filter((a) => a.playState === 'running');
  const groups = {};
  let infinite = 0;
  for (const a of running) {
    const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
    const isInfinite = timing ? timing.iterations === Infinity : false;
    if (isInfinite) infinite += 1;
    const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
    const props = [...new Set(kf.flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p));
    const kind = a.animationName ? 'css' : a.transitionProperty ? 'transition' : 'script';
    const name = a.animationName || a.transitionProperty || 'waapi';
    const key = `${kind}:${name}:${props.join(',') || '-'}${isInfinite ? ':infinite' : ''}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  const top = Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key, count]) => ({ key, count }));
  return { total: all.length, running: running.length, infiniteRunning: infinite, top };
}

async function readMetrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

/** Per-second figures from two DevTools snapshots taken `seconds` apart. */
function perSecond(m0, m1, seconds) {
  const d = (k) => (m1[k] ?? 0) - (m0[k] ?? 0);
  return {
    busySharePct: round((d('TaskDuration') / seconds) * 100),
    scriptMsPerSec: round((d('ScriptDuration') * 1000) / seconds),
    layoutMsPerSec: round((d('LayoutDuration') * 1000) / seconds),
    styleMsPerSec: round((d('RecalcStyleDuration') * 1000) / seconds),
    styleCountPerSec: round(d('RecalcStyleCount') / seconds, 0),
    layoutCountPerSec: round(d('LayoutCount') / seconds, 0)
  };
}

function frameStats(log) {
  if (log.length < 2) return { frames: log.length };
  const intervals = [];
  for (let i = 1; i < log.length; i += 1) intervals.push(log[i] - log[i - 1]);
  const sorted = [...intervals].sort((a, b) => a - b);
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const dropped = intervals.filter((d) => d > DROPPED_FRAME_MS).length;
  const span = log[log.length - 1] - log[0];
  return {
    frames: log.length,
    fps: round(((log.length - 1) * 1000) / span),
    medianMs: round(pick(0.5)),
    p95Ms: round(pick(0.95)),
    maxMs: round(sorted[sorted.length - 1]),
    droppedPct: round((dropped / intervals.length) * 100)
  };
}

function longTaskStats(tasks) {
  return {
    count: tasks.length,
    maxMs: round(tasks.reduce((m, t) => Math.max(m, t.dur), 0)),
    totalMs: round(tasks.reduce((s, t) => s + t.dur, 0))
  };
}

async function scrollToBottom(page, cdp, isMobile) {
  const distance = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  if (isMobile) {
    try {
      // Touch gesture: the browser's own scrolling (Lenis is off on touch screens, as in the product).
      await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 620, yDistance: -distance, speed: 900, gestureSourceType: 'touch' });
      return { method: 'touch-gesture', distancePx: distance };
    } catch {
      /* fall back to scripted steps below */
    }
    const step = 120;
    for (let y = 0; y < distance; y += step) {
      await page.evaluate((s) => window.scrollBy(0, s), step);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    }
    return { method: 'scripted-steps', distancePx: distance };
  }
  // Mouse wheel: goes through Lenis on the landing page, as a visitor's wheel does.
  await page.mouse.move(720, 450);
  const step = 120;
  for (let y = 0; y < distance; y += step) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(32);
  }
  return { method: 'mouse-wheel', distancePx: distance };
}

const settleMs = (rate) => 2500 + (rate - 1) * 1000;

async function runScenario(pw, browser, pageKey, width, rate, auth) {
  const spec = PAGE_SPECS[pageKey];
  const isMobile = width < 500;
  const ctx = await browser.newContext({
    viewport: { width, height: isMobile ? 844 : 900 },
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
    colorScheme: 'light',
    reducedMotion: 'no-preference'
  });
  const who = spec.role ? auth[spec.role] : null;
  await ctx.addInitScript(initScript, { role: spec.role, user: who?.user ?? null });
  if (who) await ctx.addCookies(who.cookies);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`.slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`.slice(0, 200));
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  const loadStart = Date.now();
  await page.goto(BASE + spec.path, { waitUntil: 'load', timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => document.body && document.body.scrollHeight > 900, null, { timeout: 180000 }).catch(() => {});
  const loadMs = Date.now() - loadStart;
  if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
  await page.waitForTimeout(settleMs(rate));

  const view = await page.evaluate(() => ({
    sections: document.querySelectorAll('section[id]').length,
    aside: Boolean(document.querySelector('aside')),
    scrollHeight: document.documentElement.scrollHeight,
    nodes: document.querySelectorAll('*').length
  }));
  const animationsIdle = await page.evaluate(animationProbe);

  // Idle window.
  const idleM0 = await readMetrics(cdp);
  const idleRaf0 = await page.evaluate(() => window.__rafCount);
  const idleLt0 = await page.evaluate(() => window.__longTasks.length);
  await page.waitForTimeout(IDLE_MS);
  const idleM1 = await readMetrics(cdp);
  const idleRaf1 = await page.evaluate(() => window.__rafCount);
  const idleLong = await page.evaluate((from) => window.__longTasks.slice(from), idleLt0);
  const idle = {
    ...perSecond(idleM0, idleM1, IDLE_MS / 1000),
    rafPerSec: round((idleRaf1 - idleRaf0) / (IDLE_MS / 1000), 0),
    longTasks: longTaskStats(idleLong)
  };

  // Scripted scroll from the top to the bottom.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const scrollT0 = await page.evaluate(() => performance.now());
  const scrollM0 = await readMetrics(cdp);
  await page.evaluate(() => window.__startFrameLog());
  const scroll = await scrollToBottom(page, cdp, isMobile);
  await page.waitForTimeout(isMobile ? 900 : 1600);
  const log = await page.evaluate(() => window.__stopFrameLog());
  const scrollT1 = await page.evaluate(() => performance.now());
  const scrollM1 = await readMetrics(cdp);
  const scrollSeconds = Math.max(0.001, (scrollT1 - scrollT0) / 1000);
  const scrollLong = await page.evaluate(
    ([t0, t1]) => window.__longTasks.filter((t) => t.start >= t0 && t.start <= t1),
    [scrollT0, scrollT1]
  );
  const scrollSummary = {
    method: scroll.method,
    distancePx: scroll.distancePx,
    seconds: round(scrollSeconds, 2),
    ...frameStats(log),
    ...perSecond(scrollM0, scrollM1, scrollSeconds),
    longTasks: longTaskStats(scrollLong)
  };

  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  await ctx.close();

  return {
    page: pageKey,
    width,
    rate,
    loadMs,
    view,
    idle,
    scroll: scrollSummary,
    animations: animationsIdle,
    jsHeapMB: heap,
    errors: { count: errors.length, sample: errors.slice(0, 5) }
  };
}

function printTable(rows) {
  const head = ['page', 'width', 'cpu', 'idle%', 'style/s', 'layout/s', 'anims', 'scroll-fps', 'p95ms', 'dropped%', 'lt>50', 'ltMaxMs', 'errs'];
  console.error(head.join('\t'));
  for (const r of rows) {
    console.error(
      [
        r.page,
        r.width,
        `${r.rate}x`,
        r.idle.busySharePct,
        r.idle.styleMsPerSec,
        r.idle.layoutMsPerSec,
        `${r.animations.running}/${r.animations.infiniteRunning}`,
        r.scroll.fps,
        r.scroll.p95Ms,
        r.scroll.droppedPct,
        r.scroll.longTasks.count,
        r.scroll.longTasks.maxMs,
        r.errors.count
      ].join('\t')
    );
  }
}

async function main() {
  const pw = await loadPlaywright();
  const launchOptions = { args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] };
  if (process.env.PLAYWRIGHT_CHROMIUM) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM;
  const browser = await pw.chromium.launch(launchOptions);
  const auth = {};
  if (PAGES.includes('student')) auth.student = await login(pw, 'student');
  if (PAGES.includes('owner')) auth.owner = await login(pw, 'owner');
  const startedAt = new Date().toISOString();
  const loadStart = os.loadavg()[0];
  const rows = [];
  try {
    for (const pageKey of PAGES) {
      if (!PAGE_SPECS[pageKey]) throw new Error(`Unknown page ${pageKey}`);
      for (const width of WIDTHS) {
        for (const rate of RATES) {
          const row = await runScenario(pw, browser, pageKey, width, rate, auth);
          rows.push(row);
          console.error(`done ${pageKey} ${width}px ${rate}x`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  const report = {
    label: LABEL,
    base: BASE,
    startedAt,
    finishedAt: new Date().toISOString(),
    host: { cpus: os.cpus().length, loadavgAtStart: round(loadStart, 2), loadavgAtEnd: round(os.loadavg()[0], 2), node: process.version },
    method: { idleMs: IDLE_MS, droppedFrameMs: DROPPED_FRAME_MS, longTaskMs: 50, cpuRates: RATES, widths: WIDTHS },
    results: rows
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  printTable(rows);
  console.error(`written ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
