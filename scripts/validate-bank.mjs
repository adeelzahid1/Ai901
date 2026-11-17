// Validates the AI-901 question bank. Run with `npm run validate:bank`.
// Exits with code 1 when any error is found; warnings are printed but do not fail the run.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'app', 'data');
const bankDir = join(dataDir, 'bank');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
const blueprint = readJson(join(dataDir, 'blueprint.json'));

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

const TYPES = new Set(['mcq', 'multi', 'yesno', 'order', 'dropdown', 'match']);
const MIN_EXP = 160;
const REF_RE = /^https:\/\/learn\.microsoft\.com\/[a-z]{2}-[a-z]{2}\//;
const ID_RE = /^(D[12])-\d{3,4}$/;

// ---- Blueprint: every domain|sub maps to exactly one study section --------------------------
const subsByDomain = new Map(blueprint.domains.map((d) => [d.id, new Set(d.subs.map((s) => s.id))]));
const sectionOf = new Map();
for (const s of blueprint.sections) {
  if (!subsByDomain.has(s.domain)) err(`section ${s.id}`, `unknown domain ${s.domain}`);
  for (const sub of s.subs) {
    const key = `${s.domain}|${sub}`;
    if (!subsByDomain.get(s.domain)?.has(sub)) err(`section ${s.id}`, `sub "${sub}" is not in ${s.domain}`);
    if (sectionOf.has(key)) err(`section ${s.id}`, `${key} is already in section ${sectionOf.get(key)}`);
    sectionOf.set(key, s.id);
  }
}
for (const [domain, subs] of subsByDomain) {
  for (const sub of subs) {
    if (!sectionOf.has(`${domain}|${sub}`)) err('blueprint', `${domain}|${sub} has no study section`);
  }
}

// ---- Bank files ---------------------------------------------------------------------------
const listed = new Map();
for (const [domain, files] of Object.entries(blueprint.bankFiles)) {
  for (const f of files) listed.set(`${f}.json`, domain);
}
const onDisk = readdirSync(bankDir).filter((f) => f.endsWith('.json'));
for (const f of onDisk) if (!listed.has(f)) err(f, 'file is not listed in blueprint.bankFiles');
for (const f of listed.keys()) if (!onDisk.includes(f)) err(f, 'listed in blueprint.bankFiles but missing on disk');

const questions = [];
for (const f of onDisk.filter((f) => listed.has(f))) {
  let list;
  try {
    list = readJson(join(bankDir, f));
  } catch (e) {
    err(f, `invalid JSON - ${e.message}`);
    continue;
  }
  if (!Array.isArray(list)) {
    err(f, 'must contain an array');
    continue;
  }
  for (const q of list) questions.push({ ...q, _file: f, _domain: listed.get(f) });
}

// ---- Per-question checks ------------------------------------------------------------------
const isStrList = (v, min) => Array.isArray(v) && v.length >= min && v.every((x) => typeof x === 'string' && x.trim());
const isIndex = (v, len) => Number.isInteger(v) && v >= 0 && v < len;
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const seenIds = new Set();
const seenStems = new Map();
const mcqPos = [];
let yesCount = 0;
let yesNoTotal = 0;

