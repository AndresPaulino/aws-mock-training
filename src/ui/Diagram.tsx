// Step-through animated architecture diagram. Data comes from content (Diagram type).
import { useEffect, useMemo, useState } from 'react';
import type { Diagram as D, DiagramGroup } from '../content/types';
import { iconInfo } from './ServiceIcon';
import { Md } from './Md';

const GROUP_STYLE: Record<DiagramGroup['kind'], { stroke: string; fill: string; dash?: string; label: string }> = {
  cloud: { stroke: '#232f3e', fill: 'transparent', label: '#232f3e' },
  region: { stroke: '#00a4a6', fill: 'transparent', dash: '1.2 0.8', label: '#00a4a6' },
  vpc: { stroke: '#8c4fff', fill: 'rgba(140,79,255,0.04)', label: '#8c4fff' },
  az: { stroke: '#147eba', fill: 'transparent', dash: '1.5 1', label: '#147eba' },
  'subnet-public': { stroke: '#7aa116', fill: 'rgba(122,161,22,0.08)', label: '#5b7a0c' },
  'subnet-private': { stroke: '#147eba', fill: 'rgba(20,126,186,0.07)', label: '#147eba' },
  onprem: { stroke: '#7d8998', fill: 'rgba(125,137,152,0.08)', label: '#5f6b7a' },
  internet: { stroke: '#7d8998', fill: 'transparent', dash: '0.6 0.6', label: '#5f6b7a' },
  generic: { stroke: '#7d8998', fill: 'transparent', label: '#5f6b7a' },
};

