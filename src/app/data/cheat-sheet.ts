import { Lesson, LessonText, loadLesson } from './lessons';
import { GlossaryEntry, loadGlossary } from './notes';
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

export interface ExamTipSection {
  title: LessonText;
  items: LessonText[];
}

export interface CheatSheetData {
  numbers: { value: string; label: LessonText }[];
  tables: CheatTable[];
  code: CheatCode[];
  /** The lessons give concepts, "which one when" tables, key points and exam traps. */
  lessons: Lesson[];
  examSections: ExamTipSection[];
  glossary: GlossaryEntry[];
}

/** Loads the reference data, all lessons, exam-day tips and the glossary. */
export async function loadCheatSheet(): Promise<CheatSheetData> {
  const [sheet, examDay, glossary, ...lessons] = await Promise.all([
    import('./cheat-sheet.json').then((m) => m.default),
    import('./exam-day.json').then((m) => m.default),
    loadGlossary(),
    ...SECTIONS.map((s) => loadLesson(s.id)),
  ]);
  return {
    ...sheet,
    lessons: lessons.filter((l) => l !== null),
    examSections: examDay.sections,
    glossary,
  };
}
