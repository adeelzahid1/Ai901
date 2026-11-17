import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Answer, emptyAnswer } from '../../core/grading';
import { SAMPLE } from '../../core/testing';
import { Question } from '../../data/schema';
import { QuestionView } from './question-view';

describe('QuestionView', () => {
  let fixture: ComponentFixture<QuestionView>;
  let emitted: Answer[];

  async function render(q: Question, answer: Answer = emptyAnswer(q), revealed = false): Promise<HTMLElement> {
    fixture.componentRef.setInput('question', q);
    fixture.componentRef.setInput('answer', answer);
    fixture.componentRef.setInput('revealed', revealed);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionView],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(QuestionView);
    emitted = [];
    fixture.componentInstance.answerChange.subscribe((a) => emitted.push(a));
  });

  it('renders an input for every type', async () => {
    const expected: Record<Question['type'], [string, number]> = {
      mcq: ['input[type=radio]', 4],
      multi: ['input[type=checkbox]', 5],
      yesno: ['input[type=radio]', 6],
      dropdown: ['select', 2],
      match: ['select', 2],
      order: ['button', 4],
    };
    for (const [type, [selector, count]] of Object.entries(expected)) {
      const el = await render(SAMPLE[type as Question['type']]);
      expect(el.querySelectorAll(selector).length).withContext(type).toBe(count);
    }
  });

  it('emits the picked option for a single-answer question', async () => {
    const el = await render(SAMPLE.mcq);
    (el.querySelectorAll('input[type=radio]')[1] as HTMLInputElement).click();
    expect(emitted).toEqual([{ type: 'mcq', choice: 1 }]);
  });

  it('limits multi-select to the number of answers', async () => {
    const el = await render(SAMPLE.multi, { type: 'multi', choices: [0, 1] });
    const boxes = el.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(boxes[2].disabled).toBeTrue();
    expect(boxes[0].disabled).toBeFalse();
    expect(el.textContent).toContain('Select 2');
  });

  it('builds an ordered list with the Add buttons', async () => {
    const el = await render(SAMPLE.order);
    (el.querySelector('.order button') as HTMLButtonElement).click();
    expect(emitted).toEqual([{ type: 'order', seq: [0] }]);
  });

  it('shows the verdict, both answers, the explanation and the Learn link after reveal', async () => {
    const el = await render(SAMPLE.mcq, { type: 'mcq', choice: 0 }, true);
    expect(el.querySelector('.verdict')?.textContent).toContain('Incorrect');
    expect(el.textContent).toContain('Correct answer');
    expect(el.textContent).toContain('Your answer');
    expect(el.textContent).toContain('Why this is the answer');
    expect(el.querySelector<HTMLAnchorElement>('.feedback a')?.href).toContain('learn.microsoft.com');
    expect(el.querySelector('.right')?.textContent).toContain('C');
    expect(el.querySelectorAll<HTMLInputElement>('input:disabled').length).toBe(4);
  });

  it('reports partial credit', async () => {
    const el = await render(SAMPLE.dropdown, { type: 'dropdown', picks: [1, 0] }, true);
    expect(el.querySelector('.verdict')?.textContent).toContain('Partly correct (50%)');
  });
});
