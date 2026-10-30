import type { Lesson } from '../types';

export default [
  // ------------------------------------------------------------------ 1
  {
    id: "m1-cloud-fundamentals",
    module: "m1",
    domain: "foundations",
    title: "Why Cloud & the AWS Global Infrastructure",
    minutes: 15,
    summary: "Explain why companies move to the cloud and describe Regions, Availability Zones and edge locations well enough to pick the right failure boundary for any exam scenario.",
    analogy: {
      title: "Renting electricity instead of building a power plant",
      body: "A century ago, factories built their own power plants. Today they plug into the grid and pay for the kilowatt-hours they use. Cloud computing does the same for servers: instead of buying machines, you rent capacity by the second and hand it back when you are done.\n\nThe AWS map works like a utility company's map. A **Region** is a city the utility serves. Inside each city there are several **Availability Zones**: separate power stations on different sites, each with its own generators, so a fire at one station does not black out the city. **Edge locations** are small neighbourhood kiosks that hand out copies of popular items so people don't have to travel downtown."
    },
    sections: [
      {
        heading: "The problem cloud solves",
        body: "Before cloud, running an application meant buying servers, racking them in a data center, and waiting weeks for new hardware. Because buying takes so long, you sized for the worst day of the year. A retailer that needs 40 servers on Black Friday but 8 the rest of the year owns 40 all year, and 32 of them sit idle about 95% of the time. That money is a **capital expense (CapEx)**: paid up front, before you know whether the product succeeds.\n\nCloud turns this into an **operating expense (OpEx)**: you pay per second or per GB for what actually runs. The exam assumes three wins:\n\n- **Elasticity**: capacity grows and shrinks automatically with demand (Auto Scaling adds instances at 9 a.m. and removes them at night). Scalability is the ability to grow; elasticity is growing AND shrinking on its own.\n- **Managed services**: AWS runs the 'undifferentiated heavy lifting' (patching, replication, hardware replacement) so you operate less. RDS patches the database engine; S3 replicates your objects for you.\n- **Global reach**: deploy near users in minutes without building a data center in each country.\n\nAWS markets these as the 'six advantages of cloud': trade fixed expense for variable expense, benefit from massive economies of scale, stop guessing capacity, increase speed and agility, stop spending money running data centers, and go global in minutes."
      },
      {
        heading: "Service models: how much do you run?",
        beyond: true,
        body: "Cloud services sit on a spectrum of how much AWS manages for you. The further right you go, the less you patch and the less you can customize. Exam questions that say **least operational overhead** almost always want the most managed option that still meets the requirements.",
        table: {
          headers: ["Model", "You manage", "AWS manages", "AWS examples"],
          rows: [
            ["IaaS (infrastructure)", "OS, runtime, app, data, scaling config", "Hardware, hypervisor, network fabric", "EC2, EBS, VPC"],
            ["PaaS (platform)", "Application code and data", "OS, runtime, patching, capacity", "Elastic Beanstalk, RDS, App Runner"],
            ["Serverless / function", "Function code, permissions, data", "Everything else, including scaling to zero", "Lambda, Fargate, DynamoDB, S3"],
            ["SaaS (software)", "Your users and data in the app", "The entire application", "Amazon WorkMail, QuickSight"]
          ]
        }
      },
      {
        heading: "Regions: isolated geographic areas",
        body: "A **Region** is a physical geographic area such as `us-east-1` (N. Virginia) or `eu-west-2` (London). AWS operates more than 30 of them. Regions are **fully isolated** from each other: separate power, separate networks, separate control planes for most services, so an outage in one does not affect another.\n\nMost services are **Regional**: your S3 bucket, VPC, RDS database and Lambda function each live in exactly one Region, and data does not leave that Region unless you copy it. That matters for data-residency laws such as GDPR. A few services are **global**, meaning one configuration applies everywhere.",
        table: {
          headers: ["Scope", "Services", "What it means for you"],
          rows: [
            ["Global", "IAM, Route 53, CloudFront, Organizations, WAF for CloudFront", "Create once; works in every Region"],
            ["Regional", "S3 buckets, VPC, Lambda, DynamoDB, KMS keys, SQS", "Pick a Region; replicate yourself for multi-Region"],
            ["Zonal (per AZ)", "EC2 instance, EBS volume, subnet, NAT gateway", "Lives in one AZ; fails with that AZ"]
          ]
        }
      },
      {
        heading: "Choosing a Region",
        beyond: true,
        body: "When an exam scenario asks where to deploy, weigh four factors in roughly this order:\n\n- **Compliance and data residency**: if the law says customer data must stay in Germany, only `eu-central-1` (Frankfurt) qualifies. This overrides everything else.\n- **Latency to users**: put the workload close to where most users are. A London user hitting `ap-southeast-2` (Sydney) adds roughly 250 ms per round trip.\n- **Service availability**: new services and instance types launch in a few Regions first. Check that every service you need exists there.\n- **Price**: the same instance can cost 10 to 30% more in some Regions (São Paulo is notably expensive; `us-east-1` is usually cheapest)."
      },
      {
        heading: "Availability Zones: the unit of high availability",
        body: "An **Availability Zone (AZ)** is one or more physically separate data centers inside a Region, each with independent power, cooling and networking. AZs are connected by redundant, high-bandwidth private fiber with single-digit millisecond latency, and AWS places them within about 100 km (60 miles) of each other. That distance is far enough that a flood or fire takes out only one, and close enough that **synchronous replication** (writing to two places before confirming) is practical. RDS Multi-AZ relies on exactly this.\n\nEvery Region has **at least 3 AZs** (`us-east-1` has 6). AZ names like `us-east-1a` are shuffled per account, so your 'a' may be another customer's 'c'. To coordinate across accounts, use the **AZ ID** (for example `use1-az1`), which is the same for everyone.\n\nThe core design rule: individual machines and whole data centers WILL fail. You get **high availability** by spreading resources across multiple AZs, and **disaster recovery** by using a second Region."
      },
      {
        heading: "Edge locations and extended infrastructure",
        body: "**Edge locations** are hundreds of small sites (600+) in cities worldwide. They do not run your EC2 instances; they run CloudFront (content caching), Route 53 (DNS answers) and Global Accelerator (anycast entry points onto the AWS backbone), so users connect to something nearby. CloudFront also has **regional edge caches**, larger mid-tier caches between edge locations and your origin.\n\nFor workloads that need compute closer than a Region, AWS has three extensions:",
        table: {
          headers: ["Option", "What it is", "Pick it when the question says"],
          rows: [
            ["Local Zones", "AWS-run mini-Region extension in a metro area (e.g. Los Angeles)", "Single-digit ms latency to users in a specific city (gaming, media rendering)"],
            ["Wavelength", "AWS compute inside a telecom 5G network", "Ultra-low latency to mobile devices over 5G"],
            ["Outposts", "AWS-owned racks installed in YOUR data center", "Data must stay on premises, or low latency to on-prem systems, with the same AWS APIs"]
          ]
        },
        beyond: true
      },
      {
        heading: "Exam angle: match the failure to the boundary",
        body: "Almost every 'resilient' answer is some form of 'run it in more than one AZ'. Read the blast radius the question describes and pick the smallest boundary that survives it:\n\n- One instance crashes → Auto Scaling replaces it; a load balancer routes around it.\n- One AZ loses power → resources in at least two AZs (Multi-AZ RDS, ASG across subnets in 2-3 AZs).\n- A whole Region is unavailable, or the requirement says 'disaster recovery to another geographic area' → multi-Region (S3 Cross-Region Replication, Aurora Global Database, DynamoDB global tables).\n- Users worldwide complain about latency for static content → CloudFront at the edge, not more Regions.",
        table: {
          headers: ["Failure scope", "Minimum design", "Typical cost impact"],
          rows: [
            ["Single server", "2+ instances behind a load balancer", "Low"],
            ["Single AZ", "Multi-AZ deployment (2-3 AZs)", "Moderate (extra standby, cross-AZ data transfer)"],
            ["Entire Region", "Multi-Region DR (backup, pilot light, warm standby, active-active)", "High; scales with how fast you must recover"]
          ]
        }
      }
    ],
    diagram: {
      title: "Regions, AZs and the edge",
      groups: [
        { id: "r1", label: "Region us-east-1", kind: "region", x: 28, y: 3, w: 44, h: 54 },
        { id: "aza", label: "AZ a", kind: "az", x: 31, y: 7, w: 38, h: 14 },
        { id: "azb", label: "AZ b", kind: "az", x: 31, y: 23, w: 38, h: 14 },
        { id: "azc", label: "AZ c", kind: "az", x: 31, y: 39, w: 38, h: 14 },
        { id: "r2", label: "Region us-west-2", kind: "region", x: 76, y: 18, w: 21, h: 24 }
      ],
      nodes: [
        { id: "user", label: "User", icon: "user", x: 6, y: 30, sub: "London" },
        { id: "edge", label: "Edge location", icon: "cloudfront", x: 18, y: 30, sub: "CloudFront PoP" },
        { id: "ec2a", label: "App server", icon: "ec2", x: 50, y: 14, sub: "us-east-1a" },
        { id: "ec2b", label: "App server", icon: "ec2", x: 50, y: 30, sub: "us-east-1b" },
        { id: "ec2c", label: "App server", icon: "ec2", x: 50, y: 46, sub: "us-east-1c" },
        { id: "dr", label: "DR copy", icon: "s3", x: 86, y: 30, sub: "second Region" }
      ],
      edges: [
        { id: "e-user", from: "user", to: "edge", label: "nearby" },
        { id: "e-a", from: "edge", to: "ec2a" },
        { id: "e-b", from: "edge", to: "ec2b" },
        { id: "e-c", from: "edge", to: "ec2c" },
        { id: "e-dr", from: "ec2b", to: "dr", label: "async copy", dashed: true }
      ],
      steps: [
        { caption: "A user connects to the nearest edge location. Cached content is served from there without ever reaching the Region.", highlight: ["user", "edge", "e-user"], flow: [{ edge: "e-user" }] },
        { caption: "Uncached requests travel over the AWS backbone to the Region, which contains at least three isolated Availability Zones.", highlight: ["r1", "aza", "azb", "azc"], flow: [{ edge: "e-a" }, { edge: "e-b" }, { edge: "e-c" }] },
        { caption: "The application runs in all three AZs. Each AZ has its own power, cooling and network, a few milliseconds apart.", highlight: ["ec2a", "ec2b", "ec2c"] },
        { caption: "AZ a loses power. Its server is gone, but traffic keeps flowing to AZs b and c: this is high availability.", highlight: ["azb", "azc"], fail: ["aza", "ec2a", "e-a"], flow: [{ edge: "e-b" }, { edge: "e-c" }] },
        { caption: "For disaster recovery, data is copied asynchronously to a second, fully isolated Region.", highlight: ["r2", "dr", "e-dr"], flow: [{ edge: "e-dr" }] },
        { caption: "If the whole Region fails, the copy in us-west-2 survives. HA = multi-AZ; DR = multi-Region.", highlight: ["r2", "dr"], fail: ["r1"] }
      ]
    },
    keyFacts: [
      "Every Region has at least 3 AZs; us-east-1 has 6.",
      "AZs are physically separate (within ~100 km) with single-digit ms latency, enough for synchronous replication.",
      "Regions are fully isolated: an outage in one does not affect another.",
      "Global services: IAM, Route 53, CloudFront, Organizations. Most others are Regional.",
      "Subnets, EC2 instances, EBS volumes and NAT gateways are zonal: they live in one AZ.",
      "Edge locations (600+) run CloudFront, Route 53 and Global Accelerator, not your EC2 instances.",
      "AZ names (us-east-1a) are shuffled per account; AZ IDs (use1-az1) are consistent across accounts.",
      "Region choice order: compliance first, then latency, service availability, then price."
    ],
    examTips: [
      "'Highly available' or 'survive the failure of a data center' → spread across multiple AZs.",
      "'Disaster recovery to another geographic location' or 'Region-wide outage' → multi-Region.",
      "'Data must remain in country X' → choose the Region in that country; compliance beats latency and cost.",
      "'Low latency for users in a specific metro area' → Local Zones; '5G mobile devices' → Wavelength; 'must stay in our data center' → Outposts.",
      "'Global users, static content slow' → CloudFront edge caching, not more Regions.",
      "'Least operational overhead' → pick the most managed or serverless service that meets requirements."
    ],
    pitfalls: [
      "Thinking a Region is a single data center. It is a cluster of 3+ isolated AZs.",
      "Assuming us-east-1a in your account is the same physical AZ as us-east-1a in a partner's account. Use AZ IDs.",
      "Choosing multi-Region when the requirement only says 'highly available'. Multi-AZ is cheaper and sufficient.",
      "Believing edge locations can host EC2 workloads. Use Local Zones or Wavelength for compute near users.",
      "Forgetting that IAM is global: you don't create users per Region."
    ],
    prosCons: [
      {
        option: "Single AZ",
        pros: ["Cheapest", "No cross-AZ data transfer charges", "Simplest to operate"],
        cons: ["One data-center failure takes the whole workload down"],
        useWhen: "Dev/test, batch jobs that can be re-run, or the question explicitly prioritises cost over availability."
      },
      {
        option: "Multi-AZ (one Region)",
        pros: ["Survives an AZ failure", "Synchronous replication possible", "Standard production answer"],
        cons: ["More instances or standbys to pay for", "Cross-AZ transfer costs (~$0.01/GB each way)"],
        useWhen: "Any production workload that must be highly available."
      },
      {
        option: "Multi-Region",
        pros: ["Survives a Region-wide event", "Can serve global users with lower latency"],
        cons: ["Highest cost", "Replication is asynchronous, so some data loss (RPO > 0) is possible", "Much more complex"],
        useWhen: "Explicit DR, regulatory or global-latency requirements."
      }
    ],
    services: ["ec2", "cloudfront", "route53", "global-accelerator", "local-zones", "wavelength", "outposts", "s3"]
  },

  // ------------------------------------------------------------------ 2
  {
    id: "m1-shared-responsibility",
    module: "m1",
    domain: "foundations",
    title: "The Shared Responsibility Model",
    minutes: 12,
    summary: "Classify any security task as AWS's job or yours, and predict how that line moves between EC2, RDS, Lambda and S3.",
    analogy: {
      title: "Renting an apartment, a serviced flat, or a hotel room",
      body: "If you rent an unfurnished apartment, the landlord keeps the building standing, the roof sealed and the front door of the building locked. You buy your own furniture, lock your own door, and decide who gets a key. That is **EC2**: AWS secures the building, you look after everything inside your unit, including fixing the plumbing (the operating system).\n\nIn a serviced flat, the landlord also fixes appliances and cleans weekly. That is **RDS**: AWS patches the database software, you still decide who gets in. In a hotel room, almost everything is handled for you; you just keep your valuables locked up. That is **Lambda or S3**: you only manage your code, your data and who has access. In every case, if you leave the door open, it is your fault, not the landlord's."
    },
    sections: [
      {
        heading: "The problem: who is accountable for what?",
        body: "When you move to the cloud, some security work moves to AWS and some stays with you. Auditors, and the exam, need a precise answer for every control. AWS states it as two phrases:\n\n- **AWS is responsible for security OF the cloud**: the physical data centers (guards, cameras, badge readers), the hardware, the global network, the **hypervisor** (the software that splits one physical server into many virtual machines), and the software that runs managed services.\n- **You are responsible for security IN the cloud**: your data, who can access it (IAM), your network rules (security groups, NACLs), your encryption choices, and anything you install or configure, including the guest operating system on EC2.\n\nA simple test: if you can configure it in the console or API, it is probably yours. If you could only touch it by walking into an AWS building, it is AWS's."
      },
      {
        heading: "How the line moves with the service model",
        body: "The more managed the service, the more AWS takes on. The things you **always** own, no matter the service: your data, IAM permissions, and the decision to encrypt.",
        table: {
          headers: ["Task", "EC2 (IaaS)", "RDS (managed)", "Lambda / S3 / DynamoDB"],
          rows: [
            ["Physical security, hardware, hypervisor", "AWS", "AWS", "AWS"],
            ["Guest OS patching", "You", "AWS", "AWS (no OS visible)"],
            ["Database engine patching", "You (if self-installed)", "AWS (in your maintenance window)", "AWS"],
            ["Network rules (SGs, NACLs)", "You", "You (DB security group)", "You (VPC config if attached; bucket policies)"],
            ["IAM users, roles, policies", "You", "You", "You"],
            ["Encryption at rest enabled + key choice", "You (EBS)", "You (at creation)", "You (S3 default SSE-S3 exists, key choice is yours)"],
            ["Data, backups retention, classification", "You", "You", "You"],
            ["High availability design", "You (multi-AZ ASG)", "You tick Multi-AZ; AWS runs failover", "AWS (built-in multi-AZ)"]
          ]
        }
      },
      {
        heading: "Shared, inherited and customer-specific controls",
        beyond: true,
        body: "Compliance frameworks (PCI DSS, HIPAA, SOC 2) split controls three ways, and the exam occasionally uses these words:\n\n- **Inherited controls**: you inherit them fully from AWS. Physical and environmental controls (data-center access, fire suppression, power) are the classic example.\n- **Shared controls**: both sides do part of the work in their own layer. **Patch management** (AWS patches the infrastructure, you patch your guest OS and apps), **configuration management** (AWS configures its devices, you configure your OS, databases and apps) and **awareness and training** (AWS trains its staff, you train yours).\n- **Customer-specific controls**: only you can do them. Service and communications protection, or zone security that routes data within specific security environments.\n\nTo prove AWS's half to an auditor, download AWS's SOC reports, ISO certificates and PCI attestations from **AWS Artifact** (self-service, free). To collect evidence for your half, use **AWS Audit Manager**."
      },
      {
        heading: "Containers and the security tools AWS gives you",
        beyond: true,
        body: "Containers follow the same logic. With **ECS or EKS on EC2**, the worker nodes are EC2 instances, so you patch their OS and AMI. With **AWS Fargate**, AWS runs and patches the hosts; you own the container image (scan it with Amazon Inspector in ECR), the task role and the network rules.\n\nAWS also hands you tools for your side of the line, but switching them on and acting on the results is your job:\n\n- **CloudTrail** records API calls; you decide where logs go and who can read them.\n- **AWS Config** tracks configuration drift against rules you choose.\n- **GuardDuty** and **Security Hub** raise findings; you respond.\n- **Systems Manager Patch Manager** automates guest OS patching on EC2; you set the baselines and windows.\n\nA question that says 'AWS provides a feature for this' still puts the configuration responsibility on the customer.",
        table: {
          headers: ["Service", "Host OS / runtime", "Image or code", "Task/function permissions"],
          rows: [
            ["ECS/EKS on EC2", "Customer", "Customer", "Customer"],
            ["ECS/EKS on Fargate", "AWS", "Customer", "Customer"],
            ["Lambda", "AWS", "Customer (code + dependencies)", "Customer (execution role)"]
          ]
        }
      },
      {
        heading: "Worked classification examples",
        body: "Practice the reflex. For each statement, ask: 'could I change this from my keyboard?'\n\n- Shredding failed hard drives → AWS (physical media).\n- Rotating the access keys of an IAM user → customer.\n- Patching the Linux kernel on an EC2 instance → customer.\n- Patching the MySQL engine on RDS → AWS (you choose the maintenance window).\n- Protecting against a hypervisor escape between tenants → AWS.\n- Making sure an S3 bucket is not public → customer (Block Public Access is on by default for new buckets, but it is your setting).\n- Enabling encryption on a new EBS volume → customer.\n- Availability of the S3 service itself → AWS; designing your app to survive an AZ loss → customer.\n- Configuring the Lambda function's execution role → customer; patching the Lambda runtime OS → AWS."
      },
      {
        heading: "Exam angle",
        body: "Classification questions are usually easy points if you know the trigger words:\n\n- 'Physical', 'data center', 'hardware', 'hypervisor', 'global infrastructure' → AWS.\n- 'Configure', 'IAM', 'security group', 'encrypt', 'guest OS', 'customer data', 'firewall rules' → customer.\n- 'Patching' → depends on the service: EC2 guest OS = customer; RDS engine, Lambda runtime, Fargate host = AWS.\n\nThe model also explains 'least operational overhead' answers: moving from EC2 to a managed service shifts patching and availability work to AWS. If a question complains about the team spending time patching servers, the answer is usually a more managed service (RDS, Fargate, Lambda)."
      }
    ],
    diagram: {
      title: "Who secures which layer",
      groups: [
        { id: "cust", label: "Customer (IN)", kind: "generic", x: 3, y: 3, w: 94, h: 30 },
        { id: "aws", label: "AWS (OF the cloud)", kind: "cloud", x: 3, y: 37, w: 94, h: 20 }
      ],
      nodes: [
        { id: "dev", label: "Your team", icon: "users", x: 10, y: 18 },
        { id: "iam", label: "IAM policies", icon: "iam", x: 26, y: 12 },
        { id: "sg", label: "Security groups", icon: "security-group", x: 26, y: 26 },
        { id: "ec2", label: "EC2 guest OS", icon: "ec2", x: 46, y: 18, sub: "you patch" },
        { id: "kms", label: "Encryption choice", icon: "kms", x: 66, y: 12 },
        { id: "data", label: "Your data", icon: "s3", x: 86, y: 18 },
        { id: "rds", label: "RDS engine", icon: "rds", x: 46, y: 47, sub: "AWS patches" },
        { id: "lambda", label: "Lambda runtime", icon: "lambda", x: 66, y: 47, sub: "AWS patches" },
        { id: "host", label: "Hardware + DC", icon: "server", x: 20, y: 47, sub: "hypervisor" }
      ],
      edges: [
        { id: "e1", from: "dev", to: "iam", label: "configure" },
        { id: "e2", from: "dev", to: "sg" },
        { id: "e3", from: "iam", to: "ec2" },
        { id: "e4", from: "ec2", to: "kms" },
        { id: "e5", from: "kms", to: "data" },
        { id: "e6", from: "ec2", to: "host", label: "runs on", dashed: true },
        { id: "e7", from: "rds", to: "host", dashed: true },
        { id: "e8", from: "lambda", to: "host", dashed: true }
      ],
      steps: [
        { caption: "AWS owns the bottom layer: buildings, hardware, network and the hypervisor. You inherit these controls and cannot touch them.", highlight: ["aws", "host"] },
        { caption: "Your team owns everything you configure: IAM policies and security group rules are always yours.", highlight: ["dev", "iam", "sg", "e1", "e2"], flow: [{ edge: "e1" }, { edge: "e2" }] },
        { caption: "On EC2 the line sits high: you patch the guest operating system and everything above it.", highlight: ["ec2", "e3", "e6"], flow: [{ edge: "e3" }] },
        { caption: "On RDS and Lambda the line drops: AWS patches the database engine and the function runtime.", highlight: ["rds", "lambda", "e7", "e8"] },
        { caption: "Whatever the service, the data and the choice to encrypt it (and with which key) stay with you.", highlight: ["kms", "data", "e4", "e5"], flow: [{ edge: "e4" }, { edge: "e5" }] },
        { caption: "Leave a bucket public or an SG open to the world and the breach is on the customer side of the line.", highlight: ["cust"], fail: ["data"] }
      ]
    },
    keyFacts: [
      "AWS = security OF the cloud (facilities, hardware, network, hypervisor, managed-service software).",
      "Customer = security IN the cloud (data, IAM, network rules, encryption, guest OS).",
      "EC2: customer patches the guest OS. RDS: AWS patches the engine. Lambda: AWS patches the runtime.",
      "Customers always own their data, IAM configuration and encryption decisions.",
      "Shared controls: patch management, configuration management, awareness and training.",
      "Inherited controls: physical and environmental.",
      "AWS Artifact gives on-demand access to AWS compliance reports (SOC, ISO, PCI)."
    ],
    examTips: [
      "'Physical security of data centers' or 'decommissioning storage media' → AWS.",
      "'Configuring security groups, IAM policies, encrypting data, patching the EC2 guest OS' → customer.",
      "'Patching the RDS database engine' → AWS (customer only picks the maintenance window).",
      "'Auditor needs AWS's SOC 2 / PCI report' → AWS Artifact.",
      "'Team spends too much time patching servers' → move to a more managed service (RDS, Fargate, Lambda)."
    ],
    pitfalls: [
      "Assuming AWS patches the OS on EC2. It never does; use Systems Manager Patch Manager to automate it yourself.",
      "Thinking managed services remove all customer responsibility. IAM, data and encryption choices are always yours.",
      "Believing encryption is AWS's responsibility because it is a checkbox. Turning it on and choosing the key is yours.",
      "Confusing AWS Artifact (compliance reports) with Audit Manager (collect evidence for your own controls)."
    ],
    services: ["ec2", "rds", "lambda", "s3", "iam", "security-group", "kms", "artifact", "audit-manager"]
  },

  // ------------------------------------------------------------------ 3
  {
    id: "m1-well-architected",
    module: "m1",
    domain: "foundations",
    title: "The Well-Architected Framework",
    minutes: 14,
    summary: "Name the six pillars, map them to the four exam domains, and use the question's qualifier words to decide which pillar the 'best' answer must optimise.",
    analogy: {
      title: "A building inspector's checklist",
      body: "Before a new building opens, an inspector walks through with a checklist: is it safe from break-ins (security)? Will it stay standing in an earthquake (reliability)? Do the lifts move people fast enough (performance)? Is the heating bill reasonable (cost)? Can the caretaker run it day to day (operations)? Does it waste energy (sustainability)?\n\nNo building scores perfectly on everything: steel-reinforced walls are safer but cost more. The Well-Architected Framework is AWS's checklist, and every exam question is the inspector asking 'which design best balances these for THIS customer?'"
    },
    sections: [
      {
        heading: "What the framework is",
        body: "The **AWS Well-Architected Framework** is a set of design principles and questions for evaluating cloud architectures, organised into **six pillars**: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization and Sustainability.\n\nThe SAA-C03 exam is literally built on it. Its four domains map onto pillars 2 to 5:",
        table: {
          headers: ["Exam domain", "Weight", "Pillar"],
          rows: [
            ["1. Design Secure Architectures", "30%", "Security"],
            ["2. Design Resilient Architectures", "26%", "Reliability"],
            ["3. Design High-Performing Architectures", "24%", "Performance Efficiency"],
            ["4. Design Cost-Optimized Architectures", "20%", "Cost Optimization"]
          ]
        }
      },
      {
        heading: "The six pillars and their design principles",
        body: "Each pillar has a handful of design principles. You do not need to memorise them verbatim, but you should recognise the ideas behind correct answers.",
        table: {
          headers: ["Pillar", "Core question", "Key design principles", "Typical AWS answer"],
          rows: [
            ["Operational Excellence", "Can we run and improve it?", "Perform operations as code; make small, reversible changes; anticipate failure; learn from incidents", "CloudFormation, Systems Manager, CloudWatch, runbooks"],
            ["Security", "Is it protected?", "Strong identity foundation (least privilege); traceability; security at all layers; protect data in transit and at rest; automate", "IAM roles, SG chaining, KMS, CloudTrail, GuardDuty"],
            ["Reliability", "Does it recover from failure?", "Automatically recover; test recovery; scale horizontally; stop guessing capacity; manage change through automation", "Multi-AZ, Auto Scaling, Route 53 failover, backups"],
            ["Performance Efficiency", "Does it use resources efficiently?", "Democratise advanced tech (use managed services); go global in minutes; use serverless; experiment more often", "CloudFront, ElastiCache, right instance family, DynamoDB"],
            ["Cost Optimization", "Does it avoid waste?", "Pay only for what you use; measure efficiency; stop spending on undifferentiated heavy lifting; analyse and attribute spend", "Savings Plans, Spot, S3 lifecycle, right-sizing"],
            ["Sustainability", "Does it minimise environmental impact?", "Maximise utilisation; use managed services; adopt efficient hardware (Graviton); reduce downstream impact", "Graviton instances, serverless, right-sizing, data lifecycle"]
          ]
        }
      },
      {
        heading: "Trade-offs between pillars",
        body: "Pillars pull against each other, which is why exam answers that are all technically valid still have one 'best' choice. Common tensions:\n\n- **Reliability vs Cost**: a Multi-AZ RDS standby doubles the database instance bill. Warm standby DR costs more than backup-and-restore.\n- **Performance vs Cost**: Provisioned IOPS (io2) volumes are faster than gp3 but cost more per GB and per IOPS.\n- **Security vs Operational simplicity**: customer-managed KMS keys give control and audit but add key policies to maintain; SSE-S3 needs no management at all.\n- **Performance vs Consistency**: caching (ElastiCache, DAX, CloudFront) speeds reads but can serve slightly stale data.\n\nThe framework says Security and Reliability are usually non-negotiable; you trade among the others based on business needs. On the exam, the business need is spelled out by a qualifier word."
      },
      {
        heading: "Reading the qualifier: which pillar is being tested",
        body: "Most questions include two or three requirements that every option meets, plus one qualifier that eliminates all but one. Train yourself to circle it.",
        table: {
          headers: ["Qualifier in the question", "Pillar it signals", "What usually wins"],
          rows: [
            ["'least operational overhead', 'minimal management'", "Operational Excellence", "Managed or serverless service; no custom scripts on EC2"],
            ["'most secure', 'least privilege', 'encrypted', 'auditable'", "Security", "Roles over keys, private subnets, KMS CMK, endpoints"],
            ["'highly available', 'fault tolerant', 'survive AZ failure'", "Reliability", "Multi-AZ, Auto Scaling, decoupling with SQS"],
            ["'lowest latency', 'improve performance', 'millions of requests'", "Performance", "Caching, CloudFront, DynamoDB, read replicas"],
            ["'most cost-effective', 'minimise cost'", "Cost", "Spot, Savings Plans, S3 lifecycle tiers, gateway endpoints"],
            ["'reduce carbon footprint', 'energy efficient'", "Sustainability", "Graviton, serverless, right-sizing, deleting unused data"]
          ]
        }
      },
      {
        heading: "Worked example: one scenario, four valid designs",
        body: "A company runs a reporting web app on a single EC2 instance with a MySQL database installed on the same instance. They ask a solutions architect to improve it. Every option below 'works', but each optimises a different pillar:\n\n- **Reliability**: move the database to **RDS Multi-AZ** and run the web tier in an Auto Scaling group across two AZs behind an ALB. Survives an AZ failure.\n- **Security**: put the instances in private subnets, attach an IAM role instead of keys, encrypt RDS with KMS and store the DB password in Secrets Manager.\n- **Performance**: add **ElastiCache** in front of repeated report queries and CloudFront for static assets.\n- **Cost**: right-size the instance with Compute Optimizer, buy a Savings Plan for the steady baseline, and stop the dev copy at night.\n\nThe question's last line decides which of these is 'correct'. If it says 'with the LEAST operational overhead, make the database highly available', the answer is RDS Multi-AZ, not a hand-built MySQL replica on a second EC2 instance, even though both add a standby."
      },
      {
        heading: "The Well-Architected Tool and related services",
        beyond: true,
        body: "The **AWS Well-Architected Tool** is a free console service: you answer the framework's questions about a workload and it produces a report of high-risk and medium-risk issues with improvement plans. **Lenses** add domain-specific questions (Serverless, SaaS, Machine Learning, Financial Services, and more).\n\nRelated automated checkers you will see in answers:\n\n- **AWS Trusted Advisor**: automated checks across cost, performance, security, fault tolerance, service limits and operational excellence (full checks need Business Support or higher).\n- **AWS Compute Optimizer**: ML-based right-sizing recommendations for EC2, EBS, Lambda, ECS on Fargate and RDS.\n- **AWS Config**: continuously records resource configurations and evaluates them against rules."
      },
      {
        heading: "Exam angle",
        body: "When you see 'a solutions architect must recommend...', the question is really 'which design best satisfies pillar X under these constraints?'. A reliable process:\n\n- Read the last sentence first to find the qualifier (cost? overhead? latency?).\n- Eliminate options that break a hard requirement (not encrypted, single AZ when HA is required).\n- Among the survivors, pick the one that best fits the qualifier's pillar.\n- When two options both work, prefer managed over self-managed and the AWS-native feature over custom code. Custom Lambda scripts and cron jobs on EC2 are almost always distractors when a built-in feature exists."
      }
    ],
    diagram: {
      title: "One question, six lenses",
      nodes: [
        { id: "q", label: "Exam question", icon: "user", x: 50, y: 30, sub: "find the qualifier" },
        { id: "ops", label: "Operational Exc.", icon: "cloudformation", x: 18, y: 10, sub: "ops as code" },
        { id: "sec", label: "Security", icon: "iam", x: 50, y: 7, sub: "least privilege" },
        { id: "rel", label: "Reliability", icon: "auto-scaling", x: 82, y: 10, sub: "multi-AZ" },
        { id: "perf", label: "Performance", icon: "cloudfront", x: 82, y: 50, sub: "caching" },
        { id: "cost", label: "Cost", icon: "cost-explorer", x: 50, y: 53, sub: "pay for use" },
        { id: "sus", label: "Sustainability", icon: "compute-optimizer", x: 18, y: 50, sub: "Graviton" }
      ],
      edges: [
        { id: "e-ops", from: "q", to: "ops" },
        { id: "e-sec", from: "q", to: "sec" },
        { id: "e-rel", from: "q", to: "rel" },
        { id: "e-perf", from: "q", to: "perf" },
        { id: "e-cost", from: "q", to: "cost" },
        { id: "e-sus", from: "q", to: "sus" }
      ],
      steps: [
        { caption: "Every scenario is judged against six pillars. Start by finding the qualifier word in the last sentence.", highlight: ["q"] },
        { caption: "'Most secure' or 'least privilege' points to the Security pillar: Domain 1, 30% of the exam.", highlight: ["sec", "e-sec"], flow: [{ edge: "e-sec" }] },
        { caption: "'Highly available' or 'fault tolerant' points to Reliability: Domain 2, 26%.", highlight: ["rel", "e-rel"], flow: [{ edge: "e-rel" }] },
        { caption: "'Lowest latency' or 'improve performance' points to Performance Efficiency: Domain 3, 24%.", highlight: ["perf", "e-perf"], flow: [{ edge: "e-perf" }] },
        { caption: "'Most cost-effective' points to Cost Optimization: Domain 4, 20%.", highlight: ["cost", "e-cost"], flow: [{ edge: "e-cost" }] },
        { caption: "'Least operational overhead' and 'energy efficient' point to Operational Excellence and Sustainability, which appear as tie-breakers.", highlight: ["ops", "sus", "e-ops", "e-sus"], flow: [{ edge: "e-ops" }, { edge: "e-sus" }] }
      ]
    },
    keyFacts: [
      "Six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.",
      "Exam domain weights: Secure 30%, Resilient 26%, High-Performing 24%, Cost-Optimized 20%.",
      "Sustainability was added as the sixth pillar in 2021.",
      "Security principle: implement a strong identity foundation with least privilege and centralised identity.",
      "Reliability principle: automatically recover from failure and scale horizontally.",
      "The Well-Architected Tool is free and reports high- and medium-risk issues per workload.",
      "Lenses (Serverless, SaaS, ML...) extend the framework for specific workload types."
    ],
    examTips: [
      "Find the qualifier ('least operational overhead', 'most cost-effective', 'highly available') before reading the options.",
      "'Least operational overhead' → managed/serverless; eliminate anything that requires custom scripts or EC2 you patch.",
      "When two answers both work, prefer the AWS-native built-in feature over a custom Lambda or cron job.",
      "'Reduce carbon footprint' → Graviton, serverless, right-sizing, delete unused data.",
      "'Review the architecture against AWS best practices' → AWS Well-Architected Tool."
    ],
    pitfalls: [
      "Picking the most powerful or most available design when the qualifier asks for lowest cost.",
      "Forgetting Sustainability is a pillar (older material lists only five).",
      "Confusing the Well-Architected Tool (questionnaire review) with Trusted Advisor (automated account checks).",
      "Treating every requirement as equal: one qualifier usually decides between otherwise valid answers."
    ],
    services: ["trusted-advisor", "compute-optimizer", "config", "cloudformation", "cloudwatch", "auto-scaling", "cost-explorer"]
  },

  // ------------------------------------------------------------------ 4
  {
    id: "m1-iam-identities",
    module: "m1",
    domain: "secure",
    title: "IAM Identities: Root, Users, Groups, Roles",
    minutes: 18,
    summary: "Choose the right identity type for people, applications and other accounts, and explain why IAM roles with temporary credentials beat long-term access keys.",
    analogy: {
      title: "Keys, staff badges, departments and visitor passes",
      body: "Think of an office building. The **root user** is the owner's master key: it opens every door and cannot be restricted, so it stays in a safe. An **IAM user** is a permanent staff badge with a photo: useful, but if it is stolen it keeps working until someone notices. A **group** is a department: give the Finance department access to the finance floor once instead of programming every badge.\n\nA **role** is a visitor pass handed out at reception. You prove who you are, receive a pass that works for a few hours, and it expires on its own. Nobody carries it home, nobody can copy it into a notebook. Modern AWS wants almost everything (servers, functions, employees, partner companies) to use visitor passes."
    },
    sections: [
      {
        heading: "The problem IAM solves",
        body: "Every action in AWS is an **API call**: launching an instance, reading an S3 object, even clicking a button in the console (the console calls APIs for you). **IAM (Identity and Access Management)** answers two questions about every single call:\n\n- **Authentication (AuthN)**: who is making this call? Proven with a password + MFA, an access key signature, or temporary credentials.\n- **Authorization (AuthZ)**: is that identity allowed to do this action on this resource? Decided by policies.\n\nAWS is **deny-by-default**: a brand-new IAM user can do nothing until a policy allows it. IAM is a **global** service and is free.\n\nEvery identity and resource has an **ARN (Amazon Resource Name)**, a unique ID such as `arn:aws:iam::111122223333:user/alice` or `arn:aws:s3:::my-reports`. The format is `arn:partition:service:region:account-id:resource`; global services like IAM and S3 buckets leave the Region (and for S3, the account) empty."
      },
      {
        heading: "The root user: lock it away",
        body: "The **root user** is the email address and password that created the AWS account. It has complete, unrestrictable access: IAM policies cannot limit it (only an Organizations SCP can constrain a member account's root, and not for everything).\n\nBest practice:\n\n- Enable **MFA** on root immediately (AWS now requires MFA for root users). Use a FIDO2 security key or passkey for phishing resistance.\n- **Never create access keys** for root. Delete any that exist.\n- Never use it for daily work; create an admin identity instead.\n\nA few tasks **require** root: changing the account name, email or root password; closing the account; changing the AWS Support plan; restoring permissions when the only admin locks themselves out; registering as a seller in the Reserved Instance Marketplace; and some billing settings such as enabling IAM access to billing.",
      },
      {
        heading: "Centralised root access for many accounts",
        beyond: true,
        body: "Since late 2024, AWS Organizations can manage member-account root users centrally: you can **delete root credentials** (password, keys, MFA) from member accounts entirely and perform the few privileged root tasks (such as unlocking a misconfigured S3 bucket policy) through short-lived, task-scoped root sessions from the management account. For an exam question about 'eliminating long-term root credentials across hundreds of accounts', this is the modern answer."
      },
      {
        heading: "IAM users and groups",
        body: "An **IAM user** is a permanent identity with **long-term credentials**:\n\n- a console **password** (with optional MFA), and/or\n- up to **2 access keys** (an access key ID like `AKIA...` plus a secret) for the CLI/SDK. Two exist so you can rotate: create the new key, switch, then delete the old one.\n\nLong-term credentials are exactly what attackers steal: keys pasted into code, committed to GitHub, baked into an AMI. That is why AWS now recommends IAM users only for edge cases (break-glass access, third-party tools that cannot use roles) and pushes humans to **IAM Identity Center** and workloads to **roles**.\n\nAn **IAM group** is a collection of users. Attach policies to the group once; every member inherits them. Rules to remember:\n\n- Groups **cannot be nested** (no groups inside groups).\n- A group is **not a principal**: you cannot name a group in a resource policy or have a group 'assume' anything.\n- A user can belong to up to **10 groups**; an account can have up to 5,000 users by default.",
        table: {
          headers: ["Credential", "Used for", "Lifetime", "Risk"],
          rows: [
            ["Password + MFA", "Console sign-in", "Until changed (password policy can force rotation)", "Phishing; mitigated by MFA"],
            ["Access key pair", "CLI, SDK, API", "Forever until deleted", "High: leaks in code, repos, AMIs"],
            ["Temporary credentials (STS)", "Assumed roles, federation", "15 minutes to 12 hours", "Low: expire automatically"]
          ]
        }
      },
      {
        heading: "Roles and STS: temporary credentials",
        body: "An **IAM role** is an identity with permissions but **no permanent credentials**. Something must **assume** it, and the **AWS Security Token Service (STS)** returns temporary credentials: an access key, secret and session token that expire automatically (15 minutes to 12 hours; 1 hour by default; role chaining caps sessions at 1 hour).\n\nEvery role has two policies:\n\n- **Trust policy**: WHO may assume it (a resource-based policy on the role naming a principal such as `ec2.amazonaws.com`, another account, or a SAML provider).\n- **Permissions policy**: WHAT the session can do once assumed.\n\nWho uses roles:\n\n- **EC2 instances** via an **instance profile** (a container that attaches a role to an instance). The SDK fetches credentials from the instance metadata service (use **IMDSv2**, which requires a session token and blocks SSRF-style theft).\n- **Lambda functions** (execution role), **ECS tasks** (task role), and other AWS services (**service roles**). **Service-linked roles** are pre-defined by a service (for example, Auto Scaling) and you cannot edit their permissions.\n- **Other AWS accounts**: account B creates a role trusting account A; users in A call `sts:AssumeRole`. For third parties, require an **External ID** in the trust policy to prevent the 'confused deputy' problem.\n- **Federated users** (employees from Okta or Entra ID, app users from Cognito).\n\nWhy roles beat keys: nothing to embed in code, nothing to rotate, nothing to leak. Any scenario describing credentials 'stored in the application, AMI, user data or a config file' is the wrong design; the fix is a role."
      },
      {
        heading: "Choosing the identity",
        body: "Match who (or what) is calling AWS to the identity type.",
        table: {
          headers: ["Caller", "Use", "Why"],
          rows: [
            ["Account owner, emergencies only", "Root user (MFA, no keys)", "Only for root-only tasks"],
            ["Employees (console/CLI), many accounts", "IAM Identity Center (roles via permission sets)", "Central SSO, temporary credentials"],
            ["Code on EC2 / Lambda / ECS", "IAM role (instance profile, execution role, task role)", "Auto-rotated temporary credentials"],
            ["Another AWS account or vendor", "Cross-account role (+ External ID for vendors)", "No shared keys; revocable trust"],
            ["On-prem server calling AWS", "IAM Roles Anywhere (X.509 certificate) or, if unavoidable, IAM user keys", "Avoids long-term keys where possible"],
            ["Mobile/web app end users", "Cognito (user pools + identity pools)", "Scales to millions; never IAM users"]
          ]
        }
      },
      {
        heading: "Exam angle",
        body: "Roles-over-keys is the single most repeated pattern on the exam. If an application on EC2 must read and write one S3 bucket and security forbids long-term credentials, every option that stores keys (config file, user data, environment variables, an IAM user per instance) is wrong, and making the bucket public removes authentication entirely. The correct answer is an IAM role with a least-privilege policy for that bucket, attached through an instance profile.\n\nOther triggers:\n\n- 'Access keys found in a public repository' → deactivate/delete the keys, then move the workload to a role.\n- 'Grant a partner account access without sharing credentials' → cross-account role with External ID.\n- 'Enforce MFA for console users' → IAM policy condition `aws:MultiFactorAuthPresent` or Identity Center MFA settings."
      }
    ],
    diagram: {
      title: "Keys leak, roles expire",
      groups: [
        { id: "acct", label: "AWS account 1111", kind: "cloud", x: 26, y: 4, w: 70, h: 52 }
      ],
      nodes: [
        { id: "attacker", label: "Attacker", icon: "attacker", x: 10, y: 12, sub: "found keys on GitHub" },
        { id: "dev", label: "Partner account", icon: "users", x: 10, y: 46, sub: "account 2222" },
        { id: "ec2", label: "EC2 instance", icon: "ec2", x: 38, y: 30, sub: "instance profile" },
        { id: "role", label: "App role", icon: "iam-role", x: 60, y: 12, sub: "trust: ec2" },
        { id: "sts", label: "STS", icon: "sts", x: 60, y: 46, sub: "temp creds" },
        { id: "s3", label: "Reports bucket", icon: "s3", x: 84, y: 30 }
      ],
      edges: [
        { id: "e-att", from: "attacker", to: "s3", label: "stolen AKIA key" },
        { id: "e-ec2-role", from: "ec2", to: "role", label: "attached" },
        { id: "e-ec2-sts", from: "ec2", to: "sts", label: "IMDSv2" },
        { id: "e-ec2-s3", from: "ec2", to: "s3", label: "temp creds" },
        { id: "e-partner", from: "dev", to: "sts", label: "AssumeRole" },
        { id: "e-sts-role", from: "sts", to: "role", dashed: true }
      ],
      steps: [
        { caption: "The anti-pattern: long-term access keys baked into code leak to a public repo, and an attacker uses them from anywhere until someone deletes them.", highlight: ["attacker", "e-att"], flow: [{ edge: "e-att", color: "bad" }], fail: ["e-att"] },
        { caption: "The fix: create a role whose trust policy allows ec2.amazonaws.com and whose permissions policy allows only this bucket. Attach it via an instance profile.", highlight: ["role", "ec2", "e-ec2-role"] },
        { caption: "The SDK on the instance asks the metadata service (IMDSv2) for credentials; STS issues temporary keys that expire in hours.", highlight: ["sts", "e-ec2-sts"], flow: [{ edge: "e-ec2-sts" }, { edge: "e-ec2-sts", reverse: true }] },
        { caption: "The instance calls S3 with the temporary credentials. Nothing is stored in code, AMI or user data.", highlight: ["e-ec2-s3", "s3"], flow: [{ edge: "e-ec2-s3" }] },
        { caption: "Before expiry, the SDK refreshes credentials automatically. There is nothing to rotate by hand.", highlight: ["sts", "ec2"], flow: [{ edge: "e-ec2-sts" }] },
        { caption: "A partner account gets access the same way: it calls sts:AssumeRole on a role that trusts account 2222 (with an External ID), not with shared keys.", highlight: ["dev", "e-partner", "e-sts-role", "role"], flow: [{ edge: "e-partner" }, { edge: "e-sts-role" }] }
      ]
    },
    keyFacts: [
      "IAM is global, free and deny-by-default.",
      "Root user: enable MFA, no access keys, use only for root-only tasks (close account, change support plan, change root email).",
      "An IAM user can have at most 2 access keys (to allow rotation).",
      "Groups cannot be nested and are not principals; a user can be in up to 10 groups.",
      "Roles have no long-term credentials; STS issues temporary credentials lasting 15 min to 12 h (default 1 h).",
      "Role = trust policy (who can assume) + permissions policy (what they can do).",
      "EC2 gets a role through an instance profile; credentials come from the instance metadata service (prefer IMDSv2).",
      "Service-linked roles are created and managed by an AWS service; you cannot change their permissions.",
      "Use an External ID in a cross-account trust policy for third parties to prevent the confused-deputy problem."
    ],
    examTips: [
      "'No long-term credentials on the instances' → IAM role via instance profile. Never keys in config, user data or the AMI.",
      "'An IAM user per instance' or 'make the bucket public' are always wrong for app-to-S3 access.",
      "'Third-party vendor needs access to our account' → cross-account IAM role with External ID.",
      "'Root user best practice' → MFA, delete root access keys, use for account-level tasks only.",
      "'Credentials leaked in a public repository' → revoke the keys immediately, then move to roles.",
      "'Permissions for a group of developers' → attach a policy to an IAM group (or a permission set in Identity Center)."
    ],
    pitfalls: [
      "Trying to reference an IAM group in a bucket policy Principal. Groups are not principals.",
      "Nesting groups. Not supported; flatten them.",
      "Using the root user for daily admin. Create an admin role or Identity Center user instead.",
      "Thinking an instance profile and a role are different permission sets. The profile just carries the role.",
      "Assuming temporary credentials last forever. Long-running jobs must refresh (SDKs do this automatically)."
    ],
    prosCons: [
      {
        option: "IAM user with access keys",
        pros: ["Works anywhere, including outside AWS", "Simple to understand"],
        cons: ["Long-term secret that must be stored and rotated", "Leaks are valid until manually revoked"],
        useWhen: "Last resort for tools or on-prem systems that cannot assume roles (prefer IAM Roles Anywhere)."
      },
      {
        option: "IAM role (temporary credentials)",
        pros: ["Nothing to store or rotate", "Credentials expire automatically", "Works for services, accounts and federated users"],
        cons: ["Caller must be able to assume it (trust policy setup)", "Session duration limits"],
        useWhen: "Default for every AWS workload and cross-account access."
      }
    ],
    services: ["iam", "iam-role", "sts", "ec2", "s3", "iam-identity-center", "organizations"]
  },

  // ------------------------------------------------------------------ 5
  {
    id: "m1-iam-policies",
    module: "m1",
    domain: "secure",
    title: "Policy Anatomy & Evaluation Logic",
    minutes: 20,
    summary: "Read and fix IAM policy JSON, know every policy type, and walk AWS's evaluation logic to predict whether any request is allowed or denied, including cross-account.",
    analogy: {
      title: "The nightclub guest list",
      body: "A nightclub bouncer checks several lists before letting you in. There is the **banned list**: if your name is on it, you are out, no matter who invited you. There are **invitations**: your own VIP card (identity policy) or the host's guest list (resource policy). There may be a **dress code set by head office** (an SCP) that no invitation can override, and a **spending cap on your card** (a permissions boundary).\n\nIf nobody invited you, you don't get in, even if you are not banned. That is AWS: **explicit deny beats everything, an allow is needed to get in, and silence means no.**"
    },
    sections: [
      {
        heading: "Policy types: where permissions come from",
        body: "A **policy** is a JSON document that grants or denies permissions. Several kinds can apply to the same request:",
        table: {
          headers: ["Policy type", "Attached to", "Grants?", "Purpose"],
          rows: [
            ["Identity-based (AWS managed, customer managed, inline)", "User, group, role", "Yes", "What this identity can do"],
            ["Resource-based", "Resource: S3 bucket, KMS key, SQS queue, SNS topic, Lambda, role trust policy", "Yes (names a Principal)", "Who can access this resource, including other accounts"],
            ["Permissions boundary", "User or role", "No (ceiling only)", "Maximum permissions an identity can ever have"],
            ["Service Control Policy (SCP)", "Organization root, OU, account", "No (ceiling only)", "Maximum permissions for principals in member accounts"],
            ["Resource Control Policy (RCP)", "Organization root, OU, account", "No (ceiling only)", "Maximum access to resources in member accounts (since 2024)"],
            ["Session policy", "Passed when assuming a role / federating", "No (ceiling only)", "Narrow a single session"],
            ["ACLs (S3, legacy)", "Bucket or object", "Yes", "Legacy cross-account grants; disabled by default on new buckets"]
          ]
        }
      },
      {
        heading: "Managed vs inline policies",
        body: "Identity-based policies come in three flavours:\n\n- **AWS managed**: written and updated by AWS (for example `AmazonS3ReadOnlyAccess`, `ReadOnlyAccess`, `AdministratorAccess`). Convenient but broad, and AWS can change them.\n- **Customer managed**: your own reusable policy, versioned (up to 5 versions, roll back any time), attachable to many identities. The recommended default.\n- **Inline**: embedded in a single user, group or role; deleted with it. Use only for a strict one-to-one relationship.\n\nA managed policy can be up to 6,144 characters; by default you can attach 10 managed policies to a user or role (raisable to 20)."
      },
      {
        heading: "Anatomy of a statement",
        body: "A policy has a `Version` (always `2012-10-17`) and one or more statements. Each statement has:\n\n- `Sid`: optional label.\n- `Effect`: `Allow` or `Deny`.\n- `Principal`: WHO the statement applies to. Only in resource-based policies (identity policies apply to whoever they are attached to).\n- `Action`: API calls such as `s3:GetObject`, wildcards allowed (`s3:Get*`). `NotAction` matches everything except the list.\n- `Resource`: ARNs the actions apply to (`NotResource` inverts).\n- `Condition`: optional tests on request context.\n\nExample: read-only access to one bucket over HTTPS only:\n\n`{\"Effect\": \"Allow\", \"Action\": [\"s3:GetObject\", \"s3:ListBucket\"], \"Resource\": [\"arn:aws:s3:::my-reports\", \"arn:aws:s3:::my-reports/*\"], \"Condition\": {\"Bool\": {\"aws:SecureTransport\": \"true\"}}}`\n\nNote the two Resource lines. `s3:ListBucket` acts on the **bucket** ARN (`my-reports`); `s3:GetObject` acts on **objects** inside it (`my-reports/*`). Forgetting one is the classic broken-policy question: users can list but get AccessDenied on download, or vice versa."
      },
      {
        heading: "Condition keys worth recognising",
        body: "Conditions make policies context-aware. Operators include `StringEquals`, `StringLike`, `ArnLike`, `IpAddress`, `NotIpAddress`, `Bool`, `NumericLessThan`, `DateGreaterThan`. The global keys the exam uses most:",
        table: {
          headers: ["Condition key", "Tests", "Typical use"],
          rows: [
            ["aws:SourceIp", "Caller's public IP", "Allow only from the office CIDR 203.0.113.0/24"],
            ["aws:SourceVpce / aws:SourceVpc", "Request came through a given VPC endpoint / VPC", "Bucket reachable only via our endpoint"],
            ["aws:PrincipalOrgID", "Caller belongs to our AWS Organization", "Share a bucket with every account in the org in one line"],
            ["aws:MultiFactorAuthPresent", "Session used MFA", "Require MFA to delete or stop instances"],
            ["aws:SecureTransport", "Request used HTTPS", "Deny any non-TLS S3 access"],
            ["aws:RequestedRegion", "Region the call targets", "Deny all Regions except eu-west-1 (data residency)"],
            ["aws:PrincipalTag / aws:ResourceTag", "Tags on caller / resource", "ABAC: allow only if project tags match"]
          ]
        }
      },
      {
        heading: "How AWS decides: the evaluation logic",
        body: "For every request, AWS evaluates all applicable policies:\n\n- **Step 1**: collect every policy that applies to this principal, action and resource: identity policies, resource policies, permissions boundaries, SCPs, RCPs, session policies.\n- **Step 2**: is there an **explicit Deny** in any of them? If yes → **DENIED**. Nothing overrides an explicit deny.\n- **Step 3**: do the ceilings (SCPs, RCPs, boundary, session policy) allow the action? If any ceiling does not include it → denied.\n- **Step 4**: is there an **explicit Allow** in an identity or resource policy? If yes → **ALLOWED**.\n- **Step 5**: otherwise → **implicit deny** (the default).\n\n**Same account**: an Allow in EITHER the identity policy OR the resource policy is enough. **Cross-account**: you need an Allow on BOTH sides. Account A's identity policy must allow the call, and account B's resource policy (or a role in B that A can assume) must allow account A in.",
        table: {
          headers: ["Scenario", "Identity policy", "Resource policy", "Result"],
          rows: [
            ["Same account", "Allow", "(none)", "Allowed"],
            ["Same account", "(none)", "Allow for this user", "Allowed"],
            ["Same account", "Allow", "Deny", "Denied (explicit deny wins)"],
            ["Cross-account", "Allow", "(none)", "Denied (B never let A in)"],
            ["Cross-account", "(none)", "Allow account A", "Denied (A's admin never granted it)"],
            ["Cross-account", "Allow", "Allow account A", "Allowed"]
          ]
        }
      },
      {
        heading: "ABAC and policy variables",
        beyond: true,
        body: "**Role-based access control (RBAC)** writes one policy per job function. **Attribute-based access control (ABAC)** writes one policy that compares tags: 'allow ec2:StopInstances if `aws:ResourceTag/project` equals `aws:PrincipalTag/project`'. New projects need only new tags, not new policies, which scales well for fast-growing teams.\n\n**Policy variables** insert request values into a policy: `arn:aws:s3:::home-bucket/${aws:username}/*` gives each user their own folder with a single policy.\n\nTo check policies before deploying, use the **IAM policy simulator** and **IAM Access Analyzer policy validation**, which flags errors, overly broad statements and security warnings."
      },
      {
        heading: "Exam angle: debugging policies",
        body: "Common broken-policy patterns:\n\n- ListBucket works but GetObject fails → the object ARN `bucket/*` is missing (or vice versa).\n- User has an Allow but is still denied → look for an explicit Deny in an SCP, boundary, bucket policy or KMS key policy.\n- Cross-account access fails → one side of the 'both sides must allow' rule is missing.\n- S3 object encrypted with SSE-KMS can't be read cross-account → the KMS key policy (another resource policy) must also allow the external account.\n\n'Deny unless' patterns use a Deny with a negated condition: deny `s3:*` when `aws:SecureTransport` is `false`, or deny all actions when `aws:RequestedRegion` is not `eu-west-1`. A Deny is safer than relying on the absence of an Allow because it cannot be overridden by another policy."
      }
    ],
    diagram: {
      title: "Policy evaluation flow",
      nodes: [
        { id: "req", label: "API request", icon: "user", x: 8, y: 30, sub: "s3:GetObject" },
        { id: "deny", label: "Explicit Deny?", icon: "iam-policy", x: 24, y: 30, sub: "any policy" },
        { id: "scp", label: "SCP / RCP", icon: "scp", x: 40, y: 30, sub: "org ceiling" },
        { id: "bound", label: "Boundary", icon: "iam", x: 56, y: 30, sub: "identity ceiling" },
        { id: "allow", label: "Explicit Allow?", icon: "iam-policy", x: 72, y: 30, sub: "identity or resource" },
        { id: "ok", label: "Allowed", icon: "s3", x: 90, y: 30 },
        { id: "no", label: "Denied", icon: "attacker", x: 48, y: 52, sub: "implicit or explicit" }
      ],
      edges: [
        { id: "e1", from: "req", to: "deny" },
        { id: "e2", from: "deny", to: "scp", label: "no deny" },
        { id: "e3", from: "scp", to: "bound", label: "within" },
        { id: "e4", from: "bound", to: "allow", label: "within" },
        { id: "e5", from: "allow", to: "ok", label: "yes" },
        { id: "d1", from: "deny", to: "no", label: "deny found", dashed: true },
        { id: "d2", from: "scp", to: "no", dashed: true },
        { id: "d3", from: "allow", to: "no", label: "no allow", dashed: true }
      ],
      steps: [
        { caption: "A principal calls s3:GetObject. AWS gathers every policy that applies: identity, resource, boundary, SCPs, RCPs and session policies.", highlight: ["req", "e1"], flow: [{ edge: "e1" }] },
        { caption: "First check: an explicit Deny anywhere ends evaluation immediately. Nothing can override it.", highlight: ["deny", "d1", "no"], flow: [{ edge: "d1", color: "bad" }], fail: ["no"] },
        { caption: "No deny found. Next, the organisation ceiling: the SCP (and RCP) must permit the action, or it is denied even for account admins.", highlight: ["scp", "e2"], flow: [{ edge: "e2" }] },
        { caption: "The permissions boundary is the identity's own ceiling. Effective permissions are the intersection of policy and boundary.", highlight: ["bound", "e3"], flow: [{ edge: "e3" }] },
        { caption: "Now an explicit Allow is required, from the identity policy or (same account) the resource policy. Cross-account needs both.", highlight: ["allow", "e4"], flow: [{ edge: "e4" }] },
        { caption: "Allow found and nothing blocked it: the request succeeds.", highlight: ["ok", "e5"], flow: [{ edge: "e5" }] },
        { caption: "No Allow anywhere? Implicit deny, AWS's default. Silence means no.", highlight: ["d3", "no"], flow: [{ edge: "d3", color: "bad" }], fail: ["no"] }
      ]
    },
    keyFacts: [
      "Evaluation order: explicit Deny → ceilings (SCP/RCP, boundary, session) → explicit Allow → implicit deny.",
      "An explicit Deny in any applicable policy always wins.",
      "Same account: Allow in identity OR resource policy is enough. Cross-account: Allow needed on BOTH sides.",
      "SCPs, RCPs, permissions boundaries and session policies never grant; they only limit.",
      "Principal appears only in resource-based policies (including role trust policies).",
      "s3:ListBucket targets arn:aws:s3:::bucket; s3:GetObject targets arn:aws:s3:::bucket/*.",
      "Customer managed policies keep up to 5 versions; inline policies die with their identity.",
      "aws:PrincipalOrgID lets a resource policy trust every account in your organization.",
      "aws:SecureTransport = false in a Deny statement forces HTTPS."
    ],
    examTips: [
      "'User has an Allow but still gets AccessDenied' → look for an explicit Deny (SCP, boundary, bucket policy, KMS key policy).",
      "'Can list the bucket but cannot download objects' → add the /* object ARN to Resource.",
      "'Allow every account in our organization to read this bucket' → bucket policy with aws:PrincipalOrgID condition.",
      "'Restrict access to requests from the corporate network' → aws:SourceIp (public IP) or aws:SourceVpce (via endpoint).",
      "'Require HTTPS for all S3 access' → bucket policy Deny when aws:SecureTransport is false.",
      "'Scale permissions as teams grow without writing new policies' → ABAC with tags.",
      "'Cross-account access to an SSE-KMS encrypted object fails' → the KMS key policy must also allow the other account."
    ],
    pitfalls: [
      "Expecting an Allow to override a Deny. It never does.",
      "Thinking an SCP or boundary grants permissions. They only cap; you still need an identity or resource Allow.",
      "Putting a Principal element in an identity-based policy (invalid).",
      "Using aws:SourceIp with private VPC addresses; traffic via a VPC endpoint carries no public source IP, so use aws:SourceVpce.",
      "Assuming one side's Allow is enough for cross-account access."
    ],
    prosCons: [
      {
        option: "Identity-based policy",
        pros: ["Manage permissions per user/role/group", "Reusable as customer managed policies"],
        cons: ["Cannot by itself grant another account access to your resource"],
        useWhen: "Defining what your own identities can do."
      },
      {
        option: "Resource-based policy",
        pros: ["Grants cross-account access without the caller assuming a role", "Caller keeps its own identity and permissions"],
        cons: ["Only some services support it (S3, KMS, SQS, SNS, Lambda, Secrets Manager...)", "Policies spread across many resources"],
        useWhen: "Sharing one resource with other accounts or services; enforcing conditions on the resource itself."
      },
      {
        option: "RBAC vs ABAC",
        pros: ["RBAC: simple, easy to audit per job function", "ABAC: one policy scales to many projects via tags"],
        cons: ["RBAC: policy sprawl as teams grow", "ABAC: depends on disciplined, protected tagging"],
        useWhen: "RBAC for stable, few roles; ABAC for fast-growing teams with many projects."
      }
    ],
    services: ["iam", "iam-policy", "s3", "scp", "kms", "organizations", "sts"]
  },

  // ------------------------------------------------------------------ 6
  {
    id: "m1-iam-guardrails",
    module: "m1",
    domain: "secure",
    title: "Organizations, SCPs & Permission Boundaries",
    minutes: 18,
    summary: "Design a multi-account structure with AWS Organizations, enforce guardrails with SCPs that even account admins can't bypass, and delegate safely with permissions boundaries.",
    analogy: {
      title: "Head office rules and spending caps",
      body: "A franchise company has head office and dozens of branch shops. Each branch manager runs their shop freely, but head office publishes a rulebook: 'no branch may sell alcohol, no branch may open after midnight'. Even the most senior branch manager can't change that rulebook. That is a **Service Control Policy**.\n\nInside a branch, the manager lets a supervisor hire staff, but every new hire's company card is capped at $500. The supervisor can hand out cards, but never one with a higher limit than the cap. That is a **permissions boundary**: it lets you delegate without losing control."
    },
    sections: [
      {
        heading: "Why multiple accounts?",
        body: "An **AWS account** is the strongest isolation boundary AWS offers: separate resources, separate IAM, separate bills and separate service quotas. A mistake in a dev account can't delete production if production lives in another account. Large organisations commonly run dozens to thousands of accounts: per environment (dev, test, prod), per team, and dedicated accounts for logging and security tooling.\n\nThe problem: managing many accounts one by one is impossible. **AWS Organizations** groups them and applies central billing and policy."
      },
      {
        heading: "AWS Organizations structure",
        body: "Key parts:\n\n- **Management account**: the account that created the organization. It pays the bill and manages policy. Run no workloads in it.\n- **Member accounts**: every other account. An account belongs to exactly one organization.\n- **Root**: the top container of the hierarchy.\n- **Organizational units (OUs)**: folders of accounts (and nested OUs, up to 5 levels deep), for example `Security`, `Workloads/Prod`, `Workloads/Dev`, `Sandbox`.\n\nWhat you get:\n\n- **Consolidated billing**: one bill, and usage is aggregated so volume pricing tiers and Reserved Instance / Savings Plans discounts are shared across accounts.\n- **Policies**: SCPs, RCPs, tag policies, backup policies, AI-services opt-out policies, declarative policies (EC2 settings).\n- **Delegated administrator**: let a security account administer GuardDuty, Security Hub, Config and others across the org without using the management account.\n- **Organization-wide trails** in CloudTrail and sharing of resources with **AWS RAM**."
      },
      {
        heading: "Service Control Policies: org-level ceilings",
        body: "An **SCP** is a JSON policy attached to the root, an OU or an account that sets the **maximum permissions** for every IAM user and role in the affected member accounts, **including the account's root user and administrators**.\n\nRules to know cold:\n\n- SCPs **never grant** anything. Identities still need IAM Allows; the effective permission is the intersection.\n- SCPs **do not affect the management account**. Another reason not to run workloads there.\n- SCPs **do not affect service-linked roles**.\n- **Inheritance**: for an action to be allowed, it must be allowed by the SCPs at **every level** from root down to the account. A Deny at any level applies to everything below.\n- By default every node has the AWS managed `FullAWSAccess` SCP. Removing it without replacing it denies everything.\n- Up to 5 SCPs per node, 5,120 characters each.\n\nTwo strategies:\n\n- **Deny list** (common): keep `FullAWSAccess` and add Deny statements for what is forbidden.\n- **Allow list**: remove `FullAWSAccess` and explicitly allow only approved services. Stricter, more maintenance.\n\nClassic guardrail SCPs: deny `cloudtrail:StopLogging` and `cloudtrail:DeleteTrail`; deny `organizations:LeaveOrganization`; deny all actions when `aws:RequestedRegion` is outside the approved list; deny disabling GuardDuty or Config; deny creating IAM users with access keys."
      },
      {
        heading: "Resource Control Policies",
        beyond: true,
        body: "Introduced in late 2024, **Resource Control Policies (RCPs)** are the resource-side counterpart to SCPs. An SCP caps what your **principals** can do; an RCP caps what can be done **to your resources** (S3 buckets, KMS keys, SQS queues, Secrets Manager secrets, STS role assumption) no matter who is calling, including principals from outside your organization.\n\nThe headline use case is a **data perimeter**: 'no identity outside our organization may ever access our S3 buckets, even if a developer writes a bucket policy that allows it'. Before RCPs you had to police every bucket policy individually."
      },
      {
        heading: "Permissions boundaries: safe delegation",
        body: "A **permissions boundary** is a managed policy attached to a user or role that sets the maximum permissions it can ever have. Effective permissions = identity policy ∩ boundary (and ∩ SCPs).\n\nThe scenario it exists for: you want developers to create IAM roles for their own Lambda functions without waiting for the security team, but a developer must not be able to create a role more powerful than themselves (privilege escalation). The pattern:\n\n- Write a boundary policy, for example 'S3, DynamoDB, CloudWatch Logs only'.\n- Give developers `iam:CreateRole` with a condition requiring `iam:PermissionsBoundary` to equal that boundary's ARN.\n- Deny developers the ability to modify or delete the boundary policy itself.\n\nNow any role a developer creates is capped by the boundary, even if they attach `AdministratorAccess` to it."
      },
      {
        heading: "Comparing the guardrails",
        body: "These tools look alike because they all cap permissions. The difference is scope and who can change them.",
        table: {
          headers: ["Mechanism", "Applies to", "Grants?", "Who can change it", "Classic use"],
          rows: [
            ["IAM identity policy", "One user/group/role", "Yes", "Account admins", "Day-to-day permissions"],
            ["Permissions boundary", "One user/role", "No", "Account admins (protect it with a Deny)", "Delegate role creation safely"],
            ["SCP", "All principals in member accounts/OUs", "No", "Only the management account (or delegated admin)", "Prevent even admins from disabling CloudTrail"],
            ["RCP", "Resources in member accounts", "No", "Only the management account (or delegated admin)", "Data perimeter: block outside access"],
            ["Control Tower controls", "Accounts it governs", "No", "Central cloud team", "Pre-packaged preventive/detective guardrails"]
          ]
        }
      },
      {
        heading: "Control Tower and IAM Access Analyzer",
        beyond: true,
        body: "**AWS Control Tower** builds a best-practice multi-account **landing zone** on top of Organizations in a few clicks: a management account, a **Log Archive** account and an **Audit** account, IAM Identity Center for sign-in, and an **Account Factory** to vend new accounts with standard settings. It applies **controls** (formerly 'guardrails'):\n\n- **Preventive**: implemented as SCPs/RCPs (stop the action).\n- **Detective**: implemented as AWS Config rules (flag the violation).\n- **Proactive**: CloudFormation hooks that block non-compliant resources before they are created.\n\nIf a question says 'set up and govern a secure multi-account environment with the least effort', pick Control Tower.\n\n**IAM Access Analyzer** (from the study guide) finds resources shared outside your account or organization (public S3 buckets, cross-account roles, shared KMS keys), reports **unused access** (roles, keys and permissions not used recently), validates policies, and can **generate least-privilege policies** from actual CloudTrail activity."
      }
    ],
    diagram: {
      title: "SCP ceiling across an organization",
      groups: [
        { id: "org", label: "AWS Organization", kind: "cloud", x: 3, y: 3, w: 94, h: 54 },
        { id: "ou", label: "OU: Workloads/Prod", kind: "generic", x: 36, y: 18, w: 58, h: 36 }
      ],
      nodes: [
        { id: "mgmt", label: "Management acct", icon: "organizations", x: 15, y: 14, sub: "billing + policy" },
        { id: "scp", label: "SCP", icon: "scp", x: 15, y: 40, sub: "deny StopLogging" },
        { id: "admin", label: "Account admin", icon: "user", x: 46, y: 28, sub: "AdministratorAccess" },
        { id: "dev", label: "Developer role", icon: "iam-role", x: 46, y: 46, sub: "boundary attached" },
        { id: "trail", label: "CloudTrail", icon: "cloudtrail", x: 82, y: 28, sub: "org trail" },
        { id: "fn", label: "Lambda role", icon: "lambda", x: 82, y: 46, sub: "capped by boundary" }
      ],
      edges: [
        { id: "e-mgmt", from: "mgmt", to: "scp", label: "attaches" },
        { id: "e-scp", from: "scp", to: "admin", label: "ceiling on OU" },
        { id: "e-stop", from: "admin", to: "trail", label: "StopLogging" },
        { id: "e-create", from: "dev", to: "fn", label: "CreateRole" }
      ],
      steps: [
        { caption: "The management account owns the organization and attaches an SCP to the Prod OU denying cloudtrail:StopLogging and DeleteTrail.", highlight: ["mgmt", "scp", "e-mgmt"], flow: [{ edge: "e-mgmt" }] },
        { caption: "The SCP is a ceiling on every principal in every account under the OU, including the root user and administrators.", highlight: ["ou", "e-scp", "admin"], flow: [{ edge: "e-scp" }] },
        { caption: "A member-account admin with AdministratorAccess tries to stop the trail. Their IAM policy allows it, but the SCP denies it: explicit deny wins.", highlight: ["admin", "trail", "e-stop"], flow: [{ edge: "e-stop", color: "bad" }], fail: ["e-stop"] },
        { caption: "Inside the account, a developer may create roles only if they attach the approved permissions boundary.", highlight: ["dev", "e-create"], flow: [{ edge: "e-create" }] },
        { caption: "Even if the developer attaches AdministratorAccess to the new Lambda role, it can never exceed the boundary. Delegation without escalation.", highlight: ["fn"] }
      ]
    },
    keyFacts: [
      "SCPs and permissions boundaries never grant permissions; they only set a maximum.",
      "SCPs affect all principals in member accounts, including root, but not the management account or service-linked roles.",
      "An action must be allowed by SCPs at every level from the root to the account.",
      "Default SCP: FullAWSAccess. Removing it without a replacement denies everything.",
      "OUs nest up to 5 levels; up to 5 SCPs attached per node.",
      "Consolidated billing aggregates usage for volume discounts and shares RI/Savings Plans benefits.",
      "Effective permissions = identity policy ∩ permissions boundary ∩ SCP (∩ session policy).",
      "RCPs (2024) cap access to resources such as S3, KMS, SQS, Secrets Manager and STS across the org.",
      "Control Tower controls: preventive (SCP), detective (Config rules), proactive (CloudFormation hooks)."
    ],
    examTips: [
      "'Ensure no identity in any member account, including administrators, can disable CloudTrail' → SCP denying cloudtrail:StopLogging/DeleteTrail on the root or OUs.",
      "IAM Deny policies in each account and permissions boundaries are wrong for that requirement: account admins can edit or detach them.",
      "'Restrict all accounts to approved Regions' → SCP with aws:RequestedRegion condition.",
      "'Let developers create roles without escalating privileges' → permissions boundary + condition on iam:CreateRole.",
      "'Set up a governed multi-account environment quickly' → AWS Control Tower.",
      "'Find S3 buckets or roles shared with external accounts' → IAM Access Analyzer.",
      "'Prevent any principal outside the org from reaching our buckets regardless of bucket policies' → RCP (data perimeter)."
    ],
    pitfalls: [
      "Expecting an SCP to restrict the management account. It doesn't.",
      "Attaching an Allow-only SCP after removing FullAWSAccess and forgetting services the workloads need.",
      "Thinking SCPs give permissions. An SCP allowing s3:* still requires an IAM Allow.",
      "Using a permissions boundary to stop account admins; admins can remove boundaries unless an SCP prevents it.",
      "Running production workloads in the management account, where SCPs can't protect them."
    ],
    prosCons: [
      {
        option: "SCP deny-list strategy",
        pros: ["Low maintenance: new AWS services work automatically", "Easy to read: lists what is forbidden"],
        cons: ["New risky services are allowed until you add a deny"],
        useWhen: "Most organisations; targeted guardrails such as protecting CloudTrail or restricting Regions."
      },
      {
        option: "SCP allow-list strategy",
        pros: ["Strictest: only approved services usable"],
        cons: ["Every new service must be explicitly added", "Easy to break workloads"],
        useWhen: "Highly regulated environments with an approved-services catalogue."
      },
      {
        option: "Permissions boundary",
        pros: ["Fine-grained, per identity", "Enables self-service role creation safely"],
        cons: ["Account admins can remove it", "Adds policy complexity"],
        useWhen: "Delegating IAM administration inside a single account."
      }
    ],
    services: ["organizations", "scp", "iam", "control-tower", "cloudtrail", "config", "iam-role"]
  },

  // ------------------------------------------------------------------ 7
  {
    id: "m1-federation",
    module: "m1",
    domain: "secure",
    title: "Federation, IAM Identity Center & Cognito",
    minutes: 18,
    summary: "Pick the right sign-in service for employees, application customers and Active Directory workloads, and explain how each trades an external identity for temporary AWS credentials.",
    analogy: {
      title: "Showing your passport instead of getting a local ID card",
      body: "When you check into a hotel abroad, the hotel doesn't issue you a new national ID. You show the passport your own country gave you, the front desk trusts that government, and hands you a room key card that works until checkout. **Federation** works the same way: your company (or Google, or Apple) vouches for who you are, AWS trusts that voucher, and STS hands out a temporary key card (role credentials).\n\n**IAM Identity Center** is the front desk for employees, giving out keys to many buildings (accounts) from one counter. **Cognito** is the front desk for your app's customers: it can run the guest registry itself (user pools) and also hand out limited keys to the gym and pool (identity pools: AWS credentials)."
    },
    sections: [
      {
        heading: "What federation means",
        body: "Creating an IAM user for every person does not scale and creates thousands of long-term passwords and keys. **Federation** means an external **identity provider (IdP)** authenticates the person, and AWS (the **service provider**) trusts the IdP's assertion and exchanges it for **temporary role credentials** from STS.\n\nVocabulary:\n\n- **SAML 2.0**: an XML-based standard used by enterprise IdPs (Microsoft Entra ID, Okta, AD FS, Ping) to send a signed assertion saying 'this is alice, she is in group Admins'.\n- **OpenID Connect (OIDC)**: a modern JSON/JWT-based standard built on OAuth 2.0, used by Google, Apple, Facebook, GitHub Actions and many IdPs.\n- **SCIM**: a standard for automatically **provisioning** users and groups from the IdP into the service, so that a leaver removed from Okta disappears from AWS too.\n- **JWT (JSON Web Token)**: a signed token carrying identity claims; apps and API Gateway can verify it without calling the issuer."
      },
      {
        heading: "IAM Identity Center: workforce access to many accounts",
        body: "**AWS IAM Identity Center** (formerly AWS SSO) is the recommended way for employees to reach the AWS console and CLI across all accounts in an organization.\n\nHow it works:\n\n- Choose one **identity source**: the built-in Identity Center directory, Active Directory (via AWS Managed Microsoft AD or AD Connector), or an **external IdP** over SAML 2.0 (with SCIM for automatic provisioning).\n- Define **permission sets**: templates of IAM policies such as 'ReadOnly' or 'NetworkAdmin'.\n- **Assign** a user or group + permission set + one or more accounts. Identity Center creates a matching IAM role in each account for you.\n- Users sign in once to the **AWS access portal**, pick an account and role, and get temporary credentials. The CLI uses `aws sso login` the same way.\n\nIt also supports MFA, attribute-based access control using IdP attributes, and single sign-on to SAML business apps. Instance-level Identity Center can also be used in a standalone account, but the organization instance is what the exam means."
      },
      {
        heading: "Direct SAML federation with STS (legacy pattern)",
        body: "Before Identity Center, companies configured each account separately: create an **IAM SAML identity provider** in the account, create roles whose trust policy trusts that provider, and have the corporate IdP post a SAML assertion to the AWS sign-in endpoint. STS `AssumeRoleWithSAML` returns role credentials.\n\nThis still works and appears in older-style questions. Its weakness is per-account setup; with 15 or 50 accounts, Identity Center is the better answer. The STS calls behind federation:",
        table: {
          headers: ["STS API", "Used by"],
          rows: [
            ["AssumeRole", "IAM users/roles switching role, cross-account access, services"],
            ["AssumeRoleWithSAML", "Enterprise SAML IdP federation into a role"],
            ["AssumeRoleWithWebIdentity", "OIDC tokens (EKS pods via IRSA, GitHub Actions); for mobile apps prefer Cognito"],
            ["GetSessionToken", "An IAM user obtaining MFA-backed temporary credentials"],
            ["GetFederationToken", "Legacy custom identity broker for federated users"]
          ]
        }
      },
      {
        heading: "Cognito user pools: a user directory for your app",
        body: "**Amazon Cognito user pools** are a fully managed user directory for **your application's customers** (millions of users, not employees). Features:\n\n- Sign-up and sign-in with username/email + password, password policies, account recovery.\n- **MFA** (SMS, TOTP authenticator apps, email) and passwordless options (passkeys, one-time codes).\n- **Social and enterprise sign-in**: Google, Apple, Facebook, Amazon, and any SAML or OIDC IdP, so users can 'Sign in with Google'.\n- A hosted sign-in UI (**Managed Login**) so you don't build login pages.\n- **Lambda triggers** to customise flows (pre-sign-up validation, migrating users, custom messages).\n- Issues **JWTs**: an ID token (who the user is), an access token (what they may call) and a refresh token.\n\nThose JWTs are validated by your app, by **API Gateway** (Cognito user pool authorizer) or by an **ALB** (built-in authentication action), so the backend never handles passwords."
      },
      {
        heading: "Cognito identity pools: AWS credentials for app users",
        body: "A user pool proves who someone is but gives them no AWS permissions. When the app must call AWS directly from the device (upload a photo straight to S3, write to DynamoDB), use a **Cognito identity pool** (federated identities).\n\n- The app exchanges a token (from a user pool, Google, Apple, Facebook, SAML or OIDC) for **temporary AWS credentials** via STS.\n- Identity pools map users to IAM roles: an **authenticated role** for signed-in users and an optional **unauthenticated (guest) role** with very limited rights.\n- Policy variables give per-user isolation, for example allow `s3:PutObject` only on `arn:aws:s3:::photos/${cognito-identity.amazonaws.com:sub}/*` so each user writes only to their own prefix.\n\nShort version: **user pools = authentication (who are you), identity pools = authorization to AWS (here are AWS credentials)**. Many apps use both together."
      },
      {
        heading: "AWS Directory Service for Active Directory workloads",
        body: "Some workloads need real Microsoft **Active Directory (AD)**: Windows servers that join a domain, SQL Server with Windows authentication, SharePoint, Group Policy. AWS Directory Service offers three options:",
        table: {
          headers: ["Option", "What it is", "Choose when"],
          rows: [
            ["AWS Managed Microsoft AD", "Real AD domain controllers run by AWS, multi-AZ", "AD-aware apps in AWS; need a two-way trust with on-prem AD; FSx for Windows, RDS SQL Server Windows auth"],
            ["AD Connector", "A proxy that forwards authentication to your on-prem AD; stores nothing", "Use existing on-prem AD for sign-in (Identity Center, WorkSpaces) without copying the directory to AWS"],
            ["Simple AD", "Samba-based, AD-compatible, low cost", "Small, basic needs; no trusts, no MFA; rarely the exam answer"]
          ]
        }
      },
      {
        heading: "Decision table and exam angle",
        body: "Map 'who is signing in?' to the service. Creating thousands of IAM users is never the answer.",
        table: {
          headers: ["Who is signing in?", "Service", "Key signal in the question"],
          rows: [
            ["Employees, many AWS accounts, console/CLI", "IAM Identity Center + permission sets", "'centralized', 'single sign-on', 'multiple accounts', 'corporate IdP'"],
            ["Employees, single account, legacy SAML", "IAM SAML provider + AssumeRoleWithSAML", "'SAML 2.0 assertion', older setups"],
            ["App customers sign up / sign in", "Cognito user pools", "'millions of users', 'social login', 'MFA for customers', 'JWT'"],
            ["App customers need AWS credentials", "Cognito identity pools", "'upload directly to S3 from the mobile app', 'guest access'"],
            ["Windows/AD-aware apps, trust with on-prem", "AWS Managed Microsoft AD", "'domain join', 'trust relationship', 'Group Policy'"],
            ["Use on-prem AD credentials without syncing", "AD Connector", "'proxy', 'no directory data in the cloud'"]
          ]
        }
      }
    ],
    diagram: {
      title: "Workforce vs customer federation",
      groups: [
        { id: "work", label: "Workforce", kind: "generic", x: 3, y: 4, w: 94, h: 22 },
        { id: "cust", label: "App customers", kind: "generic", x: 3, y: 34, w: 94, h: 22 }
      ],
      nodes: [
        { id: "emp", label: "Employee", icon: "user", x: 9, y: 15 },
        { id: "idp", label: "Corporate IdP", icon: "server", x: 27, y: 15, sub: "Okta / Entra ID" },
        { id: "idc", label: "Identity Center", icon: "iam-identity-center", x: 47, y: 15, sub: "permission sets" },
        { id: "role", label: "Role in account", icon: "iam-role", x: 68, y: 15, sub: "15 accounts" },
        { id: "console", label: "AWS console", icon: "ec2", x: 88, y: 15 },
        { id: "app", label: "Mobile app", icon: "mobile", x: 9, y: 45 },
        { id: "up", label: "User pool", icon: "cognito", x: 30, y: 45, sub: "sign-in, MFA, JWT" },
        { id: "ip", label: "Identity pool", icon: "cognito", x: 50, y: 45, sub: "token → creds" },
        { id: "sts", label: "STS", icon: "sts", x: 70, y: 45, sub: "temp creds" },
        { id: "s3", label: "Photos bucket", icon: "s3", x: 88, y: 45, sub: "own prefix only" }
      ],
      edges: [
        { id: "w1", from: "emp", to: "idp", label: "sign in + MFA" },
        { id: "w2", from: "idp", to: "idc", label: "SAML" },
        { id: "w3", from: "idc", to: "role", label: "assume" },
        { id: "w4", from: "role", to: "console" },
        { id: "c1", from: "app", to: "up", label: "password" },
        { id: "c2", from: "up", to: "ip", label: "ID token" },
        { id: "c3", from: "ip", to: "sts" },
        { id: "c4", from: "sts", to: "s3", label: "PutObject" }
      ],
      steps: [
        { caption: "An employee signs in once to the corporate IdP with MFA. No IAM user exists for them.", highlight: ["emp", "idp", "w1"], flow: [{ edge: "w1" }] },
        { caption: "The IdP sends a SAML assertion to IAM Identity Center, which knows the user's group assignments (synced by SCIM).", highlight: ["idc", "w2"], flow: [{ edge: "w2" }] },
        { caption: "The user picks an account; Identity Center assumes the role created from the permission set and returns temporary credentials.", highlight: ["role", "w3", "w4", "console"], flow: [{ edge: "w3" }, { edge: "w4" }] },
        { caption: "Customers are different: a mobile user signs in to a Cognito user pool, which handles passwords, MFA and social login, and returns JWTs.", highlight: ["app", "up", "c1"], flow: [{ edge: "c1" }, { edge: "c1", reverse: true }] },
        { caption: "To call AWS directly, the app trades its ID token at a Cognito identity pool, which maps the user to an authenticated IAM role.", highlight: ["ip", "c2", "c3", "sts"], flow: [{ edge: "c2" }, { edge: "c3" }] },
        { caption: "With temporary credentials the app uploads straight to S3, limited by policy variables to the user's own prefix.", highlight: ["s3", "c4"], flow: [{ edge: "c4" }] }
      ]
    },
    keyFacts: [
      "IAM Identity Center (formerly AWS SSO) is the default for workforce access to multiple accounts.",
      "Permission sets in Identity Center become IAM roles in each assigned account.",
      "Identity Center identity sources: its own directory, Active Directory, or an external SAML 2.0 IdP (with SCIM provisioning).",
      "Cognito user pools = authentication for app users; issue ID, access and refresh JWTs.",
      "Cognito identity pools = temporary AWS credentials for app users, with authenticated and guest roles.",
      "ALB and API Gateway can validate Cognito user pool tokens natively.",
      "AWS Managed Microsoft AD supports trusts with on-prem AD; AD Connector is a proxy that stores no directory data.",
      "SAML federation into a role uses STS AssumeRoleWithSAML; OIDC uses AssumeRoleWithWebIdentity."
    ],
    examTips: [
      "'Employees authenticate to a corporate IdP and need console access to 15 accounts, centrally managed' → IAM Identity Center with permission sets assigned to groups.",
      "IAM users in each account is wrong (N×accounts credentials); Cognito is wrong for workforce access to AWS accounts.",
      "'Millions of mobile users, sign-up, social login' → Cognito user pools.",
      "'Mobile app must upload directly to S3 with per-user access' → Cognito identity pool + IAM role with policy variables.",
      "'AD-aware application' or 'two-way trust with on-prem AD' → AWS Managed Microsoft AD.",
      "'Use existing on-prem AD credentials without replicating the directory' → AD Connector.",
      "'Authenticate users at the load balancer without changing app code' → ALB authentication action with Cognito or OIDC."
    ],
    pitfalls: [
      "Using Cognito for employee access to AWS accounts. That is Identity Center's job.",
      "Confusing user pools (who you are, JWTs) with identity pools (AWS credentials).",
      "Choosing Simple AD when the question needs trusts or MFA; it supports neither.",
      "Assuming AD Connector caches or syncs users; it only proxies requests to on-prem AD, so on-prem connectivity must be up.",
      "Creating IAM users for application customers. It never scales and violates best practice."
    ],
    prosCons: [
      {
        option: "IAM Identity Center",
        pros: ["One place to manage workforce access to all accounts", "Temporary credentials only", "Works with existing IdPs via SAML + SCIM"],
        cons: ["Designed for workforce, not app end users"],
        useWhen: "Employees or contractors need console/CLI access to AWS accounts."
      },
      {
        option: "Per-account IAM SAML federation",
        pros: ["No dependency on Organizations", "Fine-grained per-account control"],
        cons: ["Repeated setup in every account", "Harder to audit centrally"],
        useWhen: "Legacy setups or a single standalone account."
      },
      {
        option: "Cognito (user pools + identity pools)",
        pros: ["Scales to millions", "Social and enterprise IdPs", "Integrates with API Gateway, ALB, AppSync"],
        cons: ["Not for AWS console access", "Customising flows needs Lambda triggers"],
        useWhen: "End users of your web or mobile application."
      }
    ],
    services: ["iam-identity-center", "cognito", "sts", "iam-role", "directory-service", "organizations", "s3", "alb", "api-gateway"]
  },

  // ------------------------------------------------------------------ 8
  {
    id: "m1-vpc-cidr",
    module: "m1",
    domain: "secure",
    title: "VPCs & CIDR from Scratch",
    minutes: 18,
    summary: "Read and plan CIDR blocks, size VPCs and subnets correctly (including AWS's 5 reserved addresses), and avoid overlapping ranges that block peering and hybrid connectivity.",
    analogy: {
      title: "A gated housing estate and its street addresses",
      body: "A **VPC** is a private gated estate you build inside AWS's city. Nobody gets in or out unless you build a gate. Before building, you register the **range of street numbers** the estate owns: that is the **CIDR block**. A /16 is a big estate with 65,536 house numbers; a /28 is a cul-de-sac with 16.\n\n**Subnets** are the individual streets, and each street sits entirely inside one neighbourhood (one Availability Zone). The estate office keeps the first four and last house number on every street for itself (mailroom, signpost, and so on), so you can't move into those. If you later want a private road to a neighbouring estate, your house numbers must not clash with theirs, or the postman won't know where to deliver."
    },
    sections: [
      {
        heading: "What a VPC is",
        body: "A **Virtual Private Cloud (VPC)** is your logically isolated private network inside one AWS **Region**. It spans all the AZs of that Region; you place resources in AZs by creating subnets. Nothing reaches the internet, and nothing reaches in, until you add gateways and routes.\n\nEvery Region gives each account a **default VPC** (`172.31.0.0/16`) with a public `/20` subnet in each AZ, an internet gateway, and auto-assigned public IPs, so beginners can launch an instance instantly. For production you build a **custom VPC** with deliberate CIDRs, public and private subnets. You can create 5 VPCs per Region by default (a soft quota)."
      },
      {
        heading: "IP addresses and CIDR notation in two minutes",
        body: "An IPv4 address is 32 bits, written as four 8-bit numbers (octets) from 0 to 255: `10.0.1.25`.\n\n**CIDR (Classless Inter-Domain Routing)** notation writes a range as `address/prefix`. The prefix says how many leading bits are **fixed**; the remaining bits are yours to assign. Number of addresses = 2^(32 − prefix).\n\n- `10.0.0.0/16`: first 16 bits (`10.0`) fixed, 16 bits free → 2^16 = 65,536 addresses, `10.0.0.0` to `10.0.255.255`.\n- `10.0.1.0/24`: first 24 bits fixed → 2^8 = 256 addresses, `10.0.1.0` to `10.0.1.255`.\n- `10.0.1.0/28`: → 2^4 = 16 addresses, `10.0.1.0` to `10.0.1.15`.\n\nThe bigger the prefix number, the smaller the network. Each +1 to the prefix halves the size. `0.0.0.0/0` means 'every IPv4 address' (used for default routes). A `/32` is exactly one address (used in security group rules for a single host).",
        table: {
          headers: ["Prefix", "Total addresses", "Usable in an AWS subnet", "Typical use"],
          rows: [
            ["/16", "65,536", "65,531", "Largest allowed VPC"],
            ["/18", "16,384", "16,379", "Large subnet (EKS clusters with many pods)"],
            ["/20", "4,096", "4,091", "Default VPC subnets"],
            ["/22", "1,024", "1,019", "Medium subnet"],
            ["/24", "256", "251", "Most common subnet"],
            ["/26", "64", "59", "Small subnet"],
            ["/27", "32", "27", "Small subnet (e.g. NAT/endpoints)"],
            ["/28", "16", "11", "Smallest allowed VPC or subnet"]
          ]
        }
      },
      {
        heading: "Private address ranges and VPC CIDR rules",
        body: "Use the **RFC 1918** private ranges, which are never routed on the public internet:\n\n- `10.0.0.0/8` (10.0.0.0 to 10.255.255.255)\n- `172.16.0.0/12` (172.16.0.0 to 172.31.255.255)\n- `192.168.0.0/16` (192.168.0.0 to 192.168.255.255)\n\nVPC CIDR rules:\n\n- A VPC's IPv4 CIDR must be between **/16 and /28**.\n- You cannot change the primary CIDR after creation, but you can **add secondary CIDRs** (up to 5 IPv4 CIDRs per VPC by default) when you run out of space.\n- Plan ranges that **don't overlap** with other VPCs, other Regions or your office/data-center networks. Overlapping CIDRs can't be peered, and routing to on-prem breaks. The usual trick: give each VPC its own /16 from `10.x.0.0`, and keep on-prem on a different block.\n- **Amazon VPC IP Address Manager (IPAM)** can allocate and track non-overlapping CIDRs across an organization."
      },
      {
        heading: "Subnets and the 5 reserved addresses",
        body: "A **subnet** is a slice of the VPC CIDR that lives in exactly **one AZ** (it cannot span AZs). To run in three AZs, you create at least one subnet per AZ. Subnets in the same VPC can't overlap, and like VPCs they range from /16 to /28.\n\nAWS reserves **5 addresses in every subnet**. For `10.0.1.0/24`:\n\n- `10.0.1.0`: network address.\n- `10.0.1.1`: VPC router.\n- `10.0.1.2`: Amazon-provided DNS (the VPC base + 2).\n- `10.0.1.3`: reserved for future use.\n- `10.0.1.255`: broadcast (VPCs don't support broadcast, but it's reserved anyway).\n\nSo a /24 has **251 usable** addresses and a /28 only **11**. Exam sizing questions love this: 'needs 29 instances' → a /27 gives only 27 usable, so you need a /26."
      },
      {
        heading: "IPv6 in a VPC",
        beyond: true,
        body: "You can add IPv6 to a VPC (dual-stack) or even create IPv6-only subnets. AWS assigns a `/56` to the VPC (Amazon-provided or your own via BYOIP), and each subnet gets a `/64`.\n\nIPv6 addresses are **globally unique and publicly routable** by nature: there is no NAT. To let private IPv6 resources reach out without allowing inbound connections, use an **egress-only internet gateway**. Why it matters: public IPv4 addresses cost $0.005 per hour each since February 2024, so IPv6 can reduce cost for large fleets."
      },
      {
        heading: "Walkthrough: planning a production VPC",
        body: "A company wants a production VPC across 3 AZs, with room to grow, that will later connect to an office using `192.168.0.0/16` and to another VPC using `10.1.0.0/16`.\n\n- Pick `10.0.0.0/16` for this VPC: no overlap with the office or the other VPC, and 65,536 addresses of headroom.\n- Public subnets (load balancers, NAT gateways): `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24`, one per AZ.\n- Private app subnets: `10.0.10.0/24`, `10.0.11.0/24`, `10.0.12.0/24`.\n- Private database subnets: `10.0.20.0/24`, `10.0.21.0/24`, `10.0.22.0/24`.\n- That uses 9 × 256 = 2,304 addresses, leaving over 60,000 free for new tiers or larger subnets later.\n\nWhy not size everything as /28? Auto Scaling, Lambda in a VPC, EKS pods and interface endpoints all consume IPs; running out forces a painful rebuild. Size generously; private addresses are free."
      }
    ],
    diagram: {
      title: "Carving a VPC into subnets",
      groups: [
        { id: "vpc", label: "VPC 10.0.0.0/16", kind: "vpc", x: 25, y: 3, w: 72, h: 54 },
        { id: "aza", label: "AZ a", kind: "az", x: 28, y: 8, w: 32, h: 46 },
        { id: "azb", label: "AZ b", kind: "az", x: 63, y: 8, w: 32, h: 46 },
        { id: "puba", label: "Public 10.0.0.0/24", kind: "subnet-public", x: 30, y: 12, w: 28, h: 17 },
        { id: "priva", label: "Priv 10.0.10.0/24", kind: "subnet-private", x: 30, y: 33, w: 28, h: 17 },
        { id: "pubb", label: "Public 10.0.1.0/24", kind: "subnet-public", x: 65, y: 12, w: 28, h: 17 },
        { id: "privb", label: "Priv 10.0.11.0/24", kind: "subnet-private", x: 65, y: 33, w: 28, h: 17 }
      ],
      nodes: [
        { id: "ea1", label: "Web server", icon: "ec2", x: 44, y: 21, sub: "10.0.0.10" },
        { id: "ea2", label: "App server", icon: "ec2", x: 44, y: 42, sub: "10.0.10.20" },
        { id: "eb1", label: "Web server", icon: "ec2", x: 79, y: 21, sub: "10.0.1.10" },
        { id: "eb2", label: "App server", icon: "ec2", x: 79, y: 42, sub: "10.0.11.20" },
        { id: "office", label: "Old office", icon: "onprem", x: 11, y: 30, sub: "10.0.0.0/16 overlaps" }
      ],
      edges: [
        { id: "e-local", from: "ea1", to: "eb2", label: "local route" },
        { id: "e-office", from: "office", to: "ea2", label: "VPN?", dashed: true }
      ],
      steps: [
        { caption: "The VPC owns 10.0.0.0/16: the first 16 bits are fixed, leaving 65,536 addresses in one Region.", highlight: ["vpc"] },
        { caption: "Each subnet is a slice of that range in exactly one AZ. 10.0.0.0/24 has 256 addresses, 251 usable after AWS reserves 5.", highlight: ["aza", "puba", "ea1"] },
        { caption: "A private subnet in the same AZ takes a different, non-overlapping slice: 10.0.10.0/24.", highlight: ["priva", "ea2"] },
        { caption: "Mirror the layout in AZ b with new ranges (10.0.1.0/24, 10.0.11.0/24). This is how multi-AZ starts.", highlight: ["azb", "pubb", "privb", "eb1", "eb2"] },
        { caption: "Every subnet can reach every other through the built-in local route for 10.0.0.0/16.", highlight: ["e-local", "ea1", "eb2"], flow: [{ edge: "e-local" }] },
        { caption: "An office network that also uses 10.0.0.0/16 can't be routed or peered: the router can't tell which 10.0.10.20 you mean. Plan non-overlapping CIDRs up front.", highlight: ["office", "e-office"], flow: [{ edge: "e-office", color: "bad" }], fail: ["e-office"] }
      ]
    },
    keyFacts: [
      "Addresses in a CIDR block = 2^(32 − prefix): /16 = 65,536, /24 = 256, /28 = 16.",
      "VPC and subnet IPv4 CIDRs must be between /16 and /28.",
      "AWS reserves 5 addresses per subnet: .0 network, .1 router, .2 DNS, .3 future, last = broadcast.",
      "Usable IPs: /24 = 251, /27 = 27, /28 = 11.",
      "A VPC is Regional; a subnet lives in exactly one AZ.",
      "Primary CIDR can't be changed; add secondary CIDRs (up to 5 IPv4 CIDRs per VPC by default).",
      "RFC 1918 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
      "Default VPC uses 172.31.0.0/16 with a /20 public subnet per AZ.",
      "IPv6: VPC gets a /56, each subnet a /64; all IPv6 addresses are public (no NAT)."
    ],
    examTips: [
      "'Needs N IP addresses' → subtract 5 per subnet before choosing a prefix (29 hosts needs a /26, not a /27).",
      "'VPC is running out of IP addresses' → add a secondary CIDR block (you can't resize the primary).",
      "'Connect two VPCs / VPC to on-prem, but CIDRs overlap' → peering and routing fail; re-address, or use PrivateLink, which tolerates overlap.",
      "'Plan CIDRs across many accounts without overlap' → Amazon VPC IPAM.",
      "'Multi-AZ' in networking terms means at least one subnet per AZ."
    ],
    pitfalls: [
      "Forgetting the 5 reserved addresses when sizing subnets.",
      "Thinking a subnet can span two AZs. It can't.",
      "Choosing a VPC CIDR that overlaps the corporate network, blocking a future VPN or Direct Connect.",
      "Believing a larger prefix number means a larger network. /28 is smaller than /16.",
      "Trying to create a /8 or /12 VPC. The largest allowed is /16."
    ],
    services: ["vpc", "subnet", "route-table"]
  },

  // ------------------------------------------------------------------ 9
  {
    id: "m1-subnets-routing",
    module: "m1",
    domain: "secure",
    title: "Subnets, Route Tables, IGW & NAT",
    minutes: 20,
    summary: "Explain exactly what makes a subnet public or private, route traffic through internet and NAT gateways, design highly available egress, and diagnose 'why can't I reach my instance?' questions.",
    analogy: {
      title: "Road signs at the end of every street",
      body: "Each street (subnet) in your estate has a signpost (route table) at its exit. The sign always says 'other streets in the estate: turn left' (the local route). On some streets the sign also says 'everything else: motorway entrance' (a route to the internet gateway); those are **public** streets. On private streets there is no motorway sign, so outsiders can't drive in.\n\nResidents of private streets still need to pop out for groceries. They use a **courier office** (the NAT gateway) on a public street: the courier goes out on their behalf, brings back the delivery, and never gives outsiders the resident's address."
    },
    sections: [
      {
        heading: "Route tables: how packets leave a subnet",
        body: "A **route table** is a list of rules: 'traffic for this destination CIDR goes to this target'. Every subnet is associated with **exactly one** route table (a table can serve many subnets). If you don't associate one, the subnet uses the VPC's **main route table**; best practice is to keep the main table private and create custom tables for public subnets.\n\nEvery route table contains the **local route** for the VPC CIDR, which can't be deleted: all subnets in a VPC can reach each other by default (security groups and NACLs then decide what's allowed).\n\nWhen several routes match, the **most specific (longest prefix) wins**. Example public route table:",
        table: {
          headers: ["Destination", "Target", "Meaning"],
          rows: [
            ["10.0.0.0/16", "local", "Anything inside the VPC stays inside"],
            ["0.0.0.0/0", "igw-0abc", "Everything else goes to the internet gateway"],
            ["pl-63a5400a (S3 prefix list)", "vpce-0123", "S3 traffic goes to the gateway endpoint (added automatically)"],
            ["192.168.0.0/16", "vgw-0def / tgw-0123", "Office network via VPN or Transit Gateway"]
          ]
        }
      },
      {
        heading: "Public vs private subnet: it's just routing",
        body: "A **public subnet** is simply a subnet whose route table has a route `0.0.0.0/0 → internet gateway`. A **private subnet** has no such route. There is no 'public' checkbox; it's the routing.\n\nFor an instance to be reachable from the internet it needs **all** of:\n\n- a **public IPv4 address** or Elastic IP (the 'auto-assign public IP' subnet setting does this at launch),\n- a route `0.0.0.0/0 → IGW` in its subnet's route table,\n- **security group** inbound rules allowing the traffic, and\n- **NACL** rules allowing it in AND the replies out.\n\nMissing any one gives the classic 'why can't I reach my instance?' question. Work down that list in order."
      },
      {
        heading: "Internet gateway, public IPs and Elastic IPs",
        body: "The **Internet Gateway (IGW)** is the VPC's door to the internet. One per VPC, horizontally scaled, redundant and highly available by design, no bandwidth limit, and free (you pay only for data transfer). It performs one-to-one translation between an instance's private IP and its public IPv4 address.\n\n- An **auto-assigned public IP** is released when the instance stops; you get a new one on start.\n- An **Elastic IP (EIP)** is a static public IPv4 address you allocate to your account and can re-attach to another instance or ENI, useful for allow-listing by partners or quick failover.\n- Since February 2024, **all public IPv4 addresses**, attached or idle, cost $0.005 per hour (about $3.60 per month). Release unused EIPs.\n- Better than an EIP for web apps: put instances behind a load balancer and use DNS (Route 53), so instance IPs don't matter."
      },
      {
        heading: "NAT gateway: outbound-only internet for private subnets",
        body: "Private instances still need to **initiate** outbound connections: OS patches, calls to third-party APIs, downloading packages. A **NAT (Network Address Translation) gateway** lets them do this while blocking any connection initiated from the internet.\n\nHow it's built:\n\n- Create the NAT gateway in a **public subnet** with an **Elastic IP**.\n- In the **private** subnet's route table, add `0.0.0.0/0 → nat-gateway`.\n- The NAT gateway rewrites the source address to its EIP, sends traffic out via the IGW, and maps replies back.\n\nKey properties:\n\n- **AZ-scoped**: it's redundant inside its AZ, but if that AZ fails, so does the NAT. For HA, deploy **one NAT gateway per AZ** and route each private subnet to the NAT in its own AZ (this also avoids cross-AZ data charges).\n- Scales automatically from 5 Gbps up to 100 Gbps; no security groups (control with NACLs and instance SGs).\n- Cost: billed **per hour (~$0.045) plus per GB processed (~$0.045)** in us-east-1. Heavy S3 or DynamoDB traffic through NAT is a classic cost trap: use a free gateway endpoint instead.\n- A **private NAT gateway** (no EIP) lets private subnets reach other VPCs or on-prem networks with overlapping CIDRs via Transit Gateway or a virtual private gateway."
      },
      {
        heading: "NAT gateway vs NAT instance",
        body: "Before NAT gateways existed you ran a **NAT instance**: an EC2 instance from a NAT AMI with **source/destination check disabled** (by default EC2 drops traffic not addressed to itself). It's now legacy, but still appears as a distractor or for very low-cost labs.",
        table: {
          headers: ["", "NAT gateway", "NAT instance"],
          rows: [
            ["Managed by", "AWS", "You (patching, scaling, failover scripts)"],
            ["Availability", "Redundant within its AZ", "Single instance; you build failover"],
            ["Bandwidth", "5 to 100 Gbps auto-scaling", "Depends on instance type"],
            ["Security groups", "Not supported (use NACLs)", "Supported"],
            ["Port forwarding / bastion", "No", "Yes (can double as a bastion)"],
            ["Cost", "Hourly + per GB processed", "EC2 instance price only"],
            ["Exam answer when", "Almost always", "'Cheapest possible, low traffic, accept management'"]
          ]
        }
      },
      {
        heading: "Egress-only internet gateway and admin access",
        body: "- **Egress-only internet gateway**: the IPv6 equivalent of NAT. Because IPv6 addresses are public, an egress-only IGW allows outbound-initiated IPv6 traffic and blocks inbound connections. Route `::/0 → eigw`.\n- **Bastion host**: an instance in a public subnet that admins SSH into, then hop to private instances. It needs port 22 open (restricted to your office IP), key management and patching.\n- **AWS Systems Manager Session Manager** is the modern replacement: a browser or CLI shell into private instances with **no inbound ports, no SSH keys, no bastion**, IAM-controlled and fully logged to CloudWatch Logs or S3. The instance needs the SSM agent, an instance role, and a path to the SSM endpoints (NAT or interface endpoints).\n- **EC2 Instance Connect Endpoint** offers SSH/RDP to private instances without a bastion or public IP."
      },
      {
        heading: "Walkthrough: the standard production VPC",
        body: "A production VPC `10.0.0.0/16` across 3 AZs typically has 6 subnets:\n\n- **Public**: `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24`, sharing a route table with `0.0.0.0/0 → IGW`. They hold the ALB nodes and one NAT gateway per AZ.\n- **Private**: `10.0.10.0/24`, `10.0.11.0/24`, `10.0.12.0/24`, each with its own route table `0.0.0.0/0 → NAT in my AZ`. They hold app instances and databases.\n- A **gateway endpoint for S3** added to the private route tables so app-to-S3 traffic skips the NAT (free and private).\n\nThis picture sits behind a huge fraction of exam questions; be able to draw it from memory."
      }
    ],
    diagram: {
      title: "Public subnets, private subnets and NAT per AZ",
      groups: [
        { id: "vpc", label: "VPC 10.0.0.0/16", kind: "vpc", x: 26, y: 3, w: 71, h: 54 },
        { id: "aza", label: "AZ a", kind: "az", x: 29, y: 7, w: 32, h: 47 },
        { id: "azb", label: "AZ b", kind: "az", x: 64, y: 7, w: 32, h: 47 },
        { id: "puba", label: "Public → IGW", kind: "subnet-public", x: 31, y: 11, w: 28, h: 17 },
        { id: "priva", label: "Private → NAT a", kind: "subnet-private", x: 31, y: 33, w: 28, h: 17 },
        { id: "pubb", label: "Public → IGW", kind: "subnet-public", x: 66, y: 11, w: 28, h: 17 },
        { id: "privb", label: "Private → NAT b", kind: "subnet-private", x: 66, y: 33, w: 28, h: 17 }
      ],
      nodes: [
        { id: "inet", label: "Internet", icon: "internet", x: 7, y: 20 },
        { id: "igw", label: "Internet GW", icon: "internet-gateway", x: 18, y: 32, sub: "one per VPC" },
        { id: "nata", label: "NAT GW a", icon: "nat-gateway", x: 45, y: 20, sub: "Elastic IP" },
        { id: "appa", label: "App server", icon: "ec2", x: 45, y: 42, sub: "no public IP" },
        { id: "natb", label: "NAT GW b", icon: "nat-gateway", x: 80, y: 20, sub: "Elastic IP" },
        { id: "appb", label: "App server", icon: "ec2", x: 80, y: 42, sub: "no public IP" },
        { id: "att", label: "Inbound probe", icon: "attacker", x: 7, y: 48 }
      ],
      edges: [
        { id: "e-inet", from: "igw", to: "inet" },
        { id: "e-nata", from: "nata", to: "igw" },
        { id: "e-natb", from: "natb", to: "igw" },
        { id: "e-appa", from: "appa", to: "nata", label: "patches" },
        { id: "e-appb", from: "appb", to: "natb" },
        { id: "e-att", from: "att", to: "appa", label: "no route in", dashed: true }
      ],
      steps: [
        { caption: "Public subnets are public only because their route table sends 0.0.0.0/0 to the internet gateway.", highlight: ["puba", "pubb", "igw", "e-inet"] },
        { caption: "A private app server needs OS patches. Its route table sends 0.0.0.0/0 to the NAT gateway in its own AZ.", highlight: ["appa", "e-appa", "nata"], flow: [{ edge: "e-appa" }] },
        { caption: "The NAT gateway swaps the source address for its Elastic IP and sends the request out through the IGW.", highlight: ["nata", "e-nata", "e-inet", "inet"], flow: [{ edge: "e-nata" }, { edge: "e-inet" }] },
        { caption: "Replies come back the same way; the NAT maps them to the private instance.", highlight: ["e-inet", "e-nata", "e-appa"], flow: [{ edge: "e-inet", reverse: true }, { edge: "e-nata", reverse: true }, { edge: "e-appa", reverse: true }] },
        { caption: "Connections initiated from the internet can't reach the private instance: it has no public IP and its subnet has no route from the IGW.", highlight: ["att", "e-att"], flow: [{ edge: "e-att", color: "bad" }], fail: ["e-att"] },
        { caption: "AZ a fails and takes NAT a with it. AZ b's servers are unaffected because they use NAT b: one NAT gateway per AZ.", highlight: ["natb", "appb", "e-appb", "e-natb"], fail: ["aza"], flow: [{ edge: "e-appb" }, { edge: "e-natb" }] }
      ]
    },
    keyFacts: [
      "A subnet is public only if its route table has 0.0.0.0/0 → internet gateway.",
      "Every route table has an undeletable local route for the VPC CIDR; the most specific route wins.",
      "Each subnet is associated with exactly one route table; unassociated subnets use the main route table.",
      "One internet gateway per VPC; it is HA, has no bandwidth limit and costs nothing per hour.",
      "Internet-reachable instance needs: public IP, IGW route, SG allow, NACL allow (both directions).",
      "NAT gateway lives in a public subnet with an Elastic IP, is AZ-scoped, and scales 5 to 100 Gbps.",
      "NAT gateway costs ~$0.045/hour plus ~$0.045/GB processed (us-east-1).",
      "NAT gateways don't support security groups; NAT instances do and need source/dest check disabled.",
      "Egress-only internet gateway = outbound-only IPv6.",
      "Public IPv4 addresses (including Elastic IPs) cost $0.005/hour since February 2024."
    ],
    examTips: [
      "'Instances in a private subnet must download OS patches' → NAT gateway in a public subnet + private route 0.0.0.0/0 → NAT.",
      "'NAT must be highly available' → one NAT gateway per AZ, each private subnet routed to its own AZ's NAT.",
      "'High NAT gateway charges from S3/DynamoDB traffic' → add a gateway endpoint (free).",
      "'Instance has a public IP but isn't reachable' → check the IGW route, then SG, then NACL inbound and outbound.",
      "'Secure admin access to private instances without opening port 22 or a bastion' → Systems Manager Session Manager.",
      "'IPv6 instances need outbound internet only' → egress-only internet gateway."
    ],
    pitfalls: [
      "Placing the NAT gateway in a private subnet. It must be in a public subnet.",
      "Using one NAT gateway for all AZs and calling it highly available.",
      "Thinking a NAT gateway allows inbound connections. It never does.",
      "Expecting Elastic IPs to be free when idle. All public IPv4 addresses are billed hourly.",
      "Trying to attach a security group to a NAT gateway."
    ],
    prosCons: [
      {
        option: "NAT gateway",
        pros: ["Fully managed and redundant within its AZ", "Scales to 100 Gbps", "No patching"],
        cons: ["Hourly + per-GB cost", "AZ-scoped; need one per AZ for HA", "No security groups"],
        useWhen: "Default for private-subnet outbound internet access."
      },
      {
        option: "NAT instance",
        pros: ["Cheapest for tiny traffic", "Supports SGs and port forwarding"],
        cons: ["You patch, scale and fail it over", "Single point of failure", "Bandwidth limited by instance type"],
        useWhen: "Only when explicitly asked for the cheapest option with low traffic and management accepted."
      },
      {
        option: "Bastion host vs Session Manager",
        pros: ["Bastion: works with any SSH tooling", "Session Manager: no open ports, no keys, IAM-controlled, every session logged"],
        cons: ["Bastion: open port 22, key sprawl, another instance to patch", "Session Manager: needs SSM agent + instance role + endpoint/NAT path"],
        useWhen: "Session Manager for the 'most secure / least overhead' answer; bastion only for legacy constraints."
      }
    ],
    services: ["subnet", "route-table", "internet-gateway", "nat-gateway", "nat-instance", "elastic-ip", "vpc", "systems-manager"]
  },

  // ------------------------------------------------------------------ 10
  {
    id: "m1-sg-nacl",
    module: "m1",
    domain: "secure",
    title: "Security Groups vs Network ACLs",
    minutes: 18,
    summary: "Configure stateful security groups and stateless network ACLs, chain security groups between tiers, block a specific IP, and debug connectivity with VPC Flow Logs.",
    analogy: {
      title: "A personal bodyguard and a street checkpoint",
      body: "A **security group** is a bodyguard standing next to each person (instance). The bodyguard has a list of who may approach. Once a visitor is let in, the bodyguard remembers them and lets them leave without a second check: that is **stateful**. The bodyguard can only say 'yes, this person may approach'; there is no 'banned' list.\n\nA **network ACL** is a checkpoint at the entrance of the whole street (subnet). The guard checks everyone going in AND everyone coming out, against a numbered list read from the top, and has no memory: a visitor allowed in must be checked again on the way out (**stateless**). This guard can hold a banned list, which makes it the right tool for blocking one troublemaker."
    },
    sections: [
      {
        heading: "Two firewalls, two layers",
        body: "A VPC gives you two built-in packet filters, and traffic must pass **both**:\n\n- The **network ACL (NACL)** sits at the **subnet** boundary and applies to everything entering or leaving that subnet.\n- The **security group (SG)** sits on the **elastic network interface (ENI)** of each resource (EC2 instance, RDS database, Lambda in a VPC, load balancer, interface endpoint).\n\nInbound from the internet, a packet hits the NACL first, then the SG. Traffic between two instances in the same subnet never crosses the NACL, but still passes both instances' security groups.\n\nThe security group is your primary, per-tier access control. NACLs are a coarse subnet-level guardrail and the only VPC-native way to explicitly **block** an address."
      },
      {
        heading: "Security groups in depth",
        body: "- **Stateful**: if an inbound request is allowed, the reply is automatically allowed out (and vice versa), regardless of outbound rules.\n- **Allow rules only**: anything not allowed is denied. You cannot write a deny rule.\n- All rules are evaluated together (no ordering); if any rule matches, the traffic is allowed. Multiple SGs on one ENI are unioned.\n- A rule's source/destination can be a CIDR (`203.0.113.0/24`), a single IP (`/32`), a **managed prefix list** (for example the CloudFront origin-facing prefix list), or **another security group**.\n- Default for a new SG: **no inbound rules, all outbound allowed**. The VPC's default SG also allows inbound from members of itself.\n- Changes apply immediately to existing connections' future packets.\n- Quotas (adjustable): 60 inbound and 60 outbound rules per SG, 5 SGs per ENI by default (up to 16).\n- SGs are VPC-scoped and can be referenced across peered VPCs in the same Region."
      },
      {
        heading: "Network ACLs in depth",
        body: "- **Stateless**: return traffic is not remembered. You must allow both the request and the response, in both directions.\n- **Allow and Deny rules**, each with a **rule number** (1 to 32766). Rules are evaluated **lowest number first; the first match wins** and evaluation stops. A final `*` rule denies anything unmatched.\n- **Default NACL** (created with the VPC) allows all inbound and outbound traffic. A **custom NACL** you create denies everything until you add rules.\n- One NACL per subnet; one NACL can cover many subnets.\n- Rules reference CIDRs only, not security groups.\n- Default quota: 20 rules per direction (adjustable to 40).\n\n**Ephemeral ports**: when a client connects to your server on port 443, the client picks a random high source port for the reply (Linux uses 32768 to 60999, Windows 49152 to 65535; AWS guidance is to allow 1024 to 65535). With a stateless NACL, the outbound rule must allow TCP to those ephemeral ports or the response is dropped. Forgetting this is a favourite exam trap.",
        table: {
          headers: ["Rule #", "Direction", "Protocol / port", "Source / dest", "Action"],
          rows: [
            ["90", "Inbound", "All", "198.51.100.7/32", "DENY (block one attacker)"],
            ["100", "Inbound", "TCP 443", "0.0.0.0/0", "ALLOW"],
            ["*", "Inbound", "All", "0.0.0.0/0", "DENY"],
            ["100", "Outbound", "TCP 1024-65535", "0.0.0.0/0", "ALLOW (replies to clients)"],
            ["*", "Outbound", "All", "0.0.0.0/0", "DENY"]
          ]
        }
      },
      {
        heading: "Side-by-side comparison",
        body: "Memorise this table; most SG/NACL questions are a single row of it.",
        table: {
          headers: ["", "Security group", "Network ACL"],
          rows: [
            ["Attaches to", "ENI / instance (the resource)", "Subnet (everything in it)"],
            ["State", "Stateful: replies allowed automatically", "Stateless: allow the return path (ephemeral ports)"],
            ["Rule types", "Allow only", "Allow and Deny"],
            ["Evaluation", "All rules, any match allows", "By rule number, lowest first, first match wins"],
            ["Can reference", "CIDRs, prefix lists, other SGs", "CIDRs only"],
            ["Default", "Custom SG: no inbound, all outbound", "Default NACL: allow all; custom NACL: deny all"],
            ["Best for", "Primary per-tier access control", "Subnet guardrails; explicitly blocking IPs"]
          ]
        }
      },
      {
        heading: "Chaining security groups across tiers",
        body: "The standard 3-tier pattern references **security groups instead of IP addresses**:\n\n- **ALB SG** (`sg-alb`): inbound 443 from `0.0.0.0/0` (or only from the CloudFront managed prefix list, so nobody can bypass the CDN).\n- **App SG** (`sg-app`): inbound 8080 **from sg-alb** only.\n- **DB SG** (`sg-db`): inbound 3306 **from sg-app** only.\n\nInstances can scale in and out and change IPs freely; the rule follows group membership, not addresses. A new instance launched with `sg-app` can reach the database instantly, and nothing else can. Opening the app or DB tier to `0.0.0.0/0`, or to the whole VPC CIDR, is the 'mis-built layer' the exam wants you to spot.",
        table: {
          headers: ["Security group", "Inbound rule", "Source"],
          rows: [
            ["sg-alb", "TCP 443", "0.0.0.0/0 or CloudFront prefix list"],
            ["sg-app", "TCP 8080", "sg-alb"],
            ["sg-db", "TCP 3306 (MySQL) / 5432 (PostgreSQL)", "sg-app"]
          ]
        }
      },
      {
        heading: "Troubleshooting with VPC Flow Logs",
        body: "**VPC Flow Logs** capture metadata about IP traffic (source/destination IP and port, protocol, bytes, and ACCEPT or REJECT) at the VPC, subnet or ENI level, delivered to CloudWatch Logs, S3 or Amazon Data Firehose. They do not capture packet contents (use Traffic Mirroring for that).\n\nReading the pattern tells you which firewall blocked it:\n\n- Inbound **REJECT** → the SG or NACL inbound rule blocked the request.\n- Inbound **ACCEPT** but the matching outbound reply **REJECT** → the NACL (stateless) is missing the ephemeral-port outbound rule. A security group would never do this, because it is stateful.\n\nFlow logs are also the forensics answer for 'who talked to what', and GuardDuty analyses them automatically for threats."
      },
      {
        heading: "Beyond the VPC firewalls",
        beyond: true,
        body: "SGs and NACLs filter on IPs, ports and protocols (layers 3 and 4). For anything smarter, layer in:",
        table: {
          headers: ["Need", "Service"],
          rows: [
            ["Block SQL injection, XSS, bad bots, rate-limit by IP at layer 7", "AWS WAF on CloudFront, ALB, API Gateway, AppSync, Cognito"],
            ["Stateful inspection, domain allow-lists (e.g. only *.amazonaws.com outbound), IDS/IPS for a whole VPC", "AWS Network Firewall"],
            ["Insert third-party firewall appliances transparently", "Gateway Load Balancer"],
            ["Manage SGs, WAF and Network Firewall rules across many accounts", "AWS Firewall Manager"]
          ]
        }
      }
    ],
    diagram: {
      title: "NACL at the subnet, SG at the instance",
      groups: [
        { id: "vpc", label: "VPC 10.0.0.0/16", kind: "vpc", x: 22, y: 3, w: 75, h: 54 },
        { id: "sub", label: "Subnet 10.0.1.0/24", kind: "subnet-public", x: 42, y: 8, w: 52, h: 45 }
      ],
      nodes: [
        { id: "user", label: "Customer", icon: "user", x: 8, y: 16, sub: "HTTPS 443" },
        { id: "att", label: "Attacker", icon: "attacker", x: 8, y: 44, sub: "198.51.100.7" },
        { id: "nacl", label: "Network ACL", icon: "nacl", x: 31, y: 30, sub: "stateless, numbered" },
        { id: "sg", label: "sg-web", icon: "security-group", x: 54, y: 30, sub: "stateful, allow 443" },
        { id: "web", label: "Web server", icon: "ec2", x: 72, y: 18 },
        { id: "db", label: "Database", icon: "rds", x: 82, y: 44, sub: "3306 from sg-web" }
      ],
      edges: [
        { id: "e-user", from: "user", to: "nacl" },
        { id: "e-att", from: "att", to: "nacl" },
        { id: "e-nacl", from: "nacl", to: "sg" },
        { id: "e-sg", from: "sg", to: "web" },
        { id: "e-db", from: "web", to: "db", label: "3306" }
      ],
      steps: [
        { caption: "A customer's HTTPS request reaches the subnet. NACL rule 100 allows inbound TCP 443.", highlight: ["user", "nacl", "e-user"], flow: [{ edge: "e-user" }] },
        { caption: "The instance's security group allows 443 inbound, so the packet reaches the web server.", highlight: ["sg", "e-nacl", "e-sg", "web"], flow: [{ edge: "e-nacl" }, { edge: "e-sg" }] },
        { caption: "The reply leaves. The SG lets it out automatically (stateful), but the NACL needs an outbound rule for ephemeral ports 1024-65535.", highlight: ["sg", "nacl"], flow: [{ edge: "e-sg", reverse: true }, { edge: "e-nacl", reverse: true }, { edge: "e-user", reverse: true }] },
        { caption: "Auditors want one malicious IP blocked. SGs can't deny, so add NACL rule 90 DENY 198.51.100.7/32, numbered below the allow.", highlight: ["att", "nacl", "e-att"], flow: [{ edge: "e-att", color: "bad" }], fail: ["e-att"] },
        { caption: "The web tier reaches the database on 3306 because sg-db allows the source sg-web, not an IP range.", highlight: ["web", "db", "e-db"], flow: [{ edge: "e-db" }] },
        { caption: "Anything not explicitly allowed by the SG, such as SSH from the internet, is silently dropped at the instance.", highlight: ["sg"], fail: ["sg"], flow: [{ edge: "e-nacl", color: "bad" }] }
      ]
    },
    keyFacts: [
      "Security groups: stateful, allow-only, attached to ENIs, can reference other SGs.",
      "NACLs: stateless, allow and deny, attached to subnets, CIDRs only, lowest rule number wins.",
      "New custom SG: no inbound, all outbound. Default NACL: allow all. Custom NACL: deny all.",
      "NACL rule numbers 1-32766; evaluation stops at the first match; final * rule denies.",
      "Ephemeral ports: allow 1024-65535 outbound on NACLs for replies.",
      "Default quotas: 60 inbound + 60 outbound rules per SG; 5 SGs per ENI; 20 rules per NACL direction.",
      "Inbound path: NACL first, then SG. Same-subnet traffic skips the NACL.",
      "VPC Flow Logs record ACCEPT/REJECT metadata to CloudWatch Logs, S3 or Data Firehose; not packet contents."
    ],
    examTips: [
      "'Block a specific malicious IP from reaching a subnet' → NACL inbound DENY rule with a low rule number. SGs have no deny; removing the SG allow would block everyone.",
      "At the edge, WAF IP sets can also block IPs; pick NACL when the question is subnet-scoped.",
      "'Allow the app tier to reach the DB without hard-coding IPs as instances scale' → DB SG inbound from the app SG.",
      "'Inbound allowed, but responses never arrive' → stateless NACL missing the outbound ephemeral-port rule.",
      "'Determine why connections are being rejected' → VPC Flow Logs.",
      "'Only CloudFront may reach the ALB' → ALB SG source = CloudFront managed prefix list."
    ],
    pitfalls: [
      "Writing a deny rule in a security group. Not possible.",
      "Forgetting the NACL outbound rule for return traffic.",
      "Putting a broad ALLOW at rule 100 and the DENY at 200: the allow matches first, so the deny never fires.",
      "Opening the database SG to the VPC CIDR or 0.0.0.0/0 instead of the app SG.",
      "Assuming a custom NACL allows traffic like the default one. It denies everything until you add rules."
    ],
    prosCons: [
      {
        option: "Security group",
        pros: ["Stateful: no return rules", "Can reference other SGs (tier chaining)", "Per-resource granularity"],
        cons: ["No deny rules", "Can't block a single IP while allowing everyone else"],
        useWhen: "Primary access control for every tier."
      },
      {
        option: "Network ACL",
        pros: ["Explicit deny", "Applies to a whole subnet at once", "Defence in depth"],
        cons: ["Stateless: must manage return traffic", "CIDR-only, ordered rules, low rule quota"],
        useWhen: "Blocking specific IPs/ranges or adding a subnet-level guardrail."
      }
    ],
    services: ["security-group", "nacl", "vpc-flow-logs", "vpc", "subnet", "waf", "network-firewall"]
  },

  // ------------------------------------------------------------------ 11
  {
    id: "m1-private-connectivity",
    module: "m1",
    domain: "secure",
    title: "Endpoints, PrivateLink, Peering, Transit Gateway, VPN & Direct Connect",
    minutes: 25,
    summary: "Connect VPCs to AWS services, to each other and to on-premises networks privately, choosing between gateway/interface endpoints, peering, Transit Gateway, VPN and Direct Connect on cost, scale, bandwidth and encryption.",
    analogy: {
      title: "Private roads, bridges and a central bus station",
      body: "Your estate (VPC) needs to reach other places without driving on the public motorway. A **gateway endpoint** is a free private lane straight to two specific warehouses (S3 and DynamoDB). An **interface endpoint** is a private shop counter installed on your own street that serves almost any AWS service or a vendor; you pay rent for the counter.\n\n**Peering** is a private bridge between two estates; it doesn't let you continue across the neighbour's bridges to a third estate. A **Transit Gateway** is a central bus station: every estate builds one road to it and can then reach every other estate. To your head office you can run an **armoured car over the public motorway (VPN)**: quick to arrange and encrypted, but stuck in public traffic. Or you can build a **private railway line (Direct Connect)**: fast and predictable, but it takes weeks to lay and the carriages aren't locked unless you add locks."
    },
    sections: [
      {
        heading: "The problem",
        body: "By default, a private instance reaching S3 or another AWS service goes out through a NAT gateway to the service's **public endpoint**. That costs NAT per-GB fees, needs internet egress, and may break 'traffic must never traverse the internet' requirements. Connecting VPCs to each other or to a data center raises the same questions: privacy, bandwidth, latency, cost and how many networks you must connect.\n\nThere are three families of solutions: **VPC endpoints** (VPC → AWS or SaaS services), **VPC-to-VPC** links (peering, Transit Gateway) and **hybrid** links (Site-to-Site VPN, Direct Connect)."
      },
      {
        heading: "VPC endpoints: gateway vs interface",
        body: "VPC endpoints keep traffic to AWS services on the AWS network, with no IGW or NAT required.\n\n- **Gateway endpoints** exist for exactly two services: **S3 and DynamoDB**. You add the endpoint to route tables, and AWS inserts a route for the service's **prefix list** pointing at it. **Free.** Regional (same Region only) and reachable only from inside the VPC, not from on-prem or peered VPCs.\n- **Interface endpoints** (powered by **AWS PrivateLink**) create an **ENI with a private IP** in your subnets that fronts almost any AWS service (SQS, KMS, Secrets Manager, SSM, ECR, CloudWatch, and also S3) or a third-party service. With **private DNS**, the normal service hostname resolves to the private IP, so code doesn't change. Billed **per hour per AZ (~$0.01) plus per GB (~$0.01)**. Protected by security groups. Reachable from on-prem over VPN/Direct Connect and from peered VPCs.\n\nBoth types support **endpoint policies**: resource-style policies that restrict which principals and resources can be reached through the endpoint (for example, only our company's buckets). Pair them with bucket policies using `aws:SourceVpce` so the bucket only accepts traffic from your endpoint.",
        table: {
          headers: ["", "Gateway endpoint", "Interface endpoint"],
          rows: [
            ["Services", "S3, DynamoDB only", "Most AWS services + PrivateLink SaaS (incl. S3)"],
            ["Mechanism", "Route table entry (prefix list)", "ENI with private IP in your subnet"],
            ["Cost", "Free", "Hourly per AZ + per GB"],
            ["Security", "Endpoint policy", "Endpoint policy + security groups"],
            ["Reachable from on-prem / peered VPC", "No", "Yes"],
            ["Choose when", "S3/DynamoDB + private + cheapest", "Any other service, or S3 access from on-prem"]
          ]
        }
      },
      {
        heading: "PrivateLink for your own and vendors' services",
        body: "**AWS PrivateLink** lets a provider expose a service to consumers in other VPCs and accounts **without peering, IGWs or route changes**:\n\n- The **provider** puts the service behind a **Network Load Balancer** (or Gateway Load Balancer) and creates a **VPC endpoint service**.\n- Each **consumer** creates an interface endpoint to it in their own VPC.\n\nTraffic is one-directional (consumer to provider), only the one service is exposed (not the whole VPC), and because it isn't routing, **overlapping CIDRs don't matter**. This is the answer for 'reach a vendor's service privately without peering' and for SaaS providers serving thousands of customer VPCs. (Amazon VPC Lattice is a newer option for service-to-service connectivity across VPCs and accounts at the application layer.)"
      },
      {
        heading: "VPC peering and Transit Gateway",
        body: "**VPC peering** is a private one-to-one connection between two VPCs, same or different account or Region (inter-Region traffic is encrypted). Rules:\n\n- **Non-transitive**: A↔B and B↔C does NOT give A a path to C. You also can't use a peer's IGW, NAT gateway, VPN or Direct Connect (no edge-to-edge routing).\n- CIDRs **must not overlap**.\n- You must add routes in both VPCs' route tables, and SGs can reference peer SGs in the same Region.\n- No hourly charge; you pay data transfer (free within the same AZ).\n- A full mesh of N VPCs needs N(N−1)/2 peerings: 10 VPCs = 45 connections. Unmanageable at scale.\n\n**AWS Transit Gateway (TGW)** is a Regional **hub router**. Attach VPCs, Site-to-Site VPNs, Direct Connect gateways and other TGWs; everything routes through the hub, so it **is transitive**. Features: multiple TGW route tables for **segmentation** (dev can't reach prod), **inter-Region peering** between TGWs, sharing across accounts with **AWS RAM**, **ECMP** across multiple VPN tunnels for more bandwidth, and multicast. It costs per attachment-hour plus per GB processed. It is the answer for 'dozens of VPCs plus on-prem' and hub-and-spoke designs."
      },
      {
        heading: "Hybrid: Site-to-Site VPN, Client VPN and Direct Connect",
        body: "- **AWS Site-to-Site VPN**: IPsec-encrypted tunnels over the public internet between your router (**customer gateway**) and AWS (a **virtual private gateway** on one VPC, or a Transit Gateway). Each connection has **two tunnels** in different AZs for redundancy, up to **~1.25 Gbps per tunnel**. Set up in hours, cheap, encrypted, but internet latency varies. **Accelerated VPN** routes through Global Accelerator edge locations for more consistent performance.\n- **AWS Client VPN**: managed OpenVPN-based access for **individual users'** laptops into a VPC. Not site-to-site.\n- **AWS Direct Connect (DX)**: a **dedicated private physical connection** from your data center (via a DX location) to AWS. **Dedicated** connections: 1, 10, 100 or 400 Gbps; **hosted** connections via partners: 50 Mbps to 25 Gbps. Consistent latency, high bandwidth, and lower data-transfer-out pricing than internet. **Weeks to months** to provision. **Not encrypted by default**: for encryption, run a Site-to-Site VPN over the DX (public VIF or transit VIF) or use **MACsec** (layer 2, on 10/100/400 Gbps dedicated connections).\n\nDirect Connect vocabulary:\n\n- **Virtual interfaces (VIFs)**: private VIF (to one VPC's VGW or a DX gateway), public VIF (to AWS public endpoints such as S3), transit VIF (to a Transit Gateway via a DX gateway).\n- **Direct Connect gateway**: a global object that connects one DX connection to VPCs in many Regions.\n- **Resiliency**: for critical workloads use two connections at two different DX locations (maximum resiliency); a cheaper option is DX primary with Site-to-Site VPN as backup."
      },
      {
        heading: "Choosing a connectivity option",
        body: "Match the requirement words to the option:",
        table: {
          headers: ["Requirement", "Answer", "Why not the others"],
          rows: [
            ["Private subnet → S3/DynamoDB, private, cheapest", "Gateway endpoint", "NAT costs per GB; interface endpoint costs hourly"],
            ["Private access to SQS/KMS/SSM/Secrets Manager", "Interface endpoint", "Gateway endpoints only exist for S3/DynamoDB"],
            ["Reach a vendor's service privately, CIDRs may overlap", "PrivateLink interface endpoint", "Peering needs non-overlapping CIDRs and exposes whole VPCs"],
            ["Connect 2-3 VPCs simply", "VPC peering", "TGW adds per-attachment cost"],
            ["Dozens of VPCs + on-prem, transitive", "Transit Gateway", "Peering is non-transitive and needs N(N−1)/2 links"],
            ["Encrypted link to on-prem this week", "Site-to-Site VPN", "Direct Connect takes weeks"],
            ["Consistent latency, 10+ Gbps to on-prem", "Direct Connect", "VPN is internet-variable, ~1.25 Gbps/tunnel"],
            ["Direct Connect + encryption", "VPN over DX (or MACsec)", "DX alone is unencrypted"],
            ["Remote employees' laptops", "Client VPN", "Site-to-Site connects networks, not users"]
          ]
        }
      },
      {
        heading: "Exam angle",
        body: "The study guide's worked example: instances in private subnets must reach DynamoDB, traffic must never traverse the internet, and cost must be minimised. A NAT gateway works but sends traffic toward public endpoints and bills per GB; an interface endpoint is private but bills hourly and per GB. The **gateway endpoint for DynamoDB** is free, private and just a route-table entry. Whenever S3 or DynamoDB appears with 'private' and 'cheap', that is the answer.\n\nOther quick maps: '40 VPCs and on-prem must all communicate' → Transit Gateway. 'Consistent, high-bandwidth, private link to the data center' → Direct Connect, with a VPN backup if 'cost-effective resilience' is mentioned. 'Encrypt Direct Connect traffic' → IPsec VPN over DX or MACsec."
      }
    ],
    diagram: {
      title: "Hub-and-spoke with private service access",
      groups: [
        { id: "region", label: "Region", kind: "region", x: 36, y: 2, w: 61, h: 56 },
        { id: "dc", label: "Data center", kind: "onprem", x: 2, y: 20, w: 14, h: 20 }
      ],
      nodes: [
        { id: "onprem", label: "Corp network", icon: "onprem", x: 9, y: 30, sub: "192.168.0.0/16" },
        { id: "dx", label: "Direct Connect", icon: "direct-connect", x: 25, y: 16, sub: "10 Gbps, private" },
        { id: "vpn", label: "Site-to-Site VPN", icon: "site-to-site-vpn", x: 25, y: 44, sub: "IPsec backup" },
        { id: "tgw", label: "Transit Gateway", icon: "transit-gateway", x: 48, y: 30, sub: "Regional hub" },
        { id: "prod", label: "Prod VPC", icon: "vpc", x: 68, y: 10, sub: "10.0.0.0/16" },
        { id: "dev", label: "Dev VPC", icon: "vpc", x: 68, y: 30, sub: "10.1.0.0/16" },
        { id: "shared", label: "Shared VPC", icon: "vpc", x: 68, y: 50, sub: "10.2.0.0/16" },
        { id: "s3", label: "S3", icon: "s3", x: 89, y: 10, sub: "gateway endpoint" },
        { id: "saas", label: "Vendor service", icon: "privatelink", x: 89, y: 50, sub: "PrivateLink" }
      ],
      edges: [
        { id: "e-dx1", from: "onprem", to: "dx" },
        { id: "e-dx2", from: "dx", to: "tgw", label: "transit VIF" },
        { id: "e-vpn1", from: "onprem", to: "vpn", dashed: true },
        { id: "e-vpn2", from: "vpn", to: "tgw", dashed: true },
        { id: "e-prod", from: "tgw", to: "prod" },
        { id: "e-dev", from: "tgw", to: "dev" },
        { id: "e-shared", from: "tgw", to: "shared" },
        { id: "e-s3", from: "prod", to: "s3", label: "free, private" },
        { id: "e-saas", from: "shared", to: "saas", label: "interface ENI" }
      ],
      steps: [
        { caption: "Every VPC attaches once to the Transit Gateway. Instead of N(N−1)/2 peerings, you manage one attachment per VPC.", highlight: ["tgw", "prod", "dev", "shared", "e-prod", "e-dev", "e-shared"] },
        { caption: "Routing through the hub is transitive: Prod reaches Shared Services via the TGW (route tables can still segment Dev from Prod).", highlight: ["prod", "shared", "tgw"], flow: [{ edge: "e-prod", reverse: true }, { edge: "e-shared" }] },
        { caption: "The data center connects over Direct Connect into the TGW: dedicated fiber, consistent latency, but not encrypted by default.", highlight: ["onprem", "dx", "e-dx1", "e-dx2"], flow: [{ edge: "e-dx1" }, { edge: "e-dx2" }, { edge: "e-dev" }] },
        { caption: "Direct Connect fails. A Site-to-Site VPN over the internet (two IPsec tunnels) takes over as a cost-effective backup.", highlight: ["vpn", "e-vpn1", "e-vpn2"], fail: ["dx"], flow: [{ edge: "e-vpn1" }, { edge: "e-vpn2" }] },
        { caption: "Prod reaches S3 through a gateway endpoint: a route-table entry, free, no NAT, never on the internet.", highlight: ["s3", "e-s3"], flow: [{ edge: "e-s3" }] },
        { caption: "Shared Services reaches a vendor's API through a PrivateLink interface endpoint. Only that service is exposed, and overlapping CIDRs don't matter.", highlight: ["saas", "e-saas"], flow: [{ edge: "e-saas" }] }
      ]
    },
    keyFacts: [
      "Gateway endpoints exist only for S3 and DynamoDB; they are free route-table entries.",
      "Interface endpoints are ENIs (PrivateLink), work for most services, cost hourly per AZ + per GB, and use SGs.",
      "Gateway endpoints can't be used from on-prem or peered VPCs; interface endpoints can.",
      "VPC peering is non-transitive, needs non-overlapping CIDRs and has no edge-to-edge routing.",
      "Full mesh of N VPCs = N(N−1)/2 peering connections.",
      "Transit Gateway is a Regional, transitive hub; supports inter-Region peering, RAM sharing and ECMP over VPN.",
      "Site-to-Site VPN: 2 IPsec tunnels per connection, ~1.25 Gbps per tunnel, set up in hours.",
      "Direct Connect: dedicated 1/10/100/400 Gbps, hosted 50 Mbps-25 Gbps, weeks to provision, unencrypted by default.",
      "Encrypt Direct Connect with IPsec VPN over DX or MACsec.",
      "Direct Connect gateway links one DX connection to VPCs in multiple Regions."
    ],
    examTips: [
      "'Private subnets → DynamoDB/S3, never over the internet, minimise cost' → gateway endpoint (not NAT, not interface endpoint).",
      "'Access a vendor's service privately without peering or exposing our VPC' → PrivateLink interface endpoint.",
      "'40 VPCs and on-prem must all communicate' → Transit Gateway.",
      "'A peers with B, B peers with C, A can't reach C' → peering is non-transitive; add A-C peering or use TGW.",
      "'Need connectivity to on-prem in days, encrypted' → Site-to-Site VPN; 'consistent latency, high throughput' → Direct Connect.",
      "'Cost-effective backup for Direct Connect' → Site-to-Site VPN; 'maximum resiliency' → two DX connections at two locations.",
      "'Bucket must accept traffic only from our VPC endpoint' → bucket policy with aws:SourceVpce."
    ],
    pitfalls: [
      "Choosing an interface endpoint for S3/DynamoDB when the question stresses lowest cost.",
      "Assuming Direct Connect is encrypted. It isn't by default.",
      "Expecting peered VPCs to share an IGW, NAT or VPN connection. No edge-to-edge routing.",
      "Peering VPCs with overlapping CIDRs. It fails; PrivateLink is the workaround for a single service.",
      "Picking Direct Connect when the requirement is 'within a week'. Provisioning takes weeks.",
      "Confusing Client VPN (users) with Site-to-Site VPN (networks)."
    ],
    prosCons: [
      {
        option: "VPC peering",
        pros: ["No hourly cost", "Lowest latency, no bandwidth bottleneck", "Simple for a few VPCs"],
        cons: ["Non-transitive", "N(N−1)/2 scaling", "No overlapping CIDRs"],
        useWhen: "A handful of VPCs that need full connectivity."
      },
      {
        option: "Transit Gateway",
        pros: ["Transitive hub", "Central route tables and segmentation", "Attaches VPN and Direct Connect"],
        cons: ["Per-attachment hourly + per-GB processing cost", "Extra hop"],
        useWhen: "Many VPCs and accounts, or shared hybrid connectivity."
      },
      {
        option: "Site-to-Site VPN",
        pros: ["Hours to set up", "Encrypted (IPsec)", "Low cost"],
        cons: ["Internet-variable latency", "~1.25 Gbps per tunnel"],
        useWhen: "Quick, encrypted hybrid link or backup for Direct Connect."
      },
      {
        option: "Direct Connect",
        pros: ["Consistent latency", "Up to 400 Gbps", "Lower data transfer out rates"],
        cons: ["Weeks to provision", "Not encrypted by default", "Single connection is a single point of failure"],
        useWhen: "Steady, high-volume, latency-sensitive hybrid traffic."
      }
    ],
    services: ["gateway-endpoint", "interface-endpoint", "privatelink", "vpc-peering", "transit-gateway", "site-to-site-vpn", "client-vpn", "direct-connect", "nlb", "ram", "vpc-lattice"]
  },

  // ------------------------------------------------------------------ 12
  {
    id: "m1-encryption-kms",
    module: "m1",
    domain: "secure",
    title: "Encryption & KMS Envelope Encryption",
    minutes: 20,
    summary: "Explain symmetric vs asymmetric encryption and at-rest vs in-transit, walk through KMS envelope encryption, and choose between AWS managed keys, customer managed keys and CloudHSM.",
    analogy: {
      title: "A bank vault that never lends out the master key",
      body: "Imagine a bank vault holding a master key that never leaves the vault. When you need to lock a box, the bank teller cuts you a fresh small key and hands you two things: the small key itself, and a copy of the small key sealed in an envelope that only the master key can open. You lock your box with the small key, throw the small key away, and tape the sealed envelope to the box.\n\nLater, to open the box, you bring the envelope to the teller. The teller checks your ID against the vault's rules (the **key policy**), opens the envelope with the master key, and hands you the small key. The master key never left the vault, and the vault logs every visit (**CloudTrail**). That is **KMS envelope encryption**."
    },
    sections: [
      {
        heading: "Encryption basics",
        body: "**Encryption** turns readable data (plaintext) into unreadable ciphertext using a key; only someone with the right key can reverse it.\n\n- **Symmetric** encryption uses one key to encrypt and decrypt, typically **AES-256**. It's fast, so it's used for actual data.\n- **Asymmetric** encryption uses a key pair: a public key (shareable) and a private key (secret), typically **RSA** or **ECC**. It's slower, used for **digital signatures** and key exchange (TLS uses it to agree a symmetric session key).\n\nTwo places data needs protection:\n\n- **At rest**: data stored on disk (EBS volumes, S3 objects, RDS storage, snapshots, backups).\n- **In transit**: data moving across a network, protected by **TLS** (HTTPS), IPsec VPNs or MACsec.\n\nExam questions usually want both, and the services to deliver them are different: KMS-backed encryption for rest, TLS certificates (ACM) for transit."
      },
      {
        heading: "AWS KMS fundamentals",
        body: "**AWS Key Management Service (KMS)** creates and controls cryptographic keys. Key points:\n\n- A **KMS key** (formerly 'customer master key', CMK) never leaves KMS's FIPS-validated hardware security modules unencrypted. You never hold it; you send data or data keys to KMS APIs (`Encrypt`, `Decrypt`, `GenerateDataKey`, `Sign`).\n- KMS keys are **Regional**. To use encrypted data in another Region, re-encrypt it with a key there, or use a multi-Region key.\n- `Encrypt` accepts at most **4 KB** of plaintext. Real data is encrypted with data keys (envelope encryption).\n- Every API call is logged in **CloudTrail**: who used which key, when.\n- Key types: **symmetric** (default, AES-256-GCM), **asymmetric** (RSA, ECC for encrypt or sign/verify), **HMAC** (generate/verify message authentication codes).\n- Pricing (customer managed): about **$1 per key per month** plus **$0.03 per 10,000 requests**."
      },
      {
        heading: "Envelope encryption step by step",
        body: "**Envelope encryption** means encrypting data with a **data key**, then encrypting the data key with the KMS key.\n\nTo encrypt:\n\n- Call `GenerateDataKey` on your KMS key. KMS returns a **plaintext data key** and the **same data key encrypted** under the KMS key.\n- Encrypt your data locally (any size) with the plaintext data key, then **discard** the plaintext key from memory.\n- Store the **encrypted data key** alongside the ciphertext.\n\nTo decrypt:\n\n- Send the encrypted data key to KMS `Decrypt`. KMS checks the key policy and IAM permissions, then returns the plaintext data key.\n- Decrypt the data locally and discard the key again.\n\nWhy bother? Bulk data never travels to KMS (fast, no 4 KB limit), each object can have its own data key (limits blast radius), and access to everything is still gated and audited by one KMS key. Every 'encrypted with KMS' checkbox in AWS (EBS, S3 SSE-KMS, RDS, DynamoDB, EFS) does exactly this under the hood. **S3 Bucket Keys** reduce KMS request costs (up to 99%) by generating a bucket-level key that creates object data keys locally."
      },
      {
        heading: "Key ownership options",
        body: "Who owns and controls the key is the main design decision.",
        table: {
          headers: ["Key type", "Who controls", "Cost", "Rotation", "Choose when"],
          rows: [
            ["AWS owned keys", "AWS, shared across accounts; invisible to you", "Free", "AWS-managed", "Default encryption with zero management (e.g. DynamoDB default, SSE-S3)"],
            ["AWS managed keys (aws/s3, aws/ebs...)", "AWS creates in your account; you can see usage in CloudTrail but can't edit the policy", "No monthly fee (request charges apply)", "Automatic every year, can't change", "Simple KMS encryption, single account"],
            ["Customer managed keys", "You: key policy, grants, enable/disable, schedule deletion", "$1/month + requests", "Optional automatic (90 days to 7 years, default yearly) + on-demand", "'Control', 'audit', 'cross-account', 'disable access instantly'"],
            ["Imported key material (BYOK)", "You generate the material outside AWS", "$1/month + requests", "Manual only", "Policy requires keys generated on your own HSM"],
            ["Custom key store (CloudHSM or external)", "You, on HSMs you control", "KMS + HSM cost", "Manual", "Keys must live in single-tenant HSMs you manage"]
          ]
        }
      },
      {
        heading: "Key policies, grants and cross-account use",
        body: "A **key policy** is the resource-based policy attached to every KMS key, and it is the **primary gate**: if the key policy doesn't allow access (directly, or by delegating to IAM), no IAM policy can grant it. The default key policy gives the account (`arn:aws:iam::111122223333:root`) full access, which **enables IAM policies** in that account to control use of the key.\n\n**Grants** are temporary, programmatic permissions on a key, used by AWS services (for example, EBS attaching an encrypted volume to an instance) and revocable at any time.\n\n**Cross-account** use needs both sides: the key policy in account A must allow the external principal from account B, **and** that principal's IAM policy in account B must allow `kms:Decrypt` (and other needed actions) on the key's ARN. You can only share **customer managed** keys this way; AWS managed keys can't be shared, which is why copying an encrypted snapshot to another account requires a customer managed key.\n\n**Deletion** is irreversible, so KMS enforces a **waiting period of 7 to 30 days** (default 30). Prefer **disabling** a key, which is instantly reversible; a CloudWatch alarm on attempted use of a pending-deletion key is a best practice."
      },
      {
        heading: "Multi-Region keys and rotation",
        beyond: true,
        body: "- **Multi-Region keys** are sets of KMS keys in different Regions with the **same key ID and key material** (IDs start with `mrk-`). Data encrypted in one Region can be decrypted in another without a cross-Region call: useful for global DynamoDB tables, client-side encryption with DR, and active-active apps. Each replica has its own key policy.\n- **Automatic rotation** for customer managed symmetric keys creates new key material on a schedule (configurable 90 to 2,560 days since 2024; previously fixed at yearly). Old material is kept so existing ciphertext still decrypts, and the key ID/ARN doesn't change, so no application updates are needed. You can also rotate **on demand**.\n- Imported key material and keys in custom key stores can't rotate automatically; rotate manually by creating a new key and updating aliases."
      },
      {
        heading: "KMS vs CloudHSM",
        body: "**AWS CloudHSM** provides **dedicated, single-tenant** hardware security modules in your VPC. You create and manage the keys and users; AWS has no access to your key material and can't recover it if you lose credentials. It runs in a cluster across AZs (you deploy at least two HSMs for HA) and supports industry APIs (PKCS#11, JCE, Microsoft CNG) for workloads like Oracle TDE, SSL offload or a private certificate authority.\n\nOlder material says KMS is FIPS 140-2 Level 2 and CloudHSM Level 3; today KMS's HSMs are also validated at Level 3. On the exam, the CloudHSM trigger words are **'single-tenant'**, **'dedicated HSM'**, **'customer has exclusive control of keys'**, and specific crypto APIs.",
        table: {
          headers: ["", "AWS KMS", "AWS CloudHSM"],
          rows: [
            ["Tenancy", "Multi-tenant managed service", "Single-tenant HSMs in your VPC"],
            ["Who manages keys", "AWS manages HSMs; you control policies", "You manage HSM users and keys entirely"],
            ["Integration", "Native with 100+ AWS services", "Via custom key store, or your app using PKCS#11/JCE/CNG"],
            ["HA", "Built-in", "You deploy multiple HSMs across AZs"],
            ["Cost", "$1/key/month + requests", "Hourly per HSM (roughly $1.50+/hour each)"],
            ["Exam trigger", "Default for nearly everything", "'Dedicated', 'single-tenant', 'exclusive key control'"]
          ]
        }
      }
    ],
    diagram: {
      title: "KMS envelope encryption",
      nodes: [
        { id: "app", label: "Application", icon: "ec2", x: 12, y: 30, sub: "instance role" },
        { id: "kms", label: "KMS key", icon: "kms", x: 45, y: 10, sub: "never leaves KMS" },
        { id: "dk", label: "Plaintext data key", icon: "server", x: 45, y: 48, sub: "in memory only" },
        { id: "s3", label: "Encrypted object", icon: "s3", x: 82, y: 40, sub: "+ encrypted data key" },
        { id: "trail", label: "CloudTrail", icon: "cloudtrail", x: 82, y: 10, sub: "every call logged" }
      ],
      edges: [
        { id: "e-kms", from: "app", to: "kms", label: "KMS API" },
        { id: "e-dk", from: "app", to: "dk", label: "encrypt locally" },
        { id: "e-s3", from: "app", to: "s3", label: "store both" },
        { id: "e-trail", from: "kms", to: "trail", label: "audit" }
      ],
      steps: [
        { caption: "The app calls GenerateDataKey on a KMS key. The key policy and the app's IAM role must allow it.", highlight: ["app", "kms", "e-kms"], flow: [{ edge: "e-kms" }] },
        { caption: "KMS returns two copies of a fresh data key: one plaintext, one encrypted under the KMS key. The KMS key itself never leaves KMS.", highlight: ["kms", "e-kms"], flow: [{ edge: "e-kms", reverse: true }] },
        { caption: "The app encrypts the data locally with the plaintext data key (AES-256), then discards the plaintext key from memory.", highlight: ["dk", "e-dk"], flow: [{ edge: "e-dk" }] },
        { caption: "Ciphertext and the encrypted data key are stored together. A thief who steals the object gets nothing usable.", highlight: ["s3", "e-s3"], flow: [{ edge: "e-s3" }] },
        { caption: "To read, the app sends the encrypted data key to KMS Decrypt, gets the plaintext key back, and decrypts locally.", highlight: ["app", "kms", "s3"], flow: [{ edge: "e-s3", reverse: true }, { edge: "e-kms" }, { edge: "e-kms", reverse: true }] },
        { caption: "Every Encrypt, Decrypt and GenerateDataKey call lands in CloudTrail: who, which key, when. This is why 'audit key usage' means KMS.", highlight: ["trail", "e-trail"], flow: [{ edge: "e-trail" }] },
        { caption: "Disable the customer managed key or remove the principal from its key policy, and every copy of the data becomes unreadable instantly.", highlight: ["kms"], fail: ["e-kms"] }
      ]
    },
    keyFacts: [
      "Symmetric (AES-256) encrypts bulk data; asymmetric (RSA/ECC) is for signing and key exchange.",
      "KMS keys never leave KMS unencrypted and are Regional (multi-Region keys replicate key material).",
      "KMS Encrypt handles at most 4 KB; larger data uses envelope encryption with GenerateDataKey.",
      "Customer managed key: ~$1/month + $0.03 per 10,000 requests; AWS managed keys have no monthly fee.",
      "AWS managed keys rotate yearly automatically; customer managed keys rotate optionally (90-2,560 days) or on demand.",
      "The key policy is the primary gate; the default policy enables IAM policies in the account.",
      "Cross-account KMS use needs the key policy AND the caller's IAM policy to allow it; only customer managed keys can be shared.",
      "Key deletion has a 7-30 day waiting period (default 30); disabling is instantly reversible.",
      "CloudHSM = single-tenant HSMs you fully control; deploy 2+ across AZs for HA.",
      "S3 Bucket Keys cut SSE-KMS request costs by up to 99%."
    ],
    examTips: [
      "'Keys the company controls and every use auditable' → SSE-KMS with a customer managed key (key policy + CloudTrail). SSE-S3 has no key policy or per-key audit trail.",
      "'Control, audit, cross-account, ability to disable' → customer managed KMS key.",
      "'Encrypt data larger than 4 KB with KMS' → envelope encryption (GenerateDataKey).",
      "'Dedicated, single-tenant HSM; exclusive control of keys' → CloudHSM.",
      "'Share an encrypted snapshot with another account' → re-encrypt with a customer managed key and share it via the key policy.",
      "'Decrypt in a second Region without cross-Region calls' → multi-Region KMS keys.",
      "'High KMS request costs from S3' → enable S3 Bucket Keys."
    ],
    pitfalls: [
      "Trying to share an AWS managed key (aws/ebs) with another account. Not possible.",
      "Assuming an IAM Allow is enough for KMS. The key policy must also permit it.",
      "Deleting a key to 'rotate' it. Deletion destroys access to all data encrypted under it.",
      "Choosing CloudHSM just because the question says 'encrypt'. KMS covers almost everything.",
      "Forgetting KMS keys are Regional when copying encrypted snapshots across Regions."
    ],
    prosCons: [
      {
        option: "AWS managed key",
        pros: ["Zero management", "No monthly fee", "Auto-rotated yearly"],
        cons: ["Can't edit key policy", "Can't share cross-account", "Can't disable or delete"],
        useWhen: "Simple encryption in one account with no control requirements."
      },
      {
        option: "Customer managed key",
        pros: ["Full key policy control", "Cross-account sharing", "Disable/enable, flexible rotation"],
        cons: ["$1/month per key plus requests", "You must manage policies correctly"],
        useWhen: "'Control', 'audit', 'cross-account' or 'revoke access' requirements."
      },
      {
        option: "CloudHSM",
        pros: ["Single-tenant, exclusive control", "Standard crypto APIs (PKCS#11, JCE, CNG)"],
        cons: ["Expensive", "You manage HA, users and backups", "Lose credentials = lose keys"],
        useWhen: "Regulatory demand for dedicated HSMs or exclusive key custody."
      }
    ],
    services: ["kms", "cloudhsm", "cloudtrail", "s3", "ebs", "rds", "acm"]
  },

  // ------------------------------------------------------------------ 13
  {
    id: "m1-data-protection",
    module: "m1",
    domain: "secure",
    title: "Protecting Data per Service: Secrets, Certificates & Keys",
    minutes: 22,
    summary: "Apply encryption at rest and in transit to S3, EBS, RDS, DynamoDB and EFS, choose between Secrets Manager and Parameter Store, and use ACM certificates correctly, including the us-east-1 rule for CloudFront.",
    analogy: {
      title: "Safes, a key cabinet and a notary's seal",
      body: "Every storage service is a different kind of safe: some lock automatically when the door closes (S3 and DynamoDB encrypt by default), others must be ordered with a lock fitted from the factory (EBS and RDS encryption is chosen at creation; you can't add a lock to a safe that's already installed, you must move the contents into a new one).\n\nPasswords for those safes go in a **key cabinet** that changes the combination every month by itself (**Secrets Manager**), or in a cheaper locked drawer that never changes them unless you do (**Parameter Store**). And when customers talk to your website, a **notary's seal** (an ACM TLS certificate) proves the site is really yours and scrambles the conversation in transit."
    },
    sections: [
      {
        heading: "S3 encryption options",
        body: "Since January 2023 every new S3 object is encrypted at rest by default with **SSE-S3**. You choose a stronger option when the question demands control, audit or regulatory separation.",
        table: {
          headers: ["Option", "Who manages the key", "Audit per key use", "Choose when"],
          rows: [
            ["SSE-S3", "S3 (AWS owned keys, AES-256)", "No", "Default; 'encrypted at rest' with no other requirement"],
            ["SSE-KMS", "KMS (AWS managed aws/s3 or customer managed)", "Yes, CloudTrail", "'Control access to keys', 'audit key usage', 'separation of duties'"],
            ["DSSE-KMS", "KMS, two independent layers of encryption", "Yes", "Compliance that demands dual-layer encryption (e.g. some US government standards)"],
            ["SSE-C", "You supply the key with every request (HTTPS required); S3 doesn't store it", "No", "You must hold keys outside AWS but want S3 to do the crypto"],
            ["Client-side encryption", "You encrypt before upload (e.g. AWS Encryption SDK)", "Your own", "AWS must never see plaintext"]
          ]
        }
      },
      {
        heading: "Enforcing S3 protection with policies",
        body: "Encryption alone isn't the whole story. Typical controls the exam expects:\n\n- **Require TLS**: bucket policy Deny on `s3:*` when `aws:SecureTransport` is `false`.\n- **Require a specific KMS key**: Deny `s3:PutObject` unless `s3:x-amz-server-side-encryption-aws-kms-key-id` equals your key ARN. (Since default encryption exists, the simpler approach is to set the bucket's default encryption to SSE-KMS with that key.)\n- **Bucket Keys** with SSE-KMS cut KMS request costs by up to 99%.\n- **S3 Block Public Access** (on by default for new buckets, and settable account-wide) overrides any policy or ACL that would make data public.\n- **Object Ownership = Bucket owner enforced** disables ACLs (default for new buckets), so only policies control access.\n- **Versioning** protects against overwrites and deletes; **MFA Delete** requires MFA to permanently delete versions; **S3 Object Lock** gives WORM (write once, read many) retention in governance mode (privileged users can override) or compliance mode (nobody, not even root, can delete until retention ends).",
        beyond: true
      },
      {
        heading: "EBS, RDS, DynamoDB and EFS at rest",
        body: "- **EBS**: encryption uses KMS (aws/ebs or a customer managed key) and covers the volume, data in transit between instance and volume, and all snapshots. Turn on **EBS encryption by default** per Region per account so nobody can create unencrypted volumes.\n- **RDS and Aurora**: choose encryption **at creation**. It covers storage, automated backups, snapshots and read replicas. A read replica in the same Region uses the same key; a **cross-Region** replica or snapshot copy needs a KMS key in the destination Region.\n- **Encrypting something that already exists** (EBS volume or RDS instance): you can't flip encryption on in place. Take a snapshot → **copy the snapshot with encryption enabled** → restore a new volume/DB from the encrypted copy → cut over. The same trick changes the KMS key.\n- **DynamoDB**: always encrypted at rest; choose AWS owned (default, free), AWS managed (aws/dynamodb) or a customer managed key.\n- **EFS**: encryption at rest is chosen at file-system creation; encryption in transit is enabled with TLS through the EFS mount helper.\n- Snapshots and copies **inherit** encryption: you can't create an unencrypted copy of an encrypted snapshot."
      },
      {
        heading: "Encryption in transit per service",
        beyond: true,
        body: "- **ALB/NLB/CloudFront/API Gateway**: terminate HTTPS with an ACM certificate. For end-to-end encryption, use HTTPS listeners on the ALB AND HTTPS to the targets (ALB re-encrypts). An **NLB** can pass TLS straight through (TCP listener) so the instances terminate it, or terminate TLS itself.\n- **CloudFront**: set Viewer Protocol Policy to 'Redirect HTTP to HTTPS' and Origin Protocol Policy to 'HTTPS only'. Field-level encryption protects specific form fields (e.g. card numbers) all the way to the backend.\n- **RDS**: connect with TLS; force it with the `rds.force_ssl` parameter (PostgreSQL, SQL Server) or `require_secure_transport` (MySQL).\n- **S3**: enforce with `aws:SecureTransport`.\n- **Private networking** (VPN, MACsec on Direct Connect) covers the network path, not the application protocol."
      },
      {
        heading: "Secrets Manager vs Systems Manager Parameter Store",
        body: "Hard-coding database passwords in code or config files is the anti-pattern. Two services store secrets, encrypted with KMS, retrieved at runtime by an IAM role:\n\n- **AWS Secrets Manager**: built for secrets. **Automatic rotation** on a schedule (for example every 30 days) using a Lambda rotation function; **managed rotation** for RDS, Aurora, Redshift and DocumentDB needs no code from you. RDS and Aurora can also store their master password in Secrets Manager directly. Supports **cross-Region replication** of secrets for DR, resource policies for cross-account access, and random password generation. Costs **$0.40 per secret per month + $0.05 per 10,000 API calls**.\n- **SSM Parameter Store**: hierarchical configuration store (`/prod/app/db-url`). **SecureString** parameters are KMS-encrypted. Standard tier is **free** (up to 10,000 parameters, 4 KB each); Advanced tier allows 8 KB values and parameter policies (expiration notifications) for $0.05 per parameter per month. **No native rotation**: you would have to build it yourself.",
        table: {
          headers: ["", "Secrets Manager", "Parameter Store"],
          rows: [
            ["Primary purpose", "Secrets (DB creds, API keys)", "Config values and simple secrets"],
            ["Automatic rotation", "Yes, built in (managed for RDS/Aurora/Redshift/DocumentDB)", "No"],
            ["Cross-Region replication", "Yes", "No"],
            ["Cost", "$0.40/secret/month + API calls", "Standard free; Advanced $0.05/param/month"],
            ["Max size", "64 KB", "4 KB standard, 8 KB advanced"],
            ["Exam trigger", "'rotate automatically', 'no code for rotation'", "'store configuration', 'lowest cost', no rotation"]
          ]
        }
      },
      {
        heading: "Certificates with AWS Certificate Manager",
        body: "**AWS Certificate Manager (ACM)** provisions **public TLS certificates for free**, renews them automatically, and deploys them to integrated services: **Elastic Load Balancing, CloudFront, API Gateway**, App Runner, Amplify and others.\n\n- Validate domain ownership with **DNS validation** (a CNAME record; renewal is fully automatic while the record exists) or email validation (renewal needs someone to click).\n- Certificates are **Regional**: an ALB in `eu-west-1` needs a certificate requested in `eu-west-1`. **CloudFront certificates must be requested in us-east-1** (N. Virginia), because CloudFront is global and reads certificates from there.\n- Standard ACM public certificates can't be exported, so you can't install them directly on an EC2 web server; terminate TLS on a load balancer or CloudFront instead. Since 2025 ACM also offers **exportable public certificates** (paid) for workloads that must install the certificate themselves.\n- **AWS Private CA** issues private certificates for internal services, mutual TLS and IoT devices (paid per CA and per certificate).\n- You can **import** third-party certificates into ACM, but ACM won't renew those; monitor expiry with the ACM `DaysToExpiry` metric or AWS Config."
      },
      {
        heading: "Exam angle",
        body: "Fold these study-guide lessons into your reflexes:\n\n- Credentials that must rotate every 30 days automatically with no rotation code to deploy → **Secrets Manager with managed rotation**. Parameter Store SecureString is encrypted but has no native rotation, and encrypting a config file with KMS leaves rotation entirely manual.\n- 'All objects encrypted with keys the company controls, every use auditable' → **SSE-KMS with a customer managed key**. SSE-S3 has no key policy or per-key audit; client-side is more burden than required.\n- 'Encrypt an existing unencrypted RDS database' → snapshot, encrypted copy, restore.\n- 'HTTPS on CloudFront with a custom domain' → ACM certificate in us-east-1.\n- 'Prevent anyone, including root, from deleting records for 7 years' → S3 Object Lock in compliance mode."
      }
    ],
    diagram: {
      title: "Secrets at runtime, rotated automatically",
      nodes: [
        { id: "app", label: "App server", icon: "ec2", x: 12, y: 30, sub: "instance role" },
        { id: "sm", label: "DB secret", icon: "secrets-manager", x: 42, y: 12, sub: "Secrets Manager" },
        { id: "kms", label: "Customer key", icon: "kms", x: 42, y: 48, sub: "encrypts secret + DB" },
        { id: "rot", label: "Rotation", icon: "lambda", x: 74, y: 12, sub: "every 30 days" },
        { id: "rds", label: "RDS MySQL", icon: "rds", x: 74, y: 44, sub: "encrypted storage" }
      ],
      edges: [
        { id: "e-get", from: "app", to: "sm", label: "GetSecretValue" },
        { id: "e-kms", from: "sm", to: "kms", dashed: true },
        { id: "e-db", from: "app", to: "rds", label: "TLS 3306" },
        { id: "e-rot", from: "sm", to: "rot", label: "schedule" },
        { id: "e-set", from: "rot", to: "rds", label: "new password" },
        { id: "e-dbkms", from: "rds", to: "kms", dashed: true, label: "storage key" }
      ],
      steps: [
        { caption: "No password in code or config. At startup the app uses its IAM role to call GetSecretValue.", highlight: ["app", "sm", "e-get"], flow: [{ edge: "e-get" }, { edge: "e-get", reverse: true }] },
        { caption: "The secret is encrypted with a customer managed KMS key, so access needs both secretsmanager and kms:Decrypt permissions.", highlight: ["kms", "e-kms"], flow: [{ edge: "e-kms" }] },
        { caption: "The app connects to RDS over TLS. RDS storage, backups and snapshots are encrypted with a KMS key chosen at creation.", highlight: ["rds", "e-db", "e-dbkms"], flow: [{ edge: "e-db" }] },
        { caption: "Every 30 days Secrets Manager triggers managed rotation, with no rotation code for you to deploy.", highlight: ["rot", "e-rot"], flow: [{ edge: "e-rot" }] },
        { caption: "The rotation function sets a new password on the database and stores it as the current secret version.", highlight: ["rot", "rds", "e-set"], flow: [{ edge: "e-set" }] },
        { caption: "Next time the app fetches the secret it gets the new password. No redeploy, no human ever sees the credential.", highlight: ["app", "sm", "e-get"], flow: [{ edge: "e-get" }] }
      ]
    },
    keyFacts: [
      "All new S3 objects are encrypted with SSE-S3 by default (since January 2023).",
      "SSE-KMS gives key policies and CloudTrail audit; SSE-C means you send the key with every request; client-side means AWS never sees plaintext.",
      "EBS and RDS encryption is chosen at creation; encrypt existing resources via snapshot → encrypted copy → restore.",
      "Snapshots, backups and read replicas inherit encryption; cross-Region copies need a KMS key in the target Region.",
      "DynamoDB is always encrypted at rest.",
      "Secrets Manager: automatic rotation, cross-Region replication, $0.40/secret/month.",
      "Parameter Store standard tier: free, 4 KB, no native rotation.",
      "ACM public certificates are free and auto-renew; CloudFront certificates must be in us-east-1.",
      "Standard ACM public certificates can't be exported to EC2 (paid exportable certificates exist since 2025).",
      "S3 Object Lock compliance mode: nobody, including root, can delete before retention expires."
    ],
    examTips: [
      "'Rotate database credentials automatically every 30 days, no rotation code' → Secrets Manager managed rotation.",
      "'Store configuration values / secrets at the lowest cost, no rotation needed' → Parameter Store SecureString.",
      "'Encrypt an existing unencrypted EBS volume or RDS instance' → snapshot, copy with encryption, restore.",
      "'Prevent creation of unencrypted EBS volumes' → enable EBS encryption by default for the Region.",
      "'HTTPS for a CloudFront distribution with a custom domain' → ACM certificate requested in us-east-1.",
      "'Deny any S3 request not using HTTPS' → bucket policy Deny on aws:SecureTransport false.",
      "'AWS must never have access to the plaintext' → client-side encryption."
    ],
    pitfalls: [
      "Choosing Parameter Store when the question says 'automatic rotation'.",
      "Trying to enable encryption on a running RDS instance in place.",
      "Requesting the CloudFront certificate in the same Region as the origin instead of us-east-1.",
      "Assuming SSE-S3 provides per-key audit trails. It doesn't.",
      "Planning to install a standard ACM public certificate on EC2. Use an ALB/CloudFront, or an exportable/third-party cert."
    ],
    prosCons: [
      {
        option: "Secrets Manager",
        pros: ["Built-in and managed rotation", "Cross-Region replication", "Resource policies for cross-account"],
        cons: ["$0.40 per secret per month plus API calls"],
        useWhen: "Database credentials, API keys, anything that must rotate."
      },
      {
        option: "Parameter Store (SecureString)",
        pros: ["Free standard tier", "Hierarchical config paths", "KMS encrypted"],
        cons: ["No native rotation", "No cross-Region replication", "Lower throughput limits by default"],
        useWhen: "Configuration and secrets that don't need rotation, at minimum cost."
      },
      {
        option: "SSE-S3 vs SSE-KMS",
        pros: ["SSE-S3: free, zero management", "SSE-KMS: key policy control, CloudTrail audit, revocable"],
        cons: ["SSE-S3: no key-level control or audit", "SSE-KMS: KMS request costs and quotas (mitigate with Bucket Keys)"],
        useWhen: "SSE-S3 by default; SSE-KMS (customer managed) whenever control or audit is required."
      }
    ],
    services: ["s3", "kms", "ebs", "rds", "dynamodb", "efs", "secrets-manager", "parameter-store", "acm", "cloudfront", "alb"]
  },

  // ------------------------------------------------------------------ 14
  {
    id: "m1-threat-protection",
    module: "m1",
    domain: "secure",
    title: "WAF, Shield, GuardDuty, Inspector, Macie & Security Hub",
    minutes: 20,
    summary: "Match each AWS threat-protection service to what it protects or detects, block web attacks and DDoS at the edge, and automate responses to findings.",
    analogy: {
      title: "Security for a shopping mall",
      body: "A mall has guards at the doors who turn away people carrying weapons or behaving suspiciously (**WAF**), and crowd barriers that stop a stampede from flattening the entrance (**Shield**). Inside, a security control room watches every camera and spots odd behaviour, like someone trying every door at 3 a.m. (**GuardDuty**).\n\nA building inspector checks every shop for faulty wiring and broken locks (**Inspector**). An auditor looks through the stockrooms for things that shouldn't be lying around, like customers' credit card slips (**Macie**). And the mall manager's dashboard collects every report from all of them in one place, with a score of how well the mall follows the safety code (**Security Hub**)."
    },
    sections: [
      {
        heading: "Protect vs detect: the map",
        body: "The study guide's 3-tier reference puts **WAF on CloudFront**, relies on **Shield Standard** for basic DDoS, and turns on **GuardDuty** account-wide. The exam goes further and expects you to tell all of these apart by what they look at. The core question: is the service **blocking** traffic, **detecting** threats, **scanning** for weaknesses, or **aggregating** results?",
        table: {
          headers: ["Service", "Type", "Looks at", "Answers the question"],
          rows: [
            ["AWS WAF", "Protect (layer 7)", "HTTP(S) requests", "Block SQLi, XSS, bad bots, rate-limit, geo-block"],
            ["AWS Shield", "Protect (layers 3/4, 7 with Advanced)", "Network floods", "Absorb DDoS attacks"],
            ["Amazon GuardDuty", "Detect", "CloudTrail, VPC Flow Logs, DNS logs, S3/EKS/RDS/runtime events", "Is someone attacking or misusing my account?"],
            ["Amazon Inspector", "Scan", "EC2, ECR container images, Lambda", "Which workloads have known CVEs or open network paths?"],
            ["Amazon Macie", "Scan", "S3 objects", "Where is sensitive data (PII, credentials) in S3?"],
            ["AWS Security Hub", "Aggregate + posture", "Findings from all of the above + Config-based checks", "What's my overall security posture across accounts?"],
            ["Amazon Detective", "Investigate", "Graph of logs and findings", "What is the root cause and blast radius of this finding?"],
            ["AWS Firewall Manager", "Govern", "WAF, Shield Advanced, SGs, Network Firewall policies", "Apply firewall rules consistently across the org"]
          ]
        }
      },
      {
        heading: "AWS WAF: the layer 7 filter",
        beyond: true,
        body: "**AWS WAF** (web application firewall) inspects HTTP(S) requests and allows, blocks, counts or challenges them (CAPTCHA or silent challenge). You build a **web ACL** of rules and attach it to **CloudFront, Application Load Balancer, API Gateway REST APIs, AppSync GraphQL APIs, Cognito user pools, App Runner and Verified Access**. It does NOT attach to Network Load Balancers or EC2 directly.\n\nRule building blocks:\n\n- **AWS Managed Rules** groups: Core rule set (OWASP top 10 style), SQL database, Known bad inputs, Amazon IP reputation list, Anonymous IP list, plus paid **Bot Control** and **Account Takeover Prevention**.\n- **Rate-based rules**: block an IP (or other key) that exceeds N requests in a time window, a cheap answer to HTTP floods and brute-force logins.\n- **IP sets** (allow/deny lists), **geo match** (block or allow countries), string/regex match on headers, URIs, query strings and body, size constraints.\n\nPricing: per web ACL per month, per rule per month, and per million requests. Logs go to CloudWatch Logs, S3 or Data Firehose."
      },
      {
        heading: "AWS Shield Standard vs Advanced",
        beyond: true,
        body: "A **DDoS (distributed denial of service)** attack floods a target with traffic from many sources. **Shield Standard** is free and automatic for every AWS customer, protecting against common layer 3/4 attacks (SYN floods, UDP reflection) on CloudFront, Route 53 and the AWS edge.\n\n**Shield Advanced** costs **$3,000 per month per organization** (1-year commitment) plus data transfer fees, and adds:\n\n- Enhanced detection and mitigation for **EC2 Elastic IPs, ELB, CloudFront, Global Accelerator and Route 53**, including larger and layer 7 attacks (with automatic WAF rule creation).\n- 24/7 access to the **Shield Response Team (SRT)**.\n- **DDoS cost protection**: credits for scaling charges caused by an attack.\n- WAF at no extra charge for protected resources, and health-based detection with Route 53 health checks.\n\nArchitecture also absorbs DDoS: CloudFront and Global Accelerator spread load over the edge, Auto Scaling absorbs bursts, and keeping origins private (only reachable from CloudFront) removes attack surface."
      },
      {
        heading: "GuardDuty: intelligent threat detection",
        beyond: true,
        body: "**Amazon GuardDuty** continuously analyses data sources you don't have to configure or store: **CloudTrail management events, VPC Flow Logs and Route 53 DNS query logs** (foundational, no agents), plus optional protection plans for **S3 data events, EKS audit logs, runtime monitoring (EC2, ECS, EKS via an agent), Malware Protection (EBS volumes and S3 uploads), RDS login activity and Lambda network activity**.\n\nIt uses threat intelligence feeds and machine learning to raise **findings** such as: an EC2 instance talking to a known command-and-control server or crypto-mining pool, API calls from a Tor exit node, unusual credential use from a new country, or instance credentials being used from outside AWS.\n\nGuardDuty is regional, enabled with one click (30-day free trial), and supports a **delegated administrator** to manage all org accounts. It **detects but does not block**: findings go to **EventBridge**, where you trigger automated remediation (for example a Lambda that swaps the instance's security group to an isolation SG, or disables the leaked access key)."
      },
      {
        heading: "Inspector vs Macie",
        beyond: true,
        body: "Both scan; they scan different things.\n\n- **Amazon Inspector** is a **vulnerability management** service. It continuously scans **EC2 instances** (via the SSM agent, or agentless EBS snapshot scanning), **container images in ECR**, and **Lambda functions** (packages and code) for known software vulnerabilities (**CVEs**) and unintended **network reachability** (e.g. a port reachable from the internet). Findings get a risk score and flow to Security Hub and EventBridge. Inspector re-scans automatically when a new CVE is published.\n- **Amazon Macie** is a **data security** service for **S3 only**. It uses machine learning and pattern matching to discover **sensitive data** (PII such as names, passport and credit card numbers, plus credentials and keys) and flags buckets that are public, unencrypted or shared outside the account.\n\nMemory hook: Inspector inspects your **software**; Macie finds sensitive data in your **S3 buckets**."
      },
      {
        heading: "Security Hub, Detective, Config and Firewall Manager",
        beyond: true,
        body: "- **AWS Security Hub** aggregates findings from GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager and partner tools into one normalised view across accounts and Regions, and runs automated **security standards** checks (AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark, PCI DSS, NIST 800-53) that rely on **AWS Config**. In 2025 AWS renamed the posture-checking part **Security Hub CSPM** and launched an expanded Security Hub that correlates findings into prioritised exposures; the exam idea stays 'single pane of glass for security findings and compliance scores'.\n- **Amazon Detective** builds a behaviour graph from CloudTrail, Flow Logs, GuardDuty findings and EKS logs to **investigate** root cause after a finding.\n- **AWS Config** records resource configuration history and evaluates **Config rules** (e.g. 's3-bucket-public-read-prohibited'), with optional auto-remediation through Systems Manager Automation. Think 'compliance auditing of resource settings over time'.\n- **AWS Firewall Manager** centrally enforces WAF rules, Shield Advanced, security group policies, Network Firewall and Route 53 Resolver DNS Firewall across all accounts in an organization, including new accounts as they appear.\n- **CloudTrail** records API calls (who did what, when); it's the audit log every other detective service builds on."
      },
      {
        heading: "Automated response pattern",
        beyond: true,
        body: "The exam's favourite security automation: **detect → route → remediate**.\n\n- GuardDuty (or Security Hub, Inspector, Config) emits a finding.\n- An **EventBridge** rule matches the finding type and severity.\n- The target runs the fix: a **Lambda** function, a **Systems Manager Automation** runbook, a **Step Functions** workflow, or an **SNS** notification to the on-call team.\n\nExamples: isolate a compromised instance by replacing its security groups and snapshotting its EBS volume for forensics; disable an IAM access key used from an unusual location; re-enable Block Public Access on a bucket flagged by Config. Prefer these managed integrations over custom polling scripts when the question says 'least operational overhead'."
      }
    ],
    diagram: {
      title: "Block at the edge, detect inside, respond automatically",
      nodes: [
        { id: "att", label: "Attacker", icon: "attacker", x: 7, y: 14, sub: "SQLi + floods" },
        { id: "user", label: "Customer", icon: "user", x: 7, y: 46 },
        { id: "shield", label: "Shield", icon: "shield", x: 25, y: 8, sub: "DDoS L3/L4" },
        { id: "waf", label: "WAF web ACL", icon: "waf", x: 25, y: 30, sub: "on CloudFront" },
        { id: "alb", label: "ALB", icon: "alb", x: 43, y: 30 },
        { id: "app", label: "App servers", icon: "ec2", x: 61, y: 30 },
        { id: "insp", label: "Inspector", icon: "inspector", x: 61, y: 10, sub: "CVE scans" },
        { id: "gd", label: "GuardDuty", icon: "guardduty", x: 50, y: 50, sub: "logs + ML" },
        { id: "eb", label: "EventBridge", icon: "eventbridge", x: 70, y: 50, sub: "match finding" },
        { id: "fix", label: "Remediate", icon: "lambda", x: 88, y: 38, sub: "isolate instance" },
        { id: "hub", label: "Security Hub", icon: "security-hub", x: 88, y: 12, sub: "all findings" }
      ],
      edges: [
        { id: "e-flood", from: "att", to: "shield", label: "SYN flood" },
        { id: "e-att", from: "att", to: "waf", label: "' OR 1=1" },
        { id: "e-user", from: "user", to: "waf" },
        { id: "e-alb", from: "waf", to: "alb" },
        { id: "e-app", from: "alb", to: "app" },
        { id: "e-insp", from: "insp", to: "app", dashed: true },
        { id: "e-gd", from: "app", to: "gd", label: "flow + DNS logs", dashed: true },
        { id: "e-eb", from: "gd", to: "eb", label: "finding" },
        { id: "e-fix", from: "eb", to: "fix" },
        { id: "e-iso", from: "fix", to: "app", label: "swap SG" },
        { id: "e-hub", from: "insp", to: "hub", dashed: true }
      ],
      steps: [
        { caption: "A volumetric SYN flood hits the edge. Shield Standard absorbs common layer 3/4 attacks automatically, at no cost.", highlight: ["att", "shield", "e-flood"], flow: [{ edge: "e-flood", color: "bad" }], fail: ["e-flood"] },
        { caption: "An SQL injection attempt reaches CloudFront. The WAF managed SQL rule set blocks it before it touches the origin.", highlight: ["waf", "e-att"], flow: [{ edge: "e-att", color: "bad" }], fail: ["e-att"] },
        { caption: "Legitimate customer requests pass the WAF and continue to the ALB and app servers.", highlight: ["user", "e-user", "e-alb", "e-app", "alb", "app"], flow: [{ edge: "e-user" }, { edge: "e-alb" }, { edge: "e-app" }] },
        { caption: "Inspector continuously scans the instances for CVEs and open network paths, sending findings to Security Hub.", highlight: ["insp", "e-insp", "e-hub", "hub"], flow: [{ edge: "e-insp" }, { edge: "e-hub" }] },
        { caption: "An instance starts talking to a known crypto-mining pool. GuardDuty spots it in VPC Flow Logs and DNS logs, with no agents.", highlight: ["gd", "e-gd", "app"], flow: [{ edge: "e-gd" }] },
        { caption: "GuardDuty detects but doesn't block. Its finding goes to EventBridge, which triggers a Lambda remediation.", highlight: ["eb", "e-eb", "e-fix", "fix"], flow: [{ edge: "e-eb" }, { edge: "e-fix" }] },
        { caption: "The function swaps the instance's security group to an isolation group and snapshots its volume for forensics.", highlight: ["e-iso", "app"], flow: [{ edge: "e-iso" }] }
      ]
    },
    keyFacts: [
      "WAF attaches to CloudFront, ALB, API Gateway (REST), AppSync, Cognito user pools, App Runner and Verified Access, not to NLB.",
      "WAF rate-based rules block IPs exceeding a request threshold; geo match blocks countries.",
      "Shield Standard: free, automatic, layer 3/4. Shield Advanced: $3,000/month per org, 1-year term, SRT, DDoS cost protection.",
      "GuardDuty foundational sources: CloudTrail management events, VPC Flow Logs, DNS logs. No agents needed.",
      "GuardDuty detects only; automate response with EventBridge → Lambda / SSM Automation.",
      "Inspector scans EC2, ECR images and Lambda for CVEs and network reachability.",
      "Macie discovers sensitive data (PII) in S3 only.",
      "Security Hub aggregates findings and runs standards (CIS, AWS FSBP, PCI DSS); it needs AWS Config.",
      "Detective investigates root cause; Firewall Manager enforces firewall policies org-wide."
    ],
    examTips: [
      "'Protect a web app from SQL injection and cross-site scripting' → AWS WAF on CloudFront or the ALB.",
      "'Block requests from specific countries' → WAF geo match (or CloudFront geo restriction).",
      "'Mitigate HTTP floods / brute-force logins from single IPs' → WAF rate-based rule.",
      "'DDoS protection with 24/7 response team and cost protection' → Shield Advanced.",
      "'Detect compromised instances or anomalous API calls with no agents' → GuardDuty.",
      "'Find PII in S3 buckets' → Macie. 'Find software vulnerabilities in EC2/containers' → Inspector.",
      "'Single view of security findings and compliance across accounts' → Security Hub.",
      "'Apply WAF rules across all accounts in the organization automatically' → Firewall Manager."
    ],
    pitfalls: [
      "Trying to attach WAF to a Network Load Balancer.",
      "Expecting GuardDuty to block traffic. It only produces findings.",
      "Mixing up Inspector (vulnerabilities in compute) and Macie (sensitive data in S3).",
      "Paying for Shield Advanced when the requirement is basic DDoS protection; Shield Standard is already on.",
      "Choosing Config for threat detection. Config tracks configuration compliance, not attacks."
    ],
    prosCons: [
      {
        option: "WAF on CloudFront",
        pros: ["Blocks attacks at the edge, before the Region", "Protects all origins behind the distribution"],
        cons: ["Only covers traffic through CloudFront (lock the origin down too)"],
        useWhen: "Public web apps served via CloudFront; the reference 3-tier design."
      },
      {
        option: "WAF on ALB",
        pros: ["Regional, simple to add to an existing ALB", "No CDN required"],
        cons: ["Attack traffic reaches the Region first"],
        useWhen: "Apps without CloudFront, or internal/regional apps."
      },
      {
        option: "Shield Standard vs Advanced",
        pros: ["Standard: free, automatic", "Advanced: SRT, layer 7 mitigation, cost protection, WAF included"],
        cons: ["Standard: no SRT or cost protection", "Advanced: $3,000/month with 1-year commitment"],
        useWhen: "Standard always; Advanced for business-critical, frequently targeted apps."
      }
    ],
    services: ["waf", "shield", "guardduty", "inspector", "macie", "security-hub", "detective", "firewall-manager", "config", "eventbridge", "cloudtrail"]
  },

  // ------------------------------------------------------------------ 15
  {
    id: "m1-ref-3tier",
    module: "m1",
    domain: "secure",
    title: "Reference Architecture: Secure 3-Tier Web App",
    minutes: 25,
    summary: "Walk a secure, highly available 3-tier web application from DNS to database, explain why each layer is built the way it is, and spot the mis-built layer in any 'make it more secure' question.",
    analogy: {
      title: "A bank branch with layered security",
      body: "A bank branch is built in layers. The street sign (DNS) tells you where it is. The lobby (CloudFront and the load balancer) is open to the public but watched by guards at the door (WAF, Shield). Behind the counter (the app tier) only staff work, and they can only be reached through the counter. The vault (the database) sits in the back; only specific staff can open it, its contents are locked in boxes (encryption), and the vault combination changes every month (Secrets Manager).\n\nThere's a separate staff entrance with a badge reader that records every entry (Session Manager), not a back door propped open (SSH from anywhere). If one branch floods, a twin branch next door (another AZ) is already open."
    },
    sections: [
      {
        heading: "The whole flow at a glance",
        body: "Trace this end to end; half of Domain 1's questions are variations of it.\n\n**User → Route 53 → CloudFront (+ WAF, ACM cert) → ALB in public subnets (3 AZs) → EC2 Auto Scaling group in private subnets → RDS Multi-AZ in private database subnets.**\n\nSupporting pieces: one NAT gateway per AZ for outbound patches, a gateway endpoint for S3, Secrets Manager for credentials, KMS for encryption, Session Manager for admin access, and CloudTrail + VPC Flow Logs + GuardDuty for visibility. The VPC is `10.0.0.0/16` with public, app and DB subnets in each of three AZs."
      },
      {
        heading: "Tier 1: the edge (Route 53, CloudFront, WAF, Shield, ACM)",
        body: "- **Route 53 alias record** for `www.example.com` points to the CloudFront distribution. Alias records are free to query and work at the zone apex (`example.com`), which a CNAME can't.\n- **CloudFront** caches static content at the edge (lower latency, less load on the origin), terminates TLS close to users, and hides the origin.\n- **ACM certificate** for CloudFront, requested in **us-east-1**; viewer policy 'Redirect HTTP to HTTPS'.\n- **AWS WAF** web ACL on CloudFront: managed rule groups for SQL injection and XSS, a rate-based rule for floods and brute force, geo blocking if needed.\n- **Shield Standard** absorbs layer 3/4 DDoS automatically; upgrade to Advanced only for high-value targets.\n\nWhy at the edge: attacks are stopped before they consume Regional resources, and the origin's address is never exposed."
      },
      {
        heading: "Tier 2: the load balancer in public subnets",
        body: "- An **Application Load Balancer** spans the three **public** subnets (one per AZ). It's the only internet-facing component in the VPC.\n- **ALB security group**: inbound 443 from the **CloudFront managed prefix list** only (or 0.0.0.0/0 if there's no CloudFront), so attackers can't bypass the CDN and its WAF by hitting the ALB directly. A custom header check from CloudFront adds a second lock.\n- Listener on 80 that **redirects to HTTPS 443**; the HTTPS listener uses a Regional ACM certificate.\n- The ALB health-checks targets and only routes to healthy instances in any AZ.\n\nWhy an ALB and not instances with public IPs: the app servers can stay private, the ALB is managed and multi-AZ, and it does layer 7 routing and TLS termination."
      },
      {
        heading: "Tier 3: the app tier in private subnets",
        body: "- **EC2 instances in an Auto Scaling group** spread across three **private** app subnets. No public IPs.\n- **App security group**: inbound on the app port (e.g. 8080) **only from the ALB's security group**.\n- **Instance role** (instance profile) grants exactly the S3, DynamoDB, SQS or Secrets Manager access the app needs. No access keys anywhere, and IMDSv2 required.\n- **Admin access via SSM Session Manager**: no SSH keys, no bastion, no port 22, every session logged to CloudWatch Logs or S3.\n- Outbound internet for patches through the **NAT gateway in the same AZ**; S3 traffic through the free **gateway endpoint**.\n- Patching with **Systems Manager Patch Manager**; golden AMIs built and scanned (Inspector) before use.\n\nWhy private: if instances aren't reachable from the internet, a whole class of attacks (port scans, SSH brute force) disappears."
      },
      {
        heading: "Tier 4: the data tier",
        body: "- **RDS Multi-AZ** (or Aurora) in dedicated private **DB subnets** (a DB subnet group spanning at least two AZs). The synchronous standby in another AZ takes over automatically in about 60-120 seconds if the primary fails.\n- **DB security group**: inbound 3306 (MySQL) or 5432 (PostgreSQL) **only from the app security group**. Never from 0.0.0.0/0 or the whole VPC.\n- **Not publicly accessible** (the RDS 'Public access' setting off).\n- **Storage encrypted with a customer managed KMS key** at creation; backups, snapshots and replicas inherit it.\n- **Credentials in Secrets Manager with automatic rotation**; the app fetches them at runtime via its instance role.\n- **TLS in transit** enforced with `require_secure_transport` / `rds.force_ssl`.\n- Automated backups (up to 35 days) and deletion protection on."
      },
      {
        heading: "Visibility and governance across the account",
        body: "- **CloudTrail** organization trail to a locked-down S3 bucket in a log-archive account (with log file validation).\n- **VPC Flow Logs** for the VPC to CloudWatch Logs or S3.\n- **GuardDuty** on in every account and Region, findings routed through EventBridge to responders.\n- **AWS Config** rules and **Security Hub** standards to catch drift (a public bucket, an open SG, an unencrypted volume).\n- **SCPs** that prevent disabling any of the above.\n\nEvery 'make it more secure' question asks you to find the layer that's mis-built: a database in a public subnet, hard-coded keys, an app SG open to 0.0.0.0/0, unencrypted storage, SSH open from anywhere, or a single NAT gateway for all AZs."
      },
      {
        heading: "Spotting the mis-built layer",
        body: "Use this checklist against any architecture in a question.",
        table: {
          headers: ["Smell in the question", "Layer", "Fix"],
          rows: [
            ["Database in a public subnet / publicly accessible", "Data", "Move to private DB subnets; public access off"],
            ["Access keys in code, config or user data", "App", "IAM role via instance profile"],
            ["App or DB SG allows 0.0.0.0/0", "App / Data", "Reference the upstream tier's SG"],
            ["SSH 22 open to the world, bastion sprawl", "App", "Session Manager"],
            ["Unencrypted RDS/EBS", "Data", "Snapshot → encrypted copy → restore; enable EBS encryption by default"],
            ["DB password hard-coded or never rotated", "Data", "Secrets Manager with rotation"],
            ["ALB reachable directly, bypassing CloudFront/WAF", "Edge / LB", "ALB SG = CloudFront prefix list (+ custom header)"],
            ["Single NAT gateway for all AZs", "Egress", "One NAT per AZ"],
            ["S3 traffic through NAT, high cost", "Egress", "Gateway endpoint"],
            ["No audit trail", "Governance", "CloudTrail + Flow Logs + GuardDuty, protected by SCP"]
          ]
        }
      }
    ],
    diagram: {
      title: "Secure 3-tier web application",
      groups: [
        { id: "vpc", label: "VPC 10.0.0.0/16", kind: "vpc", x: 28, y: 3, w: 57, h: 54 },
        { id: "pub", label: "Public subnets", kind: "subnet-public", x: 30, y: 7, w: 17, h: 46 },
        { id: "app-sub", label: "Private app", kind: "subnet-private", x: 49, y: 7, w: 17, h: 46 },
        { id: "db-sub", label: "Private DB", kind: "subnet-private", x: 68, y: 7, w: 15, h: 46 }
      ],
      nodes: [
        { id: "user", label: "User", icon: "user", x: 6, y: 42 },
        { id: "r53", label: "Route 53", icon: "route53", x: 6, y: 16, sub: "alias record" },
        { id: "cf", label: "CloudFront", icon: "cloudfront", x: 18, y: 30, sub: "WAF + ACM" },
        { id: "alb", label: "ALB", icon: "alb", x: 38, y: 18, sub: "443 from CF list" },
        { id: "nat", label: "NAT GW", icon: "nat-gateway", x: 38, y: 44, sub: "one per AZ" },
        { id: "app", label: "App ASG", icon: "auto-scaling", x: 57, y: 18, sub: "8080 from sg-alb" },
        { id: "gwe", label: "S3 endpoint", icon: "gateway-endpoint", x: 57, y: 44, sub: "free, private" },
        { id: "rds", label: "RDS primary", icon: "rds-multi-az", x: 75, y: 18, sub: "3306 from sg-app" },
        { id: "standby", label: "RDS standby", icon: "rds", x: 75, y: 44, sub: "other AZ, sync" },
        { id: "sm", label: "Secrets Mgr", icon: "secrets-manager", x: 92, y: 18, sub: "rotated creds" },
        { id: "s3", label: "S3", icon: "s3", x: 92, y: 44, sub: "SSE-KMS" },
        { id: "att", label: "Attacker", icon: "attacker", x: 18, y: 53, sub: "direct to ALB" }
      ],
      edges: [
        { id: "e-dns", from: "user", to: "r53", label: "DNS" },
        { id: "e-cf", from: "user", to: "cf", label: "HTTPS" },
        { id: "e-alb", from: "cf", to: "alb" },
        { id: "e-app", from: "alb", to: "app" },
        { id: "e-db", from: "app", to: "rds" },
        { id: "e-rep", from: "rds", to: "standby", dashed: true, label: "sync" },
        { id: "e-sec", from: "app", to: "sm", label: "role" },
        { id: "e-nat", from: "app", to: "nat", label: "patches" },
        { id: "e-gwe", from: "app", to: "gwe" },
        { id: "e-s3", from: "gwe", to: "s3" },
        { id: "e-att", from: "att", to: "alb", dashed: true }
      ],
      steps: [
        { caption: "Route 53 answers with an alias to CloudFront. The user connects over HTTPS to the nearest edge location.", highlight: ["user", "r53", "cf", "e-dns", "e-cf"], flow: [{ edge: "e-dns" }, { edge: "e-cf" }] },
        { caption: "At the edge, WAF filters SQLi/XSS and floods, Shield absorbs DDoS, and an ACM certificate (us-east-1) provides TLS.", highlight: ["cf"] },
        { caption: "CloudFront forwards to the ALB in the public subnets. The ALB SG only admits the CloudFront prefix list, so direct attacks are dropped.", highlight: ["alb", "pub", "e-alb", "att", "e-att"], flow: [{ edge: "e-alb" }, { edge: "e-att", color: "bad" }], fail: ["e-att"] },
        { caption: "The app tier runs in private subnets with no public IPs. Its SG accepts the app port only from the ALB's SG.", highlight: ["app", "app-sub", "e-app"], flow: [{ edge: "e-app" }] },
        { caption: "The app fetches rotated DB credentials from Secrets Manager using its instance role. No keys or passwords in code.", highlight: ["sm", "e-sec"], flow: [{ edge: "e-sec" }, { edge: "e-sec", reverse: true }] },
        { caption: "The DB SG accepts 3306 only from the app SG. Storage is encrypted with a customer managed KMS key.", highlight: ["rds", "db-sub", "e-db"], flow: [{ edge: "e-db" }] },
        { caption: "Outbound patches go through the NAT gateway in the same AZ; S3 traffic takes the free gateway endpoint and never touches the internet.", highlight: ["nat", "gwe", "s3", "e-nat", "e-gwe", "e-s3"], flow: [{ edge: "e-nat" }, { edge: "e-gwe" }, { edge: "e-s3" }] },
        { caption: "The primary database's AZ fails. RDS Multi-AZ promotes the synchronous standby and the endpoint DNS follows it automatically.", highlight: ["standby", "e-rep"], fail: ["rds"], flow: [{ edge: "e-rep" }] }
      ]
    },
    keyFacts: [
      "Flow: Route 53 → CloudFront (+WAF, ACM) → ALB (public subnets) → EC2 ASG (private subnets) → RDS Multi-AZ (private DB subnets).",
      "Only the ALB (and NAT gateways) live in public subnets; app and DB tiers have no public IPs.",
      "SG chain: ALB 443 from internet/CloudFront prefix list → app port from sg-alb → 3306 from sg-app.",
      "CloudFront certificates must be in us-east-1; ALB certificates in the ALB's Region.",
      "Admin access through SSM Session Manager: no port 22, no bastion, sessions logged.",
      "RDS Multi-AZ failover to the synchronous standby takes roughly 60-120 seconds with no endpoint change.",
      "One NAT gateway per AZ; gateway endpoint for S3 keeps S3 traffic private and free.",
      "CloudTrail, VPC Flow Logs and GuardDuty on across the account, protected by SCPs."
    ],
    examTips: [
      "'Make this architecture more secure' → find the mis-built layer: public DB, hard-coded keys, open SG, unencrypted storage, SSH from anywhere.",
      "'Users bypass CloudFront and hit the ALB directly' → restrict the ALB SG to the CloudFront managed prefix list (plus a custom header).",
      "'Secure administrative access with no inbound ports' → Session Manager.",
      "'App needs database credentials securely with rotation' → Secrets Manager, fetched with the instance role.",
      "'Protect the web tier from SQL injection' → WAF on CloudFront or the ALB, not security groups.",
      "'Survive the loss of an AZ' → ALB + ASG across 3 AZs, RDS Multi-AZ, NAT gateway per AZ."
    ],
    pitfalls: [
      "Putting app servers or databases in public subnets 'for easier access'.",
      "Allowing the DB from the VPC CIDR instead of the app SG.",
      "Using a single NAT gateway and calling the design highly available.",
      "Forgetting that WAF on CloudFront is useless if the ALB can be reached directly.",
      "Treating RDS read replicas as the HA answer; Multi-AZ is for availability, replicas are for read scaling."
    ],
    prosCons: [
      {
        option: "CloudFront in front of the ALB",
        pros: ["Edge caching lowers latency and origin load", "WAF and Shield at the edge", "Hides the origin"],
        cons: ["Extra cost and config (cache behaviours, invalidations)", "Must lock the ALB to CloudFront"],
        useWhen: "Public, global or attack-prone web apps (the reference answer)."
      },
      {
        option: "ALB directly on the internet",
        pros: ["Simpler and cheaper", "WAF can still attach to the ALB"],
        cons: ["No edge caching", "Attacks reach the Region"],
        useWhen: "Regional apps with users near the Region and little static content."
      },
      {
        option: "Bastion host vs Session Manager",
        pros: ["Bastion: familiar SSH workflows", "Session Manager: no open ports, IAM-controlled, full logging"],
        cons: ["Bastion: port 22 exposed, keys to manage, instance to patch", "Session Manager: needs SSM agent, role, endpoint/NAT path"],
        useWhen: "Session Manager for 'most secure/least overhead'; bastion only for legacy constraints."
      },
      {
        option: "RDS Multi-AZ vs Aurora",
        pros: ["RDS Multi-AZ: simple, standard engines, synchronous standby", "Aurora: 6 copies across 3 AZs, faster failover (~30 s), up to 15 read replicas"],
        cons: ["RDS Multi-AZ: standby doesn't serve reads (classic deployment)", "Aurora: higher cost, MySQL/PostgreSQL only"],
        useWhen: "RDS Multi-AZ for a standard HA database; Aurora for high throughput, many readers, fastest failover."
      },
      {
        option: "NAT gateway per AZ vs single NAT",
        pros: ["Per AZ: survives an AZ failure, no cross-AZ data charges", "Single: about one-third of the hourly cost in 3 AZs"],
        cons: ["Per AZ: more hourly charges", "Single: one AZ outage cuts egress for all"],
        useWhen: "Per AZ for production HA; single NAT only when cost explicitly beats availability (dev/test)."
      }
    ],
    services: ["route53", "cloudfront", "waf", "shield", "acm", "alb", "auto-scaling", "ec2", "rds-multi-az", "secrets-manager", "kms", "nat-gateway", "gateway-endpoint", "systems-manager", "cloudtrail", "vpc-flow-logs", "guardduty", "security-group"]
  }
] satisfies Lesson[];
