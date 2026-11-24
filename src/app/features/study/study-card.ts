import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { correctLines, templateParts } from '../../core/grading';
import { Language } from '../../core/language';
import { RomanBank } from '../../data/roman-bank';
import { Question } from '../../data/schema';

/** Read-only view of a question for studying; the answer and explanation appear when `showAnswer` is on. */
@Component({
  selector: 'app-study-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-card.html',
  styleUrl: './study-card.css',
})
export class StudyCard {
  private readonly translations = inject(RomanBank);
  protected readonly language = inject(Language);

  readonly question = input.required<Question>();
  readonly showAnswer = input(false);
  readonly number = input<number | null>(null);

  /** The question in the language of the app. */
  protected readonly shown = computed(() => this.translations.localize(this.question()));
  protected readonly untranslated = computed(() => this.translations.missing(this.question()));
  protected readonly meta = computed(() => {
    const q = this.question();
    const t = this.language.ui();
    return { diff: t.difficulty[q.diff], type: t.types[q.type] };
  });
  protected readonly correct = computed(() => correctLines(this.shown(), this.language.ui().answers));
  protected readonly ctxIsCode = computed(() => (this.shown().ctx ?? '').includes('\n'));

  /** Text lists to show for the question type; `answer` marks the correct entries. */
  protected readonly body = computed(() => {
    const q = this.shown();
    switch (q.type) {
      case 'mcq':
        return { kind: 'choices' as const, items: q.opts.map((text, i) => ({ text, answer: i === q.ans })) };
      case 'multi':
        return { kind: 'choices' as const, items: q.opts.map((text, i) => ({ text, answer: q.ans.includes(i) })) };
      case 'yesno':
        return { kind: 'statements' as const, items: q.stmts.map((text, i) => ({ text, answer: q.ans[i] })) };
      case 'order':
        return { kind: 'list' as const, items: q.items };
      case 'match':
        return { kind: 'match' as const, items: q.items, targets: q.targets };
      case 'dropdown':
        return {
          kind: 'template' as const,
          parts: templateParts(q.tpl),
          code: q.tpl.includes('\n'),
          blanks: q.opts.map((opts, b) => ({ n: b + 1, opts })),
        };
    }
  });
}
