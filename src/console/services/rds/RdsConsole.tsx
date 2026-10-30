import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { DbInstance } from '../../../cloud/types';
import { rid, azsOf, REGIONS } from '../../../cloud/seed';
import { RDS_CLASSES, RDS_HOURLY, usd } from '../../../cloud/pricing';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Check, MultiCheck, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { ENGINES, dbPort, dbEndpoint, isPublicSubnet, engineLabel, isAurora } from './util';

export default function RdsConsole() {
  return (
    <div className="flex">
      <SideNav title="Aurora and RDS" items={[{ label: 'Databases', to: '/console/rds' }, { label: 'Snapshots', to: '/console/rds/snapshots' }, { section: 'Proxies' }, { label: 'RDS Proxy', to: '/console/rds/proxies' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<DbList />} />
          <Route path="create" element={<CreateDb />} />
          <Route path="databases/:id" element={<DbDetail />} />
          <Route path="snapshots" element={<Snapshots />} />
          <Route path="proxies" element={<Proxies />} />
        </Routes>
      </div>
    </div>
  );
}

const nameError = (n: string, taken: boolean) =>
  !n ? 'DB identifier is required.'
    : !/^[a-zA-Z][a-zA-Z0-9-]{0,62}$/.test(n) || n.includes('--') || n.endsWith('-') ? '1–63 letters, digits or hyphens; must start with a letter; no trailing or consecutive hyphens.'
      : taken ? 'A DB instance with this identifier already exists in this Region.' : undefined;
const role = (d: DbInstance) => (d.readReplicaOf ? 'Replica' : d.multiAzCluster ? 'Multi-AZ DB cluster' : 'Instance');

function DbList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const dbs = c.dbInstances.filter((d) => d.region === c.region);
  return (
    <Page title="Databases" crumbs={[{ label: 'RDS', to: '/console/rds' }, { label: 'Databases' }]}>
      <Panel title="Databases" counter={dbs.length} actions={<Button primary onClick={() => nav('/console/rds/create')}>Create database</Button>}>
        <Table rows={dbs} filterText={(d) => `${d.name} ${d.engine}`} empty="You don't have any databases in this Region." columns={[
          { header: 'DB identifier', cell: (d) => <Link to={`/console/rds/databases/${d.id}`}>{d.readReplicaOf ? '↳ ' : ''}{d.name}</Link> },
          { header: 'Status', cell: (d) => <Status value={d.status} /> },
          { header: 'Role', cell: role },
          { header: 'Engine', cell: (d) => engineLabel(d.engine) },
          { header: 'Region & AZ', cell: (d) => d.az },
          { header: 'Size', cell: (d) => d.instanceClass },
          { header: 'Multi-AZ', cell: (d) => (d.multiAz ? 'Yes' : 'No') },
        ]} />
      </Panel>
    </Page>
  );
}

type Template = 'production' | 'devtest' | 'free';
type Avail = 'single' | 'multi-instance' | 'multi-cluster';

function CreateDb() {
  const c = useCloud((c) => c);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const vpcs = c.vpcs.filter((v) => v.region === c.region);
  const [engine, setEngine] = useState<DbInstance['engine']>('postgres');
  const [template, setTemplate] = useState<Template>('production');
  const [avail, setAvail] = useState<Avail>('multi-instance');
  const [name, setName] = useState('database-1');
  const [user, setUser] = useState(engine === 'postgres' ? 'postgres' : 'admin');
  const [secrets, setSecrets] = useState(true);
  const [cls, setCls] = useState('db.m7g.large');
  const [storage, setStorage] = useState('100');
  const [vpcId, setVpcId] = useState(vpcs[0]?.id ?? '');
  const [subnetIds, setSubnetIds] = useState<string[]>(c.subnets.filter((s) => s.vpcId === vpcs[0]?.id).map((s) => s.id));
  const [pub, setPub] = useState(false);
  const [sgIds, setSgIds] = useState<string[]>(c.securityGroups.filter((s) => s.vpcId === vpcs[0]?.id && s.name === 'default').map((s) => s.id));
  const [encrypted, setEncrypted] = useState(true);
  const [kms, setKms] = useState(c.kmsKeys.find((k) => k.alias === 'aws/rds')?.id ?? '');
  const [backup, setBackup] = useState('7');
  const [tried, setTried] = useState(false);

  const aurora = isAurora(engine);
  const freeOk = ['mysql', 'postgres', 'mariadb'].includes(engine);
  const pickTemplate = (t: Template) => {
    setTemplate(t);
    if (t === 'production') { setAvail('multi-instance'); setCls('db.m7g.large'); setStorage('100'); }
    if (t === 'devtest') { setAvail('single'); setCls('db.t3.medium'); setStorage('20'); }
    if (t === 'free') { setAvail('single'); setCls('db.t4g.micro'); setStorage('20'); setBackup('1'); }
  };
  const pickEngine = (e: DbInstance['engine']) => {
    setEngine(e);
    setUser(e.includes('postgres') ? 'postgres' : 'admin');
    if (template === 'free' && !['mysql', 'postgres', 'mariadb'].includes(e)) pickTemplate('devtest');
    if (avail === 'multi-cluster' && e !== 'mysql' && e !== 'postgres') setAvail('multi-instance');
  };
  const pickVpc = (id: string) => {
    setVpcId(id);
    setSubnetIds(c.subnets.filter((s) => s.vpcId === id).map((s) => s.id));
    setSgIds(c.securityGroups.filter((s) => s.vpcId === id && s.name === 'default').map((s) => s.id));
  };

  const availOpts: { value: Avail; label: string; desc: string }[] = template === 'free'
    ? [{ value: 'single', label: 'Single-AZ DB instance deployment (1 instance)', desc: 'The free tier only allows a Single-AZ instance.' }]
    : aurora
      ? [{ value: 'single', label: "Don't create an Aurora Replica", desc: 'One writer instance. Storage is still replicated across 3 AZs.' }, { value: 'multi-instance', label: 'Create an Aurora Replica or Reader node in a different AZ', desc: 'Recommended for scaled availability: a reader is the failover target.' }]
      : [
        { value: 'multi-cluster', label: 'Multi-AZ DB cluster deployment (3 instances)', desc: 'One writer and two readable standbys in three AZs.' },
        { value: 'multi-instance', label: 'Multi-AZ DB instance deployment (2 instances)', desc: 'A primary plus a synchronous standby in another AZ. The standby serves no reads.' },
        { value: 'single', label: 'Single-AZ DB instance deployment (1 instance)', desc: 'No standby. Good for dev/test.' },
      ].filter((o) => o.value !== 'multi-cluster' || engine === 'mysql' || engine === 'postgres') as { value: Avail; label: string; desc: string }[];

  const vpcSubnets = c.subnets.filter((s) => s.vpcId === vpcId);
  const azs = [...new Set(vpcSubnets.filter((s) => subnetIds.includes(s.id)).map((s) => s.az))];
  const needAzs = avail === 'multi-cluster' ? 3 : 2;
  const errs = {
    name: nameError(name, c.dbInstances.some((d) => d.region === c.region && d.name.toLowerCase() === name.toLowerCase())),
    user: /^[a-zA-Z][a-zA-Z0-9_]{0,15}$/.test(user) ? undefined : 'Master username must be 1–16 alphanumeric characters and start with a letter.',
    storage: aurora || (Number(storage) >= 20 && Number(storage) <= 65536 && Number.isInteger(Number(storage))) ? undefined : 'Allocated storage must be an integer from 20 to 65,536 GiB.',
    subnets: azs.length >= needAzs ? undefined : `The DB subnet group must cover at least ${needAzs} Availability Zones (it has ${azs.length}).`,
    vpc: vpcId ? undefined : 'Choose a VPC.',
    sg: sgIds.length ? undefined : 'Choose at least one VPC security group.',
    backup: Number(backup) >= (aurora ? 1 : 0) && Number(backup) <= 35 ? undefined : `Backup retention must be ${aurora ? 1 : 0}–35 days.`,
  };
  const valid = Object.values(errs).every((e) => !e);
  const monthly = ((RDS_HOURLY[cls] ?? 0.1) * 730 + (aurora ? 0 : Number(storage) * 0.115)) * (avail === 'single' ? 1 : 2);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const multi = avail !== 'single';
    const d: DbInstance = {
      id: rid('db'), name, region: c.region, createdAt: Date.now(), engine, instanceClass: cls, storageGb: aurora ? 10 : Number(storage),
      multiAz: multi, multiAzCluster: avail === 'multi-cluster' || undefined, az: azs[0], standbyAz: multi ? azs[1] : undefined, subnetIds, sgIds,
      encrypted, kmsKeyId: encrypted ? kms : undefined, publiclyAccessible: pub, backupRetentionDays: Number(backup), status: 'creating',
      endpoint: dbEndpoint(name, c.region), events: [{ t: Date.now(), msg: `DB instance creation started (${multi ? `Multi-AZ: primary ${azs[0]}, standby ${azs[1]}` : `Single-AZ in ${azs[0]}`})` }], snapshots: [],
    };
    put('dbInstances', d);
    log('rds', `CreateDBInstance ${name}: ${engineLabel(engine)} ${cls}${multi ? ', Multi-AZ' : ''}${encrypted ? ', encrypted' : ''}${pub ? ', PUBLICLY ACCESSIBLE' : ''}`);
    nav(`/console/rds/databases/${d.id}`);
  };
  const E = (k: keyof typeof errs) => (tried ? errs[k] : undefined);

  return (
    <Page title="Create database" crumbs={[{ label: 'RDS', to: '/console/rds' }, { label: 'Databases', to: '/console/rds' }, { label: 'Create database' }]}>
      <form onSubmit={submit}>
        <Panel title="Choose a database creation method">
          <Radios value="standard" onChange={() => {}} options={[{ value: 'standard', label: 'Standard create', desc: 'You set all of the configuration options, including availability, security, backups and maintenance.' }]} />
        </Panel>
        <Panel title="Engine options">
          <Radios value={engine} onChange={pickEngine} options={ENGINES.map((x) => ({ value: x.value, label: x.label }))} />
          {aurora && <Teach title="Aurora storage">Aurora separates compute from storage: every cluster volume keeps <b>6 copies of your data across 3 AZs</b>, survives losing 2 copies for writes and 3 for reads, and grows automatically to 128 TiB. Up to 15 Aurora Replicas share that volume (replica lag usually under 100 ms).</Teach>}
        </Panel>
        <Panel title="Templates">
          <Radios value={template} onChange={pickTemplate} options={[
            { value: 'production', label: 'Production', desc: 'Defaults for high availability and fast, consistent performance.' },
            { value: 'devtest', label: 'Dev/Test', desc: 'This instance is intended for development use outside of a production environment.' },
            ...(freeOk ? [{ value: 'free' as Template, label: 'Free tier', desc: 'Use RDS Free Tier to develop new applications or gain hands-on experience.' }] : []),
          ]} />
        </Panel>
        <Panel title="Availability and durability" desc="Deployment options">
          <Radios value={avail} onChange={setAvail} options={availOpts} />
          <Teach title="Multi-AZ vs read replicas">Multi-AZ is for <b>high availability</b>: a <b>synchronous</b> standby in another AZ that you <b>cannot read from</b>; RDS fails over automatically (60–120 s) and the endpoint DNS name stays the same. Read replicas are for <b>read scaling</b>: <b>asynchronous</b> copies with their own endpoints (possibly in another Region) that you can promote. Exception: a Multi-AZ DB <i>cluster</i> has two readable standbys.</Teach>
        </Panel>
        <Panel title="Settings">
          <Field label="DB instance identifier" hint="Unique across all DB instances you own in this Region. Stored in lowercase." error={E('name')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Master username" error={E('user')}><Input value={user} onChange={(e) => setUser(e.target.value)} /></Field>
          <Check checked={secrets} onChange={setSecrets} label="Manage master credentials in AWS Secrets Manager" hint="RDS generates the password, stores it in Secrets Manager and can rotate it. Nothing to hard-code in your app." />
          {!secrets && <Alert kind="info">In the real console you would type a master password here. This simulation doesn't store passwords.</Alert>}
        </Panel>
        <Panel title="Instance configuration">
          <Field label="DB instance class" hint={`${usd(RDS_HOURLY[cls] ?? 0.1, 3)}/hour per instance`}>
            <Select value={cls} onChange={setCls} options={template === 'free' ? ['db.t4g.micro', 'db.t3.micro'] : RDS_CLASSES} />
          </Field>
        </Panel>
        <Panel title="Storage">
          {aurora ? <p>Aurora cluster storage is allocated automatically and grows as needed up to 128 TiB. You pay for what you use.</p> : (
            <Field label="Allocated storage (GiB)" hint="General Purpose SSD (gp3). Minimum 20 GiB." error={E('storage')}><Input type="number" value={storage} onChange={(e) => setStorage(e.target.value)} /></Field>
          )}
        </Panel>
        <Panel title="Connectivity">
          <Field label="Virtual private cloud (VPC)" hint="You can't change the VPC after the database is created." error={E('vpc')}>
            <Select value={vpcId} onChange={pickVpc} options={vpcs.map((v) => ({ value: v.id, label: `${v.name || v.id} (${v.id})${v.isDefault ? ' default' : ''}` }))} />
          </Field>
          <Field label="DB subnet group: subnets" hint="A new DB subnet group is created from these subnets. It must span at least two AZs so RDS has somewhere to put a standby." error={E('subnets')}>
            <MultiCheck value={subnetIds} onChange={setSubnetIds} options={vpcSubnets.map((s) => ({ value: s.id, label: <span>{s.name || s.id} <span className="text-[#5f6b7a]">{s.cidr} · {s.az} · {isPublicSubnet(c, s.id) ? 'public (route to IGW)' : 'private'}</span></span> }))} />
          </Field>
          {subnetIds.some((id) => isPublicSubnet(c, id)) && <Alert kind="warning">Some selected subnets have a route to an internet gateway. Production databases belong in <b>private</b> subnets.</Alert>}
          <Field label="Public access">
            <Radios value={pub ? 'yes' : 'no'} onChange={(v) => setPub(v === 'yes')} options={[
              { value: 'yes', label: 'Yes', desc: 'RDS assigns a public IP address. Resources outside the VPC can connect if security groups allow it.' },
              { value: 'no', label: 'No', desc: 'RDS doesn\'t assign a public IP. Only resources inside the VPC (or connected networks) can connect.' },
            ]} />
          </Field>
          <Field label="Existing VPC security groups" error={E('sg')}>
            <MultiCheck value={sgIds} onChange={setSgIds} options={c.securityGroups.filter((s) => s.vpcId === vpcId).map((s) => ({ value: s.id, label: `${s.name} (${s.id})` }))} />
          </Field>
          <Teach>Lock the DB security group down to the <b>app tier's security group</b> on port {dbPort(engine)} rather than a CIDR. For <b>Lambda</b> clients, put <b>RDS Proxy</b> in front: it pools connections so thousands of concurrent invocations don't exhaust the database's connection limit, and it speeds up failover.</Teach>
        </Panel>
        <Panel title="Additional configuration">
          <Field label="Backup retention period (days)" hint="0 disables automated backups (and read replicas)." error={E('backup')}><Input type="number" value={backup} onChange={(e) => setBackup(e.target.value)} /></Field>
          <Check checked={encrypted} onChange={setEncrypted} label="Enable encryption" hint="Encrypts storage, automated backups, snapshots and replicas with KMS." />
          {encrypted && <Field label="AWS KMS key"><Select value={kms} onChange={setKms} options={c.kmsKeys.filter((k) => k.enabled).map((k) => ({ value: k.id, label: `${k.alias}${k.managedBy === 'aws' ? ' (default)' : ''}` }))} /></Field>}
          <Teach title="Encryption">You can only turn on encryption <b>at creation</b>. To encrypt an existing unencrypted DB: snapshot it, copy the snapshot with encryption enabled, and restore from the copy.</Teach>
        </Panel>
        <Panel title="Estimated monthly costs"><p className="text-[20px] font-bold">{usd(monthly)}<span className="text-[14px] font-normal text-[#5f6b7a]"> / month{avail !== 'single' ? ' (you pay for the standby too)' : ''}</span></p></Panel>
        {tried && !valid && <Alert kind="error">Fix the errors above to continue.</Alert>}
        <FormFooter onCancel={() => nav('/console/rds')} submitLabel="Create database" />
      </form>
    </Page>
  );
}

type ModalKind = 'reboot' | 'replica' | 'snapshot' | 'delete' | 'promote' | null;

function DbDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log, put } = useCloudActions();
  const nav = useNavigate();
  const [modal, setModal] = useState<ModalKind>(null);
  const [failover, setFailover] = useState(false);
  const [finalSnap, setFinalSnap] = useState(true);
  const [rName, setRName] = useState('');
  const [rRegion, setRRegion] = useState(c.region);
  const [rCls, setRCls] = useState('db.t3.medium');
  const [snapName, setSnapName] = useState('');
  const d = c.dbInstances.find((x) => x.id === id);
  if (!d) return <Page title="Database not found"><Alert kind="error">This database doesn't exist (it may have been deleted). <Link to="/console/rds">Back to Databases</Link></Alert></Page>;

  const busy = d.status !== 'available';
  const source = d.readReplicaOf ? c.dbInstances.find((x) => x.id === d.readReplicaOf) : undefined;
  const replicas = c.dbInstances.filter((x) => x.readReplicaOf === d.id);
  const vpcId = c.subnets.find((s) => s.id === d.subnetIds[0])?.vpcId;
  const kmsAlias = d.encrypted ? (c.kmsKeys.find((k) => k.id === d.kmsKeyId)?.alias ?? 'aws/rds') : undefined;
  const upd = (fn: (x: DbInstance) => void) => mutate((dr) => { const x = dr.dbInstances.find((y) => y.id === d.id); if (x) fn(x); });
  const close = () => setModal(null);
  const seed = [...d.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const rNameErr = nameError(rName, c.dbInstances.some((x) => x.region === rRegion && x.name.toLowerCase() === rName.toLowerCase()));

  const reboot = () => {
    upd((x) => {
      if (failover) { x.status = 'failing-over'; x.events.unshift({ t: Date.now(), msg: `Reboot with failover started: Multi-AZ failover from ${x.az} to standby in ${x.standbyAz}` }); }
      else { x.status = 'rebooting'; x.events.unshift({ t: Date.now(), msg: 'DB instance restarted' }); }
    });
    log('rds', `RebootDBInstance ${d.name}${failover ? ' (ForceFailover=true)' : ''}`);
    close();
  };
  const createReplica = () => {
    const same = rRegion === d.region;
    const r: DbInstance = {
      ...d, id: rid('db'), name: rName, region: rRegion, createdAt: Date.now(), instanceClass: rCls, multiAz: false, multiAzCluster: undefined, standbyAz: undefined,
      az: same ? (azsOf(d.region).find((a) => a !== d.az) ?? d.az) : azsOf(rRegion)[0], subnetIds: same ? d.subnetIds : [], sgIds: same ? d.sgIds : [],
      kmsKeyId: same ? d.kmsKeyId : undefined, publiclyAccessible: false, backupRetentionDays: 0, status: 'creating', readReplicaOf: d.id,
      endpoint: dbEndpoint(rName, rRegion), snapshots: [], events: [{ t: Date.now(), msg: `Read replica creation started from ${d.name} (${d.region}). Replication is asynchronous.` }],
    };
    put('dbInstances', r);
    upd((x) => x.events.unshift({ t: Date.now(), msg: `Read replica ${rName} created in ${rRegion}` }));
    log('rds', `CreateDBInstanceReadReplica ${rName} from ${d.name}${same ? '' : ` (cross-Region ${rRegion})`}`);
    close();
  };
  const promote = () => {
    upd((x) => { x.readReplicaOf = undefined; x.status = 'modifying'; x.backupRetentionDays = 1; x.events.unshift({ t: Date.now(), msg: 'Read replica promoted to a standalone DB instance. Replication from the source has stopped.' }); });
    log('rds', `PromoteReadReplica ${d.name}`);
    close();
  };
  const snapshot = () => {
    upd((x) => { x.snapshots = [...(x.snapshots ?? []), { id: snapName, t: Date.now() }]; x.events.unshift({ t: Date.now(), msg: `Manual snapshot ${snapName} created` }); });
    log('rds', `CreateDBSnapshot ${snapName} of ${d.name}`);
    close();
  };
  const del = () => {
    nav('/console/rds');
    mutate((dr) => {
      dr.dbInstances = dr.dbInstances.filter((x) => x.id !== d.id);
      for (const r of dr.dbInstances) if (r.readReplicaOf === d.id) { r.readReplicaOf = undefined; r.events.unshift({ t: Date.now(), msg: `Source ${d.name} deleted: replica promoted to standalone instance` }); }
    });
    log('rds', `DeleteDBInstance ${d.name}${finalSnap ? ` (final snapshot ${d.name}-final)` : ' (SkipFinalSnapshot: data is gone)'}`);
  };

  return (
    <Page title={d.name} crumbs={[{ label: 'RDS', to: '/console/rds' }, { label: 'Databases', to: '/console/rds' }, { label: d.name }]} actions={<>
      <Button disabled={busy} onClick={() => { setFailover(false); setModal('reboot'); }}>Reboot</Button>
      <Button disabled={busy || d.backupRetentionDays === 0} title={d.backupRetentionDays === 0 ? 'Enable automated backups first' : undefined} onClick={() => { setRName(`${d.name}-replica`); setRRegion(d.region); setModal('replica'); }}>Create read replica</Button>
      {d.readReplicaOf && <Button disabled={busy} onClick={() => setModal('promote')}>Promote</Button>}
      <Button disabled={busy} onClick={() => { setSnapName(`${d.name}-snapshot-${new Date().toISOString().slice(0, 10)}`); setModal('snapshot'); }}>Take snapshot</Button>
      <Button danger onClick={() => setModal('delete')}>Delete</Button>
    </>}>
      <Panel title="Summary">
        <KV cols={4} items={[
          ['DB identifier', d.name], ['Status', <Status value={d.status} />], ['Role', role(d)], ['Engine', engineLabel(d.engine)],
          ['Region & AZ', d.az], ['Size', d.instanceClass], ['Multi-AZ', d.multiAz ? `Yes (standby in ${d.standbyAz})` : 'No'],
          ['Source', source ? <Link to={`/console/rds/databases/${source.id}`}>{source.name}</Link> : d.readReplicaOf ? 'Deleted' : '–'],
        ]} />
        {replicas.length > 0 && <p className="mt-3 text-[14px]">Read replicas: {replicas.map((r) => <Link key={r.id} className="mr-3" to={`/console/rds/databases/${r.id}`}>{r.name} ({r.region})</Link>)}</p>}
      </Panel>
      <Tabs tabs={[
        { label: 'Connectivity & security', content: <Panel title="Connectivity & security">
          <KV items={[
            ['Endpoint', <code>{d.endpoint}</code>], ['Port', dbPort(d.engine)], ['Availability Zone', d.az],
            ['VPC', vpcId ?? '–'], ['Subnets', d.subnetIds.join(', ') || '–'], ['Publicly accessible', d.publiclyAccessible ? 'Yes' : 'No'],
            ['VPC security groups', d.sgIds.map((s) => c.securityGroups.find((g) => g.id === s)?.name ?? s).join(', ') || '–'], ['Secondary Zone', d.standbyAz ?? '–'], ['Certificate authority', 'rds-ca-rsa2048-g1'],
          ]} />
          {d.multiAz && !d.multiAzCluster && <Teach>The standby in {d.standbyAz} is synchronous and <b>not readable</b>. Applications always use this one endpoint; after a failover the DNS name points at the new primary.</Teach>}
          {d.readReplicaOf && <Teach>This replica has its own endpoint. Point read-heavy queries (reports, dashboards) here. Replication is asynchronous, so reads can be slightly stale.</Teach>}
          <Teach title="Lambda clients">Many Lambda invocations each opening a connection can exhaust the DB. Use <Link to="/console/rds/proxies">RDS Proxy</Link> to pool and share connections (and authenticate with IAM).</Teach>
        </Panel> },
        { label: 'Monitoring', content: <Panel title="CloudWatch metrics (last hour)">
          <KV cols={4} items={[
            ['CPUUtilization', d.status === 'available' ? `${3 + (seed % 25)}%` : '–'], ['DatabaseConnections', d.status === 'available' ? String(seed % 40) : '0'],
            ['FreeStorageSpace', `${Math.round(d.storageGb * 0.93)} GiB`], ['ReadIOPS', String(20 + (seed % 300))],
            ['WriteIOPS', d.readReplicaOf ? '–' : String(10 + (seed % 120))], ['ReplicaLag', d.readReplicaOf ? `${((seed % 9) / 10 + 0.1).toFixed(1)} s` : '–'],
          ]} />
          {d.readReplicaOf && <Teach>ReplicaLag is the price of asynchronous replication. Set a CloudWatch alarm on it if your app can't tolerate stale reads.</Teach>}
        </Panel> },
        { label: 'Logs & events', content: <Panel title="Recent events" counter={d.events.length}>
          <table className="aws-table w-full"><thead><tr><th>Time</th><th>Message</th></tr></thead>
            <tbody>{d.events.map((e, i) => <tr key={i}><td className="whitespace-nowrap">{fmtDate(e.t)}</td><td>{e.msg}</td></tr>)}</tbody></table>
        </Panel> },
        { label: 'Configuration', content: <Panel title="Configuration">
          <KV items={[
            ['DB instance ID', d.name], ['Engine', engineLabel(d.engine)], ['Instance class', d.instanceClass],
            ['Storage', isAurora(d.engine) ? 'Aurora cluster volume (auto-scaling, 6 copies / 3 AZs)' : `${d.storageGb} GiB gp3`], ['Encryption', d.encrypted ? 'Enabled' : 'Not enabled'], ['AWS KMS key', kmsAlias ?? '–'],
            ['Deployment', d.multiAzCluster ? 'Multi-AZ DB cluster' : d.multiAz ? 'Multi-AZ DB instance' : 'Single-AZ'], ['Created', fmtDate(d.createdAt)], ['ARN', `arn:aws:rds:${d.region}:${c.accountId}:db:${d.name}`],
          ]} />
        </Panel> },
        { label: 'Maintenance & backups', content: <Panel title="Backups">
          <KV items={[['Automated backups', d.backupRetentionDays ? `Enabled (${d.backupRetentionDays} days)` : 'Disabled'], ['Point-in-time restore', d.backupRetentionDays ? 'Up to the last 5 minutes' : '–'], ['Manual snapshots', String(d.snapshots?.length ?? 0)]]} />
          <Teach>Automated backups give point-in-time restore within the retention window (max 35 days) and are deleted with the instance. Manual snapshots live until you delete them, and can be copied to other Regions/accounts for DR.</Teach>
          {!!d.snapshots?.length && <ul className="list-disc pl-6 mt-2">{d.snapshots.map((s) => <li key={s.id}>{s.id} · {fmtDate(s.t)}</li>)}</ul>}
        </Panel> },
      ]} />

      {modal === 'reboot' && <Modal title={`Reboot DB instance ${d.name}?`} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary onClick={reboot}>Confirm</Button></>}>
        {d.multiAz
          ? <Check checked={failover} onChange={setFailover} label="Reboot With Failover?" hint={`The standby in ${d.standbyAz} becomes the primary. Use this to test that your application handles a failover.`} />
          : <Alert kind="info">Reboot with failover is only available for Multi-AZ deployments: this Single-AZ instance has no standby.</Alert>}
        {failover && <Teach>RDS flips the endpoint's DNS CNAME to the standby. Clients reconnect to the same hostname: no connection-string change, but they must handle a brief disconnect (and cached DNS should have a short TTL).</Teach>}
      </Modal>}
      {modal === 'replica' && <Modal title="Create read replica" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary disabled={!!rNameErr} onClick={createReplica}>Create read replica</Button></>}>
        <Field label="Replica source"><Input value={d.name} disabled /></Field>
        <Field label="DB instance identifier" error={rNameErr}><Input value={rName} onChange={(e) => setRName(e.target.value)} /></Field>
        <Field label="Destination Region"><Select value={rRegion} onChange={setRRegion} options={REGIONS.map((r) => ({ value: r.id, label: `${r.name} (${r.id})` }))} /></Field>
        <Field label="DB instance class"><Select value={rCls} onChange={setRCls} options={RDS_CLASSES} /></Field>
        <Teach>Read replicas scale <b>reads</b> using <b>asynchronous</b> replication (up to 15 per source). A <b>cross-Region</b> replica also gives you disaster recovery: promote it if the primary Region fails.{d.encrypted && rRegion !== d.region ? ' An encrypted cross-Region replica uses a KMS key in the destination Region.' : ''}</Teach>
      </Modal>}
      {modal === 'promote' && <Modal title={`Promote ${d.name}?`} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary onClick={promote}>Promote read replica</Button></>}>
        <Alert kind="warning">Promotion is irreversible: the replica stops replicating from {source?.name ?? 'its source'} and becomes a standalone, writable DB instance.</Alert>
        <Teach>Promoting a cross-Region replica is the classic RDS disaster-recovery move (RPO = replication lag; RTO = minutes).</Teach>
      </Modal>}
      {modal === 'snapshot' && <Modal title="Take DB snapshot" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary disabled={!snapName} onClick={snapshot}>Take snapshot</Button></>}>
        <Field label="Snapshot name"><Input value={snapName} onChange={(e) => setSnapName(e.target.value)} /></Field>
        {!d.multiAz && <Alert kind="info">On a Single-AZ instance, I/O is briefly suspended while the snapshot starts. Multi-AZ takes it from the standby.</Alert>}
      </Modal>}
      {modal === 'delete' && <ConfirmDelete what={d.name} onClose={close} onConfirm={del} warning={<>
        <Check checked={finalSnap} onChange={setFinalSnap} label="Create final snapshot" hint="Recommended: automated backups are deleted with the instance." />
        {!finalSnap && <p className="text-[13px]">I acknowledge that automated backups, including system snapshots and point-in-time recovery, will no longer be available.</p>}
        {replicas.length > 0 && <p className="text-[13px] mt-1">{replicas.length} read replica(s) will be promoted to standalone instances.</p>}
      </>} />}
    </Page>
  );
}

