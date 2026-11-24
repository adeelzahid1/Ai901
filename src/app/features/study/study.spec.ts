import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuestionBank } from '../../data/question-bank';
import { StudyProgress } from '../../core/study-progress';
import { PAGE_SIZE, Study } from './study';

describe('Study', () => {
  let fixture: ComponentFixture<Study>;
  /** Number of bank questions per section, so the tests keep working as the bank grows. */
  let sectionSize: (id: string) => number;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));
  const cardsText = () => el().querySelector('app-flashcards')?.textContent?.replace(/\s+/g, ' ') ?? '';

  beforeEach(async () => {
    localStorage.removeItem('ai901-study-v1');
    await TestBed.configureTestingModule({
      imports: [Study],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    const bank = TestBed.inject(QuestionBank);
    await bank.loadAll();
    sectionSize = (id) => bank.countBySection().get(id) ?? 0;
    fixture = TestBed.createComponent(Study);
  });

  afterEach(() => localStorage.removeItem('ai901-study-v1'));

  it('shows the section from the query parameter and every section in the sidebar', async () => {
    fixture.componentRef.setInput('s', '2.3');
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('2.3 Chat client with the Foundry SDK');
    expect(el().querySelectorAll('.sidebar li').length).toBe(14);
    expect(el().querySelector('.sidebar a.active')?.textContent).toContain('2.3');
    expect(el().querySelectorAll('app-study-card').length).toBe(Math.min(PAGE_SIZE, sectionSize('2.3')));
  });

  it('loads more cards in pages', async () => {
    fixture.componentRef.setInput('s', '2.7');
    await fixture.whenStable();
    const total = sectionSize('2.7');
    const more = button('Load more');
    if (total > PAGE_SIZE) {
      expect(more).toBeDefined();
      more?.click();
      await fixture.whenStable();
      expect(el().querySelectorAll('app-study-card').length).toBe(Math.min(2 * PAGE_SIZE, total));
    } else {
      expect(more).toBeUndefined();
    }
  });

  it('shows and hides an answer and counts "I understand this" in the sidebar badge', async () => {
    fixture.componentRef.setInput('s', '1.1');
    await fixture.whenStable();
    const total = sectionSize('1.1');
    button('Show answer')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.answer')).not.toBeNull();
    expect(button('Hide answer')).toBeDefined();

    el().querySelector<HTMLInputElement>('.card-actions input[type=checkbox]')?.click();
    await fixture.whenStable();
    expect(el().querySelector('.sidebar a.active .badge')?.textContent?.trim()).toBe(`1/${total}`);

    const filter = el().querySelector<HTMLSelectElement>('select[formcontrolname=filter]');
    if (filter) {
      filter.value = 'not-understood';
      filter.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
    expect(el().querySelector('.list-head .muted')?.textContent).toContain(`of ${total - 1}`);
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
    const total = sectionSize('1.3');
    button('Flashcards')?.click();
    await fixture.whenStable();
    button(`Start flashcards (${total})`)?.click();
    await fixture.whenStable();
    expect(cardsText()).toContain(`${total} left in this round`);

    button('Show answer')?.click();
    await fixture.whenStable();
    expect(button('1 Again')?.textContent).toContain('10 min');
    expect(button('3 Good')?.textContent).toContain('1 day');
    button('1 Again')?.click();
    await fixture.whenStable();
    expect(cardsText()).toContain(`${total} left in this round · 1 again`);

    button('Show answer')?.click();
    await fixture.whenStable();
    button('3 Good')?.click();
    await fixture.whenStable();
    expect(cardsText()).toContain(`${total - 1} left in this round`);
    expect(Object.keys(TestBed.inject(StudyProgress).cards()).length).toBe(2);
  });

  it('runs flashcards from the keyboard', async () => {
    const press = async (key: string, target: EventTarget = document.body) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    document.body.appendChild(el());
    fixture.componentRef.setInput('s', '1.3');
    await fixture.whenStable();
    const total = sectionSize('1.3');
    button('Flashcards')?.click();
    await fixture.whenStable();
    button(`Start flashcards (${total})`)?.click();
    await fixture.whenStable();

    await press('3');
    expect(cardsText()).withContext('no rating before the answer').toContain(`${total} left in this round`);
    await press(' ');
    expect(button('3 Good')).toBeDefined();
    const search = el().querySelector<HTMLInputElement>('input[formcontrolname=search]');
    await press('3', search ?? document.body);
    expect(cardsText()).withContext('typing in the search box').toContain(`${total} left in this round`);
    await press('3');
    expect(cardsText()).toContain(`${total - 1} left in this round`);
    expect(button('Show answer')).toBeDefined();
  });
});
