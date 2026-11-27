import { useEffect, useState } from 'react';

/** Ticks once a second toward an ISO end time and returns the parts to display. */
export function useCountdown(endsAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  const left = endsAt ? Math.max(0, Date.parse(endsAt) - now) : 0;
  const total = Math.floor(left / 1000);
  return {
    left,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: !!endsAt && left <= 0
  };
}
