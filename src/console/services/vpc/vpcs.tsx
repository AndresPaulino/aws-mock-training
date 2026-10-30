import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, KV, Teach, ConfirmDelete, FormFooter, Alert, Radios, Check, Status, useCloud, useCloudActions } from '../../kit';
import { vpcCidrError, cidrOverlaps, usableIps, parseCidr } from '../../../cloud/net';
import { azsOf } from '../../../cloud/seed';
import { subnetRouteTable, isPublicSubnet } from '../../../cloud/reach';
import { createVpc, createSubnet, createIgw, createRouteTable, associate, setRoute, createNat, nthSlash24 } from './ops';

export function VpcDashboard() {
  const c = useCloud((s) => ({ vpcs: s.vpcs.length, subnets: s.subnets.length, rts: s.routeTables.length, igws: s.igws.length, nats: s.natGateways.filter((n) => n.state === 'available').length, eps: s.endpoints.length, sgs: s.securityGroups.length, nacls: s.nacls.length, peer: s.peerings.length, region: s.region }));
  const tiles: [string, number, string][] = [['VPCs', c.vpcs, 'vpcs'], ['Subnets', c.subnets, 'subnets'], ['Route tables', c.rts, 'route-tables'], ['Internet gateways', c.igws, 'igws'], ['NAT gateways', c.nats, 'nat-gateways'], ['Endpoints', c.eps, 'endpoints'], ['Security groups', c.sgs, 'security-groups'], ['Network ACLs', c.nacls, 'nacls'], ['Peering connections', c.peer, 'peering']];
  const nav = useNavigate();
  return (
    <Page title="VPC dashboard" actions={<Button primary onClick={() => nav('/console/vpc/vpcs/create')}>Create VPC</Button>}>
      <Panel title={`Resources by Region: ${c.region}`}>
        <div className="grid sm:grid-cols-3 gap-3">{tiles.map(([l, n, p]) => <Link key={l} to={`/console/vpc/${p}`} className="aws-panel !shadow-none border border-[#e9ebed] px-4 py-3 block"><span className="block text-[#5f6b7a] text-[13px]">{l}</span><span className="text-[24px] font-bold">{n}</span></Link>)}</div>
      </Panel>
      <Teach title="Mental model">A <b>VPC</b> is your private network (one Region). <b>Subnets</b> live in one AZ each. A subnet is <b>public</b> only because its <b>route table</b> sends 0.0.0.0/0 to an <b>internet gateway</b>. Private subnets reach the internet <i>outbound</i> through a <b>NAT gateway</b> in a public subnet, and reach S3/DynamoDB for free through <b>gateway endpoints</b>. Try the <Link to="/console/vpc/reachability">Reachability Analyzer</Link> to see packets get through or get blocked.</Teach>
    </Page>
  );
}

