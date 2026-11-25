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
  const headings = () => [...el().querySelectorAll('h2')].map((h) => h.textContent?.trim());
  const check = async (control: string) => {
    el().querySelector<HTMLInputElement>(`input[formcontrolname=${control}]`)?.click();
    await fixture.whenStable();
  };

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

  it('has complete tables and code in both languages', () => {
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
  });

  it('shows the "which one when" table of every section, the reference tables and the commands', () => {
    expect(el().querySelectorAll('app-cheat-table').length).toBe(SECTIONS.length + data.tables.length);
    expect(el().querySelectorAll('pre').length).toBe(data.code.reduce((sum, c) => sum + c.snippets.length, 0));
    expect(el().textContent).toContain('az cognitiveservices account deployment create');
    expect(el().textContent).toContain('rate limit or quota reached');
  });

  it('hides and adds parts', async () => {
    expect(headings()).toEqual(['Numbers', 'Which one when', 'Reference', 'Commands and code']);
    await check('commands');
    await check('points');
    expect(headings()).toEqual(['Numbers', 'Which one when', 'Reference', 'Remember and exam traps']);
    expect(el().querySelectorAll('.points').length).toBe(SECTIONS.length);
  });

  it('limits the sheet to one domain', async () => {
    const select = el().querySelector<HTMLSelectElement>('select');
    if (!select) return fail('no domain list');
    select.value = 'D1';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const sections = SECTIONS.filter((s) => s.domain === 'D1').length;
    expect(el().querySelectorAll('app-cheat-table').length).toBe(sections + data.tables.filter((t) => t.domain === 'D1').length);
    expect(headings()).not.toContain('Commands and code');
  });

  it('opens the print dialog and switches to Roman Urdu', async () => {
    const print = spyOn(window, 'print');
    el().querySelector<HTMLButtonElement>('button.primary')?.click();
    expect(print).toHaveBeenCalledTimes(1);
    TestBed.inject(Language).set('ro');
    await fixture.whenStable();
    expect(headings()).toContain('Kab kaunsa');
  });
});
