import type { Question } from '../types';

export default [
  {
    id: "cost-b-001",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m4-billing-model"],
    difficulty: 1,
    stem: "A solutions architect is reviewing a monthly bill for a workload in one AWS Region. Which of the following traffic flows is free of data transfer charges?",
    options: [
      "An EC2 instance sending data to another EC2 instance in the same Availability Zone using private IP addresses",
      "An EC2 instance sending data to another EC2 instance in a different Availability Zone using private IP addresses",
      "An EC2 instance in a private subnet downloading software updates from the internet through a NAT gateway",
      "An EC2 instance serving file downloads directly to users on the internet"
    ],
    answer: [0],
    explanation: "Traffic between resources in the **same AZ over private IPs** is free. Crossing an AZ boundary costs about $0.01/GB in each direction, NAT gateways charge per GB processed, and internet egress is the largest per-GB charge.",
    optionExplanations: [
      "Correct. Same-AZ traffic on private IPs carries no data transfer charge.",
      "Wrong. Inter-AZ traffic is billed per GB in each direction (about $0.01/GB out and $0.01/GB in).",
      "Wrong. Inbound internet data is free, but the NAT gateway charges an hourly fee plus a per-GB processing fee on everything it handles.",
      "Wrong. Data transfer out to the internet is billed per GB on a tiered scale and is usually the biggest network line item."
    ],
    tags: ["ec2", "vpc", "nat-gateway"]
  },
  {
    id: "cost-b-002",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m1-private-connectivity"],
    difficulty: 2,
    stem: "A company runs batch jobs on EC2 instances in private subnets. The jobs read and write about 40 TB per month to Amazon S3 and Amazon DynamoDB in the same Region, and all of that traffic currently flows through a NAT gateway. The NAT gateway is now the largest line item on the bill. What is the MOST cost-effective way to cut this cost without exposing the instances to the internet?",
    options: [
      "Assign public IPv4 addresses to the instances and route the traffic through an internet gateway",
      "Create gateway VPC endpoints for S3 and DynamoDB and add them to the private subnet route tables",
      "Create interface VPC endpoints for S3 and DynamoDB in each Availability Zone",
      "Replace the NAT gateway with a larger NAT gateway that has a lower per-GB rate"
    ],
    answer: [1],
    explanation: "The keywords are **S3 and DynamoDB** plus **high NAT charges**. Gateway endpoints for those two services cost nothing, keep traffic on the AWS network, and take it off the NAT gateway's per-GB processing meter completely.",
    optionExplanations: [
      "Wrong. Public IPs expose the instances (a security regression) and add hourly public IPv4 charges.",
      "Correct. Gateway endpoints are free, private, and remove S3 and DynamoDB traffic from the NAT gateway path.",
      "Wrong. Interface endpoints work, but they charge per hour per AZ plus per GB, while a free gateway option exists for these two services.",
      "Wrong. NAT gateways have no size tiers; every NAT gateway charges the same hourly and per-GB rates."
    ],
    tags: ["nat-gateway", "gateway-endpoint", "s3", "dynamodb"]
  },
  {
    id: "cost-b-003",
    domain: "cost",
    lessonIds: ["m4-data-transfer"],
    difficulty: 2,
    stem: "A VPC has private subnets in three Availability Zones. To save money, the team deployed one NAT gateway in AZ-a, and every private subnet routes 0.0.0.0/0 to it. The bill shows high inter-AZ data transfer charges alongside the NAT processing charges, and the workload must keep working if one AZ fails. Which change BEST addresses both problems?",
    options: [
      "Move all instances into AZ-a so that they share the NAT gateway's Availability Zone",
      "Replace the NAT gateway with a single NAT instance on a small EC2 instance in AZ-a",
      "Deploy a NAT gateway in each Availability Zone and point each private subnet's route table to the NAT gateway in its own AZ",
      "Create a VPC peering connection between the subnets in each Availability Zone"
    ],
    answer: [2],
    explanation: "Instances in AZ-b and AZ-c pay **cross-AZ** charges to reach the NAT in AZ-a, and that single NAT is also a single point of failure. **One NAT per AZ** with AZ-local routing removes the cross-AZ hop and restores AZ independence; the extra hourly charge is usually far smaller than the cross-AZ data charge.",
    optionExplanations: [
      "Wrong. Putting everything in one AZ removes the cross-AZ charge but breaks the requirement to survive an AZ failure.",
      "Wrong. A NAT instance is a single point of failure, needs patching, and still causes cross-AZ traffic from the other AZs.",
      "Correct. AZ-local NAT gateways avoid inter-AZ data charges and keep each AZ independent if another AZ fails.",
      "Wrong. Peering connects VPCs, not subnets inside the same VPC, and it does nothing about NAT routing."
    ],
    tags: ["nat-gateway", "route-table", "vpc"]
  },
  {
    id: "cost-b-004",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m1-private-connectivity"],
    difficulty: 3,
    stem: "Container workloads in private subnets pull images from Amazon ECR and send large volumes of messages to Amazon SQS and metrics to Amazon CloudWatch. All of this traffic leaves through NAT gateways, and the security team forbids any path to the internet for these subnets. S3 gateway endpoints are already in place. Which solution meets the security requirement at the LOWEST cost?",
    options: [
      "Keep the NAT gateways and add an outbound security group rule that allows only AWS service IP ranges",
      "Replace the NAT gateways with NAT instances on Graviton EC2 instances to cut the per-GB charge",
      "Create gateway VPC endpoints for ECR, SQS, and CloudWatch",
      "Create interface VPC endpoints for ECR (api and dkr), SQS, and CloudWatch, then remove the default route to the NAT gateways"
    ],
    answer: [3],
    explanation: "**No internet path** rules out NAT entirely, and gateway endpoints exist **only for S3 and DynamoDB**. Interface endpoints (PrivateLink) charge about $0.01 per hour per AZ plus about $0.01/GB. That is well below NAT processing at about $0.045/GB, so for high-volume AWS API traffic they are both the secure option and the cheaper one.",
    optionExplanations: [
      "Wrong. The subnets would still have a route to the internet, which breaks the security requirement, and NAT processing charges would stay the same.",
      "Wrong. NAT instances are still an internet path and add operational overhead, so the requirement is still not met.",
      "Wrong. Gateway endpoints only exist for S3 and DynamoDB, so you cannot create them for ECR, SQS, or CloudWatch.",
      "Correct. Interface endpoints keep traffic private, and their per-GB price is lower than NAT processing for high-volume service traffic."
    ],
    tags: ["interface-endpoint", "privatelink", "nat-gateway", "ecr", "sqs", "cloudwatch"]
  },
  {
    id: "cost-b-005",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m3b-cloudfront"],
    difficulty: 2,
    stem: "A software vendor serves 300 TB per month of installer downloads to customers worldwide directly from public S3 bucket URLs. Data transfer out from S3 is the biggest item on the bill, and customers far from the Region complain about slow downloads. What is the MOST cost-effective solution that also improves download speed?",
    options: [
      "Put an Amazon CloudFront distribution in front of the bucket, restrict the bucket with origin access control, and serve the downloads through CloudFront",
      "Enable S3 Transfer Acceleration on the bucket and give customers the accelerated endpoint",
      "Replicate the bucket to four other Regions with S3 Cross-Region Replication and use Route 53 latency-based routing",
      "Turn on Requester Pays for the bucket so customers pay for their own downloads"
    ],
    answer: [0],
    explanation: "**High data transfer out to users** points to CloudFront. Fetches from an S3 origin to CloudFront are free, CloudFront egress rates are generally lower than S3's direct internet rates, and cached edge copies speed up downloads around the world.",
    optionExplanations: [
      "Correct. CloudFront lowers the per-GB egress cost, caches at edge locations near users, and OAC keeps the bucket private.",
      "Wrong. Transfer Acceleration adds a per-GB fee on top of normal transfer and is designed for long-distance uploads, not cheap mass downloads.",
      "Wrong. Replication adds inter-Region transfer charges and four extra copies of the storage, which raises the bill.",
      "Wrong. Requester Pays requires authenticated AWS requesters, so it does not work for anonymous public customers."
    ],
    tags: ["cloudfront", "s3"]
  },
  {
    id: "cost-b-006",
    domain: "cost",
    lessonIds: ["m3b-cloudfront", "m4-data-transfer"],
    difficulty: 3,
    stem: "A news site runs on an Application Load Balancer with EC2 instances. It serves HTML, JSON API responses, and images to a global audience, and internet data transfer out from the Region costs more every month. Most API GET responses can be cached for 60 seconds, and the site must keep serving fresh breaking news. Which TWO actions will MOST reduce data transfer cost? (Choose TWO.)",
    options: [
      "Put an Amazon CloudFront distribution in front of the ALB with cache behaviors for images and for API GET requests using a 60-second TTL",
      "Enable S3 Transfer Acceleration for the image bucket",
      "Move the EC2 instances into a single Availability Zone to avoid cross-AZ charges",
      "Enable automatic compression (Gzip and Brotli) on the CloudFront cache behaviors",
      "Attach AWS Global Accelerator to the ALB so that traffic uses the AWS backbone"
    ],
    answer: [0, 3],
    explanation: "CloudFront answers **repeated requests from the edge**, so the origin sends each object far fewer times, and CloudFront egress is priced below Regional internet egress. **Compression** shrinks every text response, so fewer GB are billed. A short TTL keeps breaking news fresh.",
    optionExplanations: [
      "Correct. Edge caching cuts origin egress and lets the web tier shrink, and the 60-second TTL meets the freshness requirement.",
      "Wrong. Transfer Acceleration speeds up long-distance uploads to S3 and adds cost; it does not help downloads from an ALB.",
      "Wrong. ALB cross-zone traffic is not the cost driver here, and a single AZ breaks high availability.",
      "Correct. Compressed HTML and JSON are often 60-80% smaller, which directly reduces the GB billed for egress.",
      "Wrong. Global Accelerator adds an hourly fee and a data-transfer premium, and it does no caching."
    ],
    tags: ["cloudfront", "alb", "ec2", "global-accelerator"]
  },
  {
    id: "cost-b-007",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m4-cost-compute"],
    difficulty: 2,
    stem: "A research team runs a nightly, short-lived Amazon EMR cluster that shuffles several terabytes between its nodes. The job can simply be rerun if it fails, and there is no availability requirement for the cluster. Inter-AZ data transfer makes up a large share of the job's cost. What should the solutions architect recommend?",
    options: [
      "Spread the cluster across three Availability Zones for maximum resilience",
      "Launch the whole cluster in a single subnet so that every node is in one Availability Zone",
      "Route node-to-node traffic through a NAT gateway",
      "Connect the nodes with VPC peering"
    ],
    answer: [1],
    explanation: "When there is **no HA requirement** and the job can be rerun, put the chatty nodes **in the same AZ**, where private-IP traffic is free. Multi-AZ placement is only worth its per-GB cost when a requirement calls for it.",
    optionExplanations: [
      "Wrong. Spreading the cluster across AZs adds per-GB charges for every shuffle, and resilience is not required.",
      "Correct. Same-AZ node traffic over private IPs costs nothing, and EMR clusters run in a single subnet by design.",
      "Wrong. A NAT gateway is for outbound internet traffic and would add per-GB processing charges.",
      "Wrong. Peering connects VPCs, and nodes in the same VPC already reach each other directly."
    ],
    tags: ["emr", "ec2", "subnet"]
  },
  {
    id: "cost-b-008",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m4-cost-storage-db"],
    difficulty: 3,
    stem: "An application runs on EC2 instances in three Availability Zones. It reads heavily from an Amazon ElastiCache (Redis OSS) replication group that has only one primary node, in AZ-a. Cross-AZ data transfer charges keep growing, and the application must keep running if any single AZ fails. Which solution reduces cost while meeting the availability requirement?",
    options: [
      "Move all EC2 instances and the cache into AZ-a",
      "Scale the primary node up to a larger instance type",
      "Add a read replica in each Availability Zone, enable Multi-AZ, and configure the clients to read from the replica in their own AZ",
      "Put AWS Global Accelerator in front of the cache endpoint"
    ],
    answer: [2],
    explanation: "Reads from two of the three AZs cross an AZ boundary and are billed per GB. **AZ-local read replicas** make most reads free, same-AZ traffic, and Multi-AZ with automatic failover also improves resilience. The cheaper-looking option of moving everything into one AZ breaks the **survive an AZ failure** requirement.",
    optionExplanations: [
      "Wrong. One AZ removes the cross-AZ charge but fails the stated availability requirement.",
      "Wrong. A larger node raises cost and does nothing about cross-AZ reads.",
      "Correct. Same-AZ replica reads avoid inter-AZ charges, and replicas with failover protect against an AZ outage.",
      "Wrong. Global Accelerator is for internet-facing endpoints; it cannot front an in-VPC cache and would add cost."
    ],
    tags: ["elasticache", "ec2", "vpc"]
  },
  {
    id: "cost-b-009",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m2-dr-strategies", "m4-cost-storage-db"],
    difficulty: 2,
    stem: "A company replicates an entire 400 TB S3 bucket to a second Region for disaster recovery. A review finds that only the objects under the `contracts/` prefix (about 20 TB) are covered by the DR requirement; everything else can be regenerated. Which change reduces cost while still meeting the DR requirement?",
    options: [
      "Disable replication and rely on S3's eleven nines of durability",
      "Replace Cross-Region Replication with Same-Region Replication",
      "Copy the bucket to the second Region once a month with AWS DataSync",
      "Change the replication rule so that it applies only to the `contracts/` prefix, and store the replicas in a lower-cost storage class"
    ],
    answer: [3],
    explanation: "Inter-Region transfer and the second copy of storage are charged per GB, so **replicate only what DR needs**. A prefix (or tag) filter on the replication rule cuts the volume by 95%, and a replica storage class such as Standard-IA or Glacier Instant Retrieval cuts the storage bill further.",
    optionExplanations: [
      "Wrong. Durability does not protect against a Regional outage, so the DR requirement would no longer be met.",
      "Wrong. Same-Region Replication keeps the copy in the same Region and provides no Regional DR.",
      "Wrong. A monthly copy could lose up to a month of contracts, and it still moves far more data than needed if the whole bucket is copied.",
      "Correct. A filtered replication rule copies only the 20 TB that matters, and a cheaper storage class lowers the replica cost."
    ],
    tags: ["s3", "s3-replication"]
  },
  {
    id: "cost-b-010",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m1-private-connectivity"],
    difficulty: 2,
    stem: "A manufacturer sends about 120 TB per month of processed results from AWS back to its data center, a steady flow that will continue for years. The traffic currently runs over an AWS Site-to-Site VPN on the public internet, and data transfer out is the largest cost. What is the MOST cost-effective long-term solution?",
    options: [
      "Provision an AWS Direct Connect connection and send the hybrid traffic over it",
      "Add a second VPN tunnel and use ECMP to spread the traffic",
      "Ship the data on AWS Snowball Edge devices every month",
      "Use S3 Transfer Acceleration for the downloads to the data center"
    ],
    answer: [0],
    explanation: "Data transferred out over **Direct Connect** is billed at a much lower per-GB rate than internet egress (roughly $0.02/GB compared with about $0.09/GB on the first tier). At 120 TB per month, that saving easily covers the port-hour charge, so the keyword is **steady, bulk hybrid egress**.",
    optionExplanations: [
      "Correct. Direct Connect's lower data transfer out rate makes it cheapest for large, sustained hybrid volumes.",
      "Wrong. VPN traffic is still billed at internet egress rates; more tunnels add bandwidth, not savings.",
      "Wrong. Monthly Snowball jobs add device fees, shipping time, and operational overhead for a continuous flow.",
      "Wrong. Transfer Acceleration adds a fee on top of normal egress and is meant for uploads to S3."
    ],
    tags: ["direct-connect", "site-to-site-vpn"]
  },
  {
    id: "cost-b-011",
    domain: "cost",
    lessonIds: ["m1-private-connectivity", "m4-data-transfer"],
    difficulty: 3,
    stem: "A retail company is opening a small branch office that needs encrypted connectivity to a VPC for a point-of-sale sync of about 30 GB per month. The office must be online within one week, and the budget is tight. Which option is the MOST cost-effective while meeting the requirements?",
    options: [
      "A 1 Gbps dedicated AWS Direct Connect connection with MACsec encryption",
      "An AWS Site-to-Site VPN connection from the branch router to a virtual private gateway",
      "A hosted Direct Connect connection from an AWS Partner with a VPN running over it",
      "An AWS Transit Gateway with Direct Connect gateway attachments"
    ],
    answer: [1],
    explanation: "**Small volume, encrypted, needed within a week, tight budget** all point to Site-to-Site VPN. It costs about $0.05 per hour plus normal egress, is IPsec-encrypted, and can be set up in hours. Direct Connect usually takes weeks to provision and charges port hours that a 30 GB per month workload will never pay back.",
    optionExplanations: [
      "Wrong. Dedicated Direct Connect takes weeks and is expensive for tiny volumes.",
      "Correct. A VPN is encrypted by default, cheap, and can be live in hours, so it fits low volume and a short deadline.",
      "Wrong. Even hosted Direct Connect costs more and takes longer than a VPN, with no benefit at 30 GB per month.",
      "Wrong. This adds Transit Gateway attachment hours on top of Direct Connect, and the branch needs neither."
    ],
    tags: ["site-to-site-vpn", "direct-connect"]
  },
  {
    id: "cost-b-012",
    domain: "cost",
    lessonIds: ["m4-billing-model", "m4-data-transfer"],
    difficulty: 1,
    stem: "Which statement about public IPv4 address charges on AWS is correct?",
    options: [
      "Public IPv4 addresses are charged only when an Elastic IP is not attached to a running instance",
      "Public IPv4 addresses are free when they are used by an internet-facing load balancer",
      "Every public IPv4 address is charged hourly, whether it is attached to a resource or idle",
      "Public IPv4 charges apply only to addresses in the default VPC"
    ],
    answer: [2],
    explanation: "Since February 2024, AWS charges about $0.005 per hour (about $3.60 per month) for **every public IPv4 address**, in use or idle. This covers auto-assigned IPs, Elastic IPs, and the addresses behind load balancers and NAT gateways. Fewer public IPs, IPv6, or private subnets reduce the charge.",
    optionExplanations: [
      "Wrong. That was the old rule for Elastic IPs; in-use public IPv4 addresses are now billed too.",
      "Wrong. Load balancer nodes use public IPv4 addresses, and those addresses are billed as well.",
      "Correct. All public IPv4 addresses are billed hourly, attached or not.",
      "Wrong. The charge applies to public IPv4 addresses in any VPC."
    ],
    tags: ["elastic-ip", "vpc"]
  },
  {
    id: "cost-b-013",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m1-private-connectivity"],
    difficulty: 2,
    stem: "Sixty EC2 instances sit behind an Application Load Balancer in public subnets, and each has an auto-assigned public IPv4 address. Users reach the application only through the ALB, administrators connect to the instances over SSH through those public IPs, and the instances need no other internet access. Which change reduces cost and improves security with the LEAST operational overhead?",
    options: [
      "Replace each auto-assigned address with an Elastic IP address",
      "Keep the public IPs but restrict SSH to the administrators' office CIDR in the security group",
      "Move the instances behind a NAT gateway and keep their public IPs for SSH",
      "Move the instances to private subnets without public IPs, and use AWS Systems Manager Session Manager through interface endpoints for administrative access"
    ],
    answer: [3],
    explanation: "Every public IPv4 address is billed hourly, so 60 unnecessary addresses add up to about $216 per month. **Private subnets with Session Manager** remove the addresses and the open SSH port, and Session Manager is reached through the ssm, ssmmessages, and ec2messages interface endpoints, with no NAT gateway needed.",
    optionExplanations: [
      "Wrong. Elastic IPs are still public IPv4 addresses and are billed the same way.",
      "Wrong. This improves security a little, but every instance keeps a billed public IPv4 address.",
      "Wrong. This adds NAT gateway charges and keeps all 60 public IP charges.",
      "Correct. It removes 60 billed addresses and the SSH exposure, and Session Manager provides audited access without bastion hosts."
    ],
    tags: ["ec2", "elastic-ip", "systems-manager", "interface-endpoint", "alb"]
  },
  {
    id: "cost-b-014",
    domain: "cost",
    lessonIds: ["m4-data-transfer", "m1-private-connectivity"],
    difficulty: 3,
    stem: "A company has 40 workload VPCs that are already connected through AWS Transit Gateway. Each VPC runs its own NAT gateways in two Availability Zones, and most of the VPCs send very little internet traffic. The company wants to cut the cost of idle NAT gateways while keeping outbound internet access highly available. What should the solutions architect do?",
    options: [
      "Build a central egress VPC with a NAT gateway in each of its AZs, route 0.0.0.0/0 from the workload VPCs to the egress VPC attachment, and remove the per-VPC NAT gateways",
      "Replace every NAT gateway with a NAT instance on a t4g.nano EC2 instance",
      "Give each workload instance a public IPv4 address and an internet gateway route",
      "Peer each workload VPC with a shared VPC that contains a NAT gateway"
    ],
    answer: [0],
    explanation: "**Centralized egress through Transit Gateway** replaces 80 NAT gateways that are mostly idle (about $0.045 per hour each) with a few in one VPC. Transit Gateway adds about $0.02/GB processing, which is a good trade when traffic per VPC is low. NAT gateways in each AZ of the egress VPC keep it highly available.",
    optionExplanations: [
      "Correct. Consolidating NAT in a shared egress VPC removes most of the NAT hours and keeps a NAT gateway in each AZ.",
      "Wrong. NAT instances are single points of failure, need patching, and break the high availability requirement.",
      "Wrong. Public IPs add hourly IPv4 charges and expose every instance to the internet.",
      "Wrong. VPC peering is not transitive, so the workload VPCs cannot reach the internet through another VPC's NAT gateway."
    ],
    tags: ["transit-gateway", "nat-gateway", "vpc"]
  },
  {
    id: "cost-b-015",
    domain: "cost",
    lessonIds: ["m1-private-connectivity", "m4-data-transfer"],
    difficulty: 3,
    stem: "A network team is building a centralized egress design for 25 spoke VPCs attached to an AWS Transit Gateway. The design must keep internet access working if one Availability Zone fails and must not add any servers that need patching. Which TWO components are required? (Choose TWO.)",
    options: [
      "An S3 gateway endpoint in the egress VPC that the spoke VPCs reach through the transit gateway",
      "A default route (0.0.0.0/0) in the spoke transit gateway route table that points to the egress VPC attachment",
      "A single NAT instance in the egress VPC with source/destination checking disabled",
      "A NAT gateway in each Availability Zone of the egress VPC, with each egress subnet routing to the NAT gateway in its own AZ",
      "VPC peering connections from each spoke VPC to the egress VPC"
    ],
    answer: [1, 3],
    explanation: "Centralized egress needs **a TGW default route to the egress attachment** and **NAT gateways in each AZ** of the egress VPC, so the design is highly available and has no servers to patch. Gateway endpoints cannot be used across Transit Gateway or peering, so each spoke keeps its own free S3 gateway endpoint.",
    optionExplanations: [
      "Wrong. Gateway endpoints only work for traffic that starts inside their own VPC; traffic arriving over TGW cannot use them.",
      "Correct. The spoke route table must send internet-bound traffic to the egress VPC attachment.",
      "Wrong. A single NAT instance is a server to patch and a single point of failure, so it breaks both requirements.",
      "Correct. AZ-local NAT gateways are managed and survive the loss of an AZ.",
      "Wrong. Peering is not transitive for internet egress, and the spokes are already connected through TGW."
    ],
    tags: ["transit-gateway", "nat-gateway", "gateway-endpoint", "vpc-peering"]
  },
  {
    id: "cost-b-016",
    domain: "cost",
    lessonIds: ["m1-private-connectivity", "m4-data-transfer"],
    difficulty: 3,
    stem: "A company has 30 VPCs connected by AWS Transit Gateway. Each VPC has its own interface VPC endpoints for the same 10 AWS services, deployed in two Availability Zones, so the hourly endpoint charges alone are significant. Traffic through the endpoints is light. Which solution reduces cost with the LEAST impact on applications?",
    options: [
      "Delete the interface endpoints and send the traffic through NAT gateways in every VPC",
      "Create the interface endpoints once in a shared services VPC, disable their private DNS, and associate Route 53 private hosted zones for the service names with all spoke VPCs",
      "Replace every interface endpoint with a gateway endpoint",
      "Use VPC peering between all 30 VPCs so that they share one VPC's endpoints"
    ],
    answer: [1],
    explanation: "Each interface endpoint is billed **per hour per AZ**, so 30 VPCs × 10 services × 2 AZs comes to 600 endpoint-AZ hours every hour. **Centralizing the endpoints** in a shared services VPC, reached over TGW, cuts that to 20, and private hosted zones keep the default service DNS names working, so applications do not change.",
    optionExplanations: [
      "Wrong. That adds NAT hours and per-GB processing, and it sends private service traffic out through an internet path.",
      "Correct. Shared endpoints with Route 53 private hosted zones remove 29 duplicate copies of each endpoint.",
      "Wrong. Gateway endpoints exist only for S3 and DynamoDB.",
      "Wrong. A full mesh of 30 VPCs would need 435 peering connections, which is not manageable when Transit Gateway is already in place."
    ],
    tags: ["interface-endpoint", "transit-gateway", "route53", "privatelink"]
  },
  {
    id: "cost-b-017",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 1,
    stem: "A finance manager wants to see the company's AWS spend over the past 12 months, grouped by service and linked account, and to view a forecast for the next few months, without building anything. Which AWS tool provides this?",
    options: [
      "AWS Pricing Calculator",
      "AWS Trusted Advisor",
      "AWS Cost Explorer",
      "AWS Compute Optimizer"
    ],
    answer: [2],
    explanation: "**Analyze spending trends and forecast** is the job of **Cost Explorer**. It has built-in charts that you can filter and group by service, account, Region, or cost allocation tag, plus a 12-month forecast, and the console interface is free.",
    optionExplanations: [
      "Wrong. Pricing Calculator estimates the cost of architectures you plan to build; it does not show actual spend.",
      "Wrong. Trusted Advisor runs best-practice checks; it does not show spend trends or forecasts.",
      "Correct. Cost Explorer shows historical spend by many dimensions and forecasts future spend.",
      "Wrong. Compute Optimizer gives right-sizing recommendations, not spend reports."
    ],
    tags: ["cost-explorer"]
  },
  {
    id: "cost-b-018",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 2,
    stem: "A startup gives each developer a sandbox account in AWS Organizations. Leadership wants each sandbox capped near $500 per month: the developer should get an email at 80% of forecast spend, and when actual spend reaches 100%, the account should automatically be prevented from launching new EC2 instances. Which solution meets these requirements with the LEAST operational overhead?",
    options: [
      "Use Cost Explorer reports and have an administrator review them every morning",
      "Create a CloudWatch billing alarm that invokes a Lambda function to delete the account",
      "Enable AWS Cost Anomaly Detection with a $500 threshold",
      "Create an AWS Budgets cost budget for each account with a forecast alert at 80% and a budget action at 100% that applies an SCP denying ec2:RunInstances"
    ],
    answer: [3],
    explanation: "**Alert on forecast** plus **automatically restrict when the budget is hit** is AWS Budgets with **budget actions**. A budget action can apply an IAM policy or SCP, or stop specific EC2 and RDS instances, without any custom code.",
    optionExplanations: [
      "Wrong. Manual daily reviews are slow and enforce nothing.",
      "Wrong. Deleting the account is destructive and needs custom code; billing alarms also cannot alert on forecast spend.",
      "Wrong. Anomaly Detection flags unusual spikes and cannot block actions when a fixed cap is reached.",
      "Correct. Budgets supports forecast alerts and native actions that apply an SCP when actual spend crosses the threshold."
    ],
    tags: ["budgets", "organizations", "scp"]
  },
  {
    id: "cost-b-019",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 2,
    stem: "A company's AWS spend varies widely from week to week because of campaigns, so fixed budget thresholds produce constant false alarms. The FinOps team wants to be notified automatically when a service's spend suddenly deviates from its normal pattern, for example when a misconfigured job runs up a large data transfer bill overnight. Which solution meets this requirement?",
    options: [
      "Create AWS Cost Anomaly Detection monitors for AWS services with an alert subscription to an SNS topic",
      "Create a monthly AWS Budgets cost budget with an alert at 100%",
      "Enable AWS Trusted Advisor cost optimization checks",
      "Turn on Data Exports and query the data weekly with Amazon Athena"
    ],
    answer: [0],
    explanation: "**Unexpected spikes without fixed thresholds** means **Cost Anomaly Detection**. It uses machine learning to learn each service's normal spend pattern, flags deviations, and sends alerts by email or SNS. The feature itself is free.",
    optionExplanations: [
      "Correct. ML-based monitors catch spikes measured against the learned baseline and alert through SNS.",
      "Wrong. A monthly 100% threshold is the kind of fixed alarm that misses an overnight spike until the budget is used up.",
      "Wrong. Trusted Advisor finds idle or underused resources; it does not detect spend anomalies.",
      "Wrong. A weekly manual query is slow and needs custom analysis to find anomalies."
    ],
    tags: ["cost-anomaly-detection", "sns"]
  },
  {
    id: "cost-b-020",
    domain: "cost",
    lessonIds: ["m4-cost-tools", "m3b-analytics"],
    difficulty: 2,
    stem: "A shared-platform team must charge internal business units back for their usage. The team needs hourly, resource-level billing line items and wants to write custom SQL against them and build dashboards, with no servers to manage. Which TWO actions should the solutions architect take? (Choose TWO.)",
    options: [
      "Create an AWS Data Exports export (Cost and Usage Report 2.0) delivered to an S3 bucket in Parquet format",
      "Download the monthly PDF invoice and parse it with a Lambda function",
      "Query the exported data with Amazon Athena and visualize the results in Amazon QuickSight",
      "Load the data into an always-on Amazon Redshift provisioned cluster",
      "Use the AWS Pricing Calculator to estimate each business unit's share"
    ],
    answer: [0, 2],
    explanation: "**Most granular, line-item data with custom SQL** points to the **Cost and Usage Report** (now delivered through AWS Data Exports) in S3. **Athena** queries it serverlessly and **QuickSight** builds the dashboards, so nothing runs when no one is querying.",
    optionExplanations: [
      "Correct. Data Exports delivers hourly, resource-level billing data to S3, and Parquet keeps queries cheap.",
      "Wrong. The invoice is a summary with no resource-level detail.",
      "Correct. Athena gives serverless SQL over the export, and QuickSight provides the chargeback dashboards.",
      "Wrong. A provisioned cluster bills by the hour while idle, which is the opposite of cost-effective for periodic reports.",
      "Wrong. Pricing Calculator produces estimates, not actual usage."
    ],
    tags: ["cost-usage-report", "athena", "quicksight", "s3"]
  },
  {
    id: "cost-b-021",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 2,
    stem: "Engineers have tagged all their resources with a `Project` tag for three weeks, but the finance team cannot filter or group by `Project` in Cost Explorer or AWS Budgets. The accounts are members of an organization. What must be done?",
    options: [
      "Enable AWS Config so that the tags are recorded",
      "Activate `Project` as a user-defined cost allocation tag in the Billing and Cost Management console of the management account",
      "Re-create the resources so that the tag is applied at launch",
      "Add the tag to every IAM user that created the resources"
    ],
    answer: [1],
    explanation: "Tags appear in billing tools only after they are **activated as cost allocation tags**. In an organization this is done in the **management (payer) account**. After activation, the tag can take up to 24 hours to appear, and you can request a backfill of earlier usage.",
    optionExplanations: [
      "Wrong. Config records resource configuration and tags, but it does not make tags available in billing data.",
      "Correct. Activating the tag as a cost allocation tag in the payer account turns it into a billing dimension.",
      "Wrong. The tags already exist, so re-creating the resources changes nothing until the tag is activated.",
      "Wrong. Tags on IAM principals do not attribute resource costs."
    ],
    tags: ["cost-explorer", "budgets", "organizations"]
  },
  {
    id: "cost-b-022",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 3,
    stem: "A company with 60 accounts in AWS Organizations needs accurate cost attribution by `CostCenter`. Audits show that many new EC2 instances are launched without the tag, so their cost cannot be assigned to anyone. The company wants to prevent untagged launches across all accounts and see the tag in billing reports. Which TWO actions meet these requirements with the LEAST ongoing effort? (Choose TWO.)",
    options: [
      "Run a weekly script that emails the owners of untagged instances",
      "Attach an SCP that denies ec2:RunInstances when the aws:RequestTag/CostCenter condition key is missing",
      "Enable Cost Anomaly Detection for each account",
      "Create a separate AWS Budget for each account",
      "Activate `CostCenter` as a cost allocation tag in the management account"
    ],
    answer: [1, 4],
    explanation: "Governance needs **prevention** and **visibility**. An **SCP with a `Null` condition on aws:RequestTag/CostCenter** blocks untagged launches in every member account, and **activating the cost allocation tag** makes it a dimension in Cost Explorer, Budgets, and the CUR. Tag policies can also standardize allowed tag values.",
    optionExplanations: [
      "Wrong. A script only reacts after the fact, and someone has to maintain it.",
      "Correct. The SCP stops untagged launches across all accounts at the organization level.",
      "Wrong. Anomaly Detection catches spend spikes, not missing tags.",
      "Wrong. Per-account budgets give account-level totals, not attribution by cost center.",
      "Correct. Activating the tag is required before it can be used to group or filter costs."
    ],
    tags: ["organizations", "scp", "cost-explorer"]
  },
  {
    id: "cost-b-023",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 1,
    stem: "A company on the AWS Basic Support plan wants automated checks across all of its accounts that flag idle load balancers, underused EC2 instances, and unattached EBS volumes. What must the company do to get the full set of AWS Trusted Advisor cost optimization checks?",
    options: [
      "Enable AWS Config in every Region",
      "Activate cost allocation tags",
      "Upgrade to the Business, Enterprise On-Ramp, or Enterprise Support plan",
      "Purchase a Compute Savings Plan"
    ],
    answer: [2],
    explanation: "Basic and Developer plans include only the **core Trusted Advisor checks**. The **full set of checks**, including the cost optimization checks, requires **Business Support or higher**, and Business is the cheapest plan that unlocks it.",
    optionExplanations: [
      "Wrong. Config tracks configuration compliance and does not unlock Trusted Advisor checks.",
      "Wrong. Tags help attribute cost, but they have nothing to do with which Trusted Advisor checks you get.",
      "Correct. Full Trusted Advisor checks come with Business, Enterprise On-Ramp, or Enterprise Support.",
      "Wrong. A Savings Plan lowers compute rates but does not change your support plan."
    ],
    tags: ["trusted-advisor"]
  },
  {
    id: "cost-b-024",
    domain: "cost",
    lessonIds: ["m4-cost-tools", "m4-billing-model"],
    difficulty: 2,
    stem: "A company operates five standalone AWS accounts, each paid separately. Account A has Reserved Instances it no longer fully uses, while account B runs the same instance family On-Demand in the same Region. Each account also stores a few hundred terabytes in S3. Which action lowers total cost with the LEAST effort?",
    options: [
      "Sell account A's Reserved Instances and buy new ones in account B",
      "Migrate every workload into a single AWS account",
      "Buy a Savings Plan in each account",
      "Create an organization in AWS Organizations, invite all five accounts, and use consolidated billing"
    ],
    answer: [3],
    explanation: "**Consolidated billing** shares RI and Savings Plans discounts across accounts by default, so B uses A's idle reservations. It also **combines usage for volume pricing tiers** (S3 storage, data transfer), so the combined S3 storage reaches cheaper tiers. It involves no migration and has no extra cost.",
    optionExplanations: [
      "Wrong. Marketplace resale is slow, may not be allowed for every RI type, and needs new purchases.",
      "Wrong. A single-account migration is a huge effort and removes account isolation.",
      "Wrong. New commitments add spend while account A's existing reservations stay idle.",
      "Correct. Consolidated billing shares discounts and pools volume tiers automatically."
    ],
    tags: ["organizations", "reserved-instances", "savings-plans", "s3"]
  },
  {
    id: "cost-b-025",
    domain: "cost",
    lessonIds: ["m4-cost-tools", "m4-billing-model"],
    difficulty: 3,
    stem: "A holding company uses consolidated billing for all of its subsidiaries. One subsidiary bought its own Savings Plans and is measured on its own unit costs, so its leadership complains that other accounts are using its discounts. All other accounts should continue to share commitments. What should the solutions architect do?",
    options: [
      "In the management account's billing preferences, turn off RI and Savings Plans discount sharing for that subsidiary's account",
      "Move the subsidiary out of the organization and pay its bill separately",
      "Apply an SCP to the subsidiary that denies savingsplans:* actions",
      "Convert the subsidiary's Savings Plans into Reserved Instances"
    ],
    answer: [0],
    explanation: "Discount sharing can be **turned off for individual accounts** in billing preferences. The account's commitments then apply only to itself, and it does not receive other accounts' discounts. The subsidiary stays on consolidated billing and keeps its volume tier benefits.",
    optionExplanations: [
      "Correct. Per-account sharing controls isolate this account while the others keep sharing.",
      "Wrong. Leaving the organization loses central governance and volume tier aggregation.",
      "Wrong. SCPs control API permissions, not how billing discounts are applied.",
      "Wrong. Savings Plans cannot be converted, and RIs are shared the same way."
    ],
    tags: ["organizations", "savings-plans", "reserved-instances"]
  },
  {
    id: "cost-b-026",
    domain: "cost",
    lessonIds: ["m4-cost-tools"],
    difficulty: 1,
    stem: "Before writing any code, a solutions architect must give a customer an estimated monthly cost for a proposed design that uses an ALB, six EC2 instances, Amazon Aurora, and 5 TB of CloudFront traffic. Which AWS tool should the architect use?",
    options: [
      "AWS Cost Explorer",
      "AWS Pricing Calculator",
      "AWS Budgets",
      "AWS Cost and Usage Report"
    ],
    answer: [1],
    explanation: "**Estimate before building** means **AWS Pricing Calculator**. It models services and usage assumptions and produces a shareable estimate. The other tools work only on usage that has already happened.",
    optionExplanations: [
      "Wrong. Cost Explorer analyzes and forecasts spend from existing usage.",
      "Correct. Pricing Calculator estimates the cost of architectures that do not exist yet.",
      "Wrong. Budgets tracks spend against a target; it does not price a design.",
      "Wrong. The CUR contains line items for usage that has already been billed."
    ],
    tags: ["pricing-calculator"]
  },
  {
    id: "cost-b-027",
    domain: "cost",
    lessonIds: ["m4-ref-cost"],
    difficulty: 2,
    stem: "A three-tier web application runs EC2 instances in an Auto Scaling group across two Availability Zones and an RDS Multi-AZ database. Leadership asks for lower monthly cost but insists that the application must still survive the loss of an AZ. Which change meets this requirement?",
    options: [
      "Convert the RDS database to a Single-AZ deployment",
      "Reduce the Auto Scaling group to a single instance in one AZ",
      "Put Amazon CloudFront in front of the ALB to cache static assets, and add S3 and DynamoDB gateway endpoints for the private subnets",
      "Run the database on Spot Instances"
    ],
    answer: [2],
    explanation: "Every cost question also enforces the requirements it states. **CloudFront** cuts origin egress and lets the web tier shrink, and **gateway endpoints** remove NAT processing charges. Neither reduces Multi-AZ resilience, while each of the other options breaks the **survive an AZ** requirement.",
    optionExplanations: [
      "Wrong. Single-AZ RDS fails the AZ-loss requirement.",
      "Wrong. One instance in one AZ is a single point of failure.",
      "Correct. These changes lower egress and NAT costs while keeping the Multi-AZ design.",
      "Wrong. A database cannot tolerate Spot interruptions, and RDS does not run on Spot."
    ],
    tags: ["cloudfront", "gateway-endpoint", "rds-multi-az", "auto-scaling"]
  },
  {
    id: "cost-b-028",
    domain: "cost",
    lessonIds: ["m4-ref-cost", "m4-cost-compute"],
    difficulty: 3,
    stem: "A stateless web tier needs a steady baseline of 4 instances 24/7 and scales to 20 instances during unpredictable daily peaks. The company wants the lowest compute cost, and the baseline must never be interrupted. Which TWO choices should the solutions architect combine? (Choose TWO.)",
    options: [
      "Buy Standard Reserved Instances for 20 instances",
      "Run all 20 instances, including the baseline, on Spot Instances",
      "Cover the 4-instance On-Demand baseline with a Compute Savings Plan",
      "Use Dedicated Hosts for the scale-out capacity",
      "Use an Auto Scaling group with a mixed instances policy that launches scale-out capacity on Spot across several instance types"
    ],
    answer: [2, 4],
    explanation: "Commit only to the **steady baseline** with a Savings Plan, and buy the **interruptible peaks** on Spot, diversified across instance types so that capacity stays available. A stateless tier tolerates losing Spot instances at the margin, while the baseline stays On-Demand at the discounted rate.",
    optionExplanations: [
      "Wrong. Reserving 20 instances means paying for 16 idle reservations most of the day.",
      "Wrong. Putting the baseline on Spot breaks the never-interrupted requirement.",
      "Correct. A Savings Plan discounts the 24/7 baseline by up to 66% (Compute) and still lets you change instance families.",
      "Wrong. Dedicated Hosts are the most expensive option and are for licensing or compliance needs.",
      "Correct. Spot across several instance types gives up to 90% off for the burst capacity and reduces the chance of interruptions."
    ],
    tags: ["savings-plans", "ec2-spot", "auto-scaling", "reserved-instances"]
  },
  {
    id: "cost-b-029",
    domain: "cost",
    lessonIds: ["m4-cost-compute", "m4-ref-cost"],
    difficulty: 2,
    stem: "An internal expense-approval API runs on two m5.large EC2 instances behind an ALB, 24/7. Traffic is near zero overnight and on weekends, with short bursts of a few hundred requests at month-end, and each request finishes in under a second. Which architecture is the MOST cost-effective?",
    options: [
      "Buy a 3-year Reserved Instance for both instances",
      "Move the instances to a larger instance type and stop one of them",
      "Run the API on Amazon ECS on EC2 with a cluster that runs 24/7",
      "Rebuild the API on Amazon API Gateway and AWS Lambda"
    ],
    answer: [3],
    explanation: "**Spiky, mostly idle traffic with short requests** is the classic serverless case. Lambda and API Gateway bill per request and per millisecond of compute, so idle nights cost nothing, while the EC2 fleet and ALB bill every hour whether or not anyone is using them.",
    optionExplanations: [
      "Wrong. A reservation discounts capacity that sits idle most of the time; you still pay for every hour.",
      "Wrong. A single instance removes high availability and still bills while idle.",
      "Wrong. An always-on ECS cluster on EC2 still pays for idle instances.",
      "Correct. Pay-per-request pricing scales to zero between bursts and needs no servers to manage."
    ],
    tags: ["lambda", "api-gateway", "ec2", "alb"]
  },
  {
    id: "cost-b-030",
    domain: "cost",
    lessonIds: ["m4-cost-compute"],
    difficulty: 3,
    stem: "A payments service handles a constant 4,000 requests per second, 24 hours a day, with very little variation, and each request takes about 200 ms of CPU work. The service must keep p99 latency low, and the team is comfortable running containers. A consultant suggests moving it to AWS Lambda because serverless is always cheaper. Which option is the MOST cost-effective?",
    options: [
      "Run the service on Amazon ECS with a right-sized, steady fleet covered by a Compute Savings Plan",
      "Move the service to AWS Lambda with provisioned concurrency sized for the peak",
      "Move the service to AWS Lambda with on-demand concurrency",
      "Run the service on On-Demand EC2 instances that are 4x larger than needed for headroom"
    ],
    answer: [0],
    explanation: "Serverless wins for **variable** load and **commitments win for steady load**. At a constant 4,000 requests per second, Lambda's per-request and per-GB-second charges add up to far more than a busy, right-sized container fleet. A Compute Savings Plan discounts Fargate or EC2 usage for the steady baseline.",
    optionExplanations: [
      "Correct. A steady, well-used fleet with a commitment discount is the cheapest way to run constant load.",
      "Wrong. Provisioned concurrency bills 24/7 on top of per-request charges and costs more than containers at this level of utilization.",
      "Wrong. On-demand Lambda at a constant high rate costs more, and cold starts can hurt p99 latency.",
      "Wrong. Over-provisioning 4x On-Demand capacity pays for idle headroom at full price."
    ],
    tags: ["ecs", "fargate", "lambda", "savings-plans"]
  },
  {
    id: "cost-b-031",
    domain: "cost",
    lessonIds: ["m4-cost-storage-db"],
    difficulty: 2,
    stem: "A product catalog runs on Amazon RDS for MySQL. About 90% of database load comes from the same few thousand product-detail queries, and the data changes only a few times per hour. The team plans to move to an instance class four times larger to handle traffic growth. Which solution is the MOST cost-effective?",
    options: [
      "Upgrade to the larger instance class as planned",
      "Add an Amazon ElastiCache cluster and cache product-detail query results with a TTL of a few minutes",
      "Convert the database to Multi-AZ to double its read capacity",
      "Increase the provisioned IOPS on the storage volume"
    ],
    answer: [1],
    explanation: "**Repeated reads of data that changes rarely** is a caching problem. A small ElastiCache cluster answers most reads in under a millisecond, so the existing database instance can stay its current size, or even shrink, instead of growing 4x.",
    optionExplanations: [
      "Wrong. Scaling up quadruples the instance cost to serve reads that could be cached.",
      "Correct. Caching the hot queries offloads most of the read load for a fraction of the cost of a larger instance.",
      "Wrong. The standby in a standard Multi-AZ deployment does not serve reads, and Multi-AZ doubles the cost.",
      "Wrong. The bottleneck is repeated queries, not storage IOPS, and provisioned IOPS are expensive."
    ],
    tags: ["elasticache", "rds"]
  },
  {
    id: "cost-b-032",
    domain: "cost",
    lessonIds: ["m4-cost-storage-db"],
    difficulty: 3,
    stem: "A gaming leaderboard on Amazon DynamoDB in provisioned capacity mode reads the same hot items thousands of times per second. Read capacity has been raised several times and is now the main DynamoDB cost. The product team also wants read latency in microseconds, and the application already uses the DynamoDB SDK. Which solution meets the latency goal at the LOWEST cost?",
    options: [
      "Switch the table to on-demand capacity mode",
      "Add a global secondary index on the leaderboard attribute",
      "Put a DynamoDB Accelerator (DAX) cluster in front of the table and lower the provisioned read capacity",
      "Enable DynamoDB global tables in a second Region"
    ],
    answer: [2],
    explanation: "**Microsecond reads of hot items** is the signal for **DAX**. It is an API-compatible, in-memory cache, so the code change is small, and the cache hits no longer consume read capacity units. That means the provisioned RCUs can be cut sharply, and the savings usually exceed the cost of the DAX nodes.",
    optionExplanations: [
      "Wrong. On-demand still charges for every read and does not deliver microsecond latency.",
      "Wrong. A GSI adds write and storage costs and does not reduce repeated reads of the same items.",
      "Correct. DAX serves hot reads from memory in microseconds and removes most of the RCU spend.",
      "Wrong. Global tables add replicated writes and storage costs and do not speed up local reads."
    ],
    tags: ["dax", "dynamodb"]
  },
  {
    id: "cost-b-033",
    domain: "cost",
    lessonIds: ["m4-cost-compute", "m4-ref-cost"],
    difficulty: 2,
    stem: "An order-processing service calls a fleet of 12 large EC2 instances synchronously. The fleet is sized for a 10-minute flash-sale peak and sits at 8% CPU the rest of the time. Orders may be processed up to a few minutes after they are placed, but none can be lost. What is the MOST cost-effective redesign?",
    options: [
      "Buy a 1-year Savings Plan for all 12 instances",
      "Replace the fleet with a single larger instance",
      "Add a second Region with another 12 instances for overflow",
      "Put an Amazon SQS queue between the front end and the workers, and scale a smaller worker Auto Scaling group on queue backlog per instance"
    ],
    answer: [3],
    explanation: "**Processing can be delayed but no order can be lost** points to **decoupling with SQS**. The queue absorbs the flash-sale burst durably, so the workers can be sized for average load and scale on backlog instead of being provisioned for the peak around the clock.",
    optionExplanations: [
      "Wrong. A commitment discounts capacity that is 92% idle; it reduces the price but does not remove the waste.",
      "Wrong. One instance is a single point of failure and still has to be sized for the peak.",
      "Wrong. This doubles the idle capacity and the cost.",
      "Correct. A durable queue plus backlog-based scaling lets the fleet shrink without losing orders."
    ],
    tags: ["sqs", "auto-scaling", "ec2"]
  },
  {
    id: "cost-b-034",
    domain: "cost",
    lessonIds: ["m2-dr-strategies", "m4-ref-cost"],
    difficulty: 2,
    stem: "A company needs disaster recovery in a second Region for an internal reporting application. The business accepts an RPO of 24 hours and an RTO of 48 hours, and the DR budget is minimal. Which DR strategy should the solutions architect choose?",
    options: [
      "Backup and restore: copy daily AWS Backup recovery points to the DR Region and rebuild the stack with infrastructure as code when needed",
      "Pilot light: run a continuously replicated database in the DR Region with no app servers",
      "Warm standby: run a scaled-down full copy of the stack in the DR Region",
      "Multi-site active/active across both Regions"
    ],
    answer: [0],
    explanation: "**RPO and RTO measured in hours or days with a minimal budget** points to **backup and restore**, the cheapest DR tier. In the DR Region you pay only for the stored backup copies, and nothing runs until a disaster is declared.",
    optionExplanations: [
      "Correct. Daily cross-Region backups meet a 24-hour RPO, and an IaC rebuild easily fits a 48-hour RTO.",
      "Wrong. Pilot light pays for a database that runs all the time, to meet tighter targets than this application needs.",
      "Wrong. Warm standby runs a full scaled-down stack 24/7, which is far more than the budget allows.",
      "Wrong. Active/active is the most expensive tier and is meant for near-zero RTO and RPO."
    ],
    tags: ["backup", "cloudformation"]
  },
  {
    id: "cost-b-035",
    domain: "cost",
    lessonIds: ["m2-dr-strategies"],
    difficulty: 3,
    stem: "An e-commerce company runs on Amazon Aurora MySQL with an EC2 Auto Scaling web tier. The company requires an RPO of under 1 minute and an RTO of under 30 minutes for a Regional outage, and it wants the LOWEST cost that meets those targets. What should the solutions architect recommend?",
    options: [
      "Take Aurora snapshots every hour and copy them to the DR Region",
      "Pilot light: Aurora Global Database with a secondary cluster in the DR Region, and AMIs, launch templates, and an Auto Scaling group set to zero instances, ready to scale out at failover",
      "Warm standby: a full secondary stack that serves a share of production traffic through Route 53 weighted routing",
      "Multi-site active/active with Aurora Global Database write forwarding in both Regions"
    ],
    answer: [1],
    explanation: "An **RPO under 1 minute** needs continuous replication, which Aurora Global Database provides with typical lag under 1 second. An **RTO of about 30 minutes** leaves time to scale the app tier up from zero. That is **pilot light**: only the data layer runs in the DR Region, so it is the cheapest tier that meets both targets.",
    optionExplanations: [
      "Wrong. Hourly snapshots give an RPO of up to an hour, which misses the 1-minute target.",
      "Correct. A replicated database plus app capacity that can scale from zero meets both targets for the least money.",
      "Wrong. Warm standby meets the targets but pays for a running app fleet that this RTO does not require.",
      "Wrong. Active/active meets the targets at the highest cost, which is more than they require."
    ],
    tags: ["aurora-global-database", "auto-scaling", "launch-template", "route53"]
  },
  {
    id: "cost-b-036",
    domain: "cost",
    lessonIds: ["m4-cost-storage-db", "m4-billing-model"],
    difficulty: 2,
    stem: "Application logs go to Amazon CloudWatch Logs, and their log groups were created with the default retention setting. Storage charges for the logs are rising every month. Engineers search the last 30 days of logs often, and compliance requires keeping logs for 1 year, but logs older than 30 days are almost never read. Which solution is the MOST cost-effective?",
    options: [
      "Keep the default retention and delete old log streams by hand each quarter",
      "Increase retention to 10 years so that compliance is always covered",
      "Set log group retention to 30 days, and stream the logs to S3 through an Amazon Data Firehose subscription filter with an S3 Lifecycle rule that moves them to Glacier Flexible Retrieval and expires them after 1 year",
      "Move the logs into Amazon OpenSearch Service and keep them there for 1 year"
    ],
    answer: [2],
    explanation: "The default CloudWatch Logs retention is **Never expire**, so storage grows forever. A **30-day retention** keeps logs searchable while they are useful, and archiving to **S3 with Lifecycle rules** stores the 1-year compliance copy far more cheaply than CloudWatch Logs storage, then deletes it automatically.",
    optionExplanations: [
      "Wrong. Manual deletion is error-prone, and storage keeps growing between cleanups.",
      "Wrong. Ten years of retention keeps paying for storage the business does not need.",
      "Correct. Tiered retention meets both the search need and the compliance requirement at the lowest storage cost.",
      "Wrong. An OpenSearch cluster bills for nodes and storage 24/7, which makes it far more expensive than S3 for rarely read logs."
    ],
    tags: ["cloudwatch-logs", "data-firehose", "s3", "s3-glacier"]
  },
  {
    id: "cost-b-037",
    domain: "cost",
    lessonIds: ["m3b-analytics", "m4-cost-storage-db"],
    difficulty: 3,
    stem: "Analysts run Amazon Athena queries against 80 TB of clickstream data that lands in S3 as uncompressed CSV. Almost every query filters on a single day and selects 4 of the 60 columns, yet each query scans the whole dataset, and the Athena bill is high. Which TWO changes will reduce cost the MOST? (Choose TWO.)",
    options: [
      "Convert the data to compressed Apache Parquet with an AWS Glue ETL job",
      "Load the data into a provisioned Amazon Redshift cluster that runs 24/7",
      "Enable S3 Transfer Acceleration on the bucket",
      "Store the objects in S3 Glacier Deep Archive",
      "Partition the data by date (for example `dt=2026-10-30/`) and filter on the partition column in queries"
    ],
    answer: [0, 4],
    explanation: "Athena bills about **$5 per TB scanned**. **Columnar Parquet** lets a query read only the 4 columns it needs and compresses well, and **date partitions** let Athena skip every day that the WHERE clause excludes. Together they often cut the bytes scanned by more than 99%.",
    optionExplanations: [
      "Correct. Columnar, compressed storage greatly reduces the bytes read per query.",
      "Wrong. An always-on cluster adds hourly cost for ad hoc queries that Athena can handle cheaply once the data is optimized.",
      "Wrong. Transfer Acceleration speeds up uploads; it does not change how much data Athena scans.",
      "Wrong. Athena cannot query Deep Archive objects without restoring them first, so this breaks the analytics workload.",
      "Correct. Partition pruning means a one-day query scans only one day of data."
    ],
    tags: ["athena", "glue", "s3"]
  },
  {
    id: "cost-b-038",
    domain: "cost",
    lessonIds: ["m4-cost-storage-db"],
    difficulty: 1,
    stem: "A developer creates a new Amazon CloudWatch Logs log group without changing any settings. What is the default retention period for its log events?",
    options: [
      "7 days",
      "30 days",
      "1 year",
      "Never expire: logs are kept indefinitely until retention is set"
    ],
    answer: [3],
    explanation: "New log groups default to **Never expire**, which is why log storage costs quietly grow. Setting a retention period (from 1 day to 10 years) on each log group is a basic cost-control step.",
    optionExplanations: [
      "Wrong. 7 days is one of the options you can choose, but it is not the default.",
      "Wrong. 30 days is a common choice, but it is not the default.",
      "Wrong. 1 year is not the default.",
      "Correct. With no retention set, log events are kept forever and billed for storage."
    ],
    tags: ["cloudwatch-logs"]
  },
  {
    id: "cost-b-039",
    domain: "cost",
    lessonIds: ["m1-private-connectivity", "m4-data-transfer"],
    difficulty: 3,
    stem: "A company connects its data center to a VPC over AWS Direct Connect with a private virtual interface. On-premises servers must upload large files to Amazon S3 privately, without using the public internet or a public virtual interface. EC2 instances in the VPC also use the same bucket. Which solution meets the requirement at the LOWEST cost?",
    options: [
      "Create an S3 interface endpoint for the on-premises traffic, and use an S3 gateway endpoint for the in-VPC EC2 traffic",
      "Create only an S3 gateway endpoint and point the on-premises servers at it",
      "Route on-premises traffic through a NAT gateway in the VPC to reach S3",
      "Deploy a proxy fleet of EC2 instances in the VPC that forwards uploads to S3"
    ],
    answer: [0],
    explanation: "The cheapest option, a **gateway endpoint**, cannot be reached from **on premises** over Direct Connect, VPN, or peering. An **S3 interface endpoint** has private IPs that are reachable over the private VIF, while the free gateway endpoint still serves the in-VPC instances. Each traffic source uses the cheapest path that works for it.",
    optionExplanations: [
      "Correct. The interface endpoint serves on-premises clients privately, and the free gateway endpoint handles VPC traffic.",
      "Wrong. Gateway endpoints are route-table targets that only work for traffic that starts inside the VPC.",
      "Wrong. NAT sends traffic toward the public internet and adds per-GB processing charges.",
      "Wrong. A proxy fleet adds EC2 cost and operational overhead for something PrivateLink already provides."
    ],
    tags: ["interface-endpoint", "gateway-endpoint", "direct-connect", "s3"]
  },
  {
    id: "cost-b-040",
    domain: "cost",
    lessonIds: ["m4-data-transfer"],
    difficulty: 2,
    stem: "A nightly analytics job runs on EC2 in us-east-1 and reads 6 TB per day from an S3 bucket in eu-west-1. The bucket's data has no residency restriction, and the job's results are used only in us-east-1. The bill shows large inter-Region data transfer charges. What is the MOST cost-effective change?",
    options: [
      "Put CloudFront in front of the eu-west-1 bucket for the job's reads",
      "Run the analytics job in eu-west-1, next to the data, and send only the small result set to us-east-1",
      "Add an S3 gateway endpoint in the us-east-1 VPC",
      "Enable S3 Transfer Acceleration on the bucket"
    ],
    answer: [1],
    explanation: "Inter-Region transfer is billed per GB, so **move compute to the data** and send only the small output across. A gateway endpoint works only for buckets in the **same Region**, so it cannot remove this charge.",
    optionExplanations: [
      "Wrong. CloudFront is meant for serving users at the edge; it adds cost and does not help a single batch reader.",
      "Correct. Processing in the data's Region removes 6 TB per day of inter-Region transfer.",
      "Wrong. Gateway endpoints only reach S3 in the VPC's own Region.",
      "Wrong. Transfer Acceleration adds a fee on top of normal transfer charges."
    ],
    tags: ["s3", "ec2", "gateway-endpoint"]
  },
  {
    id: "cost-b-041",
    domain: "cost",
    lessonIds: ["m3b-cloudfront", "m4-data-transfer"],
    difficulty: 1,
    stem: "Why does putting Amazon CloudFront in front of an S3 bucket usually reduce data transfer cost for content delivered to internet users?",
    options: [
      "CloudFront compresses every object to half its size",
      "CloudFront makes S3 storage cheaper",
      "Data transfer from an S3 origin to CloudFront is free, and CloudFront's egress rates are generally lower than S3's direct internet rates",
      "CloudFront removes all data transfer charges for cached objects"
    ],
    answer: [2],
    explanation: "**Origin fetches from AWS origins to CloudFront are free**. You pay CloudFront's egress, which is usually lower per GB than S3's direct internet egress, and caching means the origin is hit far less often.",
    optionExplanations: [
      "Wrong. Compression is optional and applies only to compressible content types.",
      "Wrong. S3 storage pricing does not change.",
      "Correct. A free origin fetch combined with a cheaper edge egress rate lowers the per-GB cost.",
      "Wrong. You still pay CloudFront's data transfer out and request fees for cached objects."
    ],
    tags: ["cloudfront", "s3"]
  },
  {
    id: "cost-b-042",
    domain: "cost",
    lessonIds: ["m4-cost-tools", "m4-billing-model"],
    difficulty: 2,
    stem: "A company bought a 3-year Compute Savings Plan last year. Finance wants an email if the plan's utilization falls below 90% in any month, so that idle commitment is found quickly. Which solution meets this requirement with the LEAST operational overhead?",
    options: [
      "Check the Savings Plans utilization report in Cost Explorer every week",
      "Write a Lambda function that parses the Cost and Usage Report every day",
      "Create a CloudWatch alarm on EC2 CPU utilization below 90%",
      "Create an AWS Budgets Savings Plans utilization budget with a 90% threshold and an email alert"
    ],
    answer: [3],
    explanation: "AWS Budgets supports **RI and Savings Plans utilization and coverage budgets** that alert automatically when a threshold is crossed. The phrase **verify commitment usage with an alert** points to this built-in, no-code option.",
    optionExplanations: [
      "Wrong. The report shows the data, but someone has to check it manually.",
      "Wrong. Custom code adds operational overhead that a native feature already removes.",
      "Wrong. Instance CPU says nothing about how much of the commitment is used.",
      "Correct. A utilization budget sends the alert automatically, with no code."
    ],
    tags: ["budgets", "savings-plans", "cost-explorer"]
  },
] satisfies Question[];
