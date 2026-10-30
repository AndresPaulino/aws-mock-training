# Cloud Gauntlet

A local, offline web app that takes you from zero to passing the **AWS Certified Solutions Architect – Associate (SAA-C03)** exam, with no AWS account needed.

## Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Requires Node 20.19+ (tested on Node 24).

### Optional: the AI tutor

1. Copy `.env.example` to `.env`.
2. Paste your Anthropic API key after `ANTHROPIC_API_KEY=`.
3. Restart `npm run dev`.

The key stays on your machine. The browser calls the local dev server (`server/devApi.ts`), and the dev server calls Claude. Pick **Sonnet 5.5** (fast and cheap) or **Opus 5.5** (deepest explanations) in the tutor panel. The tutor sees what you're working on: the lesson, the question you just missed, the lab step you're stuck on, or the console page you have open.

### Carrying your progress between computers

While `npm run dev` runs, everything you do saves automatically to **`progress/progress.json`**. That covers XP, streak, lessons, answers, flashcard schedule, exam history, badges, and the whole simulated AWS account. To continue on another machine, commit and push that file, then clone and run `npm run dev` there. On startup the newer copy (file or browser) wins. You can also **Profile → Download backup / Restore from backup**.

## What's inside

| Area | What it does |
|---|---|
| **The Gauntlet** | A 69-waypoint trail through 6 modules built from your cheat sheets. Each lesson has an analogy, an animated step-through diagram, sections, trade-off tables, key facts, exam tips, traps, a console lab and a 5-question check. Content beyond the PDFs is labelled *beyond your cheat sheets*. |
| **Mock AWS Console** | A Cloudscape-style simulation of 15 services (EC2 + ELB + Auto Scaling, VPC, S3, IAM, KMS, RDS, DynamoDB, Lambda, API Gateway, SQS, SNS, Route 53, CloudFront, CloudWatch, Billing). Resources persist. A live **cost meter** shows what's burning money. Includes the **Reachability Analyzer** (traces SG → NACL → routes → gateways), the IAM **policy simulator**, a Route 53 resolver, an ASG load slider and RDS failover. |
| **Labs** | 19 guided labs, docked beside the console, whose steps tick off live as you build. |
| **Architect** | 20 real-world briefs. Drag services onto a canvas, connect them, and get graded against the Well-Architected pillars, with a reference solution and trade-offs. Plus a free sandbox. |
| **Patterns** | 24 architecture patterns (DR tiers, fan-out, hub-and-spoke, data lake…), each with an animated diagram, pros/cons, alternatives and exam signals. |
| **Practice** | 427 original SAA-C03-style questions with an explanation for every option. Adaptive drills target weak domains and missed questions. |
| **Exams & bosses** | Timed 65-question mocks weighted 30/26/24/20, a domain boss per territory (20 hard questions, beat 72%), and a final boss. Estimated scaled score (100–1000, 720 pass). |
| **Flashcards** | 414 cards on spaced repetition (Again/Hard/Good/Easy, keyboard 1–4). |
| **Service atlas** | 167 services and features: when to use, when not to, how it bills, exam signal phrases. |
| **Study plan** | Spreads the remaining lessons across the weeks to your exam date, keeps a mock-exam buffer week, and re-plans when you fall behind. |
| **Gamification** | XP, 11 AWS-themed ranks, a daily streak (one free miss per week), 37 badges, bosses and a readiness score. |

## Project layout

```
src/content/        lessons/, questions/, flashcards/, services.ts, patterns.ts, scenarios.ts (pure data)
src/cloud/          simulated account: types, seed, pricing, sim clock, CIDR math, reachability engine
src/console/        mock AWS console: kit (Cloudscape-like components), shell, services/<svc>/
src/labs/           *.lab.ts guided labs (steps checked against the simulated account)
src/pages/          learning-app pages
src/lib/            scoring, gamification, adaptive selection, study plan, builder grading
src/store/          zustand store + progress.json sync
server/devApi.ts    dev-server middleware: /api/progress and /api/tutor (Claude proxy)
study_guide/        your PDFs + extracted text (the content's primary source)
docs/               authoring guides for content and console pages
```

## Checks

```bash
npm test
```

```bash
npm run test:logic
```

```bash
npx tsc -p tsconfig.json --noEmit
```

`npm test` validates every content file: ids, references, answer indices, diagrams, service ids. `npm run test:logic` checks CIDR math, scoring, builder grading and the reachability engine.

## Adding content

Read `docs/CONTENT_GUIDE.md` (lessons, questions, flashcards, patterns, scenarios) or `docs/CONSOLE_GUIDE.md` (console pages and labs). Drop a new file in the right folder and it's picked up automatically.

## Notes

- Question bank and lessons are original material written for this app; they are not copies of exam questions.
- Prices are approximate us-east-1 list prices (2026) and are for intuition, not billing.
- `npm run build` produces a static `dist/` you can host anywhere (e.g. GitHub Pages). Static hosting has no tutor and no progress file, and progress stays in that browser.
