import { Bilingual } from './labs';

/** Text in both languages, or one string when it is the same in both. */
export type LessonText = string | Bilingual;

/** The lesson of one study section. */
export interface Lesson {
  id: string;
  minutes: number;
  /** Lab that practices the section, e.g. chat-client. */
  lab?: string;
  intro: LessonText;
  concepts: { term: LessonText; text: LessonText }[];
  example: { title: LessonText; text: LessonText; code?: string };
  /** "Which one when" table. */
  table: { title: LessonText; head: LessonText[]; rows: LessonText[][] };
  remember: LessonText[];
  traps: LessonText[];
  /** Five study questions of the section (never exam-only ones). */
  check: string[];
  ref: string;
}

const LOADERS: Record<string, () => Promise<Lesson>> = {
  '1.1': () => import('./lessons/1.1.json').then((m) => m.default),
  '1.2': () => import('./lessons/1.2.json').then((m) => m.default),
  '1.3': () => import('./lessons/1.3.json').then((m) => m.default),
  '1.4': () => import('./lessons/1.4.json').then((m) => m.default),
  '1.5': () => import('./lessons/1.5.json').then((m) => m.default),
  '1.6': () => import('./lessons/1.6.json').then((m) => m.default),
  '1.7': () => import('./lessons/1.7.json').then((m) => m.default),
  '2.1': () => import('./lessons/2.1.json').then((m) => m.default),
  '2.2': () => import('./lessons/2.2.json').then((m) => m.default),
  '2.3': () => import('./lessons/2.3.json').then((m) => m.default),
  '2.4': () => import('./lessons/2.4.json').then((m) => m.default),
  '2.5': () => import('./lessons/2.5.json').then((m) => m.default),
  '2.6': () => import('./lessons/2.6.json').then((m) => m.default),
  '2.7': () => import('./lessons/2.7.json').then((m) => m.default),
};

/** Every lesson is its own lazy chunk. */
export async function loadLesson(section: string): Promise<Lesson | null> {
  return (await LOADERS[section]?.()) ?? null;
}
