import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, Check, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, fmtDate, useCloud, useCloudActions } from '../../kit';
import type { Bucket, LifecycleRule, StorageClass } from '../../../cloud/types';
import { costLines, usd } from '../../../cloud/pricing';
import { Group, arn, websiteEndpoint, restDomain, CLASSES, classInfo, lifecycleIssues, versionsByKey, currentObjects, putObject, deleteObject, policyTemplate, policyDoc, policyError } from './lib';
import { BpaEditor, accessLabel } from './S3Console';

type Upd = (fn: (b: Bucket) => void, msg: string) => void;

export default function BucketDetail() {
  const { name } = useParams();
  const b = useCloud((c) => c.buckets.find((x) => x.name === name));
  const { mutate, log } = useCloudActions();
  if (!b) return <Page title="Bucket not found" crumbs={[{ label: 'Amazon S3', to: '/console/s3' }]}><Alert kind="error">No bucket named {name}. <Link to="/console/s3">Back to buckets</Link></Alert></Page>;
  const upd: Upd = (fn, msg) => { mutate((c) => { const x = c.buckets.find((y) => y.id === b.id); if (x) fn(x); }); log('s3', msg); };
  return (
    <Page title={b.name} info crumbs={[{ label: 'Amazon S3', to: '/console/s3' }, { label: 'Buckets', to: '/console/s3' }, { label: b.name }]}>
      <Tabs tabs={[
        { label: 'Objects', content: <ObjectsTab b={b} upd={upd} /> },
        { label: 'Properties', content: <PropertiesTab b={b} upd={upd} /> },
        { label: 'Permissions', content: <PermissionsTab b={b} upd={upd} /> },
        { label: 'Metrics', content: <MetricsTab b={b} /> },
        { label: 'Management', content: <ManagementTab b={b} upd={upd} /> },
      ]} />
    </Page>
  );
}

