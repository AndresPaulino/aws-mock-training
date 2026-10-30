// IAM roles: list, create wizard (trusted entity → permissions → name), detail with trust policy.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { IamRole } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Alert, Button, ConfirmDelete, Field, Input, KV, Modal, Page, Panel, Radios, Select, Table, Tabs, Teach, fmtDate, useCloud, useCloudActions } from '../../kit';
import { Json, PolicyLink, PolicyPicker, SERVICE_PRINCIPALS, type TrustKind, WEB_IDPS, iamArn, nameError, policyType, trustKind, trustLabel, trustPolicy } from './shared';

export function RoleList() {
  const roles = useCloud((c) => c.iamRoles);
  const { mutate, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const nav = useNavigate();
  const r = roles.find((x) => x.id === sel);
  return (
    <Page title="Roles" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Roles' }]}>
      <Panel title="Roles" counter={roles.length} desc="An IAM role is an identity you can create that has specific permissions with credentials that are valid for short durations. Roles can be assumed by entities that you trust."
        actions={<><Button disabled={!r} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/iam/roles/create')}>Create role</Button></>}>
        <Table rows={roles} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.trustedEntity}`} empty="No roles to display."
          columns={[
            { header: 'Role name', cell: (x) => <Link to={`/console/iam/roles/${x.name}`}>{x.name}</Link> },
            { header: 'Trusted entities', cell: (x) => trustLabel(x.trustedEntity) },
            { header: 'Creation time', cell: (x) => fmtDate(x.createdAt) },
          ]} />
        <Teach title="Roles vs long-term access keys">A role has no password or access keys. Whoever it trusts calls STS AssumeRole and gets temporary credentials that expire (15 min to 12 h). That's why "EC2 needs to read S3" is always answered with an instance role, never with access keys on the box.</Teach>
      </Panel>
      {del && r && <ConfirmDelete what={r.name} onClose={() => setDel(false)} onConfirm={() => { mutate((d) => { d.iamRoles = d.iamRoles.filter((x) => x.id !== r.id); }); log('iam', `DeleteRole ${r.name}`); setSel(null); }} />}
    </Page>
  );
}

export function CreateRole() {
  const c = useCloud((x) => ({ roles: x.iamRoles, policies: x.iamPolicies, accountId: x.accountId }));
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<TrustKind>('service');
  const [svc, setSvc] = useState('ec2.amazonaws.com');
  const [acctMode, setAcctMode] = useState<'this' | 'other'>('other');
  const [acct, setAcct] = useState('');
  const [idp, setIdp] = useState('cognito-identity.amazonaws.com');
  const [saml, setSaml] = useState('MyCorpIdP');
  const [pols, setPols] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const acctErr = kind === 'account' && acctMode === 'other' && !/^\d{12}$/.test(acct) ? 'An AWS account ID is 12 digits.' : undefined;
  const samlErr = kind === 'saml' && !/^[\w.-]+$/.test(saml) ? 'Enter the SAML provider name.' : undefined;
  const entity = kind === 'service' ? svc : kind === 'account' ? `arn:aws:iam::${acctMode === 'this' ? c.accountId : acct}:root` : kind === 'web' ? idp : `arn:aws:iam::${c.accountId}:saml-provider/${saml}`;
  const nErr = nameError(name, c.roles.map((r) => r.name));
  const create = () => {
    const role: IamRole = { id: rid('AROA'), name, region: 'global', createdAt: Date.now(), trustedEntity: entity, policyIds: pols, description: desc };
    put('iamRoles', role);
    log('iam', `CreateRole ${name} trusted by ${entity}; AttachRolePolicy ×${pols.length}`);
    nav(`/console/iam/roles/${name}`);
  };
  const steps = ['Select trusted entity', 'Add permissions', 'Name, review, and create'];
  return (
    <Page title={steps[step - 1]} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Roles', to: '/console/iam/roles' }, { label: 'Create role' }]}>
      <ol className="flex gap-6 mb-4 text-[13px]">{steps.map((s, i) => <li key={s} className={i + 1 === step ? 'font-bold text-[#0972d3]' : 'text-[#5f6b7a]'}>Step {i + 1}: {s}</li>)}</ol>
      {step === 1 && (
        <>
          <Panel title="Trusted entity type">
            <Radios value={kind} onChange={setKind} options={[
              { value: 'service', label: 'AWS service', desc: 'Allow AWS services like EC2, Lambda, or others to perform actions in this account.' },
              { value: 'account', label: 'AWS account', desc: 'Allow entities in other AWS accounts belonging to you or a 3rd party to perform actions in this account.' },
              { value: 'web', label: 'Web identity', desc: 'Allows users federated by the specified external web identity provider to assume this role.' },
              { value: 'saml', label: 'SAML 2.0 federation', desc: 'Allow users federated with SAML 2.0 from a corporate directory to perform actions in this account.' },
            ]} />
          </Panel>
          {kind === 'service' && (
            <Panel title="Use case" desc="Allow an AWS service like EC2, Lambda, or others to perform actions in this account.">
              <Radios value={svc} onChange={setSvc} options={SERVICE_PRINCIPALS} />
              <Teach title="Service roles">For EC2 the console also creates an <b>instance profile</b> with the same name: that's the container you attach to an instance. Lambda calls this its execution role; ECS uses a task role (what your code can do) separate from the task execution role (pulling images, writing logs).</Teach>
            </Panel>
          )}
          {kind === 'account' && (
            <Panel title="An AWS account">
              <Radios value={acctMode} onChange={setAcctMode} options={[{ value: 'this', label: `This account (${c.accountId})` }, { value: 'other', label: 'Another AWS account' }]} />
              {acctMode === 'other' && <div className="mt-3"><Field label="Account ID" hint="Identifier of the account that can use this role." error={acct ? acctErr : undefined}><Input value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ''))} placeholder="111122223333" maxLength={12} /></Field></div>}
              <Teach title="Cross-account access">The trust policy here only says the other account <i>may</i> assume the role; an admin there must still grant its users sts:AssumeRole on this role's ARN. For third parties, add an <b>external ID</b> condition to prevent the confused-deputy problem.</Teach>
            </Panel>
          )}
          {kind === 'web' && (
            <Panel title="Web identity">
              <Field label="Identity provider"><Select value={idp} onChange={setIdp} options={WEB_IDPS} /></Field>
              <Teach title="Web identity federation">Mobile and web apps should not ship AWS keys. Users sign in with Cognito (or Google, Facebook, Amazon) and exchange the token via AssumeRoleWithWebIdentity for temporary credentials. On the exam, Cognito identity pools are the usual answer.</Teach>
            </Panel>
          )}
          {kind === 'saml' && (
            <Panel title="SAML 2.0 federation">
              <Field label="SAML 2.0-based provider" hint="The identity provider you registered in IAM (e.g. your corporate Active Directory via AD FS)." error={samlErr}><Input value={saml} onChange={(e) => setSaml(e.target.value)} /></Field>
              <Teach title="SAML federation">Corporate users sign in to their existing directory (AD FS, Okta) and get console or API access through AssumeRoleWithSAML. No IAM users needed. IAM Identity Center is the modern managed version of this.</Teach>
            </Panel>
          )}
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => nav('/console/iam/roles')}>Cancel</Button><Button primary disabled={!!acctErr || !!samlErr} onClick={() => setStep(2)}>Next</Button></div>
        </>
      )}
      {step === 2 && (
        <>
          <Panel title="Permissions policies" desc="Choose one or more policies to attach to your new role.">
            <PolicyPicker value={pols} onChange={setPols} />
            <Teach title="Least privilege">Grant the role only what the workload needs: a customer managed policy scoped to one bucket ARN beats AmazonS3FullAccess.</Teach>
          </Panel>
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => setStep(1)}>Previous</Button><Button primary onClick={() => setStep(3)}>Next</Button></div>
        </>
      )}
      {step === 3 && (
        <>
          <Panel title="Role details">
            <Field label="Role name" hint="Maximum 64 characters. Use alphanumeric and '+=,.@-_' characters." error={name ? nErr : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="EC2-S3-ReadOnly" /></Field>
            <Field label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Allows EC2 instances to call AWS services on your behalf." /></Field>
          </Panel>
          <Panel title="Step 1: Select trusted entities" desc="Trust policy"><Json value={trustPolicy(entity)} /></Panel>
          <Panel title="Step 2: Add permissions">
            <Table rows={c.policies.filter((p) => pols.includes(p.id))} columns={[{ header: 'Policy name', cell: (p) => p.name }, { header: 'Type', cell: policyType }]} empty="No policies. The role will have no permissions." />
          </Panel>
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => setStep(2)}>Previous</Button><Button primary disabled={!!nErr} onClick={create}>Create role</Button></div>
        </>
      )}
    </Page>
  );
}

export function RoleDetail() {
  const { name } = useParams();
  const c = useCloud((x) => ({ roles: x.iamRoles, policies: x.iamPolicies, accountId: x.accountId }));
  const { patch, log } = useCloudActions();
  const nav = useNavigate();
  const r = c.roles.find((x) => x.name === name);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  if (!r) return <Page title="Role not found" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Roles', to: '/console/iam/roles' }]}><Alert kind="error">No role named {name}.</Alert></Page>;
  const pols = c.policies.filter((p) => r.policyIds.includes(p.id));
  const k = trustKind(r.trustedEntity);
  return (
    <Page title={r.name} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Roles', to: '/console/iam/roles' }, { label: r.name }]}
      actions={<Button onClick={() => nav(`/console/iam/simulator?principal=role:${r.id}`)}>Simulate permissions</Button>}>
      <Panel title="Summary">
        <KV items={[['ARN', <code className="text-[13px]">{iamArn(c.accountId, 'role', r.name)}</code>], ['Creation date', fmtDate(r.createdAt)], ['Maximum session duration', '1 hour'],
          ['Description', r.description || '–'], ['Trusted entity', trustLabel(r.trustedEntity)],
          ['Instance profile ARN', r.trustedEntity === 'ec2.amazonaws.com' ? <code className="text-[13px]">{`arn:aws:iam::${c.accountId}:instance-profile/${r.name}`}</code> : '–']]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Permissions', content: (
          <Panel title="Permissions policies" counter={pols.length}
            actions={<><Button disabled={!sel} onClick={() => { patch('iamRoles', r.id, { policyIds: r.policyIds.filter((x) => x !== sel) }); log('iam', `DetachRolePolicy ${c.policies.find((p) => p.id === sel)?.name} from ${r.name}`); setSel(null); }}>Remove</Button><Button primary onClick={() => setAdding(true)}>Add permissions</Button></>}>
            <Table rows={pols} selected={sel} onSelect={setSel} empty="No permissions policies attached."
              columns={[{ header: 'Policy name', cell: (p) => <PolicyLink p={p} /> }, { header: 'Type', cell: policyType }, { header: 'Description', cell: (p) => p.description }]} />
          </Panel>
        ) },
        { label: 'Trust relationships', content: (
          <Panel title="Trusted entities" desc="Entities that can assume this role under specified conditions.">
            <Json value={trustPolicy(r.trustedEntity)} />
            <Teach title="Two policies per role">The <b>trust policy</b> (above) answers "who can assume this role?" (its Principal). The <b>permissions policies</b> answer "what can the role do once assumed?". {k === 'service' ? 'Here an AWS service is the principal.' : k === 'account' ? 'Here a whole AWS account is the principal; that account decides which of its users may assume it.' : 'Here a federated identity provider is the principal.'}</Teach>
          </Panel>
        ) },
      ]} />
      {adding && (
        <Modal title={`Attach policies to ${r.name}`} onClose={() => setAdding(false)} footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button primary disabled={!pick.length} onClick={() => { patch('iamRoles', r.id, { policyIds: [...new Set([...r.policyIds, ...pick])] }); log('iam', `AttachRolePolicy ×${pick.length} to ${r.name}`); setAdding(false); setPick([]); }}>Add permissions</Button></>}>
          <PolicyPicker value={pick} onChange={setPick} />
        </Modal>
      )}
    </Page>
  );
}
