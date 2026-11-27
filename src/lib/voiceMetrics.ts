/**
 * EduBek voice latency as measured in real students' browsers. A browser sends only stage durations in milliseconds,
 * never any text. The server keeps the last 500 turns in memory (they restart with the server) and reports the median
 * and 95th percentile per stage to the owner. Values it cannot measure stay null: nothing is estimated.
 */
export interface VoiceTurnTiming {
  /** speech end → recognised text final */
  sttMs: number | null;
  /** text sent → first words of the answer */
  llmFirstMs: number | null;
  /** first sentence handed to the voice → audio ready */
  ttsMs: number | null;
  /** audio ready → sound actually playing */
  playMs: number | null;
  /** end of the student's speech → first sound (what the student feels) */
  totalMs: number | null;
  /** which voice played: the server voice or the browser's own */
  voice: 'server' | 'browser' | 'unknown';
  /** the browser family only (chrome, safari, ...) and whether it is a phone: no identifiers */
  device: 'mobile' | 'desktop' | 'unknown';
}

const FIELDS = ['sttMs', 'llmFirstMs', 'ttsMs', 'playMs', 'totalMs'] as const;
type Field = (typeof FIELDS)[number];

const buffer: (VoiceTurnTiming & { at: number })[] = [];

const bounded = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 120_000 ? Math.round(n) : null;
};

/** Validates what a browser sent. Anything unexpected becomes null. */
export function cleanTiming(input: unknown): VoiceTurnTiming | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  const t: VoiceTurnTiming = {
    sttMs: bounded(r.sttMs),
    llmFirstMs: bounded(r.llmFirstMs),
    ttsMs: bounded(r.ttsMs),
    playMs: bounded(r.playMs),
    totalMs: bounded(r.totalMs),
    voice: r.voice === 'server' || r.voice === 'browser' ? r.voice : 'unknown',
    device: r.device === 'mobile' || r.device === 'desktop' ? r.device : 'unknown'
  };
  return FIELDS.every((f) => t[f] === null) ? null : t;
}

export function recordVoiceTurn(t: VoiceTurnTiming, now = Date.now()): void {
  buffer.push({ ...t, at: now });
  if (buffer.length > 500) buffer.splice(0, buffer.length - 500);
}

export function resetVoiceMetrics(): void {
  buffer.length = 0;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export interface VoiceSummary {
  turns: number;
  stages: Record<Field, { n: number; p50: number | null; p95: number | null }>;
  byDevice: Record<'mobile' | 'desktop' | 'unknown', { turns: number; totalP50: number | null }>;
  byVoice: Record<'server' | 'browser' | 'unknown', { turns: number; totalP50: number | null }>;
}

export function voiceSummary(): VoiceSummary {
  const stages = {} as VoiceSummary['stages'];
  for (const f of FIELDS) {
    const values = buffer.map((b) => b[f]).filter((v): v is number => v !== null).sort((a, b) => a - b);
    stages[f] = { n: values.length, p50: percentile(values, 50), p95: percentile(values, 95) };
  }
  const group = <K extends string>(key: 'device' | 'voice', names: K[]) => {
    const out = {} as Record<K, { turns: number; totalP50: number | null }>;
    for (const name of names) {
      const totals = buffer.filter((b) => b[key] === name).map((b) => b.totalMs).filter((v): v is number => v !== null).sort((a, b) => a - b);
      out[name] = { turns: buffer.filter((b) => b[key] === name).length, totalP50: percentile(totals, 50) };
    }
    return out;
  };
  return { turns: buffer.length, stages, byDevice: group('device', ['mobile', 'desktop', 'unknown']), byVoice: group('voice', ['server', 'browser', 'unknown']) };
}
