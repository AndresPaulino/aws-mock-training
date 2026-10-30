import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, KV, Tabs, Teach, ConfirmDelete, FormFooter, Alert, MultiCheck, Radios, Check, Status, Modal, useCloud, useCloudActions } from '../../kit';
import { rid } from '../../../cloud/seed';
import { cidrOverlaps, parseCidr, randomPublicIp } from '../../../cloud/net';
import { isPublicSubnet } from '../../../cloud/reach';
import type { NaclRule, Protocol } from '../../../cloud/types';
import { createIgw, createNat } from './ops';

// ---------------- Internet gateways ----------------
export function IgwList() {
  const igws = useCloud((c) => c.igws);
  const vpcs = useCloud((c) => c.vpcs);
  const [sel, setSel] = useState<string | null>(null);
  const [attach, setAttach] = useState(false);
  const [vpcId, setVpcId] = useState('');
  const [del, setDel] = useState(false);
  const { mutate, patch, remove, log } = useCloudActions();
  const g = igws.find((x) => x.id === sel);
  const free = vpcs.filter((v) => !igws.some((i) => i.vpcId === v.id));
  return (
    <Page title="Internet gateways" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Internet gateways' }]}>
      <Teach>An internet gateway is a horizontally scaled, highly available, <b>free</b> VPC component. Exactly <b>one per VPC</b>. Attaching it does nothing on its own: a subnet becomes public only when its route table points 0.0.0.0/0 at it.</Teach>
      <Panel title="Internet gateways" counter={igws.length} actions={<>
        <Button disabled={!g || !!g.vpcId} onClick={() => { setVpcId(free[0]?.id ?? ''); setAttach(true); }}>Attach to VPC</Button>
        <Button disabled={!g?.vpcId} onClick={() => { patch('igws', g!.id, { vpcId: undefined }); log('ec2', `Detached ${g!.id} from ${g!.vpcId}`); }}>Detach from VPC</Button>
        <Button disabled={!g || !!g.vpcId} onClick={() => setDel(true)}>Delete</Button>
        <Button primary onClick={() => mutate((c) => { createIgw(c, ''); })}>Create internet gateway</Button></>}>
        <Table rows={igws} selected={sel} onSelect={setSel} columns={[
          { header: 'Name', cell: (x) => x.name || '–' }, { header: 'Internet gateway ID', cell: (x) => x.id },
          { header: 'State', cell: (x) => <Status value={x.vpcId ? 'Attached' : 'Detached'} /> }, { header: 'VPC ID', cell: (x) => x.vpcId ?? '–' },
        ]} />
      </Panel>
      {attach && g && <Modal title={`Attach ${g.id} to VPC`} onClose={() => setAttach(false)} footer={<Button primary disabled={!vpcId} onClick={() => { patch('igws', g.id, { vpcId }); log('ec2', `Attached ${g.id} to ${vpcId}`); setAttach(false); }}>Attach internet gateway</Button>}>
        {free.length ? <Field label="Available VPCs"><Select value={vpcId} onChange={setVpcId} options={free.map((v) => ({ value: v.id, label: `${v.id} (${v.name})` }))} /></Field> : <Alert kind="warning">Every VPC already has an internet gateway (limit: one per VPC).</Alert>}
      </Modal>}
      {del && g && <ConfirmDelete what={g.id} onClose={() => setDel(false)} onConfirm={() => { remove('igws', g.id); setSel(null); }} />}
    </Page>
  );
}