export function VpcList() {
  const vpcs = useCloud((c) => c.vpcs);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  const v = vpcs.find((x) => x.id === sel);
  const deps = useCloud((c) => (sel ? c.instances.filter((i) => i.state !== 'terminated' && c.subnets.find((s) => s.id === i.subnetId)?.vpcId === sel).length + c.natGateways.filter((n) => n.state === 'available' && c.subnets.find((s) => s.id === n.subnetId)?.vpcId === sel).length : 0));
  return (
    <Page title="Your VPCs" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Your VPCs' }]}>
      <Panel title="Your VPCs" counter={vpcs.length} actions={<><Button disabled={!v || v.isDefault} onClick={() => setDel(true)}>Delete VPC</Button><Button primary onClick={() => nav('/console/vpc/vpcs/create')}>Create VPC</Button></>}>
        <Table rows={vpcs} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.id} ${x.cidr}`} columns={[
          { header: 'Name', cell: (x) => x.name || '–' },
          { header: 'VPC ID', cell: (x) => <Link to={`/console/vpc/vpcs/${x.id}`}>{x.id}</Link> },
          { header: 'State', cell: () => <Status value="Available" /> },
          { header: 'IPv4 CIDR', cell: (x) => x.cidr },
          { header: 'Default VPC', cell: (x) => (x.isDefault ? 'Yes' : 'No') },
          { header: 'Region', cell: (x) => x.region },
        ]} />
      </Panel>
      {del && v && <ConfirmDelete what={`VPC ${v.name || v.id}`} warning={deps ? `This VPC still has ${deps} running instance(s)/NAT gateway(s). Terminate them first; AWS refuses to delete a VPC with dependencies.` : 'Deleting the VPC also deletes its subnets, route tables, gateways attachments, endpoints, NACLs and security groups.'}
        onClose={() => setDel(false)} onConfirm={() => { if (deps) return; mutate((c) => {
          const subs = c.subnets.filter((s) => s.vpcId === v.id).map((s) => s.id);
          c.subnets = c.subnets.filter((s) => s.vpcId !== v.id); c.routeTables = c.routeTables.filter((r) => r.vpcId !== v.id);
          c.securityGroups = c.securityGroups.filter((s) => s.vpcId !== v.id); c.nacls = c.nacls.filter((n) => n.vpcId !== v.id);
          c.endpoints = c.endpoints.filter((e) => e.vpcId !== v.id); c.natGateways = c.natGateways.filter((n) => !subs.includes(n.subnetId));
          for (const g of c.igws) if (g.vpcId === v.id) g.vpcId = undefined;
          c.vpcs = c.vpcs.filter((x) => x.id !== v.id); c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Deleted VPC ${v.id}` });
        }); setSel(null); }} />}
    </Page>
  );
}

