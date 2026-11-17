import { DropdownQuestion, Question } from '../data/schema';

export type Answer =
  | { type: 'mcq'; choice: number | null }
  | { type: 'multi'; choices: number[] }
  | { type: 'yesno'; values: (boolean | null)[] }
  | { type: 'order'; seq: number[] }
  | { type: 'dropdown'; picks: (number | null)[] }
  | { type: 'match'; picks: (number | null)[] };

export function emptyAnswer(q: Question): Answer {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', choice: null };
    case 'multi':
      return { type: 'multi', choices: [] };
    case 'yesno':
      return { type: 'yesno', values: q.stmts.map(() => null) };
    case 'order':
      return { type: 'order', seq: [] };
    case 'dropdown':
      return { type: 'dropdown', picks: q.opts.map(() => null) };
    case 'match':
      return { type: 'match', picks: q.items.map(() => null) };
  }
}

/** True when every part of the question has a response. */
export function isComplete(q: Question, a: Answer): boolean {
  switch (a.type) {
    case 'mcq':
      return a.choice !== null;
    case 'multi':
      return q.type === 'multi' && a.choices.length === q.ans.length;
    case 'yesno':
      return a.values.every((v) => v !== null);
    case 'order':
      return q.type === 'order' && a.seq.length === q.ans.length;
    case 'dropdown':
    case 'match':
      return a.picks.every((p) => p !== null);
  }
}

/** True when the learner has given at least part of an answer. */
export function isStarted(a: Answer): boolean {
  switch (a.type) {
    case 'mcq':
      return a.choice !== null;
    case 'multi':
      return a.choices.length > 0;
    case 'yesno':
      return a.values.some((v) => v !== null);
    case 'order':
      return a.seq.length > 0;
    case 'dropdown':
    case 'match':
      return a.picks.some((p) => p !== null);
  }
}

const fraction = (hits: number, total: number) => (total ? hits / total : 0);

/**
 * Score from 0 to 1. Single-answer, multi-select and ordering questions are all or nothing;
 * Yes/No sets, drop-downs and matching give one share per correct part, like the real exam.
 */
export function scoreAnswer(q: Question, a: Answer): number {
  switch (q.type) {
    case 'mcq':
      return a.type === 'mcq' && a.choice === q.ans ? 1 : 0;
    case 'multi': {
      if (a.type !== 'multi' || a.choices.length !== q.ans.length) return 0;
      return q.ans.every((x) => a.choices.includes(x)) ? 1 : 0;
    }
    case 'order': {
      if (a.type !== 'order' || a.seq.length !== q.ans.length) return 0;
      return q.ans.every((x, i) => a.seq[i] === x) ? 1 : 0;
    }
    case 'yesno':
      return a.type === 'yesno' ? fraction(q.ans.filter((v, i) => a.values[i] === v).length, q.ans.length) : 0;
    case 'dropdown':
    case 'match':
      return a.type === q.type ? fraction(q.ans.filter((v, i) => a.picks[i] === v).length, q.ans.length) : 0;
  }
}

export type TemplatePart = { kind: 'text'; text: string } | { kind: 'blank'; index: number };

/** Splits a drop-down template such as "Use {0} with {1}." into text and blank parts. */
export function templateParts(tpl: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let last = 0;
  for (const m of tpl.matchAll(/\{(\d+)\}/g)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: 'text', text: tpl.slice(last, at) });
    parts.push({ kind: 'blank', index: Number(m[1]) });
    last = at + m[0].length;
  }
  if (last < tpl.length) parts.push({ kind: 'text', text: tpl.slice(last) });
  return parts;
}

export function fillTemplate(q: DropdownQuestion, picks: readonly (number | null)[]): string {
  return q.tpl.replace(/\{(\d+)\}/g, (_, b: string) => {
    const pick = picks[Number(b)];
    return pick === null || pick === undefined ? '_____' : `[${q.opts[Number(b)][pick]}]`;
  });
}

const yesNo = (v: boolean | null) => (v === null ? '(no answer)' : v ? 'Yes' : 'No');

/** The correct answer as readable lines. */
export function correctLines(q: Question): string[] {
  switch (q.type) {
    case 'mcq':
      return [q.opts[q.ans]];
    case 'multi':
      return q.ans.map((i) => q.opts[i]);
    case 'yesno':
      return q.stmts.map((s, i) => `${yesNo(q.ans[i])}: ${s}`);
    case 'order':
      return q.ans.map((i, k) => `${k + 1}. ${q.items[i]}`);
    case 'dropdown':
      return [fillTemplate(q, q.ans)];
    case 'match':
      return q.items.map((item, i) => `${item} → ${q.targets[q.ans[i]]}`);
  }
}

/** The learner's answer as readable lines. */
export function answerLines(q: Question, a: Answer): string[] {
  if (!isStarted(a)) return ['(no answer)'];
  switch (a.type) {
    case 'mcq':
      return q.type === 'mcq' && a.choice !== null ? [q.opts[a.choice]] : [];
    case 'multi':
      return q.type === 'multi' ? a.choices.map((i) => q.opts[i]) : [];
    case 'yesno':
      return q.type === 'yesno' ? q.stmts.map((s, i) => `${yesNo(a.values[i])}: ${s}`) : [];
    case 'order':
      return q.type === 'order' ? a.seq.map((i, k) => `${k + 1}. ${q.items[i]}`) : [];
    case 'dropdown':
      return q.type === 'dropdown' ? [fillTemplate(q, a.picks)] : [];
    case 'match':
      return q.type === 'match'
        ? q.items.map((item, i) => {
            const p = a.picks[i];
            return `${item} → ${p === null || p === undefined ? '(no answer)' : q.targets[p]}`;
          })
        : [];
  }
}
