# Plan

Phases 0-7 (portal, 1,065 questions, accuracy review, CI/CD, Roman Urdu) are done. Phases 8-14 come from
a review of the portal from a teacher's point of view. Every step ends with validation, unit tests, a
build, a browser check, a commit and a check of the live site.

## Why

A learner who knows nothing but picks the longest option, expects exactly one "No" in every Yes/No set and
distrusts words such as "always" scored about 607 of 1000 (random guessing gives about 259). The score has
to mean something before anything is built on top of it.

| Measure | Before phase 8 | After phase 8 | Target |
| --- | --- | --- | --- |
| Multiple choice: the answer is the longest option | 368 of 516 (71%) | 22% | 35% or less |
| Multiple choice: the answer is 1.5 times longer than every other option | 276 of 516 (53%) | 0% | 10% or less |
| Multiple choice: most common length rank of the answer | 72% | 34% | 35% or less |
| Yes/No: exactly one "No" in the set | 144 of 146 (99%) | 54 of 146 (37%) | 45% or less |
| Yes/No: statements with absolute words that are false | 87 of 102 (85%) | 48 of 85 (56%) | 40-60% |
| Multi-select: exactly two answers | 108 of 108 (100%) | 69 of 108 (64%) | 70% or less |
| Multi-select: the answers are the longest options | 60 of 108 (56%) | 0% | 30% or less |
| Multi-select: the longest option is an answer | 93% | 44% | 60% or less |
| Exam score from test-taking tricks alone | about 607 of 1000 | about 252 | 300 or less |

`npm run validate:bank` prints these numbers and fails when one of them gets worse than the last step.

## Phase 8 - Fair questions

| Step | Work | Status |
| --- | --- | --- |
| 8.1 | Fairness checks in the validator; Yes/No sets with 0-3 "No"; absolute words in true statements too | done |
| 8.2 | Multi-select questions with three answers | done |
| 8.3 | Multiple choice, D1: shorter answers, stronger distractors | done |
| 8.4 | Multiple choice, D2: shorter answers, stronger distractors | done |
| 8.5 | Multi-select option lengths; final limits | done |

## Phase 9 - Honest scores

| Step | Work |
| --- | --- |
| 9.1 | 200 questions that appear only in the Exam tab, never in Study, Practice or Mock Test (done) |
| 9.2 | Readiness score per domain, from first attempts only (done) |

## Phase 10 - Hands-on labs

8-10 labs in the Foundry portal and the Python SDK (deploy and test a model, prompts, chat client, agent,
text analysis, speech, vision, image generation, Content Understanding), each with cost notes, checks and
clean-up, checked against Microsoft Learn.

## Phase 11 - Code, REST and CLI questions

New questions that read Python code, REST calls and Azure CLI commands.

## Phase 12 - Scenario questions

New questions that start from a short business scenario and ask for the best decision.

## Phase 13 - Lessons

A lesson for each of the 14 sections in English and Roman Urdu: concepts, a small example, "remember" points,
"which service when" tables and five check questions.

## Phase 14 - Exam day

Exam sandbox, free Practice Assessment, the 30 extra minutes for candidates whose language is not offered,
timing and question-type tips.
