// IAM user groups: list, create, detail (users + permissions).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { rid } from '../../../cloud/seed';
import { Alert, Button, ConfirmDelete, Field, Input, KV, Modal, MultiCheck, Page, Panel, Table, Tabs, Teach, fmtDate, useCloud, useCloudActions } from '../../kit';
import { PolicyLink, PolicyPicker, iamArn, nameError, policyType } from './shared';

export function GroupList() {
  const c = useCloud((x) => ({ groups: x.iamGroups, users: x.iamUsers, policies: x.iamPolicies }));
  const { mutate, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const nav = useNavigate();
  const g = c.groups.find((x) => x.id === sel);
  return (
    <Page title="User groups" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'User groups' }]}>
      <Panel title="User groups" counter={c.groups.length} desc="A user group is a collection of IAM users. Use groups to specify permissions for a collection of users."
        actions={<><Button disabled={!g} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/iam/groups/create')}>Create group</Button></>}>
        <Table rows={c.groups} selected={sel} onSelect={setSel} filterText={(x) => x.name} empty="No groups to display."
          columns={[
            { header: 'Group name', cell: (x) => <Link to={`/console/iam/groups/${x.name}`}>{x.name}</Link> },
            { header: 'Users', cell: (x) => c.users.filter((u) => u.groupIds.includes(x.id)).length },
            { header: 'Permissions', cell: (x) => x.policyIds.map((id) => c.policies.find((p) => p.id === id)?.name).join(', ') || <span className="text-[#8d6605]">⚠ Not defined</span> },
            { header: 'Creation time', cell: (x) => fmtDate(x.createdAt) },
          ]} />
        <Teach title="Groups vs attaching to users">Groups are the scalable way to grant permissions: attach policies once to the group and every member inherits them. A user can be in up to 10 groups; groups can't contain other groups.</Teach>
      </Panel>
      {del && g && <ConfirmDelete what={g.name} onClose={() => setDel(false)} warning="Members are removed from the group and lose the permissions it grants."
        onConfirm={() => { mutate((d) => { d.iamGroups = d.iamGroups.filter((x) => x.id !== g.id); d.iamUsers.forEach((u) => { u.groupIds = u.groupIds.filter((x) => x !== g.id); }); }); log('iam', `DeleteGroup ${g.name}`); setSel(null); }} />}
    </Page>
  );
}

export function CreateGroup() {
  const c = useCloud((x) => ({ groups: x.iamGroups, users: x.iamUsers }));
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [pols, setPols] = useState<string[]>([]);
  const err = nameError(name, c.groups.map((g) => g.name), 128);
  const create = () => {
    const id = rid('AGPA');
    mutate((d) => {
      d.iamGroups.push({ id, name, region: 'global', createdAt: Date.now(), policyIds: pols });
      d.iamUsers.forEach((u) => { if (users.includes(u.id)) u.groupIds.push(id); });
    });
    log('iam', `CreateGroup ${name} (${pols.length} policies, ${users.length} users)`);
    nav(`/console/iam/groups/${name}`);
  };
  return (
    <Page title="Create user group" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'User groups', to: '/console/iam/groups' }, { label: 'Create user group' }]}>
      <Panel title="Name the group">
        <Field label="User group name" hint="Enter a meaningful name to identify this group. Maximum 128 characters." error={name ? err : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admins" /></Field>
      </Panel>
      <Panel title="Add users to the group - optional" counter={c.users.length}>
        <MultiCheck value={users} onChange={setUsers} options={c.users.map((u) => ({ value: u.id, label: u.name }))} />
      </Panel>
      <Panel title="Attach permissions policies - optional">
        <PolicyPicker value={pols} onChange={setPols} />
        <Teach title="Least privilege">Start from the smallest set of permissions the job needs. AdministratorAccess is fine for an Admins group, but a Developers group should get only the services they actually use.</Teach>
      </Panel>
      <div className="flex justify-end gap-2 mb-10"><Button onClick={() => nav('/console/iam/groups')}>Cancel</Button><Button primary disabled={!!err} onClick={create}>Create user group</Button></div>
    </Page>
  );
}

