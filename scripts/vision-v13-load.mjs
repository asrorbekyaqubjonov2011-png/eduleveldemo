import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const base = new URL(process.env.BASE || 'https://127.0.0.1:3443');
if (base.origin !== 'https://127.0.0.1:3443') throw new Error('Isolated HTTPS fixture only');
function registration() {
  const email = randomUUID() + '@test.local';
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Load', surname: 'Fixture', email, identifier: email, password: 'OnlyFixture123!' })
  };
}
const register = await fetch(new URL('/api/auth/register', base), registration());
assert.equal(register.status, 200);
const cookie = register.headers.getSetCookie().find(value => value.startsWith('el_session=')).split(';')[0];
const workload = [
  ['/'], ['/ielts-tayyorgarlik'], ['/api/db/all'], ['/api/auth/me', { headers: { cookie } }],
  ['/api/levels/tests', { headers: { cookie } }], ['/sitemap.xml'],
  ['/api/telegram/miniapp', { method: 'POST' }]
];
if (process.env.FIXTURE_INCLUDE_SIGNUPS === '1') workload.push(['/api/auth/register', registration]);
const percent = (values, quantile) => Math.round(values[Math.ceil(values.length * quantile) - 1]);
const stages = [];
const rounds = Number(process.env.FIXTURE_ROUNDS_PER_ROUTE || 1);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 10, "Expected 1–10 rounds per route");
const pid = process.env.FIXTURE_SERVER_PID || '';
const processDir = /^\d+$/.test(pid) ? '/proc/' + pid : null;
const clockTicks = Number(process.env.FIXTURE_CLOCK_TICKS || 100);
let rssPeakKiB = 0;
function cpuTicks() {
  if (!processDir) return null;
  const status = readFileSync(processDir + '/status', 'utf8');
  rssPeakKiB = Math.max(rssPeakKiB, Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]) || 0);
  const stat = readFileSync(processDir + '/stat', 'utf8');
  const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  return Number(fields[11]) + Number(fields[12]);
}
for (const concurrency of [4, 12, 24]) {
  const start = performance.now();
  const cpuStart = cpuTicks();
  const sample = setInterval(cpuTicks, 100);
  const readings = await Promise.all(Array.from({ length: concurrency }, (_, worker) => (async () => {
    const runs = [];
    for (let turn = 0; turn < workload.length * rounds; turn++) {
      const [route, requestOptions] = workload[(worker + turn) % workload.length];
      const sent = performance.now();
      try {
        const res = await fetch(new URL(route, base), { ...(typeof requestOptions === 'function' ? requestOptions() : requestOptions), signal: AbortSignal.timeout(6000) });
        if (res.status !== 503) await res.arrayBuffer();
        const elapsed = performance.now() - sent;
        const code = res.status === 503 && res.headers.get('content-type')?.includes('application/json')
          ? await res.json().then(body => body.code).catch(() => undefined) : undefined;
        runs.push({ status: res.status, ms: elapsed, route, code, timing: res.headers.get('server-timing') });
      } catch (error) {
        runs.push({ status: error.name, ms: performance.now() - sent });
      }
    }
    return runs;
  })()));
  const rows = readings.flat();
  clearInterval(sample);
  const time = performance.now() - start;
  const cpuEnd = cpuTicks();
  const serverCpuMs = cpuStart === null || cpuEnd === null ? null : Math.round((cpuEnd - cpuStart) * 1000 / clockTicks);
  const times = rows.map(row => row.ms).sort((a, b) => a - b);
  const statuses = {};
  const unavailable = {};
  const timings = {};
  for (const {status} of rows) statuses[status] = (statuses[status] || 0) + 1;
  for (const {route, code, status, timing} of rows) {
    if (status === 503) {
      const label = route + ' ' + (code || 'unknown');
      unavailable[label] = (unavailable[label] || 0) + 1;
    }
    for (const metric of (timing || '').matchAll(/([a-z]+);dur=([0-9.]+)/g)) {
      (timings[metric[1]] ||= []).push(Number(metric[2]));
    }
  }
  const serverTimingP95 = Object.fromEntries(Object.entries(timings).map(([key, series]) => [key, percent(series.sort((a, b) => a - b), .95)]));
  stages.push({ unavailable, serverTimingP95, serverCpuMs, concurrency, requests: rows.length, statuses, p50Ms: percent(times, .5), p95Ms: percent(times, .95), requestsPerSecond: +(rows.length * 1000 / time).toFixed(1) });
}
const recovery = await fetch(new URL('/api/db/all', base), { signal: AbortSignal.timeout(6000) });
console.log(JSON.stringify({ scope: 'isolated HTTPS fixture', stages, ...(processDir ? { rssPeakKiB } : {}), recovery: recovery.status }, null, 2));
assert.equal(recovery.status, 200);
