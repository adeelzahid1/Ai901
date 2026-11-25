import { Question } from '../data/schema';
import { QuestionStat } from './progress';
import { Rng, shuffle } from './rng';

export const SKILL_CHECK = 3;

/** Questions of one skill: new ones first, then the ones answered wrong last time, then the rest. */
export function pickForSkill(
  questions: readonly Question[],
  skill: string,
  stats: Record<string, QuestionStat>,
  rng: Rng,
  count = SKILL_CHECK,
): Question[] {
  const rank = (q: Question) => (!stats[q.id] ? 0 : stats[q.id].last === 0 ? 1 : 2);
  return shuffle(
    questions.filter((q) => q.sub === skill),
    rng,
  )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count);
}
