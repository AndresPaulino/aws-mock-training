// EC2 console pages for launch templates, target groups, load balancers and Auto Scaling groups.
// Mounted by Ec2Console.tsx at /console/ec2/{launch-templates,target-groups,load-balancers,auto-scaling}/*.
import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Check, MultiCheck, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, fmtDate, useCloud, useCloudActions } from '../../kit';
import { rid } from '../../../cloud/seed';
import { EC2_TYPES, EC2_HOURLY, usd } from '../../../cloud/pricing';
import { terminateInstance } from '../../../cloud/sim';
import type { CloudState, TargetGroup, LoadBalancer, Listener, AutoScalingGroup, ScalingPolicy } from '../../../cloud/types';
import { history, LineChart } from '../cloudwatch/metrics';

// ---------- shared helpers ----------
const useC = () => useCloud((c) => c);
const inRegion = <T extends { region: string }>(c: CloudState, xs: T[]) => xs.filter((x) => x.region === c.region);
const azOf = (c: CloudState, subnetId: string) => c.subnets.find((s) => s.id === subnetId)?.az ?? '?';
const vpcOfSubnet = (c: CloudState, subnetId: string) => c.subnets.find((s) => s.id === subnetId)?.vpcId;
const vpcLabel = (c: CloudState, id: string) => { const v = c.vpcs.find((x) => x.id === id); return v ? `${v.id}${v.name ? ` (${v.name})` : ''} ${v.cidr}` : id; };
const arnElb = (c: CloudState, kind: string, name: string, id: string) => `arn:aws:elasticloadbalancing:${c.region}:${c.accountId}:${kind}/${name}/${id.replace(/^\w+-/, '')}`;

/** A subnet is public when its route table (explicit association, else the VPC main table) sends 0.0.0.0/0 to an IGW. */
export function subnetIsPublic(c: CloudState, subnetId: string): boolean {
  const vpcId = vpcOfSubnet(c, subnetId);
  const rt = c.routeTables.find((r) => r.subnetIds.includes(subnetId)) ?? c.routeTables.find((r) => r.vpcId === vpcId && r.main);
  return !!rt?.routes.some((r) => r.dest === '0.0.0.0/0' && r.target.startsWith('igw-'));
}

function targetHealth(c: CloudState, tg: TargetGroup, instanceId: string): string {
  const i = c.instances.find((x) => x.id === instanceId);
  if (!i || i.state === 'terminated') return 'unavailable';
  if (!c.loadBalancers.some((lb) => lb.listeners.some((l) => l.targetGroupId === tg.id))) return 'unused';
  if (i.state === 'running') return 'healthy';
  if (i.state === 'pending') return 'initial';
  return 'unhealthy';
}

const NotFound = ({ what, to }: { what: string; to: string }) => <Page title={`${what} not found`}><Alert kind="error">It may have been deleted. <Link to={to}>Back to the list</Link></Alert></Page>;
const toInt = (v: string) => (v === '' ? NaN : Number(v));

// ---------- Launch templates ----------
const AMIS = [
  { id: 'ami-0453ec754f44f9a4a', name: 'Amazon Linux 2023 AMI', desc: 'al2023-ami-2023.6 x86_64 HVM · Free tier eligible' },
  { id: 'ami-0e2c8caa4b6378d8c', name: 'Ubuntu Server 24.04 LTS', desc: 'Canonical, ubuntu/images/hvm-ssd-gp3 · Free tier eligible' },
  { id: 'ami-05b4ded3ceb71e470', name: 'Microsoft Windows Server 2022 Base', desc: 'License included in the hourly price' },
  { id: 'ami-0583d8c7a9c35822c', name: 'Red Hat Enterprise Linux 9', desc: 'RHEL 9 HVM, subscription included' },
];
const amiName = (id: string) => AMIS.find((a) => a.id === id)?.name ?? id;
const DEFAULT_USER_DATA = '#!/bin/bash\ndnf install -y httpd\nsystemctl enable --now httpd\necho "Hello from $(hostname -f)" > /var/www/html/index.html';
const typeOptions = EC2_TYPES.map((t) => ({ value: t, label: `${t} · ${usd(EC2_HOURLY[t], 4)}/hr on-demand` }));
const ec2Roles = (c: CloudState) => c.iamRoles.filter((r) => r.trustedEntity.includes('ec2.amazonaws.com'));
const sgOptions = (c: CloudState, vpcId?: string) => inRegion(c, c.securityGroups).filter((g) => !vpcId || g.vpcId === vpcId).map((g) => ({ value: g.id, label: `${g.id} | ${g.name} (${g.vpcId})` }));

export function LaunchTemplatesPage() {
  return <Routes><Route index element={<LtList />} /><Route path="create" element={<LtCreate />} /><Route path=":id" element={<LtDetail />} /></Routes>;
}

function LtList() {
  const c = useC(); const nav = useNavigate(); const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const rows = inRegion(c, c.launchTemplates);
  const s = rows.find((r) => r.id === sel);
  return (
    <Page title="Launch templates" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Launch templates' }]}
      actions={<><Button disabled={!s} onClick={() => setDel(true)}>Delete template</Button><Button primary onClick={() => nav('/console/ec2/launch-templates/create')}>Create launch template</Button></>}>
      <Teach title="Launch templates">A launch template saves the AMI, instance type, security groups, IAM instance profile and user data so Auto Scaling launches identical instances. Templates are versioned. Launch configurations are the older, deprecated option, so pick launch templates on the exam.</Teach>
      <Panel title="Launch templates" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(r) => r.name + r.id} empty="No launch templates. Create one to use with Auto Scaling."
          columns={[
            { header: 'Launch template ID', cell: (r) => <Link to={`/console/ec2/launch-templates/${r.id}`}>{r.id}</Link> },
            { header: 'Launch template name', cell: (r) => r.name },
            { header: 'Latest version', cell: (r) => r.version },
            { header: 'AMI', cell: (r) => amiName(r.ami) },
            { header: 'Instance type', cell: (r) => r.type },
            { header: 'Create time', cell: (r) => fmtDate(r.createdAt) },
          ]} />
      </Panel>
      {del && s && <ConfirmDelete what={`launch template ${s.name}`} onClose={() => setDel(false)}
        warning={c.asgs.some((a) => a.launchTemplateId === s.id) ? 'An Auto Scaling group uses this template. It will not be able to launch new instances.' : undefined}
        onConfirm={() => { remove('launchTemplates', s.id); log('ec2', `Deleted launch template ${s.name} (${s.id})`); setSel(null); }} />}
    </Page>
  );
}

function LtCreate() {
  const c = useC(); const nav = useNavigate(); const { put, log } = useCloudActions();
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [ami, setAmi] = useState(AMIS[0].id); const [type, setType] = useState('t3.micro');
  const [sgIds, setSgIds] = useState<string[]>([]); const [role, setRole] = useState(''); const [userData, setUserData] = useState(DEFAULT_USER_DATA);
  const [tried, setTried] = useState(false);
  const nameErr = !/^[a-zA-Z0-9()./_-]{3,128}$/.test(name) ? 'Use 3–128 characters: letters, numbers and ( ) . / _ -' : c.launchTemplates.some((l) => l.name === name && l.region === c.region) ? 'A launch template with this name already exists.' : undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (nameErr) return;
    const id = rid('lt'); const now = Date.now();
    put('launchTemplates', { id, name, region: c.region, createdAt: now, ami, type, sgIds, iamRole: role || undefined, userData, version: 1, versions: [{ version: 1, ami, type, sgIds, iamRole: role || undefined, userData, description: desc, createdAt: now }] });
    log('ec2', `Created launch template ${name} (${id}) version 1: ${type}, ${amiName(ami)}`);
    nav(`/console/ec2/launch-templates/${id}`);
  };
  return (
    <Page title="Create launch template" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Launch templates', to: '/console/ec2/launch-templates' }, { label: 'Create' }]}>
      <form onSubmit={submit}>
        <Panel title="Launch template name and description">
          <Field label="Launch template name" error={tried ? nameErr : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-template" /></Field>
          <Field label="Template version description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Initial version" /></Field>
        </Panel>
        <Panel title="Application and OS Images (Amazon Machine Image)">
          <Radios value={ami} onChange={setAmi} options={AMIS.map((a) => ({ value: a.id, label: a.name, desc: <>{a.id}<br />{a.desc}</> }))} />
          <Teach>An AMI is regional. To launch the same image in another Region, copy the AMI there first (a common DR answer).</Teach>
        </Panel>
        <Panel title="Instance type">
          <Field label="Instance type"><Select value={type} onChange={setType} options={typeOptions} /></Field>
        </Panel>
        <Panel title="Network settings" desc="Subnets are chosen by the Auto Scaling group, so a template usually leaves them out.">
          <Field label="Security groups"><MultiCheck options={sgOptions(c)} value={sgIds} onChange={setSgIds} /></Field>
        </Panel>
        <Panel title="Advanced details">
          <Field label="IAM instance profile" hint="Only roles whose trust policy allows ec2.amazonaws.com can be attached to instances.">
            <Select value={role} onChange={setRole} options={[{ value: '', label: 'Don\'t include in launch template' }, ...ec2Roles(c).map((r) => ({ value: r.name, label: r.name }))]} />
          </Field>
          <Teach>Give instances an IAM role (instance profile) instead of storing access keys on them. The SDK picks up temporary credentials from the instance metadata service automatically.</Teach>
          <Field label="User data" hint="Runs once as root on first boot (cloud-init).">
            <textarea className="aws-input font-mono text-[13px]" rows={6} value={userData} onChange={(e) => setUserData(e.target.value)} />
          </Field>
        </Panel>
        <FormFooter onCancel={() => nav('/console/ec2/launch-templates')} submitLabel="Create launch template" />
      </form>
    </Page>
  );
}

