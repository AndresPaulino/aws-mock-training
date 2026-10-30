// IAM managed policies: list (AWS + customer managed), create with a JSON editor, detail.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CloudState, IamPolicy } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Alert, Button, ConfirmDelete, Field, Input, KV, Page, Panel, Select, Table, Tabs, Teach, fmtDate, useCloud, useCloudActions } from '../../kit';
import { Json, policyArn, nameError, policyType } from './shared';
import { validatePolicy } from './policyEval';

const usage = (c: Pick<CloudState, 'iamUsers' | 'iamGroups' | 'iamRoles'>, id: string) => [
  ...c.iamUsers.filter((u) => u.policyIds.includes(id)).map((u) => ({ id: `u${u.id}`, name: u.name, type: 'User', to: `/console/iam/users/${u.name}`, as: 'Permissions policy' })),
  ...c.iamUsers.filter((u) => u.boundaryPolicyId === id).map((u) => ({ id: `b${u.id}`, name: u.name, type: 'User', to: `/console/iam/users/${u.name}`, as: 'Permissions boundary' })),
  ...c.iamGroups.filter((g) => g.policyIds.includes(id)).map((g) => ({ id: `g${g.id}`, name: g.name, type: 'Group', to: `/console/iam/groups/${g.name}`, as: 'Permissions policy' })),
  ...c.iamRoles.filter((r) => r.policyIds.includes(id)).map((r) => ({ id: `r${r.id}`, name: r.name, type: 'Role', to: `/console/iam/roles/${r.name}`, as: 'Permissions policy' })),
];

export function PolicyList() {
  const c = useCloud((x) => ({ iamPolicies: x.iamPolicies, iamUsers: x.iamUsers, iamGroups: x.iamGroups, iamRoles: x.iamRoles }));
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [type, setType] = useState('all');
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const rows = c.iamPolicies.filter((p) => type === 'all' || p.managedBy === type);
  const p = c.iamPolicies.find((x) => x.id === sel);
  return (
    <Page title="Policies" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Policies' }]}>
      <Panel title="Policies" counter={rows.length} desc="A policy is an object in AWS that defines permissions."
        actions={<><Button disabled={!p || p.managedBy === 'aws'} title={p?.managedBy === 'aws' ? 'AWS managed policies cannot be deleted' : undefined} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/iam/policies/create')}>Create policy</Button></>}>
        <div className="max-w-[260px] mb-2"><Select value={type} onChange={setType} options={[{ value: 'all', label: 'Filter by Type: All types' }, { value: 'aws', label: 'AWS managed' }, { value: 'customer', label: 'Customer managed' }]} /></div>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(x) => x.name}
          columns={[
            { header: 'Policy name', cell: (x) => <Link to={`/console/iam/policies/${x.id}`}>{x.name}</Link> },
            { header: 'Type', cell: policyType },
            { header: 'Used as', cell: (x) => { const u = usage(c, x.id); return u.length ? `${[...new Set(u.map((y) => y.as))].join(', ')} (${u.length})` : 'None'; } },
            { header: 'Description', cell: (x) => <span className="text-[#5f6b7a]">{x.description}</span> },
          ]} />
        <Teach title="AWS managed vs customer managed">AWS managed policies are maintained by AWS and are broad (S3FullAccess = every bucket). Customer managed policies are yours: scope them to exact actions and ARNs for least privilege, and reuse them across users, groups and roles. Inline policies are embedded in one identity and deleted with it.</Teach>
      </Panel>
      {del && p && <ConfirmDelete what={p.name} onClose={() => setDel(false)} warning={`Deleting a policy detaches it from all ${usage(c, p.id).length} entities that use it.`}
        onConfirm={() => {
          mutate((d) => {
            d.iamPolicies = d.iamPolicies.filter((x) => x.id !== p.id);
            for (const e of [...d.iamUsers, ...d.iamGroups, ...d.iamRoles]) e.policyIds = e.policyIds.filter((x) => x !== p.id);
            d.iamUsers.forEach((u) => { if (u.boundaryPolicyId === p.id) u.boundaryPolicyId = undefined; });
          });
          log('iam', `DeletePolicy ${p.name}`); setSel(null);
        }} />}
    </Page>
  );
}

const TEMPLATE = JSON.stringify({ Version: '2012-10-17', Statement: [{ Sid: 'Statement1', Effect: 'Allow', Action: ['s3:GetObject'], Resource: ['arn:aws:s3:::my-bucket/*'] }] }, null, 2);

function PolicyEditor({ value, onChange, errors }: { value: string; onChange: (v: string) => void; errors: string[] }) {
  return (
    <div>
      <textarea spellCheck={false} className="aws-input font-mono text-[13px] min-h-[300px]" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Policy editor" />
      {errors.length ? <Alert kind="error"><b>{errors.length} error{errors.length > 1 ? 's' : ''}</b><ul className="list-disc pl-5 text-[13px]">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>
        : <div className="text-[#037f0c] text-[13px] mt-1">✓ Policy syntax is valid. Security: 0 · Errors: 0 · Warnings: {value.includes('"*"') ? 1 : 0}</div>}
      {value.includes('"*"') && !errors.length && <Alert kind="warning">A wildcard <code>"*"</code> grants more than you may intend. Consider listing exact actions and resource ARNs.</Alert>}
    </div>
  );
}