// ---------------- Elastic IPs ----------------
export function ElasticIpList() {
  const eips = useCloud((c) => c.elasticIps);
  const instances = useCloud((c) => c.instances.filter((i) => i.state !== 'terminated'));
  const [sel, setSel] = useState<string | null>(null);
  const [assoc, setAssoc] = useState(false);
  const [target, setTarget] = useState('');
  const { mutate, log } = useCloudActions();
  const e = eips.find((x) => x.id === sel);
  return (
    <Page title="Elastic IP addresses" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Elastic IPs' }]}>
      <Teach>An Elastic IP is a static public IPv4 address you keep until you release it. Since 2024 <b>every public IPv4 address bills ~$0.005/hour</b> (≈ $3.60/month), attached or not. Idle Elastic IPs are a classic "what's costing us money?" answer.</Teach>
      <Panel title="Elastic IP addresses" counter={eips.length} actions={<>
        <Button disabled={!e || !!e.instanceId} onClick={() => { setTarget(instances[0]?.id ?? ''); setAssoc(true); }}>Associate</Button>
        <Button disabled={!e?.instanceId || e.instanceId.startsWith('nat-')} onClick={() => mutate((c) => { const x = c.elasticIps.find((y) => y.id === e!.id)!; const i = c.instances.find((y) => y.id === x.instanceId); if (i) i.elasticIp = undefined; x.instanceId = undefined; })}>Disassociate</Button>
        <Button disabled={!e || !!e.instanceId} onClick={() => { mutate((c) => { c.elasticIps = c.elasticIps.filter((x) => x.id !== e!.id); }); log('ec2', `Released ${e!.publicIp}`); setSel(null); }}>Release</Button>
        <Button primary onClick={() => mutate((c) => { const ip = randomPublicIp(); c.elasticIps.push({ id: rid('eipalloc'), name: '', region: c.region, createdAt: Date.now(), publicIp: ip }); c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Allocated Elastic IP ${ip}` }); })}>Allocate Elastic IP address</Button></>}>
        <Table rows={eips} selected={sel} onSelect={setSel} columns={[
          { header: 'Name', cell: (x) => x.name || '–' }, { header: 'Allocated IPv4 address', cell: (x) => x.publicIp }, { header: 'Allocation ID', cell: (x) => x.id },
          { header: 'Associated with', cell: (x) => x.instanceId ?? <span className="text-[#8d6605]">Not associated (still billing)</span> },
        ]} />
      </Panel>
      {assoc && e && <Modal title="Associate Elastic IP address" onClose={() => setAssoc(false)} footer={<Button primary disabled={!target} onClick={() => { mutate((c) => { const x = c.elasticIps.find((y) => y.id === e.id)!; x.instanceId = target; const i = c.instances.find((y) => y.id === target)!; i.elasticIp = x.publicIp; c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Associated ${x.publicIp} with ${target}` }); }); setAssoc(false); }}>Associate</Button>}>
        <Field label="Instance"><Select value={target} onChange={setTarget} options={instances.map((i) => ({ value: i.id, label: `${i.id} ${i.name}` }))} /></Field>
      </Modal>}
    </Page>
  );
}

