// One store for everything the learner does. Persisted to localStorage and,
// under `npm run dev`, to progress/progress.json (see sync.ts) so it travels with the git repo.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DomainId } from '../content/types';
import type { CloudState, Collection, ItemOf } from '../cloud/types';
import { seedCloud } from '../cloud/seed';

export interface QuestionStat { seen: number; correct: number; lastAt: number; lastCorrect: boolean; box: number; flagged?: boolean }
export interface CardStat { box: number; due: number; reps: number; lapses: number }
export type AttemptKind = 'mock' | 'boss' | 'final' | 'drill' | 'lesson' | 'placement';
export interface Attempt {
  id: string; kind: AttemptKind; domain?: DomainId; lessonId?: string;
  startedAt: number; finishedAt?: number; durationSec: number;
  questionIds: string[]; answers: (number[] | null)[]; flags: boolean[];
  correct: number; scaled?: number; perDomain?: Partial<Record<DomainId, { correct: number; total: number }>>;
}
export interface Profile { name: string; examDate: string; hoursPerWeek: number; startedAt: string; tutorModel: 'sonnet' | 'opus'; theme: 'light' | 'dark'; onboarded: boolean }

export interface Progress {
  version: 1;
  updatedAt: number;
  profile: Profile;
  xp: number;
  xpLog: { t: number; amount: number; reason: string }[];
  streak: { current: number; best: number; lastDay: string; freezesUsedWeek: string };
  activeDays: Record<string, number>; // 'YYYY-MM-DD' -> xp earned that day
  lessons: Record<string, { completedAt?: number; visitedAt: number; stepsSeen?: number }>;
  questions: Record<string, QuestionStat>;
  cards: Record<string, CardStat>;
  attempts: Attempt[];
  labs: Record<string, { completedAt?: number; startedAt: number }>;
  scenarios: Record<string, { best: number; completedAt?: number }>;
  badges: Record<string, number>;
  cloud: CloudState;
}

export const today = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const weekKey = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return today(x); };

export function freshProgress(): Progress {
  return {
    version: 1, updatedAt: 0,
    profile: { name: '', examDate: '2026-12-31', hoursPerWeek: 8, startedAt: today(), tutorModel: 'sonnet', theme: 'light', onboarded: false },
    xp: 0, xpLog: [], streak: { current: 0, best: 0, lastDay: '', freezesUsedWeek: '' }, activeDays: {},
    lessons: {}, questions: {}, cards: {}, attempts: [], labs: {}, scenarios: {}, badges: {},
    cloud: seedCloud(),
  };
}

interface Actions {
  /** Award XP (also bumps the daily streak). */
  award: (amount: number, reason: string) => void;
  setProfile: (p: Partial<Profile>) => void;
  visitLesson: (id: string) => void;
  completeLesson: (id: string) => void;
  recordAnswer: (qid: string, correct: boolean) => void;
  toggleFlag: (qid: string) => void;
  reviewCard: (cardId: string, grade: 0 | 1 | 2 | 3) => void;
  saveAttempt: (a: Attempt) => void;
  startLab: (id: string) => void;
  completeLab: (id: string) => void;
  scoreScenario: (id: string, pct: number) => void;
  earnBadge: (id: string) => boolean;
  /** Mutate the simulated cloud on a deep clone (safe, simple). */
  mutateCloud: (fn: (draft: CloudState) => void) => void;
  put: <K extends Collection>(k: K, item: ItemOf<K>) => void;
  patch: <K extends Collection>(k: K, id: string, partial: Partial<ItemOf<K>>) => void;
  remove: <K extends Collection>(k: K, id: string) => void;
  logEvent: (service: string, msg: string) => void;
  resetCloud: () => void;
  replaceAll: (p: Progress) => void;
}

export type Store = Progress & Actions;

