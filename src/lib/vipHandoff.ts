/**
 * Keeps the VIP plan a visitor picked on the landing page until they sign in.
 * sessionStorage only: it is a convenience for one browser tab, not stored state.
 */
const KEY = 'edulevel_pending_plan';

export function setPendingPlan(planId: string): void {
  try {
    sessionStorage.setItem(KEY, planId);
  } catch {
    /* storage unavailable: the visitor simply picks the plan again after login */
  }
}

export function peekPendingPlan(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function takePendingPlan(): string | null {
  const id = peekPendingPlan();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return id;
}