// ---------------- NAT gateways ----------------
export function NatList() {
  const nats = useCloud((c) => c.natGateways);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  const n = nats.find((x) => x.id === sel);
  return (
    <Page title="NAT gateways" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'NAT gateways' }]}>
      <Panel title="NAT gateways" counter={nats.length} actions={<><Button disabled={!n || n.state === 'deleted'} onClick={() => setDel(true)}>Delete NAT gateway</Button><Button primary onClick={() => nav('/console/vpc/nat-gateways/create')}>Create NAT gateway</Button></>}>
        <Table rows={nats} selected={sel} onSelect={setSel} columns={[
          { header: 'Name', cell: (x) => x.name || '–' }, { header: 'NAT gateway ID', cell: (x) => x.id }, { header: 'Connectivity type', cell: () => 'Public' },
          { header: 'State', cell: (x) => <Status value={x.state === 'available' ? 'Available' : 'Deleted'} /> }, { header: 'Primary public IPv4', cell: (x) => x.publicIp }, { header: 'Subnet', cell: (x) => x.subnetId },
        ]} />
      </Panel>
      {del && n && <ConfirmDelete what={n.id} warning="Routes pointing at this NAT gateway will become blackholes, and private subnets lose internet access. Its Elastic IP is released." onClose={() => setDel(false)} onConfirm={() => mutate((c) => { const x = c.natGateways.find((y) => y.id === n.id)!; x.state = 'deleted'; c.elasticIps = c.elasticIps.filter((e) => e.instanceId !== n.id); c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Deleted NAT gateway ${n.id}` }); })} />}
    </Page>
  );
}

export function CreateNat() {
  const cloud = useCloud((c) => c);
  const subnets = cloud.subnets;
  const [name, setName] = useState('');
  const [subnetId, setSubnetId] = useState(subnets.find((s) => isPublicSubnet(cloud, s) && !cloud.vpcs.find((v) => v.id === s.vpcId)?.isDefault)?.id ?? subnets[0]?.id ?? '');
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  const s = subnets.find((x) => x.id === subnetId);
  const pub = s && isPublicSubnet(cloud, s);
  return (
    <Page title="Create NAT gateway" crumbs={[{ label: 'NAT gateways', to: '/console/vpc/nat-gateways' }, { label: 'Create' }]}>
      <form onSubmit={(e) => { e.preventDefault(); mutate((c) => { createNat(c, subnetId, name); }); nav('/console/vpc/nat-gateways'); }}>
        <Panel title="NAT gateway settings">
          <Field label="Name - optional"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Subnet" hint="Select a PUBLIC subnet to create the NAT gateway in."><Select value={subnetId} onChange={setSubnetId} options={subnets.map((x) => ({ value: x.id, label: `${x.id} (${x.name || 'no name'}) ${x.az} · ${isPublicSubnet(cloud, x) ? 'public' : 'private'}` }))} /></Field>
          {s && !pub && <Alert kind="warning">This subnet has no route to an internet gateway. A public NAT gateway placed here can't reach the internet. This is one of the most common exam traps!</Alert>}
          <Field label="Connectivity type"><Radios value="public" onChange={() => {}} options={[{ value: 'public', label: 'Public', desc: 'Private subnets reach the internet through this NAT (an Elastic IP is allocated automatically)' }]} /></Field>
          <Teach>NAT gateways are <b>zonal</b>: for high availability create one per AZ and point each private subnet's route table at the NAT in its own AZ. They cost ~$0.045/hour plus <b>$0.045/GB processed</b>. For S3/DynamoDB traffic, a free gateway endpoint avoids that per-GB charge entirely. (A self-managed NAT <i>instance</i> needs source/destination check disabled and is not HA.)</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/vpc/nat-gateways')} submitLabel="Create NAT gateway" disabled={!subnetId} />
      </form>
    </Page>
  );
}

// ---------------- Endpoints ----------------
const ENDPOINT_SERVICES = ['s3', 'dynamodb', 'ssm', 'ssmmessages', 'ec2messages', 'sqs', 'sns', 'kms', 'secretsmanager', 'ecr.api', 'ecr.dkr', 'logs', 'monitoring', 'execute-api', 'sts'];
export function EndpointList() {
  const eps = useCloud((c) => c.endpoints);
  const [sel, setSel] = useState<string | null>(null);
  const { remove, log } = useCloudActions();
  const nav = useNavigate();
  return (
    <Page title="Endpoints" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Endpoints' }]}>
      <Panel title="Endpoints" counter={eps.length} actions={<><Button disabled={!sel} onClick={() => { remove('endpoints', sel!); log('ec2', `Deleted endpoint ${sel}`); setSel(null); }}>Delete VPC endpoints</Button><Button primary onClick={() => nav('/console/vpc/endpoints/create')}>Create endpoint</Button></>}>
        <Table rows={eps} selected={sel} onSelect={setSel} columns={[
          { header: 'Name', cell: (x) => x.name || '–' }, { header: 'VPC endpoint ID', cell: (x) => x.id }, { header: 'Endpoint type', cell: (x) => x.type },
          { header: 'Service name', cell: (x) => x.service }, { header: 'VPC ID', cell: (x) => x.vpcId }, { header: 'Status', cell: () => <Status value="Available" /> },
          { header: 'Attached to', cell: (x) => (x.type === 'Gateway' ? `${x.routeTableIds.length} route table(s)` : `${x.subnetIds.length} subnet(s)`) },
        ]} />
      </Panel>
    </Page>
  );
}

export function CreateEndpoint() {
  const cloud = useCloud((c) => c);
  const [name, setName] = useState('');
  const [svc, setSvc] = useState('s3');
  const [type, setType] = useState<'Gateway' | 'Interface'>('Gateway');
  const [vpcId, setVpcId] = useState(cloud.vpcs.find((v) => !v.isDefault)?.id ?? cloud.vpcs[0]?.id ?? '');
  const [rts, setRts] = useState<string[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [sgs, setSgs] = useState<string[]>([]);
  const [dns, setDns] = useState(true);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const gatewayCapable = svc === 's3' || svc === 'dynamodb';
  const t = gatewayCapable ? type : 'Interface';
  return (
    <Page title="Create endpoint" crumbs={[{ label: 'Endpoints', to: '/console/vpc/endpoints' }, { label: 'Create' }]}>
      <form onSubmit={(e) => { e.preventDefault(); const id = rid('vpce'); put('endpoints', { id, name, region: cloud.region, createdAt: Date.now(), vpcId, service: `com.amazonaws.${cloud.region}.${svc}`, type: t, routeTableIds: t === 'Gateway' ? rts : [], subnetIds: t === 'Interface' ? subs : [], sgIds: t === 'Interface' ? sgs : [], privateDns: t === 'Interface' && dns }); log('ec2', `Created ${t} endpoint ${id} for ${svc}`); nav('/console/vpc/endpoints'); }}>
        <Panel title="Endpoint settings">
          <Field label="Name tag - optional"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Service"><Select value={svc} onChange={setSvc} options={ENDPOINT_SERVICES.map((s) => ({ value: s, label: `com.amazonaws.${cloud.region}.${s}` }))} /></Field>
          {gatewayCapable && <Field label="Type"><Radios value={type} onChange={setType} options={[{ value: 'Gateway', label: 'Gateway', desc: 'Free. Adds a prefix-list route to route tables. S3 and DynamoDB only. Same-Region only.' }, { value: 'Interface', label: 'Interface (PrivateLink)', desc: '~$0.01/hour per AZ + $0.01/GB. ENIs with private IPs; reachable from on-premises over VPN/DX.' }]} /></Field>}
          <Teach>{gatewayCapable ? <>If the question says private subnets must reach <b>S3 or DynamoDB</b> without the internet, the cheapest answer is a <b>gateway endpoint</b>. Choose an interface endpoint only if access must come from <b>on-premises</b> or another Region, or must go through security groups.</> : <>Interface endpoints (AWS PrivateLink) put ENIs in your subnets. With <b>private DNS</b>, the normal service hostname resolves to those private IPs, so apps need no changes. Common pattern: ssm + ssmmessages + ec2messages endpoints = Session Manager into fully private instances.</>}</Teach>
          <Field label="VPC"><Select value={vpcId} onChange={(v) => { setVpcId(v); setRts([]); setSubs([]); setSgs([]); }} options={cloud.vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name})` }))} /></Field>
          {t === 'Gateway' ? (
            <Field label="Route tables" hint="Associate the route tables of the subnets that need access (usually the private ones).">
              <MultiCheck value={rts} onChange={setRts} options={cloud.routeTables.filter((r) => r.vpcId === vpcId).map((r) => ({ value: r.id, label: `${r.name || r.id}${r.main ? ' (main)' : ''} · ${r.subnetIds.length} subnet(s)` }))} />
            </Field>
          ) : <>
            <Field label="Subnets" hint="One ENI per selected subnet: pick one subnet per AZ for HA."><MultiCheck value={subs} onChange={setSubs} options={cloud.subnets.filter((s) => s.vpcId === vpcId).map((s) => ({ value: s.id, label: `${s.name || s.id} · ${s.az}` }))} /></Field>
            <Field label="Security groups" hint="Must allow inbound 443 from your instances."><MultiCheck value={sgs} onChange={setSgs} options={cloud.securityGroups.filter((s) => s.vpcId === vpcId).map((s) => ({ value: s.id, label: `${s.name} (${s.id})` }))} /></Field>
            <Check checked={dns} onChange={setDns} label="Enable private DNS name" />
          </>}
        </Panel>
        <FormFooter onCancel={() => nav('/console/vpc/endpoints')} submitLabel="Create endpoint" disabled={t === 'Gateway' ? !rts.length : !subs.length} />
      </form>
    </Page>
  );
}

