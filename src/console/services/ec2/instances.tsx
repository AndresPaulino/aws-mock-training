import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, KV, Tabs, Teach, Alert, Check, Radios, MultiCheck, Status, Modal, fmtDate, useCloud, useCloudActions } from '../../kit';
import { EC2_HOURLY, EC2_TYPES, usd } from '../../../cloud/pricing';
import { launchInstance, terminateInstance } from '../../../cloud/sim';
import { rid } from '../../../cloud/seed';
import { isPublicSubnet } from '../../../cloud/reach';
import { randomPublicIp } from '../../../cloud/net';
import type { SgRule, Volume } from '../../../cloud/types';

export const AMIS = [
  { id: 'ami-0c02fb55956c7d316', name: 'Amazon Linux 2023 AMI', desc: 'Free tier eligible · kernel 6.1 · SSM agent preinstalled', os: 'Linux' },
  { id: 'ami-04b70fa74e45c3917', name: 'Ubuntu Server 24.04 LTS', desc: 'Free tier eligible', os: 'Linux' },
  { id: 'ami-0e3c2921641a4a215', name: 'Red Hat Enterprise Linux 9', desc: 'License included in hourly price', os: 'Linux' },
  { id: 'ami-07d9456e59793a7d5', name: 'Microsoft Windows Server 2025 Base', desc: 'License included · bills per second (min 1 minute), same as Linux', os: 'Windows' },
];
const FAMILY: Record<string, string> = { t: 'Burstable general purpose', m: 'General purpose', c: 'Compute optimized', r: 'Memory optimized', x: 'Memory optimized (very large RAM)', i: 'Storage optimized (NVMe instance store)', d: 'Dense HDD storage', p: 'Accelerated (GPU training)', g: 'Accelerated (graphics/inference)', inf: 'Inferentia (ML inference)', hpc: 'HPC (EFA networking)' };
const familyOf = (t: string) => { const k = t.match(/^[a-z]+/)![0]; return FAMILY[k] ?? FAMILY[k[0]] ?? ''; };