export function Diagram({ diagram, compact }: { diagram: D; compact?: boolean }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const s = diagram.steps[step] ?? diagram.steps[0];
  const nodes = useMemo(() => new Map(diagram.nodes.map((n) => [n.id, n])), [diagram]);
  const hl = new Set(s?.highlight ?? []);
  const fail = new Set(s?.fail ?? []);
  const anyHl = hl.size > 0;

  useEffect(() => { setStep(0); }, [diagram]);
  useEffect(() => {
    if (!playing) return;
    const h = setTimeout(() => (step < diagram.steps.length - 1 ? setStep(step + 1) : setPlaying(false)), 3200);
    return () => clearTimeout(h);
  }, [playing, step, diagram.steps.length]);

  const W = 100, Hh = 60;
  const R = 3.2; // icon half-size
  return (
    <figure className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="px-4 pt-3 flex items-center gap-2">
        <figcaption className="font-display font-semibold">{diagram.title}</figcaption>
        <span className="ml-auto text-xs text-muted tabular-nums">Step {step + 1} / {diagram.steps.length}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${Hh}`} className={`w-full ${compact ? 'max-h-[300px]' : 'max-h-[460px]'} select-none`} role="img" aria-label={diagram.title}>
        <defs>
          <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#7d8998" /></marker>
          <marker id="arrow-hl" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="var(--xp)" /></marker>
        </defs>
        {(diagram.groups ?? []).map((g) => {
          const st = GROUP_STYLE[g.kind] ?? GROUP_STYLE.generic;
          const on = hl.has(g.id), bad = fail.has(g.id);
          return (
            <g key={g.id} opacity={anyHl && !on && !bad ? 0.55 : 1}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={g.kind === 'cloud' || g.kind === 'region' ? 1.2 : 0.8}
                fill={bad ? 'rgba(201,42,58,0.12)' : st.fill} stroke={bad ? 'var(--bad)' : on ? 'var(--xp)' : st.stroke} strokeWidth={on || bad ? 0.45 : 0.25} strokeDasharray={st.dash} />
              <text x={g.x + 0.8} y={g.y + 2.2} fontSize={1.7} fontWeight={600} fill={bad ? 'var(--bad)' : st.label}>{g.label}</text>
              {bad && <text x={g.x + g.w - 2.5} y={g.y + 3} fontSize={3} fill="var(--bad)">✕</text>}
            </g>
          );
        })}
        {diagram.edges.map((e) => {
          const a = nodes.get(e.from), b = nodes.get(e.to);
          if (!a || !b) return null;
          const on = hl.has(e.id), bad = fail.has(e.id);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const x1 = a.x + (dx / len) * (R + 0.6), y1 = a.y + (dy / len) * (R + 0.6), x2 = b.x - (dx / len) * (R + 1), y2 = b.y - (dy / len) * (R + 1);
          const flows = (s?.flow ?? []).filter((f) => f.edge === e.id);
          return (
            <g key={e.id} opacity={anyHl && !on && !bad && !flows.length ? 0.35 : 1}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={bad ? 'var(--bad)' : on || flows.length ? 'var(--xp)' : '#9aa5b4'} strokeWidth={on || flows.length ? 0.5 : 0.3} strokeDasharray={e.dashed ? '1 0.8' : undefined} markerEnd={`url(#${on || flows.length ? 'arrow-hl' : 'arrow'})`} />
              {e.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 0.8} fontSize={1.5} textAnchor="middle" fill="var(--muted)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={0.6}>{e.label}</text>}
              {flows.map((f, i) => {
                const [sx, sy, ex, ey] = f.reverse ? [x2, y2, x1, y1] : [x1, y1, x2, y2];
                return (
                  <circle key={`${step}-${i}`} r={0.9} fill={f.color === 'bad' ? 'var(--bad)' : 'var(--xp)'} stroke="#fff" strokeWidth={0.2}>
                    <animate attributeName="cx" from={sx} to={ex} dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="cy" from={sy} to={ey} dur="1.6s" repeatCount="indefinite" />
                  </circle>
                );
              })}
              {bad && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 1.2} fontSize={3} textAnchor="middle" fill="var(--bad)">✕</text>}
            </g>
          );
        })}
        {diagram.nodes.map((n) => {
          const on = hl.has(n.id), bad = fail.has(n.id);
          const ic = iconInfo(n.icon);
          return (
            <g key={n.id} opacity={anyHl && !on && !bad ? 0.45 : 1} style={{ transition: 'opacity .3s' }}>
              {on && <rect x={n.x - R - 0.7} y={n.y - R - 0.7} width={2 * R + 1.4} height={2 * R + 1.4} rx={1.4} fill="none" stroke="var(--xp)" strokeWidth={0.45} />}
              {ic.emoji
                ? <text x={n.x} y={n.y + 1.6} fontSize={5} textAnchor="middle">{ic.emoji}</text>
                : <>
                    <rect x={n.x - R} y={n.y - R} width={2 * R} height={2 * R} rx={0.9} fill={bad ? 'var(--bad)' : ic.color} />
                    <text x={n.x} y={n.y + 0.55} fontSize={ic.label.length > 5 ? 1.25 : 1.6} fontWeight={700} textAnchor="middle" fill="#fff">{ic.label}</text>
                  </>}
              <text x={n.x} y={n.y + R + 2.1} fontSize={1.6} fontWeight={600} textAnchor="middle" fill="var(--ink)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={0.5}>{n.label}</text>
              {n.sub && <text x={n.x} y={n.y + R + 3.9} fontSize={1.3} textAnchor="middle" fill="var(--muted)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={0.5}>{n.sub}</text>}
              {bad && <text x={n.x + R} y={n.y - R + 0.5} fontSize={3} fill="var(--bad)">✕</text>}
            </g>
          );
        })}
      </svg>
      <div className="px-4 pb-4">
        <div className="min-h-[3.5rem] rounded-lg bg-sunk px-3 py-2 text-[15px]"><Md text={s?.caption ?? ''} /></div>
        <div className="flex items-center gap-2 mt-3">
          <button className="px-3 py-1.5 rounded-lg border border-line disabled:opacity-40" disabled={step === 0} onClick={() => { setPlaying(false); setStep(step - 1); }}>Back</button>
          <button className="px-3 py-1.5 rounded-lg bg-ink text-paper font-medium disabled:opacity-40" disabled={step >= diagram.steps.length - 1} onClick={() => { setPlaying(false); setStep(step + 1); }}>Next step</button>
          <button className="px-3 py-1.5 rounded-lg border border-line" onClick={() => { if (step >= diagram.steps.length - 1) setStep(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Autoplay'}</button>
          <div className="ml-auto flex gap-1" aria-hidden>
            {diagram.steps.map((_, i) => <button key={i} onClick={() => { setPlaying(false); setStep(i); }} className={`w-2.5 h-2.5 rounded-full ${i === step ? 'bg-xp' : i < step ? 'bg-ink/40' : 'bg-line'}`} tabIndex={-1} />)}
          </div>
        </div>
      </div>
    </figure>
  );
}
