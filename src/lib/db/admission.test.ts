import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdmission } from './admission';

const signal = new AbortController().signal;

test('retains the active limit, grants in FIFO order and rejects a full queue', async () => {
  const { acquire } = createAdmission(1, 2, 1000);
  const first = await acquire(signal);
  assert.ok(first);
  const second = acquire(signal);
  const third = acquire(signal);
  assert.equal(await acquire(signal), null);
  assert.equal(await acquire(signal, false), null);
  first();
  first();
  const next = await second;
  assert.ok(next);
  assert.equal(await acquire(signal, false), null);
  next();
  const last = await third;
  assert.ok(last);
  last();
});

test('abort and deadline free queued capacity without releasing an active permit', async () => {
  const { acquire } = createAdmission(1, 1, 20);
  const first = await acquire(signal);
  assert.ok(first);
  const cancelled = new AbortController();
  const pending = acquire(cancelled.signal);
  cancelled.abort();
  assert.equal(await pending, null);
  assert.equal(await acquire(cancelled.signal), null);
  assert.equal(await acquire(signal), null);
  assert.equal(await acquire(signal, false), null);
  const queued = acquire(signal);
  first();
  const next = await queued;
  assert.ok(next);
  next();
});