// ---------- Objects ----------
function ObjectsTab({ b, upd }: { b: Bucket; upd: Upd }) {
  const [showVersions, setShowVersions] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'upload' | 'delete' | 'presign' | null>(null);
  const byKey = versionsByKey(b.objects);
  const rows = showVersions
    ? [...byKey.values()].flatMap((vs) => vs.map((o, i) => ({ id: `${o.key}#${o.versionId}`, o, latest: i === 0 })))
    : currentObjects(b.objects).map((o) => ({ id: `${o.key}#${o.versionId}`, o, latest: true }));
  const row = rows.find((r) => r.id === sel);

  const { mutate, log } = useCloudActions();
  const upload = (files: { name: string; size: number }[], cls: StorageClass) => {
    mutate((c) => {
      const src = c.buckets.find((y) => y.id === b.id);
      if (!src) return;
      // Replication copies new objects (same version ID) into a versioned destination.
      const dest = c.buckets.find((y) => y.name === src.replicationTo && y.versioning === 'Enabled');
      for (const f of files) {
        const o = putObject(src, { key: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), storageClass: cls });
        dest?.objects.push({ ...o });
      }
    });
    log('s3', `PutObject ${files.map((f) => f.name).join(', ')} to ${b.name} (${cls})${b.replicationTo ? `, replicated to ${b.replicationTo}` : ''}`);
  };

  const del = () => {
    if (!row) return;
    const { o, latest } = row;
    if (showVersions) {
      const restored = o.isDeleteMarker && latest;
      upd((x) => { x.objects = x.objects.filter((y) => !(y.key === o.key && y.versionId === o.versionId)); },
        restored ? `Removed delete marker for ${o.key} in ${b.name}: object restored` : `Permanently deleted ${o.key} version ${o.versionId}`);
    } else {
      upd((x) => { deleteObject(x, o.key); }, `${b.versioning === 'Disabled' ? 'Permanently deleted' : 'Delete marker created for'} ${o.key} in ${b.name}`);
    }
    setSel(null);
  };

  const permanent = showVersions || b.versioning === 'Disabled';
  return (
    <>
      <Panel title="Objects" counter={rows.length} desc="Objects are the fundamental entities stored in Amazon S3."
        actions={<>
          <Button disabled={!row || row.o.isDeleteMarker} onClick={() => setModal('presign')}>Share with a presigned URL</Button>
          {row?.o.isDeleteMarker && row.latest && showVersions && <Button onClick={() => setModal('delete')}>Restore (delete marker)</Button>}
          <Button disabled={!row} onClick={() => setModal('delete')}>Delete</Button>
          <Button onClick={() => upload([{ name: 'sample.txt', size: 2048 }], 'STANDARD')}>Create sample object</Button>
          <Button primary onClick={() => setModal('upload')}>Upload</Button>
        </>}>
        <div className="mb-3 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showVersions} onChange={(e) => { setShowVersions(e.target.checked); setSel(null); }} /><span className="font-semibold">Show versions</span></label>
          {b.versioning === 'Disabled' && <span className="aws-hint">Versioning is disabled: every object has version ID "null".</span>}
        </div>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(r) => r.o.key} empty="No objects. Upload a file or create a sample object."
          columns={[
            { header: 'Name', cell: (r) => <span className={r.o.isDeleteMarker ? 'text-[#5f6b7a]' : 'link'}>{r.o.key}</span> },
            ...(showVersions ? [{ header: 'Version ID', cell: (r: (typeof rows)[number]) => <span className="font-mono text-[12px]">{r.o.versionId}{r.latest && <span className="ml-2 text-[11px] font-sans bg-[#e9ebed] rounded px-1">Latest version</span>}</span> }] : []),
            { header: 'Type', cell: (r) => (r.o.isDeleteMarker ? 'Delete marker' : r.o.key.split('.').pop() ?? '-') },
            { header: 'Last modified', cell: (r) => fmtDate(r.o.lastModified) },
            { header: 'Size', cell: (r) => (r.o.isDeleteMarker ? '-' : `${r.o.sizeKb} KB`) },
            { header: 'Storage class', cell: (r) => (r.o.isDeleteMarker ? '-' : classInfo(r.o.storageClass).label) },
          ]} />
        {showVersions && <Teach>A delete without a version ID only adds a delete marker; the data is still there (and still billed). Deleting the delete marker itself "undeletes" the object. Deleting a specific version ID is permanent, which is what MFA Delete protects.</Teach>}
      </Panel>
      {modal === 'upload' && <UploadModal b={b} onClose={() => setModal(null)} onUpload={(f, c) => { upload(f, c); setModal(null); }} />}
      {modal === 'delete' && row && (permanent
        ? <ConfirmDelete what={row.o.isDeleteMarker ? `delete marker for ${row.o.key}` : `${row.o.key}${showVersions ? ` (version ${row.o.versionId})` : ''}`} onClose={() => setModal(null)} onConfirm={del}
            warning={row.o.isDeleteMarker ? 'Removing the delete marker makes the previous version current again: the object is restored.' : 'Deleting a specific version permanently deletes it. This cannot be undone.'} />
        : <Modal title="Delete objects" onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button primary onClick={() => { del(); setModal(null); }}>Delete objects</Button></>}>
            <p>Deleting <b>{row.o.key}</b> in a bucket with versioning {b.versioning.toLowerCase()} adds a <b>delete marker</b>. Previous versions are kept; to restore, turn on Show versions and delete the marker.</p>
          </Modal>)}
      {modal === 'presign' && row && <PresignModal b={b} keyName={row.o.key} onClose={() => setModal(null)} />}
    </>
  );
}

function UploadModal({ b, onClose, onUpload }: { b: Bucket; onClose: () => void; onUpload: (f: { name: string; size: number }[], c: StorageClass) => void }) {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [cls, setCls] = useState<StorageClass>('STANDARD');
  return (
    <Modal title="Upload" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!files.length} onClick={() => onUpload(files, cls)}>Upload</Button></>}>
      <Field label="Files and folders" hint="Simulated: only the file name and size are used; contents are never read.">
        <input type="file" multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }))])} />
      </Field>
      <Button onClick={() => setFiles([...files, { name: `sample-${files.length + 1}.txt`, size: 4096 }])}>Add sample file</Button>
      {files.length > 0 && <ul className="my-3 text-[13px]">{files.map((f, i) => <li key={i}>{f.name} <span className="aws-hint">({Math.max(1, Math.round(f.size / 1024))} KB)</span></li>)}</ul>}
      <Group label="Storage class">
        <div className="grid gap-1">
          {CLASSES.map((c) => (
            <label key={c.id} className={`flex gap-2 items-start rounded border px-2 py-1 cursor-pointer ${cls === c.id ? 'border-[#0972d3] bg-[#f2f8fd]' : 'border-[#e9ebed]'}`}>
              <input type="radio" className="mt-1" checked={cls === c.id} onChange={() => setCls(c.id)} />
              <span><b>{c.label}</b> <span className="aws-hint">AZs: {c.azs} · Min storage duration: {c.minDays ? `${c.minDays} days` : 'none'} · {c.retrieval}</span></span>
            </label>
          ))}
        </div>
      </Group>
      <Teach>Minimum durations: Standard-IA and One Zone-IA 30 days, Glacier Instant and Flexible Retrieval 90 days, Deep Archive 180 days. Delete earlier and you are billed for the rest. Glacier Flexible/Deep Archive objects must be restored before you can read them. Unknown access pattern? Intelligent-Tiering.</Teach>
      <div className="aws-hint">Encryption: bucket default ({b.dsse ? 'DSSE-KMS' : b.defaultEncryption}).</div>
    </Modal>
  );
}

