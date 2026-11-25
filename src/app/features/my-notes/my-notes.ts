import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { NoteKey, NoteKind, OwnNotes } from '../../core/own-notes';
import { NOTE_TITLES } from '../../data/notes';
import { QuestionBank } from '../../data/question-bank';
import { RomanBank } from '../../data/roman-bank';
import { SECTIONS, isExamOnly, sectionOf } from '../../data/schema';
import { OwnNote } from '../../shared/own-note/own-note';
import { BackupCard } from './backup-card';

/** A link to the place the note belongs to. */
interface Source {
  title: string;
  detail: string;
  link: string[] | null;
  params: Record<string, string>;
}

/** All notes of the learner in one place, and the backup. */
@Component({
  selector: 'app-my-notes',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, OwnNote, BackupCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-notes.html',
  styleUrl: './my-notes.css',
})
export class MyNotes {
  private readonly bank = inject(QuestionBank);
  private readonly translations = inject(RomanBank);
  protected readonly language = inject(Language);
  protected readonly notes = inject(OwnNotes);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly kind = new FormControl<NoteKind | 'all'>('all', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly kindValue = toSignal(this.kind.valueChanges, { initialValue: 'all' as const });
  /** Note whose deletion must be confirmed. */
  protected readonly confirming = signal<NoteKey | null>(null);
  /** Note that is open for editing. */
  protected readonly editing = signal<NoteKey | null>(null);

  /** Newest first. The order stays while a note is edited, so the field does not jump or disappear. */
  private readonly order = linkedSignal<{ keys: NoteKey[]; editing: NoteKey | null }, NoteKey[]>({
    source: () => ({ keys: this.notes.entries().map((e) => e.key), editing: this.editing() }),
    computation: ({ keys, editing }, previous) => (editing && previous ? previous.value : keys),
  });

  private readonly questions = computed(() => new Map(this.bank.questions().map((q) => [q.id, q])));

  protected readonly rows = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const kind = this.kindValue();
    const editing = this.editing();
    return this.order()
      .map((key) => this.notes.entry(key))
      .filter((e) => e.key === editing || (e.text && (kind === 'all' || e.kind === kind)))
      .map((e) => ({ ...e, source: this.source(e.kind, e.id) }))
      .filter((e) => {
        if (e.key === editing) return true;
        const all = `${e.text} ${e.source.title} ${e.source.detail}`.toLowerCase();
        return words.every((w) => all.includes(w));
      });
  });

  constructor() {
    // Question notes show the question they belong to.
    if (this.notes.entries().some((e) => e.kind === 'q')) void this.bank.loadAll();
  }

  protected remove(key: NoteKey): void {
    this.notes.remove(key);
    this.confirming.set(null);
    this.editing.set(null);
  }

  private source(kind: NoteKind, id: string): Source {
    const t = this.language.ui().ownNotes;
    if (kind === 's') {
      const section = SECTIONS.find((s) => s.id === id);
      return { title: `${id} ${section ? this.language.section(section) : ''}`, detail: t.kinds.s, link: ['/study'], params: { s: id } };
    }
    if (kind === 'n') {
      const title = NOTE_TITLES[id];
      return { title: title ? this.language.pick(title) : id, detail: t.kinds.n, link: ['/notes'], params: { n: id } };
    }
    const q = this.questions().get(id);
    if (!q) return { title: id, detail: t.kinds.q, link: null, params: {} };
    const section = sectionOf(q)?.id ?? '';
    const studyable = !isExamOnly(q);
    return {
      title: this.translations.localize(q).q,
      detail: `${id} · ${section}${studyable ? '' : ` · ${t.examOnly}`}`,
      link: studyable ? ['/study'] : null,
      params: studyable ? { s: section, q: id } : {},
    };
  }
}
