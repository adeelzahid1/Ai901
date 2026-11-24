# AI-901 Prep

Study portal for Microsoft exam **AI-901: Microsoft Azure AI Fundamentals** (skills outline of April 15, 2026).
Built with Angular 20 (standalone, signals, zoneless, SSR with only the landing page prerendered).

**Live:** https://ai901.surge.sh

## Exam blueprint

| Domain | Weight | Study sections |
| --- | --- | --- |
| D1 Identify AI concepts and capabilities | 40-45% | 1.1-1.7 |
| D2 Implement AI solutions by using Microsoft Foundry | 55-60% | 2.1-2.7 |

Domains, official sub-skills, study sections and per-section question targets live in
[`src/app/data/blueprint.json`](src/app/data/blueprint.json).

## Features

- **Dashboard**: bank size, answered, accuracy, open mistakes, last exam score, domain coverage, recent tests.
- **Study** (`/study?s=1.1`): sidebar with every section and an understood/total badge (a section picker below 860px), search, level and filters (not understood, bookmarked, due for review, mistakes), study list with Show answer, bookmarks and "I understand this", 20 at a time, and flashcards with spaced repetition (Again 10 min, Hard max(1, ivl x 1.2) days, Good 1 -> 3 -> ivl x 2.5 days). Saved in `ai901-study-v1`.
- **Practice**: filter by domain, section, level, type, new questions or mistakes; instant feedback.
- **Mock Test**: choose sections, question types, levels, size, timer (off, exam pace or custom) and feedback mode.
- **Exam**: 50 questions in 45 minutes, weighted 21/29 by domain, every section, real-exam type and level mix, mark for review, auto-submit.
- **Results**: score out of 1000 (pass 700), domain and section breakdown, review with explanations.
- **Weak areas**: accuracy per domain, section and official sub-skill.
- **EN | Roman** switch in the top bar: the whole interface in English or Roman Urdu (saved in `ai901-lang`, `html lang="ur-Latn"`). Switching in the middle of a test keeps the answers.
- Options are shuffled per session (`optOrder` is kept for translations). Progress is stored in `localStorage` (`ai901-progress`, `ai901-history`).

## Question bank

**1,065 original questions** across 14 study sections and all 29 official sub-skills (D1: 445, D2: 620). Mix: Basic 33%, Intermediate 49%, Advanced 18%; multiple choice 48%, Yes/No 14%, drop-down 13%, matching 11%, multi-select 10%, ordering 4%.

- Questions are JSON files in `src/app/data/bank/` (`d1-core.json`, `d1-ext1.json`, ...), listed in
  `blueprint.json` under `bankFiles` and registered in `question-bank.ts`. Each file is a lazy chunk.
- Types: `mcq`, `multi`, `yesno`, `order`, `dropdown`, `match` (see `src/app/data/schema.ts`).
- Every question is original, scenario-based, explains why the answer is right and why the other
  choices are wrong, and links to Microsoft Learn.

### Roman Urdu

- Interface text: [`src/app/i18n/ui-text.ts`](src/app/i18n/ui-text.ts), an English and a Roman Urdu object with the same shape.
- Section, domain and sub-skill names: `ro` fields in `blueprint.json`.
- Questions: `src/app/data/roman/<bank file>.json` maps question ids to translated text and is registered in `roman-bank.ts` (lazy chunks, loaded only when Roman Urdu is on). Fields that are left out and `null` list entries stay in English, so Azure terms, commands and code are not translated. Drop-down choices go in `blanks`. A question without a translation is shown in English with a label.
- Translated so far: 223 of 1,065 questions (`d1-core`, `d1-ext1` to `d1-ext5`, `d2-core`). `npm run validate:bank` prints the coverage per section and checks the translations.

### Validation

```bash
npm run validate:bank
```

checks ids, answers for every type, explanation length, Learn links, section mapping, duplicates and
answer-position balance, and prints coverage per section.

```bash
npm run check:links
```

opens every Microsoft Learn reference and reports links that are broken or redirect (needs network
access, so it is not part of CI). `npm run check:links -- --write` replaces redirected links with
their final address, except redirects to the classic Foundry docs, which need a current page chosen
by hand.

The bank was last checked against Microsoft Learn in November 2026: deployment types, default
guardrails (content filters), Foundry role names (Foundry User, formerly Azure AI User), agent
tools, Responses API, audio and image-generation APIs, Speech and Language features, Image
Analysis retirement notes, Content Understanding REST flow and reasoning-model parameters.

## Development

```bash
npm start
```

serves the app on http://localhost:4300.

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

```bash
npm run build
```

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push and pull request
to `master`: `npm ci`, `validate:bank`, unit tests in headless Chrome, production build, and a
`200.html` copy of `index.csr.html` so Surge serves the app for deep links such as
`/study?s=1.1`. The built site is kept as the `site` artifact for 7 days. Pushes to `master`
(and manual runs) then deploy it to [Surge](https://surge.sh).

One-time setup:

1. Pick the address to publish to, for example `ai901-prep.surge.sh`.
2. On your computer run `npx surge login`, then create a token for CI that can only publish to
   that address: `npx surge tokens add --domain ai901-prep.surge.sh -m github-actions`.
   The token is shown once, so copy it. (`npx surge token` also works, but it prints the token
   for your whole account.)
3. In GitHub open **Settings > Secrets and variables > Actions** and add two repository secrets:
   - `SURGE_TOKEN`: the token from step 2
   - `SURGE_DOMAIN`: the address from step 1
4. Open **Actions > Build and deploy > Run workflow**, or push to `master`.

If a secret is missing, the deploy step stops and names the missing secret. `SURGE_LOGIN` (your
Surge email) is optional and only needed for older setups.
