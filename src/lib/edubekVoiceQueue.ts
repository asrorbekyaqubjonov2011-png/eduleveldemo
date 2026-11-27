/**
 * Pure helpers for Edubek's spoken replies (no DOM, so they can be unit tested).
 */

export interface SentenceSplit {
  sentences: string[];
  next: number;
}

/**
 * Splits a streamed answer into pieces that can be spoken, starting at index `from`. A full sentence always
 * ends a piece. Before the first sentence is complete, a clause (ending in a comma, colon or semicolon) of at
 * least four words also ends a piece, so Edubek starts speaking about a second earlier. Order is kept.
 */
export function takeSentences(text: string, from: number): SentenceSplit {
  const out: string[] = [];
  let start = from;
  const re = /[^.!?\n]+[.!?]+(?=\s|$)|[^\n]+\n/g;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(m[0].trim());
    start = re.lastIndex;
  }
  if (out.length === 0 && from === 0) {
    const clause = /[,;:](?=\s)/g;
    let c: RegExpExecArray | null;
    let cut = -1;
    while ((c = clause.exec(text))) {
      const head = text.slice(0, c.index + 1).trim();
      if (head.split(/\s+/).length >= 4) cut = c.index + 1;
    }
    if (cut > 0) {
      out.push(text.slice(0, cut).trim());
      start = cut;
    }
  }
  return { sentences: out.filter(Boolean), next: start };
}

export interface SpeechQueue {
  /** Adds a piece to the end of the queue. Pieces are spoken one after another, in the order pushed. */
  push(text: string, mood?: string): void;
  /** Marks the stream as finished. `onDrained` runs once everything pushed so far has been spoken. */
  end(): void;
  /** Drops everything not yet spoken and ignores the piece being spoken when it ends. */
  cancel(): void;
  /** Number of pieces pushed in this generation that have not finished yet. */
  readonly pending: number;
}

/**
 * Plays pieces strictly in order, even when a later piece's audio is ready first. `speak` must resolve when
 * the piece has finished (or was stopped); cancel() makes every older piece's completion a no-op.
 */
export function createSpeechQueue(speak: (text: string, mood?: string) => Promise<void>, onDrained: () => void): SpeechQueue {
  let gen = 0;
  let queued = 0;
  let done = 0;
  let ended = false;
  let chain: Promise<void> = Promise.resolve();
  const check = (g: number) => {
    if (g === gen && ended && done >= queued) onDrained();
  };
  return {
    push(text, mood) {
      const g = gen;
      queued += 1;
      chain = chain.then(async () => {
        if (g !== gen) return;
        try {
          await speak(text, mood);
        } catch {
          /* a failed piece is skipped */
        }
        if (g !== gen) return;
        done += 1;
        check(g);
      });
    },
    end() {
      ended = true;
      check(gen);
    },
    cancel() {
      gen += 1;
      queued = 0;
      done = 0;
      ended = false;
      chain = Promise.resolve();
    },
    get pending() {
      return queued - done;
    }
  };
}
