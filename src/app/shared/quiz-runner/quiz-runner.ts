import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Question } from '../../data/schema';
import { Answer, emptyAnswer, isComplete, isStarted, scoreAnswer } from '../../core/grading';
import { Language } from '../../core/language';
import { PreparedQuestion, prepareQuestion } from '../../core/prepare';
import { ProgressService } from '../../core/progress';
import { QuizMode, QuizReport, buildReport } from '../../core/report';
import { createRng } from '../../core/rng';
import { QuestionView } from '../question-view/question-view';

export type FeedbackMode = 'instant' | 'end';

interface RunItem {
  prepared: PreparedQuestion;
  answer: Answer;
  checked: boolean;
  marked: boolean;
}

/** Runs a list of questions: navigation, optional timer, mark for review, check or submit. */
@Component({
  selector: 'app-quiz-runner',
  imports: [QuestionView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-runner.html',
  styleUrl: './quiz-runner.css',
})
export class QuizRunner {
  private readonly progress = inject(ProgressService);
  protected readonly language = inject(Language);

  readonly questions = input.required<Question[]>();
  readonly mode = input.required<QuizMode>();
  readonly title = input('');
  readonly feedback = input<FeedbackMode>('end');
  /** Seconds for the whole session, or null for no timer. */
  readonly timeLimitSec = input<number | null>(null);
  readonly finished = output<QuizReport>();

  protected readonly items = linkedSignal<RunItem[]>(() => {
    const rng = createRng();
    return this.questions().map((q) => {
      const prepared = prepareQuestion(q, rng);
      return { prepared, answer: emptyAnswer(prepared.q), checked: false, marked: false };
    });
  });
  protected readonly index = linkedSignal(() => (this.questions(), 0));
  private readonly startedAt = linkedSignal(() => (this.questions(), Date.now()));
  private readonly now = signal(Date.now());
  private readonly submitted = linkedSignal(() => (this.questions(), false));

  protected readonly confirming = signal(false);
  protected readonly current = computed(() => this.items()[this.index()]);
  protected readonly total = computed(() => this.items().length);
  protected readonly instant = computed(() => this.feedback() === 'instant');
  protected readonly answeredCount = computed(() => this.items().filter((it) => isStarted(it.answer)).length);
  protected readonly unanswered = computed(() => this.total() - this.answeredCount());
  protected readonly markedCount = computed(() => this.items().filter((it) => it.marked).length);
  protected readonly checkedStats = computed(() => {
    const checked = this.items().filter((it) => it.checked);
    const correct = checked.filter((it) => scoreAnswer(it.prepared.q, it.answer) === 1).length;
    return { checked: checked.length, correct };
  });
  protected readonly canCheck = computed(() => {
    const it = this.current();
    return !!it && !it.checked && isComplete(it.prepared.q, it.answer);
  });

  protected readonly remaining = computed(() => {
    const limit = this.timeLimitSec();
    if (limit === null) return null;
    const elapsed = Math.max(0, Math.floor((this.now() - this.startedAt()) / 1000));
    return Math.max(0, limit - elapsed);
  });
  protected readonly clock = computed(() => {
    const r = this.remaining();
    if (r === null) return '';
    const m = Math.floor(r / 60);
    const s = r % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
    effect(() => {
      if (this.remaining() === 0) untracked(() => this.submit());
    });
  }

  protected statusOf(it: RunItem): string {
    if (it.checked) return scoreAnswer(it.prepared.q, it.answer) === 1 ? 'right' : 'wrong';
    return isStarted(it.answer) ? 'answered' : '';
  }

  protected setAnswer(answer: Answer): void {
    this.patch(this.index(), { answer });
  }

  protected check(): void {
    const it = this.current();
    if (!it || !this.canCheck()) return;
    this.patch(this.index(), { checked: true });
    this.progress.record(it.prepared.q.id, scoreAnswer(it.prepared.q, it.answer) === 1);
  }

  protected toggleMark(): void {
    const it = this.current();
    if (it) this.patch(this.index(), { marked: !it.marked });
  }

  protected go(i: number): void {
    if (i >= 0 && i < this.total()) {
      this.index.set(i);
      this.confirming.set(false);
    }
  }

  protected askSubmit(): void {
    if (this.unanswered() > 0 || this.markedCount() > 0) this.confirming.set(true);
    else this.submit();
  }

  protected submit(): void {
    if (this.submitted() || this.total() === 0) return;
    this.submitted.set(true);
    const items = this.items();
    // Checked questions were recorded already; record the rest that have an answer.
    for (const it of items) {
      if (!it.checked && isStarted(it.answer)) {
        this.progress.record(it.prepared.q.id, scoreAnswer(it.prepared.q, it.answer) === 1);
      }
    }
    const answered = this.mode() === 'practice' ? items.filter((it) => it.checked || isStarted(it.answer)) : items;
    const report = buildReport(
      this.mode(),
      this.title(),
      this.startedAt(),
      answered.map((it) => ({ prepared: it.prepared, answer: it.answer, marked: it.marked })),
    );
    if (this.mode() !== 'practice') this.progress.addToHistory(report);
    this.finished.emit(report);
  }

  private patch(i: number, change: Partial<RunItem>): void {
    this.items.update((list) => list.map((it, k) => (k === i ? { ...it, ...change } : it)));
  }
}
