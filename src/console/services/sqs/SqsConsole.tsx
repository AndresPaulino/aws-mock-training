import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import type { Queue, SqsMessage } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';
import { Page, Panel, Button, Table, Field, Input, Select, Check, Radios, KV, Tabs, Teach, Alert, Modal, ConfirmDelete, FormFooter, SideNav, fmtDate, useCloud, useCloudActions } from '../../kit';
import { counts, queueUrl, receiveMessages, sendMessage, sqsArn } from './util';

export default function SqsConsole() {
  return (
    <div className="flex">
      <SideNav title="Amazon SQS" items={[{ label: 'Queues', to: '/console/sqs' }]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<QueueList />} />
          <Route path="create" element={<CreateQueue />} />
          <Route path="queues/:id" element={<QueueDetail />} />
          <Route path="queues/:id/send-receive" element={<SendReceive />} />
        </Routes>
      </div>
    </div>
  );
}

const fmtSec = (s: number) => (s >= 86400 && s % 86400 === 0 ? `${s / 86400} days` : s >= 3600 && s % 3600 === 0 ? `${s / 3600} hours` : s >= 60 && s % 60 === 0 ? `${s / 60} minutes` : `${s} seconds`);

function QueueList() {
  const c = useCloud((c) => c);
  const nav = useNavigate();
  const rows = c.queues.filter((q) => q.region === c.region);
  return (
    <Page title="Queues" crumbs={[{ label: 'Amazon SQS', to: '/console/sqs' }, { label: 'Queues' }]}>
      <Panel title="Queues" counter={rows.length} actions={<Button primary onClick={() => nav('/console/sqs/create')}>Create queue</Button>}>
        <Table rows={rows} filterText={(q) => q.name} empty="No queues. Create a queue to get started." columns={[
          { header: 'Name', cell: (q) => <Link to={`/console/sqs/queues/${q.id}`}>{q.name}</Link> },
          { header: 'Type', cell: (q) => (q.fifo ? 'FIFO' : 'Standard') },
          { header: 'Created', cell: (q) => fmtDate(q.createdAt) },
          { header: 'Messages available', cell: (q) => counts(q).available },
          { header: 'Messages in flight', cell: (q) => counts(q).inFlight },
          { header: 'Encryption', cell: () => 'Amazon SQS key (SSE-SQS)' },
          { header: 'Dead-letter queue', cell: (q) => c.queues.find((x) => x.id === q.dlqId)?.name ?? '–' },
        ]} />
      </Panel>
    </Page>
  );
}

const UNIT = { minutes: 60, hours: 3600, days: 86400 } as const;

