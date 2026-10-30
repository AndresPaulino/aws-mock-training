// The Gauntlet: a winding trail through every lesson, with a boss gate at the end of each territory.
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { outline, modules, getLesson, DOMAINS } from '../content';
import type { DomainId, ModuleId } from '../content/types';
import { PageTitle } from '../ui/bits';

const MODULE_TERRITORY: Record<ModuleId, { domain: DomainId | 'final'; color: string; boss?: { domain: DomainId | 'final'; name: string } }> = {
  m1: { domain: 'secure', color: 'var(--d-secure)', boss: { domain: 'secure', name: 'The Warden of the Iron Vault' } },
  m2: { domain: 'resilient', color: 'var(--d-resilient)', boss: { domain: 'resilient', name: 'The Leviathan of Failover Fjords' } },
  m3a: { domain: 'performance', color: 'var(--d-performance)' },
  m3b: { domain: 'performance', color: 'var(--d-performance)', boss: { domain: 'performance', name: 'The Titan of the Latency Peaks' } },
  m4: { domain: 'cost', color: 'var(--d-cost)', boss: { domain: 'cost', name: 'The Miser of the Frugal Flats' } },
  m5: { domain: 'final', color: 'var(--d-foundations)', boss: { domain: 'final', name: 'The Gauntlet Keeper (final exam)' } },
};

type Item = { kind: 'header'; module: ModuleId } | { kind: 'lesson'; id: string; module: ModuleId; n: number } | { kind: 'boss'; module: ModuleId };

