import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { EXAM_DIFF_MIX, EXAM_TYPE_MIX, filterPool, pickQuestions } from '../../core/exam-builder';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { createRng } from '../../core/rng';
import { SessionStore } from '../../core/session-store';
import { QuestionBank } from '../../data/question-bank';
import { DIFFICULTY_LABEL, DOMAINS, Difficulty, EXAM, Question, QuestionType, SECTIONS, TYPE_LABEL } from '../../data/schema';
import { FeedbackMode, QuizRunner } from '../../shared/quiz-runner/quiz-runner';

type TimerMode = 'off' | 'exam' | 'custom';
type Source = 'all' | 'new' | 'mistakes';

/** Form control names cannot contain dots, so section 1.1 becomes s1_1. */
const key = (sectionId: string) => `s${sectionId.replace('.', '_')}`;
const SECONDS_PER_QUESTION = (EXAM.minutes * 60) / EXAM.examQuestions;

interface Running {
  questions: Question[];
  feedback: FeedbackMode;
  seconds: number | null;
}

@Component({
  selector: 'app-mock-test',
  imports: [ReactiveFormsModule, QuizRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mock-test.html',
  styleUrl: './mock-test.css',
})
export class MockTest {
  protected readonly language = inject(Language);
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly domains = DOMAINS.map((d) => ({ ...d, sections: SECTIONS.filter((s) => s.domain === d.id) }));
  protected readonly typeList = Object.keys(TYPE_LABEL) as QuestionType[];
  protected readonly levelList = Object.keys(DIFFICULTY_LABEL).map((l) => Number(l) as Difficulty);
  protected readonly sectionTotal = SECTIONS.length;
  protected readonly counts = [10, 20, 30, 50, 75, 100];
  protected readonly key = key;
  protected readonly secondsPerQuestion = SECONDS_PER_QUESTION;

  protected readonly form = new FormGroup({
    sections: new FormGroup(Object.fromEntries(SECTIONS.map((s) => [key(s.id), new FormControl(true, { nonNullable: true })]))),
    types: new FormGroup(Object.fromEntries(this.typeList.map((t) => [t, new FormControl(true, { nonNullable: true })]))),
    levels: new FormGroup(Object.fromEntries(this.levelList.map((l) => [`${l}`, new FormControl(true, { nonNullable: true })]))),
    count: new FormControl(30, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(500)] }),
    timer: new FormControl<TimerMode>('exam', { nonNullable: true }),
    minutes: new FormControl(30, { nonNullable: true, validators: [Validators.min(1), Validators.max(300)] }),
    source: new FormControl<Source>('all', { nonNullable: true }),
    feedback: new FormControl<FeedbackMode>('end', { nonNullable: true }),
  });
  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  private readonly filters = computed(() => {
    const v = this.value();
    const answered = this.progress.answeredIds();
    const mistakes = this.progress.mistakeIds();
    return {
      sections: SECTIONS.filter((s) => v.sections[key(s.id)]).map((s) => s.id),
      types: this.typeList.filter((t) => v.types[t]),
      diffs: this.levelList.filter((d) => v.levels[d]),
      include: (q: Question) =>
        v.source === 'new' ? !answered.has(q.id) : v.source === 'mistakes' ? mistakes.has(q.id) : true,
    };
  });

  protected readonly available = computed(() => {
    const f = this.filters();
    if (!f.sections.length || !f.types.length || !f.diffs.length) return 0;
    return filterPool(this.bank.studyQuestions(), f).length;
  });
  protected readonly finalCount = computed(() => Math.min(Math.max(0, this.value().count || 0), this.available()));
  protected readonly seconds = computed(() => {
    const v = this.value();
    if (v.timer === 'off') return null;
    if (v.timer === 'custom') return Math.max(1, v.minutes || 1) * 60;
    return Math.round(this.finalCount() * SECONDS_PER_QUESTION);
  });
  protected readonly selectedSections = computed(() => this.filters().sections.length);

  protected readonly running = signal<Running | null>(null);

  constructor() {
    void this.bank.loadAll();
  }

  protected setSections(domainId: string | null, on: boolean): void {
    const patch = Object.fromEntries(
      SECTIONS.filter((s) => domainId === null || s.domain === domainId).map((s) => [key(s.id), on]),
    );
    this.form.controls.sections.patchValue(patch);
  }

  protected start(): void {
    if (this.form.invalid || this.finalCount() === 0) return;
    const f = this.filters();
    const v = this.value();
    const questions = pickQuestions(this.bank.studyQuestions(), {
      ...f,
      count: this.finalCount(),
      rng: createRng(),
      minPerSection: 1,
      typeMix: EXAM_TYPE_MIX,
      diffMix: EXAM_DIFF_MIX,
    });
    this.running.set({
      questions,
      feedback: v.feedback,
      seconds: this.seconds(),
    });
  }

  protected finish(report: QuizReport): void {
    this.sessions.setReport(report);
    void this.router.navigate(['/results']);
  }

  protected minutesLabel(seconds: number | null): string {
    const t = this.language.ui();
    return seconds === null ? t.mock.timerOff : t.common.minutesShort(Math.round(seconds / 60));
  }
}
