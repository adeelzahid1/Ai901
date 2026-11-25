import { MAX_NOTE, OWN_NOTES_KEY } from './own-notes';

/** Everything the app saves, as one file. */
export interface Backup {
  app: 'ai901';
  version: 1;
  /** When the file was made (ISO). */
  at: string;
  data: Record<string, unknown>;
}

export type ImportMode = 'merge' | 'replace';

/** Copy of the saved data from before the last import. It is not part of a backup. */
export const UNDO_KEY = 'ai901-undo';
const MAX_BYTES = 5_000_000;
const MAX_HISTORY = 30;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const every = (v: unknown, test: (x: unknown) => boolean) => isObject(v) && Object.values(v).every(test);

const isStat = (v: unknown) =>
  isObject(v) && [v['a'], v['c'], v['t']].every(isNumber) && (v['last'] === 0 || v['last'] === 1) && [undefined, null, 0, 1].includes(v['f'] as undefined);
const isHistory = (v: unknown) =>
  isObject(v) &&
  [v['at'], v['score'], v['correct'], v['total'], v['minutes']].every(isNumber) &&
  typeof v['mode'] === 'string' &&
  typeof v['title'] === 'string' &&
  Array.isArray(v['byDomain']) &&
  v['byDomain'].every((d) => isObject(d) && typeof d['id'] === 'string' && isNumber(d['percent']));
const isCard = (v: unknown) => isObject(v) && [v['ivl'], v['due'], v['reps'], v['lapses']].every(isNumber);
const isStudy = (v: unknown) =>
  isObject(v) &&
  ['understood', 'bookmarked', 'peeked'].every((k) => v[k] === undefined || isStrings(v[k])) &&
  (v['cards'] === undefined || every(v['cards'], isCard));
const isLesson = (v: unknown) =>
  isObject(v) && [undefined, true, false].includes(v['read'] as undefined) && (v['best'] === undefined || isNumber(v['best']));
const isSteps = (v: unknown) => Array.isArray(v) && v.every(isNumber);
const isOwnNote = (v: unknown) => isObject(v) && typeof v['text'] === 'string' && v['text'].length <= MAX_NOTE && isNumber(v['at']);

const union = (a: unknown, b: unknown) => [...new Set([...(a as unknown[]), ...(b as unknown[])])];
/** Joins two objects; entries that exist in both are combined. */
const join = <T>(a: unknown, b: unknown, both: (x: T, y: T) => T) => {
  const out = { ...(a as Record<string, T>) };
  for (const [k, v] of Object.entries(b as Record<string, T>)) out[k] = k in out ? both(out[k], v) : v;
  return out;
};

interface Rule {
  valid: (v: unknown) => boolean;
  /** Combines the saved value with the value of the file. */
  merge: (saved: unknown, file: unknown) => unknown;
}

const keepSaved = (saved: unknown) => saved;

/** Every saved key with its shape and how two versions are combined. Other keys are ignored. */
const RULES: Record<string, Rule> = {
  'ai901-progress': {
    valid: (v) => every(v, isStat),
    merge: (a, b) => join<{ t: number }>(a, b, (x, y) => (y.t > x.t ? y : x)),
  },
  'ai901-history': {
    valid: (v) => Array.isArray(v) && v.every(isHistory),
    merge: (a, b) => {
      const all = [...(a as { at: number }[]), ...(b as { at: number }[])];
      return [...new Map(all.map((h) => [h.at, h])).values()].sort((x, y) => y.at - x.at).slice(0, MAX_HISTORY);
    },
  },
  'ai901-study-v1': {
    valid: isStudy,
    merge: (a, b) => {
      const [x, y] = [a as Json, b as Json];
      const list = (k: string) => union(x[k] ?? [], y[k] ?? []);
      const cards = join<{ reps: number; due: number }>(x['cards'] ?? {}, y['cards'] ?? {}, (p, q) => (q.reps > p.reps || (q.reps === p.reps && q.due > p.due) ? q : p));
      return { understood: list('understood'), bookmarked: list('bookmarked'), peeked: list('peeked'), cards };
    },
  },
  'ai901-labs': { valid: (v) => every(v, isSteps), merge: (a, b) => join<unknown[]>(a, b, (x, y) => union(x, y)) },
  'ai901-lessons': {
    valid: (v) => every(v, isLesson),
    merge: (a, b) =>
      join<{ read?: boolean; best?: number }>(a, b, (x, y) => ({
        ...(x.read || y.read ? { read: true } : {}),
        ...(x.best === undefined && y.best === undefined ? {} : { best: Math.max(x.best ?? 0, y.best ?? 0) }),
      })),
  },
  'ai901-notes': { valid: isStrings, merge: union },
  'ai901-exam-day': { valid: isStrings, merge: union },
  [OWN_NOTES_KEY]: {
    valid: (v) => isObject(v) && Object.keys(v).every((k) => /^[qsn]:/.test(k)) && every(v, isOwnNote),
    merge: (a, b) => join<{ at: number }>(a, b, (x, y) => (y.at > x.at ? y : x)),
  },
  'ai901-lang': { valid: (v) => v === 'en' || v === 'ro', merge: keepSaved },
  'ai901-keys': { valid: (v) => typeof v === 'boolean', merge: keepSaved },
};

