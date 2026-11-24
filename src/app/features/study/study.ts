import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { matchesSearch } from '../../core/search';
import { isDue } from '../../core/srs';
import { StudyProgress } from '../../core/study-progress';
import { QuestionBank } from '../../data/question-bank';
import { RomanBank } from '../../data/roman-bank';
import { DOMAINS, Difficulty, EXAM, Question, SECTIONS, sectionOf } from '../../data/schema';
import { Flashcards } from './flashcards';
import { StudyCard } from './study-card';

export type StudyFilter = 'all' | 'not-understood' | 'bookmarked' | 'due' | 'mistakes';
type Mode = 'list' | 'cards';

export const PAGE_SIZE = 20;

@Component({
  selector: 'app-study',
  imports: [ReactiveFormsModule, RouterLink, StudyCard, Flashcards],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study.html',
  styleUrl: './study.css',
})
export class Study {
  private readonly bank = inject(QuestionBank);
  private readonly translations = inject(RomanBank);
  protected readonly language = inject(Language);
  private readonly progress = inject(ProgressService);
  private readonly router = inject(Router);
  protected readonly study = inject(StudyProgress);

  /** Section id from the query string, e.g. /study?s=2.3 */
  readonly s = input<string>();

  protected readonly exam = EXAM;
  protected readonly levels: Difficulty[] = [1, 2, 3];
  protected readonly section = computed(() => SECTIONS.find((x) => x.id === this.s()) ?? SECTIONS[0]);

  protected readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    level: new FormControl('all', { nonNullable: true }),
    filter: new FormControl<StudyFilter>('all', { nonNullable: true }),
  });
  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  protected readonly mode = signal<Mode>('list');

  /** Questions grouped by section, in bank order. */
  private readonly bySection = computed(() => {
    const m = new Map<string, Question[]>();
    for (const q of this.bank.questions()) {
      const id = sectionOf(q)?.id;
      if (id) m.set(id, [...(m.get(id) ?? []), q]);
    }
    return m;
  });

  protected readonly nav = computed(() => {
    const understood = this.study.understood();
    return DOMAINS.map((d) => ({
      ...d,
      sections: SECTIONS.filter((s) => s.domain === d.id).map((s) => {
        const list = this.bySection().get(s.id) ?? [];
        return { ...s, total: list.length, understood: list.filter((q) => understood.has(q.id)).length };
      }),
    }));
  });

  protected readonly sectionQuestions = computed(() => this.bySection().get(this.section().id) ?? []);

  protected readonly filtered = computed(() => {
    const v = this.value();
    const understood = this.study.understood();
    const bookmarked = this.study.bookmarked();
    const due = this.study.dueIds();
    const mistakes = this.progress.mistakeIds();
    return this.sectionQuestions().filter((q) => {
      if (v.level !== 'all' && q.diff !== Number(v.level)) return false;
      switch (v.filter) {
        case 'not-understood':
          if (understood.has(q.id)) return false;
          break;
        case 'bookmarked':
          if (!bookmarked.has(q.id)) return false;
          break;
        case 'due':
          if (!due.has(q.id)) return false;
          break;
        case 'mistakes':
          if (!mistakes.has(q.id)) return false;
          break;
      }
      return matchesSearch(this.translations.localize(q), v.search);
    });
  });

  /** Resets to the first page only when the section, filters or mode change. */
  protected readonly visible = linkedSignal({
    source: () => [this.section().id, this.value(), this.mode()] as const,
    computation: () => PAGE_SIZE,
  });
  protected readonly shown = computed(() => this.filtered().slice(0, this.visible()));
  protected readonly open = signal<ReadonlySet<string>>(new Set());

  protected readonly cardsReady = computed(() => this.filtered().filter((q) => isDue(this.study.cards()[q.id])));
  protected readonly deck = linkedSignal<readonly unknown[], Question[] | null>({
    source: () => [this.section().id, this.value(), this.mode()] as const,
    computation: () => null,
  });

  protected readonly sectionStats = computed(() => {
    const list = this.sectionQuestions();
    const understood = this.study.understood();
    const bookmarked = this.study.bookmarked();
    const due = this.study.dueIds();
    return {
      total: list.length,
      understood: list.filter((q) => understood.has(q.id)).length,
      bookmarked: list.filter((q) => bookmarked.has(q.id)).length,
      due: list.filter((q) => due.has(q.id)).length,
    };
  });

  constructor() {
    void this.bank.loadAll();
  }

  protected goTo(sectionId: string): void {
    void this.router.navigate(['/study'], { queryParams: { s: sectionId } });
  }

  protected toggleOpen(id: string): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected showAll(on: boolean): void {
    this.open.set(on ? new Set(this.shown().map((q) => q.id)) : new Set());
  }

  protected loadMore(): void {
    this.visible.update((n) => n + PAGE_SIZE);
  }

  protected startCards(all = false): void {
    const list = all ? this.filtered() : this.cardsReady();
    this.deck.set([...list]);
  }
}
