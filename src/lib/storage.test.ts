import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseAuthHeaders } from './storage';

describe('supabaseAuthHeaders', () => {
  test('legacy JWT service key: both headers', () => {
    assert.deepEqual(supabaseAuthHeaders('eyJhbGciOi.test.sig'), { authorization: 'Bearer eyJhbGciOi.test.sig', apikey: 'eyJhbGciOi.test.sig' });
  });
  test('new sb_secret key: apikey only', () => {
    assert.deepEqual(supabaseAuthHeaders('sb_secret_abc'), { apikey: 'sb_secret_abc' });
  });
});
