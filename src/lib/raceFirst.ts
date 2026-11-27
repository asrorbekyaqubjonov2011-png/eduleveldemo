/**
 * Runs an attempt for each item, a little apart, and returns the first success.
 *
 * The first item starts at once. If it has not answered after hedgeMs, the next one starts beside it (up to maxRacers).
 * A failed attempt starts the next item straight away. The first success wins. A fatal error (for example an invalid
 * key, which every model would repeat) ends the race at once. If nothing answers before deadlineMs, the race fails.
 */
export function raceFirst<T>(
  items: string[],
  run: (item: string) => Promise<T>,
  opts: { hedgeMs: number; maxRacers: number; deadlineMs: number; isFatal: (e: any) => boolean }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const limit = Math.min(items.length, Math.max(1, opts.maxRacers));
    if (!items.length) {
      reject(new Error('AI modeli topilmadi'));
      return;
    }
    let done = false;
    let launched = 0;
    let failed = 0;
    const errors: string[] = [];
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      if (hedge) clearTimeout(hedge);
      if (overall) clearTimeout(overall);
      fn();
    };
    const launch = () => {
      if (done || launched >= limit) return;
      const item = items[launched++];
      run(item)
        .then((value) => finish(() => resolve(value)))
        .catch((err: any) => {
          if (done) return;
          if (opts.isFatal(err)) {
            finish(() => reject(err));
            return;
          }
          failed++;
          errors.push(`${item}: ${String(err?.message || err).slice(0, 90)}`);
          if (failed >= limit) {
            finish(() => reject(new Error(errors.join(' | '))));
          } else {
            launch();
          }
        });
      if (!done && launched < limit) hedge = setTimeout(launch, opts.hedgeMs);
    };
    const overall = setTimeout(() => finish(() => reject(new Error(errors.join(' | ') || 'AI javob bermadi: vaqt tugadi'))), opts.deadlineMs);
    launch();
  });
}
