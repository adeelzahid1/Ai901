import { Answer, correctLines, emptyAnswer, fillTemplate, isComplete, isStarted, scoreAnswer, templateParts } from './grading';
import { prepareQuestion } from './prepare';
import { createRng } from './rng';
import { SAMPLE } from './testing';
import { DropdownQuestion } from '../data/schema';

/** The answer that is fully correct for a question. */
function perfect(q: (typeof SAMPLE)[keyof typeof SAMPLE]): Answer {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', choice: q.ans };
    case 'multi':
      return { type: 'multi', choices: [...q.ans] };
    case 'yesno':
      return { type: 'yesno', values: [...q.ans] };
    case 'order':
      return { type: 'order', seq: [...q.ans] };
    case 'dropdown':
      return { type: 'dropdown', picks: [...q.ans] };
    case 'match':
      return { type: 'match', picks: [...q.ans] };
  }
}

describe('grading', () => {
  it('starts every type empty, unanswered and with score 0', () => {
    for (const q of Object.values(SAMPLE)) {
      const a = emptyAnswer(q);
      expect(isStarted(a)).withContext(q.type).toBeFalse();
      expect(isComplete(q, a)).withContext(q.type).toBeFalse();
      expect(scoreAnswer(q, a)).withContext(q.type).toBe(0);
    }
  });

  it('gives full marks for the correct answer of every type', () => {
    for (const q of Object.values(SAMPLE)) {
      const a = perfect(q);
      expect(isComplete(q, a)).withContext(q.type).toBeTrue();
      expect(scoreAnswer(q, a)).withContext(q.type).toBe(1);
    }
  });

  it('is all or nothing for multi-select and ordering', () => {
    expect(scoreAnswer(SAMPLE.multi, { type: 'multi', choices: [1, 2] })).toBe(0);
    expect(scoreAnswer(SAMPLE.order, { type: 'order', seq: [2, 1, 0] })).toBe(0);
  });

  it('gives partial credit for Yes/No, drop-down and matching', () => {
    expect(scoreAnswer(SAMPLE.yesno, { type: 'yesno', values: [true, true, true] })).toBeCloseTo(2 / 3);
    expect(scoreAnswer(SAMPLE.dropdown, { type: 'dropdown', picks: [1, 0] })).toBe(0.5);
    expect(scoreAnswer(SAMPLE.match, { type: 'match', picks: [2, null] })).toBe(0.5);
  });

  it('still scores correctly after options are shuffled', () => {
    const rng = createRng(42);
    for (let run = 0; run < 20; run++) {
      for (const src of Object.values(SAMPLE)) {
        const { q } = prepareQuestion(src, rng);
        expect(scoreAnswer(q, perfect(q))).withContext(src.type).toBe(1);
        // Multi-select answers are listed in display order, so compare without order.
        expect([...correctLines(q)].sort()).withContext(src.type).toEqual([...correctLines(src)].sort());
      }
    }
  });

  it('splits and fills drop-down templates', () => {
    expect(templateParts('Use {0} and {1}.')).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'blank', index: 0 },
      { kind: 'text', text: ' and ' },
      { kind: 'blank', index: 1 },
      { kind: 'text', text: '.' },
    ]);
    expect(fillTemplate(SAMPLE.dropdown as DropdownQuestion, [1, null])).toBe('Use [b] and _____.');
  });
});