function LtDetail() {
  const c = useC(); const { id } = useParams(); const { mutate, log } = useCloudActions();
  const lt = c.launchTemplates.find((l) => l.id === id);
  const [mod, setMod] = useState(false);
  const [type, setType] = useState(lt?.type ?? 't3.micro'); const [ami, setAmi] = useState(lt?.ami ?? AMIS[0].id);
  const [userData, setUserData] = useState(lt?.userData ?? ''); const [desc, setDesc] = useState('');
  if (!lt) return <NotFound what="Launch template" to="/console/ec2/launch-templates" />;
  const versions = (lt.versions ?? [{ version: lt.version, ami: lt.ami, type: lt.type, sgIds: lt.sgIds, iamRole: lt.iamRole, userData: lt.userData, createdAt: lt.createdAt }]).map((v) => ({ ...v, id: String(v.version) }));
  const save = () => {
    const v = lt.version + 1;
    mutate((d) => {
      const x = d.launchTemplates.find((l) => l.id === lt.id)!;
      x.versions = [...(x.versions ?? versions.map(({ id: _, ...rest }) => rest)), { version: v, ami, type, sgIds: x.sgIds, iamRole: x.iamRole, userData, description: desc, createdAt: Date.now() }];
      Object.assign(x, { version: v, ami, type, userData });
    });
    log('ec2', `Created version ${v} of launch template ${lt.name}: ${type}, ${amiName(ami)}`);
    setMod(false);
  };
  return (
    <Page title={`${lt.id} (${lt.name})`} crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Launch templates', to: '/console/ec2/launch-templates' }, { label: lt.name }]}
      actions={<Button primary onClick={() => setMod(true)}>Modify template (Create new version)</Button>}>
      <Panel title="Launch template details">
        <KV items={[['Launch template ID', lt.id], ['Name', lt.name], ['Latest version', lt.version], ['AMI', `${amiName(lt.ami)} (${lt.ami})`], ['Instance type', lt.type], ['IAM instance profile', lt.iamRole ?? '–'], ['Security groups', lt.sgIds.join(', ') || '–'], ['Used by', c.asgs.filter((a) => a.launchTemplateId === lt.id).map((a) => a.name).join(', ') || '–'], ['Created', fmtDate(lt.createdAt)]]} />
      </Panel>
      <Panel title="Versions" counter={versions.length}>
        <Table rows={[...versions].reverse()} columns={[
          { header: 'Version', cell: (v) => <>{v.version}{v.version === lt.version && <span className="aws-hint"> (Latest)</span>}</> },
          { header: 'Description', cell: (v) => v.description || '–' },
          { header: 'Instance type', cell: (v) => v.type },
          { header: 'AMI', cell: (v) => amiName(v.ami) },
          { header: 'Created', cell: (v) => fmtDate(v.createdAt) },
        ]} />
        <Teach>Auto Scaling groups can track <b>$Latest</b> or <b>$Default</b>. New versions apply only to instances launched afterwards; use an <b>instance refresh</b> to roll the change onto running instances.</Teach>
      </Panel>
      <Panel title="User data (latest)"><pre className="font-mono text-[12px] bg-[#f4f4f4] p-3 rounded whitespace-pre-wrap">{lt.userData || '(none)'}</pre></Panel>
      {mod && (
        <Modal title="Create new template version" onClose={() => setMod(false)} footer={<><Button onClick={() => setMod(false)}>Cancel</Button><Button primary onClick={save}>Create template version</Button></>}>
          <Field label="Template version description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. bigger instance" /></Field>
          <Field label="AMI"><Select value={ami} onChange={setAmi} options={AMIS.map((a) => ({ value: a.id, label: `${a.name} (${a.id})` }))} /></Field>
          <Field label="Instance type"><Select value={type} onChange={setType} options={typeOptions} /></Field>
          <Field label="User data"><textarea className="aws-input font-mono text-[13px]" rows={5} value={userData} onChange={(e) => setUserData(e.target.value)} /></Field>
        </Modal>
      )}
    </Page>
  );
}

// ---------- Target groups ----------
export function TargetGroupsPage() {
  return <Routes><Route index element={<TgList />} /><Route path="create" element={<TgCreate />} /><Route path=":id" element={<TgDetail />} /></Routes>;
}

const tgLbs = (c: CloudState, tgId: string) => c.loadBalancers.filter((lb) => lb.listeners.some((l) => l.targetGroupId === tgId));