// ---------------- Peering ----------------
export function PeeringList() {
  const cloud = useCloud((c) => ({ peer: c.peerings, vpcs: c.vpcs, region: c.region }));
  const [create, setCreate] = useState(false);
  const [a, setA] = useState(cloud.vpcs[0]?.id ?? '');
  const [b, setB] = useState(cloud.vpcs[1]?.id ?? '');
  const [sel, setSel] = useState<string | null>(null);
  const { put, patch, remove, log } = useCloudActions();
  const va = cloud.vpcs.find((v) => v.id === a), vb = cloud.vpcs.find((v) => v.id === b);
  const overlap = va && vb && cidrOverlaps(va.cidr, vb.cidr);
  const p = cloud.peer.find((x) => x.id === sel);
  return (
    <Page title="Peering connections" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Peering connections' }]}>
      <Teach>VPC peering is a <b>1:1, non-transitive</b> link: if A↔B and B↔C, A still can't reach C. CIDRs must not overlap. After accepting, add routes to the peer CIDR in <b>both</b> VPCs' route tables. For many VPCs, use a <b>Transit Gateway</b> (hub-and-spoke, transitive).</Teach>
      <Panel title="Peering connections" counter={cloud.peer.length} actions={<>
        <Button disabled={p?.status !== 'pending-acceptance'} onClick={() => { patch('peerings', p!.id, { status: 'active' }); log('ec2', `Accepted peering ${p!.id}`); }}>Accept request</Button>
        <Button disabled={!p} onClick={() => { remove('peerings', p!.id); setSel(null); }}>Delete</Button>
        <Button primary onClick={() => setCreate(true)}>Create peering connection</Button></>}>
        <Table rows={cloud.peer} selected={sel} onSelect={setSel} columns={[
          { header: 'Peering connection ID', cell: (x) => x.id }, { header: 'Status', cell: (x) => <Status value={x.status} /> },
          { header: 'Requester VPC', cell: (x) => x.requesterVpcId }, { header: 'Accepter VPC', cell: (x) => x.accepterVpcId },
        ]} />
      </Panel>
      {create && <Modal title="Create peering connection" onClose={() => setCreate(false)} footer={<Button primary disabled={!a || !b || a === b || !!overlap} onClick={() => { const id = rid('pcx'); put('peerings', { id, name: '', region: cloud.region, createdAt: Date.now(), requesterVpcId: a, accepterVpcId: b, status: 'pending-acceptance' }); log('ec2', `Requested peering ${id}`); setCreate(false); }}>Create peering connection</Button>}>
        <Field label="VPC ID (Requester)"><Select value={a} onChange={setA} options={cloud.vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name}) ${v.cidr}` }))} /></Field>
        <Field label="VPC ID (Accepter)"><Select value={b} onChange={setB} options={cloud.vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name}) ${v.cidr}` }))} /></Field>
        {overlap && <Alert kind="error">The CIDR blocks overlap. Peering between VPCs with overlapping CIDRs is not supported.</Alert>}
      </Modal>}
    </Page>
  );
}

