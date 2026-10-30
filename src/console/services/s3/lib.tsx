// Shared S3 helpers: naming rules, storage classes, version logic, policy templates.
import type { ReactNode } from 'react';
import type { Bucket, S3Object, StorageClass } from '../../../cloud/types';

/** A labelled group for radios/checkboxes (kit's Field is a <label>, which misbehaves around several inputs). */
export function Group({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="aws-label">{label}</div>
      {hint && <div className="aws-hint mb-1">{hint}</div>}
      {children}
      {error && <div className="text-[#d91515] text-[12px] mt-1">⊗ {error}</div>}
    </div>
  );
}

export const arn = (b: { name: string }) => `arn:aws:s3:::${b.name}`;
export const websiteEndpoint = (b: Bucket) => `http://${b.name}.s3-website-${b.region}.amazonaws.com`;
export const restDomain = (b: Bucket) => `${b.name}.s3.${b.region}.amazonaws.com`;

// ponytail: a fixed list stands in for "taken by another AWS account" in the global namespace.
const TAKEN_ELSEWHERE = ['test', 'bucket', 'my-bucket', 'mybucket', 'example', 'data', 'backup', 'backups', 'logs', 'images', 'assets', 'static', 'www', 'aws', 's3', 'files', 'uploads'];

export function bucketNameError(name: string, existing: Bucket[]): string | undefined {
  if (!name) return 'Bucket name is required.';
  if (name.length < 3 || name.length > 63) return 'Bucket name must be between 3 and 63 characters long.';
  if (/[A-Z]/.test(name)) return 'Bucket name must not contain uppercase characters.';
  if (name.includes('_')) return 'Bucket name must not contain underscores.';
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) return 'Bucket name can contain only lowercase letters, numbers, dots (.) and hyphens (-), and must begin and end with a letter or number.';
  if (name.includes('..')) return 'Bucket name must not contain two adjacent periods.';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return 'Bucket name must not be formatted as an IP address.';
  if (name.startsWith('xn--') || name.startsWith('sthree-') || name.endsWith('-s3alias') || name.endsWith('--ol-s3')) return 'Bucket name must not use a reserved prefix or suffix.';
  if (existing.some((b) => b.name === name)) return 'A bucket with the same name already exists in your account.';
  if (TAKEN_ELSEWHERE.includes(name)) return 'Bucket with the same name already exists. Bucket names are globally unique across all AWS accounts.';
}

export const CLASSES: { id: StorageClass; label: string; minDays: number; retrieval: string; azs: string }[] = [
  { id: 'STANDARD', label: 'Standard', minDays: 0, retrieval: 'Milliseconds, no retrieval fee', azs: '≥3 AZs' },
  { id: 'INTELLIGENT_TIERING', label: 'Intelligent-Tiering', minDays: 0, retrieval: 'Milliseconds; moves objects between tiers by access pattern for a small monitoring fee', azs: '≥3 AZs' },
  { id: 'STANDARD_IA', label: 'Standard-IA', minDays: 30, retrieval: 'Milliseconds, per-GB retrieval fee; 128 KB minimum billable size', azs: '≥3 AZs' },
  { id: 'ONEZONE_IA', label: 'One Zone-IA', minDays: 30, retrieval: 'Milliseconds, per-GB retrieval fee; data lost if the AZ is lost', azs: '1 AZ' },
  { id: 'GLACIER_IR', label: 'Glacier Instant Retrieval', minDays: 90, retrieval: 'Milliseconds, higher retrieval fee', azs: '≥3 AZs' },
  { id: 'GLACIER', label: 'Glacier Flexible Retrieval', minDays: 90, retrieval: 'Restore first: expedited 1–5 min, standard 3–5 h, bulk 5–12 h', azs: '≥3 AZs' },
  { id: 'DEEP_ARCHIVE', label: 'Glacier Deep Archive', minDays: 180, retrieval: 'Restore first: standard within 12 h, bulk within 48 h', azs: '≥3 AZs' },
];
export const classInfo = (id: StorageClass) => CLASSES.find((c) => c.id === id) ?? CLASSES[0];

/** Validate a lifecycle waterfall the way S3 does. Returns errors (blocking) and warnings (early-deletion fees). */
export function lifecycleIssues(transitions: { days: number; storageClass: StorageClass }[], expireDays?: number) {
  const errors: string[] = [], warnings: string[] = [];
  const order = CLASSES.map((c) => c.id);
  let prev: { days: number; storageClass: StorageClass } | undefined;
  for (const t of transitions) {
    const info = classInfo(t.storageClass);
    if (!(t.days >= 0) || !Number.isInteger(t.days)) errors.push(`${info.label}: days must be a whole number.`);
    if ((t.storageClass === 'STANDARD_IA' || t.storageClass === 'ONEZONE_IA') && t.days < 30) errors.push(`${info.label}: objects must be at least 30 days old before transitioning to ${info.label}.`);
    if (prev) {
      if (order.indexOf(t.storageClass) <= order.indexOf(prev.storageClass)) errors.push(`${info.label}: each transition must go to a colder class than the one before (${classInfo(prev.storageClass).label}).`);
      if (t.days <= prev.days) errors.push(`${info.label}: days must be greater than the previous transition (${prev.days}).`);
      const pmin = classInfo(prev.storageClass).minDays;
      if ((prev.storageClass === 'STANDARD_IA' || prev.storageClass === 'ONEZONE_IA') && t.days - prev.days < pmin) errors.push(`${info.label}: must be at least ${pmin} days after the ${classInfo(prev.storageClass).label} transition (its minimum storage duration).`);
      else if (t.days - prev.days < pmin) warnings.push(`Objects leave ${classInfo(prev.storageClass).label} before its ${pmin}-day minimum: you pay an early-deletion charge for the remainder.`);
    }
    prev = t;
  }
  if (expireDays !== undefined) {
    if (!(expireDays > 0)) errors.push('Expiration days must be at least 1.');
    else if (prev && expireDays <= prev.days) errors.push(`Expiration (${expireDays}) must be after the last transition (${prev.days}).`);
    else if (prev && expireDays - prev.days < classInfo(prev.storageClass).minDays) warnings.push(`Objects expire before ${classInfo(prev.storageClass).label}'s ${classInfo(prev.storageClass).minDays}-day minimum: early-deletion charge applies.`);
  }
  return { errors, warnings };
}

