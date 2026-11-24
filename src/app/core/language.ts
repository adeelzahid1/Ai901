import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOMAINS, Domain, SECTIONS, StudySection, SubSkill } from '../data/schema';
import { Lang, UI_TEXT } from '../i18n/ui-text';
import { LocalStore } from './storage';

const KEY = 'ai901-lang';

/** The language of the whole app: English or Roman Urdu. Saved in localStorage. */
@Injectable({ providedIn: 'root' })
export class Language {
  private readonly store = inject(LocalStore);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<Lang>(this.store.read<string>(KEY, 'en') === 'ro' ? 'ro' : 'en');

  readonly lang = this.current.asReadonly();
  readonly roman = computed(() => this.lang() === 'ro');
  /** Interface text in the current language. */
  readonly ui = computed(() => UI_TEXT[this.lang()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.roman() ? 'ur-Latn' : 'en';
    });
  }

  set(lang: Lang): void {
    this.current.set(lang);
    this.store.write(KEY, lang);
  }

  section(s: Pick<StudySection, 'en' | 'ro'>): string {
    return this.roman() ? s.ro : s.en;
  }

  domain(d: Pick<Domain, 'name' | 'ro'>): string {
    return this.roman() ? d.ro : d.name;
  }

  domainShort(d: Pick<Domain, 'short' | 'shortRo'>): string {
    return this.roman() ? d.shortRo : d.short;
  }

  sub(s: Pick<SubSkill, 'title' | 'ro'>): string {
    return this.roman() ? s.ro : s.title;
  }

  /** Name of a domain (D1) or a study section (1.1) by id, for saved reports. */
  area(id: string): string {
    const section = SECTIONS.find((s) => s.id === id);
    if (section) return this.section(section);
    const domain = DOMAINS.find((d) => d.id === id);
    return domain ? this.domain(domain) : id;
  }

  /** Title of a finished session; practice sessions keep the title they were started with. */
  sessionTitle(s: { mode: string; title: string; total: number }, examCode: string): string {
    const t = this.ui().titles;
    if (s.mode === 'exam') return t.exam(examCode);
    if (s.mode === 'mock') return t.mock(s.total);
    return s.title;
  }
}