export function CreateVpc() {
  const region = useCloud((c) => c.region);
  const existing = useCloud((c) => c.vpcs.map((v) => v.cidr));
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  const [mode, setMode] = useState<'vpc' | 'more'>('more');
  const [name, setName] = useState('project');
  const [cidr, setCidr] = useState('10.0.0.0/16');
  const [azCount, setAzCount] = useState('2');
  const [pub, setPub] = useState('2');
  const [priv, setPriv] = useState('2');
  const [nat, setNat] = useState<'none' | '1' | 'per-az'>('none');
  const [s3ep, setS3ep] = useState(true);
  const err = vpcCidrError(cidr);
  const overlap = !err && existing.some((x) => cidrOverlaps(x, cidr));
  const azs = azsOf(region).slice(0, Number(azCount));
  const nPub = Math.min(Number(pub), azs.length * 2), nPriv = Math.min(Number(priv), azs.length * 2);

  const create = () => {
    let vid = '';
    mutate((c) => {
      vid = createVpc(c, mode === 'more' ? `${name}-vpc` : name, cidr);
      if (mode !== 'more') return;
      c.vpcs.find((v) => v.id === vid)!.dnsHostnames = true;
      const igw = createIgw(c, `${name}-igw`, vid);
      const pubRt = createRouteTable(c, vid, `${name}-rtb-public`);
      setRoute(c, pubRt, '0.0.0.0/0', igw);
      const pubSubs: string[] = [];
      for (let i = 0; i < nPub; i++) { const az = azs[i % azs.length]; const s = createSubnet(c, vid, `${name}-subnet-public${i + 1}-${az}`, nthSlash24(cidr, i), az); c.subnets.find((x) => x.id === s)!.autoPublicIp = true; associate(c, pubRt, s); pubSubs.push(s); }
      const natIds: string[] = [];
      if (nat !== 'none' && pubSubs.length) for (let i = 0; i < (nat === '1' ? 1 : Math.min(azs.length, pubSubs.length)); i++) natIds.push(createNat(c, pubSubs[i], `${name}-nat-public${i + 1}-${azs[i]}`));
      const privRts: string[] = [];
      for (let i = 0; i < nPriv; i++) {
        const az = azs[i % azs.length];
        const s = createSubnet(c, vid, `${name}-subnet-private${i + 1}-${az}`, nthSlash24(cidr, 128 + i), az);
        const rt = createRouteTable(c, vid, `${name}-rtb-private${i + 1}-${az}`);
        if (natIds.length) setRoute(c, rt, '0.0.0.0/0', natIds[nat === '1' ? 0 : i % natIds.length]);
        associate(c, rt, s); privRts.push(rt);
      }
      if (s3ep && privRts.length) c.endpoints.push({ id: `vpce-${Math.random().toString(16).slice(2, 19)}`, name: `${name}-vpce-s3`, region: c.region, createdAt: Date.now(), vpcId: vid, service: `com.amazonaws.${c.region}.s3`, type: 'Gateway', routeTableIds: privRts, subnetIds: [], sgIds: [], privateDns: false });
    });
    nav(`/console/vpc/vpcs/${vid}`);
  };

  return (
    <Page title="Create VPC" crumbs={[{ label: 'Your VPCs', to: '/console/vpc/vpcs' }, { label: 'Create VPC' }]}>
      <form onSubmit={(e) => { e.preventDefault(); if (!err && !overlap && name) create(); }}>
        <Panel title="VPC settings">
          <Field label="Resources to create"><Radios value={mode} onChange={setMode} options={[{ value: 'vpc', label: 'VPC only', desc: 'Just the VPC: you build subnets, gateways and routes yourself (best for learning).' }, { value: 'more', label: 'VPC and more', desc: 'VPC + subnets + IGW + route tables (+ NAT, + S3 endpoint) in one go.' }]} /></Field>
          <Field label={mode === 'more' ? 'Name tag auto-generation' : 'Name tag'}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="IPv4 CIDR block" hint="Size between /16 and /28. Choose a range that won't overlap networks you may connect later (on-premises, other VPCs)." error={err || (overlap ? 'Overlaps an existing VPC in this Region. Allowed, but you can never peer these two VPCs.' : undefined)}><Input value={cidr} onChange={(e) => setCidr(e.target.value.trim())} /></Field>
          {!err && <p className="aws-hint -mt-2 mb-3">{parseCidr(cidr)!.size.toLocaleString()} addresses in this VPC.</p>}
          {mode === 'more' && <>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Number of Availability Zones"><Select value={azCount} onChange={setAzCount} options={['1', '2', '3']} /></Field>
              <Field label="Public subnets"><Select value={pub} onChange={setPub} options={['0', String(azs.length), String(azs.length * 2)]} /></Field>
              <Field label="Private subnets"><Select value={priv} onChange={setPriv} options={['0', String(azs.length), String(azs.length * 2)]} /></Field>
            </div>
            <Field label="NAT gateways ($)"><Radios value={nat} onChange={setNat} options={[{ value: 'none', label: 'None', desc: 'Private subnets have no internet access' }, { value: '1', label: 'In 1 AZ', desc: 'Cheapest; single point of failure' }, { value: 'per-az', label: '1 per AZ', desc: 'Highly available; ~$33/month each' }]} /></Field>
            <Teach>A NAT gateway costs about $0.045/hour (~$33/month) <b>plus $0.045 per GB</b> processed, even when idle. "1 per AZ" is the highly available answer; "in 1 AZ" is the cost-optimized answer if a short outage is acceptable.</Teach>
            <Check checked={s3ep} onChange={setS3ep} label="VPC endpoints: S3 Gateway" hint="Free. Private subnets reach S3 without NAT, and without NAT data-processing charges." />
            <Alert>Preview: 1 VPC, {nPub} public + {nPriv} private subnets across {azs.join(', ')}, 1 internet gateway, {nPub ? 1 : 0} public route table, {nPriv} private route tables, {nat === 'none' ? 0 : nat === '1' ? 1 : azs.length} NAT gateway(s){s3ep ? ', 1 S3 gateway endpoint' : ''}.</Alert>
          </>}
        </Panel>
        <FormFooter onCancel={() => nav('/console/vpc/vpcs')} submitLabel="Create VPC" disabled={!!err || !name} />
      </form>
    </Page>
  );
}

