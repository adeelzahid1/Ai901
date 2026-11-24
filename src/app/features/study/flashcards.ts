import { DOCUMENT } from '@angular/common';
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

/** A card of the round; `grade` is null until the learner rates it. */
interface RoundCard {
  q: Question;
  grade: Grade | null;
}

/**
 * One flashcard round. Again puts the card at the end of this round as well; Hard and Good schedule it.
 * Cards can be passed without a rating, so the round ends when every card has one.
 */
@Component({
  selector: 'app-flashcards',
  imports: [StudyCard, ShortcutHelp],
  host: {
    '[class.full]': 'full()',
    '(document:keydown)': 'onKey($event)',
    '(document:fullscreenchange)': 'onFullscreenChange()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let ui = language.ui();
    @let t = ui.cards;
    @if (current(); as card) {
      <div class="card stack">
        <div class="head">
          <strong>{{ t.position(index() + 1, total()) }}</strong>
          <span class="muted">{{ t.left(left(), againCount()) }}</span>
          <button type="button" class="btn small" aria-keyshortcuts="F" (click)="toggleFull()">
            <span aria-hidden="true">⛶</span> {{ full() ? t.exitFull : t.full }}
          </button>
        </div>
        <app-study-card [question]="card.q" [showAnswer]="flipped() || card.grade !== null" />
        <div class="controls">
          @if (card.grade; as grade) {
            <p class="muted rated">{{ t.rated(t[grade]) }}</p>
          } @else if (!flipped()) {
            <div class="row">
              <button type="button" class="btn primary" (click)="flip()">{{ ui.study.showAnswer }}</button>
            </div>
          } @else {
            <div class="row grades" role="group" [attr.aria-label]="t.rate">
              @for (g of grades; track g) {
                <button type="button" class="btn" [class]="g" (click)="rate(g)">
                  <span><kbd class="key" aria-hidden="true">{{ $index + 1 }}</kbd> {{ t[g] }}</span>
                  <span class="ivl">{{ label(card.q, g) }}</span>
                </button>
              }
            </div>
          }
          <div class="row move">
            <button type="button" class="btn" aria-keyshortcuts="ArrowLeft" [disabled]="index() === 0" (click)="show(index() - 1)">
              {{ ui.runner.previous }}
            </button>
            <button type="button" class="btn" aria-keyshortcuts="ArrowRight" [disabled]="nextIndex() < 0" (click)="show(nextIndex())">
              {{ ui.runner.next }}
            </button>
          </div>
        </div>
      </div>
      <app-shortcut-help [rows]="shortcuts()" [(open)]="helpOpen" />
    } @else {
      <div class="card stack">
        <p><strong>{{ t.complete }}</strong> {{ t.summary(deck().length, againCount()) }}</p>
        <div class="row">
          <button type="button" class="btn primary" (click)="restart.emit()">{{ t.restart }}</button>
          @if (full()) {
            <button type="button" class="btn" (click)="toggleFull()">{{ t.exitFull }}</button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    :host(.full) {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-content: safe center;
      --pad: clamp(12px, 3vw, 40px);
      padding: var(--pad);
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--bg);
      font-size: clamp(1rem, 0.9rem + 0.5vw, 1.15rem);
    }
    :host(.full) > * {
      width: 100%;
      max-width: 1000px;
      margin-inline: auto;
    }
    app-shortcut-help {
      margin-top: 14px;
    }
    .head {
      scroll-margin-top: 110px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
    }
    .head .muted {
      margin-right: auto;
    }
    .rated {
      margin: 0;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .move {
      justify-content: space-between;
    }
    .controls {
      display: grid;
      gap: 12px;
    }
    /* Long answers scroll under the buttons. */
    :host(.full) .controls {
      position: sticky;
      bottom: calc(-1 * var(--pad));
      padding: 12px 0;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .grades .btn {
      flex: 1 1 90px;
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
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly language = inject(Language);

  readonly deck = input.required<Question[]>();
  readonly restart = output<void>();

  protected readonly grades: Grade[] = ['again', 'hard', 'good'];

  protected readonly cards = linkedSignal<RoundCard[]>(() => this.deck().map((q) => ({ q, grade: null })));
  protected readonly index = linkedSignal(() => (this.deck(), 0));
  protected readonly flipped = signal(false);
  protected readonly helpOpen = signal(false);
  /** Covers the page, and the whole screen where the browser allows it. */
  protected readonly full = signal(false);

  protected readonly total = computed(() => this.cards().length);
  protected readonly left = computed(() => this.cards().filter((c) => c.grade === null).length);
  protected readonly againCount = computed(() => this.cards().filter((c) => c.grade === 'again').length);
  protected readonly current = computed(() => (this.left() > 0 ? this.cards()[this.index()] : null));
  /** The next card; after the last one, the first card that still needs a rating. -1 when there is none. */
  protected readonly nextIndex = computed(() => {
    const i = this.index();
    if (i + 1 < this.total()) return i + 1;
    const open = this.cards().findIndex((c) => c.grade === null);
    return open === i ? -1 : open;
  });

  protected readonly shortcuts = computed<ShortcutRow[]>(() => {
    const { keys, cards } = this.language.ui();
    return [
      { keys: ['Space', 'Enter'], text: keys.flip },
      { keys: ['1', '2', '3'], text: `${cards.again} · ${cards.hard} · ${cards.good}` },
      { keys: ['←', '→'], text: keys.moveCard },
      { keys: ['F'], text: keys.full },
      { keys: ['?'], text: keys.help },
    ];
  });

  protected label(q: Question, grade: Grade): string {
    return intervalLabel(this.study.cards()[q.id], grade, this.language.ui().cards);
  }

  protected flip(): void {
    const card = this.current();
    if (card) this.study.markPeeked([card.q.id]);
    this.flipped.set(true);
  }

  protected show(i: number): void {
    if (i < 0 || i >= this.total()) return;
    this.index.set(i);
    this.flipped.set(false);
  }

  protected rate(grade: Grade): void {
    const i = this.index();
    const card = this.cards()[i];
    if (!card || card.grade !== null) return;
    this.study.grade(card.q.id, grade);
    this.cards.update((list) => {
      const rated = list.map((c, k) => (k === i ? { ...c, grade } : c));
      return grade === 'again' ? [...rated, { q: card.q, grade: null }] : rated;
    });
    const open = this.cards().flatMap((c, k) => (c.grade === null ? [k] : []));
    this.show(open.find((k) => k > i) ?? open[0] ?? i);
  }

  protected toggleFull(): void {
    const on = !this.full();
    this.full.set(on);
    // Not every browser can show an element full screen (iPhone); the page is covered anyway.
    if (on) void this.host.nativeElement.requestFullscreen?.().catch(() => undefined);
    else if (this.document.fullscreenElement) void this.document.exitFullscreen().catch(() => undefined);
  }

  protected onFullscreenChange(): void {
    if (!this.document.fullscreenElement) this.full.set(false);
  }

  protected onKey(e: KeyboardEvent): void {
    if (this.full() && e.key === 'Escape') this.toggleFull();
    else if (this.full() && e.key === 'Tab') this.keepFocusInside(e);
    if (!this.current() || e.repeat || !this.shortcutSettings.enabled() || hasModifier(e) || isTyping(e.target)) return;
    if (this.useKey(e)) e.preventDefault();
  }

  /** Runs the shortcut for a key. Returns true when the key was used. */
  private useKey(e: KeyboardEvent): boolean {
    const open = this.current()?.grade === null;
    const grade = this.grades[digitIndex(e.key) ?? -1];
    switch (e.key) {
      case '?':
        this.helpOpen.update((shown) => !shown);
        return true;
      case 'f':
      case 'F':
        this.toggleFull();
        return true;
      case 'ArrowLeft':
      case 'ArrowRight':
        // A focused code block scrolls with the arrow keys.
        if (e.target instanceof Element && e.target.closest('.code')) return false;
        this.show(e.key === 'ArrowLeft' ? this.index() - 1 : this.nextIndex());
        this.scrollToTop();
        return true;
      case ' ':
      case 'Enter':
        if (!open || this.flipped() || isPressable(e.target)) return false;
        this.flip();
        return true;
    }
    if (!open || !this.flipped() || !grade) return false;
    this.rate(grade);
    this.scrollToTop();
    return true;
  }

  private scrollToTop(): void {
    afterNextRender(() => this.host.nativeElement.querySelector('.head')?.scrollIntoView({ block: 'nearest' }), {
      injector: this.injector,
    });
  }

  /** The page behind the full-screen cards cannot be seen, so Tab stays in the cards. */
  private keepFocusInside(e: KeyboardEvent): void {
    const host = this.host.nativeElement;
    const items = [...host.querySelectorAll<HTMLElement>('button:enabled, a[href], summary, input')].filter((el) =>
      el.checkVisibility(),
    );
    const edge = e.shiftKey ? items[0] : items[items.length - 1];
    const active = this.document.activeElement;
    if (!edge || (active !== edge && host.contains(active))) return;
    e.preventDefault();
    (e.shiftKey ? items[items.length - 1] : items[0]).focus();
  }
}
