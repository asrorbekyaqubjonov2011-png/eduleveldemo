// Shared helpers for the QA scripts in this folder. No dependencies beyond Node and Playwright.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_BASE = 'http://localhost:3000';

// Console messages that are noise for this app: third-party fonts or CDNs that the sandbox cannot reach,
// and the browser's ResizeObserver notice. Same-origin HTTP failures are reported separately.
const BENIGN_CONSOLE = [/Failed to load resource/, /ResizeObserver loop/];

// Text that should never be visible to a user.
export const BAD_TOKEN_RE = /\bundefined\b|\bNaN\b|\[object Object\]/g;
export const RAW_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]{0,160})?\/?>/g;
export const ENTITY_RE = /&(amp|lt|gt|quot|#\d+);/g;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses `--key value` pairs. spec maps each key to 'string' (one value), 'list' (comma-separated values)
 * or 'bool' (flag without a value). Unknown keys and missing values throw.
 */
export function parseArgs(argv, spec) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const kind = spec[key];
    if (!kind) throw new Error(`unknown option: --${key}`);
    if (kind === 'bool') {
      out[key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} needs a value`);
    out[key] = kind === 'list' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value;
  }
  return out;
}

/**
 * Lists the public pages of a Next.js app router tree: every page.(js|jsx|ts|tsx) file.
 * Route groups (name) add no URL segment; _private and @slot folders are skipped; [param] segments are
 * returned with dynamic: true so the caller can skip them instead of inventing a value.
 */
export function discoverRoutes(appDir) {
  const routes = [];
  const walk = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('_') || entry.name.startsWith('@')) continue;
        if (entry.name.startsWith('(') && entry.name.endsWith(')')) walk(full, segments);
        else walk(full, [...segments, entry.name]);
      } else if (/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        routes.push({
          url: segments.length ? '/' + segments.join('/') : '/',
          file: path.relative(appDir, full),
          dynamic: segments.some((s) => /^\[.*\]$/.test(s)),
        });
      }
    }
  };
  walk(appDir, []);
  return routes.sort((a, b) => a.url.localeCompare(b.url));
}

/** Turns one console message into 'ignore' (known noise) or 'error'. */
export function classifyConsole(text) {
  return BENIGN_CONSOLE.some((re) => re.test(text)) ? 'ignore' : 'error';
}

/**
 * Judges the facts collected for one view. Returns human-readable issues; an empty array means PASS.
 * facts: { navError, httpStatus, pageErrors, consoleErrors, httpErrors, requestFailures, scrollWidth,
 *          clientWidth, textLen, badTokens, rawMarkup, brokenImages, title }
 * expect: { status, title } where title = true means an empty document title is an issue.
 */
export function judgeView(facts, expect) {
  const issues = [];
  if (facts.navError) issues.push(`navigation: ${facts.navError}`);
  if (facts.httpStatus !== undefined && facts.httpStatus !== expect.status) {
    issues.push(`HTTP ${facts.httpStatus}, expected ${expect.status}`);
  }
  for (const e of facts.pageErrors || []) issues.push(`page error: ${e}`);
  for (const e of facts.consoleErrors || []) issues.push(`console error: ${e}`);
  for (const e of facts.httpErrors || []) issues.push(`HTTP error: ${e}`);
  for (const e of facts.requestFailures || []) issues.push(`request failed: ${e}`);
  const overflow = (facts.scrollWidth || 0) - (facts.clientWidth || 0);
  if (overflow > 1) issues.push(`horizontal overflow ${overflow}px`);
  if (facts.textLen !== undefined && facts.textLen < 40) issues.push(`blank page (${facts.textLen} characters of text)`);
  for (const t of facts.badTokens || []) issues.push(`visible text contains: ${t}`);
  for (const m of facts.rawMarkup || []) issues.push(`raw markup visible: ${m}`);
  for (const src of facts.brokenImages || []) issues.push(`broken image: ${src}`);
  for (const c of facts.coveredControls || []) issues.push(`control not clickable: ${c}`);
  if (expect.title && facts.title !== undefined && !facts.title) issues.push('empty document title');
  return issues;
}

/** Lower-case words joined by dashes. Letters and digits are kept, everything else separates words. */
export function slugify(text, max = 50) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return slug || 'view';
}

/**
 * Decides what a link found on a page means for the link checker.
 * kind 'skip': not checked (external, mailto/tel, bare '#', API and Next assets).
 * kind 'fragment': '#id' on the page itself; url is the page.
 * kind 'internal': same-origin page; url is the target URL and fragment is its #id if any.
 */
export function classifyHref(href, pageUrl, origin) {
  const value = String(href || '').trim();
  if (!value || value === '#') return { kind: 'skip' };
  if (value.startsWith('#')) return { kind: 'fragment', url: new URL(pageUrl), fragment: decodeURIComponent(value.slice(1)) };
  if (/^(mailto|tel|javascript|data):/i.test(value)) return { kind: 'skip' };
  let url;
  try {
    url = new URL(value, pageUrl);
  } catch {
    return { kind: 'skip' };
  }
  if (url.origin !== origin) return { kind: 'skip' };
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return { kind: 'skip' };
  return { kind: 'internal', url, fragment: url.hash ? decodeURIComponent(url.hash.slice(1)) : undefined };
}

/** Ids that are required but not present in the rendered page. */
export function missingIds(required, present) {
  return required.filter((id) => !present.has(id));
}

/**
 * Loads Playwright: the repo's own package first, then playwright-core, then QA_PLAYWRIGHT_DIR (a node_modules
 * folder that holds playwright). Throws with guidance when none is found.
 */
export async function loadPlaywright() {
  const tried = [];
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return await import(name);
    } catch (e) {
      tried.push(`${name} (${e.code || e.message})`);
    }
  }
  const dir = process.env.QA_PLAYWRIGHT_DIR;
  if (dir) {
    try {
      return createRequire(path.join(dir, 'noop.js'))('playwright');
    } catch (e) {
      tried.push(`QA_PLAYWRIGHT_DIR=${dir} (${e.code || e.message})`);
    }
  }
  throw new Error(`Playwright not found. Tried: ${tried.join('; ')}. Set QA_PLAYWRIGHT_DIR to a node_modules folder that has playwright.`);
}

/** Launches Chromium. QA_CHROMIUM_PATH wins; otherwise the preinstalled /opt/pw-browsers/chromium is used if present. */
export async function launchBrowser() {
  const { chromium } = await loadPlaywright();
  const preinstalled = '/opt/pw-browsers/chromium';
  const executablePath = process.env.QA_CHROMIUM_PATH || (fs.existsSync(preinstalled) ? preinstalled : undefined);
  return chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
}
