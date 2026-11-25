import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { searchGlossary, searchNotes } from '../../core/note-search';
import { LessonText } from '../../data/lessons';
import { GlossaryEntry, NOTE_TITLES, Note, loadGlossary, loadNote } from '../../data/notes';

/** Search results from all notes and the glossary. Loads them when the first search starts. */
@Component({
  selector: 'app-note-results',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().notes;
    @if (notes()) {
      <p class="muted" role="status">{{ t.found(hits().length, terms().length) }}</p>
      @for (h of hits(); track h.id) {
        <a class="card" routerLink="/notes" [queryParams]="{ n: h.id }" (click)="opened.emit()">
          <strong>{{ h.title }}</strong>
          <!-- No whitespace between the parts, or it would show inside words. -->
          <span>@for (p of h.snippet; track $index) {<span [class.hit]="p.hit">{{ p.text }}</span>}</span>
        </a>
      }
      @if (terms().length) {
        <section class="card">
          <h2>{{ t.glossary }}</h2>
          <dl>
            @for (e of terms(); track e.term) {
              <div>
                <dt>{{ e.term }}</dt>
                <dd>{{ language.pick(e) }}</dd>
              </div>
            }
          </dl>
        </section>
      }
      @if (!hits().length && !terms().length) {
        <p class="card muted">{{ t.nothing }}</p>
      }
    } @else {
      <p class="card muted">{{ t.loading }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }
    p {
      margin: 0;
    }
    a.card {
      display: grid;
      gap: 2px;
      color: var(--text);
      text-decoration: none;
    }
    a.card:hover {
      border-color: var(--accent);
    }
    a.card:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    a.card strong {
      color: var(--accent);
    }
    a.card > span {
      color: var(--muted);
      font-size: 0.92rem;
    }
    .hit {
      border-radius: 3px;
      background: var(--accent-soft);
      color: var(--text);
      font-weight: 600;
    }
    dl {
      margin: 0;
    }
    dt {
      font-weight: 700;
    }
    dd {
      margin: 0 0 8px;
    }
  `,
})
export class NoteResults {
  protected readonly language = inject(Language);

  readonly query = input.required<string>();
  /** A result was opened. */
  readonly opened = output<void>();

  protected readonly notes = signal<Note[] | null>(null);
  private readonly glossary = signal<GlossaryEntry[]>([]);
  private readonly pick = computed(() => {
    this.language.lang();
    return (text: LessonText) => this.language.pick(text);
  });
  protected readonly hits = computed(() => searchNotes(this.notes() ?? [], NOTE_TITLES, this.query(), this.pick()));
  protected readonly terms = computed(() => searchGlossary(this.glossary(), this.query(), this.pick()));

  constructor() {
    inject(PendingTasks).run(async () => {
      const [glossary, ...notes] = await Promise.all([loadGlossary(), ...Object.keys(NOTE_TITLES).map((id) => loadNote(id))]);
      this.glossary.set(glossary);
      this.notes.set(notes.filter((n) => n !== null));
    });
  }
}
