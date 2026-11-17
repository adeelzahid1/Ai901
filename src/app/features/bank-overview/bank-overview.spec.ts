import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QuestionBank } from '../../data/question-bank';
import { SECTIONS } from '../../data/schema';
import { BankOverview } from './bank-overview';

describe('BankOverview', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankOverview],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('shows a row for every study section with its question count', async () => {
    const fixture = TestBed.createComponent(BankOverview);
    await TestBed.inject(QuestionBank).loadAll();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(SECTIONS.length);
    expect(el.querySelector('.total')?.textContent).toMatch(/Question bank:\s*\d+ of \d+ planned/);
    expect(el.querySelector('.total')?.textContent).not.toContain('loading');
  });
});
