// Architecture builder: drag services onto a canvas, connect them, get graded on the Well-Architected pillars.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, addEdge, useNodesState, useEdgesState, Handle, Position, MarkerType, type Connection, type Edge, type Node, type NodeProps, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { scenarios, serviceMap, services, DOMAINS, getLesson } from '../content';
import type { Pillar, Scenario } from '../content/types';
import { grade, type Grade } from '../lib/grade';
import { useStore } from '../store/store';
import { ServiceIcon } from '../ui/ServiceIcon';
import { Md } from '../ui/Md';
import { PageTitle, Btn, Bar, Empty } from '../ui/bits';
import { useTutor, useTutorContext } from '../ui/Tutor';

const PILLAR_NAME: Record<Pillar, string> = { security: 'Security', reliability: 'Reliability', performance: 'Performance efficiency', cost: 'Cost optimization', operations: 'Operational excellence' };
type SvcNode = Node<{ service: string }>;

function ServiceNode({ data, selected }: NodeProps<SvcNode>) {
  const s = serviceMap.get(data.service);
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl bg-surface border-2 ${selected ? 'border-xp' : 'border-transparent'}`} style={{ width: 96 }}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted" />
      <ServiceIcon id={data.service} size={42} />
      <span className="text-[11px] font-semibold text-center leading-tight text-ink">{s?.name.replace(/^(Amazon|AWS) /, '') ?? data.service}</span>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-muted" />
    </div>
  );
}
const nodeTypes = { svc: ServiceNode };
const storeKey = (id: string) => `builder:${id}`;

function Canvas({ scenario }: { scenario?: Scenario }) {
  const id = scenario?.id ?? 'sandbox';
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? 'null'); } catch { return null; } }, [id]);
  const [nodes, setNodes, onNodesChange] = useNodesState<SvcNode>(saved?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(saved?.edges ?? []);
  const [result, setResult] = useState<Grade | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [filter, setFilter] = useState('');
  const rf = useReactFlow();
  const best = useStore((s) => s.scenarios[id]?.best);
  const scoreScenario = useStore((s) => s.scoreScenario);
  const tutor = useTutor();
  const designText = `Design: ${nodes.map((n) => n.data.service).join(', ') || '(empty)'}\nConnections: ${edges.map((e) => `${nodes.find((n) => n.id === e.source)?.data.service}→${nodes.find((n) => n.id === e.target)?.data.service}`).join(', ') || 'none'}`;
  useTutorContext(scenario ? `Architecture challenge: ${scenario.title}` : 'Architecture sandbox', scenario ? `Scenario: ${scenario.brief}\nRequirements: ${scenario.requirements.join('; ')}\n${designText}\nCoach the learner with hints; do not reveal the full solution unless asked.` : designText);

  useEffect(() => { try { localStorage.setItem(storeKey(id), JSON.stringify({ nodes, edges })); } catch { /* storage unavailable */ } }, [id, nodes, edges]);
  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, es)), [setEdges]);
  const add = (service: string, pos?: { x: number; y: number }) => {
    const p = pos ?? { x: 80 + (nodes.length % 5) * 130, y: 60 + Math.floor(nodes.length / 5) * 120 };
    setNodes((ns) => [...ns, { id: `${service}-${Date.now()}-${Math.round(Math.random() * 1e4)}`, type: 'svc', position: p, data: { service } }]);
    setResult(null);
  };
  const palette = (scenario?.palette ?? services.map((s) => s.id)).filter((sid) => !filter || `${sid} ${serviceMap.get(sid)?.name ?? ''}`.toLowerCase().includes(filter.toLowerCase()));
  const run = () => {
    if (!scenario) return;
    const g = grade(scenario, { nodes: nodes.map((n) => ({ id: n.id, service: n.data.service })), edges });
    setResult(g);
    scoreScenario(scenario.id, g.pct);
  };
  const loadSolution = () => {
    if (!scenario) return;
    const ns: SvcNode[] = scenario.solution.services.map((s, i) => ({ id: `sol-${s}-${i}`, type: 'svc', position: { x: 60 + (i % 4) * 170, y: 50 + Math.floor(i / 4) * 140 }, data: { service: s } }));
    const es: Edge[] = scenario.solution.edges.flatMap(([a, b], i) => { const sa = ns.find((n) => n.data.service === a), sb = ns.find((n) => n.data.service === b); return sa && sb ? [{ id: `sol-e${i}`, source: sa.id, target: sb.id, markerEnd: { type: MarkerType.ArrowClosed } }] : []; });
    setNodes(ns); setEdges(es); setResult(null);
    setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
  };

  return (
    <div className="grid lg:grid-cols-[230px_1fr] gap-4">
      <aside className="rounded-2xl border border-line bg-surface p-3 lg:max-h-[640px] overflow-y-auto">
        <div className="font-display font-bold mb-1">Services</div>
        <p className="text-xs text-muted mb-2">Drag onto the canvas or click to add. Connect the right dot of one service to the left dot of another.</p>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="w-full mb-2 rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
        <div className="space-y-1">
          {palette.map((sid) => (
            <button key={sid} draggable onDragStart={(e) => e.dataTransfer.setData('text/service', sid)} onClick={() => add(sid)} className="w-full flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-sunk text-left text-sm">
              <ServiceIcon id={sid} size={26} /><span className="leading-tight">{serviceMap.get(sid)?.name.replace(/^(Amazon|AWS) /, '') ?? sid}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        <div className="h-[520px] lg:h-[640px] rounded-2xl border border-line bg-surface overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const sid = e.dataTransfer.getData('text/service'); if (sid) add(sid, rf.screenToFlowPosition({ x: e.clientX - 48, y: e.clientY - 30 })); }}>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={(c) => { onEdgesChange(c); setResult(null); }} onConnect={onConnect} nodeTypes={nodeTypes} fitView deleteKeyCode={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }}>
            <Background gap={20} />
            <Controls />
          </ReactFlow>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {scenario && <Btn kind="xp" onClick={run} disabled={!nodes.length}>Grade my design</Btn>}
          <Btn kind="ghost" onClick={() => { setNodes([]); setEdges([]); setResult(null); }}>Clear</Btn>
          <Btn kind="ghost" onClick={() => tutor.open(scenario ? 'Review my design so far. Give me hints, not the answer.' : 'Review this architecture: what are its weaknesses on each Well-Architected pillar?')}>Ask the tutor to review</Btn>
          {scenario && (result || best !== undefined) && <Btn kind="ghost" onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Hide' : 'Show'} reference solution</Btn>}
          <span className="ml-auto self-center text-sm text-muted">Select a node or line and press Delete to remove it.</span>
        </div>
        {result && scenario && (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-baseline gap-3"><span className="font-display text-4xl font-extrabold" style={{ color: result.pct >= 80 ? 'var(--ok)' : undefined }}>{result.pct}%</span><span className="text-muted">{result.pct >= 80 ? 'Solid design. A reviewer would sign off.' : result.pct >= 50 ? 'Getting there. Read the hints below.' : 'Major gaps. Start from the requirements list.'}</span></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {(Object.entries(result.pillars) as [Pillar, { got: number; max: number }][]).map(([pl, v]) => <div key={pl}><div className="text-sm flex"><span>{PILLAR_NAME[pl]}</span><span className="ml-auto tabular-nums">{v.got}/{v.max}</span></div><Bar value={v.got / v.max} color={v.got === v.max ? 'var(--ok)' : 'var(--xp)'} /></div>)}
            </div>
            <ul className="mt-4 space-y-2">
              {result.results.map((r, i) => <li key={i} className="flex gap-2 text-[15px]"><span className={r.ok ? 'text-ok' : 'text-bad'}>{r.ok ? '✓' : '✕'}</span><span><span className="text-xs text-muted uppercase-none mr-1">[{PILLAR_NAME[r.rule.pillar]}]</span>{r.ok ? r.rule.pass : r.rule.fail}</span></li>)}
            </ul>
          </div>
        )}
        {showSolution && scenario && (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-surface p-5">
            <div className="flex items-center"><div className="font-display text-xl font-bold">Reference solution</div><Btn kind="ghost" className="ml-auto" onClick={loadSolution}>Load it onto the canvas</Btn></div>
            <div className="flex flex-wrap gap-2 my-3">{scenario.solution.services.map((s, i) => <span key={i} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-line text-sm"><ServiceIcon id={s} size={20} />{serviceMap.get(s)?.name ?? s}</span>)}</div>
            <Md text={scenario.solution.explanation} />
            <div className="font-display font-bold mt-3 mb-1">Trade-offs</div>
            <ul className="list-disc ml-5 space-y-1">{scenario.solution.tradeoffs.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Builder() {
  const { id } = useParams();
  const progress = useStore((s) => s.scenarios);
  const sc = id && id !== 'sandbox' ? scenarios.find((s) => s.id === id) : undefined;
  if (id && id !== 'sandbox' && !sc) return <Empty title="Scenario not found" />;
  if (id) {
    return (
      <div>
        <Link to="/builder" className="text-sm text-muted hover:underline">← All challenges</Link>
        {sc ? (
          <div className="mt-2 mb-5 grid lg:grid-cols-[1fr_340px] gap-5">
            <div><h1 className="font-display text-3xl font-extrabold">{sc.title}</h1><div className="mt-2 text-[16px]"><Md text={sc.brief} /></div></div>
            <div className="rounded-2xl bg-sunk p-4"><div className="font-display font-bold mb-2">Requirements</div><ul className="space-y-1.5 text-[15px]">{sc.requirements.map((r) => <li key={r} className="flex gap-2"><span>▸</span>{r}</li>)}</ul>
              {sc.lessonIds.length > 0 && <div className="text-xs text-muted mt-3">Related: {sc.lessonIds.map((l) => getLesson(l)?.title ?? l).join(', ')}</div>}</div>
          </div>
        ) : <PageTitle title="Sandbox" sub="Free design with every service. Ask the tutor to critique it." />}
        <ReactFlowProvider><Canvas key={id} scenario={sc} /></ReactFlowProvider>
      </div>
    );
  }
  return (
    <div>
      <PageTitle title="Architect" sub="Real-world briefs. Drag services onto a canvas, wire them together, and get graded on the Well-Architected pillars: the same judgement the exam tests, just with a pencil instead of four options.">
        <Btn kind="ghost" to="/builder/sandbox">Open sandbox</Btn>
      </PageTitle>
      {!scenarios.length ? <Empty title="Challenges are being written" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((s) => { const d = DOMAINS.find((x) => x.id === s.domain)!; const b = progress[s.id]?.best; return (
            <Link key={s.id} to={`/builder/${s.id}`} className="rounded-2xl border border-line bg-surface p-4 hover:bg-sunk flex flex-col">
              <div className="flex items-center gap-2 text-xs"><span className="px-2 py-0.5 rounded-full text-white" style={{ background: d.color }}>{d.short}</span><span className="text-muted">{'●'.repeat(s.difficulty)}{'○'.repeat(3 - s.difficulty)}</span>{b !== undefined && <span className="ml-auto font-semibold" style={{ color: b >= 80 ? 'var(--ok)' : undefined }}>Best {b}%</span>}</div>
              <div className="font-display font-bold text-lg mt-2 leading-tight">{s.title}</div>
              <div className="text-sm text-muted mt-1 line-clamp-3">{s.brief}</div>
            </Link>
          ); })}
        </div>
      )}
    </div>
  );
}
