import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeSentences, createSpeechQueue } from './edubekVoiceQueue';

const tick = () => new Promise((r) => setTimeout(r, 0));

test('takeSentences: full sentences end a piece and the cursor moves past them', () => {
  const r = takeSentences('Salom! Qandaysiz? Yaxshi', 0);
  assert.deepEqual(r.sentences, ['Salom!', 'Qandaysiz?']);
  assert.equal(r.next, 'Salom! Qandaysiz?'.length);
});

test('takeSentences: resuming from the cursor does not repeat pieces', () => {
  const text = 'Birinchi gap. Ikkinchi gap. Uchinchi';
  const a = takeSentences(text, 0);
  const b = takeSentences(text, a.next);
  assert.deepEqual(a.sentences, ['Birinchi gap.', 'Ikkinchi gap.']);
  assert.deepEqual(b.sentences, []);
  const c = takeSentences(text + '. Tugadi.', a.next);
  assert.deepEqual(c.sentences, ['Uchinchi.', 'Tugadi.']);
});

test('takeSentences: before the first sentence, a clause of 4+ words is a piece', () => {
  assert.deepEqual(takeSentences('Hozir bir narsa tushuntiraman, endi davom etamiz', 0).sentences, ['Hozir bir narsa tushuntiraman,']);
  assert.deepEqual(takeSentences('Ha, yaxshi', 0).sentences, []);
});

test('takeSentences: a newline ends a piece', () => {
  assert.deepEqual(takeSentences('Birinchi qator\nIkkinchi', 0).sentences, ['Birinchi qator']);
});

test('createSpeechQueue: plays in push order even when a later piece resolves first', async () => {
  const played: string[] = [];
  const resolvers: Array<() => void> = [];
  const q = createSpeechQueue(
    (text) =>
      new Promise<void>((resolve) => {
        resolvers.push(() => {
          played.push(text);
          resolve();
        });
      }),
    () => played.push('DRAINED')
  );
  q.push('a');
  q.push('b');
  q.push('c');
  q.end();
  await tick();
  // Only the first piece is being spoken; the others wait for it.
  assert.equal(resolvers.length, 1);
  resolvers[0]();
  await tick();
  assert.equal(resolvers.length, 2);
  resolvers[1]();
  await tick();
  resolvers[2]();
  await tick();
  assert.deepEqual(played, ['a', 'b', 'c', 'DRAINED']);
});

test('createSpeechQueue: cancel drops pieces not yet spoken and ignores the one in progress', async () => {
  const spoken: string[] = [];
  let drained = 0;
  const q = createSpeechQueue(
    async (text) => {
      await new Promise((r) => setTimeout(r, 5));
      spoken.push(text);
    },
    () => (drained += 1)
  );
  q.push('one');
  q.push('two');
  q.cancel();
  q.push('new');
  q.end();
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(spoken, ['new']);
  assert.equal(drained, 1);
});

test('createSpeechQueue: with nothing pushed, end() drains at once', () => {
  let drained = 0;
  const q = createSpeechQueue(async () => {}, () => (drained += 1));
  q.end();
  assert.equal(drained, 1);
});