// ---------------- Network ACLs ----------------
function NaclList() {
  const nacls = useCloud((c) => c.nacls);
  const nav = useNavigate();
  const { mutate } = useCloudActions();
  const vpcs = useCloud((c) => c.vpcs);
  const [vpcId, setVpcId] = useState('');
  const [create, setCreate] = useState(false);
  return (
    <Page title="Network ACLs" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Network ACLs' }]}>
      <Teach>Network ACLs are <b>stateless</b> subnet-level firewalls with numbered <b>allow AND deny</b> rules, evaluated lowest number first; the first match wins. Because they're stateless, you must allow <b>return traffic on ephemeral ports 1024-65535</b>. Use them to <b>block a specific IP range</b> (security groups can't deny).</Teach>
      <Panel title="Network ACLs" counter={nacls.length} actions={<Button primary onClick={() => { setVpcId(vpcs[0]?.id ?? ''); setCreate(true); }}>Create network ACL</Button>}>
        <Table rows={nacls} columns={[
          { header: 'Name', cell: (x) => x.name || '–' }, { header: 'Network ACL ID', cell: (x) => <Link to={`/console/vpc/nacls/${x.id}`}>{x.id}</Link> },
          { header: 'Associated with', cell: (x) => (x.isDefault ? `${x.subnetIds.length} explicit + all unassociated` : `${x.subnetIds.length} subnet(s)`) },
          { header: 'Default', cell: (x) => (x.isDefault ? 'Yes' : 'No') }, { header: 'VPC ID', cell: (x) => x.vpcId },
          { header: 'Inbound rules', cell: (x) => x.inbound.length + 1 }, { header: 'Outbound rules', cell: (x) => x.outbound.length + 1 },
        ]} />
      </Panel>
      {create && <Modal title="Create network ACL" onClose={() => setCreate(false)} footer={<Button primary onClick={() => { const id = rid('acl'); mutate((c) => { c.nacls.push({ id, name: '', region: c.region, createdAt: Date.now(), vpcId, isDefault: false, subnetIds: [], inbound: [], outbound: [] }); }); setCreate(false); nav(`/console/vpc/nacls/${id}`); }}>Create network ACL</Button>}>
        <Field label="VPC"><Select value={vpcId} onChange={setVpcId} options={vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name})` }))} /></Field>
        <Alert kind="warning">A new custom NACL <b>denies all traffic</b> until you add rules (only the * deny rule exists).</Alert>
      </Modal>}
    </Page>
  );
}

function NaclDetail() {
  const { id = '' } = useParams();
  const acl = useCloud((c) => c.nacls.find((n) => n.id === id));
  const subnets = useCloud((c) => c.subnets);
  const { mutate, patch, log } = useCloudActions();
  const [edit, setEdit] = useState<{ dir: 'inbound' | 'outbound'; rules: NaclRule[] } | null>(null);
  const [assoc, setAssoc] = useState<string[] | null>(null);
  if (!acl) return <Page title="Not found"><Alert kind="error">NACL not found.</Alert></Page>;
  const table = (rules: NaclRule[]) => (
    <table className="aws-table w-full"><thead><tr><th>Rule number</th><th>Type</th><th>Port range</th><th>Source/Dest</th><th>Allow/Deny</th></tr></thead>
      <tbody>{[...rules].sort((a, b) => a.num - b.num).map((r, i) => <tr key={i}><td>{r.num}</td><td>{r.protocol === 'all' ? 'All traffic' : r.protocol.toUpperCase()}</td><td>{r.protocol === 'all' ? 'All' : `${r.from}-${r.to}`}</td><td>{r.cidr}</td><td className={r.action === 'allow' ? 'text-[#037f0c]' : 'text-[#d91515]'}>{r.action === 'allow' ? 'Allow' : 'Deny'}</td></tr>)}
        <tr><td>*</td><td>All traffic</td><td>All</td><td>0.0.0.0/0</td><td className="text-[#d91515]">Deny</td></tr></tbody></table>
  );
  const vpcSubnets = subnets.filter((s) => s.vpcId === acl.vpcId);
  return (
    <Page title={`${acl.id}${acl.isDefault ? ' (default)' : ''}`} crumbs={[{ label: 'Network ACLs', to: '/console/vpc/nacls' }, { label: acl.id }]}>
      <Panel title="Details"><KV cols={4} items={[['Network ACL ID', acl.id], ['VPC', acl.vpcId], ['Default', acl.isDefault ? 'Yes' : 'No'], ['Associated subnets', acl.subnetIds.length]]} /></Panel>
      {edit ? (
        <Panel title={`Edit ${edit.dir} rules`} actions={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button primary disabled={edit.rules.some((r) => !parseCidr(r.cidr) || r.num < 1 || r.num > 32766) || new Set(edit.rules.map((r) => r.num)).size !== edit.rules.length} onClick={() => { patch('nacls', acl.id, { [edit.dir]: edit.rules }); log('ec2', `Updated ${edit.dir} rules on ${acl.id}`); setEdit(null); }}>Save changes</Button></>}>
          {edit.rules.map((r, i) => {
            const set = (p: Partial<NaclRule>) => setEdit({ ...edit, rules: edit.rules.map((x, k) => (k === i ? { ...x, ...p } : x)) });
            return (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-2"><Input type="number" value={r.num} onChange={(e) => set({ num: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Select value={r.protocol} onChange={(v) => set({ protocol: v as Protocol, ...(v === 'all' ? { from: 0, to: 65535 } : {}) })} options={['all', 'tcp', 'udp', 'icmp']} /></div>
                <div className="col-span-2"><Input value={`${r.from}-${r.to}`} disabled={r.protocol === 'all'} onChange={(e) => { const [a, b] = e.target.value.split('-').map(Number); set({ from: a || 0, to: b ?? a ?? 0 }); }} /></div>
                <div className="col-span-3"><Input value={r.cidr} onChange={(e) => set({ cidr: e.target.value.trim() })} /></div>
                <div className="col-span-2"><Select value={r.action} onChange={(v) => set({ action: v as 'allow' | 'deny' })} options={['allow', 'deny']} /></div>
                <div className="col-span-1"><Button onClick={() => setEdit({ ...edit, rules: edit.rules.filter((_, k) => k !== i) })}>✕</Button></div>
              </div>
            );
          })}
          <Button onClick={() => setEdit({ ...edit, rules: [...edit.rules, { num: (Math.max(0, ...edit.rules.map((r) => r.num)) + 100) - (Math.max(0, ...edit.rules.map((r) => r.num)) % 100), protocol: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', action: 'allow' }] })}>Add new rule</Button>
          <Teach>Number rules in steps of 100 so you can insert a deny (e.g. #50) <b>before</b> a broad allow. Outbound replies to clients need 1024-65535.</Teach>
        </Panel>
      ) : assoc ? (
        <Panel title="Edit subnet associations" actions={<><Button onClick={() => setAssoc(null)}>Cancel</Button><Button primary onClick={() => { mutate((c) => { for (const n of c.nacls) n.subnetIds = n.subnetIds.filter((s) => !assoc.includes(s)); c.nacls.find((n) => n.id === acl.id)!.subnetIds = assoc; }); setAssoc(null); }}>Save changes</Button></>}>
          <p className="aws-hint mb-2">A subnet has exactly one NACL. Unassociated subnets use the VPC's default NACL.</p>
          <MultiCheck value={assoc} onChange={setAssoc} options={vpcSubnets.map((s) => ({ value: s.id, label: `${s.name || s.id} · ${s.cidr} · ${s.az}` }))} />
        </Panel>
      ) : (
        <Panel><Tabs tabs={[
          { label: 'Inbound rules', content: <div><div className="flex mb-2"><span className="ml-auto"><Button onClick={() => setEdit({ dir: 'inbound', rules: acl.inbound })}>Edit inbound rules</Button></span></div>{table(acl.inbound)}</div> },
          { label: 'Outbound rules', content: <div><div className="flex mb-2"><span className="ml-auto"><Button onClick={() => setEdit({ dir: 'outbound', rules: acl.outbound })}>Edit outbound rules</Button></span></div>{table(acl.outbound)}</div> },
          { label: 'Subnet associations', content: <div><div className="flex mb-2"><span className="ml-auto"><Button onClick={() => setAssoc(acl.subnetIds)}>Edit subnet associations</Button></span></div>{acl.subnetIds.map((s) => <div key={s}>{subnets.find((x) => x.id === s)?.name || s}</div>)}{!acl.subnetIds.length && <p className="aws-hint">{acl.isDefault ? 'Applies to every subnet without an explicit association.' : 'No subnets associated.'}</p>}</div> },
        ]} /></Panel>
      )}
    </Page>
  );
}

export function NaclRoutes() {
  return <Routes><Route index element={<NaclList />} /><Route path=":id" element={<NaclDetail />} /></Routes>;
}
