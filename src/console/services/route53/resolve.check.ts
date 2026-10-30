// Self-check for the Route 53 resolver: `node src/console/services/route53/resolve.check.ts`
import assert from 'node:assert/strict';
import type { DnsRecord, HealthCheck } from '../../../cloud/types';
import { resolve, CLIENT_LOCATIONS } from './resolve.ts';

const loc = (id: string) => CLIENT_LOCATIONS.find((l) => l.id === id)!;
const rec = (p: Partial<DnsRecord>): DnsRecord => ({ id: p.setId ?? 'r', name: 'app.example.com', type: 'A', value: '1.1.1.1', ttl: 60, alias: false, policy: 'simple', ...p });
const hc = (id: string, healthy: boolean): HealthCheck => ({ id, name: id, region: 'global', createdAt: 0, target: 'x', path: '/', healthy });

const fo = [rec({ policy: 'failover', setId: 'p', failover: 'PRIMARY', healthCheckId: 'h1' }), rec({ policy: 'failover', setId: 's', failover: 'SECONDARY' })];
assert.equal(resolve(fo, loc('nyc'), [hc('h1', true)]).answers[0].setId, 'p');
assert.equal(resolve(fo, loc('nyc'), [hc('h1', false)]).answers[0].setId, 's');

const lat = [rec({ policy: 'latency', setId: 'use1', region: 'us-east-1' }), rec({ policy: 'latency', setId: 'apse2', region: 'ap-southeast-2', healthCheckId: 'h2' })];
assert.equal(resolve(lat, loc('syd'), [hc('h2', true)]).answers[0].setId, 'apse2');
assert.equal(resolve(lat, loc('syd'), [hc('h2', false)]).answers[0].setId, 'use1');
assert.equal(resolve(lat, loc('nyc'), []).answers[0].setId, 'use1');

const geo = [rec({ policy: 'geolocation', setId: 'de', location: 'DE' }), rec({ policy: 'geolocation', setId: 'eu', location: 'EU' })];
assert.equal(resolve(geo, loc('ber'), []).answers[0].setId, 'de');
assert.equal(resolve(geo, loc('lon'), []).answers[0].setId, 'eu');
assert.equal(resolve(geo, loc('nyc'), []).answers.length, 0);

const w = [rec({ policy: 'weighted', setId: 'a', weight: 0 }), rec({ policy: 'weighted', setId: 'b', weight: 10 })];
assert.equal(resolve(w, loc('nyc'), [], () => 0.01).answers[0].setId, 'b');
console.log('route53 resolve: ok');