export const BACKUP_KEYS = Object.keys(RULES);

/** Reads what is saved now. Values that cannot be read are left out. */
export function readSaved(storage: Storage): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const value: unknown = JSON.parse(raw);
      if (RULES[key].valid(value)) data[key] = value;
    } catch {
      // Not JSON: nothing the app could use.
    }
  }
  return data;
}

export function makeBackup(storage: Storage, at = new Date()): Backup {
  return { app: 'ai901', version: 1, at: at.toISOString(), data: readSaved(storage) };
}

export const backupFileName = (at = new Date()) => `ai901-backup-${at.toISOString().slice(0, 10)}.json`;

/** The backup in a file, or null when the file is not a valid backup of this app. Unknown keys are dropped. */
export function parseBackup(text: string): Backup | null {
  if (text.length > MAX_BYTES) return null;
  try {
    const file: unknown = JSON.parse(text);
    if (!isObject(file) || file['app'] !== 'ai901' || file['version'] !== 1 || typeof file['at'] !== 'string' || !isObject(file['data'])) return null;
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(file['data'])) {
      if (!Object.hasOwn(RULES, key)) continue;
      if (!RULES[key].valid(value)) return null;
      data[key] = value;
    }
    return { app: 'ai901', version: 1, at: file['at'], data };
  } catch {
    return null;
  }
}

/** What is in a backup, for a check before the import. */
export function summarize(data: Record<string, unknown>) {
  const size = (key: string) => {
    const v = data[key];
    return Array.isArray(v) ? v.length : isObject(v) ? Object.keys(v).length : 0;
  };
  const study = isObject(data['ai901-study-v1']) ? data['ai901-study-v1'] : {};
  return {
    answered: size('ai901-progress'),
    exams: size('ai901-history'),
    understood: isStrings(study['understood']) ? study['understood'].length : 0,
    lessons: size('ai901-lessons'),
    notesRead: size('ai901-notes'),
    ownNotes: size(OWN_NOTES_KEY),
  };
}

function write(storage: Storage, data: Record<string, unknown>): void {
  for (const key of BACKUP_KEYS) {
    if (key in data) storage.setItem(key, JSON.stringify(data[key]));
    else storage.removeItem(key);
  }
}

/** Writes a backup and keeps a copy of the old data, so the import can be undone. */
export function importBackup(storage: Storage, backup: Backup, mode: ImportMode): void {
  const before = readSaved(storage);
  storage.setItem(UNDO_KEY, JSON.stringify(makeBackup(storage)));
  if (mode === 'replace') {
    // Language and shortcut settings stay when the file has none.
    const settings = Object.fromEntries(['ai901-lang', 'ai901-keys'].filter((k) => k in before).map((k) => [k, before[k]]));
    write(storage, { ...settings, ...backup.data });
    return;
  }
  const data = { ...before };
  for (const [key, value] of Object.entries(backup.data)) data[key] = key in before ? RULES[key].merge(before[key], value) : value;
  write(storage, data);
}

/** Restores the data from before the last import. Returns false when there is nothing to restore. */
export function undoImport(storage: Storage): boolean {
  const before = parseBackup(storage.getItem(UNDO_KEY) ?? '');
  if (!before) return false;
  write(storage, before.data);
  storage.removeItem(UNDO_KEY);
  return true;
}
