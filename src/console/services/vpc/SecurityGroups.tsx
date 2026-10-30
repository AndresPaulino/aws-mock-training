// Security groups: shared by the VPC and EC2 consoles (basePath tells links where they live).
import { useState } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import type { Protocol, SecurityGroup, SgRule } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { useStore } from '../../../store/store';
import { parseCidr } from '../../../cloud/net';
import { Page, Panel, Button, Table, Field, Input, Select, KV, Tabs, Teach, ConfirmDelete, FormFooter, Alert, useCloud, useCloudActions } from '../../kit';

const PRESETS: { label: string; protocol: Protocol; from: number; to: number }[] = [
  { label: 'Custom TCP', protocol: 'tcp', from: 8080, to: 8080 },
  { label: 'SSH', protocol: 'tcp', from: 22, to: 22 },
  { label: 'HTTP', protocol: 'tcp', from: 80, to: 80 },
  { label: 'HTTPS', protocol: 'tcp', from: 443, to: 443 },
  { label: 'RDP', protocol: 'tcp', from: 3389, to: 3389 },
  { label: 'MYSQL/Aurora', protocol: 'tcp', from: 3306, to: 3306 },
  { label: 'PostgreSQL', protocol: 'tcp', from: 5432, to: 5432 },
  { label: 'Redis', protocol: 'tcp', from: 6379, to: 6379 },
  { label: 'NFS', protocol: 'tcp', from: 2049, to: 2049 },
  { label: 'All traffic', protocol: 'all', from: 0, to: 65535 },
];
const portText = (r: SgRule) => (r.protocol === 'all' ? 'All' : r.from === r.to ? String(r.from) : `${r.from} - ${r.to}`);
const typeText = (r: SgRule) => PRESETS.find((p) => p.protocol === r.protocol && p.from === r.from && p.to === r.to && p.label !== 'Custom TCP')?.label ?? (r.protocol === 'all' ? 'All traffic' : `Custom ${r.protocol.toUpperCase()}`);

