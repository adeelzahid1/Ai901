import bankD1a from '../data/bank/d1-core.json';
import bankD1b from '../data/bank/d1-ext1.json';
import bankD2a from '../data/bank/d2-core.json';
import bankD2b from '../data/bank/d2-ext1.json';
import { Question, SECTIONS, sectionOf } from '../data/schema';
import { EXAM_DIFF_MIX, EXAM_TYPE_MIX, allocate, domainCounts, filterPool, pickQuestions, freshFirst } from './exam-builder';
import { SAMPLE } from './testing';
import { createRng } from './rng';

const BANK = [...bankD1a, ...bankD1b, ...bankD2a, ...bankD2b] as unknown as Question[];

describe('allocate', () => {
  it('splits by weight with largest remainders', () => {
    expect(allocate(50, [42.5, 57.5], [100, 100])).toEqual([21, 29]);
    expect(allocate(10, [1, 1, 1], [10, 10, 10]).reduce((a, b) => a + b)).toBe(10);
  });

  it('never goes over a cap and moves spare seats elsewhere', () => {
    expect(allocate(10, [9, 1], [3, 20])).toEqual([3, 7]);
    expect(allocate(10, [1, 1], [2, 3])).toEqual([2, 3]);
  });
});

describe('pickQuestions', () => {
  it('builds a 50-question exam weighted 21/29 with every section and no duplicates', () => {
    const exam = pickQuestions(BANK, {
      count: 50,
      rng: createRng(11),
      minPerSection: 2,
      typeMix: EXAM_TYPE_MIX,
      diffMix: EXAM_DIFF_MIX,
    });
    expect(exam.length).toBe(50);
    expect(new Set(exam.map((q) => q.id)).size).toBe(50);
    expect(domainCounts(exam)).toEqual({ D1: 21, D2: 29 });
    for (const s of SECTIONS) {
      const n = exam.filter((q) => sectionOf(q)?.id === s.id).length;
      expect(n).withContext(s.id).toBeGreaterThanOrEqual(2);
    }
    const types = new Set(exam.map((q) => q.type));
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('respects section, type and level filters', () => {
    const list = pickQuestions(BANK, { count: 100, rng: createRng(2), sections: ['2.3'], types: ['dropdown', 'mcq'], diffs: [2] });
    expect(list.length).toBe(filterPool(BANK, { sections: ['2.3'], types: ['dropdown', 'mcq'], diffs: [2] }).length);
    expect(list.every((q) => sectionOf(q)?.id === '2.3' && (q.type === 'dropdown' || q.type === 'mcq') && q.diff === 2)).toBeTrue();
  });

  it('returns what is available when the pool is smaller than the count', () => {
    const only = new Set(['D1-001', 'D2-010', 'D2-070']);
    const list = pickQuestions(BANK, { count: 30, rng: createRng(4), include: (q) => only.has(q.id) });
    expect(list.map((q) => q.id).sort()).toEqual([...only].sort());
  });

  it('prefers exam questions that were never answered, then the oldest answers', () => {
    const pool = ['D1', 'D2'].flatMap((d) =>
      Array.from({ length: 40 }, (_, i) => ({ ...SAMPLE.mcq, id: `${d}-${String(i).padStart(3, '0')}`, sub: d === 'D1' ? 'fairness' : 'prompts' })),
    );
    expect(freshFirst(pool, (id) => (id === 'D1-000' ? 5 : undefined), 50).some((q) => q.id === 'D1-000')).toBeFalse();
    // Every D1 question is answered, D1-039 longest ago: the oldest ones fill the domain.
    const mixed = freshFirst(pool, (id) => (id.startsWith('D1') ? 100 - Number(id.slice(3)) : undefined), 50);
    const d1 = mixed.filter((q) => q.id.startsWith('D1')).map((q) => q.id);
    expect(d1.length).toBe(23);
    expect(d1[0]).toBe('D1-039');
    expect(mixed.filter((q) => q.id.startsWith('D2')).length).toBe(40);
  });
});
