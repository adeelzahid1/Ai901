import { AGAIN_DELAY, CardState, DAY, intervalLabel, isDue, isReviewDue, nextInterval, schedule } from './srs';

describe('srs', () => {
  const now = 1_000_000;
  const card = (ivl: number): CardState => ({ ivl, due: now, reps: 1, lapses: 0 });

  it('Good goes 1 -> 3 -> round(ivl x 2.5) days', () => {
    let s = schedule(undefined, 'good', now);
    expect(s.ivl).toBe(1);
    expect(s.due).toBe(now + DAY);
    s = schedule(s, 'good', now);
    expect(s.ivl).toBe(3);
    s = schedule(s, 'good', now);
    expect(s.ivl).toBe(8);
    s = schedule(s, 'good', now);
    expect(s.ivl).toBe(20);
    expect(s.reps).toBe(4);
  });

  it('Hard is max(1, round(ivl x 1.2)) days', () => {
    expect(nextInterval(undefined, 'hard')).toBe(1);
    expect(nextInterval(card(1), 'hard')).toBe(1);
    expect(nextInterval(card(3), 'hard')).toBe(4);
    expect(nextInterval(card(10), 'hard')).toBe(12);
  });

  it('Again is due in 10 minutes, resets the interval and counts a lapse for known cards', () => {
    const s = schedule(card(8), 'again', now);
    expect(s.due).toBe(now + AGAIN_DELAY);
    expect(s.ivl).toBe(0);
    expect(s.lapses).toBe(1);
    expect(schedule(undefined, 'again', now).lapses).toBe(0);
    expect(schedule(s, 'good', now).ivl).toBe(1);
  });

  it('labels each button with its interval', () => {
    expect(intervalLabel(undefined, 'again')).toBe('10 min');
    expect(intervalLabel(undefined, 'good')).toBe('1 day');
    expect(intervalLabel(card(1), 'good')).toBe('3 days');
    expect(intervalLabel(card(3), 'hard')).toBe('4 days');
  });

  it('treats new cards as due but only studied cards as due for review', () => {
    expect(isDue(undefined, now)).toBeTrue();
    expect(isReviewDue(undefined, now)).toBeFalse();
    expect(isReviewDue({ ...card(1), due: now - 1 }, now)).toBeTrue();
    expect(isDue({ ...card(1), due: now + 1 }, now)).toBeFalse();
  });
});
