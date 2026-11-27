/**
 * Stage timestamps for one voice turn, kept on window.__edubekMarks so a browser test can read them.
 * Each mark is { name, t } with t from performance.now(); the turn counter separates one reply from the next.
 */
export interface VoiceMark {
  name: string;
  t: number;
  turn: number;
  detail?: string;
}

let turn = 0;

export function nextVoiceTurn(): number {
  turn += 1;
  return turn;
}

export interface TurnDurations {
  sttMs: number | null;
  llmFirstMs: number | null;
  ttsMs: number | null;
  playMs: number | null;
  totalMs: number | null;
  voice: 'server' | 'browser' | 'unknown';
}

/**
 * Stage durations of the latest voice turn, from the marks. A turn starts at its last `turn_start`; the student's end of
 * speech is the nearest `speech_end` (or `stt_final`) before it. Returns null until the first sound has played.
 */
export function summarizeLastTurn(marks: VoiceMark[]): TurnDurations | null {
  let start = -1;
  for (let i = marks.length - 1; i >= 0; i--) if (marks[i].name === 'turn_start') { start = i; break; }
  if (start < 0) return null;
  const startT = marks[start].t;
  const before = marks.slice(0, start);
  const after = marks.slice(start);
  const lastBefore = (name: string) => [...before].reverse().find((m) => m.name === name && startT - m.t < 20_000);
  const firstAfter = (name: string) => after.find((m) => m.name === name);
  const speechEnd = lastBefore('speech_end');
  const sttFinal = lastBefore('stt_final');
  const llmFirst = firstAfter('llm_first_text');
  const ttsReq = firstAfter('tts_request');
  const ttsReady = firstAfter('tts_ready');
  const play = firstAfter('audio_play');
  if (!play) return null;
  const d = (a?: VoiceMark, b?: VoiceMark) => (a && b && b.t >= a.t ? Math.round(b.t - a.t) : null);
  const origin = speechEnd ?? sttFinal;
  return {
    sttMs: speechEnd && sttFinal ? d(speechEnd, sttFinal) : null,
    llmFirstMs: d(marks[start], llmFirst),
    ttsMs: d(ttsReq, ttsReady),
    playMs: d(ttsReady, play),
    totalMs: d(origin, play),
    voice: play.detail === 'server' || play.detail === 'browser' ? play.detail : 'unknown'
  };
}

let reportedStart = -1;

/** Sends the stage durations of the turn that just started playing. No text and no identifiers leave the browser. */
function reportTurn(marks: VoiceMark[]): void {
  const summary = summarizeLastTurn(marks);
  if (!summary) return;
  let start = -1;
  for (let i = marks.length - 1; i >= 0; i--) if (marks[i].name === 'turn_start') { start = i; break; }
  const stamp = Math.round(marks[start].t);
  if (stamp === reportedStart) return;
  reportedStart = stamp;
  const device = typeof navigator !== 'undefined' && (window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) ? 'mobile' : 'desktop';
  try {
    void fetch('/api/ai/voice-timing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...summary, device }), keepalive: true }).catch(() => undefined);
  } catch {
    /* timing is optional */
  }
}

export function markVoice(name: string, detail?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as { __edubekMarks?: VoiceMark[] };
    (w.__edubekMarks ||= []).push({ name, t: performance.now(), turn, detail });
    if ((w.__edubekMarks?.length ?? 0) > 500) w.__edubekMarks = w.__edubekMarks!.slice(-200);
    if (name === 'audio_play') reportTurn(w.__edubekMarks!);
  } catch {
    /* timing is optional */
  }
}
