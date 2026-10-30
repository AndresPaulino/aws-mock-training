// Storage & edge labs: S3 versioning, S3 lifecycle, CloudFront + OAC, Route 53 failover.
import type { Lab } from './index';
import type { Bucket, CloudState } from '../cloud/types';

/** The console logs "Delete marker created for <key> in <bucket>" / "Removed delete marker for <key> in <bucket>: object restored". */
const s3Log = (c: CloudState, b: Bucket, prefix: string) => c.events.some((e) => e.service === 's3' && e.msg.startsWith(prefix) && e.msg.includes(` in ${b.name}`));
const versioned = (c: CloudState) => c.buckets.filter((b) => b.versioning === 'Enabled');
const multiVersionKey = (b: Bucket) => {
  const n = new Map<string, number>();
  for (const o of b.objects) if (!o.isDeleteMarker) n.set(o.key, (n.get(o.key) ?? 0) + 1);
  return [...n.values()].some((x) => x >= 2);
};
const latestIsMarker = (b: Bucket, key: string) => [...b.objects].filter((o) => o.key === key).sort((a, z) => z.lastModified - a.lastModified)[0]?.isDeleteMarker;

const labs: Lab[] = [
  {
    id: 'lab-s3-versioning', title: 'Recover a deleted object with S3 Versioning', lessonId: 'm3a-s3-protection', minutes: 10, start: '/console/s3',
    intro: 'Versioning turns "delete" into "hide behind a delete marker". You will create a versioned bucket, overwrite an object, delete it, and bring it back.',
    steps: [
      {
        title: 'Create a bucket with versioning enabled',
        detail: 'Open **S3 › Create bucket**, choose a globally unique name, and set **Bucket Versioning** to **Enable**.',
        hint: 'Names like `my-versioning-lab-12345` work. Leave Block Public Access on.',
        check: (c) => versioned(c).length > 0,
      },
      {
        title: 'Upload the same object twice',
        detail: 'In the bucket\'s **Objects** tab, click **Create sample object** twice (or upload the same file twice). Turn on **Show versions**: there are now two versions of `sample.txt`.',
        hint: 'Both uploads must use the same key. Create sample object always writes `sample.txt`.',
        check: (c) => versioned(c).some(multiVersionKey),
      },
      {
        title: 'Delete the object',
        detail: 'With **Show versions** off, select the object and **Delete** it. S3 adds a delete marker; the object vanishes from the list.',
        hint: 'Do not delete a specific version (that is permanent). Delete with Show versions off.',
        check: (c) => versioned(c).some((b) => multiVersionKey(b) && (s3Log(c, b, 'Delete marker created for') || b.objects.some((o) => o.isDeleteMarker))),
      },
      {
        title: 'Recover it by deleting the delete marker',
        detail: 'Turn on **Show versions**, select the **Delete marker** row (it is the latest version) and delete it (or use **Restore**). The previous version becomes current again.',
        hint: 'Type "delete" to confirm. The object reappears when Show versions is off.',
        check: (c) => versioned(c).some((b) => multiVersionKey(b) && s3Log(c, b, 'Removed delete marker for') && b.objects.some((o) => !o.isDeleteMarker && !latestIsMarker(b, o.key))),
      },
    ],
    debrief: 'Versioning protects against accidental deletes and overwrites: a plain DELETE only adds a delete marker, and removing the marker restores the object. Exam pairings: **versioning + MFA Delete** to stop permanent deletes, **versioning is required for replication and Object Lock**, and old versions cost money, so add a noncurrent-version expiration lifecycle rule.',
  },
  {
    id: 'lab-s3-lifecycle', title: 'Build an S3 lifecycle waterfall', lessonId: 'm3a-s3-classes', minutes: 8, start: '/console/s3',
    intro: 'Logs are hot for a month, rarely read for a quarter, then only kept for compliance until they expire. Encode that in a lifecycle rule.',
    steps: [
      {
        title: 'Have a bucket',
        detail: 'Use any bucket, or create one in **S3 › Create bucket**.',
        hint: 'Defaults are fine.',
        check: (c) => c.buckets.length > 0,
      },
      {
        title: 'Transition to Standard-IA at 30 days',
        detail: 'Open the bucket, **Management** tab, **Create lifecycle rule**. Tick *Move current versions between storage classes* and add **Standard-IA** at **30** days.',
        hint: 'Try 20 days first: S3 refuses, because Standard-IA needs objects at least 30 days old.',
        check: (c) => c.buckets.some((b) => b.lifecycle.some((r) => r.transitions.some((t) => t.storageClass === 'STANDARD_IA' && t.days === 30))),
      },
      {
        title: 'Then Glacier Flexible Retrieval at 90 days',
        detail: 'In the same rule, **Add transition**: **Glacier Flexible Retrieval** at **90** days.',
        hint: 'Both transitions belong to one rule.',
        check: (c) => c.buckets.some((b) => b.lifecycle.some((r) => r.transitions.some((t) => t.storageClass === 'STANDARD_IA' && t.days === 30) && r.transitions.some((t) => t.storageClass === 'GLACIER' && t.days === 90))),
      },
      {
        title: 'Expire objects at 365 days',
        detail: 'Tick *Expire current versions of objects*, set **365** days, and **Create rule**.',
        hint: 'One rule should show Standard-IA @ 30d → Glacier Flexible Retrieval @ 90d, expiration 365 days.',
        check: (c) => c.buckets.some((b) => b.lifecycle.some((r) => r.expireDays === 365 && r.transitions.some((t) => t.storageClass === 'STANDARD_IA' && t.days === 30) && r.transitions.some((t) => t.storageClass === 'GLACIER' && t.days === 90))),
      },
    ],
    debrief: 'Lifecycle rules are the cost answer for data with a predictable access pattern (unpredictable means Intelligent-Tiering). Remember the minimum storage durations: **30 days** for Standard-IA/One Zone-IA (and no transition there before day 30), **90** for Glacier Instant/Flexible, **180** for Deep Archive. Glacier Flexible needs a restore (minutes to hours) before reads; Deep Archive up to 12–48 h.',
  },
  {
    id: 'lab-cloudfront', title: 'Serve a private bucket through CloudFront with OAC', lessonId: 'm3b-cloudfront', minutes: 12, start: '/console/s3',
    intro: 'Keep the bucket private, let only CloudFront read it, and force HTTPS. This is the reference pattern for static content on AWS.',
    steps: [
      {
        title: 'Create a private bucket',
        detail: 'In **S3 › Create bucket**, create a bucket and leave **Block all public access** on.',
        hint: 'All four Block Public Access boxes stay ticked (the default).',
        check: (c) => c.buckets.some((b) => b.blockPublicAccess),
      },
      {
        title: 'Create a distribution with that bucket as origin',
        detail: 'Open **CloudFront › Create distribution** and pick the bucket under **Origin domain** (the `bucket.s3.region.amazonaws.com` entry).',
        hint: 'Choose the Amazon S3 entry, not a custom origin.',
        check: (c) => c.distributions.some((d) => d.origins.some((o) => o.type === 's3' && c.buckets.some((b) => b.blockPublicAccess && o.target.startsWith(`${b.name}.s3.`)))),
      },
      {
        title: 'Use Origin Access Control and redirect HTTP to HTTPS',
        detail: 'In the wizard set **Origin access** to **Origin access control settings** and **Viewer protocol policy** to **Redirect HTTP to HTTPS**.',
        hint: 'If you already created a distribution without them, create another one: any distribution meeting all conditions counts.',
        check: (c) => c.distributions.some((d) => d.viewerProtocol === 'redirect-to-https' && d.origins.some((o) => o.type === 's3' && o.oac && c.buckets.some((b) => b.blockPublicAccess && o.target.startsWith(`${b.name}.s3.`)))),
      },
      {
        title: 'Grant the distribution access in the bucket policy',
        detail: 'On the distribution page, click **Apply policy to <bucket>** (or paste the statement into the bucket\'s **Permissions › Bucket policy**). Then **Simulate requests** and watch hits vs misses.',
        hint: 'The statement allows `cloudfront.amazonaws.com` to `s3:GetObject` when `AWS:SourceArn` is your distribution.',
        check: (c) => c.distributions.some((d) => d.viewerProtocol === 'redirect-to-https' && d.origins.some((o) => o.oac && c.buckets.some((b) => b.blockPublicAccess && o.target.startsWith(`${b.name}.s3.`) && !!b.policy?.includes(`distribution/${d.id}`)))),
      },
    ],
    debrief: 'OAC + Block Public Access is the answer whenever a question says "users must only access S3 content through CloudFront". It replaces the legacy OAI and supports SSE-KMS. Also remember: CloudFront certificates come from ACM in **us-east-1**, signed URLs (one file) vs signed cookies (many files) for private content, and Global Accelerator (static IPs, TCP/UDP, no caching) is the non-HTTP alternative.',
  },
  {
    id: 'lab-route53', title: 'Active-passive failover with Route 53', lessonId: 'm2-route53', minutes: 12, start: '/console/route53',
    intro: 'Point a name at a primary endpoint, keep a secondary on standby, and let a health check decide which one answers.',
    steps: [
      {
        title: 'Create a public hosted zone',
        detail: 'In **Route 53 › Hosted zones › Create hosted zone**, enter a domain such as `example.com` and keep **Public hosted zone**.',
        hint: 'Route 53 adds the NS and SOA records for you.',
        check: (c) => c.hostedZones.some((z) => !z.private),
      },
      {
        title: 'Create a health check for the primary',
        detail: 'Open **Health checks › Create health check** and monitor your primary endpoint (any domain or IP).',
        hint: 'Name it `primary`, endpoint `app.example.com`, path `/health`.',
        check: (c) => c.healthChecks.length > 0,
      },
      {
        title: 'Create the PRIMARY failover record',
        detail: 'In the zone, **Create record**: type **A**, routing policy **Failover**, failover record type **Primary**, attach the health check, give it a record ID.',
        hint: 'Use an IP value like `192.0.2.10`, or turn on Alias and pick a load balancer.',
        check: (c) => c.hostedZones.some((z) => !z.private && z.records.some((r) => r.type === 'A' && r.policy === 'failover' && r.failover === 'PRIMARY' && !!r.healthCheckId)),
      },
      {
        title: 'Create the SECONDARY failover record',
        detail: 'Create another **A** record with the **same name**, **Failover**, type **Secondary**, and a different record ID.',
        hint: 'A secondary usually points at a static S3 "maintenance" site or a DR Region.',
        check: (c) => c.hostedZones.some((z) => !z.private && z.records.some((p) => p.type === 'A' && p.failover === 'PRIMARY' && !!p.healthCheckId && z.records.some((s) => s.type === 'A' && s.failover === 'SECONDARY' && s.name === p.name))),
      },
      {
        title: 'Simulate the primary failing',
        detail: 'In **Health checks**, select the primary\'s check and click **Simulate failure**. Then use **Test record** to see the SECONDARY answer.',
        hint: 'The check must be the one attached to the PRIMARY record.',
        check: (c) => c.hostedZones.some((z) => z.records.some((p) => p.failover === 'PRIMARY' && c.healthChecks.some((h) => h.id === p.healthCheckId && !h.healthy) && z.records.some((s) => s.failover === 'SECONDARY' && s.name === p.name))),
      },
    ],
    debrief: 'Failover routing = active-passive DR. The PRIMARY needs a health check; when it fails, Route 53 answers with the SECONDARY (if both fail it still returns the primary). Failover time is health-check detection plus the record TTL. Compare: **weighted** (percentage splits), **latency** (best Region for the user), **geolocation** (by country/continent, needs a Default), **multivalue** (up to 8 healthy IPs). Use an **alias** record to point the zone apex at an ALB or CloudFront.',
  },
];

export default labs;
