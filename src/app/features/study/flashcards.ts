import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { Language } from '../../core/language';
import { ShortcutSettings } from '../../core/shortcut-settings';
import { ShortcutRow, digitIndex, hasModifier, isPressable, isTyping } from '../../core/shortcuts';
import { Grade, intervalLabel } from '../../core/srs';
import { StudyProgress } from '../../core/study-progress';
import { Question } from '../../data/schema';
import { ShortcutHelp } from '../../shared/shortcut-help/shortcut-help';
import { StudyCard } from './study-card';

/** One flashcard round. Again puts the card back at the end of this round; Hard and Good schedule it. */
@Component({
  selector: 'app-flashcards',
  imports: [StudyCard, ShortcutHelp],
  host: { '(document:keydown)': 'onKey($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().cards;
    @if (current(); as q) {
      <div class="card stack">
        <div class="head">
          <strong>{{ t.position(done() + 1, total()) }}</strong>
          <span class="muted">{{ t.left(queue().length, againCount()) }}</span>
        </div>
        <app-study-card [question]="q" [showAnswer]="flipped()" />
        @if (!flipped()) {
          <div class="row">
            <button type="button" class="btn primary" (click)="flipped.set(true)">{{ language.ui().study.showAnswer }}</button>
          </div>
        } @else {
          <div class="row grades" role="group" [attr.aria-label]="t.rate">
            @for (g of grades; track g) {
              <button type="button" class="btn" [class]="g" (click)="rate(q, g)">
                <span><kbd class="key" aria-hidden="true">{{ $index + 1 }}</kbd> {{ t[g] }}</span>
                <span class="ivl">{{ label(q, g) }}</span>
              </button>
            }
          </div>
        }
      </div>
      <app-shortcut-help [rows]="shortcuts()" [(open)]="helpOpen" />
    } @else {
      <div class="card stack">
        <p><strong>{{ t.complete }}</strong> {{ t.summary(total(), againCount()) }}</p>
        <div class="row">
          <button type="button" class="btn primary" (click)="restart.emit()">{{ t.restart }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    app-shortcut-help {
      margin-top: 14px;
    }
    .head {
      scroll-margin-top: 110px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .grades .btn {
      flex: 1 1 120px;
      flex-direction: column;
      gap: 0;
    }
    .ivl {
      font-weight: 400;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .again {
      border-color: var(--bad);
    }
    .hard {
      border-color: var(--warn);
    }
    .good {
      border-color: var(--ok);
    }
  `,
})
export class Flashcards {
  private readonly study = inject(StudyProgress);
  private readonly shortcutSettings = inject(ShortcutSettings);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly language = inject(Language);

  readonly deck = input.required<Question[]>();
  readonly restart = output<void>();

  protected readonly grades: Grade[] = ['again', 'hard', 'good'];

  protected readonly queue = linkedSignal(() => this.deck());
  protected readonly done = linkedSignal(() => (this.deck(), 0));
  protected readonly againCount = linkedSignal(() => (this.deck(), 0));
  protected readonly flipped = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly current = computed(() => this.queue()[0] ?? null);
  protected readonly total = computed(() => this.deck().length);

  protected readonly shortcuts = computed<ShortcutRow[]>(() => {
    const { keys, cards } = this.language.ui();
    return [
      { keys: ['Space', 'Enter'], text: keys.flip },
      { keys: ['1', '2', '3'], text: `${cards.again} · ${cards.hard} · ${cards.good}` },
      { keys: ['?'], text: keys.help },
    ];
  });

  protected label(q: Question, grade: Grade): string {
    return intervalLabel(this.study.cards()[q.id], grade, this.language.ui().cards);
  }

  protected onKey(e: KeyboardEvent): void {
    const q = this.current();
    if (!q || e.repeat || !this.shortcutSettings.enabled() || hasModifier(e) || isTyping(e.target)) return;
    const grade = this.grades[digitIndex(e.key) ?? -1];
    if (e.key === '?') {
      this.helpOpen.update((open) => !open);
    } else if (!this.flipped() && (e.key === ' ' || e.key === 'Enter') && !isPressable(e.target)) {
      this.flipped.set(true);
    } else if (this.flipped() && grade) {
      this.rate(q, grade);
      afterNextRender(() => this.host.nativeElement.querySelector('.head')?.scrollIntoView({ block: 'nearest' }), {
        injector: this.injector,
      });
    } else {
      return;
    }
    e.preventDefault();
  }

  protected rate(q: Question, grade: Grade): void {
    this.study.grade(q.id, grade);
    this.flipped.set(false);
    if (grade === 'again') {
      this.againCount.update((n) => n + 1);
      this.queue.update(([first, ...rest]) => [...rest, first]);
    } else {
      this.done.update((n) => Math.min(n + 1, this.total() - 1));
      this.queue.update(([, ...rest]) => rest);
    }
  }
}
