import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeThematicPack, publicThematicQuestions } from './thematicGrading';

const questions = [
  { id: 'q1', prompt: 'a', options: ['x', 'y', 'z'], correctAnswerIndex: 1, explanation: 'why1', difficulty: 'easy' as const },
  { id: 'q2', prompt: 'b', options: ['x', 'y'], correctAnswerIndex: 0, explanation: 'why2', difficulty: 'easy' as const, points: 40 },
  { id: 'q3', prompt: 'c', options: ['p', 'q', 'r', 's'], correctAnswerIndex: 3, explanation: '', difficulty: 'hard' as const }
];

test('grades each question with the stored key and sums default points (20 each)', () => {
  const r = gradeThematicPack(questions as any, { q1: 1, q2: 1, q3: 3 });
  assert.equal(r.correctCount, 2);
  assert.equal(r.totalQuestions, 3);
  assert.equal(r.maxScore, 80);
  assert.equal(r.score, 40);
  assert.equal(r.percentage, 50);
});

test('unanswered and out-of-range answers count as wrong, never as a match', () => {
  const r = gradeThematicPack(questions as any, { q1: 9, q3: '3' });
  assert.equal(r.review.find((x) => x.questionId === 'q1')?.correct, false);
  assert.equal(r.review.find((x) => x.questionId === 'q2')?.given, null);
  assert.equal(r.review.find((x) => x.questionId === 'q3')?.correct, false);
});

test('review reveals the key and explanation only in the graded result', () => {
  const r = gradeThematicPack(questions as any, {});
  assert.equal(r.review[0].expected, 1);
  assert.equal(r.review[0].explanation, 'why1');
  assert.equal(r.score, 0);
});

test('non-integer or boolean answers are rejected', () => {
  const r = gradeThematicPack(questions as any, { q1: 1.5, q2: true as any, q3: null as any });
  assert.equal(r.correctCount, 0);
});

test('publicThematicQuestions strips correctAnswerIndex and explanation', () => {
  const pub = publicThematicQuestions(questions as any) as any[];
  for (const q of pub) {
    assert.equal('correctAnswerIndex' in q, false);
    assert.equal('explanation' in q, false);
  }
  assert.equal(pub[0].prompt, 'a');
  assert.deepEqual(pub[0].options, ['x', 'y', 'z']);
});
