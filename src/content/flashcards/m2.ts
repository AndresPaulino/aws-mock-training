import type { Flashcard } from '../types';

export default [
  // m2-ha-scaling
  { id: "fc-m2-ha-scaling-1", lessonId: "m2-ha-scaling", front: "High availability vs fault tolerance?", back: "HA: keeps working after a brief interruption (RDS Multi-AZ failover ~60-120 s). Fault tolerance: users notice nothing because redundant capacity is already serving. FT costs more." },
  { id: "fc-m2-ha-scaling-2", lessonId: "m2-ha-scaling", front: "Vertical vs horizontal scaling: the downsides?", back: "Vertical (bigger box): hard ceiling, resize downtime, still a single point of failure. Horizontal (more boxes): near-limitless and HA, but only if the app is stateless." },
  { id: "fc-m2-ha-scaling-3", lessonId: "m2-ha-scaling", front: "Scenario: users lose their session when an instance is replaced → fix?", back: "Externalize session state to ElastiCache or DynamoDB. Sticky sessions are a crutch: they skew load and break when the target dies." },
  { id: "fc-m2-ha-scaling-4", lessonId: "m2-ha-scaling", front: "Scenario: uploaded files are missing on some servers behind the ALB → fix?", back: "Store uploads in S3 (or EFS if the app truly needs a shared POSIX filesystem). Never keep user files on one instance." },
  { id: "fc-m2-ha-scaling-5", lessonId: "m2-ha-scaling", front: "Need 6 instances and must survive an AZ loss with NO capacity drop → ?", back: "Over-provision across AZs: 3 per AZ in 3 AZs (9 total) or 6+6 in two AZs. Any single-AZ loss still leaves 6. Fault tolerance = pre-paid redundancy." },
  { id: "fc-m2-ha-scaling-6", lessonId: "m2-ha-scaling", front: "Why does horizontal scaling require a stateless app?", back: "Any instance must be able to serve any request. State on one box breaks when the load balancer routes elsewhere or that box is replaced." },

  // m2-rpo-rto-coupling
  { id: "fc-m2-rpo-rto-coupling-1", lessonId: "m2-rpo-rto-coupling", front: "RPO vs RTO?", back: "RPO = how much DATA you can lose, measured back from the disaster. RTO = how long you can be DOWN. Hook: Point = data, Time = downtime." },
  { id: "fc-m2-rpo-rto-coupling-2", lessonId: "m2-rpo-rto-coupling", front: "What does 'RPO 1 hour' require?", back: "Backups or replication at least every hour. RPO sets how often you copy data; RTO sets how fast you must restore service." },
  { id: "fc-m2-rpo-rto-coupling-3", lessonId: "m2-rpo-rto-coupling", front: "Tight vs loose coupling?", back: "Tight: direct synchronous calls, so a slow or dead downstream takes the upstream with it. Loose: a buffer (queue, topic, event bus) lets each side scale and fail on its own." },
  { id: "fc-m2-rpo-rto-coupling-4", lessonId: "m2-rpo-rto-coupling", front: "Scenario: flash-sale spikes overwhelm the DB and orders are lost; users need instant confirmation → ?", back: "SQS between the web tier and workers: confirm once queued, workers write at a sustainable rate and scale on queue depth. Queue = shock absorber." },
  { id: "fc-m2-rpo-rto-coupling-5", lessonId: "m2-rpo-rto-coupling", front: "Why does a worker crash lose nothing with SQS?", back: "The message is only hidden for the visibility timeout. If the worker never deletes it, it reappears for another consumer." },
  { id: "fc-m2-rpo-rto-coupling-6", lessonId: "m2-rpo-rto-coupling", front: "What does at-least-once delivery force you to build?", back: "Idempotent consumers: processing the same message twice must be safe (e.g. dedupe on order ID before charging)." },

  // m2-elb
  { id: "fc-m2-elb-1", lessonId: "m2-elb", front: "ALB vs NLB vs GWLB: which OSI layer?", back: "ALB = layer 7 (HTTP/HTTPS/gRPC). NLB = layer 4 (TCP/UDP/TLS). GWLB = layer 3 (GENEVE) for inline appliances." },
  { id: "fc-m2-elb-2", lessonId: "m2-elb", front: "Scenario: route /api to one fleet and /video to another → ?", back: "ALB listener rules: route by path, host header, HTTP headers or query strings. Also redirects, fixed responses and Cognito/OIDC login." },
  { id: "fc-m2-elb-3", lessonId: "m2-elb", front: "Scenario: client firewalls must allowlist fixed load balancer IPs → ?", back: "NLB (one static IP or your Elastic IP per AZ), or Global Accelerator in front of an ALB. ALB IPs change over time." },
  { id: "fc-m2-elb-4", lessonId: "m2-elb", front: "How does an app behind an ALB see the client's IP?", back: "From the X-Forwarded-For header, because the ALB terminates the connection. An NLB with instance targets preserves the source IP natively." },
  { id: "fc-m2-elb-5", lessonId: "m2-elb", front: "Cross-zone load balancing defaults: ALB vs NLB?", back: "ALB: on by default, no inter-AZ charge. NLB/GWLB: off by default; turning it on adds inter-AZ data charges. Enable it when AZs have unequal target counts." },
  { id: "fc-m2-elb-6", lessonId: "m2-elb", front: "Scenario: insert third-party firewalls/IDS transparently into all traffic → ?", back: "Gateway Load Balancer (with GWLB endpoints). Hook: 'Gateway' = appliances placed in the gateway path." },

  // m2-auto-scaling
  { id: "fc-m2-auto-scaling-1", lessonId: "m2-auto-scaling", front: "Default best scaling policy for 'keep CPU around 50%'?", back: "Target tracking: you set the target, AWS creates and manages the CloudWatch alarms in both directions." },
  { id: "fc-m2-auto-scaling-2", lessonId: "m2-auto-scaling", front: "Scheduled vs predictive scaling?", back: "Scheduled: you set times ('traffic spikes every weekday at 9 AM'). Predictive: ML forecasts recurring patterns and adds capacity BEFORE the spike." },
  { id: "fc-m2-auto-scaling-3", lessonId: "m2-auto-scaling", front: "Scenario: the app hangs but the ASG never replaces the instance → fix?", back: "Enable ELB health checks on the ASG. Default EC2 status checks watch the VM; ELB health checks watch the APP." },
  { id: "fc-m2-auto-scaling-4", lessonId: "m2-auto-scaling", front: "Which metric should scale an SQS worker fleet?", back: "Backlog per instance (visible messages ÷ running instances) as a custom target-tracking metric. CPU says nothing about how much work is queued." },
  { id: "fc-m2-auto-scaling-5", lessonId: "m2-auto-scaling", front: "Scenario: new instances take too long to become healthy after scale-out → ?", back: "Golden AMI with dependencies baked in instead of installing via user data. Warm pools of pre-initialized instances also help slow-booting apps." },
  { id: "fc-m2-auto-scaling-6", lessonId: "m2-auto-scaling", front: "Scenario: instances running long jobs must not be terminated by scale-in → ?", back: "Scale-in protection on busy instances plus lifecycle hooks that pause termination so work can finish or drain." },

  // m2-sqs
  { id: "fc-m2-sqs-1", lessonId: "m2-sqs", front: "SQS visibility timeout: default and range?", back: "Default 30 s, range 0 s to 12 h. Set it longer than your processing time or messages will be processed twice." },
  { id: "fc-m2-sqs-2", lessonId: "m2-sqs", front: "SQS Standard vs FIFO?", back: "Standard: nearly unlimited throughput, at-least-once, best-effort order. FIFO (name ends .fifo): strict order per MessageGroupId, exactly-once processing, 300 msg/s (3,000 batched; more in high-throughput mode)." },
  { id: "fc-m2-sqs-3", lessonId: "m2-sqs", front: "SQS message retention: default and max?", back: "Default 4 days; configurable from 1 minute to 14 days." },
  { id: "fc-m2-sqs-4", lessonId: "m2-sqs", front: "Max SQS message size, and what to do with bigger payloads?", back: "1 MiB since 2025 (256 KB in older material). For larger payloads, store the data in S3 and enqueue a pointer." },
  { id: "fc-m2-sqs-5", lessonId: "m2-sqs", front: "Scenario: lots of empty receives are driving up SQS cost → ?", back: "Enable long polling (WaitTimeSeconds up to 20). The call waits for messages: fewer API calls, lower cost, lower latency." },
  { id: "fc-m2-sqs-6", lessonId: "m2-sqs", front: "Scenario: one poison message keeps failing and clogging the queue → ?", back: "Dead-letter queue: after maxReceiveCount failed receives the message moves aside for inspection, and can be redriven later." },

  // m2-sns-eventbridge
  { id: "fc-m2-sns-eventbridge-1", lessonId: "m2-sns-eventbridge", front: "SNS vs SQS: push or poll?", back: "SNS PUSHES copies to every subscriber immediately and stores nothing. SQS stores messages until a consumer POLLS and deletes them." },
  { id: "fc-m2-sns-eventbridge-2", lessonId: "m2-sns-eventbridge", front: "Scenario: one OrderPlaced event, three independent durable consumers → ?", back: "SNS → SQS fan-out: one topic with three subscribed queues, each processed at its own pace. Adding a consumer = adding a subscription." },
  { id: "fc-m2-sns-eventbridge-3", lessonId: "m2-sns-eventbridge", front: "Scenario: one subscriber should get only orders over $100 → ?", back: "An SNS subscription filter policy matching on message attributes (or body)." },
  { id: "fc-m2-sns-eventbridge-4", lessonId: "m2-sns-eventbridge", front: "SNS vs EventBridge?", back: "SNS = high-fan-out push to subscribers. EventBridge = content-based routing of events from AWS services, SaaS and your apps to 20+ target types, plus archive/replay and schema registry." },
  { id: "fc-m2-sns-eventbridge-5", lessonId: "m2-sns-eventbridge", front: "Scenario: 'when an EC2 instance terminates, run a Lambda' → ?", back: "EventBridge rule matching the EC2 state-change event, with Lambda as target. Default answer for 'when X happens in service A, trigger B'." },
  { id: "fc-m2-sns-eventbridge-6", lessonId: "m2-sns-eventbridge", front: "Scenario: run a job every night at 2 AM with no servers → ?", back: "EventBridge Scheduler (or a scheduled rule with a cron expression) invoking Lambda, an ECS task or Step Functions." },

  // m2-step-functions
  { id: "fc-m2-step-functions-1", lessonId: "m2-step-functions", front: "Scenario: coordinate several Lambdas with retries, branches and human approval → ?", back: "Step Functions: serverless state machine with sequence, parallel, choice and wait states, and per-step retry/catch. Not Lambda calling Lambda." },
  { id: "fc-m2-step-functions-2", lessonId: "m2-step-functions", front: "Step Functions Standard vs Express workflows?", back: "Standard: runs up to 1 year, exactly-once, full execution history. Express: up to 5 minutes, high-volume event processing, at-least-once, cheaper." },
  { id: "fc-m2-step-functions-3", lessonId: "m2-step-functions", front: "When is Amazon MQ the right answer?", back: "Only when migrating an app that already speaks AMQP, MQTT, JMS or STOMP (ActiveMQ/RabbitMQ) and can't be rewritten. New cloud-native designs use SQS/SNS." },
  { id: "fc-m2-step-functions-4", lessonId: "m2-step-functions", front: "Why not orchestrate with Lambda calling Lambda?", back: "Tight coupling, you pay while functions wait, and error handling is all manual. Step Functions gives retries, state and a visual history." },
  { id: "fc-m2-step-functions-5", lessonId: "m2-step-functions", front: "Pick the service: smooth spikes / one event many consumers / react to AWS events / multi-step with retries?", back: "SQS / SNS→SQS fan-out / EventBridge / Step Functions. Legacy broker protocols → Amazon MQ." },
  { id: "fc-m2-step-functions-6", lessonId: "m2-step-functions", front: "What is AWS AppSync?", back: "Managed GraphQL API service (plus real-time subscriptions) with resolvers to DynamoDB, Lambda and HTTP. Trigger words: 'GraphQL', real-time mobile data sync." },

  // m2-route53
  { id: "fc-m2-route53-1", lessonId: "m2-route53", front: "CNAME vs Alias at the zone apex (example.com)?", back: "CNAME is not allowed at the apex. Alias works at the apex, points to AWS resources (ALB, CloudFront, S3 website, API Gateway), has free queries, and tracks IP changes." },
  { id: "fc-m2-route53-2", lessonId: "m2-route53", front: "Scenario: send 5% of traffic to a new version → ?", back: "Weighted routing (e.g. weights 95/5). Also the tool for blue/green and gradual migrations." },
  { id: "fc-m2-route53-3", lessonId: "m2-route53", front: "Scenario: automatic active-passive failover to a static 'sorry' page → ?", back: "Failover routing: primary record with a health check on the ALB; secondary record aliased to an S3/CloudFront static site." },
  { id: "fc-m2-route53-4", lessonId: "m2-route53", front: "Latency vs geolocation routing?", back: "Latency: answer with the Region fastest for this user (performance). Geolocation: by user's country/continent (compliance, localization), with a default record. 'EU users stay in EU' = geolocation." },
  { id: "fc-m2-route53-5", lessonId: "m2-route53", front: "How do you health-check a private resource in Route 53?", back: "Point the health check at a CloudWatch alarm. Route 53 checkers live on the internet and can't reach private IPs." },
  { id: "fc-m2-route53-6", lessonId: "m2-route53", front: "Why isn't DNS failover instant?", back: "Clients cache answers for the record's TTL. Lower TTLs fail over faster but cost more queries; Global Accelerator fails over without DNS changes." },

  // m2-rds-ha
  { id: "fc-m2-rds-ha-1", lessonId: "m2-rds-ha", front: "RDS Multi-AZ vs read replica: replication type?", back: "Multi-AZ: SYNCHRONOUS, a commit lands on the standby first, so zero data loss. Read replica: ASYNCHRONOUS, lags seconds behind (eventual consistency)." },
  { id: "fc-m2-rds-ha-2", lessonId: "m2-rds-ha", front: "Can you read from a Multi-AZ standby?", back: "Classic Multi-AZ instance: no, failover only. Multi-AZ DB cluster: yes, 1 writer + 2 readable standbys." },
  { id: "fc-m2-rds-ha-3", lessonId: "m2-rds-ha", front: "RDS Multi-AZ failover: how long, and does the endpoint change?", back: "Automatic, about 60-120 s, and the DNS endpoint stays the same, so no app change. Multi-AZ DB clusters typically fail over in under 35 s." },
  { id: "fc-m2-rds-ha-4", lessonId: "m2-rds-ha", front: "Scenario: reporting queries slow down production RDS → ?", back: "Create a read replica and point reporting at its endpoint. Multi-AZ = availability; replicas = read scaling." },
  { id: "fc-m2-rds-ha-5", lessonId: "m2-rds-ha", front: "RDS read replicas: how many, and where can they live?", back: "Up to 15 for MySQL, MariaDB and PostgreSQL. Same AZ, another AZ, or another Region. Promotion to standalone is manual (a DR move)." },
  { id: "fc-m2-rds-ha-6", lessonId: "m2-rds-ha", front: "Can Multi-AZ and read replicas be combined?", back: "Yes, and production usually does: a Multi-AZ primary for availability plus replicas (which can be Multi-AZ themselves) for read scaling and DR." },

  // m2-aurora
  { id: "fc-m2-aurora-1", lessonId: "m2-aurora", front: "How does Aurora store data?", back: "6 copies across 3 AZs on a shared storage layer; writes need 4 of 6, reads 3 of 6. Survives losing an AZ plus one more copy. Storage auto-grows (128 TiB exam figure)." },
  { id: "fc-m2-aurora-2", lessonId: "m2-aurora", front: "Aurora replicas: how many, how much lag, failover time?", back: "Up to 15 replicas with ~10 ms lag (they read the same shared storage). Failover promotes a replica, typically in under 30 s." },
  { id: "fc-m2-aurora-3", lessonId: "m2-aurora", front: "Aurora writer endpoint vs reader endpoint?", back: "Writer (cluster) endpoint always points at the current primary. Reader endpoint load-balances connections across replicas. Custom endpoints target subsets." },
  { id: "fc-m2-aurora-4", lessonId: "m2-aurora", front: "Scenario: cross-Region MySQL with RPO ~1 s and RTO under 1 minute → ?", back: "Aurora Global Database: storage-level replication to secondary Regions (5 in exam material) at ~1 s lag, promotion in under a minute. Those numbers ARE the spec." },
  { id: "fc-m2-aurora-5", lessonId: "m2-aurora", front: "What is Aurora Serverless v2 for?", back: "Variable, spiky or dev/test workloads: capacity scales in 0.5 ACU steps with load, and can auto-pause to 0 ACU when idle (since late 2024)." },
  { id: "fc-m2-aurora-6", lessonId: "m2-aurora", front: "Aurora cloning vs Backtrack?", back: "Cloning: instant copy-on-write copy of a cluster for testing. Backtrack: rewind an Aurora MySQL cluster in place to an earlier time, no restore needed." },

  // m2-dynamo-cache-ha
  { id: "fc-m2-dynamo-cache-ha-1", lessonId: "m2-dynamo-cache-ha", front: "DynamoDB multi-AZ: do you configure it?", back: "No. Every table is automatically replicated across 3 AZs in the Region, at no extra charge." },
  { id: "fc-m2-dynamo-cache-ha-2", lessonId: "m2-dynamo-cache-ha", front: "Scenario: DynamoDB reads AND writes in multiple Regions, active-active → ?", back: "Global Tables. Default conflict rule is last writer wins; a multi-Region strong consistency mode became available in 2025." },
  { id: "fc-m2-dynamo-cache-ha-3", lessonId: "m2-dynamo-cache-ha", front: "DynamoDB point-in-time recovery window?", back: "Restore to any second in the last 35 days (period configurable 1-35 days). A restore creates a new table." },
  { id: "fc-m2-dynamo-cache-ha-4", lessonId: "m2-dynamo-cache-ha", front: "ElastiCache Redis vs Memcached: which survives node failure?", back: "Redis (and Valkey): replicas, Multi-AZ automatic failover, snapshots. Memcached: no replication, no persistence, a cache you can afford to lose." },
  { id: "fc-m2-dynamo-cache-ha-5", lessonId: "m2-dynamo-cache-ha", front: "Scenario: Lambda bursts exhaust RDS connections → ?", back: "RDS Proxy: managed connection pool that multiplexes connections, supports IAM auth, and cuts failover time by up to ~66%." },
  { id: "fc-m2-dynamo-cache-ha-6", lessonId: "m2-dynamo-cache-ha", front: "Scenario: Redis-compatible store must be the durable PRIMARY database → ?", back: "Amazon MemoryDB: microsecond reads plus a Multi-AZ transaction log, so data survives node loss. ElastiCache is a cache, not a system of record." },

  // m2-backups
  { id: "fc-m2-backups-1", lessonId: "m2-backups", front: "EBS snapshots: full or incremental, and where are they stored?", back: "Incremental, block-level, stored in S3 (managed by AWS). Copy them across Regions or accounts for DR." },
  { id: "fc-m2-backups-2", lessonId: "m2-backups", front: "RDS automated backups vs manual snapshots?", back: "Automated: daily snapshot + transaction logs every ~5 min for point-in-time restore, retention up to 35 days. Manual: kept until you delete them, survive instance deletion, shareable cross-account." },
  { id: "fc-m2-backups-3", lessonId: "m2-backups", front: "Does restoring an RDS backup reuse the same endpoint?", back: "No. Restores always create a NEW instance with a new endpoint; repoint the app or DNS." },
  { id: "fc-m2-backups-4", lessonId: "m2-backups", front: "Scenario: centralize backups for EBS, RDS, DynamoDB, EFS, FSx and S3 across accounts → ?", back: "AWS Backup: policy-based backup plans, retention, cold-storage lifecycle, cross-Region and cross-account copies." },
  { id: "fc-m2-backups-5", lessonId: "m2-backups", front: "Scenario: ransomware-proof backups nobody, not even root, can delete → ?", back: "AWS Backup Vault Lock in compliance mode (WORM). Retention can't be shortened or deleted once locked." },
  { id: "fc-m2-backups-6", lessonId: "m2-backups", front: "What is an AMI relative to snapshots?", back: "A bootable image: EBS snapshot(s) plus launch metadata. AMIs are Region-specific; golden AMIs speed recovery and scale-out." },

  // m2-dr-strategies
  { id: "fc-m2-dr-strategies-1", lessonId: "m2-dr-strategies", front: "The four DR strategies, cheapest to most expensive?", back: "Backup & Restore → Pilot Light → Warm Standby → Multi-site Active/Active. More standing capacity = faster recovery and less data lost." },
  { id: "fc-m2-dr-strategies-2", lessonId: "m2-dr-strategies", front: "Backup & Restore: what runs in DR, and RPO/RTO?", back: "Nothing runs; backups are copied cross-Region and you rebuild with IaC. RPO hours, RTO hours up to 24+. Cheapest." },
  { id: "fc-m2-dr-strategies-3", lessonId: "m2-dr-strategies", front: "Pilot Light: what's running in the DR Region?", back: "Only the data layer, always replicating (cross-Region replica, Global Table). App servers exist as AMIs/templates, switched off. RPO minutes, RTO tens of minutes to hours." },
  { id: "fc-m2-dr-strategies-4", lessonId: "m2-dr-strategies", front: "Warm Standby: what's running?", back: "A complete but scaled-down stack, ready to serve. On failover: scale up and flip DNS. RPO seconds to minutes, RTO minutes." },
  { id: "fc-m2-dr-strategies-5", lessonId: "m2-dr-strategies", front: "Scenario: RTO 10 min, RPO 1 min, lowest cost → ?", back: "Warm Standby (plus Aurora Global Database for data). Pilot Light risks missing 10 minutes because the app tier starts from nothing." },
  { id: "fc-m2-dr-strategies-6", lessonId: "m2-dr-strategies", front: "Scenario: low-RPO/RTO DR for lift-and-shift servers at low standing cost → ?", back: "AWS Elastic Disaster Recovery (DRS): continuous block-level replication into a cheap staging area; launch full recovery instances in minutes." },

  // m2-ref-orders
  { id: "fc-m2-ref-orders-1", lessonId: "m2-ref-orders", front: "Why SNS → SQS fan-out in the order-processing reference?", back: "One OrderPlaced event feeds payments, fulfillment and analytics independently. A fulfillment outage just grows its queue; no orders are lost." },
  { id: "fc-m2-ref-orders-2", lessonId: "m2-ref-orders", front: "Why is the payments queue FIFO?", back: "Exactly-once processing and per-customer ordering (MessageGroupId = customer ID), so no duplicate charges while different customers still run in parallel." },
  { id: "fc-m2-ref-orders-3", lessonId: "m2-ref-orders", front: "What metric scales the worker ASGs?", back: "Backlog per instance (queue depth ÷ instance count), so workers are sized by actual work, not CPU." },
  { id: "fc-m2-ref-orders-4", lessonId: "m2-ref-orders", front: "Why a DLQ on every queue?", back: "Poison messages move aside after maxReceiveCount instead of looping forever and blocking good work." },
  { id: "fc-m2-ref-orders-5", lessonId: "m2-ref-orders", front: "What provides Region-level DR in the reference design?", back: "Aurora Global Database (~1 s RPO) to a second Region, where a pilot-light stack waits behind a Route 53 failover record." },
  { id: "fc-m2-ref-orders-6", lessonId: "m2-ref-orders", front: "Broken version: synchronous web → worker calls drop orders at peak → fix?", back: "Insert SQS. Other classic breaks: one NAT in one AZ (add one per AZ), reports on the writer (read replica), no DLQ (poison loops)." },
] satisfies Flashcard[];
