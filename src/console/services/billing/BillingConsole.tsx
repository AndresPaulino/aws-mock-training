import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Page, Panel, Button, Status, Table, Field, Input, Select, MultiCheck, Radios, KV, Teach, Alert, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { rid } from '../../../cloud/seed';
import { costLines, EC2_HOURLY, usd, type CostLine } from '../../../cloud/pricing';
import type { Budget, CloudState } from '../../../cloud/types';

const MONTH_H = 730;
const useC = () => useCloud((c) => c);

/** Month-to-date, burn rate and forecast. Simulated month = 730 sim hours. */
function costSummary(c: CloudState) {
  const lines = costLines(c);
  const hourly = lines.reduce((a, l) => a + l.hourly, 0);
  const elapsed = c.simHours % MONTH_H;
  const remaining = MONTH_H - elapsed;
  const byService: Record<string, { hourly: number; lines: CostLine[] }> = {};
  for (const l of lines) {
    const g = (byService[l.service] ??= { hourly: 0, lines: [] });
    g.hourly += l.hourly;
    g.lines.push(l);
  }
  const services = Object.entries(byService).map(([service, v]) => ({
    id: service, service, hourly: v.hourly, lines: v.lines,
    mtd: hourly ? (c.accruedUsd * v.hourly) / hourly : 0, // ponytail: MTD split by today's burn share; track per-service accrual if history matters
    forecast: (hourly ? (c.accruedUsd * v.hourly) / hourly : 0) + v.hourly * remaining,
  })).sort((a, b) => b.hourly - a.hourly);
  return { lines, hourly, elapsed, remaining, mtd: c.accruedUsd, forecast: c.accruedUsd + hourly * remaining, services };
}

