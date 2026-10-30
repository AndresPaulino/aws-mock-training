import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { labs } from '../labs';
import { getLesson } from '../content';
import { PageTitle, Empty } from '../ui/bits';

export default function Labs() {
  const state = useStore((s) => s.labs);
  const cloud = useStore((s) => s.cloud);
  return (
    <div>
      <PageTitle title="Console labs" sub="Hands-on practice in a simulated AWS account: no real account, no bill. Each step is checked live as you click, and resources persist between labs, just like a real account." />
      {!labs.length ? <Empty title="Labs are being built" /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {labs.map((l, i) => {
            const done = state[l.id]?.completedAt;
            const stepsDone = l.steps.filter((s) => { try { return s.check(cloud); } catch { return false; } }).length;
            return (
              <Link key={l.id} to={`/console?lab=${l.id}`} className={`rounded-2xl border p-4 bg-surface hover:bg-sunk flex gap-4 ${done ? 'border-ok' : 'border-line'}`}>
                <span className={`shrink-0 w-10 h-10 rounded-full grid place-items-center font-display font-bold ${done ? 'bg-ok text-white' : 'bg-sunk'}`}>{done ? '✓' : i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-display font-bold">{l.title}</span>
                  <span className="block text-sm text-muted">{getLesson(l.lessonId)?.title ?? ''} · {l.minutes} min · {l.steps.length} steps</span>
                  {!done && stepsDone > 0 && <span className="block text-xs text-xp-ink mt-0.5">{stepsDone}/{l.steps.length} steps already satisfied</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
