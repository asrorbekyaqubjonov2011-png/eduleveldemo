import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecord, validateRecord, recordToPage, type OtherPage } from './records';

const para = (n: number) => Array.from({ length: n }, (_, i) => `So‘z${i}`).join(' ');
const good = () => normalizeRecord({
  id: 'blog/ielts-maslahatlar', title: 'IELTS Writing uchun amaliy maslahatlar', description: 'IELTS Writing Task 2 inshosida ko‘p uchraydigan xatolar va ularni tuzatish yo‘llari haqida amaliy qo‘llanma.',
  h1: 'IELTS Writing uchun amaliy maslahatlar', lead: 'Bu sahifada IELTS Writing Task 2 uchun amaliy maslahatlar jamlangan va tushuntirilgan.',
  sections: [{ heading: 'Birinchi bo‘lim', paragraphs: [para(140)] }, { heading: 'Ikkinchi bo‘lim', paragraphs: [para(140)] }],
  faq: [{ q: 'Nechta so‘z kerak?', a: 'Task 2 uchun kamida 250 so‘z yoziladi, shuning uchun bu chegaradan o‘tishga harakat qiling.' }],
  related: ['/ielts/writing', '/ielts'], reviewed: true, status: 'published'
});
const codePaths = ['/ielts', '/ielts/writing', '/about'];

describe('seo records', () => {
  test('a complete, reviewed page passes', () => {
    const v = validateRecord(good(), [], codePaths);
    assert.deepEqual(v.errors, []);
  });
  test('HTML, bad or reserved slugs and short text block publishing', () => {
    const r = good();
    r.lead = 'Bu <b>qalin</b> matn va u uzun bo‘lishi kerak, shuning uchun uni yozamiz.';
    assert.ok(validateRecord(r, [], codePaths).errors.some((e) => /HTML/.test(e)));
    for (const id of ['Blog/Bad Slug', 'api/x', 'ielts', 'a/b/c', '-x']) assert.ok(validateRecord({ ...good(), id }, [], codePaths).errors.some((e) => /Manzil|band/.test(e)), id);
    assert.ok(validateRecord({ ...good(), sections: [good().sections[0]] }, [], codePaths).errors.some((e) => /2 ta bo‘lim/.test(e)));
    assert.ok(validateRecord({ ...good(), sections: [{ heading: 'A', paragraphs: ['qisqa'] }, { heading: 'B', paragraphs: ['qisqa'] }] }, [], codePaths).errors.some((e) => /juda qisqa/.test(e)));
  });
  test('the owner must confirm they reviewed the text, and AI text especially', () => {
    assert.ok(validateRecord({ ...good(), reviewed: false }, [], codePaths).errors.some((e) => /o‘qib chiqdim/.test(e)));
    assert.ok(validateRecord({ ...good(), aiGenerated: true, reviewed: false }, [], codePaths).errors.some((e) => /AI yozgan/.test(e)));
    assert.deepEqual(validateRecord({ ...good(), aiGenerated: true, reviewed: true }, [], codePaths).errors, []);
  });
  test('the same title, description or H1, and copied text, are refused', () => {
    const r = good();
    const other: OtherPage = { path: '/ielts/writing', title: r.title, description: 'Boshqa tavsif', h1: 'Boshqa', body: 'x' };
    assert.ok(validateRecord(r, [other], codePaths).errors.some((e) => /Sarlavha/.test(e)));
    const copy: OtherPage = { path: '/about', title: 'Boshqa sarlavha', description: 'Boshqa tavsif', h1: 'Boshqa h1', body: r.sections.flatMap((s) => s.paragraphs).join(' ') };
    assert.ok(validateRecord(r, [copy], codePaths).errors.some((e) => /takror/.test(e)));
  });
  test('normalize drops unknown fields and cleans lists', () => {
    const r = normalizeRecord({ id: '/Blog/X/', title: ' t ', sections: [{ heading: 'h', paragraphs: ['p', ''], items: ['', 'i'] }, { heading: '', paragraphs: ['no heading'] }], faq: [{ q: 'q', a: '' }, { q: 'q2', a: 'a2' }], related: ['/ielts', 'not-a-path', '/ielts'], evil: 'x', status: 'weird' });
    assert.equal(r.id, 'blog/x');
    assert.equal(r.sections.length, 1);
    assert.deepEqual(r.sections[0].items, ['i']);
    assert.equal(r.faq.length, 1);
    assert.deepEqual(r.related, ['/ielts']);
    assert.equal(r.status, 'draft');
    assert.ok(!('evil' in r));
  });
  test('the public page is built from the record', () => {
    const page = recordToPage(good());
    assert.equal(page.path, '/blog/ielts-maslahatlar');
    assert.equal(page.h1, good().h1);
    assert.ok(page.faq?.length);
  });
});
