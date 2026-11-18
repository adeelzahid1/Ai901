// Checks every Microsoft Learn link used as a question reference. Run with `npm run check:links`.
// Add `--write` to replace links that redirect with their final address.
// Needs network access, so it is not part of CI.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bankDir = join(root, 'src', 'app', 'data', 'bank');
const write = process.argv.includes('--write');

const files = readdirSync(bankDir).filter((f) => f.endsWith('.json'));
const refs = new Map();
for (const f of files) {
  for (const q of JSON.parse(readFileSync(join(bankDir, f), 'utf8').replace(/\r\n/g, '\n'))) {
    refs.set(q.ref, (refs.get(q.ref) ?? 0) + 1);
  }
}

const normalize = (u) => u.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();

async function check(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'ai901-link-check' },
      signal: AbortSignal.timeout(20000),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return check(url, attempt + 1);
    }
    return { url, status: res.status, final: res.url.replace(/[?#].*$/, '') };
  } catch (e) {
    // Network hiccups: wait and try again before reporting the link as broken.
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return check(url, attempt + 1);
    }
    return { url, status: 0, final: url, error: e.message };
  }
}

const urls = [...refs.keys()];
const results = [];
for (let i = 0; i < urls.length; i += 6) {
  results.push(...(await Promise.all(urls.slice(i, i + 6).map((u) => check(u)))));
}

const broken = results.filter((r) => r.status < 200 || r.status >= 400);
const moved = results.filter((r) => r.status === 200 && normalize(r.final) !== normalize(r.url));

console.log(`Checked ${results.length} links used by ${[...refs.values()].reduce((a, b) => a + b, 0)} questions.`);
console.log(`OK without redirect: ${results.length - broken.length - moved.length}`);
if (moved.length) {
  console.log(`\nRedirected (${moved.length}):`);
  for (const r of moved) console.log(`  ${refs.get(r.url)}x ${r.url}\n      -> ${r.final}`);
}
if (broken.length) {
  console.log(`\nBroken (${broken.length}):`);
  for (const r of broken) console.log(`  ${refs.get(r.url)}x [${r.status}${r.error ? ' ' + r.error : ''}] ${r.url}`);
}

if (write && moved.length) {
  // Pages that redirect to the classic Foundry docs need a manual replacement from the current docs.
  const safe = moved.filter(
    (r) => r.final.startsWith('https://learn.microsoft.com/') && !r.final.includes('/foundry-classic/'),
  );
  for (const r of moved.filter((r) => !safe.includes(r))) console.log(`  Skipped (update by hand): ${r.url}`);
  const map = new Map(safe.map((r) => [r.url, r.final]));
  let changed = 0;
  for (const f of files) {
    const path = join(bankDir, f);
    const list = JSON.parse(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
    let dirty = false;
    for (const q of list) {
      const next = map.get(q.ref);
      if (next) {
        q.ref = next;
        dirty = true;
        changed++;
      }
    }
    if (dirty) writeFileSync(path, JSON.stringify(list, null, 2) + '\n');
  }
  console.log(`\nUpdated ${changed} question references to their final address.`);
}

process.exit(broken.length ? 1 : 0);
