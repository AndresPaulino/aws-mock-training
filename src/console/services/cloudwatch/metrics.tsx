// Simulated CloudWatch metrics: derived from the cloud state on every sim tick and kept in memory.
// ponytail: history lives in memory only (lost on reload, ~90 datapoints); persist it if charts must survive refreshes.
import { useStore } from '../../../store/store';
import type { Alarm, CloudState } from '../../../cloud/types';

export interface MetricDef { namespace: 'AWS/EC2' | 'AWS/AutoScaling' | 'AWS/Billing'; metric: string; resourceId: string; label: string; unit: string }
export const metricKey = (metric: string, resourceId: string) => `${metric}|${resourceId}`;

/** Every metric the account currently publishes, with its current value. */
export function metricCatalog(c: CloudState): (MetricDef & { value?: number })[] {
  const out: (MetricDef & { value?: number })[] = [];
  for (const i of c.instances.filter((x) => x.region === c.region && x.state !== 'terminated'))
    out.push({ namespace: 'AWS/EC2', metric: 'CPUUtilization', resourceId: i.id, label: `InstanceId=${i.id}${i.name ? ` (${i.name})` : ''}`, unit: '%', value: i.state === 'running' ? i.cpu : undefined });
  for (const a of c.asgs.filter((x) => x.region === c.region)) {
    const live = c.instances.filter((x) => x.asgId === a.id && x.state === 'running');
    out.push({ namespace: 'AWS/EC2', metric: 'CPUUtilization', resourceId: a.id, label: `AutoScalingGroupName=${a.name}`, unit: '%', value: live.length ? live.reduce((s, x) => s + x.cpu, 0) / live.length : undefined });
    out.push({ namespace: 'AWS/AutoScaling', metric: 'GroupInServiceInstances', resourceId: a.id, label: `AutoScalingGroupName=${a.name}`, unit: 'Count', value: live.length });
    out.push({ namespace: 'AWS/AutoScaling', metric: 'GroupDesiredCapacity', resourceId: a.id, label: `AutoScalingGroupName=${a.name}`, unit: 'Count', value: a.desired });
  }
  out.push({ namespace: 'AWS/Billing', metric: 'EstimatedCharges', resourceId: 'account', label: 'Currency=USD', unit: 'USD', value: c.accruedUsd });
  return out;
}

export interface Pt { h: number; v: number } // h = simulated hours
const series = new Map<string, Pt[]>();
let lastH = -1;
function sample(c: CloudState) {
  if (c.simHours === lastH) return;
  lastH = c.simHours;
  for (const m of metricCatalog(c)) {
    if (m.value === undefined) continue;
    const k = metricKey(m.metric, m.resourceId);
    const arr = series.get(k) ?? [];
    arr.push({ h: c.simHours, v: m.value });
    if (arr.length > 90) arr.shift();
    series.set(k, arr);
  }
}
sample(useStore.getState().cloud);
useStore.subscribe((s) => sample(s.cloud));
export const history = (metric: string, resourceId: string) => series.get(metricKey(metric, resourceId)) ?? [];

/** Average of the datapoints inside the alarm's period (falls back to the current value). */
export function alarmValue(c: CloudState, a: Pick<Alarm, 'metric' | 'resourceId' | 'periodMin'>): number | undefined {
  const pts = history(a.metric, a.resourceId).filter((p) => p.h >= c.simHours - a.periodMin / 60 - 1e-9);
  if (pts.length) return pts.reduce((s, p) => s + p.v, 0) / pts.length;
  return metricCatalog(c).find((m) => m.metric === a.metric && m.resourceId === a.resourceId)?.value;
}
export function alarmState(c: CloudState, a: Alarm): Alarm['state'] {
  const v = alarmValue(c, a);
  if (v === undefined) return 'INSUFFICIENT_DATA';
  return (a.comparison === '>' ? v > a.threshold : v < a.threshold) ? 'ALARM' : 'OK';
}

/** Inline-SVG line chart, no chart library. */
export function LineChart({ points, unit, threshold, height = 140 }: { points: Pt[]; unit: string; threshold?: number; height?: number }) {
  const W = 420, H = height, pad = 30;
  if (points.length < 2) return <div className="grid place-items-center text-[#5f6b7a] text-[13px] border border-dashed border-[#d1d5db] rounded" style={{ height: H }}>Waiting for datapoints… (the simulator publishes one every 2 s)</div>;
  const max = Math.max(unit === '%' ? 100 : 1, threshold ?? 0, ...points.map((p) => p.v)) * (unit === '%' ? 1 : 1.15);
  const h0 = points[0].h, h1 = points[points.length - 1].h || h0 + 1;
  const x = (h: number) => pad + ((h - h0) / (h1 - h0 || 1)) * (W - pad - 6);
  const y = (v: number) => H - 18 - (v / max) * (H - 28);
  const fmt = (v: number) => (unit === 'USD' ? `$${v.toFixed(2)}` : unit === '%' ? `${v.toFixed(0)}%` : v.toFixed(0));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Line chart, latest ${fmt(points[points.length - 1].v)}`}>
      <line x1={pad} x2={W - 6} y1={y(0)} y2={y(0)} stroke="#d1d5db" />
      <line x1={pad} x2={W - 6} y1={y(max)} y2={y(max)} stroke="#eef0f2" />
      <text x={pad - 4} y={y(max) + 4} fontSize="10" textAnchor="end" fill="#5f6b7a">{fmt(max)}</text>
      <text x={pad - 4} y={y(0) + 4} fontSize="10" textAnchor="end" fill="#5f6b7a">{fmt(0)}</text>
      <text x={pad} y={H - 4} fontSize="10" fill="#5f6b7a">−{Math.round((h1 - h0) * 60)} min</text>
      <text x={W - 6} y={H - 4} fontSize="10" textAnchor="end" fill="#5f6b7a">now</text>
      {threshold !== undefined && <><line x1={pad} x2={W - 6} y1={y(threshold)} y2={y(threshold)} stroke="#d91515" strokeDasharray="4 3" /><text x={W - 8} y={y(threshold) - 3} fontSize="10" textAnchor="end" fill="#d91515">threshold {fmt(threshold)}</text></>}
      <polyline fill="none" stroke="#0972d3" strokeWidth="2" points={points.map((p) => `${x(p.h)},${y(p.v)}`).join(' ')} />
      <circle cx={x(points[points.length - 1].h)} cy={y(points[points.length - 1].v)} r="3" fill="#0972d3" />
    </svg>
  );
}
