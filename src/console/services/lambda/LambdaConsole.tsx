import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { CloudState, IamRole, LambdaFunction } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Page, Panel, Button, Table, Field, Input, Select, MultiCheck, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { invokeLambda, lambdaArn, type InvokeResult } from './invoke';
import { sqsArn, findQueue } from '../sqs/util';
import { topicArn } from '../sns/util';

export default function LambdaConsole() {
  return (
    <div className="flex">
      <SideNav title="AWS Lambda" items={[{ label: 'Dashboard', to: '/console/lambda' }, { label: 'Functions', to: '/console/lambda' }, { section: 'Additional resources' }, { label: 'Layers', to: '/console/lambda' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<FunctionList />} />
          <Route path="create" element={<CreateFunction />} />
          <Route path="functions/:id" element={<FunctionDetail />} />
        </Routes>
      </div>
    </div>
  );
}

export const RUNTIMES = ['nodejs22.x', 'nodejs20.x', 'python3.13', 'python3.12', 'java21', 'dotnet8', 'ruby3.3', 'provided.al2023'];
const isPy = (r: string) => r.startsWith('python');
const defaultCode = (r: string) => isPy(r)
  ? "import json\n\ndef lambda_handler(event, context):\n    return {\n        'statusCode': 200,\n        'body': json.dumps('Hello from Lambda!')\n    }\n"
  : "export const handler = async (event) => {\n  const response = {\n    statusCode: 200,\n    body: JSON.stringify('Hello from Lambda!'),\n  };\n  return response;\n};\n";

function FunctionList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const rows = c.lambdas.filter((f) => f.region === c.region);
  return (
    <Page title="Functions" crumbs={[{ label: 'Lambda', to: '/console/lambda' }, { label: 'Functions' }]}>
      <Panel title="Functions" counter={rows.length} actions={<Button primary onClick={() => nav('/console/lambda/create')}>Create function</Button>}>
        <Table rows={rows} filterText={(f) => f.name} empty="There is no data to display." columns={[
          { header: 'Function name', cell: (f) => <Link to={`/console/lambda/functions/${f.id}`}>{f.name}</Link> },
          { header: 'Package type', cell: () => 'Zip' },
          { header: 'Runtime', cell: (f) => f.runtime },
          { header: 'Triggers', cell: (f) => f.triggers.length },
          { header: 'Memory (MB)', cell: (f) => f.memoryMb },
          { header: 'Last modified', cell: (f) => fmtDate(f.createdAt) },
        ]} />
      </Panel>
    </Page>
  );
}

function CreateFunction() {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const lambdaRoles = c.iamRoles.filter((r) => r.trustedEntity.includes('lambda.amazonaws.com'));
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState(RUNTIMES[0]);
  const [roleMode, setRoleMode] = useState<'new' | 'existing'>('new');
  const [roleId, setRoleId] = useState(lambdaRoles[0]?.id ?? '');
  const [tried, setTried] = useState(false);
  const errs = {
    name: !/^[a-zA-Z0-9_-]{1,64}$/.test(name) ? 'Function name must be 1–64 characters: letters, numbers, hyphens or underscores.' : c.lambdas.some((f) => f.region === c.region && f.name === name) ? 'A function with this name already exists.' : undefined,
    role: roleMode === 'existing' && !roleId ? 'Choose a role that Lambda can assume (trusted entity lambda.amazonaws.com).' : undefined,
  };
  const valid = Object.values(errs).every((e) => !e);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const fnId = rid('fn');
    let rId = roleId;
    mutate((d) => {
      if (roleMode === 'new') {
        const role: IamRole = { id: rid('role'), name: `${name}-role-${Math.random().toString(36).slice(2, 10)}`, region: 'global', createdAt: Date.now(), trustedEntity: 'lambda.amazonaws.com', policyIds: ['pol-lambda-basic'], description: `Execution role for Lambda function ${name}` };
        d.iamRoles.push(role);
        rId = role.id;
      }
      d.lambdas.push({ id: fnId, name, region: d.region, createdAt: Date.now(), runtime, memoryMb: 128, timeoutSec: 3, roleId: rId, handler: isPy(runtime) ? 'lambda_function.lambda_handler' : 'index.handler', code: defaultCode(runtime), triggers: [], vpcSubnetIds: [], invocations: [] });
    });
    log('lambda', `CreateFunction ${name} (${runtime})${roleMode === 'new' ? ' with a new basic execution role' : ''}`);
    nav(`/console/lambda/functions/${fnId}`);
  };
  return (
    <Page title="Create function" crumbs={[{ label: 'Lambda', to: '/console/lambda' }, { label: 'Functions', to: '/console/lambda' }, { label: 'Create function' }]}>
      <form onSubmit={submit}>
        <Panel title="Create function">
          <Radios value="scratch" onChange={() => {}} options={[{ value: 'scratch', label: 'Author from scratch', desc: 'Start with a simple Hello World example.' }]} />
        </Panel>
        <Panel title="Basic information">
          <Field label="Function name" hint="Enter a name that describes the purpose of your function." error={tried ? errs.name : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="myFunctionName" /></Field>
          <Field label="Runtime" hint="Choose the language to use to write your function."><Select value={runtime} onChange={setRuntime} options={RUNTIMES} /></Field>
        </Panel>
        <Panel title="Change default execution role">
          <Field label="Execution role">
            <Radios value={roleMode} onChange={setRoleMode} options={[
              { value: 'new', label: 'Create a new role with basic Lambda permissions', desc: 'Lambda creates a role with permission to upload logs to CloudWatch Logs.' },
              { value: 'existing', label: 'Use an existing role', desc: 'Choose a role that trusts lambda.amazonaws.com.' },
            ]} />
          </Field>
          {roleMode === 'existing' && <Field label="Existing role" error={tried ? errs.role : undefined}>
            {lambdaRoles.length ? <Select value={roleId} onChange={setRoleId} options={lambdaRoles.map((r) => ({ value: r.id, label: r.name }))} />
              : <Alert kind="warning">No IAM roles trust lambda.amazonaws.com yet. Create one in <Link to="/console/iam">IAM</Link>, or let Lambda create a basic role.</Alert>}
          </Field>}
          <Teach>The <b>execution role</b> is what your code runs as: it gets temporary credentials for it automatically. Never put access keys in function code. Add only the permissions it needs (e.g. AWSLambdaSQSQueueExecutionRole for an SQS trigger).</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/lambda')} submitLabel="Create function" />
      </form>
    </Page>
  );
}

const DEFAULT_EVENT = '{\n  "key1": "value1",\n  "key2": "value2",\n  "key3": "value3"\n}';

function FunctionDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const f = c.lambdas.find((x) => x.id === id);
  const [code, setCode] = useState(f?.code ?? '');
  const [event, setEvent] = useState(DEFAULT_EVENT);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [eventErr, setEventErr] = useState('');
  const [trigger, setTrigger] = useState(false);
  const [del, setDel] = useState(false);
  if (!f) return <Page title="Function not found"><Alert kind="error">This function doesn't exist. <Link to="/console/lambda">Back to Functions</Link></Alert></Page>;
  const role = c.iamRoles.find((r) => r.id === f.roleId);
  const arn = lambdaArn(c, f);

  const test = () => {
    let ev: unknown;
    try { ev = JSON.parse(event); setEventErr(''); } catch { setEventErr('Event JSON is not valid.'); return; }
    let r: InvokeResult | undefined;
    mutate((d) => { r = invokeLambda(d, f.id, ev, 'Console test'); });
    log('lambda', `Invoke ${f.name} (test event): ${r?.ok ? 'Succeeded' : 'Failed'}`);
    setResult(r ?? null);
  };
  const results = result && (
    <Alert kind={result.ok ? 'success' : 'error'}>
      <div className="font-bold mb-1">Execution result: {result.ok ? 'succeeded' : 'failed'} ({result.ms} ms)</div>
      <div className="text-[13px] font-bold">Response</div>
      <pre className="text-[12px] bg-white/70 p-2 rounded overflow-x-auto">{result.response}</pre>
      <div className="text-[13px] font-bold mt-2">Function Logs</div>
      <pre className="text-[12px] bg-white/70 p-2 rounded overflow-x-auto">{result.log}</pre>
    </Alert>
  );

  return (
    <Page title={f.name} crumbs={[{ label: 'Lambda', to: '/console/lambda' }, { label: 'Functions', to: '/console/lambda' }, { label: f.name }]} actions={<Button danger onClick={() => setDel(true)}>Delete</Button>}>
      <Panel title="Function overview" actions={<Button onClick={() => setTrigger(true)}>+ Add trigger</Button>}>
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="space-y-2">
            {f.triggers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 border border-[#e9ebed] rounded-lg px-3 py-2 text-[13px]">
                <span className="font-bold uppercase text-[11px] bg-[#f2f8fd] text-[#0972d3] rounded px-1.5">{t.type}</span>
                <span className="truncate" title={t.source}>{t.source.split(':').pop()}</span>
                <button className="link ml-auto" onClick={() => { mutate((d) => { const x = d.lambdas.find((y) => y.id === f.id); if (x) x.triggers = x.triggers.filter((_, k) => k !== i); }); log('lambda', `Removed ${t.type} trigger from ${f.name}`); }}>Remove</button>
              </div>
            ))}
            {!f.triggers.length && <div className="text-[#5f6b7a] text-[13px]">No triggers. Add one to run this function in response to events.</div>}
          </div>
          <div className="border-2 border-[#ff9900] rounded-lg px-6 py-4 text-center font-bold">λ {f.name}<div className="text-[12px] font-normal text-[#5f6b7a]">Layers (0)</div></div>
          <KV cols={1} items={[['Function ARN', <code className="text-[12px]">{arn}</code>], ['Last modified', fmtDate(f.createdAt)]]} />
        </div>
      </Panel>
      <Tabs tabs={[
        { label: 'Code', content: <Panel title="Code source" actions={<><Button disabled={code === f.code} onClick={() => { mutate((d) => { const x = d.lambdas.find((y) => y.id === f.id); if (x) x.code = code; }); log('lambda', `UpdateFunctionCode ${f.name}`); }}>Deploy</Button><Button primary onClick={test}>Test</Button></>}>
          <div className="text-[13px] text-[#5f6b7a] mb-1">{isPy(f.runtime) ? 'lambda_function.py' : 'index.mjs'} · Handler: {f.handler}</div>
          <textarea className="aws-input font-mono text-[13px] w-full" rows={14} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
          {code !== f.code && <Alert kind="warning">Changes not deployed. Test runs the deployed code: choose <b>Deploy</b> first.</Alert>}
          {results}
        </Panel> },
        { label: 'Test', content: <Panel title="Test event" actions={<Button primary onClick={test}>Test</Button>}>
          <Field label="Event JSON" error={eventErr}><textarea className="aws-input font-mono text-[13px] w-full" rows={10} value={event} onChange={(e) => setEvent(e.target.value)} /></Field>
          {results}
          <Teach>The first invoke after a while is a <b>cold start</b> (see Init Duration in the logs). Provisioned concurrency keeps environments warm for latency-sensitive APIs.</Teach>
        </Panel> },
        { label: 'Monitor', content: <Monitor f={f} /> },
        { label: 'Configuration', content: <Config f={f} role={role} /> },
      ]} />
      {trigger && <AddTrigger f={f} onClose={() => setTrigger(false)} />}
      {del && <ConfirmDelete what={`function ${f.name}`} onClose={() => setDel(false)} onConfirm={() => { nav('/console/lambda'); mutate((d) => { d.lambdas = d.lambdas.filter((x) => x.id !== f.id); }); log('lambda', `DeleteFunction ${f.name}`); }} />}
    </Page>
  );
}