export const versionId = () => Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');

/** Versions of every key, newest first. */
export function versionsByKey(objects: S3Object[]) {
  const m = new Map<string, S3Object[]>();
  for (const o of objects) m.set(o.key, [...(m.get(o.key) ?? []), o]);
  for (const v of m.values()) v.sort((a, b) => b.lastModified - a.lastModified);
  return m;
}
/** What a plain GET/LIST sees: the latest version of each key, unless it is a delete marker. */
export const currentObjects = (objects: S3Object[]) => [...versionsByKey(objects).values()].map((v) => v[0]).filter((o) => !o.isDeleteMarker);

/** PUT semantics: versioning on keeps old versions; off/suspended overwrites the "null" version. */
export function putObject(b: Bucket, o: Omit<S3Object, 'versionId' | 'lastModified' | 'encryption'>): S3Object {
  const obj: S3Object = { ...o, versionId: b.versioning === 'Enabled' ? versionId() : 'null', lastModified: Date.now(), encryption: b.defaultEncryption };
  if (b.versioning === 'Disabled') b.objects = b.objects.filter((x) => x.key !== o.key);
  if (b.versioning === 'Suspended') b.objects = b.objects.filter((x) => !(x.key === o.key && x.versionId === 'null'));
  b.objects.push(obj);
  return obj;
}

/** DELETE without a version id. Returns what happened, for the log. */
export function deleteObject(b: Bucket, key: string): string {
  if (b.versioning === 'Disabled') { b.objects = b.objects.filter((x) => x.key !== key); return `Permanently deleted ${key}`; }
  if (b.versioning === 'Suspended') b.objects = b.objects.filter((x) => !(x.key === key && x.versionId === 'null'));
  b.objects.push({ key, sizeKb: 0, storageClass: 'STANDARD', versionId: b.versioning === 'Enabled' ? versionId() : 'null', isDeleteMarker: true, lastModified: Date.now(), encryption: 'none' });
  return `Delete marker created for ${key}`;
}

export function policyTemplate(kind: 'oac' | 'tls', bucket: string, accountId: string, distributionId = 'EDFDVBD6EXAMPLE') {
  return kind === 'oac'
    ? {
        Sid: 'AllowCloudFrontServicePrincipalReadOnly', Effect: 'Allow', Principal: { Service: 'cloudfront.amazonaws.com' }, Action: 's3:GetObject', Resource: `arn:aws:s3:::${bucket}/*`,
        Condition: { StringEquals: { 'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${distributionId}` } },
      }
    : {
        Sid: 'DenyInsecureTransport', Effect: 'Deny', Principal: '*', Action: 's3:*', Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
        Condition: { Bool: { 'aws:SecureTransport': 'false' } },
      };
}

export const policyDoc = (statements: object[]) => JSON.stringify({ Version: '2012-10-17', Statement: statements }, null, 2);

/** Validate a bucket policy like PutBucketPolicy does. */
export function policyError(text: string, b: Bucket): string | undefined {
  if (!text.trim()) return;
  let doc: { Statement?: unknown };
  try { doc = JSON.parse(text); } catch (e) { return `Policy has invalid JSON: ${(e as Error).message}`; }
  const sts = Array.isArray(doc.Statement) ? doc.Statement : doc.Statement ? [doc.Statement] : [];
  if (!sts.length) return 'Missing required field Statement.';
  for (const [i, s] of (sts as Record<string, unknown>[]).entries()) {
    if (s.Effect !== 'Allow' && s.Effect !== 'Deny') return `Statement ${i + 1}: Effect must be "Allow" or "Deny".`;
    if (!s.Action && !s.NotAction) return `Statement ${i + 1}: missing Action.`;
    if (!s.Principal && !s.NotPrincipal) return `Statement ${i + 1}: bucket policies need a Principal.`;
    const res = ([] as unknown[]).concat(s.Resource ?? []);
    if (!res.length) return `Statement ${i + 1}: missing Resource.`;
    if (res.some((r) => typeof r !== 'string' || !(r === arn(b) || r.startsWith(arn(b) + '/')))) return `Statement ${i + 1}: Policy has invalid resource. Resources must be ${arn(b)} or ${arn(b)}/*.`;
    const p = s.Principal as unknown;
    const isPublic = p === '*' || (typeof p === 'object' && p !== null && (p as { AWS?: unknown }).AWS === '*');
    if (s.Effect === 'Allow' && isPublic && !s.Condition && b.blockPublicAccess) return 'Access denied: this policy grants public access and Block Public Access (BlockPublicPolicy) is on. Turn it off first if you really mean it.';
  }
}