function PresignModal({ b, keyName, onClose }: { b: Bucket; keyName: string; onClose: () => void }) {
  const [mins, setMins] = useState('60');
  const n = Number(mins);
  const err = !(n >= 1 && n <= 720) ? 'The console allows 1 to 720 minutes (12 hours). The SDK/CLI allows up to 7 days with IAM user credentials.' : undefined;
  const sig = Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(keyName.charCodeAt(i % keyName.length) * (i + 7) + n) % 16]).join('');
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = `https://${restDomain(b)}/${encodeURIComponent(keyName)}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F${now.slice(0, 8)}%2F${b.region}%2Fs3%2Faws4_request&X-Amz-Date=${now}&X-Amz-Expires=${n * 60}&X-Amz-SignedHeaders=host&X-Amz-Signature=${sig}`;
  return (
    <Modal title="Share with a presigned URL" onClose={onClose} footer={<Button primary onClick={onClose}>Done</Button>}>
      <Field label="Time interval until the presigned URL expires (minutes)" error={err}><Input type="number" value={mins} onChange={(e) => setMins(e.target.value)} /></Field>
      {!err && <><div className="aws-label">Presigned URL</div><textarea readOnly className="aws-input font-mono text-[12px] h-28" value={url} /></>}
      <Teach>A presigned URL grants temporary GET (or PUT, for direct browser uploads) on one object using the signer's permissions, so the bucket stays private. It stops working when it expires or when the signer's credentials expire (an STS role session can cut it short). For many files behind CloudFront, use CloudFront signed URLs/cookies instead.</Teach>
    </Modal>
  );
}

// ---------- Properties ----------
function PropertiesTab({ b, upd }: { b: Bucket; upd: Upd }) {
  const [edit, setEdit] = useState<'versioning' | 'encryption' | 'accel' | 'website' | null>(null);
  return (
    <>
      <Panel title="Bucket overview"><KV items={[['AWS Region', b.region], ['Amazon Resource Name (ARN)', arn(b)], ['Creation date', fmtDate(b.createdAt)]]} /></Panel>
      <Panel title="Bucket Versioning" actions={<Button onClick={() => setEdit('versioning')}>Edit</Button>}>
        <KV items={[['Bucket Versioning', b.versioning], ['Multi-factor authentication (MFA) delete', 'Disabled']]} />
        <Teach>MFA Delete can only be enabled by the root user via the CLI/API, and only while versioning is enabled. It demands an MFA code to permanently delete a version or suspend versioning.</Teach>
      </Panel>
      <Panel title="Default encryption" actions={<Button onClick={() => setEdit('encryption')}>Edit</Button>}>
        <KV items={[['Encryption type', b.dsse ? 'DSSE-KMS' : b.defaultEncryption], ['Bucket Key', b.defaultEncryption === 'SSE-KMS' && !b.dsse ? (b.bucketKey ? 'Enabled' : 'Disabled') : '–'], ['AWS KMS key ARN', b.kmsKeyId ? `arn:aws:kms:${b.region}:123456789012:key/${b.kmsKeyId}` : '–']]} />
      </Panel>
      <Panel title="Transfer acceleration" actions={<Button onClick={() => setEdit('accel')}>Edit</Button>}>
        <KV items={[['Transfer acceleration', b.transferAcceleration ? 'Enabled' : 'Disabled'], ['Accelerated endpoint', b.transferAcceleration ? `${b.name}.s3-accelerate.amazonaws.com` : '–']]} />
        <Teach>Transfer Acceleration routes uploads from far-away clients over CloudFront edge locations and the AWS backbone. Pair it with multipart upload (recommended above 100 MB, required above 5 GB) for big, distant uploads.</Teach>
      </Panel>
      <Panel title="Object Lock">
        <KV items={[['Object Lock', b.objectLock ? 'Enabled' : 'Disabled'], ['Default retention', b.objectLock ? 'Disabled (set per object or edit here in the real console)' : '–']]} />
        {!b.objectLock && <div className="aws-hint mt-2">Object Lock is chosen when the bucket is created and requires versioning.</div>}
      </Panel>
      <Panel title="Static website hosting" actions={<Button onClick={() => setEdit('website')}>Edit</Button>}>
        <KV items={[['Static website hosting', b.staticWebsite ? 'Enabled' : 'Disabled'], ['Hosting type', b.staticWebsite ? 'Bucket hosting' : '–'], ['Bucket website endpoint', b.staticWebsite ? websiteEndpoint(b) : '–']]} />
        {b.staticWebsite && b.blockPublicAccess && <Alert kind="warning">Block Public Access is on, so the website endpoint returns 403. Either turn it off and add a public-read bucket policy, or (better) serve the bucket through CloudFront.</Alert>}
      </Panel>
      {edit === 'versioning' && <VersioningModal b={b} upd={upd} onClose={() => setEdit(null)} />}
      {edit === 'encryption' && <EncryptionModal b={b} upd={upd} onClose={() => setEdit(null)} />}
      {edit === 'accel' && <ToggleModal title="Edit transfer acceleration" label="Transfer acceleration" value={b.transferAcceleration} onClose={() => setEdit(null)}
        error={b.name.includes('.') ? 'Transfer Acceleration is not supported for bucket names that contain dots.' : undefined}
        onSave={(v) => upd((x) => { x.transferAcceleration = v; }, `PutBucketAccelerateConfiguration ${b.name}: ${v ? 'Enabled' : 'Suspended'}`)} />}
      {edit === 'website' && <ToggleModal title="Edit static website hosting" label="Static website hosting" value={b.staticWebsite} onClose={() => setEdit(null)}
        extra={<><Field label="Index document"><Input defaultValue="index.html" /></Field><Teach>The website endpoint is HTTP only and needs public objects. For HTTPS and a private bucket, use CloudFront with OAC and the REST endpoint instead. A Route 53 alias to the website endpoint needs the bucket name to equal the domain name.</Teach></>}
        onSave={(v) => upd((x) => { x.staticWebsite = v; }, `PutBucketWebsite ${b.name}: ${v ? 'enabled' : 'disabled'}`)} />}
    </>
  );
}

