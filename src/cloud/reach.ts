// Reachability analyzer: traces a packet hop by hop through SG → NACL → route table → gateway,
// explaining each decision. This is the VPC mental model the exam tests.
import type { CloudState, Instance, Nacl, NaclRule, RouteTable, SecurityGroup, SgRule, Subnet } from './types';
import { ipInCidr, matchRoute } from './net.ts';

export type Target =
  | { kind: 'internet-out'; port: number }           // instance → internet (e.g. yum update on 443)
  | { kind: 'internet-in'; port: number }            // internet client → instance
  | { kind: 's3' }                                   // instance → Amazon S3 (regional endpoint)
  | { kind: 'instance'; instanceId: string; port: number };

export interface Hop { label: string; ok: boolean; detail: string }
export interface Trace { ok: boolean; hops: Hop[]; summary: string }

const PUBLIC_IP = '52.94.0.10'; // a stand-in internet / S3 address

export const subnetRouteTable = (c: CloudState, s: Subnet): RouteTable | undefined =>
  c.routeTables.find((r) => r.subnetIds.includes(s.id)) ?? c.routeTables.find((r) => r.vpcId === s.vpcId && r.main);
export const subnetNacl = (c: CloudState, s: Subnet): Nacl | undefined =>
  c.nacls.find((n) => n.subnetIds.includes(s.id)) ?? c.nacls.find((n) => n.vpcId === s.vpcId && n.isDefault);

/** True when the subnet's route table sends 0.0.0.0/0 to an internet gateway attached to its VPC. */
export function isPublicSubnet(c: CloudState, s: Subnet): boolean {
  const rt = subnetRouteTable(c, s);
  const r = rt && matchRoute(rt.routes, PUBLIC_IP);
  return !!r && r.target.startsWith('igw-') && c.igws.some((g) => g.id === r.target && g.vpcId === s.vpcId);
}

const portMatch = (r: { protocol: string; from: number; to: number }, port: number) => r.protocol === 'all' || (port >= r.from && port <= r.to);

function sgAllows(c: CloudState, sgIds: string[], dir: 'inbound' | 'outbound', port: number, peerIp: string, peerSgIds: string[] = []): SgRule | undefined {
  for (const id of sgIds) {
    const sg = c.securityGroups.find((s) => s.id === id);
    const hit = sg?.[dir].find((r) => portMatch(r, port) && (r.source.startsWith('sg-') ? peerSgIds.includes(r.source) : ipInCidr(peerIp, r.source)));
    if (hit) return hit;
  }
  return undefined;
}

/** NACLs: rules evaluated lowest number first; first match wins; implicit deny (*) at the end. */
export function naclDecision(acl: Nacl | undefined, dir: 'inbound' | 'outbound', port: number, ip: string): { allow: boolean; rule: NaclRule | null } {
  if (!acl) return { allow: true, rule: null };
  const rule = [...acl[dir]].sort((a, b) => a.num - b.num).find((r) => portMatch(r, port) && ipInCidr(ip, r.cidr)) ?? null;
  return { allow: rule?.action === 'allow', rule };
}

const ruleText = (r: NaclRule | null) => (r ? `rule #${r.num} (${r.action.toUpperCase()} ${r.protocol === 'all' ? 'all traffic' : `${r.from}-${r.to}`} ${r.cidr})` : 'the default * rule (DENY)');
const sgName = (c: CloudState, ids: string[]) => ids.map((i) => c.securityGroups.find((s) => s.id === i)?.name ?? i).join(', ');
const EPHEMERAL = 49152; // representative ephemeral port for return traffic

