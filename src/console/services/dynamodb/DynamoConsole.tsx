import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { DynamoTable } from '../../../cloud/types';
import { rid, REGIONS } from '../../../cloud/seed';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Check, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';

export default function DynamoConsole() {
  return (
    <div className="flex">
      <SideNav title="DynamoDB" items={[{ label: 'Dashboard', to: '/console/dynamodb' }, { label: 'Tables', to: '/console/dynamodb' }, { label: 'Explore items', to: '/console/dynamodb' }, { section: 'DAX' }, { label: 'Clusters', to: '/console/dynamodb/dax' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<TableList />} />
          <Route path="create" element={<CreateTable />} />
          <Route path="tables/:id" element={<TableDetail />} />
          <Route path="dax" element={<Dax />} />
        </Routes>
      </div>
    </div>
  );
}

function TableList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const rows = c.dynamoTables.filter((t) => t.region === c.region);
  return (
    <Page title="Tables" crumbs={[{ label: 'DynamoDB', to: '/console/dynamodb' }, { label: 'Tables' }]}>
      <Panel title="Tables" counter={rows.length} actions={<Button primary onClick={() => nav('/console/dynamodb/create')}>Create table</Button>}>
        <Table rows={rows} filterText={(t) => t.name} empty="You have no tables in this account in this AWS Region." columns={[
          { header: 'Name', cell: (t) => <Link to={`/console/dynamodb/tables/${t.id}`}>{t.name}</Link> },
          { header: 'Status', cell: () => <Status value="Active" /> },
          { header: 'Partition key', cell: (t) => `${t.partitionKey} (S)` },
          { header: 'Sort key', cell: (t) => (t.sortKey ? `${t.sortKey} (S)` : '–') },
          { header: 'Indexes', cell: (t) => t.gsis.length },
          { header: 'Replication Regions', cell: (t) => t.globalReplicas.length },
          { header: 'Capacity mode', cell: (t) => (t.mode === 'on-demand' ? 'On-demand' : `Provisioned (${t.rcu} RCU / ${t.wcu} WCU)`) },
          { header: 'Items', cell: (t) => t.items.length },
        ]} />
      </Panel>
    </Page>
  );
}

function CreateTable() {
  const c = useCloud((c) => c);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [pk, setPk] = useState('');
  const [sk, setSk] = useState('');
  const [settings, setSettings] = useState<'default' | 'custom'>('default');
  const [cls, setCls] = useState<'STANDARD' | 'STANDARD_IA'>('STANDARD');
  const [mode, setMode] = useState<'on-demand' | 'provisioned'>('on-demand');
  const [rcu, setRcu] = useState('5');
  const [wcu, setWcu] = useState('5');
  const [tried, setTried] = useState(false);
  const errs = {
    name: !/^[a-zA-Z0-9_.-]{3,255}$/.test(name) ? 'Table name must be 3–255 characters: letters, numbers, underscores, hyphens and periods.' : c.dynamoTables.some((t) => t.region === c.region && t.name === name) ? 'A table with this name already exists in this Region.' : undefined,
    pk: pk.trim() ? undefined : 'Partition key is required.',
    cap: mode === 'on-demand' || (Number(rcu) >= 1 && Number(wcu) >= 1) ? undefined : 'Provisioned capacity must be at least 1 RCU and 1 WCU.',
  };
  const valid = Object.values(errs).every((e) => !e);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const t: DynamoTable = {
      id: rid('table'), name, region: c.region, createdAt: Date.now(), partitionKey: pk.trim(), sortKey: sk.trim() || undefined, mode,
      rcu: mode === 'provisioned' ? Number(rcu) : 0, wcu: mode === 'provisioned' ? Number(wcu) : 0, gsis: [], itemCount: 0, pitr: false, streams: false,
      globalReplicas: [], items: [], tableClass: cls, backups: [],
    };
    put('dynamoTables', t);
    log('dynamodb', `CreateTable ${name} (PK ${t.partitionKey}${t.sortKey ? `, SK ${t.sortKey}` : ''}, ${mode})`);
    nav(`/console/dynamodb/tables/${t.id}`);
  };
  const E = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  return (
    <Page title="Create table" crumbs={[{ label: 'DynamoDB', to: '/console/dynamodb' }, { label: 'Tables', to: '/console/dynamodb' }, { label: 'Create table' }]}>
      <form onSubmit={submit}>
        <Panel title="Table details" desc="DynamoDB is a schemaless database that requires only a table name and a primary key when you create the table.">
          <Field label="Table name" error={E('name')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter the table name" /></Field>
          <Field label="Partition key" hint="The partition key is part of the table's primary key. It is a hash value that is used to retrieve items from your table and allocate data across hosts." error={E('pk')}>
            <div className="flex gap-2"><Input value={pk} onChange={(e) => setPk(e.target.value)} placeholder="Enter the partition key name" /><span className="aws-input max-w-[120px] text-[#5f6b7a]">String</span></div>
          </Field>
          <Teach title="Hot partitions">Choose a <b>high-cardinality</b> partition key (userId, orderId) so traffic spreads evenly. A low-cardinality key (status, date, country) funnels requests to a few partitions, which throttle even when the table has spare capacity. Fix by adding a random/calculated suffix (write sharding).</Teach>
          <Field label="Sort key - optional" hint="Use a sort key as the second part of a table's primary key. It lets you sort or search among all items sharing the same partition key."><Input value={sk} onChange={(e) => setSk(e.target.value)} placeholder="Enter the sort key name" /></Field>
        </Panel>
        <Panel title="Table settings">
          <Radios value={settings} onChange={setSettings} options={[
            { value: 'default', label: 'Default settings', desc: 'The fastest way to create your table: on-demand capacity, Standard table class.' },
            { value: 'custom', label: 'Customize settings', desc: 'Use these advanced features to make DynamoDB work better for your needs.' },
          ]} />
          {settings === 'custom' && <div className="mt-4">
            <Field label="Table class">
              <Radios value={cls} onChange={setCls} options={[
                { value: 'STANDARD', label: 'DynamoDB Standard', desc: 'The default general-purpose table class.' },
                { value: 'STANDARD_IA', label: 'DynamoDB Standard-IA', desc: 'Up to 60% lower storage cost for infrequently accessed data; higher read/write cost.' },
              ]} />
            </Field>
            <Field label="Read/write capacity settings: Capacity mode">
              <Radios value={mode} onChange={setMode} options={[
                { value: 'on-demand', label: 'On-demand', desc: 'Simplify billing by paying for the actual reads and writes your application performs.' },
                { value: 'provisioned', label: 'Provisioned', desc: 'Manage and optimize your costs by allocating read/write capacity in advance.' },
              ]} />
            </Field>
            {mode === 'provisioned' && <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Read capacity units (RCU)" hint="1 RCU = one strongly consistent 4 KB read/s (or two eventually consistent)."><Input type="number" value={rcu} onChange={(e) => setRcu(e.target.value)} /></Field>
                <Field label="Write capacity units (WCU)" hint="1 WCU = one 1 KB write/s."><Input type="number" value={wcu} onChange={(e) => setWcu(e.target.value)} /></Field>
              </div>
              {E('cap') && <Alert kind="error">{E('cap')}</Alert>}
              <Alert kind="info">Auto scaling: On. Target utilization 70%, min 1, max 10 units. DynamoDB adjusts provisioned capacity with Application Auto Scaling as traffic changes.</Alert>
            </>}
            <Teach>On-demand suits <b>unpredictable or spiky</b> traffic and new apps (no capacity planning, pay per request). Provisioned + auto scaling is cheaper for <b>steady, predictable</b> traffic, and reserved capacity cuts it further.</Teach>
          </div>}
        </Panel>
        {tried && !valid && <Alert kind="error">Fix the errors above to continue.</Alert>}
        <FormFooter onCancel={() => nav('/console/dynamodb')} submitLabel="Create table" />
      </form>
    </Page>
  );
}

function TableDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [del, setDel] = useState(false);
  const t = c.dynamoTables.find((x) => x.id === id);
  if (!t) return <Page title="Table not found"><Alert kind="error">This table doesn't exist. <Link to="/console/dynamodb">Back to Tables</Link></Alert></Page>;
  const upd = (fn: (x: DynamoTable) => void, msg: string) => { mutate((d) => { const x = d.dynamoTables.find((y) => y.id === t.id); if (x) fn(x); }); log('dynamodb', msg); };
  return (
    <Page title={t.name} crumbs={[{ label: 'DynamoDB', to: '/console/dynamodb' }, { label: 'Tables', to: '/console/dynamodb' }, { label: t.name }]}
      actions={<Button danger onClick={() => setDel(true)}>Delete table</Button>}>
      <Tabs tabs={[
        { label: 'Overview', content: <Overview t={t} upd={upd} /> },
        { label: 'Indexes', content: <Indexes t={t} upd={upd} /> },
        { label: 'Explore items', content: <Items t={t} upd={upd} /> },
        { label: 'Backups', content: <Backups t={t} upd={upd} /> },
        { label: 'Exports and streams', content: <Streams t={t} upd={upd} /> },
        { label: 'Global tables', content: <GlobalTables t={t} upd={upd} /> },
        { label: 'Additional settings', content: <Ttl t={t} upd={upd} /> },
      ]} />
      {del && <ConfirmDelete what={`table ${t.name}`} onClose={() => setDel(false)} warning={t.pitr ? undefined : 'Point-in-time recovery is off and there may be no backup: this data cannot be recovered.'}
        onConfirm={() => { nav('/console/dynamodb'); mutate((d) => { d.dynamoTables = d.dynamoTables.filter((x) => x.id !== t.id); }); log('dynamodb', `DeleteTable ${t.name}`); }} />}
    </Page>
  );
}

