import { Question } from '../data/schema';
import { PreparedQuestion } from './prepare';

/** Translated text of a list; `null` keeps the English text (Azure terms, commands, code). */
export type RomanList = (string | null)[];

/**
 * Roman Urdu text of one question, in the order of the source question. Fields that are left out
 * stay in English. Drop-down choices are in `blanks`, one list (or `null`) per blank.
 */
export interface RomanText {
  q: string;
  exp: string;
  ctx?: string;
  opts?: RomanList;
  stmts?: RomanList;
  items?: RomanList;
  targets?: RomanList;
  tpl?: string;
  blanks?: (RomanList | null)[];
}

type OptOrder = PreparedQuestion['optOrder'];

/** `shown[i]` is the English text at position i; `order[i]` is its index in the source question. */
function list(shown: string[], ro: RomanList | null | undefined, order: number[] | null): string[] {
  if (!ro) return shown;
  return shown.map((text, i) => ro[order ? order[i] : i] ?? text);
}

/**
 * Returns the question with its Roman Urdu text. `optOrder` is the shuffle recorded by
 * `prepareQuestion`, so translated choices follow the order on screen; answers do not change.
 */
export function translate(q: Question, ro: RomanText | undefined, optOrder: OptOrder = null): Question {
  if (!ro) return q;
  const base = { q: ro.q, exp: ro.exp, ctx: q.ctx === undefined ? undefined : (ro.ctx ?? q.ctx) };
  const flat = optOrder as number[] | null;
  switch (q.type) {
    case 'mcq':
      return { ...q, ...base, opts: list(q.opts, ro.opts, flat) };
    case 'multi':
      return { ...q, ...base, opts: list(q.opts, ro.opts, flat) };
    case 'yesno':
      return { ...q, ...base, stmts: list(q.stmts, ro.stmts, null) };
    case 'order':
      return { ...q, ...base, items: list(q.items, ro.items, flat) };
    case 'match':
      return { ...q, ...base, items: list(q.items, ro.items, null), targets: list(q.targets, ro.targets, flat) };
    case 'dropdown': {
      const orders = optOrder as number[][] | null;
      return {
        ...q,
        ...base,
        tpl: ro.tpl ?? q.tpl,
        opts: q.opts.map((o, b) => list(o, ro.blanks?.[b], orders ? orders[b] : null)),
      };
    }
  }
}
