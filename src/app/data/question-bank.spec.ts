import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QuestionBank } from './question-bank';
import { DOMAINS, SECTIONS, domainOf, sectionOf } from './schema';

describe('QuestionBank', () => {
  let bank: QuestionBank;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    bank = TestBed.inject(QuestionBank);
  });

  it('starts empty and not loaded', () => {
    expect(bank.questions().length).toBe(0);
    expect(bank.loaded()).toBeFalse();
  });

  it('loads one domain lazily and reuses the same request', async () => {
    const first = bank.loadDomain('D1');
    expect(bank.loadDomain('D1')).toBe(first);
    const list = await first;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((q) => domainOf(q) === 'D1')).toBeTrue();
    expect(bank.loaded()).toBeFalse();
  });

  it('loads every domain with unique ids that map to a study section', async () => {
    const all = await bank.loadAll();
    expect(bank.loaded()).toBeTrue();
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const q of all) {
      expect(sectionOf(q)).withContext(q.id).toBeDefined();
    }
    for (const d of DOMAINS) {
      expect(all.some((q) => domainOf(q) === d.id)).withContext(d.id).toBeTrue();
    }
  });

  it('counts questions for every study section', async () => {
    await bank.loadAll();
    const counts = bank.countBySection();
    expect(counts.size).toBe(SECTIONS.length);
    const sum = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(bank.questions().length);
  });
});