function CreateQueue() {
  const c = useCloud((c) => c);
  const { put, log } = useCloudActions();
  const nav = useNavigate();
  const [fifo, setFifo] = useState(false);
  const [name, setName] = useState('');
  const [vt, setVt] = useState('30');
  const [ret, setRet] = useState('4');
  const [retUnit, setRetUnit] = useState<keyof typeof UNIT>('days');
  const [delay, setDelay] = useState('0');
  const [wait, setWait] = useState('0');
  const [dlqOn, setDlqOn] = useState(false);
  const [dlqId, setDlqId] = useState('');
  const [maxRc, setMaxRc] = useState('3');
  const [tried, setTried] = useState(false);
  const candidates = c.queues.filter((q) => q.region === c.region && q.fifo === fifo);
  const dlq = dlqId || candidates[0]?.id || '';
  const retSec = Number(ret) * UNIT[retUnit];
  const errs = {
    name: !name ? 'Queue name is required.'
      : fifo && !name.endsWith('.fifo') ? 'The name of a FIFO queue must end with the .fifo suffix.'
        : !fifo && name.endsWith('.fifo') ? 'Only FIFO queue names can end with .fifo.'
          : !/^[a-zA-Z0-9_-]{1,80}$/.test(fifo ? name.slice(0, -5) : name) || name.length > 80 ? 'Up to 80 characters: alphanumerics, hyphens (-) and underscores (_).'
            : c.queues.some((q) => q.region === c.region && q.name === name) ? 'A queue with this name already exists.' : undefined,
    vt: Number(vt) >= 0 && Number(vt) <= 43200 ? undefined : 'Visibility timeout must be between 0 seconds and 12 hours.',
    ret: retSec >= 60 && retSec <= 1209600 ? undefined : 'Message retention period must be between 1 minute and 14 days.',
    delay: Number(delay) >= 0 && Number(delay) <= 900 ? undefined : 'Delivery delay must be between 0 seconds and 15 minutes.',
    wait: Number(wait) >= 0 && Number(wait) <= 20 ? undefined : 'Receive message wait time must be between 0 and 20 seconds.',
    dlq: !dlqOn ? undefined : !dlq ? `Create a ${fifo ? 'FIFO' : 'standard'} queue to use as the dead-letter queue first.` : Number(maxRc) >= 1 && Number(maxRc) <= 1000 ? undefined : 'Maximum receives must be 1–1000.',
  };
  const valid = Object.values(errs).every((e) => !e);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const q: Queue = {
      id: rid('q'), name, region: c.region, createdAt: Date.now(), fifo, visibilityTimeoutSec: Number(vt), retentionDays: retSec / 86400, delaySec: Number(delay),
      receiveWaitSec: Number(wait), dlqId: dlqOn ? dlq : undefined, maxReceiveCount: dlqOn ? Number(maxRc) : 0, messages: [],
    };
    put('queues', q);
    log('sqs', `CreateQueue ${name} (${fifo ? 'FIFO' : 'Standard'}, visibility ${vt}s${dlqOn ? `, DLQ ${c.queues.find((x) => x.id === dlq)?.name} after ${maxRc} receives` : ''})`);
    nav(`/console/sqs/queues/${q.id}`);
  };
  const E = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  return (
    <Page title="Create queue" crumbs={[{ label: 'Amazon SQS', to: '/console/sqs' }, { label: 'Queues', to: '/console/sqs' }, { label: 'Create queue' }]}>
      <form onSubmit={submit}>
        <Panel title="Details">
          <Field label="Type" hint="You can't change the queue type after you create a queue.">
            <Radios value={fifo ? 'fifo' : 'std'} onChange={(v) => { setFifo(v === 'fifo'); setDlqId(''); if (v === 'fifo' && name && !name.endsWith('.fifo')) setName(`${name}.fifo`); if (v === 'std' && name.endsWith('.fifo')) setName(name.slice(0, -5)); }} options={[
              { value: 'std', label: 'Standard', desc: 'At-least-once delivery, message ordering isn\'t preserved. Nearly unlimited throughput.' },
              { value: 'fifo', label: 'FIFO', desc: 'First-in-first-out delivery, message ordering is preserved. Exactly-once processing.' },
            ]} />
          </Field>
          <Teach title="FIFO throughput">FIFO queues guarantee order (per message group) and deduplicate, but are capped at <b>300 messages/s</b> (3,000 with batching of 10; higher with high-throughput mode). Standard queues scale almost without limit but may deliver a message more than once and out of order, so consumers must be idempotent.</Teach>
          <Field label="Name" hint={fifo ? 'A FIFO queue name must end with .fifo.' : 'A queue name is case-sensitive and can have up to 80 characters.'} error={E('name')}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={fifo ? 'MyQueue.fifo' : 'MyQueue'} /></Field>
        </Panel>
        <Panel title="Configuration" desc="Set the maximum message size, visibility to other consumers, and message retention.">
          <div className="grid md:grid-cols-2 gap-x-6">
            <Field label="Visibility timeout (seconds)" hint="0 seconds to 12 hours. Default 30 seconds." error={E('vt')}><Input type="number" value={vt} onChange={(e) => setVt(e.target.value)} /></Field>
            <Field label="Message retention period" hint="1 minute to 14 days. Default 4 days." error={E('ret')}>
              <div className="flex gap-2"><Input type="number" value={ret} onChange={(e) => setRet(e.target.value)} /><Select value={retUnit} onChange={(v) => setRetUnit(v as keyof typeof UNIT)} options={['minutes', 'hours', 'days']} /></div>
            </Field>
            <Field label="Delivery delay (seconds)" hint="0 seconds to 15 minutes." error={E('delay')}><Input type="number" value={delay} onChange={(e) => setDelay(e.target.value)} /></Field>
            <Field label="Receive message wait time (seconds)" hint="0 to 20 seconds. Greater than 0 enables long polling." error={E('wait')}><Input type="number" value={wait} onChange={(e) => setWait(e.target.value)} /></Field>
          </div>
          <Teach title="Visibility timeout vs processing time">When a consumer receives a message it becomes <b>invisible</b> for the visibility timeout. If processing takes longer than that, the message reappears and a second consumer processes it again (duplicate work). Set it above your worst-case processing time; for a Lambda consumer, ≥ 6× the function timeout. Consumers can extend it with ChangeMessageVisibility.</Teach>
          <Teach title="Long polling">A wait time of 1–20 s (long polling) lets ReceiveMessage wait for messages instead of returning empty immediately: fewer empty responses, lower cost. Usually the right answer over short polling.</Teach>
        </Panel>
        <Panel title="Encryption"><p>Server-side encryption: <b>Enabled</b> (Amazon SQS key, SSE-SQS).</p></Panel>
        <Panel title="Dead-letter queue" desc="Send undeliverable messages to a dead-letter queue.">
          <Radios value={dlqOn ? 'on' : 'off'} onChange={(v) => setDlqOn(v === 'on')} options={[{ value: 'off', label: 'Disabled' }, { value: 'on', label: 'Enabled' }]} />
          {dlqOn && <div className="grid md:grid-cols-2 gap-x-6 mt-3">
            <Field label="Choose queue" hint={`Must be a ${fifo ? 'FIFO' : 'standard'} queue in the same Region.`} error={E('dlq')}>
              <Select value={dlq} onChange={setDlqId} options={candidates.length ? candidates.map((q) => ({ value: q.id, label: q.name })) : [{ value: '', label: 'No eligible queues' }]} />
            </Field>
            <Field label="Maximum receives" hint="1 to 1000. After this many receives without a delete, the message moves to the DLQ."><Input type="number" value={maxRc} onChange={(e) => setMaxRc(e.target.value)} /></Field>
          </div>}
          <Teach>A DLQ catches <b>poison messages</b> that fail repeatedly, so they stop blocking consumers and you can inspect them. Set the DLQ's retention longer than the source queue's (the original enqueue timestamp is kept).</Teach>
        </Panel>
        {tried && !valid && <Alert kind="error">Fix the errors above to continue.</Alert>}
        <FormFooter onCancel={() => nav('/console/sqs')} submitLabel="Create queue" />
      </form>
    </Page>
  );
}

