import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Grade, intervalLabel } from '../../core/srs';
import { StudyProgress } from '../../core/study-progress';
import { Question } from '../../data/schema';
import { StudyCard } from './study-card';

/** One flashcard round. Again puts the card back at the end of this round; Hard and Good schedule it. */
@Component({
  selector: 'app-flashcards',
  imports: [StudyCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (current(); as q) {
      <div class="card stack">
        <div class="head">
          <strong>Card {{ done() + 1 }} of {{ total() }}</strong>
          <span class="muted">{{ queue().length }} left in this round · {{ againCount() }} again</span>
        </div>
        <app-study-card [question]="q" [showAnswer]="flipped()" />
        @if (!flipped()) {
          <div class="row">
            <button type="button" class="btn primary" (click)="flipped.set(true)">Show answer</button>
          </div>
        } @else {
          <div class="row grades" role="group" aria-label="How well did you know it?">
            @for (g of grades; track g.grade) {
              <button type="button" class="btn" [class]="g.grade" (click)="rate(q, g.grade)">
                {{ g.label }} <span class="ivl">{{ label(q, g.grade) }}</span>
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <div class="card stack">
        <p><strong>Round complete.</strong> {{ total() }} cards reviewed, {{ againCount() }} marked Again.</p>
        <div class="row">
          <button type="button" class="btn primary" (click)="restart.emit()">Start a new round</button>
        </div>
      </div>
    }
  `,
  styles: `
    .head {
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

  readonly deck = input.required<Question[]>();
  readonly restart = output<void>();

  protected readonly grades: { grade: Grade; label: string }[] = [
    { grade: 'again', label: 'Again' },
    { grade: 'hard', label: 'Hard' },
    { grade: 'good', label: 'Good' },
  ];

  protected readonly queue = linkedSignal(() => this.deck());
  protected readonly done = linkedSignal(() => (this.deck(), 0));
  protected readonly againCount = linkedSignal(() => (this.deck(), 0));
  protected readonly flipped = signal(false);
  protected readonly current = computed(() => this.queue()[0] ?? null);
  protected readonly total = computed(() => this.deck().length);

  protected label(q: Question, grade: Grade): string {
    return intervalLabel(this.study.cards()[q.id], grade);
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
