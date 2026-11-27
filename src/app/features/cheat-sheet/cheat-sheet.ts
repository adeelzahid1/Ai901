import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Language } from '../../core/language';
import { CheatCode, CheatSheetData, CheatTable as CheatTableData, loadCheatSheet } from '../../data/cheat-sheet';
import { Lesson, LessonText } from '../../data/lessons';
import { DOMAINS, EXAM, SECTIONS, StudySection } from '../../data/schema';
import { BilingualText, SheetLang } from './bilingual-text';
import { CheatGlossary } from './cheat-glossary';
import { CheatOverview } from './cheat-overview';
import { CheatTable } from './cheat-table';

const on = (value: boolean) => new FormControl(value, { nonNullable: true });

const TABLE_SECTIONS: Record<string, readonly string[]> = {
  'deployment-types': ['1.3'],
  parameters: ['1.3'],
  lifecycle: ['1.3'],
  'text-inside': ['1.5'],
  pipelines: ['1.2', '1.6', '1.7', '2.6'],
  retirements: ['1.5', '1.7', '2.2', '2.5'],
  http: ['2.2', '2.3'],
  roles: ['2.2'],
  guardrails: ['2.2'],
  endpoints: ['2.2', '2.3'],
  packages: ['2.3', '2.5', '2.6'],
  parts: ['2.3', '2.5', '2.6'],
  iq: ['2.4'],
  'voice-agent': ['2.4'],
  cu: ['2.7'],
};

const CODE_SECTIONS: Record<string, readonly string[]> = {
  cli: ['2.2'],
  chat: ['2.3'],
  python: ['2.3'],
  agents: ['2.4'],
  'text-speech': ['2.5'],
  vision: ['2.6'],
  rest: ['2.3', '2.7'],
  'cu-sdk': ['2.7'],
};

const SECTION_BY_SUB = new Map<string, StudySection>(
  SECTIONS.flatMap((s) => s.subs.map((sub) => [sub, s] as const)),
);

function textMatches(text: LessonText, query: string): boolean {
  if (!query) return true;
  if (typeof text === 'string') return text.toLowerCase().includes(query);
  return text.en.toLowerCase().includes(query) || text.ro.toLowerCase().includes(query);
}

function anyMatches(texts: readonly LessonText[], query: string): boolean {
  return !query || texts.some((t) => textMatches(t, query));
}

function sectionMatches(id: string, selectedSection: string, map: Record<string, readonly string[]>): boolean {
  if (selectedSection === 'all') return true;
  const sections = map[id];
  return !sections || sections.includes(selectedSection);
}

export interface SheetLesson extends Lesson {
  domain: string;
  title: LessonText;
}

