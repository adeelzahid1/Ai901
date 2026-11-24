import { Injectable, computed, inject, signal } from '@angular/core';
import { CardState, Grade, isReviewDue, schedule } from './srs';
import { LocalStore } from './storage';

interface StudyState {
  understood: string[];
  bookmarked: string[];
  /** Questions whose answer was shown while studying. */
  peeked: string[];
  cards: Record<string, CardState>;
}

const KEY = 'ai901-study-v1';
const EMPTY: StudyState = { understood: [], bookmarked: [], peeked: [], cards: {} };

/** Study page progress: "I understand this", bookmarks and flashcard schedule, kept in localStorage. */
@Injectable({ providedIn: 'root' })
export class StudyProgress {
  private readonly store = inject(LocalStore);
  private readonly state = signal<StudyState>({ ...EMPTY, ...this.store.read<Partial<StudyState>>(KEY, {}) });

  readonly understood = computed(() => new Set(this.state().understood));
  readonly bookmarked = computed(() => new Set(this.state().bookmarked));
  readonly peeked = computed(() => new Set(this.state().peeked));
  readonly cards = computed(() => this.state().cards);

  /** Studied cards that are due for review now. Pass a time to re-evaluate. */
  dueIds(now = Date.now()): Set<string> {
    return new Set(Object.entries(this.cards()).filter(([, c]) => isReviewDue(c, now)).map(([id]) => id));
  }

  toggleUnderstood(id: string): void {
    this.update((s) => ({ ...s, understood: toggle(s.understood, id) }));
  }

  toggleBookmark(id: string): void {
    this.update((s) => ({ ...s, bookmarked: toggle(s.bookmarked, id) }));
  }

  /** Remembers that the answers of these questions were shown. */
  markPeeked(ids: readonly string[]): void {
    const known = this.peeked();
    const added = ids.filter((id) => !known.has(id));
    if (added.length) this.update((s) => ({ ...s, peeked: [...s.peeked, ...added] }));
  }

  grade(id: string, grade: Grade, now = Date.now()): CardState {
    const next = schedule(this.cards()[id], grade, now);
    this.update((s) => ({ ...s, cards: { ...s.cards, [id]: next } }));
    return next;
  }

  reset(): void {
    this.state.set(EMPTY);
    this.store.remove(KEY);
  }

  private update(fn: (s: StudyState) => StudyState): void {
    this.state.update(fn);
    this.store.write(KEY, this.state());
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
