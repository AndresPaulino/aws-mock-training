// Route 53 answer selection: given the records for one name/type, a client location and health-check state,
// pick what a resolver gets back, and explain why. Pure, so it can be checked without React.
import type { DnsRecord, HealthCheck } from '../../../cloud/types';

export interface ClientLoc { id: string; label: string; country: string; continent: string; lat: number; lon: number }
export const CLIENT_LOCATIONS: ClientLoc[] = [
  { id: 'nyc', label: 'New York, United States', country: 'US', continent: 'NA', lat: 40.7, lon: -74 },
  { id: 'sea', label: 'Seattle, United States', country: 'US', continent: 'NA', lat: 47.6, lon: -122.3 },
  { id: 'tor', label: 'Toronto, Canada', country: 'CA', continent: 'NA', lat: 43.7, lon: -79.4 },
  { id: 'sao', label: 'São Paulo, Brazil', country: 'BR', continent: 'SA', lat: -23.5, lon: -46.6 },
  { id: 'lon', label: 'London, United Kingdom', country: 'GB', continent: 'EU', lat: 51.5, lon: -0.1 },
  { id: 'ber', label: 'Berlin, Germany', country: 'DE', continent: 'EU', lat: 52.5, lon: 13.4 },
  { id: 'tok', label: 'Tokyo, Japan', country: 'JP', continent: 'AS', lat: 35.7, lon: 139.7 },
  { id: 'syd', label: 'Sydney, Australia', country: 'AU', continent: 'OC', lat: -33.9, lon: 151.2 },
];
export const REGION_COORDS: Record<string, [number, number]> = {
  'us-east-1': [38.9, -77.4], 'us-east-2': [40, -83], 'us-west-2': [45.8, -119.7], 'eu-west-1': [53.3, -6.3],
  'eu-central-1': [50.1, 8.7], 'ap-southeast-2': [-33.9, 151.2], 'ap-northeast-1': [35.7, 139.7],
};
/** Continents and the countries the console offers for geolocation records. '*' is the default location. */
export const GEO_LOCATIONS = [
  { value: '*', label: 'Default' },
  ...[['NA', 'North America'], ['SA', 'South America'], ['EU', 'Europe'], ['AS', 'Asia'], ['OC', 'Oceania'], ['AF', 'Africa']].map(([v, l]) => ({ value: v, label: `Continent: ${l}` })),
  ...[['US', 'United States'], ['CA', 'Canada'], ['BR', 'Brazil'], ['GB', 'United Kingdom'], ['DE', 'Germany'], ['JP', 'Japan'], ['AU', 'Australia']].map(([v, l]) => ({ value: v, label: `Country: ${l}` })),
];

/** Simulated round-trip latency (ms) between two points: ~great-circle distance at fibre speed plus overhead. */
export function rttMs([la1, lo1]: [number, number], [la2, lo2]: [number, number]) {
  const r = Math.PI / 180;
  const d = 6371 * Math.acos(Math.min(1, Math.sin(la1 * r) * Math.sin(la2 * r) + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.cos((lo1 - lo2) * r)));
  return Math.round(5 + d / 100);
}
export const latencyMs = (loc: ClientLoc, region: string) => rttMs([loc.lat, loc.lon], REGION_COORDS[region] ?? [0, 0]);

export interface Resolution { answers: DnsRecord[]; why: string[] }

export function resolve(records: DnsRecord[], loc: ClientLoc, checks: HealthCheck[], rand = Math.random): Resolution {
  const why: string[] = [];
  if (!records.length) return { answers: [], why: ['NXDOMAIN / NODATA: no record with this name and type.'] };
  const hc = (r: DnsRecord) => (r.healthCheckId ? checks.find((h) => h.id === r.healthCheckId) : undefined);
  const healthy = (r: DnsRecord) => hc(r)?.healthy !== false;
  const label = (r: DnsRecord) => `"${r.setId ?? r.value}"`;
  const policy = records[0].policy;
  for (const r of records) if (r.healthCheckId) why.push(`${label(r)}: health check ${hc(r)?.name ?? r.healthCheckId} is ${healthy(r) ? 'Healthy' : 'UNHEALTHY'}.`);
  const live = records.filter(healthy);
  // Route 53 treats "all unhealthy" as "all healthy" so it still answers something.
  const pool = live.length ? live : records;
  if (!live.length && policy !== 'simple' && policy !== 'failover') why.push('Every record is unhealthy, so Route 53 considers all of them healthy (fail open).');

  switch (policy) {
    case 'simple':
      why.push('Simple routing: return the record (all its values); health checks are not evaluated.');
      return { answers: [records[0]], why };
    case 'failover': {
      const p = records.find((r) => r.failover === 'PRIMARY'), s = records.find((r) => r.failover === 'SECONDARY');
      if (p && healthy(p)) { why.push('Failover: the PRIMARY is healthy, so it answers.'); return { answers: [p], why }; }
      if (s && healthy(s)) { why.push(p ? 'Failover: the PRIMARY is unhealthy, so the SECONDARY answers.' : 'Failover: no PRIMARY record, SECONDARY answers.'); return { answers: [s], why }; }
      why.push('Failover: no healthy record, so Route 53 returns the PRIMARY anyway.');
      return { answers: [p ?? s ?? records[0]], why };
    }
    case 'weighted': {
      const weights = pool.map((r) => r.weight ?? 0);
      const sum = weights.reduce((a, w) => a + w, 0);
      let x = rand() * (sum || pool.length), i = 0;
      for (; i < pool.length - 1; i++) { x -= sum ? weights[i] : 1; if (x < 0) break; }
      why.push(`Weighted: ${pool.map((r, k) => `${label(r)} weight ${weights[k]}`).join(', ')}. Each query picks one in proportion to weight${sum ? '' : ' (all zero: equal chance)'}.`);
      return { answers: [pool[i]], why };
    }
    case 'latency': {
      const ranked = [...pool].sort((a, b) => latencyMs(loc, a.region ?? '') - latencyMs(loc, b.region ?? ''));
      why.push(`Latency: from ${loc.label}, ${ranked.map((r) => `${r.region} ≈${latencyMs(loc, r.region ?? '')} ms`).join(', ')}. The lowest-latency healthy Region answers.`);
      return { answers: [ranked[0]], why };
    }
    case 'geolocation': {
      const match = pool.find((r) => r.location === loc.country) ?? pool.find((r) => r.location === loc.continent) ?? pool.find((r) => r.location === '*');
      if (!match) { why.push(`Geolocation: nothing matches country ${loc.country}, continent ${loc.continent}, and there is no Default record, so the answer is empty (NOERROR, no data).`); return { answers: [], why }; }
      why.push(`Geolocation: matched ${match.location === '*' ? 'the Default location' : match.location === loc.country ? `country ${loc.country}` : `continent ${loc.continent}`} (most specific match wins: country, then continent, then Default).`);
      return { answers: [match], why };
    }
    case 'multivalue': {
      const answers = pool.slice(0, 8);
      why.push(`Multivalue answer: up to 8 healthy records are returned (${answers.length}); the client picks one.`);
      return { answers, why };
    }
  }
}
