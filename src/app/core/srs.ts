/** Spaced-repetition state of one flashcard. */
export interface CardState {
  /** Current interval in days; 0 while the card is new or relearning. */
  ivl: number;
  /** When the card is due again (ms since epoch). */
  due: number;
  reps: number;
  lapses: number;
}

export type Grade = 'again' | 'hard' | 'good';

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;
export const AGAIN_DELAY = 10 * MINUTE;

/** Next interval in days for Hard and Good; Again is always 10 minutes. */
export function nextInterval(state: CardState | undefined, grade: Exclude<Grade, 'again'>): number {
  const ivl = state?.ivl ?? 0;
  if (grade === 'hard') return Math.max(1, Math.round(ivl * 1.2));
  if (ivl <= 0) return 1;
  if (ivl === 1) return 3;
  return Math.round(ivl * 2.5);
}

/**
 * Again: due in 10 minutes and back into the current round, interval reset.
 * Hard: max(1, round(ivl x 1.2)) days. Good: 1 -> 3 -> round(ivl x 2.5) days.
 */
export function schedule(state: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  const reps = (state?.reps ?? 0) + 1;
  const lapses = state?.lapses ?? 0;
  if (grade === 'again') return { ivl: 0, due: now + AGAIN_DELAY, reps, lapses: lapses + (state && state.ivl > 0 ? 1 : 0) };
  const ivl = nextInterval(state, grade);
  return { ivl, due: now + ivl * DAY, reps, lapses };
}

/** Text for a grade button, e.g. "10 min", "1 day", "8 days". */
export function intervalLabel(state: CardState | undefined, grade: Grade): string {
  if (grade === 'again') return '10 min';
  const days = nextInterval(state, grade);
  return days === 1 ? '1 day' : `${days} days`;
}

/** New cards and cards whose due time has passed. */
export function isDue(state: CardState | undefined, now = Date.now()): boolean {
  return !state || state.due <= now;
}

/** Cards that were studied before and are due again (new cards are not counted). */
export function isReviewDue(state: CardState | undefined, now = Date.now()): boolean {
  return !!state && state.due <= now;
}
