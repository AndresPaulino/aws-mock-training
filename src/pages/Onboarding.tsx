import { useState } from 'react';
import { useStore, today } from '../store/store';
import { outline } from '../content';

export default function Onboarding() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const award = useStore((s) => s.award);
  const [name, setName] = useState(profile.name);
  const [examDate, setExamDate] = useState(profile.examDate);
  const [hours, setHours] = useState(profile.hoursPerWeek);
  const weeks = Math.max(1, Math.round((new Date(examDate).getTime() - Date.now()) / (7 * 86400000)));

  return (
    <div className="min-h-full grid place-items-center px-4 py-10" style={{ background: 'radial-gradient(1200px 600px at 20% -10%, color-mix(in srgb, var(--xp) 18%, transparent), transparent), var(--paper)' }}>
      <div className="w-full max-w-[640px]">
        <h1 className="font-display text-5xl sm:text-6xl font-extrabold leading-[0.95] tracking-tight">Cloud<br />Gauntlet</h1>
        <p className="mt-4 text-lg text-muted max-w-[52ch]">A run from zero to AWS Certified Solutions Architect – Associate. You'll practise in a simulated AWS console, design architectures, and fight your way through {outline.length} lessons, four domain bosses and a final exam.</p>
        <form className="mt-8 rounded-2xl border border-line bg-surface p-6 space-y-5" onSubmit={(e) => {
          e.preventDefault();
          setProfile({ name: name.trim() || 'Architect', examDate, hoursPerWeek: hours, startedAt: today(), onboarded: true });
          award(25, 'Started the Gauntlet');
        }}>
          <label className="block">
            <span className="block font-medium mb-1">What should we call you?</span>
            <input className="w-full rounded-lg border border-line bg-paper px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
          </label>
          <div className="grid sm:grid-cols-2 gap-5">
            <label className="block">
              <span className="block font-medium mb-1">Target exam date</span>
              <input type="date" className="w-full rounded-lg border border-line bg-paper px-3 py-2" value={examDate} min={today()} onChange={(e) => setExamDate(e.target.value)} required />
              <span className="text-sm text-muted">{weeks} weeks away</span>
            </label>
            <label className="block">
              <span className="block font-medium mb-1">Study hours per week</span>
              <input type="number" min={1} max={40} className="w-full rounded-lg border border-line bg-paper px-3 py-2" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              <span className="text-sm text-muted">About {Math.round((hours * weeks) / 1)} hours in total</span>
            </label>
          </div>
          <div className="text-sm text-muted rounded-lg bg-sunk p-3">
            Your progress saves automatically to <code>progress/progress.json</code> while <code>npm run dev</code> is running. Commit it with git to carry on from another computer.
          </div>
          <button className="w-full py-3 rounded-xl bg-xp text-[#1b1200] font-display font-bold text-lg hover:brightness-95">Enter the Gauntlet</button>
        </form>
      </div>
    </div>
  );
}
