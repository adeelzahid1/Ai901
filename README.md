# AI-901 Prep

Study portal for Microsoft exam **AI-901: Microsoft Azure AI Fundamentals** (skills outline of April 15, 2026).
Built with Angular 20 (standalone, signals, zoneless, SSR with only the landing page prerendered).

## Exam blueprint

| Domain | Weight | Study sections |
| --- | --- | --- |
| D1 Identify AI concepts and capabilities | 40-45% | 1.1-1.7 |
| D2 Implement AI solutions by using Microsoft Foundry | 55-60% | 2.1-2.7 |

Domains, official sub-skills, study sections and per-section question targets live in
[`src/app/data/blueprint.json`](src/app/data/blueprint.json).

## Question bank

- Questions are JSON files in `src/app/data/bank/` (`d1-core.json`, `d1-ext1.json`, ...), listed in
  `blueprint.json` under `bankFiles` and registered in `question-bank.ts`. Each file is a lazy chunk.
- Types: `mcq`, `multi`, `yesno`, `order`, `dropdown`, `match` (see `src/app/data/schema.ts`).
- Every question is original, scenario-based, explains why the answer is right and why the other
  choices are wrong, and links to Microsoft Learn.

```bash
npm run validate:bank
```

checks ids, answers for every type, explanation length, Learn links, section mapping, duplicates and
answer-position balance, and prints coverage per section.

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
