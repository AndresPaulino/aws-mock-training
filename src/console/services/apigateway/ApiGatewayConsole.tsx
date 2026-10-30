import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { ApiGateway, CloudState } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Page, Panel, Button, Table, Field, Input, Select, Check, Radios, KV, Tabs, Teach, Alert, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { findLambda, invokeLambda, lambdaArn } from '../lambda/invoke';

export default function ApiGatewayConsole() {
  return (
    <div className="flex">
      <SideNav title="API Gateway" items={[{ label: 'APIs', to: '/console/apigateway' }, { label: 'Custom domain names', to: '/console/apigateway' }, { label: 'VPC links', to: '/console/apigateway' }, { section: 'Usage plans' }, { label: 'Usage plans', to: '/console/apigateway' }, { label: 'API keys', to: '/console/apigateway' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<ApiList />} />
          <Route path="create" element={<CreateApi />} />
          <Route path="apis/:id" element={<ApiDetail />} />
        </Routes>
      </div>
    </div>
  );
}

const invokeUrl = (a: ApiGateway) => `${a.kind === 'WebSocket' ? 'wss' : 'https'}://${a.id}.execute-api.${a.region}.amazonaws.com${a.stage === '$default' ? '' : `/${a.stage}`}`;

function ApiList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const rows = c.apis.filter((a) => a.region === c.region);
  return (
    <Page title="APIs" crumbs={[{ label: 'API Gateway', to: '/console/apigateway' }, { label: 'APIs' }]}>
      <Panel title="APIs" counter={rows.length} actions={<Button primary onClick={() => nav('/console/apigateway/create')}>Create API</Button>}>
        <Table rows={rows} filterText={(a) => `${a.name} ${a.id}`} empty="No APIs" columns={[
          { header: 'Name', cell: (a) => <Link to={`/console/apigateway/apis/${a.id}`}>{a.name}</Link> },
          { header: 'ID', cell: (a) => a.id },
          { header: 'Protocol', cell: (a) => (a.kind === 'REST' ? 'REST' : a.kind === 'HTTP' ? 'HTTP' : 'WebSocket') },
          { header: 'API endpoint type', cell: () => 'Regional' },
          { header: 'Routes', cell: (a) => a.routes.length },
          { header: 'Created', cell: (a) => fmtDate(a.createdAt) },
        ]} />
      </Panel>
    </Page>
  );
}

function CreateApi() {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const fns = c.lambdas.filter((f) => f.region === c.region);
  const [kind, setKind] = useState<ApiGateway['kind']>('HTTP');
  const [name, setName] = useState('');
  const [fn, setFn] = useState('');
  const [stage, setStage] = useState('$default');
  const [tried, setTried] = useState(false);
  const errs = {
    name: name.trim() ? (name.length > 128 ? 'API name must be at most 128 characters.' : undefined) : 'API name is required.',
    stage: kind === 'HTTP' && stage === '$default' ? undefined : /^[a-zA-Z0-9_-]{1,128}$/.test(stage) ? undefined : 'Stage name: letters, numbers, hyphens and underscores.',
  };
  const valid = !errs.name && !errs.stage;
  const pickKind = (k: ApiGateway['kind']) => { setKind(k); setStage(k === 'HTTP' ? '$default' : k === 'REST' ? 'dev' : 'production'); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const id = rid('a').slice(2, 12);
    mutate((d) => {
      const f = fn ? d.lambdas.find((x) => x.id === fn) : undefined;
      const routes = kind === 'WebSocket' ? ['$connect', '$disconnect', '$default'].map((k) => ({ method: '', path: k, lambda: f ? lambdaArn(d, f) : '' }))
        : f ? [{ method: 'ANY', path: `/${f.name}`, lambda: lambdaArn(d, f) }] : [];
      d.apis.push({ id, name: name.trim(), region: d.region, createdAt: Date.now(), kind, routes, stage, throttleRps: 10000, caching: false });
      if (f && !f.triggers.some((t) => t.type === 'api-gateway' && t.source === id)) f.triggers.push({ type: 'api-gateway', source: id });
    });
    log('apigateway', `Create${kind === 'REST' ? 'RestApi' : 'Api'} ${name} (${kind}), stage ${stage}`);
    nav(`/console/apigateway/apis/${id}`);
  };
  return (
    <Page title="Create API" crumbs={[{ label: 'API Gateway', to: '/console/apigateway' }, { label: 'Create API' }]}>
      <form onSubmit={submit}>
        <Panel title="Choose an API type">
          <Radios value={kind} onChange={pickKind} options={[
            { value: 'HTTP', label: 'HTTP API', desc: 'Low-latency, cost-effective integrations with Lambda and HTTP backends. JWT/Lambda/IAM authorizers, CORS.' },
            { value: 'WebSocket', label: 'WebSocket API', desc: 'Persistent two-way connections for chat apps, dashboards and games.' },
            { value: 'REST', label: 'REST API', desc: 'Full control over request/response, plus API keys, usage plans, caching and request validation.' },
          ]} />
          <Teach title="HTTP vs REST vs WebSocket"><b>HTTP API</b>: up to ~70% cheaper and faster, fewer features: pick it for simple Lambda/HTTP proxies. <b>REST API</b>: adds <b>usage plans and API keys</b> (per-client throttling/quotas), <b>response caching</b>, <b>request validation</b>, WAF, private endpoints and edge-optimized endpoints. <b>WebSocket</b>: the server can push to connected clients.</Teach>
        </Panel>
        <Panel title="API details">
          <Field label="API name" error={tried ? errs.name : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-api" /></Field>
          {kind !== 'REST' && <Field label={kind === 'HTTP' ? 'Integrations - optional' : 'Integration for $connect / $disconnect / $default - optional'} hint="Lambda function in this Region.">
            <Select value={fn} onChange={setFn} options={[{ value: '', label: 'No integration' }, ...fns.map((f) => ({ value: f.id, label: f.name }))]} />
          </Field>}
          {kind === 'HTTP' && fn && <p className="text-[13px] text-[#5f6b7a] mb-3">Creates the route <code>ANY /{fns.find((f) => f.id === fn)?.name}</code>.</p>}
          <Field label="Stage name" hint={kind === 'HTTP' ? '$default is auto-deployed and served at the base URL.' : 'Changes are live only after you deploy to a stage.'} error={tried ? errs.stage : undefined}><Input value={stage} onChange={(e) => setStage(e.target.value)} /></Field>
        </Panel>
        <FormFooter onCancel={() => nav('/console/apigateway')} submitLabel="Create" />
      </form>
    </Page>
  );
}

function ApiDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [del, setDel] = useState(false);
  const a = c.apis.find((x) => x.id === id);
  if (!a) return <Page title="API not found"><Alert kind="error">This API doesn't exist. <Link to="/console/apigateway">Back to APIs</Link></Alert></Page>;
  const upd = (fn: (x: ApiGateway, d: CloudState) => void, msg: string) => { mutate((d) => { const x = d.apis.find((y) => y.id === a.id); if (x) fn(x, d); }); log('apigateway', msg); };
  return (
    <Page title={a.name} crumbs={[{ label: 'API Gateway', to: '/console/apigateway' }, { label: 'APIs', to: '/console/apigateway' }, { label: `${a.name} (${a.id})` }]} actions={<Button danger onClick={() => setDel(true)}>Delete</Button>}>
      <Panel title="API details">
        <KV cols={4} items={[['API ID', a.id], ['Protocol', a.kind], ['Default endpoint', <code className="text-[12px]">{invokeUrl(a)}</code>], ['Created', fmtDate(a.createdAt)]]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Routes', content: <RoutesTab a={a} upd={upd} /> },
        { label: 'Stages', content: <StagesTab a={a} upd={upd} /> },
        { label: 'Authorization', content: <AuthTab a={a} upd={upd} /> },
        { label: 'Test', content: <TestTab a={a} /> },
      ]} />
      {del && <ConfirmDelete what={`API ${a.name}`} onClose={() => setDel(false)} onConfirm={() => {
        nav('/console/apigateway');
        mutate((d) => { d.apis = d.apis.filter((x) => x.id !== a.id); for (const f of d.lambdas) f.triggers = f.triggers.filter((t) => !(t.type === 'api-gateway' && t.source === a.id)); });
        log('apigateway', `DeleteApi ${a.name}`);
      }} />}
    </Page>
  );
}

