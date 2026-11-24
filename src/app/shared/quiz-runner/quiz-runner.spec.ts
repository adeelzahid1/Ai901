import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { ShortcutSettings } from '../../core/shortcut-settings';
import { SAMPLE } from '../../core/testing';
import { QuizRunner } from './quiz-runner';

describe('QuizRunner', () => {
  let fixture: ComponentFixture<QuizRunner>;
  let reports: QuizReport[];

  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));

  const press = async (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(e);
    await fixture.whenStable();
    return e;
  };

  beforeEach(async () => {
    localStorage.removeItem('ai901-keys');
    localStorage.removeItem('ai901-progress');
    localStorage.removeItem('ai901-history');
    await TestBed.configureTestingModule({
      imports: [QuizRunner],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizRunner);
    reports = [];
    fixture.componentInstance.finished.subscribe((r) => reports.push(r));
  });

  afterEach(() => {
    localStorage.removeItem('ai901-keys');
    localStorage.removeItem('ai901-progress');
    localStorage.removeItem('ai901-history');
  });

  it('checks an answer in practice mode and records progress', async () => {
    fixture.componentRef.setInput('questions', [SAMPLE.mcq, SAMPLE.multi]);
    fixture.componentRef.setInput('mode', 'practice');
    fixture.componentRef.setInput('feedback', 'instant');
    await fixture.whenStable();

    expect(button('Check answer')?.disabled).toBeTrue();
    el().querySelector<HTMLInputElement>('input[type=radio]')?.click();
    await fixture.whenStable();
    button('Check answer')?.click();
    await fixture.whenStable();

    expect(el().querySelector('.feedback')).not.toBeNull();
    expect(TestBed.inject(ProgressService).answeredIds().has(SAMPLE.mcq.id)).toBeTrue();
  });

  it('hides answers in exam mode, asks before submitting unanswered questions and emits a report', async () => {
    fixture.componentRef.setInput('questions', [SAMPLE.mcq, SAMPLE.yesno, SAMPLE.match]);
    fixture.componentRef.setInput('mode', 'exam');
    fixture.componentRef.setInput('title', 'Exam');
    fixture.componentRef.setInput('timeLimitSec', 2700);
    await fixture.whenStable();

    expect(button('Check answer')).toBeUndefined();
    expect(el().querySelector('.clock')?.textContent).toContain('45:00');
    expect(el().querySelectorAll('.grid-nav .cell').length).toBe(3);

    button('☆ Mark for review')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.cell.marked')).not.toBeNull();

    button('Submit')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.confirm')?.textContent).toContain('3 unanswered');
    expect(reports.length).toBe(0);

    el().querySelector<HTMLButtonElement>('.confirm .btn.primary')?.click();
    await fixture.whenStable();
    expect(reports.length).toBe(1);
    expect(reports[0].total).toBe(3);
    expect(reports[0].score).toBe(0);
    expect(TestBed.inject(ProgressService).history().length).toBe(1);
  });

  it('moves between questions with the navigator', async () => {
    fixture.componentRef.setInput('questions', [SAMPLE.mcq, SAMPLE.yesno, SAMPLE.match]);
    fixture.componentRef.setInput('mode', 'mock');
    await fixture.whenStable();
    el().querySelectorAll<HTMLButtonElement>('.grid-nav .cell')[2].click();
    await fixture.whenStable();
    expect(el().querySelector('.bar')?.textContent).toContain('Question 3 of 3');
    expect(el().querySelectorAll('.match-row').length).toBe(2);
  });

  it('answers, checks and moves on from the keyboard in practice mode', async () => {
    fixture.componentRef.setInput('questions', [SAMPLE.mcq, SAMPLE.yesno]);
    fixture.componentRef.setInput('mode', 'practice');
    fixture.componentRef.setInput('feedback', 'instant');
    await fixture.whenStable();

    await press('Enter');
    expect(el().querySelector('.feedback')).withContext('nothing to check yet').toBeNull();
    await press('b');
    expect(el().querySelectorAll<HTMLInputElement>('input[type=radio]')[1].checked).toBeTrue();
    await press('1', { ctrlKey: true });
    expect(el().querySelectorAll<HTMLInputElement>('input[type=radio]')[1].checked).withContext('Ctrl+1').toBeTrue();
    await press('Enter');
    expect(el().querySelector('.feedback')).not.toBeNull();
    await press('Enter', { repeat: true });
    expect(el().querySelector('.bar')?.textContent).withContext('held key').toContain('Question 1 of 2');
    await press('Enter');
    expect(el().querySelector('.bar')?.textContent).toContain('Question 2 of 2');
    for (const key of ['1', '2', '1', 'Enter']) await press(key);
    expect(el().querySelector('.feedback.ok')).not.toBeNull();
  });

  it('moves, marks and never submits with Enter in exam mode', async () => {
    document.body.appendChild(el());
    fixture.componentRef.setInput('questions', [SAMPLE.mcq, SAMPLE.match]);
    fixture.componentRef.setInput('mode', 'exam');
    await fixture.whenStable();

    await press('m');
    expect(el().querySelector('.cell.marked')).not.toBeNull();
    await press('ArrowRight');
    expect(el().querySelector('.bar')?.textContent).toContain('Question 2 of 2');
    await press('2');
    const lists = el().querySelectorAll('select');
    expect(document.activeElement).toBe(lists[1]);
    await press('ArrowLeft', {}, lists[1]);
    expect(el().querySelector('.bar')?.textContent).withContext('arrows belong to the list').toContain('Question 2 of 2');
    await press('Escape', {}, lists[1]);
    expect(document.activeElement).toBe(document.body);

    await press('Enter');
    expect(document.activeElement).toBe(button('Submit') ?? null);
    expect(reports.length).toBe(0);
    button('Submit')?.click();
    await fixture.whenStable();
    await press('1');
    await press('Enter');
    expect(reports.length).withContext('the dialog ignores shortcuts').toBe(0);
    await press('Escape');
    expect(el().querySelector('.confirm')).toBeNull();
    await press('ArrowLeft');
    expect(el().querySelector('.bar')?.textContent).toContain('Question 1 of 2');
  });

  it('lists the shortcuts with ? and ignores keys when they are turned off', async () => {
    fixture.componentRef.setInput('questions', [SAMPLE.order, SAMPLE.mcq]);
    fixture.componentRef.setInput('mode', 'mock');
    await fixture.whenStable();
    const help = () => el().querySelector<HTMLDetailsElement>('app-shortcut-help details');

    expect(help()?.open).toBeFalse();
    await press('?');
    expect(help()?.open).toBeTrue();
    expect(help()?.textContent).toContain('Add that action');

    help()?.querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(ShortcutSettings).enabled()).toBeFalse();
    expect(localStorage.getItem('ai901-keys')).toBe('false');
    await press('ArrowRight');
    expect(el().querySelector('.bar')?.textContent).toContain('Question 1 of 2');
  });
});
