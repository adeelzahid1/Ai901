import { BACKUP_KEYS, UNDO_KEY, backupFileName, importBackup, makeBackup, parseBackup, readSaved, summarize, undoImport } from './backup';

/** Storage in memory, so the tests never touch the real one. */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const stat = (t: number, last: 0 | 1 = 1) => ({ a: 1, c: last, last, t, f: last });
const history = (at: number) => ({ at, mode: 'exam', title: 'x', score: 700, correct: 35, total: 50, minutes: 40, byDomain: [{ id: 'D1', percent: 70 }] });

describe('backup', () => {
  let store: MemoryStorage;
  const set = (key: string, value: unknown) => store.setItem(key, JSON.stringify(value));
  const get = (key: string) => JSON.parse(store.getItem(key) ?? 'null');
  const file = (data: Record<string, unknown>) => ({ app: 'ai901' as const, version: 1 as const, at: '2026-11-25T00:00:00.000Z', data });

  beforeEach(() => (store = new MemoryStorage()));

  it('exports and reads back every saved key', () => {
    set('ai901-progress', { 'D1-001': stat(1) });
    set('ai901-history', [history(5)]);
    set('ai901-study-v1', { understood: ['D1-001'], bookmarked: [], peeked: [], cards: { 'D1-001': { ivl: 1, due: 2, reps: 3, lapses: 0 } } });
    set('ai901-labs', { deploy: [0, 1] });
    set('ai901-lessons', { '1.1': { read: true, best: 4 } });
    set('ai901-notes', ['fairness']);
    set('ai901-exam-day', ['week-1']);
    set('ai901-own-notes', { 'q:D1-001': { text: 'hi', at: 1 } });
    set('ai901-lang', 'ro');
    set('ai901-keys', false);
    set('other-app', 1);
    const backup = makeBackup(store, new Date('2026-11-25T10:00:00Z'));
    expect(Object.keys(backup.data).sort()).toEqual([...BACKUP_KEYS].sort());
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
    expect(summarize(backup.data)).toEqual({ answered: 1, exams: 1, understood: 1, lessons: 1, notesRead: 1, ownNotes: 1 });
    expect(backupFileName(new Date('2026-11-25T10:00:00Z'))).toBe('ai901-backup-2026-11-25.json');
  });

  it('refuses files that are not a backup or have a wrong shape', () => {
    for (const text of ['', 'x', '[]', '{}', JSON.stringify({ ...file({}), app: 'other' }), JSON.stringify({ ...file({}), version: 2 })]) {
      expect(parseBackup(text)).withContext(text).toBeNull();
    }
    const wrong: [string, unknown][] = [
      ['ai901-progress', 5],
      ['ai901-progress', { 'D1-001': { a: '1' } }],
      ['ai901-history', [{ at: 1 }]],
      ['ai901-study-v1', { understood: 'D1-001' }],
      ['ai901-study-v1', { cards: { x: {} } }],
      ['ai901-labs', { deploy: ['a'] }],
      ['ai901-notes', [1]],
      ['ai901-own-notes', { 'D1-001': { text: 'no kind', at: 1 } }],
      ['ai901-own-notes', { 'q:D1-001': { text: 'x'.repeat(5000), at: 1 } }],
      ['ai901-lang', 'fr'],
    ];
    for (const [key, value] of wrong) expect(parseBackup(JSON.stringify(file({ [key]: value })))).withContext(key).toBeNull();
    expect(parseBackup(JSON.stringify(file({ '__proto__x': 1, 'ai901-undo': 1 })))?.data).toEqual({});
  });

  it('merges without losing anything: newer answers, more lists, best results', () => {
    set('ai901-progress', { a: stat(10), b: stat(10) });
    set('ai901-history', [history(3), history(1)]);
    set('ai901-study-v1', { understood: ['a'], bookmarked: ['x'], cards: { a: { ivl: 1, due: 9, reps: 1, lapses: 0 } } });
    set('ai901-labs', { deploy: [0] });
    set('ai901-lessons', { '1.1': { best: 5 }, '1.2': { read: true } });
    set('ai901-notes', ['fairness']);
    set('ai901-own-notes', { 'q:a': { text: 'new here', at: 9 }, 'q:b': { text: 'old here', at: 1 } });
    set('ai901-lang', 'ro');
    importBackup(
      store,
      file({
        'ai901-progress': { b: stat(20, 0), c: stat(1) },
        'ai901-history': [history(2), history(3)],
        'ai901-study-v1': { understood: ['a', 'b'], peeked: ['p'], cards: { a: { ivl: 3, due: 1, reps: 2, lapses: 0 } } },
        'ai901-labs': { deploy: [0, 2], text: [1] },
        'ai901-lessons': { '1.1': { read: true, best: 3 } },
        'ai901-notes': ['prompts'],
        'ai901-own-notes': { 'q:a': { text: 'old file', at: 2 }, 'q:b': { text: 'new file', at: 7 } },
        'ai901-lang': 'en',
      }),
      'merge',
    );
    expect(get('ai901-progress')).toEqual({ a: stat(10), b: stat(20, 0), c: stat(1) });
    expect(get('ai901-history').map((h: { at: number }) => h.at)).toEqual([3, 2, 1]);
    expect(get('ai901-study-v1')).toEqual({ understood: ['a', 'b'], bookmarked: ['x'], peeked: ['p'], cards: { a: { ivl: 3, due: 1, reps: 2, lapses: 0 } } });
    expect(get('ai901-labs')).toEqual({ deploy: [0, 2], text: [1] });
    expect(get('ai901-lessons')).toEqual({ '1.1': { read: true, best: 5 }, '1.2': { read: true } });
    expect(get('ai901-notes')).toEqual(['fairness', 'prompts']);
    expect(get('ai901-own-notes')['q:a'].text).toBe('new here');
    expect(get('ai901-own-notes')['q:b'].text).toBe('new file');
    expect(get('ai901-lang')).toBe('ro');
  });

  it('replaces everything but the settings, and can undo the import', () => {
    set('ai901-notes', ['fairness']);
    set('ai901-labs', { deploy: [0] });
    set('ai901-lang', 'ro');
    importBackup(store, file({ 'ai901-notes': ['prompts'] }), 'replace');
    expect(readSaved(store)).toEqual({ 'ai901-notes': ['prompts'], 'ai901-lang': 'ro' });
    expect(undoImport(store)).toBeTrue();
    expect(readSaved(store)).toEqual({ 'ai901-notes': ['fairness'], 'ai901-labs': { deploy: [0] }, 'ai901-lang': 'ro' });
    expect(store.getItem(UNDO_KEY)).toBeNull();
    expect(undoImport(store)).toBeFalse();
  });
});
