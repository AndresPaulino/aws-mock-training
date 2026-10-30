// IAM policy simulator: evaluates a principal's policies for one action + resource and explains every step.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, Input, Page, Panel, Select, Table, Teach, useCloud } from '../../kit';
import { PolicyLink, policyType } from './shared';
import { attachedPolicies, evaluate, type Decision, type Evaluation, type Principal, type StmtResult } from './policyEval';

const ACTIONS = ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:DeleteBucket', 'ec2:RunInstances', 'ec2:TerminateInstances', 'ec2:DescribeInstances', 'iam:CreateUser', 'iam:ChangePassword', 'dynamodb:PutItem', 'dynamodb:GetItem', 'kms:Decrypt', 'kms:Encrypt', 'sqs:SendMessage', 'lambda:InvokeFunction', 'logs:PutLogEvents', 'cloudwatch:PutMetricData'];

const DECISION: Record<Decision, { label: string; color: string; bg: string; icon: string }> = {
  allowed: { label: 'allowed', color: '#037f0c', bg: '#f2fcf3', icon: '✓' },
  explicitDeny: { label: 'denied (explicit deny)', color: '#d91515', bg: '#fff7f7', icon: '⊗' },
  implicitDeny: { label: 'denied (implicitly denied)', color: '#8d6605', bg: '#fffce9', icon: '⊘' },
};
const OUTCOME = { pass: ['✓', '#037f0c'], fail: ['✕', '#d91515'], stop: ['■', '#d91515'], skip: ['–', '#5f6b7a'] } as const;

interface Run { who: string; action: string; resource: string; ev: Evaluation }