for (const q of questions) {
  const id = q.id ?? `(no id in ${q._file})`;
  const m = ID_RE.exec(q.id ?? '');
  if (!m) err(id, 'id must look like D1-001');
  else if (m[1] !== q._domain) err(id, `id prefix does not match file domain ${q._domain}`);
  if (seenIds.has(q.id)) err(id, 'duplicate id');
  seenIds.add(q.id);

  if (!subsByDomain.get(q._domain)?.has(q.sub)) err(id, `unknown sub "${q.sub}" for ${q._domain}`);
  if (![1, 2, 3].includes(q.diff)) err(id, 'diff must be 1, 2 or 3');
  if (!TYPES.has(q.type)) err(id, `unknown type "${q.type}"`);
  if (typeof q.q !== 'string' || q.q.trim().length < 15) err(id, 'question text is missing or too short');
  if (q.ctx !== undefined && (typeof q.ctx !== 'string' || !q.ctx.trim())) err(id, 'ctx must be a non-empty string');
  if (typeof q.exp !== 'string' || q.exp.length < MIN_EXP) err(id, `exp must be at least ${MIN_EXP} characters`);
  if (typeof q.ref !== 'string' || !REF_RE.test(q.ref)) err(id, 'ref must be a learn.microsoft.com link');

  if (typeof q.q === 'string') {
    const key = norm(`${q.ctx ?? ''} ${q.q} ${JSON.stringify(q.opts ?? q.stmts ?? q.items ?? q.tpl ?? '')}`);
    if (seenStems.has(key)) err(id, `duplicate of ${seenStems.get(key)}`);
    seenStems.set(key, id);
  }

  switch (q.type) {
    case 'mcq':
      if (!isStrList(q.opts, 3) || q.opts.length > 5) err(id, 'mcq needs 3-5 options');
      else if (!isIndex(q.ans, q.opts.length)) err(id, 'mcq ans must be an option index');
      else mcqPos.push({ pos: q.ans, len: q.opts.length });
      break;
    case 'multi':
      if (!isStrList(q.opts, 4) || q.opts.length > 7) err(id, 'multi needs 4-7 options');
      else if (!Array.isArray(q.ans) || q.ans.length < 2 || q.ans.length >= q.opts.length) {
        err(id, 'multi ans must list at least 2 (and not all) option indexes');
      } else if (!q.ans.every((a) => isIndex(a, q.opts.length)) || new Set(q.ans).size !== q.ans.length) {
        err(id, 'multi ans has an invalid or repeated index');
      }
      break;
    case 'yesno':
      if (!isStrList(q.stmts, 2) || q.stmts.length > 4) err(id, 'yesno needs 2-4 statements');
      else if (!Array.isArray(q.ans) || q.ans.length !== q.stmts.length || !q.ans.every((a) => typeof a === 'boolean')) {
        err(id, 'yesno ans must be one boolean per statement');
      } else {
        yesNoTotal += q.ans.length;
        yesCount += q.ans.filter(Boolean).length;
      }
      break;
    case 'order':
      if (!isStrList(q.items, 3) || q.items.length > 8) err(id, 'order needs 3-8 items');
      else if (!Array.isArray(q.ans) || q.ans.length < 3 || !q.ans.every((a) => isIndex(a, q.items.length)) || new Set(q.ans).size !== q.ans.length) {
        err(id, 'order ans must be at least 3 distinct item indexes');
      } else if (q.ans.every((a, i) => a === i) && q.ans.length === q.items.length) {
        warn(id, 'order items are already listed in the correct order');
      }
      break;
    case 'dropdown': {
      const blanks = [...String(q.tpl ?? '').matchAll(/\{(\d+)\}/g)].map((x) => Number(x[1]));
      const expected = blanks.map((_, i) => i);
      if (typeof q.tpl !== 'string' || blanks.length === 0) err(id, 'dropdown tpl needs {0}-style blanks');
      else if (blanks.join() !== expected.join()) err(id, 'dropdown blanks must be {0}, {1}, ... in order');
      else if (!Array.isArray(q.opts) || q.opts.length !== blanks.length || !q.opts.every((o) => isStrList(o, 2) && o.length <= 6)) {
        err(id, 'dropdown needs one list of 2-6 options per blank');
      } else if (!Array.isArray(q.ans) || q.ans.length !== blanks.length || !q.ans.every((a, i) => isIndex(a, q.opts[i].length))) {
        err(id, 'dropdown ans must be one valid index per blank');
      }
      break;
    }
    case 'match':
      if (!isStrList(q.items, 2) || q.items.length > 6) err(id, 'match needs 2-6 items');
      else if (!isStrList(q.targets, 2) || q.targets.length > 7) err(id, 'match needs 2-7 targets');
      else if (!Array.isArray(q.ans) || q.ans.length !== q.items.length || !q.ans.every((a) => isIndex(a, q.targets.length))) {
        err(id, 'match ans must be one target index per item');
      }
      break;
  }

  for (const list of [q.opts, q.stmts, q.items, q.targets]) {
    if (Array.isArray(list) && list.every((x) => typeof x === 'string')) {
      if (new Set(list.map(norm)).size !== list.length) err(id, 'repeated choice text');
    }
  }
}

