// Unit tests for the QA helpers. Run: node --test scripts/qa/lib.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseArgs,
  discoverRoutes,
  judgeView,
  classifyConsole,
  slugify,
  classifyHref,
  missingIds,
} from './lib.mjs';

function appTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-app-'));
  for (const f of files) {
    const p = path.join(root, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, 'export default function P() { return null; }\n');
  }
  return root;
}

const CLEAN = {
  navError: undefined,
  httpStatus: 200,
  pageErrors: [],
  consoleErrors: [],
  httpErrors: [],
  requestFailures: [],
  scrollWidth: 390,
  clientWidth: 390,
  textLen: 500,
  badTokens: [],
  rawMarkup: [],
  brokenImages: [],
  title: 'EduLevel',
};
const OK = { status: 200, title: true };

test('parseArgs reads values, lists and flags', () => {
  const got = parseArgs(['--out', 'x', '--widths', '1440,390', '--no-full'], {
    out: 'string',
    widths: 'list',
    'no-full': 'bool',
  });
  assert.deepEqual(got, { out: 'x', widths: ['1440', '390'], 'no-full': true });
});

test('discoverRoutes maps page files to URLs and skips non-pages', () => {
  const root = appTree([
    'page.tsx',
    '(marketing)/ielts/page.tsx',
    'cefr/page.jsx',
    'blog/[slug]/page.tsx',
    '_private/page.tsx',
    'api/route.ts',
    '@modal/page.tsx',
  ]);
  const routes = discoverRoutes(root).map((r) => [r.url, r.dynamic]);
  assert.deepEqual(routes, [
    ['/', false],
    ['/blog/[slug]', true],
    ['/cefr', false],
    ['/ielts', false],
  ]);
});

test('judgeView returns no issues for a clean view', () => {
  assert.deepEqual(judgeView(CLEAN, OK), []);
});

test('judgeView reports horizontal overflow beyond 1 px', () => {
  const issues = judgeView({ ...CLEAN, scrollWidth: 430 }, OK);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /overflow/i);
});

test('judgeView does not flag overflow of 1 px', () => {
  assert.deepEqual(judgeView({ ...CLEAN, scrollWidth: 391 }, OK), []);
});

test('judgeView reports a blank body under 40 characters', () => {
  const issues = judgeView({ ...CLEAN, textLen: 12 }, OK);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /blank/i);
});

test('judgeView reports visible undefined, raw markup and broken images', () => {
  assert.equal(judgeView({ ...CLEAN, badTokens: ['undefined'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, rawMarkup: ['<div>'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, brokenImages: ['/a.png'] }, OK).length, 1);
});

test('judgeView reports a wrong HTTP status and an empty title only when expected', () => {
  assert.equal(judgeView({ ...CLEAN, httpStatus: 500 }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, httpStatus: 404 }, { status: 404, title: false }).length, 0);
  assert.equal(judgeView({ ...CLEAN, title: '' }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, title: '' }, { status: 200, title: false }).length, 0);
});

test('judgeView reports page errors, console errors, HTTP errors, failed requests and navigation errors', () => {
  assert.equal(judgeView({ ...CLEAN, pageErrors: ['boom'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, consoleErrors: ['x is not a function'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, httpErrors: ['401 /api/db/all'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, requestFailures: ['/api/x'] }, OK).length, 1);
  assert.equal(judgeView({ ...CLEAN, navError: 'timeout' }, OK).length, 1);
});

test('judgeView reports header controls that another element covers', () => {
  const issues = judgeView({ ...CLEAN, coveredControls: ['Light/Dark rejim covered by a.relative'] }, OK);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /not clickable: Light\/Dark rejim covered/);
});

test('judgeView reports only the navigation error when the page never rendered', () => {
  const issues = judgeView({ navError: 'timeout 60000ms exceeded' }, OK);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /navigation/);
});

test('classifyConsole ignores known network and resize noise only', () => {
  assert.equal(classifyConsole('Failed to load resource: net::ERR_FAILED'), 'ignore');
  assert.equal(classifyConsole('ResizeObserver loop completed with undelivered notifications.'), 'ignore');
  assert.equal(classifyConsole('Uncaught TypeError: x is not a function'), 'error');
});

test('slugify keeps letters, joins words with dashes and trims to the limit', () => {
  assert.equal(slugify('Edu Coin do‘koni'), 'edu-coin-do-koni');
  assert.equal(slugify('Mock imtihonlar', 5), 'mock');
});

test('classifyHref separates skips, fragments and internal links', () => {
  const origin = 'http://localhost:3000';
  const page = 'http://localhost:3000/';
  assert.equal(classifyHref('https://t.me/edulevel', page, origin).kind, 'skip');
  assert.equal(classifyHref('tel:+998901112233', page, origin).kind, 'skip');
  assert.equal(classifyHref('#', page, origin).kind, 'skip');
  assert.equal(classifyHref('/api/db/all', page, origin).kind, 'skip');
  assert.equal(classifyHref('#books', page, origin).kind, 'fragment');
  assert.equal(classifyHref('#books', page, origin).fragment, 'books');
  const internal = classifyHref('/ielts-tayyorgarlik#faq', page, origin);
  assert.equal(internal.kind, 'internal');
  assert.equal(internal.url.pathname, '/ielts-tayyorgarlik');
  assert.equal(internal.fragment, 'faq');
});

test('missingIds lists required ids that are not present', () => {
  assert.deepEqual(missingIds(['books', 'faq', 'vip'], new Set(['books', 'vip'])), ['faq']);
  assert.deepEqual(missingIds(['books'], new Set(['books'])), []);
});
