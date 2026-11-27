import { createHash } from 'node:crypto';

/**
 * Short-lived cache and in-flight de-duplication for AI answers that do not depend on who asks (for example a word
 * translation). It is used only where a call site opts in; personal chats, grading of a student's text and anything
 * with a user's name or history never go through it, so one student's answer can never be handed to another.
 */
interface Entry<T> { value: T; at: number }

export interface CacheStats { hits: number; misses: number; shared: number; size: number }

export class AnswerCache<T = string> {
  private store = new Map<string, Entry<T>>();
  private inflight = new Map<string, Promise<T>>();
  private hits = 0;
  private misses = 0;
  private shared = 0;
  constructor(private ttlMs = 10 * 60_000, private maxEntries = 200) {}

  static key(parts: unknown[]): string {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  }

  /** Returns the cached value, the answer of an identical call already running, or runs `compute` once. Failures are not cached. */
  async get(key: string, compute: () => Promise<T>, now = Date.now()): Promise<T> {
    const hit = this.store.get(key);
    if (hit && now - hit.at < this.ttlMs) {
      this.hits++;
      this.store.delete(key);
      this.store.set(key, hit); // most recently used goes last
      return hit.value;
    }
    const running = this.inflight.get(key);
    if (running) {
      this.shared++;
      return running;
    }
    this.misses++;
    const p = compute()
      .then((value) => {
        this.store.set(key, { value, at: Date.now() });
        while (this.store.size > this.maxEntries) this.store.delete(this.store.keys().next().value as string);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses, shared: this.shared, size: this.store.size };
  }
  clear(): void {
    this.store.clear();
    this.hits = this.misses = this.shared = 0;
  }
}

/** The one cache the AI gateway uses for opt-in calls. */
export const sharedAnswerCache = new AnswerCache<string>();
