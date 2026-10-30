// IPv4 CIDR helpers for the VPC simulator.

export function ipToInt(ip: string): number {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return NaN;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
export const intToIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

export interface Cidr { base: number; prefix: number; size: number }

/** Parses 'a.b.c.d/n'. Returns null when malformed or when host bits are set (AWS rejects those too). */
export function parseCidr(cidr: string): Cidr | null {
  const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(cidr.trim());
  if (!m) return null;
  const ip = ipToInt(m[1]);
  const prefix = Number(m[2]);
  if (Number.isNaN(ip) || prefix > 32) return null;
  const size = 2 ** (32 - prefix);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  if (((ip & mask) >>> 0) !== ip) return null;
  return { base: ip, prefix, size };
}

export function cidrContains(outer: string, inner: string): boolean {
  const o = parseCidr(outer), i = parseCidr(inner);
  return !!o && !!i && i.prefix >= o.prefix && i.base >= o.base && i.base + i.size <= o.base + o.size;
}
export function cidrOverlaps(a: string, b: string): boolean {
  const x = parseCidr(a), y = parseCidr(b);
  return !!x && !!y && x.base < y.base + y.size && y.base < x.base + x.size;
}
export function ipInCidr(ip: string, cidr: string): boolean {
  const c = parseCidr(cidr), n = ipToInt(ip);
  return !!c && n >= c.base && n < c.base + c.size;
}
/** AWS reserves 5 addresses per subnet (network, router, DNS, future, broadcast). */
export const usableIps = (cidr: string) => Math.max(0, (parseCidr(cidr)?.size ?? 0) - 5);

/** First private IP AWS would hand out (base + 4) after skipping `used`. */
export function nextIp(cidr: string, used: string[]): string {
  const c = parseCidr(cidr);
  if (!c) return '0.0.0.0';
  const taken = new Set(used);
  for (let n = c.base + 4; n < c.base + c.size - 1; n++) if (!taken.has(intToIp(n))) return intToIp(n);
  return intToIp(c.base + 4);
}

/** Validation message for a VPC CIDR, or '' if valid. */
export function vpcCidrError(cidr: string): string {
  const c = parseCidr(cidr);
  if (!c) return 'Enter a valid CIDR with no host bits set, e.g. 10.0.0.0/16.';
  if (c.prefix < 16 || c.prefix > 28) return 'VPC CIDR blocks must be between /16 and /28.';
  return '';
}

/** Longest-prefix match: the route that wins for a destination IP. */
export function matchRoute<T extends { dest: string }>(routes: T[], ip: string): T | undefined {
  return routes
    .filter((r) => ipInCidr(ip, r.dest))
    .sort((a, b) => (parseCidr(b.dest)?.prefix ?? 0) - (parseCidr(a.dest)?.prefix ?? 0))[0];
}

export function randomPublicIp(): string {
  return `${[3, 18, 34, 44, 52, 54][Math.floor(Math.random() * 6)]}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 253)}`;
}