function QueueDetail() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const nav = useNavigate();
  const [modal, setModal] = useState<'delete' | 'purge' | 'edit' | null>(null);
  const q = c.queues.find((x) => x.id === id);
  const [vt, setVt] = useState(String(q?.visibilityTimeoutSec ?? 30));
  const [dlqId, setDlqId] = useState(q?.dlqId ?? '');
  const [maxRc, setMaxRc] = useState(String(q?.maxReceiveCount || 3));
  if (!q) return <Page title="Queue not found"><Alert kind="error">This queue doesn't exist. <Link to="/console/sqs">Back to Queues</Link></Alert></Page>;
  const n = counts(q);
  const dlq = c.queues.find((x) => x.id === q.dlqId);
  const sources = c.queues.filter((x) => x.dlqId === q.id);
  const arn = sqsArn(c, q);
  const consumers = c.lambdas.filter((f) => f.triggers.some((t) => t.type === 'sqs' && t.source === arn));
  const subs = c.topics.filter((t) => t.subscriptions.some((s) => s.protocol === 'sqs' && s.endpoint === arn));
  const dlqCandidates = c.queues.filter((x) => x.region === q.region && x.fifo === q.fifo && x.id !== q.id);
  const save = () => {
    mutate((d) => { const x = d.queues.find((y) => y.id === q.id); if (!x) return; x.visibilityTimeoutSec = Math.min(43200, Math.max(0, Number(vt))); x.dlqId = dlqId || undefined; x.maxReceiveCount = dlqId ? Math.min(1000, Math.max(1, Number(maxRc))) : 0; });
    log('sqs', `SetQueueAttributes ${q.name}: VisibilityTimeout=${vt}${dlqId ? `, RedrivePolicy maxReceiveCount=${maxRc}` : ''}`);
    setModal(null);
  };
  return (
    <Page title={q.name} crumbs={[{ label: 'Amazon SQS', to: '/console/sqs' }, { label: 'Queues', to: '/console/sqs' }, { label: q.name }]} actions={<>
      <Button onClick={() => setModal('edit')}>Edit</Button><Button onClick={() => setModal('purge')}>Purge</Button><Button danger onClick={() => setModal('delete')}>Delete</Button>
      <Button primary onClick={() => nav(`/console/sqs/queues/${q.id}/send-receive`)}>Send and receive messages</Button>
    </>}>
      <Panel title="Details">
        <KV cols={3} items={[
          ['Name', q.name], ['Type', q.fifo ? 'FIFO' : 'Standard'], ['ARN', <code className="text-[12px]">{arn}</code>],
          ['URL', <code className="text-[12px]">{queueUrl(c, q)}</code>], ['Encryption', 'Amazon SQS key (SSE-SQS)'], ['Dead-letter queue', dlq ? <Link to={`/console/sqs/queues/${dlq.id}`}>{dlq.name}</Link> : '–'],
          ['Messages available', n.available], ['Messages in flight', n.inFlight], ['Messages delayed', n.delayed],
        ]} />
      </Panel>
      <Tabs tabs={[
        { label: 'Configuration', content: <Panel title="Configuration"><KV items={[
          ['Visibility timeout', fmtSec(q.visibilityTimeoutSec)], ['Message retention period', fmtSec(Math.round(q.retentionDays * 86400))], ['Delivery delay', fmtSec(q.delaySec)],
          ['Receive message wait time', `${q.receiveWaitSec} seconds${q.receiveWaitSec ? ' (long polling)' : ' (short polling)'}`], ['Maximum message size', '256 KB'], ['Content-based deduplication', q.fifo ? 'Disabled' : '–'],
        ]} /></Panel> },
        { label: 'Dead-letter queue', content: <Panel title="Redrive policy">
          <KV items={[['Dead-letter queue', dlq?.name ?? 'Disabled'], ['Maximum receives', q.dlqId ? q.maxReceiveCount : '–'], ['Used as a DLQ by', sources.map((s) => s.name).join(', ') || '–']]} />
          {sources.length > 0 && <Teach>This queue is a dead-letter queue. Once you fix the consumer bug, use <b>DLQ redrive</b> to move messages back to the source queue.</Teach>}
        </Panel> },
        { label: 'Lambda triggers', content: <Panel title="Lambda triggers" counter={consumers.length}>
          {consumers.map((f) => <div key={f.id}><Link to={`/console/lambda/functions/${f.id}`}>{f.name}</Link> <span className="text-[#5f6b7a]">(timeout {f.timeoutSec}s)</span></div>)}
          {!consumers.length && <p className="text-[#5f6b7a]">No Lambda functions poll this queue. Add an SQS trigger from the Lambda console.</p>}
        </Panel> },
        { label: 'SNS subscriptions', content: <Panel title="SNS subscriptions" counter={subs.length}>
          {subs.map((t) => <div key={t.id}><Link to={`/console/sns/topics/${t.id}`}>{t.name}</Link></div>)}
          {!subs.length && <p className="text-[#5f6b7a]">This queue isn't subscribed to any SNS topic.</p>}
        </Panel> },
      ]} />
      {modal === 'edit' && <Modal title={`Edit ${q.name}`} onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button primary onClick={save}>Save</Button></>}>
        <Field label="Visibility timeout (seconds)" hint="0 seconds to 12 hours."><Input type="number" value={vt} onChange={(e) => setVt(e.target.value)} /></Field>
        <Field label="Dead-letter queue"><Select value={dlqId} onChange={setDlqId} options={[{ value: '', label: 'Disabled' }, ...dlqCandidates.map((x) => ({ value: x.id, label: x.name }))]} /></Field>
        {dlqId && <Field label="Maximum receives"><Input type="number" value={maxRc} onChange={(e) => setMaxRc(e.target.value)} /></Field>}
      </Modal>}
      {modal === 'purge' && <Modal title={`Purge ${q.name}?`} onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button primary onClick={() => { mutate((d) => { const x = d.queues.find((y) => y.id === q.id); if (x) x.messages = []; }); log('sqs', `PurgeQueue ${q.name}`); setModal(null); }}>Purge</Button></>}>
        <Alert kind="warning">All {q.messages.length} messages in the queue will be permanently deleted.</Alert>
      </Modal>}
      {modal === 'delete' && <ConfirmDelete what={`queue ${q.name}`} onClose={() => setModal(null)} warning={sources.length ? `This queue is the DLQ for ${sources.map((s) => s.name).join(', ')}.` : undefined} onConfirm={() => {
        nav('/console/sqs');
        mutate((d) => { d.queues = d.queues.filter((x) => x.id !== q.id); for (const x of d.queues) if (x.dlqId === q.id) x.dlqId = undefined; });
        log('sqs', `DeleteQueue ${q.name}`);
      }} />}
    </Page>
  );
}

