import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuestionBank } from '../../data/question-bank';
import { StudyProgress } from '../../core/study-progress';
import { Study } from './study';

describe('Study', () => {
  let fixture: ComponentFixture<Study>;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));

  beforeEach(async () => {
    localStorage.removeItem('ai901-study-v1');
    await TestBed.configureTestingModule({
      imports: [Study],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    await TestBed.inject(QuestionBank).loadAll();
    fixture = TestBed.createComponent(Study);
  });

  afterEach(() => localStorage.removeItem('ai901-study-v1'));

  it('shows the section from the query parameter and every section in the sidebar', async () => {
    fixture.componentRef.setInput('s', '2.3');
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('2.3 Chat client with the Foundry SDK');
    expect(el().querySelectorAll('.sidebar li').length).toBe(14);
    expect(el().querySelector('.sidebar a.active')?.textContent).toContain('2.3');
    expect(el().querySelectorAll('app-study-card').length).toBe(10);
  });

  it('shows and hides an answer and counts "I understand this" in the sidebar badge', async () => {
    fixture.componentRef.setInput('s', '1.1');
    await fixture.whenStable();
    button('Show answer')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.answer')).not.toBeNull();
    expect(button('Hide answer')).toBeDefined();

    el().querySelector<HTMLInputElement>('.card-actions input[type=checkbox]')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.sidebar a.active .badge')?.textContent?.trim()).toBe('1/10');

    const notUnderstood = el().querySelector<HTMLSelectElement>('select[formcontrolname=filter]');
    if (notUnderstood) {
      notUnderstood.value = 'not-understood';
      notUnderstood.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
    expect(el().querySelectorAll('app-study-card').length).toBe(9);
  });

  it('bookmarks a question', async () => {
    fixture.componentRef.setInput('s', '1.2');
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('.star')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(StudyProgress).bookmarked().size).toBe(1);
    expect(el().querySelector('.star.on')).not.toBeNull();
  });

  it('runs a flashcard round where Again sends the card to the end', async () => {
    fixture.componentRef.setInput('s', '1.3');
    await fixture.whenStable();
    button('Flashcards')?.click();
    await fixture.whenStable();
    button('Start flashcards (10)')?.click();
    await fixture.whenStable();
    expect(el().querySelector('app-flashcards')?.textContent).toContain('10 left in this round');

    button('Show answer')?.click();
    await fixture.whenStable();
    expect(button('Again')?.textContent).toContain('10 min');
    expect(button('Good')?.textContent).toContain('1 day');
    button('Again')?.click();
    await fixture.whenStable();
    expect(el().querySelector('app-flashcards')?.textContent).toContain('10 left in this round · 1 again');

    button('Show answer')?.click();
    await fixture.whenStable();
    button('Good')?.click();
    await fixture.whenStable();
    expect(el().querySelector('app-flashcards')?.textContent).toContain('9 left in this round');
    expect(Object.keys(TestBed.inject(StudyProgress).cards()).length).toBe(2);
  });
});
