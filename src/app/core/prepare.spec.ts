import { prepareQuestion } from './prepare';
import { createRng } from './rng';
import { SAMPLE } from './testing';
import { McqQuestion } from '../data/schema';

describe('prepareQuestion', () => {
  it('records the original index of every shown option', () => {
    const src = SAMPLE.mcq as McqQuestion;
    const { q, optOrder } = prepareQuestion(src, createRng(7));
    const shown = q as McqQuestion;
    expect(optOrder).not.toBeNull();
    (optOrder as number[]).forEach((orig, i) => expect(shown.opts[i]).toBe(src.opts[orig]));
    expect(shown.opts[shown.ans]).toBe(src.opts[src.ans]);
  });

  it('does not change the source question', () => {
    const before = JSON.stringify(SAMPLE);
    prepareQuestion(SAMPLE.mcq, createRng(1));
    prepareQuestion(SAMPLE.dropdown, createRng(1));
    expect(JSON.stringify(SAMPLE)).toBe(before);
  });

  it('moves the correct answer around across sessions', () => {
    const positions = new Set<number>();
    const rng = createRng(3);
    for (let i = 0; i < 40; i++) positions.add((prepareQuestion(SAMPLE.mcq, rng).q as McqQuestion).ans);
    expect(positions.size).toBe(4);
  });

  it('keeps Yes/No statements in their order', () => {
    expect(prepareQuestion(SAMPLE.yesno, createRng(5))).toEqual({ q: SAMPLE.yesno, optOrder: null });
  });
});
