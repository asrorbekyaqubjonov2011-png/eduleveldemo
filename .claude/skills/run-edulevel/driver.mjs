#!/usr/bin/env node
// Drives a running EduLevel server: health check, the scripted API flows, and screenshots.
// Run from the repository root.
//
//   node .claude/skills/run-edulevel/driver.mjs health
//   node .claude/skills/run-edulevel/driver.mjs flows
//   node .claude/skills/run-edulevel/driver.mjs shot <anon|student|owner> <desktop|mobile> <out.png> [label...]
//   (labels are visible texts clicked in order, e.g. "Kabinetga o‘tish" then "Mashqlar")
//
// Environment:
//   BASE              server address (default http://localhost:3000)
//   OWNER_PASSWORD    owner password the server was started with
//   STUDENT_LOGIN     existing student phone (needed for `shot student`)
//   STUDENT_PASSWORD  that student's password

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const [command, ...args] = process.argv.slice(2);
const repo = process.cwd();

async function health() {
  const res = await fetch(`${BASE}/api/db/all`).catch(() => null);
  if (!res) {
    console.error(`No server at ${BASE}. Start it first (see SKILL.md, "Run").`);
    return 1;
  }
  const body = await res.json().catch(() => ({}));
  if (res.status !== 200 || !body.success) {
    console.error(`Unhealthy: HTTP ${res.status} ${body.message || ''}`.trim());
    return 1;
  }
  const d = body.data || {};
  console.log(`OK ${BASE} — courses ${d.courses?.length ?? 0}, lessons ${d.lessons?.length ?? 0}, exercises ${d.exercises?.length ?? 0} (anonymous view)`);
  return 0;
}

function flows() {
  const env = { ...process.env, BASE };
  if (!env.OWNER_PASSWORD) {
    console.error('Set OWNER_PASSWORD (the value the server was started with).');
    return 1;
  }
  let failed = 0;
  for (const script of ['scripts/smoke-db.mjs', 'scripts/smoke-exercises.mjs']) {
    console.log(`\n== ${script}`);
    const r = spawnSync(process.execPath, [script], { cwd: repo, env, encoding: 'utf8' });
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    if (r.status !== 0) failed++;
  }
  console.log(failed ? `\n${failed} script(s) failed` : '\nAll flows passed');
  return failed ? 1 : 0;
}

async function shot(who, size, out, ...labels) {
  if (!['anon', 'student', 'owner'].includes(who) || !['desktop', 'mobile'].includes(size) || !out) {
    console.error('Usage: shot <anon|student|owner> <desktop|mobile> <out.png> [label]');
    return 1;
  }
  const require = createRequire(import.meta.url);
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('Playwright is not available. The container has it preinstalled at /opt/pw-browsers.');
    return 1;
  }
  const cookie = await login(who);
  if (who !== 'anon' && !cookie) return 1;

  const executablePath = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const viewport = size === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: size === 'mobile' ? 1 : 2 });
  if (cookie) await ctx.addCookies([{ name: 'el_session', value: cookie, url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160));
  });

  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape'); // dismiss the first-visit intro
  await page.waitForTimeout(700);
  for (const label of labels) {
    const target = page.getByText(label, { exact: true }).first();
    if (await target.count()) await target.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const dest = path.resolve(repo, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await page.screenshot({ path: dest });
  await browser.close();
  console.log(`saved ${dest} — horizontal overflow ${overflow}px, console errors ${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log('  ' + e));
  return errors.length || overflow > 0 ? 1 : 0;
}

async function login(who) {
  if (who === 'anon') return null;
  const loginInput = who === 'owner' ? 'jasurbek' : process.env.STUDENT_LOGIN;
  const password = who === 'owner' ? process.env.OWNER_PASSWORD : process.env.STUDENT_PASSWORD;
  if (!loginInput || !password) {
    console.error(`Set ${who === 'owner' ? 'OWNER_PASSWORD' : 'STUDENT_LOGIN and STUDENT_PASSWORD'} for "${who}".`);
    return null;
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginInput, password })
  });
  const token = (res.headers.get('set-cookie') || '').match(/el_session=([^;]+)/)?.[1];
  if (!res.ok || !token) {
    console.error(`Login as ${who} failed (HTTP ${res.status}).`);
    return null;
  }
  return token;
}

const commands = { health, flows, shot };
if (!command || !commands[command]) {
  console.error('Usage: node .claude/skills/run-edulevel/driver.mjs <health|flows|shot> ...');
  process.exit(1);
}
const code = await commands[command](...args);
process.exit(code ?? 0);
