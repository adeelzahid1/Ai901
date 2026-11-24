import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { emptyAnswer } from './grading';
import { ProgressService } from './progress';
import { buildReport } from './report';
import { StudyProgress } from './study-progress';
import { SAMPLE } from './testing';

describe('ProgressService', () => {
  beforeEach(() => {
    localStorage.removeItem('ai901-study-v1');
    localStorage.removeItem('ai901-progress');
    localStorage.removeItem('ai901-history');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    localStorage.removeItem('ai901-study-v1');
    localStorage.removeItem('ai901-progress');
    localStorage.removeItem('ai901-history');
  });

  it('records attempts, accuracy and open mistakes', () => {
    const p = TestBed.inject(ProgressService);
    p.record('D1-001', false);
    p.record('D1-001', true);
    p.record('D1-002', false);
    expect(p.stats()['D1-001']).toEqual(jasmine.objectContaining({ a: 2, c: 1, last: 1 }));
    expect([...p.mistakeIds()]).toEqual(['D1-002']);
    expect(p.totals()).toEqual({ attempts: 3, correct: 1, accuracy: 33 });
  });

  it('keeps the result of the first attempt unless the answer was shown before', () => {
    const p = TestBed.inject(ProgressService);
    TestBed.inject(StudyProgress).markPeeked(['D1-003']);
    p.record('D1-001', false);
    p.record('D1-001', true);
    p.record('D1-003', true);
    expect(p.stats()['D1-001'].f).toBe(0);
    expect(p.stats()['D1-003'].f).toBeNull();
  });

  it('saves to localStorage under the exam prefix and loads it again', () => {
    TestBed.inject(ProgressService).record('D2-005', true);
    expect(JSON.parse(localStorage.getItem('ai901-progress') ?? '{}')['D2-005'].c).toBe(1);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(ProgressService).answeredIds().has('D2-005')).toBeTrue();
  });

  it('keeps exam history newest first and can reset everything', () => {
    const p = TestBed.inject(ProgressService);
    const report = buildReport('exam', 'Exam', 0, [{ prepared: { q: SAMPLE.mcq, optOrder: null }, answer: emptyAnswer(SAMPLE.mcq), marked: false }], 120000);
    p.addToHistory(report);
    p.addToHistory({ ...report, finishedAt: 240000 });
    expect(p.history().map((h) => h.at)).toEqual([240000, 120000]);
    p.reset();
    expect(p.history()).toEqual([]);
    expect(localStorage.getItem('ai901-progress')).toBeNull();
  });
});
