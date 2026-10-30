// AWS KMS console (Regional): AWS managed keys, customer managed keys (create wizard, key policy, rotation, deletion).
import { useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { CloudState, KmsKey } from '../../../cloud/types';
import { Alert, Button, Check, Field, Input, KV, Modal, MultiCheck, Page, Panel, Radios, Select, SideNav, Status, Table, Tabs, Teach, fmtDate, useCloud, useCloudActions } from '../../kit';

export default function KmsConsole() {
  return (
    <div className="flex">
      <SideNav title="Key Management Service (KMS)" items={[
        { label: 'AWS managed keys', to: '/console/kms/aws' },
        { label: 'Customer managed keys', to: '/console/kms' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<CustomerKeys />} />
          <Route path="aws" element={<AwsKeys />} />
          <Route path="create" element={<CreateKey />} />
          <Route path="keys/:id" element={<KeyDetail />} />
        </Routes>
      </div>
    </div>
  );
}

const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const newKeyId = (multi: boolean) => (multi ? `mrk-${hex(32)}` : crypto.randomUUID());
const keyArn = (k: KmsKey, acct: string) => `arn:aws:kms:${k.region}:${acct}:key/${k.id}`;
const keyStatus = (k: KmsKey) => (k.deletionDate ? 'Pending deletion' : k.enabled ? 'Enabled' : 'Disabled');
const spec = (k: KmsKey) => k.keySpec ?? 'SYMMETRIC_DEFAULT';
const isSymEncrypt = (k: KmsKey) => spec(k) === 'SYMMETRIC_DEFAULT';
const keyType = (s: string) => (s === 'SYMMETRIC_DEFAULT' || s.startsWith('HMAC') ? 'Symmetric' : 'Asymmetric');
const keyUsage = (s: string) => (s.startsWith('HMAC') ? 'Generate and verify MAC' : s.startsWith('ECC') ? 'Sign and verify' : 'Encrypt and decrypt');

type Ids = Pick<CloudState, 'iamUsers' | 'iamRoles' | 'accountId'>;
const principalArn = (c: Ids, id: string) => {
  const u = c.iamUsers.find((x) => x.id === id);
  if (u) return `arn:aws:iam::${c.accountId}:user/${u.name}`;
  const r = c.iamRoles.find((x) => x.id === id);
  return r ? `arn:aws:iam::${c.accountId}:role/${r.name}` : id;
};
const principalName = (c: Ids, id: string) => c.iamUsers.find((x) => x.id === id)?.name ?? c.iamRoles.find((x) => x.id === id)?.name ?? id;
const principalOptions = (c: Ids) => [
  ...c.iamRoles.map((r) => ({ value: r.id, label: <span>{r.name} <span className="aws-hint">· Role</span></span> })),
  ...c.iamUsers.map((u) => ({ value: u.id, label: <span>{u.name} <span className="aws-hint">· User</span></span> })),
];

/** The default key policy the console generates from the admin/user choices. */
function keyPolicy(c: Ids, admins: string[], users: string[]) {
  const st: object[] = [{ Sid: 'Enable IAM User Permissions', Effect: 'Allow', Principal: { AWS: `arn:aws:iam::${c.accountId}:root` }, Action: 'kms:*', Resource: '*' }];
  if (admins.length) st.push({ Sid: 'Allow access for Key Administrators', Effect: 'Allow', Principal: { AWS: admins.map((a) => principalArn(c, a)) },
    Action: ['kms:Create*', 'kms:Describe*', 'kms:Enable*', 'kms:List*', 'kms:Put*', 'kms:Update*', 'kms:Revoke*', 'kms:Disable*', 'kms:Get*', 'kms:Delete*', 'kms:TagResource', 'kms:UntagResource', 'kms:ScheduleKeyDeletion', 'kms:CancelKeyDeletion', 'kms:RotateKeyOnDemand'], Resource: '*' });
  if (users.length) {
    const p = { AWS: users.map((u) => principalArn(c, u)) };
    st.push({ Sid: 'Allow use of the key', Effect: 'Allow', Principal: p, Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'], Resource: '*' });
    st.push({ Sid: 'Allow attachment of persistent resources', Effect: 'Allow', Principal: p, Action: ['kms:CreateGrant', 'kms:ListGrants', 'kms:RevokeGrant'], Resource: '*', Condition: { Bool: { 'kms:GrantIsForAWSResource': 'true' } } });
  }
  return { Id: 'key-consolepolicy-3', Version: '2012-10-17', Statement: st };
}

const Json = ({ value }: { value: object }) => <pre className="bg-[#0f1b2a] text-[#d1f5d3] rounded-lg p-4 text-[12.5px] overflow-x-auto font-mono">{JSON.stringify(value, null, 2)}</pre>;

function AwsKeys() {
  const keys = useCloud((c) => c.kmsKeys.filter((k) => k.managedBy === 'aws'));
  return (
    <Page title="AWS managed keys" crumbs={[{ label: 'KMS', to: '/console/kms' }, { label: 'AWS managed keys' }]}>
      <Panel title="AWS managed keys" counter={keys.length} desc="AWS managed keys are created, managed and used on your behalf by an AWS service integrated with KMS. You can view them but not change their policy or rotation.">
        <Table rows={keys} columns={[
          { header: 'Aliases', cell: (k) => <Link to={`/console/kms/keys/${k.id}`}>{k.alias}</Link> },
          { header: 'Key ID', cell: (k) => <code className="text-[13px]">{k.id}</code> },
          { header: 'Status', cell: (k) => <Status value={keyStatus(k)} /> },
          { header: 'Key rotation', cell: () => 'Every year (automatic)' },
        ]} />
        <Teach title="AWS managed vs customer managed">AWS managed keys (aws/s3, aws/ebs, aws/rds) are free and rotate every year automatically, but you can't edit their key policy, so you <b>can't share them cross-account</b> or control who uses them. Customer managed keys cost $1/month but you own the key policy, rotation, enable/disable and deletion. Exam rule: cross-account encrypted snapshots or fine-grained key control → customer managed key.</Teach>
      </Panel>
    </Page>
  );
}

function CustomerKeys() {
  const c = useCloud((x) => ({ kmsKeys: x.kmsKeys, region: x.region }));
  const keys = c.kmsKeys.filter((k) => k.managedBy === 'customer' && k.region === c.region);
  const { patch, log } = useCloudActions();
  const nav = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const k = keys.find((x) => x.id === sel);
  const act = (a: string) => {
    if (!k) return;
    if (a === 'enable') { patch('kmsKeys', k.id, { enabled: true }); log('kms', `EnableKey ${k.alias}`); }
    if (a === 'disable') { patch('kmsKeys', k.id, { enabled: false }); log('kms', `DisableKey ${k.alias}`); }
    if (a === 'cancel') { patch('kmsKeys', k.id, { deletionDate: undefined }); log('kms', `CancelKeyDeletion ${k.alias} (key is now Disabled)`); }
    if (a === 'delete') setDel(true);
  };
  return (
    <Page title="Customer managed keys" crumbs={[{ label: 'KMS', to: '/console/kms' }, { label: 'Customer managed keys' }]}>
      <Panel title="Customer managed keys" counter={keys.length} desc={`KMS keys you create in ${c.region}. KMS is a Regional service.`}
        actions={<>
          <div className="w-[200px]"><Select value="" onChange={act} disabled={!k} options={[{ value: '', label: 'Key actions' }, ...(k?.deletionDate ? [{ value: 'cancel', label: 'Cancel key deletion' }] : [k?.enabled ? { value: 'disable', label: 'Disable' } : { value: 'enable', label: 'Enable' }, { value: 'delete', label: 'Schedule key deletion' }])]} /></div>
          <Button primary onClick={() => nav('/console/kms/create')}>Create key</Button>
        </>}>
        <Table rows={keys} selected={sel} onSelect={setSel} filterText={(x) => `${x.alias} ${x.id}`} empty={<>No customer managed keys in this Region. <Link to="/console/kms/create">Create key</Link></>}
          columns={[
            { header: 'Aliases', cell: (x) => <Link to={`/console/kms/keys/${x.id}`}>{x.alias}</Link> },
            { header: 'Key ID', cell: (x) => <code className="text-[13px]">{x.id}</code> },
            { header: 'Status', cell: (x) => <Status value={keyStatus(x)} /> },
            { header: 'Key type', cell: (x) => keyType(spec(x)) },
            { header: 'Key spec', cell: spec },
            { header: 'Key usage', cell: (x) => keyUsage(spec(x)) },
            { header: 'Regionality', cell: (x) => (x.multiRegion ? 'Multi-Region' : 'Single-Region') },
          ]} />
        <Teach title="Envelope encryption">KMS only encrypts up to 4 KB directly. For real data, a service calls <code>GenerateDataKey</code>: KMS returns a plaintext data key (used locally to encrypt your data, then discarded) and the same data key encrypted under your KMS key (stored next to the data). To decrypt, the encrypted data key goes back to KMS. Your KMS key never leaves KMS; it stays inside FIPS 140-3 validated HSMs.</Teach>
      </Panel>
      {del && k && <ScheduleDeletion k={k} onClose={() => setDel(false)} />}
    </Page>
  );
}

function ScheduleDeletion({ k, onClose }: { k: KmsKey; onClose: () => void }) {
  const { patch, log } = useCloudActions();
  const [days, setDays] = useState('30');
  const [ack, setAck] = useState(false);
  const n = Number(days);
  const err = !Number.isInteger(n) || n < 7 || n > 30 ? 'Enter a waiting period between 7 and 30 days.' : undefined;
  return (
    <Modal title="Schedule key deletion" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err || !ack} onClick={() => { patch('kmsKeys', k.id, { enabled: false, deletionDate: Date.now() + n * 86400000 }); log('kms', `ScheduleKeyDeletion ${k.alias} in ${n} days`); onClose(); }}>Schedule deletion</Button></>}>
      <Alert kind="warning">Deleting a KMS key is destructive and irreversible. After it's deleted, all data encrypted under it is <b>unrecoverable</b>. If you're not sure, disable the key instead.</Alert>
      <Field label="Waiting period (in days)" hint="Enter a waiting period between 7 and 30 days." error={err}><Input type="number" min={7} max={30} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      <Check checked={ack} onChange={setAck} label={`Confirm that you want to schedule ${k.alias} for deletion after a ${days} day waiting period.`} />
      <Teach title="Waiting period">KMS never deletes a key immediately: it is disabled at once and deleted after 7–30 days (default 30), during which you can cancel. Use a CloudWatch alarm on attempts to use a pending-deletion key to catch anything still depending on it.</Teach>
    </Modal>
  );
}

function CreateKey() {
  const c = useCloud((x) => ({ kmsKeys: x.kmsKeys, region: x.region, iamUsers: x.iamUsers, iamRoles: x.iamRoles, accountId: x.accountId }));
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'sym' | 'asym'>('sym');
  const [symUse, setSymUse] = useState<'encrypt' | 'mac'>('encrypt');
  const [asymSpec, setAsymSpec] = useState('RSA_2048');
  const [multi, setMulti] = useState(false);
  const [rotation, setRotation] = useState(true);
  const [alias, setAlias] = useState('');
  const [desc, setDesc] = useState('');
  const [admins, setAdmins] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const keySpec = type === 'sym' ? (symUse === 'encrypt' ? 'SYMMETRIC_DEFAULT' : 'HMAC_256') : asymSpec;
  const canRotate = keySpec === 'SYMMETRIC_DEFAULT';
  const a = alias.replace(/^alias\//, '');
  const aliasErr = !a ? 'Alias is required.' : a.startsWith('aws/') ? 'The alias prefix "aws/" is reserved for AWS managed keys.' : !/^[\w/-]{1,250}$/.test(a) ? 'Use alphanumeric characters, slashes (/), underscores (_) and dashes (-).'
    : c.kmsKeys.some((k) => k.region === c.region && k.alias === a) ? 'An alias with this name already exists in this Region.' : undefined;
  const create = () => {
    const k: KmsKey = { id: newKeyId(multi), name: a, alias: a, region: c.region, createdAt: Date.now(), managedBy: 'customer', rotation: canRotate && rotation, enabled: true, multiRegion: multi, keyUsers: users, keyAdmins: admins, keySpec, description: desc };
    put('kmsKeys', k);
    log('kms', `CreateKey ${k.id} (${keySpec}${multi ? ', multi-Region' : ''}); CreateAlias alias/${a}${k.rotation ? '; EnableKeyRotation' : ''}`);
    nav(`/console/kms/keys/${k.id}`);
  };
  const steps = ['Configure key', 'Add labels', 'Define key administrative permissions', 'Define key usage permissions', 'Review'];
  const next = (ok = true) => <div className="flex justify-end gap-2 mb-10"><Button onClick={() => (step === 1 ? nav('/console/kms') : setStep(step - 1))}>{step === 1 ? 'Cancel' : 'Previous'}</Button>{step < 5 ? <Button primary disabled={!ok} onClick={() => setStep(step + 1)}>Next</Button> : <Button primary onClick={create}>Finish</Button>}</div>;
  return (
    <Page title={steps[step - 1]} crumbs={[{ label: 'KMS', to: '/console/kms' }, { label: 'Customer managed keys', to: '/console/kms' }, { label: 'Create key' }]}>
      <ol className="flex flex-wrap gap-x-6 mb-4 text-[13px]">{steps.map((s, i) => <li key={s} className={i + 1 === step ? 'font-bold text-[#0972d3]' : 'text-[#5f6b7a]'}>Step {i + 1}: {s}</li>)}</ol>
      {step === 1 && (
        <>
          <Panel title="Key configuration">
            <div className="aws-label mb-1">Key type</div>
            <Radios value={type} onChange={setType} options={[{ value: 'sym', label: 'Symmetric', desc: 'A single key used for encrypting and decrypting data or generating and verifying HMAC codes.' }, { value: 'asym', label: 'Asymmetric', desc: 'A public and private key pair used for encrypting and decrypting data or signing and verifying messages.' }]} />
            <div className="aws-label mt-4 mb-1">Key usage</div>
            {type === 'sym'
              ? <Radios value={symUse} onChange={setSymUse} options={[{ value: 'encrypt', label: 'Encrypt and decrypt', desc: 'Use the key only to encrypt and decrypt data.' }, { value: 'mac', label: 'Generate and verify MAC', desc: 'Use the key only to generate and verify hash-based message authentication codes (HMAC).' }]} />
              : <div className="max-w-[360px]"><Select value={asymSpec} onChange={setAsymSpec} options={[{ value: 'RSA_2048', label: 'RSA_2048 · Encrypt and decrypt' }, { value: 'RSA_3072', label: 'RSA_3072 · Encrypt and decrypt' }, { value: 'RSA_4096', label: 'RSA_4096 · Encrypt and decrypt' }, { value: 'ECC_NIST_P256', label: 'ECC_NIST_P256 · Sign and verify' }, { value: 'ECC_NIST_P384', label: 'ECC_NIST_P384 · Sign and verify' }]} /></div>}
            <Teach title="Symmetric vs asymmetric">Almost every AWS service integration (S3 SSE-KMS, EBS, RDS, Secrets Manager) uses <b>symmetric</b> keys; the key material never leaves KMS, so you must call KMS to use it. Asymmetric keys let you download the <i>public</i> key for use outside AWS (e.g. clients that can't call KMS, or signature verification).</Teach>
          </Panel>
          <Panel title="Advanced options">
            <KV items={[['Key material origin', 'KMS - recommended']]} />
            <div className="aws-label mt-4 mb-1">Regionality</div>
            <Radios value={multi ? 'multi' : 'single'} onChange={(v) => setMulti(v === 'multi')} options={[{ value: 'single', label: 'Single-Region key', desc: 'Never allow this key to be shared to multiple Regions.' }, { value: 'multi', label: 'Multi-Region key', desc: 'Allow this key to be replicated into other Regions.' }]} />
            {multi && <Teach title="Multi-Region keys">Replicas share the same key ID (mrk-…) and key material, so data encrypted in one Region can be decrypted in another without re-encrypting: useful for DynamoDB global tables, cross-Region DR, and client-side encryption. They are still independent resources with their own policies.</Teach>}
            <div className="mt-4"><Check checked={canRotate && rotation} onChange={setRotation} label="Key rotation: automatically rotate this KMS key every year" hint={canRotate ? 'KMS creates new key material each year and keeps the old material so existing ciphertext still decrypts.' : 'Automatic rotation is only supported for symmetric encryption keys.'} /></div>
          </Panel>
          {next()}
        </>
      )}
      {step === 2 && (
        <>
          <Panel title="Alias">
            <Field label="Alias" hint="A friendly name for the key. You can use the alias instead of the key ID in code." error={alias ? aliasErr : undefined}><div className="flex items-center gap-1"><span className="text-[#5f6b7a]">alias/</span><Input value={a} onChange={(e) => setAlias(e.target.value)} placeholder="app-data" /></div></Field>
            <Field label="Description - optional"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Encrypts application data" /></Field>
          </Panel>
          {next(!aliasErr)}
        </>
      )}
      {step === 3 && (
        <>
          <Panel title="Key administrators" desc="Choose the IAM users and roles who can administer this key through the KMS API. Administrators can manage the key but can't use it to encrypt or decrypt.">
            <MultiCheck value={admins} onChange={setAdmins} options={principalOptions(c)} />
            <Teach title="Separation of duties">Key administrators manage the key (policy, rotation, deletion); key users use it for crypto operations. Keeping them separate means the person who can delete the key isn't the one reading the data.</Teach>
          </Panel>
          {next()}
        </>
      )}
      {step === 4 && (
        <>
          <Panel title="Key users" desc="Choose the IAM users and roles that can use this key in cryptographic operations (Encrypt, Decrypt, GenerateDataKey).">
            <MultiCheck value={users} onChange={setUsers} options={principalOptions(c)} />
            <Teach title="Key policy is the gatekeeper">Every KMS key has exactly one key policy and it's the primary access control: an IAM policy alone can't grant use of a key unless the key policy allows it (the default "Enable IAM User Permissions" statement delegates to IAM). To share a key cross-account you add the other account to this key policy, which is only possible with a customer managed key.</Teach>
          </Panel>
          {next()}
        </>
      )}
      {step === 5 && (
        <>
          <Panel title="Key configuration"><KV items={[['Key type', keyType(keySpec)], ['Key spec', keySpec], ['Key usage', keyUsage(keySpec)], ['Origin', 'AWS_KMS'], ['Regionality', multi ? 'Multi-Region' : 'Single-Region'], ['Automatic rotation', canRotate && rotation ? 'Enabled' : 'Disabled']]} /></Panel>
          <Panel title="Alias and description"><KV items={[['Alias', `alias/${a}`], ['Description', desc || '–']]} /></Panel>
          <Panel title="Key policy"><Json value={keyPolicy(c, admins, users)} /></Panel>
          {next()}
        </>
      )}
    </Page>
  );
}

function KeyDetail() {
  const { id } = useParams();
  const c = useCloud((x) => ({ kmsKeys: x.kmsKeys, iamUsers: x.iamUsers, iamRoles: x.iamRoles, accountId: x.accountId }));
  const { patch, log } = useCloudActions();
  const k = c.kmsKeys.find((x) => x.id === id);
  const [modal, setModal] = useState<'' | 'admins' | 'users' | 'delete'>('');
  const [pick, setPick] = useState<string[]>([]);
  if (!k) return <Page title="Key not found" crumbs={[{ label: 'KMS', to: '/console/kms' }]}><Alert kind="error">No such key.</Alert></Page>;
  const aws = k.managedBy === 'aws';
  const s = spec(k);
  const admins = k.keyAdmins ?? [];
  const open = (m: 'admins' | 'users') => { setPick(m === 'admins' ? admins : k.keyUsers); setModal(m); };
  const nextRotation = k.createdAt + Math.ceil((Date.now() - k.createdAt + 1) / (365 * 86400000)) * 365 * 86400000;
  const policy = aws
    ? { Version: '2012-10-17', Id: `auto-${k.alias.replace('aws/', '')}-2`, Statement: [{ Sid: `Allow access through ${k.alias.replace('aws/', '').toUpperCase()} for all principals in the account that are authorized to use it`, Effect: 'Allow', Principal: { AWS: '*' }, Action: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'], Resource: '*', Condition: { StringEquals: { 'kms:CallerAccount': c.accountId, 'kms:ViaService': `${k.alias.replace('aws/', '')}.${k.region}.amazonaws.com` } } }] }
    : keyPolicy(c, admins, k.keyUsers);
  const list = (ids: string[], m: 'admins' | 'users', label: string) => (
    <Panel title={label} counter={ids.length} actions={<Button onClick={() => open(m)}>{ids.length ? 'Edit' : 'Add'}</Button>}>
      <Table rows={ids.map((x) => ({ id: x }))} empty={`No ${label.toLowerCase()}.`} columns={[{ header: 'Name', cell: (r) => principalName(c, r.id) }, { header: 'Type', cell: (r) => (c.iamRoles.some((x) => x.id === r.id) ? 'Role' : 'User') }, { header: 'ARN', cell: (r) => <code className="text-[12px] break-all">{principalArn(c, r.id)}</code> }]} />
    </Panel>
  );
  return (
    <Page title={k.alias} crumbs={[{ label: 'KMS', to: '/console/kms' }, { label: aws ? 'AWS managed keys' : 'Customer managed keys', to: aws ? '/console/kms/aws' : '/console/kms' }, { label: k.id }]}
      actions={!aws && (k.deletionDate
        ? <Button onClick={() => { patch('kmsKeys', k.id, { deletionDate: undefined }); log('kms', `CancelKeyDeletion ${k.alias}`); }}>Cancel key deletion</Button>
        : <><Button onClick={() => { patch('kmsKeys', k.id, { enabled: !k.enabled }); log('kms', `${k.enabled ? 'DisableKey' : 'EnableKey'} ${k.alias}`); }}>{k.enabled ? 'Disable' : 'Enable'}</Button><Button onClick={() => setModal('delete')}>Schedule key deletion</Button></>)}>
      {k.deletionDate && <Alert kind="error">This key is pending deletion and will be deleted on <b>{fmtDate(k.deletionDate)}</b>. It can't be used for cryptographic operations. Cancel the deletion to keep it (it will stay Disabled until you enable it).</Alert>}
      {!k.enabled && !k.deletionDate && <Alert kind="warning">This key is disabled. Services can't decrypt data encrypted under it until you enable it again.</Alert>}
      <Panel title="General configuration">
        <KV items={[['Alias', k.alias], ['Status', <Status value={keyStatus(k)} />], ['Creation date', fmtDate(k.createdAt)], ['ARN', <code className="text-[13px] break-all">{keyArn(k, c.accountId)}</code>], ['Description', k.description || (aws ? `Default key that protects my ${k.alias.replace('aws/', '').toUpperCase()} data when no other key is defined` : '–')], ['Regionality', k.multiRegion ? 'Multi-Region (primary)' : 'Single-Region']]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Key policy', content: (
          <>
            {!aws && list(admins, 'admins', 'Key administrators')}
            {!aws && list(k.keyUsers, 'users', 'Key users')}
            <Panel title="Key policy" desc={aws ? 'AWS managed key policies are read-only.' : 'Generated from the administrators and users above.'}><Json value={policy} /></Panel>
          </>
        ) },
        { label: 'Cryptographic configuration', content: (
          <Panel title="Cryptographic configuration"><KV items={[['Key type', keyType(s)], ['Key spec', s], ['Key usage', keyUsage(s)], ['Origin', 'AWS_KMS'], ['Regionality', k.multiRegion ? 'Multi-Region' : 'Single-Region']]} />
            <Teach title="Keys never leave KMS">You can't export the key material of a KMS key (only the public half of an asymmetric key). Every Encrypt/Decrypt happens inside KMS and is logged in CloudTrail, which is why KMS satisfies "auditable, centrally controlled encryption" questions.</Teach>
          </Panel>
        ) },
        { label: 'Key rotation', content: (
          <Panel title="Automatic key rotation">
            {aws ? <p>AWS managed keys rotate automatically every year. You can't change this.</p>
              : !isSymEncrypt(k) ? <Alert>Automatic rotation is only supported on symmetric encryption KMS keys. For {s} keys, rotate manually by creating a new key and pointing the alias at it.</Alert>
              : <Check checked={k.rotation} onChange={(v) => { patch('kmsKeys', k.id, { rotation: v }); log('kms', `${v ? 'EnableKeyRotation' : 'DisableKeyRotation'} ${k.alias}`); }} label="Automatically rotate this KMS key every year" hint="Rotation period: 365 days" />}
            <KV items={[['Status', k.rotation ? <Status value="Enabled" /> : <Status value="Disabled" />], ['Rotation period', k.rotation ? '365 days' : '–'], ['Next rotation date', k.rotation ? fmtDate(nextRotation) : '–']]} />
            {!aws && isSymEncrypt(k) && <div className="mt-3"><Button disabled={!k.enabled} onClick={() => log('kms', `RotateKeyOnDemand ${k.alias}: new key material created`)}>Rotate now</Button></div>}
            <Teach title="What rotation does">Rotation creates new backing key material but keeps the same key ID, ARN and alias, and keeps the old material to decrypt older ciphertext. Nothing needs re-encrypting and no code changes. Imported key material can't be rotated automatically.</Teach>
          </Panel>
        ) },
        { label: 'Aliases', content: <Panel title="Aliases" counter={1}><Table rows={[{ id: k.alias }]} columns={[{ header: 'Alias name', cell: (r) => `alias/${r.id}` }, { header: 'Alias ARN', cell: (r) => <code className="text-[13px]">{`arn:aws:kms:${k.region}:${c.accountId}:alias/${r.id}`}</code> }]} /></Panel> },
      ]} />
      {(modal === 'admins' || modal === 'users') && (
        <Modal title={modal === 'admins' ? 'Edit key administrators' : 'Edit key users'} onClose={() => setModal('')}
          footer={<><Button onClick={() => setModal('')}>Cancel</Button><Button primary onClick={() => { patch('kmsKeys', k.id, modal === 'admins' ? { keyAdmins: pick } : { keyUsers: pick }); log('kms', `PutKeyPolicy ${k.alias} (${modal === 'admins' ? 'administrators' : 'users'}: ${pick.map((p) => principalName(c, p)).join(', ') || 'none'})`); setModal(''); }}>Save changes</Button></>}>
          <MultiCheck value={pick} onChange={setPick} options={principalOptions(c)} />
        </Modal>
      )}
      {modal === 'delete' && <ScheduleDeletion k={k} onClose={() => setModal('')} />}
    </Page>
  );
}
