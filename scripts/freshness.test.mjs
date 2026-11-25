// Run with `npm run test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectRefs, compare, fingerprint, noticeHash, notices, outlineDate, splitPage, unitLinks } from './freshness.mjs';

test('splits the front matter from the text', () => {
  const { meta, text } = splitPage('---\nlayout: Module\ntitle: A page\nupdated_at: 2026-11-24T15:07:00Z\n---\n\n# Title\n');
  assert.equal(meta.layout, 'Module');
  assert.equal(meta.updated_at.slice(0, 10), '2026-11-24');
  assert.equal(text.trim(), '# Title');
  assert.equal(splitPage('plain text').text, 'plain text');
});

test('ignores links, formatting, spacing and case, but not words', () => {
  const a = fingerprint('Use **Azure Language** for [PII](/en-us/a) detection.');
  assert.equal(a, fingerprint('use azure language   for [PII](/en-us/b?view=1)\n detection.'));
  assert.notEqual(a, fingerprint('Use Azure Language for PII masking.'));
});

test('finds sentences that announce the end of a feature', () => {
  const text = 'Choose a model. Summarization retires from Azure Language on March 31, 2029. Image Analysis 4.0 is deprecated and will be retired on September 25, 2028. Retry later.';
  const found = notices(text);
  assert.ok(found.some((s) => s.includes('Summarization retires')));
  assert.ok(found.includes('Image Analysis 4.0 is deprecated and will be retired on September 25, 2028.'));
  assert.ok(!found.some((s) => s.includes('Retry')));
});

test('lists every place that uses a page', () => {
  const refs = collectRefs({
    questions: [{ id: 'D1-001', ref: 'https://x/a?view=1' }, { id: 'D1-002', ref: 'https://x/b' }],
    notes: [{ id: 'fairness', refs: ['https://x/a'] }],
    lessons: [{ id: '1.1', ref: 'https://x/a#top' }],
    labs: [{ id: 'cu', ref: 'https://x/b' }],
  });
  assert.deepEqual(refs.get('https://x/a'), ['D1-001', 'note:fairness', 'lesson:1.1']);
  assert.deepEqual(refs.get('https://x/b'), ['D1-002', 'lab:cu']);
});

test('reports changed and new pages and new notices only', () => {
  const saved = { a: { hash: '1', notices: [noticeHash('Old feature retires soon.')] }, b: { hash: '2', notices: [] }, gone: { hash: '3', notices: [] } };
  const current = {
    a: { hash: '1', notices: ['Old feature retires soon.', 'New feature is deprecated.'] },
    b: { hash: '9', notices: [] },
    c: { hash: '4', notices: ['Something retired here.'] },
  };
  const r = compare(saved, current);
  assert.deepEqual(r.changed, ['b']);
  assert.deepEqual(r.added, ['c']);
  assert.deepEqual(r.gone, ['gone']);
  assert.deepEqual(r.announced, [{ url: 'a', sentence: 'New feature is deprecated.' }]);
});

test('reads the date of the skills outline', () => {
  assert.equal(outlineDate('## Skills measured as of April 15, 2026\n'), '2026-04-15');
  assert.equal(outlineDate('Skills measured as of January 5, 2027'), '2027-01-05');
  assert.equal(outlineDate('no date'), null);
});

test('keeps the content units of a module', () => {
  const md = '- [Introduction](1-introduction)min\n- [Agents](7a-agents)min\n- [Exercise](5-exercise)min\n- [Check](6-knowledge-check)min\n- [Summary](7-summary)min\n[Other](/en-us/training/paths/x/)';
  assert.deepEqual(unitLinks('https://learn.microsoft.com/en-us/training/modules/m/', md), [
    'https://learn.microsoft.com/en-us/training/modules/m/1-introduction',
    'https://learn.microsoft.com/en-us/training/modules/m/7a-agents',
  ]);
});