function Snapshots() {
  const c = useCloud((c) => c);
  const rows = c.dbInstances.filter((d) => d.region === c.region).flatMap((d) => (d.snapshots ?? []).map((s) => ({ id: `${d.id}:${s.id}`, name: s.id, db: d, t: s.t })));
  return (
    <Page title="Snapshots" crumbs={[{ label: 'RDS', to: '/console/rds' }, { label: 'Snapshots' }]}>
      <Panel title="Manual snapshots" counter={rows.length} desc="Take a snapshot from a database's detail page (Take snapshot).">
        <Table rows={rows} empty="No manual snapshots." columns={[
          { header: 'Snapshot name', cell: (r) => r.name },
          { header: 'DB instance', cell: (r) => <Link to={`/console/rds/databases/${r.db.id}`}>{r.db.name}</Link> },
          { header: 'Snapshot creation time', cell: (r) => fmtDate(r.t) },
          { header: 'Encrypted', cell: (r) => (r.db.encrypted ? 'Yes' : 'No') },
          { header: 'Status', cell: () => <Status value="available" /> },
        ]} />
      </Panel>
    </Page>
  );
}

function Proxies() {
  return (
    <Page title="Proxies" crumbs={[{ label: 'RDS', to: '/console/rds' }, { label: 'Proxies' }]}>
      <Panel title="Proxies" counter={0}>
        <p className="text-[#5f6b7a]">Proxy creation isn't simulated here.</p>
        <Teach title="RDS Proxy">A fully managed connection pool in front of RDS/Aurora. Exam triggers: <b>Lambda</b> functions exhausting DB connections ("too many connections"), faster failover (up to 66% less), and enforcing <b>IAM authentication</b> with credentials kept in Secrets Manager. It's only reachable from inside the VPC.</Teach>
      </Panel>
    </Page>
  );
}