/** Comprehensive bilingual (English + Roman Urdu) AI-901 cheat sheet built for screen and A4 PDF printing. */
@Component({
  selector: 'app-cheat-sheet',
  imports: [ReactiveFormsModule, RouterLink, CheatTable, BilingualText, CheatOverview, CheatGlossary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cheat-sheet.html',
  styleUrl: './cheat-sheet.css',
})
export class CheatSheet {
  private readonly document = inject(DOCUMENT);
  protected readonly language = inject(Language);

  protected readonly exam = EXAM;
  protected readonly domains = DOMAINS;
  private readonly data = signal<CheatSheetData | null>(null);

  protected readonly form = new FormGroup({
    langMode: new FormControl<SheetLang>('both', { nonNullable: true }),
    domain: new FormControl('all', { nonNullable: true }),
    section: new FormControl('all', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    overview: on(true),
    concepts: on(true),
    when: on(true),
    reference: on(true),
    commands: on(true),
    points: on(true),
    examTips: on(true),
    glossary: on(false),
  });

  protected readonly show = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly availableSections = computed(() => {
    const domain = this.show().domain;
    return domain === 'all' ? SECTIONS : SECTIONS.filter((s) => s.domain === domain);
  });

  protected readonly langModeLabel = computed(() => {
    const mode = this.show().langMode;
    return mode === 'en' ? 'English' : mode === 'ro' ? 'Roman Urdu' : 'English + Roman Urdu';
  });

  /** Filtered parts for the chosen language mode, domain, section and search query. */
  protected readonly sheet = computed(() => {
    const data = this.data();
    if (!data) return null;
    const { domain, section, search } = this.show();
    const q = search.trim().toLowerCase();
    const inDomain = (d: string | undefined) => domain === 'all' || d === domain;
    const inSection = (sId: string) => section === 'all' || sId === section;

    const blueprintDomains = DOMAINS.filter((d) => inDomain(d.id))
      .map((d) => {
        const domainMatches = anyMatches([d.id, d.name, d.ro], q);
        const sections = SECTIONS.filter((s) => s.domain === d.id && inSection(s.id)).filter(
          (s) => domainMatches || anyMatches([s.id, s.en, s.ro], q),
        );
        return { ...d, title: { en: d.name, ro: d.ro }, sections };
      })
      .filter((d) => d.sections.length > 0);

    const numbers = data.numbers.filter((n) => !q || n.value.toLowerCase().includes(q) || textMatches(n.label, q));

    const baseLessons: SheetLesson[] = data.lessons.flatMap((lesson) => {
      const sec = SECTIONS.find((s) => s.id === lesson.id);
      if (!sec || !inDomain(sec.domain) || !inSection(sec.id)) return [];
      return [{ ...lesson, domain: sec.domain, title: { en: sec.en, ro: sec.ro } }];
    });

    const conceptLessons = baseLessons.flatMap((l) => {
      const titleHit = anyMatches([l.id, l.title, l.intro], q);
      const items = titleHit ? l.concepts : l.concepts.filter((c) => anyMatches([c.term, c.text], q));
      return items.length ? [{ ...l, concepts: items }] : [];
    });

    const whenLessons = baseLessons.flatMap((l) => {
      const titleHit = anyMatches([l.id, l.title, l.table.title], q);
      const rows = titleHit ? l.table.rows : l.table.rows.filter((r) => anyMatches(r, q));
      return rows.length ? [{ ...l, table: { ...l.table, rows } }] : [];
    });

    const pointLessons = baseLessons.flatMap((l) => {
      const titleHit = anyMatches([l.id, l.title], q);
      const remember = titleHit ? l.remember : l.remember.filter((r) => textMatches(r, q));
      const traps = titleHit ? l.traps : l.traps.filter((t) => textMatches(t, q));
      return remember.length || traps.length ? [{ ...l, remember, traps }] : [];
    });

    const matchedTables: CheatTableData[] = data.tables
      .filter((t) => inDomain(t.domain) && sectionMatches(t.id, section, TABLE_SECTIONS))
      .flatMap((t) => {
        const titleHit = textMatches(t.title, q);
        const rows = titleHit ? t.rows : t.rows.filter((r) => anyMatches(r, q));
        return rows.length ? [{ ...t, rows }] : [];
      });

    const wideTables = matchedTables.filter((t) => t.head.length >= 3);
    const compactTables = matchedTables.filter((t) => t.head.length < 3);

    const code: CheatCode[] = data.code
      .filter((c) => inDomain(c.domain) && sectionMatches(c.id, section, CODE_SECTIONS))
      .flatMap((c) => {
        const titleHit = textMatches(c.title, q);
        const snippets = titleHit
          ? c.snippets
          : c.snippets.filter((x) => textMatches(x.title, q) || x.code.toLowerCase().includes(q));
        return snippets.length ? [{ ...c, snippets }] : [];
      });

    const examSections = data.examSections.flatMap((sec) => {
      const titleHit = textMatches(sec.title, q);
      const items = titleHit ? sec.items : sec.items.filter((i) => textMatches(i, q));
      return items.length ? [{ ...sec, items }] : [];
    });

    const glossary = data.glossary
      .map((g) => ({ ...g, section: SECTION_BY_SUB.get(g.note) }))
      .filter((g) => {
        if (!g.section || !inDomain(g.section.domain) || !inSection(g.section.id)) return false;
        return anyMatches([g.term, g.section.id, { en: g.en, ro: g.ro }], q);
      });

    return {
      blueprintDomains,
      numbers,
      conceptLessons,
      whenLessons,
      wideTables,
      compactTables,
      code,
      pointLessons,
      examSections,
      glossary,
    };
  });

  protected readonly hasVisibleContent = computed(() => {
    const s = this.sheet();
    const v = this.show();
    if (!s) return true;
    return (
      (v.overview && (s.blueprintDomains.length > 0 || s.numbers.length > 0)) ||
      (v.concepts && s.conceptLessons.length > 0) ||
      (v.when && s.whenLessons.length > 0) ||
      (v.reference && (s.wideTables.length > 0 || s.compactTables.length > 0)) ||
      (v.commands && s.code.length > 0) ||
      (v.points && s.pointLessons.length > 0) ||
      (v.examTips && s.examSections.length > 0) ||
      (v.glossary && s.glossary.length > 0)
    );
  });

  constructor() {
    inject(PendingTasks).run(async () => this.data.set(await loadCheatSheet()));
    // A section of the other domain would hide everything, so it falls back to all sections.
    this.form.controls.domain.valueChanges.pipe(takeUntilDestroyed()).subscribe((domain) => {
      const section = SECTIONS.find((s) => s.id === this.form.controls.section.value);
      if (domain !== 'all' && section && section.domain !== domain) this.form.controls.section.setValue('all');
    });
  }

  protected setLangMode(mode: SheetLang): void {
    this.form.controls.langMode.setValue(mode);
  }

  protected applyPreset(preset: 'core' | 'cram' | 'full'): void {
    if (preset === 'cram') {
      this.form.patchValue({
        overview: true,
        concepts: false,
        when: true,
        reference: true,
        commands: false,
        points: true,
        examTips: true,
        glossary: false,
      });
    } else if (preset === 'full') {
      this.form.patchValue({
        overview: true,
        concepts: true,
        when: true,
        reference: true,
        commands: true,
        points: true,
        examTips: true,
        glossary: true,
      });
    } else {
      this.form.patchValue({
        overview: true,
        concepts: true,
        when: true,
        reference: true,
        commands: true,
        points: true,
        examTips: true,
        glossary: false,
      });
    }
  }

  protected print(): void {
    this.document.defaultView?.print();
  }
}
