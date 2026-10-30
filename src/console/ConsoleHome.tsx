import { Link } from 'react-router-dom';
import { CONSOLE_SERVICES } from './registry';
import { useStore } from '../store/store';
import { costLines, hourlyTotal, usd } from '../cloud/pricing';
import { ServiceIcon } from '../ui/ServiceIcon';
import { Panel, Teach, fmtDate } from './kit';
import { labs } from '../labs';
import { useActiveLab } from './LabDrawer';

export function ConsoleHome({ recent }: { recent: string[] }) {
  const cloud = useStore((s) => s.cloud);
  const labState = useStore((s) => s.labs);
  const setLab = useActiveLab((s) => s.set);
  const lines = costLines(cloud).sort((a, b) => b.hourly - a.hourly).slice(0, 6);
  const recentSvcs = recent.map((r) => CONSOLE_SERVICES.find((s) => s.path === r)).filter(Boolean);
  return (
    <div className="px-6 py-5 max-w-[1300px]">
      <div className="flex items-center gap-3 mb-4"><h1 className="text-[28px] font-bold">Console Home</h1><span className="text-[#5f6b7a]">Simulated account · nothing here is real, and nothing bills you</span></div>
      {!cloud.rootMfa && <div className="rounded-lg border-2 border-[#d91515] bg-[#fff7f7] px-4 py-3 mb-4">⊗ <b>Security recommendation:</b> your root user doesn't have MFA. <Link to="/console/iam">Add MFA in IAM</Link>.</div>}
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Recently visited" className="lg:col-span-1">
          {(recentSvcs.length ? recentSvcs : CONSOLE_SERVICES.slice(0, 6)).map((s) => <Link key={s!.path} to={`/console/${s!.path}`} className="flex items-center gap-2 py-1.5"><ServiceIcon id={s!.icon} size={24} />{s!.name}</Link>)}
          <div className="border-t border-[#e9ebed] mt-2 pt-2 text-[13px] text-[#5f6b7a]">All {CONSOLE_SERVICES.length} services are in the ▦ Services menu.</div>
        </Panel>
        <Panel title="Cost and usage" className="lg:col-span-1">
          <div className="text-[28px] font-bold tabular-nums">{usd(cloud.accruedUsd)}</div>
          <div className="text-[#5f6b7a] text-[13px]">Month-to-date (simulated clock: 1 s = 1 min)</div>
          <div className="mt-2">Current burn rate: <b>{usd(hourlyTotal(cloud), 3)}/hour</b> ≈ {usd(hourlyTotal(cloud) * 730)}/month</div>
          <table className="w-full text-[13px] mt-3">{lines.map((l, i) => <tr key={i} className="border-t border-[#e9ebed]"><td className="py-1">{l.service}</td><td className="py-1 text-[#5f6b7a] truncate max-w-[140px]">{l.note}</td><td className="text-right tabular-nums">{usd(l.hourly, 4)}/h</td></tr>)}</table>
          {!lines.length && <p className="text-[#5f6b7a]">Nothing is running. The default VPC itself is free.</p>}
          <Link to="/console/billing" className="block mt-2 text-[13px]">Go to Billing and Cost Management</Link>
        </Panel>
        <Panel title="Guided labs" className="lg:col-span-1">
          {labs.slice(0, 8).map((l) => <button key={l.id} onClick={() => setLab(l.id)} className="link flex items-center gap-2 py-1 text-left">{labState[l.id]?.completedAt ? '✅' : '🧪'} {l.title}</button>)}
          {!labs.length && <p className="text-[#5f6b7a]">Labs are loading.</p>}
          <Link to="/labs" className="block mt-2 text-[13px]">All labs</Link>
        </Panel>
      </div>
      <Panel title="Account activity" desc="A CloudTrail-style log of what happened in this account.">
        <Teach>CloudTrail records <b>who did what, when, from where</b> (API activity). CloudWatch records <b>how resources are performing</b> (metrics, logs, alarms). The exam tests this distinction constantly.</Teach>
        <table className="w-full text-[13px]">
          <tbody>{cloud.events.slice(0, 12).map((e, i) => <tr key={i} className="border-t border-[#e9ebed]"><td className="py-1 pr-3 whitespace-nowrap text-[#5f6b7a]">{fmtDate(e.t)}</td><td className="pr-3 font-bold">{e.service}</td><td>{e.msg}</td></tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
