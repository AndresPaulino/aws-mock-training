import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, KV, Tabs, Teach, ConfirmDelete, FormFooter, Alert, MultiCheck, useCloud, useCloudActions } from '../../kit';
import { parseCidr } from '../../../cloud/net';
import type { Route as RouteT } from '../../../cloud/types';
import { createRouteTable, associate } from './ops';

function List() {
  const rts = useCloud((c) => c.routeTables);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const { remove, log } = useCloudActions();
  const nav = useNavigate();
  const r = rts.find((x) => x.id === sel);
  return (
    <Page title="Route tables" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Route tables' }]}>
      <Panel title="Route tables" counter={rts.length} actions={<><Button disabled={!r || r.main || r.subnetIds.length > 0} onClick={() => setDel(true)} title={r?.main ? 'The main route table cannot be deleted' : r?.subnetIds.length ? 'Disassociate subnets first' : ''}>Delete</Button><Button primary onClick={() => nav('/console/vpc/route-tables/create')}>Create route table</Button></>}>
        <Table rows={rts} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.id} ${x.vpcId}`} columns={[
          { header: 'Name', cell: (x) => x.name || '–' },
          { header: 'Route table ID', cell: (x) => <Link to={`/console/vpc/route-tables/${x.id}`}>{x.id}</Link> },
          { header: 'Explicit subnet associations', cell: (x) => (x.subnetIds.length ? `${x.subnetIds.length} subnet(s)` : '–') },
          { header: 'Main', cell: (x) => (x.main ? 'Yes' : 'No') },
          { header: 'VPC', cell: (x) => x.vpcId },
          { header: 'Routes', cell: (x) => x.routes.map((rt) => `${rt.dest} → ${rt.target}`).join(', ') },
        ]} />
      </Panel>
      {del && r && <ConfirmDelete what={r.name || r.id} onClose={() => setDel(false)} onConfirm={() => { remove('routeTables', r.id); log('ec2', `Deleted route table ${r.id}`); setSel(null); }} />}
    </Page>
  );
}

function Create() {
  const vpcs = useCloud((c) => c.vpcs);
  const [name, setName] = useState('');
  const [vpcId, setVpcId] = useState(vpcs.find((v) => !v.isDefault)?.id ?? vpcs[0]?.id ?? '');
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  return (
    <Page title="Create route table" crumbs={[{ label: 'Route tables', to: '/console/vpc/route-tables' }, { label: 'Create' }]}>
      <form onSubmit={(e) => { e.preventDefault(); let id = ''; mutate((c) => { id = createRouteTable(c, vpcId, name); }); nav(`/console/vpc/route-tables/${id}`); }}>
        <Panel title="Route table settings">
          <Field label="Name - optional"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. public-rtb" /></Field>
          <Field label="VPC"><Select value={vpcId} onChange={setVpcId} options={vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name || 'no name'})` }))} /></Field>
          <Teach>Every route table starts with one route: <b>VPC CIDR → local</b>. That's why everything inside a VPC can reach everything else (subject to SGs/NACLs). A subnet with no explicit association uses the <b>main</b> route table. Best practice: leave the main table private and create a separate public one.</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/vpc/route-tables')} submitLabel="Create route table" />
      </form>
    </Page>
  );
}

