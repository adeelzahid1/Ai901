import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Language } from '../../core/language';
import { CheatSheetData, loadCheatSheet } from '../../data/cheat-sheet';
import { LessonText } from '../../data/lessons';
import { SECTIONS } from '../../data/schema';
import { CheatSheet } from './cheat-sheet';

describe('CheatSheet', () => {
  let fixture: ComponentFixture<CheatSheet>;
  let data: CheatSheetData;
  const el = () => fixture.nativeElement as HTMLElement;
  const headings = () => [...el().querySelectorAll('section > h2')].map((h) => h.textContent?.trim() ?? '');
  const check = async (control: string) => {
    el().querySelector<HTMLInputElement>(`input[formcontrolname=${control}]`)?.click();
    await fixture.whenStable();
  };
  const langButton = (index: number) =>
    el().querySelectorAll<HTMLButtonElement>('.lang-switch button')[index];

  beforeEach(async () => {
    localStorage.removeItem('ai901-lang');
    await TestBed.configureTestingModule({
      imports: [CheatSheet],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    data = await loadCheatSheet();
    fixture = TestBed.createComponent(CheatSheet);
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('ai901-lang'));

  it('has complete data in both languages', () => {
    const filled = (t: LessonText) => (typeof t === 'string' ? !!t : !!t.en && !!t.ro);
    expect(data.lessons.map((l) => l.id)).toEqual(SECTIONS.map((s) => s.id));
    expect(data.numbers.every((n) => n.value && filled(n.label))).toBeTrue();
    for (const t of data.tables) {
      expect(t.rows.every((r) => r.length === t.head.length && r.every(filled))).withContext(t.id).toBeTrue();
      expect(filled(t.title) && t.head.every(filled)).withContext(t.id).toBeTrue();
    }
    for (const c of data.code) {
      expect(filled(c.title) && c.snippets.every((s) => filled(s.title) && s.code.length > 10)).withContext(c.id).toBeTrue();
    }
    expect(data.examSections.length).toBeGreaterThanOrEqual(3);
    expect(data.glossary.length).toBeGreaterThanOrEqual(60);
  });

  it('renders both English and Roman Urdu by default without duplicating identical strings', () => {
    const text = el().textContent ?? '';
    expect(text).toContain('points lost for a wrong answer');
    expect(text).toContain('number kam ghalat jawab par');
    expect(text).toContain('Core concepts by section · Har section ke bunyadi concepts');
    expect(el().querySelector('.banner-meta')?.textContent).toContain('D1: 40–45% · D2: 55–60%');
    expect(el().querySelector('app-cheat-table.wide')).withContext('four columns scroll on phones').not.toBeNull();
    expect(el().querySelectorAll('app-cheat-table').length).toBe(SECTIONS.length + data.tables.length);
    expect(el().querySelectorAll('pre').length).toBe(data.code.reduce((sum, c) => sum + c.snippets.length, 0));
    expect(el().querySelectorAll('.concepts-block').length).toBe(SECTIONS.length);
    expect(el().querySelectorAll('.points').length).toBe(SECTIONS.length);

    // Identical plain strings like GlobalStandard appear once in their table row, not doubled.
    const row = [...el().querySelectorAll('tbody tr')].find((r) => r.textContent?.includes('GlobalStandard'));
    expect(row?.textContent?.match(/GlobalStandard/g)?.length).toBe(1);
  });

  it('switches between Both, English only, and Roman Urdu only', async () => {
    langButton(1).click();
    await fixture.whenStable();
    expect(el().textContent).toContain('points lost for a wrong answer');
    expect(el().textContent).not.toContain('number kam ghalat jawab par');
    expect(headings()).toContain('Which one when');

    langButton(2).click();
    await fixture.whenStable();
    expect(el().querySelector('.banner-meta')?.textContent).toContain('taqreeban 50 sawal');
    expect(el().textContent).not.toContain('points lost for a wrong answer');
    expect(el().textContent).toContain('number kam ghalat jawab par');
    expect(headings()).toContain('Kab kaunsa');

    langButton(0).click();
    await fixture.whenStable();
    expect(el().textContent).toContain('points lost for a wrong answer');
    expect(el().textContent).toContain('number kam ghalat jawab par');
  });

  it('toggles parts and applies quick presets', async () => {
    await check('commands');
    expect(headings().some((h) => h.includes('Commands and code'))).toBeFalse();

    const presetButtons = [...el().querySelectorAll<HTMLButtonElement>('.presets button')];
    presetButtons[2].click(); // Full + glossary
    await fixture.whenStable();
    expect(el().querySelectorAll('.glossary-item').length).toBe(data.glossary.length);

    presetButtons[1].click(); // Quick cram
    await fixture.whenStable();
    expect(el().querySelectorAll('.concepts-block').length).toBe(0);
    expect(el().querySelectorAll('.glossary-item').length).toBe(0);
    expect(el().querySelectorAll('.points').length).toBe(SECTIONS.length);
  });

  it('filters by domain, section, and search query', async () => {
    const selects = el().querySelectorAll<HTMLSelectElement>('select');
    const domainSelect = selects[0];
    const sectionSelect = selects[1];

    domainSelect.value = 'D1';
    domainSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const d1Sections = SECTIONS.filter((s) => s.domain === 'D1').length;
    expect(el().querySelectorAll('.concepts-block').length).toBe(d1Sections);
    expect(headings().some((h) => h.includes('Commands and code'))).toBeFalse();

    sectionSelect.value = '1.3';
    sectionSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(el().querySelectorAll('.concepts-block').length).toBe(1);

    const search = el().querySelector<HTMLInputElement>('input[type=search]');
    if (!search) return fail('no search input');
    search.value = 'GlobalBatch';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el().textContent).toContain('Global / Data Zone Batch');

    // A section of another domain falls back to all sections.
    domainSelect.value = 'D2';
    domainSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(sectionSelect.value).toBe('all');

    search.value = 'xyznonexistentterm';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el().textContent).toContain('No cheat sheet items match');
  });

  it('opens the print dialog and translates toolbar via global language toggle', async () => {
    const print = spyOn(window, 'print');
    el().querySelector<HTMLButtonElement>('.buttons button.primary')?.click();
    expect(print).toHaveBeenCalledTimes(1);

    TestBed.inject(Language).set('ro');
    await fixture.whenStable();
    expect(el().querySelector('.buttons button.primary')?.textContent?.trim()).toBe('Print ya PDF save karein');
  });
});
