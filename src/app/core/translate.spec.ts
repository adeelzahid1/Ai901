import { DropdownQuestion, MatchQuestion, McqQuestion, OrderQuestion, YesNoQuestion } from '../data/schema';
import { prepareQuestion } from './prepare';
import { createRng } from './rng';
import { SAMPLE } from './testing';
import { RomanText, translate } from './translate';

const RO: RomanText = { q: 'Sawal', exp: 'Wajah' };

describe('translate', () => {
  it('returns the same question when there is no translation', () => {
    expect(translate(SAMPLE.mcq, undefined)).toBe(SAMPLE.mcq);
  });

  it('replaces the stem and explanation and keeps untranslated choices in English', () => {
    const q = translate(SAMPLE.mcq, { ...RO, opts: ['ro A', null, 'ro C', null] }) as McqQuestion;
    expect(q.q).toBe('Sawal');
    expect(q.exp).toBe('Wajah');
    expect(q.opts).toEqual(['ro A', 'B', 'ro C', 'D']);
    expect(q.ans).toBe((SAMPLE.mcq as McqQuestion).ans);
    expect((translate(SAMPLE.mcq, RO) as McqQuestion).opts).toEqual(['A', 'B', 'C', 'D']);
  });

  it('follows the shuffle of the session for every type', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const mcq = prepareQuestion(SAMPLE.mcq, createRng(seed));
      const mcqRo = translate(mcq.q, { ...RO, opts: ['ro A', 'ro B', 'ro C', 'ro D'] }, mcq.optOrder) as McqQuestion;
      expect(mcqRo.opts).toEqual((mcq.q as McqQuestion).opts.map((o) => `ro ${o}`));
      expect(mcqRo.opts[mcqRo.ans]).toBe('ro C');

      const order = prepareQuestion(SAMPLE.order, createRng(seed));
      const orderRo = translate(order.q, { ...RO, items: ['ro I0', 'ro I1', 'ro I2', 'ro I3'] }, order.optOrder) as OrderQuestion;
      expect(orderRo.items).toEqual((order.q as OrderQuestion).items.map((o) => `ro ${o}`));

      const match = prepareQuestion(SAMPLE.match, createRng(seed));
      const matchRo = translate(match.q, { ...RO, items: ['ro X', null], targets: ['ro T0', 'ro T1', 'ro T2'] }, match.optOrder) as MatchQuestion;
      expect(matchRo.items).toEqual(['ro X', 'Y']);
      expect(matchRo.targets).toEqual((match.q as MatchQuestion).targets.map((o) => `ro ${o}`));
      expect(matchRo.targets[matchRo.ans[0]]).toBe('ro T2');

      const drop = prepareQuestion(SAMPLE.dropdown, createRng(seed));
      const dropRo = translate(drop.q, { ...RO, tpl: '{0} aur {1}.', blanks: [null, ['ro c', 'ro d', 'ro e']] }, drop.optOrder) as DropdownQuestion;
      expect(dropRo.tpl).toBe('{0} aur {1}.');
      expect(dropRo.opts[0]).toEqual((drop.q as DropdownQuestion).opts[0]);
      expect(dropRo.opts[1]).toEqual((drop.q as DropdownQuestion).opts[1].map((o) => `ro ${o}`));
    }
  });

  it('translates statements in their order and only adds a context the question has', () => {
    const q = translate(SAMPLE.yesno, { ...RO, stmts: ['ro S1', 'ro S2', 'ro S3'], ctx: 'x' }) as YesNoQuestion;
    expect(q.stmts).toEqual(['ro S1', 'ro S2', 'ro S3']);
    expect(q.ctx).toBeUndefined();
    expect(translate({ ...SAMPLE.mcq, ctx: 'Context' }, RO).ctx).toBe('Context');
  });
});