type Upd = (fn: (x: ApiGateway, d: CloudState) => void, msg: string) => void;
const METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function RoutesTab({ a, upd }: { a: ApiGateway; upd: Upd }) {
  const c = useCloud((c) => c);
  const fns = c.lambdas.filter((f) => f.region === a.region);
  const ws = a.kind === 'WebSocket';
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState(ws ? 'sendmessage' : '/items');
  const [fn, setFn] = useState(fns[0]?.id ?? '');
  const err = ws ? (path ? undefined : 'Route key is required.') : !/^\/[a-zA-Z0-9/{}+._-]*$/.test(path) ? 'Path must start with / (e.g. /items or /items/{id}).'
    : a.routes.some((r) => r.method === method && r.path === path) ? 'This route already exists.' : undefined;
  const add = () => upd((x, d) => {
    const f = d.lambdas.find((y) => y.id === fn);
    x.routes.push({ method: ws ? '' : method, path, lambda: f ? lambdaArn(d, f) : '' });
    if (f && !f.triggers.some((t) => t.type === 'api-gateway' && t.source === x.id)) f.triggers.push({ type: 'api-gateway', source: x.id });
  }, `CreateRoute ${a.name}: ${ws ? path : `${method} ${path}`}${fn ? ` → Lambda ${fns.find((f) => f.id === fn)?.name}` : ''}`);
  const integrate = (i: number, fnId: string) => upd((x, d) => {
    const f = d.lambdas.find((y) => y.id === fnId);
    x.routes[i].lambda = f ? lambdaArn(d, f) : '';
    if (f && !f.triggers.some((t) => t.type === 'api-gateway' && t.source === x.id)) f.triggers.push({ type: 'api-gateway', source: x.id });
  }, `UpdateRoute ${a.name}: integration → ${fnId ? fns.find((f) => f.id === fnId)?.name : 'none'}`);
  return <>
    <Panel title="Routes" counter={a.routes.length}>
      <table className="aws-table w-full"><thead><tr><th>Route</th><th>Integration (Lambda proxy)</th><th /></tr></thead>
        <tbody>{a.routes.map((r, i) => (
          <tr key={i}>
            <td className="font-mono">{r.method ? `${r.method} ` : ''}{r.path}</td>
            <td><Select value={findLambda(c, r.lambda)?.id ?? ''} onChange={(v) => integrate(i, v)} options={[{ value: '', label: 'No integration' }, ...fns.map((f) => ({ value: f.id, label: f.name }))]} /></td>
            <td><button className="link" onClick={() => upd((x) => { x.routes.splice(i, 1); }, `DeleteRoute ${a.name}: ${r.method} ${r.path}`)}>Delete</button></td>
          </tr>
        ))}</tbody>
      </table>
      {!a.routes.length && <div className="text-center py-6 text-[#5f6b7a]">No routes. Create one below.</div>}
    </Panel>
    <Panel title="Create route">
      <div className="grid md:grid-cols-[140px_1fr_1fr_auto] gap-3 items-end">
        {!ws ? <Field label="Method"><Select value={method} onChange={setMethod} options={METHODS} /></Field> : <div />}
        <Field label={ws ? 'Route key' : 'Path'} error={err}><Input value={path} onChange={(e) => setPath(e.target.value)} /></Field>
        <Field label="Integration target (Lambda)"><Select value={fn} onChange={setFn} options={[{ value: '', label: 'No integration' }, ...fns.map((f) => ({ value: f.id, label: f.name }))]} /></Field>
        <div className="mb-4"><Button primary disabled={!!err} onClick={add}>Create</Button></div>
      </div>
      {!fns.length && <Alert kind="info">No Lambda functions in this Region yet. <Link to="/console/lambda/create">Create a function</Link> to integrate.</Alert>}
    </Panel>
  </>;
}

