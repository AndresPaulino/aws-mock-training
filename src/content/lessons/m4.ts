import type { Lesson } from '../types';

export default [
  // ---------------------------------------------------------------------------
  {
    id: 'm4-billing-model',
    module: 'm4',
    domain: 'cost',
    title: 'How AWS Bills You',
    minutes: 15,
    summary:
      'Break any AWS charge into time, capacity and usage, spot what keeps billing while idle, and apply the exam\'s "requirements first, then cheapest" reflex to every cost question.',
    analogy: {
      title: 'A utility bill with three meters',
      body:
        "Think of renting a fully serviced workshop. You pay **rent by the hour** for every machine you leave switched on, whether anyone is using it or not. You pay **storage rent** for the shelf space your boxes take up, full or empty. And you pay **per job** for every delivery truck that leaves the building with goods. Bringing materials *in* is free; the landlord wants your stuff inside.\n\nAWS works the same way. Every line on the bill is one of those three meters: time (machines switched on), capacity (shelf space reserved), or usage (jobs done and bytes shipped out). Saving money means switching off idle machines, renting smaller shelves, and shipping goods by the cheapest route.",
    },
    sections: [
      {
        heading: 'The problem: cloud bills surprise people',
        body:
          "On-premises you buy a server once and the cost is sunk. In AWS almost everything is **pay-as-you-go**: you are billed continuously for what you have provisioned and for what you do with it. That flexibility is the whole point of cloud (no up-front capital, scale down any time), but it also means a forgotten test instance, an orphaned disk or a chatty network path keeps costing money every hour.\n\nThe exam's cost domain (about 20% of the scored questions) is not about memorising price lists. It tests whether you can look at an architecture and see **which meter is running** and which design change turns it down without breaking a requirement.",
      },
      {
        heading: 'The three levers: time, capacity, usage',
        body:
          "Every AWS charge is some combination of three things:\n\n- **Time**: hours (or seconds) a resource exists, busy or idle. EC2 and RDS instance-hours, NAT Gateway hours, load balancer hours, interface endpoint hours. Fix: stop paying for idle time with Auto Scaling, schedules, or serverless.\n- **Capacity**: how much you reserved. GB-month of EBS or S3, provisioned IOPS, DynamoDB provisioned RCUs/WCUs, Redshift nodes. Fix: right-size, use gp3 instead of over-provisioned io1, use S3 Intelligent-Tiering or lifecycle rules.\n- **Usage**: what you actually did. Requests (S3 GET/PUT, Lambda invocations, API Gateway calls), GB transferred out, TB scanned by Athena. Fix: route usage through cheaper paths (VPC endpoints, CloudFront, same-AZ), compress, cache, partition.\n\nA single service often mixes all three. A NAT Gateway bills time (about $0.045 per hour in us-east-1) **and** usage (about $0.045 per GB processed). Lambda bills usage only: $0.20 per million requests plus GB-seconds of compute, so idle Lambda costs nothing.",
      },
      {
        heading: 'What is free (and what keeps billing while idle)',
        body:
          "Many exam distractors hinge on knowing which paths are free. Commit this pair of lists to memory.",
        table: {
          headers: ['Free (or effectively free)', 'Charged even when idle'],
          rows: [
            ['Data transfer IN from the internet', 'EC2 and RDS running instance-hours'],
            ['Traffic between resources in the same AZ over private IPs', 'EBS volumes (attached or not) and their snapshots'],
            ['S3 and DynamoDB Gateway VPC endpoints', 'Every public IPv4 address, including unattached Elastic IPs (about $0.005/hour each since Feb 2024)'],
            ['ALB cross-zone load balancing', 'NAT Gateway hours'],
            ['One CloudTrail trail of management events (plus 90-day Event history)', 'Provisioned IOPS (io1/io2, gp3 above baseline)'],
            ['AWS managed KMS keys (aws/s3, aws/ebs)', 'DynamoDB provisioned capacity'],
            ['CloudFront fetches from AWS origins (S3, ALB, EC2)', 'Load balancer hours (ALB, NLB, GWLB)'],
            ['Trusted Advisor core checks, Cost Explorer console', 'Interface VPC endpoints (per AZ per hour)'],
          ],
        },
      },
      {
        heading: 'How billing is assembled: accounts, Regions, tiers',
        body:
          "**Billing granularity.** Linux EC2 bills per second with a 60-second minimum; Windows and some marketplace AMIs historically bill per hour. RDS bills per second too. Storage is GB-month, prorated hourly.\n\n**Regional prices differ.** The same m7g.large costs more in Sao Paulo than in us-east-1. Data transfer prices also vary by Region. That is why exam answers sometimes move non-latency-sensitive batch work to a cheaper Region, but only if data-residency requirements allow.\n\n**Tiered pricing.** S3 storage and internet egress get cheaper per GB as volume grows. With **AWS Organizations consolidated billing**, usage from all member accounts is added together, so the whole organisation reaches cheaper tiers sooner, and Reserved Instance / Savings Plan discounts are shared across accounts (unless sharing is turned off).\n\n**Free Tier.** Accounts created since 15 July 2025 get a credit-based Free Tier (up to $200 in credits over a 6-month free plan) instead of the old 12-month allowances; some services keep an always-free allowance (for example 1 million Lambda requests per month). The exam does not test Free Tier details.",
        beyond: true,
      },
      {
        heading: 'The exam\'s cost reflex',
        body:
          "When a question says **MOST cost-effective** or **lowest cost**, do it in two passes:\n\n- **Pass 1, filter**: cross out every answer that fails a stated requirement: durability, latency, RTO/RPO, multi-AZ, 'immediate access', 'no internet'. Those answers are often the cheapest on purpose; they are bait.\n- **Pass 2, rank**: among the survivors, pick the cheapest. Rough rule: **managed or serverless wins for variable or spiky load** (no idle time), **commitments win for steady load** (Savings Plans, RIs), **Spot wins for interruptible load**.\n\nAlso watch for the qualifier changing mid-question. 'Most cost-effective solution with the LEAST operational overhead' means both filters apply: managed services, then cheapest among them.",
      },
      {
        heading: 'Reading a bill like an architect',
        body:
          "When you see an architecture in a question, walk it from the edge inward and ask, for each box, 'which meter runs here?'\n\n- **Edge**: egress to users is per-GB and is usually the largest variable line. CloudFront reduces it.\n- **Compute tier**: instance-hours. Is the fleet sized for peak 24/7? Auto Scaling, Spot, Savings Plans.\n- **Network plumbing**: NAT Gateway per-GB, cross-AZ hops, interface endpoint hours.\n- **Data tier**: provisioned capacity sitting idle (DynamoDB provisioned, a Redshift cluster used one day a month).\n- **Storage**: GB-month in the wrong class (hot class for cold data), orphaned snapshots, old object versions.\n\nIf you can name the meter, the fix is usually one of three moves: delete idle time, shrink capacity, or reroute usage.",
      },
    ],
    diagram: {
      title: 'Where the meters run in a simple web app',
      groups: [{ id: 'g-region', label: 'us-east-1', kind: 'region', x: 16, y: 6, w: 80, h: 48 }],
      nodes: [
        { id: 'users', label: 'Users', icon: 'users', x: 7, y: 30 },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 26, y: 30, sub: 'hourly + LCU' },
        { id: 'ec2', label: 'EC2 web', icon: 'ec2', x: 44, y: 20, sub: 'per-second' },
        { id: 'ebs', label: 'EBS gp3', icon: 'ebs', x: 44, y: 42, sub: 'GB-month' },
        { id: 'rds', label: 'RDS', icon: 'rds', x: 64, y: 20, sub: 'instance-hours' },
        { id: 's3', label: 'S3', icon: 's3', x: 64, y: 42, sub: 'GB + requests' },
        { id: 'nat', label: 'NAT Gateway', icon: 'nat-gateway', x: 85, y: 20, sub: 'hours + per GB' },
        { id: 'eip', label: 'Spare Elastic IP', icon: 'elastic-ip', x: 85, y: 42, sub: '$0.005/h idle' },
      ],
      edges: [
        { id: 'e-in', from: 'users', to: 'alb', label: 'in: free' },
        { id: 'e-web', from: 'alb', to: 'ec2' },
        { id: 'e-db', from: 'ec2', to: 'rds', label: 'same AZ: free' },
        { id: 'e-disk', from: 'ec2', to: 'ebs' },
        { id: 'e-obj', from: 'ec2', to: 's3', label: 'requests' },
        { id: 'e-nat', from: 'rds', to: 'nat', label: 'per GB', dashed: true },
      ],
      steps: [
        {
          caption: 'Requests and uploads coming IN from the internet are free. AWS charges for what leaves, not what arrives.',
          highlight: ['users', 'alb', 'e-in'],
          flow: [{ edge: 'e-in' }],
        },
        {
          caption: 'Time meter: the ALB, EC2, RDS and NAT Gateway bill every hour they exist, even at 0% utilisation.',
          highlight: ['alb', 'ec2', 'rds', 'nat'],
        },
        {
          caption: 'Capacity meter: EBS bills per provisioned GB-month and S3 per stored GB-month, whether or not anyone reads the data.',
          highlight: ['ebs', 's3', 'e-disk'],
        },
        {
          caption: 'Usage meter: S3 PUT/GET requests and every GB a NAT Gateway processes add per-unit charges.',
          highlight: ['e-obj', 'e-nat', 'nat', 's3'],
          flow: [{ edge: 'e-obj' }, { edge: 'e-nat' }],
        },
        {
          caption: 'Responses going OUT to users are billed per GB (about $0.09/GB after the first 100 GB/month). Egress is usually the biggest variable line.',
          highlight: ['users', 'alb', 'e-in'],
          flow: [{ edge: 'e-in', reverse: true, color: 'bad' }],
        },
        {
          caption: 'Idle waste: an Elastic IP not attached to anything still bills hourly, like an unattached EBS volume. Release what you do not use.',
          highlight: ['eip'],
          fail: ['eip'],
        },
      ],
    },
    keyFacts: [
      'Every charge is time (hours existing), capacity (GB/IOPS/units reserved) or usage (requests, GB transferred, TB scanned).',
      'Data transfer IN from the internet is free; data transfer OUT is per-GB and tiered (first 100 GB/month free across services, then about $0.09/GB in us-east-1).',
      'Same-AZ traffic over private IPs is free; cross-AZ traffic is about $0.01/GB in each direction.',
      'All public IPv4 addresses, including unattached Elastic IPs, cost about $0.005/hour each (since February 2024).',
      'EBS volumes bill per provisioned GB-month even when unattached; snapshots bill for stored changed blocks.',
      'NAT Gateway: about $0.045/hour plus $0.045 per GB processed (us-east-1).',
      'S3 and DynamoDB Gateway endpoints are free; interface endpoints bill per AZ-hour plus per GB.',
      'Linux EC2 bills per second with a 60-second minimum.',
      'Consolidated billing aggregates usage across accounts for volume tiers and shares RI/Savings Plan discounts.',
      'Lambda bills only per request ($0.20 per million) and per GB-second, so idle functions cost nothing.',
    ],
    examTips: [
      '"MOST cost-effective" → first eliminate answers that break a requirement, then choose the cheapest survivor.',
      '"Variable / spiky / unpredictable load" + cost → serverless or Auto Scaling (pay for no idle time).',
      '"Steady 24/7 load" + cost → a commitment (Savings Plan or Reserved Instance).',
      '"Unexpected charges in a stopped environment" → look for EBS volumes, Elastic IPs, NAT Gateways and load balancers, which bill while idle.',
      'If an option saves money by moving data INTO AWS differently, it rarely helps: ingress is already free. Look at egress and cross-AZ instead.',
      '"Reduce cost across many accounts" → AWS Organizations consolidated billing (volume tiers + shared commitments).',
    ],
    pitfalls: [
      'Assuming stopping an EC2 instance stops all charges: attached EBS volumes and any Elastic IP keep billing.',
      'Picking the cheapest option that silently breaks a requirement (One Zone-IA when multi-AZ durability is required).',
      'Thinking traffic between two AZs is free because it stays in one Region; it is billed both directions.',
      'Forgetting that a NAT Gateway charges per GB processed, not just per hour.',
      'Treating the AWS-managed KMS key and a customer managed key as the same cost: customer managed keys are $1/month each plus requests.',
    ],
    services: ['ec2', 'ebs', 's3', 'nat-gateway', 'elastic-ip', 'alb', 'rds', 'lambda', 'organizations', 'gateway-endpoint'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-purchasing',
    module: 'm4',
    domain: 'cost',
    title: 'Purchasing Options: On-Demand, RIs, Savings Plans, Spot',
    minutes: 22,
    summary:
      'Choose between On-Demand, Reserved Instances, Savings Plans, Spot, Dedicated Hosts and Capacity Reservations by matching each workload\'s steadiness, flexibility and interruption tolerance to the right discount.',
    analogy: {
      title: 'Taxis, leases, gym memberships and standby seats',
      body:
        "**On-Demand** is a taxi: available any time, no commitment, highest price per mile.\n\n**Reserved Instances** are a car lease: you promise to pay for a specific model for 1 or 3 years and get a big discount. A Standard lease locks the model; a Convertible lease lets you swap for an equal-or-better car.\n\n**Savings Plans** are a monthly transport budget: you promise to spend, say, $10 per hour on travel for 3 years, and every ride (any car, bus, or scooter) is discounted up to that amount.\n\n**Spot** is an airline standby seat: very cheap, but the airline can bump you with two minutes' warning if a paying passenger shows up. Great if you can take the next flight; terrible for your wedding.\n\n**Dedicated Host** is renting a whole private garage because your insurance (software licence) is priced per garage.",
    },
    sections: [
      {
        heading: 'The trade: flexibility versus discount',
        body:
          "AWS sells the same EC2 capacity in different ways. The more you promise (time, amount, or tolerance for interruption), the lower the price.\n\n- **On-Demand** is the price of maximum flexibility: no commitment, start and stop any time, billed per second (Linux).\n- **Commitments** (Reserved Instances and Savings Plans) discount the portion of usage you are sure about for **1 or 3 years**.\n- **Spot** sells AWS's spare capacity at up to 90% off, with the catch that AWS can reclaim it with a **2-minute notice**.\n\nA mature account layers them: **Savings Plans for the always-on baseline, On-Demand for the variable middle, Spot for the interruptible top.** The exam loves this layered answer.",
      },
      {
        heading: 'The options side by side',
        body:
          "Discounts are 'up to' figures versus On-Demand; real discounts depend on term, payment option, instance family and Region.",
        table: {
          headers: ['Option', 'Max discount', 'Commitment / flexibility', 'Best for'],
          rows: [
            ['On-Demand', '0%', 'None; per-second billing (Linux)', 'Unknown, short-lived or first deployments'],
            ['Standard RI', '~72%', '1 or 3 yr; locked to instance family + Region (size-flexible within family for Linux, shared tenancy); can sell on RI Marketplace', 'Steady workloads that will not change'],
            ['Convertible RI', '~66%', '1 or 3 yr; can exchange family/OS/tenancy for equal-or-greater value; cannot be sold', 'Steady but likely to evolve'],
            ['Compute Savings Plan', '~66%', '$/hour commitment; applies to ANY EC2 family, size, Region, OS, tenancy, plus Fargate and Lambda', 'Default recommendation; most flexible commitment'],
            ['EC2 Instance Savings Plan', '~72%', '$/hour commitment to one family in one Region; size/OS/tenancy flexible', 'Steady use of one family in one Region'],
            ['Spot', '~90%', 'None; 2-minute reclaim notice; price set by supply in each capacity pool', 'Fault-tolerant, stateless: batch, CI/CD, rendering, big data, ASG mixed fleets'],
            ['Dedicated Host', 'n/a (On-Demand or reserved host pricing)', 'Whole physical server; visibility into sockets/cores; host affinity', 'BYOL per-socket/core licences (Windows Server, SQL Server, Oracle); strict compliance'],
            ['Dedicated Instance', 'n/a', 'Hardware not shared with other accounts; no host control', 'Physical isolation without licence needs'],
            ['On-Demand Capacity Reservation', '0% (stack with SP/RI for discount)', 'Reserve capacity in one AZ for any duration; billed whether used or not', 'Guarantee capacity for an event or DR; not a discount tool'],
          ],
        },
      },
      {
        heading: 'How Reserved Instances and Savings Plans actually apply',
        body:
          "Neither RIs nor Savings Plans are servers. They are **billing discounts** that AWS applies automatically, every hour, to matching usage.\n\n**Reserved Instances** match on attributes: instance family, Region, OS, tenancy. A **Regional** RI (the default) gives a discount across any AZ and is size-flexible (one m5.2xlarge RI covers two m5.xlarge). A **zonal** RI is tied to one AZ and also reserves capacity there. RIs exist for EC2, RDS, ElastiCache, Redshift and OpenSearch; DynamoDB offers 'reserved capacity'.\n\n**Savings Plans** match on spend: you commit to, for example, $5.00/hour of compute for 3 years. Each hour AWS applies the discounted rate to eligible usage until the $5.00 is used up; anything above is On-Demand; anything below is still charged (you pay the full commitment). Savings Plans cover EC2, Fargate and Lambda (Compute SP) and SageMaker AI (SageMaker SP), but not RDS.\n\n**Payment options**: All Upfront (largest discount) > Partial Upfront > No Upfront. **Sharing**: in an Organization with consolidated billing, unused RI/SP discounts flow to other accounts automatically unless sharing is disabled.\n\nIn December 2025 AWS also launched Database Savings Plans for managed databases. The SAA-C03 exam predates them, so on the exam the database commitment answer is still RDS/Aurora Reserved Instances or DynamoDB reserved capacity.",
      },
      {
        heading: 'Spot in practice',
        body:
          "Spot capacity comes from **capacity pools** (one instance type in one AZ). When AWS needs the capacity back, the instance gets a **2-minute interruption notice** through the instance metadata service and an EventBridge event, and may also receive an earlier **rebalance recommendation**. You no longer bid; you pay the current Spot price, which moves slowly with supply.\n\nBest practices the exam expects:\n\n- **Diversify**: allow many instance types (for example m5, m6i, m7i, c6i) across all AZs so one pool drying up does not stop you.\n- Use the **price-capacity-optimized** (or capacity-optimized) allocation strategy so AWS picks the deepest pools, reducing interruptions.\n- **Checkpoint** long jobs to S3 so a reclaimed instance resumes where it stopped.\n- Handle the notice: drain from the load balancer, finish or requeue work (SQS visibility timeout makes this natural).\n- **Never** put a single stateful component (a self-managed database, a primary node) on Spot.\n\nAn **Auto Scaling group with a mixed instances policy** can run an On-Demand base (say 2 instances) and fill the rest with Spot; Spot Fleet and EC2 Fleet do the same for batch.",
      },
      {
        heading: 'Dedicated options and Capacity Reservations',
        body:
          "**Dedicated Hosts** give you a whole physical server. You see sockets and physical cores, and with **host affinity** an instance restarts on the same host. That is what per-socket or per-core licences (Windows Server, SQL Server, Oracle) require for Bring Your Own Licence (BYOL). Pair with **AWS License Manager** to track licence counts.\n\n**Dedicated Instances** also run on single-tenant hardware but without host visibility. Choose them when compliance says 'no shared hardware' but licensing does not care about sockets.\n\n**On-Demand Capacity Reservations** guarantee that capacity exists in a specific AZ for as long as you hold them. They give no discount on their own (you pay On-Demand rates whether or not you run instances), but a Regional RI or Savings Plan applies on top. Use them for a launch day, a Black Friday event, or a DR Region that must be able to start instances during a regional crunch. For short, scheduled GPU needs, EC2 Capacity Blocks for ML reserve GPU capacity for days to weeks.",
      },
      {
        heading: 'Exam angle: decoding the wording',
        body:
          "- 'Steady 24/7 for 3 years, maximum savings, will not change' → Standard RI or EC2 Instance Savings Plan, All Upfront.\n- 'Also runs Fargate or Lambda' or 'may change instance family or Region' → **Compute Savings Plan**.\n- 'Steady but we expect to upgrade instance types' (RI wording) → Convertible RI.\n- 'Interruptible', 'batch', 'stateless', 'can be restarted', 'flexible start time' → **Spot**.\n- 'Software licensed per socket/core', 'BYOL' → **Dedicated Host**.\n- 'Guarantee capacity for a launch event' → **Capacity Reservation**.\n- 'Steady baseline plus unpredictable peaks' → Savings Plan for the baseline + On-Demand/Spot for peaks.\n- 'Minimise management of commitments' → one Compute Savings Plan beats many RIs.",
      },
    ],
    diagram: {
      title: 'Layering purchase options on one workload',
      nodes: [
        { id: 'org', label: 'Organization', icon: 'organizations', x: 14, y: 10, sub: 'consolidated bill' },
        { id: 'asg', label: 'ASG mixed fleet', icon: 'auto-scaling', x: 50, y: 10, sub: 'OD base + Spot' },
        { id: 'sp', label: 'Baseline', icon: 'savings-plans', x: 18, y: 32, sub: 'Compute SP ~66%' },
        { id: 'od', label: 'Daytime peak', icon: 'ec2', x: 50, y: 32, sub: 'On-Demand' },
        { id: 'spot', label: 'Batch burst', icon: 'ec2-spot', x: 82, y: 32, sub: 'Spot up to 90%' },
        { id: 'fargate', label: 'Fargate + Lambda', icon: 'fargate', x: 18, y: 50, sub: 'same SP covers' },
        { id: 'eb', label: 'EventBridge', icon: 'eventbridge', x: 82, y: 50, sub: '2-min notice' },
      ],
      edges: [
        { id: 'e-share', from: 'org', to: 'sp', label: 'shared discount' },
        { id: 'e-base', from: 'asg', to: 'sp' },
        { id: 'e-peak', from: 'asg', to: 'od' },
        { id: 'e-burst', from: 'asg', to: 'spot' },
        { id: 'e-cover', from: 'sp', to: 'fargate' },
        { id: 'e-notice', from: 'spot', to: 'eb', label: 'interruption' },
      ],
      steps: [
        {
          caption: 'The always-on baseline (say 4 instances, 24/7) is covered by a 3-year Compute Savings Plan: about 66% off.',
          highlight: ['sp', 'asg', 'e-base'],
          flow: [{ edge: 'e-base' }],
        },
        {
          caption: 'The same Compute Savings Plan also discounts Fargate tasks and Lambda functions, so one commitment covers the whole compute estate.',
          highlight: ['sp', 'fargate', 'e-cover'],
          flow: [{ edge: 'e-cover' }],
        },
        {
          caption: 'Daytime peaks above the baseline are launched On-Demand: no commitment for capacity that only exists 10 hours a day.',
          highlight: ['od', 'e-peak'],
          flow: [{ edge: 'e-peak' }],
        },
        {
          caption: 'Interruptible batch work runs on Spot across many instance types and AZs at up to 90% off.',
          highlight: ['spot', 'e-burst'],
          flow: [{ edge: 'e-burst' }],
        },
        {
          caption: 'When AWS reclaims a Spot instance it sends a 2-minute notice (metadata + EventBridge). Work is checkpointed and the ASG replaces capacity from another pool.',
          highlight: ['spot', 'eb', 'e-notice'],
          flow: [{ edge: 'e-notice', color: 'bad' }],
          fail: ['spot'],
        },
        {
          caption: 'With consolidated billing, unused Savings Plan hours in one account automatically discount matching usage in other accounts of the Organization.',
          highlight: ['org', 'sp', 'e-share'],
          flow: [{ edge: 'e-share' }],
        },
      ],
    },
    keyFacts: [
      'Spot: up to ~90% off, 2-minute interruption notice via instance metadata and EventBridge.',
      'Standard RI and EC2 Instance Savings Plan: up to ~72% off; Convertible RI and Compute Savings Plan: up to ~66% off.',
      'Terms are 1 or 3 years; payment options All Upfront > Partial Upfront > No Upfront in discount size.',
      'Compute Savings Plans apply across EC2 family, size, Region, OS and tenancy, plus Fargate and Lambda.',
      'Regional RIs are size-flexible within a family (Linux, shared tenancy) and give no capacity reservation; zonal RIs reserve capacity in one AZ.',
      'Only Standard RIs can be sold on the RI Marketplace; Convertible RIs can be exchanged instead.',
      'Capacity Reservations give 0% discount on their own and bill whether used or not; RIs/SPs can apply on top.',
      'Dedicated Hosts expose sockets/cores for BYOL licensing; Dedicated Instances only guarantee single-tenant hardware.',
      'RI and Savings Plan discounts are shared across an Organization by default.',
      'Savings Plans do not cover RDS; use RDS Reserved Instances for steady databases.',
    ],
    examTips: [
      '"EC2 fleet plus a Fargate (or Lambda) API in one commitment, maximum savings, minimum management" → 3-year Compute Savings Plan sized to the steady baseline, not Standard RIs (which cannot cover Fargate).',
      '"Steady 24/7 for 3 years, will not change" → Standard RI or EC2 Instance Savings Plan, All Upfront.',
      '"Production workload with no stated interruption tolerance" → never Spot, however cheap.',
      '"Batch / CI / rendering / can be restarted" → Spot with diversified instance types and checkpoints.',
      '"Licensed per socket or per core" → Dedicated Host (plus License Manager).',
      '"Guarantee capacity for a launch event or DR" → On-Demand Capacity Reservation (or zonal RI).',
      '"Steady baseline with unpredictable peaks" → Savings Plan for the baseline, On-Demand or Spot above it.',
    ],
    pitfalls: [
      'Choosing a Capacity Reservation as a cost-saving tool: it reserves capacity, it does not discount.',
      'Putting a stateful single node (self-managed database, primary) on Spot to save money.',
      'Buying Standard RIs for a workload that is about to change family or move Region; a Compute SP or Convertible RI fits better.',
      'Thinking a Savings Plan is a server: it is a billing discount, and you pay the hourly commitment even if usage drops below it.',
      'Confusing Dedicated Instances with Dedicated Hosts when the question mentions per-socket licensing.',
    ],
    prosCons: [
      {
        option: 'On-Demand',
        pros: ['No commitment', 'Per-second billing', 'Always available for new workloads'],
        cons: ['Highest unit price', 'Wasteful for steady 24/7 usage'],
        useWhen: 'Workload is new, short-lived, or its shape is unknown.',
      },
      {
        option: 'Compute Savings Plan',
        pros: ['Applies across EC2 families, Regions, OS, plus Fargate and Lambda', 'One commitment to manage', 'Shared across the Organization'],
        cons: ['Smaller discount than Standard RI / EC2 Instance SP', '1 or 3 year lock-in on $/hour spend'],
        useWhen: 'Steady baseline spend that may change shape over the term.',
      },
      {
        option: 'Standard RI / EC2 Instance SP',
        pros: ['Largest commitment discount (~72%)', 'Standard RIs can be resold'],
        cons: ['Locked to a family (and Region)', 'Wasted if the workload changes'],
        useWhen: 'Very stable usage of one instance family in one Region for the whole term.',
      },
      {
        option: 'Spot',
        pros: ['Up to ~90% off', 'No commitment'],
        cons: ['2-minute reclaim', 'Capacity not guaranteed', 'Needs fault-tolerant design'],
        useWhen: 'Stateless, interruptible or checkpointable work.',
      },
      {
        option: 'Dedicated Host',
        pros: ['Socket/core visibility for BYOL', 'Host affinity', 'Physical isolation'],
        cons: ['Pay for the whole host', 'You manage host capacity'],
        useWhen: 'Per-socket/per-core licences or strict hardware-isolation compliance.',
      },
    ],
    services: ['ec2', 'ec2-spot', 'reserved-instances', 'savings-plans', 'auto-scaling', 'fargate', 'lambda', 'organizations', 'license-manager', 'eventbridge'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-cost-compute',
    module: 'm4',
    domain: 'cost',
    title: 'Cost-Optimizing Compute',
    minutes: 16,
    summary:
      'Cut compute spend without losing performance by right-sizing with Compute Optimizer, moving to Graviton, scaling and scheduling idle fleets away, and choosing serverless for sporadic load.',
    analogy: {
      title: 'Heating an office building',
      body:
        "Imagine heating a ten-floor office to 22 degrees all night, every night, with the biggest boiler on the market, because once a year there is a cold snap. That is how many companies run servers: sized for the worst day, switched on 24/7.\n\nA smart facilities manager does four things: buys a boiler that matches the real need (right-sizing), switches to a more efficient fuel (Graviton), turns heating off at night and on weekends (schedules), and adds portable heaters only on cold days (Auto Scaling). For a broom cupboard used twice a week, she uses a plug-in heater that runs only when someone is inside (serverless).",
    },
    sections: [
      {
        heading: 'The problem: paying for peak, all the time',
        body:
          "Compute is usually the largest line on an AWS bill, and most of it is waste of two kinds:\n\n- **Over-provisioning**: instances sized for an imagined peak. An m5.2xlarge (8 vCPU, 32 GiB) averaging 8% CPU could be an m5.large at a quarter of the price.\n- **Idle time**: dev/test fleets, internal tools and batch servers running nights and weekends when nobody uses them. A fleet that runs only 50 business hours a week instead of 168 costs about 70% less.\n\nPurchasing options (previous lesson) lower the price per hour. This lesson lowers the number of hours and the size of each hour. Do both: right-size first, then commit, or you lock a discount onto waste.",
      },
      {
        heading: 'Right-sizing with AWS Compute Optimizer',
        body:
          "**AWS Compute Optimizer** analyses CloudWatch utilisation history (it needs at least 30 hours of data, looks back 14 days by default, and up to 93 days with the paid enhanced infrastructure metrics) and uses machine learning to recommend better-fitting resources for:\n\n- EC2 instances and Auto Scaling groups (smaller or different family, including Graviton)\n- EBS volumes (for example io1 → gp3)\n- Lambda functions (memory size)\n- ECS services on Fargate (task CPU/memory)\n- RDS and Aurora DB instances, and commercial software licences\n\nEach finding is labelled Over-provisioned, Under-provisioned or Optimized, with projected savings and performance risk. It is free for the default analysis.\n\n**Memory matters**: EC2 does not report memory utilisation to CloudWatch by default. Install the **CloudWatch agent** so Compute Optimizer can see memory; otherwise it may recommend a size that is too small.\n\nOn the exam, 'instances average 10% CPU, identify and fix with least effort' → Compute Optimizer recommendations (Trusted Advisor's low-utilisation check is a weaker alternative).",
      },
      {
        heading: 'Cheaper silicon: Graviton and the right family',
        body:
          "**AWS Graviton** processors (Arm-based, instance names with a 'g': m7g, c7g, r8g, t4g) give roughly **20-40% better price/performance** than comparable x86 instances. Most Linux workloads in interpreted or JIT languages (Java, Python, Node.js, .NET 6+) and containers built for arm64 move with little change. Lambda and Fargate also offer Arm (Graviton) at about 20% lower price per GB-second.\n\nPick the **family** that matches the bottleneck: C (compute), R/X (memory), M (balanced), T (burstable, cheap for low average CPU with occasional spikes), I/D (local storage), P/G (GPU). A memory-bound cache on a C instance wastes money on CPU it cannot use.",
      },
      {
        heading: 'Stop paying for idle time',
        body:
          "- **Auto Scaling** with target tracking (for example keep average CPU at 50%, or requests per target at 1,000) adds instances for the peak and removes them afterwards. You never pay for peak 24/7.\n- **Scheduled scaling** on a group: set desired capacity to 0 at 19:00 and back to 4 at 07:00 for internal apps.\n- **Instance Scheduler on AWS** (a solution using EventBridge + Lambda + tags) or Systems Manager Quick Setup / State Manager stops and starts tagged EC2 and RDS instances on a schedule. Stopping dev/test nights and weekends saves about 65-70%.\n- **Hibernate** keeps RAM contents on EBS so long-booting instances resume quickly after being stopped.\n- Remember: a stopped instance still pays for its EBS volumes and public IPv4 addresses.",
      },
      {
        heading: 'Serverless for sporadic or spiky load',
        body:
          "When load is sporadic, spiky or unpredictable, the cheapest server is no server. **Lambda** bills per millisecond of execution and per request; **Fargate** bills per second for task vCPU/memory with no instances to keep warm; **Aurora Serverless v2** scales capacity in fine-grained ACUs (and can pause to 0 ACUs when idle); **DynamoDB on-demand** bills per request.\n\n**Lambda tuning**: memory also sets CPU. Doubling memory can more than halve duration for CPU-bound code, so a 1,024 MB function can be cheaper than a 512 MB one. The open-source **AWS Lambda Power Tuning** tool (a Step Functions state machine) runs your function at several memory sizes and graphs cost versus speed; Compute Optimizer also recommends Lambda memory.\n\nServerless is not always cheaper. A steady 24/7 high-throughput workload is often cheaper on right-sized EC2 or Fargate with a Savings Plan. The exam signal for serverless is 'sporadic', 'unpredictable', 'idle most of the day', 'least operational overhead'.",
      },
      {
        heading: 'Exam angle',
        body:
          "Map the symptom to the lever:\n\n- 'Underutilised instances', '10% CPU' → Compute Optimizer right-sizing.\n- 'Better price/performance with minimal change' → Graviton.\n- 'Dev/test runs only during business hours' → scheduled stop/start (Instance Scheduler, scheduled scaling).\n- 'Load varies through the day' → Auto Scaling with target tracking.\n- 'Runs a few times a day / unpredictable bursts' → Lambda or Fargate.\n- 'Long batch jobs, flexible deadline' → AWS Batch or an ASG on Spot.\n\nRight-size before you buy a commitment, and never answer an availability problem with a bigger instance.",
      },
    ],
    diagram: {
      title: 'Right-size, re-platform and schedule',
      nodes: [
        { id: 'big', label: 'm5.2xlarge', icon: 'ec2', x: 12, y: 18, sub: 'avg CPU 8%' },
        { id: 'cw', label: 'CloudWatch', icon: 'cloudwatch', x: 35, y: 18, sub: 'CPU + agent mem' },
        { id: 'co', label: 'Compute Optimizer', icon: 'compute-optimizer', x: 58, y: 18, sub: 'over-provisioned' },
        { id: 'lt', label: 'Launch template', icon: 'launch-template', x: 82, y: 18, sub: 'v2: m7g.large' },
        { id: 'asg', label: 'ASG refresh', icon: 'auto-scaling', x: 82, y: 42, sub: 'target tracking' },
        { id: 'sched', label: 'Schedule 19:00', icon: 'eventbridge', x: 35, y: 42, sub: 'tag env=dev' },
        { id: 'dev', label: 'Dev fleet', icon: 'ec2', x: 58, y: 42, sub: 'off nights' },
      ],
      edges: [
        { id: 'e-metrics', from: 'big', to: 'cw', label: 'metrics' },
        { id: 'e-analyse', from: 'cw', to: 'co', label: '14-day lookback' },
        { id: 'e-rec', from: 'co', to: 'lt', label: 'right-size' },
        { id: 'e-roll', from: 'lt', to: 'asg', label: 'instance refresh' },
        { id: 'e-stop', from: 'sched', to: 'dev', label: 'stop / start' },
      ],
      steps: [
        {
          caption: 'An m5.2xlarge averages 8% CPU. It reports CPU to CloudWatch; the CloudWatch agent adds memory, which EC2 does not publish by default.',
          highlight: ['big', 'cw', 'e-metrics'],
          flow: [{ edge: 'e-metrics' }],
        },
        {
          caption: 'Compute Optimizer analyses the last 14 days of metrics and flags the instance as over-provisioned, with projected savings.',
          highlight: ['co', 'e-analyse'],
          flow: [{ edge: 'e-analyse' }],
        },
        {
          caption: 'The recommendation, a Graviton m7g.large, goes into a new launch template version: smaller size plus about 20-40% better price/performance.',
          highlight: ['lt', 'e-rec'],
          flow: [{ edge: 'e-rec' }],
        },
        {
          caption: 'An ASG instance refresh rolls the fleet onto the new template, and target tracking adds instances only when load needs them.',
          highlight: ['asg', 'e-roll'],
          flow: [{ edge: 'e-roll' }],
        },
        {
          caption: 'A scheduled rule stops every instance tagged env=dev at 19:00 and starts it at 07:00 on weekdays, cutting dev compute hours by about 70%.',
          highlight: ['sched', 'dev', 'e-stop'],
          flow: [{ edge: 'e-stop' }],
        },
      ],
    },
    keyFacts: [
      'Compute Optimizer covers EC2, Auto Scaling groups, EBS, Lambda, ECS on Fargate, RDS/Aurora and licences; it needs at least 30 hours of metrics and looks back 14 days by default (93 with enhanced metrics).',
      'EC2 does not publish memory utilisation by default; install the CloudWatch agent.',
      'Graviton (m7g, c7g, r8g, t4g) offers about 20-40% better price/performance than comparable x86.',
      'Lambda and Fargate on Arm cost about 20% less per unit than x86.',
      'Running dev/test only 50 business hours a week instead of 168 cuts those compute hours by about 70%.',
      'Lambda memory also scales CPU; more memory can finish faster and cost less overall.',
      'Stopped EC2 instances still bill for EBS and public IPv4 addresses.',
      'Aurora Serverless v2 can scale down to 0 ACUs (auto-pause) when idle.',
    ],
    examTips: [
      '"Instances run at 10% CPU, reduce cost" → Compute Optimizer right-sizing recommendations.',
      '"Improve price/performance with minimal code change" → move to Graviton instances.',
      '"Development environment used only during office hours" → scheduled stop/start (Instance Scheduler or scheduled scaling).',
      '"Traffic varies throughout the day" → Auto Scaling with target tracking instead of a fleet sized for peak.',
      '"Function runs a few times per hour" or "unpredictable spikes" → Lambda/Fargate, which have no idle cost.',
      '"Find the cheapest Lambda memory setting" → Lambda Power Tuning or Compute Optimizer.',
    ],
    pitfalls: [
      'Buying a 3-year commitment before right-sizing, locking a discount onto waste.',
      'Right-sizing on CPU alone when memory is the real bottleneck (no CloudWatch agent).',
      'Assuming serverless is always cheaper: steady, high-throughput 24/7 load is often cheaper on committed EC2.',
      'Answering an availability problem with a larger instance: size does not add AZs.',
    ],
    prosCons: [
      {
        option: 'Right-size EC2 (Compute Optimizer)',
        pros: ['Immediate savings', 'No architecture change'],
        cons: ['Needs metric history', 'Must test the smaller size'],
        useWhen: 'Steady fleets with low average utilisation.',
      },
      {
        option: 'Move to serverless (Lambda/Fargate)',
        pros: ['Zero idle cost', 'Least operational overhead'],
        cons: ['Refactoring effort', 'Can cost more for steady high load'],
        useWhen: 'Sporadic, spiky or unpredictable load.',
      },
      {
        option: 'Scheduled stop/start',
        pros: ['Simple', 'Large savings for dev/test'],
        cons: ['Only for non-24/7 workloads', 'Storage still bills'],
        useWhen: 'Environments used only in working hours.',
      },
    ],
    services: ['compute-optimizer', 'ec2', 'auto-scaling', 'launch-template', 'lambda', 'fargate', 'cloudwatch', 'eventbridge', 'aurora-serverless', 'batch'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-cost-storage-db',
    module: 'm4',
    domain: 'cost',
    title: 'Cost-Optimizing Storage & Databases',
    minutes: 20,
    summary:
      'Pick the cheapest storage class, volume type and database capacity mode that still meets durability, latency and access requirements, and move analytics off expensive always-on engines.',
    analogy: {
      title: 'A kitchen, a garage, a storage unit and a warehouse',
      body:
        "You keep today's groceries in the kitchen (expensive space, instant reach). Winter coats go in the garage: cheaper, a short walk. Old tax records go to a rented storage unit across town: cheap, but you have to drive there. Your grandparents' furniture goes to a warehouse in another state: almost free per month, but getting it back takes days and a fee.\n\nS3 storage classes, EBS volume types and database capacity modes are the same decision. Put each item in the cheapest place that still lets you reach it as fast as you actually need to. Moving things down the chain automatically as they age (lifecycle rules) is like a housekeeper who clears the kitchen every month.",
    },
    sections: [
      {
        heading: 'The problem: hot prices for cold data',
        body:
          "Storage grows forever unless something deletes or moves it. Most data is read heavily for days or weeks and then almost never. Leaving all of it in S3 Standard ($0.023/GB-month) or on a provisioned io2 volume means paying 'hot' prices for data that is cold.\n\nDatabases have the opposite waste: **provisioned capacity sitting idle**. A Redshift cluster used for one monthly report, an RDS instance for a dev team that works 9 to 5, a DynamoDB table provisioned for Black Friday all year. The fixes are to tier storage by access pattern and to make database capacity follow demand.",
      },
      {
        heading: 'S3 storage classes by price',
        body:
          "Approximate us-east-1 prices per GB-month. All classes have 11 nines of durability; all except One Zone-IA store data across at least 3 AZs.",
        table: {
          headers: ['Class', 'Price/GB-mo', 'Retrieval', 'Minimums', 'Use for'],
          rows: [
            ['S3 Standard', '$0.023', 'ms, no fee', 'none', 'Hot, frequently read data'],
            ['S3 Intelligent-Tiering', '$0.023 → $0.0125 → $0.004 automatically', 'ms (optional archive tiers slower)', '$0.0025 per 1,000 objects monitoring', 'Unknown or changing access patterns'],
            ['S3 Standard-IA', '$0.0125', 'ms, per-GB fee', '30 days, 128 KB', 'Read less than monthly, needs instant access'],
            ['S3 One Zone-IA', '$0.01', 'ms, per-GB fee', '30 days, 128 KB', 'Re-creatable data; single AZ'],
            ['S3 Glacier Instant Retrieval', '$0.004', 'ms, higher fee', '90 days, 128 KB', 'Quarterly access, still instant'],
            ['S3 Glacier Flexible Retrieval', '$0.0036', 'minutes to 12 hours', '90 days', 'Archives, rare restores'],
            ['S3 Glacier Deep Archive', '$0.00099', '12 to 48 hours', '180 days', 'Compliance archives (7-10 years)'],
          ],
        },
      },
      {
        heading: 'S3 housekeeping that saves money',
        body:
          "- **Lifecycle rules** transition objects by age (Standard → Standard-IA at 30 days → Glacier Flexible at 90 → Deep Archive at 365) and expire them.\n- **Intelligent-Tiering** moves each object between tiers by its own access history, with no retrieval fees. Best when access is unpredictable. Objects under 128 KB are not monitored or moved.\n- **Abort incomplete multipart uploads** after, say, 7 days (a lifecycle action). Failed uploads otherwise bill invisibly.\n- **Expire noncurrent versions** in versioned buckets; every overwrite keeps a billed old copy.\n- **S3 Storage Lens** and **Storage Class Analysis** show where the bytes are and which prefixes are cold.\n- **Requester Pays** buckets shift request and transfer cost to the consumer of a shared dataset.\n\nMinimum-duration and minimum-size charges make IA classes a bad fit for lots of tiny or short-lived objects.",
      },
      {
        heading: 'EBS, EFS and FSx',
        body:
          "**EBS**: choose **gp3** by default ($0.08/GB-month, 3,000 IOPS and 125 MB/s included, about 20% cheaper than gp2 at $0.10). Raise gp3 IOPS (up to 16,000) or throughput independently instead of buying a bigger disk. Use io2 only for sustained very high IOPS or sub-millisecond needs. For large sequential, rarely accessed data, **st1** (throughput HDD) and **sc1** (cold HDD) are far cheaper. Delete **unattached volumes**, use **Amazon Data Lifecycle Manager** to keep only N snapshots, and move rarely restored snapshots to the **EBS Snapshots Archive** tier (about 75% cheaper, 90-day minimum, 24-72 hour restore).\n\n**EFS**: lifecycle management moves files to the **Infrequent Access** and **Archive** storage classes after N days without access (over 90% cheaper than Standard). **EFS One Zone** roughly halves storage cost for non-critical data. Use **Elastic throughput** rather than paying for provisioned throughput you rarely use.\n\n**FSx**: **scratch** FSx for Lustre file systems for temporary HPC jobs (cheaper, no replication); persistent for long-lived data; right-size throughput capacity; enable data deduplication on FSx for Windows File Server.",
      },
      {
        heading: 'Relational databases: RDS and Aurora',
        body:
          "- **Reserved Instances** for steady RDS/Aurora usage (1 or 3 years, up to about 69% off).\n- **Aurora Serverless v2** for variable or intermittent load: capacity in 0.5 ACU steps (1 ACU is about 2 GiB of RAM), down to 0 ACUs with auto-pause.\n- **Stop dev instances** when idle. A stopped RDS instance auto-starts after **7 days**; for longer pauses take a snapshot and delete the instance.\n- **Aurora I/O-Optimized** removes per-I/O charges in exchange for higher instance and storage prices; worth it when I/O exceeds about 25% of the Aurora bill. Aurora Standard is cheaper for low I/O.\n- **Storage auto scaling** grows RDS storage when needed instead of over-allocating up front.\n- **Graviton DB instances** (db.r7g, db.m7g) for better price/performance.\n- **Offload reads** to a read replica (or ElastiCache) for reporting instead of up-sizing the primary.",
      },
      {
        heading: 'DynamoDB and analytics',
        body:
          "**DynamoDB**:\n\n- **Provisioned capacity + auto scaling** for predictable traffic (cheapest per request); add **reserved capacity** for a steady baseline.\n- **On-demand** for spiky, new or unknown traffic (no capacity planning; prices were cut about 50% in November 2024, so on-demand is now often competitive).\n- **TTL** deletes expired items at no write cost, so session or temporary data does not accumulate.\n- **Standard-IA table class** cuts storage cost about 60% for tables where storage, not throughput, dominates the bill.\n- **Eventually consistent reads** cost half a strongly consistent read; **DAX** or ElastiCache absorb hot reads.\n\n**Analytics**: do not keep a warehouse running for occasional queries. Export history to S3 as **Parquet**, partition by date, and query with **Athena** ($5 per TB scanned; columnar format plus partitioning often cuts scanned bytes by 90%). Use **Redshift Serverless** (billed per RPU-second while queries run) or **pause/resume** a provisioned cluster for intermittent jobs.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Access pattern unknown or changing' → **S3 Intelligent-Tiering**.\n- 'Rarely accessed but must be available immediately' → Standard-IA or **Glacier Instant Retrieval**, never Flexible or Deep Archive.\n- 'Keep 7 years for compliance, retrieval within 48 hours is fine' → **Deep Archive** via lifecycle.\n- 'Data can be re-created' plus cost → One Zone-IA; but if the question says 'multiple AZs' or 'resilient to AZ loss', it is out.\n- 'Monthly report on an otherwise idle Redshift cluster' → Redshift Serverless or pause/resume, or Athena on Parquet.\n- 'Spiky / unpredictable DynamoDB traffic' → on-demand; 'predictable, steady' → provisioned + auto scaling (+ reserved capacity).\n- 'gp2 volumes' in a cost question → migrate to gp3 (online, via Elastic Volumes).",
      },
    ],
    diagram: {
      title: 'Data getting cheaper as it ages',
      nodes: [
        { id: 'std', label: 'S3 Standard', icon: 's3', x: 10, y: 14, sub: 'day 0: $0.023' },
        { id: 'ia', label: 'Standard-IA', icon: 's3', x: 35, y: 14, sub: 'day 30: $0.0125' },
        { id: 'gir', label: 'Glacier Instant', icon: 's3-glacier', x: 61, y: 14, sub: 'day 90: $0.004' },
        { id: 'gda', label: 'Deep Archive', icon: 's3-glacier', x: 87, y: 14, sub: 'day 365: $0.00099' },
        { id: 'ddb', label: 'DynamoDB', icon: 'dynamodb', x: 12, y: 44, sub: 'TTL + Std-IA class' },
        { id: 'aur', label: 'Aurora SLv2', icon: 'aurora-serverless', x: 38, y: 44, sub: 'scales to 0 ACU' },
        { id: 'athena', label: 'Athena', icon: 'athena', x: 64, y: 44, sub: '$5 per TB scanned' },
        { id: 'parquet', label: 'History in S3', icon: 's3', x: 88, y: 44, sub: 'Parquet, partitioned' },
      ],
      edges: [
        { id: 'e-30', from: 'std', to: 'ia', label: 'lifecycle 30d' },
        { id: 'e-90', from: 'ia', to: 'gir', label: '90d' },
        { id: 'e-365', from: 'gir', to: 'gda', label: '365d' },
        { id: 'e-export', from: 'aur', to: 'parquet', label: 'export history', dashed: true },
        { id: 'e-query', from: 'athena', to: 'parquet', label: 'SQL' },
      ],
      steps: [
        {
          caption: 'New uploads land in S3 Standard: millisecond access while they are hot, at $0.023 per GB-month.',
          highlight: ['std'],
        },
        {
          caption: 'A lifecycle rule moves objects to Standard-IA after 30 days: still instant, about half the storage price, plus a per-GB retrieval fee.',
          highlight: ['std', 'ia', 'e-30'],
          flow: [{ edge: 'e-30' }],
        },
        {
          caption: 'At 90 days they move to Glacier Instant Retrieval ($0.004): still milliseconds, for data read about once a quarter.',
          highlight: ['ia', 'gir', 'e-90'],
          flow: [{ edge: 'e-90' }],
        },
        {
          caption: 'After a year, compliance copies go to Deep Archive at about $1 per TB-month, accepting 12-48 hour restores.',
          highlight: ['gir', 'gda', 'e-365'],
          flow: [{ edge: 'e-365' }],
        },
        {
          caption: 'Databases follow demand: DynamoDB TTL purges expired sessions for free, and Aurora Serverless v2 shrinks when traffic drops.',
          highlight: ['ddb', 'aur'],
        },
        {
          caption: 'Old records are exported to S3 as partitioned Parquet and queried with Athena only when needed, instead of keeping a warehouse running.',
          highlight: ['aur', 'parquet', 'athena', 'e-export', 'e-query'],
          flow: [{ edge: 'e-export' }, { edge: 'e-query' }],
        },
      ],
    },
    keyFacts: [
      'S3 per GB-month (us-east-1): Standard $0.023, Standard-IA $0.0125, One Zone-IA $0.01, Glacier Instant $0.004, Glacier Flexible $0.0036, Deep Archive $0.00099.',
      'Minimum storage durations: Standard-IA/One Zone-IA 30 days, Glacier Instant/Flexible 90 days, Deep Archive 180 days.',
      'Intelligent-Tiering has no retrieval fees but charges $0.0025 per 1,000 monitored objects; objects under 128 KB are not tiered.',
      'gp3: $0.08/GB-month with 3,000 IOPS and 125 MB/s baseline included; about 20% cheaper than gp2.',
      'A stopped RDS instance automatically restarts after 7 days.',
      'Aurora I/O-Optimized pays off when I/O charges exceed roughly 25% of Aurora spend.',
      'DynamoDB TTL deletions consume no write capacity; the Standard-IA table class cuts storage cost about 60%.',
      'Eventually consistent DynamoDB reads cost half of strongly consistent reads.',
      'Athena charges $5 per TB scanned; Parquet plus partitioning reduces scanned data dramatically.',
      'EBS Snapshots Archive is about 75% cheaper, with a 90-day minimum and 24-72 hour restore.',
    ],
    examTips: [
      '"500 TB, about 5% accessed in month one, rare afterwards but must be immediate, 3 AZs required" → S3 Intelligent-Tiering (or Standard → Standard-IA lifecycle); One Zone-IA fails 3 AZs and Glacier Flexible fails "immediate".',
      '"Unknown or unpredictable access pattern" → Intelligent-Tiering.',
      '"Reduce S3 cost in a versioned bucket" → lifecycle rules expiring noncurrent versions and aborting incomplete multipart uploads.',
      '"Monthly 6-hour job on an otherwise idle Redshift cluster" → Redshift Serverless or pause/resume (or Athena over Parquet); a bigger cluster or moving to RDS is wrong.',
      '"Spiky / new DynamoDB workload" → on-demand; "steady, predictable" → provisioned with auto scaling plus reserved capacity.',
      '"Dev database idle for weeks" → snapshot and delete (stopping only lasts 7 days).',
    ],
    pitfalls: [
      'Choosing One Zone-IA when the question requires multi-AZ resilience.',
      'Choosing Glacier Flexible Retrieval or Deep Archive when access must be immediate.',
      'Moving millions of tiny objects to IA classes: the 128 KB minimum billable size and per-request fees erase the savings.',
      'Assuming a stopped RDS instance stays stopped indefinitely.',
      'Forgetting that deleting objects before the minimum duration still bills the remaining days.',
    ],
    prosCons: [
      {
        option: 'S3 Intelligent-Tiering',
        pros: ['Automatic per-object tiering', 'No retrieval fees', 'Millisecond access in the default tiers'],
        cons: ['Monitoring fee per object', 'No benefit for objects under 128 KB'],
        useWhen: 'Access patterns are unknown or change over time.',
      },
      {
        option: 'Lifecycle to Standard-IA / Glacier',
        pros: ['Lowest price when patterns are known', 'Can also expire data'],
        cons: ['Retrieval fees', 'Minimum durations', 'A wrong guess costs money'],
        useWhen: 'Access declines predictably with age.',
      },
      {
        option: 'DynamoDB on-demand',
        pros: ['No capacity planning', 'Handles sudden spikes'],
        cons: ['Higher per-request price than well-utilised provisioned capacity'],
        useWhen: 'Spiky, new or unpredictable traffic.',
      },
      {
        option: 'DynamoDB provisioned + auto scaling',
        pros: ['Cheapest per request at steady utilisation', 'Reserved capacity available'],
        cons: ['Can throttle on sudden spikes', 'Needs capacity planning'],
        useWhen: 'Predictable, steady traffic.',
      },
    ],
    services: ['s3', 's3-glacier', 'ebs', 'efs', 'fsx-lustre', 'rds', 'aurora', 'aurora-serverless', 'dynamodb', 'redshift', 'athena', 'dax'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-data-transfer',
    module: 'm4',
    domain: 'cost',
    title: 'Network & Data Transfer Costs',
    minutes: 22,
    summary:
      'Price any traffic path (ingress, egress, cross-AZ, cross-Region, NAT, endpoints, CloudFront, Direct Connect) and pick the design change that removes the expensive hop without weakening security or availability.',
    analogy: {
      title: 'Postage between rooms, buildings and cities',
      body:
        "Picture a company campus. Passing a note to someone in the **same room** is free. Sending it to **another building** on campus costs a small internal-mail fee each way. Mailing it to **another city** costs more. Sending parcels to **customers** is the most expensive, so you open local pick-up lockers near them (CloudFront) where popular parcels wait pre-stocked.\n\nNow imagine the mail room in building B charges a handling fee per parcel, and you route every parcel from building A through it. That is a NAT Gateway in the wrong AZ. And if there is a free private tunnel straight to the warehouse next door (a Gateway endpoint to S3), sending parcels through the paid mail room at all is pure waste.",
    },
    sections: [
      {
        heading: 'The problem: the bill you cannot see on the diagram',
        body:
          "Architecture diagrams show boxes; the data-transfer bill lives on the **arrows**. It is the most-tested cost topic because it is invisible until you know the rules:\n\n- **In is free, out is paid.** Data from the internet into AWS costs nothing; data from AWS to the internet is charged per GB, tiered.\n- **Distance costs.** Same AZ < cross-AZ < cross-Region < internet.\n- **Middle boxes add processing fees.** NAT Gateway, Transit Gateway and interface endpoints charge per GB they handle, on top of any transfer charge.\n\nPrices below are approximate us-east-1 list prices; they vary by Region, but the ordering is what the exam tests.",
      },
      {
        heading: 'The price of each path',
        body:
          "Read the table top to bottom, roughly from free to most expensive or most surprising.",
        table: {
          headers: ['Traffic path', 'Approximate cost', 'Optimization'],
          rows: [
            ['Internet → AWS (ingress)', 'Free', 'n/a'],
            ['Same AZ, private IP', 'Free', 'Keep chatty tiers co-located when the HA design allows'],
            ['Same AZ via public or Elastic IP', '$0.01/GB each direction', 'Use private IPs inside the VPC'],
            ['Cross-AZ in one Region (incl. VPC peering across AZs)', '$0.01/GB each direction', 'Reduce chatter; AZ-aware routing; accept it for HA'],
            ['Cross-Region', 'About $0.02/GB (sending Region pays)', 'Replicate only what DR/compliance needs'],
            ['AWS → internet (egress)', 'First 100 GB/month free, then about $0.09/GB, cheaper at volume', 'CloudFront, compression, caching'],
            ['CloudFront → internet', 'From about $0.085/GB, lower at volume; 1 TB/month free', 'Cache static and cacheable API responses'],
            ['AWS origin (S3/EC2/ALB) → CloudFront', 'Free', 'Put CloudFront in front of AWS origins'],
            ['Through a NAT Gateway', '$0.045/hour + $0.045/GB processed', 'Gateway/interface endpoints; one NAT per AZ'],
            ['S3/DynamoDB via Gateway endpoint', 'Free', 'Always use for private-subnet S3/DynamoDB traffic'],
            ['Via interface endpoint (PrivateLink)', 'About $0.01/AZ-hour + $0.01/GB', 'Cheaper than NAT for heavy AWS API traffic'],
            ['Transit Gateway', '$0.05/attachment-hour + $0.02/GB processed', 'Peering is cheaper for a few VPCs; TGW for scale'],
            ['Direct Connect out', 'About $0.02/GB (varies by location) + port-hours', 'Route bulk hybrid egress over DX'],
          ],
        },
      },
      {
        heading: 'NAT Gateway: the most common surprise',
        body:
          "A NAT Gateway lets instances in private subnets reach the internet and public AWS endpoints. It charges **per hour** and **per GB processed**, so 50 TB/month of log uploads to S3 through a NAT costs about 50,000 GB × $0.045 ≈ **$2,250/month** in processing alone.\n\nWhen a question says 'NAT Gateway charges are high', ask **what is flowing through it**:\n\n- **S3 or DynamoDB traffic** → add a **Gateway VPC endpoint** to the private route tables. It is free, private, and traffic bypasses the NAT entirely. No application change: the SDK keeps using the normal Regional endpoint names; the route table sends the service prefix list to the endpoint.\n- **Other AWS services** (SQS, CloudWatch Logs, ECR, Secrets Manager, KMS) → **interface endpoints**. They cost $0.01/GB instead of $0.045/GB plus NAT hours, and keep traffic private.\n- **Instances in AZ-a using a NAT in AZ-b** → add **one NAT Gateway per AZ** and point each private route table at its local NAT. That removes the cross-AZ charge and the AZ-level single point of failure.\n- Genuinely internet-bound traffic must pay; for low-volume dev/test a small NAT instance is cheaper (see the m5 thin-spots lesson).",
      },
      {
        heading: 'CloudFront and the egress bill',
        body:
          "Internet egress is usually the largest variable line for a public application. **CloudFront** helps three ways:\n\n- **Origin fetches from AWS origins are free**, so you stop paying EC2/S3 egress rates.\n- CloudFront's own egress rates are **lower than EC2/S3 internet egress** and drop further with volume (and the first 1 TB/month is free).\n- **Cache hits never reach the origin**, so the web tier can shrink. A 90% cache-hit ratio means 90% fewer origin requests.\n\nAlso compress responses (CloudFront can apply gzip/Brotli automatically) and set sensible cache TTLs. **S3 Transfer Acceleration** speeds up long-distance uploads but **adds** about $0.04/GB; it is a performance feature, not a cost feature.",
      },
      {
        heading: 'Hybrid and multi-VPC paths',
        body:
          "**Direct Connect (DX)** data transfer out is billed far below internet egress (about $0.02/GB versus $0.09/GB), plus port-hours. If a company sends tens of TB per month from AWS back to its data centre, moving that over DX can pay for the port. Data **in** over DX, like internet ingress, is free. Site-to-Site VPN bills about $0.05 per connection-hour plus normal internet egress rates.\n\n**VPC peering** has no hourly charge and no processing fee: you pay only standard transfer (free in the same AZ, $0.01/GB each way across AZs, inter-Region rates across Regions). **Transit Gateway** adds $0.05 per attachment-hour and $0.02 per GB processed but gives hub-and-spoke routing for dozens or hundreds of VPCs. For two or three VPCs with heavy traffic, peering is cheaper; at scale, TGW is easier to manage. **PrivateLink** (interface endpoints) suits exposing one service one way.",
        beyond: true,
      },
      {
        heading: 'Exam angle: cost without regression',
        body:
          "Every data-transfer question silently enforces 'no security or availability regression'.\n\n- 'High NAT Gateway charges, traffic is to S3' → S3 Gateway endpoint (free). Giving instances public IPs is a security regression, and an interface endpoint for S3 works but costs per GB when a free option exists.\n- 'Instances in one AZ use the NAT in another AZ' → NAT per AZ.\n- 'High data transfer out to global users' → CloudFront.\n- 'Reduce cross-AZ charges' → co-locate chatty components only if the answer still keeps multi-AZ HA; do not collapse a Multi-AZ design to save $0.01/GB.\n- 'Large recurring transfers back to on-prem' → Direct Connect.\n- 'Connect 100 VPCs' → Transit Gateway despite processing fees; '2 VPCs, heavy traffic, lowest cost' → peering.",
      },
    ],
    diagram: {
      title: 'Data transfer price paths',
      groups: [
        { id: 'g-r1', label: 'us-east-1', kind: 'region', x: 15, y: 2, w: 62, h: 55 },
        { id: 'g-aza', label: 'AZ-a', kind: 'az', x: 18, y: 17, w: 26, h: 37 },
        { id: 'g-azb', label: 'AZ-b', kind: 'az', x: 48, y: 17, w: 26, h: 37 },
        { id: 'g-r2', label: 'us-west-2', kind: 'region', x: 80, y: 2, w: 17, h: 55 },
      ],
      nodes: [
        { id: 'users', label: 'Internet users', icon: 'users', x: 7, y: 12 },
        { id: 'cf', label: 'CloudFront', icon: 'cloudfront', x: 7, y: 40, sub: 'edge cache' },
        { id: 's3', label: 'S3', icon: 's3', x: 46, y: 9, sub: 'gateway endpoint' },
        { id: 'appa', label: 'App AZ-a', icon: 'ec2', x: 31, y: 27 },
        { id: 'dba', label: 'RDS primary', icon: 'rds', x: 31, y: 45 },
        { id: 'appb', label: 'App AZ-b', icon: 'ec2', x: 61, y: 27 },
        { id: 'natb', label: 'NAT GW AZ-b', icon: 'nat-gateway', x: 61, y: 45, sub: '$0.045/GB' },
        { id: 'dr', label: 'DR replica', icon: 'rds-read-replica', x: 88, y: 30, sub: 'cross-Region' },
      ],
      edges: [
        { id: 'e-edge', from: 'users', to: 'cf', label: 'in free, out paid' },
        { id: 'e-origin', from: 'cf', to: 'appa', label: 'origin: free' },
        { id: 'e-sameaz', from: 'appa', to: 'dba', label: 'same AZ: free' },
        { id: 'e-xaz', from: 'appb', to: 'dba', label: '$0.01/GB each way' },
        { id: 'e-nat', from: 'appa', to: 'natb', label: 'cross-AZ + NAT', dashed: true },
        { id: 'e-gwe', from: 'appa', to: 's3', label: 'free' },
        { id: 'e-xreg', from: 'dba', to: 'dr', label: '~$0.02/GB' },
      ],
      steps: [
        {
          caption: 'Requests and uploads from users into AWS are free: ingress is never the cost problem.',
          highlight: ['users', 'cf', 'e-edge'],
          flow: [{ edge: 'e-edge' }],
        },
        {
          caption: 'Responses to the internet are billed per GB. Serving them from CloudFront costs less than EC2/S3 egress, and cache hits never touch the origin.',
          highlight: ['cf', 'users', 'e-edge'],
          flow: [{ edge: 'e-edge', reverse: true }],
        },
        {
          caption: 'CloudFront fetching from an AWS origin (ALB, EC2, S3) is free, so cacheable content stops paying origin egress.',
          highlight: ['cf', 'appa', 'e-origin'],
          flow: [{ edge: 'e-origin', reverse: true }],
        },
        {
          caption: 'The app in AZ-a talking to the database in AZ-a over private IPs pays nothing.',
          highlight: ['appa', 'dba', 'e-sameaz', 'g-aza'],
          flow: [{ edge: 'e-sameaz' }],
        },
        {
          caption: 'The AZ-b app reaching the AZ-a database pays about $0.01/GB in each direction. That is the price of multi-AZ HA: reduce chatter, do not remove the AZ.',
          highlight: ['appb', 'dba', 'e-xaz', 'g-azb'],
          flow: [{ edge: 'e-xaz' }, { edge: 'e-xaz', reverse: true }],
        },
        {
          caption: 'Trap: AZ-a instances using the NAT Gateway in AZ-b pay cross-AZ transfer plus $0.045/GB processing, and lose internet access if AZ-b fails. Fix: one NAT per AZ.',
          highlight: ['appa', 'natb', 'e-nat'],
          flow: [{ edge: 'e-nat', color: 'bad' }],
          fail: ['natb'],
        },
        {
          caption: 'S3 traffic from private subnets goes through a free Gateway endpoint, bypassing the NAT entirely.',
          highlight: ['appa', 's3', 'e-gwe'],
          flow: [{ edge: 'e-gwe' }],
        },
        {
          caption: 'Replicating to a DR Region costs about $0.02/GB, paid by the sending Region. Replicate only what DR or compliance needs.',
          highlight: ['dba', 'dr', 'e-xreg', 'g-r2'],
          flow: [{ edge: 'e-xreg' }],
        },
      ],
    },
    keyFacts: [
      'Ingress from the internet is free; egress to the internet is about $0.09/GB after 100 GB/month free, tiered lower at volume.',
      'Same-AZ traffic over private IPs is free; cross-AZ is about $0.01/GB in each direction.',
      'Traffic over public or Elastic IPs within a Region is billed like cross-AZ, even inside one AZ.',
      'Cross-Region transfer is about $0.02/GB, charged by the sending Region.',
      'NAT Gateway: about $0.045/hour plus $0.045 per GB processed.',
      'Gateway endpoints exist only for S3 and DynamoDB, and they are free.',
      'Interface endpoints: about $0.01 per AZ-hour plus $0.01 per GB.',
      'CloudFront origin fetches from AWS origins are free; CloudFront includes 1 TB/month of free egress.',
      'Transit Gateway: $0.05 per attachment-hour plus $0.02 per GB processed; VPC peering has no hourly or processing fee.',
      'S3 Transfer Acceleration adds about $0.04/GB on top of normal transfer.',
      'Direct Connect egress is roughly $0.02/GB, far below internet egress.',
    ],
    examTips: [
      '"50 TB/month from private subnets to S3, NAT is the largest bill, no security regression" → S3 Gateway endpoint in the private route tables (free); not public IPs, and not an S3 interface endpoint when a free option exists.',
      '"High NAT charges, traffic to SQS/CloudWatch/ECR" → interface endpoints for those services.',
      '"Private instances in several AZs share one NAT Gateway" → one NAT Gateway per AZ (no cross-AZ charges and no single point of failure).',
      '"High data transfer out to users worldwide" → CloudFront in front of the origin.',
      '"Two VPCs exchanging lots of data, lowest cost" → VPC peering; "hundreds of VPCs, simplest management" → Transit Gateway.',
      '"Large ongoing transfers from AWS back to the data centre" → Direct Connect.',
      '"Reduce cross-AZ charges" → only if HA survives; keep Multi-AZ when availability is a requirement.',
    ],
    pitfalls: [
      'Paying to bring data in: ingress is free, so options that "optimise uploads into AWS" rarely cut cost.',
      'Assuming S3 Transfer Acceleration saves money; it costs extra and only improves speed.',
      'Using an interface endpoint for S3 when the Gateway endpoint would be free (interface endpoints for S3 make sense for on-prem or cross-Region access).',
      'Collapsing a multi-AZ design into one AZ to save cross-AZ fees when the question requires high availability.',
      'Forgetting that a single shared NAT Gateway creates cross-AZ charges and an AZ-level single point of failure.',
    ],
    prosCons: [
      {
        option: 'Gateway endpoint (S3/DynamoDB)',
        pros: ['Free', 'Private', 'No app change'],
        cons: ['Only S3 and DynamoDB', 'Not reachable from on-prem or other Regions'],
        useWhen: 'Private subnets in the same Region talk to S3 or DynamoDB.',
      },
      {
        option: 'Interface endpoint (PrivateLink)',
        pros: ['Most AWS services', 'Reachable over VPN/DX', 'Cheaper per GB than NAT'],
        cons: ['Hourly charge per AZ', 'Per-GB charge'],
        useWhen: 'Heavy private traffic to AWS APIs other than S3/DynamoDB.',
      },
      {
        option: 'NAT Gateway',
        pros: ['Managed, scales to 100 Gbps', 'Reaches any internet destination'],
        cons: ['Hourly + $0.045/GB', 'One per AZ needed for HA'],
        useWhen: 'Private instances need genuine internet access.',
      },
      {
        option: 'VPC peering vs Transit Gateway',
        pros: ['Peering: no hourly or processing fee', 'TGW: transitive hub routing at scale'],
        cons: ['Peering: non-transitive, mesh grows as n(n-1)/2', 'TGW: per-attachment and per-GB fees'],
        useWhen: 'Peering for a few VPCs; TGW for many VPCs or hybrid hubs.',
      },
    ],
    services: ['nat-gateway', 'gateway-endpoint', 'interface-endpoint', 'cloudfront', 'vpc-peering', 'transit-gateway', 'direct-connect', 's3', 'privatelink', 'elastic-ip'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-cost-tools',
    module: 'm4',
    domain: 'cost',
    title: 'Cost Visibility & Governance Tools',
    minutes: 18,
    summary:
      'Match each AWS cost tool to the question it answers (where did the money go, will we overspend, is something unusual, what exactly was billed) and set up tagging and multi-account billing so costs can be attributed and controlled.',
    analogy: {
      title: 'A household finance kit',
      body:
        "**Cost Explorer** is your banking app's spending chart: where the money went, by category, with a forecast. **Budgets** is the alert that texts you when you are on track to overspend this month, and can even freeze a card. **Cost Anomaly Detection** is the fraud alert: 'this is unusual for you'. The **Cost and Usage Report** is the full itemised statement exported to a spreadsheet for the accountant. **Cost allocation tags** are the labels on each receipt (groceries, kids, car) that make any of this meaningful.\n\n**Trusted Advisor** and **Compute Optimizer** are the financial adviser who points out the gym membership you never use. And **consolidated billing** is a family account: one bill, bulk discounts for everyone.",
    },
    sections: [
      {
        heading: 'The problem: you cannot fix what you cannot attribute',
        body:
          "In a company with 40 accounts and 15 teams, 'the AWS bill went up 30%' is useless until someone can answer: which team, which service, which environment, starting when? Cost governance has three jobs:\n\n- **Visibility**: see and attribute spend (Cost Explorer, CUR, tags).\n- **Control**: be warned or stopped before overspending (Budgets, Budget Actions, SCPs).\n- **Optimization**: find waste (Compute Optimizer, Trusted Advisor, commitment reports).\n\nThe exam gives you a requirement phrased in business words and expects the one tool built for it.",
      },
      {
        heading: 'The tools and their exam triggers',
        body:
          "Learn the left and right columns as a pair.",
        table: {
          headers: ['Tool', 'What it answers', 'Exam trigger'],
          rows: [
            ['Cost Explorer', 'Where did the money go? Visualise by service/account/tag/Region; forecast; RI/SP recommendations, utilisation and coverage', '"Analyze spending trends", "which team or project costs what"'],
            ['AWS Budgets', 'Am I about to overspend? Cost, usage and RI/SP budgets with alerts on actual or forecast values; Budget Actions apply IAM policies/SCPs or stop EC2/RDS', '"Alert when forecast exceeds", "stop resources when budget hit"'],
            ['Cost Anomaly Detection', 'Is something unusual happening? ML monitors flag spend spikes to email or SNS', '"Notify on unexpected cost increases"'],
            ['Cost and Usage Report (CUR 2.0 via Data Exports)', 'The most granular line-item data (hourly, per resource) delivered to S3; query with Athena, visualise in QuickSight', '"Detailed hourly/resource-level billing data", "chargeback with custom SQL"'],
            ['Cost allocation tags', 'Attribute costs to owners: tag resources, ACTIVATE the tags in Billing, then group/filter everywhere', '"Track costs per department/project"'],
            ['Compute Optimizer', 'What is over/under-provisioned? EC2, ASG, EBS, Lambda, ECS on Fargate, RDS', '"Identify underutilized instances"'],
            ['Trusted Advisor', 'Best-practice checks: idle load balancers, low-utilisation EC2, unattached EBS, unassociated EIPs, RI optimisation; full checks need Business support or higher', '"Automated best-practice recommendations"'],
            ['Pricing Calculator', 'Estimate before building', '"Estimate monthly cost of a proposed architecture"'],
            ['Consolidated billing (Organizations)', 'One bill; volume tiers aggregated; RI/SP sharing across accounts', '"Reduce cost across many accounts"'],
            ['Savings Plans / RI utilisation and coverage reports', 'Are my commitments being used, and how much usage is still On-Demand?', '"Verify commitment coverage"'],
          ],
        },
      },
      {
        heading: 'How tagging and attribution work',
        body:
          "A **tag** is a key-value label on a resource, for example `CostCenter=4410` or `Project=checkout`. Tags do nothing for billing until you **activate them as cost allocation tags** in the Billing console (they can take up to 24 hours to appear). Only after activation can Cost Explorer, Budgets and CUR group by them, and activation is not retroactive.\n\nTwo kinds exist: **user-defined** tags (yours) and **AWS-generated** tags such as `aws:createdBy`. To make tagging stick:\n\n- **Tag policies** in AWS Organizations standardise allowed keys and values (for example CostCenter must be one of a list).\n- **SCPs** or IAM conditions (`aws:RequestTag`) can deny creating resources without required tags.\n- The **AWS Config** managed rule `required-tags` reports untagged resources.\n- **Cost Categories** group accounts, tags and services into business units (for example 'Retail' = accounts A and B plus tag Team=web) for reporting.\n\nSpend that cannot be tagged (support fees, some data transfer) is better split by **account**: a multi-account structure is the cleanest cost boundary.",
        beyond: true,
      },
      {
        heading: 'Budgets and anomaly detection in detail',
        body:
          "**AWS Budgets** types: cost, usage (for example EC2 hours), and Savings Plans/RI utilisation and coverage. Each budget has thresholds on **actual** or **forecasted** spend (alert at 80% of forecast is the classic). Alerts go to email or an **SNS topic** (which can fan out to Slack via Amazon Q Developer in chat applications, or to Lambda).\n\n**Budget Actions** go further: when a threshold is crossed they can automatically (or after approval) **attach an IAM policy or SCP** that denies launching new resources, or **stop specific EC2 or RDS instances**. That is the answer to 'automatically prevent further spending when the budget is exceeded'.\n\n**Cost Anomaly Detection** needs no thresholds: you create a **monitor** (per service, account, cost category or tag) and a subscription with a minimum impact (for example alert if the anomaly is over $100). It uses ML on your historical pattern, so a jump from $50/day to $400/day in one service triggers an alert even while the monthly budget is still fine.\n\nBudgets = planned limits; Anomaly Detection = unexpected patterns.",
      },
      {
        heading: 'Support plans in cost questions',
        body:
          "Support plans appear as cost trade-offs: pick the cheapest plan that has the feature the question needs. Prices are starting prices; AWS has been reshaping its support lineup, but the exam uses these classic tiers.",
        table: {
          headers: ['Plan', 'Starting price', 'Key features for the exam'],
          rows: [
            ['Basic', 'Free', 'Docs, forums, Health Dashboard, core Trusted Advisor checks'],
            ['Developer', 'From $29/month', 'Business-hours email support; non-production'],
            ['Business', 'From $100/month (tiered % of usage)', '24/7 phone/chat; full Trusted Advisor checks; under 1-hour response for production down'],
            ['Enterprise On-Ramp', 'From $5,500/month', 'Pool of TAMs; 30-minute response for business-critical issues'],
            ['Enterprise', 'From $15,000/month', 'Designated Technical Account Manager (TAM); 15-minute business-critical response; concierge billing support'],
          ],
        },
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Which department spends what?' → cost allocation tags (activated) + Cost Explorer.\n- 'Alert when FORECASTED spend will exceed $X' → AWS Budgets with a forecast threshold.\n- 'Automatically stop instances / prevent new resources when the budget is hit' → Budget Actions.\n- 'Detect unexpected spikes without setting thresholds' → Cost Anomaly Detection.\n- 'Hourly, resource-level billing data for custom SQL chargeback' → CUR to S3 + Athena (+ QuickSight).\n- 'Estimate a design that does not exist yet' → Pricing Calculator.\n- 'Cheapest support plan with full Trusted Advisor and 24/7 support' → Business. 'Needs a TAM / 15-minute response' → Enterprise.",
      },
    ],
    diagram: {
      title: 'From one bill to alerts and chargeback',
      nodes: [
        { id: 'org', label: 'Payer account', icon: 'organizations', x: 9, y: 30, sub: 'consolidated bill' },
        { id: 'ce', label: 'Cost Explorer', icon: 'cost-explorer', x: 34, y: 9, sub: 'trends by tag' },
        { id: 'cur', label: 'CUR 2.0', icon: 'cost-usage-report', x: 34, y: 23, sub: 'line items to S3' },
        { id: 'bud', label: 'Budgets', icon: 'budgets', x: 34, y: 37, sub: 'forecast 80%' },
        { id: 'ano', label: 'Anomaly Detection', icon: 'cost-anomaly-detection', x: 34, y: 51, sub: 'ML monitor' },
        { id: 'ath', label: 'Athena', icon: 'athena', x: 62, y: 23, sub: 'chargeback SQL' },
        { id: 'act', label: 'Budget action', icon: 'scp', x: 62, y: 37, sub: 'deny new launches' },
        { id: 'sns', label: 'SNS alert', icon: 'sns', x: 62, y: 51, sub: 'email / Slack' },
        { id: 'qs', label: 'QuickSight', icon: 'quicksight', x: 88, y: 23, sub: 'cost dashboard' },
      ],
      edges: [
        { id: 'e-ce', from: 'org', to: 'ce' },
        { id: 'e-cur', from: 'org', to: 'cur' },
        { id: 'e-bud', from: 'org', to: 'bud' },
        { id: 'e-ano', from: 'org', to: 'ano' },
        { id: 'e-ath', from: 'cur', to: 'ath', label: 'S3 + Glue' },
        { id: 'e-qs', from: 'ath', to: 'qs' },
        { id: 'e-act', from: 'bud', to: 'act', label: '100% actual' },
        { id: 'e-bsns', from: 'bud', to: 'sns', label: '80% forecast' },
        { id: 'e-asns', from: 'ano', to: 'sns', label: 'over $100 impact' },
      ],
      steps: [
        {
          caption: 'All member accounts roll up into one consolidated bill. Resources carry tags like CostCenter, activated as cost allocation tags.',
          highlight: ['org'],
        },
        {
          caption: 'Cost Explorer groups spend by service, account or activated tag and forecasts the month: the "where did it go?" view.',
          highlight: ['ce', 'e-ce'],
          flow: [{ edge: 'e-ce' }],
        },
        {
          caption: 'For chargeback, CUR 2.0 delivers hourly, per-resource line items to S3; Athena queries them and QuickSight visualises them.',
          highlight: ['cur', 'ath', 'qs', 'e-cur', 'e-ath', 'e-qs'],
          flow: [{ edge: 'e-cur' }, { edge: 'e-ath' }, { edge: 'e-qs' }],
        },
        {
          caption: 'A Budget alerts through SNS when FORECASTED spend reaches 80% of the monthly limit, before the money is spent.',
          highlight: ['bud', 'sns', 'e-bud', 'e-bsns'],
          flow: [{ edge: 'e-bud' }, { edge: 'e-bsns' }],
        },
        {
          caption: 'At 100% of actual spend, a Budget Action attaches an SCP that denies new launches (or stops tagged instances) automatically.',
          highlight: ['bud', 'act', 'e-act'],
          flow: [{ edge: 'e-act', color: 'bad' }],
        },
        {
          caption: 'Cost Anomaly Detection needs no threshold: its ML monitor spots a jump from $50/day to $400/day and alerts via SNS.',
          highlight: ['ano', 'sns', 'e-ano', 'e-asns'],
          flow: [{ edge: 'e-ano' }, { edge: 'e-asns' }],
        },
      ],
    },
    keyFacts: [
      'Tags must be activated as cost allocation tags in Billing before they appear in Cost Explorer, Budgets or CUR; activation is not retroactive.',
      'Cost Explorer shows at least the last 13 months plus a forecast; the console is free, the API costs $0.01 per request.',
      'Budgets can alert on actual or forecasted cost, usage, and RI/Savings Plans utilisation or coverage.',
      'Budget Actions can attach IAM policies or SCPs, or stop EC2/RDS instances, automatically or after approval.',
      'Cost Anomaly Detection uses ML monitors (per service, account, cost category or tag) and alerts via email or SNS.',
      'CUR (now CUR 2.0 through Billing Data Exports) is the most granular billing data, delivered to S3 for Athena/QuickSight.',
      'Full Trusted Advisor checks require Business, Enterprise On-Ramp or Enterprise support.',
      'Business support: 24/7 phone/chat, under 1-hour production-down response; Enterprise: designated TAM and 15-minute business-critical response.',
      'Consolidated billing aggregates usage for volume tiers and shares RI/SP discounts across accounts.',
      'Pricing Calculator estimates costs for architectures before they are built.',
    ],
    examTips: [
      '"Track costs per department or project" → tag resources and activate cost allocation tags, then group in Cost Explorer.',
      '"Notify before the monthly bill will exceed the limit" → AWS Budgets with a forecasted-spend alert.',
      '"Automatically stop resources or block launches when the budget is reached" → Budget Actions.',
      '"Alert on unusual spending without defining thresholds" → Cost Anomaly Detection.',
      '"Resource-level hourly billing data queried with SQL" → Cost and Usage Report in S3 + Athena.',
      '"Cheapest support plan with 24/7 access and all Trusted Advisor checks" → Business; "TAM / 15-minute response" → Enterprise.',
    ],
    pitfalls: [
      'Tagging resources but forgetting to activate the tags as cost allocation tags.',
      'Using Cost Explorer when the requirement is an alert; Explorer is for analysis, Budgets/Anomaly Detection are for alerts.',
      'Choosing a CloudWatch billing alarm when forecasts or automatic actions are required (billing alarms only watch actual estimated charges, and live in us-east-1).',
      'Expecting Budgets to stop spending by itself without configuring a Budget Action.',
      'Confusing Trusted Advisor (broad best-practice checks) with Compute Optimizer (ML right-sizing).',
    ],
    prosCons: [
      {
        option: 'AWS Budgets',
        pros: ['Forecast and actual thresholds', 'Can take automatic actions'],
        cons: ['You must choose thresholds', 'Misses unusual spikes that stay inside the budget'],
        useWhen: 'Enforcing planned spending limits.',
      },
      {
        option: 'Cost Anomaly Detection',
        pros: ['No thresholds to maintain', 'Catches unusual patterns early'],
        cons: ['Needs history to learn', 'Alerts only, no enforcement'],
        useWhen: 'Catching unexpected spikes such as runaway resources or leaked keys.',
      },
      {
        option: 'Cost and Usage Report',
        pros: ['Most granular data', 'Custom SQL and dashboards'],
        cons: ['You build the analysis (Athena, QuickSight)', 'Large data volumes'],
        useWhen: 'Detailed chargeback, showback or custom reporting.',
      },
    ],
    services: ['cost-explorer', 'budgets', 'cost-anomaly-detection', 'cost-usage-report', 'pricing-calculator', 'compute-optimizer', 'trusted-advisor', 'organizations', 'athena', 'quicksight', 'sns'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-ref-cost',
    module: 'm4',
    domain: 'cost',
    title: 'Reference Architecture: Same App, Cost-Optimized',
    minutes: 18,
    summary:
      'Apply every cost lever, layer by layer, to a real multi-AZ web and order-processing app, and verify that availability, durability and security requirements survive each change.',
    analogy: {
      title: 'Renovating a restaurant without closing it',
      body:
        "A busy restaurant hires a cost consultant. She does not cut the number of exits (fire safety = availability), switch to cheaper meat that might be unsafe (durability/security), or close one of the two kitchens (multi-AZ). Instead she: installs a takeaway counter so walk-in orders do not need a waiter (CloudFront), signs a 3-year contract for the core staff and uses agency staff only on Friday nights (Savings Plan + Spot), moves old receipts from the office to a cheap archive box (S3 lifecycle), and stops the delivery van from driving across town to buy ice from the other branch (NAT per AZ, Gateway endpoints).\n\nSame menu, same safety rules, a much smaller bill.",
    },
    sections: [
      {
        heading: 'The starting point',
        body:
          "Take the 3-tier web app from Module 1 and the order-processing system from Module 2: users → ALB → EC2 web/app tier in 2 AZs → RDS Multi-AZ, plus SQS-driven workers, S3 for uploads, and private subnets reaching AWS APIs through a single NAT Gateway. It works and is highly available, but it is paid for as if it were always at peak: fixed On-Demand fleets, gp2 volumes, everything in S3 Standard, one NAT for both AZs, and a reporting database running 24/7.\n\nThe rule for this lesson (and for every exam cost question): **nothing may lose HA (still multi-AZ), durability or security.**",
      },
      {
        heading: 'Layer by layer: before and after',
        body:
          "Each row names the meter that was running and the lever that turns it down.",
        table: {
          headers: ['Layer', 'Before', 'After', 'Lever'],
          rows: [
            ['Edge', 'Every request hits the ALB; EC2 pays internet egress', 'CloudFront caches static assets and cacheable API GETs', 'Usage: cheaper egress, free origin fetch, smaller web tier'],
            ['Web/app tier', '8 x On-Demand x86, sized for peak 24/7', 'ASG mixed instances: 2 On-Demand Graviton base under a Compute Savings Plan, scale-out on Spot across 4 instance types; target tracking; scheduled scale-in overnight for internal tools', 'Price per hour + hours'],
            ['Workers', 'Always-on EC2 pollers', 'SQS-driven Fargate Spot tasks; long jobs on AWS Batch with Spot', 'Time: no idle cost between bursts'],
            ['Data', 'One big RDS for everything, including reports', 'Aurora Serverless v2 for the variable catalog; RDS RI for the steady core ledger; reporting moved to a read replica, then history to S3 + Athena (Parquet); DynamoDB sessions on-demand with TTL', 'Capacity follows demand; commitments for steady parts'],
            ['Storage', 'S3 Standard and gp2 everywhere', 'Uploads in Intelligent-Tiering; derived thumbnails in One Zone-IA (re-creatable); logs lifecycle to Glacier; gp3 everywhere; Data Lifecycle Manager prunes snapshots', 'Capacity in the right class'],
            ['Network', 'One NAT for 2 AZs; all AWS API traffic via NAT', 'Gateway endpoints for S3/DynamoDB; one NAT per AZ; interface endpoints for high-volume SQS/CloudWatch traffic', 'Usage routed through cheaper paths'],
            ['Governance', 'Monthly surprise', 'Cost allocation tags by team, Budgets with forecast alerts, Anomaly Detection to SNS, monthly Compute Optimizer review', 'Visibility and control'],
          ],
        },
      },
      {
        heading: 'Compute: the layered fleet',
        body:
          "The web tier's Auto Scaling group uses a **mixed instances policy**: `OnDemandBaseCapacity = 2`, `OnDemandPercentageAboveBaseCapacity = 0`, Spot allocation strategy **price-capacity-optimized**, and four interchangeable Graviton types (for example m7g.large, m6g.large, c7g.xlarge, r7g.large). The two On-Demand instances (one per AZ) are always present and covered by a **Compute Savings Plan**, so even if every Spot instance is reclaimed the site stays up at reduced capacity while the ASG replaces Spot from other pools.\n\n**Target tracking** on `ALBRequestCountPerTarget` (say 1,000) adds Spot instances during the day. Internal tools use **scheduled actions** to scale to zero at night.\n\nWorkers poll SQS from **Fargate Spot** tasks. Because SQS keeps a message invisible only for the visibility timeout, a reclaimed task's message simply reappears and another task processes it: Spot interruption becomes a non-event. ECS Service Auto Scaling on queue depth (`ApproximateNumberOfMessagesVisible`) scales tasks to zero between bursts.",
      },
      {
        heading: 'Data and storage choices, and why each is safe',
        body:
          "- **Aurora Serverless v2** for the product catalog: traffic swings 10x between night and day; capacity follows it, and Aurora still stores 6 copies across 3 AZs.\n- **RDS Reserved Instance** (Multi-AZ) for the order ledger: steady 24/7 load, so a 3-year commitment is the cheapest valid option. Multi-AZ stays because the ledger's availability is a requirement.\n- **Reporting**: first offloaded to a read replica so the primary is not up-sized; later, history older than 90 days is exported to S3 as Parquet and queried with Athena, so the replica can be small.\n- **DynamoDB on-demand** for sessions, with **TTL** expiring them after 24 hours at no write cost.\n- **S3 Intelligent-Tiering** for user uploads (access is unpredictable); **One Zone-IA** only for thumbnails, which can be regenerated from the originals, so losing an AZ loses nothing irreplaceable.\n- **gp3** volumes replace gp2 online with Elastic Volumes (about 20% cheaper with better baseline IOPS).",
      },
      {
        heading: 'Network fixes',
        body:
          "- **S3 and DynamoDB Gateway endpoints** added to every private route table: free, and the largest NAT flows disappear.\n- **One NAT Gateway per AZ**: slightly more hourly cost (about $33/month each) but no cross-AZ transfer and no single point of failure. This is a case where the cost-optimised answer and the HA answer agree.\n- **Interface endpoints** for SQS and CloudWatch Logs, whose volumes are high enough that $0.01/GB beats $0.045/GB through the NAT.\n- CloudFront in front of the ALB shrinks internet egress, the biggest variable line, and can use **origin access control** for the S3 bucket so the bucket stays private.",
      },
      {
        heading: 'Exam angle: the silent constraint',
        body:
          "Every cost-optimised reference answer on the exam passes the same check: it is **still multi-AZ, still durable, still secure**. When two answers both cut cost, the one that keeps every stated requirement wins, and the more managed one wins ties when 'least operational overhead' is also asked.\n\nWatch for answer options that look like this lesson but break one rule:\n\n- 'Run the entire web tier on Spot': no guaranteed baseline, so availability fails.\n- 'Move uploads to One Zone-IA': originals are not re-creatable, so durability across AZs fails.\n- 'Remove the NAT Gateway and give instances public IPs': security regression.\n- 'Use a single NAT Gateway to save hourly charges' in a production HA design: an AZ failure takes down outbound access.",
      },
    ],
    diagram: {
      title: 'The cost-optimized web and order app',
      groups: [
        { id: 'g-region', label: 'us-east-1 (2 AZs)', kind: 'region', x: 29, y: 4, w: 67, h: 52 },
        { id: 'g-vpc', label: 'VPC', kind: 'vpc', x: 31, y: 9, w: 48, h: 44 },
      ],
      nodes: [
        { id: 'users', label: 'Users', icon: 'users', x: 6, y: 30 },
        { id: 'cf', label: 'CloudFront', icon: 'cloudfront', x: 19, y: 30, sub: 'cache + cheap egress' },
        { id: 'alb', label: 'ALB', icon: 'alb', x: 37, y: 30 },
        { id: 'asg', label: 'ASG web tier', icon: 'auto-scaling', x: 54, y: 17, sub: '2 OD (SP) + Spot' },
        { id: 'sqs', label: 'SQS orders', icon: 'sqs', x: 54, y: 43 },
        { id: 'aur', label: 'Aurora SLv2', icon: 'aurora-serverless', x: 72, y: 17, sub: 'catalog' },
        { id: 'far', label: 'Fargate Spot', icon: 'fargate', x: 72, y: 43, sub: 'workers' },
        { id: 's3', label: 'S3 uploads', icon: 's3', x: 89, y: 30, sub: 'Intelligent-Tiering' },
      ],
      edges: [
        { id: 'e-u', from: 'users', to: 'cf' },
        { id: 'e-cf', from: 'cf', to: 'alb', label: 'cache misses' },
        { id: 'e-alb', from: 'alb', to: 'asg' },
        { id: 'e-db', from: 'asg', to: 'aur' },
        { id: 'e-q', from: 'asg', to: 'sqs', label: 'enqueue' },
        { id: 'e-w', from: 'sqs', to: 'far', label: 'poll' },
        { id: 'e-s3a', from: 'asg', to: 's3', label: 'gateway endpoint' },
        { id: 'e-s3f', from: 'far', to: 's3', label: 'free path' },
      ],
      steps: [
        {
          caption: 'CloudFront serves cached assets and API GETs at the edge. Origin fetches are free and cache hits never reach the ALB, so the web tier can shrink.',
          highlight: ['users', 'cf', 'e-u', 'e-cf'],
          flow: [{ edge: 'e-u' }, { edge: 'e-cf' }],
        },
        {
          caption: 'The ASG keeps 2 On-Demand Graviton instances (one per AZ) under a Compute Savings Plan and scales out on Spot across 4 instance types.',
          highlight: ['alb', 'asg', 'e-alb'],
          flow: [{ edge: 'e-alb' }],
        },
        {
          caption: 'The variable catalog runs on Aurora Serverless v2, which scales capacity with traffic while keeping 6 copies across 3 AZs.',
          highlight: ['asg', 'aur', 'e-db'],
          flow: [{ edge: 'e-db' }],
        },
        {
          caption: 'Orders are queued in SQS; Fargate Spot workers poll and scale to zero between bursts. A reclaimed task just lets its message reappear.',
          highlight: ['sqs', 'far', 'e-q', 'e-w'],
          flow: [{ edge: 'e-q' }, { edge: 'e-w' }],
        },
        {
          caption: 'Uploads go to S3 Intelligent-Tiering through a free Gateway endpoint instead of a NAT Gateway.',
          highlight: ['s3', 'e-s3a', 'e-s3f'],
          flow: [{ edge: 'e-s3a' }, { edge: 'e-s3f' }],
        },
        {
          caption: 'Check the silent constraint: still multi-AZ, data still durable across AZs, buckets still private. Only then is the design cost-optimized.',
          highlight: ['g-region', 'g-vpc', 'alb', 'aur', 's3'],
        },
      ],
    },
    keyFacts: [
      'Mixed instances ASG: On-Demand base capacity (covered by a Savings Plan) plus Spot above it, diversified across instance types.',
      'price-capacity-optimized is the recommended Spot allocation strategy for fewer interruptions at low price.',
      'SQS-based workers tolerate Spot interruptions: an unfinished message reappears after its visibility timeout.',
      'One NAT Gateway per AZ costs about $33/month each in hours but removes cross-AZ charges and the single point of failure.',
      'Aurora keeps 6 copies of data across 3 AZs regardless of instance type or Serverless v2.',
      'One Zone-IA is acceptable only for data that can be re-created (thumbnails, derived files).',
      'gp2 → gp3 is an online change via Elastic Volumes and saves about 20%.',
      'Reporting moves from the primary → read replica → S3 + Athena on Parquet as data ages.',
    ],
    examTips: [
      'Two answers both cut cost → choose the one that keeps every stated requirement (multi-AZ, durability, security).',
      '"Reduce cost of a web tier with a steady baseline and daily peaks" → Savings Plan-covered On-Demand base + Spot (or On-Demand) scale-out in an ASG.',
      '"Workers process queue messages intermittently" → SQS + Fargate (Spot) or Lambda scaling on queue depth.',
      '"Reduce cost and improve resilience of NAT" → one NAT per AZ plus Gateway endpoints for S3/DynamoDB.',
      '"Reporting queries slow the production database" → read replica first; for historical analytics, S3 + Athena.',
      'An option running an entire production tier on Spot fails availability unless the question states interruptions are acceptable.',
    ],
    pitfalls: [
      'Running every web instance on Spot with no On-Demand base.',
      'Putting irreplaceable originals in One Zone-IA to save storage cost.',
      'Removing NAT and adding public IPs to save money (security regression).',
      'Keeping a reporting replica sized like the primary forever instead of moving history to S3 + Athena.',
    ],
    services: ['cloudfront', 'alb', 'auto-scaling', 'ec2-spot', 'savings-plans', 'sqs', 'fargate', 'aurora-serverless', 'rds', 'dynamodb', 's3', 'gateway-endpoint', 'nat-gateway', 'athena', 'budgets'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm4-exam-strategy',
    module: 'm4',
    domain: 'foundations',
    title: 'Exam-Day Strategy & Distractor Patterns',
    minutes: 18,
    summary:
      'Read any SAA-C03 question in about 90 seconds, eliminate the four classic distractor patterns, manage 130 minutes for 65 questions, and know the booking and results logistics.',
    analogy: {
      title: 'A detective reading a case file',
      body:
        "A good detective does not read a case file front to back and then guess. She first reads the last line: what exactly is being asked (who did it? how? when?). Then she skims the file for hard facts that cannot be argued with: times, places, fingerprints. Every suspect who contradicts a hard fact is crossed off, however suspicious they look. Among the remaining suspects she applies the one rule the chief cares about today (the cheapest arrest, the fastest, the safest).\n\nExam questions are case files. The last sentence is the question, the numbers and named technologies are the fingerprints, and the four answers are suspects, three of whom were planted to look guilty.",
    },
    sections: [
      {
        heading: 'The exam at a glance',
        body:
          "- **65 questions in 130 minutes**: 50 scored and 15 unscored (AWS tests new questions; you cannot tell which ones they are, so treat every question as scored).\n- **Question types**: multiple choice (one correct of four) and multiple response (two or more correct of five or more; the stem says 'Choose TWO' or 'Choose THREE'). Partial credit is not given on multiple response.\n- **Scoring**: scaled 100-1,000, **720 to pass**. Scoring is compensatory: you pass on the overall score, not per domain.\n- **Domains**: Design Secure Architectures 30%, Design Resilient Architectures 26%, Design High-Performing Architectures 24%, Design Cost-Optimized Architectures 20%.\n- **No penalty for wrong answers**: never leave a blank.\n- The exam costs $150 USD; the certification is **valid for 3 years**. Passing gives a 50% discount voucher for your next AWS exam.",
        beyond: true,
      },
      {
        heading: 'Reading a question in 90 seconds',
        body:
          "Most SAA-C03 questions are 3-6 sentences of scenario plus four options. The method:\n\n- **1. Read the final sentence first.** It holds the actual ask and the **qualifier**: MOST cost-effective, LEAST operational overhead, MOST secure, highly available, best performance. The qualifier decides between answers that all 'work'.\n- **2. Scan the scenario for hard constraints**: numbers (RPO/RTO, TB, latency, number of users or accounts), named technologies (Windows, Kubernetes, Oracle, Kafka, SMB, NFS), and absolute words like 'private', 'no internet', 'cannot change the application', 'immediately', 'multiple AZs'.\n- **3. Eliminate** every answer that violates any constraint, regardless of how attractive or modern it sounds.\n- **4. Among survivors, apply the qualifier.** Ties break toward managed/serverless for overhead questions and toward the cheaper valid option for cost questions.\n- **5. Flag if unsure and move on.** Return with leftover time. There is no penalty for guessing, so pick something before flagging.\n\nOn multiple-response questions, evaluate each option independently against the constraints; usually two options are clearly right, one is clearly wrong, and two are near-misses that break one constraint.",
      },
      {
        heading: 'Decoding the qualifier',
        body:
          "The same scenario can have different right answers depending on the last sentence.",
        table: {
          headers: ['Qualifier', 'Leans toward', 'Example'],
          rows: [
            ['LEAST operational overhead / minimal management', 'Fully managed or serverless; built-in features over custom code', 'Secrets Manager rotation over a Lambda you write; Fargate over EC2'],
            ['MOST cost-effective / lowest cost', 'Cheapest option that still meets every requirement', 'Gateway endpoint over NAT; Intelligent-Tiering over Standard'],
            ['MOST secure / least privilege', 'Private paths, encryption, narrow roles, no long-term keys', 'IAM role over access keys; VPC endpoint over internet path'],
            ['Highly available / fault tolerant', 'Multi-AZ, no single points of failure, managed failover', 'RDS Multi-AZ; NAT per AZ; ASG across AZs'],
            ['Best performance / lowest latency', 'Caching, edge, right engine, scale-out', 'CloudFront, DAX, ElastiCache, Global Accelerator'],
            ['Minimal changes to the application', 'Drop-in managed equivalents and infrastructure-level features', 'RDS Proxy, ALB authentication, EFS for shared files'],
          ],
        },
        beyond: true,
      },
      {
        heading: 'The four distractor patterns',
        body:
          "Wrong answers on SAA-C03 are rarely nonsense. They are usually one of four patterns; naming the pattern makes elimination fast.",
        table: {
          headers: ['Pattern', 'What it looks like', 'Examples'],
          rows: [
            ['Right service, wrong scope', 'A real service used for something it cannot do', 'Security group with a "deny" rule; CNAME at the zone apex; Gateway endpoint for a non-S3/DynamoDB service; Lambda for a 30-minute job'],
            ['Right idea, more work than needed', 'Building by hand what a managed feature already does', '"Write a Lambda to rotate secrets" (Secrets Manager does it); "script to copy snapshots" (AWS Backup); "set up Kafka on EC2" (MSK/Kinesis)'],
            ['Solves the wrong pillar', 'Fixes a different problem than the one asked', 'Multi-AZ offered for a read-performance problem; a bigger instance for an availability problem; Spot for a stateful database'],
            ['Violates a stated requirement to save money', 'Cheapest option, but breaks a constraint', 'One Zone-IA when "multi-AZ" is required; Glacier when "immediate" access is required; VPN when "consistent bandwidth" is required'],
          ],
        },
      },
      {
        heading: 'Time management and logistics',
        body:
          "**Pacing**: 130 minutes for 65 questions is 2 minutes each. Aim to finish a first pass by **minute 100**, leaving 30 minutes for flagged questions. If a question takes more than about 3 minutes, choose your best guess, flag it, and move on; later questions often jog your memory.\n\n**Booking**: exams are delivered by Pearson VUE, either at a test centre or online-proctored (OnVUE). Book a test centre if you can: fewer online-proctoring hiccups (webcam checks, room scans, connection drops). Arrive or log in **30 minutes early** with government-issued ID.\n\n**ESL accommodation**: if English is not your first language, request the **+30 minutes** ESL accommodation in your AWS Certification account **before** scheduling; it applies to exams booked after approval.\n\n**Results**: a pass/fail result typically arrives within a few hours, and always within **5 business days**, followed by a score report with per-domain feedback. The certification is valid **3 years**.",
      },
      {
        heading: 'A 4-week plan and readiness signal',
        body:
          "- **Week 1**: Modules 1 and 2 with hands-on labs (account hygiene, VPC by hand, IAM roles, SG chaining, ALB + Auto Scaling, SQS + Lambda). After each module, answer the self-checks from memory before looking.\n- **Week 2**: Modules 3a and 3b with labs (S3 features, RDS Multi-AZ, DynamoDB + API Gateway, Athena on logs). Start one practice-exam bank (for example the free official AWS Skill Builder practice set).\n- **Week 3**: Module 4 plus a cost tour lab (Cost Explorer, tags, Trusted Advisor, Compute Optimizer). Take 2 full timed practice exams. For EVERY question, right or wrong, write one line: which requirement or qualifier decided it.\n- **Week 4**: 2-3 more timed exams targeting 80%+; review the keyword map daily; last two days, light review only.\n\n**You are ready** when you score 80-85% on practice exams you have not seen before **and** can explain why each distractor is wrong. Set a $10 AWS Budget alert before any hands-on lab, and delete resources afterwards.",
      },
    ],
    keyFacts: [
      '65 questions (50 scored, 15 unscored) in 130 minutes; ESL accommodation adds 30 minutes.',
      'Scaled score 100-1,000; 720 passes; compensatory scoring across domains.',
      'Domain weights: Secure 30%, Resilient 26%, High-Performing 24%, Cost-Optimized 20%.',
      'No penalty for guessing: never leave a question blank.',
      'Finish the first pass by minute 100, leaving 30 minutes for flagged questions.',
      'Results within a few hours to 5 business days; certification valid 3 years.',
      'Arrive or log in 30 minutes early with ID; test centres have fewer proctoring issues than online delivery.',
      'Readiness signal: 80-85% on unseen practice exams and the ability to explain every distractor.',
    ],
    examTips: [
      'Read the last sentence first for the qualifier, scan for numbers and named technologies, eliminate any option that breaks a constraint, then apply the qualifier to the survivors.',
      '"Lambda + relational database rejecting connections under load" → RDS Proxy; scaling the DB up or raising Lambda concurrency are the "more work" and "worsens it" distractors.',
      '"Prove which user made API calls across 25 accounts, tamper-evident" → Organization trail in CloudTrail to a central S3 bucket with log file integrity validation; Config tracks resource state and CloudWatch Logs holds app logs, not API audit.',
      '"Users must sign in with the corporate SAML IdP before reaching the app, minimal code change" → ALB authenticate action with a Cognito user pool federated to the IdP (or OIDC directly); Cognito identity pools issue AWS credentials and do not gate HTTP.',
      '"Oracle to Aurora PostgreSQL, 4 TB, under 30 minutes downtime" → Schema Conversion Tool + DMS full load with ongoing CDC; dumps and Snowball cannot give near-zero-downtime cutover.',
      '"100,000 small messages/s, SQL within 2 minutes, 5-year cheap retention" → Data Firehose to S3 (Parquet, 60-second buffer) + Glue catalog + Athena + lifecycle to Glacier.',
      '"DR with RTO 10 minutes, RPO 1 minute, lowest cost that meets it" → warm standby with Route 53 failover and Aurora Global Database; active/active meets the targets but is not lowest cost, pilot light risks the RTO.',
      '"Scan container images and limit each task to one bucket" → ECR scan-on-push (Inspector) + ECS task role, not the instance role; "expose an NLB service privately to hundreds of VPCs with overlapping CIDRs" → PrivateLink endpoint service.',
    ],
    pitfalls: [
      'Reading the scenario first and falling for the most attractive technology before knowing the qualifier.',
      'Choosing an option that is cheaper but quietly breaks a requirement such as multi-AZ or immediate access.',
      'Spending 6 minutes on one hard question early and rushing the last 15.',
      'Leaving multiple-response questions with the wrong number of selections, or leaving any question blank.',
      'Booking online proctoring without testing the room, webcam and network beforehand.',
    ],
    prosCons: [
      {
        option: 'Test centre (Pearson VUE)',
        pros: ['Stable equipment and network', 'No room-scan or webcam issues'],
        cons: ['Travel', 'Fewer time slots'],
        useWhen: 'A centre is reachable; the default recommendation.',
      },
      {
        option: 'Online proctored (OnVUE)',
        pros: ['Take it from home', 'Many time slots'],
        cons: ['Strict room rules', 'Connection or check-in problems can end the session'],
        useWhen: 'No nearby centre, and you have a quiet private room and reliable internet.',
      },
    ],
    services: ['rds-proxy', 'cloudtrail', 'alb', 'cognito', 'dms', 'data-firehose', 'athena', 'aurora-global-database', 'ecr', 'privatelink'],
  },
] satisfies Lesson[];
