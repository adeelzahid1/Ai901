import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NOTE_TITLES } from '../data/notes';
import { QuestionBank } from '../data/question-bank';
import { Question } from '../data/schema';
import { QuestionStat } from './progress';
import { createRng } from './rng';
import { SKILL_CHECK, pickForSkill } from './skill-check';

const stat = (last: 0 | 1): QuestionStat => ({ a: 1, c: last, last, t: 1, f: last });

describe('pickForSkill', () => {
  let study: readonly Question[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const bank = TestBed.inject(QuestionBank);
    await bank.loadAll();
    study = bank.studyQuestions();
  });

  it('finds three different study questions for every skill', () => {
    for (const skill of Object.keys(NOTE_TITLES)) {
      const picked = pickForSkill(study, skill, {}, createRng(1));
      expect(new Set(picked.map((q) => q.id)).size).withContext(skill).toBe(SKILL_CHECK);
      expect(picked.every((q) => q.sub === skill)).withContext(skill).toBeTrue();
    }
  });

  it('takes new questions first, then mistakes, then the rest', () => {
    const all = study.filter((q) => q.sub === 'prompts');
    const [fresh, wrong] = [all[0], all[1]];
    const stats = Object.fromEntries(all.slice(2).map((q) => [q.id, stat(1)]));
    stats[wrong.id] = stat(0);
    const picked = pickForSkill(study, 'prompts', stats, createRng(2));
    expect(picked.slice(0, 2).map((q) => q.id)).toEqual([fresh.id, wrong.id]);
    expect(stats[picked[2].id].last).toBe(1);
  });
});
