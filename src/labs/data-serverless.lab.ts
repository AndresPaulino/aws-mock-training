import type { Lab } from './index';
import type { CloudState, DbInstance, Queue } from '../cloud/types';
import { isPublicSubnet } from '../console/services/rds/util';

const here = <T extends { region: string }>(c: CloudState, xs: T[]) => xs.filter((x) => x.region === c.region);
const privateAzs = (c: CloudState, ids: string[]) => new Set(c.subnets.filter((s) => ids.includes(s.id) && !isPublicSubnet(c, s.id)).map((s) => s.az));
const goodDb = (c: CloudState) => c.dbInstances.filter((d: DbInstance) => (d.engine === 'postgres' || d.engine === 'aurora-postgresql') && d.multiAz && !d.readReplicaOf
  && !d.publiclyAccessible && d.encrypted && d.subnetIds.length > 0 && d.subnetIds.every((id) => !isPublicSubnet(c, id)));
const arnOf = (c: CloudState, kind: 'sqs' | 'sns' | 'lambda', x: { region: string; name: string }) => `arn:aws:${kind}:${x.region}:${c.accountId}:${kind === 'lambda' ? 'function:' : ''}${x.name}`;
const mainQueues = (c: CloudState) => c.queues.filter((q: Queue) => q.dlqId && c.queues.some((d) => d.id === q.dlqId) && q.maxReceiveCount === 3 && q.visibilityTimeoutSec >= 60);

