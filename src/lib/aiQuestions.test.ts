import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, validateGeneratedQuestions, type GeneratedQuestion } from './aiQuestions';

const q = (prompt: string, options: string[], correctAnswerIndex = 0): GeneratedQuestion => ({ prompt, options, correctAnswerIndex });

describe('validateGeneratedQuestions', () => {
  test('keeps a good question', () => {
    const r = validateGeneratedQuestions([q('What is the capital of France?', ['Paris', 'Rome', 'Madrid', 'Berlin'], 0)]);
    assert.equal(r.valid.length, 1);
    assert.equal(r.rejected.length, 0);
  });
  test('rejects identical options, empty options, wrong option count and bad index', () => {
    const r = validateGeneratedQuestions([
      q('Choose the correct word to finish it', ['go', 'Go', 'went', 'gone']),
      q('Choose the correct word to finish it', ['go', '', 'went', 'gone']),
      q('Choose the correct word to finish it', ['go', 'went']),
      q('Choose the correct word to finish it', ['go', 'went', 'gone'], 7)
    ]);
    assert.equal(r.valid.length, 0);
    assert.deepEqual(r.rejected.map((x) => x.reason.split(' ')[0]), ['Bir', 'Bo‘sh', 'Variantlar', 'To‘g‘ri']);
  });
  test('drops a repeated question', () => {
    const r = validateGeneratedQuestions([
      q('Which tense is used in the sentence "She has lived here for ten years"?', ['Present perfect', 'Past simple', 'Future', 'Past perfect']),
      q('Which tense is used in the sentence: She has lived here for ten years?', ['Present perfect', 'Past simple', 'Future', 'Present simple'])
    ]);
    assert.equal(r.valid.length, 1);
    assert.equal(r.rejected[0].reason, 'Oldingi savolning takrori');
  });
  test('similarity is 0 for unrelated and 1 for identical text', () => {
    assert.equal(similarity('The quick brown fox', 'The quick brown fox'), 1);
    assert.equal(similarity('apple orange banana', 'train station platform'), 0);
  });
});