export function InstanceList() {
  const instances = useCloud((c) => c.instances);
  const cloud = useCloud((c) => ({ subnets: c.subnets, roles: c.iamRoles }));
  const [sel, setSel] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState(false);
  const [role, setRole] = useState('');
  const { mutate, patch, log } = useCloudActions();
  const nav = useNavigate();
  const i = instances.find((x) => x.id === sel);
  const act = (state: 'running' | 'stopping' | 'pending', msg: string) => { if (!i) return; patch('instances', i.id, { state, ...(state === 'stopping' ? { publicIp: undefined } : state === 'pending' ? { launchedAt: Date.now(), publicIp: i.publicIp ?? (cloud.subnets.find((s) => s.id === i.subnetId)?.autoPublicIp ? `54.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : undefined) } : {}) }); log('ec2', `${msg} ${i.id}`); };
  return (
    <Page title="Instances" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Instances' }]}>
      <Panel title="Instances" counter={instances.length} actions={<>
        <Button disabled={!i || i.state !== 'stopped'} onClick={() => act('pending', 'Started')}>Start</Button>
        <Button disabled={!i || i.state !== 'running'} onClick={() => act('stopping', 'Stopped')}>Stop</Button>
        <Button disabled={!i || i.state !== 'running'} onClick={() => log('ec2', `Rebooted ${i!.id}`)}>Reboot</Button>
        <Button disabled={!i || i.state === 'terminated'} onClick={() => { setRole(i!.iamRole ?? ''); setRoleModal(true); }}>Modify IAM role</Button>
        <Button danger disabled={!i || i.state === 'terminated'} onClick={() => { if (confirm(`Terminate ${i!.id}? This cannot be undone. EBS volumes with "Delete on termination" are deleted.`)) { mutate((c) => terminateInstance(c, i!.id)); log('ec2', `Terminated ${i!.id}`); } }}>Terminate</Button>
        <Button primary onClick={() => nav('/console/ec2/instances/launch')}>Launch instances</Button></>}>
        <Table rows={instances} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.id} ${x.type} ${x.state} ${x.privateIp} ${x.publicIp ?? ''}`} empty="No instances. Launch one to get started." columns={[
          { header: 'Name', cell: (x) => x.name || '–' },
          { header: 'Instance ID', cell: (x) => <Link to={`/console/ec2/instances/${x.id}`}>{x.id}</Link> },
          { header: 'Instance state', cell: (x) => <Status value={x.state[0].toUpperCase() + x.state.slice(1)} /> },
          { header: 'Instance type', cell: (x) => x.type },
          { header: 'Availability Zone', cell: (x) => cloud.subnets.find((s) => s.id === x.subnetId)?.az ?? '–' },
          { header: 'Public IPv4', cell: (x) => x.elasticIp ?? x.publicIp ?? '–' },
          { header: 'Private IPv4', cell: (x) => x.privateIp },
          { header: 'Lifecycle', cell: (x) => (x.purchase === 'spot' ? 'spot' : 'normal') },
        ]} />
      </Panel>
      {roleModal && i && <Modal title="Modify IAM role" onClose={() => setRoleModal(false)} footer={<Button primary onClick={() => { patch('instances', i.id, { iamRole: role || undefined }); log('ec2', `Set IAM role on ${i.id} to ${role || 'none'}`); setRoleModal(false); }}>Update IAM role</Button>}>
        <Field label="IAM role" hint="Only roles that trust ec2.amazonaws.com can be used as instance profiles."><Select value={role} onChange={setRole} options={[{ value: '', label: 'No IAM role' }, ...cloud.roles.filter((r) => r.trustedEntity.includes('ec2')).map((r) => ({ value: r.name, label: r.name }))]} /></Field>
        <Teach>An instance role delivers <b>temporary, auto-rotated credentials</b> through the instance metadata service. Never put access keys on an instance: that's always the wrong answer.</Teach>
      </Modal>}
    </Page>
  );
}

export function LaunchWizard() {
  const cloud = useCloud((c) => ({ vpcs: c.vpcs, subnets: c.subnets, sgs: c.securityGroups, roles: c.iamRoles.filter((r) => r.trustedEntity.includes('ec2')), igws: c.igws, rts: c.routeTables, region: c.region }));
  const full = useCloud((c) => c);
  const { mutate } = useCloudActions();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [ami, setAmi] = useState(AMIS[0].id);
  const [type, setType] = useState('t3.micro');
  const [key, setKey] = useState('');
  const [vpcId, setVpcId] = useState(cloud.vpcs.find((v) => v.isDefault)?.id ?? cloud.vpcs[0]?.id ?? '');
  const vpcSubnets = cloud.subnets.filter((s) => s.vpcId === vpcId);
  const [subnetId, setSubnetId] = useState(vpcSubnets[0]?.id ?? '');
  const subnet = cloud.subnets.find((s) => s.id === subnetId);
  const [pubIp, setPubIp] = useState<'default' | 'enable' | 'disable'>('default');
  const [sgMode, setSgMode] = useState<'existing' | 'create'>('create');
  const [sgIds, setSgIds] = useState<string[]>([]);
  const [allowSsh, setAllowSsh] = useState(false);
  const [allowHttp, setAllowHttp] = useState(false);
  const [allowHttps, setAllowHttps] = useState(false);
  const [diskGb, setDiskGb] = useState(8);
  const [diskType, setDiskType] = useState<Volume['type']>('gp3');
  const [encrypted, setEncrypted] = useState(false);
  const [role, setRole] = useState('');
  const [spot, setSpot] = useState(false);
  const [imdsv2, setImdsv2] = useState(true);
  const [userData, setUserData] = useState('');
  const [count, setCount] = useState(1);
  const amiObj = AMIS.find((a) => a.id === ami)!;
  const effPublic = pubIp === 'default' ? !!subnet?.autoPublicIp : pubIp === 'enable';
  const hourly = (EC2_HOURLY[type] ?? 0.1) * (spot ? 0.3 : 1) * count;
  const subnetPublic = subnet ? isPublicSubnet(full, subnet) : false;

  const launch = () => {
    mutate((c) => {
      let groups = sgIds;
      if (sgMode === 'create') {
        const rules: SgRule[] = [];
        if (allowSsh) rules.push({ protocol: 'tcp', from: amiObj.os === 'Windows' ? 3389 : 22, to: amiObj.os === 'Windows' ? 3389 : 22, source: '0.0.0.0/0' });
        if (allowHttp) rules.push({ protocol: 'tcp', from: 80, to: 80, source: '0.0.0.0/0' });
        if (allowHttps) rules.push({ protocol: 'tcp', from: 443, to: 443, source: '0.0.0.0/0' });
        const id = rid('sg');
        c.securityGroups.push({ id, name: `launch-wizard-${c.securityGroups.filter((s) => s.name.startsWith('launch-wizard')).length + 1}`, description: 'launch-wizard created', vpcId, region: c.region, createdAt: Date.now(), inbound: rules, outbound: [{ protocol: 'all', from: 0, to: 65535, source: '0.0.0.0/0' }] });
        groups = [id];
      }
      for (let k = 0; k < count; k++) {
        const inst = launchInstance(c, { subnetId, type, ami, sgIds: groups, iamRole: role || undefined, keyPair: key || undefined, userData: userData || undefined, name, purchase: spot ? 'spot' : 'on-demand', imdsv2 });
        inst.publicIp = effPublic ? inst.publicIp ?? randomPublicIp() : undefined;
        const v = c.volumes.find((x) => x.attachedTo === inst.id)!;
        Object.assign(v, { sizeGb: diskGb, type: diskType, iops: diskType === 'gp3' ? 3000 : diskType.startsWith('io') ? 3000 : 0, encrypted, kmsKeyId: encrypted ? 'key-aws-ebs' : undefined });
        c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Launched ${inst.id} (${type}${spot ? ', Spot' : ''}) in ${subnet?.az}` });
      }
    });
    nav('/console/ec2/instances');
  };

  return (
    <Page title="Launch an instance" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Instances', to: '/console/ec2/instances' }, { label: 'Launch an instance' }]}>
      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div>
          <Panel title="Name and tags"><Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Web Server" /></Field></Panel>
          <Panel title="Application and OS Images (Amazon Machine Image)">
            <Radios value={ami} onChange={setAmi} options={AMIS.map((a) => ({ value: a.id, label: a.name, desc: `${a.id} · ${a.desc}` }))} />
            <Teach>An <b>AMI</b> is a template (OS + software). AMIs are <b>Regional</b>: to launch in another Region, copy the AMI there first. A "golden AMI" with software pre-baked makes Auto Scaling launches faster than long user-data scripts.</Teach>
          </Panel>
          <Panel title="Instance type">
            <Field label="Instance type" hint={familyOf(type)}><Select value={type} onChange={setType} options={EC2_TYPES.map((t) => ({ value: t, label: `${t} · ${familyOf(t)} · On-Demand ${usd(EC2_HOURLY[t], 4)}/hr` }))} /></Field>
            <Teach>Read the letter: <b>t</b> burstable, <b>m</b> general, <b>c</b> compute, <b>r/x</b> memory, <b>i/d</b> storage, <b>p/g/inf</b> accelerated. A "<b>g</b>" suffix (m7<b>g</b>) = Graviton (ARM), roughly 20% better price-performance.</Teach>
          </Panel>
          <Panel title="Key pair (login)">
            <Field label="Key pair name" hint="Leave blank to proceed without a key pair. You can still connect with Session Manager if the instance has an SSM role and a network path to SSM."><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="my-key" /></Field>
          </Panel>
          <Panel title="Network settings">
            <Field label="VPC"><Select value={vpcId} onChange={(v) => { setVpcId(v); setSubnetId(cloud.subnets.find((s) => s.vpcId === v)?.id ?? ''); setSgIds([]); }} options={cloud.vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name})${v.isDefault ? ' (default)' : ''}` }))} /></Field>
            <Field label="Subnet"><Select value={subnetId} onChange={setSubnetId} options={vpcSubnets.map((s) => ({ value: s.id, label: `${s.name || s.id} · ${s.az} · ${s.cidr} · ${isPublicSubnet(full, s) ? 'public' : 'private'}` }))} /></Field>
            <Field label="Auto-assign public IP"><Select value={pubIp} onChange={(v) => setPubIp(v as typeof pubIp)} options={[{ value: 'default', label: `Use subnet setting (${subnet?.autoPublicIp ? 'Enable' : 'Disable'})` }, { value: 'enable', label: 'Enable' }, { value: 'disable', label: 'Disable' }]} /></Field>
            {effPublic && !subnetPublic && <Alert kind="warning">This subnet has no route to an internet gateway, so a public IP won't make the instance reachable from the internet.</Alert>}
            <Field label="Firewall (security groups)"><Radios value={sgMode} onChange={setSgMode} options={[{ value: 'create', label: 'Create security group' }, { value: 'existing', label: 'Select existing security group' }]} /></Field>
            {sgMode === 'create' ? <div className="pl-1">
              <Check checked={allowSsh} onChange={setAllowSsh} label={`Allow ${amiObj.os === 'Windows' ? 'RDP' : 'SSH'} traffic from Anywhere (0.0.0.0/0)`} hint="Rules with source 0.0.0.0/0 allow all IP addresses. Prefer Session Manager, which needs no inbound port." />
              <Check checked={allowHttp} onChange={setAllowHttp} label="Allow HTTP traffic from the internet" />
              <Check checked={allowHttps} onChange={setAllowHttps} label="Allow HTTPS traffic from the internet" />
            </div> : <MultiCheck value={sgIds} onChange={setSgIds} options={cloud.sgs.filter((s) => s.vpcId === vpcId).map((s) => ({ value: s.id, label: `${s.name} (${s.id})` }))} />}
          </Panel>
          <Panel title="Configure storage">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Size (GiB)"><Input type="number" min={1} max={16384} value={diskGb} onChange={(e) => setDiskGb(Number(e.target.value))} /></Field>
              <Field label="Volume type"><Select value={diskType} onChange={(v) => setDiskType(v as Volume['type'])} options={['gp3', 'gp2', 'io2', 'io1']} /></Field>
              <Field label="Encrypted"><Select value={encrypted ? 'yes' : 'no'} onChange={(v) => setEncrypted(v === 'yes')} options={[{ value: 'no', label: 'Not encrypted' }, { value: 'yes', label: 'Encrypted (aws/ebs)' }]} /></Field>
            </div>
            <Teach>Root volumes can't be st1/sc1 (HDD types aren't bootable). <b>gp3</b> is the default choice: cheaper than gp2, with 3,000 IOPS baseline independent of size. Encryption is set at creation; to encrypt an existing unencrypted volume, snapshot it → copy the snapshot with encryption → create a volume from it.</Teach>
          </Panel>
          <Panel title="Advanced details">
            <Field label="IAM instance profile"><Select value={role} onChange={setRole} options={[{ value: '', label: 'Select (none)' }, ...cloud.roles.map((r) => ({ value: r.name, label: r.name }))]} /></Field>
            {!cloud.roles.length && <p className="aws-hint -mt-3 mb-3">No roles trusted by EC2 yet. <Link to="/console/iam">Create one in IAM</Link>.</p>}
            <Check checked={spot} onChange={setSpot} label="Request Spot Instances" hint="Up to ~90% off, but AWS can reclaim the instance with a 2-minute warning. Only for fault-tolerant, interruptible work." />
            <Check checked={imdsv2} onChange={setImdsv2} label="Metadata version: IMDSv2 only (token required)" hint="Recommended: protects role credentials from SSRF attacks." />
            <Field label="User data (runs once at first boot as root)"><textarea className="aws-input font-mono text-[13px]" rows={4} value={userData} onChange={(e) => setUserData(e.target.value)} placeholder={'#!/bin/bash\ndnf install -y httpd && systemctl enable --now httpd'} /></Field>
          </Panel>
        </div>
        <div className="aws-panel p-5 lg:sticky lg:top-14">
          <h2 className="text-[18px] font-bold mb-3">Summary</h2>
          <Field label="Number of instances"><Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} /></Field>
          <KV cols={1} items={[['Software Image (AMI)', amiObj.name], ['Virtual server type', type], ['Firewall', sgMode === 'create' ? 'New security group' : `${sgIds.length} selected`], ['Storage', `1 volume(s) - ${diskGb} GiB ${diskType}`], ['Estimated cost', `${usd(hourly, 4)}/hour ≈ ${usd(hourly * 730)}/month${spot ? ' (Spot estimate)' : ''}`]]} />
          <div className="mt-4 flex gap-2"><Button onClick={() => nav('/console/ec2/instances')}>Cancel</Button><Button primary disabled={!subnetId || (sgMode === 'existing' && !sgIds.length)} onClick={launch}>Launch instance</Button></div>
          {sgMode === 'existing' && !sgIds.length && <p className="aws-hint mt-2">Select at least one security group.</p>}
        </div>
      </div>
    </Page>
  );
}

export function InstanceDetail() {
  const { id = '' } = useParams();
  const c = useCloud((s) => ({ i: s.instances.find((x) => x.id === id), subnets: s.subnets, sgs: s.securityGroups, vols: s.volumes.filter((v) => v.attachedTo === id) }));
  if (!c.i) return <Page title="Not found"><Alert kind="error">Instance {id} not found.</Alert></Page>;
  const i = c.i;
  const sn = c.subnets.find((s) => s.id === i.subnetId);
  const mySgs = c.sgs.filter((s) => i.sgIds.includes(s.id));
  return (
    <Page title={`Instance summary for ${i.id}${i.name ? ` (${i.name})` : ''}`} crumbs={[{ label: 'Instances', to: '/console/ec2/instances' }, { label: i.id }]}>
      <Panel><KV cols={3} items={[['Instance ID', i.id], ['Instance state', <Status value={i.state} />], ['Instance type', i.type], ['Public IPv4 address', i.elasticIp ?? i.publicIp ?? '–'], ['Private IPv4 address', i.privateIp], ['Subnet ID', `${sn?.id} (${sn?.az})`], ['VPC ID', sn?.vpcId], ['IAM Role', i.iamRole ?? '–'], ['AMI ID', i.ami], ['Purchasing option', i.purchase], ['IMDSv2', i.imdsv2 ? 'Required' : 'Optional'], ['Launch time', fmtDate(i.launchedAt)]]} /></Panel>
      <Panel><Tabs tabs={[
        { label: 'Security', content: <div>
          <KV cols={2} items={[['IAM Role', i.iamRole ?? '–'], ['Security groups', mySgs.map((s) => s.name).join(', ')]]} />
          {mySgs.map((s) => <div key={s.id} className="mt-4"><Link to={`/console/ec2/security-groups/${s.id}`} className="font-bold">{s.name} ({s.id})</Link><div className="text-[13px]">Inbound: {s.inbound.map((r) => `${r.protocol === 'all' ? 'all' : r.from}${r.to !== r.from && r.protocol !== 'all' ? `-${r.to}` : ''} from ${r.source}`).join('; ') || 'none'}</div></div>)}
        </div> },
        { label: 'Networking', content: <div><KV cols={2} items={[['Subnet', `${sn?.name || sn?.id} (${sn?.cidr})`], ['Availability Zone', sn?.az], ['Public IP', i.elasticIp ?? i.publicIp ?? '–'], ['Private IP', i.privateIp]]} /><p className="mt-4"><Link to="/console/vpc/reachability">Analyze reachability for this instance →</Link></p></div> },
        { label: 'Storage', content: <table className="aws-table w-full"><thead><tr><th>Volume ID</th><th>Size</th><th>Type</th><th>IOPS</th><th>Encrypted</th><th>Delete on termination</th></tr></thead><tbody>{c.vols.map((v) => <tr key={v.id}><td>{v.id}</td><td>{v.sizeGb} GiB</td><td>{v.type}</td><td>{v.iops || '–'}</td><td>{v.encrypted ? 'Yes' : 'No'}</td><td>{v.deleteOnTermination ? 'Yes' : 'No'}</td></tr>)}</tbody></table> },
        { label: 'Monitoring', content: <div><div className="text-[13px] text-[#5f6b7a] mb-1">CPU utilization (%): current {i.cpu.toFixed(1)}%</div><div className="h-3 w-full max-w-[400px] bg-[#e9ebed] rounded"><div className="h-3 rounded bg-[#0972d3]" style={{ width: `${i.cpu}%` }} /></div><Teach>Default EC2 metrics come every 5 minutes (1 minute with detailed monitoring). <b>Memory and disk-space metrics are not included</b>: you need the CloudWatch agent. Classic exam question.</Teach></div> },
        { label: 'User data', content: <pre className="bg-[#f4f4f4] p-3 rounded text-[13px] whitespace-pre-wrap">{i.userData ?? 'No user data'}</pre> },
      ]} /></Panel>
    </Page>
  );
}
