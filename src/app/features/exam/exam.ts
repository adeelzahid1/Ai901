import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EXAM_DIFF_MIX, EXAM_TYPE_MIX, freshFirst, pickQuestions } from '../../core/exam-builder';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { createRng } from '../../core/rng';
import { SessionStore } from '../../core/session-store';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, EXAM, Question, weightMid } from '../../data/schema';
import { QuizRunner } from '../../shared/quiz-runner/quiz-runner';

/** Full exam simulation with fixed settings: 50 questions, 45 minutes, weighted like the real exam. */
@Component({
  selector: 'app-exam',
  imports: [QuizRunner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam.html',
  styleUrl: './exam.css',
})
export class Exam {
  protected readonly language = inject(Language);
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly exam = EXAM;
  protected readonly loaded = this.bank.loaded;
  protected readonly domains = DOMAINS.map((d) => ({ id: d.id, name: d.name, weight: d.weight, mid: weightMid(d) }));
  protected readonly questions = signal<Question[] | null>(null);
  protected readonly poolSize = computed(() => this.bank.examQuestions().length);
  /** Exam questions the learner has not answered yet. */
  protected readonly freshCount = computed(() => {
    const answered = this.progress.answeredIds();
    return this.bank.examQuestions().filter((q) => !answered.has(q.id)).length;
  });

  constructor() {
    void this.bank.loadAll();
  }

  protected start(): void {
    const stats = this.progress.stats();
    const pool = freshFirst(this.bank.examQuestions(), (id) => stats[id]?.t, EXAM.examQuestions);
    this.questions.set(
      pickQuestions(pool, {
        count: EXAM.examQuestions,
        rng: createRng(),
        minPerSection: 2,
        typeMix: EXAM_TYPE_MIX,
        diffMix: EXAM_DIFF_MIX,
      }),
    );
  }

  protected finish(report: QuizReport): void {
    this.sessions.setReport(report);
    void this.router.navigate(['/results']);
  }
}
