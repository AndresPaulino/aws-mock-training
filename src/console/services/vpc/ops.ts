// VPC mutations shared by the wizards. All take a mutable CloudState draft (from mutateCloud).
import type { CloudState } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { randomPublicIp } from '../../../cloud/net';

const base = (c: CloudState, name: string) => ({ name, region: c.region, createdAt: Date.now() });
const ev = (c: CloudState, msg: string) => { c.events.unshift({ t: Date.now(), service: 'ec2', msg }); };

export function createVpc(c: CloudState, name: string, cidr: string): string {
  const id = rid('vpc');
  c.vpcs.push({ id, ...base(c, name), cidr, isDefault: false, dnsHostnames: false });
  c.routeTables.push({ id: rid('rtb'), ...base(c, ''), vpcId: id, main: true, routes: [{ dest: cidr, target: 'local' }], subnetIds: [] });
  c.securityGroups.push({ id: rid('sg'), ...base(c, 'default'), vpcId: id, description: 'default VPC security group', inbound: [], outbound: [{ protocol: 'all', from: 0, to: 65535, source: '0.0.0.0/0' }] });
  const sg = c.securityGroups[c.securityGroups.length - 1];
  sg.inbound.push({ protocol: 'all', from: 0, to: 65535, source: sg.id, description: 'members of this SG' });
  c.nacls.push({ id: rid('acl'), ...base(c, ''), vpcId: id, isDefault: true, subnetIds: [],
    inbound: [{ num: 100, protocol: 'all', from: 0, to: 65535, cidr: '0.0.0.0/0', action: 'allow' }],
    outbound: [{ num: 100, protocol: 'all', from: 0, to: 65535, cidr: '0.0.0.0/0', action: 'allow' }] });
  ev(c, `Created VPC ${name || id} (${cidr}) with its main route table, default security group and default NACL`);
  return id;
}

export function createSubnet(c: CloudState, vpcId: string, name: string, cidr: string, az: string): string {
  const id = rid('subnet');
  c.subnets.push({ id, ...base(c, name), vpcId, cidr, az, autoPublicIp: false });
  ev(c, `Created subnet ${name || id} ${cidr} in ${az}`);
  return id;
}

export function createIgw(c: CloudState, name: string, vpcId?: string): string {
  const id = rid('igw');
  c.igws.push({ id, ...base(c, name), vpcId });
  ev(c, `Created internet gateway ${id}${vpcId ? ` attached to ${vpcId}` : ''}`);
  return id;
}

export function createRouteTable(c: CloudState, vpcId: string, name: string): string {
  const vpc = c.vpcs.find((v) => v.id === vpcId)!;
  const id = rid('rtb');
  c.routeTables.push({ id, ...base(c, name), vpcId, main: false, routes: [{ dest: vpc.cidr, target: 'local' }], subnetIds: [] });
  ev(c, `Created route table ${name || id}`);
  return id;
}

/** Associates a subnet with exactly one route table (removing any previous explicit association). */
export function associate(c: CloudState, rtbId: string, subnetId: string) {
  for (const r of c.routeTables) r.subnetIds = r.subnetIds.filter((s) => s !== subnetId);
  c.routeTables.find((r) => r.id === rtbId)?.subnetIds.push(subnetId);
}

export function setRoute(c: CloudState, rtbId: string, dest: string, target: string) {
  const rt = c.routeTables.find((r) => r.id === rtbId)!;
  rt.routes = [...rt.routes.filter((r) => r.dest !== dest), { dest, target }];
}

export function createNat(c: CloudState, subnetId: string, name: string): string {
  const id = rid('nat');
  const publicIp = randomPublicIp();
  c.natGateways.push({ id, ...base(c, name), subnetId, state: 'available', publicIp, kind: 'gateway' });
  c.elasticIps.push({ id: rid('eipalloc'), ...base(c, `${name || id}-eip`), publicIp, instanceId: id });
  ev(c, `Created NAT gateway ${id} in ${subnetId} with Elastic IP ${publicIp}`);
  return id;
}

/** Splits a /16 (or larger) VPC CIDR into /24s: 10.0.0.0/16 → 10.0.<n>.0/24. */
export function nthSlash24(vpcCidr: string, n: number): string {
  const [a, b] = vpcCidr.split('.');
  return `${a}.${b}.${n}.0/24`;
}
