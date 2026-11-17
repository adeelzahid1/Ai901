import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { matchesSearch } from './search';
import { DAY } from './srs';
import { StudyProgress } from './study-progress';
import { SAMPLE } from './testing';

describe('StudyProgress', () => {
  beforeEach(() => {
    localStorage.removeItem('ai901-study-v1');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => localStorage.removeItem('ai901-study-v1'));

  it('toggles understood and bookmarks and saves them', () => {
    const s = TestBed.inject(StudyProgress);
    s.toggleUnderstood('D1-001');
    s.toggleBookmark('D1-002');
    s.toggleBookmark('D1-003');
    s.toggleBookmark('D1-003');
    expect([...s.understood()]).toEqual(['D1-001']);
    expect([...s.bookmarked()]).toEqual(['D1-002']);
    const saved = JSON.parse(localStorage.getItem('ai901-study-v1') ?? '{}');
    expect(saved.understood).toEqual(['D1-001']);
  });

  it('schedules flashcards and reports which are due', () => {
    const s = TestBed.inject(StudyProgress);
    const now = Date.now();
    s.grade('D1-001', 'good', now);
    s.grade('D1-002', 'again', now);
    expect(s.dueIds(now).size).toBe(0);
    expect([...s.dueIds(now + 11 * 60_000)]).toEqual(['D1-002']);
    expect(s.dueIds(now + DAY + 1).size).toBe(2);
  });

  it('loads the saved state in a new session', () => {
    TestBed.inject(StudyProgress).toggleUnderstood('D2-010');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(StudyProgress).understood().has('D2-010')).toBeTrue();
  });
});

describe('matchesSearch', () => {
  it('matches every word anywhere in the question, ignoring case', () => {
    expect(matchesSearch(SAMPLE.match, 't1 y')).toBeTrue();
    expect(matchesSearch(SAMPLE.mcq, 'question d1-901')).toBeTrue();
    expect(matchesSearch(SAMPLE.mcq, 'question missing')).toBeFalse();
    expect(matchesSearch(SAMPLE.mcq, '   ')).toBeTrue();
  });
});
