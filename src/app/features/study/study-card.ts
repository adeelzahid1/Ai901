import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { correctLines, templateParts } from '../../core/grading';
import { DIFFICULTY_LABEL, Question, TYPE_LABEL } from '../../data/schema';

/** Read-only view of a question for studying; the answer and explanation appear when `showAnswer` is on. */
@Component({
  selector: 'app-study-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-card.html',
  styleUrl: './study-card.css',
})
export class StudyCard {
  readonly question = input.required<Question>();
  readonly showAnswer = input(false);
  readonly number = input<number | null>(null);

  protected readonly meta = computed(() => {
    const q = this.question();
    return { diff: DIFFICULTY_LABEL[q.diff], type: TYPE_LABEL[q.type] };
  });
  protected readonly correct = computed(() => correctLines(this.question()));
  protected readonly ctxIsCode = computed(() => (this.question().ctx ?? '').includes('\n'));

  /** Text lists to show for the question type; `answer` marks the correct entries. */
  protected readonly body = computed(() => {
    const q = this.question();
    switch (q.type) {
      case 'mcq':
        return { kind: 'choices' as const, items: q.opts.map((text, i) => ({ text, answer: i === q.ans })) };
      case 'multi':
        return { kind: 'choices' as const, items: q.opts.map((text, i) => ({ text, answer: q.ans.includes(i) })) };
      case 'yesno':
        return { kind: 'statements' as const, items: q.stmts.map((text, i) => ({ text, answer: q.ans[i] })) };
      case 'order':
        return { kind: 'list' as const, title: 'Actions', items: q.items };
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
