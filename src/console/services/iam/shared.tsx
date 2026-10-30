// Small helpers shared by the IAM pages.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { IamPolicy } from '../../../cloud/types';
import { Alert, Button, Field, Input, Modal, Radios, Teach, useCloud } from '../../kit';

export const iamArn = (acct: string, kind: 'user' | 'group' | 'role' | 'mfa', name: string) => `arn:aws:iam::${acct}:${kind}/${name}`;
export const policyArn = (acct: string, p: IamPolicy) => (p.managedBy === 'aws' ? `arn:aws:iam::aws:policy/${p.name}` : `arn:aws:iam::${acct}:policy/${p.name}`);

/** IAM name rules: letters, digits and +=,.@_- ; unique ignoring case. */
export function nameError(name: string, taken: string[], max = 64): string | undefined {
  if (!name) return 'Name is required.';
  if (name.length > max) return `Maximum ${max} characters.`;
  if (!/^[\w+=,.@-]+$/.test(name)) return 'Use alphanumeric and "+=,.@-_" characters only.';
  if (taken.some((t) => t.toLowerCase() === name.toLowerCase())) return 'An entity with this name already exists (names are case-insensitive).';
}

export const Json = ({ value }: { value: string | object }) => (
  <pre className="bg-[#0f1b2a] text-[#d1f5d3] rounded-lg p-4 text-[12.5px] overflow-x-auto font-mono">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
);

export const PolicyLink = ({ p }: { p: IamPolicy }) => <Link to={`/console/iam/policies/${p.id}`}>{p.name}</Link>;
export const policyType = (p: IamPolicy) => (p.managedBy === 'aws' ? 'AWS managed' : 'Customer managed');

/** Checkbox table of policies with a filter, like the "Permissions policies" picker. */
export function PolicyPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const policies = useCloud((c) => c.iamPolicies);
  const [q, setQ] = useState('');
  const shown = policies.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input className="aws-input mb-2 max-w-[420px]" placeholder="🔍 Filter policies by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="border border-[#e9ebed] rounded-lg max-h-72 overflow-y-auto">
        <table className="aws-table w-full text-[14px]">
          <thead><tr><th className="w-8" /><th>Policy name</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => onChange(value.includes(p.id) ? value.filter((x) => x !== p.id) : [...value, p.id])}>
                <td><input type="checkbox" readOnly checked={value.includes(p.id)} aria-label={`Select ${p.name}`} /></td>
                <td className="font-semibold">{p.name}</td><td className="whitespace-nowrap">{policyType(p)}</td><td className="text-[#5f6b7a]">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="aws-hint mt-1">{value.length} selected</div>
    </div>
  );
}

// --- Trust policies (role.trustedEntity is the principal string) ---
export const SERVICE_PRINCIPALS = [
  { value: 'ec2.amazonaws.com', label: 'EC2', desc: 'Allows EC2 instances to call AWS services on your behalf.' },
  { value: 'lambda.amazonaws.com', label: 'Lambda', desc: 'Allows Lambda functions to call AWS services on your behalf.' },
  { value: 'ecs-tasks.amazonaws.com', label: 'Elastic Container Service Task', desc: 'Allows ECS tasks to call AWS services on your behalf.' },
];
export const WEB_IDPS = [
  { value: 'cognito-identity.amazonaws.com', label: 'Amazon Cognito' },
  { value: 'www.amazon.com', label: 'Login with Amazon' },
  { value: 'graph.facebook.com', label: 'Facebook' },
  { value: 'accounts.google.com', label: 'Google' },
];
export type TrustKind = 'service' | 'account' | 'web' | 'saml';
export function trustKind(e: string): TrustKind {
  if (WEB_IDPS.some((w) => w.value === e)) return 'web';
  if (e.includes(':saml-provider/')) return 'saml';
  if (e.startsWith('arn:aws:iam::')) return 'account';
  return 'service';
}
export function trustLabel(e: string) {
  const k = trustKind(e);
  if (k === 'service') return `AWS Service: ${e.replace('.amazonaws.com', '')}`;
  if (k === 'account') return `Account: ${e.split(':')[4]}`;
  if (k === 'web') return `Identity Provider: ${e}`;
  return `Identity Provider: ${e.split('/').pop()} (SAML)`;
}
export function trustPolicy(e: string) {
  const k = trustKind(e);
  const stmt =
    k === 'service' ? { Effect: 'Allow', Principal: { Service: e }, Action: 'sts:AssumeRole' }
    : k === 'account' ? { Effect: 'Allow', Principal: { AWS: e }, Action: 'sts:AssumeRole' }
    : k === 'web' ? { Effect: 'Allow', Principal: { Federated: e }, Action: 'sts:AssumeRoleWithWebIdentity', Condition: { StringEquals: { [`${e}:aud`]: e === 'cognito-identity.amazonaws.com' ? 'us-east-1:identity-pool-id' : 'your-app-id' } } }
    : { Effect: 'Allow', Principal: { Federated: e }, Action: 'sts:AssumeRoleWithSAML', Condition: { StringEquals: { 'SAML:aud': 'https://signin.aws.amazon.com/saml' } } };
  return { Version: '2012-10-17', Statement: [stmt] };
}

