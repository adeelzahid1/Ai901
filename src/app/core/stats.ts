import { Question, domainOf, sectionOf } from '../data/schema';
import { QuestionStat } from './progress';

export interface AreaStats {
  /** Questions in the bank for this area. */
  total: number;
  /** Distinct questions answered at least once. */
  seen: number;
  attempts: number;
  correct: number;
  /** Open mistakes: last attempt wrong. */
  mistakes: number;
  /** Correct attempts in percent, or null when nothing was answered. */
  accuracy: number | null;
  /** Seen questions in percent of the bank for this area. */
  coverage: number;
}

export type AreaKey = 'domain' | 'section' | 'sub';

/** Groups bank questions and progress by domain, study section or `domain|sub`. */
export function areaStats(questions: readonly Question[], stats: Record<string, QuestionStat>, key: AreaKey): Map<string, AreaStats> {
  const out = new Map<string, AreaStats>();
  for (const q of questions) {
    const k = key === 'domain' ? domainOf(q) : key === 'section' ? (sectionOf(q)?.id ?? '?') : `${domainOf(q)}|${q.sub}`;
    const a = out.get(k) ?? { total: 0, seen: 0, attempts: 0, correct: 0, mistakes: 0, accuracy: null, coverage: 0 };
    a.total++;
    const s = stats[q.id];
    if (s) {
      a.seen++;
      a.attempts += s.a;
      a.correct += s.c;
      if (s.last === 0) a.mistakes++;
    }
    out.set(k, a);
  }
  for (const a of out.values()) {
    a.accuracy = a.attempts ? Math.round((a.correct / a.attempts) * 100) : null;
    a.coverage = a.total ? Math.round((a.seen / a.total) * 100) : 0;
  }
  return out;
}