function Detail() {
  const { id = '' } = useParams();
  const c = useCloud((s) => ({ rt: s.routeTables.find((r) => r.id === id), igws: s.igws, nats: s.natGateways.filter((n) => n.state === 'available'), eps: s.endpoints, peer: s.peerings, subnets: s.subnets, instances: s.instances.filter((i) => i.state === 'running'), region: s.region, all: s.routeTables }));
  const { mutate, patch, log } = useCloudActions();
  const [editRoutes, setEditRoutes] = useState<RouteT[] | null>(null);
  const [editAssoc, setEditAssoc] = useState<string[] | null>(null);
  if (!c.rt) return <Page title="Not found"><Alert kind="error">Route table not found.</Alert></Page>;
  const rt = c.rt;
  const vpcSubnets = c.subnets.filter((s) => s.vpcId === rt.vpcId);
  const gwEps = c.eps.filter((e) => e.type === 'Gateway' && e.routeTableIds.includes(rt.id));
  const targets = [
    ...c.igws.filter((g) => g.vpcId === rt.vpcId).map((g) => ({ value: g.id, label: `Internet Gateway: ${g.id}` })),
    ...c.nats.filter((n) => vpcSubnets.some((s) => s.id === n.subnetId)).map((n) => ({ value: n.id, label: `NAT Gateway: ${n.id} ${n.name}` })),
    ...c.peer.filter((p) => p.status === 'active' && (p.requesterVpcId === rt.vpcId || p.accepterVpcId === rt.vpcId)).map((p) => ({ value: p.id, label: `Peering Connection: ${p.id}` })),
    ...c.instances.filter((i) => vpcSubnets.some((s) => s.id === i.subnetId)).map((i) => ({ value: i.id, label: `Instance: ${i.id} ${i.name}` })),
  ];
  const routeErr = (r: RouteT) => (!parseCidr(r.dest) ? 'Invalid destination CIDR' : !r.target ? 'Choose a target' : '');
  const blackhole = (r: RouteT) => r.target !== 'local' && !targets.some((t) => t.value === r.target);

  return (
    <Page title={`${rt.id} / ${rt.name || '–'}`} crumbs={[{ label: 'Route tables', to: '/console/vpc/route-tables' }, { label: rt.id }]}>
      <Panel title="Details"><KV cols={4} items={[['Route table ID', rt.id], ['Main', rt.main ? 'Yes' : 'No'], ['VPC', rt.vpcId], ['Explicit subnet associations', rt.subnetIds.length], ['Name', <input className="aws-input" defaultValue={rt.name} onBlur={(e) => patch('routeTables', rt.id, { name: e.target.value })} />]]} /></Panel>
      {editRoutes ? (
        <Panel title="Edit routes" actions={<><Button onClick={() => setEditRoutes(null)}>Cancel</Button><Button primary disabled={editRoutes.some((r) => r.target !== 'local' && routeErr(r) !== '')} onClick={() => { patch('routeTables', rt.id, { routes: editRoutes }); log('ec2', `Updated routes in ${rt.id}: ${editRoutes.map((r) => `${r.dest}→${r.target}`).join(', ')}`); setEditRoutes(null); }}>Save changes</Button></>}>
          <Teach>The most specific (longest prefix) matching route wins. <b>0.0.0.0/0 → igw-</b> makes the associated subnets public. <b>0.0.0.0/0 → nat-</b> gives private subnets outbound-only internet. You can't send traffic to an IGW from a private instance without a public IP.</Teach>
          {editRoutes.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
              <div className="col-span-5"><Input value={r.dest} disabled={r.target === 'local'} onChange={(e) => setEditRoutes(editRoutes.map((x, k) => (k === i ? { ...x, dest: e.target.value.trim() } : x)))} placeholder="0.0.0.0/0" /></div>
              <div className="col-span-5">{r.target === 'local' ? <Input value="local" disabled /> : <Select value={r.target} onChange={(v) => setEditRoutes(editRoutes.map((x, k) => (k === i ? { ...x, target: v } : x)))} options={[{ value: '', label: 'Choose target…' }, ...targets]} />}</div>
              <div className="col-span-2">{r.target !== 'local' && <Button onClick={() => setEditRoutes(editRoutes.filter((_, k) => k !== i))}>Remove</Button>}</div>
            </div>
          ))}
          <Button onClick={() => setEditRoutes([...editRoutes, { dest: '0.0.0.0/0', target: '' }])}>Add route</Button>
        </Panel>
      ) : editAssoc ? (
        <Panel title="Edit subnet associations" actions={<><Button onClick={() => setEditAssoc(null)}>Cancel</Button><Button primary onClick={() => { mutate((d) => { const r = d.routeTables.find((x) => x.id === rt.id)!; for (const s of r.subnetIds) if (!editAssoc.includes(s)) r.subnetIds = r.subnetIds.filter((x) => x !== s); for (const s of editAssoc) associate(d, rt.id, s); d.events.unshift({ t: Date.now(), service: 'ec2', msg: `Associated ${editAssoc.length} subnet(s) with ${rt.id}` }); }); setEditAssoc(null); }}>Save associations</Button></>}>
          <p className="aws-hint mb-2">A subnet can be associated with only one route table. Selecting it here moves it from its current table.</p>
          <MultiCheck value={editAssoc} onChange={setEditAssoc} options={vpcSubnets.map((s) => ({ value: s.id, label: <span>{s.name || s.id} <span className="text-[#5f6b7a]">{s.cidr} · {s.az}{(() => { const cur = c.all.find((x) => x.subnetIds.includes(s.id)); return cur && cur.id !== rt.id ? ` · currently ${cur.name || cur.id}` : ''; })()}</span></span> }))} />
        </Panel>
      ) : (
        <Panel>
          <Tabs tabs={[
            { label: 'Routes', content: <div>
              <div className="flex mb-2"><b>Routes ({rt.routes.length + gwEps.length})</b><span className="ml-auto"><Button onClick={() => setEditRoutes(rt.routes)}>Edit routes</Button></span></div>
              <table className="aws-table w-full"><thead><tr><th>Destination</th><th>Target</th><th>Status</th></tr></thead><tbody>
                {rt.routes.map((r, i) => <tr key={i}><td>{r.dest}</td><td>{r.target}</td><td>{blackhole(r) ? <span className="text-[#d91515]">Blackhole</span> : <span className="text-[#037f0c]">Active</span>}</td></tr>)}
                {gwEps.map((e) => <tr key={e.id}><td>pl-{e.service.endsWith('s3') ? '63a5400a' : '02cd2c6b'} (com.amazonaws.{c.region}.{e.service.split('.').pop()})</td><td>{e.id}</td><td className="text-[#037f0c]">Active</td></tr>)}
              </tbody></table>
              {rt.routes.some(blackhole) && <Alert kind="warning">A route points at a target that no longer exists (blackhole): traffic to it is dropped.</Alert>}
            </div> },
            { label: 'Subnet associations', content: <div>
              <div className="flex mb-2"><b>Explicit subnet associations ({rt.subnetIds.length})</b><span className="ml-auto"><Button onClick={() => setEditAssoc(rt.subnetIds)}>Edit subnet associations</Button></span></div>
              {rt.subnetIds.map((s) => { const sn = c.subnets.find((x) => x.id === s); return <div key={s}>{sn?.name || s} · {sn?.cidr} · {sn?.az}</div>; })}
              {rt.main && <p className="aws-hint mt-2">As the main route table, it also applies to every subnet in the VPC without an explicit association.</p>}
            </div> },
          ]} />
        </Panel>
      )}
    </Page>
  );
}

export function RouteTableRoutes() {
  return <Routes><Route index element={<List />} /><Route path="create" element={<Create />} /><Route path=":id" element={<Detail />} /></Routes>;
}
