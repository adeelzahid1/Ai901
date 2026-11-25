import { LessonText } from '../data/lessons';
import { GlossaryEntry, Note } from '../data/notes';

/** Part of a snippet; matching parts are highlighted. */
export interface SnippetPart {
  text: string;
  hit: boolean;
}

export interface NoteHit {
  /** Skill id of the note. */
  id: string;
  title: string;
  snippet: SnippetPart[];
  score: number;
}

const SNIPPET = 150;
export const MIN_QUERY = 2;

export function searchWords(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
}

const hits = (text: string, words: string[]) => {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w)).length;
};

/** Splits a text into matching and other parts. */
export function highlight(text: string, words: string[]): SnippetPart[] {
  const lower = text.toLowerCase();
  const parts: SnippetPart[] = [];
  let from = 0;
  while (from < text.length) {
    const next = words
      .map((w) => ({ at: lower.indexOf(w, from), length: w.length }))
      .filter((m) => m.at >= 0)
      .sort((a, b) => a.at - b.at || b.length - a.length)[0];
    if (!next) break;
    if (next.at > from) parts.push({ text: text.slice(from, next.at), hit: false });
    parts.push({ text: text.slice(next.at, next.at + next.length), hit: true });
    from = next.at + next.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false });
  return parts;
}

/** Text around the first match, cut at spaces. */
export function snippetOf(text: string, words: string[]): string {
  if (text.length <= SNIPPET) return text;
  const lower = text.toLowerCase();
  const first = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), text.length);
  let start = first < text.length ? Math.max(0, first - 50) : 0;
  if (start > 0) start = text.indexOf(' ', start) + 1;
  let end = Math.min(text.length, start + SNIPPET);
  if (end < text.length) end = Math.max(text.lastIndexOf(' ', end), start + 1);
  return (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '');
}

/** Notes that contain every word, best match first. */
export function searchNotes(notes: Note[], titles: Record<string, LessonText>, query: string, pick: (t: LessonText) => string): NoteHit[] {
  const words = searchWords(query);
  if (query.trim().length < MIN_QUERY) return [];
  return notes
    .flatMap((note) => {
      const title = pick(titles[note.id]);
      const texts = [
        note.main,
        ...note.explain,
        ...note.deep,
        ...note.how,
        note.example.text,
        ...note.compare.flatMap((c) => [c.terms, c.text]),
        ...note.mistakes.flatMap((m) => [m.wrong, m.right]),
        ...note.exam,
        ...(note.flow ? [note.flow.title, ...note.flow.steps.flatMap((s) => (s.text ? [s.title, s.text] : [s.title]))] : []),
        ...(note.topics ?? []).flatMap((topic) => [
          topic.title,
          ...topic.text,
          ...(topic.terms ?? []).flatMap((c) => [c.term, c.text]),
          ...(topic.flows ?? []).flatMap((f) => [f.title, ...f.steps.flatMap((s) => (s.text ? [s.title, s.text] : [s.title]))]),
        ]),
      ].map(pick);
      const code = [note.example.code, ...(note.topics ?? []).map((topic) => topic.code)].filter(Boolean).join('\n');
      if (hits([title, ...texts, code].join(' '), words) < words.length) return [];
      // The text with the most different words; the earlier one wins.
      const best = [...texts, code].reduce((a, b) => (hits(b, words) > hits(a, words) ? b : a));
      const lower = [...texts, code].join(' ').toLowerCase();
      const count = words.reduce((sum, w) => sum + lower.split(w).length - 1, 0);
      const score = hits(title, words) * 20 + hits(texts[0], words) * 5 + hits(best, words) * 3 + Math.min(count, 10);
      return [{ id: note.id, title, snippet: highlight(snippetOf(best, words), words), score }];
    })
    .sort((a, b) => b.score - a.score);
}

/** Glossary terms that contain every word. */
export function searchGlossary(entries: GlossaryEntry[], query: string, pick: (t: LessonText) => string): GlossaryEntry[] {
  const words = searchWords(query);
  if (query.trim().length < MIN_QUERY) return [];
  return entries.filter((e) => hits(`${e.term} ${pick(e)}`, words) === words.length);
}
