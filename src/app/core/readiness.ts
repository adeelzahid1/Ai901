import { Domain, DomainId, Question, domainOf, weightMid } from '../data/schema';
import { QuestionStat } from './progress';

/** First answers a domain needs before it is rated. */
export const READY_ANSWERS = 40;

/** unknown: too few answers; learn: keep studying; close: nearly there; ready: pass level even with bad luck. */
export type ReadinessLevel = 'unknown' | 'learn' | 'close' | 'ready';

export interface DomainReadiness {
  id: DomainId;
  /** Questions with a first answer that counts. */
  answers: number;
  correct: number;
  /** First answers that were right, in percent, or null without answers. */
  percent: number | null;
  level: ReadinessLevel;
}

export interface Readiness {
  domains: DomainReadiness[];
  /** Estimated exam score out of 1000 from the domain weights, or null until every domain is rated. */
  score: number | null;
  level: ReadinessLevel;
}

const ORDER: ReadinessLevel[] = ['unknown', 'learn', 'close', 'ready'];

/**
 * Result of the first answer, or null when it does not count: the learner had already seen the answer,
 * or only later attempts are known.
 */
export function firstResult(s: QuestionStat): 0 | 1 | null {
  if (s.f !== undefined) return s.f;
  return s.a === 1 ? s.last : null;
}

/** Lower end of the 90% Wilson interval: what the real share is at least, with few answers counting less. */
export function lowerBound(correct: number, answers: number): number {
  if (answers === 0) return 0;
  const z = 1.28;
  const p = correct / answers;
  const mid = p + (z * z) / (2 * answers);
  const spread = z * Math.sqrt((p * (1 - p)) / answers + (z * z) / (4 * answers * answers));
  return (mid - spread) / (1 + (z * z) / answers);
}

function level(correct: number, answers: number): ReadinessLevel {
  if (answers < READY_ANSWERS) return 'unknown';
  if (lowerBound(correct, answers) >= 0.75) return 'ready';
  return correct / answers >= 0.7 ? 'close' : 'learn';
}

/** Readiness per domain from first answers only, so repeated questions do not count as progress. */
export function readiness(
  questions: readonly Question[],
  stats: Record<string, QuestionStat>,
  domains: readonly Domain[],
): Readiness {
  const rows = domains.map<DomainReadiness>((d) => {
    const results = questions
      .filter((q) => domainOf(q) === d.id && stats[q.id])
      .map((q) => firstResult(stats[q.id]))
      .filter((r) => r !== null);
    const correct = results.filter((r) => r === 1).length;
    return {
      id: d.id,
      answers: results.length,
      correct,
      percent: results.length ? Math.round((correct / results.length) * 100) : null,
      level: level(correct, results.length),
    };
  });
  const worst = ORDER[Math.min(...rows.map((r) => ORDER.indexOf(r.level)))];
  const weights = domains.map(weightMid);
  const total = weights.reduce((a, b) => a + b, 0);
  const share = rows.reduce((sum, r, i) => sum + (r.answers ? r.correct / r.answers : 0) * (weights[i] / total), 0);
  return { domains: rows, score: worst === 'unknown' ? null : Math.round(share * 1000), level: worst };
}
