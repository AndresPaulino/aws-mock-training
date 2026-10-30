// Ranks, badges and readiness. Pure functions over Progress.
import type { Progress } from '../store/store';
import type { DomainId } from '../content/types';
import { outline, questionMap } from '../content';
import { DOMAIN_WEIGHTS, scaledScore, PASS } from './scoring';

export const RANKS = [
  { xp: 0, title: 'Cloud Intern' },
  { xp: 250, title: 'Console Clicker' },
  { xp: 600, title: 'IAM Apprentice' },
  { xp: 1100, title: 'VPC Plumber' },
  { xp: 1800, title: 'Junior Cloud Engineer' },
  { xp: 2700, title: 'Cloud Engineer' },
  { xp: 3800, title: 'Associate Architect' },
  { xp: 5200, title: 'Solutions Architect' },
  { xp: 7000, title: 'Senior Solutions Architect' },
  { xp: 9500, title: 'Principal Architect' },
  { xp: 12500, title: 'Cloud Hero' },
];
export function rankOf(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1];
  return { level: i + 1, title: RANKS[i].title, xp, floor: RANKS[i].xp, next: next?.xp ?? RANKS[i].xp, nextTitle: next?.title, pct: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1 };
}

/** Accuracy per domain over the last 40 answers seen (recent performance matters more). */
export function domainAccuracy(p: Progress) {
  const out = {} as Record<DomainId, { correct: number; total: number; acc: number; seen: number }>;
  for (const d of Object.keys(DOMAIN_WEIGHTS) as DomainId[]) out[d] = { correct: 0, total: 0, acc: 0, seen: 0 };
  const recent = Object.entries(p.questions).sort((a, b) => b[1].lastAt - a[1].lastAt);
  const count = {} as Record<string, number>;
  for (const [id, st] of recent) {
    const q = questionMap.get(id);
    if (!q) continue;
    out[q.domain].seen++;
    if ((count[q.domain] = (count[q.domain] ?? 0) + 1) > 40) continue;
    out[q.domain].total++;
    // blend lifetime accuracy with last result
    out[q.domain].correct += 0.5 * (st.correct / st.seen) + 0.5 * (st.lastCorrect ? 1 : 0);
  }
  for (const d of Object.values(out)) d.acc = d.total ? d.correct / d.total : 0;
  return out;
}

export function readiness(p: Progress) {
  const acc = domainAccuracy(p);
  const lessonsDone = Object.values(p.lessons).filter((l) => l.completedAt).length;
  const coverage = lessonsDone / outline.length;
  const weightedAcc = (Object.keys(DOMAIN_WEIGHTS) as DomainId[]).reduce((a, d) => a + DOMAIN_WEIGHTS[d] * acc[d].acc, 0);
  const answered = Object.values(acc).reduce((a, d) => a + d.total, 0);
  const confidence = Math.min(1, answered / 120);
  const mocks = p.attempts.filter((a) => (a.kind === 'mock' || a.kind === 'final') && a.finishedAt && a.scaled).sort((a, b) => b.finishedAt! - a.finishedAt!).slice(0, 3);
  const mockAvg = mocks.length ? mocks.reduce((a, m) => a + m.scaled!, 0) / mocks.length : 0;
  // Estimated score: mock results dominate once you have them; otherwise drill accuracy shrunk toward 50% by low confidence.
  const drillEstimate = scaledScore(0.5 + (weightedAcc - 0.5) * confidence);
  const estimate = Math.round(mocks.length ? 0.7 * mockAvg + 0.3 * drillEstimate : drillEstimate);
  const score = Math.round(100 * (0.35 * coverage + 0.65 * Math.min(1, Math.max(0, (estimate - 400) / (800 - 400)))));
  const ready = mocks.filter((m) => m.scaled! >= 750).length >= 2;
  return { acc, coverage, lessonsDone, estimate, score, ready, mocks: mocks.length, pass: estimate >= PASS, answered };
}

