import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { LessonProgress } from '../../core/lesson-progress';
import { ProgressService } from '../../core/progress';
import { areaStats } from '../../core/stats';
import { StudyProgress } from '../../core/study-progress';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, EXAM, SECTIONS } from '../../data/schema';
import { ReadinessCard } from '../../shared/readiness-card/readiness-card';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, ReadinessCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly language = inject(Language);
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);
  private readonly study = inject(StudyProgress);
  protected readonly lessons = inject(LessonProgress);

  protected readonly exam = EXAM;
  protected readonly lessonCount = SECTIONS.length;
  protected readonly planned = SECTIONS.reduce((sum, s) => sum + s.target, 0);
  protected readonly bankSize = computed(() => this.bank.questions().length);
  protected readonly loaded = this.bank.loaded;
  protected readonly answered = computed(() => {
    const ids = new Set(this.bank.questions().map((q) => q.id));
    return [...this.progress.answeredIds()].filter((id) => ids.has(id)).length;
  });
  protected readonly accuracy = computed(() => this.progress.totals().accuracy);
  /** Mistakes that can be practiced; exam questions are only reviewed after the exam. */
  protected readonly mistakes = computed(() => {
    const wrong = this.progress.mistakeIds();
    return this.bank.studyQuestions().filter((q) => wrong.has(q.id)).length;
  });
  protected readonly studySize = computed(() => this.bank.studyQuestions().length);
  protected readonly history = computed(() => this.progress.history().slice(0, 5));
  protected readonly lastExam = computed(() => this.progress.history().find((h) => h.mode === 'exam') ?? null);

  protected readonly studyRow = computed(() => {
    const ids = new Set(this.bank.studyQuestions().map((q) => q.id));
    const count = (set: ReadonlySet<string>) => [...set].filter((id) => ids.has(id)).length;
    return {
      understood: count(this.study.understood()),
      due: count(this.study.dueIds()),
      bookmarked: count(this.study.bookmarked()),
    };
  });

  protected readonly domains = computed(() => {
    const byDomain = areaStats(this.bank.questions(), this.progress.stats(), 'domain');
    return DOMAINS.map((d) => ({
      id: d.id,
      name: this.language.domain(d),
      weight: `${d.weight[0]}-${d.weight[1]}%`,
      stats: byDomain.get(d.id),
    }));
  });

  protected readonly sections = computed(() => {
    const counts = this.bank.countBySection();
    return SECTIONS.map((s) => {
      const count = counts.get(s.id) ?? 0;
      return { ...s, name: this.language.section(s), count, percent: Math.min(100, Math.round((count / s.target) * 100)) };
    });
  });

  constructor() {
    void this.bank.loadAll();
  }
}
