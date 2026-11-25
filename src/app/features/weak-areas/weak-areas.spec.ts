import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProgressService } from '../../core/progress';
import { NOTE_TITLES } from '../../data/notes';
import { QuestionBank } from '../../data/question-bank';
import { WeakAreas } from './weak-areas';

const KEYS = ['ai901-progress', 'ai901-history', 'ai901-lang'];

describe('WeakAreas', () => {
  beforeEach(() => {
    KEYS.forEach((k) => localStorage.removeItem(k));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
  });
  afterEach(() => KEYS.forEach((k) => localStorage.removeItem(k)));

  it('links every skill to its note and every section to its lesson', async () => {
    const bank = TestBed.inject(QuestionBank);
    await bank.loadAll();
    const progress = TestBed.inject(ProgressService);
    const wrong = bank.studyQuestions().filter((q) => q.sub === 'prompts');
    wrong.slice(0, 3).forEach((q) => progress.record(q.id, false));
    const fixture = TestBed.createComponent(WeakAreas);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const skill of Object.keys(NOTE_TITLES)) expect(hrefs).toContain(`/notes?n=${skill}`);
    expect(el.querySelector('.focus')?.textContent).toContain('2.1');
    expect([...el.querySelectorAll('.focus a')].map((a) => a.getAttribute('href'))).toEqual(['/study?s=2.1&m=lesson', '/practice?section=2.1']);
    // The weakest skill comes first.
    expect(el.querySelector('section:last-of-type tbody a')?.getAttribute('href')).toBe('/notes?n=prompts');
  });
});
