import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { LocalStore } from '../../core/storage';
import data from '../../data/exam-day.json';

const KEY = 'ai901-exam-day';

/** Checklists, timing and question tips for the real exam, with links to the official pages. */
@Component({
  selector: 'app-exam-day',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-day.html',
  styleUrl: './exam-day.css',
})
export class ExamDay {
  private readonly store = inject(LocalStore);
  protected readonly language = inject(Language);

  protected readonly data = data;
  protected readonly total = data.checklists.reduce((sum, c) => sum + c.items.length, 0);
  /** Finished checklist items, e.g. week-2. */
  protected readonly done = signal<ReadonlySet<string>>(new Set(this.store.read<string[]>(KEY, [])));

  protected toggle(id: string): void {
    this.done.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
    this.store.write(KEY, [...this.done()]);
  }
}