// ---- Answer-position balance -----------------------------------------------------------------
if (mcqPos.length >= 20) {
  const counts = [0, 0, 0, 0, 0];
  for (const { pos } of mcqPos) counts[pos]++;
  const share = counts.map((c) => c / mcqPos.length);
  if (share[0] > 0.35) err('balance', `${Math.round(share[0] * 100)}% of mcq answers are option A (max 35%)`);
  share.forEach((s, i) => {
    if (s > 0.4) err('balance', `${Math.round(s * 100)}% of mcq answers are option ${'ABCDE'[i]} (max 40%)`);
  });
}
const multis = questions.filter((q) => q.type === 'multi' && Array.isArray(q.ans));
if (multis.length >= 10) {
  const withA = multis.filter((q) => q.ans.includes(0)).length / multis.length;
  if (withA > 0.5) err('balance', `${Math.round(withA * 100)}% of multi questions include option A in the answer (max 50%)`);
}
const matches = questions.filter((q) => q.type === 'match' && Array.isArray(q.ans));
if (matches.length >= 8) {
  const identity = matches.filter((q) => q.ans.every((a, i) => a === i)).length / matches.length;
  if (identity > 0.25) err('balance', `${Math.round(identity * 100)}% of match questions map item 1 to target 1, 2 to 2 ... (max 25%)`);
}
const yesnos = questions.filter((q) => q.type === 'yesno' && Array.isArray(q.ans));
if (yesnos.length >= 10) {
  const patterns = new Map();
  for (const q of yesnos) {
    const key = q.ans.map((a) => (a ? 'Y' : 'N')).join('');
    patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
  const [top, n] = [...patterns].sort((a, b) => b[1] - a[1])[0];
  if (n / yesnos.length > 0.5) warn('balance', `${Math.round((n / yesnos.length) * 100)}% of Yes/No sets use the pattern ${top}`);
}
if (yesNoTotal >= 20) {
  const yes = yesCount / yesNoTotal;
  if (yes < 0.3 || yes > 0.7) warn('balance', `${Math.round(yes * 100)}% of Yes/No statements are Yes (aim for 40-60%)`);
}

// ---- Report -------------------------------------------------------------------------------
const bySection = new Map(blueprint.sections.map((s) => [s.id, 0]));
const bySub = new Map();
const byType = {};
const byDiff = { 1: 0, 2: 0, 3: 0 };
for (const q of questions) {
  const s = sectionOf.get(`${q._domain}|${q.sub}`);
  if (s) bySection.set(s, bySection.get(s) + 1);
  bySub.set(`${q._domain}|${q.sub}`, (bySub.get(`${q._domain}|${q.sub}`) ?? 0) + 1);
  byType[q.type] = (byType[q.type] ?? 0) + 1;
  if (byDiff[q.diff] !== undefined) byDiff[q.diff]++;
}

const pct = (n) => (questions.length ? `${Math.round((n / questions.length) * 100)}%` : '0%');
console.log(`\nAI-901 bank: ${questions.length} questions in ${onDisk.length} files\n`);
console.log('Section  Count / Target');
for (const s of blueprint.sections) {
  const n = bySection.get(s.id);
  console.log(`  ${s.id.padEnd(6)} ${String(n).padStart(4)} / ${String(s.target).padEnd(4)} ${s.en}`);
}
const missingSubs = [...sectionOf.keys()].filter((k) => !bySub.has(k));
console.log(`\nSub-skills covered: ${sectionOf.size - missingSubs.length} / ${sectionOf.size}`);
if (missingSubs.length) console.log(`  not covered yet: ${missingSubs.join(', ')}`);
console.log(`Types: ${Object.entries(byType).map(([t, n]) => `${t} ${n} (${pct(n)})`).join(', ')}`);
console.log(`Levels: Basic ${byDiff[1]} (${pct(byDiff[1])}), Intermediate ${byDiff[2]} (${pct(byDiff[2])}), Advanced ${byDiff[3]} (${pct(byDiff[3])})`);
if (mcqPos.length) {
  const counts = [0, 0, 0, 0, 0];
  for (const { pos } of mcqPos) counts[pos]++;
  console.log(`MCQ answer positions: ${counts.slice(0, 5).map((c, i) => `${'ABCDE'[i]} ${c}`).join(', ')}`);
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  x ${e}`);
  process.exit(1);
}
console.log('\nBank is valid.');
