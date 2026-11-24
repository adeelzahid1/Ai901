// How far a learner gets with test-taking tricks instead of knowledge. Each measure has a limit that only
// gets stricter (see PLAN.md, phase 8), so new questions cannot bring the clues back.

const ABSOLUTE = /\b(always|never|only|every|all|must|cannot|any|automatically)\b/i;
const share = (list, test) => (list.length ? list.filter(test).length / list.length : 0);
const average = (list, score) => (list.length ? list.reduce((sum, x) => sum + score(x), 0) / list.length : 0);
const longest = (opts) => opts.reduce((best, o, i) => (o.length > opts[best].length ? i : best), 0);
const wrongOptions = (q) => q.opts.filter((_, i) => i !== q.ans).map((o) => o.length);

/** True when the answers of a multi-select question are exactly its longest options. */
function longestAreAnswers(q) {
  const byLength = q.opts.map((o, i) => [o.length, i]).sort((a, b) => b[0] - a[0]);
  const top = byLength.slice(0, q.ans.length).map(([, i]) => i);
  return q.ans.every((i) => top.includes(i));
}

/** Share of a Yes/No set that is right when only the statement with an absolute word gets "No". */
function oneNoGuess(q) {
  const at = q.stmts.findIndex((s) => ABSOLUTE.test(s));
  const no = at < 0 ? 1 : at;
  return share(q.ans.map((a, i) => ({ a, guess: i !== no })), (x) => x.a === x.guess);
}

export function fairness(questions) {
  const of = (type) => questions.filter((q) => q.type === type);
  const mcq = of('mcq');
  const multi = of('multi');
  const yesno = of('yesno');
  const statements = yesno.flatMap((q) => q.stmts.map((text, i) => ({ text, yes: q.ans[i] })));
  const absolute = statements.filter((s) => ABSOLUTE.test(s.text));
  const patterns = new Map();
  for (const q of yesno) patterns.set(q.ans.join(), (patterns.get(q.ans.join()) ?? 0) + 1);

  const measures = [
    { name: 'mcq: answer is the longest option', value: share(mcq, (q) => q.opts[q.ans].length > Math.max(...wrongOptions(q))), max: 0.72 },
    { name: 'mcq: answer is 1.5x longer than the rest', value: share(mcq, (q) => q.opts[q.ans].length >= 1.5 * Math.max(...wrongOptions(q))), max: 0.54 },
    { name: 'multi: answers are the longest options', value: share(multi, longestAreAnswers), max: 0.55 },
    { name: 'multi: exactly two answers', value: share(multi, (q) => q.ans.length === 2), max: 0.7 },
    { name: 'yes/no: exactly one No', value: share(yesno, (q) => q.ans.filter((a) => !a).length === 1), max: 0.45 },
    { name: 'yes/no: most common answer pattern', value: Math.max(0, ...patterns.values()) / (yesno.length || 1), max: 0.2 },
    { name: 'yes/no: statements that are Yes', value: share(statements, (s) => s.yes), min: 0.4, max: 0.6 },
    { name: 'yes/no: absolute words that are No', value: share(absolute, (s) => !s.yes), min: 0.4, max: 0.6 },
  ];

  // Expected exam score from the tricks alone, with the question mix of the Exam tab.
  const score =
    0.5 * average(mcq, (q) => (longest(q.opts) === q.ans ? 1 : 0)) +
    0.15 * share(multi, longestAreAnswers) +
    0.12 * average(yesno, oneNoGuess) +
    0.13 * average(of('dropdown'), (q) => share(q.ans.map((a, i) => ({ a, g: longest(q.opts[i]) })), (x) => x.a === x.g)) +
    0.06 * average(of('match'), (q) => 1 / q.targets.length);
  return { measures, score: Math.round(score * 1000) };
}
