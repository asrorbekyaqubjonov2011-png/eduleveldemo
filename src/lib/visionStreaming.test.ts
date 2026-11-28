import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readChatStream, runFallbackChain, resetProviderCooldowns } from './aiRouter';

test('SSE handles UTF-8 boundaries, CRLF, hidden reasoning and final event', async () => {
  const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"reasoning":"hidden"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"O‘zbek"}}]}\n\ndata: {"choices":[{"delta":{"content":" tili"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
  const body = new ReadableStream<Uint8Array>({start(c){ for(const b of bytes) c.enqueue(Uint8Array.of(b)); c.close(); }});
  const seen: string[] = [];
  const out = await readChatStream(new Response(body), new AbortController().signal, p => seen.push(p));
  assert.equal(out.text, 'O‘zbek tili');
  assert.deepEqual(seen, ['O‘zbek',' tili']);
  assert.equal(out.finish, 'stop');
});

test('already cancelled stream does not emit content', async () => {
  const ctrl = new AbortController(); ctrl.abort();
  await assert.rejects(readChatStream(new Response('data: [DONE]'), ctrl.signal, () => assert.fail('unexpected token')));
});

test('fallback after empty stream does not concatenate two answers', async () => {
  resetProviderCooldowns();
  const env = { SAMBANOVA_API_KEY:'test', SILICONFLOW_API_KEY:'test', AI_CONFIRMED_FREE:'sambanova:Meta-Llama-3.3-70B-Instruct,siliconflow:Qwen/Qwen3-8B', AI_FALLBACK_ORDER:'sambanova,siliconflow' };
  const seen: string[] = [];
  const fake = (async (url: string) => new Response(url.includes('sambanova') ? 'data: [DONE]\n\n' : 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n', {headers:{'content-type':'text/event-stream'}})) as typeof fetch;
  const out = await runFallbackChain({prompt:'hi',onText:p=>seen.push(p)}, env, fake);
  assert.equal(out.text,'Hello'); assert.deepEqual(seen,['Hello']);
});
