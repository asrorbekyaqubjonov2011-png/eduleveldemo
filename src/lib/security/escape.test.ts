import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeHtmlLimited } from './escape';

test('escapes the four characters Telegram HTML needs', () => {
  assert.equal(escapeHtml('a & b < c > d " e'), 'a &amp; b &lt; c &gt; d &quot; e');
});

test('does not double-escape the ampersand', () => {
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('neutralises injected tags and links', () => {
  const out = escapeHtml('<a href="https://evil">Ali</a>');
  assert.equal(out, '&lt;a href=&quot;https://evil&quot;&gt;Ali&lt;/a&gt;');
  assert.ok(!out.includes('<'));
});

test('null and undefined become empty strings, numbers are kept', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(150000), '150000');
});

test('Uzbek apostrophes are left as they are', () => {
  assert.equal(escapeHtml('O‘quvchi ’ va \''), 'O‘quvchi ’ va \'');
});

test('limited escape caps the source length before escaping', () => {
  assert.equal(escapeHtmlLimited('abcdef', 3), 'abc');
  assert.equal(escapeHtmlLimited('<<<<', 2), '&lt;&lt;');
});
