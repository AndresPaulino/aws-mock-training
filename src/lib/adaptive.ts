// Question selection. Weak domains, unseen and recently-missed questions surface more often.
import type { Progress } from '../store/store';
import type { DomainId, Question } from '../content/types';
import { questions, outline } from '../content';
import { DOMAIN_WEIGHTS } from './scoring';
import { domainAccuracy } from './gamify';

const DAY = 86400000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Weighted sample without replacement. */
function sample<T>(items: T[], weight: (t: T) => number, n: number): T[] {
  const pool = items.map((t) => ({ t, w: Math.max(0.0001, weight(t)) }));
  const out: T[] = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((a, x) => a + x.w, 0);
    const i = pool.findIndex((x) => (r -= x.w) <= 0);
    out.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0].t);
  }
  return out;
}

/** How much a question "wants" to be asked: unseen > missed > due for review > mastered. */
function questionWeight(p: Progress, q: Question): number {
  const st = p.questions[q.id];
  if (!st) return 3;
  const age = (Date.now() - st.lastAt) / DAY;
  const dueIn = [0, 1, 3, 7, 16, 35][st.box] ?? 35;
  if (age < 0.02) return 0.05; // just answered
  if (!st.lastCorrect) return 4;
  return age >= dueIn ? 2 : 0.3;
}

export interface DrillOptions { count: number; domain?: DomainId; lessonIds?: string[]; onlyCompletedLessons?: boolean; flaggedOnly?: boolean; missedOnly?: boolean }

export function pickDrill(p: Progress, o: DrillOptions): Question[] {
  let pool = questions;
  if (o.domain) pool = pool.filter((q) => q.domain === o.domain);
  if (o.lessonIds?.length) pool = pool.filter((q) => q.lessonIds.some((l) => o.lessonIds!.includes(l)));
  if (o.flaggedOnly) pool = pool.filter((q) => p.questions[q.id]?.flagged);
  if (o.missedOnly) pool = pool.filter((q) => p.questions[q.id] && !p.questions[q.id].lastCorrect);
  if (o.onlyCompletedLessons) {
    const done = new Set(Object.entries(p.lessons).filter(([, l]) => l.completedAt).map(([id]) => id));
    const filtered = pool.filter((q) => q.lessonIds.some((l) => done.has(l)));
    if (filtered.length >= o.count) pool = filtered;
  }
  const acc = domainAccuracy(p);
  // Weak domains get boosted: weight ∝ exam weight × (1.2 − accuracy).
  const domainBoost = (d: DomainId) => DOMAIN_WEIGHTS[d] * (1.2 - (acc[d].total ? acc[d].acc : 0.5));
  return sample(pool, (q) => questionWeight(p, q) * (o.domain ? 1 : domainBoost(q.domain)), o.count);
}

/** A 65-question exam with the official domain blend (30/26/24/20), harder questions favoured. */
export function buildExam(p: Progress, count = 65, preferUnseen = true): Question[] {
  const out: Question[] = [];
  const doms = Object.entries(DOMAIN_WEIGHTS) as [DomainId, number][];
  const targets = doms.map(([d, w]) => [d, Math.round(w * count)] as const);
  for (const [d, n] of targets) {
    const pool = questions.filter((q) => q.domain === d);
    out.push(...sample(pool, (q) => (q.difficulty >= 2 ? 2 : 1) * (preferUnseen && !p.questions[q.id] ? 2 : 1), n));
  }
  return shuffle(out).slice(0, count);
}

export function buildBoss(p: Progress, domain: DomainId, count = 20): Question[] {
  return sample(questions.filter((q) => q.domain === domain), (q) => q.difficulty * (p.questions[q.id]?.lastCorrect ? 0.7 : 1.3), count);
}

export function lessonQuiz(lessonId: string, count = 5): Question[] {
  const own = questions.filter((q) => q.lessonIds[0] === lessonId);
  const related = questions.filter((q) => q.lessonIds.includes(lessonId) && q.lessonIds[0] !== lessonId);
  return [...shuffle(own), ...shuffle(related)].slice(0, count);
}

export const isCorrect = (q: Question, picked: number[] | null | undefined) =>
  !!picked && picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));

// ---------- Study plan ----------
export interface PlanWeek { index: number; start: Date; end: Date; lessonIds: string[]; focus: string; isBuffer: boolean }

/** Spreads the remaining lessons evenly over the weeks left before a final mock-exam buffer week. Recomputed live, so falling behind re-plans automatically. */
export function studyPlan(p: Progress): { weeks: PlanWeek[]; currentWeek: number; behindBy: number; daysLeft: number } {
  const start = new Date(p.profile.startedAt + 'T00:00:00');
  const exam = new Date(p.profile.examDate + 'T00:00:00');
  const now = new Date();
  const totalWeeks = Math.max(2, Math.ceil((exam.getTime() - start.getTime()) / (7 * DAY)));
  const currentWeek = Math.min(totalWeeks - 1, Math.max(0, Math.floor((now.getTime() - start.getTime()) / (7 * DAY))));
  const done = (id: string) => !!p.lessons[id]?.completedAt;
  const remaining = outline.filter((o) => !done(o.id)).map((o) => o.id);
  const doneIds = outline.filter((o) => done(o.id)).map((o) => o.id);
  const studyWeeksLeft = Math.max(1, totalWeeks - 1 - currentWeek);
  const perWeek = Math.ceil(remaining.length / studyWeeksLeft);
  const weeks: PlanWeek[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const ws = new Date(start.getTime() + i * 7 * DAY);
    const we = new Date(Math.min(exam.getTime(), ws.getTime() + 7 * DAY - 1));
    const isBuffer = i === totalWeeks - 1;
    let ids: string[] = [];
    if (i < currentWeek) ids = []; // past weeks: show nothing planned
    else if (!isBuffer) ids = remaining.slice((i - currentWeek) * perWeek, (i - currentWeek + 1) * perWeek);
    const mods = [...new Set(ids.map((id) => outline.find((o) => o.id === id)!.module))];
    weeks.push({ index: i, start: ws, end: we, lessonIds: ids, isBuffer, focus: isBuffer ? 'Mock exams, weak-spot drills, final boss' : mods.length ? `Module ${mods.map((m) => m.slice(1)).join(' + ')}` : i < currentWeek ? 'Done' : 'Review & labs' });
  }
  // Ideal pace: lessons spread evenly from the start date.
  const idealDone = Math.round((outline.length * Math.min(1, (now.getTime() - start.getTime()) / ((totalWeeks - 1) * 7 * DAY))));
  return { weeks, currentWeek, behindBy: Math.max(0, idealDone - doneIds.length), daysLeft: Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / DAY)) };
}
