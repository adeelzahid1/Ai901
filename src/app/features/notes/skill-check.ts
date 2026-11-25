import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { createRng } from '../../core/rng';
import { SKILL_CHECK, pickForSkill } from '../../core/skill-check';
import { QuestionBank } from '../../data/question-bank';
import { Question, SECTIONS, isExamOnly } from '../../data/schema';
import { QuizRunner } from '../../shared/quiz-runner/quiz-runner';

/** Three questions of the skill below its note. The bank is loaded when the learner starts. */
@Component({
  selector: 'app-skill-check',
  imports: [RouterLink, QuizRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().skillCheck;
    @if (questions(); as list) {
      <app-quiz-runner [questions]="list" mode="practice" [title]="t.heading" feedback="instant" (finished)="finish($event)" />
    } @else {
      <section class="card">
        <h2>{{ t.heading }}</h2>
        @if (result(); as r) {
          <p role="status"><strong>{{ t.result(r.correct, r.total) }}</strong> {{ r.correct === r.total ? t.allRight : t.readAgain }}</p>
        } @else {
          <p>{{ t.lead(count) }}</p>
        }
        <div class="row">
          <button type="button" class="btn primary" [disabled]="loading()" (click)="start()">
            {{ loading() ? language.ui().common.loadingQuestions : result() ? t.again : t.start }}
          </button>
          <a class="btn" routerLink="/practice" [queryParams]="{ section: section() }">{{ t.more(section()) }}</a>
        </div>
      </section>
    }
  `,
  styles: `
    h2,
    p {
      margin: 0 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class SkillCheck {
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);
  protected readonly language = inject(Language);

  readonly skill = input.required<string>();
  /** Study section of the skill, e.g. 1.2. */
  readonly section = input.required<string>();

  protected readonly count = SKILL_CHECK;
  protected readonly questions = linkedSignal<Question[] | null>(() => (this.skill(), null));
  protected readonly result = linkedSignal<{ correct: number; total: number } | null>(() => (this.skill(), null));
  protected readonly loading = linkedSignal(() => (this.skill(), false));
  private readonly domain = computed(() => SECTIONS.find((s) => s.id === this.section())?.domain ?? 'D1');

  protected async start(): Promise<void> {
    const skill = this.skill();
    this.loading.set(true);
    const bank = await this.bank.loadDomain(this.domain());
    // The learner may have opened another note in the meantime.
    if (this.skill() !== skill) return;
    this.loading.set(false);
    this.result.set(null);
    const study = bank.filter((q) => !isExamOnly(q));
    this.questions.set(pickForSkill(study, skill, this.progress.stats(), createRng()));
  }

  protected finish(report: QuizReport): void {
    this.result.set({ correct: report.correct, total: this.questions()?.length ?? 0 });
    this.questions.set(null);
  }
}
