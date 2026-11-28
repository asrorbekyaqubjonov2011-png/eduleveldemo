import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.BASE || 'https://127.0.0.1:3443');
if (base.origin !== 'https://127.0.0.1:3443') throw new Error('Isolated HTTPS fixture only');
const email = randomUUID() + '@test.local';
const register = await fetch(new URL('/api/auth/register', base), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Load', surname: 'Fixture', email, identifier: email, password: 'OnlyFixture123!' })
});
assert.equal(register.status, 200);
const cookie = register.headers.getSetCookie().find(value => value.startsWith('el_session=')).split(';')[0];
const workload = [
  ['/'], ['/ielts-tayyorgarlik'], ['/api/db/all'], ['/api/auth/me', { headers: { cookie } }],
  ['/api/levels/tests', { headers: { cookie } }], ['/sitemap.xml'],
  ['/api/telegram/miniapp', { method: 'POST' }]
];
const percent = (values, quantile) => Math.round(values[Math.ceil(values.length * quantile) - 1]);
const stages = [];
for (const concurrency of [4, 12, 24]) {
  const start = performance.now();
  const readings = await Promise.all(Array.from({ length: concurrency }, (_, worker) => (async () => {
    const runs = [];
    for (let turn = 0; turn < 7; turn++) {
      const [route, options] = workload[(worker + turn) % workload.length];
      const sent = performance.now();
      try {
        const res = await fetch(new URL(route, base), { ...options, signal: AbortSignal.timeout(6000) });
        await res.arrayBuffer();
        runs.push({ status: res.status, ms: performance.now() - sent });
      } catch (error) {
        runs.push({ status: error.name, ms: performance.now() - sent });
      }
    }
    return runs;
  })()));
  const rows = readings.flat();
  const time = performance.now() - start;
  const times = rows.map(row => row.ms).sort((a, b) => a - b);
  const statuses = {};
  for (const {status} of rows) statuses[status] = (statuses[status] || 0) + 1;
  stages.push({ concurrency, requests: rows.length, statuses, p50Ms: percent(times, .5), p95Ms: percent(times, .95), requestsPerSecond: +(rows.length * 1000 / time).toFixed(1) });
}
const recovery = await fetch(new URL('/api/db/all', base), { signal: AbortSignal.timeout(6000) });
console.log(JSON.stringify({ scope: 'isolated HTTPS fixture', stages, recovery: recovery.status }, null, 2));
assert.equal(recovery.status, 200);
