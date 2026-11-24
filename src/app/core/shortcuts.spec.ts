import { Question } from '../data/schema';
import { Answer, emptyAnswer } from './grading';
import { answerForKey, choiceIndex, digitIndex, isPressable, isTyping, toggleChoice } from './shortcuts';
import { SAMPLE } from './testing';

/** Presses keys one after the other, keeping the answer when a key does nothing. */
const press = (q: Question, keys: string[], start: Answer = emptyAnswer(q)) =>
  keys.reduce((a, key) => answerForKey(q, a, key) ?? a, start);

describe('shortcuts', () => {
  it('maps digits and letters to positions', () => {
    expect(['1', '9', '0', 'a'].map(digitIndex)).toEqual([0, 8, null, null]);
    expect(['2', 'a', 'D', 'h', 'Enter'].map(choiceIndex)).toEqual([1, 0, 3, null, null]);
  });

  it('picks a single answer by number or letter and ignores keys past the last option', () => {
    expect(press(SAMPLE.mcq, ['3'])).toEqual({ type: 'mcq', choice: 2 });
    expect(press(SAMPLE.mcq, ['b'])).toEqual({ type: 'mcq', choice: 1 });
    expect(answerForKey(SAMPLE.mcq, emptyAnswer(SAMPLE.mcq), '5')).toBeNull();
  });

  it('toggles multi-select answers up to the limit', () => {
    expect(press(SAMPLE.multi, ['4', '1', '3'])).toEqual({ type: 'multi', choices: [0, 3] });
    expect(press(SAMPLE.multi, ['4', '1', '4', '3'])).toEqual({ type: 'multi', choices: [0, 2] });
    expect(toggleChoice([0, 1], 2, 2)).toEqual([0, 1]);
  });

  it('answers Yes/No statements from top to bottom and clears the last one', () => {
    expect(press(SAMPLE.yesno, ['1', 'n', 'y'])).toEqual({ type: 'yesno', values: [true, false, true] });
    expect(press(SAMPLE.yesno, ['h', '2', 'Backspace'])).toEqual({ type: 'yesno', values: [true, null, null] });
    expect(answerForKey(SAMPLE.yesno, { type: 'yesno', values: [true, true, true] }, '1')).toBeNull();
    expect(answerForKey(SAMPLE.yesno, emptyAnswer(SAMPLE.yesno), 'Backspace')).toBeNull();
  });

  it('adds order steps by their place in the remaining list and removes the last one', () => {
    expect(press(SAMPLE.order, ['3', '1', '1'])).toEqual({ type: 'order', seq: [2, 0, 1] });
    expect(press(SAMPLE.order, ['3', '1', 'Backspace'])).toEqual({ type: 'order', seq: [2] });
    expect(answerForKey(SAMPLE.order, { type: 'order', seq: [2, 0] }, '3')).toBeNull();
  });

  it('leaves drop-down and matching answers to their lists', () => {
    expect(answerForKey(SAMPLE.dropdown, emptyAnswer(SAMPLE.dropdown), '1')).toBeNull();
    expect(answerForKey(SAMPLE.match, emptyAnswer(SAMPLE.match), '1')).toBeNull();
  });

  it('knows which focused elements need the keys themselves', () => {
    const el = (html: string) => {
      const box = document.createElement('div');
      box.innerHTML = html;
      return box.firstElementChild;
    };
    expect(isTyping(el('<input type="search">'))).toBeTrue();
    expect(isTyping(el('<select></select>'))).toBeTrue();
    expect(isTyping(el('<input type="radio">'))).toBeFalse();
    expect(isTyping(document.body)).toBeFalse();
    expect(isPressable(el('<button>Go</button>'))).toBeTrue();
    expect(isPressable(el('<input type="radio">'))).toBeFalse();
  });
});
