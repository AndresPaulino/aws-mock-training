import type { Lesson } from '../types';

export default [
  // ---------------------------------------------------------------- 1
  {
    id: 'm2-ha-scaling',
    module: 'm2',
    domain: 'resilient',
    title: 'HA vs Fault Tolerance, Scaling & Statelessness',
    minutes: 18,
    summary:
      "Tell high availability from fault tolerance, choose vertical vs horizontal scaling, and fix any 'users lose their session' scenario by moving state off the instance.",
    analogy: {
      title: 'The restaurant with one chef',
      body:
        "A restaurant with one chef closes the moment that chef gets sick. Hire a backup chef who waits at home and you are **highly available**: when the main chef falls ill, the backup drives in and service resumes after a short pause. Keep three chefs cooking at the same time and you are **fault tolerant**: one walks out and diners never notice, because the other two were already cooking. You pay three salaries every day for that.\n\nNow imagine each chef keeps the order tickets in their own apron pocket. If a chef leaves, those orders are gone. Put the tickets on a shared rail in the middle of the kitchen and any chef can pick up any order. That rail is **externalized state**, and it is what lets you add or remove chefs freely.",
    },
    sections: [
      {
        heading: 'The problem: single points of failure',
        body:
          "A **single point of failure (SPOF)** is any one component whose loss takes the whole system down: one EC2 instance, one database, one NAT gateway, one Availability Zone.\n\nAWS gives you the building blocks to remove SPOFs. A **Region** (for example `us-east-1`) is a geographic area containing at least three **Availability Zones (AZs)**. Each AZ is one or more data centers with independent power, cooling and networking, a few kilometers to tens of kilometers from the others, linked by low-latency fiber. An AZ can fail as a unit (power event, flood, network cut), but two AZs failing together is rare.\n\nSo the default resilience move on the exam is: **run every tier in at least two AZs, ideally three**. A single EC2 instance, however large, is a SPOF; so is a fleet that lives entirely in one AZ.",
      },
      {
        heading: 'High availability vs fault tolerance',
        body:
          "**High availability (HA)** means the system keeps working with minimal downtime when a component fails. There may be a brief interruption while failover happens. Example: RDS Multi-AZ promotes its standby in about **60–120 seconds**; during that window writes fail.\n\n**Fault tolerance (FT)** is stricter: users notice **nothing**, because redundant capacity is already serving traffic. Example: an Auto Scaling group spread over three AZs behind an Application Load Balancer. Lose one AZ and the other two simply keep answering; the load balancer stops sending traffic to the dead AZ within seconds.\n\nThe difference is what the redundancy is doing while things are healthy. In HA the spare **waits** (standby). In FT the spare **serves** (active). FT costs more because you pay for the extra active capacity all the time. When a question distinguishes the two, it is testing whether you will pay for a standby that serves or a standby that waits.",
        table: {
          headers: ['Aspect', 'High availability', 'Fault tolerance'],
          rows: [
            ['User impact on failure', 'Short interruption (seconds to minutes)', 'None noticeable'],
            ['Spare capacity', 'Standby, idle until failover', 'Active, already serving'],
            ['Typical AWS example', 'RDS Multi-AZ (60–120 s failover)', 'ASG across 3 AZs + ALB; Aurora storage (6 copies)'],
            ['Cost', 'Lower', 'Higher (pre-paid redundancy)'],
            ['Exam wording', "'minimize downtime', 'automatic failover'", "'no interruption', 'no reduction in capacity'"],
          ],
        },
      },
      {
        heading: 'Vertical vs horizontal scaling',
        body:
          "**Vertical scaling (scale up)** means a bigger machine: move from `m7g.large` (2 vCPU, 8 GiB) to `m7g.4xlarge` (16 vCPU, 64 GiB). It is simple and needs no application change, but it has a ceiling (the largest instance type), usually requires a stop/start to resize (downtime), and the single machine is still a SPOF.\n\n**Horizontal scaling (scale out)** means more machines: go from 2 instances to 20. It is near-limitless, can happen with zero downtime, and is inherently HA because no one machine matters. The catch: it only works if **any instance can serve any request**, which means the application must be **stateless**.",
        table: {
          headers: ['', 'Vertical (scale up)', 'Horizontal (scale out)'],
          rows: [
            ['How', 'Bigger instance type', 'More instances behind a load balancer'],
            ['Ceiling', 'Largest instance size', 'Practically none'],
            ['Downtime to change', 'Usually (stop, resize, start)', 'None'],
            ['Removes SPOF?', 'No', 'Yes, if spread across AZs'],
            ['App requirement', 'None', 'Must be stateless'],
            ['Good fit', 'Legacy apps, a quick fix, many relational DB writers', 'Web and API tiers, workers, containers'],
          ],
        },
      },
      {
        heading: 'Statelessness: externalize the state',
        body:
          "**State** is any data that must survive from one request to the next: the user's login session, a shopping cart, an uploaded file, a local cache. If it lives on the instance's memory or disk, then the next request must hit that same instance, and when the instance is replaced (scale-in, failure, deployment) the data is lost.\n\nThe recurring fix pattern is to move each kind of state to a shared, durable service so instances become disposable:\n\n- Sessions and carts → **ElastiCache** (Redis OSS / Valkey, sub-millisecond) or **DynamoDB** (serverless, durable, TTL attribute to expire old sessions).\n- Uploaded files → **S3** (object storage, 11 nines of durability). Use **EFS** only when the app truly needs a shared POSIX file system that many instances mount at once.\n- Logs → **CloudWatch Logs** (via the CloudWatch agent) or a Kinesis stream, never only the local disk.\n- Configuration and secrets → Parameter Store / Secrets Manager rather than files baked onto one box.\n\nAny scenario that says 'users are logged out when an instance is replaced' or 'uploaded images are missing on some servers' is asking you to move that state off the instance.",
        table: {
          headers: ['State on the instance', 'Symptom in the question', 'Move it to'],
          rows: [
            ['Session in memory', 'Users randomly logged out after scale-in', 'ElastiCache or DynamoDB'],
            ['Files on local EBS', 'Images missing on some servers', 'S3 (or EFS for shared POSIX)'],
            ['Logs on local disk', 'Logs lost when instance terminates', 'CloudWatch Logs'],
            ['Sticky sessions on the ALB', 'Uneven load, sessions lost when target dies', 'External session store, then disable stickiness'],
          ],
        },
      },
      {
        heading: 'Sizing a fleet to survive an AZ loss',
        body:
          "Fault tolerance is arithmetic. If the app needs **6 instances** to carry peak load and must survive an AZ outage with **no reduction in capacity**, the instances that remain after losing your largest AZ must still total 6.\n\nRule of thumb: **instances per AZ = required ÷ (number of AZs − 1)**.\n\n- 2 AZs: 6 ÷ 1 = 6 per AZ → 12 total (100% overhead).\n- 3 AZs: 6 ÷ 2 = 3 per AZ → 9 total (50% overhead). Lose one AZ, 6 remain.\n- 6 in a single AZ: self-healing via ASG, but one AZ outage removes 100% of capacity at once.\n- 3 + 3 in two AZs: survives, but runs at 50% capacity until Auto Scaling launches replacements, which takes minutes and may compete with everyone else launching in the surviving AZs.\n\nThis is why three AZs is the sweet spot: better availability and lower over-provisioning than two.",
      },
      {
        heading: 'Static stability and health-driven design',
        beyond: true,
        body:
          "AWS's own guidance (Well-Architected Reliability pillar) calls the pre-provisioned approach **static stability**: the system keeps working during a failure without needing to make changes, such as launching instances or editing DNS, because the control plane you would use to make changes may itself be impaired during an event.\n\nRelated design principles the exam leans on:\n\n- **Automatically recover from failure**: health checks plus automation (ASG replacement, Multi-AZ failover) rather than a human paged at 3 AM.\n- **Scale horizontally** to reduce the blast radius of any one failure.\n- **Stop guessing capacity**: let Auto Scaling follow demand.\n- **Manage change through automation**: infrastructure as code (CloudFormation) so a failed environment can be rebuilt identically.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Minimize downtime' or 'automatic failover' → HA is enough (Multi-AZ, standby).\n- 'No interruption', 'no reduction in capacity', 'users must not notice' → fault tolerance: active capacity across AZs sized for the loss of one.\n- 'Users lose their session / cart when instances scale in' → externalize sessions to ElastiCache or DynamoDB.\n- 'Bigger instance' is almost always a distractor in resilience questions: it raises the ceiling but keeps the SPOF.\n- 'Single AZ' anywhere in a design is the flaw the question wants you to spot.",
      },
    ],
    diagram: {
      title: 'Stateless fleet across three AZs survives an AZ failure',
      groups: [
        { id: 'region', label: 'Region us-east-1', kind: 'region', x: 36, y: 4, w: 60, h: 52 },
        { id: 'az-a', label: 'AZ a', kind: 'az', x: 38, y: 9, w: 18, h: 28 },
        { id: 'az-b', label: 'AZ b', kind: 'az', x: 58, y: 9, w: 18, h: 28 },
        { id: 'az-c', label: 'AZ c', kind: 'az', x: 78, y: 9, w: 17, h: 28 },
      ],
      nodes: [
        { id: 'users', label: 'Users', icon: 'users', x: 8, y: 26 },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 24, y: 26, sub: 'spans 3 AZs' },
        { id: 'ec2a', label: 'Web 1-3', icon: 'ec2', x: 47, y: 24, sub: '3 instances' },
        { id: 'ec2b', label: 'Web 4-6', icon: 'ec2', x: 67, y: 24, sub: '3 instances' },
        { id: 'ec2c', label: 'Web 7-9', icon: 'ec2', x: 86, y: 24, sub: '3 instances' },
        { id: 'cache', label: 'Session store', icon: 'elasticache', x: 67, y: 48, sub: 'ElastiCache Multi-AZ' },
      ],
      edges: [
        { id: 'e-u-alb', from: 'users', to: 'alb', label: 'HTTPS' },
        { id: 'e-alb-a', from: 'alb', to: 'ec2a' },
        { id: 'e-alb-b', from: 'alb', to: 'ec2b' },
        { id: 'e-alb-c', from: 'alb', to: 'ec2c' },
        { id: 'e-a-cache', from: 'ec2a', to: 'cache', dashed: true },
        { id: 'e-b-cache', from: 'ec2b', to: 'cache', dashed: true },
        { id: 'e-c-cache', from: 'ec2c', to: 'cache', dashed: true },
      ],
      steps: [
        {
          caption: 'The app needs 6 instances at peak. With 3 AZs we run 3 per AZ (9 total), so losing any one AZ still leaves 6.',
          highlight: ['az-a', 'az-b', 'az-c', 'ec2a', 'ec2b', 'ec2c'],
        },
        {
          caption: 'A user logs in. The ALB sends the request to an instance in AZ a.',
          highlight: ['users', 'alb', 'ec2a'],
          flow: [{ edge: 'e-u-alb' }, { edge: 'e-alb-a' }],
        },
        {
          caption: 'The instance writes the session to ElastiCache, not to its own memory. The web tier is now stateless.',
          highlight: ['ec2a', 'cache'],
          flow: [{ edge: 'e-a-cache' }],
        },
        {
          caption: 'AZ a loses power. Its three instances fail health checks and the ALB stops routing to them within seconds.',
          highlight: ['az-a', 'alb'],
          fail: ['az-a', 'ec2a'],
          flow: [{ edge: 'e-alb-a', color: 'bad' }],
        },
        {
          caption: "The user's next click lands on AZ b. That instance reads the session from ElastiCache, so the user stays logged in.",
          highlight: ['ec2b', 'cache', 'alb'],
          flow: [{ edge: 'e-u-alb' }, { edge: 'e-alb-b' }, { edge: 'e-b-cache' }],
        },
        {
          caption: 'Six healthy instances remain in AZ b and c: full capacity, no human action. That is fault tolerance. The ASG later rebalances when AZ a returns.',
          highlight: ['ec2b', 'ec2c', 'az-b', 'az-c'],
          flow: [{ edge: 'e-alb-b' }, { edge: 'e-alb-c' }],
        },
      ],
    },
    keyFacts: [
      'A Region has at least 3 AZs; each AZ has independent power, cooling and networking.',
      'HA = brief interruption allowed (RDS Multi-AZ failover ~60–120 s). Fault tolerance = no user-visible interruption.',
      'Fault tolerance requires active spare capacity, so it costs more than HA.',
      'Vertical scaling has a ceiling, usually needs downtime, and keeps the single point of failure.',
      'Horizontal scaling requires a stateless app: any instance must be able to serve any request.',
      'Sessions → ElastiCache or DynamoDB; uploads → S3 (EFS for shared POSIX); logs → CloudWatch Logs.',
      'Instances per AZ to survive one AZ loss = required ÷ (AZs − 1). 6 needed over 3 AZs = 3 per AZ, 9 total.',
      'Three AZs need only 50% over-provisioning for N+1; two AZs need 100%.',
    ],
    examTips: [
      "'Survive an AZ outage with NO reduction in capacity and no manual action' → spread more than the required capacity across AZs (e.g. 3 × 3 over three AZs for a need of 6). 3 + 3 across two AZs fails the 'no reduction' test.",
      "'Users lose sessions when instances are replaced' → store sessions in ElastiCache or DynamoDB, not sticky sessions.",
      "'Uploaded files missing on some servers' → store uploads in S3 (EFS only if a shared file system is explicitly needed).",
      "'Minimize downtime' signals HA; 'no interruption' or 'users must not notice' signals fault tolerance.",
      'A bigger instance type is a distractor whenever the problem is a single point of failure or unpredictable spikes.',
      "Any design with all instances in one AZ is the flaw: the fix is multi-AZ behind a load balancer.",
    ],
    pitfalls: [
      'Treating an Auto Scaling group in one AZ as highly available: it self-heals instance failures but not an AZ outage.',
      'Using sticky sessions as the fix for stateful apps: it skews load and loses the session when the target dies.',
      "Assuming '2 AZs with half the capacity each' is fault tolerant: you run at 50% until replacements launch.",
      'Confusing durability (data not lost) with availability (system reachable): S3 has 11 nines of durability but 99.99% availability.',
    ],
    prosCons: [
      {
        option: 'High availability (active-standby)',
        pros: ['Cheaper: standby is small or idle', 'Automatic failover with managed services'],
        cons: ['Brief outage during failover', 'Standby capacity does no useful work'],
        useWhen: "Requirement says 'minimize downtime' and a minute or two of failover is acceptable.",
      },
      {
        option: 'Fault tolerance (active-active)',
        pros: ['No user-visible interruption', 'All capacity serves traffic while healthy'],
        cons: ['Must over-provision for the loss of a component or AZ', 'Higher steady-state cost'],
        useWhen: "Requirement says 'no interruption' or 'no reduction in capacity'.",
      },
      {
        option: 'Vertical scaling',
        pros: ['No code changes', 'Simple to reason about'],
        cons: ['Hard ceiling', 'Downtime to resize', 'Still a single point of failure'],
        useWhen: 'Legacy or stateful app that cannot be distributed, as a short-term fix.',
      },
      {
        option: 'Horizontal scaling',
        pros: ['Near-unlimited capacity', 'Zero-downtime changes', 'Built-in redundancy'],
        cons: ['App must be stateless', 'Needs a load balancer and shared state stores'],
        useWhen: 'Web, API and worker tiers: the default answer for scalable and resilient designs.',
      },
      {
        option: 'Session store: ElastiCache vs DynamoDB',
        pros: ['ElastiCache: sub-millisecond reads', 'DynamoDB: serverless, durable, TTL to expire sessions'],
        cons: ['ElastiCache: nodes to size, data in memory', 'DynamoDB: single-digit ms, not sub-ms'],
        useWhen: "ElastiCache when the question stresses lowest latency; DynamoDB when it stresses serverless or least operational overhead.",
      },
    ],
    services: ['ec2', 'auto-scaling', 'alb', 'elasticache', 'dynamodb', 's3', 'efs', 'cloudwatch-logs'],
  },

  // ---------------------------------------------------------------- 2
  {
    id: 'm2-rpo-rto-coupling',
    module: 'm2',
    domain: 'resilient',
    title: 'RPO, RTO & Loose Coupling',
    minutes: 15,
    summary:
      'Extract RPO and RTO from a scenario and map them to backup, replication and standby choices, and explain why inserting a buffer between components makes a system survive spikes and failures.',
    analogy: {
      title: 'The diary and the post box',
      body:
        "You keep a diary. If your house burns down, **RPO** is how many days of entries you are willing to lose: photocopy it weekly and you might lose up to 7 days. **RTO** is how long until you are writing again: if you must buy a new notebook and retype the copies, that might take a day.\n\nNow think about mail. If the post office required you to hand every letter personally to the recipient, the whole system would stop whenever someone was not home. Instead you drop letters in a **post box**. You leave immediately, the mail carrier collects at their own pace, and if the carrier is sick one day the letters simply wait. That post box is **loose coupling**.",
    },
    sections: [
      {
        heading: 'Two numbers that decide the design',
        body:
          "**RPO (Recovery Point Objective)** is how much **data** you can afford to lose, measured backward in time from the disaster. 'RPO 1 hour' means backups or replication must capture changes at least every hour.\n\n**RTO (Recovery Time Objective)** is how long you can afford to be **down**, measured forward from the disaster until service is restored.\n\nWorked example: the last backup ran at 02:00. The database is destroyed at 05:00. Service is back at 09:00. You lost 3 hours of data (actual recovery point) and were down 4 hours (actual recovery time). If the business stated RPO 1 h / RTO 2 h, this design failed both.\n\nThese two numbers plus the budget select the resilience design. Exam scenarios usually state them explicitly; train yourself to underline them in every question.",
      },
      {
        heading: 'How RPO maps to mechanisms',
        body:
          "RPO is set by **how often data leaves the failure zone**. The more continuous the copy, the lower the RPO and, generally, the higher the cost.",
        table: {
          headers: ['Mechanism', 'Typical RPO', 'Notes'],
          rows: [
            ['Nightly snapshot copied to another Region', 'Up to 24 h', 'Cheapest; you lose everything since the last copy'],
            ['RDS automated backups (point-in-time restore)', '~5 min', 'Transaction logs shipped to S3 every 5 minutes'],
            ['Async cross-Region read replica', 'Seconds to minutes', 'Depends on replica lag'],
            ['Aurora Global Database', '~1 s', 'Storage-level replication'],
            ['DynamoDB Global Tables', 'Typically ~1 s', 'Multi-Region active-active'],
            ['RDS Multi-AZ (synchronous)', '0 within the Region', 'Commit lands on the standby first'],
          ],
        },
      },
      {
        heading: 'How RTO maps to what is already running',
        body:
          "RTO is set by **how much of the system must be built or started** after the disaster. If you must restore a database from a snapshot, launch instances and update DNS, that is hours. If a scaled-down copy is already running, it is minutes. If a full copy is already serving users, it is close to zero.\n\n- Restore from backup + infrastructure as code (CloudFormation): hours.\n- Data already replicated, servers off (start them from AMIs): tens of minutes.\n- Everything running at small size (scale it up): minutes.\n- Everything running at full size (stop routing to the dead one): seconds.\n\nThis spectrum becomes the four disaster recovery strategies later in this module (Backup & Restore, Pilot Light, Warm Standby, Multi-site active/active).",
      },
      {
        heading: 'The problem with tight coupling',
        body:
          "Components are **tightly coupled** when they call each other directly and **synchronously**: the caller waits for the answer before it can continue. A web server that writes every order straight into the database is tightly coupled to that database.\n\nThree things go wrong:\n\n- **Failure spreads**: if the downstream is slow or dead, the upstream times out and fails too.\n- **Spikes crush the weakest link**: a flash sale sends 10x traffic to the web tier, which forwards 10x writes to a database that was sized for 1x.\n- **Availability multiplies down**: three components in a synchronous chain, each 99.9% available, give about 99.7% for the whole chain (0.999 × 0.999 × 0.999).",
      },
      {
        heading: 'Loose coupling: put a buffer in between',
        body:
          "**Loose coupling** inserts an intermediary so each side can scale and fail independently. The producer hands work to the buffer and moves on; the consumer processes it at its own pace.\n\n- **Queue (SQS)**: one producer, a pool of consumers that pull work. Messages persist until processed (up to 14 days).\n- **Topic (SNS)**: one message pushed to many subscribers at once (fan-out).\n- **Event bus (EventBridge)**: events routed to targets based on their content.\n- **Stream (Kinesis Data Streams)**: ordered, replayable records read by multiple consumers.\n- **Workflow (Step Functions)**: orchestrated steps with retries.\n\nThe classic flow: the web tier drops each order into SQS and immediately confirms to the user. A worker fleet pulls messages and writes to the database at a sustainable rate. If a worker crashes mid-order, nothing is lost: the message becomes visible again and another worker takes it.",
        table: {
          headers: ['', 'Synchronous (tight)', 'Asynchronous (loose)'],
          rows: [
            ['Caller waits for result?', 'Yes', 'No, gets an acknowledgment only'],
            ['Downstream outage', 'Caller fails too', 'Work waits in the buffer'],
            ['Traffic spike', 'Passed straight through', 'Absorbed by the buffer'],
            ['Scaling', 'All tiers must scale together', 'Each tier scales on its own metric'],
            ['Typical AWS pieces', 'Direct API/DB calls, Lambda calling Lambda', 'SQS, SNS, EventBridge, Kinesis, Step Functions'],
          ],
        },
      },
      {
        heading: 'Exam angle',
        body:
          "- Read the numbers first: 'RPO 15 minutes, RTO 4 hours' tells you the minimum replication frequency and how much can be pre-built.\n- 'Minimize cost' + generous RPO/RTO → the cheapest mechanism that still meets both numbers, never the most resilient one.\n- 'Orders lost during spikes', 'database overwhelmed', 'must still confirm immediately' → put SQS between the web tier and workers.\n- 'If component B fails, A must keep working' → asynchronous messaging between them.",
      },
    ],
    diagram: {
      title: 'From tight coupling to a queue that absorbs a spike',
      nodes: [
        { id: 'users', label: 'Shoppers', icon: 'users', x: 8, y: 30 },
        { id: 'web', label: 'Web tier', icon: 'ec2', x: 26, y: 30, sub: 'ASG' },
        { id: 'sqs', label: 'Order queue', icon: 'sqs', x: 48, y: 46, sub: 'SQS' },
        { id: 'worker', label: 'Workers', icon: 'ec2', x: 70, y: 46, sub: 'ASG on queue depth' },
        { id: 'db', label: 'Orders DB', icon: 'rds', x: 88, y: 30, sub: 'RDS Multi-AZ' },
      ],
      edges: [
        { id: 'e-u-web', from: 'users', to: 'web', label: 'checkout' },
        { id: 'e-web-db', from: 'web', to: 'db', label: 'direct write', dashed: true },
        { id: 'e-web-sqs', from: 'web', to: 'sqs', label: 'SendMessage' },
        { id: 'e-sqs-w', from: 'sqs', to: 'worker', label: 'poll' },
        { id: 'e-w-db', from: 'worker', to: 'db', label: 'steady rate' },
      ],
      steps: [
        {
          caption: 'Tightly coupled: each checkout writes straight to the database, and the user waits for the commit.',
          highlight: ['users', 'web', 'db'],
          flow: [{ edge: 'e-u-web' }, { edge: 'e-web-db' }],
        },
        {
          caption: 'Flash sale: 10x traffic hits the web tier, which passes 10x writes to the database. It saturates and orders are lost.',
          highlight: ['web', 'db'],
          fail: ['db'],
          flow: [{ edge: 'e-web-db', color: 'bad' }],
        },
        {
          caption: 'Loosely coupled: the web tier enqueues the order in SQS and confirms to the user as soon as SQS acknowledges.',
          highlight: ['web', 'sqs'],
          flow: [{ edge: 'e-u-web' }, { edge: 'e-web-sqs' }],
        },
        {
          caption: 'Workers pull messages and write to the database at a rate it can sustain. The queue grows during the spike instead of the DB falling over.',
          highlight: ['sqs', 'worker', 'db'],
          flow: [{ edge: 'e-sqs-w' }, { edge: 'e-w-db' }],
        },
        {
          caption: 'A worker crashes mid-order. It never deleted the message, so after the visibility timeout the order reappears for another worker. Nothing is lost.',
          highlight: ['sqs', 'worker'],
          fail: ['worker'],
          flow: [{ edge: 'e-sqs-w', color: 'bad' }],
        },
        {
          caption: 'The ASG adds workers based on backlog per instance until the queue drains. Each tier scaled on its own signal.',
          highlight: ['worker', 'sqs'],
          flow: [{ edge: 'e-sqs-w' }, { edge: 'e-w-db' }],
        },
      ],
    },
    keyFacts: [
      'RPO = maximum acceptable data loss, measured backward from the disaster.',
      'RTO = maximum acceptable downtime, measured forward from the disaster.',
      'RPO is driven by copy frequency; RTO is driven by how much is pre-provisioned.',
      'RDS point-in-time restore has an RPO of about 5 minutes (logs uploaded every 5 min).',
      'Aurora Global Database: RPO ~1 s, RTO under 1 minute.',
      'Three 99.9% components in a synchronous chain ≈ 99.7% overall.',
      'SQS retains messages up to 14 days, so consumers can be down for a long time without data loss.',
      'Loose coupling lets each tier scale on its own metric (requests for web, queue depth for workers).',
    ],
    examTips: [
      "Underline RPO and RTO in every DR question, then pick the cheapest option that meets both numbers.",
      "'Flash sale overwhelms the database and orders are lost, users need immediate confirmation' → SQS between web tier and a worker fleet, scaled on queue depth. A bigger RDS instance or a migration to Aurora alone keeps the tight coupling.",
      "'If the downstream service is unavailable, requests must not be lost' → asynchronous queue, not a retry loop in the caller.",
      "'RPO of zero within a Region' → synchronous replication (RDS Multi-AZ). Async replicas always have some lag.",
      "'Components must scale independently' is a loose-coupling keyword.",
    ],
    pitfalls: [
      'Swapping RPO and RTO: RPO is about data, RTO is about time to recover.',
      'Choosing the most resilient option when the question says minimize cost and the RPO/RTO are generous.',
      'Thinking a faster or bigger database fixes a spike problem: the spike will find the new ceiling too.',
      'Assuming asynchronous means instant: queued work is processed later, so the user gets an acknowledgment, not the final result.',
    ],
    prosCons: [
      {
        option: 'Synchronous direct calls',
        pros: ['Simple to build and debug', 'Caller gets the final result immediately'],
        cons: ['Failures and spikes propagate', 'All tiers must scale together'],
        useWhen: 'The user truly needs the result in the same request and load is predictable.',
      },
      {
        option: 'Queue buffer (SQS)',
        pros: ['Absorbs spikes', 'Consumer outages lose nothing', 'Workers scale on backlog'],
        cons: ['Eventual processing, not instant', 'Consumers must handle duplicates (idempotency)'],
        useWhen: "'Smooth out spikes', 'decouple', 'orders lost under load'.",
      },
      {
        option: 'Pub/sub or event bus (SNS / EventBridge)',
        pros: ['One event, many independent consumers', 'Add consumers without changing the producer'],
        cons: ['SNS keeps nothing after delivery (pair with SQS for durability)', 'More moving parts to trace'],
        useWhen: 'Several systems must react to the same event independently.',
      },
    ],
    services: ['sqs', 'sns', 'eventbridge', 'rds', 'aurora-global-database', 'auto-scaling', 'ec2'],
  },

  // ---------------------------------------------------------------- 3
  {
    id: 'm2-elb',
    module: 'm2',
    domain: 'resilient',
    title: 'Elastic Load Balancing: ALB, NLB, GWLB',
    minutes: 22,
    summary:
      'Explain how a load balancer gives a fault-tolerant front door, pick ALB, NLB or GWLB from the scenario wording, and configure health checks, cross-zone balancing, stickiness and deregistration delay.',
    analogy: {
      title: 'The host at a busy restaurant',
      body:
        "A restaurant host stands at the door and seats each new party at a table whose waiter is free. If a waiter goes home sick, the host simply stops seating people in that section. Guests never need to know which waiter exists; they only know the restaurant's front door.\n\nAn **Application Load Balancer** is a host who reads your reservation ('birthday party' goes to the big room, 'takeaway' to the counter). A **Network Load Balancer** is a lightning-fast turnstile that does not read anything, just counts people through at enormous speed from a fixed, well-known entrance. A **Gateway Load Balancer** is a security checkpoint that sends everyone through a metal detector before they reach any table.",
    },
    sections: [
      {
        heading: 'What a load balancer actually does',
        body:
          "**Elastic Load Balancing (ELB)** is a managed fleet of traffic distributors that AWS runs for you in each AZ you enable. Clients connect to the load balancer's DNS name (for example `my-alb-123.us-east-1.elb.amazonaws.com`); the load balancer forwards each request to a healthy **target**.\n\nThe moving parts:\n\n- **Listener**: a protocol and port the LB accepts, such as HTTPS:443.\n- **Rules** (ALB): conditions that decide which target group gets the request.\n- **Target group**: a set of targets (EC2 instances, IP addresses, Lambda functions, or an ALB) plus a **health check**.\n- **Health check**: the LB probes each target, for example `GET /health` every 30 seconds. A target that fails enough consecutive checks (ALB default: 2 unhealthy, 5 healthy to return) is pulled out of rotation.\n\nBecause the LB has nodes in every enabled AZ and only sends traffic to healthy targets, it is the fault-tolerant front door: if an AZ dies, the LB simply stops sending traffic there. Always enable at least two AZs (subnets) for the LB.",
      },
      {
        heading: 'The three load balancers that matter',
        body:
          "AWS has four ELB types. The **Classic Load Balancer (CLB)** is legacy; on the exam it is only right when nothing else fits, and you should migrate off it. The three current types differ by the network layer they operate at.",
        table: {
          headers: ['', 'Application LB (ALB)', 'Network LB (NLB)', 'Gateway LB (GWLB)'],
          rows: [
            ['OSI layer', '7 (HTTP/HTTPS, gRPC, WebSockets)', '4 (TCP, UDP, TLS)', '3 (IP packets via GENEVE, port 6081)'],
            ['Superpower', 'Content-based routing by path, host, header, query string', 'Millions of requests/s, ultra-low latency, static IP per AZ', 'Inserts third-party appliances transparently'],
            ['Static IP / Elastic IP', 'No (DNS name only)', 'Yes, one per AZ', 'No'],
            ['Client source IP', 'In X-Forwarded-For header', 'Preserved natively', 'Preserved (bump in the wire)'],
            ['Targets', 'Instances, IPs, Lambda', 'Instances, IPs, an ALB', 'Instances, IPs (appliances)'],
            ['Cross-zone default', 'On, no extra charge', 'Off; inter-AZ data charged if enabled', 'Off'],
            ['Trigger phrase', "'Route /api and /images to different services'", "'Fixed IPs for firewall allow-listing', 'UDP', 'millions of rps'", "'Inspect all traffic with third-party firewalls'"],
          ],
        },
      },
      {
        heading: 'ALB in depth',
        body:
          "An ALB terminates the client connection, reads the HTTP request, and evaluates **listener rules** in priority order.\n\n- **Conditions**: host header (`shop.example.com`), path (`/api/*`), HTTP header, method, query string, source IP.\n- **Actions**: forward (optionally **weighted** across target groups, for example 90/10 for a canary release), redirect (HTTP to HTTPS), fixed response (a 503 maintenance message), and **authenticate** users with Amazon Cognito or any OIDC provider before the request reaches your app.\n- **TLS**: attach certificates from ACM (AWS Certificate Manager). **SNI** lets one HTTPS listener serve many domains, each with its own certificate.\n- **Containers**: with ECS, each task can listen on a dynamic host port; the ALB target group tracks them automatically.\n- **Lambda targets**: the ALB converts the HTTP request into a Lambda event.\n\nBecause the ALB opens a new connection to the target, the app sees the ALB's IP as the source. The original client IP is in the `X-Forwarded-For` header.\n\nNeed a static IP in front of an ALB? Two answers: put **Global Accelerator** in front (two static anycast IPs), or put an **NLB with an ALB-type target group** in front.",
      },
      {
        heading: 'NLB and GWLB in depth',
        body:
          "An **NLB** forwards TCP, UDP or TLS connections without reading HTTP. It handles millions of requests per second with very low latency and survives sudden spikes without pre-warming.\n\n- **One static IP per AZ**, or attach your own **Elastic IPs**, which partners can allow-list in their firewalls.\n- **Preserves the client source IP** for instance targets, so the app sees the real caller.\n- Can terminate TLS, supports security groups (added in 2023), and is the required front end for a **PrivateLink endpoint service** (exposing your service privately to other VPCs).\n\nA **GWLB** is for network security appliances (firewalls, intrusion detection/prevention, deep packet inspection) from vendors such as Palo Alto or Fortinet. Route tables send traffic to a **GWLB endpoint**; the GWLB wraps packets in **GENEVE** (UDP port 6081), load-balances them across the appliance fleet, and returns inspected traffic to its original path. It health-checks appliances and keeps each flow on the same appliance. Scale the appliance fleet like any other target group.",
      },
      {
        heading: 'Behaviors you configure',
        body:
          "- **Cross-zone load balancing** spreads requests evenly across **all** registered targets in all AZs, instead of splitting evenly per AZ first. Without it, an AZ with 2 targets and an AZ with 8 targets each get 50% of traffic, so the 2 targets each take 25%. ALB has it on by default and free; NLB and GWLB have it off by default, and NLB charges inter-AZ data when enabled. Uneven load with unequal targets per AZ → enable cross-zone.\n- **Sticky sessions** pin a client to one target with a cookie (ALB `AWSALB` duration cookie or your app's own cookie). It is a crutch for stateful apps: it skews load and the session dies with the target. In design questions, externalize sessions instead.\n- **Deregistration delay** (connection draining), default **300 seconds**, configurable 0–3600: the LB stops sending new requests to a target being removed but lets in-flight requests finish. It pairs with Auto Scaling scale-in and deployments.\n- **Slow start** (ALB) ramps traffic to a new target gradually so a cold cache is not flooded.\n- **Health check grace period** on the ASG gives new instances time to boot before ELB failures count against them.",
        table: {
          headers: ['Setting', 'ALB', 'NLB', 'Why it matters'],
          rows: [
            ['Cross-zone', 'On by default, free', 'Off by default, charged', 'Even load when AZs have unequal targets'],
            ['Deregistration delay', '300 s default', '300 s default', 'In-flight requests finish before removal'],
            ['Sticky sessions', 'Cookie-based', 'Source-IP based', 'Workaround for stateful apps'],
            ['Health check', 'HTTP/HTTPS path + status code', 'TCP, HTTP or HTTPS', 'Unhealthy targets leave rotation'],
          ],
        },
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Route `/video` to one fleet and `/api` to another', 'host-based routing', 'authenticate users at the load balancer' → ALB.\n- 'Partner firewall must allow-list fixed IP addresses' → NLB with Elastic IPs (or Global Accelerator in front of an ALB).\n- 'Millions of UDP packets per second', 'gaming', 'IoT over TCP', 'ultra-low latency' → NLB.\n- 'Inspect all traffic with a third-party virtual appliance' → GWLB.\n- 'Expose a service privately to other VPCs/accounts' → NLB + PrivateLink.\n- 'Some instances overloaded, others idle, different counts per AZ' → enable cross-zone load balancing.",
      },
    ],
    diagram: {
      title: 'ALB path routing across two AZs with health checks',
      groups: [
        { id: 'region', label: 'Region', kind: 'region', x: 36, y: 3, w: 60, h: 54 },
        { id: 'az-a', label: 'AZ a', kind: 'az', x: 39, y: 7, w: 55, h: 21 },
        { id: 'az-b', label: 'AZ b', kind: 'az', x: 39, y: 32, w: 55, h: 21 },
      ],
      nodes: [
        { id: 'user', label: 'Client', icon: 'user', x: 8, y: 30 },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 24, y: 30, sub: 'HTTPS:443' },
        { id: 'api-a', label: 'API target', icon: 'ec2', x: 54, y: 18, sub: 'TG api' },
        { id: 'img-a', label: 'Image target', icon: 'ec2', x: 80, y: 18, sub: 'TG images' },
        { id: 'api-b', label: 'API target', icon: 'ec2', x: 54, y: 43, sub: 'TG api' },
        { id: 'img-b', label: 'Image target', icon: 'ec2', x: 80, y: 43, sub: 'TG images' },
      ],
      edges: [
        { id: 'e-u-alb', from: 'user', to: 'alb' },
        { id: 'e-api-a', from: 'alb', to: 'api-a', label: '/api/*' },
        { id: 'e-img-a', from: 'alb', to: 'img-a', label: '/img/*' },
        { id: 'e-api-b', from: 'alb', to: 'api-b', label: '/api/*' },
        { id: 'e-img-b', from: 'alb', to: 'img-b', label: '/img/*' },
      ],
      steps: [
        {
          caption: "The client resolves the ALB's DNS name and connects on HTTPS:443. The ALB terminates TLS using an ACM certificate.",
          highlight: ['user', 'alb'],
          flow: [{ edge: 'e-u-alb' }],
        },
        {
          caption: 'Rule 1 matches path /api/* and forwards to the api target group, spread over both AZs.',
          highlight: ['api-a', 'api-b', 'alb'],
          flow: [{ edge: 'e-api-a' }, { edge: 'e-api-b' }],
        },
        {
          caption: 'Rule 2 matches /img/* and forwards to the images target group. One load balancer, two independent fleets.',
          highlight: ['img-a', 'img-b', 'alb'],
          flow: [{ edge: 'e-img-a' }, { edge: 'e-img-b' }],
        },
        {
          caption: 'The image app in AZ a hangs. Two failed GET /health checks mark it unhealthy and the ALB stops sending it requests.',
          highlight: ['img-a'],
          fail: ['img-a'],
          flow: [{ edge: 'e-img-a', color: 'bad' }, { edge: 'e-img-b' }],
        },
        {
          caption: 'Now all of AZ a fails. The ALB node there is gone too, and every request is served by targets in AZ b.',
          highlight: ['az-b', 'api-b', 'img-b'],
          fail: ['az-a', 'api-a', 'img-a'],
          flow: [{ edge: 'e-api-b' }, { edge: 'e-img-b' }],
        },
        {
          caption: 'When AZ a recovers, targets pass 5 consecutive health checks and rejoin. With Auto Scaling, replacements would have launched in AZ b meanwhile.',
          highlight: ['api-a', 'img-a', 'az-a'],
          flow: [{ edge: 'e-api-a' }, { edge: 'e-img-a' }],
        },
      ],
    },
    keyFacts: [
      'ALB = layer 7 (HTTP/HTTPS/gRPC/WebSockets); NLB = layer 4 (TCP/UDP/TLS); GWLB = layer 3 using GENEVE on UDP 6081.',
      'Only the NLB gives a static IP per AZ and supports Elastic IPs.',
      'ALB passes the client IP in X-Forwarded-For; NLB preserves the source IP natively.',
      'ALB targets: instances, IPs, Lambda. NLB targets: instances, IPs, ALB.',
      'Cross-zone: ALB on and free by default; NLB and GWLB off by default (NLB charges inter-AZ data).',
      'Deregistration delay default 300 s (0–3600 s).',
      'ALB health check defaults: every 30 s, 2 failures = unhealthy, 5 successes = healthy.',
      'ALB can authenticate users via Cognito or OIDC and do weighted forwarding for canaries.',
      'PrivateLink endpoint services require an NLB (or GWLB for appliances).',
      'Classic Load Balancer is legacy; prefer ALB or NLB.',
    ],
    examTips: [
      "'Fixed IPs that a customer firewall can allow-list' → NLB with Elastic IPs, or Global Accelerator in front of an ALB when you also need layer-7 routing.",
      "'Route by URL path or hostname' → ALB listener rules.",
      "'Millions of requests per second', 'UDP', 'ultra-low latency' → NLB.",
      "'Third-party firewall / IDS appliances must inspect all traffic' → GWLB.",
      "'Application needs the client's real IP' → NLB, or read X-Forwarded-For behind an ALB.",
      "'Instances terminated mid-request during scale-in' → deregistration delay (connection draining).",
      "'Unequal number of instances per AZ causes uneven load' → enable cross-zone load balancing.",
    ],
    pitfalls: [
      'Picking an ALB when the question needs a static IP: the ALB only has a DNS name whose IPs change.',
      'Using sticky sessions as a resilience fix: it skews load and loses sessions when a target dies.',
      'Forgetting to enable at least two AZs on the load balancer, which leaves the front door itself in one AZ.',
      'Choosing GWLB for ordinary web traffic: it is only for routing through inspection appliances.',
      'Expecting the app to see the client IP as the source address behind an ALB.',
    ],
    prosCons: [
      {
        option: 'Application Load Balancer',
        pros: ['Path/host/header routing', 'Redirects, fixed responses, Cognito/OIDC auth', 'Lambda and ECS dynamic-port targets', 'Cross-zone free'],
        cons: ['No static IP', 'HTTP-family protocols only', 'Slightly higher latency than NLB'],
        useWhen: 'Web apps and microservices that need routing on HTTP content.',
      },
      {
        option: 'Network Load Balancer',
        pros: ['Static IP / Elastic IP per AZ', 'Millions of rps, very low latency', 'Any TCP/UDP protocol', 'Preserves source IP', 'Fronts PrivateLink'],
        cons: ['No content-based routing', 'Cross-zone off by default and charged'],
        useWhen: 'Fixed IPs, non-HTTP protocols, extreme throughput, or PrivateLink.',
      },
      {
        option: 'Gateway Load Balancer',
        pros: ['Transparent insertion of appliances', 'Scales and health-checks the appliance fleet', 'Keeps flows sticky to one appliance'],
        cons: ['Only useful with inspection appliances', 'Requires GWLB endpoints and route table changes'],
        useWhen: "'Inspect all traffic with third-party firewalls / IDS / IPS'.",
      },
      {
        option: 'Classic Load Balancer',
        pros: ['Still works for very old EC2-Classic-era setups'],
        cons: ['Legacy, fewer features', 'No path routing, no Lambda targets'],
        useWhen: 'Almost never on the exam; migrate to ALB or NLB.',
      },
    ],
    services: ['elb', 'alb', 'nlb', 'gwlb', 'ec2', 'auto-scaling', 'acm', 'global-accelerator', 'privatelink'],
  },

  // ---------------------------------------------------------------- 4
  {
    id: 'm2-auto-scaling',
    module: 'm2',
    domain: 'resilient',
    title: 'Auto Scaling Groups & Scaling Policies',
    minutes: 22,
    summary:
      'Configure an Auto Scaling group with a launch template, health checks and the right scaling policy for the scenario, and control timing with warm-up, lifecycle hooks, warm pools and scale-in protection.',
    analogy: {
      title: 'The supermarket checkout manager',
      body:
        "A supermarket manager watches the checkout queues. Always keep at least 2 tills open (minimum), never more than 12 (maximum, that is all the tills you have), and aim for whatever the queues need right now (desired). When the line gets long, the manager calls another cashier from the back; when it is quiet, sends one on break.\n\nIf a cashier faints, the manager replaces them without being asked (self-healing). A good manager also knows that every Saturday at 10 AM is a rush and opens extra tills at 9:45 (scheduled and predictive scaling). And a cashier halfway through scanning a full trolley is not sent on break until they finish (scale-in protection and lifecycle hooks).",
    },
    sections: [
      {
        heading: 'The problem: fixed fleets are always wrong',
        body:
          "A fixed fleet is sized for some guess. Size it for peak and you pay for idle servers 20 hours a day; size it for average and it falls over at peak. Servers also fail, and somebody has to notice and replace them.\n\nAn **Auto Scaling group (ASG)** solves both. You give it three numbers and a list of subnets:\n\n- **Minimum** (for example 2): never fewer, even at 3 AM. Two in different AZs keeps you highly available.\n- **Maximum** (for example 12): a cost and quota guardrail.\n- **Desired capacity** (for example 4): what it maintains right now; scaling policies move this number between min and max.\n- **Subnets in multiple AZs**: the ASG spreads instances evenly across them.\n\nAuto Scaling itself is free; you pay only for the EC2 instances and CloudWatch alarms it uses.",
      },
      {
        heading: 'Launch templates: what to launch',
        body:
          "A **launch template** describes each instance: AMI, instance type, key pair, security groups, IAM instance profile (role), EBS volumes, and **user data** (a boot script).\n\n- Templates are **versioned**. The ASG can track `$Default` or `$Latest`, so you roll out a new AMI by creating version 2 and running an **instance refresh**.\n- A **mixed instances policy** lets one ASG use several instance types (for example `m7i.large`, `m6i.large`, `m7a.large`) and mix **On-Demand** and **Spot**, such as 'base of 2 On-Demand, then 70% Spot'. Diversifying types makes Spot interruptions far less likely to hit everything at once; **capacity rebalancing** proactively replaces Spot instances that receive a rebalance recommendation.\n- Legacy **launch configurations** are immutable, single-type and deprecated (accounts created since late 2024 cannot create them). On the exam, prefer launch templates.\n\nA **golden AMI** (an image with the app and dependencies pre-installed) makes new instances healthy in seconds instead of the minutes a long user-data install script takes.",
      },
      {
        heading: 'What the ASG does all the time',
        body:
          "Even with no scaling policy, an ASG continuously:\n\n- **Replaces unhealthy instances** (self-healing). By default it uses **EC2 status checks**, which only detect a broken VM or host. Turn on **ELB health checks** for the group and an instance whose **application** is dead (the VM is fine but `/health` returns 500 or times out) is also terminated and replaced. This is a favorite exam nuance.\n- **Waits the health check grace period** (default 300 s) after launch before acting on failed health checks, so slow-booting instances are not killed.\n- **Rebalances across AZs**: if one AZ ends up with more instances (after an outage or a failed launch), it launches in the short AZ and terminates in the heavy one.\n- **Chooses who to terminate on scale-in** with the default termination policy: first the AZ with the most instances, then instances on the oldest launch template or configuration.",
        table: {
          headers: ['Health check type', 'Detects', 'Misses'],
          rows: [
            ['EC2 status checks (default)', 'Hardware, hypervisor, OS not reachable', 'App crashed or hung while the VM runs'],
            ['ELB health checks', 'App not answering the target group health check', 'Nothing extra; still includes EC2 checks'],
            ['Custom (SetInstanceHealth API)', 'Anything your own monitoring decides', 'Requires you to build the check'],
          ],
        },
      },
      {
        heading: 'Scaling policies: choose by the wording',
        body:
          "A **scaling policy** changes desired capacity in response to load. Pick it by how the question describes the traffic.",
        table: {
          headers: ['Policy', 'How it works', 'Trigger phrase'],
          rows: [
            ['Target tracking', "You state a target (average CPU 50%, ALBRequestCountPerTarget 1000); AWS creates and manages the CloudWatch alarms and scales both ways", "'Keep utilization around X%'. Default best answer"],
            ['Step scaling', 'CloudWatch alarm thresholds add or remove capacity in steps you define (CPU 60–80% +2, >80% +4)', "'Fine-grained control over scaling increments'"],
            ['Simple scaling', 'One alarm, one adjustment, then wait the cooldown (default 300 s)', 'Legacy; rarely the best answer'],
            ['Scheduled', 'Set min/max/desired at a time or on a cron schedule', "'Traffic spikes every weekday at 9 AM', known events"],
            ['Predictive', 'Machine learning forecasts load from history and launches capacity ahead of it', "'Recurring daily/weekly pattern, capacity ready BEFORE the spike'"],
          ],
        },
      },
      {
        heading: 'Timing controls: warm-up, cooldown, hooks, warm pools, protection',
        body:
          "Scaling is not instant: a new instance must boot, run user data and pass health checks. These controls stop the ASG from thrashing and protect work in progress.\n\n- **Default instance warm-up**: new instances do not contribute their metrics to scaling decisions until warmed up, so the ASG does not over-react to its own in-progress launch.\n- **Cooldown** (simple scaling, default 300 s): after an activity, wait before the next one.\n- **Lifecycle hooks** pause an instance in `Pending:Wait` (on launch) or `Terminating:Wait` (on scale-in) for up to the heartbeat timeout (default 1 hour) so you can install software, register with a config system, or drain logs and finish jobs before termination.\n- **Warm pools** keep pre-initialized instances stopped (or hibernated) beside the group. Scale-out starts them in seconds instead of booting from scratch, for apps with long initialization.\n- **Scale-in protection** marks specific instances as not eligible for termination, for example while they process a long job.\n- **Predictive scaling** needs at least 24 hours of history and can run in forecast-only mode first so you can check its accuracy.",
      },
      {
        heading: 'The worker-fleet pattern: scale on backlog per instance',
        body:
          "For instances that pull work from an SQS queue, CPU tells you nothing about how much work is **waiting**. Scale on a **custom metric: backlog per instance** = `ApproximateNumberOfMessagesVisible` ÷ number of InService instances.\n\nSet the target from your latency goal. If each message takes 2 s to process and the business accepts up to 10 minutes (600 s) of delay, one instance can clear 600 ÷ 2 = **300 messages** in time. Target tracking on backlog per instance = 300. With 1,500 messages queued, the ASG scales to 5 instances; when the queue drains, it scales back to the minimum.\n\nThis pattern appears constantly in Domain 2 questions, often paired with an SQS buffer in front of a database.",
      },
      {
        heading: 'Exam angle',
        body:
          "- Default answer for steady 'keep it at X' → target tracking.\n- 'Known spike at a fixed time' → scheduled. 'Recurring pattern, be ready before it' → predictive.\n- 'App hangs but the instance is never replaced' → enable ELB health checks on the ASG.\n- 'Instances take too long to become healthy after scale-out' → golden AMI (bake dependencies) or a warm pool.\n- 'Long-running jobs must not be killed during scale-in' → scale-in protection plus a termination lifecycle hook.\n- 'Workers process an SQS queue' → scale on backlog per instance, not CPU.",
      },
    ],
    diagram: {
      title: 'Target tracking scale-out and ELB health-check replacement',
      groups: [
        { id: 'region', label: 'Region', kind: 'region', x: 34, y: 3, w: 62, h: 54 },
        { id: 'asg', label: 'Auto Scaling group (min 2 / max 6)', kind: 'generic', x: 37, y: 20, w: 56, h: 32 },
      ],
      nodes: [
        { id: 'users', label: 'Users', icon: 'users', x: 8, y: 36 },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 22, y: 36, sub: 'health check /health' },
        { id: 'cw', label: 'CloudWatch alarm', icon: 'cloudwatch', x: 46, y: 10, sub: 'CPU > 50% target' },
        { id: 'asgsvc', label: 'Auto Scaling', icon: 'auto-scaling', x: 64, y: 10, sub: 'desired 2 → 3' },
        { id: 'lt', label: 'Launch template', icon: 'launch-template', x: 84, y: 10, sub: 'v2, golden AMI' },
        { id: 'ec2a', label: 'Instance 1', icon: 'ec2', x: 47, y: 37, sub: 'AZ a' },
        { id: 'ec2b', label: 'Instance 2', icon: 'ec2', x: 65, y: 37, sub: 'AZ b' },
        { id: 'ec2c', label: 'Instance 3', icon: 'ec2', x: 83, y: 37, sub: 'AZ c (new)' },
      ],
      edges: [
        { id: 'e-u-alb', from: 'users', to: 'alb' },
        { id: 'e-alb-a', from: 'alb', to: 'ec2a' },
        { id: 'e-alb-b', from: 'alb', to: 'ec2b' },
        { id: 'e-alb-c', from: 'alb', to: 'ec2c' },
        { id: 'e-cw-asg', from: 'cw', to: 'asgsvc', label: 'alarm' },
        { id: 'e-asg-lt', from: 'asgsvc', to: 'lt', label: 'reads' },
        { id: 'e-asg-c', from: 'asgsvc', to: 'ec2c', label: 'launch' },
      ],
      steps: [
        {
          caption: 'Normal load: the ALB spreads traffic over the two instances the ASG keeps at minimum capacity, one per AZ.',
          highlight: ['alb', 'ec2a', 'ec2b'],
          flow: [{ edge: 'e-u-alb' }, { edge: 'e-alb-a' }, { edge: 'e-alb-b' }],
        },
        {
          caption: 'Traffic climbs and average CPU passes the 50% target. The target tracking policy’s CloudWatch alarm fires.',
          highlight: ['cw', 'ec2a', 'ec2b'],
          flow: [{ edge: 'e-cw-asg' }],
        },
        {
          caption: 'The ASG raises desired capacity to 3, reads launch template v2 and launches an instance in the AZ with the fewest instances.',
          highlight: ['asgsvc', 'lt', 'ec2c'],
          flow: [{ edge: 'e-asg-lt' }, { edge: 'e-asg-c' }],
        },
        {
          caption: 'After the instance warms up and passes the ALB health check, it joins the target group and starts taking traffic.',
          highlight: ['ec2c', 'alb'],
          flow: [{ edge: 'e-alb-a' }, { edge: 'e-alb-b' }, { edge: 'e-alb-c' }],
        },
        {
          caption: 'The app on instance 2 hangs. EC2 status checks still pass, but the ALB health check fails. With ELB health checks enabled on the ASG, it is marked unhealthy.',
          highlight: ['ec2b', 'alb'],
          fail: ['ec2b'],
          flow: [{ edge: 'e-alb-b', color: 'bad' }],
        },
        {
          caption: 'The ASG terminates instance 2 (after the deregistration delay) and launches a replacement from the launch template. No human involved.',
          highlight: ['asgsvc', 'lt', 'ec2b'],
          flow: [{ edge: 'e-asg-lt' }],
        },
      ],
    },
    keyFacts: [
      'An ASG keeps capacity between min and max at the desired count, spread evenly across the AZs of its subnets.',
      'Launch templates are versioned and support mixed instance types plus Spot; launch configurations are deprecated.',
      'Default ASG health check = EC2 status checks; enable ELB health checks to replace instances whose app is dead.',
      'Health check grace period default 300 s.',
      'Simple scaling cooldown default 300 s.',
      'Lifecycle hooks pause launch or termination; default heartbeat timeout 1 hour.',
      'Predictive scaling needs at least 24 hours of history and can run in forecast-only mode.',
      'Backlog per instance = ApproximateNumberOfMessagesVisible ÷ InService instances.',
      'Target for backlog per instance = acceptable latency ÷ processing time per message.',
      'Auto Scaling has no charge of its own; you pay for the instances.',
    ],
    examTips: [
      "'ASG replaces instances only when the VM fails, but the application sometimes hangs' → enable ELB health checks on the ASG. Faster instance types or a CPU-based reboot alarm do not detect a hung app with normal CPU.",
      "'Keep average CPU at 50%' → target tracking.",
      "'Traffic spikes every weekday at 9 AM' → scheduled scaling (or predictive if it says 'forecast' or 'ahead of recurring patterns').",
      "'Instances processing long jobs must not be terminated mid-job' → scale-in protection plus lifecycle hooks.",
      "'New instances take too long to become healthy' → golden AMI instead of long user-data installs, or a warm pool.",
      "'Scale workers based on how much work is waiting in SQS' → custom metric backlog per instance with target tracking.",
      "'Lowest cost for a fault-tolerant, interruptible fleet' → mixed instances policy with Spot across several instance types.",
    ],
    pitfalls: [
      'Leaving the ASG on EC2 health checks only: a hung application is never replaced.',
      'Scaling a queue worker fleet on CPU: idle-looking workers can have a huge backlog.',
      'Setting min = 1: a single instance is a single point of failure even inside an ASG.',
      'Using simple scaling when target tracking would do: simple waits a full cooldown and reacts coarsely.',
      'Putting all ASG subnets in one AZ: self-healing, but not AZ-resilient.',
    ],
    prosCons: [
      {
        option: 'Target tracking',
        pros: ['Easiest: pick a metric and a target', 'AWS manages alarms in both directions', 'Works with custom metrics like backlog per instance'],
        cons: ['Less control over step sizes', 'Reactive: capacity arrives after load rises'],
        useWhen: "Default choice for 'keep metric near X'.",
      },
      {
        option: 'Step scaling',
        pros: ['Bigger breach → bigger adjustment', 'Precise control'],
        cons: ['You define and maintain alarms and steps', 'Still reactive'],
        useWhen: "'Fine-grained control over how much to add at each threshold'.",
      },
      {
        option: 'Scheduled scaling',
        pros: ['Capacity ready exactly when needed', 'Simple for known events'],
        cons: ['Does not react to unexpected load', 'Schedules must be maintained'],
        useWhen: 'Known, time-based events (business hours, a marketing launch at 10:00).',
      },
      {
        option: 'Predictive scaling',
        pros: ['Launches ahead of recurring spikes', 'Learns daily and weekly patterns automatically'],
        cons: ['Needs history; poor for irregular or one-off spikes', 'Usually combined with target tracking for surprises'],
        useWhen: "'Cyclical load; instances must be ready before the spike'.",
      },
    ],
    services: ['auto-scaling', 'launch-template', 'ami', 'ec2', 'ec2-spot', 'alb', 'cloudwatch', 'sqs'],
  },

  // ---------------------------------------------------------------- 5
  {
    id: 'm2-sqs',
    module: 'm2',
    domain: 'resilient',
    title: 'SQS: The Buffer',
    minutes: 22,
    summary:
      'Explain the SQS message lifecycle (visibility timeout, delete, at-least-once), choose Standard vs FIFO, and configure long polling, dead-letter queues and consumer scaling.',
    analogy: {
      title: 'The ticket rail in a kitchen',
      body:
        "Waiters clip order tickets onto a rail; cooks take a ticket when they are ready. When a cook takes a ticket, it is flipped face down for a few minutes so nobody else cooks the same dish. If the cook finishes, the ticket goes in the bin (deleted). If the cook burns their hand and walks off, the ticket flips back face up after a few minutes and another cook picks it up.\n\nA ticket that has made three cooks fail (a dish nobody can make) is moved to the manager's clipboard so it stops blocking the rail: that is a **dead-letter queue**. A **FIFO** rail is a strict one where each table's tickets must be cooked in the exact order they were written.",
    },
    sections: [
      {
        heading: 'What SQS is',
        body:
          "**Amazon Simple Queue Service (SQS)** is a fully managed message queue. A **producer** sends a message; SQS stores it redundantly across multiple AZs; a **consumer** **polls** (pulls) the queue, processes the message and deletes it. There are no servers or brokers to manage and no capacity to provision: Standard queues scale to practically unlimited throughput.\n\nSQS is the default answer whenever a question says **decouple**, **buffer**, **smooth out spikes**, or **do not lose requests if the backend is down**. You pay per request (about $0.40 per million after the free tier of 1 million per month), with each 64 KB chunk of a payload counting as one request.",
      },
      {
        heading: 'The message lifecycle',
        body:
          "1. **SendMessage**: the producer writes a message (up to **1 MiB** since August 2025; older material says 256 KB). For bigger payloads, store the object in S3 and enqueue a pointer (the SQS Extended Client Library does this for you).\n2. **ReceiveMessage**: a consumer asks for up to 10 messages. Each received message becomes **invisible** to other consumers for the **visibility timeout** (default **30 s**, range 0 s to 12 hours).\n3. **DeleteMessage**: when processing succeeds, the consumer deletes the message using its receipt handle.\n4. If the consumer **crashes or times out**, it never deletes. The visibility timeout expires, the message reappears, and another consumer receives it.\n\nThis is the durability model, and it implies **at-least-once delivery**: a message can be processed twice (for example, the consumer finished the work but crashed before deleting). Design consumers to be **idempotent**, meaning safe to run twice, for example by recording processed order IDs in DynamoDB with a conditional write.\n\nSet the visibility timeout longer than your worst-case processing time (AWS suggests about 6x the Lambda function timeout when Lambda consumes). Long jobs can call `ChangeMessageVisibility` to extend it.\n\nOther settings: **retention** 1 minute to **14 days** (default **4 days**); **delay queues** hide new messages for 0–15 minutes; encryption with SSE-SQS or SSE-KMS.",
      },
      {
        heading: 'Standard vs FIFO',
        body:
          "A **FIFO queue** (name must end in `.fifo`) guarantees strict ordering **within a message group** and **exactly-once processing** (deduplication over a 5-minute window, using a `MessageDeduplicationId` or content-based deduplication). Ordering is per `MessageGroupId`: use the customer ID as the group, and each customer's messages stay in order while different customers process in parallel.\n\nYou cannot convert an existing Standard queue to FIFO; you create a new queue.",
        table: {
          headers: ['', 'Standard', 'FIFO'],
          rows: [
            ['Throughput', 'Nearly unlimited', '300 msg/s per API action, 3,000 with batches of 10; much higher in high-throughput mode'],
            ['Ordering', 'Best-effort', 'Strict within a MessageGroupId'],
            ['Delivery', 'At-least-once (occasional duplicates)', 'Exactly-once processing (5-min dedup window)'],
            ['Name', 'Any', 'Must end in .fifo'],
            ['Typical use', 'Buffering work, decoupling, spikes', 'Payments, inventory, commands where order matters'],
          ],
        },
      },
      {
        heading: 'Long polling vs short polling',
        body:
          "With **short polling** (the default, wait time 0), `ReceiveMessage` returns immediately, often empty, and queries only a subset of SQS servers. Consumers in a tight loop make huge numbers of empty, billable calls.\n\nWith **long polling**, the call waits up to **20 seconds** (`WaitTimeSeconds` on the call, or `ReceiveMessageWaitTimeSeconds` on the queue) for a message to arrive and checks all servers. Result: far fewer API calls, lower cost, and lower latency for new messages. Whenever a question mentions SQS cost, empty receives, or CPU wasted polling, the answer is almost always **enable long polling**.",
      },
      {
        heading: 'Dead-letter queues: stop poison messages',
        body:
          "A **poison message** is one that always fails (malformed JSON, a reference to a deleted record). Without protection it cycles forever: received, fails, reappears, received again, burning consumer time and hiding behind it.\n\nA **redrive policy** names a **dead-letter queue (DLQ)** and a `maxReceiveCount` (for example 5). After 5 failed receives the message moves to the DLQ, where you alarm on it and inspect it. Once fixed, **DLQ redrive** moves messages back to the source queue.\n\n- The DLQ must be the same type as the source (FIFO source → FIFO DLQ).\n- Set the DLQ retention longer than the source queue's, because a Standard message keeps its original enqueue timestamp.\n- Add a CloudWatch alarm on `ApproximateNumberOfMessagesVisible` for the DLQ.",
      },
      {
        heading: 'Scaling consumers',
        body:
          "- **EC2 workers in an ASG**: target tracking on **backlog per instance** (see the Auto Scaling lesson). Use scale-in protection or termination lifecycle hooks for long jobs.\n- **Lambda**: an event source mapping polls the queue for you (long polling included), invokes your function with batches (up to 10 messages for FIFO, up to 10,000 with a batching window for Standard), deletes messages on success, and scales concurrency up as the backlog grows. Report partial batch failures so only failed messages return to the queue.\n- **ECS services** can scale on the same queue metric.\n\nKey CloudWatch metrics: `ApproximateNumberOfMessagesVisible` (backlog), `ApproximateAgeOfOldestMessage` (are we falling behind?), `NumberOfEmptyReceives` (turn on long polling).",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Decouple', 'buffer', 'absorb spikes', 'backend may be unavailable' → SQS.\n- 'Exactly once' and 'in order' (especially payments) → SQS FIFO with MessageGroupId = customer or account ID.\n- 'Duplicate processing occasionally happens' with Standard → make consumers idempotent (or move to FIFO if order and dedup are required).\n- 'Message processed twice because processing takes longer than expected' → increase the visibility timeout.\n- 'High cost / many empty responses' → long polling.\n- 'Some messages fail repeatedly and block processing' → DLQ with maxReceiveCount.\n- 'Payloads larger than the limit' → S3 + pointer in the message.",
      },
    ],
    diagram: {
      title: 'Visibility timeout, retries and the dead-letter queue',
      nodes: [
        { id: 'web', label: 'Producer', icon: 'ec2', x: 10, y: 28, sub: 'web tier' },
        { id: 'sqs', label: 'orders queue', icon: 'sqs', x: 34, y: 28, sub: 'Standard, 30 s VT' },
        { id: 'dlq', label: 'orders-dlq', icon: 'sqs', x: 34, y: 50, sub: 'maxReceiveCount 5' },
        { id: 'w1', label: 'Worker 1', icon: 'ec2', x: 60, y: 16 },
        { id: 'w2', label: 'Worker 2', icon: 'ec2', x: 60, y: 40 },
        { id: 'db', label: 'Orders table', icon: 'dynamodb', x: 86, y: 28, sub: 'idempotent writes' },
      ],
      edges: [
        { id: 'e-send', from: 'web', to: 'sqs', label: 'SendMessage' },
        { id: 'e-w1', from: 'sqs', to: 'w1', label: 'Receive' },
        { id: 'e-w2', from: 'sqs', to: 'w2', label: 'Receive' },
        { id: 'e-w1-db', from: 'w1', to: 'db' },
        { id: 'e-w2-db', from: 'w2', to: 'db' },
        { id: 'e-dlq', from: 'sqs', to: 'dlq', label: 'redrive' },
      ],
      steps: [
        {
          caption: 'The producer sends an order message. SQS stores it redundantly across AZs and acknowledges immediately.',
          highlight: ['web', 'sqs'],
          flow: [{ edge: 'e-send' }],
        },
        {
          caption: 'Worker 1 long-polls and receives the message. It becomes invisible to other workers for the 30 s visibility timeout.',
          highlight: ['sqs', 'w1'],
          flow: [{ edge: 'e-w1' }],
        },
        {
          caption: 'Worker 1 crashes before calling DeleteMessage. Nothing is lost: the message is still in the queue, just hidden.',
          highlight: ['w1'],
          fail: ['w1'],
          flow: [{ edge: 'e-w1', color: 'bad' }],
        },
        {
          caption: 'The timeout expires, the message reappears, and Worker 2 receives it, writes the order (idempotently, keyed on order ID) and deletes it.',
          highlight: ['w2', 'db', 'sqs'],
          flow: [{ edge: 'e-w2' }, { edge: 'e-w2-db' }],
        },
        {
          caption: 'A malformed message fails on every attempt. After 5 receives the redrive policy moves it to the DLQ so it stops clogging the queue.',
          highlight: ['dlq', 'sqs'],
          flow: [{ edge: 'e-dlq' }],
        },
        {
          caption: 'A CloudWatch alarm on the DLQ alerts the team. Once the bug is fixed, DLQ redrive returns the message to the source queue.',
          highlight: ['dlq'],
          flow: [{ edge: 'e-dlq', reverse: true }],
        },
      ],
    },
    keyFacts: [
      'Visibility timeout default 30 s, max 12 hours.',
      'Message retention 1 minute to 14 days, default 4 days.',
      'Max message size 1 MiB (raised from 256 KB in 2025); larger payloads go in S3 with a pointer.',
      'Long polling waits up to 20 s per ReceiveMessage call.',
      'Standard: nearly unlimited throughput, at-least-once, best-effort order.',
      'FIFO: name ends in .fifo, ordered per MessageGroupId, exactly-once, 300 msg/s per action (3,000 batched).',
      'FIFO deduplication window is 5 minutes.',
      'ReceiveMessage returns up to 10 messages per call.',
      'Delay queues postpone delivery by 0–15 minutes.',
      'A DLQ must be the same queue type as its source.',
    ],
    examTips: [
      "'Process payment messages exactly once and in the order each customer submitted them' → SQS FIFO with MessageGroupId = customer ID. SQS Standard allows duplicates and reordering; SNS has no single-consumer ordering semantics.",
      "'Messages are processed more than once because jobs take longer than 30 seconds' → raise the visibility timeout above the maximum processing time.",
      "'Reduce SQS cost and empty responses' → enable long polling (WaitTimeSeconds up to 20).",
      "'A few bad messages keep failing and block the pipeline' → dead-letter queue with maxReceiveCount.",
      "'Decouple the web tier from order processing so no orders are lost during spikes' → SQS buffer + worker ASG on backlog per instance.",
      "'Payload is several MB' → put it in S3 and send the object key through SQS.",
    ],
    pitfalls: [
      'Assuming SQS deletes a message when it is received: the consumer must call DeleteMessage.',
      'Forgetting that Standard queues can deliver duplicates: non-idempotent consumers double-charge or double-ship.',
      'Choosing FIFO for very high throughput when ordering is not needed: Standard scales further.',
      'Using SQS when many consumers each need their own copy of every message: that is SNS (or EventBridge) fan-out to multiple queues.',
      'Setting the visibility timeout shorter than processing time, causing repeated duplicate processing.',
    ],
    prosCons: [
      {
        option: 'SQS Standard',
        pros: ['Nearly unlimited throughput', 'Cheapest per message', 'No ordering bottlenecks'],
        cons: ['Occasional duplicates', 'Best-effort ordering only'],
        useWhen: 'Buffering and decoupling where consumers are idempotent and order does not matter.',
      },
      {
        option: 'SQS FIFO',
        pros: ['Strict order per message group', 'Exactly-once processing', 'Parallelism across groups'],
        cons: ['Throughput limits (300/3,000 msg/s unless high-throughput mode)', 'Slightly higher price', 'Hot message group becomes a bottleneck'],
        useWhen: "'In order' and 'exactly once': payments, inventory updates, command sequences.",
      },
      {
        option: 'Short polling',
        pros: ['Returns immediately'],
        cons: ['Many empty, billable responses', 'May miss messages on servers not sampled'],
        useWhen: 'Almost never preferred; only when a consumer must never block.',
      },
      {
        option: 'Long polling',
        pros: ['Fewer API calls and lower cost', 'Lower latency for new messages'],
        cons: ['Each call can wait up to 20 s'],
        useWhen: 'Default for consumers; the fix for empty receives and polling cost.',
      },
    ],
    services: ['sqs', 'lambda', 'ec2', 'auto-scaling', 'cloudwatch', 's3', 'dynamodb'],
  },

  // ---------------------------------------------------------------- 6
  {
    id: 'm2-sns-eventbridge',
    module: 'm2',
    domain: 'resilient',
    title: 'SNS, EventBridge & Fan-out',
    minutes: 20,
    summary:
      'Use SNS for push fan-out, combine it with SQS for durable independent consumers, and choose EventBridge when events must be routed by content, scheduled, archived or sent across accounts.',
    analogy: {
      title: 'The town crier and the mail sorting office',
      body:
        "**SNS** is a town crier with a megaphone: the moment news arrives, it is shouted to everyone who signed up to hear it. If you were not listening at that moment, you missed it; the crier keeps no notes. So people who must not miss anything put a **letterbox** (an SQS queue) under the crier, and every announcement drops a copy into each letterbox to be read later.\n\n**EventBridge** is a mail sorting office. Every letter that comes in is opened, its contents read, and rules decide where it goes: 'invoices over $1,000 to finance', 'anything from the warehouse to logistics'. It can also send a letter on a timetable, keep an archive of everything that passed through, and forward mail to other offices.",
    },
    sections: [
      {
        heading: 'The problem: one event, many reactions',
        body:
          "When an order is placed, billing must charge, the warehouse must ship, analytics must record, and maybe a fraud check must run. If the order service calls each one directly, it is tightly coupled to all of them: one slow consumer delays the order, one dead consumer breaks it, and adding a fifth consumer means changing and redeploying the order service.\n\nThe fix is **publish/subscribe (pub/sub)**: the producer publishes one event to an intermediary and does not know or care who consumes it. AWS gives you two main intermediaries: **SNS** for high-fan-out push, and **EventBridge** for content-based routing between services.",
      },
      {
        heading: 'SNS: the megaphone',
        body:
          "**Amazon Simple Notification Service (SNS)** is pub/sub **push**. Publishers send a message to a **topic**; SNS immediately pushes a copy to every **subscription**.\n\n- **Subscriber types**: SQS queues, Lambda functions, HTTP/HTTPS endpoints, email, SMS, mobile push (APNs, FCM), and Amazon Data Firehose.\n- **No storage**: once delivered (or retries are exhausted), the message is gone. SNS retries failed deliveries according to each protocol's policy, and you can attach an SQS **dead-letter queue to a subscription** to catch undeliverable messages.\n- **Message filtering**: a **filter policy** on each subscription (on message attributes or the JSON payload) means a subscriber receives only matching messages, for example only orders with `amount > 100`. This keeps filtering logic out of consumers.\n- **SNS FIFO topics** preserve order and deduplicate, and deliver to SQS queues for ordered fan-out.\n- Max message size 256 KB; use S3 pointers for larger payloads.",
      },
      {
        heading: 'The fan-out pattern: SNS + SQS',
        body:
          "Because SNS keeps nothing, pushing straight to a worker is fragile: if the worker is down, it misses messages. The canonical pattern pairs them:\n\n**Producer → SNS topic → one SQS queue per consumer → each consumer polls its own queue.**\n\n- Each consumer processes **independently, durably, and at its own pace**. A shipping outage just lets the shipping queue grow for up to 14 days; billing keeps working.\n- Adding a consumer is just a new queue and subscription; the producer never changes.\n- Each queue can have its own DLQ, visibility timeout and scaling.\n- Configuration: the SQS queue's access policy must allow the SNS topic to `SendMessage`; enable **raw message delivery** to receive the body without the SNS JSON envelope. Cross-account and cross-Region subscriptions are supported.\n\nCompare this with one SQS queue shared by all consumers: SQS delivers each message to **one** consumer, so the consumers would steal messages from each other rather than each getting a copy.",
      },
      {
        heading: 'EventBridge: the router',
        body:
          "**Amazon EventBridge** is a serverless **event bus**. An event is a JSON document with fields like `source`, `detail-type` and `detail`.\n\n- **Buses**: the **default bus** receives events from nearly every AWS service automatically (an EC2 instance changing state, a CodePipeline failure, a GuardDuty finding); **custom buses** take your applications' events; **partner buses** receive events from SaaS providers such as Zendesk, Datadog or Shopify.\n- **Rules** match events with **event patterns** (exact values, prefixes, numeric ranges, existence checks) and send matches to up to **5 targets** per rule: Lambda, Step Functions, SQS, SNS, ECS tasks, Kinesis, API destinations (any HTTP API), another event bus in another account or Region, and more (20+ target types).\n- **Input transformers** reshape the event before delivery.\n- **Archive and replay**: keep events and replay them later (for example after fixing a bug in a consumer).\n- **Schema registry** discovers event structures and generates code bindings.\n- Delivery is retried for up to 24 hours with backoff; attach an SQS DLQ to a target for events that still fail.\n\nRelated: **EventBridge Scheduler** runs one-time or recurring (cron/rate) invocations at scale with time zones, and is the modern replacement for scheduled rules. **EventBridge Pipes** connect a single source (SQS, Kinesis, DynamoDB Streams) to a target with optional filtering and enrichment.",
      },
      {
        heading: 'SNS vs EventBridge vs SQS',
        body:
          "These three are often offered side by side. The distinction: SQS **holds** work for one consumer group; SNS **pushes** copies to many subscribers fast; EventBridge **routes** events by content between services and accounts.",
        table: {
          headers: ['', 'SQS', 'SNS', 'EventBridge'],
          rows: [
            ['Model', 'Queue, consumer pulls', 'Pub/sub, push', 'Event bus, rules route'],
            ['Each message goes to', 'One consumer', 'Every subscriber', 'Every matching rule target'],
            ['Stores messages?', 'Yes, up to 14 days', 'No', 'Only if you enable archive'],
            ['Filtering', 'None (consumer decides)', 'Filter policies per subscription', 'Rich event patterns on any field'],
            ['Sources', 'Your producers', 'Your producers, some AWS services', 'AWS services, your apps, SaaS partners'],
            ['Special features', 'DLQ, FIFO, delay', 'SMS, email, mobile push, huge fan-out', 'Schedules, archive/replay, schema registry, cross-account'],
            ['Trigger phrase', "'buffer', 'decouple'", "'notify many', 'fan-out'", "'when X happens in service A, trigger B'"],
          ],
        },
      },
      {
        heading: 'S3 events: direct notification vs EventBridge',
        body:
          "S3 can send **event notifications** (object created, removed, restored) directly to an SQS queue, SNS topic or Lambda function, filtered by key prefix and suffix. The limits: you cannot send the same event type with overlapping filters to multiple destinations, and every new consumer means editing the bucket's notification configuration.\n\nTwo better options when several consumers must react:\n\n- **S3 → SNS topic → subscribers** (Lambda functions, SQS queues). Adding a consumer is a new subscription.\n- **S3 → EventBridge** (turn on 'send notifications to EventBridge' on the bucket): rules can match on object size, key, metadata and more, route to many targets, and archive/replay.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'One event, multiple independent consumers, each must not lose messages' → SNS → SQS fan-out.\n- 'Each subscriber only needs some messages' → SNS filter policies (or EventBridge rules).\n- 'React when an AWS service does something' (instance terminated, CloudTrail API call, Health event) → EventBridge rule.\n- 'Route events from a SaaS application' → EventBridge partner event source.\n- 'Run a job every night at 02:00' (serverless cron) → EventBridge Scheduler.\n- 'Send events to another AWS account' → EventBridge cross-account bus target.\n- 'Email or SMS alerts' → SNS.",
      },
    ],
    diagram: {
      title: 'SNS to SQS fan-out with an independent consumer outage',
      nodes: [
        { id: 'orders', label: 'Order service', icon: 'ec2', x: 8, y: 31 },
        { id: 'sns', label: 'OrderPlaced', icon: 'sns', x: 28, y: 31, sub: 'SNS topic' },
        { id: 'q-bill', label: 'billing queue', icon: 'sqs', x: 52, y: 10 },
        { id: 'q-ship', label: 'shipping queue', icon: 'sqs', x: 52, y: 24 },
        { id: 'q-ana', label: 'analytics queue', icon: 'sqs', x: 52, y: 38, sub: 'filter: amount>100' },
        { id: 'fraud', label: 'Fraud check', icon: 'lambda', x: 52, y: 52, sub: 'added later' },
        { id: 'c-bill', label: 'Billing', icon: 'lambda', x: 78, y: 10 },
        { id: 'c-ship', label: 'Shipping', icon: 'ec2', x: 78, y: 24 },
        { id: 'c-ana', label: 'Analytics', icon: 'ec2', x: 78, y: 38 },
      ],
      edges: [
        { id: 'e-pub', from: 'orders', to: 'sns', label: 'Publish' },
        { id: 'e-s-bill', from: 'sns', to: 'q-bill' },
        { id: 'e-s-ship', from: 'sns', to: 'q-ship' },
        { id: 'e-s-ana', from: 'sns', to: 'q-ana' },
        { id: 'e-s-fraud', from: 'sns', to: 'fraud', dashed: true },
        { id: 'e-bill', from: 'q-bill', to: 'c-bill' },
        { id: 'e-ship', from: 'q-ship', to: 'c-ship' },
        { id: 'e-ana', from: 'q-ana', to: 'c-ana' },
      ],
      steps: [
        {
          caption: 'The order service publishes one OrderPlaced message to the SNS topic. It does not know who consumes it.',
          highlight: ['orders', 'sns'],
          flow: [{ edge: 'e-pub' }],
        },
        {
          caption: 'SNS pushes a copy to every subscribed queue at once. Analytics has a filter policy, so it only gets orders over $100.',
          highlight: ['q-bill', 'q-ship', 'q-ana'],
          flow: [{ edge: 'e-s-bill' }, { edge: 'e-s-ship' }, { edge: 'e-s-ana' }],
        },
        {
          caption: 'Each consumer polls its own queue at its own pace, with its own DLQ and scaling.',
          highlight: ['c-bill', 'c-ship', 'c-ana'],
          flow: [{ edge: 'e-bill' }, { edge: 'e-ship' }, { edge: 'e-ana' }],
        },
        {
          caption: 'The shipping service goes down. Billing and analytics keep working; shipping messages pile up safely in their queue.',
          highlight: ['q-ship', 'c-bill', 'c-ana'],
          fail: ['c-ship'],
          flow: [{ edge: 'e-s-ship' }, { edge: 'e-ship', color: 'bad' }],
        },
        {
          caption: 'Shipping recovers and drains its backlog. No order was lost and the order service never noticed the outage.',
          highlight: ['c-ship', 'q-ship'],
          flow: [{ edge: 'e-ship' }],
        },
        {
          caption: 'A new fraud-check Lambda is added by creating one more subscription. The producer code is untouched.',
          highlight: ['fraud', 'sns'],
          flow: [{ edge: 'e-s-fraud' }],
        },
      ],
    },
    keyFacts: [
      'SNS pushes to SQS, Lambda, HTTP/S, email, SMS, mobile push and Data Firehose.',
      'SNS does not store messages after delivery; pair with SQS for durability.',
      'SNS filter policies can match message attributes or the message body.',
      'SNS max message size 256 KB.',
      'SNS FIFO topics give ordered, deduplicated fan-out to SQS queues.',
      'EventBridge rules: up to 5 targets per rule; 20+ target types.',
      'EventBridge default bus receives AWS service events automatically; partner buses receive SaaS events.',
      'EventBridge supports archive and replay, schema registry and cross-account/cross-Region delivery.',
      'EventBridge Scheduler handles one-time and recurring schedules with time zones.',
      'An SQS queue delivers each message to one consumer; fan-out needs one queue per consumer.',
    ],
    examTips: [
      "'When a new object lands in S3, three systems must react independently and more may be added later' → S3 → SNS topic (or EventBridge) → subscribers. Direct per-bucket notifications or a Lambda that calls each system synchronously are the distractors.",
      "'One event, many independent consumers, none may lose messages' → SNS → SQS fan-out.",
      "'Only some subscribers should receive certain messages' → SNS subscription filter policies.",
      "'When an EC2 instance is terminated, run a Lambda' → EventBridge rule on the default bus.",
      "'Ingest events from a SaaS provider' → EventBridge partner event bus.",
      "'Replay past events after fixing a consumer bug' → EventBridge archive and replay.",
      "'Send SMS or email notifications' → SNS.",
    ],
    pitfalls: [
      'Pointing several consumers at one SQS queue and expecting each to get every message.',
      'Subscribing a worker directly to SNS over HTTP and losing messages while it is down: put SQS in between.',
      'Forgetting the SQS access policy that lets the SNS topic send messages.',
      'Choosing SNS when the requirement is content-based routing of AWS service events across accounts: that is EventBridge.',
      'Using Lambda to call other services one after another as the fan-out mechanism: tight coupling, one failure blocks the rest.',
    ],
    prosCons: [
      {
        option: 'SNS (alone)',
        pros: ['Millisecond push to huge numbers of subscribers', 'Email, SMS and mobile push built in', 'Simple filter policies'],
        cons: ['No storage; offline subscribers miss messages', 'Limited content filtering compared with EventBridge'],
        useWhen: 'Notifications and alerts, or as the fan-out hub in front of SQS.',
      },
      {
        option: 'SNS + SQS fan-out',
        pros: ['Each consumer durable and independent', 'Per-consumer DLQs and scaling', 'Add consumers without touching producers'],
        cons: ['More resources to manage (one queue per consumer)', 'Consumers must be idempotent'],
        useWhen: 'Several back-end systems must each reliably process every event.',
      },
      {
        option: 'EventBridge',
        pros: ['Rich content-based routing', 'Native AWS service and SaaS sources', 'Archive/replay, schedules, cross-account buses'],
        cons: ['Higher per-event cost than SNS at large volume', 'Somewhat higher delivery latency than SNS', 'Max 5 targets per rule'],
        useWhen: "'When X happens in service A, do B', SaaS integration, or cross-account event routing.",
      },
      {
        option: 'Direct calls from the producer',
        pros: ['Simple for one consumer'],
        cons: ['Tight coupling', 'Every new consumer changes the producer', 'One failure blocks the rest'],
        useWhen: 'Only when there is a single consumer that must answer synchronously.',
      },
    ],
    services: ['sns', 'sqs', 'eventbridge', 'lambda', 's3', 'data-firehose'],
  },

  // ---------------------------------------------------------------- 7
  {
    id: 'm2-step-functions',
    module: 'm2',
    domain: 'resilient',
    title: 'Step Functions & Other Integration Services',
    minutes: 18,
    summary:
      'Orchestrate multi-step workflows with Step Functions (retries, catches, parallel branches, human approval), pick Standard vs Express, and recognize when Amazon MQ, Kinesis, AppFlow or AppSync is the right integration service instead.',
    analogy: {
      title: 'The wedding planner',
      body:
        "A wedding involves the florist, the caterer, the band and the venue, in a particular order, with some things happening at the same time. You could ask the florist to phone the caterer when done, who phones the band, who phones the venue. If the caterer's phone is off, the whole chain silently stops and nobody knows where it broke.\n\nA **wedding planner** holds the checklist instead. They call each supplier in turn, retry if the line is busy, call the backup caterer if the first one cancels, wait for the couple to sign off on the menu (which might take a week), and can show you exactly which step you are on. **Step Functions** is that planner for your cloud services.",
    },
    sections: [
      {
        heading: 'The problem: chaining functions by hand',
        body:
          "A checkout might need five steps: validate the order, reserve inventory, charge the card, create the shipment, email the customer. The tempting design is **Lambda calling Lambda**: function A invokes B and waits, B invokes C, and so on. It breaks down quickly:\n\n- **You pay twice**: A is billed while it sits waiting for B.\n- **Hard limits**: a Lambda invocation runs at most 15 minutes, so a workflow that waits for a human approval cannot fit.\n- **Error handling is hand-written** in every function: retries, backoff, what to undo if step 4 fails after step 3 charged the card.\n- **No visibility**: when an order gets stuck, there is no single place to see which step failed.\n\nThe exam phrase 'coordinate multiple Lambda functions with retries' or 'human approval step' points to an **orchestrator**.",
      },
      {
        heading: 'Step Functions: state machines as a service',
        body:
          "**AWS Step Functions** runs **state machines** defined in JSON (Amazon States Language) or drawn in Workflow Studio. Each **execution** moves through **states**:\n\n- **Task**: do work by calling Lambda or, via direct service integrations, 200+ AWS services (DynamoDB PutItem, SQS SendMessage, ECS RunTask, Glue job, Bedrock, SageMaker) without writing glue code.\n- **Choice**: branch on data (`amount > 10000` → manual approval).\n- **Parallel**: run branches simultaneously and wait for all.\n- **Map**: run the same steps for each item in an array; **Distributed Map** fans out to up to 10,000 parallel child executions, for example over millions of S3 objects.\n- **Wait**: pause for a duration or until a timestamp.\n- **Pass, Succeed, Fail**: shape data and end the execution.\n\nThree integration patterns matter:\n\n- **Request-response**: call the service and move on.\n- **Run a job (.sync)**: start an ECS task, Glue job or Batch job and wait until it finishes.\n- **Wait for callback (.waitForTaskToken)**: pass a token to an external party (a human via email, an on-premises system) and pause until someone calls `SendTaskSuccess` or `SendTaskFailure` with that token. This is how you build human-approval steps.",
      },
      {
        heading: 'Built-in retries and error handling',
        body:
          "Every Task state can declare:\n\n- **Retry**: which errors to retry (`States.Timeout`, `States.TaskFailed`, a specific Lambda error), the first interval (default 1 s), **MaxAttempts** (default 3) and **BackoffRate** (default 2.0, so 1 s, 2 s, 4 s), optionally with a maximum delay and jitter.\n- **Catch**: when retries are exhausted, go to a fallback state, for example a **compensation** step that refunds the charge and releases the inventory (the saga pattern).\n- **TimeoutSeconds** and **HeartbeatSeconds**: fail a step that hangs.\n\nThis is the core reason Step Functions is a resilience service: transient failures (a throttled API, a cold dependency) are absorbed automatically, and permanent failures are routed to a defined recovery path instead of leaving half-finished orders.",
      },
      {
        heading: 'Standard vs Express workflows',
        body:
          "You choose the workflow type when you create the state machine; it cannot be changed later.",
        table: {
          headers: ['', 'Standard', 'Express'],
          rows: [
            ['Max duration', '1 year', '5 minutes'],
            ['Execution semantics', 'Exactly-once', 'At-least-once (async) or at-most-once (sync)'],
            ['Start rate', 'Thousands per second', '100,000+ per second'],
            ['Pricing', 'Per state transition (about $0.025 per 1,000)', 'Per execution plus duration and memory'],
            ['History', 'Visual history in the console for 90 days', 'Sent to CloudWatch Logs'],
            ['Use for', 'Long-running, auditable business processes, human approval', 'High-volume, short event processing (IoT ingestion, streaming transforms)'],
          ],
        },
      },
      {
        heading: 'Other integration services and when they win',
        body:
          "Step Functions orchestrates; the services below move messages or data. Each has one scenario where it is clearly right.\n\n- **Amazon MQ**: managed **Apache ActiveMQ** or **RabbitMQ** brokers. It speaks standard protocols (AMQP, MQTT, STOMP, OpenWire, JMS). It is **only** the right answer when migrating an existing application that already uses these protocols and cannot be rewritten. For HA, deploy an active/standby broker pair across two AZs (ActiveMQ) or a three-node cluster (RabbitMQ). New cloud-native designs → SQS/SNS.\n- **Amazon Kinesis Data Streams**: ordered, replayable streams. Records are ordered per **shard**, retained 24 hours by default (up to 365 days), and many consumers can read the same data independently. Choose it over SQS for real-time analytics, ordered event logs or multiple readers of the same stream.\n- **Amazon AppFlow**: no-code, scheduled or event-driven data transfer between SaaS apps (Salesforce, SAP, Zendesk, Slack) and AWS (S3, Redshift).\n- **AWS AppSync**: managed GraphQL APIs with real-time subscriptions and offline sync for mobile and web apps.",
        table: {
          headers: ['Need', 'Service'],
          rows: [
            ['Buffer work for one consumer group', 'SQS'],
            ['Push one message to many subscribers', 'SNS'],
            ['Route events by content, SaaS sources, schedules', 'EventBridge'],
            ['Multi-step workflow with retries, branches, approvals', 'Step Functions'],
            ['Legacy app uses AMQP / MQTT / JMS / STOMP', 'Amazon MQ'],
            ['Ordered, replayable stream read by many consumers', 'Kinesis Data Streams'],
            ['Copy data from Salesforce/SAP into S3 on a schedule', 'AppFlow'],
            ['GraphQL API with real-time updates', 'AppSync'],
          ],
        },
      },
      {
        heading: 'Kinesis Data Streams vs SQS',
        beyond: true,
        body:
          "Both carry messages, and the exam likes to contrast them.\n\n- **Consumption**: SQS deletes a message once processed and each message goes to one consumer. Kinesis keeps records for the retention period; any number of applications read the same records, each tracking its own position, and you can **replay** from any point.\n- **Ordering**: SQS Standard has none, SQS FIFO orders per message group. Kinesis orders per shard by partition key.\n- **Scaling**: SQS scales invisibly. Kinesis scales by shards (each shard: 1 MB/s or 1,000 records/s in, 2 MB/s out) or with on-demand capacity mode.\n\nRule of thumb: 'job queue' → SQS; 'real-time stream, analytics, multiple consumers, replay' → Kinesis.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Coordinate several Lambda functions with retries and error handling' → Step Functions, not Lambda calling Lambda.\n- 'Workflow includes a human approval that may take days' → Step Functions Standard with a `.waitForTaskToken` callback.\n- 'High-volume, short-lived event processing, cost-sensitive' → Express workflows.\n- 'Process millions of S3 objects in parallel' → Step Functions Distributed Map.\n- 'Migrate an on-premises app using ActiveMQ/RabbitMQ/JMS/AMQP with minimal code change' → Amazon MQ.\n- 'Multiple applications must read the same real-time data stream and replay it' → Kinesis Data Streams.",
      },
    ],
    diagram: {
      title: 'Order workflow with approval callback and automatic retry',
      nodes: [
        { id: 'api', label: 'API Gateway', icon: 'api-gateway', x: 8, y: 30, sub: 'POST /orders' },
        { id: 'sfn', label: 'Order workflow', icon: 'step-functions', x: 26, y: 30, sub: 'Standard' },
        { id: 'validate', label: 'Validate', icon: 'lambda', x: 46, y: 14 },
        { id: 'charge', label: 'Charge card', icon: 'lambda', x: 66, y: 14, sub: 'Retry x3, backoff 2' },
        { id: 'ddb', label: 'Orders table', icon: 'dynamodb', x: 86, y: 14 },
        { id: 'sns', label: 'Approval email', icon: 'sns', x: 46, y: 46, sub: 'task token' },
        { id: 'manager', label: 'Manager', icon: 'user', x: 70, y: 46 },
      ],
      edges: [
        { id: 'e-api-sfn', from: 'api', to: 'sfn', label: 'StartExecution' },
        { id: 'e-sfn-val', from: 'sfn', to: 'validate' },
        { id: 'e-val-charge', from: 'validate', to: 'charge' },
        { id: 'e-charge-ddb', from: 'charge', to: 'ddb' },
        { id: 'e-sfn-sns', from: 'sfn', to: 'sns', label: 'amount > 10k', dashed: true },
        { id: 'e-sns-mgr', from: 'sns', to: 'manager' },
        { id: 'e-mgr-sfn', from: 'manager', to: 'sfn', label: 'SendTaskSuccess', dashed: true },
      ],
      steps: [
        {
          caption: 'API Gateway starts a Standard workflow execution for a new order. Every step will be recorded in the execution history.',
          highlight: ['api', 'sfn'],
          flow: [{ edge: 'e-api-sfn' }],
        },
        {
          caption: 'Task state: the Validate Lambda checks the order. Step Functions passes its output to the next state.',
          highlight: ['sfn', 'validate'],
          flow: [{ edge: 'e-sfn-val' }],
        },
        {
          caption: 'Choice state: the amount is over $10,000, so the workflow publishes an approval email with a task token and pauses. It can wait up to a year at no compute cost.',
          highlight: ['sfn', 'sns', 'manager'],
          flow: [{ edge: 'e-sfn-sns' }, { edge: 'e-sns-mgr' }],
        },
        {
          caption: 'The manager clicks Approve, which calls SendTaskSuccess with the token. The execution resumes exactly where it paused.',
          highlight: ['manager', 'sfn'],
          flow: [{ edge: 'e-mgr-sfn' }],
        },
        {
          caption: "The payment provider times out. The Charge state's Retry policy waits 1 s, then 2 s, then 4 s instead of failing the order.",
          highlight: ['charge'],
          fail: ['charge'],
          flow: [{ edge: 'e-val-charge', color: 'bad' }],
        },
        {
          caption: 'The retry succeeds and the order is written to DynamoDB via a direct service integration. Had all retries failed, a Catch would route to a refund-and-release compensation step.',
          highlight: ['charge', 'ddb'],
          flow: [{ edge: 'e-val-charge' }, { edge: 'e-charge-ddb' }],
        },
      ],
    },
    keyFacts: [
      'Standard workflows run up to 1 year with exactly-once execution; Express up to 5 minutes, at-least-once (async).',
      'Standard is billed per state transition; Express per execution and duration.',
      'Retry defaults: interval 1 s, MaxAttempts 3, BackoffRate 2.0.',
      'Catch routes to a fallback state when retries are exhausted (saga/compensation).',
      '.waitForTaskToken pauses until SendTaskSuccess/SendTaskFailure: the human-approval pattern.',
      'Distributed Map runs up to 10,000 parallel child executions.',
      'Step Functions integrates directly with 200+ AWS services without Lambda glue code.',
      'Amazon MQ = managed ActiveMQ/RabbitMQ for AMQP, MQTT, STOMP, OpenWire, JMS.',
      'Kinesis Data Streams retention 24 h default, up to 365 days; ordered per shard; replayable.',
    ],
    examTips: [
      "'Coordinate multiple Lambda functions with retries / human approval' → Step Functions, not Lambda-calling-Lambda.",
      "'Workflow may wait days for a person' → Standard workflow with a task token callback.",
      "'Very high volume, short duration, lowest cost per execution' → Express workflow.",
      "'Existing app uses JMS/AMQP/MQTT and cannot be rewritten' → Amazon MQ. New cloud-native designs → SQS/SNS.",
      "'Several consumers need to read and replay the same stream in order' → Kinesis Data Streams rather than SQS.",
      "'Pull data from Salesforce into S3 without code' → AppFlow.",
    ],
    pitfalls: [
      'Choosing Amazon MQ for a new application: it is a migration answer, SQS/SNS are the cloud-native default.',
      'Choosing Express for a workflow longer than 5 minutes or one that needs exactly-once execution.',
      'Building retries inside each Lambda instead of using the state machine Retry/Catch fields.',
      'Using SQS when consumers must replay past data: SQS deletes processed messages.',
    ],
    prosCons: [
      {
        option: 'Step Functions Standard',
        pros: ['Up to 1 year', 'Exactly-once', 'Full visual audit history', 'Callbacks for human steps'],
        cons: ['Lower start rate', 'Cost per state transition adds up at very high volume'],
        useWhen: 'Business processes: orders, approvals, ETL orchestration.',
      },
      {
        option: 'Step Functions Express',
        pros: ['100,000+ executions per second', 'Cheap for short, high-volume work'],
        cons: ['5-minute limit', 'At-least-once (async)', 'History only in CloudWatch Logs'],
        useWhen: 'High-volume event or streaming transforms that finish quickly.',
      },
      {
        option: 'Lambda calling Lambda',
        pros: ['No extra service'],
        cons: ['Pay for waiting', '15-minute limit', 'Hand-written retries', 'No end-to-end visibility'],
        useWhen: 'Essentially never for multi-step workflows on the exam.',
      },
      {
        option: 'Amazon MQ',
        pros: ['Standard protocols, lift-and-shift of existing brokers', 'Active/standby across AZs'],
        cons: ['Brokers to size and pay for hourly', 'Lower scale than SQS/SNS'],
        useWhen: 'Migrating apps that already use ActiveMQ/RabbitMQ protocols.',
      },
      {
        option: 'Kinesis Data Streams',
        pros: ['Ordered per shard', 'Replay', 'Many independent consumers'],
        cons: ['Shard capacity planning (unless on-demand)', 'More complex consumers'],
        useWhen: 'Real-time streaming, analytics, event logs read by several apps.',
      },
    ],
    services: ['step-functions', 'lambda', 'api-gateway', 'sns', 'dynamodb', 'mq', 'kinesis-data-streams', 'appflow', 'appsync', 'sqs'],
  },

  // ---------------------------------------------------------------- 8
  {
    id: 'm2-route53',
    module: 'm2',
    domain: 'resilient',
    title: 'Route 53 Routing Policies & Health Checks',
    minutes: 22,
    summary:
      'Use Route 53 hosted zones, Alias records and the eight routing policies with health checks to build active-passive and active-active failover, and know where DNS caching limits failover speed.',
    analogy: {
      title: 'The phone directory with a brain',
      body:
        "DNS is a phone directory: you look up 'Pizza Palace' and get a number. A plain directory always gives the same number. **Route 53** is a directory operator who thinks before answering.\n\nIt can say 'the downtown branch is closed today, call the uptown branch' (**failover**), 'you're calling from Paris, here is the Paris branch' (**geolocation**), 'this branch will answer you fastest' (**latency**), or 'send 1 in 10 callers to the new branch so we can see how it does' (**weighted**). The catch: callers write the number on a sticky note and keep using it for a while (the **TTL**), so a change takes effect only when the note expires.",
    },
    sections: [
      {
        heading: 'DNS and Route 53 basics',
        body:
          "**DNS (Domain Name System)** translates names like `shop.example.com` into IP addresses. **Amazon Route 53** is AWS's managed DNS service (port 53 is the DNS port). It is a global service with a **100% availability SLA**.\n\n- A **hosted zone** holds the records for a domain. A **public hosted zone** answers queries from the internet; a **private hosted zone** answers only inside the VPCs you associate with it (for example `db.internal.example.com`). Each hosted zone costs $0.50 per month.\n- **Record types**: **A** (name → IPv4), **AAAA** (name → IPv6), **CNAME** (name → another name), **MX** (mail), **TXT** (verification), **NS** and **SOA** (zone delegation).\n- **TTL (time to live)**: how many seconds resolvers may cache the answer. 300 s is common; 60 s speeds up failover at the cost of more queries.\n- Route 53 can also register domains.",
      },
      {
        heading: 'Alias records: the AWS-specific superpower',
        body:
          "An **Alias record** is a Route 53 extension that points a name at an AWS resource: an ALB/NLB, CloudFront distribution, S3 static website endpoint, API Gateway, Global Accelerator, VPC interface endpoint, or another record in the same zone. Prefer Alias over CNAME for AWS targets every time.",
        table: {
          headers: ['', 'CNAME', 'Alias'],
          rows: [
            ['Works at the zone apex (example.com)?', 'No (DNS standard forbids it)', 'Yes'],
            ['Query charge', 'Charged', 'Free when pointing to AWS resources'],
            ['Follows target IP changes', 'Resolver must do a second lookup', 'Automatically, Route 53 returns the IPs'],
            ['Targets', 'Any DNS name', 'Specific AWS resources'],
            ['TTL', 'You set it', 'Inherited from the target'],
            ['Health', 'Needs its own health check', "Can use 'Evaluate target health'"],
          ],
        },
      },
      {
        heading: 'The eight routing policies',
        body:
          "A **routing policy** decides which answer Route 53 returns for a query. Most can be combined with health checks so unhealthy endpoints are skipped.",
        table: {
          headers: ['Policy', 'Behavior', 'Scenario trigger'],
          rows: [
            ['Simple', 'One record, one or more values returned (random order); no health checks', 'Single endpoint'],
            ['Weighted', 'Split traffic by weights you assign (e.g. 90/10)', 'Blue/green, canary (5% to the new version), gradual migration'],
            ['Latency', "Answer with the Region that has the lowest latency for this user", 'Multi-Region active-active performance'],
            ['Failover', 'Primary while healthy; secondary when its health check fails', 'Active-passive DR (secondary often an S3/CloudFront sorry page)'],
            ['Geolocation', "Route by the user's continent, country or US state; set a default", "Compliance ('EU users stay in EU'), localized content, licensing"],
            ['Geoproximity', 'Route by distance with a tunable bias to grow or shrink a Region’s area', "'Shift more traffic toward Region X gradually'"],
            ['Multivalue answer', 'Up to 8 healthy records returned; client picks one', 'Cheap DNS-level load spreading with health checks (not a load balancer)'],
            ['IP-based', "Route by the client's IP range (CIDR) that you map", "'Users from ISP X / known office ranges go to endpoint Y'"],
          ],
        },
      },
      {
        heading: 'Health checks',
        body:
          "A Route 53 **health check** decides whether an endpoint gets traffic. Three kinds:\n\n- **Endpoint health checks**: about 15 health checkers in different locations around the world probe an IP or domain over HTTP, HTTPS or TCP every **30 s** (or **10 s** for fast checks, extra cost). The endpoint is unhealthy after the **failure threshold** (default **3** consecutive failures) and is considered healthy when more than 18% of checkers report it healthy. HTTP checks can require a string in the first 5,120 bytes of the response. Your security groups must allow the Route 53 health checker IP ranges.\n- **Calculated health checks**: combine other health checks with AND/OR/'at least N of M', for example 'alarm if 2 of 3 web servers fail'.\n- **CloudWatch alarm health checks**: health is the state of a CloudWatch alarm. This is the **only way to health-check private resources** (inside a VPC or on premises), since the public checkers cannot reach them.\n\nAttach health checks to failover, weighted, latency, geolocation and multivalue records to stop routing to a dead Region. For Alias records pointing at an ELB, set **Evaluate target health** = yes instead of creating a separate check.",
      },
      {
        heading: 'Building failover: active-passive and active-active',
        body:
          "**Active-passive**: a **failover** record pair. The primary (an ALB in us-east-1) has a health check; the secondary is a standby Region or, very commonly, a static **maintenance page** on S3 behind CloudFront. When the primary fails its health check, Route 53 starts answering with the secondary automatically.\n\n**Active-active**: several Regions serve traffic at once using **latency** or **weighted** records, each with a health check. When one Region fails, its record is withdrawn and users flow to the others.\n\n**The DNS caveat**: resolvers and clients cache answers for the TTL, and some ignore TTLs, so DNS failover is never instant. Detection (3 × 30 s = 90 s) plus TTL (say 60 s) means a couple of minutes. Lower TTLs help. When the requirement is near-instant failover without depending on DNS caching, **Global Accelerator** (two static anycast IPs that shift traffic between Regions in seconds) is the better tool.",
      },
      {
        heading: 'Private DNS and hybrid resolution',
        beyond: true,
        body:
          "- A **private hosted zone** needs the VPC attributes `enableDnsHostnames` and `enableDnsSupport` set to true, and can be associated with VPCs in other accounts.\n- **Route 53 Resolver** is the DNS server built into every VPC (at the VPC base CIDR + 2, e.g. `10.0.0.2`). **Inbound endpoints** let on-premises servers resolve your private zones; **outbound endpoints** with **forwarding rules** let VPC resources resolve on-premises names (`corp.local`) over Direct Connect or VPN.\n- **Route 53 Application Recovery Controller (ARC)** adds readiness checks and highly available routing controls (on/off switches backed by a cluster across five Regions) for operator-driven, data-plane-only Regional failover.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Point example.com (the apex) at an ALB/CloudFront' → Alias record.\n- 'Automatically fail over to a static maintenance page when the primary Region fails' → failover routing, primary with a health check on the ALB, secondary aliased to S3/CloudFront.\n- 'Send 10% of users to the new version' → weighted.\n- 'Users should reach the Region that is fastest for them' → latency.\n- 'European users must be served from the EU' → geolocation (latency does not guarantee it).\n- 'Gradually shift traffic toward a Region based on location' → geoproximity with bias.\n- 'Health-check a database in a private subnet' → CloudWatch alarm-based health check.\n- 'Failover must not depend on DNS caching' → Global Accelerator.",
      },
    ],
    diagram: {
      title: 'Failover routing between two Regions',
      groups: [
        { id: 'reg-a', label: 'Primary Region us-east-1', kind: 'region', x: 38, y: 4, w: 58, h: 24 },
        { id: 'reg-b', label: 'Secondary Region us-west-2', kind: 'region', x: 38, y: 32, w: 58, h: 24 },
      ],
      nodes: [
        { id: 'user', label: 'User', icon: 'user', x: 8, y: 30 },
        { id: 'r53', label: 'Route 53', icon: 'route53', x: 24, y: 30, sub: 'failover, TTL 60' },
        { id: 'alb-a', label: 'ALB primary', icon: 'alb', x: 52, y: 16, sub: 'health check' },
        { id: 'app-a', label: 'App ASG', icon: 'ec2', x: 80, y: 16 },
        { id: 'alb-b', label: 'ALB secondary', icon: 'alb', x: 52, y: 44, sub: 'warm standby' },
        { id: 'app-b', label: 'App ASG', icon: 'ec2', x: 80, y: 44, sub: 'scaled down' },
      ],
      edges: [
        { id: 'e-u-r53', from: 'user', to: 'r53', label: 'DNS query' },
        { id: 'e-r53-a', from: 'r53', to: 'alb-a', label: 'PRIMARY' },
        { id: 'e-r53-b', from: 'r53', to: 'alb-b', label: 'SECONDARY', dashed: true },
        { id: 'e-a', from: 'alb-a', to: 'app-a' },
        { id: 'e-b', from: 'alb-b', to: 'app-b' },
      ],
      steps: [
        {
          caption: 'The user asks Route 53 for shop.example.com. Both failover records are Alias records pointing at ALBs.',
          highlight: ['user', 'r53'],
          flow: [{ edge: 'e-u-r53' }],
        },
        {
          caption: 'The primary health check is passing, so Route 53 answers with the us-east-1 ALB and traffic flows there.',
          highlight: ['r53', 'alb-a', 'app-a', 'reg-a'],
          flow: [{ edge: 'e-r53-a' }, { edge: 'e-a' }],
        },
        {
          caption: 'Health checkers around the world probe the primary every 30 s. The secondary waits, scaled down.',
          highlight: ['alb-a', 'alb-b'],
        },
        {
          caption: 'us-east-1 has a Regional outage. After 3 consecutive failed checks (about 90 s) the primary is marked unhealthy.',
          highlight: ['reg-a'],
          fail: ['reg-a', 'alb-a', 'app-a'],
          flow: [{ edge: 'e-r53-a', color: 'bad' }],
        },
        {
          caption: 'Route 53 now answers with the secondary. Clients switch once their cached answer expires (TTL 60 s), and the standby ASG scales out.',
          highlight: ['r53', 'alb-b', 'app-b', 'reg-b'],
          flow: [{ edge: 'e-u-r53' }, { edge: 'e-r53-b' }, { edge: 'e-b' }],
        },
        {
          caption: 'Active-active alternative: latency records with health checks would have served both Regions all along and simply withdrawn the dead one.',
          highlight: ['alb-a', 'alb-b', 'r53'],
          flow: [{ edge: 'e-r53-b' }],
        },
      ],
    },
    keyFacts: [
      'Route 53 has a 100% availability SLA; a hosted zone costs $0.50/month.',
      'CNAME cannot be used at the zone apex; Alias can, and Alias queries to AWS resources are free.',
      'Eight routing policies: simple, weighted, latency, failover, geolocation, geoproximity, multivalue answer, IP-based.',
      'Multivalue answer returns up to 8 healthy records.',
      'Health checks: ~15 global checkers, 30 s interval (10 s fast), failure threshold default 3.',
      'Calculated health checks combine other checks; CloudWatch alarm checks are the way to monitor private resources.',
      'Simple routing does not support health checks.',
      'DNS failover speed is limited by detection time plus TTL caching.',
      'Global Accelerator fails over between Regions without relying on DNS changes.',
    ],
    examTips: [
      "'Automatic active-passive failover to a static maintenance page' → Route 53 failover routing: primary with a health check on the ALB, secondary Alias to an S3/CloudFront static site. A manual DNS change is not automatic; Global Accelerator is heavier and cannot point at an S3 page.",
      "'Zone apex must point at an ALB or CloudFront' → Alias record.",
      "'Canary or blue/green by percentage' → weighted routing.",
      "'Data residency: users in a country must be served from a specific Region' → geolocation, not latency.",
      "'Health-check a private resource' → CloudWatch alarm-based health check.",
      "'Gradually expand a Region's share based on geography' → geoproximity with bias.",
      "'Lowest latency for global users across active Regions' → latency routing with health checks.",
    ],
    pitfalls: [
      'Using a CNAME at the apex: not allowed; use Alias.',
      'Expecting latency routing to keep users in a country: it chooses the fastest Region, which can be abroad.',
      'Treating multivalue answer as a load balancer: it is DNS-level spreading only.',
      'Forgetting the TTL: failover takes at least as long as cached answers live.',
      'Blocking Route 53 health checker IPs in the security group, so healthy endpoints look dead.',
    ],
    prosCons: [
      {
        option: 'Failover routing',
        pros: ['Simple active-passive DR', 'Automatic on health check failure', 'Secondary can be a cheap static page'],
        cons: ['Standby idle (or small) until needed', 'DNS caching delays switchover'],
        useWhen: 'Active-passive DR or a maintenance-page fallback.',
      },
      {
        option: 'Weighted routing',
        pros: ['Precise traffic percentages', 'Great for canary and migrations'],
        cons: ['Weights are static until you change them', 'Not latency- or location-aware'],
        useWhen: 'Blue/green, canary, gradual cut-over between stacks.',
      },
      {
        option: 'Latency routing',
        pros: ['Best performance for global users', 'Active-active with health checks'],
        cons: ['No guarantee of country or Region residency'],
        useWhen: 'Multi-Region active-active where speed matters.',
      },
      {
        option: 'Geolocation routing',
        pros: ['Deterministic by country/continent', 'Supports compliance and localization'],
        cons: ['Needs a default record for unmatched locations', 'Not performance-optimized'],
        useWhen: 'Data residency, licensing, language-specific content.',
      },
      {
        option: 'Geoproximity routing',
        pros: ['Bias lets you grow or shrink a Region’s catchment area'],
        cons: ['More complex to reason about'],
        useWhen: "'Shift more traffic toward a Region gradually by geography'.",
      },
      {
        option: 'Multivalue answer',
        pros: ['Up to 8 healthy IPs, cheap client-side spreading'],
        cons: ['Not a real load balancer, clients choose'],
        useWhen: 'Simple DNS-level distribution with health checks and no ELB.',
      },
    ],
    services: ['route53', 'alb', 'cloudfront', 's3', 'cloudwatch', 'global-accelerator'],
  },

  // ---------------------------------------------------------------- 9
  {
    id: 'm2-rds-ha',
    module: 'm2',
    domain: 'resilient',
    title: 'RDS Multi-AZ vs Read Replicas',
    minutes: 20,
    summary:
      'Distinguish RDS Multi-AZ (synchronous, availability) from read replicas (asynchronous, read scaling and DR), know the newer Multi-AZ DB cluster option, and combine them correctly.',
    analogy: {
      title: 'The understudy and the photocopies',
      body:
        "A theatre star has an **understudy** who learns every line in real time and waits backstage. If the star collapses, the understudy walks on within a minute or two, under the same name on the poster, and the audience barely notices. But the understudy never performs while the star is fine. That is **Multi-AZ**.\n\nThe theatre also hands out **photocopies of the script** to journalists who want to read it. The copies are a few seconds out of date, there can be many of them, and reading them never disturbs the star. If the theatre burns down, a photocopy could be turned into a new original by hand. Those are **read replicas**.",
    },
    sections: [
      {
        heading: 'Two different problems',
        body:
          "**Amazon RDS** (Relational Database Service) runs MySQL, PostgreSQL, MariaDB, Oracle, SQL Server and Db2 for you: patching, backups and failover are managed. A single RDS instance in one AZ has two separate weaknesses:\n\n- **Availability**: if the instance, its storage or its AZ fails, the database is down.\n- **Read load**: heavy reporting queries compete with production writes on the same instance.\n\nRDS has a separate feature for each, and the exam retests the distinction endlessly: **Multi-AZ = availability; read replicas = read scaling** (and, as a bonus, a DR building block).",
      },
      {
        heading: 'Multi-AZ DB instance (the classic)',
        body:
          "RDS creates a **standby** instance in a different AZ and replicates **synchronously**: a write is acknowledged to the app only after it lands on both the primary and the standby's storage. Result: **zero data loss** (RPO 0) within the Region.\n\n- The standby is **not readable**: it serves no traffic at all.\n- **Automatic failover** in about **60–120 seconds** on primary failure, AZ outage, storage failure, instance type change, or reboot with failover. RDS flips the **same DNS endpoint** to the standby, so the application needs no change, only reconnect logic.\n- Automated backups are taken from the standby, so backups do not slow the primary.\n- Maintenance and OS patching happen on the standby first, then fail over, to minimize downtime.\n- Converting an existing single-AZ instance to Multi-AZ is an online operation with no downtime.\n- You pay for both instances (roughly double).",
      },
      {
        heading: 'Multi-AZ DB cluster (the newer option)',
        body:
          "For MySQL and PostgreSQL, a **Multi-AZ DB cluster** runs **one writer and two readable standbys**, each in a different AZ (three AZs total).\n\n- Replication is **semi-synchronous**: a commit is acknowledged once at least one standby has it.\n- The standbys **serve reads** through a reader endpoint, so you get some read scaling too.\n- Failover is typically **under 35 seconds**, faster than the classic instance deployment.\n- It uses local NVMe-backed instances and supports a specific set of instance classes.\n\nIf a question describes '1 writer + 2 readable standbys' or 'faster failover than Multi-AZ, still RDS', this is it. It is not Aurora: Aurora has a different shared storage architecture (next lesson).",
      },
      {
        heading: 'Read replicas',
        body:
          "A **read replica** is a copy of the database kept up to date with **asynchronous** replication: the primary commits and returns success immediately, then ships changes to the replica. The replica typically lags by seconds (watch the `ReplicaLag` CloudWatch metric), so reads are **eventually consistent**.\n\n- **Up to 15** replicas for MySQL, MariaDB and PostgreSQL (up to 5 for Oracle and SQL Server).\n- Each replica has its **own endpoint**; the application must send read queries there (or use a proxy/driver that splits reads and writes).\n- Can be in the same AZ, another AZ, or **another Region** (cross-Region replica). Replication traffic within a Region is free; cross-Region transfer is charged.\n- **Automated backups must be enabled** on the source.\n- **No automatic failover**. You can **promote** a replica manually; it becomes a standalone read-write database and replication stops. Promoting a cross-Region replica is a classic DR maneuver (minutes, with RPO equal to the replica lag).\n- A replica can itself be Multi-AZ, and MySQL/MariaDB/PostgreSQL support replicas of replicas.",
      },
      {
        heading: 'Side-by-side comparison',
        body:
          "Memorize this table. Most RDS HA questions are answered by one row of it.",
        table: {
          headers: ['', 'Multi-AZ instance', 'Multi-AZ DB cluster', 'Read replica'],
          rows: [
            ['Purpose', 'Availability', 'Availability + some reads', 'Read scaling, DR building block'],
            ['Replication', 'Synchronous', 'Semi-synchronous', 'Asynchronous'],
            ['Data loss on failover', 'None', 'None', 'Up to the replica lag'],
            ['Readable copies', 'No', '2 readable standbys', 'Yes, up to 15'],
            ['Failover', 'Automatic, ~60–120 s, same endpoint', 'Automatic, typically < 35 s', 'Manual promotion'],
            ['Location', 'Second AZ, same Region', 'Three AZs, same Region', 'Same AZ, other AZ or other Region'],
            ['Engines', 'All RDS engines', 'MySQL, PostgreSQL', 'All (limits vary)'],
            ['Trigger phrase', "'Survive an AZ failure with no data loss'", "'Faster failover plus readable standbys'", "'Reporting queries slow production'"],
          ],
        },
      },
      {
        heading: 'Combining them and handling connections',
        body:
          "These features **combine**. A typical production setup is Multi-AZ for availability **plus** one or more read replicas for reporting, and possibly a cross-Region replica for disaster recovery. Point BI and reporting tools at a replica so production writes are untouched.\n\nTwo practical details:\n\n- **Applications must reconnect** after failover. DNS caching in the client can lengthen recovery, so keep the JVM/driver DNS TTL low.\n- **RDS Proxy** sits in front of RDS or Aurora as a managed connection pool. It holds client connections open during a failover (cutting failover time for apps by up to 66%) and absorbs connection storms from Lambda. Covered further in the DynamoDB/ElastiCache lesson.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Survive an AZ failure', 'automatic failover', 'no data loss' → Multi-AZ.\n- 'Read-heavy', 'reporting/analytics queries degrade production' → read replica, and point the reports at it.\n- 'Database must be available in another Region for DR, cheaply' → cross-Region read replica, promoted on disaster.\n- 'The standby can't be used for reads' is true for the classic Multi-AZ instance; 'two readable standbys' means Multi-AZ DB cluster.\n- 'Failover requires no application change' → Multi-AZ (same endpoint). Replica promotion gives a new endpoint unless you use DNS or a proxy.",
      },
    ],
    diagram: {
      title: 'Multi-AZ failover and a read replica for reporting',
      groups: [
        { id: 'region', label: 'Region', kind: 'region', x: 20, y: 3, w: 76, h: 54 },
        { id: 'az-a', label: 'AZ a', kind: 'az', x: 23, y: 8, w: 22, h: 45 },
        { id: 'az-b', label: 'AZ b', kind: 'az', x: 48, y: 8, w: 22, h: 45 },
        { id: 'az-c', label: 'AZ c', kind: 'az', x: 73, y: 8, w: 21, h: 45 },
      ],
      nodes: [
        { id: 'app', label: 'App', icon: 'ec2', x: 8, y: 20, sub: 'mydb endpoint' },
        { id: 'bi', label: 'Reporting', icon: 'users', x: 8, y: 46 },
        { id: 'primary', label: 'Primary', icon: 'rds', x: 34, y: 20, sub: 'read/write' },
        { id: 'standby', label: 'Standby', icon: 'rds-multi-az', x: 59, y: 20, sub: 'not readable' },
        { id: 'replica', label: 'Read replica', icon: 'rds-read-replica', x: 83, y: 42, sub: 'own endpoint' },
      ],
      edges: [
        { id: 'e-app-p', from: 'app', to: 'primary', label: 'writes' },
        { id: 'e-sync', from: 'primary', to: 'standby', label: 'sync' },
        { id: 'e-async', from: 'primary', to: 'replica', label: 'async', dashed: true },
        { id: 'e-bi-r', from: 'bi', to: 'replica', label: 'reads' },
        { id: 'e-app-s', from: 'app', to: 'standby', label: 'same endpoint', dashed: true },
      ],
      steps: [
        {
          caption: 'The app writes through the RDS endpoint to the primary in AZ a.',
          highlight: ['app', 'primary'],
          flow: [{ edge: 'e-app-p' }],
        },
        {
          caption: 'Each write is synchronously copied to the standby in AZ b before the commit is acknowledged: zero data loss if AZ a dies.',
          highlight: ['primary', 'standby'],
          flow: [{ edge: 'e-sync' }],
        },
        {
          caption: 'Changes also flow asynchronously to a read replica in AZ c. It lags a few seconds behind.',
          highlight: ['primary', 'replica'],
          flow: [{ edge: 'e-async' }],
        },
        {
          caption: 'Heavy reporting queries go to the replica’s own endpoint, so production writes are not slowed.',
          highlight: ['bi', 'replica'],
          flow: [{ edge: 'e-bi-r' }],
        },
        {
          caption: 'AZ a fails. The primary is gone, but the standby has every committed transaction.',
          highlight: ['az-a'],
          fail: ['az-a', 'primary'],
          flow: [{ edge: 'e-app-p', color: 'bad' }],
        },
        {
          caption: 'In about 60–120 s RDS promotes the standby and repoints the same DNS endpoint. The app reconnects without a config change; a new standby is created later.',
          highlight: ['standby', 'app'],
          flow: [{ edge: 'e-app-s' }],
        },
      ],
    },
    keyFacts: [
      'Multi-AZ instance: synchronous replication, standby not readable, automatic failover ~60–120 s, same endpoint.',
      'Multi-AZ DB cluster: 1 writer + 2 readable standbys in 3 AZs, failover typically under 35 s (MySQL, PostgreSQL).',
      'Read replicas: asynchronous, up to 15 (MySQL/MariaDB/PostgreSQL), each with its own endpoint.',
      'Read replicas can be cross-Region; promotion is manual and breaks replication.',
      'Read replicas require automated backups on the source.',
      'Same-Region replication traffic is free; cross-Region data transfer is charged.',
      'Converting single-AZ to Multi-AZ causes no downtime.',
      'Multi-AZ backups are taken from the standby.',
    ],
    examTips: [
      "'Reporting team's heavy queries degrade production RDS' → create a read replica and point reporting at it. Multi-AZ is wrong: its standby is not readable.",
      "'Survive an AZ outage with no data loss and no app change' → Multi-AZ.",
      "'Cheapest cross-Region DR for an RDS database with minutes of RPO' → cross-Region read replica, promote on disaster.",
      "'Readable standbys and faster failover, staying on RDS' → Multi-AZ DB cluster.",
      "'Lambda functions exhaust database connections' or 'reduce failover impact' → RDS Proxy.",
    ],
    pitfalls: [
      'Using Multi-AZ to fix read performance: the standby serves nothing.',
      'Expecting read replicas to fail over automatically: promotion is manual.',
      'Forgetting replica reads are eventually consistent: read-your-own-write may fail.',
      'Assuming a promoted replica keeps the original endpoint: it gets its own.',
    ],
    prosCons: [
      {
        option: 'Multi-AZ DB instance',
        pros: ['Zero data loss', 'Automatic failover, same endpoint', 'Works on every RDS engine'],
        cons: ['Standby is idle and not readable', 'Roughly double the cost', '60–120 s failover'],
        useWhen: 'Production databases that must survive an AZ failure.',
      },
      {
        option: 'Multi-AZ DB cluster',
        pros: ['Faster failover (< 35 s)', 'Two readable standbys', 'Three AZs'],
        cons: ['MySQL and PostgreSQL only', 'Limited instance classes', 'Three instances to pay for'],
        useWhen: 'RDS workloads that want quicker failover and some read capacity.',
      },
      {
        option: 'Read replica',
        pros: ['Scales reads up to 15 copies', 'Cross-Region for DR', 'Offloads reporting'],
        cons: ['Async lag, eventual consistency', 'Manual promotion', 'App must route reads to it'],
        useWhen: 'Read-heavy apps, reporting isolation, low-cost cross-Region DR.',
      },
    ],
    services: ['rds', 'rds-multi-az', 'rds-read-replica', 'rds-proxy', 'cloudwatch'],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'm2-aurora',
    module: 'm2',
    domain: 'resilient',
    title: 'Aurora: What Makes It Different',
    minutes: 20,
    summary:
      "Explain Aurora's shared six-copy storage, its endpoints and sub-30-second failover, and when Aurora Global Database or Aurora Serverless v2 is the answer.",
    analogy: {
      title: 'One shared notebook, many readers',
      body:
        "In ordinary RDS replication, every replica keeps its own notebook and someone has to copy each new line from the original into every copy. The more copies, the more copying, and the copies fall behind.\n\nAurora instead keeps **one shared notebook**, photocopied six times and stored in three different buildings. The writer and all the readers look at the **same** notebook, so readers are only milliseconds behind. If the writer leaves, any reader can pick up the pen within seconds, because there is nothing to catch up on. And a second notebook kept in another city, synced every second, protects you if the whole city goes dark: that is **Global Database**.",
    },
    sections: [
      {
        heading: 'The problem with per-instance storage',
        body:
          "In standard RDS, each instance (primary, standby, replica) has its own EBS storage, and changes are replayed from one to the next. That has costs:\n\n- Replicas lag because each must apply every change itself.\n- Failover to a replica means manual promotion and a new endpoint.\n- You pre-provision storage size and IOPS.\n\n**Amazon Aurora** is AWS's cloud-native relational engine, compatible with **MySQL** and **PostgreSQL**, that rebuilds the storage layer to remove these limits. AWS quotes up to 5x the throughput of standard MySQL and 3x PostgreSQL on the same hardware.",
      },
      {
        heading: 'The cluster volume: 6 copies across 3 AZs',
        body:
          "Aurora separates **compute** (DB instances) from a shared, distributed **cluster volume**.\n\n- Every piece of data is stored as **6 copies across 3 AZs** (2 per AZ), in 10 GB segments spread over hundreds of storage nodes.\n- A write succeeds when **4 of 6** copies acknowledge it; a read needs **3 of 6**.\n- Lose a whole AZ (2 copies) → writes still succeed. Lose an AZ **plus one more copy** (3 copies) → no data lost and reads still work, and Aurora repairs the missing copies automatically.\n- The volume **grows automatically** in 10 GB increments up to 128 TiB; you never provision storage size.\n- Storage is continuously backed up to S3, which enables point-in-time restore without slowing the database.\n\nThis is fault tolerance at the storage layer: you get three-AZ durability even if you run a single DB instance. But a single instance is still one compute node, so add at least one replica for fast failover.",
      },
      {
        heading: 'Replicas, failover and endpoints',
        body:
          "Because all instances read the **same** volume, **Aurora Replicas** do not replay data; they only refresh their memory caches.\n\n- **Up to 15 Aurora Replicas** per cluster, with replica lag typically **under 100 ms** (often around 10–20 ms).\n- **Failover**: if the writer fails, Aurora promotes a replica, typically in **under 30 seconds**. You set **promotion tiers** (0–15) to choose which replica wins; put a replica of the same size as the writer in tier 0. With no replicas at all, Aurora must create a new instance, which takes much longer (minutes).\n- **Aurora Auto Scaling** adds or removes replicas based on CPU or connections.\n\nApplications never hard-code instance names. They use endpoints:",
        table: {
          headers: ['Endpoint', 'Points to', 'Use for'],
          rows: [
            ['Cluster (writer) endpoint', 'The current primary; moves on failover', 'All writes and read-after-write reads'],
            ['Reader endpoint', 'Load-balances connections across replicas', 'Read scaling, reporting'],
            ['Custom endpoint', 'A subset of instances you choose', 'Send analytics to large replicas only'],
            ['Instance endpoint', 'One specific instance', 'Diagnostics and fine-grained control'],
          ],
        },
      },
      {
        heading: 'Aurora Global Database',
        body:
          "**Aurora Global Database** extends one cluster across Regions: one **primary Region** (read-write) and **secondary Regions** (read-only clusters; 5 is the figure exam questions use). Replication happens at the **storage layer** using dedicated infrastructure, so it does not load the database engines.\n\n- Replication lag is typically **under 1 second** → **RPO about 1 second**.\n- Promoting a secondary Region during a disaster takes **under 1 minute** → **RTO under 1 minute**.\n- **Switchover** (planned, for drills or Region rotation) has RPO 0; **failover** (unplanned, during an outage) accepts the small lag.\n- Each secondary cluster serves low-latency **local reads** for users in that Region, with up to 16 read instances.\n- **Write forwarding** lets apps in a secondary Region send occasional writes, which are forwarded to the primary.\n\n'RPO 1 second, RTO under 1 minute, relational, cross-Region' is literally the Aurora Global Database spec; recognize those two numbers instantly.",
      },
      {
        heading: 'Aurora Serverless v2',
        body:
          "**Aurora Serverless v2** scales compute automatically in fine-grained steps measured in **Aurora Capacity Units (ACUs)**; one ACU is about 2 GiB of memory with matching CPU and networking.\n\n- Scales in **0.5 ACU** increments, in seconds, between the minimum and maximum you set (up to 256 ACU). The minimum can now be **0 ACU**, letting idle clusters auto-pause.\n- Supports Multi-AZ, read replicas, Global Database and RDS Proxy, and can be **mixed** with provisioned instances in the same cluster (for example a provisioned writer and serverless readers).\n- You pay per ACU-hour actually used.\n\nTrigger phrases: 'unpredictable or spiky load', 'dev/test databases idle most of the day', 'no capacity planning', 'many databases for a SaaS app with variable usage'.",
      },
      {
        heading: 'Other Aurora features worth knowing',
        beyond: true,
        body:
          "- **Backtrack** (Aurora MySQL): rewind the database to an earlier time (up to 72 hours) in minutes, without restoring to a new cluster. Good for 'undo an accidental DELETE quickly'.\n- **Cloning**: create a copy-on-write clone of a production cluster in minutes, without copying storage up front. Good for test environments from production data.\n- **Aurora I/O-Optimized** storage: higher instance and storage price, no per-I/O charges. Cheaper when I/O exceeds about 25% of the Aurora bill.\n- **Zero-ETL integration with Redshift**: replicate transactional data into Redshift for analytics without pipelines.",
      },
      {
        heading: 'Aurora vs standard RDS',
        body:
          "When a question offers both, look for the requirement that only Aurora meets.",
        table: {
          headers: ['', 'RDS (MySQL/PostgreSQL)', 'Aurora'],
          rows: [
            ['Storage', 'EBS per instance, provisioned size', 'Shared cluster volume, 6 copies / 3 AZs, auto-grows to 128 TiB'],
            ['Read replicas', 'Up to 15, async, seconds of lag', 'Up to 15, shared storage, ~10–100 ms lag'],
            ['Failover', 'Multi-AZ 60–120 s (cluster < 35 s)', 'Typically < 30 s to a replica'],
            ['Cross-Region', 'Cross-Region read replica (seconds–minutes RPO)', 'Global Database (~1 s RPO, < 1 min RTO)'],
            ['Serverless option', 'No', 'Serverless v2'],
            ['Cost', 'Lower for small, steady workloads', 'About 20% more per instance-hour, plus storage I/O unless I/O-Optimized'],
          ],
        },
      },
      {
        heading: 'Exam angle',
        body:
          "- 'RPO 1 second and RTO under 1 minute across Regions for MySQL/PostgreSQL' → Aurora Global Database. A cross-Region RDS read replica has more lag and slower manual promotion; nightly snapshots give an RPO of up to 24 hours.\n- 'Failover in under 30 seconds' or 'up to 15 low-lag replicas' → Aurora.\n- 'Unpredictable, intermittent load', 'pay only when used' → Aurora Serverless v2.\n- 'Send reporting to replicas without code naming instances' → reader endpoint (or a custom endpoint for a subset).\n- 'Storage must survive the loss of an AZ' → Aurora's six-copy volume handles it natively.",
      },
    ],
    diagram: {
      title: 'Aurora shared storage and replica promotion',
      groups: [
        { id: 'region', label: 'Region', kind: 'region', x: 18, y: 3, w: 78, h: 54 },
        { id: 'az-a', label: 'AZ a', kind: 'az', x: 21, y: 7, w: 22, h: 24 },
        { id: 'az-b', label: 'AZ b', kind: 'az', x: 46, y: 7, w: 22, h: 24 },
        { id: 'az-c', label: 'AZ c', kind: 'az', x: 71, y: 7, w: 22, h: 24 },
      ],
      nodes: [
        { id: 'app', label: 'App', icon: 'ec2', x: 7, y: 18, sub: 'cluster endpoint' },
        { id: 'bi', label: 'Reports', icon: 'users', x: 7, y: 44, sub: 'reader endpoint' },
        { id: 'writer', label: 'Writer', icon: 'aurora', x: 32, y: 19 },
        { id: 'r1', label: 'Replica 1', icon: 'aurora', x: 57, y: 19, sub: 'tier 0' },
        { id: 'r2', label: 'Replica 2', icon: 'aurora', x: 82, y: 19, sub: 'tier 1' },
        { id: 'vol', label: 'Cluster volume', icon: 'database', x: 57, y: 46, sub: '6 copies / 3 AZs' },
      ],
      edges: [
        { id: 'e-app-w', from: 'app', to: 'writer', label: 'writes' },
        { id: 'e-w-vol', from: 'writer', to: 'vol', label: '4/6 quorum' },
        { id: 'e-r1-vol', from: 'r1', to: 'vol', dashed: true },
        { id: 'e-r2-vol', from: 'r2', to: 'vol', dashed: true },
        { id: 'e-bi-r2', from: 'bi', to: 'r2', label: 'reads' },
        { id: 'e-app-r1', from: 'app', to: 'r1', label: 'endpoint moves', dashed: true },
      ],
      steps: [
        {
          caption: 'The app writes through the cluster endpoint to the writer instance in AZ a.',
          highlight: ['app', 'writer'],
          flow: [{ edge: 'e-app-w' }],
        },
        {
          caption: 'The writer sends the change to the shared cluster volume. It is durable once 4 of the 6 copies (2 per AZ) acknowledge.',
          highlight: ['writer', 'vol'],
          flow: [{ edge: 'e-w-vol' }],
        },
        {
          caption: 'Replicas read the same volume, so they are only milliseconds behind. Reports use the reader endpoint, which load-balances across replicas.',
          highlight: ['r1', 'r2', 'vol', 'bi'],
          flow: [{ edge: 'e-bi-r2' }, { edge: 'e-r2-vol', reverse: true }],
        },
        {
          caption: 'AZ a fails, taking the writer and 2 of the 6 storage copies with it.',
          highlight: ['az-a'],
          fail: ['az-a', 'writer'],
          flow: [{ edge: 'e-app-w', color: 'bad' }],
        },
        {
          caption: 'Aurora promotes Replica 1 (promotion tier 0) in under 30 s. Nothing needs replaying because the data is already in the shared volume.',
          highlight: ['r1', 'vol'],
          flow: [{ edge: 'e-r1-vol' }],
        },
        {
          caption: 'The cluster endpoint now points at Replica 1, so the app reconnects with no config change. With 4 copies left, writes keep succeeding while storage self-heals.',
          highlight: ['app', 'r1'],
          flow: [{ edge: 'e-app-r1' }],
        },
      ],
    },
    keyFacts: [
      'Aurora is MySQL- and PostgreSQL-compatible.',
      'Cluster volume: 6 copies across 3 AZs; write quorum 4/6, read quorum 3/6.',
      'Storage auto-grows in 10 GB increments up to 128 TiB.',
      'Up to 15 Aurora Replicas with typically < 100 ms lag; failover typically < 30 s.',
      'Promotion tiers 0–15 decide which replica becomes writer.',
      'Endpoints: cluster (writer), reader (load-balanced), custom, instance.',
      'Aurora Global Database: storage-level replication, RPO ~1 s, RTO < 1 min.',
      'Serverless v2 scales in 0.5 ACU steps; 1 ACU ≈ 2 GiB memory; minimum can be 0 ACU (auto-pause).',
      'Backtrack (Aurora MySQL) rewinds up to 72 hours without a restore.',
    ],
    examTips: [
      "'MySQL database across Regions needs RPO of 1 second and RTO under 1 minute' → Aurora Global Database. Cross-Region RDS replicas lag more and promote slower; nightly snapshot copies mean up to 24 h RPO.",
      "'Fastest failover for a relational database in one Region' → Aurora with at least one replica in another AZ.",
      "'Unpredictable or intermittent database load, minimize management' → Aurora Serverless v2.",
      "'Route reporting queries to replicas automatically' → Aurora reader endpoint.",
      "'Only some replicas should serve analytics' → Aurora custom endpoint.",
      "'Quickly undo an accidental table drop on Aurora MySQL without a new cluster' → Backtrack.",
    ],
    pitfalls: [
      'Running Aurora with a single instance and expecting fast failover: without a replica Aurora must create a new instance, which takes minutes.',
      'Confusing an Aurora Replica (same Region, shared storage) with Global Database secondaries (other Regions).',
      'Assuming Aurora supports Oracle or SQL Server: only MySQL and PostgreSQL compatibility.',
      'Hard-coding instance endpoints, which do not move on failover; use the cluster endpoint.',
    ],
    prosCons: [
      {
        option: 'Aurora provisioned cluster',
        pros: ['Six-copy, three-AZ storage', 'Sub-30 s failover', '15 low-lag replicas'],
        cons: ['Higher price than RDS for small, steady workloads', 'MySQL/PostgreSQL only'],
        useWhen: 'Production relational workloads needing high availability and read scaling.',
      },
      {
        option: 'Aurora Serverless v2',
        pros: ['Scales in seconds with load', 'No capacity planning', 'Can pause to 0 ACU'],
        cons: ['ACU-hour price is higher than an equivalent busy provisioned instance', 'Needs min/max tuning'],
        useWhen: 'Spiky, unpredictable or mostly idle workloads.',
      },
      {
        option: 'Aurora Global Database',
        pros: ['~1 s RPO, < 1 min RTO across Regions', 'Local reads in each Region', 'No engine load from replication'],
        cons: ['Pay for clusters in every Region', 'Secondaries are read-only (except write forwarding)'],
        useWhen: 'Aggressive cross-Region DR or global low-latency reads.',
      },
      {
        option: 'RDS cross-Region read replica',
        pros: ['Cheaper', 'Works for all RDS engines'],
        cons: ['Seconds-to-minutes lag', 'Manual, slower promotion'],
        useWhen: 'Cross-Region DR where minutes of RPO/RTO are acceptable.',
      },
    ],
    services: ['aurora', 'aurora-serverless', 'aurora-global-database', 'rds', 'rds-read-replica'],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'm2-dynamo-cache-ha',
    module: 'm2',
    domain: 'resilient',
    title: 'DynamoDB & ElastiCache Resilience',
    minutes: 20,
    summary:
      'Explain the built-in resilience of DynamoDB (three AZs, Global Tables, PITR), choose ElastiCache Valkey/Redis OSS over Memcached when a cache must survive failures, and use RDS Proxy to protect relational databases from connection storms.',
    analogy: {
      title: 'The bank vault and the sticky notes',
      body:
        "**DynamoDB** is like a bank that automatically keeps three copies of your account ledger in three different branches across town. You never asked for it, and it costs nothing extra. Global Tables are branches in other countries where you can deposit and withdraw, with every branch's ledger synced within about a second.\n\n**ElastiCache** is a whiteboard of sticky notes next to your desk: super fast to glance at. **Memcached** is a whiteboard with no copy, so if it falls off the wall you just rewrite the notes from the real files. **Valkey/Redis OSS** is a whiteboard with a live photocopy on another wall, so if one falls, you turn and keep reading.",
    },
    sections: [
      {
        heading: 'The problem: every tier needs its own HA story',
        body:
          "Making the web tier stateless moves sessions, carts and hot data into DynamoDB or a cache. That only helps if **those** services survive failures too. A single-node cache becomes the new single point of failure; a single-Region table becomes the new Regional risk. This lesson covers how each service handles AZ failures, Regional failures and data recovery.",
      },
      {
        heading: 'DynamoDB: Multi-AZ is built in',
        body:
          "**Amazon DynamoDB** is a serverless key-value and document database. Its resilience is automatic:\n\n- Every table is replicated **across three AZs** in the Region. There is no Multi-AZ setting to turn on and no extra charge. SLA: 99.99% for a single-Region table.\n- Writes are acknowledged once durable in multiple AZs. Reads are **eventually consistent** by default (half the cost) or **strongly consistent** on request.\n- **Capacity modes**: **on-demand** (pay per request, absorbs sudden spikes, no planning) or **provisioned** with auto scaling (cheaper for steady, predictable traffic).\n- **DynamoDB Streams** capture every item change for 24 hours, feeding Lambda for event-driven processing.\n- **TTL** deletes expired items automatically at no cost, which is ideal for session data.",
      },
      {
        heading: 'Global Tables: multi-Region active-active',
        body:
          "**DynamoDB Global Tables** replicate a table to other Regions you choose. Every replica accepts **reads and writes** (active-active), and changes typically propagate within a second.\n\n- Default mode is **multi-Region eventual consistency**: concurrent writes to the same item in two Regions are resolved by **last writer wins**.\n- A **multi-Region strong consistency** mode (added in 2025, uses three Regions) lets reads in any Region see the latest write, for applications that cannot tolerate conflicts, at the cost of higher write latency.\n- SLA rises to 99.999%.\n- Use cases: globally distributed users who need local-latency writes; Regional DR with RPO of about a second and RTO near zero (just send traffic to another Region).\n\nCompare Aurora Global Database, which has a **single** writer Region; Global Tables lets every Region write.",
      },
      {
        heading: 'DynamoDB backups and DAX',
        body:
          "- **Point-in-time recovery (PITR)**: continuous backups; restore to **any second in the last 35 days** (the recovery period is configurable from 1 to 35 days). Protects against accidental writes or deletes.\n- **On-demand backups**: full backups kept until you delete them, for long-term retention and compliance. They are managed through AWS Backup too, which adds cross-Region and cross-account copies.\n- Restores always create a **new table**.\n- **Export to S3** (from PITR data) for analytics without consuming table capacity.\n\n**DynamoDB Accelerator (DAX)** is an in-memory cache built specifically for DynamoDB. It speaks the DynamoDB API, so the app changes only its client, and cuts read latency from single-digit milliseconds to **microseconds**. Run at least three nodes across AZs for production; DAX fails over to a replica node automatically.",
      },
      {
        heading: 'ElastiCache: Valkey / Redis OSS vs Memcached',
        body:
          "**Amazon ElastiCache** is a managed in-memory cache. It offers three engines: **Valkey** (the open-source fork of Redis, now AWS's recommended and lowest-priced option), **Redis OSS**, and **Memcached**. Valkey and Redis OSS behave the same for exam purposes.\n\n- A Valkey/Redis OSS **shard** has one primary node and **up to 5 replicas**. With **Multi-AZ** enabled, if the primary fails ElastiCache promotes a replica in another AZ automatically, typically within seconds to a minute.\n- **Cluster mode** splits data across up to 500 shards for more memory and write throughput.\n- **Snapshots** (backups) and **AOF persistence** let data survive restarts.\n- **Global Datastore** replicates to up to 2 other Regions with typically under 1 second lag, for cross-Region reads and DR.\n- **ElastiCache Serverless** removes node sizing entirely and is Multi-AZ by default.\n\n**Memcached** is multi-threaded and simple, shards data across nodes, but has **no replication and no persistence**: lose a node and its keys are gone. It is a cache you can afford to lose.\n\nWhen the requirement is a **durable primary database** with Redis compatibility (not just a cache), the answer is **Amazon MemoryDB**, which stores every write in a Multi-AZ transaction log.",
        table: {
          headers: ['', 'Valkey / Redis OSS', 'Memcached'],
          rows: [
            ['Replication', 'Primary + up to 5 replicas per shard', 'None'],
            ['Multi-AZ automatic failover', 'Yes', 'No'],
            ['Persistence / backups', 'Snapshots, AOF', 'No'],
            ['Data structures', 'Strings, hashes, lists, sets, sorted sets, streams, geo', 'Simple key-value strings'],
            ['Threads', 'Mostly single-threaded per shard (scales via shards)', 'Multi-threaded'],
            ['Cross-Region', 'Global Datastore', 'No'],
            ['Pick when', "'Cache must survive node failure', leaderboards, sessions, pub/sub", "'Simplest cache, data loss acceptable, multi-threaded'"],
          ],
        },
      },
      {
        heading: 'RDS Proxy: protecting relational databases',
        body:
          "Relational databases have a hard limit on concurrent connections, and opening a connection is expensive. Serverless code makes this worse: 1,000 concurrent Lambda invocations can try to open 1,000 database connections at once and exhaust the database.\n\n**Amazon RDS Proxy** is a fully managed, Multi-AZ **connection pool** in front of RDS (MySQL, PostgreSQL, MariaDB, SQL Server) and Aurora.\n\n- Many client connections share a small pool of database connections.\n- During a failover, the proxy keeps client connections open and reroutes to the new primary, reducing failover time for applications by **up to 66%**.\n- Authenticates with **IAM** and pulls database credentials from **Secrets Manager**, so code holds no passwords.\n- Runs inside your VPC only (not publicly accessible).\n\n'Lambda exhausts database connections' or 'too many connections errors at scale' → RDS Proxy.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'DynamoDB must be Multi-AZ' → it already is; no action needed (a distractor might offer to 'enable Multi-AZ').\n- 'Users on several continents must read and write with low latency' or 'multi-Region active-active NoSQL' → DynamoDB Global Tables.\n- 'Recover a table to its state 10 minutes before a bad deployment' → DynamoDB PITR.\n- 'Microsecond reads for DynamoDB with minimal code change' → DAX.\n- 'Cache must survive node failure' or 'cache data must be backed up' → ElastiCache Valkey/Redis OSS with Multi-AZ, not Memcached.\n- 'Durable in-memory primary database' → MemoryDB.\n- 'Lambda exhausts database connections' → RDS Proxy.",
      },
    ],
    diagram: {
      title: 'Cache failover and DynamoDB Global Tables during a Regional outage',
      groups: [
        { id: 'reg-a', label: 'Region A', kind: 'region', x: 20, y: 3, w: 46, h: 54 },
        { id: 'reg-b', label: 'Region B', kind: 'region', x: 70, y: 3, w: 26, h: 54 },
      ],
      nodes: [
        { id: 'app', label: 'App (Region A)', icon: 'ec2', x: 8, y: 30 },
        { id: 'cache-p', label: 'Cache primary', icon: 'elasticache', x: 32, y: 16, sub: 'Valkey, AZ a' },
        { id: 'cache-r', label: 'Cache replica', icon: 'elasticache', x: 54, y: 16, sub: 'AZ b' },
        { id: 'ddb-a', label: 'Orders table', icon: 'dynamodb', x: 43, y: 44, sub: '3 AZs built in' },
        { id: 'app-b', label: 'App (Region B)', icon: 'ec2', x: 83, y: 16 },
        { id: 'ddb-b', label: 'Global replica', icon: 'dynamodb-global-tables', x: 83, y: 44, sub: 'read + write' },
      ],
      edges: [
        { id: 'e-app-cp', from: 'app', to: 'cache-p', label: 'GET' },
        { id: 'e-repl', from: 'cache-p', to: 'cache-r', label: 'replication' },
        { id: 'e-app-cr', from: 'app', to: 'cache-r', label: 'after failover', dashed: true },
        { id: 'e-app-ddb', from: 'app', to: 'ddb-a', label: 'miss → read' },
        { id: 'e-global', from: 'ddb-a', to: 'ddb-b', label: '~1 s' },
        { id: 'e-appb-ddb', from: 'app-b', to: 'ddb-b' },
      ],
      steps: [
        {
          caption: 'The app checks the Valkey cache first. A hit returns in under a millisecond.',
          highlight: ['app', 'cache-p'],
          flow: [{ edge: 'e-app-cp' }],
        },
        {
          caption: 'On a miss, the app reads DynamoDB, whose data already lives in three AZs, then writes the result back to the cache.',
          highlight: ['app', 'ddb-a'],
          flow: [{ edge: 'e-app-ddb' }],
        },
        {
          caption: 'The cache primary fails. Because Multi-AZ is on and a replica exists in AZ b, ElastiCache promotes it automatically.',
          highlight: ['cache-r'],
          fail: ['cache-p'],
          flow: [{ edge: 'e-repl', color: 'bad' }],
        },
        {
          caption: 'The primary endpoint now resolves to the promoted replica; the app keeps hitting a warm cache. With Memcached, those keys would simply be gone.',
          highlight: ['app', 'cache-r'],
          flow: [{ edge: 'e-app-cr' }],
        },
        {
          caption: 'Every write to the orders table replicates to the Global Tables replica in Region B, typically within a second.',
          highlight: ['ddb-a', 'ddb-b'],
          flow: [{ edge: 'e-global' }],
        },
        {
          caption: 'Region A has an outage. Users are routed to Region B, where the app reads and writes its local replica: active-active, near-zero RTO.',
          highlight: ['reg-b', 'app-b', 'ddb-b'],
          fail: ['reg-a'],
          flow: [{ edge: 'e-appb-ddb' }],
        },
      ],
    },
    keyFacts: [
      'DynamoDB replicates every table across 3 AZs automatically, at no extra cost.',
      'DynamoDB Global Tables: multi-Region active-active, last-writer-wins by default, typically ~1 s replication.',
      'DynamoDB PITR restores to any second in the last 35 days; restores create a new table.',
      'DynamoDB Streams keep item changes for 24 hours.',
      'DAX gives microsecond reads and is API-compatible with DynamoDB.',
      'ElastiCache engines: Valkey, Redis OSS, Memcached.',
      'Valkey/Redis OSS: up to 5 replicas per shard, Multi-AZ automatic failover, snapshots, Global Datastore.',
      'Memcached: no replication, no persistence, multi-threaded.',
      'MemoryDB = durable, Redis-compatible primary database.',
      'RDS Proxy cuts application failover time by up to 66% and pools connections for Lambda.',
    ],
    examTips: [
      "'Cache must survive node failure' → ElastiCache Valkey/Redis OSS with Multi-AZ and replicas; Memcached loses data.",
      "'Lambda exhausts database connections' → RDS Proxy.",
      "'Multi-Region, active-active, read and write everywhere' → DynamoDB Global Tables.",
      "'Make the DynamoDB table highly available within a Region' → already done; DynamoDB is Multi-AZ by default.",
      "'Restore DynamoDB to a point just before accidental deletes' → PITR.",
      "'Microsecond latency reads for DynamoDB without rewriting the app' → DAX.",
      "'Redis-compatible database that must not lose data' → MemoryDB.",
    ],
    pitfalls: [
      'Choosing Memcached when the question requires replication, backups or failover.',
      'Thinking DynamoDB needs a Multi-AZ option enabled.',
      'Assuming Global Tables resolve write conflicts by merging: the default is last writer wins.',
      'Using ElastiCache as the only copy of important data: it is a cache, unless you choose MemoryDB.',
      'Putting DAX in front of RDS: DAX works only with DynamoDB.',
    ],
    prosCons: [
      {
        option: 'ElastiCache Valkey / Redis OSS',
        pros: ['Replication and Multi-AZ failover', 'Snapshots and persistence', 'Rich data types, Global Datastore'],
        cons: ['Mostly single-threaded per shard', 'More configuration than Memcached'],
        useWhen: 'Sessions, leaderboards, any cache that must survive a node failure.',
      },
      {
        option: 'ElastiCache Memcached',
        pros: ['Simple', 'Multi-threaded', 'Easy horizontal sharding'],
        cons: ['No replication, persistence or failover'],
        useWhen: 'Disposable caching where losing data only costs a cache miss.',
      },
      {
        option: 'DAX',
        pros: ['Microsecond reads', 'DynamoDB API compatible'],
        cons: ['DynamoDB only', 'Eventually consistent reads only from cache'],
        useWhen: 'Read-heavy DynamoDB tables needing lower latency.',
      },
      {
        option: 'DynamoDB Global Tables',
        pros: ['Active-active writes in every Region', 'Near-zero RTO, ~1 s RPO', '99.999% SLA'],
        cons: ['Pay for replicated writes in each Region', 'Last-writer-wins conflicts by default'],
        useWhen: 'Global users or multi-Region DR for NoSQL data.',
      },
    ],
    services: ['dynamodb', 'dynamodb-global-tables', 'dax', 'elasticache', 'memorydb', 'rds-proxy', 'lambda', 'secrets-manager'],
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'm2-backups',
    module: 'm2',
    domain: 'resilient',
    title: 'Backups, Snapshots & AWS Backup',
    minutes: 18,
    summary:
      'Choose between EBS snapshots, RDS automated backups and manual snapshots, and AWS Backup plans with cross-Region/cross-account copies and Vault Lock for ransomware-proof, centrally governed backups.',
    analogy: {
      title: 'Photos of your house, kept at a friend’s place',
      body:
        "Replication is like having a twin house that mirrors everything you do: if you knock over a vase in one, it breaks in the other too. A **backup** is a photo of the house on a specific day, so you can rebuild it as it was before the accident.\n\nKeep the photos at home and a fire takes them too, so you send copies to a friend in another town (**cross-Region**) and to a lawyer's safe (**cross-account**). **Vault Lock** is a safe with a time lock that nobody, not even you, can open early to destroy the photos, which is exactly what a burglar holding your keys (ransomware) would try to do.",
    },
    sections: [
      {
        heading: 'Why replication is not a backup',
        body:
          "Multi-AZ, read replicas and Global Tables protect against **infrastructure** failure. They faithfully copy **every** change, including a `DROP TABLE`, a buggy deployment that corrupts rows, or ransomware encrypting your data. Only a **point-in-time copy** kept separately lets you go back.\n\nA complete strategy answers four questions: How often (sets the RPO)? How long to keep (retention, compliance)? Where (another Region or account, so one disaster or one compromised account cannot destroy it)? And can anyone delete it (immutability)?",
      },
      {
        heading: 'EBS snapshots and AMIs',
        body:
          "An **EBS snapshot** is a point-in-time copy of a block volume, stored by AWS in S3 (you do not see it in your buckets).\n\n- Snapshots are **incremental**: only blocks changed since the last snapshot are stored, yet each snapshot can restore the full volume.\n- A snapshot belongs to a Region; you can **copy it to other Regions and share it with other accounts** (encrypted snapshots need the KMS key shared too). This is the building block of instance-level DR.\n- An **AMI** is a bootable image built from snapshots plus launch metadata. **Golden AMIs** speed up both recovery and scale-out.\n- **Amazon Data Lifecycle Manager (DLM)** automates snapshot and AMI creation, retention and cross-Region copy on a schedule.\n- **Fast Snapshot Restore** removes the first-read latency penalty of a volume restored from a snapshot (extra cost per AZ).\n- **Recycle Bin** retains deleted snapshots and AMIs for a period you set, protecting against accidental deletion.\n- **EBS Snapshots Archive** is about 75% cheaper for snapshots kept 90+ days, with 24–72 hour restore.",
      },
      {
        heading: 'RDS and Aurora: automated backups vs manual snapshots',
        body:
          "RDS and Aurora offer two complementary mechanisms.\n\n- **Automated backups**: a daily snapshot during the backup window plus **transaction logs uploaded every 5 minutes**, enabling **point-in-time restore** to any second within the retention period, typically up to the last 5 minutes. Retention **1–35 days** (default 7 days in the console; setting 0 disables them on RDS, which also disables read replicas). They can be **replicated to another Region** automatically.\n- **Manual snapshots**: taken when you choose, **kept until you delete them**, survive deletion of the instance, can be copied cross-Region and **shared cross-account** (encrypted snapshots need a customer managed KMS key to share).\n- **Restores always create a NEW instance with a new endpoint**. You then repoint the app (or rename the instances).\n- Before deleting a database, RDS offers a final snapshot; take it.",
        table: {
          headers: ['', 'Automated backups', 'Manual snapshots'],
          rows: [
            ['Created', 'Daily + logs every 5 min', 'On demand (or via AWS Backup)'],
            ['Point-in-time restore', 'Yes, any second in retention', 'No, only the snapshot moment'],
            ['Retention', '1–35 days', 'Until you delete'],
            ['Survive instance deletion', 'Deleted by default (option to retain)', 'Yes'],
            ['Cross-account share', 'No (copy to a manual snapshot first)', 'Yes'],
            ['Use for', 'Operational recovery, low RPO', 'Long-term retention, compliance, migrations'],
          ],
        },
      },
      {
        heading: 'AWS Backup: one policy for everything',
        body:
          "**AWS Backup** centralizes backups across services: EC2/EBS, RDS, Aurora, DynamoDB, EFS, all FSx file systems, S3, Storage Gateway volumes, DocumentDB, Neptune, Redshift, VMware on premises and more.\n\n- A **backup plan** defines frequency (hourly, daily, cron), backup window, **retention**, and **lifecycle** to cold storage for supported resources.\n- **Resource assignment** by tags (`backup=daily`) or ARNs, so new resources are protected automatically.\n- Recovery points live in **backup vaults**, encrypted with KMS.\n- **Cross-Region and cross-account copy** rules (with AWS Organizations you can manage backup policies for every account centrally).\n- **AWS Backup Vault Lock** makes recovery points **WORM** (write once, read many). In **compliance mode**, once the grace period ends, nobody (including the root user and AWS) can delete backups or shorten retention. **Governance mode** lets specially authorized IAM users change it.\n- **Backup Audit Manager** reports whether backups meet your policies; **restore testing** automatically validates that recovery points actually restore.\n- **Logically air-gapped vaults** store copies isolated in an AWS-owned account, shareable to a recovery account for ransomware recovery.",
      },
      {
        heading: 'Other service-level protections',
        beyond: true,
        body:
          "- **S3**: **versioning** keeps every version of an object (protects against overwrite and delete); **Object Lock** (compliance or governance mode) gives WORM objects; **replication** (CRR/SRR) copies to another bucket, Region or account; **MFA delete** requires MFA to permanently delete versions.\n- **DynamoDB**: PITR (35 days) plus on-demand backups.\n- **EFS**: automatic backups via AWS Backup are enabled by default on new file systems; EFS replication copies to another Region.\n- **Aurora**: Backtrack for in-place rewind (MySQL) and continuous backup to S3.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Centralize and automate backups across many services and accounts' → AWS Backup with backup plans and Organizations backup policies.\n- 'Backups must be immutable / ransomware-proof / nobody can delete them, not even root' → AWS Backup Vault Lock in compliance mode (or S3 Object Lock for objects).\n- 'Restore the database to its state at 14:32 yesterday' → RDS point-in-time restore from automated backups (creates a new instance).\n- 'Keep database backups for 7 years' → manual snapshots or AWS Backup retention; automated backups max out at 35 days.\n- 'Share a database snapshot with another account' → manual snapshot (encrypted with a customer managed key shared to the account).\n- 'Automate EBS snapshot schedules' → Data Lifecycle Manager or AWS Backup.",
      },
    ],
    diagram: {
      title: 'AWS Backup with cross-Region copy and Vault Lock',
      groups: [
        { id: 'reg-a', label: 'Production Region', kind: 'region', x: 3, y: 3, w: 68, h: 54 },
        { id: 'reg-b', label: 'DR Region', kind: 'region', x: 74, y: 3, w: 23, h: 54 },
      ],
      nodes: [
        { id: 'ebs', label: 'EBS volumes', icon: 'ebs', x: 12, y: 14 },
        { id: 'rds', label: 'RDS database', icon: 'rds', x: 12, y: 30 },
        { id: 'ddb', label: 'DynamoDB', icon: 'dynamodb', x: 12, y: 46 },
        { id: 'plan', label: 'Backup plan', icon: 'backup', x: 34, y: 30, sub: 'daily, 35 d, tag-based' },
        { id: 'vault', label: 'Backup vault', icon: 'backup', x: 58, y: 30, sub: 'Vault Lock' },
        { id: 'attacker', label: 'Ransomware', icon: 'attacker', x: 58, y: 50, sub: 'stolen admin creds' },
        { id: 'dr-vault', label: 'DR vault', icon: 'backup', x: 85, y: 30, sub: 'copy' },
        { id: 'restored', label: 'Restored DB', icon: 'rds', x: 85, y: 48, sub: 'new instance' },
      ],
      edges: [
        { id: 'e-ebs', from: 'ebs', to: 'plan' },
        { id: 'e-rds', from: 'rds', to: 'plan' },
        { id: 'e-ddb', from: 'ddb', to: 'plan' },
        { id: 'e-plan-vault', from: 'plan', to: 'vault', label: 'recovery points' },
        { id: 'e-copy', from: 'vault', to: 'dr-vault', label: 'cross-Region copy' },
        { id: 'e-attack', from: 'attacker', to: 'vault', label: 'delete?' },
        { id: 'e-restore', from: 'dr-vault', to: 'restored', label: 'restore' },
      ],
      steps: [
        {
          caption: 'A single backup plan selects every resource tagged backup=daily: EBS volumes, the RDS database and a DynamoDB table.',
          highlight: ['plan', 'ebs', 'rds', 'ddb'],
          flow: [{ edge: 'e-ebs' }, { edge: 'e-rds' }, { edge: 'e-ddb' }],
        },
        {
          caption: 'Each night the backup jobs write recovery points into an encrypted backup vault.',
          highlight: ['plan', 'vault'],
          flow: [{ edge: 'e-plan-vault' }],
        },
        {
          caption: 'A copy rule sends every recovery point to a vault in the DR Region (it could also go to a separate backup account).',
          highlight: ['vault', 'dr-vault'],
          flow: [{ edge: 'e-copy' }],
        },
        {
          caption: 'An attacker with stolen admin credentials encrypts production and tries to delete the backups. Vault Lock in compliance mode refuses, even for root.',
          highlight: ['attacker', 'vault'],
          fail: ['attacker', 'rds'],
          flow: [{ edge: 'e-attack', color: 'bad' }],
        },
        {
          caption: 'Recovery: restore from the DR vault. A restore always creates a new database instance with a new endpoint.',
          highlight: ['dr-vault', 'restored'],
          flow: [{ edge: 'e-restore' }],
        },
      ],
    },
    keyFacts: [
      'EBS snapshots are incremental, stored in S3, Region-scoped, and copyable cross-Region and cross-account.',
      'RDS automated backups: daily snapshot + transaction logs every 5 minutes; retention 1–35 days.',
      'Point-in-time restore is available from automated backups only.',
      'Manual DB snapshots persist until deleted and survive instance deletion.',
      'Any RDS/Aurora restore creates a new instance with a new endpoint.',
      'AWS Backup covers EBS, EC2, RDS, Aurora, DynamoDB, EFS, FSx, S3, Storage Gateway and more.',
      'AWS Backup Vault Lock compliance mode: nobody, including root, can delete recovery points before retention ends.',
      'Data Lifecycle Manager automates EBS snapshot and AMI schedules.',
      'EBS Snapshots Archive is ~75% cheaper with a 90-day minimum and 24–72 h restore.',
    ],
    examTips: [
      "'Centralize backups across services and accounts with one policy' → AWS Backup (plus Organizations backup policies).",
      "'Ransomware-proof backups that even administrators cannot delete' → AWS Backup Vault Lock (compliance mode).",
      "'Retain database backups for years' → manual snapshots or AWS Backup retention, not automated backups (35-day max).",
      "'Restore to a specific minute yesterday' → RDS point-in-time restore.",
      "'Recover EC2 workloads in another Region' → copy EBS snapshots/AMIs cross-Region (automate with DLM or AWS Backup).",
      "'Accidentally deleted snapshots must be recoverable' → Recycle Bin.",
    ],
    pitfalls: [
      'Treating Multi-AZ or replicas as backups: they replicate deletions and corruption.',
      'Expecting a restore to overwrite the existing RDS instance: it always creates a new one.',
      'Keeping backups only in the same account and Region as production.',
      'Forgetting that deleting an RDS instance deletes its automated backups by default.',
    ],
    prosCons: [
      {
        option: 'RDS automated backups',
        pros: ['Point-in-time restore, ~5 min RPO', 'Fully automatic'],
        cons: ['Max 35 days', 'Deleted with the instance by default', 'Not directly shareable'],
        useWhen: 'Operational recovery from mistakes within the last few weeks.',
      },
      {
        option: 'Manual snapshots',
        pros: ['Kept indefinitely', 'Shareable and copyable cross-Region/account'],
        cons: ['Only the snapshot moment, no PITR', 'You must schedule and clean them up'],
        useWhen: 'Long-term retention, migrations, sharing with another account.',
      },
      {
        option: 'AWS Backup',
        pros: ['One policy across many services and accounts', 'Cross-Region/account copies', 'Vault Lock, audit reports, restore testing'],
        cons: ['Additional per-GB backup storage charges', 'Some service features (e.g. Aurora Backtrack) stay separate'],
        useWhen: "'Centralize', 'compliance', 'immutable', 'multi-account' backups.",
      },
      {
        option: 'Data Lifecycle Manager',
        pros: ['Free automation for EBS snapshots and AMIs', 'Cross-Region copy'],
        cons: ['EBS/AMI only', 'No central multi-service view'],
        useWhen: 'Only EBS snapshots/AMIs need scheduling.',
      },
    ],
    services: ['backup', 'ebs', 'ami', 'rds', 'aurora', 'dynamodb', 'efs', 's3', 'kms'],
  },

  // ---------------------------------------------------------------- 13
  {
    id: 'm2-dr-strategies',
    module: 'm2',
    domain: 'resilient',
    title: 'Disaster Recovery Strategies',
    minutes: 22,
    summary:
      'Recite the four DR strategies with their RPO/RTO bands and costs, pick the cheapest one that meets the numbers in a scenario, and know when AWS Elastic Disaster Recovery is the answer.',
    analogy: {
      title: 'Four ways to prepare for your house burning down',
      body:
        "**Backup & Restore**: you keep photos and blueprints at a friend's house. After a fire you hire builders and rebuild from scratch. Cheap, but you are homeless for months.\n\n**Pilot Light**: you own an empty plot in another town with the foundations poured and the water and power connected. The pilot light on the gas boiler is lit. After a fire you put up the walls quickly.\n\n**Warm Standby**: you own a small furnished cottage in another town, with the heating on low. After a fire you move in that night and extend it over the following weeks.\n\n**Multi-site**: you live in two full-size houses at once and split your time between them. If one burns, you just stay in the other. The most expensive, but you barely notice the fire.",
    },
    sections: [
      {
        heading: 'Why DR is different from high availability',
        body:
          "Multi-AZ designs protect against the loss of an instance or an Availability Zone. **Disaster recovery (DR)** plans for bigger events: a whole Region becoming unavailable, a catastrophic deployment, or data corruption that has already replicated everywhere.\n\nRegion-level DR is a **spectrum**: the more standing capacity you pay for in the recovery Region, the faster you recover (RTO) and the less data you lose (RPO). AWS describes four points on that spectrum. Memorize them **and** their RPO/RTO bands, because questions give you numbers and ask for the **cheapest** strategy that meets them.",
      },
      {
        heading: 'The four strategies at a glance',
        body:
          "Read the table left to right as 'cheaper and slower' to 'pricier and faster'.",
        table: {
          headers: ['Strategy', "What's running in the DR Region", 'RPO', 'RTO', 'Cost'],
          rows: [
            ['Backup & Restore', 'Nothing; backups copied cross-Region; rebuild with IaC after the disaster', 'Hours (last backup)', 'Hours, up to 24 h+', '$'],
            ['Pilot Light', 'Data layer ONLY, always replicating; app servers exist as AMIs/templates, off', 'Seconds to minutes', 'Tens of minutes to hours', '$$'],
            ['Warm Standby', 'A complete but scaled-down copy, running, serving no or test traffic', 'Seconds to minutes', 'Minutes', '$$$'],
            ['Multi-site active/active', 'Full capacity in both Regions serving live traffic', '~0 (seconds)', '~0 (seconds)', '$$$$'],
          ],
        },
      },
      {
        heading: 'Backup & Restore',
        body:
          "Only **data** leaves the primary Region, on a schedule: EBS snapshots and AMIs copied cross-Region, RDS snapshots or automated backup replication, DynamoDB/EFS/S3 backups via **AWS Backup** copy rules, S3 Cross-Region Replication. Nothing runs in the DR Region.\n\nOn disaster you: deploy the infrastructure from **CloudFormation** (or other IaC) templates, restore databases from the latest copies, start the app, and switch DNS. RPO equals the backup interval (24 h for nightly copies); RTO is hours because everything is rebuilt.\n\n- Cheapest: you pay only for backup storage.\n- Infrastructure as code is what makes it feasible: without templates, rebuilding a complex environment by hand could take days.\n- Also the right answer for protection against **data corruption and ransomware** (even if you use other strategies), because replication copies corruption.",
      },
      {
        heading: 'Pilot Light',
        body:
          "The **data layer runs continuously** in the DR Region; the **compute layer is switched off**.\n\n- Data: a **cross-Region RDS read replica**, an **Aurora Global Database** secondary, a **DynamoDB Global Table** replica, S3 CRR. RPO is the replication lag (seconds to minutes).\n- Compute: AMIs copied to the DR Region, launch templates, an Auto Scaling group with desired capacity 0, load balancer defined in a template (or created, since an idle ALB is cheap).\n\nOn disaster: promote the database (replica promotion or Global Database failover), scale the ASGs up from 0, then flip Route 53 to the DR endpoint. RTO is tens of minutes, dominated by instance launch and warm-up.\n\nTypical trigger: 'RPO 15 minutes, RTO 4 hours, minimize cost' → Pilot Light, because the data must already be replicating (backups alone would not meet 15 minutes reliably) but the RTO is long enough to launch servers.",
      },
      {
        heading: 'Warm Standby and Multi-site',
        body:
          "**Warm Standby** runs a **complete, functional but scaled-down** copy of production in the DR Region: load balancer, a couple of small instances, replicated database. It may serve test traffic, which also proves it works. On disaster: scale the ASGs up to production size (or bigger instance types), promote the database, and fail over DNS. RTO is minutes because everything is already running; you only add capacity.\n\n**Multi-site active/active** runs **full production capacity in two or more Regions**, all serving live users via Route 53 **latency** or **weighted** routing with health checks. When one Region fails, Route 53 stops routing to it and the others absorb the load. RPO and RTO are near zero.\n\n- The data layer needs multi-Region writes (**DynamoDB Global Tables**) or a single writer with fast promotion (**Aurora Global Database**, optionally with write forwarding).\n- A variant is **hot standby** (active/passive at full scale): full capacity in DR but no live traffic until failover.\n- Most expensive: you pay for double (or more) production.",
      },
      {
        heading: 'AWS Elastic Disaster Recovery (DRS)',
        beyond: true,
        body:
          "**AWS Elastic Disaster Recovery** (DRS) is the managed service for server-level DR of physical, virtual (VMware, Hyper-V) and cloud servers, including EC2 instances in another Region.\n\n- An agent on each source server performs **continuous block-level replication** into a low-cost **staging area** in your AWS account (small replication instances and cheap EBS volumes), so you do not pay for full-size recovery servers until you need them.\n- On failover (or a non-disruptive drill), DRS launches full-size **recovery instances** in minutes, from the latest state or an earlier **point in time** (useful against ransomware).\n- Typical RPO **seconds**, RTO **minutes**, at roughly pilot-light standing cost.\n- Supports **failback** to the original site after recovery.\n\nIt is the lift-and-shift DR answer: 'on-premises servers must fail over to AWS with RPO of seconds and RTO of minutes at minimal cost, without re-architecting'. (Its sibling, AWS Application Migration Service, uses the same replication technology for one-time migrations.)",
      },
      {
        heading: 'Choosing: extract the numbers, pick the cheapest band',
        body:
          "Procedure for every DR question:\n\n1. Underline the **RPO** and **RTO**.\n2. Note any hard words: 'no interruption', 'serve users during a Regional outage', 'minimize cost'.\n3. Pick the **cheapest** strategy whose bands meet both numbers.\n\nThe supporting cast appears in every option: **CloudFormation** to rebuild, **Route 53 failover routing** (or Global Accelerator) to move traffic, **cross-Region snapshot copy automation** (AWS Backup, DLM) to close the RPO gap, and **AMIs** to launch compute quickly.",
        table: {
          headers: ['Scenario wording', 'Answer'],
          rows: [
            ["'Cheapest possible DR, next-day recovery is fine'", 'Backup & Restore'],
            ["'RPO 15 minutes, RTO 4 hours, minimize cost'", 'Pilot Light'],
            ["'RTO of 10 minutes, a reduced-capacity copy may run continuously'", 'Warm Standby'],
            ["'Must keep serving users during a Regional outage with no interruption'", 'Multi-site active/active'],
            ["'On-premises VMs, RPO seconds, RTO minutes, low cost, no re-architecture'", 'AWS Elastic Disaster Recovery'],
            ["'Relational DB, RPO 1 s, RTO < 1 min across Regions'", 'Aurora Global Database (as the data layer of Pilot Light / Warm Standby / Multi-site)'],
          ],
        },
      },
    ],
    diagram: {
      title: 'The DR spectrum and a Regional failover',
      groups: [
        { id: 'reg-p', label: 'Primary Region', kind: 'region', x: 34, y: 3, w: 62, h: 25 },
        { id: 'reg-d', label: 'DR Region', kind: 'region', x: 34, y: 32, w: 62, h: 25 },
      ],
      nodes: [
        { id: 'users', label: 'Users', icon: 'users', x: 8, y: 30 },
        { id: 'r53', label: 'Route 53', icon: 'route53', x: 22, y: 30, sub: 'failover record' },
        { id: 'alb-p', label: 'ALB', icon: 'alb', x: 46, y: 15 },
        { id: 'app-p', label: 'App ASG', icon: 'ec2', x: 66, y: 15, sub: '10 instances' },
        { id: 'db-p', label: 'Primary DB', icon: 'aurora', x: 86, y: 15, sub: 'writer' },
        { id: 'alb-d', label: 'ALB', icon: 'alb', x: 46, y: 45 },
        { id: 'app-d', label: 'App ASG', icon: 'ec2', x: 66, y: 45, sub: '0 → 2 → 10' },
        { id: 'db-d', label: 'DR DB', icon: 'aurora-global-database', x: 86, y: 45, sub: 'secondary' },
      ],
      edges: [
        { id: 'e-u', from: 'users', to: 'r53' },
        { id: 'e-r-p', from: 'r53', to: 'alb-p', label: 'primary' },
        { id: 'e-p1', from: 'alb-p', to: 'app-p' },
        { id: 'e-p2', from: 'app-p', to: 'db-p' },
        { id: 'e-repl', from: 'db-p', to: 'db-d', label: 'replication' },
        { id: 'e-r-d', from: 'r53', to: 'alb-d', label: 'secondary', dashed: true },
        { id: 'e-d1', from: 'alb-d', to: 'app-d' },
        { id: 'e-d2', from: 'app-d', to: 'db-d' },
      ],
      steps: [
        {
          caption: 'Normal operation: Route 53 sends all users to the primary Region.',
          highlight: ['users', 'r53', 'alb-p', 'app-p', 'db-p'],
          flow: [{ edge: 'e-u' }, { edge: 'e-r-p' }, { edge: 'e-p1' }, { edge: 'e-p2' }],
        },
        {
          caption: 'Backup & Restore: only backups (snapshots, AWS Backup copies) reach the DR Region. Nothing runs there. RPO/RTO in hours.',
          highlight: ['reg-d', 'db-d'],
          flow: [{ edge: 'e-repl' }],
        },
        {
          caption: 'Pilot Light: the database replicates continuously (Aurora Global Database, ~1 s lag), but the app ASG sits at 0 instances.',
          highlight: ['db-p', 'db-d', 'app-d'],
          flow: [{ edge: 'e-repl' }],
        },
        {
          caption: 'Warm Standby: the whole stack runs in DR at small size (2 instances) and can take test traffic. RTO drops to minutes.',
          highlight: ['alb-d', 'app-d', 'db-d'],
          flow: [{ edge: 'e-d1' }, { edge: 'e-d2' }],
        },
        {
          caption: 'Disaster: the primary Region becomes unavailable and its Route 53 health check fails.',
          highlight: ['reg-p'],
          fail: ['reg-p', 'alb-p', 'app-p', 'db-p'],
          flow: [{ edge: 'e-r-p', color: 'bad' }],
        },
        {
          caption: 'Failover: promote the DR database to writer, scale the DR ASG to full size, and Route 53 starts answering with the DR ALB.',
          highlight: ['r53', 'alb-d', 'app-d', 'db-d'],
          flow: [{ edge: 'e-u' }, { edge: 'e-r-d' }, { edge: 'e-d1' }, { edge: 'e-d2' }],
        },
        {
          caption: 'Multi-site active/active would have had both Regions serving at full size all along (latency routing); failover is just Route 53 dropping the dead Region.',
          highlight: ['alb-p', 'alb-d', 'r53'],
          flow: [{ edge: 'e-r-p' }, { edge: 'e-r-d' }],
        },
      ],
    },
    keyFacts: [
      'Backup & Restore: RPO/RTO in hours (up to 24 h+), cheapest.',
      'Pilot Light: data layer replicating, compute off; RPO seconds–minutes, RTO tens of minutes–hours.',
      'Warm Standby: full stack running scaled down; RTO minutes.',
      'Multi-site active/active: full capacity in multiple Regions; RPO/RTO near zero, most expensive.',
      'Infrastructure as code (CloudFormation) makes Backup & Restore and Pilot Light practical.',
      'Route 53 failover routing (or Global Accelerator) moves traffic to the DR Region.',
      'AWS Elastic Disaster Recovery: continuous block replication to a low-cost staging area, RPO seconds, RTO minutes.',
      'Aurora Global Database (RPO ~1 s, RTO < 1 min) and DynamoDB Global Tables are the usual data layers for the faster strategies.',
    ],
    examTips: [
      "Extract RPO and RTO, then pick the CHEAPEST band that satisfies both.",
      "'RPO 15 min, RTO 4 h, minimize cost' → Pilot Light.",
      "'Cheapest possible DR, next-day recovery acceptable' → Backup & Restore.",
      "'Must serve users during a Regional outage with no interruption' → Multi-site active/active.",
      "'Scaled-down but fully functional copy that can be scaled up quickly' → Warm Standby.",
      "'On-premises servers to AWS with low RPO/RTO and minimal standing cost' → AWS Elastic Disaster Recovery.",
      "'Protect against data corruption or ransomware' → point-in-time backups (AWS Backup with Vault Lock) in addition to replication.",
    ],
    pitfalls: [
      'Choosing Multi-site when the RTO is hours and the question says minimize cost.',
      'Calling Pilot Light what is really Warm Standby: in Pilot Light the application servers are NOT running.',
      'Assuming Multi-AZ counts as DR for a Regional outage: it protects only within one Region.',
      'Forgetting DNS TTL and instance launch time when estimating RTO.',
      'Relying only on replication: corruption and deletes replicate too.',
    ],
    prosCons: [
      {
        option: 'Backup & Restore',
        pros: ['Lowest cost', 'Simple', 'Also protects against corruption and ransomware'],
        cons: ['RPO = backup interval', 'RTO in hours', 'Restore procedure must be tested'],
        useWhen: 'Non-critical systems, or when next-day recovery is acceptable.',
      },
      {
        option: 'Pilot Light',
        pros: ['Low RPO from continuous data replication', 'Low compute cost (servers off)'],
        cons: ['RTO tens of minutes (launch, warm up, DNS)', 'Failover steps must be automated and rehearsed'],
        useWhen: 'RPO in minutes, RTO in hours, cost-sensitive.',
      },
      {
        option: 'Warm Standby',
        pros: ['RTO minutes', 'Environment is proven working', 'Can take some traffic'],
        cons: ['Pay for a running scaled-down stack 24/7', 'Must scale up quickly under pressure'],
        useWhen: 'Business-critical apps needing recovery in minutes.',
      },
      {
        option: 'Multi-site active/active',
        pros: ['Near-zero RPO and RTO', 'Also improves global latency'],
        cons: ['Highest cost', 'Multi-Region data consistency is hard', 'Operational complexity'],
        useWhen: "'No downtime even during a Regional outage'.",
      },
      {
        option: 'AWS Elastic Disaster Recovery',
        pros: ['Seconds RPO, minutes RTO', 'Low standing cost (staging area)', 'No re-architecture, point-in-time recovery'],
        cons: ['Server-level, not cloud-native', 'Agents on every source server'],
        useWhen: 'Lift-and-shift DR for on-premises or EC2 servers.',
      },
    ],
    services: ['route53', 'cloudformation', 'backup', 'aurora-global-database', 'dynamodb-global-tables', 'rds-read-replica', 'ami', 'auto-scaling', 'global-accelerator', 's3-replication'],
  },

  // ---------------------------------------------------------------- 14
  {
    id: 'm2-ref-orders',
    module: 'm2',
    domain: 'resilient',
    title: 'Reference Architecture: Resilient Order Processing',
    minutes: 25,
    summary:
      'Walk a complete resilient order-processing design tier by tier, justify every component against its alternatives, and spot the broken versions the exam describes.',
    analogy: {
      title: 'A well-run mail-order warehouse',
      body:
        "Customers phone a call center with many operators in three different buildings (load balancer and web tier). The operator writes the order on a slip, says 'thanks, it's confirmed', and drops it in a pneumatic tube. The tube makes three copies: one goes to accounting, one to the packing floor, one to the statistics office (fan-out). Each department has its own inbox, so if the packers go on strike their slips pile up but accounting keeps working (queues).\n\nAccounting handles slips strictly in order per customer and never charges twice (FIFO). A slip nobody can read goes to a 'problem' tray instead of being passed around forever (dead-letter queue). The master ledger is kept in a fireproof room with copies in three buildings (Aurora), and a copy syncs every second to a warehouse in another city that can open within the hour if this city floods (Global Database and pilot light).",
    },
    sections: [
      {
        heading: 'Requirements and the end-to-end flow',
        body:
          "The business sells online and runs flash sales that send traffic to 10x normal. Requirements:\n\n- Never lose an accepted order, even when a back-end system is down or overwhelmed.\n- Confirm orders to users immediately.\n- Never double-charge, and process each customer's payments in order.\n- Reporting must not slow down production.\n- Survive the loss of an AZ with no interruption; survive the loss of the Region with RPO about 1 second and RTO under an hour, at modest cost.\n\nFlow: **Users → Route 53 → ALB (3 AZs) → web ASG (private subnets, target tracking on requests per target) → SNS topic 'OrderPlaced' → three SQS queues (payments FIFO, fulfillment, analytics) → workers (scaling on backlog per instance) → Aurora Multi-AZ (writer + 2 readers) + DynamoDB session/cart table.** DLQs on every queue; Step Functions orchestrates payment retries; AWS Backup handles snapshots; Aurora Global Database replicates to a second Region where a pilot-light copy waits behind a Route 53 failover record.",
      },
      {
        heading: 'Tier 1: DNS and the front door',
        body:
          "**Route 53** hosts `shop.example.com` with a **failover** record pair: primary = Alias to the ALB in the main Region with Evaluate target health; secondary = Alias to the ALB in the DR Region.\n\n**Application Load Balancer** across **three AZs**, HTTPS with an ACM certificate, forwarding to the web target group.\n\n- **Why ALB, not NLB**: this is HTTP traffic, and the ALB gives path routing (`/api/*` vs static), redirects HTTP→HTTPS, and could authenticate users. NLB would only win if partners needed static IPs.\n- **Why Route 53 failover, not Global Accelerator**: the DR strategy is pilot light with an RTO under an hour, so a minute or two of DNS caching is acceptable and Route 53 is cheaper. Global Accelerator would be right if failover had to be near-instant regardless of DNS caching.\n- **Optional**: CloudFront in front for static assets and AWS WAF for bot protection during flash sales.",
      },
      {
        heading: 'Tier 2: a stateless web tier',
        body:
          "A **web Auto Scaling group** in **private subnets in three AZs** (no public IPs; the ALB is the only entry point), with **one NAT gateway per AZ** for outbound calls, so an AZ failure cannot take out everyone's internet path.\n\n- **Scaling**: target tracking on **ALBRequestCountPerTarget** (for example 1,000 requests per target). Requests per target tracks user load directly; CPU can lag or mislead for I/O-bound web servers. Add **scheduled** scaling before announced flash sales.\n- **Sizing**: enough instances that losing one AZ still carries the load (3 AZs × N/2).\n- **Stateless**: sessions and carts live in a **DynamoDB** table (on-demand capacity, TTL for expiry). Any instance can serve any user, so scale-in and AZ failures log nobody out.\n- **Why DynamoDB over ElastiCache for carts**: carts must be durable (a lost cart is lost revenue), and DynamoDB is serverless with three-AZ replication built in. ElastiCache Valkey would be faster but is a cache; it would fit for pure session tokens if latency were the priority.\n- **Images and launch**: a golden AMI so new instances are healthy in seconds; ELB health checks enabled on the ASG.",
      },
      {
        heading: 'Tier 3: decoupling with fan-out',
        body:
          "When a user checks out, the web tier publishes **one 'OrderPlaced' message** and immediately confirms. Three systems consume it independently:\n\n- **payments queue (SQS FIFO)**, MessageGroupId = customer ID: strict per-customer order and exactly-once processing, so no duplicate charges, while different customers still process in parallel.\n- **fulfillment queue (SQS Standard)**: high throughput, idempotent consumers.\n- **analytics queue (SQS Standard)**, optionally with an SNS filter policy.\n\nA FIFO queue can only subscribe to an **SNS FIFO topic**, so either the topic is FIFO (SNS FIFO topics can also deliver to Standard queues, but have lower publish throughput) or the web tier sends payment messages straight to the FIFO queue and publishes the rest to a Standard topic. In a flash sale the second option keeps the fan-out topic unconstrained.\n\nEvery queue has a **DLQ** (maxReceiveCount around 5) with a CloudWatch alarm, and long polling enabled.",
        table: {
          headers: ['Decision', 'Chosen', 'Rejected alternative and why'],
          rows: [
            ['Web → back end', 'Async via SNS → SQS', 'Synchronous calls: a slow worker or DB drops orders at peak'],
            ['Fan-out hub', 'SNS', 'EventBridge also works (content routing, archive/replay) but SNS is simpler and higher-throughput for app-to-app fan-out'],
            ['Payments queue', 'SQS FIFO per customer', 'SQS Standard: duplicates and reordering could double-charge'],
            ['Poison messages', 'DLQ on every queue', 'No DLQ: bad messages loop forever and hide real backlog'],
          ],
        },
      },
      {
        heading: 'Tier 4: workers and orchestration',
        body:
          "- **Fulfillment and analytics workers** run in their own ASGs that scale on **backlog per instance** (queue depth ÷ instances), not CPU, because the queue length is the real measure of work waiting. Scale-in protection or termination lifecycle hooks stop an instance being killed mid-job; consumers are idempotent because SQS Standard is at-least-once.\n- **Payments**: each message starts a **Step Functions Standard** execution: validate → charge (Retry with exponential backoff on provider timeouts) → record in Aurora → on final failure, **Catch** to a compensation path that cancels the order and notifies the customer. Step Functions gives an auditable history of every payment, which finance will want.\n\nAlternatives: **Lambda** consumers instead of EC2 ASGs remove server management and scale automatically with queue depth; they fit when each job finishes well under 15 minutes. EC2 or ECS workers fit long or heavy jobs. Lambda chaining instead of Step Functions is rejected: no built-in retries or visibility.",
      },
      {
        heading: 'Tier 5: the data layer',
        body:
          "- **Orders in Aurora (MySQL or PostgreSQL)**, Multi-AZ: a writer plus **two readers** in other AZs. Storage keeps 6 copies across 3 AZs. If the writer fails, a reader is promoted in under 30 seconds and the cluster endpoint follows.\n- **Reports** connect to the **reader endpoint**, so analytical queries never touch the writer.\n- **RDS Proxy** in front if Lambda consumers are used, to pool connections and shorten failover impact.\n- **Sessions and carts** in **DynamoDB** (three AZs built in, PITR on).\n\nWhy Aurora over RDS Multi-AZ: faster failover, readers that share storage with millisecond lag, and Aurora Global Database for the cross-Region requirement. RDS Multi-AZ + a cross-Region read replica would be cheaper but could not promise ~1 s RPO or fast cross-Region promotion.",
      },
      {
        heading: 'Tier 6: backups and Regional DR',
        body:
          "- **AWS Backup** plan for Aurora, DynamoDB and EBS: daily recovery points, 35-day retention, copies to the DR Region and a separate backup account, **Vault Lock** for ransomware resistance. Replication alone would faithfully copy a bad deployment's corruption.\n- **Aurora Global Database** replicates to the DR Region with ~1 s lag (**RPO ~1 s**).\n- **Pilot light** in the DR Region: AMIs, launch templates, ASGs at 0, the ALB, queues and topics deployed from the same **CloudFormation** templates. On disaster: promote the Global Database secondary (< 1 min), scale ASGs up, and the Route 53 failover record shifts traffic when the primary health check fails. **RTO: tens of minutes**, dominated by instance launch.\n- If the business later demands an RTO of a few minutes, upgrade to **warm standby** (small ASGs always running); if it demands no interruption, go **active/active** with DynamoDB Global Tables and latency routing, at roughly double the cost.",
      },
      {
        heading: 'Exam angle: spot the broken version',
        body:
          "Exam questions describe a broken version of this architecture and ask for the fix:\n\n- Synchronous web → worker or web → DB calls that drop orders at peak → add **SQS** between them.\n- One NAT gateway or all instances in one AZ → **one NAT gateway per AZ**, ASG across AZs.\n- Reports slowing production → **read replica / Aurora reader endpoint**.\n- No DLQ, poison messages loop forever → **DLQ** with maxReceiveCount.\n- Duplicate charges → **SQS FIFO** (and idempotent consumers).\n- Workers scaled on CPU fall behind → scale on **backlog per instance**.\n- Users logged out on scale-in → sessions in **DynamoDB/ElastiCache**.\n- Hung app instances never replaced → **ELB health checks** on the ASG.",
      },
    ],
    diagram: {
      title: 'Resilient order processing, end to end',
      groups: [
        { id: 'region', label: 'Primary Region (3 AZs)', kind: 'region', x: 25, y: 3, w: 72, h: 54 },
      ],
      nodes: [
        { id: 'users', label: 'Shoppers', icon: 'users', x: 5, y: 30 },
        { id: 'r53', label: 'Route 53', icon: 'route53', x: 17, y: 30, sub: 'failover' },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 31, y: 30 },
        { id: 'web', label: 'Web ASG', icon: 'auto-scaling', x: 43, y: 30, sub: 'req/target' },
        { id: 'ddb', label: 'Sessions & carts', icon: 'dynamodb', x: 43, y: 48 },
        { id: 'sns', label: 'OrderPlaced topic', icon: 'sns', x: 55, y: 30 },
        { id: 'dlq', label: 'DLQ', icon: 'sqs', x: 55, y: 48 },
        { id: 'payq', label: 'payments.fifo', icon: 'sqs', x: 67, y: 12 },
        { id: 'fulq', label: 'Fulfillment queue', icon: 'sqs', x: 67, y: 30 },
        { id: 'anaq', label: 'Analytics queue', icon: 'sqs', x: 67, y: 48 },
        { id: 'sfn', label: 'Payment workflow', icon: 'step-functions', x: 80, y: 12 },
        { id: 'fulw', label: 'Fulfillment ASG', icon: 'ec2', x: 80, y: 30, sub: 'backlog/instance' },
        { id: 'anaw', label: 'Analytics ASG', icon: 'ec2', x: 80, y: 48 },
        { id: 'aurora', label: 'Aurora Multi-AZ', icon: 'aurora', x: 92, y: 30, sub: 'Global DB → DR' },
      ],
      edges: [
        { id: 'e-u-r53', from: 'users', to: 'r53' },
        { id: 'e-r53-alb', from: 'r53', to: 'alb' },
        { id: 'e-alb-web', from: 'alb', to: 'web' },
        { id: 'e-web-ddb', from: 'web', to: 'ddb', label: 'cart' },
        { id: 'e-web-sns', from: 'web', to: 'sns', label: 'publish' },
        { id: 'e-sns-pay', from: 'sns', to: 'payq' },
        { id: 'e-sns-ful', from: 'sns', to: 'fulq' },
        { id: 'e-sns-ana', from: 'sns', to: 'anaq' },
        { id: 'e-pay-sfn', from: 'payq', to: 'sfn' },
        { id: 'e-ful-w', from: 'fulq', to: 'fulw' },
        { id: 'e-ana-w', from: 'anaq', to: 'anaw' },
        { id: 'e-sfn-db', from: 'sfn', to: 'aurora', label: 'writer' },
        { id: 'e-fulw-db', from: 'fulw', to: 'aurora' },
        { id: 'e-anaw-db', from: 'anaw', to: 'aurora', label: 'reader', dashed: true },
        { id: 'e-ful-dlq', from: 'fulq', to: 'dlq', label: 'redrive' },
      ],
      steps: [
        {
          caption: 'A shopper resolves the site via Route 53 and reaches the ALB, which spreads requests across a stateless web ASG in three AZs.',
          highlight: ['users', 'r53', 'alb', 'web'],
          flow: [{ edge: 'e-u-r53' }, { edge: 'e-r53-alb' }, { edge: 'e-alb-web' }],
        },
        {
          caption: 'The web tier saves the cart in DynamoDB, publishes one OrderPlaced message and confirms the order to the user immediately.',
          highlight: ['web', 'ddb', 'sns'],
          flow: [{ edge: 'e-web-ddb' }, { edge: 'e-web-sns' }],
        },
        {
          caption: 'The topic fans out a copy to each queue. Every consumer now works independently at its own pace.',
          highlight: ['sns', 'payq', 'fulq', 'anaq'],
          flow: [{ edge: 'e-sns-pay' }, { edge: 'e-sns-ful' }, { edge: 'e-sns-ana' }],
        },
        {
          caption: 'Payments flow through the FIFO queue in per-customer order into a Step Functions workflow that retries the card provider and writes to the Aurora writer.',
          highlight: ['payq', 'sfn', 'aurora'],
          flow: [{ edge: 'e-pay-sfn' }, { edge: 'e-sfn-db' }],
        },
        {
          caption: 'The fulfillment fleet crashes during the sale. Its queue simply grows; payments and analytics continue, and no order is lost.',
          highlight: ['fulq', 'sfn', 'anaw'],
          fail: ['fulw'],
          flow: [{ edge: 'e-ful-w', color: 'bad' }, { edge: 'e-ana-w' }, { edge: 'e-anaw-db' }],
        },
        {
          caption: 'Fulfillment recovers and scales out on backlog per instance. One malformed message keeps failing and is moved to the DLQ after 5 receives.',
          highlight: ['fulw', 'fulq', 'dlq'],
          flow: [{ edge: 'e-ful-w' }, { edge: 'e-fulw-db' }, { edge: 'e-ful-dlq' }],
        },
        {
          caption: 'If the whole Region fails, Aurora Global Database (~1 s RPO) is promoted in the DR Region, pilot-light ASGs scale up, and the Route 53 failover record shifts traffic.',
          highlight: ['r53', 'aurora'],
          fail: ['region'],
          flow: [{ edge: 'e-u-r53' }],
        },
      ],
    },
    keyFacts: [
      'ALB + web ASG across 3 AZs = fault-tolerant, stateless web tier.',
      'Web ASG scales on ALBRequestCountPerTarget; worker ASGs scale on backlog per instance.',
      'Sessions and carts in DynamoDB keep the web tier stateless and durable.',
      'SNS → SQS fan-out: one event, three independent, durable consumers.',
      'SQS FIFO with MessageGroupId = customer ID prevents duplicate and out-of-order payments.',
      'An SQS FIFO queue can only subscribe to an SNS FIFO topic.',
      'DLQ on every queue stops poison messages looping forever.',
      'Aurora writer + 2 readers: reports use the reader endpoint; failover < 30 s.',
      'Aurora Global Database + Route 53 failover + pilot light = Regional DR with ~1 s RPO.',
      'One NAT gateway per AZ avoids a cross-AZ single point of failure.',
    ],
    examTips: [
      "'Synchronous calls from web to workers drop orders at peak' → insert SQS and scale workers on queue depth.",
      "'Payments sometimes processed twice' → SQS FIFO (exactly-once, per-customer order) and idempotent consumers.",
      "'Reporting queries slow down order writes' → send reports to Aurora replicas via the reader endpoint.",
      "'Single NAT gateway' or 'all instances in one AZ' → make every tier per-AZ.",
      "'A new system must also react to every order' → add a subscription to the existing topic; do not change the web tier.",
      "'Region-level DR with ~1 s RPO at modest cost' → Aurora Global Database with a pilot-light stack behind a Route 53 failover record.",
      "'Messages that always fail clog the pipeline' → DLQ with maxReceiveCount and an alarm.",
    ],
    pitfalls: [
      'Letting the web tier wait for payment to complete: the user should get confirmation once the message is durably queued.',
      'Sharing one SQS queue between fulfillment and analytics: each message would go to only one of them.',
      'Scaling workers on CPU instead of queue backlog.',
      'Forgetting DLQs, so one bad message is retried forever.',
      'Treating Aurora Global Database alone as DR: the compute tier, queues and DNS failover must exist in the DR Region too.',
    ],
    prosCons: [
      {
        option: 'SNS → SQS fan-out (chosen)',
        pros: ['Simple, very high throughput', 'Per-consumer durability, DLQs and scaling'],
        cons: ['FIFO subscriptions need an SNS FIFO topic', 'Limited routing logic'],
        useWhen: 'App-generated events consumed by a known set of internal services.',
      },
      {
        option: 'EventBridge instead of SNS',
        pros: ['Content-based rules', 'Archive and replay', 'Easy cross-account targets'],
        cons: ['Max 5 targets per rule', 'Higher cost per event at flash-sale volume'],
        useWhen: 'Many teams or accounts subscribe with complex routing, or replay is required.',
      },
      {
        option: 'EC2 worker ASGs (chosen)',
        pros: ['Any job length', 'Fine control over instance type and cost (Spot)'],
        cons: ['Servers to patch and scale'],
        useWhen: 'Long or heavy fulfillment jobs.',
      },
      {
        option: 'Lambda consumers',
        pros: ['No servers', 'Scales automatically with queue depth', 'Pay per use'],
        cons: ['15-minute limit', 'Can exhaust DB connections without RDS Proxy'],
        useWhen: 'Short, bursty jobs with least operational overhead.',
      },
      {
        option: 'Pilot light DR (chosen)',
        pros: ['~1 s RPO via Global Database', 'Low standing compute cost'],
        cons: ['RTO tens of minutes'],
        useWhen: 'Regional DR where under an hour of downtime is acceptable.',
      },
      {
        option: 'Warm standby or active/active DR',
        pros: ['RTO minutes (warm) or near zero (active/active)'],
        cons: ['Continuous cost of a running second stack', 'Active/active needs multi-Region writes'],
        useWhen: 'Business requires faster recovery than pilot light provides.',
      },
    ],
    services: ['route53', 'alb', 'auto-scaling', 'ec2', 'sns', 'sqs', 'step-functions', 'aurora', 'aurora-global-database', 'dynamodb', 'backup', 'nat-gateway', 'cloudformation'],
  },
] satisfies Lesson[];
