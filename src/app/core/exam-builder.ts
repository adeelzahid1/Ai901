import {
  DOMAINS,
  Difficulty,
  DomainId,
  Question,
  QuestionType,
  SECTIONS,
  domainOf,
  sectionOf,
  weightMid,
} from '../data/schema';
import { Rng, shuffle } from './rng';

export type TypeMix = Partial<Record<QuestionType, number>>;
export type DiffMix = Partial<Record<Difficulty, number>>;

export interface PickOptions {
  count: number;
  rng: Rng;
  /** Section ids to draw from; all sections when empty or missing. */
  sections?: readonly string[];
  types?: readonly QuestionType[];
  diffs?: readonly Difficulty[];
  /** Only questions whose id passes this test, e.g. "not answered yet" or "mistakes". */
  include?: (q: Question) => boolean;
  /** Minimum per section when the count allows it. */
  minPerSection?: number;
  /** Preferred share of each type and difficulty (soft targets). */
  typeMix?: TypeMix;
  diffMix?: DiffMix;
}

/** Real-exam style mix used by the Exam tab. */
export const EXAM_TYPE_MIX: TypeMix = { mcq: 0.5, multi: 0.15, yesno: 0.12, dropdown: 0.13, match: 0.06, order: 0.04 };
export const EXAM_DIFF_MIX: DiffMix = { 1: 0.35, 2: 0.45, 3: 0.2 };

/** Questions that pass the filters in `opts`, without the count limit. */
export function filterPool(pool: readonly Question[], opts: Omit<PickOptions, 'count' | 'rng'>): Question[] {
  const sections = opts.sections?.length ? new Set(opts.sections) : null;
  const types = opts.types?.length ? new Set(opts.types) : null;
  const diffs = opts.diffs?.length ? new Set(opts.diffs) : null;
  return pool.filter((q) => {
    const s = sectionOf(q);
    if (!s) return false;
    if (sections && !sections.has(s.id)) return false;
    if (types && !types.has(q.type)) return false;
    if (diffs && !diffs.has(q.diff)) return false;
    return opts.include ? opts.include(q) : true;
  });
}

/**
 * Splits `total` across buckets in proportion to `weights` without going over each bucket's `cap`
 * (largest-remainder method; spare seats move to buckets that still have room).
 */
export function allocate(total: number, weights: readonly number[], caps: readonly number[]): number[] {
  const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
  const out = weights.map(() => 0);
  let left = Math.min(Math.max(0, total), sum(caps));
  while (left > 0) {
    const open = weights.map((_, i) => i).filter((i) => out[i] < caps[i]);
    const positive = open.map((i) => Math.max(0, weights[i]));
    // When no open bucket has weight left, share equally.
    const eff = sum(positive) > 0 ? positive : open.map(() => 1);
    const effSum = sum(eff);
    const exact = open.map((_, k) => (left * eff[k]) / effSum);
    let given = 0;
    open.forEach((i, k) => {
      const add = Math.min(Math.floor(exact[k]), caps[i] - out[i]);
      out[i] += add;
      given += add;
    });
    const byRemainder = open
      .map((i, k) => ({ i, rest: exact[k] - Math.floor(exact[k]) }))
      .filter(({ i, rest }) => rest > 0 && out[i] < caps[i])
      .sort((a, b) => b.rest - a.rest);
    for (const { i } of byRemainder) {
      if (given >= left) break;
      out[i] += 1;
      given += 1;
    }
    if (given === 0) break;
    left -= given;
  }
  return out;
}

/**
 * Picks `count` questions: domains by the middle of their official weight, sections by their
 * planned size with a minimum per section, then types and difficulty as close to the mix as
 * the pool allows. The result is shuffled.
 */
export function pickQuestions(pool: readonly Question[], opts: PickOptions): Question[] {
  const candidates = filterPool(pool, opts);
  const rng = opts.rng;
  const bySection = new Map<string, Question[]>();
  for (const q of shuffle(candidates, rng)) {
    const id = sectionOf(q)?.id ?? '';
    bySection.set(id, [...(bySection.get(id) ?? []), q]);
  }

  // 1. Domain quotas.
  const domains = DOMAINS.filter((d) => SECTIONS.some((s) => s.domain === d.id && bySection.has(s.id)));
  const domainCaps = domains.map((d) => candidates.filter((q) => domainOf(q) === d.id).length);
  const domainQuota = allocate(opts.count, domains.map(weightMid), domainCaps);

  // 2. Section quotas inside each domain.
  const sectionQuota = new Map<string, number>();
  domains.forEach((d, di) => {
    const secs = SECTIONS.filter((s) => s.domain === d.id && bySection.has(s.id));
    const caps = secs.map((s) => bySection.get(s.id)?.length ?? 0);
    const min = Math.min(opts.minPerSection ?? 0, Math.floor(domainQuota[di] / Math.max(1, secs.length)));
    const base = caps.map((c) => Math.min(c, min));
    const rest = allocate(
      domainQuota[di] - base.reduce((a, b) => a + b, 0),
      secs.map((s) => s.target),
      caps.map((c, i) => c - base[i]),
    );
    secs.forEach((s, i) => sectionQuota.set(s.id, base[i] + rest[i]));
  });

  // 3. Fill each section, preferring types and difficulties that are behind their target share.
  const typeCount = new Map<QuestionType, number>();
  const diffCount = new Map<Difficulty, number>();
  const picked: Question[] = [];
  const need = (mix: Partial<Record<string, number>> | undefined, key: string, have: number) =>
    mix ? (mix[key] ?? 0) * (picked.length + 1) - have : 0;

  for (const sectionId of shuffle([...sectionQuota.keys()], rng)) {
    const pool = [...(bySection.get(sectionId) ?? [])];
    for (let k = 0; k < (sectionQuota.get(sectionId) ?? 0) && pool.length; k++) {
      let best = 0;
      let bestScore = -Infinity;
      pool.forEach((q, i) => {
        const score =
          need(opts.typeMix, q.type, typeCount.get(q.type) ?? 0) +
          need(opts.diffMix, String(q.diff), diffCount.get(q.diff) ?? 0) +
          rng() * 0.01;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      });
      const [q] = pool.splice(best, 1);
      picked.push(q);
      typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1);
      diffCount.set(q.diff, (diffCount.get(q.diff) ?? 0) + 1);
    }
  }
  return shuffle(picked, rng);
}

export function domainCounts(list: readonly Question[]): Record<DomainId, number> {
  const out = { D1: 0, D2: 0 } as Record<DomainId, number>;
  for (const q of list) out[domainOf(q)]++;
  return out;
}
