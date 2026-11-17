import { Question } from '../data/schema';

const base = { diff: 1 as const, q: 'Question text', exp: 'x'.repeat(160), ref: 'https://learn.microsoft.com/en-us/' };

/** Small hand-made questions of every type for unit tests. */
export const SAMPLE: Record<Question['type'], Question> = {
  mcq: { ...base, id: 'D1-901', sub: 'fairness', type: 'mcq', opts: ['A', 'B', 'C', 'D'], ans: 2 },
  multi: { ...base, id: 'D1-902', sub: 'fairness', type: 'multi', opts: ['A', 'B', 'C', 'D', 'E'], ans: [1, 3] },
  yesno: { ...base, id: 'D1-903', sub: 'genai-how', type: 'yesno', stmts: ['S1', 'S2', 'S3'], ans: [true, false, true] },
  order: { ...base, id: 'D2-904', sub: 'prompts', type: 'order', items: ['I0', 'I1', 'I2', 'I3'], ans: [2, 0, 1] },
  dropdown: { ...base, id: 'D2-905', sub: 'prompts', type: 'dropdown', tpl: 'Use {0} and {1}.', opts: [['a', 'b'], ['c', 'd', 'e']], ans: [1, 2] },
  match: { ...base, id: 'D2-906', sub: 'cu-app', type: 'match', items: ['X', 'Y'], targets: ['T0', 'T1', 'T2'], ans: [2, 0] },
};