function Monitor({ f }: { f: LambdaFunction }) {
  const errors = f.invocations.filter((i) => !i.ok).length;
  const avg = f.invocations.length ? Math.round(f.invocations.reduce((a, i) => a + i.ms, 0) / f.invocations.length) : 0;
  return <>
    <Panel title="CloudWatch metrics">
      <KV cols={4} items={[['Invocations', f.invocations.length], ['Errors', errors], ['Duration (avg)', `${avg} ms`], ['Success rate', f.invocations.length ? `${Math.round(((f.invocations.length - errors) / f.invocations.length) * 100)}%` : '–']]} />
    </Panel>
    <Panel title="Recent invocations" counter={f.invocations.length} desc={`Logs: CloudWatch log group /aws/lambda/${f.name}`}>
      <Table rows={f.invocations.map((i, k) => ({ ...i, id: String(k) }))} empty="No invocations yet. Use Test to invoke the function." columns={[
        { header: 'Timestamp', cell: (i) => fmtDate(i.t) },
        { header: 'Status', cell: (i) => <span style={{ color: i.ok ? '#037f0c' : '#d91515' }}>{i.ok ? 'Success' : 'Error'}</span> },
        { header: 'Duration', cell: (i) => `${i.ms} ms` },
        { header: 'Message', cell: (i) => i.msg },
      ]} />
    </Panel>
  </>;
}

