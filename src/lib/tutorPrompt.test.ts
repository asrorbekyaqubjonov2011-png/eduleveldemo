import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTutorRequest } from './universalAi';

describe('Edubek instructions', () => {
  test('tutor answers carry the English-learning limit and the quality rules', () => {
    const { systemInstruction, prompt } = buildTutorRequest({ userMessage: 'Present perfect qachon ishlatiladi?', mode: 'tutor', level: 'B1' });
    assert.match(systemInstruction, /faqat ingliz tili/i);
    assert.match(systemInstruction, /tarix/i, 'history must be named as out of scope');
    assert.match(systemInstruction, /ishonchim komil emas/);
    assert.match(systemInstruction, /model nomi bilan boshlamang/);
    assert.equal(prompt, 'Present perfect qachon ishlatiladi?');
  });

  test('talk mode stays short and in English', () => {
    const { systemInstruction } = buildTutorRequest({ userMessage: 'Hi', talk: true, level: 'A2' });
    assert.match(systemInstruction, /faqat INGLIZ tilida/);
    assert.match(systemInstruction, /35 so'zdan oshmasin/);
  });

  test('a lesson question is answered from the lesson notes first', () => {
    const { systemInstruction } = buildTutorRequest({ userMessage: 'Bu nima?', lesson: { title: 'Zamonlar', notes: 'Present Simple' }, level: 'B1' });
    assert.match(systemInstruction, /DARS KONSPEKTIGA tayan/);
  });
});
