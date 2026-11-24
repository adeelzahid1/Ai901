import { Question } from '../data/schema';
import { Answer } from './grading';

/** One line of the shortcut list: the keys and what they do. */
export interface ShortcutRow {
  keys: string[];
  text: string;
}

export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

/** True when the focused element uses the keys itself: text fields and drop-down lists. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.matches('textarea, select')) return true;
  return target instanceof HTMLInputElement && target.type !== 'radio' && target.type !== 'checkbox';
}

/** True when Enter or Space already presses the focused element. */
export function isPressable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a[href], summary') !== null;
}

/** Position for the keys 1 to 9, starting at 0. */
export function digitIndex(key: string): number | null {
  return /^[1-9]$/.test(key) ? Number(key) - 1 : null;
}

/** Position for the keys 1 to 9 and A to G, starting at 0. */
export function choiceIndex(key: string): number | null {
  return /^[a-g]$/i.test(key) ? key.toLowerCase().charCodeAt(0) - 97 : digitIndex(key);
}

/** Adds or removes a choice, never going above the number of answers. */
export function toggleChoice(choices: readonly number[], i: number, limit: number): number[] {
  if (choices.includes(i)) return choices.filter((c) => c !== i);
  return choices.length < limit ? [...choices, i].sort((x, y) => x - y) : [...choices];
}

/** The answer after pressing a key, or null when the key does nothing for this question. */
export function answerForKey(q: Question, a: Answer, key: string): Answer | null {
  const choice = choiceIndex(key);
  switch (a.type) {
    case 'mcq':
      return q.type === 'mcq' && choice !== null && choice < q.opts.length ? { type: 'mcq', choice } : null;
    case 'multi':
      return q.type === 'multi' && choice !== null && choice < q.opts.length
        ? { type: 'multi', choices: toggleChoice(a.choices, choice, q.ans.length) }
        : null;
    case 'yesno': {
      const value = /^[1yh]$/i.test(key) ? true : /^[2n]$/i.test(key) ? false : null;
      const at = value === null ? -1 : a.values.indexOf(null);
      if (at >= 0) return { type: 'yesno', values: a.values.map((v, k) => (k === at ? value : v)) };
      if (key !== 'Backspace') return null;
      const last = a.values.reduce((found, v, k) => (v === null ? found : k), -1);
      return last < 0 ? null : { type: 'yesno', values: a.values.map((v, k) => (k === last ? null : v)) };
    }
    case 'order': {
      if (q.type !== 'order') return null;
      if (key === 'Backspace') return a.seq.length ? { type: 'order', seq: a.seq.slice(0, -1) } : null;
      const left = q.items.map((_, i) => i).filter((i) => !a.seq.includes(i));
      const item = left[digitIndex(key) ?? -1];
      return item === undefined ? null : { type: 'order', seq: [...a.seq, item] };
    }
    case 'dropdown':
    case 'match':
      return null;
  }
}