// Leitner intervals (days) for flashcard boxes 0..6.
export const CARD_INTERVALS = [0, 1, 3, 7, 14, 30, 60];

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const touch = (p: Partial<Progress>) => set({ ...p, updatedAt: Date.now() } as Partial<Store>);
      const cloudSet = (cloud: CloudState) => touch({ cloud });
      return {
        ...freshProgress(),

        award: (amount, reason) => {
          const s = get();
          const day = today();
          const streak = { ...s.streak };
          if (streak.lastDay !== day) {
            const y = new Date(); y.setDate(y.getDate() - 1);
            const y2 = new Date(); y2.setDate(y2.getDate() - 2);
            if (streak.lastDay === today(y)) streak.current += 1;
            // One streak freeze per week: a single missed day doesn't reset you.
            else if (streak.lastDay === today(y2) && streak.freezesUsedWeek !== weekKey()) { streak.current += 1; streak.freezesUsedWeek = weekKey(); }
            else streak.current = 1;
            streak.best = Math.max(streak.best, streak.current);
            streak.lastDay = day;
          }
          touch({
            xp: s.xp + amount,
            xpLog: [{ t: Date.now(), amount, reason }, ...s.xpLog].slice(0, 300),
            activeDays: { ...s.activeDays, [day]: (s.activeDays[day] ?? 0) + amount },
            streak,
          });
        },
        setProfile: (p) => touch({ profile: { ...get().profile, ...p } }),
        visitLesson: (id) => { const l = get().lessons; touch({ lessons: { ...l, [id]: { ...l[id], visitedAt: Date.now() } } }); },
        completeLesson: (id) => {
          const l = get().lessons;
          if (l[id]?.completedAt) return;
          touch({ lessons: { ...l, [id]: { ...l[id], visitedAt: Date.now(), completedAt: Date.now() } } });
          get().award(50, 'Lesson complete');
        },
        recordAnswer: (qid, correct) => {
          const q = get().questions[qid] ?? { seen: 0, correct: 0, lastAt: 0, lastCorrect: false, box: 0 };
          const first = q.seen === 0;
          touch({ questions: { ...get().questions, [qid]: { ...q, seen: q.seen + 1, correct: q.correct + (correct ? 1 : 0), lastAt: Date.now(), lastCorrect: correct, box: correct ? Math.min(5, q.box + 1) : 0 } } });
          if (correct) get().award(first ? 10 : 3, first ? 'Correct answer' : 'Correct (review)');
        },
        toggleFlag: (qid) => {
          const q = get().questions[qid] ?? { seen: 0, correct: 0, lastAt: 0, lastCorrect: false, box: 0 };
          touch({ questions: { ...get().questions, [qid]: { ...q, flagged: !q.flagged } } });
        },
        reviewCard: (cardId, grade) => {
          const c = get().cards[cardId] ?? { box: 0, due: 0, reps: 0, lapses: 0 };
          const box = grade === 0 ? 1 : grade === 1 ? Math.max(1, c.box) : Math.min(6, c.box + grade - 1);
          const due = Date.now() + CARD_INTERVALS[box] * 86400000 - 3600000;
          touch({ cards: { ...get().cards, [cardId]: { box, due, reps: c.reps + 1, lapses: c.lapses + (grade === 0 ? 1 : 0) } } });
          get().award(2, 'Flashcard review');
        },
        saveAttempt: (a) => touch({ attempts: [...get().attempts.filter((x) => x.id !== a.id), a] }),
        startLab: (id) => { const l = get().labs; if (!l[id]) touch({ labs: { ...l, [id]: { startedAt: Date.now() } } }); },
        completeLab: (id) => {
          const l = get().labs;
          if (l[id]?.completedAt) return;
          touch({ labs: { ...l, [id]: { startedAt: l[id]?.startedAt ?? Date.now(), completedAt: Date.now() } } });
          get().award(100, 'Lab complete');
        },
        scoreScenario: (id, pct) => {
          const prev = get().scenarios[id];
          if (prev && prev.best >= pct) return;
          const gained = Math.round((pct - (prev?.best ?? 0)) * 1.5);
          touch({ scenarios: { ...get().scenarios, [id]: { best: pct, completedAt: pct >= 80 ? Date.now() : prev?.completedAt } } });
          if (gained > 0) get().award(gained, 'Architecture design');
        },
        earnBadge: (id) => {
          if (get().badges[id]) return false;
          touch({ badges: { ...get().badges, [id]: Date.now() } });
          get().award(75, 'Badge earned');
          return true;
        },
        mutateCloud: (fn) => { const draft = structuredClone(get().cloud); fn(draft); cloudSet(draft); },
        put: (k, item) => get().mutateCloud((c) => {
          const arr = c[k] as { id: string }[];
          const i = arr.findIndex((x) => x.id === item.id);
          if (i >= 0) arr[i] = item; else arr.push(item);
        }),
        patch: (k, id, partial) => get().mutateCloud((c) => {
          const arr = c[k] as { id: string }[];
          const i = arr.findIndex((x) => x.id === id);
          if (i >= 0) arr[i] = { ...arr[i], ...partial };
        }),
        remove: (k, id) => get().mutateCloud((c) => { (c[k] as unknown as { id: string }[]) = (c[k] as { id: string }[]).filter((x) => x.id !== id); }),
        logEvent: (service, msg) => get().mutateCloud((c) => { c.events = [{ t: Date.now(), service, msg }, ...c.events].slice(0, 200); }),
        resetCloud: () => cloudSet(seedCloud(get().cloud.region)),
        replaceAll: (p) => set({ ...freshProgress(), ...p, cloud: { ...seedCloud(), ...p.cloud } } as Partial<Store>),
      };
    },
    {
      name: 'cloud-gauntlet',
      version: 1,
      partialize: (s) => {
        const { award, setProfile, visitLesson, completeLesson, recordAnswer, toggleFlag, reviewCard, saveAttempt, startLab, completeLab, scoreScenario, earnBadge, mutateCloud, put, patch, remove, logEvent, resetCloud, replaceAll, ...data } = s;
        return data;
      },
    },
  ),
);

export function progressSnapshot(): Progress {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(freshProgress())) out[k] = s[k];
  return out as unknown as Progress;
}
