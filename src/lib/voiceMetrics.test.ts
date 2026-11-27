import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTiming, recordVoiceTurn, resetVoiceMetrics, voiceSummary } from './voiceMetrics';
import { summarizeLastTurn, type VoiceMark } from './edubekVoiceTiming';

const mk = (name: string, t: number, detail?: string): VoiceMark => ({ name, t, turn: 0, detail });

describe('voice timing', () => {
  test('stage durations come from the marks of the last turn', () => {
    const marks = [mk('speech_end', 1000), mk('stt_final', 1300, '12'), mk('turn_start', 1310, '12'), mk('llm_first_text', 2210), mk('tts_request', 2300, 'Hello'), mk('tts_ready', 2900, '4000'), mk('audio_play', 3000, 'server')];
    assert.deepEqual(summarizeLastTurn(marks), { sttMs: 300, llmFirstMs: 900, ttsMs: 600, playMs: 100, totalMs: 2000, voice: 'server' });
  });
  test('no result before the first sound has played, and stale speech_end marks are ignored', () => {
    assert.equal(summarizeLastTurn([mk('speech_end', 0), mk('turn_start', 50), mk('llm_first_text', 400)]), null);
    const stale = [mk('speech_end', 0), mk('turn_start', 60_000), mk('audio_play', 61_000, 'browser')];
    assert.equal(summarizeLastTurn(stale)?.totalMs, null);
  });
  test('the server accepts only sane numbers and no text', () => {
    assert.equal(cleanTiming({ sttMs: 'abc', totalMs: -5 }), null);
    assert.deepEqual(cleanTiming({ sttMs: 200.4, totalMs: 1800, voice: 'server', device: 'mobile', text: 'secret' }), { sttMs: 200, llmFirstMs: null, ttsMs: null, playMs: null, totalMs: 1800, voice: 'server', device: 'mobile' });
    assert.equal(cleanTiming({ totalMs: 999999 }), null);
  });
  test('median and 95th percentile per stage and per device', () => {
    resetVoiceMetrics();
    for (const total of [1000, 2000, 3000, 4000, 9000]) recordVoiceTurn({ sttMs: null, llmFirstMs: null, ttsMs: null, playMs: null, totalMs: total, voice: 'server', device: total > 3000 ? 'mobile' : 'desktop' });
    const s = voiceSummary();
    assert.equal(s.turns, 5);
    assert.equal(s.stages.totalMs.p50, 3000);
    assert.equal(s.stages.totalMs.p95, 9000);
    assert.equal(s.stages.sttMs.p50, null);
    assert.equal(s.byDevice.mobile.totalP50, 4000);
    resetVoiceMetrics();
  });
});
