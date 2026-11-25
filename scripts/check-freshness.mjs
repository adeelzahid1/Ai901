// Compares every Microsoft Learn page behind the content with the last review. Run with `npm run check:freshness`.
// It prints pages whose text changed, new retirement notices, a new skills outline and new course modules,
// each with the questions, notes, lessons and labs to look at. After the review, `-- --write` saves the new state.
// Needs network access, so it is not part of CI. Exits with code 1 when there is something to review.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRefs, compare, fingerprint, noticeHash, notices, outlineDate, splitPage, unitLinks } from './freshness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = join(root, 'src', 'app', 'data');
const stateFile = join(root, 'scripts', 'freshness.json');
const blueprintFile = join(data, 'blueprint.json');
const write = process.argv.includes('--write');
const showAll = process.argv.includes('--notices');

const STUDY_GUIDE = 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-901';
const COURSE_PATHS = ['learn.ai-technical-concepts', 'learn.wwl.get-started-ai-apps-agents'];

/** New notices shown per page. */
const NOTICES = 5;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
const readDir = (dir) => readdirSync(join(data, dir)).filter((f) => f.endsWith('.json')).map((f) => readJson(join(data, dir, f)));

async function get(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'content-freshness-check' }, signal: AbortSignal.timeout(30000) });
    if (res.ok) return await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) throw new Error(`HTTP ${res.status}`);
    return null;
  } catch {
    if (attempt >= 4) return null;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return get(url, attempt + 1);
  }
}

const getMarkdown = (url) => get(`${url}?accept=text/markdown`);

/** Text and metadata of a page; a training module counts together with its content units. */
async function readPage(url) {
  const markdown = await getMarkdown(url);
  if (markdown === null) return null;
  const { meta, text } = splitPage(markdown);
  let all = text;
  if (meta.layout === 'Module') {
    for (const unit of unitLinks(url, text)) {
      const page = await getMarkdown(unit);
      if (page === null) return null;
      all += '\n' + splitPage(page).text;
    }
  }
  return { updated: (meta.updated_at ?? '').slice(0, 10), hash: fingerprint(all), notices: notices(all), text: all };
}

const refs = collectRefs({ questions: readDir('bank').flat(), notes: readDir('notes'), lessons: readDir('lessons'), labs: readJson(join(data, 'labs.json')) });
const urls = [...refs.keys()].sort();
const current = {};
const unreachable = [];
for (let i = 0; i < urls.length; i += 6) {
  const batch = urls.slice(i, i + 6);
  (await Promise.all(batch.map(readPage))).forEach((page, j) => {
    if (page) current[batch[j]] = page;
    else unreachable.push(batch[j]);
  });
  if (process.stdout.isTTY) process.stdout.write(`\r${Math.min(i + 6, urls.length)} / ${urls.length} pages`);
}

const blueprint = readJson(blueprintFile);
const guide = await getMarkdown(STUDY_GUIDE);
const outline = guide === null ? null : outlineDate(guide);
const catalog = await get(`https://learn.microsoft.com/api/catalog/?locale=en-us&uid=${COURSE_PATHS.join(',')}`);
const modules = catalog === null ? null : JSON.parse(catalog).learningPaths.flatMap((p) => p.modules);

const saved = existsSync(stateFile) ? readJson(stateFile) : { checked: null, modules: [], pages: {} };
const { changed, added, announced, gone } = compare(saved.pages, current);
const places = (url) => (refs.get(url) ?? []).join(', ');

console.log(`\nChecked ${Object.keys(current).length} of ${urls.length} pages. Last review: ${saved.checked ?? 'never'}.`);
let review = 0;
const section = (title, list, line) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length})`);
  for (const x of list) console.log(line(x));
};

if (outline && outline !== blueprint.exam.outlineDate) {
  review++;
  console.log(`\nNEW SKILLS OUTLINE: ${outline} (the portal follows ${blueprint.exam.outlineDate}). Compare the study guide:\n  ${STUDY_GUIDE}`);
}
if (modules) {
  const newModules = modules.filter((m) => !saved.modules.includes(m));
  const oldModules = saved.modules.filter((m) => !modules.includes(m));
  if (saved.checked) {
    review += newModules.length + oldModules.length;
    section('New modules in the official course', newModules, (m) => `  + ${m}`);
    section('Modules that left the official course', oldModules, (m) => `  - ${m}`);
  }
}
if (saved.checked) {
  review += changed.length + announced.length;
  const byPage = [...new Set(announced.map((a) => a.url))];
  section('Pages with new retirement or deprecation notices', byPage, (url) => {
    const list = announced.filter((a) => a.url === url).map((a) => `  ! ${a.sentence}`);
    const more = list.length > NOTICES ? `\n  ... and ${list.length - NOTICES} more` : '';
    return `${list.slice(0, NOTICES).join('\n')}${more}\n    ${url}\n    used by: ${places(url)}`;
  });
  section('Pages with changed text', changed, (url) => `  ${current[url].updated}  ${url}\n    used by: ${places(url)}`);
  section('Pages that are new since the last review', added, (url) => `  ${url}`);
  section('Pages that are no longer used', gone.filter((url) => !refs.has(url)), (url) => `  ${url}`);
}
if (showAll) {
  const all = Object.entries(current).flatMap(([url, p]) => p.notices.map((sentence) => ({ url, sentence })));
  section('All notices', all, ({ url, sentence }) => `  ! ${sentence}\n    ${url}`);
}
section('Pages that could not be read (run check:links)', unreachable, (url) => `  ${url}\n    used by: ${places(url)}`);

if (write) {
  const today = new Date().toISOString().slice(0, 10);
  const pages = {};
  for (const url of Object.keys({ ...saved.pages, ...current }).sort()) {
    if (!refs.has(url)) continue;
    const p = current[url];
    // A page that could not be read keeps its last review.
    pages[url] = p ? { updated: p.updated, hash: p.hash, notices: p.notices.map(noticeHash) } : saved.pages[url];
  }
  writeFileSync(stateFile, JSON.stringify({ checked: today, modules: modules ?? saved.modules, pages }, null, 1) + '\n');
  const text = readFileSync(blueprintFile, 'utf8');
  writeFileSync(blueprintFile, text.replace(/("checked": ")\d{4}-\d{2}-\d{2}(")/, `$1${today}$2`));
  console.log(`\nSaved ${Object.keys(pages).length} pages as reviewed on ${today}.`);
} else if (review) {
  console.log(`\n${review} point(s) to review. Update the content, then run: npm run check:freshness -- --write`);
  process.exitCode = 1;
} else {
  console.log(saved.checked ? '\nNothing changed since the last review.' : '\nNo saved review yet. Run: npm run check:freshness -- --write');
}
