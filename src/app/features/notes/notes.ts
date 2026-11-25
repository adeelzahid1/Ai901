import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { NoteProgress } from '../../core/note-progress';
import { MIN_QUERY } from '../../core/note-search';
import { NOTE_TITLES } from '../../data/notes';
import { DOMAINS, SECTIONS } from '../../data/schema';
import { GlossaryView } from './glossary-view';
import { NoteResults } from './note-results';
import { NoteView } from './note-view';

const GLOSSARY = 'glossary';

/** Every skill in the order of the study sections. */
const SKILLS = SECTIONS.flatMap((s) => s.subs.map((id) => ({ id, section: s.id })));

/** Detailed notes for the 29 official skills and a glossary. */
@Component({
  selector: 'app-notes',
  imports: [ReactiveFormsModule, RouterLink, NoteView, NoteResults, GlossaryView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly language = inject(Language);
  protected readonly progress = inject(NoteProgress);

  /** Skill id from the query string, e.g. /notes?n=genai-how, or "glossary". */
  readonly n = input<string>();

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly text = toSignal(this.search.valueChanges, { initialValue: '' });
  /** The search text once it is long enough. */
  protected readonly query = computed(() => (this.text().trim().length >= MIN_QUERY ? this.text() : ''));

  protected readonly glossaryId = GLOSSARY;
  protected readonly titles = NOTE_TITLES;
  protected readonly total = SKILLS.length;
  protected readonly nav = DOMAINS.map((d) => ({ ...d, sections: SECTIONS.filter((s) => s.domain === d.id) }));
  protected readonly glossary = computed(() => this.n() === GLOSSARY);
  private readonly index = computed(() =>
    Math.max(
      0,
      SKILLS.findIndex((s) => s.id === this.n()),
    ),
  );
  protected readonly current = computed(() => SKILLS[this.index()]);
  protected readonly previous = computed(() => SKILLS[this.index() - 1] ?? null);
  protected readonly next = computed(() => SKILLS[this.index() + 1] ?? null);
  /** The official wording of the skill. */
  protected readonly official = computed(() => {
    const sub = DOMAINS.flatMap((d) => d.subs).find((s) => s.id === this.current().id);
    return sub ? { en: sub.title, ro: sub.ro } : '';
  });

  protected clearSearch(): void {
    this.search.setValue('');
  }

  protected open(id: string): void {
    this.clearSearch();
    void this.router.navigate(['/notes'], { queryParams: { n: id } });
    this.document.defaultView?.scrollTo({ top: 0 });
  }
}