function Config({ f, role }: { f: LambdaFunction; role?: IamRole }) {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [mem, setMem] = useState(String(f.memoryMb));
  const [min, setMin] = useState(String(Math.floor(f.timeoutSec / 60)));
  const [sec, setSec] = useState(String(f.timeoutSec % 60));
  const [subnets, setSubnets] = useState<string[]>(f.vpcSubnetIds);
  const [reserved, setReserved] = useState(f.reservedConcurrency?.toString() ?? '');
  const [prov, setProv] = useState(f.provisionedConcurrency?.toString() ?? '');
  const timeout = Number(min) * 60 + Number(sec);
  const errs = {
    mem: Number(mem) >= 128 && Number(mem) <= 10240 && Number.isInteger(Number(mem)) ? undefined : 'Memory must be an integer between 128 MB and 10,240 MB.',
    timeout: timeout >= 1 && timeout <= 900 && Number.isInteger(timeout) ? undefined : 'Timeout must be between 1 second and 15 minutes (900 seconds).',
    reserved: reserved === '' || (Number(reserved) >= 0 && Number(reserved) <= 1000) ? undefined : 'Reserved concurrency must be 0–1000 (the account limit, minus 100 unreserved).',
    prov: prov === '' || (Number(prov) >= 0 && (reserved === '' || Number(prov) <= Number(reserved))) ? undefined : 'Provisioned concurrency can\'t exceed reserved concurrency.',
  };
  const save = () => {
    if (Object.values(errs).some(Boolean)) return;
    mutate((d) => { const x = d.lambdas.find((y) => y.id === f.id); if (!x) return; x.memoryMb = Number(mem); x.timeoutSec = timeout; x.vpcSubnetIds = subnets; x.reservedConcurrency = reserved === '' ? undefined : Number(reserved); x.provisionedConcurrency = prov === '' || prov === '0' ? undefined : Number(prov); });
    log('lambda', `UpdateFunctionConfiguration ${f.name}: ${mem} MB, timeout ${timeout}s${subnets.length ? `, VPC (${subnets.length} subnets)` : ''}`);
  };
  const subnetsHere = c.subnets.filter((s) => s.region === c.region);
  return <>
    <Panel title="General configuration">
      <Field label="Memory (MB)" hint="128 MB to 10,240 MB. CPU is allocated in proportion to memory." error={errs.mem}><Input type="number" value={mem} onChange={(e) => setMem(e.target.value)} /></Field>
      <Field label="Timeout" error={errs.timeout}><div className="flex gap-2 items-center"><Input type="number" className="max-w-[90px]" value={min} onChange={(e) => setMin(e.target.value)} /> min <Input type="number" className="max-w-[90px]" value={sec} onChange={(e) => setSec(e.target.value)} /> sec</div></Field>
      <Teach title="15-minute limit">A Lambda invocation can run for at most <b>900 seconds (15 minutes)</b>. A job longer than that (video transcoding, big ETL) belongs on <b>ECS/Fargate, AWS Batch or Step Functions</b> splitting the work. Behind API Gateway the effective limit is the 29-second integration timeout.</Teach>
    </Panel>
    <Panel title="VPC" desc="Attach the function to private subnets to reach resources like RDS inside the VPC.">
      <MultiCheck value={subnets} onChange={setSubnets} options={subnetsHere.map((s) => ({ value: s.id, label: `${s.name || s.id} (${s.cidr}, ${s.az})` }))} />
      <Teach>A VPC-attached function loses direct internet access: it needs a <b>NAT gateway</b> (or VPC endpoints) to call public AWS APIs. Pick subnets in at least two AZs.</Teach>
    </Panel>
    <Panel title="Concurrency">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Reserved concurrency" hint="Guarantees, and caps, how many instances this function may run at once. 0 throttles all invokes." error={errs.reserved}><Input type="number" value={reserved} onChange={(e) => setReserved(e.target.value)} placeholder="Use unreserved account concurrency" /></Field>
        <Field label="Provisioned concurrency" hint="Pre-initialized environments: no cold starts, billed while idle." error={errs.prov}><Input type="number" value={prov} onChange={(e) => setProv(e.target.value)} placeholder="0" /></Field>
      </div>
      <Teach>Reserved concurrency protects a downstream DB from being overwhelmed (and stops one function starving others). Provisioned concurrency fixes cold-start latency.</Teach>
    </Panel>
    <Panel title="Permissions">
      <KV items={[['Execution role', role ? <Link to="/console/iam">{role.name}</Link> : 'None'], ['Policies', role?.policyIds.map((p) => c.iamPolicies.find((x) => x.id === p)?.name ?? p).join(', ') || '–']]} />
    </Panel>
    <div className="flex justify-end mb-10"><Button primary onClick={save} disabled={Object.values(errs).some(Boolean)}>Save</Button></div>
  </>;
}