// --- Virtual MFA flow (root and IAM users) ---
function FakeQr() {
  const n = 25;
  let s = 7;
  const cells: [number, number][] = [];
  const finder = (x: number, y: number) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([a, b]) => x >= a && x < a + 7 && y >= b && y < b + 7);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    if (!finder(x, y) && s % 3 === 0) cells.push([x, y]);
  }
  const eye = (x: number, y: number) => <g key={`${x}${y}`}><rect x={x} y={y} width={7} height={7} fill="#000" /><rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" /><rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" /></g>;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={170} height={170} className="border border-[#e9ebed] rounded bg-white" role="img" aria-label="QR code placeholder">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />)}
      {eye(0, 0)}{eye(n - 7, 0)}{eye(0, n - 7)}
    </svg>
  );
}

export function MfaModal({ who, onDone, onClose }: { who: string; onDone: (deviceName: string) => void; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(`${who === 'root' ? 'root' : who}-phone`);
  const [type, setType] = useState<'app' | 'passkey' | 'hardware'>('app');
  const [secret, setSecret] = useState(false);
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const six = (v: string) => /^\d{6}$/.test(v);
  const codesOk = six(c1) && six(c2) && c1 !== c2;
  const finish = () => { onDone(name); onClose(); };
  return (
    <Modal title={step === 1 ? 'Select MFA device' : 'Set up device'} onClose={onClose}
      footer={step === 1
        ? <><Button onClick={onClose}>Cancel</Button><Button primary disabled={!name} onClick={() => setStep(2)}>Next</Button></>
        : <><Button onClick={() => setStep(1)}>Previous</Button>{type === 'passkey' ? <Button primary onClick={finish}>Register passkey (simulated)</Button> : <Button primary disabled={!codesOk} onClick={finish}>Add MFA</Button>}</>}>
      {step === 1 ? (
        <>
          <Field label="Device name" hint="A meaningful name to identify this device."><Input value={name} onChange={(e) => setName(e.target.value.replace(/[^\w+=,.@-]/g, ''))} /></Field>
          <div className="aws-label mb-1">MFA device</div>
          <Radios value={type} onChange={setType} options={[
            { value: 'passkey', label: 'Passkey or security key', desc: 'Authenticate using your fingerprint, face, or screen lock, or a FIDO security key.' },
            { value: 'app', label: 'Authenticator app', desc: 'Authenticate using a code generated by an app installed on your mobile device.' },
            { value: 'hardware', label: 'Hardware TOTP token', desc: 'Authenticate using a code generated by a hardware token.' },
          ]} />
          <Teach title="Why MFA">MFA adds "something you have" to "something you know". The exam answer for "protect the root user" is always: enable MFA, delete root access keys, and lock the credentials away.</Teach>
        </>
      ) : type === 'passkey' ? (
        <Alert>Your browser would now ask you to touch your security key or use your device's screen lock. In this simulation, just click <b>Register passkey</b>.</Alert>
      ) : (
        <ol className="list-decimal pl-5 space-y-3 text-[14px]">
          {type === 'app' ? (
            <>
              <li>Install a compatible authenticator app on your phone (e.g. Google Authenticator, Microsoft Authenticator, Authy).</li>
              <li>Open the app and scan this QR code{' '}
                <span className="link" onClick={() => setSecret(!secret)}>or {secret ? 'hide' : 'show'} secret key</span>.
                <div className="mt-2 flex items-center gap-4"><FakeQr />{secret && <code className="break-all text-[12px]">JBSWY3DPEHPK3PXPMOCKSECRETKEY2FA</code>}</div>
              </li>
            </>
          ) : <li>Type the serial number printed on the back of your token. <Input className="mt-1" placeholder="GAHT12345678" /></li>}
          <li>Type two <b>consecutive</b> codes from the device (any two different 6-digit numbers in this simulation).
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Field label="MFA code 1" error={c1 && !six(c1) ? 'Enter 6 digits.' : undefined}><Input inputMode="numeric" maxLength={6} value={c1} onChange={(e) => setC1(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="MFA code 2" error={c2 && !six(c2) ? 'Enter 6 digits.' : six(c1) && c1 === c2 ? 'Codes must be consecutive (different).' : undefined}><Input inputMode="numeric" maxLength={6} value={c2} onChange={(e) => setC2(e.target.value.replace(/\D/g, ''))} /></Field>
            </div>
          </li>
        </ol>
      )}
    </Modal>
  );
}