function ToggleModal({ title, label, value, onSave, onClose, extra, error }: { title: string; label: string; value: boolean; onSave: (v: boolean) => void; onClose: () => void; extra?: React.ReactNode; error?: string }) {
  const [v, setV] = useState(value);
  return (
    <Modal title={title} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={v && !!error} onClick={() => { onSave(v); onClose(); }}>Save changes</Button></>}>
      <Group label={label} error={v ? error : undefined}><Radios value={v ? 'on' : 'off'} onChange={(x) => setV(x === 'on')} options={[{ value: 'off', label: 'Disable' }, { value: 'on', label: 'Enable' }]} /></Group>
      {v && extra}
    </Modal>
  );
}

function VersioningModal({ b, upd, onClose }: { b: Bucket; upd: Upd; onClose: () => void }) {
  const [v, setV] = useState<'Enabled' | 'Suspended' | 'Disabled'>(b.versioning);
  const opts = b.versioning === 'Disabled' ? [{ value: 'Disabled' as const, label: 'Disable' }, { value: 'Enabled' as const, label: 'Enable' }] : [{ value: 'Suspended' as const, label: 'Suspend', desc: 'Stops creating new versions; existing versions are kept.' }, { value: 'Enabled' as const, label: 'Enable' }];
  const err = b.objectLock && v !== 'Enabled' ? 'Versioning cannot be suspended on a bucket with Object Lock enabled.' : b.replicationTo && v !== 'Enabled' ? 'Replication requires versioning: remove the replication rule first.' : undefined;
  return (
    <Modal title="Edit Bucket Versioning" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err} onClick={() => { upd((x) => { x.versioning = v; }, `PutBucketVersioning ${b.name}: ${v}`); onClose(); }}>Save changes</Button></>}>
      <Group label="Bucket Versioning" error={err}><Radios value={v} onChange={setV} options={opts} /></Group>
      <Teach>Versioning protects against accidental deletes and overwrites, and is required for replication and Object Lock. Every version is billed, so pair it with a lifecycle rule that expires noncurrent versions.</Teach>
    </Modal>
  );
}

