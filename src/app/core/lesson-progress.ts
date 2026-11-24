import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStore } from './storage';

const KEY = 'ai901-lessons';

interface LessonState {
  read?: boolean;
  /** Correct answers in the best check of the lesson. */
  best?: number;
}

/** Read lessons and check results per section, saved in localStorage. */
@Injectable({ providedIn: 'root' })
export class LessonProgress {
  private readonly store = inject(LocalStore);
  private readonly state = signal<Record<string, LessonState>>(this.store.read(KEY, {}));

  readonly readCount = computed(() => Object.values(this.state()).filter((l) => l.read).length);

  isRead(section: string): boolean {
    return this.state()[section]?.read ?? false;
  }

  best(section: string): number | null {
    return this.state()[section]?.best ?? null;
  }

  toggleRead(section: string): void {
    this.patch(section, { read: !this.isRead(section) });
  }

  /** Saves a check result. All answers correct also marks the lesson as read. */
  recordCheck(section: string, correct: number, total: number): void {
    const best = Math.max(correct, this.best(section) ?? 0);
    this.patch(section, total > 0 && correct === total ? { best, read: true } : { best });
  }

  private patch(section: string, change: LessonState): void {
    this.state.update((all) => ({ ...all, [section]: { ...all[section], ...change } }));
    this.store.write(KEY, this.state());
  }
}
