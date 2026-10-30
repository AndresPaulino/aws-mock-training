import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { rankOf } from '../lib/gamify';
import { onSyncStatus, getSyncStatus, type SyncStatus } from '../store/sync';
import { TutorDrawer, useTutor } from './Tutor';
import { Toaster } from './Celebrate';

const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Base camp', icon: '⛺' },
  { to: '/path', label: 'The Gauntlet', icon: '🗺️' },
  { to: '/console', label: 'AWS Console', icon: '🖥️' },
  { to: '/labs', label: 'Labs', icon: '🧪' },
  { to: '/builder', label: 'Architect', icon: '📐' },
  { to: '/patterns', label: 'Patterns', icon: '🧭' },
  { to: '/practice', label: 'Practice', icon: '🎯' },
  { to: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { to: '/exam', label: 'Exams & bosses', icon: '⚔️' },
  { to: '/services', label: 'Service atlas', icon: '📚' },
  { to: '/plan', label: 'Study plan', icon: '📅' },
];

export function Layout({ children }: { children: ReactNode }) {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);
  const theme = useStore((s) => s.profile.theme);
  const setProfile = useStore((s) => s.setProfile);
  const rank = rankOf(xp);
  const [sync, setSync] = useState<SyncStatus>(getSyncStatus());
  const [navOpen, setNavOpen] = useState(false);
  const tutor = useTutor();
  useEffect(() => { const off = onSyncStatus(setSync); return () => { off(); }; }, []);

  return (
    <div className="min-h-full flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-line flex flex-col transition-transform lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" className="px-5 pt-5 pb-4 block" onClick={() => setNavOpen(false)}>
          <div className="font-display text-[22px] font-extrabold leading-none tracking-tight">Cloud Gauntlet</div>
          <div className="text-xs text-muted mt-1">Zero to SAA-C03</div>
        </Link>
        <nav className="flex-1 overflow-y-auto px-2" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setNavOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] mb-0.5 ${isActive ? 'bg-ink text-paper font-medium' : 'hover:bg-sunk'}`}>
              <span aria-hidden className="w-5 text-center">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line text-xs text-muted flex items-center justify-between">
          <span title={sync === 'file' ? 'Saved to progress/progress.json' : sync === 'local-only' ? 'Saved in this browser only (no dev server)' : sync}>
            {sync === 'file' ? '● Synced to progress.json' : sync === 'saving' ? '◌ Saving…' : sync === 'error' ? '▲ Save failed' : '● Browser storage'}
          </span>
          <button className="px-2 py-1 rounded hover:bg-sunk" onClick={() => setProfile({ theme: theme === 'dark' ? 'light' : 'dark' })} aria-label="Toggle dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 min-w-0 lg:pl-60 flex flex-col">
        <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
            <button className="lg:hidden px-2 py-1 rounded hover:bg-sunk" onClick={() => setNavOpen(true)} aria-label="Open menu">☰</button>
            <Link to="/profile" className="flex items-center gap-3 min-w-0 group" title="Your rank and badges">
              <span className="grid place-items-center w-8 h-8 rounded-full bg-xp text-[#1b1200] font-display font-extrabold text-sm shrink-0">{rank.level}</span>
              <span className="min-w-0 hidden sm:block">
                <span className="block text-sm font-semibold leading-tight truncate group-hover:underline">{rank.title}</span>
                <span className="flex items-center gap-2">
                  <span className="block w-32 h-1.5 rounded-full bg-sunk overflow-hidden"><span className="block h-full bg-xp" style={{ width: `${rank.pct * 100}%` }} /></span>
                  <span className="text-[11px] text-muted tabular-nums">{xp.toLocaleString()} XP</span>
                </span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm tabular-nums px-2.5 py-1 rounded-full bg-surface border border-line" title={`Best streak: ${streak.best} days. One missed day per week is forgiven.`}>
                🔥 {streak.current} day{streak.current === 1 ? '' : 's'}
              </span>
              <button onClick={() => tutor.open()} className="text-sm px-3 py-1.5 rounded-full bg-ink text-paper font-medium hover:opacity-90">
                Ask the tutor
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
      <TutorDrawer />
      <Toaster />
    </div>
  );
}
