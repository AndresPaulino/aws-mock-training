// IAM policy parsing, validation and evaluation (identity policies + permissions boundary).
// Pure functions: the policy simulator renders the trace these return.
import type { CloudState, IamPolicy, IamRole, IamUser } from '../../../cloud/types';

export interface Stmt { Sid?: string; Effect: string; Action?: string | string[]; NotAction?: string | string[]; Resource?: string | string[]; NotResource?: string | string[]; Condition?: unknown }

const list = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

export function statements(doc: string): Stmt[] {
  try {
    const d = JSON.parse(doc);
    return Array.isArray(d.Statement) ? d.Statement : d.Statement ? [d.Statement] : [];
  } catch { return []; }
}

/** Validate a policy document the way the IAM JSON editor does. Returns error messages (empty = valid). */
export function validatePolicy(doc: string): string[] {
  let d: unknown;
  try { d = JSON.parse(doc); } catch (e) { return [`Invalid JSON: ${(e as Error).message}`]; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return ['The policy must be a JSON object.'];
  const p = d as Record<string, unknown>;
  const errs: string[] = [];
  if (p.Version !== undefined && p.Version !== '2012-10-17' && p.Version !== '2008-10-17') errs.push('Version must be "2012-10-17".');
  if (!p.Statement) return [...errs, 'Missing required element "Statement".'];
  const sts = Array.isArray(p.Statement) ? p.Statement : [p.Statement];
  if (!sts.length) errs.push('"Statement" must contain at least one statement.');
  sts.forEach((s: Record<string, unknown>, i: number) => {
    const w = `Statement ${i + 1}`;
    if (!s || typeof s !== 'object') return errs.push(`${w}: must be an object.`);
    if (s.Effect !== 'Allow' && s.Effect !== 'Deny') errs.push(`${w}: "Effect" must be "Allow" or "Deny".`);
    if ((s.Action === undefined) === (s.NotAction === undefined)) errs.push(`${w}: needs exactly one of "Action" or "NotAction".`);
    if ((s.Resource === undefined) === (s.NotResource === undefined)) errs.push(`${w}: needs exactly one of "Resource" or "NotResource" (identity policies always need a resource).`);
    if (s.Principal !== undefined) errs.push(`${w}: "Principal" is not allowed in identity-based policies (it belongs in resource-based and trust policies).`);
    for (const a of [...list(s.Action), ...list(s.NotAction)]) if (a !== '*' && !/^[a-z0-9*?-]+:[A-Za-z0-9*?]+$/.test(a)) errs.push(`${w}: action "${a}" must look like service:Action (e.g. s3:GetObject).`);
    for (const r of [...list(s.Resource), ...list(s.NotResource)]) if (r !== '*' && !r.startsWith('arn:')) errs.push(`${w}: resource "${r}" must be "*" or an ARN.`);
  });
  return errs;
}

/** IAM wildcard match: * = any run of characters, ? = one character. */
export function wildMatch(pattern: string, value: string, caseInsensitive = false): boolean {
  const re = '^' + pattern.split('').map((ch) => (ch === '*' ? '.*' : ch === '?' ? '.' : ch.replace(/[.+^${}()|[\]\\]/g, '\\$&'))).join('') + '$';
  return new RegExp(re, caseInsensitive ? 'i' : '').test(value);
}

export type Principal = { kind: 'user'; user: IamUser } | { kind: 'role'; role: IamRole };
export interface Attached { policy: IamPolicy; source: string }

/** Every identity-based policy that applies to the principal, with where it came from. */
export function attachedPolicies(c: Pick<CloudState, 'iamPolicies' | 'iamGroups'>, p: Principal): Attached[] {
  const pol = (id: string) => c.iamPolicies.find((x) => x.id === id);
  const out: Attached[] = [];
  const ids = p.kind === 'user' ? p.user.policyIds : p.role.policyIds;
  for (const id of ids) { const x = pol(id); if (x) out.push({ policy: x, source: 'Attached directly' }); }
  if (p.kind === 'user') for (const gid of p.user.groupIds) {
    const g = c.iamGroups.find((x) => x.id === gid);
    for (const id of g?.policyIds ?? []) { const x = pol(id); if (x) out.push({ policy: x, source: `Group: ${g!.name}` }); }
  }
  return out;
}

export interface StmtResult {
  policy: IamPolicy; source: string; idx: number; sid?: string; effect: 'Allow' | 'Deny';
  actionMatch: boolean; actionWhy: string; resourceMatch: boolean; resourceWhy: string; hasCondition: boolean; applies: boolean;
}

function evalStmt(a: Attached, s: Stmt, idx: number, action: string, resource: string, username?: string): StmtResult {
  const sub = (r: string) => (username ? r.replaceAll('${aws:username}', username) : r);
  let actionMatch: boolean, actionWhy: string;
  if (s.Action !== undefined) {
    const hit = list(s.Action).find((x) => wildMatch(x, action, true));
    actionMatch = !!hit;
    actionWhy = hit ? `Action "${hit}" matches ${action}` : `None of [${list(s.Action).join(', ')}] match ${action}`;
  } else {
    const hit = list(s.NotAction).find((x) => wildMatch(x, action, true));
    actionMatch = !hit;
    actionWhy = hit ? `NotAction "${hit}" excludes ${action}` : `${action} is not in NotAction [${list(s.NotAction).join(', ')}], so it matches`;
  }
  let resourceMatch: boolean, resourceWhy: string;
  if (s.Resource !== undefined) {
    const hit = list(s.Resource).find((x) => wildMatch(sub(x), resource));
    resourceMatch = !!hit;
    resourceWhy = hit ? `Resource "${sub(hit)}" matches` : `None of [${list(s.Resource).map(sub).join(', ')}] match ${resource}`;
  } else {
    const hit = list(s.NotResource).find((x) => wildMatch(sub(x), resource));
    resourceMatch = !hit;
    resourceWhy = hit ? `NotResource "${sub(hit)}" excludes it` : 'Not excluded by NotResource, so it matches';
  }
  const effect = s.Effect === 'Deny' ? 'Deny' : 'Allow';
  return { policy: a.policy, source: a.source, idx, sid: s.Sid, effect, actionMatch, actionWhy, resourceMatch, resourceWhy, hasCondition: s.Condition !== undefined, applies: actionMatch && resourceMatch };
}

export type Decision = 'allowed' | 'explicitDeny' | 'implicitDeny';
export interface Evaluation {
  decision: Decision;
  identity: StmtResult[];
  boundary?: StmtResult[];
  boundaryPolicy?: IamPolicy;
  /** The decision path, in the order IAM evaluates it. */
  steps: { label: string; outcome: 'pass' | 'fail' | 'skip' | 'stop'; detail: string }[];
}

export function evaluate(c: Pick<CloudState, 'iamPolicies' | 'iamGroups'>, p: Principal, action: string, resource: string): Evaluation {
  const username = p.kind === 'user' ? p.user.name : undefined;
  const run = (as: Attached[]) => as.flatMap((a) => statements(a.policy.document).map((s, i) => evalStmt(a, s, i, action, resource, username)));
  const identity = run(attachedPolicies(c, p));
  const bId = p.kind === 'user' ? p.user.boundaryPolicyId : undefined;
  const boundaryPolicy = bId ? c.iamPolicies.find((x) => x.id === bId) : undefined;
  const boundary = boundaryPolicy ? run([{ policy: boundaryPolicy, source: 'Permissions boundary' }]) : undefined;
  const name = (r: StmtResult) => `${r.policy.name} (statement ${r.sid ?? r.idx + 1})`;
  const steps: Evaluation['steps'] = [];
  const done = (decision: Decision): Evaluation => ({ decision, identity, boundary, boundaryPolicy, steps });

  steps.push({ label: 'Start with an implicit deny', outcome: 'pass', detail: 'Every request is denied by default. Something has to allow it.' });
  const denies = [...identity, ...(boundary ?? [])].filter((r) => r.applies && r.effect === 'Deny');
  if (denies.length) {
    steps.push({ label: 'Check for an explicit Deny', outcome: 'stop', detail: `Explicit Deny in ${denies.map(name).join(', ')}. An explicit Deny always wins; evaluation stops here.` });
    return done('explicitDeny');
  }
  steps.push({ label: 'Check for an explicit Deny', outcome: 'pass', detail: 'No statement in any applicable policy denies this request.' });
  const allows = identity.filter((r) => r.applies && r.effect === 'Allow');
  if (!allows.length) {
    steps.push({ label: 'Check identity-based policies for an Allow', outcome: 'stop', detail: identity.length ? 'No identity-based statement allows this action on this resource → implicit deny.' : 'The principal has no permissions policies at all → implicit deny.' });
    return done('implicitDeny');
  }
  steps.push({ label: 'Check identity-based policies for an Allow', outcome: 'pass', detail: `Allowed by ${allows.map(name).join(', ')}.` });
  if (!boundary) {
    steps.push({ label: 'Check the permissions boundary', outcome: 'skip', detail: 'No permissions boundary is set, so it does not limit anything.' });
    return done('allowed');
  }
  const bAllows = boundary.filter((r) => r.applies && r.effect === 'Allow');
  if (!bAllows.length) {
    steps.push({ label: 'Check the permissions boundary', outcome: 'stop', detail: `The boundary ${boundaryPolicy!.name} does not allow this action. Effective permissions are the intersection of identity policies AND the boundary → implicit deny.` });
    return done('implicitDeny');
  }
  steps.push({ label: 'Check the permissions boundary', outcome: 'pass', detail: `The boundary ${boundaryPolicy!.name} also allows it (${bAllows.map(name).join(', ')}).` });
  return done('allowed');
}