function EncryptionModal({ b, upd, onClose }: { b: Bucket; upd: Upd; onClose: () => void }) {
  const keys = useCloud((c) => c.kmsKeys);
  const [enc, setEnc] = useState<'SSE-S3' | 'SSE-KMS' | 'DSSE-KMS'>(b.dsse ? 'DSSE-KMS' : b.defaultEncryption);
  const [keyId, setKeyId] = useState(b.kmsKeyId ?? 'key-aws-s3');
  const [bk, setBk] = useState(b.bucketKey ?? true);
  const opts = [{ value: 'key-aws-s3', label: 'aws/s3 (AWS managed key)' }, ...keys.filter((k) => k.managedBy === 'customer' && k.enabled && k.region === b.region).map((k) => ({ value: k.id, label: `${k.alias} (customer managed)` }))];
  const save = () => {
    upd((x) => { x.defaultEncryption = enc === 'SSE-S3' ? 'SSE-S3' : 'SSE-KMS'; x.dsse = enc === 'DSSE-KMS' || undefined; x.kmsKeyId = enc === 'SSE-S3' ? undefined : keyId; x.bucketKey = enc === 'SSE-KMS' ? bk : undefined; }, `PutBucketEncryption ${b.name}: ${enc}`);
    onClose();
  };
  return (
    <Modal title="Edit default encryption" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary onClick={save}>Save changes</Button></>}>
      <Group label="Encryption type"><Radios value={enc} onChange={setEnc} options={[{ value: 'SSE-S3', label: 'SSE-S3' }, { value: 'SSE-KMS', label: 'SSE-KMS' }, { value: 'DSSE-KMS', label: 'DSSE-KMS' }]} /></Group>
      {enc !== 'SSE-S3' && <Field label="AWS KMS key"><Select value={keyId} onChange={setKeyId} options={opts} /></Field>}
      {enc === 'SSE-KMS' && <Check checked={bk} onChange={setBk} label="Bucket Key" hint="Reduces KMS request costs by up to 99%." />}
      <Teach>Changing default encryption affects new objects only; existing objects keep their encryption until copied (S3 Batch Operations can re-encrypt in bulk).</Teach>
    </Modal>
  );
}

// ---------- Permissions ----------
function PermissionsTab({ b, upd }: { b: Bucket; upd: Upd }) {
  const accountId = useCloud((c) => c.accountId);
  const dists = useCloud((c) => c.distributions.filter((d) => d.origins.some((o) => o.target.startsWith(`${b.name}.s3.`))));
  const [editBpa, setEditBpa] = useState(false);
  const [text, setText] = useState(b.policy ?? '');
  const [saveErr, setSaveErr] = useState<string>();
  const [distId, setDistId] = useState(dists[0]?.id ?? '');
  const liveErr = policyError(text, b);
  const add = (st: object) => {
    let sts: object[] = [];
    try { const d = JSON.parse(text); sts = Array.isArray(d.Statement) ? d.Statement : d.Statement ? [d.Statement] : []; } catch { /* start fresh */ }
    setText(policyDoc([...sts, st])); setSaveErr(undefined);
  };
  const save = () => {
    if (liveErr) return setSaveErr(liveErr);
    upd((x) => { x.policy = text.trim() || undefined; }, `PutBucketPolicy ${b.name}`);
    setSaveErr(undefined);
  };
  return (
    <>
      <Panel title="Permissions overview"><KV items={[['Access', accessLabel(b)], ['Object Ownership', b.objectOwnership === 'BucketOwnerEnforced' || !b.objectOwnership ? 'Bucket owner enforced (ACLs disabled)' : b.objectOwnership === 'ObjectWriter' ? 'Object writer' : 'Bucket owner preferred']]} cols={2} /></Panel>
      <Panel title="Block public access (bucket settings)" actions={<Button onClick={() => setEditBpa(true)}>Edit</Button>}>
        <KV items={[['Block all public access', b.blockPublicAccess ? <span className="text-[#037f0c]">On</span> : <span className="text-[#d91515] font-bold">Off</span>]]} />
        {!b.blockPublicAccess && b.publicAccessBlock && <div className="aws-hint mt-2">Individual settings: {b.publicAccessBlock.map((v, i) => `#${i + 1} ${v ? 'On' : 'Off'}`).join(' · ')}</div>}
      </Panel>
      <Panel title="Bucket policy" desc="The bucket policy, written in JSON, provides access to the objects stored in the bucket. Bucket policies don't apply to objects owned by other accounts."
        actions={<><Button disabled={!b.policy} onClick={() => { setText(''); upd((x) => { x.policy = undefined; }, `DeleteBucketPolicy ${b.name}`); }}>Delete</Button><Button primary onClick={save}>Save changes</Button></>}>
        <div className="aws-hint mb-1">Bucket ARN: <span className="font-mono">{arn(b)}</span></div>
        <textarea className="aws-input font-mono text-[12.5px] h-72" spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setSaveErr(undefined); }} placeholder='{ "Version": "2012-10-17", "Statement": [ ... ] }' />
        {(saveErr || (text && liveErr)) && <div className="text-[#d91515] text-[12px] mt-1">⊗ {saveErr ?? liveErr}</div>}
        {text === (b.policy ?? '') && b.policy && <div className="text-[#037f0c] text-[12px] mt-1">✓ Saved</div>}
        <div className="mt-4 rounded-lg border border-[#e9ebed] p-3">
          <div className="font-bold mb-2">Policy generator</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="min-w-[260px]"><Field label="CloudFront distribution (for OAC)"><Select value={distId} onChange={setDistId} options={[{ value: '', label: 'Placeholder distribution ID' }, ...dists.map((d) => ({ value: d.id, label: `${d.id} (${d.domainName})` }))]} /></Field></div>
            <div className="mb-4 flex gap-2">
              <Button onClick={() => add(policyTemplate('oac', b.name, accountId, distId || undefined))}>Add: Allow CloudFront OAC</Button>
              <Button onClick={() => add(policyTemplate('tls', b.name, accountId))}>Add: Deny non-TLS requests</Button>
            </div>
          </div>
          <Teach title="OAC">Origin Access Control lets only your CloudFront distribution (service principal cloudfront.amazonaws.com, conditioned on AWS:SourceArn) read the bucket, so BPA stays on and nobody can bypass the CDN. It replaces the legacy OAI and also supports SSE-KMS and PUT. The deny-insecure-transport statement (aws:SecureTransport = false) is the standard answer to "enforce encryption in transit".</Teach>
        </div>
      </Panel>
      {editBpa && <BpaModal b={b} upd={upd} onClose={() => setEditBpa(false)} />}
    </>
  );
}

