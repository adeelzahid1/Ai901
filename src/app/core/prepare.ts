import { Question } from '../data/schema';
import { Rng, range, shuffle } from './rng';

/**
 * A question as shown in one session. `q` is a copy whose options are shuffled and whose answer
 * points at the new positions; `optOrder[i]` is the original index of the option shown at `i`
 * (one list per blank for drop-downs), so translations can follow the same order later.
 */
export interface PreparedQuestion {
  q: Question;
  optOrder: number[] | number[][] | null;
}

export function prepareQuestion(src: Question, rng: Rng): PreparedQuestion {
  switch (src.type) {
    case 'mcq': {
      const order = shuffle(range(src.opts.length), rng);
      return {
        q: { ...src, opts: order.map((i) => src.opts[i]), ans: order.indexOf(src.ans) },
        optOrder: order,
      };
    }
    case 'multi': {
      const order = shuffle(range(src.opts.length), rng);
      return {
        q: {
          ...src,
          opts: order.map((i) => src.opts[i]),
          ans: src.ans.map((a) => order.indexOf(a)).sort((x, y) => x - y),
        },
        optOrder: order,
      };
    }
    case 'match': {
      const order = shuffle(range(src.targets.length), rng);
      return {
        q: { ...src, targets: order.map((i) => src.targets[i]), ans: src.ans.map((t) => order.indexOf(t)) },
        optOrder: order,
      };
    }
    case 'order': {
      const order = shuffle(range(src.items.length), rng);
      return {
        q: { ...src, items: order.map((i) => src.items[i]), ans: src.ans.map((a) => order.indexOf(a)) },
        optOrder: order,
      };
    }
    case 'dropdown': {
      const orders = src.opts.map((list) => shuffle(range(list.length), rng));
      return {
        q: {
          ...src,
          opts: orders.map((order, b) => order.map((i) => src.opts[b][i])),
          ans: orders.map((order, b) => order.indexOf(src.ans[b])),
        },
        optOrder: orders,
      };
    }
    case 'yesno':
      return { q: src, optOrder: null };
  }
}