type Upd = (fn: (x: DynamoTable) => void, msg: string) => void;

function Overview({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const acct = useCloud((c) => c.accountId);
  const [mode, setMode] = useState(t.mode);
  const [rcu, setRcu] = useState(String(t.rcu || 5));
  const [wcu, setWcu] = useState(String(t.wcu || 5));
  return <>
    <Panel title="General information">
      <KV items={[
        ['Partition key', `${t.partitionKey} (String)`], ['Sort key', t.sortKey ? `${t.sortKey} (String)` : '–'], ['Capacity mode', t.mode === 'on-demand' ? 'On-demand' : 'Provisioned'],
        ['Table status', <Status value="Active" />], ['Table class', t.tableClass === 'STANDARD_IA' ? 'DynamoDB Standard-IA' : 'DynamoDB Standard'], ['Item count', t.items.length],
        ['Point-in-time recovery (PITR)', t.pitr ? 'On' : 'Off'], ['DynamoDB stream', t.streams ? 'On' : 'Off'], ['Time to Live (TTL)', t.ttlAttribute ? `On (${t.ttlAttribute})` : 'Off'],
        ['Amazon Resource Name (ARN)', `arn:aws:dynamodb:${t.region}:${acct}:table/${t.name}`], ['Creation date', fmtDate(t.createdAt)], ['Replicas', t.globalReplicas.join(', ') || '–'],
      ]} />
    </Panel>
    <Panel title="Read/write capacity" actions={<Button onClick={() => upd((x) => { x.mode = mode; x.rcu = mode === 'provisioned' ? Math.max(1, Number(rcu)) : 0; x.wcu = mode === 'provisioned' ? Math.max(1, Number(wcu)) : 0; }, `UpdateTable ${t.name}: capacity mode ${mode}`)}>Save changes</Button>}>
      <Radios value={mode} onChange={setMode} options={[{ value: 'on-demand', label: 'On-demand' }, { value: 'provisioned', label: 'Provisioned' }]} />
      {mode === 'provisioned' && <div className="grid grid-cols-2 gap-4 mt-3">
        <Field label="RCU"><Input type="number" value={rcu} onChange={(e) => setRcu(e.target.value)} /></Field>
        <Field label="WCU"><Input type="number" value={wcu} onChange={(e) => setWcu(e.target.value)} /></Field>
      </div>}
    </Panel>
    <Teach title="DAX">Need <b>microsecond</b> reads on a read-heavy table without changing your data model? Put <b>DynamoDB Accelerator (DAX)</b>, an in-memory write-through cache, in front of it. It's API-compatible with DynamoDB. ElastiCache is the answer for caching other databases; DAX is DynamoDB-only.</Teach>
  </>;
}

function Indexes({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState('');
  const [pk, setPk] = useState('');
  const [sk, setSk] = useState('');
  const err = !n ? undefined : !/^[a-zA-Z0-9_.-]{3,255}$/.test(n) ? 'Index name must be 3–255 characters.' : t.gsis.some((g) => g.name === n) ? 'An index with this name already exists.' : undefined;
  return <>
    <Panel title="Global secondary indexes" counter={t.gsis.length} actions={<Button onClick={() => { setN(''); setPk(''); setSk(''); setOpen(true); }}>Create index</Button>}>
      <Table rows={t.gsis.map((g) => ({ ...g, id: g.name }))} empty="No global secondary indexes" columns={[
        { header: 'Name', cell: (g) => g.name }, { header: 'Status', cell: () => <Status value="Active" /> },
        { header: 'Partition key', cell: (g) => g.pk }, { header: 'Sort key', cell: (g) => g.sk ?? '–' }, { header: 'Projected attributes', cell: () => 'All' },
      ]} />
    </Panel>
    <Panel title="Local secondary indexes" counter={0}><p className="text-[#5f6b7a]">Local secondary indexes can only be created when you create the table.</p></Panel>
    <Teach title="GSI vs LSI"><b>GSI</b>: any partition + sort key, add or delete any time, has its own capacity, eventually consistent reads only. <b>LSI</b>: same partition key with a different sort key, must be defined <b>at table creation</b>, shares the table's capacity, supports strongly consistent reads, 10 GB per partition-key value limit.</Teach>
    {open && <Modal title="Create global secondary index" onClose={() => setOpen(false)} footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button primary disabled={!n || !pk || !!err}
      onClick={() => { upd((x) => { x.gsis.push({ name: n, pk, sk: sk || undefined }); }, `UpdateTable ${t.name}: create GSI ${n}`); setOpen(false); }}>Create index</Button></>}>
      <Field label="Partition key"><Input value={pk} onChange={(e) => { setPk(e.target.value); if (!n || n.endsWith('-index')) setN(`${e.target.value}${sk ? `-${sk}` : ''}-index`); }} /></Field>
      <Field label="Sort key - optional"><Input value={sk} onChange={(e) => setSk(e.target.value)} /></Field>
      <Field label="Index name" error={err}><Input value={n} onChange={(e) => setN(e.target.value)} /></Field>
    </Modal>}
  </>;
}

const attrsOf = (items: Record<string, string>[], t: DynamoTable) => [...new Set([t.partitionKey, ...(t.sortKey ? [t.sortKey] : []), ...items.flatMap(Object.keys)])];

function Items({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const [mode, setMode] = useState<'scan' | 'query'>('scan');
  const [index, setIndex] = useState('');
  const [pkv, setPkv] = useState('');
  const [skv, setSkv] = useState('');
  const [skOp, setSkOp] = useState<'=' | 'begins_with'>('=');
  const [ran, setRan] = useState<{ mode: 'scan' | 'query'; index: string; pkv: string; skv: string; skOp: string } | null>(null);
  const [add, setAdd] = useState(false);
  const [np, setNp] = useState('');
  const [ns, setNs] = useState('');
  const [extra, setExtra] = useState('');
  const gsi = t.gsis.find((g) => g.name === (ran?.index ?? ''));
  const keyPk = gsi?.pk ?? t.partitionKey, keySk = gsi ? gsi.sk : t.sortKey;
  const shown = !ran || ran.mode === 'scan' ? t.items
    : t.items.filter((i) => i[keyPk] === ran.pkv && (!ran.skv || !keySk || (ran.skOp === '=' ? i[keySk] === ran.skv : (i[keySk] ?? '').startsWith(ran.skv))));
  const cols = attrsOf(t.items, t);
  const qGsi = t.gsis.find((g) => g.name === index);
  const skName = qGsi ? qGsi.sk : t.sortKey;
  const saveItem = () => {
    const item: Record<string, string> = { [t.partitionKey]: np };
    if (t.sortKey) item[t.sortKey] = ns;
    for (const line of extra.split('\n')) { const [k, ...v] = line.split('='); if (k?.trim() && v.length) item[k.trim()] = v.join('=').trim(); }
    upd((x) => {
      x.items = x.items.filter((i) => !(i[x.partitionKey] === np && (!x.sortKey || i[x.sortKey] === ns))); // PutItem replaces an item with the same key
      x.items.push(item);
      x.itemCount = x.items.length;
    }, `PutItem ${t.name} ${t.partitionKey}=${np}`);
    setAdd(false);
  };
  return <>
    <Panel title={`Scan or query items`}>
      <Radios value={mode} onChange={setMode} options={[{ value: 'scan', label: 'Scan', desc: 'Reads every item in the table: expensive on big tables.' }, { value: 'query', label: 'Query', desc: 'Finds items by partition key: efficient.' }]} />
      <div className="grid md:grid-cols-4 gap-3 mt-3 items-end">
        <Field label="Table or index"><Select value={index} onChange={setIndex} options={[{ value: '', label: `Table - ${t.name}` }, ...t.gsis.map((g) => ({ value: g.name, label: `Index - ${g.name}` }))]} /></Field>
        {mode === 'query' && <Field label={`${qGsi?.pk ?? t.partitionKey} (Partition key)`}><Input value={pkv} onChange={(e) => setPkv(e.target.value)} placeholder="Enter partition key value" /></Field>}
        {mode === 'query' && skName && <Field label={`${skName} (Sort key)`}><div className="flex gap-1"><Select value={skOp} onChange={(v) => setSkOp(v as '=' | 'begins_with')} options={['=', 'begins_with']} /><Input value={skv} onChange={(e) => setSkv(e.target.value)} /></div></Field>}
        <div className="mb-4"><Button primary disabled={mode === 'query' && !pkv} onClick={() => { setRan({ mode, index, pkv, skv, skOp }); }}>Run</Button></div>
      </div>
      {mode === 'scan' && <Teach>Prefer <b>Query</b> (by key) over <b>Scan</b>. If you keep needing to look items up by a non-key attribute, add a GSI on it.</Teach>}
    </Panel>
    <Panel title="Items returned" counter={shown.length} actions={<Button primary onClick={() => { setNp(''); setNs(''); setExtra(''); setAdd(true); }}>Create item</Button>}>
      <div className="overflow-x-auto"><table className="aws-table w-full">
        <thead><tr>{cols.map((k) => <th key={k}>{k}{k === t.partitionKey ? ' (PK)' : k === t.sortKey ? ' (SK)' : ''}</th>)}<th /></tr></thead>
        <tbody>{shown.map((i, n) => <tr key={n}>{cols.map((k) => <td key={k}>{i[k] ?? ''}</td>)}<td><button className="link" onClick={() => upd((x) => { x.items = x.items.filter((y) => !(y[x.partitionKey] === i[x.partitionKey] && (!x.sortKey || y[x.sortKey] === i[x.sortKey]))); x.itemCount = x.items.length; }, `DeleteItem ${t.name} ${t.partitionKey}=${i[t.partitionKey]}`)}>Delete</button></td></tr>)}</tbody>
      </table></div>
      {!shown.length && <div className="text-center py-6 text-[#5f6b7a]">The query did not return any results.</div>}
    </Panel>
    {add && <Modal title="Create item" onClose={() => setAdd(false)} footer={<><Button onClick={() => setAdd(false)}>Cancel</Button><Button primary disabled={!np || (!!t.sortKey && !ns)} onClick={saveItem}>Create item</Button></>}>
      <Field label={`${t.partitionKey} - Partition key (String)`}><Input value={np} onChange={(e) => setNp(e.target.value)} /></Field>
      {t.sortKey && <Field label={`${t.sortKey} - Sort key (String)`}><Input value={ns} onChange={(e) => setNs(e.target.value)} /></Field>}
      <Field label="Other attributes" hint="One per line: name=value. Items in the same table can have different attributes (schemaless).">
        <textarea className="aws-input font-mono" rows={4} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={'status=active\nemail=ana@example.com'} />
      </Field>
      <Alert kind="info">Max item size is 400 KB. Store larger blobs in S3 and keep the object key in DynamoDB.</Alert>
    </Modal>}
  </>;
}

function Backups({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const [name, setName] = useState('');
  return <>
    <Panel title="Point-in-time recovery (PITR)">
      <Check checked={t.pitr} onChange={(v) => upd((x) => { x.pitr = v; }, `UpdateContinuousBackups ${t.name}: PITR ${v ? 'on' : 'off'}`)} label="Turn on point-in-time recovery" hint="Continuous backups: restore to any second in the last 35 days." />
      <Teach>PITR protects against accidental writes or deletes. A restore always creates a <b>new table</b>; it doesn't overwrite the existing one.</Teach>
    </Panel>
    <Panel title="Backups" counter={t.backups?.length ?? 0} actions={<><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Backup name" /><Button disabled={!name} onClick={() => { upd((x) => { x.backups = [...(x.backups ?? []), { name, t: Date.now() }]; }, `CreateBackup ${t.name}: ${name}`); setName(''); }}>Create backup</Button></>}>
      <Table rows={(t.backups ?? []).map((b) => ({ ...b, id: b.name }))} empty="No on-demand backups" columns={[
        { header: 'Backup name', cell: (b) => b.name }, { header: 'Status', cell: () => <Status value="Available" /> }, { header: 'Creation time', cell: (b) => fmtDate(b.t) }, { header: 'Type', cell: () => 'User' },
      ]} />
      <Teach>On-demand backups are kept until you delete them and have no performance impact. Use <b>AWS Backup</b> for schedules, retention and cross-Region/cross-account copies.</Teach>
    </Panel>
  </>;
}

function Streams({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const c = useCloud((c) => c);
  const [bucket, setBucket] = useState(c.buckets[0]?.name ?? '');
  const triggers = c.lambdas.filter((f) => f.triggers.some((tr) => tr.type === 'dynamodb-stream' && tr.source.includes(`table/${t.name}`)));
  return <>
    <Panel title="Exports to S3" actions={<Button disabled={!t.pitr || !bucket} title={!t.pitr ? 'Turn on PITR first' : undefined} onClick={() => upd(() => {}, `ExportTableToPointInTime ${t.name} → s3://${bucket}`)}>Export to S3</Button>}>
      <Field label="Destination S3 bucket"><Select value={bucket} onChange={setBucket} options={c.buckets.length ? c.buckets.map((b) => b.name) : ['']} /></Field>
      {!t.pitr && <Alert kind="info">Export to S3 requires point-in-time recovery to be turned on (Backups tab).</Alert>}
      <Teach>Export to S3 reads from PITR backups, so it consumes <b>no read capacity</b>. Query the export with Athena.</Teach>
    </Panel>
    <Panel title="DynamoDB stream details">
      <Check checked={t.streams} onChange={(v) => upd((x) => { x.streams = v; }, `UpdateTable ${t.name}: stream ${v ? 'enabled (NEW_AND_OLD_IMAGES)' : 'disabled'}`)} label="Turn on DynamoDB Streams" hint="View type: New and old images. Records are kept for 24 hours." />
      {triggers.length > 0 && <p>Triggers: {triggers.map((f) => <Link key={f.id} to={`/console/lambda/functions/${f.id}`} className="mr-2">{f.name}</Link>)}</p>}
      <Teach>Streams capture every item change in order (per item). Typical exam use: a <b>Lambda trigger</b> reacting to inserts (send a welcome email, update an aggregate). Streams also power global tables.</Teach>
    </Panel>
  </>;
}

function GlobalTables({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const options = REGIONS.filter((r) => r.id !== t.region && !t.globalReplicas.includes(r.id));
  const [region, setRegion] = useState(options[0]?.id ?? '');
  return (
    <Panel title="Replicas" counter={t.globalReplicas.length} actions={<><Select value={region} onChange={setRegion} options={options.map((r) => ({ value: r.id, label: `${r.name} (${r.id})` }))} />
      <Button disabled={!region} onClick={() => { upd((x) => { x.globalReplicas.push(region); x.streams = true; }, `UpdateTable ${t.name}: create replica in ${region} (global table)`); setRegion(options.find((r) => r.id !== region)?.id ?? ''); }}>Create replica</Button></>}>
      <Table rows={[{ id: t.region, primary: true }, ...t.globalReplicas.map((r) => ({ id: r, primary: false }))]} columns={[
        { header: 'Region', cell: (r) => `${REGIONS.find((x) => x.id === r.id)?.name ?? r.id} (${r.id})` },
        { header: 'Status', cell: () => <Status value="Active" /> },
        { header: 'Role', cell: (r) => (r.primary ? 'This Region' : 'Replica (read/write)') },
        { header: '', cell: (r) => (r.primary ? '' : <button className="link" onClick={() => upd((x) => { x.globalReplicas = x.globalReplicas.filter((g) => g !== r.id); }, `UpdateTable ${t.name}: delete replica in ${r.id}`)}>Delete replica</button>) },
      ]} />
      <Teach title="Global tables">Global tables are <b>multi-active</b>: every replica accepts reads <b>and writes</b>, replicated asynchronously (usually under 1 s); concurrent updates resolve by last writer wins. Exam trigger: low-latency writes for users on several continents, or a multi-Region active-active DR design. Adding a replica turns on Streams automatically.</Teach>
    </Panel>
  );
}

function Ttl({ t, upd }: { t: DynamoTable; upd: Upd }) {
  const [attr, setAttr] = useState(t.ttlAttribute ?? 'expiresAt');
  return (
    <Panel title="Time to Live (TTL)" actions={t.ttlAttribute
      ? <Button onClick={() => upd((x) => { x.ttlAttribute = undefined; }, `UpdateTimeToLive ${t.name}: off`)}>Turn off</Button>
      : <Button primary disabled={!attr} onClick={() => upd((x) => { x.ttlAttribute = attr; }, `UpdateTimeToLive ${t.name}: on (${attr})`)}>Turn on</Button>}>
      <KV items={[['TTL status', t.ttlAttribute ? 'On' : 'Off'], ['TTL attribute name', t.ttlAttribute ?? '–']]} />
      {!t.ttlAttribute && <Field label="TTL attribute name" hint="The attribute must hold an epoch timestamp in seconds."><Input value={attr} onChange={(e) => setAttr(e.target.value)} /></Field>}
      <Teach>TTL deletes expired items <b>for free</b> (no WCU), typically within a few days of expiry. Great for sessions, temporary tokens and logs. Deletions appear in Streams, so you can archive them to S3.</Teach>
    </Panel>
  );
}

function Dax() {
  return (
    <Page title="DAX clusters" crumbs={[{ label: 'DynamoDB', to: '/console/dynamodb' }, { label: 'Clusters' }]}>
      <Panel title="Clusters" counter={0}>
        <p className="text-[#5f6b7a]">DAX clusters aren't simulated here.</p>
        <Teach title="DAX">An in-memory cache for DynamoDB with microsecond reads, deployed in your VPC. Use it for read-heavy or bursty workloads hitting the same items. It doesn't help write-heavy workloads.</Teach>
      </Panel>
    </Page>
  );
}
