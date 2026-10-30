// SQS helpers shared by the SQS, SNS and Lambda consoles. Functions taking a CloudState mutate a draft.
import type { CloudState, Queue, SqsMessage } from '../../../cloud/types';

export const sqsArn = (c: CloudState, q: Pick<Queue, 'region' | 'name'>) => `arn:aws:sqs:${q.region}:${c.accountId}:${q.name}`;
export const queueUrl = (c: CloudState, q: Pick<Queue, 'region' | 'name'>) => `https://sqs.${q.region}.amazonaws.com/${c.accountId}/${q.name}`;
export const findQueue = (c: CloudState, ref: string) => c.queues.find((q) => q.id === ref || q.name === ref || sqsArn(c, q) === ref);

export function sendMessage(q: Queue, body: string) {
  const now = Date.now();
  q.messages.push({ id: crypto.randomUUID(), body, receiveCount: 0, visibleAt: now + q.delaySec * 1000, sentAt: now });
}

/** ReceiveMessage: up to `max` visible messages become in-flight; ones past maxReceiveCount go to the DLQ instead. */
export function receiveMessages(c: CloudState, queueId: string, max = 10): { received: SqsMessage[]; movedToDlq: number } {
  const q = c.queues.find((x) => x.id === queueId);
  if (!q) return { received: [], movedToDlq: 0 };
  const now = Date.now();
  q.messages = q.messages.filter((m) => m.sentAt + q.retentionDays * 86400000 > now); // retention expiry
  const dlq = q.dlqId ? c.queues.find((x) => x.id === q.dlqId) : undefined;
  const received: SqsMessage[] = [];
  let movedToDlq = 0;
  for (const m of q.messages.filter((m) => m.visibleAt <= now)) {
    if (received.length >= max) break;
    m.receiveCount++;
    if (dlq && m.receiveCount > q.maxReceiveCount) {
      q.messages = q.messages.filter((x) => x.id !== m.id);
      dlq.messages.push({ ...m, receiveCount: 0, visibleAt: now });
      movedToDlq++;
      continue;
    }
    m.visibleAt = now + q.visibilityTimeoutSec * 1000;
    received.push({ ...m });
  }
  return { received, movedToDlq };
}

export const counts = (q: Queue, now = Date.now()) => ({
  available: q.messages.filter((m) => m.visibleAt <= now).length,
  inFlight: q.messages.filter((m) => m.visibleAt > now && m.receiveCount > 0).length,
  delayed: q.messages.filter((m) => m.visibleAt > now && m.receiveCount === 0).length,
});
