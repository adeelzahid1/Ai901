import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressService } from '../../core/progress';
import { QuizReport } from '../../core/report';
import { SAMPLE } from '../../core/testing';
import { QuizRunner } from './quiz-runner';

describe('QuizRunner', () => {
  let fixture: ComponentFixture<QuizRunner>;
  let reports: QuizReport[];

  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));

  beforeEach(async () => {
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
});
