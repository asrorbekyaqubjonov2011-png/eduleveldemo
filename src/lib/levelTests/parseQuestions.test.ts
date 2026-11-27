import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionText } from './parseQuestions';

describe('parseQuestionText', () => {
  test('parses numbered questions with a starred correct option', () => {
    const r = parseQuestionText(`1. She ___ to school.
A) go
B) goes *
C) going

2. Ayni savol ✓ belgisi bilan
A) yes
B) ✓ no`);
    assert.equal(r.errors.length, 0);
    assert.equal(r.questions.length, 2);
    assert.deepEqual(r.questions[0], { prompt: 'She ___ to school.', options: ['go', 'goes', 'going'], correctIndex: 1, line: 1 });
    assert.equal(r.questions[1].correctIndex, 1);
    assert.equal(r.questions[1].options[1], 'no');
  });

  test('reports questions without a correct answer and does not guess', () => {
    const r = parseQuestionText('1. Savol\nA) bir\nB) ikki');
    assert.equal(r.questions.length, 0);
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0].message, /To‘g‘ri javob/);
  });

  test('reports two correct answers and too few options', () => {
    const r = parseQuestionText('1. Savol\nA) bir *\nB) ikki *\n\n2. Boshqa\nA) bitta *');
    assert.equal(r.questions.length, 0);
    assert.equal(r.errors.length, 2);
  });

  test('joins a multi-line prompt and ignores blank lines', () => {
    const r = parseQuestionText('3. Birinchi qator\nIkkinchi qator\nA) a *\nB) b');
    assert.equal(r.questions[0].prompt, 'Birinchi qator Ikkinchi qator');
  });

  test('empty input gives nothing and no crash', () => {
    assert.deepEqual(parseQuestionText(''), { questions: [], errors: [] });
  });
});
