// Aggregates all content files via Vite globbing, so adding a file is enough to ship it.
import type { Lesson, Question, Flashcard, ServiceInfo, Pattern, Scenario, DomainId } from './types';
import { outline, modules } from './outline';

const flat = <T,>(mods: Record<string, { default: T[] }>) => Object.values(mods).flatMap((m) => m.default ?? []);

const lessonList = flat<Lesson>(import.meta.glob('./lessons/*.ts', { eager: true }));
export const questions: Question[] = flat<Question>(import.meta.glob('./questions/*.ts', { eager: true }));
export const flashcards: Flashcard[] = flat<Flashcard>(import.meta.glob('./flashcards/*.ts', { eager: true }));
export const services: ServiceInfo[] = flat<ServiceInfo>(import.meta.glob('./services.ts', { eager: true }));
export const patterns: Pattern[] = flat<Pattern>(import.meta.glob('./patterns.ts', { eager: true }));
export const scenarios: Scenario[] = flat<Scenario>(import.meta.glob('./scenarios.ts', { eager: true }));

const lessonMap = new Map(lessonList.map((l) => [l.id, l]));
/** Lessons in Gauntlet order; outline entries without written content yet are skipped. */
export const lessons: Lesson[] = outline.map((o) => lessonMap.get(o.id)).filter((l): l is Lesson => !!l);
export const getLesson = (id: string) => lessonMap.get(id);
export const serviceMap = new Map(services.map((s) => [s.id, s]));
export const questionMap = new Map(questions.map((q) => [q.id, q]));
export { outline, modules };

export const DOMAINS: { id: DomainId; name: string; short: string; weight: number; color: string; territory: string }[] = [
  { id: 'secure', name: 'Design Secure Architectures', short: 'Secure', weight: 0.3, color: 'var(--d-secure)', territory: 'The Iron Vault' },
  { id: 'resilient', name: 'Design Resilient Architectures', short: 'Resilient', weight: 0.26, color: 'var(--d-resilient)', territory: 'The Failover Fjords' },
  { id: 'performance', name: 'Design High-Performing Architectures', short: 'Performance', weight: 0.24, color: 'var(--d-performance)', territory: 'The Latency Peaks' },
  { id: 'cost', name: 'Design Cost-Optimized Architectures', short: 'Cost', weight: 0.2, color: 'var(--d-cost)', territory: 'The Frugal Flats' },
];
export const domainOf = (id: DomainId) => DOMAINS.find((d) => d.id === id)!;
