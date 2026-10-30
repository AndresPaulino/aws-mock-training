import { useEffect, useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { useStore } from '../../../store/store';
import { rid } from '../../../cloud/seed';
import { usd } from '../../../cloud/pricing';
import type { Alarm, CloudState, Topic } from '../../../cloud/types';
import { alarmState, alarmValue, history, LineChart, metricCatalog, metricKey, type MetricDef } from './metrics';

const useC = () => useCloud((c) => c);
const topicArn = (c: CloudState, t: Topic) => `arn:aws:sns:${t.region}:${c.accountId}:${t.name}`;
const policyArn = (c: CloudState, asgName: string, policyId: string) => `arn:aws:autoscaling:${c.region}:${c.accountId}:scalingPolicy:${policyId}:autoScalingGroupName/${asgName}:policyName/${policyId}`;
const fmtVal = (v: number | undefined, unit: string) => (v === undefined ? '–' : unit === 'USD' ? usd(v) : unit === '%' ? `${v.toFixed(1)}%` : v.toFixed(0));
const unitOf = (metric: string) => (metric === 'CPUUtilization' ? '%' : metric === 'EstimatedCharges' ? 'USD' : 'Count');
const actionLabel = (c: CloudState, a: string) => {
  if (a.startsWith('arn:aws:sns:')) return `SNS: ${a.split(':').pop()}`;
  const asg = c.asgs.find((g) => g.policies.some((p) => a.includes(p.id)));
  return asg ? `Auto Scaling: ${asg.name} policy` : a;
};

export default function CloudWatchConsole() {
  useAlarmEvaluator();
  return (
    <div className="flex">
      <SideNav title="CloudWatch" items={[
        { label: 'Overview', to: '/console/cloudwatch' },
        { section: 'Alarms' }, { label: 'All alarms', to: '/console/cloudwatch/alarms' },
        { section: 'Logs' }, { label: 'Log groups', to: '/console/cloudwatch/logs' },
        { section: 'Metrics' }, { label: 'All metrics', to: '/console/cloudwatch/metrics' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="alarms" element={<AlarmList />} />
          <Route path="alarms/create" element={<CreateAlarm />} />
          <Route path="alarms/:id" element={<AlarmDetail />} />
          <Route path="logs" element={<LogGroups />} />
        </Routes>
      </div>
    </div>
  );
}

/** While the console is open, store alarm state transitions and run their actions (SNS publish, step scaling). */
function useAlarmEvaluator() {
  const simHours = useCloud((c) => c.simHours);
  const { mutate } = useCloudActions();
  useEffect(() => {
    const c = useStore.getState().cloud;
    const changes = c.alarms.map((a) => [a, alarmState(c, a)] as const).filter(([a, s]) => a.state !== s);
    if (!changes.length) return;
    mutate((d) => {
      const now = Date.now();
      for (const [a, s] of changes) {
        const x = d.alarms.find((y) => y.id === a.id);
        if (!x) continue;
        d.events.unshift({ t: now, service: 'cloudwatch', msg: `Alarm "${x.name}" changed from ${x.state} to ${s}` });
        x.state = s;
        if (s !== 'ALARM') continue;
        for (const act of x.actions) {
          const topic = d.topics.find((t) => topicArn(d, t) === act);
          if (topic) { topic.published++; d.events.unshift({ t: now, service: 'sns', msg: `Published alarm "${x.name}" to ${topic.name} (${topic.subscriptions.length} subscription(s))` }); }
          const asg = d.asgs.find((g) => g.policies.some((p) => act.includes(p.id)));
          if (asg && asg.desired < asg.max) { asg.desired++; d.events.unshift({ t: now, service: 'autoscaling', msg: `${asg.name}: alarm ${x.name} triggered a scaling policy: desired capacity → ${asg.desired}` }); }
        }
      }
    });
  }, [simHours]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Overview() {
  const c = useC(); const nav = useNavigate();
  const alarms = c.alarms.filter((a) => a.region === c.region);
  const count = (s: Alarm['state']) => alarms.filter((a) => a.state === s).length;
  return (
    <Page title="CloudWatch overview" crumbs={[{ label: 'CloudWatch' }]}>
      <Panel title="Alarms summary" actions={<Button primary onClick={() => nav('/console/cloudwatch/alarms/create')}>Create alarm</Button>}>
        <KV cols={3} items={[['In alarm', <Status value={`${count('ALARM')} ALARM`} />], ['OK', count('OK')], ['Insufficient data', count('INSUFFICIENT_DATA')]]} />
      </Panel>
      <Panel title="EstimatedCharges (AWS/Billing)"><LineChart points={history('EstimatedCharges', 'account')} unit="USD" /></Panel>
      <Panel title="CloudWatch vs CloudTrail vs Config">
        <Table rows={[
          { id: 'cw', s: 'CloudWatch', q: 'How is it performing?', d: 'Metrics, alarms, logs, dashboards. CPU high → alarm → SNS / Auto Scaling.' },
          { id: 'ct', s: 'CloudTrail', q: 'Who did what, when?', d: 'API call history (user, IP, time). Audits "who deleted the bucket?". Management events on by default for 90 days; create a trail to keep them in S3.' },
          { id: 'cfg', s: 'AWS Config', q: 'What does it look like, and is it compliant?', d: 'Resource configuration history and rules ("are all EBS volumes encrypted?"), with auto-remediation via SSM.' },
        ]} columns={[{ header: 'Service', cell: (r) => <b>{r.s}</b> }, { header: 'Answers', cell: (r) => r.q }, { header: 'Use it for', cell: (r) => r.d }]} />
        <Teach>Exam wording decides it: performance or thresholds → CloudWatch; audit trail of API activity → CloudTrail; configuration drift or compliance → Config. EventBridge (formerly CloudWatch Events) reacts to events from all of them.</Teach>
      </Panel>
    </Page>
  );
}

function Metrics() {
  const c = useC();
  const cat = metricCatalog(c);
  const chartGrid = (ns: MetricDef['namespace']) => {
    const ms = cat.filter((m) => m.namespace === ns);
    return ms.length ? (
      <div className="grid gap-4 md:grid-cols-2">
        {ms.map((m) => (
          <Panel key={metricKey(m.metric, m.resourceId)} title={m.metric} desc={`${m.label} · latest ${fmtVal(m.value, m.unit)}`}>
            <LineChart points={history(m.metric, m.resourceId)} unit={m.unit} />
          </Panel>
        ))}
      </div>
    ) : <Alert>No metrics in {ns} yet. Launch an instance or create an Auto Scaling group.</Alert>;
  };
  return (
    <Page title="Metrics" crumbs={[{ label: 'CloudWatch', to: '/console/cloudwatch' }, { label: 'All metrics' }]}>
      <Teach>EC2 publishes CPU, network and disk I/O every 5 minutes by default (1 minute with detailed monitoring). <b>Memory and disk-space usage are not built in</b>: install the CloudWatch agent to publish them as custom metrics.</Teach>
      <Tabs tabs={[
        { label: 'AWS/EC2', content: chartGrid('AWS/EC2') },
        { label: 'AWS/AutoScaling', content: chartGrid('AWS/AutoScaling') },
        { label: 'AWS/Billing', content: <>{chartGrid('AWS/Billing')}<Teach>Billing metrics live only in <b>us-east-1</b>, whatever Region your resources are in.</Teach></> },
      ]} />
    </Page>
  );
}

function AlarmList() {
  const c = useC(); const nav = useNavigate(); const { remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null); const [del, setDel] = useState(false);
  const rows = c.alarms.filter((a) => a.region === c.region);
  const s = rows.find((a) => a.id === sel);
  return (
    <Page title="Alarms" crumbs={[{ label: 'CloudWatch', to: '/console/cloudwatch' }, { label: 'Alarms' }]}
      actions={<><Button disabled={!s} onClick={() => setDel(true)}>Delete</Button><Button primary onClick={() => nav('/console/cloudwatch/alarms/create')}>Create alarm</Button></>}>
      <Panel title="Alarms" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(a) => a.name} empty="No alarms."
          columns={[
            { header: 'Name', cell: (a) => <Link to={`/console/cloudwatch/alarms/${a.id}`}>{a.name}</Link> },
            { header: 'State', cell: (a) => <Status value={alarmState(c, a)} /> },
            { header: 'Last value', cell: (a) => fmtVal(alarmValue(c, a), unitOf(a.metric)) },
            { header: 'Conditions', cell: (a) => `${a.metric} ${a.comparison} ${a.threshold} for 1 datapoint within ${a.periodMin} minute(s)` },
            { header: 'Actions', cell: (a) => a.actions.map((x) => actionLabel(c, x)).join(', ') || 'No actions' },
          ]} />
      </Panel>
      {del && s && <ConfirmDelete what={`alarm ${s.name}`} onClose={() => setDel(false)} onConfirm={() => { remove('alarms', s.id); log('cloudwatch', `Deleted alarm ${s.name}`); setSel(null); }} />}
    </Page>
  );
}

function CreateAlarm() {
  const c = useC(); const nav = useNavigate(); const { mutate, log } = useCloudActions();
  const cat = metricCatalog(c);
  const topics = c.topics.filter((t) => t.region === c.region);
  const policies = c.asgs.filter((a) => a.region === c.region).flatMap((a) => a.policies.filter((p) => p.type === 'step').map((p) => ({ value: policyArn(c, a.name, p.id), label: `${a.name}: step policy ${p.id}` })));
  const [mk, setMk] = useState(cat[0] ? metricKey(cat[0].metric, cat[0].resourceId) : '');
  const [cmp, setCmp] = useState<Alarm['comparison']>('>'); const [threshold, setThreshold] = useState('80'); const [period, setPeriod] = useState('5');
  const [snsMode, setSnsMode] = useState<'existing' | 'new' | 'none'>(topics.length ? 'existing' : 'new');
  const [topic, setTopic] = useState(topics[0] ? topicArn(c, topics[0]) : ''); const [newTopic, setNewTopic] = useState('cpu-alerts'); const [email, setEmail] = useState('');
  const [asgAction, setAsgAction] = useState(''); const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [tried, setTried] = useState(false);
  const m = cat.find((x) => metricKey(x.metric, x.resourceId) === mk);
  const errs = {
    metric: !m ? 'Select a metric.' : undefined,
    threshold: threshold.trim() === '' || isNaN(Number(threshold)) ? 'Enter a number.' : undefined,
    topic: snsMode === 'existing' && !topic ? 'Choose a topic.' : snsMode === 'new' && !/^[\w-]{1,256}$/.test(newTopic) ? 'Topic names use letters, numbers, - and _.' : snsMode === 'new' && topics.some((t) => t.name === newTopic) ? 'A topic with this name already exists.' : undefined,
    email: snsMode === 'new' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'Enter a valid email address.' : undefined,
    name: !name.trim() ? 'Enter an alarm name.' : c.alarms.some((a) => a.name === name && a.region === c.region) ? 'An alarm with this name already exists.' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTried(true);
    if (!m || Object.values(errs).some(Boolean)) return;
    const actions: string[] = [];
    let created: Topic | undefined;
    if (snsMode === 'existing') actions.push(topic);
    if (snsMode === 'new') { created = { id: rid('topic'), name: newTopic, region: c.region, createdAt: Date.now(), fifo: false, subscriptions: [{ id: rid('sub'), protocol: 'email', endpoint: email }], published: 0 }; actions.push(topicArn(c, created)); }
    if (asgAction) actions.push(asgAction);
    const draft: Alarm = { id: rid('alarm'), name, region: c.region, createdAt: Date.now(), metric: m.metric, resourceId: m.resourceId, comparison: cmp, threshold: Number(threshold), periodMin: Number(period), actions, state: 'INSUFFICIENT_DATA' };
    draft.state = alarmState(c, draft);
    mutate((d) => { if (created) d.topics.push(created); d.alarms.push(draft); });
    if (created) log('sns', `Created topic ${created.name} with email subscription ${email} (pending confirmation)`);
    log('cloudwatch', `Created alarm ${name}: ${m.metric} ${cmp} ${threshold} (${m.label})${desc ? `: ${desc}` : ''}`);
    nav('/console/cloudwatch/alarms');
  };
  const err = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  return (
    <Page title="Create alarm" crumbs={[{ label: 'CloudWatch', to: '/console/cloudwatch' }, { label: 'Alarms', to: '/console/cloudwatch/alarms' }, { label: 'Create alarm' }]}>
      <form onSubmit={submit}>
        <Panel title="Step 1: Specify metric and conditions">
          <Field label="Metric" error={err('metric')}>
            <Select value={mk} onChange={setMk} options={[{ value: '', label: 'Select metric' }, ...cat.map((x) => ({ value: metricKey(x.metric, x.resourceId), label: `${x.namespace} › ${x.metric} › ${x.label}` }))]} />
          </Field>
          {m && <LineChart points={history(m.metric, m.resourceId)} unit={m.unit} threshold={threshold.trim() !== '' && !isNaN(Number(threshold)) ? Number(threshold) : undefined} height={120} />}
          <div className="grid grid-cols-3 gap-4 mt-3">
            <Field label="Statistic"><Select value="Average" onChange={() => {}} options={['Average']} /></Field>
            <Field label="Period"><Select value={period} onChange={setPeriod} options={[{ value: '1', label: '1 minute' }, { value: '5', label: '5 minutes' }, { value: '15', label: '15 minutes' }, { value: '60', label: '1 hour' }]} /></Field>
            <Field label="Threshold type"><Select value="static" onChange={() => {}} options={[{ value: 'static', label: 'Static' }]} /></Field>
          </div>
          <Field label={`Whenever ${m?.metric ?? 'the metric'} is…`}>
            <Radios value={cmp} onChange={setCmp} options={[{ value: '>', label: 'Greater than' }, { value: '<', label: 'Lower than' }]} />
          </Field>
          <Field label="than…" error={err('threshold')}><Input value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field>
        </Panel>
        <Panel title="Step 2: Configure actions">
          <Field label="Notification: send to an SNS topic when in ALARM">
            <Radios value={snsMode} onChange={setSnsMode} options={[{ value: 'existing', label: 'Select an existing SNS topic' }, { value: 'new', label: 'Create new topic' }, { value: 'none', label: 'No notification' }]} />
          </Field>
          {snsMode === 'existing' && <Field label="Send a notification to…" error={err('topic')}><Select value={topic} onChange={setTopic} options={[{ value: '', label: 'Select a topic' }, ...topics.map((t) => ({ value: topicArn(c, t), label: t.name }))]} /></Field>}
          {snsMode === 'new' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Topic name" error={err('topic')}><Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} /></Field>
              <Field label="Email endpoints that will receive the notification" error={err('email')}><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@example.com" /></Field>
            </div>
          )}
          <Field label="Auto Scaling action (optional)" hint={!policies.length ? 'No step scaling policies yet. Add one on an Auto Scaling group\'s "Automatic scaling" tab.' : undefined}>
            <Select value={asgAction} onChange={setAsgAction} options={[{ value: '', label: 'None' }, ...policies]} />
          </Field>
          <Teach>Alarm actions: <b>SNS</b> (email, SMS, Lambda, SQS fan-out), <b>Auto Scaling</b> policies, <b>EC2 actions</b> (stop, terminate, reboot, recover), and Systems Manager OpsItems. Alarms have three states: OK, ALARM and INSUFFICIENT_DATA (no recent datapoints).</Teach>
        </Panel>
        <Panel title="Step 3: Add name and description">
          <Field label="Alarm name" error={err('name')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="high-cpu" /></Field>
          <Field label="Alarm description (optional)"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <p className="aws-hint">Standard-resolution alarm: $0.10 per alarm metric per month.</p>
        </Panel>
        <FormFooter onCancel={() => nav('/console/cloudwatch/alarms')} submitLabel="Create alarm" />
      </form>
    </Page>
  );
}

function AlarmDetail() {
  const c = useC(); const { id } = useParams();
  const a = c.alarms.find((x) => x.id === id);
  if (!a) return <Page title="Alarm not found"><Alert kind="error">It may have been deleted. <Link to="/console/cloudwatch/alarms">Back to alarms</Link></Alert></Page>;
  const unit = unitOf(a.metric);
  return (
    <Page title={a.name} crumbs={[{ label: 'CloudWatch', to: '/console/cloudwatch' }, { label: 'Alarms', to: '/console/cloudwatch/alarms' }, { label: a.name }]}>
      <Panel title="Graph" desc={`${a.metric} ${a.comparison} ${a.threshold} for 1 datapoint within ${a.periodMin} minute(s)`}>
        <LineChart points={history(a.metric, a.resourceId)} unit={unit} threshold={a.threshold} />
      </Panel>
      <Panel title="Details">
        <KV items={[['State', <Status value={alarmState(c, a)} />], ['Current value (period average)', fmtVal(alarmValue(c, a), unit)], ['Metric', a.metric], ['Resource', a.resourceId], ['Period', `${a.periodMin} minute(s)`], ['Actions', a.actions.map((x) => actionLabel(c, x)).join(', ') || 'No actions'], ['ARN', <span className="text-[12px]">{`arn:aws:cloudwatch:${c.region}:${c.accountId}:alarm:${a.name}`}</span>], ['Created', fmtDate(a.createdAt)]]} />
      </Panel>
    </Page>
  );
}

const RETENTION = [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653];
const retentionOptions = [{ value: '', label: 'Never expire' }, ...RETENTION.map((d) => ({ value: String(d), label: `${d} day${d > 1 ? 's' : ''}${d === 30 ? ' (1 month)' : d === 365 ? ' (1 year)' : ''}` }))];
const retentionLabel = (d: number | null) => (d === null ? 'Never expire' : `${d} day${d > 1 ? 's' : ''}`);

function LogGroups() {
  const c = useC(); const { put, patch, remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'retention' | 'delete' | null>(null);
  const [name, setName] = useState('/aws/ec2/web'); const [ret, setRet] = useState('');
  const rows = c.logGroups.filter((l) => l.region === c.region);
  const s = rows.find((l) => l.id === sel);
  const nameErr = !/^[\w\-/.#]{1,512}$/.test(name) ? 'Use letters, numbers and _ - / . #' : rows.some((l) => l.name === name) ? 'A log group with this name already exists.' : undefined;
  const create = () => { put('logGroups', { id: rid('lg'), name, region: c.region, createdAt: Date.now(), retentionDays: ret ? Number(ret) : null, storedMb: 0 }); log('logs', `Created log group ${name} (retention: ${retentionLabel(ret ? Number(ret) : null)})`); setModal(null); };
  const saveRet = () => { if (!s) return; const d = ret ? Number(ret) : null; patch('logGroups', s.id, { retentionDays: d }); log('logs', `Set retention of ${s.name} to ${retentionLabel(d)}`); setModal(null); };
  return (
    <Page title="Log groups" crumbs={[{ label: 'CloudWatch', to: '/console/cloudwatch' }, { label: 'Log groups' }]}
      actions={<>
        <Button disabled={!s} onClick={() => setModal('delete')}>Delete</Button>
        <Button disabled={!s} onClick={() => { setRet(s?.retentionDays ? String(s.retentionDays) : ''); setModal('retention'); }}>Edit retention setting</Button>
        <Button primary onClick={() => { setName('/aws/ec2/web'); setRet(''); setModal('create'); }}>Create log group</Button>
      </>}>
      <Teach title="Retention = cost">New log groups default to <b>Never expire</b>, so logs pile up forever at ~$0.03/GB-month (after $0.50/GB ingestion). Set a retention period, and export to S3 (then lifecycle to Glacier) for cheap long-term archives. Use Logs Insights to query, metric filters to turn log patterns into alarms, and subscription filters to stream to Lambda, Kinesis or OpenSearch.</Teach>
      <Panel title="Log groups" counter={rows.length}>
        <Table rows={rows} selected={sel} onSelect={setSel} filterText={(l) => l.name} empty="No log groups. Lambda functions and the CloudWatch agent create them, or create one yourself."
          columns={[
            { header: 'Log group', cell: (l) => l.name },
            { header: 'Retention', cell: (l) => <span style={l.retentionDays === null ? { color: '#8d6605' } : undefined}>{retentionLabel(l.retentionDays)}</span> },
            { header: 'Stored bytes', cell: (l) => `${l.storedMb.toFixed(1)} MB` },
            { header: 'Metric filters', cell: () => '–' },
            { header: 'Creation time', cell: (l) => fmtDate(l.createdAt) },
          ]} />
      </Panel>
      {modal === 'create' && (
        <Modal title="Create log group" onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button primary disabled={!!nameErr} onClick={create}>Create</Button></>}>
          <Field label="Log group name" error={nameErr}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Retention setting"><Select value={ret} onChange={setRet} options={retentionOptions} /></Field>
        </Modal>
      )}
      {modal === 'retention' && s && (
        <Modal title="Edit retention setting" onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button primary onClick={saveRet}>Save</Button></>}>
          <p className="mb-3">Log group: <b>{s.name}</b></p>
          <Field label="Expire events after"><Select value={ret} onChange={setRet} options={retentionOptions} /></Field>
        </Modal>
      )}
      {modal === 'delete' && s && <ConfirmDelete what={`log group ${s.name}`} warning="All log events in this group are permanently deleted." onClose={() => setModal(null)} onConfirm={() => { remove('logGroups', s.id); log('logs', `Deleted log group ${s.name}`); setSel(null); }} />}
    </Page>
  );
}