export function RuleEditor({ rules, onChange, dir, vpcId }: { rules: SgRule[]; onChange: (r: SgRule[]) => void; dir: 'inbound' | 'outbound'; vpcId: string }) {
  const sgs = useCloud((c) => c.securityGroups.filter((s) => s.vpcId === vpcId));
  const set = (i: number, patch: Partial<SgRule>) => onChange(rules.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div>
      {rules.map((r, i) => {
        const srcBad = !r.source.startsWith('sg-') && !parseCidr(r.source);
        return (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
            <div className="col-span-3"><Select value={typeText(r)} onChange={(v) => { const p = PRESETS.find((x) => x.label === v)!; set(i, { protocol: p.protocol, from: p.from, to: p.to }); }} options={[...new Set([typeText(r), ...PRESETS.map((p) => p.label)])]} /></div>
            <div className="col-span-2"><Input value={r.protocol === 'all' ? 'All' : r.from === r.to ? String(r.from) : `${r.from}-${r.to}`} disabled={r.protocol === 'all'} onChange={(e) => { const [a, b] = e.target.value.split('-').map((x) => Number(x.trim())); if (!Number.isNaN(a)) set(i, { from: a, to: Number.isNaN(b) || b === undefined ? a : b }); }} /></div>
            <div className="col-span-4">
              <input list={`src-${dir}-${i}`} className="aws-input" value={r.source} onChange={(e) => set(i, { source: e.target.value.trim() })} placeholder="CIDR or sg-…" />
              <datalist id={`src-${dir}-${i}`}><option value="0.0.0.0/0">Anywhere-IPv4</option>{sgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</datalist>
              {srcBad && <span className="text-[#d91515] text-[12px]">Enter a CIDR (10.0.0.0/16) or a security group id</span>}
            </div>
            <div className="col-span-2"><Input value={r.description ?? ''} placeholder="Description" onChange={(e) => set(i, { description: e.target.value })} /></div>
            <div className="col-span-1"><Button onClick={() => onChange(rules.filter((_, k) => k !== i))}>Delete</Button></div>
          </div>
        );
      })}
      <Button onClick={() => onChange([...rules, dir === 'inbound' ? { protocol: 'tcp', from: 443, to: 443, source: '0.0.0.0/0' } : { protocol: 'all', from: 0, to: 65535, source: '0.0.0.0/0' }])}>Add rule</Button>
      {dir === 'inbound' && rules.some((r) => r.source === '0.0.0.0/0' && (r.from === 22 || r.from === 3389)) && <Alert kind="warning">Rules with source 0.0.0.0/0 on SSH/RDP let all IP addresses reach your instance. Prefer Systems Manager Session Manager (no inbound port at all) or restrict to your IP.</Alert>}
    </div>
  );
}

function RulesTable({ rules }: { rules: SgRule[] }) {
  const sgs = useCloud((c) => c.securityGroups);
  return (
    <table className="aws-table w-full"><thead><tr><th>Type</th><th>Protocol</th><th>Port range</th><th>Source / destination</th><th>Description</th></tr></thead>
      <tbody>{rules.map((r, i) => <tr key={i}><td>{typeText(r)}</td><td>{r.protocol === 'all' ? 'All' : r.protocol.toUpperCase()}</td><td>{portText(r)}</td><td>{r.source.startsWith('sg-') ? <span>{r.source} <span className="text-[#5f6b7a]">/ {sgs.find((s) => s.id === r.source)?.name}</span></span> : r.source}</td><td>{r.description ?? '–'}</td></tr>)}</tbody>
    </table>
  );
}

function List({ base }: { base: string }) {
  const sgs = useCloud((c) => c.securityGroups);
  const vpcs = useCloud((c) => c.vpcs);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const { remove, log } = useCloudActions();
  const nav = useNavigate();
  const inUse = (id: string) => { const c = useStore.getState().cloud; return c.instances.some((i) => i.state !== 'terminated' && i.sgIds.includes(id)) || c.loadBalancers.some((l) => l.sgIds.includes(id)) || c.dbInstances.some((d) => d.sgIds.includes(id)); };
  const selSg = sgs.find((s) => s.id === sel);
  return (
    <Page title="Security Groups" crumbs={[{ label: base.includes('ec2') ? 'EC2' : 'VPC', to: base.replace('/security-groups', '') }, { label: 'Security Groups' }]}>
      <Panel title="Security Groups" counter={sgs.length} actions={<><Button disabled={!selSg || selSg.name === 'default'} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav(`${base}/create`)}>Create security group</Button></>}>
        <Table rows={sgs} selected={sel} onSelect={setSel} filterText={(s) => `${s.name} ${s.id} ${s.vpcId}`} columns={[
          { header: 'Security group ID', cell: (s) => <Link to={`${base}/${s.id}`}>{s.id}</Link> },
          { header: 'Security group name', cell: (s) => s.name },
          { header: 'VPC ID', cell: (s) => `${s.vpcId}${vpcs.find((v) => v.id === s.vpcId)?.isDefault ? ' (default)' : ''}` },
          { header: 'Description', cell: (s) => s.description },
          { header: 'Inbound rules', cell: (s) => `${s.inbound.length} Permission entr${s.inbound.length === 1 ? 'y' : 'ies'}` },
        ]} />
      </Panel>
      {del && selSg && <ConfirmDelete what={selSg.name} warning={inUse(selSg.id) ? 'This security group is associated with running resources. AWS would refuse the delete with DependencyViolation; detach it first.' : undefined}
        onClose={() => setDel(false)} onConfirm={() => { if (inUse(selSg.id)) return; remove('securityGroups', selSg.id); log('ec2', `Deleted security group ${selSg.id}`); setSel(null); }} />}
    </Page>
  );
}

