import { Link } from 'react-router-dom';
import { useStore, today } from '../store/store';
import { outline, getLesson, flashcards, DOMAINS, modules } from '../content';
import { readiness, rankOf, BADGES } from '../lib/gamify';
import { studyPlan } from '../lib/adaptive';
import { PASS } from '../lib/scoring';
import { Panel, Bar, Btn } from '../ui/bits';
import { labs } from '../labs';

function ScoreGauge({ score }: { score: number }) {
  const pct = (score - 100) / 900;
  const passPct = (PASS - 100) / 900;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold tabular-nums" style={{ color: score >= PASS ? 'var(--ok)' : 'var(--ink)' }}>{score}</span>
        <span className="text-muted">estimated score / 1000</span>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-sunk">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct * 100}%`, background: score >= PASS ? 'var(--ok)' : 'var(--xp)' }} />
        <div className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-ink" style={{ left: `${passPct * 100}%` }} title="720 to pass" />
      </div>
      <div className="relative text-xs text-muted mt-1 h-4"><span className="absolute -translate-x-1/2" style={{ left: `${passPct * 100}%` }}>720 pass</span></div>
    </div>
  );
}

function Heatmap({ days }: { days: Record<string, number> }) {
  const cells: { d: string; v: number }[] = [];
  const start = new Date(); start.setDate(start.getDate() - 7 * 16 + 1);
  for (let i = 0; i < 7 * 16; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = today(d); cells.push({ d: k, v: days[k] ?? 0 }); }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-[3px] w-fit" aria-label="Study activity, last 16 weeks">
      {cells.map((c) => (
        <span key={c.d} title={`${c.d}: ${c.v} XP`} className="w-3 h-3 rounded-[3px]"
          style={{ background: c.v === 0 ? 'var(--sunk)' : `color-mix(in srgb, var(--xp) ${Math.min(100, 25 + c.v / 3)}%, var(--sunk))` }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const p = useStore();
  const r = readiness(p);
  const rank = rankOf(p.xp);
  const plan = studyPlan(p);
  const week = plan.weeks[plan.currentWeek];
  const next = outline.find((o) => !p.lessons[o.id]?.completedAt);
  const nextLesson = next && getLesson(next.id);
  const nextMod = next && modules.find((m) => m.id === next.module);
  const due = flashcards.filter((c) => (p.cards[c.id]?.due ?? 0) <= Date.now() && (p.cards[c.id] || p.lessons[c.lessonId]?.completedAt)).length;
  const nextLab = labs.find((l) => !p.labs[l.id]?.completedAt);
  const recentBadges = Object.entries(p.badges).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => BADGES.find((b) => b.id === id)).filter(Boolean);
  const missed = Object.values(p.questions).filter((q) => !q.lastCorrect).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-muted">{plan.daysLeft} days to exam day · Week {plan.currentWeek + 1} of {plan.weeks.length}</p>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">Welcome back, {p.profile.name}.</h1>
        </div>
        {plan.behindBy > 0 && <span className="ml-auto text-sm px-3 py-1.5 rounded-full bg-xp/15 text-xp-ink">You're {plan.behindBy} lesson{plan.behindBy > 1 ? 's' : ''} behind pace. The plan has re-spread the rest.</span>}
      </div>

      {/* Next waypoint: the one thing to do now */}
      <section className="rounded-3xl bg-ink text-paper p-6 lg:p-8 relative overflow-hidden">
        <svg className="absolute right-0 top-0 h-full opacity-[0.12] pointer-events-none" viewBox="0 0 300 200" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => <ellipse key={i} cx={230} cy={70} rx={30 + i * 22} ry={18 + i * 14} fill="none" stroke="currentColor" strokeWidth={1.2} />)}
        </svg>
        {nextLesson && next ? (
          <div className="relative max-w-[640px]">
            <p className="text-paper/70 text-sm">Next waypoint · {nextMod?.title}</p>
            <h2 className="font-display text-3xl lg:text-[40px] leading-tight font-extrabold mt-1">{nextLesson.title}</h2>
            <p className="mt-2 text-paper/80">{nextLesson.summary}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Btn kind="xp" to={`/lesson/${next.id}`}>Start lesson · {nextLesson.minutes} min</Btn>
              <Btn kind="ghost" to="/path" className="!border-paper/30 hover:!bg-paper/10">See the whole map</Btn>
            </div>
          </div>
        ) : next ? (
          <div className="relative"><h2 className="font-display text-3xl font-extrabold">{next.title}</h2><p className="text-paper/70 mt-1">This lesson's content is still being written. Check back soon.</p></div>
        ) : (
          <div className="relative"><h2 className="font-display text-3xl font-extrabold">Every lesson done.</h2><p className="text-paper/80 mt-1">Now beat the final boss twice at 750+ to be exam-ready.</p><Btn kind="xp" to="/exam" className="mt-4">Go to the final boss</Btn></div>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Exam readiness" className="lg:col-span-2" action={<Link to="/exam" className="underline">Take a mock exam</Link>}>
          <ScoreGauge score={r.estimate} />
          <p className="text-sm text-muted mt-1">{r.answered < 30 ? 'Answer at least 30 questions for a meaningful estimate.' : r.mocks ? `Based on your last ${r.mocks} mock exam${r.mocks > 1 ? 's' : ''} plus recent practice.` : 'Based on recent practice. A full mock exam sharpens this.'}</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mt-5">
            {DOMAINS.map((d) => (
              <div key={d.id}>
                <div className="flex text-sm mb-1"><span className="font-medium">{d.short}</span><span className="text-muted ml-1">· {Math.round(d.weight * 100)}% of exam</span><span className="ml-auto tabular-nums">{r.acc[d.id].total ? `${Math.round(r.acc[d.id].acc * 100)}%` : '—'}</span></div>
                <Bar value={r.acc[d.id].acc} color={d.color} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <Btn to="/practice?mode=weak">Drill weak spots (10)</Btn>
            {missed > 0 && <Btn kind="ghost" to="/practice?mode=missed">Retry {missed} missed</Btn>}
          </div>
        </Panel>

        <Panel title={rank.title}>
          <div className="text-sm text-muted">Level {rank.level} · {p.xp.toLocaleString()} XP</div>
          <Bar value={rank.pct} className="mt-2" />
          <div className="text-xs text-muted mt-1">{rank.nextTitle ? `${(rank.next - p.xp).toLocaleString()} XP to ${rank.nextTitle}` : 'Max rank'}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-sunk py-2"><div className="font-display text-2xl font-bold">{r.lessonsDone}</div><div className="text-xs text-muted">lessons</div></div>
            <div className="rounded-xl bg-sunk py-2"><div className="font-display text-2xl font-bold">{Object.values(p.labs).filter((l) => l.completedAt).length}</div><div className="text-xs text-muted">labs</div></div>
            <div className="rounded-xl bg-sunk py-2"><div className="font-display text-2xl font-bold">{Object.keys(p.badges).length}</div><div className="text-xs text-muted">badges</div></div>
          </div>
          {recentBadges.length > 0 && <div className="mt-4 flex gap-2 text-2xl">{recentBadges.map((b) => <span key={b!.id} title={b!.name}>{b!.icon}</span>)}</div>}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title={`This week: ${week?.focus ?? ''}`} action={<Link to="/plan" className="underline">Full plan</Link>}>
          {week && week.lessonIds.length ? (
            <ul className="space-y-1.5">
              {week.lessonIds.map((id) => { const o = outline.find((x) => x.id === id)!; const done = !!p.lessons[id]?.completedAt; return (
                <li key={id}><Link to={`/lesson/${id}`} className="flex gap-2 hover:underline"><span>{done ? '✅' : '○'}</span><span className={done ? 'line-through text-muted' : ''}>{o.title}</span></Link></li>
              ); })}
            </ul>
          ) : <p className="text-muted">{week?.isBuffer ? 'Buffer week: mock exams and weak-spot drills.' : 'Nothing scheduled. Review with flashcards or a lab.'}</p>}
        </Panel>
        <Panel title="Keep it fresh">
          <div className="space-y-3">
            <Link to="/flashcards" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-sunk"><span className="text-2xl">🃏</span><span><b>{due} flashcards due</b><span className="block text-sm text-muted">Spaced repetition beats rereading.</span></span></Link>
            {nextLab && <Link to={`/console?lab=${nextLab.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-sunk"><span className="text-2xl">🧪</span><span><b>Lab: {nextLab.title}</b><span className="block text-sm text-muted">{nextLab.minutes} min in the mock console</span></span></Link>}
            <Link to="/builder" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-sunk"><span className="text-2xl">📐</span><span><b>Design an architecture</b><span className="block text-sm text-muted">Graded against the Well-Architected pillars</span></span></Link>
          </div>
        </Panel>
        <Panel title="Study streak">
          <div className="flex items-baseline gap-2 mb-3"><span className="font-display text-4xl font-extrabold">🔥 {p.streak.current}</span><span className="text-muted">days · best {p.streak.best}</span></div>
          <Heatmap days={p.activeDays} />
          <p className="text-xs text-muted mt-2">One missed day a week is forgiven automatically.</p>
        </Panel>
      </div>
    </div>
  );
}