function StagesTab({ a, upd }: { a: ApiGateway; upd: Upd }) {
  const [rps, setRps] = useState(String(a.throttleRps));
  const [caching, setCaching] = useState(a.caching);
  return (
    <Panel title={`Stage: ${a.stage}`} actions={<Button primary onClick={() => upd((x) => { x.throttleRps = Math.max(0, Number(rps) || 0); x.caching = a.kind === 'REST' && caching; }, `UpdateStage ${a.name}/${a.stage}: throttle ${rps} rps${caching && a.kind === 'REST' ? ', cache on' : ''}`)}>Save</Button>}>
      <KV items={[['Invoke URL', <code className="text-[12px]">{invokeUrl(a)}</code>], ['Automatic deployment', a.stage === '$default' ? 'Enabled' : 'Disabled'], ['Last deployed', fmtDate(a.createdAt)]]} />
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <Field label="Default route throttling: rate (requests per second)" hint="Account default: 10,000 rps with a 5,000 burst, shared across APIs in the Region. Excess requests get 429 Too Many Requests."><Input type="number" value={rps} onChange={(e) => setRps(e.target.value)} /></Field>
      </div>
      {a.kind === 'REST'
        ? <><Check checked={caching} onChange={setCaching} label="Provision API cache" hint="0.5 GB cache, TTL 300 s. Billed hourly while provisioned." />
          <Teach>Stage caching answers repeated GETs without calling Lambda: lower latency and backend load. It's a <b>REST API-only</b> feature (as are usage plans + API keys for per-customer throttling).</Teach></>
        : <Alert kind="info">Caching isn't available for {a.kind} APIs. Use a REST API, or put CloudFront in front.</Alert>}
    </Panel>
  );
}

function AuthTab({ a, upd }: { a: ApiGateway; upd: Upd }) {
  const [v, setV] = useState<string>(a.authorizer ?? 'NONE');
  return (
    <Panel title="Authorization" actions={<Button primary onClick={() => upd((x) => { x.authorizer = v === 'NONE' ? undefined : (v as ApiGateway['authorizer']); }, `UpdateAuthorizer ${a.name}: ${v}`)}>Save</Button>}>
      <Radios value={v} onChange={setV} options={[
        { value: 'NONE', label: 'None', desc: 'Anyone with the URL can call the API.' },
        { value: 'IAM', label: 'IAM (SigV4)', desc: 'Callers sign requests with AWS credentials. Best for service-to-service and internal callers.' },
        { value: 'Cognito', label: a.kind === 'HTTP' ? 'JWT (Amazon Cognito user pool)' : 'Cognito user pool', desc: 'End users sign in to a Cognito user pool and send the token.' },
        { value: 'Lambda', label: 'Lambda authorizer', desc: 'Your function validates a custom token (OAuth from a third party, API keys in headers) and returns a policy.' },
      ]} />
      <Teach>Exam pattern: mobile/web app users → <b>Cognito user pools</b>; AWS principals/other services → <b>IAM</b>; a third-party identity or bespoke token → <b>Lambda authorizer</b>.</Teach>
    </Panel>
  );
}

interface TestOut { status: number; body: string; ms: number; log?: string }

function TestTab({ a }: { a: ApiGateway }) {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [route, setRoute] = useState(0);
  const [body, setBody] = useState('{"hello": "world"}');
  const [creds, setCreds] = useState(true);
  const [out, setOut] = useState<TestOut | null>(null);
  const r = a.routes[route];
  const send = () => {
    if (!r) return;
    const t0 = 8 + Math.round(Math.random() * 10);
    if (a.authorizer && !creds) return setOut({ status: a.authorizer === 'IAM' ? 403 : 401, body: JSON.stringify({ message: a.authorizer === 'IAM' ? 'Missing Authentication Token' : 'Unauthorized' }), ms: t0 });
    if (a.throttleRps <= 0) return setOut({ status: 429, body: JSON.stringify({ message: 'Too Many Requests' }), ms: t0 });
    if (!r.lambda || !findLambda(c, r.lambda)) return setOut({ status: 500, body: JSON.stringify({ message: 'Internal Server Error' }), ms: t0 });
    let res = undefined as ReturnType<typeof invokeLambda>;
    const event = { version: '2.0', routeKey: `${r.method} ${r.path}`.trim(), rawPath: r.path, requestContext: { apiId: a.id, stage: a.stage, http: { method: r.method || 'WEBSOCKET' } }, body };
    mutate((d) => { res = invokeLambda(d, r.lambda, event, `API Gateway ${a.name} ${r.method} ${r.path}`.replace(/\s+/g, ' ')); });
    log('apigateway', `Test invoke ${a.name} ${r.method} ${r.path}: ${res?.ok ? 200 : 502}`);
    if (!res) return;
    let payload = res.response;
    try { const p = JSON.parse(res.response); if (res.ok && typeof p.body === 'string') payload = p.body; } catch { /* keep raw */ }
    setOut(res.ok ? { status: 200, body: payload, ms: res.ms + t0, log: res.log } : { status: 502, body: JSON.stringify({ message: 'Internal server error' }), ms: res.ms + t0, log: res.log });
  };
  if (!a.routes.length) return <Panel title="Test"><Alert kind="info">Create a route first.</Alert></Panel>;
  return (
    <Panel title="Test" desc="Sends a simulated request through the stage to the route's integration.">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Route"><Select value={String(route)} onChange={(v) => setRoute(Number(v))} options={a.routes.map((x, i) => ({ value: String(i), label: `${x.method} ${x.path}`.trim() }))} /></Field>
        {a.authorizer && <div className="pt-6"><Check checked={creds} onChange={setCreds} label={`Include valid ${a.authorizer === 'IAM' ? 'SigV4 signature' : a.authorizer === 'Cognito' ? 'Cognito JWT' : 'authorization token'}`} /></div>}
      </div>
      <Field label="Request body"><textarea className="aws-input font-mono text-[13px] w-full" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      <Button primary onClick={send}>Send request</Button>
      {out && <Alert kind={out.status === 200 ? 'success' : 'error'}>
        <div className="font-bold">Status: {out.status} · Latency: {out.ms} ms</div>
        <pre className="text-[12px] bg-white/70 p-2 rounded overflow-x-auto mt-1">{out.body}</pre>
        {out.log && <><div className="text-[13px] font-bold mt-2">Lambda logs</div><pre className="text-[12px] bg-white/70 p-2 rounded overflow-x-auto">{out.log}</pre></>}
        {out.status === 502 && <p className="text-[13px] mt-1">502 means the integration failed (the function threw or timed out). Check the Lambda's Monitor tab.</p>}
      </Alert>}
      <Teach>API Gateway's integration timeout is <b>29 seconds</b>, even though Lambda can run 15 minutes. Long jobs should return 202 immediately and process asynchronously (SQS, Step Functions).</Teach>
    </Panel>
  );
}
