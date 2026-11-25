import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Language } from '../../core/language';
import data from '../../data/exam-day.json';
import { ExamDay } from './exam-day';

describe('ExamDay', () => {
  let fixture: ComponentFixture<ExamDay>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('ai901-exam-day');
    localStorage.removeItem('ai901-lang');
    await TestBed.configureTestingModule({
      imports: [ExamDay],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ExamDay);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('ai901-exam-day');
    localStorage.removeItem('ai901-lang');
  });

  it('has every text in both languages and only official links', () => {
    const texts = [
      ...data.facts.map((f) => f.label),
      ...data.checklists.flatMap((c) => [c.title, ...c.items]),
      ...data.sections.flatMap((s) => [s.title, ...s.items]),
      ...data.links.map((l) => l.label),
    ];
    expect(texts.every((t) => t.en && t.ro)).toBeTrue();
    expect(data.links.every((l) => /^https:\/\/(learn\.microsoft\.com\/en-us|aka\.ms)\//.test(l.url))).toBeTrue();
  });

  it('shows the facts and remembers ticked checklist items', async () => {
    expect(el().textContent).toContain('700 / 1000');
    const boxes = el().querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(boxes.length).toBe(16);
    boxes[0].click();
    boxes[5].click();
    boxes[0].click();
    await fixture.whenStable();
    expect(JSON.parse(localStorage.getItem('ai901-exam-day') ?? '[]')).toEqual(['week-1']);
    expect(el().querySelector('.chip')?.textContent).toContain('1 of 16');
  });

  it('switches to Roman Urdu', async () => {
    TestBed.inject(Language).set('ro');
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('Exam ka din');
    expect(el().textContent).toContain('Aakhri hafta');
  });
});
