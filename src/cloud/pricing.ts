// Approximate us-east-1 list prices (2026), used to show what a design costs while it runs.
// ponytail: one region's prices for every region; regional deltas don't change exam reasoning.
import type { CloudState } from './types';

export const EC2_HOURLY: Record<string, number> = {
  't3.nano': 0.0052, 't3.micro': 0.0104, 't3.small': 0.0208, 't3.medium': 0.0416, 't3.large': 0.0832,
  't4g.micro': 0.0084, 't4g.small': 0.0168, 't4g.medium': 0.0336,
  'm7g.large': 0.0816, 'm7i.large': 0.1008, 'm7i.xlarge': 0.2016, 'm6i.large': 0.096,
  'c7g.large': 0.0725, 'c7i.large': 0.0893, 'c7i.2xlarge': 0.357,
  'r7g.large': 0.1071, 'r7i.large': 0.1323, 'x2idn.16xlarge': 6.669,
  'i4i.large': 0.172, 'd3.xlarge': 0.499, 'p5.48xlarge': 98.32, 'g5.xlarge': 1.006, 'inf2.xlarge': 0.758, 'hpc7g.16xlarge': 1.6832,
};
export const EC2_TYPES = Object.keys(EC2_HOURLY);
export const RDS_HOURLY: Record<string, number> = {
  'db.t4g.micro': 0.016, 'db.t3.micro': 0.017, 'db.t3.medium': 0.068, 'db.m7g.large': 0.168, 'db.r7g.large': 0.239, 'db.r7g.xlarge': 0.478,
};
export const RDS_CLASSES = Object.keys(RDS_HOURLY);

const H = 730; // hours per month
const EBS_GB_MONTH: Record<string, number> = { gp3: 0.08, gp2: 0.1, io2: 0.125, io1: 0.125, st1: 0.045, sc1: 0.015 };
const S3_GB_MONTH: Record<string, number> = {
  STANDARD: 0.023, INTELLIGENT_TIERING: 0.023, STANDARD_IA: 0.0125, ONEZONE_IA: 0.01, GLACIER_IR: 0.004, GLACIER: 0.0036, DEEP_ARCHIVE: 0.00099, EXPRESS_ONEZONE: 0.11,
};

export interface CostLine { service: string; resource: string; hourly: number; note: string }

/** What the account is burning per hour right now, by resource. */
export function costLines(s: CloudState): CostLine[] {
  const out: CostLine[] = [];
  const add = (service: string, resource: string, hourly: number, note: string) => hourly > 0 && out.push({ service, resource, hourly, note });
  for (const i of s.instances) {
    if (i.state === 'running' || i.state === 'pending') {
      const base = EC2_HOURLY[i.type] ?? 0.1;
      add('EC2', i.name || i.id, i.purchase === 'spot' ? base * 0.3 : base, `${i.type} ${i.purchase}${i.purchase === 'spot' ? ' (~70% off)' : ''}`);
      if (i.publicIp && !i.elasticIp) add('VPC', `${i.id} public IPv4`, 0.005, 'Every public IPv4 address bills hourly');
    }
  }
  for (const v of s.volumes) {
    const iops = v.type === 'io2' || v.type === 'io1' ? (v.iops * 0.065) / H : v.type === 'gp3' ? (Math.max(0, v.iops - 3000) * 0.005 + Math.max(0, v.throughput - 125) * 0.04) / H : 0;
    add('EBS', v.id, (v.sizeGb * (EBS_GB_MONTH[v.type] ?? 0.1)) / H + iops, `${v.sizeGb} GiB ${v.type}${v.attachedTo ? '' : ' (UNATTACHED: still billing)'}`);
  }
  for (const sn of s.snapshots) add('EBS', sn.id, (sn.sizeGb * (sn.tier === 'archive' ? 0.0125 : 0.05)) / H, `snapshot ${sn.tier}`);
  for (const e of s.elasticIps) add('VPC', e.id, 0.005, e.instanceId ? 'Elastic IP (attached)' : 'Elastic IP (idle)');
  for (const n of s.natGateways) if (n.state === 'available' && n.kind === 'gateway') add('VPC', n.name || n.id, 0.045 + 0.005, 'NAT Gateway hourly + public IP, plus $0.045/GB processed');
  for (const ep of s.endpoints) if (ep.type === 'Interface') add('VPC', ep.id, 0.01 * Math.max(1, ep.subnetIds.length), `Interface endpoint × ${ep.subnetIds.length || 1} AZ`);
  for (const lb of s.loadBalancers) add('ELB', lb.name, 0.0225 + 0.008, `${lb.type === 'application' ? 'ALB' : 'NLB'} hourly + ~1 LCU`);
  for (const d of s.dbInstances) {
    const base = RDS_HOURLY[d.instanceClass] ?? 0.1;
    add('RDS', d.name, base * (d.multiAz ? 2 : 1) + (d.storageGb * 0.115 * (d.multiAz ? 2 : 1)) / H, `${d.instanceClass}${d.multiAz ? ' Multi-AZ (2×: you pay for the standby)' : ''}`);
  }
  for (const t of s.dynamoTables) {
    if (t.mode === 'provisioned') add('DynamoDB', t.name, t.rcu * 0.00013 + t.wcu * 0.00065, `${t.rcu} RCU / ${t.wcu} WCU provisioned`);
    add('DynamoDB', `${t.name} storage`, (Math.max(0.001, t.itemCount / 1e6) * 0.25) / H, 'storage');
  }
  for (const b of s.buckets) {
    const byClass: Record<string, number> = {};
    for (const o of b.objects) if (!o.isDeleteMarker) byClass[o.storageClass] = (byClass[o.storageClass] ?? 0) + o.sizeKb / 1e6;
    for (const [cls, gb] of Object.entries(byClass)) add('S3', `${b.name} ${cls}`, (gb * S3_GB_MONTH[cls]) / H, `${gb.toFixed(3)} GB ${cls}`);
  }
  for (const k of s.kmsKeys) if (k.managedBy === 'customer' && k.enabled) add('KMS', k.alias, 1 / H, 'Customer managed key $1/month');
  for (const z of s.hostedZones) add('Route 53', z.domain, 0.5 / H, 'Hosted zone $0.50/month');
  for (const h of s.healthChecks) add('Route 53', h.name, 0.5 / H, 'Health check');
  for (const a of s.alarms) add('CloudWatch', a.name, 0.1 / H, 'Standard alarm $0.10/month');
  for (const l of s.lambdas) if (l.provisionedConcurrency) add('Lambda', l.name, l.provisionedConcurrency * (l.memoryMb / 1024) * 0.0000041667 * 3600, 'Provisioned concurrency bills while idle');
  return out;
}

export const hourlyTotal = (s: CloudState) => costLines(s).reduce((a, l) => a + l.hourly, 0);
export const usd = (n: number, digits = 2) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(digits)}`;