export function CreatePolicy() {
  const policies = useCloud((c) => c.iamPolicies);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [doc, setDoc] = useState(TEMPLATE);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const errors = validatePolicy(doc);
  const nErr = nameError(name, policies.map((p) => p.name), 128);
  const create = () => {
    const p: IamPolicy = { id: rid('ANPA'), name, region: 'global', createdAt: Date.now(), managedBy: 'customer', description: desc, document: JSON.stringify(JSON.parse(doc), null, 2) };
    put('iamPolicies', p);
    log('iam', `CreatePolicy ${name}`);
    nav(`/console/iam/policies/${p.id}`);
  };
  return (
    <Page title={step === 1 ? 'Specify permissions' : 'Review and create'} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Policies', to: '/console/iam/policies' }, { label: 'Create policy' }]}>
      {step === 1 ? (
        <>
          <Panel title="Policy editor" desc="Add permissions by writing a JSON policy. Each statement needs Effect, Action (or NotAction) and Resource (or NotResource).">
            <PolicyEditor value={doc} onChange={setDoc} errors={errors} />
            <Teach title="Policy anatomy">Effect (Allow/Deny) + Action (service:Operation, wildcards allowed) + Resource (ARN) + optional Condition. Remember the S3 trap: <code>s3:ListBucket</code> applies to the bucket ARN <code>arn:aws:s3:::name</code>, while <code>s3:GetObject</code> applies to objects <code>arn:aws:s3:::name/*</code>.</Teach>
          </Panel>
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => nav('/console/iam/policies')}>Cancel</Button><Button primary disabled={!!errors.length} onClick={() => setStep(2)}>Next</Button></div>
        </>
      ) : (
        <>
          <Panel title="Policy details">
            <Field label="Policy name" hint="Maximum 128 characters. Use alphanumeric and '+=,.@-_' characters." error={name ? nErr : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Description - optional"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          </Panel>
          <Panel title="Permissions defined in this policy"><Json value={doc} /></Panel>
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => setStep(1)}>Previous</Button><Button primary disabled={!!nErr} onClick={create}>Create policy</Button></div>
        </>
      )}
    </Page>
  );
}

export function PolicyDetail() {
  const { id } = useParams();
  const c = useCloud((x) => ({ iamPolicies: x.iamPolicies, iamUsers: x.iamUsers, iamGroups: x.iamGroups, iamRoles: x.iamRoles, accountId: x.accountId }));
  const { patch, log } = useCloudActions();
  const p = c.iamPolicies.find((x) => x.id === id);
  const [edit, setEdit] = useState<string | null>(null);
  if (!p) return <Page title="Policy not found" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Policies', to: '/console/iam/policies' }]}><Alert kind="error">No such policy.</Alert></Page>;
  const errs = edit === null ? [] : validatePolicy(edit);
  const used = usage(c, p.id);
  return (
    <Page title={p.name} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Policies', to: '/console/iam/policies' }, { label: p.name }]}>
      <Panel title="Policy details">
        <KV items={[['Type', policyType(p)], ['Creation time', fmtDate(p.createdAt)], ['ARN', <code className="text-[13px]">{policyArn(c.accountId, p)}</code>], ['Description', p.description || '–']]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Permissions', content: (
          <Panel title="Permissions defined in this policy" actions={p.managedBy === 'customer' && (edit === null
            ? <Button onClick={() => setEdit(p.document)}>Edit</Button>
            : <><Button onClick={() => setEdit(null)}>Cancel</Button><Button primary disabled={!!errs.length} onClick={() => { patch('iamPolicies', p.id, { document: JSON.stringify(JSON.parse(edit), null, 2) }); log('iam', `CreatePolicyVersion ${p.name} (set as default)`); setEdit(null); }}>Save changes</Button></>)}>
            {edit === null ? <Json value={p.document} /> : <PolicyEditor value={edit} onChange={setEdit} errors={errs} />}
            {p.managedBy === 'aws' && <Alert>AWS managed policies can't be edited. To customize, copy the JSON into a new customer managed policy.</Alert>}
          </Panel>
        ) },
        { label: `Entities attached (${used.length})`, content: (
          <Panel title="Entities attached" counter={used.length}>
            <Table rows={used} empty="This policy is not attached to any entity." columns={[{ header: 'Entity name', cell: (e) => <Link to={e.to}>{e.name}</Link> }, { header: 'Entity type', cell: (e) => e.type }, { header: 'Attached as', cell: (e) => e.as }]} />
          </Panel>
        ) },
      ]} />
    </Page>
  );
}
