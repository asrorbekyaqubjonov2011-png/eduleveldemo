import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mapGeminiListing, mapGroqListing, mapOpenRouterListing } from './aiModelCatalog';

describe('model catalogue mapping', () => {
  test('OpenRouter: only price-0 :free models are usable; unknown fields stay null', () => {
    const m = mapOpenRouterListing({ data: [
      { id: 'a/b:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000, architecture: { input_modalities: ['text', 'image'] } },
      { id: 'c/d:free', pricing: { prompt: '0', completion: '0.1' } },
      { id: 'e/f', pricing: { prompt: '0', completion: '0' } }
    ] });
    assert.equal(m.length, 2);
    assert.equal(m[0].usable, true);
    assert.equal(m[0].vision, true);
    assert.equal(m[0].outputTokenLimit, null);
    assert.equal(m[1].usable, false);
  });
  test('Groq: speech models are listed but not usable for chat', () => {
    const m = mapGroqListing({ data: [{ id: 'llama-3.1-8b-instant', context_window: 131072 }, { id: 'whisper-large-v3' }] });
    assert.equal(m[0].usable, true);
    assert.equal(m[0].contextWindow, 131072);
    assert.equal(m[1].usable, false);
    assert.equal(m[1].audio, true);
  });
  test('Gemini: limits come from the list; embedding models are not usable', () => {
    const m = mapGeminiListing({ models: [
      { name: 'models/gemini-2.5-flash', inputTokenLimit: 1048576, outputTokenLimit: 65536, supportedGenerationMethods: ['generateContent', 'streamGenerateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }
    ] });
    assert.equal(m[0].usable, true);
    assert.equal(m[0].streaming, true);
    assert.equal(m[1].usable, false);
  });
});
