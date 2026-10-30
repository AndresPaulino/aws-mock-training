# Content authoring guide

Cloud Gauntlet is a local web app that takes a complete AWS newbie to passing the **AWS Certified Solutions Architect – Associate (SAA-C03)** exam. The learner has no AWS account. They study from six cheat-sheet PDFs; the extracted text lives in `study_guide/text/*.txt` and is the **primary source**. Anything you add beyond those PDFs (to cover the official SAA-C03 exam guide) must be flagged `beyond: true` (on the section, or on the whole lesson).

## Files every author must read first
- `src/content/types.ts`: the schema. Your data must typecheck against it.
- `src/content/outline.ts`: the canonical lesson ids. Reference only these.
- `src/content/service-ids.ts`: the canonical ServiceIds. Every `services`, `tags`, diagram `icon` and scenario service must come from this list (diagram icons may also use the generic icons listed there). Pick the closest id; do not invent new ones.

## File format rules (strict)
- Each content file: `import type { X } from '../types';` (or `'./types'`) then `export default [ ... ] satisfies X[];`. **Only `import type`**: no runtime imports, enums or functions. The validator loads files with plain Node.
- Use double-quoted or backtick strings. Watch apostrophes inside single-quoted strings.
- Write ONLY the files you were assigned. Never edit types.ts, outline.ts, service-ids.ts, or another author's file. Do not run npm install.
- Validate with `npm test -- <your-file-filter>` (e.g. `npm test -- questions/sec-a`), then keep fixing until it prints "All content checks passed." Also run `npx tsc -p . --noEmit` at the end. Fix errors in your files only; ignore errors in files that aren't yours.

## Mini-markdown (lesson section `body`, explanations)
Paragraphs separated by a blank line (`\n\n`), lines starting with `- ` are bullets, `**bold**`, `` `code` ``. No headings, links, or HTML.

## Voice
- The reader is a beginner. Define every term the first time you use it, and use concrete examples with real numbers (CIDRs, prices, limits).
- Be accurate as of 2026, with current service names (e.g. "Amazon Data Firehose", "IAM Identity Center"). If something changed, say so.
- Exam-focused: always tie back to how a question would phrase it ("If you see *least operational overhead* → managed/serverless").
- No filler. Dense and specific beats long and vague.

## Diagrams (`Diagram` type)
- Canvas is 100 wide × 60 tall; node x/y is the **centre**. Keep nodes at least ~12 units apart horizontally and ~10 vertically, and inside 4..96 × 4..56.
- Groups are rectangles (x,y = top-left). Nest them visually: region > vpc > az > subnet. Leave about 3 units of padding around the nodes inside.
- 4–8 steps that tell a story: each step highlights what matters and animates `flow` along edges (a packet moving). Use `fail` + `color: 'bad'` to show blocked traffic or a failed AZ.
- Labels ≤ 18 chars; put detail in `sub` (≤ 22 chars) or in the caption.
