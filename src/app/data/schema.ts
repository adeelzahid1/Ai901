import blueprint from './blueprint.json';
import examPool from './exam-pool.json';

export type DomainId = 'D1' | 'D2';

/** 1 = Basic, 2 = Intermediate, 3 = Advanced. */
export type Difficulty = 1 | 2 | 3;

export type QuestionType = 'mcq' | 'multi' | 'yesno' | 'order' | 'dropdown' | 'match';

interface QuestionBase {
  /** `D1-001` style id; the prefix is the domain. */
  id: string;
  /** Official sub-skill id from `blueprint.json`. */
  sub: string;
  diff: Difficulty;
  /** The question stem. */
  q: string;
  /** Optional scenario text or code shown above the stem. */
  ctx?: string;
  /** Why the answer is right and why the other choices are wrong. */
  exp: string;
  /** Microsoft Learn page that backs the answer. */
  ref: string;
  caseId?: string;
}

/** Single answer. */
export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  opts: string[];
  ans: number;
}

/** Two or more answers ("Select TWO"). */
export interface MultiQuestion extends QuestionBase {
  type: 'multi';
  opts: string[];
  ans: number[];
}

/** A set of statements, each answered Yes or No. */
export interface YesNoQuestion extends QuestionBase {
  type: 'yesno';
  stmts: string[];
  ans: boolean[];
}

/** Build list: `ans` lists item indexes in the correct order; unused items are distractors. */
export interface OrderQuestion extends QuestionBase {
  type: 'order';
  items: string[];
  ans: number[];
}

/** Sentence or code completion: `tpl` holds `{0}`, `{1}` ... blanks, one option list per blank. */
export interface DropdownQuestion extends QuestionBase {
  type: 'dropdown';
  tpl: string;
  opts: string[][];
  ans: number[];
}

/** Drag and drop: for each item, `ans[i]` is the index of its target. Targets can be reused. */
export interface MatchQuestion extends QuestionBase {
  type: 'match';
  items: string[];
  targets: string[];
  ans: number[];
}

export type Question =
  | McqQuestion
  | MultiQuestion
  | YesNoQuestion
  | OrderQuestion
  | DropdownQuestion
  | MatchQuestion;

export interface SubSkill {
  id: string;
  title: string;
  /** Roman Urdu title. */
  ro: string;
}

export interface Domain {
  id: DomainId;
  name: string;
  short: string;
  /** Roman Urdu name and short name. */
  ro: string;
  shortRo: string;
  /** Official weight range in percent, e.g. [40, 45]. */
  weight: [number, number];
  /** 1 = highest priority. */
  priority: number;
  subs: SubSkill[];
}

export interface StudySection {
  id: string;
  domain: DomainId;
  en: string;
  ro: string;
  /** Planned number of questions for this section. */
  target: number;
  subs: string[];
}

export interface ExamInfo {
  code: string;
  title: string;
  outlineDate: string;
  minutes: number;
  examQuestions: number;
  passScore: number;
  maxScore: number;
}

export const EXAM: ExamInfo = blueprint.exam;
export const DOMAINS = blueprint.domains as Domain[];
export const SECTIONS = blueprint.sections as StudySection[];
export const BANK_FILES = blueprint.bankFiles as Record<DomainId, string[]>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Basic',
  2: 'Intermediate',
  3: 'Advanced',
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  multi: 'Multi-select',
  yesno: 'Yes / No',
  order: 'Ordering',
  dropdown: 'Drop-down',
  match: 'Matching',
};

export function domainOf(q: Pick<Question, 'id'>): DomainId {
  return q.id.slice(0, 2) as DomainId;
}

const sectionBySub = new Map<string, StudySection>(
  SECTIONS.flatMap((s) => s.subs.map((sub) => [`${s.domain}|${sub}`, s] as const)),
);

/** The study section a question belongs to, found through its domain and sub-skill. */
export function sectionOf(q: Pick<Question, 'id' | 'sub'>): StudySection | undefined {
  return sectionBySub.get(`${domainOf(q)}|${q.sub}`);
}

const examOnly: ReadonlySet<string> = new Set(examPool);

/** True for questions that appear only in the Exam tab, so the exam measures knowledge and not memory. */
export function isExamOnly(q: Pick<Question, 'id'>): boolean {
  return examOnly.has(q.id);
}

/** Mid-point of the official weight range, e.g. [40, 45] -> 42.5. */
export function weightMid(d: Pick<Domain, 'weight'>): number {
  return (d.weight[0] + d.weight[1]) / 2;
}