type TType = LambdaFunction['triggers'][number]['type'];
const canPollSqs = (c: CloudState, role?: IamRole) => !!role?.policyIds.some((p) => ['pol-lambda-sqs', 'pol-sqs-full', 'pol-admin', 'pol-poweruser'].includes(p) || c.iamPolicies.find((x) => x.id === p)?.document.includes('sqs:ReceiveMessage'));

function AddTrigger({ f, onClose }: { f: LambdaFunction; onClose: () => void }) {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [type, setType] = useState<TType>('sqs');
  const queues = c.queues.filter((q) => q.region === c.region);
  const apis = c.apis.filter((a) => a.region === c.region && a.kind !== 'WebSocket');
  const topics = c.topics.filter((t) => t.region === c.region && !t.fifo);
  const tables = c.dynamoTables.filter((t) => t.region === c.region);
  const [src, setSrc] = useState('');
  const [expr, setExpr] = useState('rate(5 minutes)');
  const [batch, setBatch] = useState('10');
  const role = c.iamRoles.find((r) => r.id === f.roleId);
  const options: Record<TType, { value: string; label: string }[]> = {
    sqs: queues.map((q) => ({ value: q.id, label: q.name })),
    'api-gateway': [{ value: 'new', label: 'Create a new HTTP API' }, ...apis.map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` }))],
    s3: c.buckets.map((b) => ({ value: b.name, label: b.name })),
    eventbridge: [],
    sns: topics.map((t) => ({ value: t.id, label: t.name })),
    'dynamodb-stream': tables.map((t) => ({ value: t.id, label: `${t.name}${t.streams ? '' : ' (stream off)'}` })),
  };
  const sel = src || options[type][0]?.value || '';
  const q = type === 'sqs' ? queues.find((x) => x.id === sel) : undefined;
  const table = type === 'dynamodb-stream' ? tables.find((x) => x.id === sel) : undefined;
  const err = type === 'eventbridge' ? (/^(rate|cron)\(.+\)$/.test(expr) ? undefined : 'Enter a schedule expression like rate(5 minutes) or cron(0 12 * * ? *).')
    : !sel ? 'Nothing to choose from: create the source resource first.'
      : q && q.visibilityTimeoutSec < f.timeoutSec ? `Queue visibility timeout: ${q.visibilityTimeoutSec} seconds is less than Function timeout: ${f.timeoutSec} seconds.`
        : q && !canPollSqs(c, role) ? 'The provided execution role does not have permissions to call ReceiveMessage on SQS.'
          : table && !table.streams ? 'Turn on DynamoDB Streams for this table first.' : undefined;

  const add = () => {
    const now = Date.now();
    mutate((d) => {
      const fn = d.lambdas.find((x) => x.id === f.id)!;
      const fnArn = lambdaArn(d, fn);
      let source = '';
      if (type === 'sqs') source = sqsArn(d, findQueue(d, sel)!);
      if (type === 's3') source = `arn:aws:s3:::${sel}`;
      if (type === 'eventbridge') source = `schedule: ${expr}`;
      if (type === 'dynamodb-stream') { const t = d.dynamoTables.find((x) => x.id === sel)!; source = `arn:aws:dynamodb:${t.region}:${d.accountId}:table/${t.name}/stream`; }
      if (type === 'sns') { const t = d.topics.find((x) => x.id === sel)!; source = topicArn(d, t); if (!t.subscriptions.some((s) => s.endpoint === fnArn)) t.subscriptions.push({ id: crypto.randomUUID(), protocol: 'lambda', endpoint: fnArn }); }
      if (type === 'api-gateway') {
        let api = d.apis.find((a) => a.id === sel);
        if (!api) { api = { id: rid('a').slice(2, 12), name: `${fn.name}-API`, region: d.region, createdAt: now, kind: 'HTTP', routes: [], stage: '$default', throttleRps: 10000, caching: false }; d.apis.push(api); }
        api.routes.push({ method: 'ANY', path: `/${fn.name}`, lambda: fnArn });
        source = api.id;
      }
      fn.triggers.push({ type, source });
    });
    log('lambda', `CreateEventSourceMapping / AddPermission: ${type} trigger on ${f.name}`);
    onClose();
  };
  const fixRole = () => { if (!role) return; mutate((d) => { d.iamRoles.find((r) => r.id === role.id)?.policyIds.push('pol-lambda-sqs'); }); log('iam', `AttachRolePolicy AWSLambdaSQSQueueExecutionRole → ${role.name}`); };

  return (
    <Modal title="Add trigger" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!err} onClick={add}>Add</Button></>}>
      <Field label="Trigger configuration: select a source">
        <Select value={type} onChange={(v) => { setType(v as TType); setSrc(''); }} options={[{ value: 'sqs', label: 'SQS' }, { value: 'api-gateway', label: 'API Gateway' }, { value: 's3', label: 'S3' }, { value: 'eventbridge', label: 'EventBridge (CloudWatch Events)' }, { value: 'sns', label: 'SNS' }, { value: 'dynamodb-stream', label: 'DynamoDB' }]} />
      </Field>
      {type === 'eventbridge'
        ? <Field label="Schedule expression" hint="Creates a rule that invokes this function on a schedule."><Input value={expr} onChange={(e) => setExpr(e.target.value)} /></Field>
        : <Field label={{ sqs: 'SQS queue', 'api-gateway': 'API', s3: 'Bucket', sns: 'SNS topic', 'dynamodb-stream': 'DynamoDB table', eventbridge: '' }[type]}>
          <Select value={sel} onChange={setSrc} options={options[type].length ? options[type] : [{ value: '', label: 'No resources found' }]} />
        </Field>}
      {type === 'sqs' && <Field label="Batch size" hint="1–10 for FIFO; up to 10,000 for standard queues."><Input type="number" value={batch} onChange={(e) => setBatch(e.target.value)} /></Field>}
      {err && <Alert kind="error">{err}{q && !canPollSqs(c, role) && role && <div className="mt-2"><Button onClick={fixRole}>Attach AWSLambdaSQSQueueExecutionRole to {role.name}</Button></div>}</Alert>}
      {type === 'sqs' && <Teach>Lambda <b>polls</b> the queue for you (event source mapping) and deletes messages when the batch succeeds. Set the queue's visibility timeout to at least <b>6× the function timeout</b> so messages don't reappear while still being processed, and give the queue a DLQ for poison messages.</Teach>}
      {type === 'api-gateway' && <Teach>This adds an <code>ANY /{f.name}</code> route with a Lambda proxy integration and a resource policy letting API Gateway invoke the function.</Teach>}
      {type === 's3' && <Teach>S3 invokes Lambda <b>asynchronously</b> on object events. Don't write back to the same bucket/prefix that triggers you, or you'll build an infinite loop.</Teach>}
      {type === 'sns' && <Teach>SNS pushes each message to the function asynchronously: Lambda retries failed async invokes twice, then sends them to an on-failure destination or DLQ if configured.</Teach>}
    </Modal>
  );
}