export function Simulator() {
  const c = useCloud((x) => ({ iamUsers: x.iamUsers, iamRoles: x.iamRoles, iamGroups: x.iamGroups, iamPolicies: x.iamPolicies, buckets: x.buckets, accountId: x.accountId }));
  const [params] = useSearchParams();
  const [initKind, initId] = (params.get('principal') ?? '').split(':');
  const [kind, setKind] = useState<'user' | 'role'>(initKind === 'role' ? 'role' : 'user');
  const [pid, setPid] = useState<string | null>(initId || null);
  const [action, setAction] = useState('s3:GetObject');
  const [resource, setResource] = useState('*');
  const [runs, setRuns] = useState<Run[]>([]);

  const user = kind === 'user' ? c.iamUsers.find((u) => u.id === pid) : undefined;
  const role = kind === 'role' ? c.iamRoles.find((r) => r.id === pid) : undefined;
  const principal: Principal | undefined = user ? { kind: 'user', user } : role ? { kind: 'role', role } : undefined;
  const attached = principal ? attachedPolicies(c, principal) : [];
  const boundary = user?.boundaryPolicyId ? c.iamPolicies.find((p) => p.id === user.boundaryPolicyId) : undefined;
  const actionErr = action && !/^[a-z0-9-]+:[A-Za-z0-9*?]+$/.test(action) ? 'Use service:Action, e.g. s3:GetObject.' : undefined;
  const resErr = resource !== '*' && !resource.startsWith('arn:') ? 'Use * or a full ARN, e.g. arn:aws:s3:::my-bucket/report.csv' : undefined;
  const arns = ['*', ...c.buckets.flatMap((b) => [`arn:aws:s3:::${b.name}`, `arn:aws:s3:::${b.name}/*`]), `arn:aws:iam::${c.accountId}:user/${user?.name ?? 'alice'}`];

  const run = () => principal && setRuns((r) => [{ who: `${kind === 'user' ? 'User' : 'Role'}: ${user?.name ?? role?.name}`, action, resource, ev: evaluate(c, principal, action, resource) }, ...r].slice(0, 8));
  const last = runs[0];
  const s3Trap = last && /^s3:(Get|Put|Delete)Object/i.test(last.action) && last.resource.startsWith('arn:aws:s3:::') && !last.resource.includes('/');

  return (
    <Page title="IAM Policy Simulator" crumbs={[{ label: 'IAM', to: '/console/iam' }, { label: 'Policy simulator' }]}>
      <Teach title="How IAM decides">Every request starts as an <b>implicit deny</b>. IAM gathers every applicable policy, then: (1) any matching explicit <b>Deny</b> wins, full stop; (2) otherwise an explicit <b>Allow</b> is needed; (3) if a permissions boundary (or SCP) exists, it must <i>also</i> allow the action. Anything not allowed stays implicitly denied.</Teach>
      <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div>
          <Panel title="Users and roles">
            <div className="mb-3"><Select value={kind} onChange={(v) => { setKind(v as 'user' | 'role'); setPid(null); }} options={[{ value: 'user', label: 'Users' }, { value: 'role', label: 'Roles' }]} /></div>
            <Table rows={(kind === 'user' ? c.iamUsers : c.iamRoles) as { id: string; name: string }[]} selected={pid} onSelect={setPid} columns={[{ header: 'Name', cell: (x) => x.name }]}
              empty={kind === 'user' ? 'No IAM users yet. Create one in Users.' : 'No roles yet. Create one in Roles.'} />
          </Panel>
          {principal && (
            <Panel title="Policies that apply" counter={attached.length + (boundary ? 1 : 0)}>
              {attached.length || boundary ? (
                <ul className="text-[14px] space-y-1">
                  {attached.map((a) => <li key={a.policy.id + a.source}><PolicyLink p={a.policy} /> <span className="aws-hint">· {policyType(a.policy)} · {a.source}</span></li>)}
                  {boundary && <li><PolicyLink p={boundary} /> <span className="aws-hint">· Permissions boundary (caps, never grants)</span></li>}
                </ul>
              ) : <p className="text-[#5f6b7a]">No policies. Every action will be implicitly denied.</p>}
            </Panel>
          )}
        </div>
        <div className="min-w-0">
          <Panel title="Policy Simulator" desc="Choose an action and the resource it acts on, then run the simulation.">
            <div className="grid gap-x-4 md:grid-cols-2">
              <Field label="Action" hint="service:Action (wildcards allowed in policies, not here)" error={actionErr}>
                <Input list="sim-actions" value={action} onChange={(e) => setAction(e.target.value.trim())} />
              </Field>
              <Field label="Resource ARN" hint="* means any resource" error={resErr}>
                <Input list="sim-arns" value={resource} onChange={(e) => setResource(e.target.value.trim())} />
              </Field>
            </div>
            <datalist id="sim-actions">{ACTIONS.map((a) => <option key={a} value={a} />)}</datalist>
            <datalist id="sim-arns">{arns.map((a) => <option key={a} value={a} />)}</datalist>
            <div className="flex flex-wrap gap-2 items-center">
              <Button primary disabled={!principal || !action || !!actionErr || !!resErr} onClick={run}>Run simulation</Button>
              {!principal && <span className="aws-hint">Select a user or role first.</span>}
              {runs.length > 0 && <Button onClick={() => setRuns([])}>Clear results</Button>}
            </div>
          </Panel>

          {last && <Result run={last} s3Trap={!!s3Trap} />}

          {runs.length > 1 && (
            <Panel title="Previous simulations" counter={runs.length - 1}>
              <Table rows={runs.slice(1).map((r, i) => ({ id: String(i), ...r }))} columns={[
                { header: 'Principal', cell: (r) => r.who }, { header: 'Action', cell: (r) => <code>{r.action}</code> }, { header: 'Resource', cell: (r) => <code className="break-all">{r.resource}</code> },
                { header: 'Result', cell: (r) => <span style={{ color: DECISION[r.ev.decision].color }}>{DECISION[r.ev.decision].icon} {DECISION[r.ev.decision].label}</span> },
              ]} />
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
}

function Result({ run, s3Trap }: { run: Run; s3Trap: boolean }) {
  const d = DECISION[run.ev.decision];
  const conds = [...run.ev.identity, ...(run.ev.boundary ?? [])].some((r) => r.applies && r.hasCondition);
  return (
    <>
      <div className="rounded-xl border-2 px-5 py-4 mb-5" style={{ borderColor: d.color, background: d.bg }}>
        <div className="text-[13px] text-[#414d5c]">{run.who} · <code>{run.action}</code> on <code className="break-all">{run.resource}</code></div>
        <div className="text-[22px] font-bold" style={{ color: d.color }}>{d.icon} {d.label}</div>
      </div>

      <Panel title="Evaluation trace" desc="The steps IAM takes, in order. Evaluation stops at the first ■.">
        <ol className="space-y-2">
          {run.ev.steps.map((s, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-white text-[12px] font-bold" style={{ background: OUTCOME[s.outcome][1] }}>{i + 1}</span>
              <div><div className="font-bold">{s.label} <span style={{ color: OUTCOME[s.outcome][1] }}>{OUTCOME[s.outcome][0]}</span></div><div className="text-[14px] text-[#414d5c]">{s.detail}</div></div>
            </li>
          ))}
        </ol>
        {run.ev.decision === 'explicitDeny' && <Teach title="Explicit deny">It doesn't matter how many policies allow this, or that one of them is AdministratorAccess. One matching Deny overrides every Allow. That's how guardrails (SCPs, boundaries, "deny unless MFA" policies) work.</Teach>}
        {run.ev.decision === 'implicitDeny' && run.ev.boundary && run.ev.identity.some((r) => r.applies && r.effect === 'Allow') && <Teach title="Boundary intersection">The identity policy allows it but the boundary doesn't, so it's denied. Effective permissions = identity policies ∩ permissions boundary. A boundary alone grants nothing.</Teach>}
        {run.ev.decision === 'implicitDeny' && !run.ev.identity.some((r) => r.applies) && <Teach title="Implicit deny">Nothing denied this explicitly; nothing allowed it either. IAM is deny-by-default, so you must grant every action you need.</Teach>}
        {s3Trap && <Alert kind="warning">Object actions like <code>{run.action}</code> act on object ARNs (<code>{run.resource}/key</code>), not the bucket ARN. A policy with <code>Resource: "{run.resource}"</code> would not allow reading objects; you need <code>{run.resource}/*</code>.</Alert>}
        {conds && <Alert>Some matching statements have a <b>Condition</b>. This simulator assumes conditions are met; the real simulator lets you supply context keys (aws:SourceIp, aws:MultiFactorAuthPresent…).</Alert>}
      </Panel>

      <StatementTable title="Identity-based policy statements" rows={run.ev.identity} empty="The principal has no identity-based policies." />
      {run.ev.boundary && <StatementTable title={`Permissions boundary: ${run.ev.boundaryPolicy!.name}`} rows={run.ev.boundary} empty="The boundary has no statements." />}
      <Teach title="What this simulator leaves out">Real evaluation also includes Organizations SCPs (cap the whole account), resource-based policies (bucket policies, key policies; these can grant cross-account access), and session policies. Explicit deny in any of them still wins.</Teach>
    </>
  );
}

function StatementTable({ title, rows, empty }: { title: string; rows: StmtResult[]; empty: string }) {
  return (
    <Panel title={title} counter={rows.length}>
      <Table rows={rows.map((r, i) => ({ ...r, id: String(i) }))} empty={empty} columns={[
        { header: 'Policy', cell: (r) => <span><b>{r.policy.name}</b><span className="aws-hint block">{r.source}</span></span> },
        { header: 'Statement', cell: (r) => r.sid ?? `#${r.idx + 1}` },
        { header: 'Effect', cell: (r) => <span style={{ color: r.effect === 'Deny' ? '#d91515' : '#037f0c', fontWeight: 700 }}>{r.effect}</span> },
        { header: 'Action', cell: (r) => <span style={{ color: r.actionMatch ? '#037f0c' : '#5f6b7a' }}>{r.actionMatch ? '✓' : '✕'} {r.actionWhy}</span> },
        { header: 'Resource', cell: (r) => <span className="break-all" style={{ color: r.resourceMatch ? '#037f0c' : '#5f6b7a' }}>{r.resourceMatch ? '✓' : '✕'} {r.resourceWhy}</span> },
        { header: 'Result', cell: (r) => (r.applies ? <b style={{ color: r.effect === 'Deny' ? '#d91515' : '#037f0c' }}>Matches → {r.effect}</b> : <span className="text-[#5f6b7a]">Does not apply</span>) },
      ]} />
    </Panel>
  );
}
