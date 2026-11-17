import { buildReport } from './report';
import { SAMPLE } from './testing';
import { McqQuestion, YesNoQuestion } from '../data/schema';

describe('buildReport', () => {
  const mcq = SAMPLE.mcq as McqQuestion;
  const yesno = SAMPLE.yesno as YesNoQuestion;

  it('scales the score to 1000 with partial credit and breaks it down', () => {
    const r = buildReport('exam', 'Exam', 0, [
      { prepared: { q: mcq, optOrder: null }, answer: { type: 'mcq', choice: mcq.ans }, marked: false },
      { prepared: { q: yesno, optOrder: null }, answer: { type: 'yesno', values: [true, true, true] }, marked: true },
      { prepared: { q: SAMPLE.order, optOrder: null }, answer: { type: 'order', seq: [] }, marked: false },
    ]);
    // 1 + 2/3 + 0 out of 3
    expect(r.score).toBe(556);
    expect(r.passed).toBeFalse();
    expect(r.correct).toBe(1);
    expect(r.items[2].answered).toBeFalse();
    expect(r.byDomain.map((b) => [b.id, b.total])).toEqual([
      ['D1', 2],
      ['D2', 1],
    ]);
    expect(r.bySection.find((b) => b.id === '1.1')?.percent).toBe(100);
  });

  it('passes at 700 or more', () => {
    const r = buildReport('mock', 'Mock', 0, [
      { prepared: { q: mcq, optOrder: null }, answer: { type: 'mcq', choice: mcq.ans }, marked: false },
    ]);
    expect(r.score).toBe(1000);
    expect(r.passed).toBeTrue();
  });
});
