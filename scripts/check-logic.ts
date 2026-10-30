// Self-check for simulator logic: `node scripts/check-logic.ts` (also run by `npm test`).
import assert from 'node:assert/strict';
import { parseCidr, cidrContains, cidrOverlaps, usableIps, matchRoute, vpcCidrError, nextIp } from '../src/cloud/net.ts';
import { scaledScore } from '../src/lib/scoring.ts';

assert.equal(parseCidr('10.0.1.0/24')?.size, 256);
assert.equal(parseCidr('10.0.1.5/24'), null); // host bits set
assert.ok(cidrContains('10.0.0.0/16', '10.0.1.0/24'));
assert.ok(!cidrContains('10.0.0.0/16', '10.1.0.0/24'));
assert.ok(cidrOverlaps('10.0.0.0/16', '10.0.128.0/17'));
assert.ok(!cidrOverlaps('10.0.0.0/24', '10.0.1.0/24'));
assert.equal(usableIps('10.0.0.0/24'), 251);
assert.equal(vpcCidrError('10.0.0.0/8'), 'VPC CIDR blocks must be between /16 and /28.');
assert.equal(nextIp('10.0.1.0/24', []), '10.0.1.4');
const routes = [{ dest: '10.0.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'igw-1' }, { dest: '10.0.0.0/8', target: 'tgw-1' }];
assert.equal(matchRoute(routes, '10.0.5.5')?.target, 'local');
assert.equal(matchRoute(routes, '10.9.0.1')?.target, 'tgw-1');
assert.equal(matchRoute(routes, '8.8.8.8')?.target, 'igw-1');
assert.equal(scaledScore(0.7), 720);
assert.ok(scaledScore(1) === 1000 && scaledScore(0) === 100);
console.log('Logic checks passed.');

// Architecture grading
import { grade } from '../src/lib/grade.ts';
const scn = { rules: [
  { anyOf: ['alb'], pillar: 'reliability', weight: 2, pass: '', fail: '' },
  { noneOf: ['nat-gateway'], pillar: 'cost', weight: 1, pass: '', fail: '' },
  { atLeast: { services: ['ec2'], count: 2 }, pillar: 'reliability', weight: 1, pass: '', fail: '' },
  { connect: { from: ['alb'], to: ['ec2'] }, pillar: 'performance', weight: 1, pass: '', fail: '' },
] } as never;
const g = grade(scn, { nodes: [{ id: 'a', service: 'alb' }, { id: 'b', service: 'ec2' }, { id: 'c', service: 'ec2' }], edges: [{ source: 'b', target: 'a' }] });
assert.equal(g.pct, 100);
assert.equal(grade(scn, { nodes: [{ id: 'n', service: 'nat-gateway' }], edges: [] }).pct, 0);
console.log('Grading checks passed.');

// Reachability
import { seedCloud } from '../src/cloud/seed.ts';
import { analyze } from '../src/cloud/reach.ts';
const c = seedCloud();
c.instances.push({ id: 'i-1', name: 'web', region: 'us-east-1', createdAt: 0, type: 't3.micro', ami: 'ami', subnetId: 'subnet-0def0000000000a', sgIds: ['sg-0default0000000'], state: 'running', privateIp: '172.31.0.4', publicIp: '3.3.3.3', volumeIds: [], launchedAt: 0, purchase: 'on-demand', imdsv2: true, cpu: 1 });
assert.ok(analyze(c, 'i-1', { kind: 'internet-out', port: 443 }).ok, 'default VPC instance reaches internet');
assert.ok(!analyze(c, 'i-1', { kind: 'internet-in', port: 80 }).ok, 'default SG blocks inbound 80');
c.securityGroups[0].inbound.push({ protocol: 'tcp', from: 80, to: 80, source: '0.0.0.0/0' });
assert.ok(analyze(c, 'i-1', { kind: 'internet-in', port: 80 }).ok, 'open port 80');
c.nacls[0].inbound.unshift({ num: 50, protocol: 'tcp', from: 80, to: 80, cidr: '0.0.0.0/0', action: 'deny' });
assert.ok(!analyze(c, 'i-1', { kind: 'internet-in', port: 80 }).ok, 'NACL deny wins by lower rule number');
c.routeTables[0].routes = c.routeTables[0].routes.filter((r) => r.target === 'local');
assert.ok(!analyze(c, 'i-1', { kind: 's3' }).ok, 'private subnet without endpoint cannot reach S3');
c.endpoints.push({ id: 'vpce-1', name: '', region: 'us-east-1', createdAt: 0, vpcId: 'vpc-0default0000000', service: 'com.amazonaws.us-east-1.s3', type: 'Gateway', routeTableIds: ['rtb-0default0000000'], subnetIds: [], sgIds: [], privateDns: false });
assert.ok(analyze(c, 'i-1', { kind: 's3' }).ok, 'gateway endpoint gives S3 access');
console.log('Reachability checks passed.');
