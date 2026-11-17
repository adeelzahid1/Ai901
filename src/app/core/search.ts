import { Question } from '../data/schema';

/** All visible text of a question in lower case, for the Study page search. */
export function searchText(q: Question): string {
  const parts: string[] = [q.id, q.q, q.ctx ?? '', q.exp];
  switch (q.type) {
    case 'mcq':
    case 'multi':
      parts.push(...q.opts);
      break;
    case 'yesno':
      parts.push(...q.stmts);
      break;
    case 'order':
      parts.push(...q.items);
      break;
    case 'dropdown':
      parts.push(q.tpl, ...q.opts.flat());
      break;
    case 'match':
      parts.push(...q.items, ...q.targets);
      break;
  }
  return parts.join(' ').toLowerCase();
}

/** True when every word of the query appears somewhere in the question. */
export function matchesSearch(q: Question, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchText(q);
  return words.every((w) => text.includes(w));
}
