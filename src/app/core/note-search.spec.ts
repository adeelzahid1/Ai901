import { LessonText } from '../data/lessons';
import { NOTE_TITLES, Note, loadGlossary, loadNote } from '../data/notes';
import { DOMAINS } from '../data/schema';
import { highlight, searchGlossary, searchNotes, searchWords, snippetOf } from './note-search';

const en = (t: LessonText) => (typeof t === 'string' ? t : t.en);
const ro = (t: LessonText) => (typeof t === 'string' ? t : t.ro);

describe('note search', () => {
  let notes: Note[];

  beforeAll(async () => {
    const all = await Promise.all(DOMAINS.flatMap((d) => d.subs).map((s) => loadNote(s.id)));
    notes = all.filter((n) => n !== null);
  });

  const ids = (query: string, pick = en) => searchNotes(notes, NOTE_TITLES, query, pick).map((h) => h.id);

  it('finds notes by title, text and code, with the best match first', () => {
    expect(ids('inclusiveness')[0]).toBe('inclusiveness');
    expect(ids('hallucination')).toContain('genai-how');
    expect(ids('Operation-Location')[0]).toBe('cu-app');
    expect(ids('speak_ssml_async')).toContain('speech-app');
    expect(ids('TF-IDF')[0]).toBe('text-techniques');
    expect(ids('beam search')[0]).toBe('speech-features');
    expect(ids('sora-2')[0]).toBe('image-generation');
  });

  it('needs every word and ignores case', () => {
    expect(ids('SEMANTIC segmentation')).toEqual(ids('semantic SEGMENTATION'));
    expect(ids('segmentation zebra')).toEqual([]);
    expect(ids('a')).toEqual([]);
  });

  it('searches the text of the current language', () => {
    expect(ids('yaqeen', en)).toEqual([]);
    expect(ids('yaqeen', ro).length).toBeGreaterThan(0);
  });

  it('marks the words in the snippet', () => {
    const hit = searchNotes(notes, NOTE_TITLES, 'guardrails', en)[0];
    expect(hit.snippet.some((p) => p.hit && p.text.toLowerCase() === 'guardrails')).toBeTrue();
    expect(highlight('A token is a Token.', ['token'])).toEqual([
      { text: 'A ', hit: false },
      { text: 'token', hit: true },
      { text: ' is a ', hit: false },
      { text: 'Token', hit: true },
      { text: '.', hit: false },
    ]);
    const long = `${'word '.repeat(80)}needle ${'word '.repeat(80)}`;
    expect(snippetOf(long, ['needle'])).toContain('needle');
    expect(snippetOf(long, ['needle']).length).toBeLessThan(170);
    expect(searchWords('  Token token  RAG ')).toEqual(['token', 'rag']);
  });

  it('finds glossary terms', async () => {
    const entries = await loadGlossary();
    expect(searchGlossary(entries, 'jailbreak', en).map((e) => e.term)).toContain('Jailbreak');
    expect(searchGlossary(entries, '', en)).toEqual([]);
  });
});
