import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Language } from '../../core/language';
import { MAX_NOTE, NoteKey, NoteKind, OwnNotes } from '../../core/own-notes';

const SAVE_DELAY = 500;

/** A note field that saves by itself. It is closed until the learner opens it, unless it already has text. */
@Component({
  selector: 'app-own-note',
  imports: [ReactiveFormsModule],
  host: { '(window:pagehide)': 'flush()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().ownNotes;
    <details #box [open]="open()" (toggle)="open.set(box.open)">
      <summary>
        <span aria-hidden="true">✎</span> {{ t.mine }}
        @if (!open() && saved()) {
          <span class="preview">{{ saved() }}</span>
        }
      </summary>
      <textarea [formControl]="text" rows="3" [maxlength]="max" [attr.aria-label]="t.mine" [placeholder]="t.hint" (blur)="flush()"></textarea>
      <p class="muted" role="status">{{ pending() ? t.saving : saved() ? t.saved : '' }}</p>
    </details>
  `,
  styles: `
    details {
      margin-top: 10px;
    }
    summary {
      display: flex;
      gap: 6px;
      color: var(--muted);
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
    }
    summary:hover {
      color: var(--text);
    }
    .preview {
      min-width: 0;
      overflow: hidden;
      font-weight: 400;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    textarea {
      width: 100%;
      margin-top: 6px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      resize: vertical;
    }
    textarea:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    p {
      min-height: 1.4em;
      margin: 2px 0 0;
      font-size: 0.85rem;
    }
    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class OwnNote {
  private readonly notes = inject(OwnNotes);
  protected readonly language = inject(Language);

  /** What the note belongs to. */
  readonly kind = input.required<NoteKind>();
  /** Id of the question, section or skill. */
  readonly target = input.required<string>();

  private readonly noteKey = computed<NoteKey>(() => `${this.kind()}:${this.target()}`);
  protected readonly max = MAX_NOTE;
  protected readonly text = new FormControl('', { nonNullable: true });
  protected readonly saved = computed(() => this.notes.text(this.noteKey()));
  protected readonly open = signal(false);
  protected readonly pending = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** The key of the text in the field; it can differ from the inputs until the field is updated. */
  private shownKey: NoteKey | null = null;

  constructor() {
    effect(() => {
      const key = this.noteKey();
      untracked(() => {
        this.flush();
        this.shownKey = key;
        this.text.setValue(this.notes.text(key), { emitEvent: false });
        this.open.set(this.notes.text(key) !== '');
      });
    });
    this.text.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pending.set(true);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), SAVE_DELAY);
    });
    inject(DestroyRef).onDestroy(() => this.flush());
  }

  /** Saves at once: after a pause, when the field loses focus or when the page is left or closed. */
  protected flush(): void {
    clearTimeout(this.timer);
    if (!this.pending() || !this.shownKey) return;
    this.notes.save(this.shownKey, this.text.value);
    this.pending.set(false);
  }
}