export function analyze(c: CloudState, instanceId: string, t: Target): Trace {
  const hops: Hop[] = [];
  const done = (summary: string): Trace => ({ ok: hops.every((h) => h.ok), hops, summary });
  const inst = c.instances.find((i) => i.id === instanceId);
  if (!inst) return { ok: false, hops: [], summary: 'Instance not found.' };
  const subnet = c.subnets.find((s) => s.id === inst.subnetId)!;
  const rt = subnetRouteTable(c, subnet);
  const acl = subnetNacl(c, subnet);
  const pubIp = inst.elasticIp ?? inst.publicIp;
  hops.push({ label: 'Instance state', ok: inst.state === 'running', detail: inst.state === 'running' ? `${inst.id} is running in ${subnet.name || subnet.id} (${subnet.az}).` : `${inst.id} is ${inst.state}. Start it first.` });
  if (inst.state !== 'running') return done('The instance is not running.');

  if (t.kind === 'instance') {
    const dst = c.instances.find((i) => i.id === t.instanceId);
    if (!dst) return done('Destination not found.');
    const dSub = c.subnets.find((s) => s.id === dst.subnetId)!;
    const sameVpc = dSub.vpcId === subnet.vpcId;
    const out = sgAllows(c, inst.sgIds, 'outbound', t.port, dst.privateIp, dst.sgIds);
    hops.push({ label: `Source security group (outbound :${t.port})`, ok: !!out, detail: out ? `${sgName(c, inst.sgIds)} allows outbound to ${out.source}.` : `No outbound rule in ${sgName(c, inst.sgIds)} allows port ${t.port}.` });
    const n1 = naclDecision(acl, 'outbound', t.port, dst.privateIp);
    hops.push({ label: 'Source subnet NACL (outbound)', ok: n1.allow, detail: `${acl?.name || acl?.id}: ${ruleText(n1.rule)}.` });
    const route = rt && matchRoute(rt.routes, dst.privateIp);
    const peered = !sameVpc && route?.target.startsWith('pcx-') && c.peerings.some((p) => p.id === route.target && p.status === 'active');
    hops.push({ label: 'Route table', ok: sameVpc ? route?.target === 'local' : !!peered, detail: sameVpc ? `${dst.privateIp} matches the "local" route: everything inside a VPC can route to everything else.` : peered ? `Routed over peering connection ${route!.target}.` : `No route to ${dst.privateIp}. Different VPCs need peering or a Transit Gateway, plus a route.` });
    const dAcl = subnetNacl(c, dSub);
    if (dSub.id !== subnet.id) {
      const n2 = naclDecision(dAcl, 'inbound', t.port, inst.privateIp);
      hops.push({ label: 'Destination subnet NACL (inbound)', ok: n2.allow, detail: `${dAcl?.name || dAcl?.id}: ${ruleText(n2.rule)}.` });
      const n3 = naclDecision(dAcl, 'outbound', EPHEMERAL, inst.privateIp);
      hops.push({ label: 'Destination NACL (return traffic, ephemeral ports)', ok: n3.allow, detail: `NACLs are stateless, so the reply on port ~${EPHEMERAL} must be allowed too: ${ruleText(n3.rule)}.` });
    }
    const inn = sgAllows(c, dst.sgIds, 'inbound', t.port, inst.privateIp, inst.sgIds);
    hops.push({ label: `Destination security group (inbound :${t.port})`, ok: !!inn, detail: inn ? `${sgName(c, dst.sgIds)} allows from ${inn.source}${inn.source.startsWith('sg-') ? ' (security-group reference)' : ''}. SGs are stateful: replies are allowed automatically.` : `No inbound rule in ${sgName(c, dst.sgIds)} allows port ${t.port} from the source.` });
    return done(hops.every((h) => h.ok) ? 'Reachable.' : 'Not reachable. See the first failing hop.');
  }

  if (t.kind === 'internet-in') {
    const route = rt && matchRoute(rt.routes, PUBLIC_IP);
    const igw = route?.target.startsWith('igw-') && c.igws.find((g) => g.id === route.target && g.vpcId === subnet.vpcId);
    hops.push({ label: 'Internet gateway attached + route', ok: !!igw, detail: igw ? `Subnet route table sends 0.0.0.0/0 to ${igw.id}: this is a public subnet.` : route?.target.startsWith('nat-') ? 'This subnet routes 0.0.0.0/0 to a NAT gateway: a private subnet. NAT allows outbound-initiated traffic only; the internet can never initiate a connection in.' : 'No route to an internet gateway: a private subnet. Nothing on the internet can reach it.' });
    hops.push({ label: 'Public IP address', ok: !!pubIp, detail: pubIp ? `Instance has public IP ${pubIp}.` : 'Instance has no public or Elastic IP, so there is no address to reach it on even in a public subnet.' });
    const n = naclDecision(acl, 'inbound', t.port, PUBLIC_IP);
    hops.push({ label: `Subnet NACL (inbound :${t.port})`, ok: n.allow, detail: ruleText(n.rule) });
    const nr = naclDecision(acl, 'outbound', EPHEMERAL, PUBLIC_IP);
    hops.push({ label: 'Subnet NACL (outbound return traffic)', ok: nr.allow, detail: `Stateless, so ephemeral ports 1024-65535 must be allowed outbound: ${ruleText(nr.rule)}.` });
    const inn = sgAllows(c, inst.sgIds, 'inbound', t.port, PUBLIC_IP);
    hops.push({ label: `Security group (inbound :${t.port})`, ok: !!inn, detail: inn ? `${sgName(c, inst.sgIds)} allows ${inn.source}.` : `${sgName(c, inst.sgIds)} has no inbound rule for port ${t.port} from the internet.` });
    return done(hops.every((h) => h.ok) ? 'Reachable from the internet.' : 'Not reachable from the internet.');
  }

  // Outbound to internet or S3
  const port = t.kind === 's3' ? 443 : t.port;
  const out = sgAllows(c, inst.sgIds, 'outbound', port, PUBLIC_IP);
  hops.push({ label: `Security group (outbound :${port})`, ok: !!out, detail: out ? `${sgName(c, inst.sgIds)} allows outbound to ${out.source}.` : `No outbound rule allows port ${port}.` });
  const n1 = naclDecision(acl, 'outbound', port, PUBLIC_IP);
  hops.push({ label: 'Subnet NACL (outbound)', ok: n1.allow, detail: ruleText(n1.rule) });
  const n2 = naclDecision(acl, 'inbound', EPHEMERAL, PUBLIC_IP);
  hops.push({ label: 'Subnet NACL (inbound return traffic)', ok: n2.allow, detail: `Replies come back on ephemeral ports: ${ruleText(n2.rule)}.` });

  if (t.kind === 's3') {
    const gw = rt && c.endpoints.find((e) => e.type === 'Gateway' && e.service.endsWith('.s3') && e.vpcId === subnet.vpcId && e.routeTableIds.includes(rt.id));
    if (gw) {
      hops.push({ label: 'Gateway endpoint route (S3 prefix list)', ok: true, detail: `Route table ${rt!.name || rt!.id} has the S3 prefix-list route to ${gw.id}. Traffic stays on the AWS network: no NAT, no internet gateway, no data-processing charge.` });
      return done('Reachable privately through the S3 gateway endpoint (free).');
    }
    const ie = c.endpoints.find((e) => e.type === 'Interface' && e.service.endsWith('.s3') && e.vpcId === subnet.vpcId);
    if (ie) {
      hops.push({ label: 'Interface endpoint (PrivateLink)', ok: true, detail: `${ie.id} provides private ENIs for S3 (billed hourly + per GB).` });
      return done('Reachable privately through an S3 interface endpoint.');
    }
  }
  const route = rt && matchRoute(rt.routes, PUBLIC_IP);
  if (!route) {
    hops.push({ label: 'Route table', ok: false, detail: 'No route matches 0.0.0.0/0. Only the "local" route exists, so the instance can only talk inside the VPC.' });
    return done(t.kind === 's3' ? 'S3 not reachable. Add an S3 gateway endpoint (free) or a NAT gateway route.' : 'Internet not reachable.');
  }
  if (route.target.startsWith('igw-')) {
    const igw = c.igws.find((g) => g.id === route.target && g.vpcId === subnet.vpcId);
    hops.push({ label: 'Route → internet gateway', ok: !!igw, detail: igw ? `0.0.0.0/0 → ${igw.id}.` : `Route points at ${route.target}, which is not attached to this VPC (a blackhole route).` });
    hops.push({ label: 'Public IP address', ok: !!pubIp, detail: pubIp ? `Source NAT to public IP ${pubIp} at the IGW.` : 'No public IP. An instance in a public subnet without a public/Elastic IP cannot use the IGW. Enable auto-assign public IP or attach an EIP, or use a NAT gateway from a private subnet.' });
  } else if (route.target.startsWith('nat-')) {
    const nat = c.natGateways.find((n) => n.id === route.target && n.state === 'available');
    const natSubnet = nat && c.subnets.find((s) => s.id === nat.subnetId);
    hops.push({ label: 'Route → NAT gateway', ok: !!nat, detail: nat ? `0.0.0.0/0 → ${nat.id} in ${natSubnet?.name || natSubnet?.id} (${natSubnet?.az}).` : `Route points at ${route.target}, which doesn't exist or isn't available (blackhole).` });
    if (natSubnet) {
      const pub = isPublicSubnet(c, natSubnet);
      hops.push({ label: 'NAT gateway lives in a public subnet', ok: pub, detail: pub ? 'The NAT subnet routes to an IGW, so NAT translates to its Elastic IP and out to the internet.' : "The NAT gateway is in a subnet with no IGW route. A NAT gateway must sit in a PUBLIC subnet. Common exam trap!" });
      if (natSubnet.az !== subnet.az) hops.push({ label: 'AZ resilience note', ok: true, detail: `Works, but crosses AZs (${subnet.az} → ${natSubnet.az}): if ${natSubnet.az} fails this subnet loses internet access, and you pay inter-AZ transfer. Best practice: one NAT gateway per AZ.` });
    }
  } else {
    hops.push({ label: 'Route table', ok: false, detail: `0.0.0.0/0 routes to ${route.target}, which doesn't lead to the internet.` });
  }
  const ok = hops.every((h) => h.ok);
  return done(ok ? (t.kind === 's3' ? 'Reachable over the public S3 endpoint (via NAT/IGW). Works, but a free gateway endpoint would be cheaper and private.' : 'Reachable.') : 'Not reachable. See the first failing hop.');
}

export const instanceLabel = (i: Instance) => `${i.name || '(no name)'} · ${i.id}`;
export type { SecurityGroup };