function BpaModal({ b, upd, onClose }: { b: Bucket; upd: Upd; onClose: () => void }) {
  const [v, setV] = useState(b.publicAccessBlock ?? [b.blockPublicAccess, b.blockPublicAccess, b.blockPublicAccess, b.blockPublicAccess]);
  const [confirm, setConfirm] = useState('');
  const off = !v.every(Boolean);
  const loosening = off && b.blockPublicAccess;
  return (
    <Modal title="Edit Block public access (bucket settings)" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={loosening && confirm !== 'confirm'} onClick={() => { upd((x) => { x.publicAccessBlock = v; x.blockPublicAccess = !off; }, `PutPublicAccessBlock ${b.name}: ${off ? 'some settings OFF' : 'all on'}`); onClose(); }}>Save changes</Button></>}>
      <BpaEditor value={v} onChange={setV} />
      {off && <Alert kind="warning">Turning off block all public access might result in this bucket and the objects within becoming public.</Alert>}
      {loosening && <Field label='To confirm the settings, enter "confirm" in the field.'><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>}
      <Teach>BPA can also be set for the whole account (Organizations SCPs can stop anyone turning it off). It always wins over bucket policies and ACLs.</Teach>
    </Modal>
  );
}

// ---------- Management ----------
function ManagementTab({ b, upd }: { b: Bucket; upd: Upd }) {
  const buckets = useCloud((c) => c.buckets);
  const [creating, setCreating] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [repl, setRepl] = useState(false);
  const [dest, setDest] = useState('');
  const destB = buckets.find((x) => x.name === dest);
  const replErr = !dest ? 'Choose a destination bucket.' : b.versioning !== 'Enabled' ? 'The source bucket must have versioning enabled.' : destB?.versioning !== 'Enabled' ? `The destination bucket ${dest} must have versioning enabled.` : undefined;
  return (
    <>
      <Panel title="Lifecycle rules" counter={b.lifecycle.length} desc="Use lifecycle rules to transition objects to cheaper storage classes and to expire them."
        actions={<><Button disabled={!sel} onClick={() => { upd((x) => { x.lifecycle = x.lifecycle.filter((r) => r.id !== sel); }, `Deleted lifecycle rule ${sel} on ${b.name}`); setSel(null); }}>Delete</Button><Button primary onClick={() => setCreating(true)}>Create lifecycle rule</Button></>}>
        <Table rows={b.lifecycle} selected={sel} onSelect={setSel} empty="There are no lifecycle rules for this bucket."
          columns={[
            { header: 'Lifecycle rule name', cell: (r) => r.id },
            { header: 'Scope', cell: (r) => (r.prefix ? `Prefix: ${r.prefix}` : 'Entire bucket') },
            { header: 'Transitions', cell: (r) => r.transitions.map((t) => `${classInfo(t.storageClass).label} @ ${t.days}d`).join(' → ') || '–' },
            { header: 'Expiration', cell: (r) => (r.expireDays ? `${r.expireDays} days` : '–') },
            { header: 'Noncurrent expiration', cell: (r) => (r.noncurrentExpireDays ? `${r.noncurrentExpireDays} days` : '–') },
          ]} />
      </Panel>
      {creating && <LifecycleForm b={b} onCancel={() => setCreating(false)} onSave={(r) => { upd((x) => { x.lifecycle.push(r); }, `PutBucketLifecycleConfiguration ${b.name}: rule ${r.id}`); setCreating(false); }} />}

      <Panel title="Replication rules" desc="Replicate new objects to another bucket in the same Region (SRR) or another Region (CRR)."
        actions={b.replicationTo ? <Button onClick={() => upd((x) => { x.replicationTo = undefined; }, `Deleted replication rule on ${b.name}`)}>Delete rule</Button> : <Button primary onClick={() => setRepl(true)}>Create replication rule</Button>}>
        {b.replicationTo
          ? <KV items={[['Destination', b.replicationTo], ['Type', buckets.find((x) => x.name === b.replicationTo)?.region === b.region ? 'Same-Region (SRR)' : 'Cross-Region (CRR)'], ['IAM role', `s3crr_role_for_${b.name}`], ['Status', 'Enabled']]} />
          : <div className="text-[#5f6b7a]">No replication rules.</div>}
        {repl && !b.replicationTo && (
          <div className="mt-3 border-t border-[#e9ebed] pt-3">
            <Field label="Destination bucket" error={dest ? replErr : undefined}>
              <Select value={dest} onChange={setDest} options={[{ value: '', label: 'Choose a bucket' }, ...buckets.filter((x) => x.id !== b.id).map((x) => ({ value: x.name, label: `${x.name} (${x.region}, versioning ${x.versioning})` }))]} />
            </Field>
            {destB && <div className="mb-2">Rule type: <b>{destB.region === b.region ? 'Same-Region Replication (SRR)' : 'Cross-Region Replication (CRR)'}</b> · IAM role: Create new role</div>}
            <div className="flex gap-2"><Button onClick={() => setRepl(false)}>Cancel</Button><Button primary disabled={!!replErr} onClick={() => { upd((x) => { x.replicationTo = dest; }, `PutBucketReplication ${b.name} → ${dest} (${destB?.region === b.region ? 'SRR' : 'CRR'})`); setRepl(false); }}>Save</Button></div>
          </div>
        )}
        <Teach>CRR: disaster recovery, compliance copies in another Region, lower latency for distant users. SRR: aggregate logs, copy prod to test, keep a copy under a different account. Both need versioning on both buckets, replicate only new objects (use S3 Batch Replication for existing ones), don't chain (A→B→C), and skip delete markers unless you enable delete marker replication. S3 RTC gives a 15-minute SLA.</Teach>
      </Panel>
    </>
  );
}

