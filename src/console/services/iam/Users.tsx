// IAM users: list, create wizard, detail (permissions, groups, security credentials).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { IamUser } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Alert, Button, Check, ConfirmDelete, Field, Input, KV, Modal, MultiCheck, Page, Panel, Radios, Select, Status, Table, Tabs, Teach, fmtDate, useCloud, useCloudActions } from '../../kit';
import { MfaModal, PolicyLink, PolicyPicker, iamArn, nameError, policyType } from './shared';
import { attachedPolicies } from './policyEval';

export function UserList() {
  const users = useCloud((c) => c.iamUsers);
  const groups = useCloud((c) => c.iamGroups);
  const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const nav = useNavigate();
  const selected = users.find((u) => u.id === sel);
  return (
    <Page title="Users" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Users' }]}>
      <Panel title="Users" counter={users.length} desc="An IAM user is an identity with long-term credentials that is used to interact with AWS in an account."
        actions={<><Button disabled={!selected} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/iam/users/create')}>Create user</Button></>}>
        <Table rows={users} selected={sel} onSelect={setSel} filterText={(u) => u.name} empty="No users to display."
          columns={[
            { header: 'User name', cell: (u) => <Link to={`/console/iam/users/${u.name}`}>{u.name}</Link> },
            { header: 'Groups', cell: (u) => u.groupIds.map((g) => groups.find((x) => x.id === g)?.name).filter(Boolean).join(', ') || '–' },
            { header: 'MFA', cell: (u) => (u.mfa ? 'Virtual' : <span className="text-[#8d6605]">⚠ None</span>) },
            { header: 'Console access', cell: (u) => (u.consoleAccess ? 'Enabled' : 'Disabled') },
            { header: 'Access keys', cell: (u) => (u.accessKeys ? `${u.accessKeys} active` : '–') },
            { header: 'Creation time', cell: (u) => fmtDate(u.createdAt) },
          ]} />
      </Panel>
      {del && selected && <ConfirmDelete what={selected.name} onClose={() => setDel(false)} onConfirm={() => { remove('iamUsers', selected.id); log('iam', `DeleteUser ${selected.name}`); setSel(null); }} warning="Deleting the user also deletes its access keys, MFA devices and signing certificates." />}
    </Page>
  );
}

type PermMode = 'group' | 'copy' | 'direct';

export function CreateUser() {
  const c = useCloud((x) => ({ users: x.iamUsers, groups: x.iamGroups, policies: x.iamPolicies, accountId: x.accountId }));
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [console_, setConsole] = useState(false);
  const [pwMode, setPwMode] = useState<'auto' | 'custom'>('auto');
  const [pw, setPw] = useState('');
  const [reset, setReset] = useState(true);
  const [mode, setMode] = useState<PermMode>('group');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [copyFrom, setCopyFrom] = useState('');
  const [policyIds, setPolicyIds] = useState<string[]>([]);
  const [useBoundary, setUseBoundary] = useState(false);
  const [boundary, setBoundary] = useState('');
  const [newGroup, setNewGroup] = useState(false);

  const nErr = nameError(name, c.users.map((u) => u.name));
  const pwErr = console_ && pwMode === 'custom' && (pw.length < 8 || [/[A-Z]/, /[a-z]/, /\d/, /[^\w]/].filter((r) => r.test(pw)).length < 3) ? 'At least 8 characters and 3 of: uppercase, lowercase, numbers, symbols.' : undefined;
  const src = c.users.find((u) => u.id === copyFrom);
  const final = mode === 'group' ? { groupIds, policyIds: [] as string[], boundary: useBoundary ? boundary : '' }
    : mode === 'copy' ? { groupIds: src?.groupIds ?? [], policyIds: src?.policyIds ?? [], boundary: src?.boundaryPolicyId ?? '' }
    : { groupIds: [] as string[], policyIds, boundary: useBoundary ? boundary : '' };
  const pName = (id: string) => c.policies.find((p) => p.id === id)?.name;

  const create = () => {
    const u: IamUser = { id: rid('AIDA'), name, region: 'global', createdAt: Date.now(), groupIds: final.groupIds, policyIds: final.policyIds, mfa: false, consoleAccess: console_, accessKeys: 0, boundaryPolicyId: final.boundary || undefined };
    put('iamUsers', u);
    log('iam', `CreateUser ${name}${console_ ? ' (console access)' : ''}${u.groupIds.length ? `; AddUserToGroup ×${u.groupIds.length}` : ''}${u.policyIds.length ? `; AttachUserPolicy ×${u.policyIds.length}` : ''}`);
    setStep(4);
  };

  const steps = ['Specify user details', 'Set permissions', 'Review and create'];
  return (
    <Page title={step === 4 ? 'Retrieve password' : steps[step - 1]} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Users', to: '/console/iam/users' }, { label: 'Create user' }]}>
      {step < 4 && <ol className="flex gap-6 mb-4 text-[13px]">{steps.map((s, i) => <li key={s} className={i + 1 === step ? 'font-bold text-[#0972d3]' : 'text-[#5f6b7a]'}>Step {i + 1}: {s}</li>)}</ol>}

      {step === 1 && (
        <Panel title="User details">
          <Field label="User name" hint="Up to 64 characters. Valid characters: A-Z, a-z, 0-9, and + = , . @ _ - (hyphen)" error={touched ? nErr : undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
          </Field>
          <Check checked={console_} onChange={setConsole} label="Provide user access to the AWS Management Console - optional" hint="If you're providing console access to a person, it's a best practice to manage their access in IAM Identity Center." />
          {console_ && (
            <div className="pl-6">
              <Alert>Are you providing console access to a person? For workforce users, AWS recommends <b>IAM Identity Center</b> (single sign-on, short-term credentials). Here we create an IAM user, which is what the exam's "IAM users and groups" questions are about.</Alert>
              <div className="aws-label mb-1">Console password</div>
              <Radios value={pwMode} onChange={setPwMode} options={[{ value: 'auto', label: 'Autogenerated password', desc: 'You can view the password after you create the user.' }, { value: 'custom', label: 'Custom password', desc: 'Enter a custom password for the user.' }]} />
              {pwMode === 'custom' && <div className="mt-3"><Field label="Password" error={pw ? pwErr : undefined}><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field></div>}
              <div className="mt-3"><Check checked={reset} onChange={setReset} label="Users must create a new password at next sign-in - Recommended" hint="Users automatically get the IAMUserChangePassword policy to allow them to change their own password." /></div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4"><Button onClick={() => nav('/console/iam/users')}>Cancel</Button><Button primary disabled={!!nErr || !!pwErr} onClick={() => setStep(2)}>Next</Button></div>
        </Panel>
      )}

      {step === 2 && (
        <>
          <Panel title="Permissions options">
            <Radios value={mode} onChange={setMode} options={[
              { value: 'group', label: 'Add user to group', desc: 'Add user to an existing group, or create a new group. We recommend using groups to manage user permissions by job function.' },
              { value: 'copy', label: 'Copy permissions', desc: 'Copy all group memberships, attached managed policies, and inline policies from an existing user.' },
              { value: 'direct', label: 'Attach policies directly', desc: 'Attach a managed policy directly to a user. As a best practice, we recommend attaching policies to a group instead.' },
            ]} />
            <Teach title="Groups vs attaching to users">Attach policies to <b>groups</b> (Admins, Developers, Auditors) and put users in them. When someone changes job you move them between groups instead of editing policies user by user. Groups can't be nested and can't be used as a principal in a policy.</Teach>
          </Panel>
          {mode === 'group' && (
            <Panel title="User groups" counter={c.groups.length} actions={<Button onClick={() => setNewGroup(true)}>Create group</Button>}>
              <MultiCheck value={groupIds} onChange={setGroupIds} options={c.groups.map((g) => ({ value: g.id, label: <span><b>{g.name}</b> <span className="aws-hint">· {g.policyIds.map(pName).join(', ') || 'no policies'}</span></span> }))} />
            </Panel>
          )}
          {mode === 'copy' && (
            <Panel title="Copy permissions from user">
              {c.users.length ? <Select value={copyFrom} onChange={setCopyFrom} options={[{ value: '', label: 'Choose a user' }, ...c.users.map((u) => ({ value: u.id, label: u.name }))]} /> : <Alert>No users to copy from yet.</Alert>}
            </Panel>
          )}
          {mode === 'direct' && (
            <Panel title="Permissions policies">
              <Alert kind="warning">As a best practice, attach policies to a group instead and add the user to it.</Alert>
              <PolicyPicker value={policyIds} onChange={setPolicyIds} />
            </Panel>
          )}
          {mode !== 'copy' && (
            <Panel title="Set permissions boundary - optional">
              <Check checked={useBoundary} onChange={setUseBoundary} label="Use a permissions boundary to control the maximum user permissions" hint="A boundary never grants permissions. It caps them: the user can only do what both their policies AND the boundary allow." />
              {useBoundary && <Select value={boundary} onChange={setBoundary} options={[{ value: '', label: 'Choose a boundary policy' }, ...c.policies.map((p) => ({ value: p.id, label: `${p.name} (${policyType(p)})` }))]} />}
              <Teach title="Permissions boundaries">Typical exam use: let developers create roles for their Lambda functions, but force a boundary so they can never create a role more powerful than themselves (no privilege escalation).</Teach>
            </Panel>
          )}
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => setStep(1)}>Previous</Button><Button primary disabled={(mode === 'copy' && !src) || (useBoundary && mode !== 'copy' && !boundary)} onClick={() => setStep(3)}>Next</Button></div>
        </>
      )}

      {step === 3 && (
        <>
          <Panel title="User details"><KV items={[['User name', name], ['Console password type', console_ ? (pwMode === 'auto' ? 'Autogenerated' : 'Custom password') : 'None'], ['Require password reset', console_ && reset ? 'Yes' : 'No']]} /></Panel>
          <Panel title="Permissions summary">
            <Table rows={[...final.groupIds.map((g) => ({ id: `g${g}`, n: c.groups.find((x) => x.id === g)?.name ?? g, t: 'Group', u: 'Permissions group' })),
              ...final.policyIds.map((p) => ({ id: `p${p}`, n: pName(p) ?? p, t: 'Managed policy', u: 'Permissions policy' })),
              ...(final.boundary ? [{ id: 'b', n: pName(final.boundary) ?? '', t: 'Managed policy', u: 'Permissions boundary' }] : [])]}
              columns={[{ header: 'Name', cell: (r) => r.n }, { header: 'Type', cell: (r) => r.t }, { header: 'Used as', cell: (r) => r.u }]} empty="No permissions. The user can't do anything until you grant some (implicit deny)." />
          </Panel>
          <div className="flex justify-end gap-2 mb-10"><Button onClick={() => setStep(2)}>Previous</Button><Button primary onClick={create}>Create user</Button></div>
        </>
      )}

      {step === 4 && (
        <Panel>
          <Alert kind="success">User created successfully. You can view and download the user's password and email instructions for signing in.</Alert>
          {console_ ? <KV items={[['Console sign-in URL', `https://${c.accountId}.signin.aws.amazon.com/console`], ['User name', name], ['Console password', pwMode === 'auto' ? <code>Xk7#mQ2p!vR9 (simulated)</code> : '••••••••']]} /> : <p>This user has no console access. Give them access keys only if they truly need programmatic access from outside AWS.</p>}
          <Teach title="Next steps">Turn on MFA for this user (Security credentials tab). Every human identity with console access should have MFA.</Teach>
          <div className="flex justify-end gap-2 mt-3"><Button onClick={() => nav('/console/iam/users')}>Return to users list</Button><Button primary onClick={() => nav(`/console/iam/users/${name}`)}>View user</Button></div>
        </Panel>
      )}
      {newGroup && <QuickGroup onClose={() => setNewGroup(false)} onCreated={(id) => setGroupIds((g) => [...g, id])} />}
    </Page>
  );
}

/** "Create user group" modal used from inside the user wizard. */
function QuickGroup({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const groups = useCloud((c) => c.iamGroups);
  const { put, log } = useCloudActions();
  const [name, setName] = useState('');
  const [pols, setPols] = useState<string[]>([]);
  const err = nameError(name, groups.map((g) => g.name), 128);
  return (
    <Modal title="Create user group" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err} onClick={() => { const id = rid('AGPA'); put('iamGroups', { id, name, region: 'global', createdAt: Date.now(), policyIds: pols }); log('iam', `CreateGroup ${name}`); onCreated(id); onClose(); }}>Create user group</Button></>}>
      <Field label="User group name" error={name ? err : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <PolicyPicker value={pols} onChange={setPols} />
    </Modal>
  );
}

export function UserDetail() {
  const { name } = useParams();
  const c = useCloud((x) => ({ users: x.iamUsers, groups: x.iamGroups, policies: x.iamPolicies, accountId: x.accountId }));
  const { patch, log } = useCloudActions();
  const nav = useNavigate();
  const u = c.users.find((x) => x.name === name);
  const [sel, setSel] = useState<string | null>(null);
  const [gSel, setGSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'' | 'perm' | 'groups' | 'boundary' | 'mfa' | 'key'>('');
  if (!u) return <Page title="User not found" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Users', to: '/console/iam/users' }]}><Alert kind="error">No user named {name}.</Alert></Page>;
  const set = (p: Partial<IamUser>, msg: string) => { patch('iamUsers', u.id, p); log('iam', `${msg} (user ${u.name})`); };
  const rows = attachedPolicies({ iamPolicies: c.policies, iamGroups: c.groups }, { kind: 'user', user: u }).map((a) => ({ id: `${a.policy.id}|${a.source}`, ...a }));
  const boundary = c.policies.find((p) => p.id === u.boundaryPolicyId);
  const selRow = rows.find((r) => r.id === sel);

  return (
    <Page title={u.name} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Users', to: '/console/iam/users' }, { label: u.name }]}
      actions={<Button onClick={() => nav(`/console/iam/simulator?principal=user:${u.id}`)}>Simulate permissions</Button>}>
      <Panel title="Summary">
        <KV items={[['ARN', <code className="text-[13px]">{iamArn(c.accountId, 'user', u.name)}</code>], ['Console access', u.consoleAccess ? 'Enabled' : 'Disabled'], ['Created', fmtDate(u.createdAt)],
          ['MFA', u.mfa ? <Status value="Enabled" /> : <span className="text-[#8d6605]">⚠ Not assigned</span>], ['Access key 1', u.accessKeys ? 'Active' : 'Not enabled'], ['Last console sign-in', 'Never']]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Permissions', content: (
          <>
            <Panel title="Permissions policies" counter={rows.length} desc="Permissions are defined by policies attached to the user directly or through groups."
              actions={<><Button disabled={!selRow || selRow.source !== 'Attached directly'} onClick={() => { set({ policyIds: u.policyIds.filter((x) => x !== selRow!.policy.id) }, `DetachUserPolicy ${selRow!.policy.name}`); setSel(null); }}>Remove</Button><Button primary onClick={() => setModal('perm')}>Add permissions</Button></>}>
              <Table rows={rows} selected={sel} onSelect={setSel} empty="No permissions policies. Everything is implicitly denied."
                columns={[{ header: 'Policy name', cell: (r) => <PolicyLink p={r.policy} /> }, { header: 'Type', cell: (r) => policyType(r.policy) }, { header: 'Attached via', cell: (r) => r.source }]} />
              {u.policyIds.length > 0 && <Teach title="Least privilege">This user has policies attached directly. That works, but it scales badly. Prefer a group per job function, and grant only the actions and resources the job needs.</Teach>}
            </Panel>
            <Panel title="Permissions boundary" actions={<>{boundary && <Button onClick={() => set({ boundaryPolicyId: undefined }, 'DeleteUserPermissionsBoundary')}>Remove boundary</Button>}<Button onClick={() => setModal('boundary')}>{boundary ? 'Change boundary' : 'Set permissions boundary'}</Button></>}>
              {boundary ? <p>Boundary: <PolicyLink p={boundary} />. The user's effective permissions are the <b>intersection</b> of the policies above and this boundary.</p> : <p className="text-[#5f6b7a]">Permissions boundary is not set.</p>}
            </Panel>
          </>
        ) },
        { label: `Groups (${u.groupIds.length})`, content: (
          <Panel title="User groups membership" counter={u.groupIds.length}
            actions={<><Button disabled={!gSel} onClick={() => { set({ groupIds: u.groupIds.filter((g) => g !== gSel) }, `RemoveUserFromGroup ${c.groups.find((g) => g.id === gSel)?.name}`); setGSel(null); }}>Remove</Button><Button primary onClick={() => setModal('groups')}>Add user to groups</Button></>}>
            <Table rows={c.groups.filter((g) => u.groupIds.includes(g.id))} selected={gSel} onSelect={setGSel} empty="This user is not a member of any group."
              columns={[{ header: 'Group name', cell: (g) => <Link to={`/console/iam/groups/${g.name}`}>{g.name}</Link> }, { header: 'Attached policies', cell: (g) => g.policyIds.map((id) => c.policies.find((p) => p.id === id)?.name).join(', ') || '–' }]} />
          </Panel>
        ) },
        { label: 'Security credentials', content: (
          <>
            <Panel title="Console sign-in" actions={<Button onClick={() => set({ consoleAccess: !u.consoleAccess }, u.consoleAccess ? 'DeleteLoginProfile' : 'CreateLoginProfile')}>{u.consoleAccess ? 'Disable console access' : 'Enable console access'}</Button>}>
              <KV items={[['Console sign-in link', `https://${c.accountId}.signin.aws.amazon.com/console`], ['Console password', u.consoleAccess ? 'Set' : 'Not enabled']]} />
            </Panel>
            <Panel title="Multi-factor authentication (MFA)" counter={u.mfa ? 1 : 0} actions={u.mfa ? <Button onClick={() => set({ mfa: false }, 'DeactivateMFADevice')}>Remove</Button> : <Button primary onClick={() => setModal('mfa')}>Assign MFA device</Button>}>
              {u.mfa ? <KV items={[['Type', 'Virtual'], ['Identifier', <code className="text-[13px]">{iamArn(c.accountId, 'mfa', `${u.name}-phone`)}</code>], ['Status', <Status value="Active" />]]} />
                : <Alert kind="warning">No MFA devices. Assign an MFA device to improve the security of your AWS environment.</Alert>}
            </Panel>
            <Panel title="Access keys" counter={u.accessKeys} desc="Use access keys to send programmatic calls to AWS from the AWS CLI, SDKs, or direct API calls. You can have a maximum of two access keys (active or inactive) at a time."
              actions={<><Button disabled={!u.accessKeys} onClick={() => set({ accessKeys: u.accessKeys - 1 }, 'DeleteAccessKey')}>Delete</Button><Button disabled={u.accessKeys >= 2} onClick={() => setModal('key')}>Create access key</Button></>}>
              {u.accessKeys ? <Table rows={Array.from({ length: u.accessKeys }, (_, i) => ({ id: `AKIA${u.id.slice(5, 17).toUpperCase()}${i}` }))} columns={[{ header: 'Access key ID', cell: (r) => <code>{r.id}</code> }, { header: 'Status', cell: () => <Status value="Active" /> }, { header: 'Last used', cell: () => 'Never' }]} /> : <p className="text-[#5f6b7a]">No access keys.</p>}
              <Teach title="Roles vs long-term access keys">Access keys never expire on their own, so a leaked key is a standing risk. Code running on EC2, Lambda or ECS should use an <b>IAM role</b> (temporary credentials from STS, rotated automatically). Never put access keys in code or on an instance.</Teach>
            </Panel>
          </>
        ) },
      ]} />

      {modal === 'perm' && <AddPermissions user={u} onClose={() => setModal('')} />}
      {modal === 'groups' && <PickGroups user={u} onClose={() => setModal('')} />}
      {modal === 'boundary' && <BoundaryModal user={u} onClose={() => setModal('')} />}
      {modal === 'mfa' && <MfaModal who={u.name} onClose={() => setModal('')} onDone={(d) => set({ mfa: true }, `EnableMFADevice ${d}`)} />}
      {modal === 'key' && <AccessKeyModal onClose={() => setModal('')} onCreate={() => set({ accessKeys: u.accessKeys + 1 }, 'CreateAccessKey')} />}
    </Page>
  );
}

function AddPermissions({ user, onClose }: { user: IamUser; onClose: () => void }) {
  const groups = useCloud((c) => c.iamGroups);
  const { patch, log } = useCloudActions();
  const [mode, setMode] = useState<'group' | 'direct'>('group');
  const [g, setG] = useState<string[]>([]);
  const [p, setP] = useState<string[]>([]);
  const save = () => {
    if (mode === 'group') patch('iamUsers', user.id, { groupIds: [...new Set([...user.groupIds, ...g])] });
    else patch('iamUsers', user.id, { policyIds: [...new Set([...user.policyIds, ...p])] });
    log('iam', mode === 'group' ? `AddUserToGroup ×${g.length} (user ${user.name})` : `AttachUserPolicy ×${p.length} (user ${user.name})`);
    onClose();
  };
  return (
    <Modal title="Add permissions" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={mode === 'group' ? !g.length : !p.length} onClick={save}>Add permissions</Button></>}>
      <Radios value={mode} onChange={setMode} options={[{ value: 'group', label: 'Add user to group' }, { value: 'direct', label: 'Attach policies directly' }]} />
      <div className="mt-3">{mode === 'group'
        ? <MultiCheck value={g} onChange={setG} options={groups.filter((x) => !user.groupIds.includes(x.id)).map((x) => ({ value: x.id, label: x.name }))} />
        : <PolicyPicker value={p} onChange={setP} />}</div>
    </Modal>
  );
}

function PickGroups({ user, onClose }: { user: IamUser; onClose: () => void }) {
  const groups = useCloud((c) => c.iamGroups);
  const { patch, log } = useCloudActions();
  const [g, setG] = useState<string[]>([]);
  return (
    <Modal title={`Add ${user.name} to groups`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!g.length} onClick={() => { patch('iamUsers', user.id, { groupIds: [...user.groupIds, ...g] }); log('iam', `AddUserToGroup ×${g.length} (user ${user.name})`); onClose(); }}>Add to groups</Button></>}>
      <MultiCheck value={g} onChange={setG} options={groups.filter((x) => !user.groupIds.includes(x.id)).map((x) => ({ value: x.id, label: x.name }))} />
    </Modal>
  );
}

function BoundaryModal({ user, onClose }: { user: IamUser; onClose: () => void }) {
  const policies = useCloud((c) => c.iamPolicies);
  const { patch, log } = useCloudActions();
  const [b, setB] = useState(user.boundaryPolicyId ?? '');
  return (
    <Modal title="Set permissions boundary" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!b} onClick={() => { patch('iamUsers', user.id, { boundaryPolicyId: b }); log('iam', `PutUserPermissionsBoundary ${policies.find((p) => p.id === b)?.name} (user ${user.name})`); onClose(); }}>Set boundary</Button></>}>
      <Select value={b} onChange={setB} options={[{ value: '', label: 'Choose a policy' }, ...policies.map((p) => ({ value: p.id, label: `${p.name} (${policyType(p)})` }))]} />
      <Teach title="Boundary">The boundary sets the maximum. An action is allowed only if an identity policy allows it AND the boundary allows it.</Teach>
    </Modal>
  );
}

function AccessKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [use, setUse] = useState<'cli' | 'local' | 'aws' | 'third' | 'other'>('cli');
  const [ack, setAck] = useState(false);
  const [done, setDone] = useState(false);
  const alt = { cli: 'Use AWS CloudShell or the AWS CLI v2 with IAM Identity Center authentication (short-term credentials).', local: 'Use IAM Identity Center to get short-term credentials for your IDE.', aws: 'Use an IAM role instead: attach it to the EC2 instance (instance profile), Lambda function or ECS task.', third: 'Use an IAM role that the third party assumes (cross-account role with an external ID).', other: 'Prefer temporary credentials (IAM roles) wherever you can.' }[use];
  return (
    <Modal title={done ? 'Retrieve access keys' : 'Access key best practices & alternatives'} onClose={onClose}
      footer={done ? <Button primary onClick={onClose}>Done</Button> : <><Button onClick={onClose}>Cancel</Button><Button primary disabled={!ack} onClick={() => { onCreate(); setDone(true); }}>Create access key</Button></>}>
      {done ? (
        <><Alert kind="success">Access key created. This is the only time the secret access key can be viewed or downloaded.</Alert>
          <KV cols={1} items={[['Access key', <code>AKIAIOSFODNN7EXAMPLE</code>], ['Secret access key', <code>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</code>]]} /></>
      ) : (
        <>
          <Radios value={use} onChange={setUse} options={[{ value: 'cli', label: 'Command Line Interface (CLI)' }, { value: 'local', label: 'Local code' }, { value: 'aws', label: 'Application running on an AWS compute service' }, { value: 'third', label: 'Third-party service' }, { value: 'other', label: 'Other' }]} />
          <Alert kind={use === 'aws' ? 'warning' : 'info'}><b>Alternative recommended:</b> {alt}</Alert>
          <Check checked={ack} onChange={setAck} label="I understand the above recommendation and want to proceed to create an access key." />
        </>
      )}
    </Modal>
  );
}