function TgList() {
  const c = useC(); const nav = useNavigate(); const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const rows = inRegion(c, c.targetGroups);
  const s = rows.find((r) => r.id === sel);
  return (
    <Page title="Target groups" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Target groups' }]}
      actions={<><Button disabled={!s} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/ec2/target-groups/create')}>Create target group</Button></>}>
      <Panel title="Target groups" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(r) => r.name} empty="No target groups."
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/console/ec2/target-groups/${r.id}`}>{r.name}</Link> },
            { header: 'Port', cell: (r) => r.port },
            { header: 'Protocol', cell: (r) => r.protocol },
            { header: 'Target type', cell: () => 'Instance' },
            { header: 'Load balancer', cell: (r) => tgLbs(c, r.id).map((l) => l.name).join(', ') || 'None associated' },
            { header: 'VPC ID', cell: (r) => r.vpcId },
            { header: 'Healthy', cell: (r) => `${r.targets.filter((t) => targetHealth(c, r, t) === 'healthy').length} / ${r.targets.length}` },
          ]} />
      </Panel>
      {del && s && (tgLbs(c, s.id).length
        ? <Modal title="Cannot delete target group" onClose={() => setDel(false)}><Alert kind="error">Target group {s.name} is currently in use by a listener of {tgLbs(c, s.id).map((l) => l.name).join(', ')}. Remove the listener first.</Alert></Modal>
        : <ConfirmDelete what={`target group ${s.name}`} onClose={() => setDel(false)} onConfirm={() => { remove('targetGroups', s.id); log('elasticloadbalancing', `Deleted target group ${s.name}`); setSel(null); }} />)}
    </Page>
  );
}

function TgCreate() {
  const c = useC(); const nav = useNavigate(); const { put, log } = useCloudActions();
  const vpcs = inRegion(c, c.vpcs);
  const [targetType, setTargetType] = useState<'instance' | 'ip' | 'lambda' | 'alb'>('instance');
  const [name, setName] = useState(''); const [protocol, setProtocol] = useState<TargetGroup['protocol']>('HTTP'); const [port, setPort] = useState('80');
  const [vpcId, setVpcId] = useState(vpcs[0]?.id ?? ''); const [healthPath, setHealthPath] = useState('/'); const [targets, setTargets] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const instances = c.instances.filter((i) => i.region === c.region && (i.state === 'running' || i.state === 'pending') && vpcOfSubnet(c, i.subnetId) === vpcId);
  const errs = {
    name: !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?$/.test(name) ? 'Up to 32 alphanumeric characters or hyphens; must not begin or end with a hyphen.' : c.targetGroups.some((t) => t.name === name && t.region === c.region) ? 'A target group with this name already exists.' : undefined,
    port: !(toInt(port) >= 1 && toInt(port) <= 65535) ? 'Port must be 1–65535.' : undefined,
    vpc: !vpcId ? 'Choose a VPC.' : undefined,
    path: protocol !== 'TCP' && !healthPath.startsWith('/') ? 'Health check path must start with /.' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (targetType !== 'instance' || Object.values(errs).some(Boolean)) return;
    const id = rid('tg');
    put('targetGroups', { id, name, region: c.region, createdAt: Date.now(), vpcId, protocol, port: toInt(port), healthPath: protocol === 'TCP' ? '' : healthPath, targets });
    log('elasticloadbalancing', `Created target group ${name} (${protocol}:${port}) with ${targets.length} registered target(s)`);
    nav(`/console/ec2/target-groups/${id}`);
  };
  return (
    <Page title="Create target group" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Target groups', to: '/console/ec2/target-groups' }, { label: 'Create' }]}>
      <form onSubmit={submit}>
        <Panel title="Basic configuration">
          <Field label="Choose a target type">
            <Radios value={targetType} onChange={setTargetType} options={[
              { value: 'instance', label: 'Instances', desc: 'Register EC2 instances; Auto Scaling registers its instances for you.' },
              { value: 'ip', label: 'IP addresses', desc: 'On-premises servers over VPN/Direct Connect, or containers.' },
              { value: 'lambda', label: 'Lambda function', desc: 'ALB invokes one function.' },
              { value: 'alb', label: 'Application Load Balancer', desc: 'NLB in front of an ALB (static IPs + layer 7).' },
            ]} />
          </Field>
          {targetType !== 'instance' && <Alert kind="warning">This simulator supports instance targets only. Exam tip: an NLB with an ALB target gives you static IPs (or Elastic IPs) in front of layer-7 routing.</Alert>}
          <Field label="Target group name" error={tried ? errs.name : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-tg" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Protocol"><Select value={protocol} onChange={(v) => { setProtocol(v as TargetGroup['protocol']); setPort(v === 'HTTPS' ? '443' : '80'); }} options={['HTTP', 'HTTPS', 'TCP']} /></Field>
            <Field label="Port" error={tried ? errs.port : undefined}><Input value={port} onChange={(e) => setPort(e.target.value)} /></Field>
          </div>
          <Field label="VPC" error={tried ? errs.vpc : undefined}><Select value={vpcId} onChange={(v) => { setVpcId(v); setTargets([]); }} options={vpcs.map((v) => ({ value: v.id, label: vpcLabel(c, v.id) }))} /></Field>
          <Teach>HTTP/HTTPS target groups are for ALBs; TCP target groups are for NLBs.</Teach>
        </Panel>
        <Panel title="Health checks">
          {protocol !== 'TCP'
            ? <Field label="Health check path" hint="The load balancer sends GET requests here; a 200 response = healthy." error={tried ? errs.path : undefined}><Input value={healthPath} onChange={(e) => setHealthPath(e.target.value)} /></Field>
            : <p className="aws-hint">TCP health checks just open a connection to the traffic port.</p>}
          <KV cols={4} items={[['Healthy threshold', '5'], ['Unhealthy threshold', '2'], ['Timeout', '5 seconds'], ['Interval', '30 seconds']]} />
          <Teach>The load balancer stops sending traffic to targets that fail health checks. If the Auto Scaling group also uses <b>ELB health checks</b>, it replaces those instances.</Teach>
        </Panel>
        <Panel title="Register targets" desc="Optional. Running instances in the selected VPC.">
          <MultiCheck options={instances.map((i) => ({ value: i.id, label: `${i.id} ${i.name ? `(${i.name})` : ''} · ${azOf(c, i.subnetId)} · ${i.state}` }))} value={targets} onChange={setTargets} />
        </Panel>
        <FormFooter onCancel={() => nav('/console/ec2/target-groups')} submitLabel="Create target group" disabled={targetType !== 'instance'} />
      </form>
    </Page>
  );
}

function TgDetail() {
  const c = useC(); const { id } = useParams(); const { mutate, log } = useCloudActions();
  const [reg, setReg] = useState(false); const [pick, setPick] = useState<string[]>([]); const [sel, setSel] = useState<string | null>(null);
  const tg = c.targetGroups.find((t) => t.id === id);
  if (!tg) return <NotFound what="Target group" to="/console/ec2/target-groups" />;
  const rows = tg.targets.map((t) => ({ id: t, inst: c.instances.find((i) => i.id === t) }));
  const candidates = c.instances.filter((i) => (i.state === 'running' || i.state === 'pending') && vpcOfSubnet(c, i.subnetId) === tg.vpcId && !tg.targets.includes(i.id));
  const lbs = tgLbs(c, tg.id);
  const register = () => {
    mutate((d) => { const x = d.targetGroups.find((t) => t.id === tg.id)!; x.targets = [...new Set([...x.targets, ...pick])]; });
    log('elasticloadbalancing', `Registered ${pick.join(', ')} with target group ${tg.name}`);
    setPick([]); setReg(false);
  };
  const deregister = () => {
    if (!sel) return;
    mutate((d) => { const x = d.targetGroups.find((t) => t.id === tg.id)!; x.targets = x.targets.filter((t) => t !== sel); });
    log('elasticloadbalancing', `Deregistered ${sel} from target group ${tg.name} (draining for 300 s)`);
    setSel(null);
  };
  return (
    <Page title={tg.name} crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Target groups', to: '/console/ec2/target-groups' }, { label: tg.name }]}>
      <Panel title="Details">
        <KV items={[['ARN', <span className="text-[12px]">{arnElb(c, 'targetgroup', tg.name, tg.id)}</span>], ['Target type', 'Instance'], ['Protocol : Port', `${tg.protocol}: ${tg.port}`], ['VPC', tg.vpcId], ['Load balancer', lbs.length ? lbs.map((l) => <Link key={l.id} className="mr-2" to={`/console/ec2/load-balancers/${l.id}`}>{l.name}</Link>) : 'None associated'], ['Healthy targets', tg.targets.filter((t) => targetHealth(c, tg, t) === 'healthy').length]]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Targets', content: (
          <Panel title="Registered targets" counter={rows.length} actions={<><Button disabled={!sel} onClick={deregister}>Deregister</Button><Button primary onClick={() => setReg(true)}>Register targets</Button></>}>
            <Table rows={rows} selected={sel} onSelect={setSel} empty="No targets registered." columns={[
              { header: 'Instance ID', cell: (r) => r.id },
              { header: 'Name', cell: (r) => r.inst?.name || '–' },
              { header: 'Port', cell: () => tg.port },
              { header: 'Zone', cell: (r) => (r.inst ? azOf(c, r.inst.subnetId) : '–') },
              { header: 'Health status', cell: (r) => <Status value={targetHealth(c, tg, r.id)} /> },
              { header: 'Health status details', cell: (r) => ({ unused: 'Target group is not configured to receive traffic from the load balancer', initial: 'Target registration is in progress', unhealthy: 'Instance is not running', healthy: '', unavailable: 'Instance terminated' } as Record<string, string>)[targetHealth(c, tg, r.id)] },
            ]} />
            <Teach title="Deregistration delay">When a target is deregistered (or scaled in), the load balancer keeps in-flight requests going for the deregistration delay (default 300 s, "connection draining") before closing them.</Teach>
          </Panel>
        ) },
        { label: 'Health checks', content: (
          <Panel title="Health check settings">
            <KV items={[['Protocol', tg.protocol], ['Path', tg.healthPath || '–'], ['Port', 'Traffic port'], ['Healthy threshold', '5 consecutive successes'], ['Unhealthy threshold', '2 consecutive failures'], ['Timeout', '5 seconds'], ['Interval', '30 seconds'], ['Success codes', tg.protocol === 'TCP' ? '–' : '200']]} />
          </Panel>
        ) },
      ]} />
      {reg && (
        <Modal title="Register targets" onClose={() => setReg(false)} footer={<><Button onClick={() => setReg(false)}>Cancel</Button><Button primary disabled={!pick.length} onClick={register}>Register targets</Button></>}>
          <p className="aws-hint mb-2">Running instances in {tg.vpcId}</p>
          <MultiCheck options={candidates.map((i) => ({ value: i.id, label: `${i.id} ${i.name ? `(${i.name})` : ''} · ${azOf(c, i.subnetId)} · ${i.state}` }))} value={pick} onChange={setPick} />
        </Modal>
      )}
    </Page>
  );
}

// ---------- Load balancers ----------
const CERTS = ['*.example.com', 'www.example.com', 'app.example.org'];

export function LoadBalancersPage() {
  return <Routes><Route index element={<LbList />} /><Route path="create" element={<LbCompare />} /><Route path="create/:kind" element={<LbCreate />} /><Route path=":id" element={<LbDetail />} /></Routes>;
}

function LbList() {
  const c = useC(); const nav = useNavigate(); const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const rows = inRegion(c, c.loadBalancers);
  const s = rows.find((r) => r.id === sel);
  return (
    <Page title="Load balancers" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Load balancers' }]}
      actions={<><Button disabled={!s} onClick={() => setDel(true)}>Delete load balancer</Button><Button primary onClick={() => nav('/console/ec2/load-balancers/create')}>Create load balancer</Button></>}>
      <Panel title="Load balancers" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(r) => r.name + r.dnsName} empty="No load balancers."
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/console/ec2/load-balancers/${r.id}`}>{r.name}</Link> },
            { header: 'DNS name', cell: (r) => <span className="text-[12px]">{r.dnsName}</span> },
            { header: 'State', cell: () => <Status value="Active" /> },
            { header: 'VPC ID', cell: (r) => r.vpcId },
            { header: 'Availability Zones', cell: (r) => `${new Set(r.subnetIds.map((s) => azOf(c, s))).size} Availability Zones` },
            { header: 'Type', cell: (r) => r.type },
            { header: 'Scheme', cell: (r) => r.scheme },
            { header: 'Date created', cell: (r) => fmtDate(r.createdAt) },
          ]} />
      </Panel>
      {del && s && <ConfirmDelete what={`load balancer ${s.name}`} onClose={() => setDel(false)} warning="Its listeners stop accepting traffic. Target groups and instances are not deleted."
        onConfirm={() => { remove('loadBalancers', s.id); log('elasticloadbalancing', `Deleted load balancer ${s.name}`); setSel(null); }} />}
    </Page>
  );
}