function LifecycleForm({ b, onSave, onCancel }: { b: Bucket; onSave: (r: LifecycleRule) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [doTrans, setDoTrans] = useState(true);
  const [trans, setTrans] = useState<{ days: string; storageClass: StorageClass }[]>([{ days: '30', storageClass: 'STANDARD_IA' }]);
  const [doExp, setDoExp] = useState(false);
  const [exp, setExp] = useState('365');
  const [doNc, setDoNc] = useState(false);
  const [nc, setNc] = useState('30');
  const [tried, setTried] = useState(false);
  const transitions = doTrans ? trans.map((t) => ({ days: Number(t.days), storageClass: t.storageClass })) : [];
  const { errors, warnings } = lifecycleIssues(transitions, doExp ? Number(exp) : undefined);
  const nameErr = !name ? 'Enter a rule name.' : b.lifecycle.some((r) => r.id === name) ? 'A rule with this name already exists.' : undefined;
  const ncErr = doNc && !(Number(nc) >= 1) ? 'Days after objects become noncurrent must be at least 1.' : undefined;
  const noAction = !doTrans && !doExp && !doNc ? 'Choose at least one rule action.' : undefined;
  const submit = () => {
    setTried(true);
    if (nameErr || ncErr || noAction || errors.length) return;
    onSave({ id: name, prefix, transitions, expireDays: doExp ? Number(exp) : undefined, noncurrentExpireDays: doNc ? Number(nc) : undefined });
  };
  return (
    <Panel title="Create lifecycle rule">
      <Field label="Lifecycle rule name" error={tried ? nameErr : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="archive-old-data" /></Field>
      <Field label="Prefix (optional)" hint="Leave empty to apply the rule to all objects in the bucket."><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="logs/" /></Field>
      <Group label="Lifecycle rule actions" error={tried ? noAction : undefined}>
        <Check checked={doTrans} onChange={setDoTrans} label="Move current versions of objects between storage classes" />
        <Check checked={doExp} onChange={setDoExp} label="Expire current versions of objects" />
        <Check checked={doNc} onChange={setDoNc} label="Permanently delete noncurrent versions of objects" />
      </Group>
      {doTrans && (
        <Group label="Transition current versions of objects between storage classes">
          {trans.map((t, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <div className="w-[260px]"><Select value={t.storageClass} onChange={(v) => setTrans(trans.map((x, j) => (j === i ? { ...x, storageClass: v as StorageClass } : x)))} options={CLASSES.filter((c) => c.id !== 'STANDARD').map((c) => ({ value: c.id, label: c.label }))} /></div>
              <div className="w-[120px]"><Input type="number" value={t.days} onChange={(e) => setTrans(trans.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)))} /></div>
              <span className="aws-hint">days after object creation</span>
              <Button onClick={() => setTrans(trans.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          <Button onClick={() => setTrans([...trans, { days: String((Number(trans.at(-1)?.days) || 0) + 60), storageClass: 'GLACIER' }])}>Add transition</Button>
        </Group>
      )}
      {doExp && <Field label="Days after object creation (expire current versions)"><Input type="number" value={exp} onChange={(e) => setExp(e.target.value)} /></Field>}
      {doNc && <Field label="Days after objects become noncurrent" error={ncErr}><Input type="number" value={nc} onChange={(e) => setNc(e.target.value)} /></Field>}
      {doNc && b.versioning === 'Disabled' && <Alert kind="warning">Versioning is disabled on this bucket, so there are no noncurrent versions for this action to delete.</Alert>}
      {errors.map((e) => <div key={e} className="text-[#d91515] text-[13px]">⊗ {e}</div>)}
      {warnings.map((w) => <div key={w} className="text-[#8d6605] text-[13px]">⚠ {w}</div>)}
      <Teach>Typical waterfall: Standard → Standard-IA at 30 days (the minimum) → Glacier Flexible Retrieval at 90 → expire at 365. On a versioned bucket, "expire" only adds a delete marker; you also need noncurrent-version expiration to actually stop paying for old versions.</Teach>
      <div className="flex justify-end gap-2 mt-3"><Button onClick={onCancel}>Cancel</Button><Button primary onClick={submit}>Create rule</Button></div>
    </Panel>
  );
}

// ---------- Metrics ----------
function MetricsTab({ b }: { b: Bucket }) {
  const cloud = useCloud((c) => c);
  const lines = costLines(cloud).filter((l) => l.service === 'S3' && l.resource.startsWith(`${b.name} `));
  const byKey = versionsByKey(b.objects);
  const rows = CLASSES.map((c) => {
    let cur = 0, non = 0, n = 0;
    for (const vs of byKey.values()) vs.forEach((o, i) => { if (o.isDeleteMarker || o.storageClass !== c.id) return; n++; if (i === 0) cur += o.sizeKb; else non += o.sizeKb; });
    const monthly = (lines.find((l) => l.resource === `${b.name} ${c.id}`)?.hourly ?? 0) * 730;
    return { id: c.id, label: c.label, cur, non, n, monthly };
  }).filter((r) => r.n);
  const totalKb = rows.reduce((a, r) => a + r.cur + r.non, 0);
  const total = rows.reduce((a, r) => a + r.monthly, 0);
  return (
    <>
      <Panel title="Storage by class" desc="Simulated daily storage metrics (CloudWatch BucketSizeBytes / NumberOfObjects).">
        <KV items={[['Total bucket size', `${(totalKb / 1024).toFixed(2)} MB`], ['Total number of objects (all versions)', String(rows.reduce((a, r) => a + r.n, 0))], ['Estimated storage cost / month', usd(total, 4)]]} />
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="flex text-[13px]"><b>{r.label}</b><span className="ml-auto">{r.cur} KB current · {r.non} KB noncurrent · {usd(r.monthly, 6)}/mo</span></div>
              <div className="h-3 bg-[#e9ebed] rounded"><div className="h-3 bg-[#0972d3] rounded" style={{ width: `${totalKb ? ((r.cur + r.non) / totalKb) * 100 : 0}%` }} /></div>
            </div>
          ))}
          {!rows.length && <div className="text-[#5f6b7a]">No data stored yet.</div>}
        </div>
        {rows.some((r) => r.non) && <Teach>Noncurrent versions cost the same as current ones. A lifecycle rule with noncurrent-version expiration is how you cap that.</Teach>}
      </Panel>
      {b.defaultEncryption === 'SSE-KMS' && (
        <Panel title="KMS request cost estimate" desc="Assuming 1 million GET/PUT requests per month.">
          <KV items={[['Without Bucket Key', usd(3)], ['With Bucket Key', usd(0.03)], ['This bucket', usd(b.bucketKey && !b.dsse ? 0.03 : 3)]]} />
          <Teach>KMS charges $0.03 per 10,000 requests. High-traffic SSE-KMS buckets without a Bucket Key also risk KMS throttling (ThrottlingException).</Teach>
        </Panel>
      )}
    </>
  );
}