export interface BadgeDef { id: string; name: string; desc: string; icon: string; check: (p: Progress) => boolean }
const doneLesson = (p: Progress, id: string) => !!p.lessons[id]?.completedAt;
const moduleDone = (p: Progress, m: string) => outline.filter((o) => o.module === m).every((o) => doneLesson(p, o.id));
const cloud = (p: Progress) => p.cloud;
const bestBoss = (p: Progress, d: DomainId) => Math.max(0, ...p.attempts.filter((a) => a.kind === 'boss' && a.domain === d && a.finishedAt).map((a) => a.correct / a.questionIds.length));

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First Steps', desc: 'Complete your first lesson.', icon: '👣', check: (p) => Object.values(p.lessons).some((l) => l.completedAt) },
  { id: 'root-lock', name: 'Root Locked', desc: 'Enable MFA on the root user in the console.', icon: '🔐', check: (p) => cloud(p).rootMfa },
  { id: 'least-privilege', name: 'Least Privilege', desc: 'Create an IAM user in a group instead of attaching policies directly.', icon: '🪪', check: (p) => cloud(p).iamUsers.some((u) => u.groupIds.length > 0 && u.policyIds.length === 0) },
  { id: 'role-player', name: 'Role Player', desc: 'Attach an IAM role to an EC2 instance.', icon: '🎭', check: (p) => cloud(p).instances.some((i) => i.iamRole && i.state !== 'terminated') },
  { id: 'vpc-architect', name: 'VPC Architect', desc: 'Build a custom VPC with public and private subnets in two AZs.', icon: '🏗️', check: (p) => cloud(p).vpcs.some((v) => !v.isDefault && new Set(cloud(p).subnets.filter((s) => s.vpcId === v.id).map((s) => s.az)).size >= 2 && cloud(p).subnets.filter((s) => s.vpcId === v.id).length >= 4) },
  { id: 'nat-slayer', name: 'NAT Slayer', desc: 'Give private subnets S3 access through a free gateway endpoint.', icon: '🗡️', check: (p) => cloud(p).endpoints.some((e) => e.type === 'Gateway' && e.service.endsWith('s3') && e.routeTableIds.length > 0) },
  { id: 'sg-chain', name: 'Chain Gang', desc: 'Reference one security group from another.', icon: '⛓️', check: (p) => cloud(p).securityGroups.some((sg) => sg.inbound.some((r) => r.source.startsWith('sg-') && r.source !== sg.id)) },
  { id: 'five-nines', name: 'Five Nines', desc: 'Run an Auto Scaling group across 2+ AZs behind a load balancer.', icon: '🛡️', check: (p) => cloud(p).asgs.some((a) => a.targetGroupIds.length > 0 && new Set(a.subnetIds.map((s) => cloud(p).subnets.find((x) => x.id === s)?.az)).size >= 2) },
  { id: 'standby', name: 'Hot Standby', desc: 'Create a Multi-AZ RDS database.', icon: '🧯', check: (p) => cloud(p).dbInstances.some((d) => d.multiAz) },
  { id: 'versioned', name: 'Time Traveller', desc: 'Enable versioning on an S3 bucket.', icon: '⏳', check: (p) => cloud(p).buckets.some((b) => b.versioning === 'Enabled') },
  { id: 'lifecycle', name: 'Glacier Guide', desc: 'Add a lifecycle rule that transitions objects to a colder class.', icon: '🧊', check: (p) => cloud(p).buckets.some((b) => b.lifecycle.some((r) => r.transitions.length > 0)) },
  { id: 'decoupled', name: 'Decoupler', desc: 'Connect an SQS queue (with a DLQ) to a Lambda function.', icon: '📬', check: (p) => cloud(p).lambdas.some((l) => l.triggers.some((t) => t.type === 'sqs')) && cloud(p).queues.some((q) => q.dlqId) },
  { id: 'budget-hawk', name: 'Budget Hawk', desc: 'Create a cost budget with an alert.', icon: '🦅', check: (p) => cloud(p).budgets.length > 0 },
  { id: 'lab-rat', name: 'Lab Rat', desc: 'Complete 5 console labs.', icon: '🧪', check: (p) => Object.values(p.labs).filter((l) => l.completedAt).length >= 5 },
  { id: 'lab-master', name: 'Lab Master', desc: 'Complete 12 console labs.', icon: '🔬', check: (p) => Object.values(p.labs).filter((l) => l.completedAt).length >= 12 },
  { id: 'module-1', name: 'Vault Breaker', desc: 'Finish every Module 1 lesson.', icon: '🏰', check: (p) => moduleDone(p, 'm1') },
  { id: 'module-2', name: 'Fjord Crosser', desc: 'Finish every Module 2 lesson.', icon: '⛵', check: (p) => moduleDone(p, 'm2') },
  { id: 'module-3a', name: 'Hoarder', desc: 'Finish every Module 3a lesson.', icon: '🗄️', check: (p) => moduleDone(p, 'm3a') },
  { id: 'module-3b', name: 'Peak Bagger', desc: 'Finish every Module 3b lesson.', icon: '🏔️', check: (p) => moduleDone(p, 'm3b') },
  { id: 'module-4', name: 'Penny Pincher', desc: 'Finish every Module 4 lesson.', icon: '🪙', check: (p) => moduleDone(p, 'm4') },
  { id: 'module-5', name: 'Gap Closer', desc: 'Finish every Module 5 lesson.', icon: '🧩', check: (p) => moduleDone(p, 'm5') },
  { id: 'century', name: 'Century', desc: 'Answer 100 questions.', icon: '💯', check: (p) => Object.keys(p.questions).length >= 100 },
  { id: 'question-hoard', name: 'Bank Breaker', desc: 'Answer every question in the bank at least once.', icon: '🏦', check: (p) => questionMap.size > 0 && [...questionMap.keys()].every((id) => p.questions[id]) },
  { id: 'card-shark', name: 'Card Shark', desc: 'Review 200 flashcards.', icon: '🃏', check: (p) => Object.values(p.cards).reduce((a, c) => a + c.reps, 0) >= 200 },
  { id: 'streak-7', name: 'Week Warrior', desc: 'Keep a 7-day streak.', icon: '🔥', check: (p) => p.streak.best >= 7 },
  { id: 'streak-30', name: 'Unbreakable', desc: 'Keep a 30-day streak.', icon: '☄️', check: (p) => p.streak.best >= 30 },
  { id: 'architect', name: 'Drawing Board', desc: 'Score 80%+ on an architecture scenario.', icon: '📐', check: (p) => Object.values(p.scenarios).some((s) => s.best >= 80) },
  { id: 'architect-10', name: 'Blueprint Baron', desc: 'Score 80%+ on 10 architecture scenarios.', icon: '🗺️', check: (p) => Object.values(p.scenarios).filter((s) => s.best >= 80).length >= 10 },
  { id: 'boss-secure', name: 'Vault Keeper', desc: 'Defeat the Secure domain boss.', icon: '🗝️', check: (p) => bestBoss(p, 'secure') >= 0.72 },
  { id: 'boss-resilient', name: 'Unsinkable', desc: 'Defeat the Resilient domain boss.', icon: '⚓', check: (p) => bestBoss(p, 'resilient') >= 0.72 },
  { id: 'boss-performance', name: 'Speed Demon', desc: 'Defeat the Performance domain boss.', icon: '⚡', check: (p) => bestBoss(p, 'performance') >= 0.72 },
  { id: 'boss-cost', name: 'Frugal Overlord', desc: 'Defeat the Cost domain boss.', icon: '💰', check: (p) => bestBoss(p, 'cost') >= 0.72 },
  { id: 'first-mock', name: 'Dress Rehearsal', desc: 'Finish a full 65-question mock exam.', icon: '🎬', check: (p) => p.attempts.some((a) => a.kind === 'mock' && a.finishedAt) },
  { id: 'passed-mock', name: 'Passing Grade', desc: 'Score 720+ on a mock exam.', icon: '✅', check: (p) => p.attempts.some((a) => (a.kind === 'mock' || a.kind === 'final') && (a.scaled ?? 0) >= 720) },
  { id: 'final-boss', name: 'Gauntlet Champion', desc: 'Defeat the final boss: 750+ on the final exam.', icon: '👑', check: (p) => p.attempts.some((a) => a.kind === 'final' && (a.scaled ?? 0) >= 750) },
  { id: 'exam-ready', name: 'Exam Ready', desc: 'Score 750+ on two mock or final exams.', icon: '🎓', check: (p) => p.attempts.filter((a) => (a.kind === 'mock' || a.kind === 'final') && (a.scaled ?? 0) >= 750).length >= 2 },
];
