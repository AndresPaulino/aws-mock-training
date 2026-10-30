// IAM console (global service): dashboard, user groups, users, roles, policies and the policy simulator.
import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Button, KV, Page, Panel, SideNav, Status, Teach, useCloud, useCloudActions } from '../../kit';
import { MfaModal } from './shared';
import { CreateUser, UserDetail, UserList } from './Users';
import { CreateGroup, GroupDetail, GroupList } from './Groups';
import { CreateRole, RoleDetail, RoleList } from './Roles';
import { CreatePolicy, PolicyDetail, PolicyList } from './Policies';
import { Simulator } from './Simulator';

export default function IamConsole() {
  return (
    <div className="flex">
      <SideNav title="Identity and Access Management (IAM)" items={[
        { label: 'Dashboard', to: '/console/iam' },
        { section: 'Access management' },
        { label: 'User groups', to: '/console/iam/groups' },
        { label: 'Users', to: '/console/iam/users' },
        { label: 'Roles', to: '/console/iam/roles' },
        { label: 'Policies', to: '/console/iam/policies' },
        { section: 'Tools' },
        { label: 'Policy simulator', to: '/console/iam/simulator' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="groups" element={<GroupList />} />
          <Route path="groups/create" element={<CreateGroup />} />
          <Route path="groups/:name" element={<GroupDetail />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/create" element={<CreateUser />} />
          <Route path="users/:name" element={<UserDetail />} />
          <Route path="roles" element={<RoleList />} />
          <Route path="roles/create" element={<CreateRole />} />
          <Route path="roles/:name" element={<RoleDetail />} />
          <Route path="policies" element={<PolicyList />} />
          <Route path="policies/create" element={<CreatePolicy />} />
          <Route path="policies/:id" element={<PolicyDetail />} />
          <Route path="simulator" element={<Simulator />} />
        </Routes>
      </div>
    </div>
  );
}

function Rec({ ok, title, children, action }: { ok: boolean; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3 py-3 border-b border-[#e9ebed] last:border-0">
      <span className="text-[18px] leading-none mt-0.5" style={{ color: ok ? '#037f0c' : '#d91515' }}>{ok ? '✓' : '⚠'}</span>
      <div className="flex-1 min-w-[240px]"><div className="font-bold">{title}</div>{children && <div className="text-[14px] text-[#414d5c]">{children}</div>}</div>
      {action}
    </div>
  );
}

function Dashboard() {
  const c = useCloud((x) => ({ rootMfa: x.rootMfa, users: x.iamUsers, groups: x.iamGroups, roles: x.iamRoles, policies: x.iamPolicies, accountId: x.accountId }));
  const { mutate, log } = useCloudActions();
  const [mfa, setMfa] = useState(false);
  const noMfa = c.users.filter((u) => !u.mfa);
  const setRootMfa = (on: boolean, msg: string) => { mutate((d) => { d.rootMfa = on; }); log('iam', msg); };
  return (
    <Page title="IAM Dashboard" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Dashboard' }]}>
      <Panel title="Security recommendations" counter={(c.rootMfa ? 0 : 1) + (noMfa.length ? 1 : 0)}>
        <Rec ok={c.rootMfa} title={c.rootMfa ? 'Root user has MFA' : 'Add MFA for root user'}
          action={c.rootMfa ? <Button onClick={() => setRootMfa(false, 'DeactivateMFADevice (root user)')}>Remove MFA</Button> : <Button primary onClick={() => setMfa(true)}>Assign MFA device</Button>}>
          {c.rootMfa ? <>Virtual MFA device <Status value="Active" /></> : 'Add MFA for the root user. Having MFA-protected root credentials improves the security of this account.'}
        </Rec>
        <Rec ok title="Root user has no active access keys">Using access keys attached to an IAM user or role instead of the root user improves security. Delete root access keys if they ever get created.</Rec>
        <Rec ok={!noMfa.length} title={noMfa.length ? `${noMfa.length} IAM user${noMfa.length > 1 ? 's' : ''} without MFA` : 'All IAM users have MFA'}
          action={noMfa.length ? <Link to="/console/iam/users" className="aws-btn" style={{ textDecoration: 'none' }}>View users</Link> : undefined}>
          {noMfa.length ? noMfa.map((u) => <Link key={u.id} to={`/console/iam/users/${u.name}`} className="mr-2">{u.name}</Link>) : c.users.length ? 'Every user has an MFA device assigned.' : 'No IAM users yet.'}
        </Rec>
        <Teach title="Never use root for daily work">The root user can do everything, including closing the account, and can't be limited by IAM policies. Lock it down (MFA, no access keys), then create an IAM user or Identity Center user in an Admins group for daily admin work. Only a few tasks need root (changing the support plan, closing the account, restoring IAM admin access).</Teach>
      </Panel>
      <Panel title="IAM resources">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[['User groups', c.groups.length, 'groups'], ['Users', c.users.length, 'users'], ['Roles', c.roles.length, 'roles'], ['Policies', c.policies.filter((p) => p.managedBy === 'customer').length, 'policies'], ['Identity providers', 0, '']].map(([label, n, to]) => (
            <div key={label}><div className="text-[#5f6b7a] text-[13px] font-bold">{label}</div>{to ? <Link to={`/console/iam/${to}`} className="text-[28px]">{n}</Link> : <span className="text-[28px] text-[#5f6b7a]">{n}</span>}</div>
          ))}
        </div>
      </Panel>
      <Panel title="AWS Account">
        <KV items={[['Account ID', c.accountId], ['Account Alias', 'Create'], ['Sign-in URL for IAM users in this account', `https://${c.accountId}.signin.aws.amazon.com/console`]]} />
      </Panel>
      {mfa && <MfaModal who="root" onClose={() => setMfa(false)} onDone={(d) => setRootMfa(true, `EnableMFADevice ${d} (root user)`)} />}
    </Page>
  );
}
