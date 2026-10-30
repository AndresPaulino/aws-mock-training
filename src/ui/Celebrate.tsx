// Toasts for XP, badges and rank-ups. Badge checks run whenever progress changes.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useStore } from '../store/store';
import { BADGES, rankOf } from '../lib/gamify';

interface Toast { id: number; title: string; body?: string; icon?: string; big?: boolean }
export const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; drop: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: Date.now() + Math.random() }].slice(-4) })),
  drop: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);

export function useBadgeWatcher() {
  const updatedAt = useStore((s) => s.updatedAt);
  const xp = useStore((s) => s.xp);
  const lastLevel = useRef(rankOf(xp).level);
  useEffect(() => {
    const s = useStore.getState();
    for (const b of BADGES) {
      if (!s.badges[b.id] && b.check(s)) {
        if (s.earnBadge(b.id)) toast({ icon: b.icon, title: `Badge unlocked: ${b.name}`, body: b.desc, big: true });
      }
    }
  }, [updatedAt]);
  useEffect(() => {
    const r = rankOf(xp);
    if (r.level > lastLevel.current) toast({ icon: '⬆️', title: `Rank up! You're now a ${r.title}`, body: `Level ${r.level}`, big: true });
    lastLevel.current = r.level;
  }, [xp]);
}

export function Toaster() {
  const { toasts, drop } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]" aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} t={t} onDone={() => drop(t.id)} />)}
    </div>
  );
}
function ToastItem({ t, onDone }: { t: Toast; onDone: () => void }) {
  const [, set] = useState(0);
  useEffect(() => { const h = setTimeout(onDone, t.big ? 6000 : 3500); return () => clearTimeout(h); }, [onDone, t.big]);
  return (
    <button onClick={onDone} className={`animate-pop text-left flex gap-3 items-start rounded-xl border px-4 py-3 shadow-lg ${t.big ? 'bg-ink text-paper border-ink' : 'bg-surface border-line'}`} onMouseEnter={() => set(1)}>
      {t.icon && <span className="text-2xl leading-none">{t.icon}</span>}
      <span><span className="block font-semibold">{t.title}</span>{t.body && <span className="block text-sm opacity-80">{t.body}</span>}</span>
    </button>
  );
}
