import { useRef, useState } from 'react';
import { useStore } from '../store/store';
import { BADGES, RANKS, rankOf } from '../lib/gamify';
import { exportProgress, importProgress } from '../store/sync';
import { PageTitle, Panel, Btn, Bar } from '../ui/bits';

export default function Profile() {
  const p = useStore();
  const rank = rankOf(p.xp);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  return (
    <div>
      <PageTitle title={p.profile.name} sub={`Level ${rank.level} ${rank.title} · ${p.xp.toLocaleString()} XP · ${Object.keys(p.badges).length}/${BADGES.length} badges`} />
      <Panel title="Rank ladder">
        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {RANKS.map((r, i) => (
            <li key={r.title} className={`rounded-xl px-3 py-2 border ${i + 1 === rank.level ? 'border-xp border-2 bg-xp/10' : i + 1 < rank.level ? 'border-line' : 'border-line opacity-55'}`}>
              <span className="font-display font-bold">{i + 1}. {r.title}</span><span className="block text-xs text-muted">{r.xp.toLocaleString()} XP</span>
              {i + 1 === rank.level && <Bar value={rank.pct} className="mt-1" />}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted mt-3">XP sources: lesson +50 · lab +100 · new correct answer +10 · flashcard +2 · badge +75 · boss defeated +300 · exams ≈ scaled score ÷ 5 · architecture designs up to +150.</p>
      </Panel>
      <h2 className="font-display text-2xl font-bold mt-8 mb-3">Badges</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {BADGES.map((b) => { const got = p.badges[b.id]; return (
          <div key={b.id} className={`rounded-2xl border p-4 ${got ? 'border-xp bg-surface' : 'border-line bg-surface/50'}`}>
            <div className={`text-3xl ${got ? '' : 'grayscale opacity-40'}`}>{b.icon}</div>
            <div className="font-display font-bold mt-1">{b.name}</div>
            <div className="text-sm text-muted">{b.desc}</div>
            {got && <div className="text-xs text-xp-ink mt-1">Earned {new Date(got).toLocaleDateString()}</div>}
          </div>
        ); })}
      </div>
      <Panel title="Your data" className="mt-8">
        <p className="text-[15px]">Progress saves to your browser and, while <code>npm run dev</code> is running, to <code>progress/progress.json</code> in the project. Commit and push that file to continue on another computer: on startup the newer copy wins.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Btn kind="ghost" onClick={exportProgress}>Download backup</Btn>
          <Btn kind="ghost" onClick={() => file.current?.click()}>Restore from backup</Btn>
          <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await importProgress(f); setMsg('Restored.'); } catch (err) { setMsg((err as Error).message); } }} />
          <Btn kind="ghost" onClick={() => { if (confirm('Reset the simulated AWS account to a fresh state? Your XP and lessons are kept.')) p.resetCloud(); }}>Reset mock AWS account</Btn>
          <Btn kind="ghost" onClick={() => p.setProfile({ onboarded: false })}>Edit profile</Btn>
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </Panel>
    </div>
  );
}
