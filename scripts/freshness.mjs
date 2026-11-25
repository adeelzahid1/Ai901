// Helpers of check-freshness.mjs that need no network, so they can be tested.
import { createHash } from 'node:crypto';

const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** Splits the Markdown version of a Learn page into its front matter and its text. */
export function splitPage(markdown) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(markdown);
  const meta = Object.fromEntries((m?.[1] ?? '').split(/\r?\n/).flatMap((l) => {
    const kv = /^([\w.-]+):\s*(.+)$/.exec(l);
    return kv ? [[kv[1], kv[2]]] : [];
  }));
  return { meta, text: m ? m[2] : markdown };
}

/** The words of a page without link targets, code fences, spacing and letter case, so that only real changes count. */
export function plainText(text) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const fingerprint = (text) => hash(plainText(text));

/** Sentences that announce the end of a feature. */
export function notices(text) {
  const plain = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_>#|]/g, ' ').replace(/\s+/g, ' ');
  const found = plain.split(/(?<=[.!?])\s+/).filter((s) => /\b(?:retires?|retired|retiring|retirement|deprecated|discontinued)\b/i.test(s));
  return [...new Set(found.map((s) => s.trim()).filter((s) => s.length > 20))].map((s) => (s.length > 260 ? s.slice(0, 257) + '...' : s));
}

export const noticeHash = (sentence) => hash(plainText(sentence));

/** Every Learn page of the content with the places that use it: question ids, note:…, lesson:…, lab:…. */
export function collectRefs({ questions, notes, lessons, labs }) {
  const refs = new Map();
  const add = (url, place) => {
    const key = url.replace(/[?#].*$/, '');
    if (!refs.has(key)) refs.set(key, []);
    if (!refs.get(key).includes(place)) refs.get(key).push(place);
  };
  for (const q of questions) add(q.ref, q.id);
  for (const n of notes) for (const ref of n.refs) add(ref, `note:${n.id}`);
  for (const l of lessons) add(l.ref, `lesson:${l.id}`);
  for (const l of labs) add(l.ref, `lab:${l.id}`);
  return refs;
}

/** Compares the pages of today with the saved ones. */
export function compare(saved, current) {
  const changed = [];
  const added = [];
  const announced = [];
  for (const [url, page] of Object.entries(current)) {
    const old = saved[url];
    if (!old) added.push(url);
    else if (old.hash !== page.hash) changed.push(url);
    const known = new Set(old?.notices ?? []);
    for (const s of page.notices) if (old && !known.has(noticeHash(s))) announced.push({ url, sentence: s });
  }
  const gone = Object.keys(saved).filter((url) => !current[url]);
  return { changed, added, announced, gone };
}

/** The date of the skills outline in the study guide, as YYYY-MM-DD. */
export function outlineDate(text) {
  const m = /skills measured as of (\w+) (\d{1,2}), (\d{4})/i.exec(text);
  if (!m) return null;
  const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(m[1].toLowerCase()) + 1;
  return month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

/** Content pages of a training module: no knowledge check, exercise or summary. */
export function unitLinks(moduleUrl, markdown) {
  const base = moduleUrl.replace(/\/?$/, '/');
  const links = [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1].replace(/[?#].*$/, ''));
  const own = links
    .map((l) => (l.startsWith('http') ? l : l.startsWith('/') ? `https://learn.microsoft.com${l}` : base + l))
    .filter((l) => l.startsWith(base) && /\/\d+[a-z]?-[\w-]+\/?$/.test(l) && !/(knowledge-check|exercise|summary)/.test(l));
  return [...new Set(own.map((l) => l.replace(/\/$/, '')))];
}