export default function PathMap() {
  const p = useStore();
  const items: Item[] = [];
  let n = 0;
  for (const m of modules) {
    items.push({ kind: 'header', module: m.id });
    for (const o of outline.filter((x) => x.module === m.id)) items.push({ kind: 'lesson', id: o.id, module: m.id, n: ++n });
    if (MODULE_TERRITORY[m.id].boss) items.push({ kind: 'boss', module: m.id });
  }
  const nextId = outline.find((o) => !p.lessons[o.id]?.completedAt)?.id;
  const bossBest = (d: DomainId | 'final') => Math.max(0, ...p.attempts.filter((a) => a.finishedAt && (d === 'final' ? a.kind === 'final' : a.kind === 'boss' && a.domain === d)).map((a) => (d === 'final' ? a.scaled ?? 0 : Math.round((a.correct / a.questionIds.length) * 100))));

  // Layout: each item takes a row; lesson nodes snake left↔right.
  const ROW = 84, HEADER = 120;
  let y = 30, k = 0;
  const pos = items.map((it) => {
    if (it.kind === 'header') { const r = { x: 50, y }; y += HEADER; return r; }
    const x = it.kind === 'boss' ? 50 : 50 + 30 * Math.sin(k++ * 0.85);
    const r = { x, y: y + 30 };
    y += it.kind === 'boss' ? ROW + 50 : ROW;
    return r;
  });
  const H = y + 40;
  const pts = items.map((it, i) => ({ it, ...pos[i] })).filter((x) => x.it.kind !== 'header');
  let d = '';
  pts.forEach((pt, i) => {
    if (i === 0) d = `M ${pt.x} ${pt.y}`;
    else { const prev = pts[i - 1]; const my = (prev.y + pt.y) / 2; d += ` C ${prev.x} ${my}, ${pt.x} ${my}, ${pt.x} ${pt.y}`; }
  });
  const doneCount = outline.filter((o) => p.lessons[o.id]?.completedAt).length;

  return (
    <div>
      <PageTitle title="The Gauntlet" sub={`${doneCount} of ${outline.length} waypoints cleared. Follow the trail in order, or jump ahead: nothing is locked. Each territory ends with a boss: 20 hard questions on its domain, and 72% defeats it.`} />
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        {DOMAINS.map((dm) => <span key={dm.id} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: dm.color }} />{dm.territory}</span>)}
      </div>
      <div className="relative mx-auto max-w-[760px] rounded-3xl border border-line overflow-hidden" style={{ height: H, background: 'var(--surface)' }}>
        {/* contour texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" aria-hidden>
          <defs><pattern id="topo" width="220" height="220" patternUnits="userSpaceOnUse">
            {Array.from({ length: 6 }).map((_, i) => <ellipse key={i} cx="110" cy="110" rx={18 + i * 17} ry={12 + i * 13} fill="none" stroke="currentColor" strokeWidth="1.3" />)}
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#topo)" />
        </svg>
        <svg className="absolute inset-0 w-full" style={{ height: H }} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
          <path d={d} fill="none" stroke="var(--line)" strokeWidth="10" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          <path d={d} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="2 9" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        {items.map((it, i) => {
          const { x, y: yy } = pos[i];
          const terr = MODULE_TERRITORY[it.module];
          if (it.kind === 'header') {
            const m = modules.find((mm) => mm.id === it.module)!;
            const ids = outline.filter((o) => o.module === it.module).map((o) => o.id);
            const done = ids.filter((id) => p.lessons[id]?.completedAt).length;
            return (
              <div key={`h-${it.module}`} className="absolute left-4 right-4 rounded-2xl px-5 py-3 text-white" style={{ top: yy, background: terr.color }}>
                <div className="flex items-baseline gap-2"><span className="font-display text-xl font-extrabold">Module {it.module.slice(1).toUpperCase()}: {m.title}</span><span className="ml-auto text-sm opacity-90 tabular-nums">{done}/{ids.length}</span></div>
                <div className="text-sm opacity-90">{m.blurb}</div>
              </div>
            );
          }
          if (it.kind === 'boss') {
            const b = terr.boss!;
            const best = bossBest(b.domain);
            const beaten = b.domain === 'final' ? best >= 750 : best >= 72;
            return (
              <Link key={`b-${it.module}`} to={b.domain === 'final' ? '/exam?start=final' : `/exam?start=boss&domain=${b.domain}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group" style={{ left: `${x}%`, top: yy }}>
                <span className={`w-20 h-20 rounded-2xl rotate-45 grid place-items-center border-4 shadow-lg transition-transform group-hover:scale-105 ${beaten ? 'bg-ok border-ok' : 'bg-ink border-xp'}`}>
                  <span className="-rotate-45 text-3xl">{beaten ? '🏆' : b.domain === 'final' ? '👑' : '⚔️'}</span>
                </span>
                <span className="mt-4 text-center text-sm font-semibold bg-surface/90 px-2 rounded max-w-[220px]">{b.name}</span>
                <span className="text-xs text-muted bg-surface/90 px-2 rounded">{best ? `Best: ${best}${b.domain === 'final' ? '' : '%'}` : 'Not attempted'}</span>
              </Link>
            );
          }
          const l = getLesson(it.id);
          const o = outline.find((x2) => x2.id === it.id)!;
          const done = !!p.lessons[it.id]?.completedAt;
          const isNext = it.id === nextId;
          return (
            <Link key={it.id} to={`/lesson/${it.id}`} className="absolute flex items-center gap-3 group"
              style={{ left: `${x}%`, top: yy, transform: `translate(${x > 50 ? 'calc(-100% + 22px)' : '-22px'}, -50%)`, flexDirection: x > 50 ? 'row-reverse' : 'row' }}>
              <span className={`relative shrink-0 w-11 h-11 rounded-full grid place-items-center font-display font-bold border-[3px] transition-transform group-hover:scale-110 ${done ? 'text-white' : 'bg-surface'} ${!l ? 'opacity-50' : ''}`}
                style={{ borderColor: terr.color, background: done ? terr.color : undefined }}>
                {done ? '✓' : it.n}
                {isNext && <span className="absolute -inset-2 rounded-full border-2 border-xp animate-ping" />}
              </span>
              <span className={`max-w-[260px] text-[14px] leading-tight bg-surface/95 px-2 py-1 rounded-lg ${isNext ? 'font-semibold ring-2 ring-xp' : ''} ${x > 50 ? 'text-right' : ''}`}>
                {o.title}
                <span className="block text-xs text-muted">{l ? `${l.minutes} min${p.lessons[it.id]?.visitedAt && !done ? ' · in progress' : ''}` : 'coming soon'}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
