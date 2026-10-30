// The mock AWS Management Console: top bar, service routing, simulation clock and the lab drawer.
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { CONSOLE_SERVICES } from './registry';
import { useStore } from '../store/store';
import { REGIONS } from '../cloud/seed';
import { hourlyTotal, usd } from '../cloud/pricing';
import { startSim, stopSim } from '../cloud/sim';
import { ServiceIcon } from '../ui/ServiceIcon';
import { LabDrawer, useActiveLab } from './LabDrawer';
import { ConsoleHome } from './ConsoleHome';
import { TutorDrawer, useTutor, useTutorContext } from '../ui/Tutor';
import { Toaster } from '../ui/Celebrate';

const GLOBAL = new Set(['iam', 'route53', 'cloudfront', 'billing']);

export default function ConsoleApp() {
  const cloud = useStore((s) => s.cloud);
  const mutate = useStore((s) => s.mutateCloud);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('console:recent') ?? '[]'); } catch { return []; } });
  const tutor = useTutor();
  const searchRef = useRef<HTMLInputElement>(null);
  const svcPath = location.hash.split('/')[2]?.split('?')[0] ?? '';
  const lab = useActiveLab((s) => s.labId);
  const setLab = useActiveLab((s) => s.set);
  useEffect(() => { const l = params.get('lab'); if (l) setLab(l); }, [params, setLab]);

  useEffect(() => { startSim(); return stopSim; }, []);
  useEffect(() => {
    if (!svcPath) return;
    setRecent((r) => { const n = [svcPath, ...r.filter((x) => x !== svcPath)].slice(0, 6); try { localStorage.setItem('console:recent', JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }, [svcPath]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useTutorContext('Mock AWS console', `The learner is in the simulated AWS console, on: ${svcPath || 'Console Home'} (region ${cloud.region}). Resources: ${cloud.vpcs.length} VPCs, ${cloud.subnets.length} subnets, ${cloud.instances.filter((i) => i.state !== 'terminated').length} instances, ${cloud.buckets.length} buckets, ${cloud.dbInstances.length} DBs, ${cloud.iamUsers.length} IAM users, ${cloud.iamRoles.length} roles.`);

  const matches = q ? CONSOLE_SERVICES.filter((s) => `${s.name} ${s.desc} ${s.path}`.toLowerCase().includes(q.toLowerCase())) : [];
  const burn = hourlyTotal(cloud);
  const isGlobal = GLOBAL.has(svcPath);
  const preserve = (to: string) => to;

  return (
    <div className="aws min-h-full flex flex-col">
      <header className="bg-[#232f3e] text-white h-10 flex items-center gap-2 px-3 sticky top-0 z-50 text-[14px]">
        <Link to={preserve('/console')} className="!text-white font-bold tracking-tight text-[17px] px-1 flex items-center" title="Console Home" style={{ textDecoration: 'none' }}>
          <span className="relative leading-none">aws<span className="absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-[#ff9900] [clip-path:ellipse(60%_100%_at_50%_0)]" /></span>
        </Link>
        <button onClick={() => setMenu(!menu)} className="px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1">▦ <span className="hidden sm:inline">Services</span></button>
        <div className="relative flex-1 min-w-[110px] max-w-[560px]">
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search    [Alt+S]" className="w-full bg-[#0f1b2a] border border-[#5f6b7a] rounded-md px-3 py-[3px] text-white placeholder:text-[#8d99a8]"
            onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { nav(preserve(`/console/${matches[0].path}`)); setQ(''); } }} />
          {matches.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white text-[#000716] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 pb-1 text-[12px] font-bold text-[#5f6b7a]">Services</div>
              {matches.map((m) => <button key={m.path} onClick={() => { nav(preserve(`/console/${m.path}`)); setQ(''); }} className="w-full flex gap-3 items-center px-4 py-1.5 hover:bg-[#f2f8fd] text-left"><ServiceIcon id={m.icon} size={26} /><span><span className="font-bold block">{m.name}</span><span className="text-[12px] text-[#5f6b7a]">{m.desc}</span></span></button>)}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="hidden lg:inline whitespace-nowrap px-2 py-0.5 rounded bg-[#0f1b2a] border border-[#5f6b7a] tabular-nums" title="Simulated: what everything running in this account costs per hour, right now">💸 {usd(burn, 3)}/hr · MTD {usd(cloud.accruedUsd)}</span>
          <button onClick={() => tutor.open()} className="px-2 py-1 rounded hover:bg-white/10 whitespace-nowrap" title="Ask the tutor about this console page">🎓 Tutor</button>
          {isGlobal ? <span className="px-2 py-1 text-[#d1d5db]" title="This service is global, not Regional">Global</span> : (
            <select value={cloud.region} onChange={(e) => mutate((c) => { c.region = e.target.value; })} className="bg-transparent hover:bg-white/10 rounded px-1 py-1 max-w-[150px] lg:max-w-none" aria-label="Region">
              {REGIONS.map((r) => <option key={r.id} value={r.id} className="text-black">{r.name} · {r.id}</option>)}
            </select>
          )}
          <span className="px-2 py-1 hidden xl:inline whitespace-nowrap text-[#d1d5db]">Account {cloud.accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
          <Link to="/" className="ml-1 px-3 py-1 rounded-full bg-[#ff9900] !text-[#000716] font-bold whitespace-nowrap" style={{ textDecoration: 'none' }}>Exit to Gauntlet</Link>
        </div>
      </header>
      {menu && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setMenu(false)}>
          <div className="absolute top-10 left-0 w-full max-w-[760px] bg-white rounded-br-xl shadow-2xl p-5 grid sm:grid-cols-2 gap-x-8" onClick={(e) => e.stopPropagation()}>
            {[...new Set(CONSOLE_SERVICES.map((s) => s.category))].map((cat) => (
              <div key={cat} className="mb-3"><div className="font-bold text-[13px] text-[#5f6b7a] mb-1">{cat}</div>
                {CONSOLE_SERVICES.filter((s) => s.category === cat).map((s) => <Link key={s.path} to={preserve(`/console/${s.path}`)} onClick={() => setMenu(false)} className="flex items-center gap-2 py-1"><ServiceIcon id={s.icon} size={22} />{s.name}</Link>)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0">
          <Suspense fallback={<div className="p-8">Loading…</div>}>
            <Routes>
              <Route path="/console" element={<ConsoleHome recent={recent} />} />
              {CONSOLE_SERVICES.map((s) => <Route key={s.path} path={`/console/${s.path}/*`} element={<s.component />} />)}
              <Route path="*" element={<ConsoleHome recent={recent} />} />
            </Routes>
          </Suspense>
        </main>
        {lab && <LabDrawer labId={lab} />}
      </div>
      <TutorDrawer />
      <Toaster />
    </div>
  );
}
