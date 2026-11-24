import { DOMAINS, Question } from '../data/schema';
import { QuestionStat } from './progress';
import { READY_ANSWERS, firstResult, lowerBound, readiness } from './readiness';
import { SAMPLE } from './testing';

const stat = (s: Partial<QuestionStat>): QuestionStat => ({ a: 1, c: 1, last: 1, t: 0, ...s });
const list = (prefix: 'D1' | 'D2', sub: string, n: number): Question[] =>
  Array.from({ length: n }, (_, i) => ({ ...SAMPLE.mcq, id: `${prefix}-${String(i).padStart(3, '0')}`, sub }));

describe('readiness', () => {
  it('uses the first answer only', () => {
    expect(firstResult(stat({ a: 3, c: 2, last: 1, f: 0 }))).toBe(0);
    expect(firstResult(stat({ a: 2, c: 2, last: 1, f: null }))).withContext('answer was seen before').toBeNull();
    expect(firstResult(stat({ a: 1, c: 0, last: 0 }))).withContext('saved before first answers were kept').toBe(0);
    expect(firstResult(stat({ a: 4, c: 3, last: 1 }))).toBeNull();
  });

  it('trusts a share more when there are more answers', () => {
    expect(lowerBound(8, 10)).toBeLessThan(lowerBound(80, 100));
    expect(lowerBound(80, 100)).toBeGreaterThan(0.73);
    expect(lowerBound(0, 0)).toBe(0);
  });

  it('waits for enough answers in every domain', () => {
    const questions = [...list('D1', 'fairness', 60), ...list('D2', 'prompts', 10)];
    const stats = Object.fromEntries(questions.map((q) => [q.id, stat({ f: 1 })]));
    const r = readiness(questions, stats, DOMAINS);
    expect(r.domains.map((d) => d.level)).toEqual(['ready', 'unknown']);
    expect(r.level).toBe('unknown');
    expect(r.score).toBeNull();
  });

  it('weighs the domains like the exam and is as good as the weakest domain', () => {
    const questions = [...list('D1', 'fairness', READY_ANSWERS), ...list('D2', 'prompts', READY_ANSWERS)];
    const stats = Object.fromEntries(
      questions.map((q, i) => [q.id, stat({ f: q.id.startsWith('D1') || i % 2 === 0 ? 1 : 0 })]),
    );
    const r = readiness(questions, stats, DOMAINS);
    expect(r.domains.map((d) => d.percent)).toEqual([100, 50]);
    expect(r.level).toBe('learn');
    expect(Math.abs((r.score ?? 0) - (425 + 0.5 * 575))).toBeLessThan(1);
  });
});