function Create({ base }: { base: string }) {
  const vpcs = useCloud((c) => c.vpcs);
  const region = useCloud((c) => c.region);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [vpcId, setVpcId] = useState(vpcs.find((v) => v.isDefault)?.id ?? vpcs[0]?.id ?? '');
  const [inbound, setIn] = useState<SgRule[]>([]);
  const [outbound, setOut] = useState<SgRule[]>([{ protocol: 'all', from: 0, to: 65535, source: '0.0.0.0/0' }]);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const exists = useCloud((c) => c.securityGroups.some((s) => s.vpcId === vpcId && s.name === name));
  const err = !name ? 'Name is required' : exists ? 'A security group with this name already exists in the VPC' : '';
  return (
    <Page title="Create security group" crumbs={[{ label: 'Security Groups', to: base }, { label: 'Create security group' }]}>
      <form onSubmit={(e) => { e.preventDefault(); if (err || !desc) return; const id = rid('sg'); put('securityGroups', { id, name, description: desc, vpcId, region, createdAt: Date.now(), inbound, outbound }); log('ec2', `Created security group ${name} (${id})`); nav(`${base}/${id}`); }}>
        <Panel title="Basic details">
          <Field label="Security group name" error={name ? err : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. web-alb-sg" /></Field>
          <Field label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Allows HTTPS from the internet" /></Field>
          <Field label="VPC"><Select value={vpcId} onChange={setVpcId} options={vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name})` }))} /></Field>
        </Panel>
        <Panel title="Inbound rules">
          <Teach>Security groups are <b>stateful allow-lists</b> attached to ENIs. There are no deny rules. Reply traffic is allowed automatically. Use another <b>security group id as the source</b> (e.g. app tier allows 8080 only from the ALB's SG) instead of CIDRs: it follows instances as they scale.</Teach>
          <RuleEditor rules={inbound} onChange={setIn} dir="inbound" vpcId={vpcId} />
        </Panel>
        <Panel title="Outbound rules"><RuleEditor rules={outbound} onChange={setOut} dir="outbound" vpcId={vpcId} /></Panel>
        <FormFooter onCancel={() => nav(base)} submitLabel="Create security group" disabled={!!err || !desc} />
      </form>
    </Page>
  );
}

function Detail({ base }: { base: string }) {
  const { id = '' } = useParams();
  const sg = useCloud((c) => c.securityGroups.find((s) => s.id === id));
  const [edit, setEdit] = useState<'inbound' | 'outbound' | null>(null);
  const [draft, setDraft] = useState<SgRule[]>([]);
  const { patch, log } = useCloudActions();
  if (!sg) return <Page title="Not found"><Alert kind="error">Security group {id} not found.</Alert></Page>;
  const startEdit = (d: 'inbound' | 'outbound') => { setDraft(sg[d]); setEdit(d); };
  const save = () => { const bad = draft.some((r) => !r.source.startsWith('sg-') && !parseCidr(r.source)); if (bad || !edit) return; patch('securityGroups', sg.id, { [edit]: draft } as Partial<SecurityGroup>); log('ec2', `Modified ${edit} rules of ${sg.id}`); setEdit(null); };
  return (
    <Page title={`${sg.id} - ${sg.name}`} crumbs={[{ label: 'Security Groups', to: base }, { label: sg.id }]}>
      <Panel title="Details"><KV cols={4} items={[['Security group name', sg.name], ['Security group ID', sg.id], ['Description', sg.description], ['VPC ID', sg.vpcId], ['Inbound rules count', sg.inbound.length], ['Outbound rules count', sg.outbound.length]]} /></Panel>
      {edit ? (
        <Panel title={`Edit ${edit} rules`} actions={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button primary onClick={save}>Save rules</Button></>}>
          <RuleEditor rules={draft} onChange={setDraft} dir={edit} vpcId={sg.vpcId} />
        </Panel>
      ) : (
        <Panel>
          <Tabs tabs={[
            { label: 'Inbound rules', content: <div><div className="flex mb-2"><span className="font-bold">Inbound rules ({sg.inbound.length})</span><span className="ml-auto"><Button onClick={() => startEdit('inbound')}>Edit inbound rules</Button></span></div><RulesTable rules={sg.inbound} /></div> },
            { label: 'Outbound rules', content: <div><div className="flex mb-2"><span className="font-bold">Outbound rules ({sg.outbound.length})</span><span className="ml-auto"><Button onClick={() => startEdit('outbound')}>Edit outbound rules</Button></span></div><RulesTable rules={sg.outbound} /></div> },
          ]} />
        </Panel>
      )}
    </Page>
  );
}

export function SecurityGroupRoutes({ base }: { base: string }) {
  return (
    <Routes>
      <Route index element={<List base={base} />} />
      <Route path="create" element={<Create base={base} />} />
      <Route path=":id" element={<Detail base={base} />} />
    </Routes>
  );
}
