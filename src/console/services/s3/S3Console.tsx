import { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, Check, Radios, Teach, Alert, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { REGIONS } from '../../../cloud/seed';
import type { Bucket } from '../../../cloud/types';
import { Group, arn, bucketNameError } from './lib';
import BucketDetail from './BucketDetail';

export default function S3Console() {
  return (
    <div className="flex">
      <SideNav title="Amazon S3" items={[{ label: 'General purpose buckets', to: '/console/s3' }, { label: 'Create bucket', to: '/console/s3/create' }, { section: 'Storage Lens' }, { label: 'Dashboards', to: '/console/s3' }, { section: 'Block Public Access settings for this account' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<BucketList />} />
          <Route path="create" element={<CreateBucket />} />
          <Route path="buckets/:name" element={<BucketDetail />} />
        </Routes>
      </div>
    </div>
  );
}

export const accessLabel = (b: Bucket) =>
  !b.blockPublicAccess && b.policy && /"Principal"\s*:\s*"\*"/.test(b.policy) && /"Effect"\s*:\s*"Allow"/.test(b.policy) ? 'Public' : b.blockPublicAccess ? 'Bucket and objects not public' : 'Objects can be public';

function BucketList() {
  const buckets = useCloud((c) => c.buckets);
  const { mutate, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [empty, setEmpty] = useState(false);
  const b = buckets.find((x) => x.id === sel);
  const nav = useNavigate();
  return (
    <Page title="Amazon S3" crumbs={[{ label: 'Amazon S3', to: '/console/s3' }, { label: 'Buckets' }]}>
      <Panel title="General purpose buckets" counter={buckets.length} desc="Buckets are containers for data stored in S3. Bucket names are globally unique; the bucket lives in one Region."
        actions={<>
          <Button disabled={!b} onClick={() => b && navigator.clipboard?.writeText(arn(b))}>Copy ARN</Button>
          <Button disabled={!b || !b.objects.length} onClick={() => setEmpty(true)}>Empty</Button>
          <Button disabled={!b} onClick={() => setDel(true)}>Delete</Button>
          <Button primary onClick={() => nav('/console/s3/create')}>Create bucket</Button>
        </>}>
        <Table rows={buckets} selected={sel} onSelect={setSel} filterText={(r) => r.name} empty="You don't have any buckets."
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/console/s3/buckets/${r.name}`}>{r.name}</Link> },
            { header: 'AWS Region', cell: (r) => `${REGIONS.find((x) => x.id === r.region)?.name ?? r.region} ${r.region}` },
            { header: 'Access', cell: (r) => <span className={accessLabel(r) === 'Public' ? 'text-[#d91515] font-bold' : ''}>{accessLabel(r)}</span> },
            { header: 'Creation date', cell: (r) => fmtDate(r.createdAt) },
          ]} />
      </Panel>
      <Teach title="Global namespace">S3 is a regional service with a global namespace: the bucket name must be unique across every AWS account, but the data never leaves the Region you choose unless you replicate it.</Teach>
      {empty && b && <ConfirmDelete what={`all objects in ${b.name}`} warning="Emptying deletes every object and every version. With versioning on, this is the only way to get rid of noncurrent versions short of lifecycle rules." onClose={() => setEmpty(false)}
        onConfirm={() => { mutate((c) => { const x = c.buckets.find((y) => y.id === b.id); if (x) x.objects = []; }); log('s3', `Emptied bucket ${b.name}`); }} />}
      {del && b && (b.objects.length
        ? <ConfirmDelete what={b.name} warning={`This bucket is not empty (${b.objects.length} objects/versions). S3 only deletes empty buckets: use Empty first.`} onClose={() => setDel(false)} onConfirm={() => {}} />
        : <ConfirmDelete what={b.name} warning="Bucket names are released after deletion; anyone may then claim it." onClose={() => setDel(false)}
            onConfirm={() => { mutate((c) => { c.buckets = c.buckets.filter((y) => y.id !== b.id); }); log('s3', `DeleteBucket ${b.name}`); setSel(null); }} />)}
    </Page>
  );
}

const BPA_LABELS = [
  ['Block public access to buckets and objects granted through new access control lists (ACLs)', 'S3 blocks public access permissions applied to newly added buckets or objects.'],
  ['Block public access to buckets and objects granted through any access control lists (ACLs)', 'S3 ignores all ACLs that grant public access.'],
  ['Block public access to buckets and objects granted through new public bucket or access point policies', 'S3 blocks new bucket policies that grant public access.'],
  ['Block public and cross-account access to buckets and objects through any public bucket or access point policies', 'S3 ignores public and cross-account access for buckets with public policies.'],
];

export function BpaEditor({ value, onChange }: { value: boolean[]; onChange: (v: boolean[]) => void }) {
  return (
    <div>
      <Check checked={value.every(Boolean)} onChange={(v) => onChange([v, v, v, v])} label="Block all public access" hint="Turning this setting on is the same as turning on all four settings below." />
      <div className="ml-6">
        {BPA_LABELS.map(([l, h], i) => <Check key={i} checked={value[i]} label={l} hint={h} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />)}
      </div>
    </div>
  );
}

function CreateBucket() {
  const nav = useNavigate();
  const region0 = useCloud((c) => c.region);
  const buckets = useCloud((c) => c.buckets);
  const keys = useCloud((c) => c.kmsKeys);
  const { put, log } = useCloudActions();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [region, setRegion] = useState(region0);
  const [acl, setAcl] = useState<'disabled' | 'enabled'>('disabled');
  const [ownership, setOwnership] = useState<'BucketOwnerPreferred' | 'ObjectWriter'>('BucketOwnerPreferred');
  const [bpa, setBpa] = useState([true, true, true, true]);
  const [ack, setAck] = useState(false);
  const [versioning, setVersioning] = useState<'Disabled' | 'Enabled'>('Disabled');
  const [enc, setEnc] = useState<'SSE-S3' | 'SSE-KMS' | 'DSSE-KMS'>('SSE-S3');
  const [keyId, setKeyId] = useState('key-aws-s3');
  const [bucketKey, setBucketKey] = useState(true);
  const [lock, setLock] = useState(false);
  const [lockAck, setLockAck] = useState(false);

  const nameErr = bucketNameError(name, buckets);
  const bpaOff = !bpa.every(Boolean);
  const kmsOptions = [{ value: 'key-aws-s3', label: 'aws/s3 (AWS managed key)' }, ...keys.filter((k) => k.managedBy === 'customer' && k.enabled && k.region === region).map((k) => ({ value: k.id, label: `${k.alias} (customer managed) ${k.id}` }))];
  const lockErr = lock && !lockAck ? 'Acknowledge the Object Lock warning to continue.' : undefined;
  const valid = !nameErr && (!bpaOff || ack) && !lockErr;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const b: Bucket = {
      id: name, name, region, createdAt: Date.now(),
      versioning: lock ? 'Enabled' : versioning, blockPublicAccess: !bpaOff, publicAccessBlock: bpa,
      objectOwnership: acl === 'disabled' ? 'BucketOwnerEnforced' : ownership,
      defaultEncryption: enc === 'SSE-S3' ? 'SSE-S3' : 'SSE-KMS', dsse: enc === 'DSSE-KMS' || undefined, kmsKeyId: enc === 'SSE-S3' ? undefined : keyId, bucketKey: enc === 'SSE-KMS' ? bucketKey : undefined,
      objects: [], lifecycle: [], objectLock: lock, staticWebsite: false, transferAcceleration: false,
    };
    put('buckets', b);
    log('s3', `CreateBucket ${name} in ${region} (versioning ${b.versioning}, ${enc}, BPA ${bpaOff ? 'OFF' : 'on'}${lock ? ', Object Lock' : ''})`);
    nav(`/console/s3/buckets/${name}`);
  };

  return (
    <Page title="Create bucket" crumbs={[{ label: 'Amazon S3', to: '/console/s3' }, { label: 'Buckets', to: '/console/s3' }, { label: 'Create bucket' }]}>
      <form onSubmit={submit} className="max-w-[900px]">
        <Panel title="General configuration">
          <Field label="AWS Region"><Select value={region} onChange={(v) => { setRegion(v); setKeyId('key-aws-s3'); }} options={REGIONS.map((r) => ({ value: r.id, label: `${r.name} ${r.id}` }))} /></Field>
          <Field label="Bucket name" hint="Bucket names must be 3 to 63 characters, unique across all AWS accounts in all Regions, and contain only lowercase letters, numbers, dots and hyphens." error={touched || name ? nameErr : undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="myawsbucket" onBlur={() => setTouched(true)} />
          </Field>
          <Teach>Choose the Region closest to your users (latency), the one your compliance rules require (data residency), or the cheapest. Names with dots break virtual-hosted HTTPS certificates and Transfer Acceleration, so prefer hyphens.</Teach>
        </Panel>

        <Panel title="Object Ownership" desc="Control ownership of objects written to this bucket from other AWS accounts and the use of access control lists (ACLs).">
          <Radios value={acl} onChange={setAcl} options={[
            { value: 'disabled', label: 'ACLs disabled (recommended)', desc: 'All objects are owned by this account. Access is specified using policies only.' },
            { value: 'enabled', label: 'ACLs enabled', desc: 'Objects can be owned by other AWS accounts. Access can be specified using ACLs.' },
          ]} />
          {acl === 'enabled' && (
            <div className="mt-3"><Radios value={ownership} onChange={setOwnership} options={[
              { value: 'BucketOwnerPreferred', label: 'Bucket owner preferred', desc: 'New objects written with the bucket-owner-full-control ACL are owned by the bucket owner.' },
              { value: 'ObjectWriter', label: 'Object writer', desc: 'The uploading account owns the object.' },
            ]} /><Alert kind="warning">AWS recommends disabling ACLs unless you need to control access for each object individually.</Alert></div>
          )}
          <Teach>"Bucket owner enforced" (ACLs disabled) is the modern default: use bucket policies and IAM, not ACLs. Cross-account uploads then automatically belong to you.</Teach>
        </Panel>

        <Panel title="Block Public Access settings for this bucket" desc="Public access is granted through ACLs, bucket policies, access point policies, or all.">
          <BpaEditor value={bpa} onChange={(v) => { setBpa(v); setAck(false); }} />
          {bpaOff && (
            <Alert kind="warning">
              <p className="font-bold mb-1">Turning off block all public access might result in this bucket and the objects within becoming public</p>
              <p className="mb-2">AWS recommends that you turn on block all public access, unless public access is required for specific and verified use cases such as static website hosting.</p>
              <Check checked={ack} onChange={setAck} label="I acknowledge that the current settings might result in this bucket and the objects within becoming public." />
              {touched && !ack && <span className="text-[#d91515] text-[12px]">⊗ You must acknowledge to continue.</span>}
            </Alert>
          )}
          <Teach>Block Public Access overrides any policy or ACL. To serve a private bucket to the internet, keep BPA on and put CloudFront with Origin Access Control in front. Only S3 static website hosting needs it off.</Teach>
        </Panel>

        <Panel title="Bucket Versioning" desc="Versioning keeps multiple variants of an object in the same bucket, so you can recover from unintended user actions and application failures.">
          <Radios value={lock ? 'Enabled' : versioning} onChange={setVersioning} options={[{ value: 'Disabled', label: 'Disable' }, { value: 'Enabled', label: 'Enable' }]} />
          {lock && <div className="aws-hint mt-1">Object Lock requires versioning, so versioning is enabled.</div>}
          <Teach>Once enabled, versioning can only be suspended, never fully disabled. A DELETE then adds a delete marker instead of removing data. MFA Delete (root user, CLI/API only) additionally requires an MFA code to permanently delete a version or change the versioning state.</Teach>
        </Panel>

        <Panel title="Default encryption" desc="Server-side encryption is automatically applied to new objects stored in this bucket.">
          <Group label="Encryption type">
            <Radios value={enc} onChange={setEnc} options={[
              { value: 'SSE-S3', label: 'Server-side encryption with Amazon S3 managed keys (SSE-S3)' },
              { value: 'SSE-KMS', label: 'Server-side encryption with AWS Key Management Service keys (SSE-KMS)' },
              { value: 'DSSE-KMS', label: 'Dual-layer server-side encryption with AWS KMS keys (DSSE-KMS)', desc: 'Two independent layers of encryption. Higher cost.' },
            ]} />
          </Group>
          {enc !== 'SSE-S3' && (
            <>
              <Field label="AWS KMS key" hint={`Keys in ${region}. Create a customer managed key in KMS to control its key policy and rotation.`}><Select value={keyId} onChange={setKeyId} options={kmsOptions} /></Field>
              {enc === 'SSE-KMS'
                ? <Group label="Bucket Key"><Radios value={bucketKey ? 'on' : 'off'} onChange={(v) => setBucketKey(v === 'on')} options={[{ value: 'off', label: 'Disable' }, { value: 'on', label: 'Enable' }]} /></Group>
                : <div className="aws-hint mb-3">S3 Bucket Keys are not supported for DSSE-KMS.</div>}
              <Teach>Every SSE-KMS PUT and GET calls KMS (GenerateDataKey / Decrypt), which costs money and counts against KMS request quotas (5,500–30,000 req/s per Region). An S3 Bucket Key caches a bucket-level key and cuts those KMS calls by up to 99%. Pick SSE-KMS with a customer managed key when the question needs audit (CloudTrail shows key use) or separate key permissions.</Teach>
            </>
          )}
        </Panel>

        <Panel title="Advanced settings">
          <Group label="Object Lock" hint="Store objects using a write-once-read-many (WORM) model to help prevent objects from being deleted or overwritten.">
            <Radios value={lock ? 'on' : 'off'} onChange={(v) => { setLock(v === 'on'); setLockAck(false); }} options={[{ value: 'off', label: 'Disable' }, { value: 'on', label: 'Enable', desc: 'Permanently allows objects in this bucket to be locked. Bucket Versioning is required.' }]} />
          </Group>
          {lock && <Alert kind="warning"><Check checked={lockAck} onChange={setLockAck} label="I acknowledge that enabling Object Lock will permanently allow objects in this bucket to be locked." />{touched && lockErr && <span className="text-[#d91515] text-[12px]">⊗ {lockErr}</span>}</Alert>}
          <Teach>Object Lock is set when you create the bucket and needs versioning. Governance mode can be bypassed by users with s3:BypassGovernanceRetention; Compliance mode cannot be shortened by anyone, root included. Legal hold has no expiry. Classic answer for SEC 17a-4 / WORM requirements (Glacier Vault Lock is the archive equivalent).</Teach>
        </Panel>

        <FormFooter onCancel={() => nav('/console/s3')} submitLabel="Create bucket" />
      </form>
    </Page>
  );
}
