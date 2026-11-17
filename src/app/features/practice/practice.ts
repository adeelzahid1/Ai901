import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { filterPool } from '../../core/exam-builder';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { createRng, shuffle } from '../../core/rng';
import { SessionStore } from '../../core/session-store';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, Difficulty, Question, QuestionType, SECTIONS, TYPE_LABEL } from '../../data/schema';
import { QuizRunner } from '../../shared/quiz-runner/quiz-runner';

type Source = 'all' | 'new' | 'mistakes';

@Component({
  selector: 'app-practice',
  imports: [ReactiveFormsModule, QuizRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './practice.html',
})
export class Practice implements OnInit {
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  /** Optional query parameters, for example /practice?section=1.3&source=mistakes */
  readonly domain = input<string>();
  readonly section = input<string>();
  readonly source = input<string>();

  protected readonly domains = DOMAINS;
  protected readonly types = Object.entries(TYPE_LABEL) as [QuestionType, string][];

  protected readonly form = new FormGroup({
    domain: new FormControl('all', { nonNullable: true }),
    section: new FormControl('all', { nonNullable: true }),
    level: new FormControl('all', { nonNullable: true }),
    type: new FormControl('all', { nonNullable: true }),
    source: new FormControl<Source>('all', { nonNullable: true }),
  });
  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly sectionOptions = computed(() => {
    const d = this.value().domain;
    return SECTIONS.filter((s) => d === 'all' || s.domain === d);
  });

  protected readonly matching = computed(() => {
    const v = this.value();
    const answered = this.progress.answeredIds();
    const mistakes = this.progress.mistakeIds();
    const sectionOk = this.sectionOptions().some((s) => s.id === v.section);
    return filterPool(this.bank.questions(), {
      sections: sectionOk ? [v.section] : this.sectionOptions().map((s) => s.id),
      diffs: v.level === 'all' ? [] : [Number(v.level) as Difficulty],
      types: v.type === 'all' ? [] : [v.type as QuestionType],
      include: (q) => (v.source === 'new' ? !answered.has(q.id) : v.source === 'mistakes' ? mistakes.has(q.id) : true),
    });
  });

  protected readonly session = signal<Question[] | null>(null);
  protected readonly sessionTitle = signal('Practice');

  constructor() {
    void this.bank.loadAll();
  }

  ngOnInit(): void {
    const section = SECTIONS.find((s) => s.id === this.section());
    const domain = DOMAINS.find((d) => d.id === (this.domain() ?? section?.domain));
    const source = this.source();
    this.form.patchValue({
      domain: domain?.id ?? 'all',
      section: section?.id ?? 'all',
      source: source === 'new' || source === 'mistakes' ? source : 'all',
    });
  }

  protected start(): void {
    const list = shuffle(this.matching(), createRng());
    const v = this.value();
    const parts = [
      v.section !== 'all' ? `Section ${v.section}` : v.domain !== 'all' ? v.domain : 'All topics',
      v.source === 'mistakes' ? 'mistakes' : v.source === 'new' ? 'new questions' : '',
    ].filter(Boolean);
    this.sessionTitle.set(`Practice · ${parts.join(' · ')}`);
    this.session.set(list);
  }

  protected stop(): void {
    this.session.set(null);
  }

  protected finish(report: QuizReport): void {
    this.sessions.setReport(report);
    void this.router.navigate(['/results']);
  }

}
