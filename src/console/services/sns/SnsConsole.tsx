import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { Topic } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Page, Panel, Button, Table, Field, Input, Select, Radios, KV, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { publish, topicArn } from './util';
import { sqsArn } from '../sqs/util';
import { lambdaArn } from '../lambda/invoke';

export default function SnsConsole() {
  return (
    <div className="flex">
      <SideNav title="Amazon SNS" items={[{ label: 'Dashboard', to: '/console/sns' }, { label: 'Topics', to: '/console/sns' }, { label: 'Subscriptions', to: '/console/sns/subscriptions' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<TopicList />} />
          <Route path="create" element={<CreateTopic />} />
          <Route path="subscriptions" element={<AllSubscriptions />} />
          <Route path="topics/:id" element={<TopicDetail />} />
          <Route path="topics/:id/publish" element={<Publish />} />
        </Routes>
      </div>
    </div>
  );
}

type Proto = Topic['subscriptions'][number]['protocol'];
const subStatus = (p: Proto) => (p === 'email' || p === 'https' ? 'Pending confirmation' : 'Confirmed');

function TopicList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const rows = c.topics.filter((t) => t.region === c.region);
  return (
    <Page title="Topics" crumbs={[{ label: 'Amazon SNS', to: '/console/sns' }, { label: 'Topics' }]}>
      <Panel title="Topics" counter={rows.length} actions={<Button primary onClick={() => nav('/console/sns/create')}>Create topic</Button>}>
        <Table rows={rows} filterText={(t) => t.name} empty="No topics. To get started, create a topic." columns={[
          { header: 'Name', cell: (t) => <Link to={`/console/sns/topics/${t.id}`}>{t.name}</Link> },
          { header: 'Type', cell: (t) => (t.fifo ? 'FIFO' : 'Standard') },
          { header: 'ARN', cell: (t) => <code className="text-[12px]">{topicArn(c, t)}</code> },
          { header: 'Subscriptions', cell: (t) => t.subscriptions.length },
        ]} />
      </Panel>
      <Teach title="Fan-out">Publish once to an SNS topic, deliver to <b>many SQS queues</b> (and Lambdas) in parallel. Each queue gets its own copy, so independent consumers (billing, shipping, analytics) scale and fail separately. Add <b>filter policies</b> so each subscriber only gets the messages it cares about.</Teach>
    </Page>
  );
}

function CreateTopic() {
  const c = useCloud((c) => c);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [fifo, setFifo] = useState(false);
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const base = fifo ? name.replace(/\.fifo$/, '') : name;
  const err = !name ? 'Topic name is required.' : fifo && !name.endsWith('.fifo') ? 'FIFO topic names must end with .fifo.' : !fifo && name.endsWith('.fifo') ? 'Only FIFO topic names can end with .fifo.'
    : !/^[a-zA-Z0-9_-]{1,256}$/.test(base) || name.length > 256 ? 'Up to 256 characters: alphanumerics, hyphens (-) and underscores (_).'
      : c.topics.some((t) => t.region === c.region && t.name === name) ? 'A topic with this name already exists.' : undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (err) return;
    const t: Topic = { id: rid('topic'), name, region: c.region, createdAt: Date.now(), fifo, subscriptions: [], published: 0 };
    put('topics', t);
    log('sns', `CreateTopic ${name} (${fifo ? 'FIFO' : 'Standard'})`);
    nav(`/console/sns/topics/${t.id}`);
  };
  return (
    <Page title="Create topic" crumbs={[{ label: 'Amazon SNS', to: '/console/sns' }, { label: 'Topics', to: '/console/sns' }, { label: 'Create topic' }]}>
      <form onSubmit={submit}>
        <Panel title="Details">
          <Field label="Type" hint="Topic type cannot be modified after topic is created.">
            <Radios value={fifo ? 'fifo' : 'std'} onChange={(v) => { setFifo(v === 'fifo'); if (v === 'fifo' && name && !name.endsWith('.fifo')) setName(`${name}.fifo`); if (v === 'std') setName(name.replace(/\.fifo$/, '')); }} options={[
              { value: 'fifo', label: 'FIFO (first-in, first-out)', desc: 'Strictly-preserved message ordering, exactly-once delivery, high throughput up to 300 publishes/second. Subscription protocols: SQS.' },
              { value: 'std', label: 'Standard', desc: 'Best-effort ordering, at-least-once delivery, highest throughput. Subscription protocols: SQS, Lambda, HTTP, SMS, email, mobile push.' },
            ]} />
          </Field>
          <Field label="Name" error={tried ? err : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MyTopic" /></Field>
        </Panel>
        <FormFooter onCancel={() => nav('/console/sns')} submitLabel="Create topic" />
      </form>
    </Page>
  );
}

function TopicDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [modal, setModal] = useState<'sub' | 'delete' | null>(null);
  const t = c.topics.find((x) => x.id === id);
  if (!t) return <Page title="Topic not found"><Alert kind="error">This topic doesn't exist. <Link to="/console/sns">Back to Topics</Link></Alert></Page>;
  const arn = topicArn(c, t);
  return (
    <Page title={t.name} crumbs={[{ label: 'Amazon SNS', to: '/console/sns' }, { label: 'Topics', to: '/console/sns' }, { label: t.name }]} actions={<>
      <Button danger onClick={() => setModal('delete')}>Delete</Button>
      <Button primary onClick={() => nav(`/console/sns/topics/${t.id}/publish`)}>Publish message</Button>
    </>}>
      <Panel title="Details">
        <KV cols={4} items={[['Name', t.name], ['ARN', <code className="text-[12px]">{arn}</code>], ['Type', t.fifo ? 'FIFO' : 'Standard'], ['Messages published', t.published]]} />
      </Panel>
      <Panel title="Subscriptions" counter={t.subscriptions.length} actions={<Button primary onClick={() => setModal('sub')}>Create subscription</Button>}>
        <Table rows={t.subscriptions} empty="No subscriptions found." columns={[
          { header: 'ID', cell: (s) => <span className="font-mono text-[12px]">{s.id.slice(0, 8)}…</span> },
          { header: 'Endpoint', cell: (s) => <span className="break-all">{s.endpoint}</span> },
          { header: 'Status', cell: (s) => subStatus(s.protocol) },
          { header: 'Protocol', cell: (s) => s.protocol.toUpperCase() },
          { header: 'Filter policy', cell: (s) => (s.filter ? <code className="text-[12px]">{s.filter}</code> : '–') },
          { header: '', cell: (s) => <button className="link" onClick={() => { mutate((d) => { const x = d.topics.find((y) => y.id === t.id); if (x) x.subscriptions = x.subscriptions.filter((y) => y.id !== s.id); }); log('sns', `Unsubscribe ${s.protocol} ${s.endpoint} from ${t.name}`); }}>Delete</button> },
        ]} />
      </Panel>
      <Teach title="Fan-out">SNS + SQS fan-out: the topic pushes a copy to every subscribed queue at once, and each queue buffers for its own consumer. SNS doesn't store messages, so a subscriber that is down misses it unless it's a queue.</Teach>
      {modal === 'sub' && <CreateSubscription t={t} onClose={() => setModal(null)} />}
      {modal === 'delete' && <ConfirmDelete what={`topic ${t.name}`} onClose={() => setModal(null)} warning="Deleting a topic deletes all its subscriptions." onConfirm={() => {
        nav('/console/sns');
        mutate((d) => { d.topics = d.topics.filter((x) => x.id !== t.id); for (const f of d.lambdas) f.triggers = f.triggers.filter((tr) => !(tr.type === 'sns' && tr.source === arn)); });
        log('sns', `DeleteTopic ${t.name}`);
      }} />}
    </Page>
  );
}

