import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Radios, MultiCheck, KV, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { REGIONS } from '../../../cloud/seed';
import type { DnsRecord, HostedZone } from '../../../cloud/types';
import { Group } from '../s3/lib';
import { CLIENT_LOCATIONS, GEO_LOCATIONS, resolve } from './resolve';

export default function Route53Console() {
  return (
    <div className="flex">
      <SideNav title="Route 53" items={[{ label: 'Hosted zones', to: '/console/route53' }, { label: 'Health checks', to: '/console/route53/healthchecks' }, { label: 'Test record', to: '/console/route53/test' }, { section: 'Resolver' }, { label: 'VPCs', to: '/console/route53' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<ZoneList />} />
          <Route path="create" element={<CreateZone />} />
          <Route path="zones/:id" element={<ZoneDetail />} />
          <Route path="healthchecks" element={<HealthChecks />} />
          <Route path="test" element={<TestRecord />} />
        </Routes>
      </div>
    </div>
  );
}

const upperId = (prefix: string, n: number) => prefix + Array.from({ length: n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
const crumbs = (label?: string) => [{ label: 'Route 53', to: '/console/route53' }, { label: 'Hosted zones', to: '/console/route53' }, ...(label ? [{ label }] : [])];
const policyLabel: Record<DnsRecord['policy'], string> = { simple: 'Simple', weighted: 'Weighted', latency: 'Latency', failover: 'Failover', geolocation: 'Geolocation', multivalue: 'Multivalue answer' };

function ZoneList() {
  const zones = useCloud((c) => c.hostedZones);
  const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const nav = useNavigate();
  const z = zones.find((x) => x.id === sel);
  const custom = z ? z.records.filter((r) => r.type !== 'NS' && r.type !== 'SOA').length : 0;
  return (
    <Page title="Hosted zones" crumbs={crumbs()}>
      <Panel title="Hosted zones" counter={zones.length} desc="Route 53 is a global service: hosted zones are not tied to a Region."
        actions={<><Button disabled={!z} onClick={() => z && nav(`/console/route53/zones/${z.id}`)}>View details</Button><Button disabled={!z} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/route53/create')}>Create hosted zone</Button></>}>
        <Table rows={zones} selected={sel} onSelect={setSel} filterText={(r) => r.domain} empty="No hosted zones."
          columns={[
            { header: 'Hosted zone name', cell: (r) => <Link to={`/console/route53/zones/${r.id}`}>{r.domain}</Link> },
            { header: 'Type', cell: (r) => (r.private ? 'Private' : 'Public') },
            { header: 'Record count', cell: (r) => r.records.length },
            { header: 'Hosted zone ID', cell: (r) => <span className="font-mono">{r.id}</span> },
          ]} />
      </Panel>
      <Teach>A public hosted zone answers the internet; a private one answers only inside the VPCs you associate (split-horizon DNS when both exist for the same name). Each zone costs $0.50/month. To use a domain registered elsewhere, point the registrar's NS records at the zone's four name servers.</Teach>
      {del && z && (custom
        ? <ConfirmDelete what={z.domain} warning={`The zone still has ${custom} records besides NS and SOA. Delete them first.`} onClose={() => setDel(false)} onConfirm={() => {}} />
        : <ConfirmDelete what={z.domain} onClose={() => setDel(false)} onConfirm={() => { remove('hostedZones', z.id); log('route53', `DeleteHostedZone ${z.domain}`); setSel(null); }} />)}
    </Page>
  );
}

function CreateZone() {
  const vpcs = useCloud((c) => c.vpcs);
  const zones = useCloud((c) => c.hostedZones);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [domain, setDomain] = useState('');
  const [desc, setDesc] = useState('');
  const [priv, setPriv] = useState<'public' | 'private'>('public');
  const [vpcIds, setVpcIds] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const d = domain.trim().toLowerCase().replace(/\.$/, '');
  const domErr = !d ? 'Enter a domain name.' : !/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(d) ? 'Enter a valid domain name, such as example.com.' : zones.some((z) => z.domain === d && z.private === (priv === 'private')) ? `You already have a ${priv} hosted zone for ${d}.` : undefined;
  const vpcErr = priv === 'private' && !vpcIds.length ? 'A private hosted zone needs at least one VPC.' : undefined;
  const noDns = vpcs.filter((v) => vpcIds.includes(v.id) && !v.dnsHostnames);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true);
    if (domErr || vpcErr) return;
    const n = () => Math.floor(Math.random() * 2000);
    const ns = [`ns-${n()}.awsdns-${n() % 64}.com`, `ns-${n()}.awsdns-${n() % 64}.net`, `ns-${n()}.awsdns-${n() % 64}.org`, `ns-${n()}.awsdns-${n() % 64}.co.uk`];
    const z: HostedZone = {
      id: upperId('Z0', 18), name: desc || d, domain: d, region: 'global', createdAt: Date.now(), private: priv === 'private', vpcIds: priv === 'private' ? vpcIds : [],
      records: [
        { id: 'ns', name: d, type: 'NS', value: ns.map((x) => x + '.').join('\n'), ttl: 172800, alias: false, policy: 'simple' },
        { id: 'soa', name: d, type: 'SOA', value: `${ns[0]}. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400`, ttl: 900, alias: false, policy: 'simple' },
      ],
    };
    put('hostedZones', z);
    log('route53', `CreateHostedZone ${d} (${priv}${z.private ? `, VPCs ${vpcIds.join(', ')}` : ''})`);
    nav(`/console/route53/zones/${z.id}`);
  };
  return (
    <Page title="Create hosted zone" crumbs={crumbs('Create hosted zone')}>
      <form onSubmit={submit} className="max-w-[860px]">
        <Panel title="Hosted zone configuration" desc="A hosted zone is a container that holds information about how you want to route traffic for a domain and its subdomains.">
          <Field label="Domain name" hint="This is the name of the domain that you want to route traffic for." error={tried || domain ? domErr : undefined}><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" /></Field>
          <Field label="Description - optional"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Group label="Type">
            <Radios value={priv} onChange={setPriv} options={[{ value: 'public', label: 'Public hosted zone', desc: 'Determines how traffic is routed on the internet.' }, { value: 'private', label: 'Private hosted zone', desc: 'Determines how traffic is routed within an Amazon VPC.' }]} />
          </Group>
        </Panel>
        {priv === 'private' && (
          <Panel title="VPCs to associate with the hosted zone" desc="Route 53 Resolver in these VPCs answers queries for this zone.">
            <Group label="VPC IDs" error={tried ? vpcErr : undefined}>
              <MultiCheck value={vpcIds} onChange={setVpcIds} options={vpcs.map((v) => ({ value: v.id, label: <span>{v.id} <span className="aws-hint">{v.name} · {v.region} · {v.cidr}</span></span> }))} />
            </Group>
            {noDns.length > 0 && <Alert kind="warning">{noDns.map((v) => v.id).join(', ')} has DNS hostnames disabled. Private hosted zones need enableDnsHostnames and enableDnsSupport set to true on the VPC.</Alert>}
            <Teach>Private zones can be associated with VPCs in other Regions and (via the CLI/API authorization flow) other accounts. For hybrid DNS with on-premises, use Route 53 Resolver inbound/outbound endpoints.</Teach>
          </Panel>
        )}
        <FormFooter onCancel={() => nav('/console/route53')} submitLabel="Create hosted zone" />
      </form>
    </Page>
  );
}

function ZoneDetail() {
  const { id } = useParams();
  const z = useCloud((c) => c.hostedZones.find((x) => x.id === id));
  const vpcs = useCloud((c) => c.vpcs);
  const checks = useCloud((c) => c.healthChecks);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [del, setDel] = useState(false);
  if (!z) return <Page title="Hosted zone not found" crumbs={crumbs()}><Alert kind="error">No such hosted zone.</Alert></Page>;
  const upd = (fn: (z: HostedZone) => void, msg: string) => { mutate((c) => { const x = c.hostedZones.find((y) => y.id === z.id); if (x) fn(x); }); log('route53', msg); };
  const r = z.records.find((x) => x.id === sel);
  const nsList = z.records.find((x) => x.type === 'NS')?.value.split('\n') ?? [];
  return (
    <Page title={z.domain} crumbs={crumbs(z.domain)} actions={<Button onClick={() => nav(`/console/route53/test?zone=${z.id}`)}>Test record</Button>}>
      <Panel title="Hosted zone details">
        <KV items={[['Hosted zone name', z.domain], ['Type', z.private ? 'Private hosted zone' : 'Public hosted zone'], ['Hosted zone ID', z.id], ['Record count', String(z.records.length)], ['Created', fmtDate(z.createdAt)], ['Name servers', <div className="font-mono text-[12px]">{nsList.map((n) => <div key={n}>{n}</div>)}</div>]]} />
      </Panel>
      {z.private && (
        <Panel title="VPCs associated with the hosted zone" counter={z.vpcIds.length}>
          <MultiCheck value={z.vpcIds} options={vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name}, ${v.region})` }))}
            onChange={(ids) => ids.length ? upd((x) => { x.vpcIds = ids; }, `Updated VPC associations for ${z.domain}: ${ids.join(', ')}`) : undefined} />
          <div className="aws-hint mt-1">A private hosted zone must stay associated with at least one VPC.</div>
        </Panel>
      )}
      <Panel title="Records" counter={z.records.length}
        actions={<><Button disabled={!r || r.type === 'NS' || r.type === 'SOA'} onClick={() => setDel(true)}>Delete record</Button><Button primary onClick={() => setCreating(true)}>Create record</Button></>}>
        <Table rows={z.records} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.type} ${x.value}`}
          columns={[
            { header: 'Record name', cell: (x) => x.name },
            { header: 'Type', cell: (x) => x.type },
            { header: 'Routing policy', cell: (x) => policyLabel[x.policy] },
            { header: 'Differentiator', cell: (x) => (x.policy === 'weighted' ? `${x.weight}` : x.policy === 'latency' ? x.region : x.policy === 'failover' ? x.failover : x.policy === 'geolocation' ? (GEO_LOCATIONS.find((g) => g.value === x.location)?.label ?? x.location) : '-') },
            { header: 'Alias', cell: (x) => (x.alias ? 'Yes' : 'No') },
            { header: 'Value/Route traffic to', cell: (x) => <span className="font-mono text-[12px] whitespace-pre-line">{x.value}</span> },
            { header: 'TTL (seconds)', cell: (x) => (x.alias ? '-' : x.ttl) },
            { header: 'Health check', cell: (x) => { const h = checks.find((c) => c.id === x.healthCheckId); return h ? <Status value={h.healthy ? 'Healthy' : 'Unhealthy'} /> : '-'; } },
            { header: 'Record ID', cell: (x) => x.setId ?? '-' },
          ]} />
      </Panel>
      {creating && <CreateRecord z={z} onCancel={() => setCreating(false)} onSave={(rec) => { upd((x) => { x.records.push(rec); }, `ChangeResourceRecordSets ${z.domain}: CREATE ${rec.name} ${rec.type} (${rec.policy}${rec.failover ? ' ' + rec.failover : ''}${rec.alias ? ', alias' : ''})`); setCreating(false); }} />}
      {del && r && <ConfirmDelete what={`record ${r.name} ${r.type}`} onClose={() => setDel(false)} onConfirm={() => { upd((x) => { x.records = x.records.filter((y) => y.id !== r.id); }, `ChangeResourceRecordSets ${z.domain}: DELETE ${r.name} ${r.type}`); setSel(null); }} />}
    </Page>
  );
}

function CreateRecord({ z, onSave, onCancel }: { z: HostedZone; onSave: (r: DnsRecord) => void; onCancel: () => void }) {
  const lbs = useCloud((c) => c.loadBalancers);
  const dists = useCloud((c) => c.distributions);
  const sites = useCloud((c) => c.buckets.filter((b) => b.staticWebsite));
  const checks = useCloud((c) => c.healthChecks);
  const [sub, setSub] = useState('');
  const [type, setType] = useState<DnsRecord['type']>('A');
  const [alias, setAlias] = useState(false);
  const [value, setValue] = useState('');
  const [target, setTarget] = useState('');
  const [ttl, setTtl] = useState('300');
  const [policy, setPolicy] = useState<DnsRecord['policy']>('simple');
  const [setId, setSetId] = useState('');
  const [weight, setWeight] = useState('10');
  const [region, setRegion] = useState('us-east-1');
  const [failover, setFailover] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [location, setLocation] = useState('*');
  const [hcId, setHcId] = useState('');
  const [tried, setTried] = useState(false);

  const name = sub.trim() ? `${sub.trim().toLowerCase()}.${z.domain}` : z.domain;
  const apex = name === z.domain;
  const targets = [
    ...lbs.map((l) => ({ value: `alb|${l.dnsName}`, label: `Alias to ${l.type === 'application' ? 'Application' : 'Network'} Load Balancer: ${l.name} (${l.region})`, s3: '' })),
    ...dists.map((d) => ({ value: `cf|${d.domainName}`, label: `Alias to CloudFront distribution: ${d.domainName}`, s3: '' })),
    ...sites.map((b) => ({ value: `s3|${b.name}.s3-website-${b.region}.amazonaws.com`, label: `Alias to S3 website endpoint: ${b.name} (${b.region})`, s3: b.name })),
    ...z.records.filter((r) => r.type === 'A' && r.name !== name).map((r) => ({ value: `rec|${r.name}`, label: `Alias to another record in this hosted zone: ${r.name}`, s3: '' })),
  ];
  const t = targets.find((x) => x.value === target);
  const same = z.records.filter((r) => r.name === name && r.type === type);
  const canAlias = type === 'A' || type === 'AAAA';
  const isAlias = alias && canAlias;

  const err = (() => {
    if (sub && !/^(\*|[a-z0-9_]([a-z0-9-_]*[a-z0-9])?)(\.[a-z0-9_]([a-z0-9-_]*[a-z0-9])?)*$/i.test(sub.trim())) return { f: 'name', m: 'Record name may contain letters, numbers, hyphens, underscores and dots (or a leading *).' };
    if (type === 'CNAME' && apex) return { f: 'name', m: 'Bad request: a CNAME record is not permitted at the zone apex. Use an alias A record instead.' };
    if (type === 'CNAME' && z.records.some((r) => r.name === name && r.type !== 'CNAME')) return { f: 'name', m: `A CNAME cannot coexist with other records named ${name}.` };
    if (type !== 'CNAME' && z.records.some((r) => r.name === name && r.type === 'CNAME')) return { f: 'name', m: `${name} already has a CNAME record; no other record types are allowed for that name.` };
    if (isAlias && !t) return { f: 'value', m: 'Choose an endpoint to route traffic to.' };
    if (isAlias && t?.s3 && t.s3 !== name) return { f: 'value', m: `An alias to an S3 website endpoint only works when the bucket name equals the record name (${name}); this bucket is ${t.s3}.` };
    if (!isAlias && !value.trim()) return { f: 'value', m: 'Enter a value.' };
    if (!isAlias && type === 'A' && value.split('\n').some((v) => v.trim() && !/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v.trim()))) return { f: 'value', m: 'An A record value must be IPv4 addresses, one per line.' };
    if (!isAlias && !(Number(ttl) >= 0)) return { f: 'ttl', m: 'TTL must be a number of seconds.' };
    if (same.length && policy === 'simple') return { f: 'policy', m: `A simple record for ${name} ${type} already exists. Edit it, or use another routing policy.` };
    if (same.some((r) => r.policy !== policy)) return { f: 'policy', m: `Existing ${name} ${type} records use ${policyLabel[same[0].policy]} routing; every record with the same name and type must use the same policy.` };
    if (policy !== 'simple' && !setId.trim()) return { f: 'setId', m: 'Record ID is required for this routing policy.' };
    if (policy !== 'simple' && same.some((r) => r.setId === setId.trim())) return { f: 'setId', m: 'Record ID must be unique for this name and type.' };
    if (policy === 'failover' && same.some((r) => r.failover === failover)) return { f: 'policy', m: `A ${failover} failover record already exists for ${name}.` };
    if (policy === 'weighted' && !(Number(weight) >= 0 && Number(weight) <= 255)) return { f: 'policy', m: 'Weight must be 0–255.' };
    if (policy === 'geolocation' && same.some((r) => r.location === location)) return { f: 'policy', m: 'A record for this location already exists.' };
  })();
  const e = (f: string) => (tried && err?.f === f ? err.m : undefined);

  const submit = () => {
    setTried(true);
    if (err) return;
    onSave({
      id: Math.random().toString(36).slice(2, 10), name, type, alias: isAlias, value: isAlias ? target.split('|')[1] : value.trim(), ttl: isAlias ? 60 : Number(ttl), policy,
      setId: policy === 'simple' ? undefined : setId.trim(), weight: policy === 'weighted' ? Number(weight) : undefined, region: policy === 'latency' ? region : undefined,
      failover: policy === 'failover' ? failover : undefined, location: policy === 'geolocation' ? location : undefined, healthCheckId: policy !== 'simple' && hcId ? hcId : undefined,
    });
  };

  return (
    <Panel title="Create record" desc={`Records in ${z.domain}`}>
      <div className="grid md:grid-cols-2 gap-x-6">
        <Field label="Record name" hint={`Leave blank to create a record for the root domain (zone apex). Full name: ${name}`} error={e('name')}>
          <div className="flex items-center gap-1"><Input value={sub} onChange={(ev) => setSub(ev.target.value)} placeholder="www" /><span className="whitespace-nowrap">.{z.domain}</span></div>
        </Field>
        <Field label="Record type"><Select value={type} onChange={(v) => setType(v as DnsRecord['type'])} options={[
          { value: 'A', label: 'A – Routes traffic to an IPv4 address and some AWS resources' }, { value: 'AAAA', label: 'AAAA – Routes traffic to an IPv6 address and some AWS resources' },
          { value: 'CNAME', label: 'CNAME – Routes traffic to another domain name and to some AWS resources' }, { value: 'MX', label: 'MX – Specifies mail servers' }, { value: 'TXT', label: 'TXT – Used to verify email senders and for application-specific values' },
        ]} /></Field>
      </div>
      {canAlias && <label className="flex items-center gap-2 mb-3 cursor-pointer"><input type="checkbox" checked={alias} onChange={(ev) => setAlias(ev.target.checked)} /><span className="font-semibold">Alias</span></label>}
      {isAlias
        ? <Field label="Route traffic to" error={e('value')}><Select value={target} onChange={setTarget} options={[{ value: '', label: 'Choose endpoint' }, ...targets]} /></Field>
        : <div className="grid md:grid-cols-[1fr_200px] gap-x-6">
            <Field label="Value" hint="Enter multiple values on separate lines." error={e('value')}><textarea className="aws-input font-mono h-20" value={value} onChange={(ev) => setValue(ev.target.value)} placeholder={type === 'CNAME' ? 'www.example.net' : type === 'A' ? '192.0.2.235' : ''} /></Field>
            <Field label="TTL (seconds)" error={e('ttl')}><Input type="number" value={ttl} onChange={(ev) => setTtl(ev.target.value)} /></Field>
          </div>}
      <Teach title="Alias vs CNAME">An alias record is a Route 53 extension: it points at an AWS resource (ALB/NLB, CloudFront, S3 website, API Gateway, another record), follows its IP changes automatically, is free to query, and works at the zone apex. A CNAME can point anywhere but costs per query and is illegal at the apex (example.com). "Point example.com at my ALB" = alias A record.</Teach>

      <Field label="Routing policy" error={e('policy')}><Select value={policy} onChange={(v) => setPolicy(v as DnsRecord['policy'])} options={Object.entries(policyLabel).map(([v, l]) => ({ value: v, label: l }))} /></Field>
      {policy !== 'simple' && (
        <div className="grid md:grid-cols-2 gap-x-6">
          {policy === 'weighted' && <Field label="Weight" hint="0–255. Traffic share = weight / sum of weights."><Input type="number" value={weight} onChange={(ev) => setWeight(ev.target.value)} /></Field>}
          {policy === 'latency' && <Field label="Region"><Select value={region} onChange={setRegion} options={REGIONS.map((r) => ({ value: r.id, label: `${r.name} ${r.id}` }))} /></Field>}
          {policy === 'failover' && <Group label="Failover record type"><Radios value={failover} onChange={setFailover} options={[{ value: 'PRIMARY', label: 'Primary' }, { value: 'SECONDARY', label: 'Secondary' }]} /></Group>}
          {policy === 'geolocation' && <Field label="Location"><Select value={location} onChange={setLocation} options={GEO_LOCATIONS} /></Field>}
          <Field label="Health check ID" hint={policy === 'failover' && failover === 'PRIMARY' ? 'Required in practice: without one, the primary is always considered healthy.' : 'Optional.'}>
            <Select value={hcId} onChange={setHcId} options={[{ value: '', label: 'No health check' }, ...checks.map((h) => ({ value: h.id, label: `${h.name} (${h.target})` }))]} />
          </Field>
          <Field label="Record ID" hint="Distinguishes records with the same name and type." error={e('setId')}><Input value={setId} onChange={(ev) => setSetId(ev.target.value)} placeholder={policy === 'failover' ? failover.toLowerCase() : 'us-east-1'} /></Field>
        </div>
      )}
      <Teach title="Routing policies">{{
        simple: 'Simple: one record, possibly several values returned in random order; no health checks.',
        weighted: 'Weighted: split traffic by percentage (blue/green, canary). Weight 0 stops traffic to a record.',
        latency: 'Latency: send users to the Region with the lowest measured latency for them, not the nearest one geographically.',
        failover: 'Failover: active-passive. The PRIMARY answers while its health check passes; otherwise the SECONDARY (often an S3 static "sorry" site or a DR Region).',
        geolocation: "Geolocation: route by the user's continent or country (content rights, localisation, compliance). Add a Default record or unmatched users get no answer. Geoproximity (Traffic Flow) adds a bias to shift regions.",
        multivalue: 'Multivalue answer: up to 8 healthy records returned; client-side load balancing with health checks. Not a replacement for an ELB.',
      }[policy]}</Teach>
      <div className="flex justify-end gap-2"><Button onClick={onCancel}>Cancel</Button><Button primary onClick={submit}>Create records</Button></div>
    </Panel>
  );
}

function HealthChecks() {
  const checks = useCloud((c) => c.healthChecks);
  const zones = useCloud((c) => c.hostedZones);
  const { put, patch, remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [del, setDel] = useState(false);
  const h = checks.find((x) => x.id === sel);
  const usedBy = h ? zones.flatMap((z) => z.records.filter((r) => r.healthCheckId === h.id)) : [];
  return (
    <Page title="Health checks" crumbs={[{ label: 'Route 53', to: '/console/route53' }, { label: 'Health checks' }]}>
      <Panel title="Health checks" counter={checks.length}
        actions={<>
          <Button disabled={!h} onClick={() => { if (!h) return; patch('healthChecks', h.id, { healthy: !h.healthy }); log('route53', `Health check ${h.name}: ${h.healthy ? 'simulated FAILURE (now Unhealthy)' : 'restored (now Healthy)'}`); }}>{h && !h.healthy ? 'Restore health' : 'Simulate failure'}</Button>
          <Button disabled={!h} onClick={() => setDel(true)}>Delete</Button>
          <Button primary onClick={() => setCreating(true)}>Create health check</Button>
        </>}>
        <Table rows={checks} selected={sel} onSelect={setSel} empty="No health checks."
          columns={[
            { header: 'Name', cell: (r) => r.name },
            { header: 'Status', cell: (r) => <Status value={r.healthy ? 'Healthy' : 'Unhealthy'} /> },
            { header: 'Description', cell: (r) => `${r.target}${r.path}` },
            { header: 'ID', cell: (r) => <span className="font-mono text-[12px]">{r.id}</span> },
            { header: 'Used by', cell: (r) => zones.flatMap((z) => z.records.filter((x) => x.healthCheckId === r.id).map((x) => `${x.name} (${x.failover ?? x.setId})`)).join(', ') || '-' },
          ]} />
      </Panel>
      <Teach>Health checkers in ~15 locations probe the endpoint every 30 s (10 s fast); it is healthy if more than 18% of checkers succeed. They can also watch other health checks (calculated) or a CloudWatch alarm, which is how you health-check a private resource the checkers cannot reach. Use "Simulate failure" and then Test record to watch failover happen.</Teach>
      {creating && <CreateHealthCheck onClose={() => setCreating(false)} onSave={(name, target, path) => { put('healthChecks', { id: crypto.randomUUID(), name, target, path, healthy: true, region: 'global', createdAt: Date.now() }); log('route53', `CreateHealthCheck ${name} → ${target}${path}`); setCreating(false); }} />}
      {del && h && (usedBy.length
        ? <ConfirmDelete what={h.name} warning={`Used by ${usedBy.map((r) => r.name).join(', ')}. Remove it from those records first.`} onClose={() => setDel(false)} onConfirm={() => {}} />
        : <ConfirmDelete what={h.name} onClose={() => setDel(false)} onConfirm={() => { remove('healthChecks', h.id); log('route53', `DeleteHealthCheck ${h.name}`); setSel(null); }} />)}
    </Page>
  );
}

function CreateHealthCheck({ onSave, onClose }: { onSave: (name: string, target: string, path: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [proto, setProto] = useState('HTTPS');
  const [path, setPath] = useState('/health');
  const [tried, setTried] = useState(false);
  const err = !name ? 'Enter a name.' : !target ? 'Enter an IP address or domain name.' : undefined;
  return (
    <Modal title="Configure health check" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { setTried(true); if (!err) onSave(name, `${proto.toLowerCase()}://${target}`, path.startsWith('/') ? path : '/' + path); }}>Create health check</Button></>}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="primary-alb" /></Field>
      <Group label="What to monitor"><Radios value="endpoint" onChange={() => {}} options={[{ value: 'endpoint', label: 'Endpoint' }]} /></Group>
      <Field label="Protocol"><Select value={proto} onChange={setProto} options={['HTTP', 'HTTPS', 'TCP']} /></Field>
      <Field label="Domain name or IP address" error={tried ? err : undefined}><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="app.example.com" /></Field>
      <Field label="Path"><Input value={path} onChange={(e) => setPath(e.target.value)} /></Field>
    </Modal>
  );
}

function TestRecord() {
  const zones = useCloud((c) => c.hostedZones);
  const checks = useCloud((c) => c.healthChecks);
  const vpcs = useCloud((c) => c.vpcs);
  const [params] = useSearchParams();
  const [zoneId, setZoneId] = useState(params.get('zone') ?? zones[0]?.id ?? '');
  const z = zones.find((x) => x.id === zoneId);
  const names = [...new Set(z?.records.map((r) => r.name) ?? [])];
  const [name, setName] = useState('');
  const [type, setType] = useState('A');
  const [locId, setLocId] = useState(CLIENT_LOCATIONS[0].id);
  const [out, setOut] = useState<{ res: ReturnType<typeof resolve>; tally?: [string, number][] } | null>(null);
  const qname = names.includes(name) ? name : names.find((n) => n !== z?.domain) ?? names[0] ?? '';
  const types = [...new Set(z?.records.filter((r) => r.name === qname).map((r) => r.type) ?? [])];
  const qtype = types.includes(type as DnsRecord['type']) ? type : types[0] ?? 'A';
  const loc = CLIENT_LOCATIONS.find((l) => l.id === locId)!;
  const run = () => {
    if (!z) return;
    const recs = z.records.filter((r) => r.name === qname && r.type === qtype);
    const res = resolve(recs, loc, checks);
    let tally: [string, number][] | undefined;
    if (recs[0]?.policy === 'weighted') {
      const m = new Map<string, number>();
      for (let i = 0; i < 1000; i++) { const a = resolve(recs, loc, checks).answers[0]; m.set(a?.setId ?? '?', (m.get(a?.setId ?? '?') ?? 0) + 1); }
      tally = [...m.entries()];
    }
    setOut({ res, tally });
  };
  return (
    <Page title="Test record" crumbs={[{ label: 'Route 53', to: '/console/route53' }, { label: 'Test record' }]}>
      <Panel title="Test record" desc="Check the response Route 53 returns for a record, from a simulated resolver location, using the current health-check state.">
        {!zones.length ? <Alert>Create a hosted zone first.</Alert> : (
          <>
            <div className="grid md:grid-cols-2 gap-x-6">
              <Field label="Hosted zone"><Select value={zoneId} onChange={(v) => { setZoneId(v); setOut(null); }} options={zones.map((x) => ({ value: x.id, label: `${x.domain} (${x.private ? 'private' : 'public'})` }))} /></Field>
              <Field label="Record name"><Select value={qname} onChange={(v) => { setName(v); setOut(null); }} options={names} /></Field>
              <Field label="Record type"><Select value={qtype} onChange={(v) => { setType(v); setOut(null); }} options={types} /></Field>
              <Field label="Resolver location (simulated client)"><Select value={locId} onChange={(v) => { setLocId(v); setOut(null); }} options={CLIENT_LOCATIONS.map((l) => ({ value: l.id, label: `${l.label} (${l.country}, ${l.continent})` }))} /></Field>
            </div>
            {z?.private && <Alert kind="info">Private hosted zone: only resolvers inside {z.vpcIds.map((id) => vpcs.find((v) => v.id === id)?.name || id).join(', ')} get these answers. Internet clients would get the public zone's answer (if any).</Alert>}
            <Button primary onClick={run}>Get response</Button>
          </>
        )}
        {out && (
          <div className="mt-4">
            <KV cols={2} items={[['DNS response code', out.res.answers.length ? 'NOERROR' : 'NOERROR (no answer)'], ['Protocol', 'UDP']]} />
            <div className="mt-3 aws-label">Response returned by Route 53</div>
            <div className="font-mono text-[13px] bg-[#f4f4f4] rounded p-2 whitespace-pre-line">{out.res.answers.map((a) => `${a.name}  ${a.alias ? 60 : a.ttl}  IN  ${a.type}  ${a.value}${a.setId ? `    ; record ID "${a.setId}"` : ''}`).join('\n') || '(empty)'}</div>
            <div className="mt-3 aws-label">Why</div>
            <ul className="list-disc ml-5 text-[14px]">{out.res.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
            {out.tally && <div className="mt-2 text-[14px]"><b>1,000 simulated queries:</b> {out.tally.map(([k, n]) => `${k}: ${(n / 10).toFixed(1)}%`).join(' · ')}</div>}
          </div>
        )}
        <Teach>Resolvers cache answers for the TTL, so failover is only as fast as health-check detection plus TTL (alias records use the target's TTL, 60 s for ELB). Latency routing compares Regions, geolocation compares where the user is; on the exam "users must only see content licensed for their country" means geolocation.</Teach>
      </Panel>
    </Page>
  );
}
