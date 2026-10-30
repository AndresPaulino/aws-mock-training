// Content validator: `npm test`. Loads every content file and checks ids, references and shapes.
// Optional arg filters which files to check, e.g. `npm test -- questions/secure`.
import { readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { outline } from '../src/content/outline.ts';
import type { Lesson, Question, Flashcard, ServiceInfo, Pattern, Scenario, Diagram } from '../src/content/types.ts';

const root = join(fileURLToPath(import.meta.url), '..', '..', 'src', 'content');
const filter = process.argv[2] ?? '';
const errors: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

async function load<T>(dir: string): Promise<{ file: string; items: T[] }[]> {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  const out = [];
  for (const f of readdirSync(full).filter((f) => f.endsWith('.ts'))) {
    const mod = await import(pathToFileURL(join(full, f)).href);
    out.push({ file: `${dir}/${f}`, items: (mod.default ?? []) as T[] });
  }
  return out;
}
async function loadOne<T>(file: string): Promise<T[]> {
  const full = join(root, file);
  if (!existsSync(full)) return [];
  return ((await import(pathToFileURL(full).href)).default ?? []) as T[];
}

const lessonIds = new Set(outline.map((o) => o.id));
const seen = new Set<string>();
function unique(where: string, id: string) {
  if (!id) return err(where, 'missing id');
  if (seen.has(id)) err(where, `duplicate id ${id}`);
  seen.add(id);
}
function refLessons(where: string, ids: string[]) {
  for (const id of ids ?? []) if (!lessonIds.has(id)) err(where, `unknown lessonId ${id}`);
}
function nonEmpty(where: string, obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) err(where, `missing ${k}`);
  }
}
function checkDiagram(where: string, d: Diagram) {
  const ids = new Set<string>();
  for (const g of d.groups ?? []) ids.add(g.id);
  for (const n of d.nodes) {
    ids.add(n.id);
    if (n.x < 0 || n.x > 100 || n.y < 0 || n.y > 60) err(where, `node ${n.id} outside 100x60 canvas`);
  }
  for (const e of d.edges) {
    ids.add(e.id);
    if (!d.nodes.some((n) => n.id === e.from)) err(where, `edge ${e.id} from unknown node ${e.from}`);
    if (!d.nodes.some((n) => n.id === e.to)) err(where, `edge ${e.id} to unknown node ${e.to}`);
  }
  if (!d.steps?.length) err(where, 'diagram has no steps');
  d.steps?.forEach((s, i) => {
    for (const h of [...s.highlight, ...(s.fail ?? [])]) if (!ids.has(h)) err(where, `step ${i} references unknown id ${h}`);
    for (const f of s.flow ?? []) if (!d.edges.some((e) => e.id === f.edge)) err(where, `step ${i} flow on unknown edge ${f.edge}`);
  });
}

const want = (file: string) => file.includes(filter);
let counts: Record<string, number> = {};

for (const { file, items } of await load<Lesson>('lessons')) {
  if (!want(file)) continue;
  counts.lessons = (counts.lessons ?? 0) + items.length;
  for (const l of items) {
    const w = `${file} ${l.id}`;
    unique(w, l.id);
    if (!lessonIds.has(l.id)) err(w, 'id not in outline.ts');
    nonEmpty(w, l as never, ['title', 'summary', 'analogy', 'sections', 'keyFacts', 'examTips', 'pitfalls', 'services']);
    if (l.diagram) checkDiagram(w, l.diagram);
    for (const s of l.sections ?? []) {
      if (s.table) for (const r of s.table.rows) if (r.length !== s.table.headers.length) err(w, `table row length mismatch in "${s.heading}"`);
    }
  }
}

for (const { file, items } of await load<Question>('questions')) {
  if (!want(file)) continue;
  counts.questions = (counts.questions ?? 0) + items.length;
  for (const q of items) {
    const w = `${file} ${q.id}`;
    unique(w, q.id);
    nonEmpty(w, q as never, ['stem', 'options', 'answer', 'explanation', 'optionExplanations', 'lessonIds']);
    refLessons(w, q.lessonIds);
    if (!['secure', 'resilient', 'performance', 'cost'].includes(q.domain)) err(w, `bad domain ${q.domain}`);
    if (q.optionExplanations?.length !== q.options?.length) err(w, 'optionExplanations length != options length');
    for (const a of q.answer ?? []) if (a < 0 || a >= q.options.length) err(w, `answer index ${a} out of range`);
    if (new Set(q.answer).size !== q.answer?.length) err(w, 'duplicate answer index');
    const multi = /choose (two|three)/i.test(q.stem);
    const n = /choose three/i.test(q.stem) ? 3 : /choose two/i.test(q.stem) ? 2 : 1;
    if (q.answer?.length !== n) err(w, `stem implies ${n} answer(s) but answer has ${q.answer?.length}${multi ? '' : ' (add "(Choose TWO.)" to stem?)'}`);
  }
}

for (const { file, items } of await load<Flashcard>('flashcards')) {
  if (!want(file)) continue;
  counts.flashcards = (counts.flashcards ?? 0) + items.length;
  for (const c of items) {
    const w = `${file} ${c.id}`;
    unique(w, c.id);
    nonEmpty(w, c as never, ['front', 'back']);
    refLessons(w, [c.lessonId]);
  }
}

const services = want('services') ? await loadOne<ServiceInfo>('services.ts') : [];
const serviceIds = new Set(services.map((s) => s.id));
counts.services = services.length;
for (const s of services) {
  const w = `services.ts ${s.id}`;
  unique(w, 'svc:' + s.id);
  nonEmpty(w, s as never, ['name', 'short', 'category', 'oneLiner', 'whatItIs', 'pricing']);
  refLessons(w, s.lessonIds);
  for (const r of s.related ?? []) if (!serviceIds.has(r)) err(w, `related unknown service ${r}`);
}
const knownService = (w: string, id: string) => { if (serviceIds.size && !serviceIds.has(id)) err(w, `unknown service ${id}`); };

if (want('patterns')) for (const p of await loadOne<Pattern>('patterns.ts')) {
  counts.patterns = (counts.patterns ?? 0) + 1;
  const w = `patterns.ts ${p.id}`;
  unique(w, 'pat:' + p.id);
  nonEmpty(w, p as never, ['title', 'problem', 'howItWorks', 'pros', 'cons', 'useWhen']);
  refLessons(w, p.lessonIds);
  checkDiagram(w, p.diagram);
}

if (want('scenarios')) for (const s of await loadOne<Scenario>('scenarios.ts')) {
  counts.scenarios = (counts.scenarios ?? 0) + 1;
  const w = `scenarios.ts ${s.id}`;
  unique(w, 'scn:' + s.id);
  refLessons(w, s.lessonIds);
  for (const id of s.palette) knownService(w, id);
  for (const id of s.solution.services) {
    knownService(w, id);
    if (!s.palette.includes(id)) err(w, `solution service ${id} not in palette`);
  }
  for (const r of s.rules) for (const id of [...(r.anyOf ?? []), ...(r.noneOf ?? []), ...(r.connect?.from ?? []), ...(r.connect?.to ?? []), ...(r.atLeast?.services ?? [])]) knownService(w, id);
}

console.log('Counts:', counts);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.slice(0, 200).join('\n'));
  process.exit(1);
}
console.log('All content checks passed.', relative(process.cwd(), root));
