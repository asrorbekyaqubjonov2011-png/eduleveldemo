/**
 * Real-user performance data (Core Web Vitals) from visitors' browsers. A browser sends only numbers and two labels
 * (page type, device); no URL, no identifier. The server keeps the last 2000 page views in memory (they restart with the
 * server) and reports the 75th percentile, which is the value Google uses to judge a metric. Nothing is invented: a
 * metric no browser reported stays null.
 */
export interface RumSample {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
  page: 'home' | 'content';
  device: 'mobile' | 'desktop';
}
const METRICS = ['lcp', 'inp', 'cls', 'ttfb'] as const;
type Metric = (typeof METRICS)[number];

const limits: Record<Metric, number> = { lcp: 60_000, inp: 30_000, cls: 10, ttfb: 60_000 };
const buffer: RumSample[] = [];

export function cleanRum(input: unknown): RumSample | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  const num = (m: Metric): number | null => {
    const n = Number(r[m]);
    return r[m] !== null && r[m] !== undefined && Number.isFinite(n) && n >= 0 && n <= limits[m] ? (m === 'cls' ? Math.round(n * 1000) / 1000 : Math.round(n)) : null;
  };
  const s: RumSample = { lcp: num('lcp'), inp: num('inp'), cls: num('cls'), ttfb: num('ttfb'), page: r.page === 'home' ? 'home' : 'content', device: r.device === 'mobile' ? 'mobile' : 'desktop' };
  return METRICS.every((m) => s[m] === null) ? null : s;
}

export function recordRum(s: RumSample): void {
  buffer.push(s);
  if (buffer.length > 2000) buffer.splice(0, buffer.length - 2000);
}
export function resetRum(): void {
  buffer.length = 0;
}

/** Google's thresholds: good up to the first number, poor above the second. */
export const THRESHOLDS: Record<Metric, [number, number]> = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25], ttfb: [800, 1800] };
export type Rating = 'good' | 'needs-improvement' | 'poor';
export const rate = (m: Metric, v: number): Rating => (v <= THRESHOLDS[m][0] ? 'good' : v <= THRESHOLDS[m][1] ? 'needs-improvement' : 'poor');

function p75(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(0.75 * s.length) - 1))];
}

export interface RumGroup { views: number; metrics: Record<Metric, { n: number; p75: number | null; rating: Rating | null }> }
export interface RumSummary { views: number; all: RumGroup; mobile: RumGroup; desktop: RumGroup; home: RumGroup; content: RumGroup }

function group(items: RumSample[]): RumGroup {
  const metrics = {} as RumGroup['metrics'];
  for (const m of METRICS) {
    const values = items.map((i) => i[m]).filter((v): v is number => v !== null);
    const v = p75(values);
    metrics[m] = { n: values.length, p75: v, rating: v === null ? null : rate(m, v) };
  }
  return { views: items.length, metrics };
}

export function rumSummary(): RumSummary {
  return {
    views: buffer.length,
    all: group(buffer),
    mobile: group(buffer.filter((b) => b.device === 'mobile')),
    desktop: group(buffer.filter((b) => b.device === 'desktop')),
    home: group(buffer.filter((b) => b.page === 'home')),
    content: group(buffer.filter((b) => b.page === 'content'))
  };
}
