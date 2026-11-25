import { Lesson, LessonText, loadLesson } from './lessons';
import { SECTIONS } from './schema';

export interface CheatTable {
  id: string;
  /** Exam domain, D1 or D2. */
  domain: string;
  title: LessonText;
  head: LessonText[];
  rows: LessonText[][];
}

export interface CheatCode {
  id: string;
  domain: string;
  title: LessonText;
  snippets: { title: LessonText; code: string }[];
}

export interface CheatSheetData {
  numbers: { value: string; label: LessonText }[];
  tables: CheatTable[];
  code: CheatCode[];
  /** The lessons give the "which one when" tables, key points and exam traps. */
  lessons: Lesson[];
}

/** Loads the reference data and all lessons. */
export async function loadCheatSheet(): Promise<CheatSheetData> {
  const [sheet, ...lessons] = await Promise.all([import('./cheat-sheet.json').then((m) => m.default), ...SECTIONS.map((s) => loadLesson(s.id))]);
  return { ...sheet, lessons: lessons.filter((l) => l !== null) };
}
