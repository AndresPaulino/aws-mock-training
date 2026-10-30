import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/store';
import { pickDrill } from '../lib/adaptive';
import { DOMAINS, questions, modules, outline } from '../content';
import type { DomainId, Question } from '../content/types';
import { QuestionCard } from '../ui/QuestionCard';
import { PageTitle, Panel, Btn, Empty } from '../ui/bits';

type Mode = 'weak' | 'domain' | 'missed' | 'flagged' | 'module' | 'new';

export default function Practice() {
  const [params] = useSearchParams();
  const p = useStore();
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'weak');
  const [domain, setDomain] = useState<DomainId>('secure');
  const [mod, setMod] = useState('m1');
  const [count, setCount] = useState(10);
  const [session, setSession] = useState<Question[] | null>(params.get('mode') ? null : null);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const missed = Object.entries(p.questions).filter(([, s]) => !s.lastCorrect).length;
  const flagged = Object.values(p.questions).filter((s) => s.flagged).length;
  const unseen = questions.filter((q) => !p.questions[q.id]).length;

  const start = () => {
    const opts = { count,
      ...(mode === 'domain' && { domain }),
      ...(mode === 'missed' && { missedOnly: true }),
      ...(mode === 'flagged' && { flaggedOnly: true }),
      ...(mode === 'module' && { lessonIds: outline.filter((o) => o.module === mod).map((o) => o.id) }),
      ...(mode === 'weak' && { onlyCompletedLessons: true }) };
    let qs = pickDrill(p, opts);
    if (mode === 'new') qs = pickDrill(p, { count: 200 }).filter((q) => !p.questions[q.id]).slice(0, count);
    setSession(qs); setI(0); setRight(0);
  };
  useMemo(() => { if (params.get('mode') && !session) setTimeout(start, 0); }, []); // eslint-disable-line

  if (session) {
    if (!session.length) return <div><PageTitle title="Practice" /><Empty title="No questions match">Try another mode.</Empty><Btn className="mt-4" onClick={() => setSession(null)}>Back</Btn></div>;
    if (i >= session.length) return (
      <div className="max-w-[640px] mx-auto text-center py-10">
        <div className="text-5xl">{right / session.length >= 0.72 ? '🎯' : '🧗'}</div>
        <h1 className="font-display text-4xl font-extrabold mt-3">{right} / {session.length}</h1>
        <p className="text-muted mt-2">{right / session.length >= 0.72 ? 'Above the pass line. Keep the streak going.' : 'Below 72%. Those misses come back sooner, which is the point.'}</p>
        <div className="flex justify-center gap-2 mt-6"><Btn onClick={start}>Another round</Btn><Btn kind="ghost" onClick={() => setSession(null)}>Change mode</Btn></div>
      </div>
    );
    return (
      <div className="max-w-[820px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button className="text-sm underline" onClick={() => setSession(null)}>End session</button>
          <div className="flex-1 h-1.5 rounded-full bg-sunk overflow-hidden"><div className="h-full bg-xp" style={{ width: `${(i / session.length) * 100}%` }} /></div>
          <span className="text-sm tabular-nums text-muted">{right} correct</span>
        </div>
        <QuestionCard key={session[i].id} q={session[i]} index={i} total={session.length} onAnswered={(ok) => ok && setRight((r) => r + 1)} />
        <div className="mt-3 flex justify-end"><Btn onClick={() => setI(i + 1)}>{i + 1 < session.length ? 'Next question' : 'Finish'}</Btn></div>
      </div>
    );
  }

  const MODES: { id: Mode; title: string; desc: string; disabled?: boolean }[] = [
    { id: 'weak', title: 'Adaptive drill', desc: 'Weights your weakest domains and the questions you missed or are due to review.' },
    { id: 'new', title: 'Unseen questions', desc: `${unseen} questions you have never answered.`, disabled: !unseen },
    { id: 'domain', title: 'One domain', desc: 'Focus a single exam domain.' },
    { id: 'module', title: 'One module', desc: 'Questions tied to one module’s lessons.' },
    { id: 'missed', title: 'Retry missed', desc: `${missed} questions you got wrong last time.`, disabled: !missed },
    { id: 'flagged', title: 'Flagged', desc: `${flagged} questions you flagged.`, disabled: !flagged },
  ];
  return (
    <div>
      <PageTitle title="Practice" sub={`${questions.length} original SAA-C03-style questions with explanations for every option. Answers update your readiness score and spaced-repetition schedule.`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODES.map((m) => (
          <button key={m.id} disabled={m.disabled} onClick={() => setMode(m.id)} className={`text-left rounded-2xl border-2 p-4 disabled:opacity-40 ${mode === m.id ? 'border-ink bg-surface' : 'border-line hover:border-muted'}`}>
            <div className="font-display font-bold text-lg">{m.title}</div>
            <div className="text-sm text-muted">{m.desc}</div>
          </button>
        ))}
      </div>
      <Panel className="mt-6">
        <div className="flex flex-wrap items-end gap-4">
          {mode === 'domain' && <label><span className="block text-sm font-medium mb-1">Domain</span><select className="rounded-lg border border-line bg-paper px-3 py-2" value={domain} onChange={(e) => setDomain(e.target.value as DomainId)}>{DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
          {mode === 'module' && <label><span className="block text-sm font-medium mb-1">Module</span><select className="rounded-lg border border-line bg-paper px-3 py-2" value={mod} onChange={(e) => setMod(e.target.value)}>{modules.map((m) => <option key={m.id} value={m.id}>{m.id.toUpperCase()}: {m.title}</option>)}</select></label>}
          <label><span className="block text-sm font-medium mb-1">Questions</span><select className="rounded-lg border border-line bg-paper px-3 py-2" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 10, 20, 30].map((n) => <option key={n}>{n}</option>)}</select></label>
          <Btn kind="xp" onClick={start}>Start</Btn>
        </div>
      </Panel>
    </div>
  );
}
