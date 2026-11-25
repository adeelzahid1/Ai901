import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Language } from '../../core/language';
import { LessonProgress } from '../../core/lesson-progress';
import { loadLabs } from '../../data/labs';
import { Lesson, LessonText, loadLesson } from '../../data/lessons';
import { QuestionBank } from '../../data/question-bank';
import { SECTIONS, sectionOf } from '../../data/schema';
import { LessonView } from './lesson-view';

const KEYS = ['ai901-lessons', 'ai901-lang', 'ai901-progress'];

describe('Lessons', () => {
  let bank: QuestionBank;

  beforeEach(async () => {
    KEYS.forEach((key) => localStorage.removeItem(key));
    await TestBed.configureTestingModule({
      imports: [LessonView],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    bank = TestBed.inject(QuestionBank);
    await bank.loadAll();
  });

  afterEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));

  const texts = (l: Lesson): LessonText[] => [
    l.intro,
    ...l.concepts.flatMap((c) => [c.term, c.text]),
    l.example.title,
    l.example.text,
    l.table.title,
    ...l.table.head,
    ...l.table.rows.flat(),
    ...l.remember,
    ...l.traps,
  ];

  it('covers every section with complete text in both languages', async () => {
    const labs = new Set((await loadLabs()).map((lab) => lab.id));
    for (const s of SECTIONS) {
      const lesson = await loadLesson(s.id);
      if (!lesson) {
        fail(`no lesson for ${s.id}`);
        continue;
      }
      expect(lesson.id).toBe(s.id);
      expect(lesson.concepts.length).withContext(s.id).toBeGreaterThanOrEqual(6);
      expect(lesson.remember.length).withContext(s.id).toBeGreaterThanOrEqual(3);
      expect(lesson.traps.length).withContext(s.id).toBeGreaterThanOrEqual(2);
      expect(lesson.table.rows.every((r) => r.length === lesson.table.head.length)).withContext(s.id).toBeTrue();
      expect(lesson.ref).withContext(s.id).toMatch(/^https:\/\/learn\.microsoft\.com\/en-us\//);
      if (lesson.lab) expect(labs.has(lesson.lab)).withContext(lesson.lab).toBeTrue();
      for (const t of texts(lesson)) {
        expect(typeof t === 'string' ? t : t.en && t.ro).withContext(`${s.id}: ${JSON.stringify(t)}`).toBeTruthy();
      }
      for (const t of [lesson.intro, lesson.example.text, ...lesson.concepts.map((c) => c.text), ...lesson.remember, ...lesson.traps]) {
        expect(typeof t).withContext(`${s.id}: ${JSON.stringify(t)}`).toBe('object');
      }
    }
  });

  it('checks each lesson with five study questions of its own section', async () => {
    const study = new Map(bank.studyQuestions().map((q) => [q.id, q]));
    for (const s of SECTIONS) {
      const ids = (await loadLesson(s.id))?.check ?? [];
      expect(new Set(ids).size).withContext(s.id).toBe(5);
      for (const id of ids) {
        const q = study.get(id);
        expect(q && sectionOf(q)?.id).withContext(id).toBe(s.id);
      }
    }
  });

  describe('view', () => {
    let fixture: ComponentFixture<LessonView>;
    const el = () => fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));

    beforeEach(async () => {
      fixture = TestBed.createComponent(LessonView);
      fixture.componentRef.setInput('section', SECTIONS[0]);
      await fixture.whenStable();
    });

    it('shows the lesson and switches it to Roman Urdu', async () => {
      expect(el().querySelectorAll('dt').length).toBe(6);
      expect(el().querySelector('table')?.textContent).toContain('Accountability');
      expect(el().textContent).toContain('Exam traps');
      TestBed.inject(Language).set('ro');
      await fixture.whenStable();
      expect(el().textContent).toContain('Exam ke dhokay');
      expect(el().textContent).toContain('Fairness (insaaf)');
    });

    it('remembers a read lesson and offers the next one', async () => {
      const opened: string[] = [];
      fixture.componentInstance.goTo.subscribe((id) => opened.push(id));
      el().querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
      await fixture.whenStable();
      expect(TestBed.inject(LessonProgress).readCount()).toBe(1);
      expect(JSON.parse(localStorage.getItem('ai901-lessons') ?? '{}')).toEqual({ '1.1': { read: true } });
      button('Next: 1.2')?.click();
      expect(opened).toEqual(['1.2']);
    });

    it('runs the five check questions and saves the result', async () => {
      button('Start the check')?.click();
      await fixture.whenStable();
      expect(el().querySelector('app-quiz-runner')?.textContent).toContain('of 5');
      button('End practice')?.click();
      await fixture.whenStable();
      el().querySelector<HTMLButtonElement>('.confirm .btn.primary')?.click();
      await fixture.whenStable();
      expect(el().querySelector('[role=status]')?.textContent).toContain('0 of 5 correct.');
      expect(TestBed.inject(LessonProgress).best('1.1')).toBe(0);
      expect(TestBed.inject(LessonProgress).isRead('1.1')).toBeFalse();
    });

    it('marks the lesson as read when every check answer is correct', () => {
      const progress = TestBed.inject(LessonProgress);
      progress.recordCheck('1.2', 5, 5);
      progress.recordCheck('1.2', 3, 5);
      expect(progress.best('1.2')).toBe(5);
      expect(progress.isRead('1.2')).toBeTrue();
    });
  });
});
