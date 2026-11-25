import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Language } from '../../core/language';
import { Note, loadNote } from '../../data/notes';

/**
 * The short part of a skill note below an answer. It opens in place, so a running test is not left;
 * the full note opens in a new tab.
 */
@Component({
  selector: 'app-note-peek',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().notePeek;
    <button type="button" class="btn small" [class.primary]="strong() && !open()" [attr.aria-expanded]="open()" (click)="toggle()">
      {{ open() ? t.hide : t.read }}
    </button>
    @if (open()) {
      @if (note(); as n) {
        <div class="peek">
          <p class="main">{{ language.pick(n.main) }}</p>
          @for (p of n.explain; track $index) {
            <p>{{ language.pick(p) }}</p>
          }
          @for (c of n.compare; track $index) {
            <p><strong>{{ language.pick(c.terms) }}:</strong> {{ language.pick(c.text) }}</p>
          }
          <a [href]="'/notes?n=' + n.id" target="_blank">{{ t.full }}</a>
        </div>
      } @else {
        <p class="muted" role="status">{{ language.ui().notes.loading }}</p>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: 10px;
    }
    .peek {
      margin-top: 8px;
      padding: 10px 14px;
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      background: var(--surface-2);
    }
    p {
      margin: 0 0 8px;
    }
    .main {
      font-weight: 600;
    }
  `,
})
export class NotePeek {
  private readonly pending = inject(PendingTasks);
  protected readonly language = inject(Language);

  /** Skill id, e.g. genai-how. */
  readonly skill = input.required<string>();
  /** Draws attention to the button, e.g. after a wrong answer. */
  readonly strong = input(false);

  protected readonly open = linkedSignal(() => (this.skill(), false));
  private readonly loaded = signal<Note | null>(null);
  protected readonly note = computed(() => (this.loaded()?.id === this.skill() ? this.loaded() : null));

  protected toggle(): void {
    this.open.update((on) => !on);
    if (!this.open() || this.note()) return;
    const id = this.skill();
    this.pending.run(async () => {
      const note = await loadNote(id);
      if (this.skill() === id) this.loaded.set(note);
    });
  }
}