export function VpcDetail() {
  const { id = '' } = useParams();
  const c = useCloud((s) => ({ vpc: s.vpcs.find((v) => v.id === id), subnets: s.subnets.filter((x) => x.vpcId === id), rts: s.routeTables.filter((r) => r.vpcId === id), igws: s.igws.filter((g) => g.vpcId === id), eps: s.endpoints.filter((e) => e.vpcId === id) }));
  const full = useCloud((s) => s);
  const { patch } = useCloudActions();
  if (!c.vpc) return <Page title="Not found"><Alert kind="error">VPC {id} not found.</Alert></Page>;
  const nats = full.natGateways.filter((n) => n.state === 'available' && c.subnets.some((s) => s.id === n.subnetId));
  return (
    <Page title={`${c.vpc.id} / ${c.vpc.name || '–'}`} crumbs={[{ label: 'Your VPCs', to: '/console/vpc/vpcs' }, { label: c.vpc.id }]}>
      <Panel title="Details"><KV cols={4} items={[['VPC ID', c.vpc.id], ['State', <Status value="Available" />], ['IPv4 CIDR', c.vpc.cidr], ['Default VPC', c.vpc.isDefault ? 'Yes' : 'No'], ['DNS hostnames', <button className="link" onClick={() => patch('vpcs', c.vpc!.id, { dnsHostnames: !c.vpc!.dnsHostnames })}>{c.vpc.dnsHostnames ? 'Enabled' : 'Disabled'} (toggle)</button>], ['Main route table', c.rts.find((r) => r.main)?.id], ['Subnets', c.subnets.length], ['Region', c.vpc.region]]} /></Panel>
      <Panel title="Resource map" desc="How subnets route traffic. Green = public subnet (route to IGW), blue = private.">
        <div className="grid md:grid-cols-3 gap-6 text-[13px]">
          <div><div className="font-bold mb-2">Subnets ({c.subnets.length})</div>
            {[...new Set(c.subnets.map((s) => s.az))].sort().map((az) => <div key={az} className="mb-2"><div className="text-[#5f6b7a]">{az}</div>{c.subnets.filter((s) => s.az === az).map((s) => { const pub = isPublicSubnet(full, s); return <div key={s.id} className={`rounded px-2 py-1 my-1 border-l-4 ${pub ? 'border-[#7aa116] bg-[#f4f9e8]' : 'border-[#147eba] bg-[#eef6fb]'}`}>{s.name || s.id}<span className="block text-[#5f6b7a]">{s.cidr} · {pub ? 'public' : 'private'} · {usableIps(s.cidr)} IPs</span></div>; })}</div>)}
          </div>
          <div><div className="font-bold mb-2">Route tables ({c.rts.length})</div>
            {c.rts.map((r) => <Link to={`/console/vpc/route-tables/${r.id}`} key={r.id} className="block rounded border border-[#e9ebed] px-2 py-1 my-1">{r.name || r.id}{r.main && ' (main)'}<span className="block text-[#5f6b7a]">{r.routes.map((x) => `${x.dest}→${x.target}`).join(', ')}</span><span className="block text-[#5f6b7a]">{r.subnetIds.length} explicit subnet(s){r.main && ' + all unassociated'}</span></Link>)}
          </div>
          <div><div className="font-bold mb-2">Network connections</div>
            {c.igws.map((g) => <div key={g.id} className="rounded border border-[#e9ebed] px-2 py-1 my-1">🌐 Internet gateway {g.id}</div>)}
            {nats.map((n) => <div key={n.id} className="rounded border border-[#e9ebed] px-2 py-1 my-1">↗ NAT gateway {n.name || n.id}<span className="block text-[#5f6b7a]">in {full.subnets.find((s) => s.id === n.subnetId)?.az}</span></div>)}
            {c.eps.map((e) => <div key={e.id} className="rounded border border-[#e9ebed] px-2 py-1 my-1">🔒 {e.type} endpoint {e.service.split('.').pop()}</div>)}
            {!c.igws.length && !nats.length && !c.eps.length && <div className="text-[#5f6b7a]">None. This VPC is fully isolated.</div>}
          </div>
        </div>
        {c.subnets.some((s) => !subnetRouteTable(full, s)) && <Alert kind="warning">Some subnets have no route table.</Alert>}
      </Panel>
    </Page>
  );
}
