import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { GlossaryEntry, NOTE_TITLES, loadGlossary } from '../../data/notes';

/** One-sentence definitions of the exam terms, with a link to the note that explains each one. */
@Component({
  selector: 'app-glossary-view',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().notes;
    <div class="card">
      <label class="field">
        <span>{{ t.findTerm }}</span>
        <input type="search" [formControl]="filter" [placeholder]="t.findTermHint" />
      </label>
      <p class="muted" role="status">{{ t.terms(shown().length, entries().length) }}</p>
      <dl>
        @for (e of shown(); track e.term) {
          <div>
            <dt>{{ e.term }}</dt>
            <dd>
              {{ language.pick(e) }}
              <a routerLink="/notes" [queryParams]="{ n: e.note }">{{ language.pick(titles[e.note]) }}</a>
            </dd>
          </div>
        }
      </dl>
    </div>
  `,
  styles: `
    input {
      min-height: 36px;
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
    }
    p {
      margin: 10px 0;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
      gap: 10px;
      margin: 0;
    }
    dl > div {
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--surface-2);
    }
    dt {
      font-weight: 700;
    }
    dd {
      margin: 2px 0 0;
    }
    dd a {
      display: block;
      margin-top: 4px;
      font-size: 0.85rem;
    }
  `,
})
export class GlossaryView {
  protected readonly language = inject(Language);

  protected readonly titles = NOTE_TITLES;
  protected readonly filter = new FormControl('', { nonNullable: true });
  private readonly text = toSignal(this.filter.valueChanges, { initialValue: '' });
  protected readonly entries = signal<GlossaryEntry[]>([]);
  protected readonly shown = computed(() => {
    const words = this.text().toLowerCase().split(/\s+/).filter(Boolean);
    return this.entries().filter((e) => {
      const all = `${e.term} ${e.en} ${e.ro}`.toLowerCase();
      return words.every((w) => all.includes(w));
    });
  });

  constructor() {
    inject(PendingTasks).run(async () => this.entries.set(await loadGlossary()));
  }
}
