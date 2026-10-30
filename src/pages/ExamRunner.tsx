import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore, type Attempt } from '../store/store';
import { questionMap, DOMAINS } from '../content';
import { isCorrect } from '../lib/adaptive';
import { scaledScore } from '../lib/scoring';
import { LETTERS } from '../ui/QuestionCard';
import { Md, MdInline } from '../ui/Md';
import { Btn, Empty, fmtTime } from '../ui/bits';
import { toast } from '../ui/Celebrate';
import type { DomainId } from '../content/types';

export function finishAttempt(a: Attempt): Attempt {
  const s = useStore.getState();
  let correct = 0;
  const perDomain: Attempt['perDomain'] = {};
  a.questionIds.forEach((id, i) => {
    const q = questionMap.get(id);
    if (!q) return;
    const ok = isCorrect(q, a.answers[i]);
    if (ok) correct++;
    const d = (perDomain[q.domain] ??= { correct: 0, total: 0 });
    d.total++; if (ok) d.correct++;
    if (a.answers[i]) s.recordAnswer(id, ok);
  });
  const done: Attempt = { ...a, finishedAt: Date.now(), correct, perDomain, scaled: a.kind === 'boss' ? undefined : scaledScore(correct / a.questionIds.length) };
  s.saveAttempt(done);
  const pct = correct / a.questionIds.length;
  if (a.kind === 'boss') {
    s.award(pct >= 0.72 ? 300 : 50, pct >= 0.72 ? 'Boss defeated' : 'Boss attempt');
    toast({ icon: pct >= 0.72 ? '🏆' : '💀', title: pct >= 0.72 ? 'Boss defeated!' : 'The boss stands', body: `${Math.round(pct * 100)}%: ${pct >= 0.72 ? '+300 XP' : 'need 72%. Review and try again.'}`, big: true });
  } else {
    s.award(Math.round((done.scaled ?? 0) / 5), `${a.kind} exam`);
    if (a.kind === 'final' && (done.scaled ?? 0) >= 750) toast({ icon: '👑', title: 'The Gauntlet Keeper falls!', body: `Scaled ${done.scaled}.`, big: true });
  }
  return done;
}

export default function ExamRunner() {
  const { attemptId = '' } = useParams();
  const nav = useNavigate();
  const attempt = useStore((s) => s.attempts.find((a) => a.id === attemptId));
  const save = useStore((s) => s.saveAttempt);
  const [i, setI] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showGrid, setShowGrid] = useState(false);
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);

  const left = attempt ? attempt.durationSec - (now - attempt.startedAt) / 1000 : 0;
  useEffect(() => {
    if (!attempt) return;
    if (attempt.finishedAt) nav(`/review/${attempt.id}`, { replace: true });
    else if (left <= 0) { finishAttempt(attempt); nav(`/review/${attempt.id}`, { replace: true }); }
  }, [left, attempt, nav]);

  if (!attempt) return <Empty title="Exam not found" />;
  if (attempt.finishedAt) return null;
  const q = questionMap.get(attempt.questionIds[i]);
  if (!q) return <Empty title="Question missing" />;
  const picked = attempt.answers[i] ?? [];
  const multi = q.answer.length > 1;
  const answeredCount = attempt.answers.filter((x) => x && x.length).length;
  const set = (patch: Partial<Attempt>) => save({ ...attempt, ...patch });
  const choose = (k: number) => {
    const cur = picked;
    const nextPick = !multi ? [k] : cur.includes(k) ? cur.filter((x) => x !== k) : cur.length < q.answer.length ? [...cur, k] : cur;
    const answers = [...attempt.answers]; answers[i] = nextPick; set({ answers });
  };
  const submit = () => {
    const unanswered = attempt.questionIds.length - answeredCount;
    if (!confirm(unanswered ? `${unanswered} unanswered. Unanswered questions score zero. Submit anyway?` : 'Submit your exam?')) return;
    finishAttempt(attempt);
    nav(`/review/${attempt.id}`);
  };
  const title = attempt.kind === 'boss' ? `Boss: ${DOMAINS.find((d) => d.id === (attempt.domain as DomainId))?.territory}` : attempt.kind === 'final' ? 'Final boss: SAA-C03 simulation' : attempt.kind === 'drill' ? 'Sprint' : 'Mock exam: SAA-C03';

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="sticky top-14 z-10 -mx-4 lg:-mx-8 px-4 lg:px-8 py-2 bg-paper border-b border-line flex items-center gap-3">
        <span className="font-display font-bold truncate">{title}</span>
        <span className="text-sm text-muted tabular-nums">{answeredCount}/{attempt.questionIds.length} answered</span>
        <span className={`ml-auto font-mono tabular-nums px-2 py-0.5 rounded ${left < 600 ? 'bg-bad/15 text-bad' : 'bg-sunk'}`} aria-label="Time remaining">⏱ {fmtTime(Math.max(0, left))}</span>
        <button className="text-sm px-3 py-1 rounded-lg border border-line" onClick={() => setShowGrid(!showGrid)}>Review grid</button>
        <button className="text-sm px-3 py-1 rounded-lg bg-ink text-paper" onClick={submit}>End exam</button>
      </div>
      {showGrid && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <div className="grid grid-cols-10 sm:grid-cols-13 gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2.4rem, 1fr))' }}>
            {attempt.questionIds.map((_, k) => (
              <button key={k} onClick={() => { setI(k); setShowGrid(false); }}
                className={`h-9 rounded-md text-sm tabular-nums border ${k === i ? 'border-ink border-2' : 'border-line'} ${attempt.answers[k]?.length ? 'bg-ink/10' : ''} ${attempt.flags[k] ? 'ring-2 ring-xp' : ''}`}>{k + 1}</button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Shaded = answered · orange ring = marked for review</p>
        </div>
      )}
      <article className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center text-sm text-muted mb-3">
          <span>Question {i + 1} of {attempt.questionIds.length}</span>
          <label className="ml-auto flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={attempt.flags[i]} onChange={() => { const flags = [...attempt.flags]; flags[i] = !flags[i]; set({ flags }); }} /> Mark for review</label>
        </div>
        <div className="text-[17px] leading-relaxed mb-4"><Md text={q.stem} /></div>
        <div className="space-y-2">
          {q.options.map((o, k) => (
            <button key={k} onClick={() => choose(k)} className={`w-full text-left flex gap-3 items-start rounded-xl border-2 px-4 py-3 ${picked.includes(k) ? 'border-ink bg-sunk' : 'border-line hover:border-muted'}`}>
              <span className={`shrink-0 w-7 h-7 grid place-items-center ${multi ? 'rounded-md' : 'rounded-full'} border-2 font-semibold text-sm ${picked.includes(k) ? 'bg-ink text-paper border-ink' : 'border-line'}`}>{LETTERS[k]}</span>
              <span className="pt-0.5"><MdInline text={o} /></span>
            </button>
          ))}
        </div>
      </article>
      <div className="mt-4 flex items-center gap-2">
        <Btn kind="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Btn>
        <Btn className="ml-auto" onClick={() => (i + 1 < attempt.questionIds.length ? setI(i + 1) : setShowGrid(true))}>{i + 1 < attempt.questionIds.length ? 'Next' : 'Review answers'}</Btn>
      </div>
      <p className="text-xs text-muted mt-6">Tip: on the real exam, answer every question (there's no penalty for guessing), mark the doubtful ones and come back. Budget about 2 minutes per question. The tutor is off during exams.</p>
    </div>
  );
}
