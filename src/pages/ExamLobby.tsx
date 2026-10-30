import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, type Attempt, type AttemptKind } from '../store/store';
import { buildExam, buildBoss } from '../lib/adaptive';
import { DOMAINS, questions } from '../content';
import type { DomainId } from '../content/types';
import { PageTitle, Panel, Btn } from '../ui/bits';

export function startAttempt(kind: AttemptKind, domain?: DomainId): string {
  const s = useStore.getState();
  const qs = kind === 'boss' && domain ? buildBoss(s, domain, 20) : buildExam(s, kind === 'drill' ? 20 : 65);
  const a: Attempt = {
    id: `${kind}-${Date.now()}`, kind, domain, startedAt: Date.now(),
    durationSec: kind === 'boss' ? 40 * 60 : kind === 'drill' ? 40 * 60 : 130 * 60,
    questionIds: qs.map((q) => q.id), answers: qs.map(() => null), flags: qs.map(() => false), correct: 0,
  };
  s.saveAttempt(a);
  return a.id;
}

export default function ExamLobby() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const attempts = useStore((s) => s.attempts);
  useEffect(() => {
    const st = params.get('start');
    if (st === 'final') nav(`/exam/${startAttempt('final')}`, { replace: true });
    if (st === 'boss') nav(`/exam/${startAttempt('boss', params.get('domain') as DomainId)}`, { replace: true });
  }, []); // eslint-disable-line
  const go = (kind: AttemptKind, d?: DomainId) => nav(`/exam/${startAttempt(kind, d)}`);
  const unfinished = attempts.filter((a) => !a.finishedAt && a.kind !== 'lesson').sort((a, b) => b.startedAt - a.startedAt);
  const finished = attempts.filter((a) => a.finishedAt && a.kind !== 'lesson').sort((a, b) => b.finishedAt! - a.finishedAt!);
  const bossBest = (d: DomainId) => Math.max(0, ...finished.filter((a) => a.kind === 'boss' && a.domain === d).map((a) => Math.round((a.correct / a.questionIds.length) * 100)));
  const finalBest = Math.max(0, ...finished.filter((a) => a.kind === 'final').map((a) => a.scaled ?? 0));
  const enough = questions.length >= 65;

  return (
    <div>
      <PageTitle title="Exams & bosses" sub="Exam conditions: no feedback until you submit. The real SAA-C03 is 65 questions in 130 minutes (50 scored, 15 unscored), with 720 out of 1000 to pass." />
      {unfinished.length > 0 && (
        <Panel title="Resume" className="mb-6">
          {unfinished.slice(0, 3).map((a) => <div key={a.id} className="flex items-center gap-3 py-1"><span className="capitalize">{a.kind}{a.domain ? `: ${a.domain}` : ''}</span><span className="text-muted text-sm">{a.answers.filter(Boolean).length}/{a.questionIds.length} answered</span><Link className="ml-auto underline" to={`/exam/${a.id}`}>Resume</Link></div>)}
        </Panel>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-3xl bg-ink text-paper p-6">
          <div className="text-4xl">👑</div>
          <h2 className="font-display text-3xl font-extrabold mt-2">The Gauntlet Keeper</h2>
          <p className="text-paper/80 mt-1">The final boss: a full 65-question, 130-minute exam. Score 750+ twice (mock or final) and you're exam-ready.</p>
          <p className="mt-3 text-sm text-paper/70">Best: {finalBest || '—'}</p>
          <Btn kind="xp" className="mt-4" onClick={() => go('final')} disabled={!enough}>Face the final boss</Btn>
        </section>
        <Panel title="Mock exam">
          <p className="text-muted">65 questions weighted like the real exam (30/26/24/20 by domain), preferring questions you haven't seen. Same timer.</p>
          <div className="flex gap-2 mt-4"><Btn onClick={() => go('mock')} disabled={!enough}>Start full mock</Btn><Btn kind="ghost" onClick={() => go('drill')}>Half-hour sprint (20)</Btn></div>
          {!enough && <p className="text-sm text-muted mt-2">The question bank is still being filled ({questions.length} so far).</p>}
        </Panel>
      </div>
      <h2 className="font-display text-2xl font-bold mt-10 mb-3">Domain bosses</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DOMAINS.map((d) => { const best = bossBest(d.id); return (
          <div key={d.id} className="rounded-2xl border-2 p-4 bg-surface" style={{ borderColor: d.color }}>
            <div className="text-3xl">{best >= 72 ? '🏆' : '⚔️'}</div>
            <div className="font-display font-bold text-lg mt-1">{d.territory}</div>
            <div className="text-sm text-muted">{d.name}</div>
            <div className="text-sm mt-2">20 hard questions · 40 min · beat 72%</div>
            <div className="text-sm text-muted">Best: {best ? `${best}%` : '—'}</div>
            <button className="mt-3 w-full py-2 rounded-xl text-white font-semibold" style={{ background: d.color }} onClick={() => go('boss', d.id)}>{best >= 72 ? 'Rematch' : 'Fight'}</button>
          </div>
        ); })}
      </div>
      {finished.length > 0 && (
        <Panel title="History" className="mt-10">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1">When</th><th>Type</th><th>Score</th><th>Scaled</th><th /></tr></thead>
            <tbody>{finished.slice(0, 15).map((a) => (
              <tr key={a.id} className="border-t border-line"><td className="py-2">{new Date(a.finishedAt!).toLocaleDateString()}</td><td className="capitalize">{a.kind}{a.domain ? `: ${a.domain}` : ''}</td><td className="tabular-nums">{a.correct}/{a.questionIds.length}</td><td className="tabular-nums" style={{ color: (a.scaled ?? 0) >= 720 ? 'var(--ok)' : undefined }}>{a.scaled ?? '—'}</td><td><Link className="underline" to={`/review/${a.id}`}>Review</Link></td></tr>
            ))}</tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
