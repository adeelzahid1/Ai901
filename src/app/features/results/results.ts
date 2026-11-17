import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/session-store';
import { EXAM } from '../../data/schema';
import { QuestionView } from '../../shared/question-view/question-view';

type ReviewFilter = 'all' | 'wrong' | 'marked';

@Component({
  selector: 'app-results',
  imports: [RouterLink, QuestionView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results {
  protected readonly exam = EXAM;
  protected readonly report = inject(SessionStore).lastReport;
  protected readonly filter = signal<ReviewFilter>('wrong');

  protected readonly minutes = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return Math.max(1, Math.round((r.finishedAt - r.startedAt) / 60000));
  });
  protected readonly wrongCount = computed(() => this.report()?.items.filter((it) => it.score < 1).length ?? 0);
  protected readonly markedCount = computed(() => this.report()?.items.filter((it) => it.marked).length ?? 0);
  protected readonly reviewList = computed(() => {
    const r = this.report();
    if (!r) return [];
    const f = this.filter();
    return r.items
      .map((it, i) => ({ it, n: i + 1 }))
      .filter(({ it }) => (f === 'wrong' ? it.score < 1 : f === 'marked' ? it.marked : true));
  });
  protected readonly againLink = computed(() => {
    const mode = this.report()?.mode;
    return mode === 'exam' ? '/exam' : mode === 'mock' ? '/mock' : '/practice';
  });
}
