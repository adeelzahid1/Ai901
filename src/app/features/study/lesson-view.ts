import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { LessonProgress } from '../../core/lesson-progress';
import { QuizReport } from '../../core/report';
import { Lesson, loadLesson } from '../../data/lessons';
import { QuestionBank } from '../../data/question-bank';
import { SECTIONS, StudySection } from '../../data/schema';
import { QuizRunner } from '../../shared/quiz-runner/quiz-runner';

/** The lesson of one study section: concepts, example, table, key points and five check questions. */
@Component({
  selector: 'app-lesson-view',
  imports: [RouterLink, QuizRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.css',
})
export class LessonView {
  private readonly bank = inject(QuestionBank);
  private readonly document = inject(DOCUMENT);
  protected readonly language = inject(Language);
  protected readonly progress = inject(LessonProgress);

  readonly section = input.required<StudySection>();
  /** The learner wants to open another section. */
  readonly goTo = output<string>();

  private readonly loaded = signal<Lesson | null>(null);
  protected readonly lesson = computed(() => (this.loaded()?.id === this.section().id ? this.loaded() : null));
  protected readonly next = computed(() => SECTIONS[SECTIONS.findIndex((s) => s.id === this.section().id) + 1] ?? null);
  protected readonly questions = computed(() => {
    const ids = this.lesson()?.check ?? [];
    return this.bank.studyQuestions().filter((q) => ids.includes(q.id));
  });
  protected readonly checking = linkedSignal(() => (this.section(), false));
  protected readonly result = linkedSignal<{ correct: number; total: number } | null>(() => (this.section(), null));

  constructor() {
    effect(() => {
      const id = this.section().id;
      void loadLesson(id).then((lesson) => {
        if (this.section().id === id) this.loaded.set(lesson);
      });
    });
  }

  protected startCheck(): void {
    this.result.set(null);
    this.checking.set(true);
  }

  /** Opens another section and starts at the top of its lesson. */
  protected open(sectionId: string): void {
    this.goTo.emit(sectionId);
    this.document.defaultView?.scrollTo({ top: 0 });
  }

  protected finish(report: QuizReport): void {
    const total = this.questions().length;
    this.checking.set(false);
    this.result.set({ correct: report.correct, total });
    this.progress.recordCheck(this.section().id, report.correct, total);
  }
}
