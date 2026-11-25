import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStore } from './storage';

const KEY = 'ai901-notes';

/** Notes the learner has read, saved in localStorage as skill ids. */
@Injectable({ providedIn: 'root' })
export class NoteProgress {
  private readonly store = inject(LocalStore);
  private readonly state = signal<ReadonlySet<string>>(new Set(this.store.read<string[]>(KEY, [])));

  readonly count = computed(() => this.state().size);

  isRead(skill: string): boolean {
    return this.state().has(skill);
  }

  toggle(skill: string): void {
    this.state.update((set) => {
      const next = new Set(set);
      if (!next.delete(skill)) next.add(skill);
      return next;
    });
    this.store.write(KEY, [...this.state()]);
  }
}
