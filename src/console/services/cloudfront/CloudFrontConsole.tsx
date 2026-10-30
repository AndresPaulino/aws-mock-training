import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Button, Status, Table, Field, Input, Select, Check, Radios, KV, Tabs, Teach, Alert, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import type { Bucket, Distribution } from '../../../cloud/types';
import { Group, restDomain, policyTemplate, policyDoc } from '../s3/lib';
import { CLIENT_LOCATIONS, REGION_COORDS, rttMs } from '../route53/resolve';

export default function CloudFrontConsole() {
  return (
    <div className="flex">
      <SideNav title="Amazon CloudFront" items={[{ label: 'Distributions', to: '/console/cloudfront' }, { label: 'Create distribution', to: '/console/cloudfront/create' }, { section: 'Security' }, { label: 'Origin access', to: '/console/cloudfront' }, { section: 'Telemetry' }, { label: 'Monitoring', to: '/console/cloudfront' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<DistributionList />} />
          <Route path="create" element={<CreateDistribution />} />
          <Route path="distributions/:id" element={<DistributionDetail />} />
        </Routes>
      </div>
    </div>
  );
}

const upperId = (prefix: string, n: number, abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => prefix + Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
const crumbs = (label?: string) => [{ label: 'CloudFront', to: '/console/cloudfront' }, { label: 'Distributions', to: '/console/cloudfront' }, ...(label ? [{ label }] : [])];
const CACHE_POLICIES: Record<string, { label: string; ttl: number }> = {
  CachingOptimized: { label: 'CachingOptimized (recommended for S3): default TTL 1 day', ttl: 86400 },
  CachingOptimizedForUncompressedObjects: { label: 'CachingOptimizedForUncompressedObjects: default TTL 1 day', ttl: 86400 },
  CachingDisabled: { label: 'CachingDisabled (dynamic content, APIs): TTL 0', ttl: 0 },
  Custom: { label: 'Custom cache policy (set the default TTL)', ttl: 3600 },
};
const PRICE_CLASSES = { All: 'Use all edge locations (best performance)', '200': 'Use North America, Europe, Asia, Middle East, and Africa', '100': 'Use only North America and Europe' };

/** Statement CloudFront asks you to add, and whether the bucket already has it. */
const oacStatement = (bucket: string, accountId: string, distId: string) => policyTemplate('oac', bucket, accountId, distId);
const bucketAllows = (b: Bucket | undefined, distId: string) => !!b?.policy?.includes(`distribution/${distId}`);
const bucketOf = (buckets: Bucket[], target: string) => buckets.find((b) => target === restDomain(b));

function DistributionList() {
  const dists = useCloud((c) => c.distributions);
  const { patch, remove, log } = useCloudActions();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const nav = useNavigate();
  const d = dists.find((x) => x.id === sel);
  return (
    <Page title="Distributions" crumbs={crumbs()}>
      <Panel title="Distributions" counter={dists.length} desc="CloudFront is global: distributions are served from 600+ edge locations, not from a Region."
        actions={<>
          <Button disabled={!d} onClick={() => { if (!d) return; patch('distributions', d.id, { enabled: !d.enabled }); log('cloudfront', `${d.enabled ? 'Disabled' : 'Enabled'} distribution ${d.id}`); }}>{d && !d.enabled ? 'Enable' : 'Disable'}</Button>
          <Button disabled={!d || d.enabled} title="Disable the distribution before deleting it" onClick={() => setDel(true)}>Delete</Button>
          <Button primary onClick={() => nav('/console/cloudfront/create')}>Create distribution</Button>
        </>}>
        <Table rows={dists} selected={sel} onSelect={setSel} filterText={(r) => `${r.id} ${r.name} ${r.domainName}`} empty="No distributions."
          columns={[
            { header: 'ID', cell: (r) => <Link to={`/console/cloudfront/distributions/${r.id}`}>{r.id}</Link> },
            { header: 'Description', cell: (r) => r.name || '-' },
            { header: 'Domain name', cell: (r) => r.domainName },
            { header: 'Alternate domain names', cell: (r) => r.aliases?.join(', ') || '-' },
            { header: 'Origins', cell: (r) => r.origins.map((o) => o.target).join(', ') },
            { header: 'Status', cell: (r) => <Status value={r.enabled ? 'Enabled' : 'Disabled'} /> },
            { header: 'Last modified', cell: (r) => (Date.now() - r.createdAt < 20000 ? <Status value="Deploying" /> : fmtDate(r.createdAt)) },
          ]} />
        {d?.enabled && <div className="aws-hint mt-2">To delete a distribution, disable it first.</div>}
      </Panel>
      {del && d && <ConfirmDelete what={`distribution ${d.id}`} onClose={() => setDel(false)} onConfirm={() => { remove('distributions', d.id); log('cloudfront', `DeleteDistribution ${d.id}`); setSel(null); }} />}
    </Page>
  );
}

function CreateDistribution() {
  const buckets = useCloud((c) => c.buckets);
  const lbs = useCloud((c) => c.loadBalancers);
  const accountId = useCloud((c) => c.accountId);
  const { put, mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [distId] = useState(() => upperId('E', 13));
  const [origin, setOrigin] = useState('');
  const [custom, setCustom] = useState('');
  const [access, setAccess] = useState<'public' | 'oac'>('oac');
  const [applyPolicy, setApplyPolicy] = useState(false);
  const [viewer, setViewer] = useState<Distribution['viewerProtocol']>('redirect-to-https');
  const [cache, setCache] = useState('CachingOptimized');
  const [ttl, setTtl] = useState('3600');
  const [waf, setWaf] = useState<'on' | 'off'>('off');
  const [price, setPrice] = useState<Distribution['priceClass']>('All');
  const [aliases, setAliases] = useState('');
  const [cert, setCert] = useState('default');
  const [geo, setGeo] = useState<'none' | 'allow' | 'block'>('none');
  const [countries, setCountries] = useState('');
  const [desc, setDesc] = useState('');
  const [tried, setTried] = useState(false);

  const [kind, target] = origin === 'custom' ? ['custom', custom.trim()] : (origin.split('|') as [string, string]);
  const type = (kind === 's3' ? 's3' : kind === 'alb' ? 'alb' : 'custom') as Distribution['origins'][number]['type'];
  const bucket = type === 's3' ? bucketOf(buckets, target) : undefined;
  const aliasList = aliases.split(/[\s,]+/).filter(Boolean);
  const errs = {
    origin: !target ? 'Choose or enter an origin domain.' : type === 'custom' && !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(target) ? 'Enter a valid domain name.' : undefined,
    ttl: cache === 'Custom' && !(Number(ttl) >= 0 && Number(ttl) <= 31536000) ? 'TTL must be 0–31,536,000 seconds.' : undefined,
    cert: aliasList.length && cert === 'default' ? 'To use alternate domain names (CNAMEs), choose a custom SSL certificate from ACM in US East (N. Virginia).' : undefined,
    aliases: aliasList.find((a) => !/^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(a)) ? 'Alternate domain names must be valid domain names.' : undefined,
    geo: geo !== 'none' && !countries.split(/[\s,]+/).filter(Boolean).every((x) => /^[A-Z]{2}$/i.test(x)) ? 'Enter two-letter country codes, e.g. US, CA.' : geo !== 'none' && !countries.trim() ? 'Choose at least one country.' : undefined,
  };
  const policy = bucket ? policyDoc([oacStatement(bucket.name, accountId, distId)]) : '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    const d: Distribution = {
      id: distId, name: desc, region: 'global', createdAt: Date.now(), domainName: upperId('d', 13, 'abcdefghijklmnopqrstuvwxyz0123456789') + '.cloudfront.net',
      origins: [{ id: target, type, target, oac: type === 's3' && access === 'oac' }],
      viewerProtocol: viewer, priceClass: price, cachePolicy: cache, defaultTtl: cache === 'Custom' ? Number(ttl) : CACHE_POLICIES[cache].ttl,
      wafAclId: waf === 'on' ? `CreatedByCloudFront-${distId.slice(1, 9)}` : undefined,
      geoRestriction: geo === 'none' ? undefined : `${geo}:${countries.toUpperCase().split(/[\s,]+/).filter(Boolean).join(',')}`,
      aliases: aliasList.length ? aliasList : undefined, enabled: true, cacheHitRate: 0,
    };
    put('distributions', d);
    log('cloudfront', `CreateDistribution ${d.id} → ${target} (${type}${d.origins[0].oac ? ', OAC' : ''}, ${viewer}${d.wafAclId ? ', WAF' : ''})`);
    if (applyPolicy && bucket) applyOac(mutate, log, bucket.name, accountId, distId);
    nav(`/console/cloudfront/distributions/${d.id}`);
  };

  return (
    <Page title="Create distribution" crumbs={crumbs('Create distribution')}>
      <form onSubmit={submit} className="max-w-[900px]">
        <Panel title="Origin">
          <Field label="Origin domain" hint="Choose an AWS origin, or enter your origin's domain name." error={tried ? errs.origin : undefined}>
            <Select value={origin} onChange={setOrigin} options={[
              { value: '', label: 'Choose origin domain' },
              ...buckets.map((b) => ({ value: `s3|${restDomain(b)}`, label: `Amazon S3: ${restDomain(b)}` })),
              ...lbs.map((l) => ({ value: `alb|${l.dnsName}`, label: `Elastic Load Balancer: ${l.dnsName}` })),
              { value: 'custom', label: 'Other: enter a custom origin domain' },
            ]} />
          </Field>
          {origin === 'custom' && <Field label="Custom origin domain"><Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="origin.example.com" /></Field>}
          {type === 's3' && bucket && (
            <>
              <Group label="Origin access">
                <Radios value={access} onChange={setAccess} options={[
                  { value: 'public', label: 'Public', desc: 'Bucket must allow public access.' },
                  { value: 'oac', label: 'Origin access control settings (recommended)', desc: 'Bucket can restrict access to only CloudFront.' },
                ]} />
              </Group>
              {access === 'public' && bucket.blockPublicAccess && <Alert kind="warning">{bucket.name} has Block Public Access on, so a public origin returns 403 Access Denied. Use OAC instead.</Alert>}
              {access === 'oac' && (
                <Alert kind="info">
                  <p className="font-bold mb-1">You must update the S3 bucket policy</p>
                  <p className="mb-2 text-[13px]">CloudFront will provide you with the policy statement after creating the distribution. Add it to the {bucket.name} bucket policy (Permissions tab) or requests will be denied:</p>
                  <pre className="font-mono text-[11.5px] bg-white border border-[#e9ebed] rounded p-2 overflow-x-auto">{policy}</pre>
                  <Check checked={applyPolicy} onChange={setApplyPolicy} label="Add this statement to the bucket policy for me after creating" hint="Simulator shortcut. In the real console you copy the policy and paste it in S3." />
                </Alert>
              )}
              <Teach title="OAC">With Origin Access Control the bucket stays private (Block Public Access on) and only CloudFront, signing requests with SigV4, can read it. Users can't bypass the CDN with the S3 URL. OAC replaces the legacy Origin Access Identity (OAI) and also works with SSE-KMS buckets.</Teach>
            </>
          )}
          {type === 'alb' && <Teach>An ALB origin must be internet-facing. To stop users bypassing CloudFront, have CloudFront add a secret custom header and make the ALB listener rule require it (or allow only the CloudFront managed prefix list in the ALB security group).</Teach>}
        </Panel>

        <Panel title="Default cache behavior">
          <Group label="Viewer protocol policy">
            <Radios value={viewer} onChange={setViewer} options={[{ value: 'allow-all', label: 'HTTP and HTTPS' }, { value: 'redirect-to-https', label: 'Redirect HTTP to HTTPS' }, { value: 'https-only', label: 'HTTPS only' }]} />
          </Group>
          <Field label="Cache policy"><Select value={cache} onChange={setCache} options={Object.entries(CACHE_POLICIES).map(([v, p]) => ({ value: v, label: p.label }))} /></Field>
          {cache === 'Custom' && <Field label="Default TTL (seconds)" error={errs.ttl}><Input type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} /></Field>}
          <Teach>Higher TTL = higher cache hit ratio and fewer origin requests. Include in the cache key only the headers, cookies and query strings the origin really varies on; each extra one splits the cache. To push new content before the TTL expires, use versioned file names (cheap) or an invalidation.</Teach>
          <Teach title="Edge compute">CloudFront Functions: lightweight JavaScript at all edge locations, sub-millisecond, viewer request/response only (header rewrites, redirects, simple auth tokens). Lambda@Edge: Node.js/Python at regional edge caches, up to 5 s (viewer) / 30 s (origin), network access, can modify origin requests/responses. Pick Functions for cheap high-volume tweaks and Lambda@Edge when you need the network or a bigger runtime.</Teach>
        </Panel>

        <Panel title="Web Application Firewall (WAF)">
          <Radios value={waf} onChange={setWaf} options={[{ value: 'on', label: 'Enable security protections', desc: 'Creates a web ACL with AWS-recommended protections (core rule set, known bad inputs, IP reputation).' }, { value: 'off', label: 'Do not enable security protections' }]} />
          <Teach>WAF on CloudFront filters layer-7 attacks (SQL injection, XSS, rate limits, geo rules) at the edge. Shield Standard (DDoS layer 3/4) is always on for CloudFront at no cost; Shield Advanced adds response team support and cost protection.</Teach>
        </Panel>

        <Panel title="Settings">
          <Group label="Price class"><Radios value={price} onChange={setPrice} options={Object.entries(PRICE_CLASSES).map(([v, l]) => ({ value: v as Distribution['priceClass'], label: v === 'All' ? 'Use all edge locations' : `Price class ${v}`, desc: l }))} /></Group>
          <Field label="Alternate domain name (CNAME) - optional" hint="Comma-separated, e.g. www.example.com" error={tried ? errs.aliases : undefined}><Input value={aliases} onChange={(e) => setAliases(e.target.value)} /></Field>
          <Field label="Custom SSL certificate" error={tried ? errs.cert : undefined}>
            <Select value={cert} onChange={setCert} options={[{ value: 'default', label: 'Default CloudFront certificate (*.cloudfront.net)' }, { value: 'acm', label: `ACM certificate (us-east-1): arn:aws:acm:us-east-1:${accountId}:certificate/${distId.toLowerCase()}` }]} />
          </Field>
          <Teach>CloudFront only uses ACM certificates issued in US East (N. Virginia), us-east-1, whatever Region your origin is in. (An ALB uses a certificate from its own Region.) Point the alternate domain at the distribution with a Route 53 alias record.</Teach>
          <Group label="Geographic restrictions">
            <Radios value={geo} onChange={setGeo} options={[{ value: 'none', label: 'No restrictions' }, { value: 'allow', label: 'Allow list' }, { value: 'block', label: 'Block list' }]} />
          </Group>
          {geo !== 'none' && <Field label="Countries" hint="Two-letter ISO codes, comma-separated." error={tried ? errs.geo : undefined}><Input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="US, CA" /></Field>}
          <Field label="Description - optional"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Teach title="CloudFront vs Global Accelerator">Both use the AWS edge network. CloudFront caches HTTP(S) content close to users. Global Accelerator does no caching: it gives two static anycast IPs and routes TCP/UDP traffic over the AWS backbone to the best healthy Regional endpoint, with fast failover. Static IPs, non-HTTP protocols (gaming, VoIP, IoT) or Regional failover mean Global Accelerator.</Teach>
        </Panel>
        <FormFooter onCancel={() => nav('/console/cloudfront')} submitLabel="Create distribution" />
      </form>
    </Page>
  );
}

function applyOac(mutate: ReturnType<typeof useCloudActions>['mutate'], log: ReturnType<typeof useCloudActions>['log'], bucket: string, accountId: string, distId: string) {
  mutate((c) => {
    const b = c.buckets.find((x) => x.name === bucket);
    if (!b) return;
    let sts: object[] = [];
    try { const d = JSON.parse(b.policy ?? ''); sts = Array.isArray(d.Statement) ? d.Statement : [d.Statement]; } catch { /* no policy yet */ }
    b.policy = policyDoc([...sts, oacStatement(bucket, accountId, distId)]);
  });
  log('s3', `PutBucketPolicy ${bucket}: allow CloudFront distribution ${distId} (OAC)`);
}

// ---------- Detail + simulator ----------
const EDGES: { code: string; city: string; at: [number, number]; cls: Distribution['priceClass'] }[] = [
  { code: 'IAD89', city: 'Ashburn', at: [39, -77.5], cls: '100' }, { code: 'SEA19', city: 'Seattle', at: [47.6, -122.3], cls: '100' },
  { code: 'LHR61', city: 'London', at: [51.5, -0.1], cls: '100' }, { code: 'FRA56', city: 'Frankfurt', at: [50.1, 8.7], cls: '100' },
  { code: 'NRT57', city: 'Tokyo', at: [35.7, 139.7], cls: '200' }, { code: 'BOM78', city: 'Mumbai', at: [19, 72.8], cls: '200' },
  { code: 'SYD62', city: 'Sydney', at: [-33.9, 151.2], cls: 'All' }, { code: 'GRU3', city: 'São Paulo', at: [-23.5, -46.6], cls: 'All' },
];
const PATHS = ['/index.html', '/css/site.css', '/js/app.js', '/img/logo.png', '/img/hero.jpg', '/api/data.json'];
interface SimRow { id: string; viewer: string; edge: string; path: string; proto: string; result: string; status: number; ms: number; originMs: number }

function DistributionDetail() {
  const { id } = useParams();
  const d = useCloud((c) => c.distributions.find((x) => x.id === id));
  const buckets = useCloud((c) => c.buckets);
  const lbs = useCloud((c) => c.loadBalancers);
  const accountId = useCloud((c) => c.accountId);
  const { patch, mutate, log } = useCloudActions();
  const [sim, setSim] = useState<SimRow[] | null>(null);
  if (!d) return <Page title="Distribution not found" crumbs={crumbs()}><Alert kind="error">No such distribution.</Alert></Page>;
  const o = d.origins[0];
  const bucket = o?.type === 's3' ? bucketOf(buckets, o.target) : undefined;
  const originRegion = bucket?.region ?? lbs.find((l) => l.dnsName === o?.target)?.region ?? 'us-east-1';
  const oacMissing = !!(o?.oac && bucket && !bucketAllows(bucket, d.id));
  const publicBlocked = !!(o?.type === 's3' && !o.oac && bucket?.blockPublicAccess);
  const [geoMode, geoList] = (d.geoRestriction ?? '').split(':') as [string, string | undefined];
  const geoCodes = geoList?.split(',') ?? [];

  const simulate = () => {
    const edges = EDGES.filter((e) => d.priceClass === 'All' || e.cls === '100' || (d.priceClass === '200' && e.cls === '200'));
    const cache = new Map<string, number>();
    const rows: SimRow[] = [];
    for (let i = 0; i < 60; i++) {
      const v = CLIENT_LOCATIONS[Math.floor(Math.random() * CLIENT_LOCATIONS.length)];
      const edge = edges.reduce((a, e) => (rttMs([v.lat, v.lon], e.at) < rttMs([v.lat, v.lon], a.at) ? e : a));
      const path = PATHS[Math.floor(Math.random() ** 1.6 * PATHS.length)]; // popular objects requested more
      const proto = Math.random() < 0.25 ? 'HTTP' : 'HTTPS';
      const edgeMs = rttMs([v.lat, v.lon], edge.at);
      const base = { id: String(i), viewer: v.label, edge: `${edge.code} (${edge.city})`, path, proto, originMs: 0 };
      const blocked = geoMode === 'allow' ? !geoCodes.includes(v.country) : geoMode === 'block' && geoCodes.includes(v.country);
      if (!d.enabled) { rows.push({ ...base, result: 'Error (distribution disabled)', status: 403, ms: edgeMs }); continue; }
      if (blocked) { rows.push({ ...base, result: 'Error (geo restriction)', status: 403, ms: edgeMs }); continue; }
      if (proto === 'HTTP' && d.viewerProtocol === 'https-only') { rows.push({ ...base, result: 'Error (HTTPS only)', status: 403, ms: edgeMs }); continue; }
      if (proto === 'HTTP' && d.viewerProtocol === 'redirect-to-https') { rows.push({ ...base, result: 'Redirect', status: 301, ms: edgeMs }); continue; }
      const key = `${edge.code}${path}`;
      if (d.defaultTtl > 0 && (cache.get(key) ?? -1) > i) { rows.push({ ...base, result: 'Hit from cloudfront', status: 200, ms: edgeMs + 2 }); continue; }
      const originMs = rttMs(edge.at, REGION_COORDS[originRegion] ?? [38.9, -77.4]) + (o?.type === 's3' ? 20 : 45);
      const denied = oacMissing || publicBlocked;
      if (!denied && d.defaultTtl > 0) cache.set(key, i + d.defaultTtl); // one request per second of simulated time
      rows.push({ ...base, result: denied ? 'Error from origin (403 AccessDenied)' : 'Miss from cloudfront', status: denied ? 403 : 200, ms: edgeMs + originMs, originMs });
    }
    const served = rows.filter((r) => r.result.startsWith('Hit') || r.result.startsWith('Miss'));
    const rate = served.length ? served.filter((r) => r.result.startsWith('Hit')).length / served.length : 0;
    patch('distributions', d.id, { cacheHitRate: Math.round(rate * 100) });
    log('cloudfront', `Simulated 60 requests to ${d.domainName}: ${Math.round(rate * 100)}% cache hits`);
    setSim(rows);
  };

  const avg = (rs: SimRow[]) => (rs.length ? Math.round(rs.reduce((a, r) => a + r.ms, 0) / rs.length) : 0);
  const hits = sim?.filter((r) => r.result.startsWith('Hit')) ?? [], misses = sim?.filter((r) => r.result.startsWith('Miss')) ?? [];
  return (
    <Page title={d.id} crumbs={crumbs(d.id)} actions={<Button onClick={() => { patch('distributions', d.id, { enabled: !d.enabled }); log('cloudfront', `${d.enabled ? 'Disabled' : 'Enabled'} distribution ${d.id}`); }}>{d.enabled ? 'Disable' : 'Enable'}</Button>}>
      {oacMissing && bucket && (
        <Alert kind="warning">
          <b>The S3 bucket policy does not allow this distribution.</b> Requests to {bucket.name} will get 403 until you add the OAC statement.{' '}
          <Button onClick={() => applyOac(mutate, log, bucket.name, accountId, d.id)}>Apply policy to {bucket.name}</Button>
        </Alert>
      )}
      {publicBlocked && <Alert kind="warning">The origin is a public S3 origin but {bucket?.name} has Block Public Access on: CloudFront will get 403 from S3. Switch the origin to OAC.</Alert>}
      <Tabs tabs={[
        { label: 'General', content: (
          <Panel title="Details">
            <KV items={[['Distribution domain name', d.domainName], ['ARN', `arn:aws:cloudfront::${accountId}:distribution/${d.id}`], ['Last modified', fmtDate(d.createdAt)],
              ['Status', <Status value={d.enabled ? 'Enabled' : 'Disabled'} />], ['Price class', PRICE_CLASSES[d.priceClass]], ['Alternate domain names', d.aliases?.join(', ') || '-'],
              ['Custom SSL certificate', d.aliases?.length ? 'ACM certificate (us-east-1)' : 'Default CloudFront certificate'], ['Description', d.name || '-'], ['Cache hit rate (last simulation)', `${d.cacheHitRate}%`]]} />
          </Panel>
        ) },
        { label: 'Origins', content: (
          <Panel title="Origins" counter={d.origins.length}>
            <Table rows={d.origins} columns={[
              { header: 'Origin name', cell: (r) => r.id }, { header: 'Origin domain', cell: (r) => r.target },
              { header: 'Origin type', cell: (r) => ({ s3: 'S3', alb: 'Elastic Load Balancer', custom: 'Custom origin' })[r.type] },
              { header: 'Origin access', cell: (r) => (r.type === 's3' ? (r.oac ? 'Origin access control' : 'Public') : '-') },
            ]} />
            {o?.oac && bucket && (
              <>
                <div className="aws-label mt-4">Bucket policy statement required for OAC</div>
                <pre className="font-mono text-[11.5px] bg-[#f4f4f4] rounded p-2 overflow-x-auto">{policyDoc([oacStatement(bucket.name, accountId, d.id)])}</pre>
                <div className="mt-1">{bucketAllows(bucket, d.id) ? <span className="text-[#037f0c]">✓ {bucket.name} policy grants this distribution.</span> : <Button onClick={() => applyOac(mutate, log, bucket.name, accountId, d.id)}>Apply policy to {bucket.name}</Button>}</div>
              </>
            )}
          </Panel>
        ) },
        { label: 'Behaviors', content: (
          <Panel title="Behaviors">
            <KV items={[['Path pattern', 'Default (*)'], ['Viewer protocol policy', { 'allow-all': 'HTTP and HTTPS', 'redirect-to-https': 'Redirect HTTP to HTTPS', 'https-only': 'HTTPS only' }[d.viewerProtocol]], ['Cache policy', d.cachePolicy ?? 'Legacy cache settings'], ['Default TTL', `${d.defaultTtl} s`]]} />
            <Teach title="Signed URLs vs signed cookies">Both restrict who can fetch private content through CloudFront, signed with a key in a trusted key group. Use a signed URL for one file (an installer, one video) or clients that can't do cookies; use signed cookies for many files (a whole members area, HLS video segments) without changing URLs. S3 presigned URLs are the S3-only equivalent and bypass CloudFront.</Teach>
          </Panel>
        ) },
        { label: 'Security', content: (
          <Panel title="Security">
            <KV items={[['AWS WAF', d.wafAclId ? `Enabled (web ACL ${d.wafAclId})` : 'Not enabled'], ['Geographic restrictions', geoMode ? `${geoMode === 'allow' ? 'Allow list' : 'Block list'}: ${geoList}` : 'No restrictions'], ['AWS Shield', 'Standard (automatic)']]} />
          </Panel>
        ) },
      ]} />
      <Panel title="Simulate requests" desc="Send 60 simulated viewer requests from around the world and see which edge served them and whether they hit the cache."
        actions={<Button primary onClick={simulate}>Simulate requests</Button>}>
        {sim ? (
          <>
            <KV cols={4} items={[['Cache hit ratio', `${d.cacheHitRate}%`], ['Avg latency: cache hit', `${avg(hits)} ms`], ['Avg latency: cache miss', `${avg(misses)} ms`], ['Origin requests', String(sim.filter((r) => r.originMs || r.result.includes('origin')).length)]]} />
            <div className="mt-3 max-h-80 overflow-y-auto">
              <Table rows={sim} columns={[
                { header: 'Viewer', cell: (r) => r.viewer }, { header: 'Edge location', cell: (r) => r.edge }, { header: 'Request', cell: (r) => `${r.proto} GET ${r.path}` },
                { header: 'x-cache', cell: (r) => <span className={r.result.startsWith('Hit') ? 'text-[#037f0c]' : r.status >= 400 ? 'text-[#d91515]' : ''}>{r.status} {r.result}</span> },
                { header: 'Latency', cell: (r) => (r.originMs ? `${r.ms} ms (origin ${r.originMs} ms)` : `${r.ms} ms`) },
              ]} />
            </div>
            <Teach>A miss pays the viewer→edge leg plus edge→origin ({originRegion}); a hit pays only the short viewer→edge leg. Each edge caches separately, so the first request per edge misses. Regional edge caches and Origin Shield add a middle tier to raise the hit ratio and protect the origin.</Teach>
          </>
        ) : <div className="text-[#5f6b7a]">No simulation run yet.</div>}
      </Panel>
    </Page>
  );
}