function LbCompare() {
  const nav = useNavigate();
  const cards = [
    { kind: 'application', title: 'Application Load Balancer', layer: 'Layer 7 · HTTP / HTTPS / gRPC', desc: 'Routes on host, path, headers and query strings. Targets: instances, IPs, Lambda.', teach: 'Pick ALB for microservices or containers, path-based (/api/*) or host-based routing, authentication with Cognito/OIDC, redirects, WAF integration.' },
    { kind: 'network', title: 'Network Load Balancer', layer: 'Layer 4 · TCP / UDP / TLS', desc: 'Millions of requests per second at ultra-low latency, one static IP per AZ (or your Elastic IPs).', teach: 'Pick NLB when the question says static IP / Elastic IP, allow-listing by IP, UDP, extreme performance, non-HTTP protocols, or PrivateLink (endpoint services sit behind an NLB).' },
    { kind: 'gateway', title: 'Gateway Load Balancer', layer: 'Layer 3 · GENEVE port 6081', desc: 'Deploy, scale and manage third-party virtual appliances transparently.', teach: 'Pick GWLB when traffic must be inspected by third-party firewalls, IDS/IPS or deep packet inspection appliances in the path.' },
  ];
  return (
    <Page title="Compare and select load balancer type" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Load balancers', to: '/console/ec2/load-balancers' }, { label: 'Create' }]}>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((k) => (
          <Panel key={k.kind} title={k.title} desc={k.layer}>
            <p className="mb-3">{k.desc}</p>
            <Teach title="When to use">{k.teach}</Teach>
            {k.kind === 'gateway'
              ? <><Button disabled>Create</Button><p className="aws-hint mt-1">Not simulated here: appliances are out of scope for the hands-on labs.</p></>
              : <Button primary onClick={() => nav(`/console/ec2/load-balancers/create/${k.kind}`)}>Create</Button>}
          </Panel>
        ))}
      </div>
      <Teach title="Classic Load Balancer">The previous-generation CLB is legacy. If an answer offers "migrate CLB to ALB/NLB", that's usually the modern choice.</Teach>
    </Page>
  );
}

type LDraft = { protocol: Listener['protocol']; port: string; targetGroupId: string; certificate: string; redirectToHttps: boolean };

