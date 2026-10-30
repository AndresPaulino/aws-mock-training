// Simulation clock: runs while the console is open. 1 real second = 1 simulated minute.
// Moves resources through their lifecycles and accrues cost so idle resources visibly cost money.
import { useStore } from '../store/store';
import { hourlyTotal } from './pricing';
import { rid, azsOf } from './seed';
import { nextIp, randomPublicIp } from './net';
import type { CloudState, Instance } from './types';

const TICK_MS = 2000;
const SIM_HOURS_PER_TICK = 2 / 60;

export function launchInstance(c: CloudState, o: Partial<Instance> & { subnetId: string; type: string; ami: string; sgIds: string[] }): Instance {
  const subnet = c.subnets.find((s) => s.id === o.subnetId)!;
  const used = c.instances.filter((i) => i.subnetId === subnet.id && i.state !== 'terminated').map((i) => i.privateIp);
  const volId = rid('vol');
  const inst: Instance = {
    id: rid('i'), name: o.name ?? '', region: c.region, createdAt: Date.now(), type: o.type, ami: o.ami, subnetId: subnet.id, sgIds: o.sgIds,
    state: 'pending', privateIp: nextIp(subnet.cidr, used), publicIp: (o.publicIp ?? subnet.autoPublicIp) ? randomPublicIp() : undefined,
    iamRole: o.iamRole, keyPair: o.keyPair, userData: o.userData, volumeIds: [volId], launchedAt: Date.now(), asgId: o.asgId,
    purchase: o.purchase ?? 'on-demand', imdsv2: o.imdsv2 ?? true, cpu: 3,
  };
  if (typeof o.publicIp === 'string') inst.publicIp = o.publicIp;
  c.instances.push(inst);
  c.volumes.push({ id: volId, name: '', region: c.region, createdAt: Date.now(), sizeGb: 8, type: 'gp3', iops: 3000, throughput: 125, az: subnet.az, attachedTo: inst.id, encrypted: false, deleteOnTermination: true });
  return inst;
}

export function terminateInstance(c: CloudState, id: string) {
  const i = c.instances.find((x) => x.id === id);
  if (!i) return;
  i.state = 'terminated';
  i.publicIp = undefined;
  for (const v of c.volumes.filter((v) => v.attachedTo === id)) {
    if (v.deleteOnTermination) c.volumes = c.volumes.filter((x) => x.id !== v.id); else v.attachedTo = undefined;
  }
  for (const tg of c.targetGroups) tg.targets = tg.targets.filter((t) => t !== id);
}

function tick(c: CloudState) {
  const now = Date.now();
  c.accruedUsd += hourlyTotal(c) * SIM_HOURS_PER_TICK;
  c.simHours += SIM_HOURS_PER_TICK;
  for (const i of c.instances) {
    if (i.state === 'pending' && now - i.launchedAt > 4000) i.state = 'running';
    if (i.state === 'stopping') i.state = 'stopped';
    if (i.state === 'running') {
      const asg = i.asgId ? c.asgs.find((a) => a.id === i.asgId) : undefined;
      const peers = asg ? c.instances.filter((x) => x.asgId === asg.id && x.state === 'running').length || 1 : 1;
      const target = asg ? Math.min(100, (asg.load * 2) / peers) : 4;
      i.cpu = Math.max(1, Math.min(100, i.cpu + (target - i.cpu) * 0.35 + (Math.random() - 0.5) * 4));
    }
  }
  // drop long-terminated instances from the list, like the real console does after ~1 hour
  c.instances = c.instances.filter((i) => i.state !== 'terminated' || now - i.launchedAt < 30 * 60 * 1000 || !!i.name);
  for (const asg of c.asgs) {
    const tt = asg.policies.find((p) => p.type === 'target-tracking' && p.metric === 'cpu');
    const live = c.instances.filter((x) => x.asgId === asg.id && (x.state === 'running' || x.state === 'pending'));
    if (tt && live.length) {
      const avg = live.reduce((a, x) => a + x.cpu, 0) / live.length;
      if (avg > tt.target * 1.1 && asg.desired < asg.max) { asg.desired++; c.events.unshift({ t: now, service: 'autoscaling', msg: `${asg.name}: average CPU ${avg.toFixed(0)}% > target ${tt.target}%: scaling out to ${asg.desired}` }); }
      else if (avg < tt.target * 0.6 && asg.desired > asg.min) { asg.desired--; c.events.unshift({ t: now, service: 'autoscaling', msg: `${asg.name}: average CPU ${avg.toFixed(0)}% well below target: scaling in to ${asg.desired}` }); }
    }
    asg.desired = Math.max(asg.min, Math.min(asg.max, asg.desired));
    const lt = c.launchTemplates.find((l) => l.id === asg.launchTemplateId);
    if (lt && live.length < asg.desired && asg.subnetIds.length) {
      // spread across AZs: pick the subnet with the fewest instances
      const counts = asg.subnetIds.map((s) => ({ s, n: live.filter((x) => x.subnetId === s).length }));
      const subnetId = counts.sort((a, b) => a.n - b.n)[0].s;
      const inst = launchInstance(c, { subnetId, type: lt.type, ami: lt.ami, sgIds: lt.sgIds, iamRole: lt.iamRole, userData: lt.userData, asgId: asg.id, name: `${asg.name}-instance` });
      for (const tg of c.targetGroups.filter((t) => asg.targetGroupIds.includes(t.id))) tg.targets.push(inst.id);
      c.events.unshift({ t: now, service: 'autoscaling', msg: `${asg.name}: launched ${inst.id} in ${c.subnets.find((s) => s.id === subnetId)?.az}` });
    } else if (live.length > asg.desired) {
      const victim = live.sort((a, b) => a.launchedAt - b.launchedAt)[0];
      terminateInstance(c, victim.id);
      c.events.unshift({ t: now, service: 'autoscaling', msg: `${asg.name}: terminated ${victim.id} (scale in)` });
    }
  }
  for (const d of c.dbInstances) {
    if (d.status === 'creating' && now - d.createdAt > 6000) { d.status = 'available'; d.events.unshift({ t: now, msg: 'DB instance created' }); }
    if (d.status === 'rebooting' || d.status === 'modifying') { d.status = 'available'; d.events.unshift({ t: now, msg: 'DB instance available' }); }
    if (d.status === 'failing-over') {
      const old = d.az; d.az = d.standbyAz ?? azsOf(c.region)[1]; d.standbyAz = old; d.status = 'available';
      d.events.unshift({ t: now, msg: `Multi-AZ failover complete. Standby in ${d.az} promoted to primary. The endpoint DNS name is unchanged.` });
    }
  }
  for (const n of c.natGateways) if (n.state !== 'available' && n.state !== 'deleted') n.state = 'available';
  for (const q of c.queues) for (const m of q.messages) if (m.visibleAt > now + q.visibilityTimeoutSec * 1000 + 1) m.visibleAt = now;
  c.events = c.events.slice(0, 200);
}

let handle: ReturnType<typeof setInterval> | undefined;
export function startSim() {
  if (handle) return;
  handle = setInterval(() => useStore.getState().mutateCloud(tick), TICK_MS);
}
export function stopSim() { clearInterval(handle); handle = undefined; }
