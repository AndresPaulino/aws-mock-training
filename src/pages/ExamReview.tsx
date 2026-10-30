import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import { questionMap, DOMAINS } from '../content';
import { isCorrect } from '../lib/adaptive';
import { PASS } from '../lib/scoring';
import { QuestionCard } from '../ui/QuestionCard';
import { Bar, Btn, Empty, Panel } from '../ui/bits';

export default function ExamReview() {
  const { attemptId = '' } = useParams();
  const a = useStore((s) => s.attempts.find((x) => x.id === attemptId));
  const [filter, setFilter] = useState<'wrong' | 'all' | 'flagged'>('wrong');
  if (!a || !a.finishedAt) return <Empty title="No finished exam here" />;
  const pct = a.correct / a.questionIds.length;
  const passed = a.kind === 'boss' ? pct >= 0.72 : (a.scaled ?? 0) >= PASS;
  const rows = a.questionIds.map((id, i) => ({ q: questionMap.get(id)!, i, picked: a.answers[i], flag: a.flags[i] })).filter((r) => r.q);
  const shown = rows.filter((r) => filter === 'all' || (filter === 'flagged' ? r.flag : !isCorrect(r.q, r.picked)));
  const weakest = DOMAINS.filter((d) => a.perDomain?.[d.id]).sort((x, y) => a.perDomain![x.id]!.correct / a.perDomain![x.id]!.total - a.perDomain![y.id]!.correct / a.perDomain![y.id]!.total)[0];

  return (
    <div className="max-w-[900px] mx-auto">
      <section className={`rounded-3xl p-6 lg:p-8 ${passed ? 'bg-ok text-white' : 'bg-ink text-paper'}`}>
        <p className="opacity-80 capitalize">{a.kind} · {new Date(a.finishedAt).toLocaleString()}</p>
        <div className="flex flex-wrap items-baseline gap-4 mt-1">
          <h1 className="font-display text-6xl font-extrabold tabular-nums">{a.kind === 'boss' ? `${Math.round(pct * 100)}%` : a.scaled}</h1>
          <span className="text-xl font-display font-bold">{passed ? (a.kind === 'boss' ? 'Boss defeated' : 'PASS') : a.kind === 'boss' ? 'Not yet. Need 72%.' : `Below 720 by ${PASS - (a.scaled ?? 0)}`}</span>
        </div>
        <p className="opacity-85 mt-1">{a.correct} of {a.questionIds.length} correct{a.kind !== 'boss' && ' · scaled score is an estimate of the 100–1000 exam scale'}</p>
      </section>
      <Panel title="By domain" className="mt-6">
        <div className="space-y-3">
          {DOMAINS.filter((d) => a.perDomain?.[d.id]).map((d) => { const v = a.perDomain![d.id]!; return (
            <div key={d.id}><div className="flex text-sm mb-1"><span className="font-medium">{d.name}</span><span className="ml-auto tabular-nums">{v.correct}/{v.total} · {Math.round((v.correct / v.total) * 100)}%</span></div><Bar value={v.correct / v.total} color={d.color} /></div>
          ); })}
        </div>
        {weakest && <div className="mt-4 flex flex-wrap gap-2 items-center text-sm"><span>Weakest area: <b>{weakest.short}</b>.</span><Btn kind="ghost" to="/practice?mode=weak">Drill weak spots</Btn><Btn kind="ghost" to="/practice?mode=missed">Retry everything missed</Btn></div>}
      </Panel>
      <div className="flex items-center gap-2 mt-8 mb-3">
        <h2 className="font-display text-2xl font-bold">Review</h2>
        <div className="ml-auto flex gap-1 text-sm">
          {(['wrong', 'flagged', 'all'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full border ${filter === f ? 'bg-ink text-paper border-ink' : 'border-line'}`}>{f === 'wrong' ? `Wrong (${rows.filter((r) => !isCorrect(r.q, r.picked)).length})` : f === 'flagged' ? `Marked (${rows.filter((r) => r.flag).length})` : `All (${rows.length})`}</button>)}
        </div>
      </div>
      <div className="space-y-4">
        {shown.map((r) => <QuestionCard key={r.q.id} q={r.q} review={r.picked ?? []} index={r.i} total={rows.length} />)}
        {!shown.length && <Empty title="Nothing here">No questions match this filter.</Empty>}
      </div>
    </div>
  );
}
