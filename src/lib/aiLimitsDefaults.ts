/** Browser-safe copy of the default AI minutes (src/lib/aiTime.ts reaches the database, so the browser cannot import it). */
export const DEFAULT_AI_LIMITS: { freeMinutes: number; planMinutes: Record<string, number>; inPerM?: number; outPerM?: number; capSom?: number } = {
  freeMinutes: 10,
  planMinutes: { start: 30, plus: 60, gold: 90, individual: 240 }
};
