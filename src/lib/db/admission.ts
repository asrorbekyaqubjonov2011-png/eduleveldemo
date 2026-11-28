type Permit = () => void;

/** Limits active snapshots and absorbs short bursts with a bounded, cancellable FIFO. */
export function createAdmission(limit: number, queueLimit: number, waitMs: number) {
  let active = 0;
  const waiting = new Set<(permit: Permit) => void>();

  function grant(): Permit {
    active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      const accept = waiting.values().next().value;
      if (accept) accept(grant());
    };
  }

  function acquire(signal: AbortSignal, mayWait = true): Promise<Permit | null> {
    if (signal.aborted) return Promise.resolve(null);
    if (active < limit && !waiting.size) return Promise.resolve(grant());
    if (!mayWait || waiting.size >= queueLimit) return Promise.resolve(null);

    return new Promise(resolve => {
      const finish = (permit: Permit | null) => {
        if (!waiting.delete(accept)) return;
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        resolve(permit);
      };
      const accept = (permit: Permit) => finish(permit);
      const cancel = () => finish(null);
      const timer = setTimeout(cancel, waitMs);
      waiting.add(accept);
      signal.addEventListener('abort', cancel, { once: true });
    });
  }

  return { acquire };
}
