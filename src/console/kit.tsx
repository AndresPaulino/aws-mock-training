// Building blocks for mock AWS console pages (Cloudscape-like look). Every service console uses these.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import type { CloudState } from '../cloud/types';

/** Read the simulated cloud. */
export const useCloud = <T,>(sel: (c: CloudState) => T) => useStore((s) => sel(s.cloud));
export const useCloudActions = () => {
  const s = useStore.getState();
  return { put: s.put, patch: s.patch, remove: s.remove, mutate: s.mutateCloud, log: s.logEvent };
};

export function Page({ title, crumbs = [], info, actions, children }: { title: ReactNode; crumbs?: { label: string; to?: string }[]; info?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-6 py-4 max-w-[1400px]">
      {crumbs.length > 0 && (
        <nav className="text-[13px] mb-2 flex flex-wrap gap-1 items-center">
          {crumbs.map((c, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-[#5f6b7a]">›</span>}{c.to ? <Link to={c.to}>{c.label}</Link> : <span className="text-[#5f6b7a]">{c.label}</span>}</span>)}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-[24px] font-bold leading-tight text-[#000716]">{title}</h1>
        {info && <span className="text-[#0972d3] text-sm font-bold">Info</span>}
        {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, counter, actions, children, desc, className = '' }: { title?: ReactNode; counter?: number; actions?: ReactNode; children: ReactNode; desc?: ReactNode; className?: string }) {
  return (
    <section className={`aws-panel mb-5 ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
          <h2 className="text-[18px] font-bold">{title}{counter !== undefined && <span className="text-[#5f6b7a] font-normal"> ({counter})</span>}</h2>
          {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
          {desc && <p className="basis-full text-[#5f6b7a] text-[13px]">{desc}</p>}
        </div>
      )}
      <div className={title ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Button({ children, onClick, primary, danger, disabled, type = 'button', title }: { children: ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; type?: 'button' | 'submit'; title?: string }) {
  return <button type={type} title={title} onClick={onClick} disabled={disabled} className={`aws-btn ${primary ? 'aws-btn-primary' : ''} ${danger ? 'aws-btn-danger' : ''}`}>{children}</button>;
}

export function Status({ value }: { value: string }) {
  const v = value.toLowerCase();
  const good = ['running', 'available', 'active', 'enabled', 'in-use', 'ok', 'healthy', 'deployed', 'issued', 'attached', 'inservice'].includes(v);
  const pend = ['pending', 'creating', 'modifying', 'rebooting', 'failing-over', 'stopping', 'in progress', 'pending-acceptance', 'insufficient_data', 'deploying'].includes(v);
  const bad = ['stopped', 'terminated', 'deleted', 'failed', 'alarm', 'unhealthy', 'disabled', 'error'].includes(v);
  const color = good ? '#037f0c' : pend ? '#0972d3' : bad ? '#d91515' : '#5f6b7a';
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color }}><span>{good ? '✓' : pend ? '◷' : bad ? '⊗' : '○'}</span>{value}</span>;
}

export interface Column<T> { header: string; cell: (row: T) => ReactNode; width?: string }
/** Resource table with single selection, text filter and pagination-free scrolling. */
export function Table<T extends { id: string }>({ rows, columns, selected, onSelect, empty, filterText }: { rows: T[]; columns: Column<T>[]; selected?: string | null; onSelect?: (id: string | null) => void; empty?: ReactNode; filterText?: (row: T) => string }) {
  const [q, setQ] = useState('');
  const shown = filterText && q ? rows.filter((r) => filterText(r).toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <div>
      {filterText && <input className="aws-input mb-3 max-w-[480px]" placeholder="🔍 Find resources" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="overflow-x-auto">
        <table className="aws-table w-full text-[14px]">
          <thead><tr>{onSelect && <th className="w-8" />}{columns.map((c) => <th key={c.header} style={{ width: c.width }}>{c.header}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} onClick={() => onSelect?.(selected === r.id ? null : r.id)} className={onSelect ? 'cursor-pointer' : ''} style={selected === r.id ? { background: '#f2f8fd' } : undefined}>
                {onSelect && <td><input type="radio" readOnly checked={selected === r.id} aria-label={`Select ${r.id}`} /></td>}
                {columns.map((c) => <td key={c.header}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && <div className="text-center py-8 text-[#5f6b7a]">{empty ?? 'No resources'}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="aws-label">{label}</span>
      {hint && <span className="aws-hint block mb-1">{hint}</span>}
      {children}
      {error && <span className="block text-[#d91515] text-[12px] mt-1">⊗ {error}</span>}
    </label>
  );
}
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`aws-input ${p.className ?? ''}`} />;
export function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; disabled?: boolean }) {
  return (
    <select className="aws-input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex gap-2 items-start mb-3 cursor-pointer">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="font-semibold">{label}</span>{hint && <span className="aws-hint block">{hint}</span>}</span>
    </label>
  );
}
export function MultiCheck({ options, value, onChange }: { options: { value: string; label: ReactNode }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="border border-[#7d8998] rounded-lg max-h-56 overflow-y-auto">
      {options.map((o) => (
        <label key={o.value} className="flex gap-2 items-start px-3 py-1.5 border-b border-[#e9ebed] last:border-0 cursor-pointer hover:bg-[#f4f4f4]">
          <input type="checkbox" className="mt-1" checked={value.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((x) => x !== o.value))} />
          <span>{o.label}</span>
        </label>
      ))}
      {!options.length && <div className="px-3 py-2 text-[#5f6b7a]">Nothing to choose from yet.</div>}
    </div>
  );
}
export function Radios<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: { value: V; label: ReactNode; desc?: ReactNode }[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}>
      {options.map((o) => (
        <label key={o.value} className={`flex gap-2 items-start rounded-lg border-2 px-3 py-2 cursor-pointer ${value === o.value ? 'border-[#0972d3] bg-[#f2f8fd]' : 'border-[#e9ebed]'}`}>
          <input type="radio" className="mt-1" checked={value === o.value} onChange={() => onChange(o.value)} />
          <span><span className="font-semibold block">{o.label}</span>{o.desc && <span className="aws-hint">{o.desc}</span>}</span>
        </label>
      ))}
    </div>
  );
}

/** Key/value grid for detail pages. */
export function KV({ items, cols = 3 }: { items: [string, ReactNode][]; cols?: number }) {
  return (
    <dl className="grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[#5f6b7a] text-[13px] font-bold">{k}</dt><dd className="break-words">{v ?? '–'}</dd></div>)}
    </dl>
  );
}

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="flex gap-1 border-b border-[#e9ebed] mb-4 overflow-x-auto">
        {tabs.map((t, k) => <button key={t.label} onClick={() => setI(k)} className={`px-4 py-2 font-bold whitespace-nowrap ${k === i ? 'text-[#0972d3] border-b-[3px] border-[#0972d3]' : 'text-[#414d5c]'}`}>{t.label}</button>)}
      </div>
      {tabs[i]?.content}
    </div>
  );
}

/** "Learning mode" callout explaining a console choice in exam terms. Distinct from AWS chrome on purpose. */
export function Teach({ title = 'Exam note', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-[#ff9900] bg-[#fff8ec] px-4 py-2.5 my-3 text-[13.5px] text-[#3b2a0b]">
      <span className="font-bold">🎓 {title}: </span>{children}
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'success' | 'warning' | 'error'; children: ReactNode }) {
  const c = { info: ['#0972d3', '#f2f8fd'], success: ['#037f0c', '#f2fcf3'], warning: ['#8d6605', '#fffce9'], error: ['#d91515', '#fff7f7'] }[kind];
  return <div className="rounded-lg border-2 px-4 py-2.5 my-3" style={{ borderColor: c[0], background: c[1] }}>{children}</div>;
}

export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="aws-panel w-full max-w-[600px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-5 pt-4"><h2 className="text-[18px] font-bold">{title}</h2><button className="ml-auto text-xl" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 pb-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Delete confirmation that makes you type the word, like the real console. */
export function ConfirmDelete({ what, onConfirm, onClose, warning }: { what: string; onConfirm: () => void; onClose: () => void; warning?: ReactNode }) {
  const [t, setT] = useState('');
  return (
    <Modal title={`Delete ${what}?`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={t !== 'delete'} onClick={() => { onConfirm(); onClose(); }}>Delete</Button></>}>
      {warning && <Alert kind="warning">{warning}</Alert>}
      <Field label='To confirm deletion, type "delete" in the field.'><Input value={t} onChange={(e) => setT(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}

/** Sticky footer for create forms. */
export function FormFooter({ onCancel, submitLabel, disabled }: { onCancel: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="flex justify-end gap-2 mt-2 mb-10"><Button onClick={onCancel}>Cancel</Button><Button primary type="submit" disabled={disabled}>{submitLabel}</Button></div>;
}

export function SideNav({ title, items }: { title: string; items: ({ label: string; to: string } | { section: string })[] }) {
  return (
    <nav className="w-[240px] shrink-0 bg-white border-r border-[#e9ebed] min-h-full py-4 hidden md:block">
      <div className="px-6 pb-3 text-[18px] font-bold">{title}</div>
      {items.map((it, i) => 'section' in it
        ? <div key={i} className="px-6 pt-4 pb-1 text-[13px] font-bold text-[#414d5c]">{it.section}</div>
        : <Link key={i} to={it.to} className="block px-6 py-1 !text-[#414d5c] hover:!text-[#0972d3] text-[14px]">{it.label}</Link>)}
    </nav>
  );
}

export const fmtDate = (t: number) => new Date(t).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const short = (id: string) => id;