function LbCreate() {
  const c = useC(); const nav = useNavigate(); const { put, log } = useCloudActions();
  const { kind } = useParams();
  const alb = kind === 'application';
  const vpcs = inRegion(c, c.vpcs);
  const defaultSgs = (v: string) => c.securityGroups.filter((g) => g.vpcId === v && g.name === 'default').map((g) => g.id);
  const [name, setName] = useState(''); const [scheme, setScheme] = useState<LoadBalancer['scheme']>('internet-facing');
  const [vpcId, setVpcIdRaw] = useState(vpcs[0]?.id ?? '');
  const [azSub, setAzSub] = useState<Record<string, string>>({});
  const [sgIds, setSgIds] = useState<string[]>(alb ? defaultSgs(vpcs[0]?.id ?? '') : []);
  const [listeners, setListeners] = useState<LDraft[]>([{ protocol: alb ? 'HTTP' : 'TCP', port: '80', targetGroupId: '', certificate: CERTS[0], redirectToHttps: false }]);
  const [tried, setTried] = useState(false);
  if (kind !== 'application' && kind !== 'network') return <NotFound what="Load balancer type" to="/console/ec2/load-balancers/create" />;
  const setVpcId = (v: string) => { setVpcIdRaw(v); setAzSub({}); setSgIds(alb ? defaultSgs(v) : []); setListeners(listeners.map((l) => ({ ...l, targetGroupId: '' }))); };
  const subs = inRegion(c, c.subnets).filter((s) => s.vpcId === vpcId);
  const azs = [...new Set(subs.map((s) => s.az))].sort();
  const chosen = Object.values(azSub).filter(Boolean);
  const tgs = inRegion(c, c.targetGroups).filter((t) => t.vpcId === vpcId && (alb ? t.protocol !== 'TCP' : t.protocol === 'TCP'));
  const setL = (i: number, p: Partial<LDraft>) => setListeners(listeners.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const privateChosen = chosen.filter((s) => !subnetIsPublic(c, s));
  const errs = {
    name: !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?$/.test(name) || name.startsWith('internal-') ? 'Up to 32 alphanumeric characters or hyphens; must not begin or end with a hyphen or start with "internal-".' : c.loadBalancers.some((l) => l.name === name && l.region === c.region) ? 'A load balancer with this name already exists.' : undefined,
    mapping: chosen.length < 2 ? 'Select at least two Availability Zones and one subnet per zone.'
      : scheme === 'internet-facing' && privateChosen.length ? `An internet-facing load balancer needs public subnets. ${privateChosen.join(', ')} has no route to an internet gateway (0.0.0.0/0 → igw-…) in its route table.` : undefined,
    sg: alb && !sgIds.length ? 'Select at least one security group.' : undefined,
    listeners: listeners.map((l) => {
      if (!(toInt(l.port) >= 1 && toInt(l.port) <= 65535)) return 'Port must be 1–65535.';
      if (listeners.filter((x) => x.port === l.port).length > 1) return 'Each listener needs a unique port.';
      if (!(l.protocol === 'HTTP' && l.redirectToHttps) && !l.targetGroupId) return 'Choose a target group to forward to.';
      return undefined;
    }),
  };
  const ok = !errs.name && !errs.mapping && !errs.sg && errs.listeners.every((e) => !e);
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (!ok) return;
    const id = rid('lb');
    put('loadBalancers', {
      id, name, region: c.region, createdAt: Date.now(), type: alb ? 'application' : 'network', scheme, vpcId, subnetIds: chosen, sgIds: alb ? sgIds : [],
      listeners: listeners.map((l) => ({ port: toInt(l.port), protocol: l.protocol, targetGroupId: l.protocol === 'HTTP' && l.redirectToHttps ? '' : l.targetGroupId, certificate: l.protocol === 'HTTPS' || l.protocol === 'TLS' ? l.certificate : undefined, redirectToHttps: l.protocol === 'HTTP' && l.redirectToHttps ? true : undefined })),
      dnsName: `${scheme === 'internal' ? 'internal-' : ''}${name}-${Math.floor(1e8 + Math.random() * 9e8)}.${c.region}.elb.amazonaws.com`,
      crossZone: alb,
    });
    log('elasticloadbalancing', `Created ${alb ? 'Application' : 'Network'} Load Balancer ${name} (${scheme}) in ${chosen.map((s) => azOf(c, s)).join(', ')}`);
    nav(`/console/ec2/load-balancers/${id}`);
  };
  return (
    <Page title={`Create ${alb ? 'Application' : 'Network'} Load Balancer`} crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Load balancers', to: '/console/ec2/load-balancers' }, { label: 'Create', to: '/console/ec2/load-balancers/create' }, { label: alb ? 'ALB' : 'NLB' }]}>
      <form onSubmit={submit}>
        <Panel title="Basic configuration">
          <Field label="Load balancer name" error={tried ? errs.name : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-alb" /></Field>
          <Field label="Scheme">
            <Radios value={scheme} onChange={setScheme} options={[
              { value: 'internet-facing', label: 'Internet-facing', desc: 'Public DNS name; routes requests from clients over the internet. Needs public subnets.' },
              { value: 'internal', label: 'Internal', desc: 'Private IPs only; e.g. the app tier behind a web tier.' },
            ]} />
          </Field>
          <Field label="IP address type"><Select value="ipv4" onChange={() => {}} options={[{ value: 'ipv4', label: 'IPv4' }]} /></Field>
        </Panel>
        <Panel title="Network mapping" desc="The load balancer routes traffic to targets in the selected subnets.">
          <Field label="VPC"><Select value={vpcId} onChange={setVpcId} options={vpcs.map((v) => ({ value: v.id, label: vpcLabel(c, v.id) }))} /></Field>
          <span className="aws-label">Availability Zones and subnets</span>
          <span className="aws-hint block mb-2">Select at least two Availability Zones and one subnet per zone.</span>
          {azs.map((az) => {
            const azSubs = subs.filter((s) => s.az === az);
            return (
              <div key={az} className="mb-2">
                <Check checked={!!azSub[az]} onChange={(v) => setAzSub({ ...azSub, [az]: v ? azSubs[0].id : '' })} label={az} />
                {azSub[az] && <div className="ml-6 max-w-[560px]"><Select value={azSub[az]} onChange={(v) => setAzSub({ ...azSub, [az]: v })} options={azSubs.map((s) => ({ value: s.id, label: `${s.id}${s.name ? ` (${s.name})` : ''} ${s.cidr} · ${subnetIsPublic(c, s.id) ? 'public: route to IGW' : 'private: no IGW route'}` }))} /></div>}
              </div>
            );
          })}
          {!azs.length && <Alert kind="warning">This VPC has no subnets in {c.region}.</Alert>}
          {tried && errs.mapping && <span className="block text-[#d91515] text-[12px]">⊗ {errs.mapping}</span>}
          <Teach>Two or more AZs is what makes the load balancer itself highly available. "Public subnet" means the subnet's route table has 0.0.0.0/0 → an internet gateway; the targets themselves can stay in private subnets.</Teach>
        </Panel>
        {alb ? (
          <Panel title="Security groups">
            <MultiCheck options={sgOptions(c, vpcId)} value={sgIds} onChange={setSgIds} />
            {tried && errs.sg && <span className="block text-[#d91515] text-[12px] mt-1">⊗ {errs.sg}</span>}
            <Teach>Common pattern: the ALB's SG allows 80/443 from 0.0.0.0/0, and the instances' SG allows port 80 <b>only from the ALB's security group</b> (an SG reference, not a CIDR).</Teach>
          </Panel>
        ) : (
          <Teach title="NLB networking">Each NLB node gets a static IP per AZ, and you can attach your own Elastic IPs (internet-facing). Clients see the source IP of the original client.</Teach>
        )}
        <Panel title="Listeners and routing" desc="A listener checks for connection requests on a protocol and port and applies a default action.">
          {listeners.map((l, i) => (
            <div key={i} className="border border-[#e9ebed] rounded-lg p-3 mb-3">
              <div className="grid grid-cols-[140px_120px_1fr_auto] gap-3 items-start">
                <Field label="Protocol"><Select value={l.protocol} onChange={(v) => setL(i, { protocol: v as Listener['protocol'], port: v === 'HTTPS' || v === 'TLS' ? '443' : '80' })} options={alb ? ['HTTP', 'HTTPS'] : ['TCP', 'TLS']} /></Field>
                <Field label="Port"><Input value={l.port} onChange={(e) => setL(i, { port: e.target.value })} /></Field>
                {l.protocol === 'HTTP' && l.redirectToHttps
                  ? <Field label="Default action"><div className="pt-1">Redirect to HTTPS://#{'{host}'}:443/#{'{path}'}?#{'{query}'} (HTTP 301)</div></Field>
                  : <Field label="Default action: Forward to" hint={!tgs.length ? <>No {alb ? 'HTTP/HTTPS' : 'TCP'} target groups in this VPC. <Link to="/console/ec2/target-groups/create">Create target group</Link></> : undefined}>
                    <Select value={l.targetGroupId} onChange={(v) => setL(i, { targetGroupId: v })} options={[{ value: '', label: 'Select a target group' }, ...tgs.map((t) => ({ value: t.id, label: `${t.name} (${t.protocol}:${t.port})` }))]} />
                  </Field>}
                <div className="pt-6">{listeners.length > 1 && <Button onClick={() => setListeners(listeners.filter((_, k) => k !== i))}>Remove</Button>}</div>
              </div>
              {alb && l.protocol === 'HTTP' && <Check checked={l.redirectToHttps} onChange={(v) => setL(i, { redirectToHttps: v })} label="Redirect HTTP to HTTPS" hint="Default action becomes a 301 redirect to port 443. Add an HTTPS:443 listener too." />}
              {(l.protocol === 'HTTPS' || l.protocol === 'TLS') && (
                <>
                  <Field label="Default SSL/TLS server certificate (from ACM)"><Select value={l.certificate} onChange={(v) => setL(i, { certificate: v })} options={CERTS.map((x) => ({ value: x, label: `${x} (ACM, issued)` }))} /></Field>
                  <Teach title="ACM certificates">AWS Certificate Manager issues public certificates for free and renews them automatically. The certificate must be in the <b>same Region</b> as the load balancer (CloudFront needs it in us-east-1). TLS terminates at the load balancer, offloading encryption work from your instances; ALBs use SNI to serve several certificates on one listener.</Teach>
                </>
              )}
              {tried && errs.listeners[i] && <span className="block text-[#d91515] text-[12px]">⊗ {errs.listeners[i]}</span>}
            </div>
          ))}
          <Button onClick={() => setListeners([...listeners, { protocol: alb ? 'HTTPS' : 'TLS', port: '443', targetGroupId: '', certificate: CERTS[0], redirectToHttps: false }])}>Add listener</Button>
        </Panel>
        <Panel title="Summary">
          <KV items={[['Name', name || '–'], ['Scheme', scheme], ['Availability Zones', chosen.map((s) => azOf(c, s)).join(', ') || '–'], ['Listeners', listeners.map((l) => `${l.protocol}:${l.port}`).join(', ')], ['Estimated cost', `${usd(0.0225 + 0.008)}/hr (hourly + ~1 ${alb ? 'LCU' : 'NLCU'})`]]} />
        </Panel>
        <FormFooter onCancel={() => nav('/console/ec2/load-balancers')} submitLabel="Create load balancer" />
      </form>
    </Page>
  );
}

interface TestHit { id: string; n: number; listener: string; node: string; result: string; target: string; az: string }

function LbDetail() {
  const c = useC(); const { id } = useParams(); const { patch, log } = useCloudActions();
  const [hits, setHits] = useState<TestHit[]>([]);
  const lb = c.loadBalancers.find((l) => l.id === id);
  if (!lb) return <NotFound what="Load balancer" to="/console/ec2/load-balancers" />;
  const alb = lb.type === 'application';
  const lbAzs = [...new Set(lb.subnetIds.map((s) => azOf(c, s)))];
  const tgName = (tid: string) => c.targetGroups.find((t) => t.id === tid)?.name ?? tid;
  const healthyOf = (tid: string) => {
    const tg = c.targetGroups.find((t) => t.id === tid);
    return tg ? tg.targets.filter((t) => targetHealth(c, tg, t) === 'healthy').map((t) => ({ id: t, az: azOf(c, c.instances.find((i) => i.id === t)!.subnetId) })) : [];
  };
  const sendTraffic = () => {
    const out: TestHit[] = [];
    for (const l of lb.listeners) {
      const healthy = healthyOf(l.targetGroupId);
      const perNode: Record<string, number> = {};
      for (let k = 0; k < 6; k++) {
        const node = lbAzs[k % lbAzs.length];
        const base = { id: `${l.port}-${k}`, n: out.length + 1, listener: `${l.protocol}:${l.port}`, node };
        if (l.redirectToHttps) { out.push({ ...base, result: '301 → https://…:443', target: '–', az: '–' }); continue; }
        // cross-zone off: a node only uses targets in its own AZ (falls back to all if its AZ has none)
        const local = healthy.filter((h) => h.az === node);
        const pool = lb.crossZone || !local.length ? healthy : local;
        if (!pool.length) { out.push({ ...base, result: '503 Service Unavailable', target: 'no healthy targets', az: '–' }); continue; }
        const t = pool[(perNode[node] = (perNode[node] ?? -1) + 1) % pool.length];
        out.push({ ...base, result: alb ? '200 OK' : 'connection forwarded', target: t.id, az: t.az });
      }
    }
    setHits(out);
    log('elasticloadbalancing', `${lb.name}: sent ${out.length} simulated test requests`);
  };
  const perTarget = hits.reduce<Record<string, number>>((a, h) => (h.az !== '–' ? { ...a, [h.target]: (a[h.target] ?? 0) + 1 } : a), {});
  return (
    <Page title={lb.name} crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Load balancers', to: '/console/ec2/load-balancers' }, { label: lb.name }]}>
      <Panel title="Details">
        <KV items={[['Load balancer type', alb ? 'Application' : 'Network'], ['Status', <Status value="Active" />], ['Scheme', lb.scheme], ['VPC', lb.vpcId], ['Availability Zones', lbAzs.join(', ')], ['DNS name', <span className="text-[12px] break-all">{lb.dnsName} (A Record)</span>], ['ARN', <span className="text-[12px]">{arnElb(c, `loadbalancer/${alb ? 'app' : 'net'}`, lb.name, lb.id)}</span>], ['Cross-zone load balancing', lb.crossZone ? 'On' : 'Off'], ['Date created', fmtDate(lb.createdAt)]]} />
        <Teach>Point Route 53 at the load balancer with an <b>alias A record</b> (free, works at the zone apex). Never hard-code its IPs: ALB IPs change. Need fixed IPs? Use an NLB or Global Accelerator.</Teach>
      </Panel>
      <Panel title="Send test traffic" desc="Simulates 6 client requests per listener and shows which target serves each."
        actions={<Button primary onClick={sendTraffic}>Send test traffic</Button>}>
        {hits.length > 0 && (
          <>
            <Table rows={hits} columns={[
              { header: '#', cell: (h) => h.n }, { header: 'Listener', cell: (h) => h.listener }, { header: 'LB node (AZ)', cell: (h) => h.node },
              { header: 'Result', cell: (h) => h.result }, { header: 'Target', cell: (h) => h.target }, { header: 'Target AZ', cell: (h) => h.az },
            ]} />
            <p className="aws-hint mt-2">{Object.entries(perTarget).map(([t, n]) => `${t}: ${n}`).join(' · ') || 'No requests reached a target.'}</p>
          </>
        )}
        <Teach>{alb ? 'ALBs spread requests round robin across healthy targets (or least outstanding requests).' : 'NLBs pick a target per connection with a flow hash.'} Cross-zone load balancing is on by default (and free) for ALBs, off by default for NLBs. With it off, each AZ's node only uses targets in its own AZ. Unhealthy or "unused" targets never receive traffic.</Teach>
      </Panel>
      <Tabs tabs={[
        { label: 'Listeners and rules', content: (
          <Panel title="Listeners and rules" counter={lb.listeners.length}>
            <Table rows={lb.listeners.map((l, i) => ({ ...l, id: String(i) }))} columns={[
              { header: 'Protocol:Port', cell: (l) => `${l.protocol}:${l.port}` },
              { header: 'Default action', cell: (l) => (l.redirectToHttps ? 'Redirect to HTTPS://#{host}:443/#{path}?#{query} · Status code: HTTP_301' : <>Forward to target group <Link to={`/console/ec2/target-groups/${l.targetGroupId}`}>{tgName(l.targetGroupId)}</Link>: 100% (1 target group)</>) },
              { header: 'Rules', cell: () => (alb ? '1 rule (Default)' : 'Not applicable') },
              { header: 'Security policy', cell: (l) => (l.certificate ? 'ELBSecurityPolicy-TLS13-1-2-2021-06' : 'Not applicable') },
              { header: 'Default SSL/TLS certificate', cell: (l) => l.certificate ? `${l.certificate} (ACM)` : 'Not applicable' },
            ]} />
            <Teach>{alb ? 'ALB listener rules can route by path (/api/*), host header (api.example.com), HTTP header, method, query string or source IP, and can return fixed responses or authenticate users with Cognito/OIDC first.' : 'NLB listeners have no content-based rules: they work at layer 4 only.'}</Teach>
          </Panel>
        ) },
        { label: 'Network mapping', content: (
          <Panel title="Network mapping">
            <Table rows={lb.subnetIds.map((s) => ({ id: s }))} columns={[{ header: 'Zone', cell: (r) => azOf(c, r.id) }, { header: 'Subnet', cell: (r) => r.id }, { header: 'Route to IGW', cell: (r) => (subnetIsPublic(c, r.id) ? 'Yes (public)' : 'No (private)') }]} />
          </Panel>
        ) },
        { label: 'Security', content: <Panel title="Security groups">{alb ? (lb.sgIds.join(', ') || '–') : 'Network Load Balancer without security groups: filter at the targets\' security groups.'}</Panel> },
        { label: 'Monitoring', content: (
          <Panel title="Monitoring">
            <KV cols={4} items={[
              ['HealthyHostCount', lb.listeners.reduce((a, l) => a + healthyOf(l.targetGroupId).length, 0)],
              ['UnHealthyHostCount', lb.listeners.reduce((a, l) => { const tg = c.targetGroups.find((t) => t.id === l.targetGroupId); return a + (tg ? tg.targets.filter((t) => targetHealth(c, tg, t) === 'unhealthy').length : 0); }, 0)],
              ['RequestCount (test)', hits.length],
              ['HTTPCode_ELB_5XX (test)', hits.filter((h) => h.result.startsWith('503')).length],
            ]} />
            <Teach>Turn on <b>access logs</b> (to S3) for per-request details like client IP and latency. A spike in ELB 5XX with zero healthy hosts usually means failing health checks, often a security group that blocks the load balancer.</Teach>
          </Panel>
        ) },
        { label: 'Attributes', content: (
          <Panel title="Attributes">
            <Check checked={lb.crossZone} onChange={(v) => { patch('loadBalancers', lb.id, { crossZone: v }); log('elasticloadbalancing', `${lb.name}: cross-zone load balancing ${v ? 'on' : 'off'}`); }} label="Cross-zone load balancing" hint={alb ? 'Always available on ALBs at no charge.' : 'NLB: inter-AZ data transfer charges apply when on.'} />
            <KV items={[['Idle timeout', alb ? '60 seconds' : '350 seconds (TCP)'], ['Deletion protection', 'Off'], ['Access logs', 'Off']]} />
          </Panel>
        ) },
      ]} />
    </Page>
  );
}

// ---------- Auto Scaling groups ----------
export function AutoScalingPage() {
  return <Routes><Route index element={<AsgList />} /><Route path="create" element={<AsgCreate />} /><Route path=":id" element={<AsgDetail />} /></Routes>;
}

const liveOf = (c: CloudState, asgId: string) => c.instances.filter((i) => i.asgId === asgId && (i.state === 'running' || i.state === 'pending'));
const asgAzs = (c: CloudState, a: AutoScalingGroup) => [...new Set(a.subnetIds.map((s) => azOf(c, s)))];

function deleteAsg(asg: AutoScalingGroup) {
  const { mutate, log } = useCloudActions();
  mutate((d) => {
    for (const i of d.instances.filter((x) => x.asgId === asg.id && x.state !== 'terminated')) terminateInstance(d, i.id);
    d.asgs = d.asgs.filter((x) => x.id !== asg.id);
  });
  log('autoscaling', `${asg.name}: Auto Scaling group deleted and its instances terminated`);
}

function AsgList() {
  const c = useC(); const nav = useNavigate();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const rows = inRegion(c, c.asgs);
  const s = rows.find((r) => r.id === sel);
  return (
    <Page title="Auto Scaling groups" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Auto Scaling groups' }]}
      actions={<><Button disabled={!s} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/ec2/auto-scaling/create')}>Create Auto Scaling group</Button></>}>
      <Teach title="Self-healing">An Auto Scaling group spread across several AZs keeps its desired count: if an instance or a whole AZ fails, it launches replacements in the healthy AZs. ASG + multi-AZ + load balancer is the default "highly available web tier" answer.</Teach>
      <Panel title="Auto Scaling groups" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(r) => r.name} empty="No Auto Scaling groups."
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/console/ec2/auto-scaling/${r.id}`}>{r.name}</Link> },
            { header: 'Launch template', cell: (r) => `${c.launchTemplates.find((l) => l.id === r.launchTemplateId)?.name ?? '(deleted)'} | Version Latest` },
            { header: 'Instances', cell: (r) => liveOf(c, r.id).length },
            { header: 'Status', cell: (r) => (liveOf(c, r.id).length !== r.desired ? <Status value="Updating capacity" /> : '–') },
            { header: 'Desired capacity', cell: (r) => r.desired },
            { header: 'Min', cell: (r) => r.min },
            { header: 'Max', cell: (r) => r.max },
            { header: 'Availability Zones', cell: (r) => asgAzs(c, r).join(', ') },
          ]} />
      </Panel>
      {del && s && <ConfirmDelete what={`Auto Scaling group ${s.name}`} onClose={() => setDel(false)} warning="All instances in the group will be terminated." onConfirm={() => { deleteAsg(s); setSel(null); }} />}
    </Page>
  );
}

function AsgCreate() {
  const c = useC(); const nav = useNavigate(); const { put, log } = useCloudActions();
  const lts = inRegion(c, c.launchTemplates); const vpcs = inRegion(c, c.vpcs);
  const [name, setName] = useState(''); const [ltId, setLtId] = useState(lts[0]?.id ?? '');
  const [vpcId, setVpcId] = useState(vpcs[0]?.id ?? ''); const [subnetIds, setSubnetIds] = useState<string[]>([]);
  const [tgIds, setTgIds] = useState<string[]>([]); const [elb, setElb] = useState(false); const [grace, setGrace] = useState('300');
  const [desired, setDesired] = useState('2'); const [min, setMin] = useState('1'); const [max, setMax] = useState('4'); const [cooldown, setCooldown] = useState('300');
  const [scaling, setScaling] = useState<'none' | 'tt'>('tt'); const [target, setTarget] = useState('50');
  const [tried, setTried] = useState(false);
  const subs = inRegion(c, c.subnets).filter((s) => s.vpcId === vpcId);
  const tgs = inRegion(c, c.targetGroups).filter((t) => t.vpcId === vpcId);
  const [d, mn, mx] = [toInt(desired), toInt(min), toInt(max)];
  const azCount = new Set(subnetIds.map((s) => azOf(c, s))).size;
  const errs = {
    name: !name.trim() ? 'Enter a name.' : !/^[\w.-]{1,255}$/.test(name) ? 'Use letters, numbers, . _ -' : c.asgs.some((a) => a.name === name && a.region === c.region) ? 'An Auto Scaling group with this name already exists.' : undefined,
    lt: !ltId ? 'Choose a launch template.' : undefined,
    subnets: !subnetIds.length ? 'Select at least one subnet.' : undefined,
    elb: elb && !tgIds.length ? 'ELB health checks need the group to be attached to a target group.' : undefined,
    size: !(Number.isInteger(mn) && Number.isInteger(mx) && Number.isInteger(d)) || mn < 0 ? 'Capacities must be whole numbers ≥ 0.' : mx < mn ? 'Max must be ≥ min.' : d < mn || d > mx ? 'Desired capacity must be between min and max.' : mx > 20 ? 'The simulator caps groups at 20 instances.' : undefined,
    grace: !(toInt(grace) >= 0) ? 'Enter seconds ≥ 0.' : undefined,
    cooldown: !(toInt(cooldown) >= 0) ? 'Enter seconds ≥ 0.' : undefined,
    target: scaling === 'tt' && !(toInt(target) >= 1 && toInt(target) <= 100) ? 'Target value must be 1–100.' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    const id = rid('asg');
    put('asgs', {
      id, name, region: c.region, createdAt: Date.now(), launchTemplateId: ltId, subnetIds, min: mn, max: mx, desired: d, targetGroupIds: tgIds, healthCheck: elb ? 'ELB' : 'EC2',
      policies: scaling === 'tt' ? [{ id: rid('pol'), type: 'target-tracking', metric: 'cpu', target: toInt(target) }] : [], load: 20, healthGraceSec: toInt(grace), cooldownSec: toInt(cooldown),
    });
    log('autoscaling', `${name}: created (desired ${d}, min ${mn}, max ${mx}) across ${azCount} AZ(s)${scaling === 'tt' ? `, target tracking CPU ${target}%` : ''}`);
    nav(`/console/ec2/auto-scaling/${id}`);
  };
  const err = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  return (
    <Page title="Create Auto Scaling group" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Auto Scaling groups', to: '/console/ec2/auto-scaling' }, { label: 'Create' }]}>
      <form onSubmit={submit}>
        <Panel title="Step 1: Choose launch template">
          <Field label="Auto Scaling group name" error={err('name')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-asg" /></Field>
          <Field label="Launch template" error={err('lt')} hint={!lts.length ? <>No launch templates in {c.region}. <Link to="/console/ec2/launch-templates/create">Create a launch template</Link></> : 'Version: Latest'}>
            <Select value={ltId} onChange={setLtId} options={[{ value: '', label: 'Select a launch template' }, ...lts.map((l) => ({ value: l.id, label: `${l.name} (${l.type}, ${amiName(l.ami)})` }))]} />
          </Field>
        </Panel>
        <Panel title="Step 2: Choose instance launch options">
          <Field label="VPC"><Select value={vpcId} onChange={(v) => { setVpcId(v); setSubnetIds([]); setTgIds([]); }} options={vpcs.map((v) => ({ value: v.id, label: vpcLabel(c, v.id) }))} /></Field>
          <Field label="Availability Zones and subnets" error={err('subnets')}>
            <MultiCheck options={subs.map((s) => ({ value: s.id, label: `${s.az} | ${s.id}${s.name ? ` (${s.name})` : ''} ${s.cidr}` }))} value={subnetIds} onChange={setSubnetIds} />
          </Field>
          {subnetIds.length > 0 && azCount < 2 && <Alert kind="warning">All subnets are in one Availability Zone. If that AZ fails, the group has nowhere to launch replacements. Pick subnets in at least two AZs.</Alert>}
          <Teach>The group balances instances evenly across the chosen AZs. For a web tier behind a load balancer, instances usually go in <b>private</b> subnets.</Teach>
        </Panel>
        <Panel title="Step 3: Configure advanced options">
          <Field label="Load balancing: attach to existing target groups" hint={!tgs.length ? <>No target groups in this VPC. <Link to="/console/ec2/target-groups/create">Create target group</Link></> : 'New instances are registered automatically.'}>
            <MultiCheck options={tgs.map((t) => ({ value: t.id, label: `${t.name} (${t.protocol}:${t.port})` }))} value={tgIds} onChange={setTgIds} />
          </Field>
          <Check checked={elb} onChange={setElb} label="Turn on Elastic Load Balancing health checks" hint="Recommended. EC2 status checks are always on." />
          {tried && errs.elb && <span className="block text-[#d91515] text-[12px] mb-2">⊗ {errs.elb}</span>}
          <Field label="Health check grace period (seconds)" error={err('grace')}><Input value={grace} onChange={(e) => setGrace(e.target.value)} /></Field>
          <Teach title="Health checks">By default the group only uses <b>EC2 status checks</b> (is the VM alive?). With <b>ELB health checks</b> it also replaces instances whose app fails the target group's health check (e.g. a crashed web server on a running VM). The <b>grace period</b> (default 300 s) gives new instances time to boot and run user data before failed checks count.</Teach>
        </Panel>
        <Panel title="Step 4: Configure group size and scaling">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Desired capacity"><Input value={desired} onChange={(e) => setDesired(e.target.value)} /></Field>
            <Field label="Min desired capacity"><Input value={min} onChange={(e) => setMin(e.target.value)} /></Field>
            <Field label="Max desired capacity"><Input value={max} onChange={(e) => setMax(e.target.value)} /></Field>
          </div>
          {tried && errs.size && <span className="block text-[#d91515] text-[12px] mb-2">⊗ {errs.size}</span>}
          <Field label="Automatic scaling">
            <Radios value={scaling} onChange={setScaling} options={[
              { value: 'none', label: 'No scaling policies', desc: 'The group stays at desired capacity (still self-heals).' },
              { value: 'tt', label: 'Target tracking scaling policy', desc: 'Keeps a metric near a target, like a thermostat.' },
            ]} />
          </Field>
          {scaling === 'tt' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Metric type"><Select value="cpu" onChange={() => {}} options={[{ value: 'cpu', label: 'Average CPU utilization' }]} /></Field>
              <Field label="Target value (%)" error={err('target')}><Input value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
            </div>
          )}
          <Field label="Default cooldown (seconds)" hint="Applies to simple scaling policies." error={err('cooldown')}><Input value={cooldown} onChange={(e) => setCooldown(e.target.value)} /></Field>
          <Teach>Desired = what runs now; min = never fewer (your availability floor); max = never more (your cost ceiling). Policies move desired between min and max.</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/ec2/auto-scaling')} submitLabel="Create Auto Scaling group" />
      </form>
    </Page>
  );
}

const metricLabel: Record<ScalingPolicy['metric'], string> = { cpu: 'Average CPU utilization', requests: 'ALB request count per target', 'queue-depth': 'SQS backlog per instance (custom metric)' };
const policyText = (p: ScalingPolicy) =>
  p.type === 'target-tracking' ? `Target tracking: keep ${metricLabel[p.metric]} at ${p.target}${p.metric === 'cpu' ? '%' : ''}`
  : p.type === 'step' ? `Step scaling: add 1 instance when ${metricLabel[p.metric]} > ${p.target}${p.metric === 'cpu' ? '%' : ''} (CloudWatch alarm), +2 when far above`
  : `Scheduled action: set desired capacity to ${p.target} on cron "${p.schedule}" (UTC)`;

function AsgDetail() {
  const c = useC(); const { id } = useParams(); const nav = useNavigate(); const { patch, mutate, log } = useCloudActions();
  const [edit, setEdit] = useState(false); const [del, setDel] = useState(false); const [addPol, setAddPol] = useState(false);
  const [selInst, setSelInst] = useState<string | null>(null);
  const asg = c.asgs.find((a) => a.id === id);
  if (!asg) return <NotFound what="Auto Scaling group" to="/console/ec2/auto-scaling" />;
  const live = liveOf(c, asg.id);
  const running = live.filter((i) => i.state === 'running');
  const avgCpu = running.length ? running.reduce((a, i) => a + i.cpu, 0) / running.length : undefined;
  const tt = asg.policies.find((p) => p.type === 'target-tracking' && p.metric === 'cpu');
  const lt = c.launchTemplates.find((l) => l.id === asg.launchTemplateId);
  const activity = c.events.filter((e) => e.service === 'autoscaling' && e.msg.startsWith(`${asg.name}:`)).map((e, i) => ({ ...e, id: String(i) }));
  const fail = () => {
    if (!selInst) return;
    mutate((d) => { terminateInstance(d, selInst); d.events.unshift({ t: Date.now(), service: 'autoscaling', msg: `${asg.name}: instance ${selInst} failed health checks and was terminated; a replacement will launch` }); });
    setSelInst(null);
  };
  return (
    <Page title={asg.name} crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Auto Scaling groups', to: '/console/ec2/auto-scaling' }, { label: asg.name }]}
      actions={<><Button onClick={() => setDel(true)}>Delete</Button><Button onClick={() => setEdit(true)}>Edit capacity</Button></>}>
      <Panel title="Load simulator" desc="Learning tool, not in the real console: sets simulated demand on this group. Watch Activity and Instance management as the policy reacts (1 real second = 1 simulated minute).">
        <div className="flex items-center gap-4 mb-4">
          <input type="range" min={0} max={100} value={asg.load} className="flex-1 max-w-[520px]" aria-label="Simulated load"
            onChange={(e) => patch('asgs', asg.id, { load: Number(e.target.value) })} />
          <span className="font-bold w-14">{asg.load}%</span>
        </div>
        <KV cols={4} items={[['Desired capacity', `${asg.desired} (min ${asg.min}, max ${asg.max})`], ['In service', `${running.length} running, ${live.length - running.length} pending`], ['Average CPU', avgCpu === undefined ? '–' : `${avgCpu.toFixed(0)}%`], ['Target tracking', tt ? `CPU ${tt.target}%` : 'No policy: the group will not scale']]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Details', content: (
          <Panel title="Group details">
            <KV items={[
              ['Desired capacity', asg.desired], ['Minimum capacity', asg.min], ['Maximum capacity', asg.max],
              ['Launch template', lt ? <Link to={`/console/ec2/launch-templates/${lt.id}`}>{lt.name} (Latest = v{lt.version})</Link> : '(deleted)'],
              ['Availability Zones', asgAzs(c, asg).join(', ')], ['Subnets', asg.subnetIds.join(', ')],
              ['Target groups', asg.targetGroupIds.map((t) => c.targetGroups.find((x) => x.id === t)?.name ?? t).join(', ') || '–'],
              ['Health check type', asg.healthCheck], ['Health check grace period', `${asg.healthGraceSec ?? 300} seconds`], ['Default cooldown', `${asg.cooldownSec ?? 300} seconds`],
              ['ARN', <span className="text-[12px]">{`arn:aws:autoscaling:${c.region}:${c.accountId}:autoScalingGroup:${asg.id.slice(4)}:autoScalingGroupName/${asg.name}`}</span>], ['Date created', fmtDate(asg.createdAt)],
            ]} />
            <Teach title="Health check grace">During the grace period a new instance's failed health checks are ignored, so slow-booting apps aren't killed in a loop. Too short → instances churn; too long → real failures linger.</Teach>
          </Panel>
        ) },
        { label: 'Activity', content: (
          <Panel title="Activity history" counter={activity.length}>
            <Table rows={activity} empty="No activity yet." columns={[{ header: 'Status', cell: () => <Status value="Successful" /> }, { header: 'Description', cell: (e) => e.msg.slice(asg.name.length + 2) }, { header: 'Start time', cell: (e) => fmtDate(e.t) }]} />
          </Panel>
        ) },
        { label: 'Automatic scaling', content: (
          <>
            <Panel title="Dynamic and scheduled scaling policies" counter={asg.policies.length} actions={<Button primary onClick={() => setAddPol(true)}>Create scaling policy</Button>}>
              <Table rows={asg.policies} empty="No policies. The group stays at its desired capacity." columns={[
                { header: 'Policy', cell: (p) => p.id }, { header: 'Type', cell: (p) => p.type }, { header: 'Settings', cell: policyText },
                { header: '', cell: (p) => <button className="link" onClick={() => { patch('asgs', asg.id, { policies: asg.policies.filter((x) => x.id !== p.id) }); log('autoscaling', `${asg.name}: deleted ${p.type} policy ${p.id}`); }}>Delete</button> },
              ]} />
              {asg.policies.some((p) => p.type !== 'target-tracking') && <Alert>The simulator acts on CPU target tracking automatically. Step policies run when a CloudWatch alarm that targets them goes into ALARM; scheduled actions are listed but not executed.</Alert>}
            </Panel>
            <Teach title="Pick the policy from the wording">"Keep average CPU around 50%" / "maintain requests per target" → <b>target tracking</b>. "Add 2 instances when CPU &gt; 80%, 4 when &gt; 90%" → <b>step scaling</b>. "Traffic spikes every Monday at 9 am" / known event → <b>scheduled</b>. "Recurring daily/weekly pattern, launch capacity ahead of time" → <b>predictive</b>. Queue-driven workers → scale on <b>SQS backlog per instance</b>.</Teach>
            <Teach title="Cooldowns and warmup">After a simple scaling activity the group waits for the <b>cooldown</b> (default 300 s) before scaling again, so it doesn't overreact. Target tracking and step policies use <b>instance warmup</b> instead: new instances don't count toward the metric until warmed up. Scale-out is fast, scale-in is conservative.</Teach>
          </>
        ) },
        { label: 'Instance management', content: (
          <Panel title="Instances" counter={live.length} actions={<Button danger disabled={!selInst} onClick={fail}>Simulate instance failure</Button>}>
            <Table rows={live} selected={selInst} onSelect={setSelInst} empty="No instances yet: the group launches them on the next ticks." columns={[
              { header: 'Instance ID', cell: (i) => i.id }, { header: 'Lifecycle', cell: (i) => (i.state === 'running' ? 'InService' : 'Pending') },
              { header: 'Instance type', cell: (i) => i.type }, { header: 'Availability Zone', cell: (i) => azOf(c, i.subnetId) },
              { header: 'Health status', cell: (i) => <Status value={i.state === 'running' ? 'Healthy' : 'Pending'} /> },
              { header: 'CPU', cell: (i) => `${i.cpu.toFixed(0)}%` }, { header: 'Launch template', cell: () => `${lt?.name ?? '–'} v${lt?.version ?? '?'}` },
            ]} />
            <Teach title="Self-healing">Terminate an instance (or let it fail its health check): the group sees running &lt; desired and launches a replacement, balancing AZs. That's why "ASG with min 1 across 2 AZs" beats a single hand-built instance for availability, even without scaling.</Teach>
          </Panel>
        ) },
        { label: 'Monitoring', content: (
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="CPUUtilization (Average)"><LineChart points={history('CPUUtilization', asg.id)} unit="%" threshold={tt?.target} /></Panel>
            <Panel title="GroupInServiceInstances"><LineChart points={history('GroupInServiceInstances', asg.id)} unit="Count" /></Panel>
          </div>
        ) },
      ]} />
      {edit && <EditCapacity asg={asg} onClose={() => setEdit(false)} />}
      {addPol && <AddPolicy asg={asg} onClose={() => setAddPol(false)} />}
      {del && <ConfirmDelete what={`Auto Scaling group ${asg.name}`} onClose={() => setDel(false)} warning="All instances in the group will be terminated." onConfirm={() => { deleteAsg(asg); nav('/console/ec2/auto-scaling'); }} />}
    </Page>
  );
}

function EditCapacity({ asg, onClose }: { asg: AutoScalingGroup; onClose: () => void }) {
  const { patch, log } = useCloudActions();
  const [desired, setDesired] = useState(String(asg.desired)); const [min, setMin] = useState(String(asg.min)); const [max, setMax] = useState(String(asg.max));
  const [d, mn, mx] = [toInt(desired), toInt(min), toInt(max)];
  const err = !(Number.isInteger(d) && Number.isInteger(mn) && Number.isInteger(mx)) || mn < 0 ? 'Whole numbers ≥ 0.' : mx < mn ? 'Max must be ≥ min.' : d < mn || d > mx ? 'Desired must be between min and max.' : mx > 20 ? 'The simulator caps groups at 20 instances.' : undefined;
  const save = () => { patch('asgs', asg.id, { desired: d, min: mn, max: mx }); log('autoscaling', `${asg.name}: capacity set to desired ${d}, min ${mn}, max ${mx}`); onClose(); };
  return (
    <Modal title="Edit group size" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err} onClick={save}>Update</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Desired capacity"><Input value={desired} onChange={(e) => setDesired(e.target.value)} /></Field>
        <Field label="Min"><Input value={min} onChange={(e) => setMin(e.target.value)} /></Field>
        <Field label="Max"><Input value={max} onChange={(e) => setMax(e.target.value)} /></Field>
      </div>
      {err && <span className="block text-[#d91515] text-[12px]">⊗ {err}</span>}
    </Modal>
  );
}

function AddPolicy({ asg, onClose }: { asg: AutoScalingGroup; onClose: () => void }) {
  const { patch, log } = useCloudActions();
  const [type, setType] = useState<ScalingPolicy['type']>('target-tracking');
  const [metric, setMetric] = useState<ScalingPolicy['metric']>('cpu');
  const [target, setTarget] = useState('50'); const [schedule, setSchedule] = useState('0 9 * * MON-FRI');
  const t = toInt(target);
  const err = type === 'scheduled'
    ? (!schedule.trim() ? 'Enter a cron expression.' : !(Number.isInteger(t) && t >= asg.min && t <= asg.max) ? `Desired capacity must be between ${asg.min} and ${asg.max}.` : undefined)
    : !(t > 0) || (metric === 'cpu' && t > 100) ? 'Enter a positive value (CPU ≤ 100).' : undefined;
  const save = () => {
    const p: ScalingPolicy = { id: rid('pol'), type, metric: type === 'scheduled' ? 'cpu' : metric, target: t, schedule: type === 'scheduled' ? schedule : undefined };
    patch('asgs', asg.id, { policies: [...asg.policies, p] });
    log('autoscaling', `${asg.name}: created ${type} policy (${policyText(p)})`);
    onClose();
  };
  return (
    <Modal title="Create scaling policy" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err} onClick={save}>Create</Button></>}>
      <Field label="Policy type"><Select value={type} onChange={(v) => setType(v as ScalingPolicy['type'])} options={[{ value: 'target-tracking', label: 'Target tracking scaling' }, { value: 'step', label: 'Step scaling' }, { value: 'scheduled', label: 'Scheduled action' }]} /></Field>
      {type !== 'scheduled' && <Field label="Metric"><Select value={metric} onChange={(v) => setMetric(v as ScalingPolicy['metric'])} options={Object.entries(metricLabel).map(([value, label]) => ({ value, label }))} /></Field>}
      {type === 'scheduled' && <Field label="Recurrence (cron, UTC)"><Input value={schedule} onChange={(e) => setSchedule(e.target.value)} /></Field>}
      <Field label={type === 'target-tracking' ? 'Target value' : type === 'step' ? 'Alarm threshold (scale out above)' : 'Desired capacity'}><Input value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
      {err && <span className="block text-[#d91515] text-[12px]">⊗ {err}</span>}
      <Teach>{type === 'target-tracking' ? 'Target tracking creates and manages the CloudWatch alarms for you.' : type === 'step' ? 'Step scaling needs a CloudWatch alarm (create one in CloudWatch → Alarms with this policy as the action) and adds more capacity the further the metric breaches.' : 'Scheduled actions change min/desired/max at a set time: ideal for known, predictable peaks.'}</Teach>
    </Modal>
  );
}