function CreateSubscription({ t, onClose }: { t: Topic; onClose: () => void }) {
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [proto, setProto] = useState<Proto>('sqs');
  const [endpoint, setEndpoint] = useState('');
  const [filter, setFilter] = useState('');
  const queues = c.queues.filter((q) => q.region === t.region && q.fifo === t.fifo);
  const fns = c.lambdas.filter((f) => f.region === t.region);
  const choices = proto === 'sqs' ? queues.map((q) => ({ value: sqsArn(c, q), label: q.name })) : proto === 'lambda' ? fns.map((f) => ({ value: lambdaArn(c, f), label: f.name })) : null;
  const ep = choices ? endpoint || choices[0]?.value || '' : endpoint;
  let filterErr: string | undefined;
  if (filter.trim()) {
    try { const p = JSON.parse(filter); if (!p || typeof p !== 'object' || Array.isArray(p)) filterErr = 'The filter policy must be a JSON object.'; else if (Object.values(p).some((v) => !Array.isArray(v))) filterErr = 'Each attribute must map to an array, e.g. {"eventType": ["order_placed"]}.'; }
    catch { filterErr = 'The filter policy is not valid JSON.'; }
  }
  const epErr = !ep ? (choices ? `No ${proto === 'sqs' ? `${t.fifo ? 'FIFO' : 'standard'} queues` : 'functions'} in this Region.` : 'Endpoint is required.')
    : proto === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ep) ? 'Enter a valid email address.'
      : proto === 'https' && !/^https:\/\/\S+$/.test(ep) ? 'Enter an endpoint that starts with https://.'
        : proto === 'sms' && !/^\+[1-9]\d{6,14}$/.test(ep) ? 'Enter a phone number in E.164 format, e.g. +14155550100.'
          : t.subscriptions.some((s) => s.protocol === proto && s.endpoint === ep) ? 'This endpoint is already subscribed.' : undefined;
  const create = () => {
    mutate((d) => {
      const x = d.topics.find((y) => y.id === t.id);
      if (!x) return;
      x.subscriptions.push({ id: crypto.randomUUID(), protocol: proto, endpoint: ep, filter: filter.trim() || undefined });
      if (proto === 'lambda') { const f = d.lambdas.find((y) => lambdaArn(d, y) === ep); if (f && !f.triggers.some((tr) => tr.type === 'sns' && tr.source === topicArn(d, x))) f.triggers.push({ type: 'sns', source: topicArn(d, x) }); }
    });
    log('sns', `Subscribe ${proto} ${ep} to ${t.name}${filter.trim() ? ' with filter policy' : ''}`);
    onClose();
  };
  return (
    <Modal title="Create subscription" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button primary disabled={!!epErr || !!filterErr} onClick={create}>Create subscription</Button></>}>
      <Field label="Topic ARN"><Input value={topicArn(c, t)} disabled /></Field>
      <Field label="Protocol" hint={t.fifo ? 'FIFO topics can only deliver to FIFO SQS queues.' : undefined}>
        <Select value={proto} onChange={(v) => { setProto(v as Proto); setEndpoint(''); }} options={t.fifo ? [{ value: 'sqs', label: 'Amazon SQS' }] : [{ value: 'sqs', label: 'Amazon SQS' }, { value: 'lambda', label: 'AWS Lambda' }, { value: 'email', label: 'Email' }, { value: 'https', label: 'HTTPS' }, { value: 'sms', label: 'SMS' }]} />
      </Field>
      <Field label="Endpoint" error={epErr}>
        {choices ? <Select value={ep} onChange={setEndpoint} options={choices.length ? choices : [{ value: '', label: 'None available' }]} />
          : <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={proto === 'email' ? 'user@example.com' : proto === 'https' ? 'https://example.com/hook' : '+14155550100'} />}
      </Field>
      {proto === 'sqs' && <Alert kind="info">The console also updates the queue's access policy so sns.amazonaws.com may call SendMessage. Without that policy, delivery silently fails.</Alert>}
      {(proto === 'email' || proto === 'https') && <Alert kind="info">The endpoint owner must confirm the subscription before it receives messages.</Alert>}
      <Field label="Subscription filter policy - optional" hint='Filters on message attributes. Example: {"eventType": ["order_placed"], "store": [{"prefix": "eu-"}]}' error={filterErr}>
        <textarea className="aws-input font-mono text-[13px] w-full" rows={4} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder='{"eventType": ["order_placed"]}' />
      </Field>
      <Teach>Filter policies move routing logic out of consumers: SNS only delivers messages whose attributes match, so you don't pay for (or process) the rest.</Teach>
    </Modal>
  );
}

