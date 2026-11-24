import { Injectable, computed, inject, signal } from '@angular/core';
import { HistoryEntry, QuizReport, toHistory } from './report';
import { LocalStore } from './storage';
import { StudyProgress } from './study-progress';

/**
 * Per-question statistics: attempts, correct attempts, result of the last attempt, last time and result of
 * the first attempt (null when the learner had seen the answer before; missing in older saved progress).
 */
export interface QuestionStat {
  a: number;
  c: number;
  last: 0 | 1;
  t: number;
  f?: 0 | 1 | null;
}

const PROGRESS_KEY = 'ai901-progress';
const HISTORY_KEY = 'ai901-history';
const MAX_HISTORY = 30;

/** Practice progress and exam history, saved in localStorage. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly store = inject(LocalStore);
  private readonly study = inject(StudyProgress);

  readonly stats = signal<Record<string, QuestionStat>>(this.store.read(PROGRESS_KEY, {}));
  readonly history = signal<HistoryEntry[]>(this.store.read(HISTORY_KEY, []));

  readonly answeredIds = computed(() => new Set(Object.keys(this.stats())));
  /** Questions whose last attempt was wrong. */
  readonly mistakeIds = computed(
    () => new Set(Object.entries(this.stats()).filter(([, s]) => s.last === 0).map(([id]) => id)),
  );
  readonly totals = computed(() => {
    let attempts = 0;
    let correct = 0;
    for (const s of Object.values(this.stats())) {
      attempts += s.a;
      correct += s.c;
    }
    return { attempts, correct, accuracy: attempts ? Math.round((correct / attempts) * 100) : null };
  });

  record(id: string, correct: boolean, at = Date.now()): void {
    this.stats.update((all) => {
      const result = correct ? 1 : 0;
      const first: QuestionStat = { a: 0, c: 0, last: 0, t: 0, f: this.study.peeked().has(id) ? null : result };
      const prev = all[id] ?? first;
      return { ...all, [id]: { ...prev, a: prev.a + 1, c: prev.c + result, last: result, t: at } };
    });
    this.store.write(PROGRESS_KEY, this.stats());
  }

  addToHistory(report: QuizReport): void {
    this.history.update((h) => [toHistory(report), ...h].slice(0, MAX_HISTORY));
    this.store.write(HISTORY_KEY, this.history());
  }

  reset(): void {
    this.stats.set({});
    this.history.set([]);
    this.store.remove(PROGRESS_KEY);
    this.store.remove(HISTORY_KEY);
  }
}
