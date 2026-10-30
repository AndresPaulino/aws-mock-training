import type { Flashcard } from '../types';

export default [
  // m4-billing-model
  { id: "fc-m4-billing-model-1", lessonId: "m4-billing-model", front: "The three levers every AWS charge is built from?", back: "Time (hours a resource exists, busy or idle), capacity (GB stored, IOPS or RCUs provisioned) and usage (requests, GB transferred, TB scanned)." },
  { id: "fc-m4-billing-model-2", lessonId: "m4-billing-model", front: "Name things that are free that people forget.", back: "Data IN from the internet, same-AZ private-IP traffic, S3/DynamoDB Gateway endpoints, ALB cross-zone, one CloudTrail management-event trail, AWS-managed KMS keys, AWS-origin fetches by CloudFront, Cost Explorer." },
  { id: "fc-m4-billing-model-3", lessonId: "m4-billing-model", front: "Which resources cost money even when idle?", back: "Running EC2/RDS hours, EBS volumes (attached or not), public IPv4 addresses, NAT Gateway hours, provisioned IOPS, DynamoDB provisioned capacity, load balancer hours, interface endpoints." },
  { id: "fc-m4-billing-model-4", lessonId: "m4-billing-model", front: "Do public IPv4 addresses cost money?", back: "Yes: $0.005 per hour each (since Feb 2024, about $3.60/month), in use or not. Elastic IPs included." },
  { id: "fc-m4-billing-model-5", lessonId: "m4-billing-model", front: "The exam's reflex for 'MOST cost-effective'?", back: "First keep only the answers that meet EVERY requirement, then pick the cheapest of those. Never trade away durability, latency or RTO to save money." },
  { id: "fc-m4-billing-model-6", lessonId: "m4-billing-model", front: "A stopped EC2 instance: what still bills?", back: "Its EBS volumes and snapshots, plus any attached Elastic IP/public IPv4. Instance compute hours stop." },

  // m4-purchasing
  { id: "fc-m4-purchasing-1", lessonId: "m4-purchasing", front: "Max discounts: Standard RI, Compute Savings Plan, Spot?", back: "Standard RI / EC2 Instance Savings Plan: up to ~72%. Convertible RI / Compute Savings Plan: up to ~66%. Spot: up to ~90%." },
  { id: "fc-m4-purchasing-2", lessonId: "m4-purchasing", front: "Compute Savings Plan vs EC2 Instance Savings Plan?", back: "Compute SP: $/hour commitment for ANY EC2 family, size, Region, OS, plus Fargate and Lambda. EC2 Instance SP: one family in one Region, bigger discount." },
  { id: "fc-m4-purchasing-3", lessonId: "m4-purchasing", front: "Standard RI vs Convertible RI?", back: "Standard: biggest discount, locked to family + Region, resellable on the RI Marketplace. Convertible: can exchange family/OS/tenancy for equal or greater value, smaller discount." },
  { id: "fc-m4-purchasing-4", lessonId: "m4-purchasing", front: "Dedicated Host vs Dedicated Instance?", back: "Dedicated Host: a whole physical server with socket/core visibility, for BYOL per-socket licenses (Windows Server, SQL Server, Oracle). Dedicated Instance: isolated hardware, no host control." },
  { id: "fc-m4-purchasing-5", lessonId: "m4-purchasing", front: "Does an On-Demand Capacity Reservation give a discount?", back: "No. It guarantees capacity in an AZ for any duration at the On-Demand rate; combine it with Savings Plans or RIs for the discount." },
  { id: "fc-m4-purchasing-6", lessonId: "m4-purchasing", front: "RI/Savings Plan payment options, and are they shared across accounts?", back: "All Upfront (biggest discount) > Partial Upfront > No Upfront. Shared across the Organization under consolidated billing unless sharing is turned off." },

  // m4-cost-compute
  { id: "fc-m4-cost-compute-1", lessonId: "m4-cost-compute", front: "Scenario: instances run at 10% CPU → ?", back: "Right-size with AWS Compute Optimizer (ML recommendations for EC2, ASGs, EBS, Lambda, ECS on Fargate)." },
  { id: "fc-m4-cost-compute-2", lessonId: "m4-cost-compute", front: "Scenario: dev/test servers run nights and weekends for nothing → ?", back: "Stop them on a schedule: Instance Scheduler or scheduled ASG scaling to zero outside working hours." },
  { id: "fc-m4-cost-compute-3", lessonId: "m4-cost-compute", front: "Spot best practices?", back: "Diversify across many instance types and AZs, use a capacity-optimized allocation strategy, checkpoint work, handle the 2-minute notice, never put a single stateful component on Spot." },
  { id: "fc-m4-cost-compute-4", lessonId: "m4-cost-compute", front: "Can giving a Lambda function more memory lower its cost?", back: "Yes. CPU scales with memory, so it may finish much faster and cost less overall. Lambda Power Tuning finds the sweet spot." },
  { id: "fc-m4-cost-compute-5", lessonId: "m4-cost-compute", front: "Classic cost-optimized Auto Scaling group mix?", back: "An On-Demand base (covered by a Savings Plan) for steady load plus Spot across several instance types for scale-out." },
  { id: "fc-m4-cost-compute-6", lessonId: "m4-cost-compute", front: "Scenario: sporadic or spiky workload, pay nothing when idle → ?", back: "Serverless: Lambda, Fargate (Spot for interruptible tasks), or Aurora Serverless v2. Commitments win only for steady load." },

  // m4-cost-storage-db
  { id: "fc-m4-cost-storage-db-1", lessonId: "m4-cost-storage-db", front: "How long can an RDS instance stay stopped?", back: "7 days, then AWS restarts it automatically. For long pauses, snapshot and delete it; storage still bills while stopped." },
  { id: "fc-m4-cost-storage-db-2", lessonId: "m4-cost-storage-db", front: "When choose Aurora I/O-Optimized?", back: "When I/O charges dominate the Aurora bill (rule of thumb: over ~25% of spend). It removes per-I/O charges for higher instance and storage prices." },
  { id: "fc-m4-cost-storage-db-3", lessonId: "m4-cost-storage-db", front: "DynamoDB cost levers?", back: "Provisioned + auto scaling (or reserved capacity) for steady load, on-demand for spiky, TTL to purge junk, Standard-IA table class for rarely read tables, eventually consistent reads cost half." },
  { id: "fc-m4-cost-storage-db-4", lessonId: "m4-cost-storage-db", front: "Common EBS waste and fixes?", back: "Unattached volumes and orphaned snapshots: delete them; Data Lifecycle Manager enforces retention. Use gp3 over gp2, and the snapshot archive tier for rarely restored snapshots." },
  { id: "fc-m4-cost-storage-db-5", lessonId: "m4-cost-storage-db", front: "Tools to find S3 waste, and how to shift download costs to consumers?", back: "S3 Storage Lens and Storage Class Analysis find waste. Requester Pays buckets make the downloader pay transfer and request costs." },
  { id: "fc-m4-cost-storage-db-6", lessonId: "m4-cost-storage-db", front: "Scenario: a Redshift cluster runs one 6-hour job a month and idles otherwise → ?", back: "Redshift Serverless (or pause/resume the cluster) so compute bills only during the job; Athena over Parquet if queries are simple." },

  // m4-data-transfer
  { id: "fc-m4-data-transfer-1", lessonId: "m4-data-transfer", front: "Which traffic paths are free?", back: "Inbound from the internet, and traffic between resources in the same AZ over private IPs. Also S3/DynamoDB traffic through Gateway endpoints." },
  { id: "fc-m4-data-transfer-2", lessonId: "m4-data-transfer", front: "Cross-AZ traffic inside a Region: free?", back: "No: about $0.01/GB in EACH direction. Accept it for HA, but avoid needless cross-AZ chatter." },
  { id: "fc-m4-data-transfer-3", lessonId: "m4-data-transfer", front: "Scenario: high NAT Gateway bill, mostly traffic to S3 → ?", back: "Add an S3 Gateway VPC endpoint to the private route tables: free, private, bypasses the NAT. Other AWS APIs → interface endpoints." },
  { id: "fc-m4-data-transfer-4", lessonId: "m4-data-transfer", front: "Scenario: high data-transfer-out to internet users → ?", back: "Put CloudFront in front: AWS-origin fetches are free, edge egress is cheaper, and caching shrinks origin load. Compress responses too." },
  { id: "fc-m4-data-transfer-5", lessonId: "m4-data-transfer", front: "Scenario: instances in AZ-A send traffic through a NAT Gateway in AZ-B → ?", back: "Deploy one NAT Gateway per AZ and route each subnet to its own AZ's NAT. Removes cross-AZ charges and the single point of failure." },
  { id: "fc-m4-data-transfer-6", lessonId: "m4-data-transfer", front: "VPC peering vs Transit Gateway: cost?", back: "Peering: no hourly charge, just normal cross-AZ/Region data rates; cheaper for a few VPCs. TGW: per-attachment hourly + per-GB processing; pay for manageability at scale." },

  // m4-cost-tools
  { id: "fc-m4-cost-tools-1", lessonId: "m4-cost-tools", front: "Cost Explorer vs AWS Budgets?", back: "Cost Explorer: where did money go (by service/account/tag), 12-month forecast, RI/SP recommendations. Budgets: alert at actual or forecast thresholds; Budget Actions can apply IAM/SCP limits or stop instances." },
  { id: "fc-m4-cost-tools-2", lessonId: "m4-cost-tools", front: "Scenario: get notified of unexpected spend spikes → ?", back: "AWS Cost Anomaly Detection: ML monitors spend and alerts via SNS or email." },
  { id: "fc-m4-cost-tools-3", lessonId: "m4-cost-tools", front: "Most granular billing data, and how to query it?", back: "Cost and Usage Report (CUR, now via Data Exports): hourly, resource-level line items delivered to S3; query with Athena, visualize in QuickSight." },
  { id: "fc-m4-cost-tools-4", lessonId: "m4-cost-tools", front: "Cost allocation tags: what's the catch?", back: "Tagging isn't enough: you must ACTIVATE the tags in the Billing console before they appear in Cost Explorer and reports." },
  { id: "fc-m4-cost-tools-5", lessonId: "m4-cost-tools", front: "Trusted Advisor: what do you get for free?", back: "Core checks only. The full set (idle load balancers, underused instances, unattached volumes, RI optimization) needs Business support or higher." },
  { id: "fc-m4-cost-tools-6", lessonId: "m4-cost-tools", front: "Support plan for a TAM / 15-minute critical response vs cheapest with 24/7 and full Trusted Advisor?", back: "TAM and 15-minute business-critical response → Enterprise. Cheapest plan with 24/7 phone/chat and full Trusted Advisor → Business." },

  // m4-ref-cost
  { id: "fc-m4-ref-cost-1", lessonId: "m4-ref-cost", front: "Edge change in the cost-optimized reference?", back: "CloudFront caches static assets and API GETs, cutting origin egress (the largest variable bill) and letting the web tier shrink." },
  { id: "fc-m4-ref-cost-2", lessonId: "m4-ref-cost", front: "Web tier purchasing in the cost-optimized reference?", back: "ASG with 2 On-Demand Graviton instances as a base covered by a Compute Savings Plan, scale-out on Spot across 4 instance types, target tracking on requests/target." },
  { id: "fc-m4-ref-cost-3", lessonId: "m4-ref-cost", front: "Worker and batch tier in the cost-optimized reference?", back: "SQS-driven Fargate Spot tasks (no idle cost between bursts); long jobs on AWS Batch with Spot." },
  { id: "fc-m4-ref-cost-4", lessonId: "m4-ref-cost", front: "Data tier in the cost-optimized reference?", back: "Aurora Serverless v2 for the variable catalog, an RDS RI for the steady ledger, reports on a replica then S3 + Athena (Parquet), DynamoDB sessions on-demand with TTL." },
  { id: "fc-m4-ref-cost-5", lessonId: "m4-ref-cost", front: "Network changes in the cost-optimized reference?", back: "Gateway endpoints for S3/DynamoDB, one NAT per AZ, and interface endpoints for heavy SQS/CloudWatch traffic instead of the NAT." },
  { id: "fc-m4-ref-cost-6", lessonId: "m4-ref-cost", front: "The constraint every cost question silently enforces?", back: "Don't weaken HA (still multi-AZ), durability or security. Savings that break a requirement are distractors." },

  // m4-exam-strategy
  { id: "fc-m4-exam-strategy-1", lessonId: "m4-exam-strategy", front: "SAA-C03 format: questions, time, passing score?", back: "65 questions (50 scored, 15 unscored), 130 minutes, pass at 720 out of 1000. Multiple choice and multiple response. Valid 3 years." },
  { id: "fc-m4-exam-strategy-2", lessonId: "m4-exam-strategy", front: "Which part of a question do you read first?", back: "The final sentence: it holds the actual ask and the qualifier (cost-effective, least overhead, most secure, highly available)." },
  { id: "fc-m4-exam-strategy-3", lessonId: "m4-exam-strategy", front: "Is there a penalty for wrong answers?", back: "No. Never leave a blank; flag unsure questions and come back. Aim to finish the first pass by minute ~100." },
  { id: "fc-m4-exam-strategy-4", lessonId: "m4-exam-strategy", front: "Distractor pattern 'right service, wrong scope': examples?", back: "A security group 'deny' rule, CNAME at the zone apex, a Gateway endpoint for anything but S3/DynamoDB, Lambda for a 30-minute job." },
  { id: "fc-m4-exam-strategy-5", lessonId: "m4-exam-strategy", front: "Distractor pattern 'solves the wrong pillar': examples?", back: "Multi-AZ offered for a read-performance problem, a bigger instance for an availability problem, Spot for a stateful database." },
  { id: "fc-m4-exam-strategy-6", lessonId: "m4-exam-strategy", front: "How do you break a tie between two valid answers?", back: "Least overhead questions → the more managed/serverless option. Cost questions → the cheaper option that still meets every requirement." },
] satisfies Flashcard[];
