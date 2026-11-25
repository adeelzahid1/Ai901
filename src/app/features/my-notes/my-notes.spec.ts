import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Language } from '../../core/language';
import { OwnNotes } from '../../core/own-notes';
import { QuestionBank } from '../../data/question-bank';
import { OwnNote } from '../../shared/own-note/own-note';
import { BackupCard } from './backup-card';
import { MyNotes } from './my-notes';

const KEYS = ['ai901-own-notes', 'ai901-lang', 'ai901-undo', 'ai901-notes'];

describe('own notes', () => {
  beforeEach(() => {
    KEYS.forEach((k) => localStorage.removeItem(k));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
  });
  afterEach(() => KEYS.forEach((k) => localStorage.removeItem(k)));

  it('saves, updates and removes notes, newest first', () => {
    const notes = TestBed.inject(OwnNotes);
    notes.save('q:D1-001', ' first ', 1);
    notes.save('s:1.2', 'section', 2);
    expect(notes.entries().map((e) => [e.kind, e.id, e.text])).toEqual([
      ['s', '1.2', 'section'],
      ['q', 'D1-001', 'first'],
    ]);
    notes.save('q:D1-001', 'changed', 3);
    expect(notes.entries()[0].text).toBe('changed');
    notes.save('q:D1-001', 'changed ', 9);
    expect(notes.entries()[0].at).withContext('same text keeps its time').toBe(3);
    notes.save('s:1.2', '   ');
    expect(Object.keys(JSON.parse(localStorage.getItem('ai901-own-notes') ?? '{}'))).toEqual(['q:D1-001']);
    notes.remove('q:D1-001');
    expect(notes.count()).toBe(0);
  });

  describe('note field', () => {
    let fixture: ComponentFixture<OwnNote>;
    const area = () => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const type = (text: string) => {
      area().value = text;
      area().dispatchEvent(new Event('input'));
    };

    beforeEach(async () => {
      fixture = TestBed.createComponent(OwnNote);
      fixture.componentRef.setInput('kind', 'q');
      fixture.componentRef.setInput('target', 'D1-001');
      await fixture.whenStable();
    });

    it('is closed while empty and saves when it loses focus', async () => {
      expect(fixture.nativeElement.querySelector('details').open).toBeFalse();
      type('remember this');
      area().dispatchEvent(new Event('blur'));
      expect(TestBed.inject(OwnNotes).text('q:D1-001')).toBe('remember this');
    });

    it('saves the open text for the right place when the question changes or the page is left', async () => {
      type('for one');
      fixture.componentRef.setInput('target', 'D1-002');
      await fixture.whenStable();
      expect(area().value).toBe('');
      type('for two');
      fixture.destroy();
      const notes = TestBed.inject(OwnNotes);
      expect([notes.text('q:D1-001'), notes.text('q:D1-002')]).toEqual(['for one', 'for two']);
    });
  });

  describe('page', () => {
    let fixture: ComponentFixture<MyNotes>;
    const el = () => fixture.nativeElement as HTMLElement;
    const button = (text: string) => [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === text);

    beforeEach(async () => {
      const notes = TestBed.inject(OwnNotes);
      notes.save('q:D1-001', 'question note', 3);
      notes.save('s:2.3', 'section note', 2);
      notes.save('n:genai-how', 'skill note', 1);
      await TestBed.inject(QuestionBank).loadAll();
      fixture = TestBed.createComponent(MyNotes);
      await fixture.whenStable();
    });

    it('lists every note with a link to its place', () => {
      const links = [...el().querySelectorAll<HTMLAnchorElement>('article h2 a')].map((a) => a.getAttribute('href'));
      expect(links).toEqual(['/study?s=1.1&q=D1-001', '/study?s=2.3', '/notes?n=genai-how']);
      expect(el().querySelector('[role=status]')?.textContent).toContain('3 of 3');
    });

    it('filters by text and kind', async () => {
      const input = el().querySelector<HTMLInputElement>('input[type=search]');
      if (!input) return fail('no search');
      input.value = 'skill';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(el().querySelectorAll('article').length).toBe(1);
      input.value = '';
      input.dispatchEvent(new Event('input'));
      const select = el().querySelector('select') as HTMLSelectElement;
      select.value = 's';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(el().querySelector('article .text')?.textContent).toBe('section note');
    });

    it('keeps the order while a note is edited, even when it is empty for a moment', async () => {
      const titles = () => [...el().querySelectorAll('article .chip')].map((c) => c.textContent);
      const before = titles();
      el().querySelectorAll<HTMLButtonElement>('article button')[4].click();
      await fixture.whenStable();
      const area = el().querySelector('textarea') as HTMLTextAreaElement;
      area.value = '';
      area.dispatchEvent(new Event('input'));
      area.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      expect(titles()).toEqual(before);
      area.value = 'rewritten';
      area.dispatchEvent(new Event('input'));
      area.dispatchEvent(new Event('blur'));
      button('Done')?.click();
      await fixture.whenStable();
      expect(el().querySelector('article .text')?.textContent).toBe('rewritten');
    });

    it('asks before it deletes a note', async () => {
      button('Delete')?.click();
      await fixture.whenStable();
      expect(TestBed.inject(OwnNotes).count()).toBe(3);
      button('Yes, delete')?.click();
      await fixture.whenStable();
      expect(TestBed.inject(OwnNotes).count()).toBe(2);
    });

    it('switches to Roman Urdu', async () => {
      TestBed.inject(Language).set('ro');
      await fixture.whenStable();
      expect(el().querySelector('h1')?.textContent).toContain('Mere notes');
    });
  });

  describe('backup card', () => {
    const file = (text: string) => ({ files: [new File([text], 'b.json')], value: 'x' }) as unknown as HTMLInputElement;
    /** Makes the protected members reachable and stops the page from reloading. */
    type Card = { choose(i: HTMLInputElement): Promise<void>; load(m: 'merge' | 'replace'): void; undo(): void; reload(): void };

    it('shows what a file contains, loads it and can undo that', async () => {
      localStorage.setItem('ai901-notes', JSON.stringify(['fairness']));
      const fixture = TestBed.createComponent(BackupCard);
      const card = fixture.componentInstance as unknown as Card;
      const reload = spyOn(card, 'reload');
      await card.choose(file('{"app":"x"}'));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
      await card.choose(file(JSON.stringify({ app: 'ai901', version: 1, at: '2026-11-25T00:00:00.000Z', data: { 'ai901-notes': ['prompts'] } })));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
      expect(fixture.nativeElement.querySelector('.found')?.textContent).toContain('1 notes read');
      card.load('merge');
      expect(reload).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem('ai901-notes') ?? '[]')).toEqual(['fairness', 'prompts']);
      card.undo();
      expect(JSON.parse(localStorage.getItem('ai901-notes') ?? '[]')).toEqual(['fairness']);
    });
  });
});
