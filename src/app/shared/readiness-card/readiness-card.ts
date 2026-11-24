import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { READY_ANSWERS, readiness } from '../../core/readiness';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, EXAM } from '../../data/schema';

/** How ready the learner is for the exam, from first answers only. */
@Component({
  selector: 'app-readiness-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().readiness;
    @let r = result();
    <section class="card">
      <div class="head">
        <h2>{{ t.heading }}</h2>
        <strong class="level" [class]="r.level">{{ t.levels[r.level] }}</strong>
      </div>
      <p class="muted">{{ t.lead }}</p>
      @for (d of rows(); track d.id) {
        <div class="row">
          <span>{{ d.id }} · {{ d.name }}</span>
          <span class="num">
            @if (d.left > 0) {
              {{ t.left(d.answers, need, d.left) }}
            } @else {
              <strong>{{ d.percent }}%</strong> {{ t.of(d.correct, d.answers) }}
            }
          </span>
          <div class="meter" role="progressbar" [attr.aria-valuenow]="d.bar" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="d.id + ' ' + t.heading">
            <span [class]="d.level" [style.width.%]="d.bar"></span>
          </div>
        </div>
      }
      @if (r.score !== null) {
        <p class="score">{{ t.estimate(r.score, exam.maxScore) }}</p>
      }
    </section>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 4px 16px;
    }
    h2,
    p {
      margin: 0 0 8px;
    }
    .level {
      padding: 2px 12px;
      border-radius: 99px;
      background: var(--surface-2);
    }
    .level.ready {
      background: var(--ok-soft);
      color: var(--ok);
    }
    .level.learn {
      background: var(--bad-soft);
      color: var(--bad);
    }
    .level.close {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2px 16px;
      margin: 10px 0;
    }
    .row .meter {
      flex: 1 0 100%;
    }
    .meter .ready {
      background: var(--ok);
    }
    .meter .learn {
      background: var(--bad);
    }
    .meter .unknown {
      background: var(--muted);
    }
    .num {
      font-variant-numeric: tabular-nums;
    }
    .score {
      margin: 12px 0 0;
      font-weight: 600;
    }
  `,
})
export class ReadinessCard {
  protected readonly language = inject(Language);
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);

  protected readonly exam = EXAM;
  protected readonly need = READY_ANSWERS;
  protected readonly result = computed(() => readiness(this.bank.questions(), this.progress.stats(), DOMAINS));
  protected readonly rows = computed(() =>
    this.result().domains.map((d, i) => {
      const left = Math.max(0, READY_ANSWERS - d.answers);
      return {
        ...d,
        name: this.language.domain(DOMAINS[i]),
        left,
        // Until a domain is rated, the bar shows how many answers are in.
        bar: left > 0 ? Math.round((d.answers / READY_ANSWERS) * 100) : (d.percent ?? 0),
      };
    }),
  );
}
