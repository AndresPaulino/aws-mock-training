import type { CloudState, DbInstance } from '../../../cloud/types';

export const ENGINES: { value: DbInstance['engine']; label: string }[] = [
  { value: 'aurora-mysql', label: 'Aurora (MySQL Compatible)' },
  { value: 'aurora-postgresql', label: 'Aurora (PostgreSQL Compatible)' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'sqlserver', label: 'Microsoft SQL Server' },
];
export const engineLabel = (e: DbInstance['engine']) => ENGINES.find((x) => x.value === e)?.label ?? e;
export const isAurora = (e: DbInstance['engine']) => e.startsWith('aurora');
export const dbPort = (e: DbInstance['engine']) => (e === 'postgres' || e === 'aurora-postgresql' ? 5432 : e === 'sqlserver' ? 1433 : e === 'oracle' ? 1521 : 3306);
export const dbEndpoint = (name: string, region: string) => `${name.toLowerCase()}.c9akciq32.${region}.rds.amazonaws.com`;

/** A subnet is public when its route table (explicit association, else the VPC main table) has 0.0.0.0/0 → igw. */
export function isPublicSubnet(c: CloudState, subnetId: string) {
  const s = c.subnets.find((x) => x.id === subnetId);
  if (!s) return false;
  const rt = c.routeTables.find((r) => r.subnetIds.includes(subnetId)) ?? c.routeTables.find((r) => r.vpcId === s.vpcId && r.main);
  return !!rt?.routes.some((r) => r.dest === '0.0.0.0/0' && r.target.startsWith('igw-'));
}
