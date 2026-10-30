import type { Flashcard } from '../types';

export default [
  // m3b-ec2
  { id: "fc-m3b-ec2-1", lessonId: "m3b-ec2", front: "Decode the instance name c7g.xlarge.", back: "C = compute-optimized family, 7 = generation, g = Graviton (ARM), xlarge = size." },
  { id: "fc-m3b-ec2-2", lessonId: "m3b-ec2", front: "Instance family for in-memory databases, caches or SAP HANA?", back: "Memory-optimized: R (X and z for very large memory or high clock speed). C = compute-heavy batch/encoding, M = general purpose, T = burstable dev/test." },
  { id: "fc-m3b-ec2-3", lessonId: "m3b-ec2", front: "Scenario: 'reduce cost with the same performance' and the app builds on ARM → ?", back: "Graviton instances (suffix g): roughly 20-40% better price/performance than comparable x86." },
  { id: "fc-m3b-ec2-4", lessonId: "m3b-ec2", front: "Cluster placement group: layout and trade-off?", back: "Instances packed close together in ONE AZ for the lowest latency (10-100 Gbps between nodes). Great for HPC/MPI, but the AZ is a single point of failure." },
  { id: "fc-m3b-ec2-5", lessonId: "m3b-ec2", front: "Spread placement group limit?", back: "Max 7 running instances per AZ per group, each on distinct hardware. For a small number of critical instances that must not fail together." },
  { id: "fc-m3b-ec2-6", lessonId: "m3b-ec2", front: "Partition placement group: for what?", back: "Large distributed systems (HDFS, Kafka, Cassandra): up to 7 partitions per AZ on separate rack sets, hundreds of instances, failures isolated per partition." },

  // m3b-ec2-networking
  { id: "fc-m3b-ec2-networking-1", lessonId: "m3b-ec2-networking", front: "ENI vs ENA vs EFA?", back: "ENI: virtual NIC (private IP, SGs, MAC), movable between instances. ENA: enhanced networking, 100+ Gbps. EFA: ENA + OS-bypass for tightly coupled HPC/MPI." },
  { id: "fc-m3b-ec2-networking-2", lessonId: "m3b-ec2-networking", front: "Instance metadata IP, and why use IMDSv2?", back: "169.254.169.254. IMDSv2 requires a session token, which blocks SSRF attacks from stealing the instance role's credentials." },
  { id: "fc-m3b-ec2-networking-3", lessonId: "m3b-ec2-networking", front: "Stop vs hibernate vs terminate?", back: "Stop: keeps EBS, loses RAM and instance store. Hibernate: saves RAM to the encrypted root EBS for fast resume. Terminate: deletes the root volume by default." },
  { id: "fc-m3b-ec2-networking-4", lessonId: "m3b-ec2-networking", front: "When does EC2 user data run?", back: "Once, at first boot, as root (by default). For faster scale-out, bake dependencies into a golden AMI instead." },
  { id: "fc-m3b-ec2-networking-5", lessonId: "m3b-ec2-networking", front: "Are AMIs global?", back: "No, Region-specific: copy an AMI to use it in another Region. EC2 Image Builder automates golden-AMI pipelines." },
  { id: "fc-m3b-ec2-networking-6", lessonId: "m3b-ec2-networking", front: "Spot interruption warning time? Elastic IP default limit?", back: "2 minutes, via instance metadata and EventBridge. Elastic IPs: 5 per Region (soft limit)." },

  // m3b-containers
  { id: "fc-m3b-containers-1", lessonId: "m3b-containers", front: "ECS task role vs EC2 instance role?", back: "Task role: IAM permissions for one task (least privilege). Instance role: shared by every task on the host. Separate task execution role pulls images and writes logs." },
  { id: "fc-m3b-containers-2", lessonId: "m3b-containers", front: "Fargate vs ECS on EC2?", back: "Fargate: serverless containers, no nodes to patch or scale, billed per task CPU/RAM. EC2 launch type: you run the instances; cheaper when well-packed, needed for GPUs or deep host control." },
  { id: "fc-m3b-containers-3", lessonId: "m3b-containers", front: "When pick EKS over ECS?", back: "When the requirement names Kubernetes, existing K8s manifests/Helm tooling, or multi-cloud portability. Otherwise ECS is simpler." },
  { id: "fc-m3b-containers-4", lessonId: "m3b-containers", front: "What does ECR provide?", back: "Managed private container registry: vulnerability scanning (Inspector-powered enhanced scanning), lifecycle policies to prune old images, cross-Region replication, IAM-based access." },
  { id: "fc-m3b-containers-5", lessonId: "m3b-containers", front: "Scenario: simplest way to run a web container with HTTPS and autoscaling → ?", back: "AWS App Runner: point it at an image or repo and get a scaling HTTPS service, no cluster or load balancer to set up." },
  { id: "fc-m3b-containers-6", lessonId: "m3b-containers", front: "How do many copies of one ECS task share a host behind an ALB?", back: "Dynamic host port mapping: each task gets a random host port, and the ALB target group registers each task's port." },

  // m3b-lambda
  { id: "fc-m3b-lambda-1", lessonId: "m3b-lambda", front: "Max Lambda execution time?", back: "15 minutes. Longer work → Step Functions splitting it up, Fargate, AWS Batch, or EC2." },
  { id: "fc-m3b-lambda-2", lessonId: "m3b-lambda", front: "Lambda memory range, and what scales with it?", back: "128 MB to 10,240 MB. CPU and network scale with memory, so more memory can finish faster and sometimes cost less." },
  { id: "fc-m3b-lambda-3", lessonId: "m3b-lambda", front: "Default Lambda concurrency, and reserved vs provisioned?", back: "1,000 per Region (soft quota). Reserved = guarantee and cap for one function. Provisioned = pre-warmed environments that kill cold starts, at extra cost." },
  { id: "fc-m3b-lambda-4", lessonId: "m3b-lambda", front: "Scenario: Lambda must query a private RDS database → ?", back: "Attach the function to your VPC subnets with a security group, and put RDS Proxy in front of the DB. Internet/AWS APIs then need NAT or VPC endpoints." },
  { id: "fc-m3b-lambda-5", lessonId: "m3b-lambda", front: "Lambda /tmp and package size limits?", back: "/tmp up to 10 GB (ephemeral). Zip package 250 MB unzipped. Container image up to 10 GB." },
  { id: "fc-m3b-lambda-6", lessonId: "m3b-lambda", front: "What does an idle Lambda function cost?", back: "Nothing. You pay per request plus GB-seconds of run time; free tier covers 1M requests and 400,000 GB-seconds a month." },

  // m3b-api-gateway
  { id: "fc-m3b-api-gateway-1", lessonId: "m3b-api-gateway", front: "API Gateway integration timeout?", back: "29 seconds by default (raisable for Regional/private REST APIs since 2024). Exam rule: longer work must go async via SQS or Step Functions." },
  { id: "fc-m3b-api-gateway-2", lessonId: "m3b-api-gateway", front: "REST vs HTTP vs WebSocket API?", back: "REST: full features (caching, usage plans, API keys, request validation, WAF). HTTP: cheaper and faster, for simple Lambda/HTTP proxies. WebSocket: persistent two-way connections (chat, live dashboards)." },
  { id: "fc-m3b-api-gateway-3", lessonId: "m3b-api-gateway", front: "API Gateway endpoint types?", back: "Edge-optimized (via CloudFront PoPs for global clients), Regional, and Private (reachable only from your VPC through an interface endpoint)." },
  { id: "fc-m3b-api-gateway-4", lessonId: "m3b-api-gateway", front: "API Gateway authorization options?", back: "IAM (SigV4 signing), Cognito User Pool authorizer (JWT), and Lambda authorizer for custom tokens. HTTP APIs also have native JWT authorizers." },
  { id: "fc-m3b-api-gateway-5", lessonId: "m3b-api-gateway", front: "Default API Gateway throttle, and how to limit per client?", back: "10,000 requests/s per account per Region (5,000 burst). Per-client limits: usage plans with API keys." },
  { id: "fc-m3b-api-gateway-6", lessonId: "m3b-api-gateway", front: "Scenario: repeated identical GET requests hammer the backend → ?", back: "Enable API Gateway stage caching (REST APIs); default TTL 300 seconds." },

  // m3b-db-choice
  { id: "fc-m3b-db-choice-1", lessonId: "m3b-db-choice", front: "Scenario: complex joins, existing SQL app, ACID transactions → ?", back: "Relational: RDS or Aurora. Aurora when performance, scale or HA matter; RDS when a specific engine like Oracle or SQL Server is required." },
  { id: "fc-m3b-db-choice-2", lessonId: "m3b-db-choice", front: "Scenario: key-value, single-digit ms at any scale, serverless, flexible schema → ?", back: "DynamoDB. You design tables around known access patterns and get no capacity ceiling in return." },
  { id: "fc-m3b-db-choice-3", lessonId: "m3b-db-choice", front: "OLTP vs OLAP?", back: "OLTP: many small transactional reads/writes (RDS, Aurora, DynamoDB). OLAP: few huge scans over history for BI → Redshift, never an OLTP engine." },
  { id: "fc-m3b-db-choice-4", lessonId: "m3b-db-choice", front: "Scenario: social graphs, recommendations, fraud rings → ?", back: "Amazon Neptune, a graph database (property graph and RDF)." },
  { id: "fc-m3b-db-choice-5", lessonId: "m3b-db-choice", front: "Scenario: existing MongoDB app / existing Cassandra app → ?", back: "Amazon DocumentDB (MongoDB-compatible) / Amazon Keyspaces (Cassandra-compatible)." },
  { id: "fc-m3b-db-choice-6", lessonId: "m3b-db-choice", front: "Scenario: full-text search or log analytics / IoT sensor time series → ?", back: "Amazon OpenSearch Service / Amazon Timestream." },

  // m3b-rds-aurora-perf
  { id: "fc-m3b-rds-aurora-perf-1", lessonId: "m3b-rds-aurora-perf", front: "RDS engines?", back: "MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2, plus Aurora (MySQL- and PostgreSQL-compatible)." },
  { id: "fc-m3b-rds-aurora-perf-2", lessonId: "m3b-rds-aurora-perf", front: "Aurora throughput vs the standard engines?", back: "Up to 5x standard MySQL and 3x standard PostgreSQL." },
  { id: "fc-m3b-rds-aurora-perf-3", lessonId: "m3b-rds-aurora-perf", front: "Scenario: need OS and DB access to customize Oracle or SQL Server on a managed service → ?", back: "RDS Custom: managed RDS but with privileged access to the underlying host." },
  { id: "fc-m3b-rds-aurora-perf-4", lessonId: "m3b-rds-aurora-perf", front: "Scenario: RDS disk fills up unpredictably → ?", back: "Enable RDS Storage Auto Scaling: it grows storage automatically up to a max you set. RDS storage is EBS, so IOPS can also be the limit." },
  { id: "fc-m3b-rds-aurora-perf-5", lessonId: "m3b-rds-aurora-perf", front: "Aurora read scaling tools?", back: "Up to 15 replicas behind the reader endpoint with replica auto scaling, parallel query, and Global Database for cross-Region reads." },
  { id: "fc-m3b-rds-aurora-perf-6", lessonId: "m3b-rds-aurora-perf", front: "Scenario: Lambda functions cause 'too many connections' on RDS → ?", back: "RDS Proxy pools and multiplexes connections (and can use IAM auth). Scaling the DB up only raises the ceiling and costs 24/7." },

  // m3b-dynamodb
  { id: "fc-m3b-dynamodb-1", lessonId: "m3b-dynamodb", front: "Max DynamoDB item size?", back: "400 KB. Store bigger blobs in S3 and keep the pointer in the item." },
  { id: "fc-m3b-dynamodb-2", lessonId: "m3b-dynamodb", front: "Scenario: one popular partition key value throttles the table → fix?", back: "Use a high-cardinality partition key (e.g. user ID, not status) or add write sharding (random suffix). A hot key is the classic DynamoDB performance question." },
  { id: "fc-m3b-dynamodb-3", lessonId: "m3b-dynamodb", front: "DynamoDB on-demand vs provisioned capacity?", back: "On-demand: pay per request, no planning, for spiky or unknown traffic. Provisioned RCU/WCU with auto scaling: cheaper for steady, predictable load." },
  { id: "fc-m3b-dynamodb-4", lessonId: "m3b-dynamodb", front: "GSI vs LSI?", back: "GSI: different partition and sort key, add anytime, own capacity, eventually consistent. LSI: same partition key, different sort key, only at table creation." },
  { id: "fc-m3b-dynamodb-5", lessonId: "m3b-dynamodb", front: "Eventually vs strongly consistent reads: cost?", back: "Eventually consistent (default) costs half: 1 RCU = 2 eventually consistent or 1 strongly consistent read per second of up to 4 KB." },
  { id: "fc-m3b-dynamodb-6", lessonId: "m3b-dynamodb", front: "Scenario: run a Lambda whenever an item changes / auto-expire session items → ?", back: "DynamoDB Streams (ordered change log, 24 h) → Lambda. TTL deletes expired items at no cost." },

  // m3b-caching
  { id: "fc-m3b-caching-1", lessonId: "m3b-caching", front: "Scenario: need sub-ms reads in front of DynamoDB with no app changes → ?", back: "DynamoDB Accelerator (DAX): API-compatible in-memory cache with microsecond reads; only the endpoint changes." },
  { id: "fc-m3b-caching-2", lessonId: "m3b-caching", front: "Lazy loading vs write-through caching?", back: "Lazy (cache-aside): on a miss read the DB and fill the cache; caches only what's requested but can go stale. Write-through: update cache on every write; always fresh, more churn." },
  { id: "fc-m3b-caching-3", lessonId: "m3b-caching", front: "Scenario: real-time game leaderboard → ?", back: "ElastiCache for Redis (or Valkey) sorted sets: rank and score updates in sub-millisecond time." },
  { id: "fc-m3b-caching-4", lessonId: "m3b-caching", front: "The four caching layers and their services?", back: "Edge: CloudFront. API: API Gateway cache. Application: ElastiCache/DAX in front of the DB. Database: read replicas for heavy but varied reads." },
  { id: "fc-m3b-caching-5", lessonId: "m3b-caching", front: "When is ElastiCache Memcached the right pick?", back: "Simplest multi-threaded cache when you need no replication, persistence or rich data types and losing it is fine." },
  { id: "fc-m3b-caching-6", lessonId: "m3b-caching", front: "DAX vs ElastiCache for caching DynamoDB?", back: "DAX: DynamoDB-only drop-in, no code change. ElastiCache: works with any data source, but you write cache-aside logic." },

  // m3b-cloudfront
  { id: "fc-m3b-cloudfront-1", lessonId: "m3b-cloudfront", front: "Origin Access Control vs Origin Access Identity?", back: "OAC is the current way to keep an S3 origin private behind CloudFront; it replaced legacy OAI and adds SSE-KMS support and all Regions." },
  { id: "fc-m3b-cloudfront-2", lessonId: "m3b-cloudfront", front: "CloudFront signed URLs vs signed cookies?", back: "Signed URL: access to ONE file. Signed cookies: access to MANY files (e.g. a whole video course) without changing URLs." },
  { id: "fc-m3b-cloudfront-3", lessonId: "m3b-cloudfront", front: "CloudFront Functions vs Lambda@Edge?", back: "CloudFront Functions: JavaScript, sub-ms, viewer request/response only (URL rewrites, headers). Lambda@Edge: Node/Python, more time and memory, all four triggers incl. origin (auth, A/B)." },
  { id: "fc-m3b-cloudfront-4", lessonId: "m3b-cloudfront", front: "Scenario: block viewers from certain countries → ?", back: "CloudFront geo restriction (allow list or block list). For finer rules combine with AWS WAF geo-match." },
  { id: "fc-m3b-cloudfront-5", lessonId: "m3b-cloudfront", front: "Scenario: CloudFront must fail over to a backup origin → ?", back: "An origin group: primary and secondary origin; CloudFront retries the secondary when the primary returns chosen error codes or times out." },
  { id: "fc-m3b-cloudfront-6", lessonId: "m3b-cloudfront", front: "Data transfer from an AWS origin to CloudFront: cost?", back: "Free. You pay CloudFront's egress to viewers, which is cheaper than direct internet egress. Purge stale content with invalidations or versioned filenames." },

  // m3b-global-accelerator
  { id: "fc-m3b-global-accelerator-1", lessonId: "m3b-global-accelerator", front: "What does Global Accelerator give you?", back: "Two static anycast IPs. Users enter AWS's backbone at the nearest edge and reach the closest healthy endpoint (ALB, NLB, EC2, Elastic IP) across Regions." },
  { id: "fc-m3b-global-accelerator-2", lessonId: "m3b-global-accelerator", front: "Does Global Accelerator cache content?", back: "No. It speeds up and stabilizes TCP/UDP connections. CloudFront = cacheable HTTP content; GA = everything else at the network layer." },
  { id: "fc-m3b-global-accelerator-3", lessonId: "m3b-global-accelerator", front: "Scenario: multiplayer UDP game, static IPs, failover within seconds → ?", back: "AWS Global Accelerator with endpoint groups in each Region." },
  { id: "fc-m3b-global-accelerator-4", lessonId: "m3b-global-accelerator", front: "Why does Global Accelerator fail over faster than Route 53?", back: "No DNS change: clients keep the same static IPs, so there's no TTL caching; health-based rerouting happens in seconds." },
  { id: "fc-m3b-global-accelerator-5", lessonId: "m3b-global-accelerator", front: "Scenario: partners need fixed IPs to allowlist an ALB-based app → ?", back: "Put Global Accelerator in front of the ALB (or put an NLB in front). ALBs don't have static IPs." },
  { id: "fc-m3b-global-accelerator-6", lessonId: "m3b-global-accelerator", front: "How do you shift traffic gradually between Regions in Global Accelerator?", back: "Traffic dials on endpoint groups (percentage per Region) and weights on individual endpoints." },

  // m3b-hybrid-network
  { id: "fc-m3b-hybrid-network-1", lessonId: "m3b-hybrid-network", front: "Direct Connect connection speeds?", back: "Dedicated: 1, 10, 100 or 400 Gbps. Hosted (via partners): 50 Mbps up to 10 Gbps. Provisioning takes weeks to months." },
  { id: "fc-m3b-hybrid-network-2", lessonId: "m3b-hybrid-network", front: "Private vs Transit vs Public VIF?", back: "Private VIF → one VPC (via VGW or DX Gateway). Transit VIF → Transit Gateway (many VPCs). Public VIF → AWS public endpoints like S3 over DX." },
  { id: "fc-m3b-hybrid-network-3", lessonId: "m3b-hybrid-network", front: "Scenario: one Direct Connect link must reach VPCs in several Regions → ?", back: "Direct Connect Gateway, a global object that links your DX connection to VGWs or Transit Gateways in multiple Regions." },
  { id: "fc-m3b-hybrid-network-4", lessonId: "m3b-hybrid-network", front: "Scenario: all traffic over a 10 Gbps Direct Connect must be encrypted → ?", back: "Run an IPsec Site-to-Site VPN over the DX, or enable MACsec on dedicated 10/100/400 Gbps connections. DX is not encrypted by default." },
  { id: "fc-m3b-hybrid-network-5", lessonId: "m3b-hybrid-network", front: "Cheapest vs strongest Direct Connect resilience?", back: "Cheapest: Site-to-Site VPN as backup. Strongest: two (or more) DX connections at separate DX locations." },
  { id: "fc-m3b-hybrid-network-6", lessonId: "m3b-hybrid-network", front: "Scenario: hybrid DNS between on-prem and VPCs → ?", back: "Route 53 Resolver endpoints: inbound (on-prem resolves VPC names) and outbound with forwarding rules (VPC resolves on-prem names)." },

  // m3b-kinesis
  { id: "fc-m3b-kinesis-1", lessonId: "m3b-kinesis", front: "Kinesis Data Streams shard capacity?", back: "1 MB/s or 1,000 records/s in; 2 MB/s out shared by consumers (enhanced fan-out: 2 MB/s per consumer). Or use on-demand mode." },
  { id: "fc-m3b-kinesis-2", lessonId: "m3b-kinesis", front: "Kinesis Data Streams retention?", back: "24 hours by default, up to 365 days. Multiple consumers can re-read and replay. Firehose stores nothing and has no replay." },
  { id: "fc-m3b-kinesis-3", lessonId: "m3b-kinesis", front: "'Real time' vs 'near real time': which Kinesis service?", back: "Real time (~200 ms), custom consumers, replay → Kinesis Data Streams. Near real time, 'just land it in S3/Redshift/OpenSearch', zero admin → Amazon Data Firehose (buffered delivery)." },
  { id: "fc-m3b-kinesis-4", lessonId: "m3b-kinesis", front: "Amazon Data Firehose destinations and features?", back: "S3, Redshift, OpenSearch, Splunk, HTTP endpoints and partners. Optional Lambda transform, Parquet/ORC conversion, dynamic partitioning; scales automatically." },
  { id: "fc-m3b-kinesis-5", lessonId: "m3b-kinesis", front: "Scenario: real-time windowed aggregations or anomaly detection on a stream → ?", back: "Amazon Managed Service for Apache Flink (formerly Kinesis Data Analytics), reading from Data Streams or MSK." },
  { id: "fc-m3b-kinesis-6", lessonId: "m3b-kinesis", front: "Scenario: the requirement literally says Apache Kafka → ?", back: "Amazon MSK (managed Kafka); MSK Serverless for least ops. Otherwise prefer Kinesis." },

  // m3b-analytics
  { id: "fc-m3b-analytics-1", lessonId: "m3b-analytics", front: "Scenario: ad-hoc SQL over logs in S3, no infrastructure → ?", back: "Athena: serverless SQL on S3, billed per TB scanned. Cut cost by converting to Parquet/ORC, compressing and partitioning (e.g. by date)." },
  { id: "fc-m3b-analytics-2", lessonId: "m3b-analytics", front: "Scenario: discover schemas and transform S3 data without servers → ?", back: "AWS Glue: crawlers populate the Data Catalog (shared by Athena, EMR, Redshift Spectrum); serverless Spark ETL jobs; DataBrew for no-code prep." },
  { id: "fc-m3b-analytics-3", lessonId: "m3b-analytics", front: "When is EMR the answer?", back: "When you need Hadoop, Spark, Hive or Presto with cluster-level control or long custom jobs. Save with Spot task nodes, EMR Serverless, or transient clusters on S3." },
  { id: "fc-m3b-analytics-4", lessonId: "m3b-analytics", front: "Redshift Spectrum vs COPY?", back: "Spectrum queries data in S3 in place without loading it. COPY from S3 is the fast bulk-load path into Redshift tables." },
  { id: "fc-m3b-analytics-5", lessonId: "m3b-analytics", front: "Scenario: row- and column-level permissions on a data lake across Athena, Redshift and EMR → ?", back: "AWS Lake Formation: governed data lake with fine-grained permissions on Data Catalog tables." },
  { id: "fc-m3b-analytics-6", lessonId: "m3b-analytics", front: "Scenario: serverless BI dashboards for the business → ?", back: "Amazon QuickSight (SPICE in-memory engine), now branded under Amazon Quick Suite." },

  // m3b-ref-serverless
  { id: "fc-m3b-ref-serverless-1", lessonId: "m3b-ref-serverless", front: "API tier of the serverless global reference?", back: "Route 53 latency routing → edge-optimized API Gateway → Lambda in two Regions. Cognito User Pool authorizer; provisioned concurrency on hot functions; HTTP API to cut cost." },
  { id: "fc-m3b-ref-serverless-2", lessonId: "m3b-ref-serverless", front: "Data tier of the serverless global reference?", back: "DynamoDB Global Table (active-active), partition key productId plus a GSI for category browsing, DAX for microsecond reads, TTL on session/cart items." },
  { id: "fc-m3b-ref-serverless-3", lessonId: "m3b-ref-serverless", front: "Clickstream path in the reference?", back: "App events → Kinesis Data Streams (on-demand) → (a) Managed Flink 1-minute metrics → OpenSearch dashboards; (b) Firehose with Parquet + date partitions → S3 lake." },
  { id: "fc-m3b-ref-serverless-4", lessonId: "m3b-ref-serverless", front: "Batch analytics in the reference?", back: "Glue crawler catalogs the lake, Athena for SQL, QuickSight dashboards, Redshift Spectrum for heavy modelling, lifecycle to Glacier for old data." },
  { id: "fc-m3b-ref-serverless-5", lessonId: "m3b-ref-serverless", front: "How are premium images served in the reference?", back: "S3 behind CloudFront with OAC (bucket private), with signed cookies granting access to premium content." },
  { id: "fc-m3b-ref-serverless-6", lessonId: "m3b-ref-serverless", front: "The Domain 3 reflex this design teaches?", back: "Reach for the highest-level managed service that meets the performance need. Nothing asked for OS control, so everything is serverless." },
] satisfies Flashcard[];
