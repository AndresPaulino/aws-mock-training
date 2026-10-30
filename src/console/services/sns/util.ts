// SNS publish simulation: fans a message out to subscribed SQS queues and Lambda functions, honouring filter policies.
import type { CloudState, Topic } from '../../../cloud/types';
import { findQueue, sendMessage } from '../sqs/util';
import { invokeLambda } from '../lambda/invoke';

export const topicArn = (c: CloudState, t: Pick<Topic, 'region' | 'name'>) => `arn:aws:sns:${t.region}:${c.accountId}:${t.name}`;

/** Subset of SNS filter-policy syntax: exact values, {"prefix"}, {"anything-but"}, {"exists"}. Every key must match. */
export function matchesFilter(policy: string | undefined, attrs: Record<string, string>): boolean {
  if (!policy?.trim()) return true;
  let p: Record<string, unknown>;
  try { p = JSON.parse(policy); } catch { return false; }
  return Object.entries(p).every(([k, rule]) => {
    const v = attrs[k];
    return ([] as unknown[]).concat(rule).some((a) => {
      if (a && typeof a === 'object') {
        const o = a as Record<string, unknown>;
        if ('exists' in o) return o.exists ? v !== undefined : v === undefined;
        if (v === undefined) return false;
        if ('prefix' in o) return v.startsWith(String(o.prefix));
        if ('anything-but' in o) return !([] as unknown[]).concat(o['anything-but']).map(String).includes(v);
        return false;
      }
      return v !== undefined && String(a) === v;
    });
  });
}

export function publish(c: CloudState, topicId: string, subject: string, message: string, attrs: Record<string, string>) {
  const t = c.topics.find((x) => x.id === topicId);
  const delivered: string[] = [], filtered: string[] = [], failed: string[] = [];
  if (!t) return { delivered, filtered, failed };
  t.published++;
  const arn = topicArn(c, t);
  const messageId = crypto.randomUUID();
  const MessageAttributes = Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, { Type: 'String', Value: v }]));
  for (const s of t.subscriptions) {
    const label = `${s.protocol}: ${s.endpoint}`;
    if (!matchesFilter(s.filter, attrs)) { filtered.push(label); continue; }
    if (s.protocol === 'sqs') {
      const q = findQueue(c, s.endpoint);
      if (!q) { failed.push(label); continue; }
      sendMessage(q, JSON.stringify({ Type: 'Notification', MessageId: messageId, TopicArn: arn, Subject: subject || undefined, Message: message, Timestamp: new Date().toISOString(), MessageAttributes }, null, 2));
    } else if (s.protocol === 'lambda') {
      const r = invokeLambda(c, s.endpoint, { Records: [{ EventSource: 'aws:sns', Sns: { MessageId: messageId, TopicArn: arn, Subject: subject, Message: message, MessageAttributes } }] }, `SNS ${t.name}`);
      if (!r) { failed.push(label); continue; }
    }
    delivered.push(label);
  }
  return { delivered, filtered, failed };
}
