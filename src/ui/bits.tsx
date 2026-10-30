import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-muted mt-1 max-w-[70ch]">{sub}</p>}
      </div>
      {children && <div className="ml-auto flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function Panel({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {title && <div className="flex items-center mb-3"><h2 className="font-display text-lg font-bold">{title}</h2>{action && <div className="ml-auto text-sm">{action}</div>}</div>}
      {children}
    </section>
  );
}

export function Bar({ value, color = 'var(--xp)', className = '' }: { value: number; color?: string; className?: string }) {
  return <span className={`block h-2 rounded-full bg-sunk overflow-hidden ${className}`}><span className="block h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} /></span>;
}

export function Btn({ to, onClick, children, kind = 'primary', disabled, className = '' }: { to?: string; onClick?: () => void; children: ReactNode; kind?: 'primary' | 'ghost' | 'xp'; disabled?: boolean; className?: string }) {
  const cls = `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-[15px] disabled:opacity-40 ${kind === 'primary' ? 'bg-ink text-paper hover:opacity-90' : kind === 'xp' ? 'bg-xp text-[#1b1200] hover:brightness-95' : 'border border-line hover:bg-sunk'} ${className}`;
  return to ? <Link to={to} className={cls}>{children}</Link> : <button onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-8 text-center"><div className="font-display font-bold text-lg">{title}</div>{children && <div className="text-muted mt-1">{children}</div>}</div>;
}

export const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