const labs: Lab[] = [
  {
    id: 'lab-rds',
    title: 'Highly available PostgreSQL: Multi-AZ, failover and a read replica',
    lessonId: 'm2-rds-ha',
    minutes: 20,
    start: '/console/rds',
    intro: 'Build the database tier the exam loves: **Multi-AZ** for availability, in **private subnets**, encrypted, then prove the failover works and add a **read replica** for read scaling.',
    steps: [
      {
        title: 'Have private subnets in two AZs',
        detail: 'The database must live in subnets **without** a route to an internet gateway. In the **VPC** console, make sure a VPC has at least two private subnets in different AZs (the VPC lab builds these).',
        hint: 'Default-VPC subnets are public (main route table → igw). Create subnets in your own VPC and associate them with a route table that has no 0.0.0.0/0 → igw route.',
        check: (c) => here(c, c.vpcs).some((v) => privateAzs(c, c.subnets.filter((s) => s.vpcId === v.id).map((s) => s.id)).size >= 2),
      },
      {
        title: 'Create a Multi-AZ PostgreSQL DB in private subnets',
        detail: 'RDS → **Create database** → Standard create, engine **PostgreSQL**, template **Production**, availability **Multi-AZ DB instance**. Under Connectivity pick your VPC and **only the private subnets**, Public access **No**, and leave **encryption** on.',
        hint: 'Untick any subnet labelled "public (route to IGW)". Public access must be No and "Enable encryption" ticked (aws/rds is fine).',
        check: (c) => goodDb(c).length > 0,
      },
      {
        title: 'Wait until it is Available',
        detail: 'Open the database. Status goes **Creating → Available** after a few seconds.',
        hint: 'The simulation moves new databases to available after ~6 seconds. Stay on the console.',
        check: (c) => goodDb(c).some((d) => d.status === 'available' || d.events.some((e) => e.msg === 'DB instance created')),
      },
      {
        title: 'Reboot with failover',
        detail: 'On the database page choose **Reboot**, tick **Reboot With Failover?** and confirm. Watch **Logs & events**: the standby is promoted and the AZ changes, but the endpoint stays the same.',
        hint: 'The checkbox only appears for Multi-AZ databases.',
        check: (c) => goodDb(c).some((d) => d.events.some((e) => e.msg.toLowerCase().includes('failover'))),
      },
      {
        title: 'Create a read replica',
        detail: 'Choose **Create read replica** on the same database (any Region). The replica has its own endpoint for read traffic.',
        hint: 'The button needs automated backups (retention > 0) on the source, which is on by default.',
        check: (c) => goodDb(c).some((d) => c.dbInstances.some((r) => r.readReplicaOf === d.id)),
      },
    ],
    debrief: 'You saw the core distinction: **Multi-AZ** = synchronous standby, automatic failover, same endpoint, **not readable** (HA/DR inside a Region). **Read replicas** = asynchronous, own endpoint, readable, promotable, possibly cross-Region (read scaling and Regional DR). Exam phrasing: "minimise downtime if an AZ fails" → Multi-AZ; "reporting queries slow the primary" → read replica; "database must not be reachable from the internet" → private subnets + Public access No + SG from the app tier.',
  },
  {
    id: 'lab-sqs-lambda',
    title: 'Decouple with SQS: DLQ, redrive policy and a Lambda consumer',
    lessonId: 'm2-sqs',
    minutes: 15,
    start: '/console/sqs',
    intro: 'Wire a queue to a Lambda consumer the way production systems do: a **dead-letter queue** for poison messages and a **visibility timeout** long enough for processing.',
    steps: [
      {
        title: 'Create the dead-letter queue',
        detail: 'SQS → **Create queue** → Standard, name it e.g. `orders-dlq`. Defaults are fine (consider raising retention to 14 days).',
        hint: 'Any queue works as a DLQ as long as it has the same type (standard/FIFO) as the source.',
        check: (c) => here(c, c.queues).length > 0,
      },
      {
        title: 'Create the main queue with a redrive policy',
        detail: 'Create a second queue (e.g. `orders`) with **Visibility timeout ≥ 60** seconds and, under **Dead-letter queue**, Enabled → choose your DLQ, **Maximum receives 3**.',
        hint: 'Visibility timeout is in the Configuration panel. Maximum receives must be exactly 3.',
        check: (c) => mainQueues(c).length > 0,
      },
      {
        title: 'Create a Lambda function',
        detail: 'Lambda → **Create function** → Author from scratch, any name and runtime, "Create a new role with basic Lambda permissions".',
        hint: 'Keep the default timeout (3 s): it must be ≤ the queue visibility timeout.',
        check: (c) => here(c, c.lambdas).length > 0,
      },
      {
        title: 'Add an SQS trigger on the main queue',
        detail: 'On the function page choose **+ Add trigger** → **SQS** → your main queue. If the role lacks SQS permissions, attach **AWSLambdaSQSQueueExecutionRole** with the button shown.',
        hint: 'The basic role can only write logs; Lambda needs sqs:ReceiveMessage/DeleteMessage to poll.',
        check: (c) => c.lambdas.some((f) => f.triggers.some((t) => t.type === 'sqs' && mainQueues(c).some((q) => t.source === arnOf(c, 'sqs', q) || t.source === q.id))),
      },
    ],
    debrief: 'Exam rules you just applied: visibility timeout must exceed processing time (≥ 6× the Lambda timeout for event source mappings), or messages are processed twice. A **DLQ with maxReceiveCount** isolates poison messages. Lambda polls SQS for you and needs the SQS execution permissions. Questions that say "decouple", "buffer spikes", or "don\'t lose orders if the backend is down" are SQS.',
  },
  {
    id: 'lab-sns-fanout',
    title: 'SNS fan-out with a filter policy',
    lessonId: 'm2-sns-eventbridge',
    minutes: 12,
    start: '/console/sns',
    intro: 'Publish once, deliver to many queues. One subscriber gets everything; the other only gets messages whose attributes match its **filter policy**.',
    steps: [
      {
        title: 'Create two SQS queues',
        detail: 'SQS → **Create queue** twice (Standard), e.g. `analytics` and `shipping`.',
        hint: 'Standard SNS topics can only deliver to standard queues.',
        check: (c) => here(c, c.queues).filter((q) => !q.fifo).length >= 2,
      },
      {
        title: 'Create a topic',
        detail: 'SNS → **Create topic** → Standard, e.g. `orders`.',
        hint: 'Topics page → Create topic.',
        check: (c) => here(c, c.topics).length > 0,
      },
      {
        title: 'Subscribe both queues, one with a filter policy',
        detail: 'On the topic choose **Create subscription** → Amazon SQS for each queue. On one of them add a filter policy like `{"eventType": ["order_shipped"]}`.',
        hint: 'The filter policy box is at the bottom of the Create subscription dialog. It must be a JSON object whose values are arrays.',
        check: (c) => c.topics.some((t) => { const s = t.subscriptions.filter((x) => x.protocol === 'sqs'); return s.length >= 2 && s.some((x) => x.filter); }),
      },
      {
        title: 'Publish a message that lands in a queue',
        detail: 'Choose **Publish message**, write a body and (optionally) add the attribute `eventType` = `order_shipped`. Then open a queue → **Send and receive messages** → **Poll** to see the notification.',
        hint: 'Without the matching attribute only the unfiltered queue receives it; with it, both do.',
        check: (c) => c.topics.some((t) => t.published > 0) && c.queues.some((q) => q.messages.some((m) => m.body.includes('arn:aws:sns:'))),
      },
    ],
    debrief: 'This is the **fan-out** pattern: SNS pushes a copy to every subscribed SQS queue, and each queue buffers for its own independent consumer. Filter policies route by message attributes so subscribers only pay for what they need. Exam cue: "one event, several independent processors" → SNS + SQS fan-out (or EventBridge rules for content-based routing across many targets).',
  },
  {
    id: 'lab-serverless-api',
    title: 'Serverless API: API Gateway → Lambda → DynamoDB',
    lessonId: 'm3b-api-gateway',
    minutes: 15,
    start: '/console/dynamodb',
    intro: 'Assemble the classic serverless stack: a DynamoDB **on-demand** table, a Lambda function, and an **HTTP API** route integrated with it. Then send a request through the API.',
    steps: [
      {
        title: 'Create an on-demand DynamoDB table',
        detail: 'DynamoDB → **Create table**, any name and partition key (e.g. `pk`). Default settings use **on-demand** capacity.',
        hint: 'If you choose Customize settings, make sure Capacity mode is On-demand.',
        check: (c) => here(c, c.dynamoTables).some((t) => t.mode === 'on-demand'),
      },
      {
        title: 'Create a Lambda function',
        detail: 'Lambda → **Create function** (any runtime). This would hold your API logic, reading and writing the table.',
        hint: 'Author from scratch with the basic execution role is fine.',
        check: (c) => here(c, c.lambdas).length > 0,
      },
      {
        title: 'Create an HTTP API with a route to the Lambda',
        detail: 'API Gateway → **Create API** → **HTTP API**. Pick your function as the integration (or add a route such as `GET /items` on the Routes tab and choose the function).',
        hint: 'Every route shows its Lambda integration in the Routes tab.',
        check: (c) => c.apis.some((a) => a.kind === 'HTTP' && a.routes.some((r) => c.lambdas.some((f) => r.lambda === arnOf(c, 'lambda', f)))),
      },
      {
        title: 'Invoke it through the API',
        detail: 'On the API open the **Test** tab, choose the route and **Send request**. You should get **200** and the Lambda response.',
        hint: 'A 502 means the function failed: remove any `throw` from its code and Deploy. A 500 means the route has no integration.',
        check: (c) => c.apis.some((a) => a.kind === 'HTTP' && a.routes.some((r) => c.lambdas.some((f) => r.lambda === arnOf(c, 'lambda', f) && f.invocations.some((i) => i.ok && i.msg.startsWith(`API Gateway ${a.name}`))))),
      },
    ],
    debrief: 'API Gateway + Lambda + DynamoDB is the default answer for "serverless, scales to zero, minimal operations". **HTTP APIs** are cheaper and faster; pick **REST APIs** when the question needs usage plans/API keys, caching, request validation or private endpoints. Remember the 29-second integration timeout, and on-demand DynamoDB for unpredictable traffic.',
  },
];

export default labs;
