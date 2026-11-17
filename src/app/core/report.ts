import { DOMAINS, DomainId, EXAM, Question, SECTIONS, domainOf, sectionOf } from '../data/schema';
import { Answer, isStarted, scoreAnswer } from './grading';
import { PreparedQuestion } from './prepare';

export type QuizMode = 'practice' | 'mock' | 'exam';

export interface ReviewItem {
  prepared: PreparedQuestion;
  answer: Answer;
  score: number;
  answered: boolean;
  marked: boolean;
}

export interface Breakdown {
  id: string;
  label: string;
  total: number;
  /** Sum of question scores (partial credit counts). */
  points: number;
  percent: number;
}

export interface QuizReport {
  mode: QuizMode;
  title: string;
  startedAt: number;
  finishedAt: number;
  items: ReviewItem[];
  total: number;
  correct: number;
  points: number;
  score: number;
  passed: boolean;
  byDomain: Breakdown[];
  bySection: Breakdown[];
}

export interface ReportInput {
  prepared: PreparedQuestion;
  answer: Answer;
  marked: boolean;
}

function breakdown(items: ReviewItem[], keyOf: (q: Question) => string | undefined, labels: { id: string; label: string }[]): Breakdown[] {
  return labels
    .map(({ id, label }) => {
      const mine = items.filter((it) => keyOf(it.prepared.q) === id);
      const points = mine.reduce((s, it) => s + it.score, 0);
      return { id, label, total: mine.length, points, percent: mine.length ? Math.round((points / mine.length) * 100) : 0 };
    })
    .filter((b) => b.total > 0);
}

/** Scores a finished session. The score is scaled to 1000 like the real exam (pass at 700). */
export function buildReport(mode: QuizMode, title: string, startedAt: number, inputs: ReportInput[], finishedAt = Date.now()): QuizReport {
  const items: ReviewItem[] = inputs.map(({ prepared, answer, marked }) => ({
    prepared,
    answer,
    marked,
    answered: isStarted(answer),
    score: scoreAnswer(prepared.q, answer),
  }));
  const points = items.reduce((s, it) => s + it.score, 0);
  const score = items.length ? Math.round((points / items.length) * EXAM.maxScore) : 0;
  return {
    mode,
    title,
    startedAt,
    finishedAt,
    items,
    total: items.length,
    correct: items.filter((it) => it.score === 1).length,
    points,
    score,
    passed: score >= EXAM.passScore,
    byDomain: breakdown(items, (q) => domainOf(q), DOMAINS.map((d) => ({ id: d.id, label: d.name }))),
    bySection: breakdown(items, (q) => sectionOf(q)?.id, SECTIONS.map((s) => ({ id: s.id, label: s.en }))),
  };
}

export interface HistoryEntry {
  at: number;
  mode: QuizMode;
  title: string;
  score: number;
  correct: number;
  total: number;
  minutes: number;
  byDomain: { id: DomainId; percent: number }[];
}

export function toHistory(r: QuizReport): HistoryEntry {
  return {
    at: r.finishedAt,
    mode: r.mode,
    title: r.title,
    score: r.score,
    correct: r.correct,
    total: r.total,
    minutes: Math.max(1, Math.round((r.finishedAt - r.startedAt) / 60000)),
    byDomain: r.byDomain.map((b) => ({ id: b.id as DomainId, percent: b.percent })),
  };
}
