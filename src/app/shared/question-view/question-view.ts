import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import {
  DropdownQuestion,
  MatchQuestion,
  McqQuestion,
  MultiQuestion,
  OrderQuestion,
  Question,
  YesNoQuestion,
  sectionOf,
} from '../../data/schema';
import { Answer, answerLines, correctLines, scoreAnswer, templateParts } from '../../core/grading';
import { Language } from '../../core/language';
import { PreparedQuestion } from '../../core/prepare';
import { RomanBank } from '../../data/roman-bank';

type Of<T extends Answer['type']> = Extract<Answer, { type: T }>;

/** Renders one question of any type. After `revealed` it shows the answer, the learner's answer and why. */
@Component({
  selector: 'app-question-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-view.html',
  styleUrl: './question-view.css',
})
export class QuestionView {
  private readonly translations = inject(RomanBank);
  protected readonly language = inject(Language);

  /** The question as prepared for this session (English text, shuffled options). */
  readonly question = input.required<Question>();
  /** Shuffle recorded for the question, so translated options follow the same order. */
  readonly optOrder = input<PreparedQuestion['optOrder']>(null);
  readonly answer = input.required<Answer>();
  readonly revealed = input(false);
  readonly number = input<number | null>(null);
  readonly answerChange = output<Answer>();

  /** The question in the language of the app. */
  protected readonly shown = computed(() => this.translations.localize(this.question(), this.optOrder()));
  protected readonly untranslated = computed(() => this.translations.missing(this.question()));
  protected readonly section = computed(() => sectionOf(this.question()));
  protected readonly meta = computed(() => {
    const q = this.question();
    const t = this.language.ui();
    return { diff: t.difficulty[q.diff], type: t.types[q.type] };
  });
  protected readonly score = computed(() => scoreAnswer(this.question(), this.answer()));
  protected readonly correct = computed(() => correctLines(this.shown(), this.language.ui().answers));
  protected readonly given = computed(() => answerLines(this.shown(), this.answer(), this.language.ui().answers));
  protected readonly ctxIsCode = computed(() => (this.shown().ctx ?? '').includes('\n'));

  protected readonly mcq = computed(() => this.view<McqQuestion, 'mcq'>('mcq'));
  protected readonly multi = computed(() => this.view<MultiQuestion, 'multi'>('multi'));
  protected readonly yesno = computed(() => this.view<YesNoQuestion, 'yesno'>('yesno'));
  protected readonly order = computed(() => {
    const v = this.view<OrderQuestion, 'order'>('order');
    if (!v) return null;
    const left = v.q.items.map((_, i) => i).filter((i) => !v.a.seq.includes(i));
    return { ...v, left };
  });
  protected readonly dropdown = computed(() => {
    const v = this.view<DropdownQuestion, 'dropdown'>('dropdown');
    return v ? { ...v, parts: templateParts(v.q.tpl), code: v.q.tpl.includes('\n') } : null;
  });
  protected readonly match = computed(() => this.view<MatchQuestion, 'match'>('match'));

  private view<Q extends Question, T extends Answer['type']>(type: T): { q: Q; a: Of<T> } | null {
    const q = this.shown();
    const a = this.answer();
    return q.type === type && a.type === type ? { q: q as Q, a: a as Of<T> } : null;
  }

  /** CSS state of a choice after the answer is revealed. */
  protected choiceState(isAnswer: boolean, isChosen: boolean): string {
    if (!this.revealed()) return isChosen ? 'chosen' : '';
    if (isAnswer) return 'right';
    return isChosen ? 'wrong' : '';
  }

  protected pickMcq(choice: number): void {
    this.emit({ type: 'mcq', choice });
  }

  protected toggleMulti(a: Of<'multi'>, i: number, limit: number): void {
    if (a.choices.includes(i)) {
      this.emit({ type: 'multi', choices: a.choices.filter((c) => c !== i) });
    } else if (a.choices.length < limit) {
      this.emit({ type: 'multi', choices: [...a.choices, i].sort((x, y) => x - y) });
    }
  }

  protected setYesNo(a: Of<'yesno'>, i: number, value: boolean): void {
    this.emit({ type: 'yesno', values: a.values.map((v, k) => (k === i ? value : v)) });
  }

  protected setPick(a: Of<'dropdown'> | Of<'match'>, i: number, raw: string): void {
    const value = raw === '' ? null : Number(raw);
    this.emit({ ...a, picks: a.picks.map((p, k) => (k === i ? value : p)) });
  }

  protected addToOrder(a: Of<'order'>, item: number): void {
    this.emit({ type: 'order', seq: [...a.seq, item] });
  }

  protected moveInOrder(a: Of<'order'>, pos: number, delta: -1 | 1): void {
    const to = pos + delta;
    if (to < 0 || to >= a.seq.length) return;
    const seq = [...a.seq];
    [seq[pos], seq[to]] = [seq[to], seq[pos]];
    this.emit({ type: 'order', seq });
  }

  protected removeFromOrder(a: Of<'order'>, pos: number): void {
    this.emit({ type: 'order', seq: a.seq.filter((_, k) => k !== pos) });
  }

  private emit(a: Answer): void {
    if (!this.revealed()) this.answerChange.emit(a);
  }
}
