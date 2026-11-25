import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Language } from '../../core/language';
import { NoteProgress } from '../../core/note-progress';
import { LessonText } from '../../data/lessons';
import { NOTE_TITLES, Note, loadGlossary, loadNote } from '../../data/notes';
import { DOMAINS, SECTIONS } from '../../data/schema';
import { Notes } from './notes';

const KEYS = ['ai901-notes', 'ai901-lang'];
const SKILLS = DOMAINS.flatMap((d) => d.subs.map((s) => s.id));

describe('Notes', () => {
  let fixture: ComponentFixture<Notes>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    KEYS.forEach((key) => localStorage.removeItem(key));
    await TestBed.configureTestingModule({
      imports: [Notes],
      providers: [provideZonelessChangeDetection(), provideRouter([{ path: 'notes', component: Notes }])],
    }).compileComponents();
    fixture = TestBed.createComponent(Notes);
  });

  afterEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));

  const prose = (n: Note): LessonText[] => [
    n.main,
    ...n.explain,
    ...n.deep,
    ...n.how,
    n.example.text,
    ...n.mistakes.flatMap((m) => [m.wrong, m.right]),
    ...n.compare.map((c) => c.text),
    ...n.exam,
  ];
  const words = (texts: LessonText[], lang: 'en' | 'ro') =>
    texts.map((t) => (typeof t === 'string' ? t : t[lang])).join(' ').split(/\s+/).length;

  it('has a detailed note in both languages for every official skill', async () => {
    expect(Object.keys(NOTE_TITLES).sort()).toEqual([...SKILLS].sort());
    for (const id of SKILLS) {
      const note = await loadNote(id);
      if (!note) {
        fail(`no note for ${id}`);
        continue;
      }
      expect(note.id).toBe(id);
      expect(words(prose(note), 'en')).withContext(`${id} English`).toBeGreaterThanOrEqual(300);
      expect(words(prose(note), 'ro')).withContext(`${id} Roman Urdu`).toBeGreaterThanOrEqual(300);
      expect(note.mistakes.length).withContext(id).toBeGreaterThanOrEqual(2);
      expect(note.exam.length).withContext(id).toBeGreaterThanOrEqual(2);
      expect(note.refs.every((r) => r.startsWith('https://learn.microsoft.com/en-us/'))).withContext(id).toBeTrue();
      for (const t of [note.main, ...note.explain, ...note.deep]) {
        expect(typeof t === 'object' && t.en !== t.ro).withContext(`${id}: ${JSON.stringify(t)}`).toBeTrue();
      }
    }
  });

  it('has a sorted glossary whose terms point to existing notes', async () => {
    const entries = await loadGlossary();
    const terms = entries.map((e) => e.term.toLowerCase());
    expect(entries.length).toBeGreaterThanOrEqual(60);
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
    for (const e of entries) expect(SKILLS.includes(e.note) && !!e.en && !!e.ro).withContext(e.term).toBeTrue();
  });

  it('opens the first note, lists all skills and shows the requested one', async () => {
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('Fairness');
    expect(el().querySelectorAll('.sidebar a').length).toBe(SKILLS.length + 1);
    expect(el().querySelectorAll('.sidebar h3').length).toBe(SECTIONS.length);
    fixture.componentRef.setInput('n', 'genai-how');
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('How generative models work');
    expect(el().querySelectorAll('app-flow-diagram li').length).toBe(5);
    expect(el().querySelector('.sidebar a.active')?.textContent).toContain('How generative models work');
  });

  it('remembers a read note', async () => {
    fixture.componentRef.setInput('n', 'prompts');
    await fixture.whenStable();
    el().querySelector<HTMLInputElement>('app-note-view input[type=checkbox]')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(NoteProgress).isRead('prompts')).toBeTrue();
    expect(JSON.parse(localStorage.getItem('ai901-notes') ?? '[]')).toEqual(['prompts']);
    expect(el().querySelector('.sidebar p')?.textContent).toContain(`1 of ${SKILLS.length}`);
  });

  it('moves to the next note', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('.pager .next')?.click();
    expect(navigate).toHaveBeenCalledWith(['/notes'], { queryParams: { n: SECTIONS[0].subs[1] } });
  });

  it('filters the glossary and switches to Roman Urdu', async () => {
    fixture.componentRef.setInput('n', 'glossary');
    await fixture.whenStable();
    const input = el().querySelector<HTMLInputElement>('input[type=search]');
    if (!input) return fail('no filter');
    input.value = 'hallucination';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el().querySelectorAll('app-glossary-view dt').length).toBe(1);
    TestBed.inject(Language).set('ro');
    await fixture.whenStable();
    expect(el().querySelector('app-glossary-view dd')?.textContent).toContain('yaqeen dilane wala');
  });
});