function Publish() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('');
  const [attrs, setAttrs] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }]);
  const [res, setRes] = useState<ReturnType<typeof publish> | null>(null);
  const t = c.topics.find((x) => x.id === id);
  if (!t) return <Page title="Topic not found"><Alert kind="error">This topic doesn't exist. <Link to="/console/sns">Back to Topics</Link></Alert></Page>;
  const send = () => {
    const a = Object.fromEntries(attrs.filter((x) => x.name.trim()).map((x) => [x.name.trim(), x.value]));
    let r: ReturnType<typeof publish> = { delivered: [], filtered: [], failed: [] };
    mutate((d) => { r = publish(d, t.id, subject, message, a); });
    log('sns', `Publish to ${t.name}: delivered to ${r.delivered.length}, filtered ${r.filtered.length}`);
    setRes(r);
  };
  const setAttr = (i: number, p: Partial<{ name: string; value: string }>) => setAttrs(attrs.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <Page title="Publish message to topic" crumbs={[{ label: 'Amazon SNS', to: '/console/sns' }, { label: 'Topics', to: '/console/sns' }, { label: t.name, to: `/console/sns/topics/${t.id}` }, { label: 'Publish message' }]}>
      <Panel title="Message details">
        <KV cols={2} items={[['Topic ARN', topicArn(c, t)], ['Subscriptions', t.subscriptions.length]]} />
        <div className="mt-4" />
        <Field label="Subject - optional"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        {t.fifo && <Field label="Message group ID"><Input value={group} onChange={(e) => setGroup(e.target.value)} /></Field>}
      </Panel>
      <Panel title="Message body">
        <Field label="Message body to send to the endpoint"><textarea className="aws-input w-full" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      </Panel>
      <Panel title="Message attributes" desc="Subscription filter policies match on these.">
        {attrs.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_1fr_auto] gap-2 mb-2">
            <Input value={a.name} onChange={(e) => setAttr(i, { name: e.target.value })} placeholder="Name, e.g. eventType" />
            <Select value="String" onChange={() => {}} options={['String']} />
            <Input value={a.value} onChange={(e) => setAttr(i, { value: e.target.value })} placeholder="Value, e.g. order_placed" />
            <Button onClick={() => setAttrs(attrs.filter((_, k) => k !== i))}>Remove</Button>
          </div>
        ))}
        <Button onClick={() => setAttrs([...attrs, { name: '', value: '' }])}>Add another attribute</Button>
      </Panel>
      {res && <Alert kind={res.delivered.length ? 'success' : 'warning'}>
        <div className="font-bold">Message published to topic {t.name}.</div>
        <div className="text-[13px]">Delivered to {res.delivered.length}: {res.delivered.join('; ') || 'none'}</div>
        {res.filtered.length > 0 && <div className="text-[13px]">Filtered out by subscription filter policy ({res.filtered.length}): {res.filtered.join('; ')}</div>}
        {res.failed.length > 0 && <div className="text-[13px] text-[#d91515]">Endpoint not found ({res.failed.length}): {res.failed.join('; ')}</div>}
      </Alert>}
      <div className="flex justify-end gap-2 mb-10">
        <Link to={`/console/sns/topics/${t.id}`} className="aws-btn">Cancel</Link>
        <Button primary disabled={!message || (t.fifo && !group)} onClick={send}>Publish message</Button>
      </div>
    </Page>
  );
}

function AllSubscriptions() {
  const c = useCloud((c) => c);
  const rows = c.topics.filter((t) => t.region === c.region).flatMap((t) => t.subscriptions.map((s) => ({ ...s, topic: t })));
  return (
    <Page title="Subscriptions" crumbs={[{ label: 'Amazon SNS', to: '/console/sns' }, { label: 'Subscriptions' }]}>
      <Panel title="Subscriptions" counter={rows.length}>
        <Table rows={rows} empty="No subscriptions found." columns={[
          { header: 'Endpoint', cell: (s) => <span className="break-all">{s.endpoint}</span> },
          { header: 'Status', cell: (s) => subStatus(s.protocol) },
          { header: 'Protocol', cell: (s) => s.protocol.toUpperCase() },
          { header: 'Topic', cell: (s) => <Link to={`/console/sns/topics/${s.topic.id}`}>{s.topic.name}</Link> },
          { header: 'Created', cell: (s) => fmtDate(s.topic.createdAt) },
        ]} />
      </Panel>
    </Page>
  );
}
