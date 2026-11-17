import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EXAM_DIFF_MIX, EXAM_TYPE_MIX, pickQuestions } from '../../core/exam-builder';
import { QuizReport } from '../../core/report';
import { createRng } from '../../core/rng';
import { SessionStore } from '../../core/session-store';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, EXAM, Question, weightMid } from '../../data/schema';
import { QuizRunner } from '../../shared/quiz-runner/quiz-runner';

/** Full exam simulation with fixed settings: 50 questions, 45 minutes, weighted like the real exam. */
@Component({
  selector: 'app-exam',
  imports: [QuizRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam.html',
  styleUrl: './exam.css',
})
export class Exam {
  private readonly bank = inject(QuestionBank);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly exam = EXAM;
  protected readonly loaded = this.bank.loaded;
  protected readonly domains = DOMAINS.map((d) => ({ id: d.id, name: d.name, weight: d.weight, mid: weightMid(d) }));
  protected readonly questions = signal<Question[] | null>(null);

  constructor() {
    void this.bank.loadAll();
  }

  protected start(): void {
    this.questions.set(
      pickQuestions(this.bank.questions(), {
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