function SendReceive() {
  const { id = '' } = useParams();
  const c = useCloud((c) => c);
  const { mutate, log } = useCloudActions();
  const [body, setBody] = useState('');
  const [group, setGroup] = useState('group-1');
  const [dedup, setDedup] = useState('');
  const [polled, setPolled] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [view, setView] = useState<SqsMessage | null>(null);
  const q = c.queues.find((x) => x.id === id);
  if (!q) return <Page title="Queue not found"><Alert kind="error">This queue doesn't exist. <Link to="/console/sqs">Back to Queues</Link></Alert></Page>;
  const now = Date.now();
  const n = counts(q, now);
  const dlq = c.queues.find((x) => x.id === q.dlqId);
  const arn = sqsArn(c, q);
  const consumer = c.lambdas.find((f) => f.triggers.some((t) => t.type === 'sqs' && t.source === arn));
  const shown = polled.map((mid) => q.messages.find((m) => m.id === mid)).filter((m): m is SqsMessage => !!m);
  const upd = (fn: (x: Queue) => void) => mutate((d) => { const x = d.queues.find((y) => y.id === q.id); if (x) fn(x); });

  const send = () => {
    upd((x) => sendMessage(x, body));
    log('sqs', `SendMessage ${q.name}${q.fifo ? ` (MessageGroupId ${group})` : ''}`);
    setNote(`Your message has been sent and is ready to be received${q.delaySec ? ` after the ${q.delaySec}s delivery delay` : ''}.`);
    setBody(''); setDedup('');
  };
  const poll = () => {
    let r = { received: [] as SqsMessage[], movedToDlq: 0 };
    mutate((d) => { r = receiveMessages(d, q.id); });
    log('sqs', `ReceiveMessage ${q.name}: ${r.received.length} received${r.movedToDlq ? `, ${r.movedToDlq} moved to DLQ` : ''}`);
    setPolled((p) => [...new Set([...r.received.map((m) => m.id), ...p])]);
    setNote(`Polled for ${q.receiveWaitSec || 'up to 20'} seconds: received ${r.received.length} message(s).${r.movedToDlq ? ` ${r.movedToDlq} message(s) exceeded Maximum receives (${q.maxReceiveCount}) and moved to ${dlq?.name}.` : ''}`);
  };
  return (
    <Page title="Send and receive messages" crumbs={[{ label: 'Amazon SQS', to: '/console/sqs' }, { label: 'Queues', to: '/console/sqs' }, { label: q.name, to: `/console/sqs/queues/${q.id}` }, { label: 'Send and receive messages' }]}>
      {consumer && <Alert kind="info">Lambda function <Link to={`/console/lambda/functions/${consumer.id}`}>{consumer.name}</Link> polls this queue. In the real service it would consume messages within seconds; here you poll manually to watch the mechanics.</Alert>}
      <Panel title="Send message" actions={<Button primary disabled={!body || (q.fifo && (!group || !dedup))} onClick={send}>Send message</Button>}>
        <Field label="Message body"><textarea className="aws-input w-full" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Enter message" /></Field>
        {q.fifo && <div className="grid md:grid-cols-2 gap-4">
          <Field label="Message group ID" hint="Messages in the same group are delivered in order, one batch at a time."><Input value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
          <Field label="Message deduplication ID" hint="Duplicates with the same ID within 5 minutes are dropped."><Input value={dedup} onChange={(e) => setDedup(e.target.value)} /></Field>
        </div>}
        {note && <Alert kind="success">{note}</Alert>}
      </Panel>
      <Panel title="Receive messages" actions={<>
        <Button onClick={() => { upd((x) => { for (const m of x.messages) if (m.receiveCount > 0) m.visibleAt = Date.now(); }); setNote('Visibility timeout expired: in-flight messages are visible again.'); }}>Simulate visibility timeout expiring</Button>
        <Button primary onClick={poll}>Poll for messages</Button>
      </>}>
        <KV cols={4} items={[['Messages available', n.available], ['Messages in flight', n.inFlight], ['Visibility timeout', `${q.visibilityTimeoutSec} s`], ['Maximum receives', q.dlqId ? `${q.maxReceiveCount} → ${dlq?.name}` : 'No DLQ']]} />
        <div className="mt-3">
          <Table rows={shown} empty="Poll to receive messages." columns={[
            { header: 'ID', cell: (m) => <button className="link font-mono text-[12px]" onClick={() => setView(m)}>{m.id.slice(0, 18)}…</button> },
            { header: 'Sent', cell: (m) => fmtDate(m.sentAt) },
            { header: 'Size', cell: (m) => `${new Blob([m.body]).size} bytes` },
            { header: 'Receive count', cell: (m) => m.receiveCount },
            { header: 'Visibility', cell: (m) => (m.visibleAt > now ? `invisible for ${Math.ceil((m.visibleAt - now) / 1000)} s` : 'visible again') },
            { header: '', cell: (m) => <button className="link" onClick={() => { upd((x) => { x.messages = x.messages.filter((y) => y.id !== m.id); }); log('sqs', `DeleteMessage ${q.name}`); setPolled((p) => p.filter((x) => x !== m.id)); }}>Delete</button> },
          ]} />
        </div>
        <Teach>Receiving does <b>not</b> delete a message: your consumer must call DeleteMessage after processing. If it doesn't within the visibility timeout, the message reappears with a higher receive count{q.dlqId ? `, and after ${q.maxReceiveCount} receives it moves to the DLQ` : ''}.</Teach>
      </Panel>
      {view && <Modal title="Message details" onClose={() => setView(null)}>
        <KV cols={2} items={[['Message ID', view.id], ['Receive count', view.receiveCount]]} />
        <pre className="mt-3 text-[12px] bg-[#f4f4f4] p-2 rounded overflow-x-auto whitespace-pre-wrap">{view.body}</pre>
      </Modal>}
    </Page>
  );
}