export function GroupDetail() {
  const { name } = useParams();
  const c = useCloud((x) => ({ groups: x.iamGroups, users: x.iamUsers, policies: x.iamPolicies, accountId: x.accountId }));
  const { patch, mutate, log } = useCloudActions();
  const g = c.groups.find((x) => x.name === name);
  const [uSel, setUSel] = useState<string | null>(null);
  const [pSel, setPSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'' | 'users' | 'pols'>('');
  const [pick, setPick] = useState<string[]>([]);
  if (!g) return <Page title="Group not found" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'User groups', to: '/console/iam/groups' }]}><Alert kind="error">No group named {name}.</Alert></Page>;
  const members = c.users.filter((u) => u.groupIds.includes(g.id));
  const pols = c.policies.filter((p) => g.policyIds.includes(p.id));
  const close = () => { setModal(''); setPick([]); };
  return (
    <Page title={g.name} crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'User groups', to: '/console/iam/groups' }, { label: g.name }]}>
      <Panel title="Summary"><KV items={[['User group name', g.name], ['Creation time', fmtDate(g.createdAt)], ['ARN', <code className="text-[13px]">{iamArn(c.accountId, 'group', g.name)}</code>]]} /></Panel>
      <Tabs tabs={[
        { label: `Users (${members.length})`, content: (
          <Panel title="Users in this group" counter={members.length}
            actions={<><Button disabled={!uSel} onClick={() => { const u = members.find((x) => x.id === uSel)!; patch('iamUsers', u.id, { groupIds: u.groupIds.filter((x) => x !== g.id) }); log('iam', `RemoveUserFromGroup ${u.name} from ${g.name}`); setUSel(null); }}>Remove</Button><Button primary onClick={() => setModal('users')}>Add users</Button></>}>
            <Table rows={members} selected={uSel} onSelect={setUSel} empty="No users in this group."
              columns={[{ header: 'User name', cell: (u) => <Link to={`/console/iam/users/${u.name}`}>{u.name}</Link> }, { header: 'MFA', cell: (u) => (u.mfa ? 'Virtual' : '⚠ None') }, { header: 'Directly attached policies', cell: (u) => u.policyIds.length || '–' }]} />
          </Panel>
        ) },
        { label: 'Permissions', content: (
          <Panel title="Permissions policies" counter={pols.length} desc="Every user in the group inherits these permissions."
            actions={<><Button disabled={!pSel} onClick={() => { patch('iamGroups', g.id, { policyIds: g.policyIds.filter((x) => x !== pSel) }); log('iam', `DetachGroupPolicy ${c.policies.find((p) => p.id === pSel)?.name} from ${g.name}`); setPSel(null); }}>Remove</Button><Button primary onClick={() => setModal('pols')}>Add permissions</Button></>}>
            <Table rows={pols} selected={pSel} onSelect={setPSel} empty="No permissions policies attached."
              columns={[{ header: 'Policy name', cell: (p) => <PolicyLink p={p} /> }, { header: 'Type', cell: policyType }, { header: 'Description', cell: (p) => p.description }]} />
          </Panel>
        ) },
      ]} />
      {modal === 'users' && (
        <Modal title={`Add users to ${g.name}`} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary disabled={!pick.length} onClick={() => { mutate((d) => d.iamUsers.forEach((u) => { if (pick.includes(u.id)) u.groupIds.push(g.id); })); log('iam', `AddUserToGroup ×${pick.length} to ${g.name}`); close(); }}>Add users</Button></>}>
          <MultiCheck value={pick} onChange={setPick} options={c.users.filter((u) => !u.groupIds.includes(g.id)).map((u) => ({ value: u.id, label: u.name }))} />
        </Modal>
      )}
      {modal === 'pols' && (
        <Modal title={`Attach permission policies to ${g.name}`} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button primary disabled={!pick.length} onClick={() => { patch('iamGroups', g.id, { policyIds: [...new Set([...g.policyIds, ...pick])] }); log('iam', `AttachGroupPolicy ×${pick.length} to ${g.name}`); close(); }}>Attach policies</Button></>}>
          <PolicyPicker value={pick} onChange={setPick} />
        </Modal>
      )}
    </Page>
  );
}
