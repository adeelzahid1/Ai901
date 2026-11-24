import { Injectable, inject, signal } from '@angular/core';
import { LocalStore } from './storage';

const KEY = 'ai901-labs';

/** Finished lab steps, saved in localStorage as step numbers per lab. */
@Injectable({ providedIn: 'root' })
export class LabProgress {
  private readonly store = inject(LocalStore);
  private readonly state = signal<Record<string, number[]>>(this.store.read(KEY, {}));

  isDone(lab: string, step: number): boolean {
    return this.state()[lab]?.includes(step) ?? false;
  }

  count(lab: string): number {
    return this.state()[lab]?.length ?? 0;
  }

  toggle(lab: string, step: number): void {
    this.state.update((all) => {
      const steps = all[lab] ?? [];
      return { ...all, [lab]: steps.includes(step) ? steps.filter((s) => s !== step) : [...steps, step] };
    });
    this.store.write(KEY, this.state());
  }
}