export default function BillingConsole() {
  return (
    <div className="flex">
      <SideNav title="Billing and Cost Management" items={[
        { label: 'Home', to: '/console/billing' },
        { section: 'Billing and Payments' }, { label: 'Bills', to: '/console/billing/bills' },
        { section: 'Cost Analysis' }, { label: 'Cost Explorer', to: '/console/billing/cost-explorer' },
        { section: 'Budgets and Planning' }, { label: 'Budgets', to: '/console/billing/budgets' },
        { section: 'Savings and Commitments' }, { label: 'Savings Plans recommendations', to: '/console/billing/savings-plans' },
        { section: 'Free Tier' }, { label: 'Free Tier & idle costs', to: '/console/billing/free-tier' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<Home />} />
          <Route path="bills" element={<Bills />} />
          <Route path="cost-explorer" element={<CostExplorer />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="budgets/create" element={<CreateBudget />} />
          <Route path="savings-plans" element={<SavingsPlans />} />
          <Route path="free-tier" element={<FreeTier />} />
        </Routes>
      </div>
    </div>
  );
}

function Home() {
  const c = useC(); const s = costSummary(c);
  const idle = idleItems(c);
  return (
    <Page title="Billing and Cost Management home" crumbs={[{ label: 'Billing and Cost Management' }]}>
      <Panel title="Cost summary" desc={`Simulated billing period: day ${Math.floor(s.elapsed / 24) + 1} of ~30 (1 real second = 1 simulated minute).`}>
        <KV cols={4} items={[['Month-to-date cost', <span className="text-[24px] font-bold">{usd(c.accruedUsd)}</span>], ['Total forecasted cost for current month', <span className="text-[24px] font-bold">{usd(s.forecast)}</span>], ['Current burn rate', `${usd(s.hourly, 4)}/hour`], ['Hours left in month', s.remaining.toFixed(0)]]} />
        <p className="aws-hint mt-3">Forecast = month-to-date + current hourly burn × remaining hours in the month.</p>
      </Panel>
      {idle.length > 0 && <Alert kind="warning"><b>{idle.length} resource(s) are costing money while doing nothing</b> ({usd(idle.reduce((a, i) => a + i.hourly, 0), 4)}/hour). <Link to="/console/billing/free-tier">Review idle costs</Link></Alert>}
      <Panel title="Highest cost services this month">
        <Table rows={s.services} empty="Nothing is billing right now." columns={[{ header: 'Service', cell: (r) => r.service }, { header: 'Month-to-date (est.)', cell: (r) => usd(r.mtd) }, { header: 'Hourly now', cell: (r) => usd(r.hourly, 4) }, { header: 'Forecast', cell: (r) => usd(r.forecast) }]} />
      </Panel>
      <Teach title="Cost tools">
        <b>Budgets</b> alert (and can act) on actual or forecasted spend. <b>Cost Explorer</b> visualises and forecasts spend and gives Savings Plan/RI recommendations. <b>Cost and Usage Report</b> (CUR, to S3 + Athena) is the most detailed line-item data. <b>Cost Anomaly Detection</b> uses ML to flag unusual spend. <b>Cost allocation tags</b> must be activated before they show up. In Organizations, <b>consolidated billing</b> pools volume discounts and shares RIs/Savings Plans across accounts.
      </Teach>
    </Page>
  );
}

function Bills() {
  const c = useC(); const s = costSummary(c);
  return (
    <Page title="Bills" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Bills' }]}>
      <Panel title="Charges by service" desc={`Total month-to-date ${usd(c.accruedUsd)} · burning ${usd(s.hourly, 4)}/hour · projected ${usd(s.hourly * MONTH_H)} for a full month at this rate`}>
        {s.services.map((sv) => (
          <details key={sv.service} className="border-b border-[#e9ebed] py-2">
            <summary className="cursor-pointer flex flex-wrap gap-x-6 font-bold"><span className="min-w-[160px]">{sv.service}</span><span className="font-normal">MTD {usd(sv.mtd)}</span><span className="font-normal">{usd(sv.hourly, 4)}/hr</span><span className="font-normal">{usd(sv.hourly * MONTH_H)}/month at this rate</span></summary>
            <Table rows={sv.lines.map((l, i) => ({ ...l, id: String(i) }))} columns={[{ header: 'Resource', cell: (l) => l.resource }, { header: 'Usage', cell: (l) => l.note }, { header: 'Hourly', cell: (l) => usd(l.hourly, 4) }, { header: 'Monthly at this rate', cell: (l) => usd(l.hourly * MONTH_H) }]} />
          </details>
        ))}
        {!s.services.length && <p className="text-[#5f6b7a] py-6 text-center">No charges: nothing is running.</p>}
      </Panel>
      <Teach>Data transfer IN to AWS is free; transfer OUT to the internet and across AZs/Regions costs money. Watch NAT Gateway processing ($0.045/GB): an S3 or DynamoDB <b>gateway endpoint</b> (free) removes it for that traffic.</Teach>
    </Page>
  );
}

function GroupedBars({ rows }: { rows: { label: string; a: number; b: number }[] }) {
  const W = 640, rowH = 34, labelW = 180, H = rows.length * rowH + 28;
  const max = Math.max(0.01, ...rows.map((r) => Math.max(r.a, r.b)));
  const w = (v: number) => (v / max) * (W - labelW - 70);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[760px]" role="img" aria-label="Cost by group: month-to-date and forecast">
      <rect x={labelW} y={4} width={10} height={10} fill="#0972d3" /><text x={labelW + 14} y={13} fontSize="11" fill="#414d5c">Month-to-date (est.)</text>
      <rect x={labelW + 140} y={4} width={10} height={10} fill="#ff9900" /><text x={labelW + 154} y={13} fontSize="11" fill="#414d5c">Forecast (month)</text>
      {rows.map((r, i) => {
        const y = 24 + i * rowH;
        return (
          <g key={r.label}>
            <text x={labelW - 8} y={y + 16} fontSize="12" textAnchor="end" fill="#000716">{r.label.length > 26 ? `${r.label.slice(0, 25)}…` : r.label}</text>
            <rect x={labelW} y={y + 3} width={w(r.a)} height={11} fill="#0972d3" rx="2" /><text x={labelW + w(r.a) + 4} y={y + 12} fontSize="10" fill="#414d5c">{usd(r.a)}</text>
            <rect x={labelW} y={y + 16} width={w(r.b)} height={11} fill="#ff9900" rx="2" /><text x={labelW + w(r.b) + 4} y={y + 25} fontSize="10" fill="#414d5c">{usd(r.b)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CostExplorer() {
  const c = useC(); const s = costSummary(c);
  const [group, setGroup] = useState<'service' | 'resource'>('service');
  const [hidden, setHidden] = useState<string[]>([]);
  const shown = s.services.filter((sv) => !hidden.includes(sv.service));
  const rows = group === 'service'
    ? shown.map((sv) => ({ label: sv.service, a: sv.mtd, b: sv.forecast }))
    : shown.flatMap((sv) => sv.lines).sort((x, y) => y.hourly - x.hourly).slice(0, 12).map((l) => {
      const mtd = s.hourly ? (c.accruedUsd * l.hourly) / s.hourly : 0;
      return { label: `${l.service}: ${l.resource}`, a: mtd, b: mtd + l.hourly * s.remaining };
    });
  return (
    <Page title="Cost Explorer" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Cost Explorer' }]}>
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <Panel title="Cost and usage graph" desc={`Month-to-date ${usd(c.accruedUsd)} · forecast ${usd(s.forecast)}`}>
          {rows.length ? <GroupedBars rows={rows} /> : <p className="text-[#5f6b7a] py-6 text-center">No costs to show.</p>}
        </Panel>
        <Panel title="Report parameters">
          <Field label="Group by"><Select value={group} onChange={(v) => setGroup(v as 'service' | 'resource')} options={[{ value: 'service', label: 'Service' }, { value: 'resource', label: 'Resource (top 12)' }]} /></Field>
          <Field label="Filter: Service">
            <MultiCheck options={s.services.map((sv) => ({ value: sv.service, label: sv.service }))} value={s.services.map((sv) => sv.service).filter((x) => !hidden.includes(x))}
              onChange={(v) => setHidden(s.services.map((sv) => sv.service).filter((x) => !v.includes(x)))} />
          </Field>
          <Field label="Granularity"><Select value="monthly" onChange={() => {}} options={[{ value: 'monthly', label: 'Monthly' }]} /></Field>
        </Panel>
      </div>
      <Teach>Cost Explorer shows up to 13 months of history and a 12-month forecast. Group by <b>tag</b> (after activating cost allocation tags) to see cost per team or project.</Teach>
    </Page>
  );
}

function budgetActual(c: CloudState, b: Budget) {
  if (b.kind === 'usage') return c.instances.filter((i) => i.state === 'running').length * (c.simHours % MONTH_H); // ponytail: EC2 hours assuming today's fleet ran all month
  return c.accruedUsd;
}

function Budgets() {
  const c = useC(); const nav = useNavigate(); const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const s = costSummary(c);
  const rows = c.budgets;
  const b = rows.find((x) => x.id === sel);
  return (
    <Page title="Budgets" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Budgets' }]}
      actions={<><Button disabled={!b} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/billing/budgets/create')}>Create budget</Button></>}>
      <Panel title="Budgets" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} empty="No budgets. Create one so you hear about spend before the bill arrives."
          columns={[
            { header: 'Name', cell: (x) => x.name },
            { header: 'Type', cell: (x) => (x.kind === 'cost' ? 'Cost budget' : 'Usage budget (EC2 hours)') },
            { header: 'Period', cell: (x) => (x.period ?? 'MONTHLY').toLowerCase().replace(/^./, (m) => m.toUpperCase()) },
            { header: 'Budgeted', cell: (x) => (x.kind === 'cost' ? usd(x.amount) : `${x.amount} hrs`) },
            { header: 'Actual', cell: (x) => (x.kind === 'cost' ? usd(budgetActual(c, x)) : `${budgetActual(c, x).toFixed(0)} hrs`) },
            { header: 'Forecasted', cell: (x) => (x.kind === 'cost' ? usd(s.forecast) : '–') },
            { header: 'Current vs. budgeted', cell: (x) => { const pct = (budgetActual(c, x) / x.amount) * 100; return <div className="min-w-[140px]"><div className="h-2 bg-[#e9ebed] rounded"><div className="h-2 rounded" style={{ width: `${Math.min(100, pct)}%`, background: pct >= x.alertPercent ? '#d91515' : '#0972d3' }} /></div><span className="text-[12px]">{pct.toFixed(1)}%</span></div>; } },
            { header: 'Alert', cell: (x) => <>{x.alertPercent}% → {x.email} {(budgetActual(c, x) / x.amount) * 100 >= x.alertPercent ? <Status value="ALARM" /> : <Status value="OK" />}</> },
          ]} />
      </Panel>
      <Teach>Budgets can alert on <b>actual</b> or <b>forecasted</b> spend via email or SNS, and <b>Budget actions</b> can automatically apply an IAM policy or SCP, or stop EC2/RDS instances. The first two budgets are free. Budgets alert; they don't cap spend on their own.</Teach>
      {del && b && <ConfirmDelete what={`budget ${b.name}`} onClose={() => setDel(false)} onConfirm={() => { remove('budgets', b.id); log('budgets', `Deleted budget ${b.name}`); setSel(null); }} />}
    </Page>
  );
}

function CreateBudget() {
  const c = useC(); const nav = useNavigate(); const { put, log } = useCloudActions();
  const [kind, setKind] = useState<Budget['kind']>('cost'); const [name, setName] = useState('My Monthly Cost Budget');
  const [period, setPeriod] = useState<NonNullable<Budget['period']>>('MONTHLY'); const [amount, setAmount] = useState('10');
  const [alert, setAlert] = useState('80'); const [email, setEmail] = useState(''); const [tried, setTried] = useState(false);
  const errs = {
    name: !/^[^:\\]{1,100}$/.test(name) ? 'Enter a name (no : or \\).' : c.budgets.some((b) => b.name === name) ? 'A budget with this name already exists.' : undefined,
    amount: !(Number(amount) > 0) ? 'Enter an amount greater than 0.' : undefined,
    alert: !(Number(alert) > 0 && Number(alert) <= 1000) ? 'Enter a threshold between 1 and 1000%.' : undefined,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'Enter a valid email address.' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    put('budgets', { id: rid('budget'), name, region: 'global', createdAt: Date.now(), amount: Number(amount), alertPercent: Number(alert), email, kind, period });
    log('budgets', `Created ${period.toLowerCase()} ${kind} budget ${name}: ${kind === 'cost' ? usd(Number(amount)) : `${amount} hrs`}, alert at ${alert}% to ${email}`);
    nav('/console/billing/budgets');
  };
  const err = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  return (
    <Page title="Create budget" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Budgets', to: '/console/billing/budgets' }, { label: 'Create budget' }]}>
      <form onSubmit={submit}>
        <Panel title="Budget type">
          <Radios value={kind} onChange={setKind} options={[
            { value: 'cost', label: 'Cost budget (recommended)', desc: 'Monitor costs against a dollar amount.' },
            { value: 'usage', label: 'Usage budget', desc: 'Monitor usage of a resource type (here: EC2 instance-hours).' },
          ]} />
        </Panel>
        <Panel title="Set budget amount">
          <Field label="Budget name" error={err('name')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Period"><Select value={period} onChange={(v) => setPeriod(v as NonNullable<Budget['period']>)} options={[{ value: 'MONTHLY', label: 'Monthly' }, { value: 'QUARTERLY', label: 'Quarterly' }, { value: 'ANNUALLY', label: 'Annually' }]} /></Field>
            <Field label={kind === 'cost' ? 'Budgeted amount ($)' : 'Budgeted amount (hours)'} error={err('amount')}><Input value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          </div>
          <p className="aws-hint">Budget renewal: recurring. Start month: current month.</p>
        </Panel>
        <Panel title="Configure alerts" desc="Alert threshold 1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Threshold (% of budgeted amount)" error={err('alert')} hint="Trigger: Actual"><Input value={alert} onChange={(e) => setAlert(e.target.value)} /></Field>
            <Field label="Email recipients" error={err('email')}><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
          </div>
          <Teach>An 80% actual alert plus a 100% forecasted alert is the classic setup: you hear about it while there's still time to react.</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/billing/budgets')} submitLabel="Create budget" />
      </form>
    </Page>
  );
}

const COMMIT_OPTIONS = [
  { id: 'csp1', name: 'Compute Savings Plans', term: '1-year, No Upfront', disc: 0.28, flex: 'Any EC2 family, size, OS, tenancy or Region; also covers Fargate and Lambda.' },
  { id: 'csp3', name: 'Compute Savings Plans', term: '3-year, All Upfront', disc: 0.54, flex: 'Same flexibility, deeper discount for a longer commitment.' },
  { id: 'isp1', name: 'EC2 Instance Savings Plans', term: '1-year, No Upfront', disc: 0.34, flex: 'One instance family in one Region (any size, OS, tenancy).' },
  { id: 'sri3', name: 'Standard Reserved Instances', term: '3-year, All Upfront', disc: 0.62, flex: 'Specific type and Region; can be sold on the RI Marketplace. Optional capacity reservation (zonal RI).' },
  { id: 'cri3', name: 'Convertible Reserved Instances', term: '3-year, All Upfront', disc: 0.54, flex: 'Can be exchanged for other families, OS or tenancy.' },
  { id: 'spot', name: 'Spot Instances (not a commitment)', term: 'None', disc: 0.7, flex: 'Spare capacity that can be reclaimed with a 2-minute warning. Only for fault-tolerant work.' },
];

function SavingsPlans() {
  const c = useC();
  const od = c.instances.filter((i) => (i.state === 'running' || i.state === 'pending') && i.purchase === 'on-demand');
  const odHourly = od.reduce((a, i) => a + (EC2_HOURLY[i.type] ?? 0.1), 0);
  const best = COMMIT_OPTIONS[0];
  return (
    <Page title="Savings Plans recommendations" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Savings Plans' }]}>
      {od.length ? (
        <>
          <Alert kind="success">
            Based on {od.length} running On-Demand instance(s) ({usd(odHourly, 4)}/hour), a <b>{best.name} ({best.term})</b> with a commitment of <b>{usd(odHourly * (1 - best.disc), 4)}/hour</b> would save <b>~{Math.round(best.disc * 100)}%</b>, about <b>{usd(odHourly * best.disc * MONTH_H)}/month</b>.
          </Alert>
          <Panel title="Commitment options for your current On-Demand usage">
            <Table rows={COMMIT_OPTIONS} columns={[
              { header: 'Option', cell: (o) => <b>{o.name}</b> }, { header: 'Term / payment', cell: (o) => o.term },
              { header: 'Est. discount', cell: (o) => `~${Math.round(o.disc * 100)}%` },
              { header: 'Est. monthly savings', cell: (o) => usd(odHourly * o.disc * MONTH_H) },
              { header: 'Flexibility', cell: (o) => o.flex },
            ]} />
          </Panel>
          <Panel title="On-Demand instances analysed" counter={od.length}>
            <Table rows={od} columns={[{ header: 'Instance', cell: (i) => i.name || i.id }, { header: 'Type', cell: (i) => i.type }, { header: 'Hourly', cell: (i) => usd(EC2_HOURLY[i.type] ?? 0.1, 4) }, { header: 'Region', cell: (i) => i.region }]} />
          </Panel>
        </>
      ) : <Alert>No recommendations: no On-Demand instances are running. Launch some (or an Auto Scaling group) and come back.</Alert>}
      <Teach title="Picking a pricing model">Commit (Savings Plans / RIs) only for the <b>steady baseline</b> you'll run 24/7 for 1–3 years; cover predictable peaks with scheduled scaling on On-Demand and interruptible batch with <b>Spot</b>. "Flexibility across families, Regions, Fargate and Lambda" → Compute Savings Plan. "Biggest discount, fixed instance family" → EC2 Instance SP or Standard RI. "Need guaranteed capacity in one AZ" → zonal RI or an On-Demand Capacity Reservation. RIs also exist for RDS, ElastiCache, Redshift and OpenSearch.</Teach>
    </Page>
  );
}

function idleItems(c: CloudState) {
  const lines = costLines(c);
  const cost = (r: string) => lines.find((l) => l.resource === r)?.hourly ?? 0;
  const out: { id: string; what: string; resource: string; hourly: number; fix: string }[] = [];
  for (const v of c.volumes) {
    if (!v.attachedTo) out.push({ id: v.id, what: 'Unattached EBS volume', resource: `${v.id} (${v.sizeGb} GiB ${v.type})`, hourly: cost(v.id), fix: 'Snapshot it (cheaper, archive tier cheaper still) and delete the volume.' });
    else if (c.instances.find((i) => i.id === v.attachedTo)?.state === 'stopped') out.push({ id: v.id, what: 'EBS volume on a stopped instance', resource: `${v.id} → ${v.attachedTo}`, hourly: cost(v.id), fix: 'Stopped instances stop compute charges, but their volumes keep billing.' });
  }
  for (const e of c.elasticIps) out.push({ id: e.id, what: e.instanceId ? 'Elastic IP (public IPv4)' : 'Idle Elastic IP', resource: `${e.publicIp} (${e.id})`, hourly: cost(e.id), fix: e.instanceId ? 'All public IPv4 addresses bill $0.005/hr; use IPv6 or a load balancer where you can.' : 'Release it if nothing uses it.' });
  for (const n of c.natGateways) if (n.state === 'available' && n.kind === 'gateway') out.push({ id: n.id, what: 'NAT Gateway', resource: n.name || n.id, hourly: cost(n.name || n.id), fix: 'Bills hourly even with no traffic. Delete it in dev/test, share one per AZ, use gateway endpoints for S3/DynamoDB.' });
  for (const i of c.instances) if ((i.state === 'running' || i.state === 'pending') && i.publicIp && !i.elasticIp) out.push({ id: `${i.id}-ip`, what: 'Auto-assigned public IPv4', resource: i.name || i.id, hourly: cost(`${i.id} public IPv4`), fix: 'Instances behind a load balancer rarely need public IPs: put them in private subnets.' });
  for (const lb of c.loadBalancers) {
    const tgs = c.targetGroups.filter((t) => lb.listeners.some((l) => l.targetGroupId === t.id));
    if (!tgs.some((t) => t.targets.some((x) => c.instances.find((i) => i.id === x)?.state === 'running'))) out.push({ id: lb.id, what: 'Load balancer with no healthy targets', resource: lb.name, hourly: cost(lb.name), fix: 'Load balancers bill hourly whether or not they serve traffic.' });
  }
  for (const ep of c.endpoints) if (ep.type === 'Interface') out.push({ id: ep.id, what: 'Interface VPC endpoint', resource: `${ep.service} (${ep.id})`, hourly: cost(ep.id), fix: 'Interface endpoints bill per AZ per hour; gateway endpoints (S3, DynamoDB) are free.' });
  return out;
}

function FreeTier() {
  const c = useC();
  const idle = idleItems(c);
  const micro = c.instances.filter((i) => i.state === 'running' && /^t[234]g?\.micro$/.test(i.type)).length;
  const freeRows = [
    { id: 'ec2', svc: 'Amazon EC2', offer: '750 hours/month of t2.micro or t3.micro (12 months)', now: `${micro} micro instance(s) running: ${micro > 1 ? 'more than one running 24/7 exceeds 750 h' : 'within the free tier'}` },
    { id: 'ebs', svc: 'Amazon EBS', offer: '30 GB of gp2/gp3 (12 months)', now: `${c.volumes.reduce((a, v) => a + v.sizeGb, 0)} GB provisioned` },
    { id: 's3', svc: 'Amazon S3', offer: '5 GB Standard storage (12 months)', now: `${c.buckets.length} bucket(s)` },
    { id: 'cw', svc: 'Amazon CloudWatch', offer: '10 alarms and 10 custom metrics (always free)', now: `${c.alarms.length} alarm(s)` },
    { id: 'lambda', svc: 'AWS Lambda', offer: '1M requests and 400,000 GB-seconds/month (always free)', now: `${c.lambdas.length} function(s)` },
    { id: 'ddb', svc: 'Amazon DynamoDB', offer: '25 GB storage and 25 RCU/WCU provisioned (always free)', now: `${c.dynamoTables.length} table(s)` },
  ];
  return (
    <Page title="Free Tier and idle costs" crumbs={[{ label: 'Billing and Cost Management', to: '/console/billing' }, { label: 'Free Tier' }]}>
      <Panel title="What's charging while idle" counter={idle.length} desc={`Together: ${usd(idle.reduce((a, i) => a + i.hourly, 0), 4)}/hour, ${usd(idle.reduce((a, i) => a + i.hourly, 0) * MONTH_H)}/month.`}>
        <Table rows={idle} empty="Nothing is billing while idle. Nice and tidy." columns={[{ header: 'Item', cell: (i) => <b>{i.what}</b> }, { header: 'Resource', cell: (i) => i.resource }, { header: 'Hourly', cell: (i) => usd(i.hourly, 4) }, { header: 'How to stop paying', cell: (i) => i.fix }]} />
      </Panel>
      <Panel title="Free Tier usage" desc="Approximate, based on what is provisioned right now.">
        <Table rows={freeRows} columns={[{ header: 'Service', cell: (r) => r.svc }, { header: 'Free Tier offer', cell: (r) => r.offer }, { header: 'Your account now', cell: (r) => r.now }]} />
      </Panel>
      <Teach>Idle costs that show up on the exam: unattached EBS volumes and old snapshots, idle Elastic IPs (all public IPv4 now bills), NAT Gateways in unused VPCs, load balancers with no targets, and log groups that never expire. Trusted Advisor's cost checks and Compute Optimizer flag many of these automatically.</Teach>
      <p className="aws-hint">Last refreshed {fmtDate(Date.now())}</p>
    </Page>
  );
}
