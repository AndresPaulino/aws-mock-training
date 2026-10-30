import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { studyPlan } from '../lib/adaptive';
import { outline, getLesson } from '../content';
import { PageTitle, Panel } from '../ui/bits';

export default function Plan() {
  const p = useStore();
  const setProfile = useStore((s) => s.setProfile);
  const plan = studyPlan(p);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const minutesLeft = outline.filter((o) => !p.lessons[o.id]?.completedAt).reduce((a, o) => a + (getLesson(o.id)?.minutes ?? 15), 0);

  return (
    <div>
      <PageTitle title="Study plan" sub={`Spreads the remaining lessons evenly across the weeks before your exam, with the last week kept free for mock exams. It re-plans automatically if you fall behind or get ahead.`} />
      <Panel className="mb-6">
        <div className="flex flex-wrap gap-6 items-end">
          <label><span className="block text-sm font-medium mb-1">Exam date</span><input type="date" className="rounded-lg border border-line bg-paper px-3 py-2" value={p.profile.examDate} onChange={(e) => e.target.value && setProfile({ examDate: e.target.value })} /></label>
          <label><span className="block text-sm font-medium mb-1">Hours / week</span><input type="number" min={1} max={40} className="w-24 rounded-lg border border-line bg-paper px-3 py-2" value={p.profile.hoursPerWeek} onChange={(e) => setProfile({ hoursPerWeek: Number(e.target.value) })} /></label>
          <div className="text-sm"><b>{plan.daysLeft}</b> days left · about <b>{Math.round(minutesLeft / 60)}</b> hours of lessons left, plus labs and practice.</div>
          {plan.behindBy > 0 && <div className="text-sm text-xp-ink">{plan.behindBy} lessons behind ideal pace.</div>}
        </div>
        {p.profile.hoursPerWeek * (plan.daysLeft / 7) < (minutesLeft / 60) * 2.2 && <p className="mt-3 text-sm rounded-lg bg-bad/10 text-bad px-3 py-2">Heads-up: at {p.profile.hoursPerWeek} h/week you have less time than the lessons plus practice need (about 2.2× lesson time). Add hours or move the exam date.</p>}
      </Panel>
      <ol className="space-y-3">
        {plan.weeks.map((w) => {
          const current = w.index === plan.currentWeek;
          return (
            <li key={w.index} className={`rounded-2xl border p-4 ${current ? 'border-ink border-2 bg-surface' : 'border-line bg-surface/60'} ${w.index < plan.currentWeek ? 'opacity-60' : ''}`}>
              <div className="flex items-baseline gap-3"><span className="font-display font-bold text-lg">Week {w.index + 1}</span><span className="text-sm text-muted">{fmt(w.start)} – {fmt(w.end)}</span>{current && <span className="text-xs px-2 py-0.5 rounded-full bg-xp text-[#1b1200] font-semibold">this week</span>}<span className="ml-auto text-sm text-muted">{w.focus}</span></div>
              {w.lessonIds.length > 0 && <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1">{w.lessonIds.map((id) => <li key={id}><Link className="text-[15px] hover:underline" to={`/lesson/${id}`}>{p.lessons[id]?.completedAt ? '✅' : '○'} {outline.find((o) => o.id === id)!.title}</Link></li>)}</ul>}
              {w.isBuffer && <p className="mt-2 text-[15px]">Two full mock exams (aim for 750+), the final boss, and drills on whatever the reviews show is weak. Rest the day before.</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
