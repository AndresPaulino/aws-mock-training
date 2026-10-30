import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Panel, Button, Field, Select, Input, Teach, Alert, useCloud } from '../../kit';
import { analyze, type Target, type Trace } from '../../../cloud/reach';
import { useStore } from '../../../store/store';

export function Reachability() {
  const instances = useCloud((c) => c.instances.filter((i) => i.state !== 'terminated'));
  const [src, setSrc] = useState(instances[0]?.id ?? '');
  const [kind, setKind] = useState<Target['kind']>('internet-out');
  const [port, setPort] = useState(443);
  const [dst, setDst] = useState(instances[1]?.id ?? instances[0]?.id ?? '');
  const [trace, setTrace] = useState<Trace | null>(null);
  const run = () => {
    const t: Target = kind === 's3' ? { kind } : kind === 'instance' ? { kind, instanceId: dst, port } : { kind, port };
    setTrace(analyze(useStore.getState().cloud, src, t));
  };
  return (
    <Page title="Reachability Analyzer" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Reachability Analyzer' }]}>
      <Teach title="How to use this">Pick an instance and a destination. The analyzer walks the same path a real packet takes (<b>security group → NACL → route table → gateway</b>) and tells you exactly which hop allows or blocks it. Break things on purpose (remove a route, add a NACL deny) and re-run: it's the fastest way to make VPC questions easy.</Teach>
      {!instances.length ? <Alert>Launch an instance first (<Link to="/console/ec2/instances/launch">EC2 → Launch instances</Link>).</Alert> : (
        <Panel title="Analyze path">
          <div className="grid md:grid-cols-4 gap-4">
            <Field label="Source"><Select value={src} onChange={setSrc} options={instances.map((i) => ({ value: i.id, label: `${i.name || i.id} (${i.privateIp})` }))} /></Field>
            <Field label="Destination"><Select value={kind} onChange={(v) => { setKind(v as Target['kind']); setPort(v === 'internet-in' ? 80 : 443); }} options={[{ value: 'internet-out', label: 'Internet (outbound)' }, { value: 'internet-in', label: 'From the internet (inbound)' }, { value: 's3', label: 'Amazon S3' }, { value: 'instance', label: 'Another instance' }]} /></Field>
            {kind === 'instance' && <Field label="Destination instance"><Select value={dst} onChange={setDst} options={instances.map((i) => ({ value: i.id, label: `${i.name || i.id} (${i.privateIp})` }))} /></Field>}
            {kind !== 's3' && <Field label="Port"><Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} /></Field>}
          </div>
          <Button primary onClick={run}>Analyze path</Button>
        </Panel>
      )}
      {trace && (
        <Panel title={trace.ok ? '✓ Reachable' : '⊗ Not reachable'} desc={trace.summary}>
          <ol className="relative border-l-2 border-[#e9ebed] ml-3">
            {trace.hops.map((h, i) => (
              <li key={i} className="ml-5 mb-4">
                <span className={`absolute -left-[11px] w-5 h-5 rounded-full grid place-items-center text-[11px] text-white ${h.ok ? 'bg-[#037f0c]' : 'bg-[#d91515]'}`}>{h.ok ? '✓' : '✕'}</span>
                <div className="font-bold">{h.label}</div>
                <div className="text-[#414d5c]">{h.detail}</div>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </Page>
  );
}
