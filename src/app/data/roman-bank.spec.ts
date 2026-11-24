import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Language } from '../core/language';
import { QuestionBank } from './question-bank';
import { RomanBank } from './roman-bank';

describe('RomanBank', () => {
  beforeEach(() => {
    localStorage.removeItem('ai901-lang');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });
  afterEach(() => localStorage.removeItem('ai901-lang'));

  it('shows English until Roman Urdu is on and then the translated text', async () => {
    const language = TestBed.inject(Language);
    const roman = TestBed.inject(RomanBank);
    const [q] = await TestBed.inject(QuestionBank).loadDomain('D1');
    await roman.load();
    expect(roman.localize(q)).toBe(q);
    expect(roman.missing(q)).toBeFalse();

    language.set('ro');
    const ro = roman.localize(q);
    expect(ro.id).toBe('D1-001');
    expect(ro.q).not.toBe(q.q);
    expect(ro.exp).toContain('Fairness');
    expect(ro.ref).toBe(q.ref);
    expect(roman.missing(q)).toBeFalse();
  });

  it('keeps a question in English and reports it when it has no translation', async () => {
    TestBed.inject(Language).set('ro');
    const roman = TestBed.inject(RomanBank);
    await roman.load();
    const [q] = await TestBed.inject(QuestionBank).loadDomain('D1');
    const unknown = { ...q, id: 'D1-9999' };
    expect(roman.localize(unknown)).toBe(unknown);
    expect(roman.missing(unknown)).toBeTrue();
  });
});
