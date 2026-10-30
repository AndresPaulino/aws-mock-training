// Lab guide docked to the right of the console. Steps tick themselves off as the simulated cloud changes.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStore } from '../store/store';
import { getLab } from '../labs';
import { Md } from '../ui/Md';
import { toast } from '../ui/Celebrate';
import { useTutor } from '../ui/Tutor';

export const useActiveLab = create<{ labId: string | null; set: (id: string | null) => void }>()(
  persist((set) => ({ labId: null, set: (labId) => set({ labId }) }), { name: 'console:lab' }),
);

export function LabDrawer({ labId }: { labId: string }) {
  const lab = getLab(labId);
  const cloud = useStore((s) => s.cloud);
  const done = useStore((s) => !!s.labs[labId]?.completedAt);
  const startLab = useStore((s) => s.startLab);
  const completeLab = useStore((s) => s.completeLab);
  const close = useActiveLab((s) => s.set);
  const [hint, setHint] = useState<number | null>(null);
  const [min, setMin] = useState(false);
  const nav = useNavigate();
  const tutor = useTutor();
  const results = lab?.steps.map((s) => { try { return s.check(cloud); } catch { return false; } }) ?? [];
  const current = results.findIndex((r) => !r);
  const all = results.length > 0 && results.every(Boolean);

  useEffect(() => { if (lab) { startLab(lab.id); } }, [lab, startLab]);
  useEffect(() => { if (lab && all && !done) { completeLab(lab.id); toast({ icon: '🧪', title: `Lab complete: ${lab.title}`, body: '+100 XP', big: true }); } }, [all, done, lab, completeLab]);

  if (!lab) return null;
  if (min) return <button onClick={() => setMin(false)} className="fixed right-0 top-1/3 z-40 bg-[#232f3e] text-white px-2 py-4 rounded-l-lg [writing-mode:vertical-rl] font-bold">🧪 Lab {results.filter(Boolean).length}/{results.length}</button>;
  return (
    <aside className="w-[360px] shrink-0 border-l border-[#e9ebed] bg-white h-[calc(100vh-40px)] sticky top-10 overflow-y-auto font-sans" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="px-4 py-3 bg-[#13213a] text-white flex items-center gap-2 sticky top-0">
        <span className="font-display font-bold" style={{ fontFamily: 'var(--font-display)' }}>🧪 Lab</span>
        <span className="text-xs opacity-80 tabular-nums">{results.filter(Boolean).length}/{results.length} steps</span>
        <button className="ml-auto text-sm opacity-80 hover:opacity-100" onClick={() => setMin(true)} title="Minimise">⇥</button>
        <button className="text-sm opacity-80 hover:opacity-100" onClick={() => close(null)} title="Close lab">✕</button>
      </div>
      <div className="p-4">
        <h2 className="text-[20px] font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{lab.title}</h2>
        <div className="text-[14px] mt-2 text-[#414d5c]"><Md text={lab.intro} /></div>
        <button onClick={() => nav(lab.start)} className="text-[13px] !text-[#0972d3] underline mb-3">Open the starting page</button>
        <ol className="space-y-2">
          {lab.steps.map((s, i) => {
            const ok = results[i], isCur = i === current;
            return (
              <li key={i} className={`rounded-lg border px-3 py-2 ${ok ? 'border-[#037f0c] bg-[#f2fcf3]' : isCur ? 'border-[#ff9900] border-2' : 'border-[#e9ebed] opacity-70'}`}>
                <div className="flex gap-2 items-start">
                  <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold ${ok ? 'bg-[#037f0c] text-white' : 'bg-[#e9ebed]'}`}>{ok ? '✓' : i + 1}</span>
                  <div className="min-w-0 text-[14px]">
                    <div className="font-bold">{s.title}</div>
                    {(isCur || !ok) && <div className="text-[#414d5c] mt-0.5"><Md text={s.detail} /></div>}
                    {isCur && <button className="text-[12px] !text-[#0972d3] underline" onClick={() => setHint(hint === i ? null : i)}>{hint === i ? 'Hide hint' : 'Show hint'}</button>}
                    {hint === i && <div className="mt-1 text-[13px] rounded bg-[#fff8ec] px-2 py-1"><Md text={s.hint} /></div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {all ? (
          <div className="mt-4 rounded-lg bg-[#13213a] text-white p-3 text-[14px]">
            <div className="font-bold mb-1">✅ Lab complete</div>
            <Md text={lab.debrief} />
            <Link to="/labs" className="!text-[#ff9900] underline">Next lab</Link>
          </div>
        ) : (
          <button className="mt-4 text-[13px] !text-[#0972d3] underline" onClick={() => tutor.open(`I'm stuck on step ${current + 1} of the "${lab.title}" lab: "${lab.steps[current]?.title}". Give me a hint about what to do in the console.`)}>Stuck? Ask the tutor</button>
        )}
      </div>
    </aside>
  );
}
