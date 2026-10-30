import type { Lesson } from '../types';

export default [
  // ---------------------------------------------------------------------------
  {
    id: 'm5-networking',
    module: 'm5',
    domain: 'secure',
    title: 'More Networking Services',
    minutes: 15,
    summary:
      'Tell AWS Client VPN (people into a VPC) apart from Site-to-Site VPN (networks into a VPC), and use AWS Resource Access Manager to share subnets, Transit Gateways and other resources across accounts instead of duplicating them.',
    analogy: {
      title: 'Staff badges, a bridge, and a shared office floor',
      body:
        "A company HQ has three ways in. **Client VPN** is a personal staff badge: each remote employee, wherever they are, taps in individually after proving who they are. **Site-to-Site VPN** is a private bridge between the HQ and a branch office: it joins two whole buildings, and nobody needs a personal badge to cross it.\n\n**Resource Access Manager** is the landlord letting several departments (accounts) work on the same office floor (a shared subnet). Each department brings its own desks and computers (instances), but only the landlord can move walls, change locks or rewire the floor (routing, NACLs).",
    },
    sections: [
      {
        heading: 'The problem: people and accounts, not just networks',
        body:
          "Earlier modules connected **networks**: VPC peering, Transit Gateway, Site-to-Site VPN, Direct Connect. Two other needs come up on the exam:\n\n- **Individual people** (remote employees on laptops) need secure access to private resources in a VPC from anywhere, authenticated against the corporate identity provider.\n- **Many AWS accounts** in an Organization need to use the same network or resources (a central VPC, a Transit Gateway, DNS resolver rules) without each account building and paying for its own copy.\n\nAWS Client VPN solves the first; AWS Resource Access Manager (RAM) solves the second. Both mostly appear as one-question topics or as distractors.",
      },
      {
        heading: 'AWS Client VPN: how it works',
        body:
          "AWS Client VPN is a **managed, OpenVPN-based** remote-access service. You create a **Client VPN endpoint** and configure:\n\n- **Authentication**: mutual certificate authentication (certificates in ACM), Active Directory (via AWS Directory Service), or **SAML 2.0 federation** (Okta, Entra ID, IAM Identity Center). You can combine certificates with AD or SAML.\n- **Client CIDR**: an IP range (between /12 and /22) assigned to connected laptops; it must not overlap the VPC.\n- **Target network associations**: subnets in the VPC (associate subnets in 2 AZs for high availability). Each association creates ENIs the client traffic exits from.\n- **Authorization rules**: which users or AD/SAML groups may reach which destination CIDRs (for example only the `Finance` group can reach 10.0.20.0/24).\n- **Route table**: destinations reachable through the endpoint (the VPC, peered VPCs, on-prem via the VPC, or the internet).\n- **Split-tunnel**: when enabled, only traffic for VPC routes goes through the tunnel; the user's normal web browsing stays on their home connection (cheaper and faster).\n\nUsers install the AWS-provided client (or any OpenVPN client) and connect over **TLS (UDP or TCP 443/1194)**. Security groups on the association ENIs control what clients reach. Pricing: per endpoint association-hour plus per active connection-hour.",
      },
      {
        heading: 'Client VPN vs Site-to-Site VPN',
        body:
          "The exam's favourite confusion pair.",
        table: {
          headers: ['', 'AWS Client VPN', 'AWS Site-to-Site VPN'],
          rows: [
            ['Connects', 'PEOPLE (individual devices) to a VPC', 'NETWORKS (office or data centre) to a VPC or Transit Gateway'],
            ['On-prem side', 'Software client on each laptop', 'Customer gateway device (router/firewall) with a public IP'],
            ['Protocol', 'OpenVPN over TLS', 'IPsec, two tunnels per connection'],
            ['Authentication', 'Certificates, AD, SAML / IAM Identity Center', 'Pre-shared keys or certificates between devices'],
            ['Typical trigger', '"Remote employees need secure access from anywhere"', '"Connect the data centre to the VPC quickly over the internet"'],
          ],
        },
      },
      {
        heading: 'AWS Resource Access Manager (RAM)',
        body:
          "**RAM** shares AWS resources you own with other accounts, OUs or your whole Organization, **without copying them**. The receiving account uses the resource as if it were its own. Shareable resources the exam mentions:\n\n- **VPC subnets** (VPC sharing)\n- **Transit Gateways** (so every account can attach its VPCs to one central TGW)\n- **Route 53 Resolver rules** (central hybrid DNS forwarding)\n- **License Manager configurations**, **Capacity Reservations**, **Outposts**, AWS Network Firewall policies, prefix lists, and more\n\nWithin an Organization (with sharing enabled for Organizations), shares to OUs or the org need no invitation; shares to outside accounts require acceptance.\n\nRAM does not **move** resources and does not **copy** them; it grants use. The owner still pays for the resource itself (for example the TGW attachment hours belong to the attaching account, the TGW to the owner).",
      },
      {
        heading: 'VPC sharing in detail',
        body:
          "With VPC sharing, a central **networking account** owns the VPC and shares specific subnets with participant accounts.\n\n- **Owner** controls the VPC, subnets, route tables, NACLs, Internet/NAT Gateways, VPC endpoints and Transit Gateway attachments. Network controls live in one place.\n- **Participants** launch their own EC2 instances, RDS databases, Lambda ENIs, load balancers and so on into the shared subnets. They own and pay for those resources, manage their own **security groups**, and cannot see or modify other participants' resources or the subnet configuration.\n- Benefits: fewer VPCs (fewer IP ranges to plan, fewer TGW attachments and NAT Gateways to pay for), centralised governance, and same-VPC latency between accounts' workloads.\n\nContrast: **VPC peering** and **Transit Gateway** connect *separate* VPCs; they do not let another account launch into *your* subnets.",
      },
      {
        heading: 'Hybrid DNS with Route 53 Resolver endpoints',
        body:
          "A common companion to RAM. The **Route 53 Resolver** (the `.2` DNS server in every VPC) can be extended with endpoints:\n\n- **Inbound endpoint**: ENIs in your VPC that on-prem DNS servers forward to, so on-prem clients can resolve private hosted zones (for example `db.internal.example.com`).\n- **Outbound endpoint** + **forwarding rules**: VPC resources resolve on-prem names (for example `corp.local`) by forwarding queries to on-prem DNS servers over VPN or Direct Connect.\n\nCreate the rules once in the networking account and share them with every account through RAM. Exam trigger: 'resolve on-premises hostnames from VPCs (or vice versa) over Direct Connect'.\n\nAlso worth recognising: **Amazon VPC Lattice** is an application-layer service network that connects services across VPCs and accounts with IAM-based auth policies, without managing peering or TGW routing.",
        beyond: true,
      },
      {
        heading: 'Exam angle',
        body:
          "- '300 remote employees reach private EC2 resources from home, authenticate with the corporate IdP' → **Client VPN** endpoint with SAML federation, associated with subnets in the VPC. Site-to-Site needs a customer gateway device; a bastion with SSH keys has no IdP integration and exposes port 22.\n- 'Connect the data centre' → Site-to-Site VPN (or Direct Connect).\n- 'All accounts launch workloads into centrally managed subnets in a networking account' → **RAM VPC sharing**. Peering creates separate VPCs; Transit Gateway connects VPCs but does not let accounts launch into your subnets.\n- 'Share the Transit Gateway with all accounts in the Organization' → RAM.\n- 'Only send VPC-bound traffic through the VPN' → Client VPN split-tunnel.",
      },
    ],
    diagram: {
      title: 'Client VPN, Site-to-Site VPN and a shared VPC',
      groups: [
        { id: 'g-vpc', label: 'Shared VPC (network acct)', kind: 'vpc', x: 40, y: 5, w: 56, h: 50 },
        { id: 'g-sub', label: 'Shared private subnet', kind: 'subnet-private', x: 45, y: 12, w: 47, h: 20 },
      ],
      nodes: [
        { id: 'staff', label: 'Remote staff', icon: 'users', x: 7, y: 14, sub: 'laptops anywhere' },
        { id: 'dc', label: 'Data centre', icon: 'onprem', x: 7, y: 44, sub: 'customer gateway' },
        { id: 'cvpn', label: 'Client VPN', icon: 'client-vpn', x: 27, y: 14, sub: 'SAML via IdP' },
        { id: 's2s', label: 'Site-to-Site VPN', icon: 'site-to-site-vpn', x: 27, y: 44, sub: '2 IPsec tunnels' },
        { id: 'appb', label: 'App (Acct B)', icon: 'ec2', x: 58, y: 22, sub: 'own SGs' },
        { id: 'appc', label: 'App (Acct C)', icon: 'ec2', x: 80, y: 22, sub: 'own SGs' },
        { id: 'ram', label: 'RAM share', icon: 'ram', x: 68, y: 45, sub: 'subnets to the OU' },
      ],
      edges: [
        { id: 'e-auth', from: 'staff', to: 'cvpn', label: 'TLS' },
        { id: 'e-cv', from: 'cvpn', to: 'appb', label: 'authorized CIDRs' },
        { id: 'e-dc', from: 'dc', to: 's2s', label: 'IPsec' },
        { id: 'e-s2s', from: 's2s', to: 'appb' },
        { id: 'e-rb', from: 'ram', to: 'appb', dashed: true },
        { id: 'e-rc', from: 'ram', to: 'appc', dashed: true },
      ],
      steps: [
        {
          caption: 'A remote employee opens the VPN client and signs in through the corporate IdP (SAML). Client VPN gives the laptop an IP from the client CIDR.',
          highlight: ['staff', 'cvpn', 'e-auth'],
          flow: [{ edge: 'e-auth' }],
        },
        {
          caption: 'Authorization rules allow the user\'s group to reach the app subnet. With split-tunnel on, only VPC traffic uses the tunnel.',
          highlight: ['cvpn', 'appb', 'e-cv'],
          flow: [{ edge: 'e-cv' }],
        },
        {
          caption: 'The data centre joins as a whole network through a Site-to-Site VPN: a customer gateway device and two IPsec tunnels, no per-user login.',
          highlight: ['dc', 's2s', 'e-dc', 'e-s2s'],
          flow: [{ edge: 'e-dc' }, { edge: 'e-s2s' }],
        },
        {
          caption: 'The network account shares the private subnet with an OU through RAM. Nothing is copied; participants simply see the subnet.',
          highlight: ['ram', 'g-sub', 'e-rb', 'e-rc'],
          flow: [{ edge: 'e-rb' }, { edge: 'e-rc' }],
        },
        {
          caption: 'Accounts B and C launch their own instances into the shared subnet and manage their own security groups, paying for their own resources.',
          highlight: ['appb', 'appc'],
        },
        {
          caption: 'Only the owner can change routes, NACLs, NAT and endpoints for the VPC, so network controls live in one place.',
          highlight: ['g-vpc', 'g-sub'],
        },
      ],
    },
    keyFacts: [
      'Client VPN is managed OpenVPN (TLS); it connects individual devices to a VPC.',
      'Client VPN authentication: mutual certificates, Active Directory, or SAML 2.0 federation (including IAM Identity Center).',
      'The Client VPN client CIDR must be between /12 and /22 and must not overlap the VPC CIDR.',
      'Associate Client VPN with subnets in at least 2 AZs for high availability; authorization rules control which groups reach which CIDRs.',
      'Split-tunnel sends only VPC-route traffic through Client VPN.',
      'Site-to-Site VPN connects networks via a customer gateway device with 2 IPsec tunnels.',
      'RAM shares subnets, Transit Gateways, Route 53 Resolver rules, License Manager configurations, Capacity Reservations and Outposts.',
      'In VPC sharing, the owner controls subnets, route tables and NACLs; participants manage their own resources and security groups.',
      'RAM shares within an Organization need no invitation when sharing with Organizations is enabled.',
    ],
    examTips: [
      '"Remote employees on laptops need private VPC access, authenticated by the corporate IdP" → AWS Client VPN with SAML federation.',
      '"Connect an office network or data centre to a VPC over the internet" → Site-to-Site VPN, not Client VPN.',
      '"Accounts must launch resources into the same centrally managed VPC/subnets" → VPC sharing via RAM.',
      '"Share one Transit Gateway with every account in the Organization" → RAM.',
      '"Resolve on-prem DNS names from all VPCs in all accounts" → Route 53 Resolver outbound endpoint + forwarding rules shared via RAM.',
      'A bastion host with SSH keys is the distractor for remote-access questions that mention an identity provider.',
    ],
    pitfalls: [
      'Choosing Site-to-Site VPN for individual remote workers: it needs a customer gateway device and has no per-user authentication.',
      'Thinking RAM copies or moves a resource; it only grants use, and the owner keeps control.',
      'Expecting VPC peering or Transit Gateway to let other accounts launch into your subnets.',
      'Assuming participants in a shared VPC can edit route tables or NACLs.',
      'Overlapping the Client VPN client CIDR with the VPC CIDR.',
    ],
    prosCons: [
      {
        option: 'AWS Client VPN',
        pros: ['Per-user identity and authorization', 'Managed and elastic', 'Works from anywhere'],
        cons: ['Per-connection-hour cost', 'Client software on every device'],
        useWhen: 'Individual remote users need private VPC access.',
      },
      {
        option: 'Site-to-Site VPN',
        pros: ['Connects whole networks', 'Quick to set up over the internet'],
        cons: ['About 1.25 Gbps per tunnel', 'Internet variability', 'Needs a customer gateway device'],
        useWhen: 'An office or data centre network must reach the VPC.',
      },
      {
        option: 'VPC sharing (RAM)',
        pros: ['Central network control', 'Fewer VPCs, NATs and TGW attachments', 'No CIDR sprawl'],
        cons: ['Shared blast radius for network changes', 'Participants depend on the owner for routing'],
        useWhen: 'Many accounts should run in centrally governed subnets.',
      },
    ],
    services: ['client-vpn', 'site-to-site-vpn', 'ram', 'vpc', 'subnet', 'transit-gateway', 'route53', 'iam-identity-center', 'directory-service', 'organizations', 'vpc-lattice'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm5-governance',
    module: 'm5',
    domain: 'resilient',
    title: 'Management & Governance: CloudFormation, Config, CloudTrail, CloudWatch, SSM',
    minutes: 25,
    summary:
      'Know exactly which management service answers which question (who did it, what changed, is it healthy, how do I build it repeatably, how do I operate it, is it compliant) and configure each one the way exam scenarios expect.',
    analogy: {
      title: 'Running a large apartment building',
      body:
        "**CloudFormation** is the architect's blueprint: hand it to any builder and you get an identical building, every time. **CloudTrail** is the security desk's visitor log: who entered, when, and what door they used. **Config** is the building inspector who keeps a photo history of every room and flags anything that breaks code (a fire door propped open). **CloudWatch** is the dashboard of meters and alarms: temperature, water pressure, smoke detectors, plus the logbook of everything the machines report. **Systems Manager** is the maintenance crew with master keys: they can enter any flat, patch the plumbing and run the same job in 200 flats at once, without anyone giving out door keys.\n\n**Trusted Advisor** is the yearly consultant's checklist. **Control Tower** is the property-management company that sets up new buildings with all the rules pre-installed. **Service Catalog** is the approved furniture catalogue tenants can order from without being trusted with power tools.",
    },
    sections: [
      {
        heading: 'The problem: many accounts, many changes, one question each',
        body:
          "In a real AWS estate, dozens of people and pipelines make thousands of changes a day across many accounts. Governance means being able to answer, quickly and with evidence:\n\n- How do we build environments repeatably? (CloudFormation, Service Catalog, Control Tower)\n- **Who** did what, when, from where? (CloudTrail)\n- **What** does this resource look like now, how did it change, and is it compliant? (Config)\n- **Is it healthy and performing?** (CloudWatch metrics, alarms, logs)\n- How do we **operate** fleets (patch, run commands, log in) safely? (Systems Manager)\n- Are we following best practices? (Trusted Advisor, Well-Architected Tool)\n\nThese services are heavily tested both directly and as distractors for each other.",
      },
      {
        heading: 'Which tool answers which question',
        body:
          "Memorise the middle column; the exam trigger usually paraphrases it.",
        table: {
          headers: ['Service', 'Answers', 'Exam trigger'],
          rows: [
            ['CloudFormation', 'Build and update infrastructure from templates, repeatably', '"Reproducible environments", "deploy the same stack to many accounts/Regions" (StackSets)'],
            ['CloudTrail', 'WHO called WHICH API, when, from which IP', '"Audit API activity", "who deleted the bucket", "prove to auditors"'],
            ['AWS Config', 'WHAT a resource configuration is and was; compliance against rules', '"Track configuration changes over time", "detect non-compliant resources", "auto-remediate"'],
            ['CloudWatch', 'HOW resources and apps are performing: metrics, alarms, logs, dashboards', '"Alert when CPU > 80%", "centralise application logs", "monitor memory"'],
            ['Systems Manager', 'OPERATE fleets: sessions, commands, patching, parameters, runbooks', '"Shell access without SSH or bastion", "patch 500 instances", "store config values"'],
            ['Trusted Advisor', 'Best-practice checks across cost, security, fault tolerance, performance, service limits', '"Automated recommendations", "check service limits"'],
            ['Control Tower', 'Set up and govern a multi-account landing zone with controls', '"Quickly set up a secure, governed multi-account environment"'],
            ['Service Catalog', 'Self-service provisioning of pre-approved products', '"Developers deploy approved architectures without broad IAM rights"'],
            ['AWS Health Dashboard', 'AWS-side events affecting YOUR resources (maintenance, outages)', '"Notify when AWS schedules maintenance on our instances"'],
          ],
        },
      },
      {
        heading: 'AWS CloudFormation: infrastructure as code',
        body:
          "A **template** (YAML or JSON) declares resources; CloudFormation creates them as a **stack**, working out the dependency order itself. Template sections: `Parameters` (inputs such as instance type), `Mappings` (lookup tables such as AMI per Region), `Conditions`, **`Resources`** (the only required section), and `Outputs` (values to display or **Export** for other stacks via `Fn::ImportValue`).\n\nHow it behaves:\n\n- **Rollback**: if any resource fails to create, the whole stack rolls back by default, so you never get a half-built environment.\n- **Change sets** preview exactly what an update will add, modify or **replace** before you execute it.\n- **Drift detection** compares live resources with the template and reports manual changes (someone edited a security group in the console).\n- **DeletionPolicy**: `Retain` keeps a resource (for example an S3 bucket) when the stack is deleted; `Snapshot` takes a final snapshot of RDS/EBS; default is `Delete`. `UpdateReplacePolicy` does the same for replacements.\n- **StackSets** deploy one template to many accounts and Regions, and with service-managed permissions automatically to new accounts in an OU.\n- **Nested stacks** reuse common components; **stack policies** prevent updates to critical resources; **custom resources** (backed by Lambda) handle anything not natively supported; **cfn-init** and **creation policies / wait conditions** configure instances and wait for them to signal success.\n\nCloudFormation itself is free; you pay for the resources. Exam: 'reproducible', 'consistent across environments', 'infrastructure as code' → CloudFormation; 'many accounts or Regions' → StackSets.",
      },
      {
        heading: 'AWS CloudTrail: who did what',
        body:
          "CloudTrail records **API calls** (console, CLI, SDK, and AWS services acting for you) as **events**: identity, time, source IP, request parameters, response.\n\n- **Management events** (control plane: `RunInstances`, `CreateUser`, `PutBucketPolicy`) are recorded by default and visible for **90 days** in **Event history**, free.\n- **Data events** (data plane: S3 `GetObject`/`PutObject`, Lambda `Invoke`, DynamoDB item reads/writes) are high-volume, **off by default**, and charged per event when enabled on a trail.\n- **Insights events** detect unusual API call rates or error rates (for example a sudden burst of `DeleteObject`).\n\nTo keep events longer than 90 days, create a **trail** that delivers log files to an **S3 bucket** (and optionally CloudWatch Logs for metric filters and alarms). Best practice: a **multi-Region trail** (the default for new trails), or an **Organization trail** created in the management account that logs every member account into a central bucket in a Log Archive account. Enable **log file integrity validation** (SHA-256 hash digest files prove logs were not altered or deleted), encrypt with **SSE-KMS**, and protect the bucket with a restrictive bucket policy and **S3 Object Lock**. **CloudTrail Lake** stores events in a managed data lake you query with SQL.\n\nEvents typically arrive within about 5 minutes. EventBridge can react to specific API calls in near real time (for example alert when someone calls `StopLogging`).",
      },
      {
        heading: 'AWS Config: what changed and is it compliant',
        body:
          "The **configuration recorder** captures a **configuration item** each time a supported resource changes, building a **timeline** per resource with its relationships (this EC2 instance was in this security group, attached to this volume). Snapshots and history are delivered to S3.\n\n**Config rules** evaluate resources and mark them **COMPLIANT** or **NON_COMPLIANT**:\n\n- **Managed rules** (hundreds), for example `s3-bucket-public-read-prohibited`, `encrypted-volumes`, `restricted-ssh`, `required-tags`, `rds-multi-az-support`, `cloudtrail-enabled`.\n- **Custom rules** written as Lambda functions or in CloudFormation Guard.\n- Triggers: on **configuration change** or **periodic** (every 1, 3, 6, 12 or 24 hours).\n\n**Remediation**: attach an **SSM Automation runbook** to a rule (for example `AWS-DisableS3BucketPublicReadWrite`) and run it manually or **automatically** with retries. **Conformance packs** bundle rules and remediations (for example a PCI DSS pack) and deploy across an Organization. An **aggregator** collects compliance from many accounts and Regions into one view.\n\nKey limit: Config **detects and can remediate after the fact**; it does not **prevent** an API call. Prevention is IAM, SCPs or Control Tower preventive controls. Pricing: per configuration item recorded and per rule evaluation.",
      },
      {
        heading: 'Amazon CloudWatch: metrics, alarms and logs',
        body:
          "**Metrics** are time-ordered data points identified by a **namespace** (`AWS/EC2`), name (`CPUUtilization`) and **dimensions** (`InstanceId=i-0abc`). EC2 sends basic monitoring every **5 minutes** free; **detailed monitoring** (1 minute) costs extra. **Custom metrics** are published with `PutMetricData` at standard (1-minute) or **high resolution (down to 1 second)**. EC2 cannot see inside the guest OS, so **memory and disk-space utilisation require the CloudWatch agent**. Retention rolls up automatically: 1-second data for 3 hours, 1-minute for 15 days, 5-minute for 63 days, 1-hour for 455 days (15 months).\n\n**Alarms** watch one metric (or a metric math expression) over a **period** and number of **evaluation periods** (for example 3 of 3 five-minute periods above 80%). States: `OK`, `ALARM`, `INSUFFICIENT_DATA`. Actions: notify an **SNS topic**, trigger an **Auto Scaling policy**, run an **EC2 action** (stop, terminate, reboot, or **recover** onto healthy hardware), or create a Systems Manager OpsItem. **Composite alarms** combine alarms with AND/OR to cut noise; **anomaly detection** alarms use an ML band instead of a fixed threshold. **Billing alarms** use the `EstimatedCharges` metric in us-east-1.\n\n**CloudWatch Logs**: **log groups** (one per app) contain **log streams** (one per instance or container). Default retention is **never expire**; set 1 day to 10 years to control cost. **Metric filters** turn log patterns (for example `ERROR`) into metrics you can alarm on. **Subscription filters** stream logs in near real time to Lambda, Kinesis Data Streams, Data Firehose or OpenSearch. **Export to S3** is a batch job for archiving. **Logs Insights** runs interactive queries. Log groups can be encrypted with KMS. Sources include the CloudWatch agent, Lambda (automatic), ECS/EKS, API Gateway, VPC Flow Logs and CloudTrail.\n\nAlso: **dashboards** (cross-account, cross-Region), **Container Insights** and **Lambda Insights**, **Synthetics** canaries that probe endpoints, and **EventBridge** (formerly CloudWatch Events) for event-driven automation.",
      },
      {
        heading: 'AWS Systems Manager: operating fleets',
        body:
          "Systems Manager (SSM) needs the **SSM Agent** (preinstalled on Amazon Linux and Windows AMIs) and an instance profile with the `AmazonSSMManagedInstanceCore` policy. Private-subnet instances without NAT reach SSM through interface endpoints (`ssm`, `ssmmessages`, `ec2messages`). On-prem servers join through **hybrid activations**.\n\n- **Session Manager**: browser or CLI shell into instances **with no SSH keys, no bastion and no inbound port 22**; access controlled by IAM; sessions logged to S3 or CloudWatch Logs.\n- **Run Command**: run a script or document on 1 or 1,000 instances selected by tag, with rate control.\n- **Patch Manager**: patch baselines (which patches are approved) applied during **Maintenance Windows**; compliance reporting.\n- **Parameter Store**: hierarchical configuration and secrets (`/prod/db/url`). Standard tier is free (up to 10,000 parameters, 4 KB each); Advanced holds 8 KB and supports policies. **SecureString** parameters are encrypted with KMS. No built-in rotation: use **Secrets Manager** when rotation is required.\n- **Automation**: runbooks for multi-step operational tasks (restart, create AMI, remediate). Config remediation and EventBridge rules invoke them.\n- **State Manager** keeps instances in a defined state; **Inventory** collects installed software; **Fleet Manager** gives a console view; **OpsCenter** aggregates operational issues.",
      },
      {
        heading: 'Trusted Advisor, Control Tower, Service Catalog and friends',
        body:
          "**Trusted Advisor** runs checks in six categories: **cost optimisation, performance, security, fault tolerance, service limits (quotas), operational excellence**. Basic and Developer support get the **core checks** (S3 bucket permissions, unrestricted security group ports, IAM use, root MFA, public EBS/RDS snapshots, service limits); **Business support or higher** unlocks all checks, the API, EventBridge integration and organisational view.\n\n**AWS Control Tower** sets up a **landing zone**: a multi-account environment built on Organizations with a **Log Archive** account (central CloudTrail and Config logs) and an **Audit** account, IAM Identity Center for access, and **Account Factory** to vend new compliant accounts. It applies **controls** (formerly guardrails): **preventive** (implemented as SCPs, block actions), **detective** (implemented as Config rules, report violations) and **proactive** (CloudFormation hooks that check resources before they are created). Controls are mandatory, strongly recommended or elective.\n\n**AWS Service Catalog**: administrators publish **products** (CloudFormation templates, versioned) in **portfolios** shared with accounts or the Organization. A **launch constraint** names an IAM role that Service Catalog uses to provision, so end users need permission only to launch the product, not to create the underlying resources. **Template constraints** limit parameters (for example only t3.small or t3.medium); **TagOptions** enforce tags.\n\nOne-liners: **AWS Health Dashboard** shows AWS events affecting your resources and sends them to EventBridge; **License Manager** tracks and enforces BYOL licence counts (and can block launches over the limit); the **Well-Architected Tool** reviews a workload against the six pillars and records high-risk issues; **Amazon Managed Grafana** provides managed dashboards over CloudWatch, Prometheus, X-Ray and more with IAM Identity Center SSO; **Amazon Managed Service for Prometheus** is a managed Prometheus-compatible metrics store, typically for EKS.",
      },
    ],
    diagram: {
      title: 'Build, audit, detect, remediate, alarm',
      nodes: [
        { id: 'dev', label: 'Engineer', icon: 'user', x: 7, y: 12 },
        { id: 'cfn', label: 'CloudFormation', icon: 'cloudformation', x: 26, y: 12, sub: 'stack from template' },
        { id: 'bkt', label: 'S3 bucket', icon: 's3', x: 47, y: 12, sub: 'ACL made public' },
        { id: 'ct', label: 'CloudTrail', icon: 'cloudtrail', x: 70, y: 12, sub: 'PutBucketAcl by bob' },
        { id: 'cfg', label: 'AWS Config', icon: 'config', x: 47, y: 32, sub: 'public-read rule' },
        { id: 'eb', label: 'EventBridge', icon: 'eventbridge', x: 70, y: 32, sub: 'NON_COMPLIANT' },
        { id: 'ssm', label: 'SSM Automation', icon: 'systems-manager', x: 90, y: 32, sub: 'block public access' },
        { id: 'ec2', label: 'EC2 fleet', icon: 'ec2', x: 26, y: 49, sub: 'agent: mem + logs' },
        { id: 'cw', label: 'CloudWatch alarm', icon: 'cloudwatch', x: 50, y: 49, sub: 'mem > 85% x 3' },
        { id: 'sns', label: 'SNS on-call', icon: 'sns', x: 74, y: 49 },
      ],
      edges: [
        { id: 'e-deploy', from: 'dev', to: 'cfn', label: 'deploy' },
        { id: 'e-create', from: 'cfn', to: 'bkt', label: 'creates' },
        { id: 'e-trail', from: 'bkt', to: 'ct', label: 'API logged' },
        { id: 'e-ci', from: 'bkt', to: 'cfg', label: 'config item' },
        { id: 'e-eval', from: 'cfg', to: 'eb' },
        { id: 'e-run', from: 'eb', to: 'ssm', label: 'trigger' },
        { id: 'e-fix', from: 'ssm', to: 'bkt', label: 'remediate', dashed: true },
        { id: 'e-met', from: 'ec2', to: 'cw', label: 'metrics' },
        { id: 'e-page', from: 'cw', to: 'sns', label: 'ALARM' },
      ],
      steps: [
        {
          caption: 'An engineer deploys a CloudFormation template; the stack creates a private S3 bucket and the rest of the environment, identically every time.',
          highlight: ['dev', 'cfn', 'bkt', 'e-deploy', 'e-create'],
          flow: [{ edge: 'e-deploy' }, { edge: 'e-create' }],
        },
        {
          caption: 'Later someone makes the bucket public in the console. CloudTrail records the PutBucketAcl call: who, when, from which IP.',
          highlight: ['bkt', 'ct', 'e-trail'],
          flow: [{ edge: 'e-trail' }],
          fail: ['bkt'],
        },
        {
          caption: 'AWS Config records the new configuration item and the managed rule s3-bucket-public-read-prohibited marks the bucket NON_COMPLIANT.',
          highlight: ['cfg', 'e-ci'],
          flow: [{ edge: 'e-ci', color: 'bad' }],
        },
        {
          caption: 'The compliance change triggers automatic remediation: an SSM Automation runbook re-enables Block Public Access on the bucket.',
          highlight: ['cfg', 'eb', 'ssm', 'e-eval', 'e-run', 'e-fix'],
          flow: [{ edge: 'e-eval' }, { edge: 'e-run' }, { edge: 'e-fix' }],
        },
        {
          caption: 'CloudFormation drift detection would also report the bucket as DRIFTED, because its live settings no longer match the template.',
          highlight: ['cfn', 'bkt'],
        },
        {
          caption: 'Meanwhile the CloudWatch agent on the EC2 fleet publishes memory metrics. An alarm (above 85% for 3 periods) goes to ALARM and pages on-call via SNS.',
          highlight: ['ec2', 'cw', 'sns', 'e-met', 'e-page'],
          flow: [{ edge: 'e-met' }, { edge: 'e-page' }],
        },
      ],
    },
    keyFacts: [
      'CloudTrail Event history keeps 90 days of management events free; create a trail to S3 for longer retention.',
      'CloudTrail data events (S3 object-level, Lambda Invoke, DynamoDB items) are off by default and cost extra.',
      'Log file integrity validation uses SHA-256 digest files to prove CloudTrail logs were not modified or deleted.',
      'Config records configuration items and evaluates rules on change or periodically (1, 3, 6, 12 or 24 hours); remediation uses SSM Automation.',
      'Config detects and remediates; it does not prevent API calls (use SCPs/IAM or Control Tower preventive controls).',
      'EC2 basic monitoring is 5-minute and free; detailed is 1-minute; custom high-resolution metrics go down to 1 second.',
      'Memory and disk-space metrics need the CloudWatch agent.',
      'CloudWatch alarm states: OK, ALARM, INSUFFICIENT_DATA; actions include SNS, Auto Scaling and EC2 stop/terminate/reboot/recover.',
      'CloudWatch Logs retention defaults to never expire; subscription filters stream logs in near real time to Lambda, Kinesis, Firehose or OpenSearch.',
      'Session Manager needs the SSM Agent, an instance role with AmazonSSMManagedInstanceCore, and network reach to SSM (NAT or interface endpoints); no port 22.',
      'Parameter Store Standard: free, up to 10,000 parameters of 4 KB; no automatic rotation.',
      'Control Tower controls: preventive = SCPs, detective = Config rules, proactive = CloudFormation hooks.',
    ],
    examTips: [
      '"Who deleted / changed this resource?" → CloudTrail; "what did the resource look like last Tuesday and is it compliant?" → AWS Config.',
      '"Deploy the same infrastructure to many accounts and Regions" → CloudFormation StackSets.',
      '"Automatically fix non-compliant resources" → Config rule with automatic remediation via SSM Automation.',
      '"Monitor EC2 memory utilisation" → install the CloudWatch agent (it is not a default metric).',
      '"Alert when an error string appears in application logs" → CloudWatch Logs metric filter + alarm + SNS.',
      '"Shell access to private instances without bastion hosts, SSH keys or open inbound ports" → Systems Manager Session Manager.',
      '"Developers self-provision approved stacks without broad IAM permissions" → Service Catalog with a launch constraint role; Config only detects after the fact.',
      '"Set up a new governed multi-account environment quickly with guardrails" → Control Tower.',
    ],
    pitfalls: [
      'Choosing Config to answer "who made the API call" (CloudTrail) or CloudTrail to show configuration history (Config).',
      'Expecting CloudWatch to report EC2 memory without the agent.',
      'Assuming a Config rule blocks a change; it only evaluates after the change.',
      'Forgetting that CloudTrail data events must be explicitly enabled to audit S3 object reads.',
      'Using Parameter Store when the requirement is automatic secret rotation (Secrets Manager).',
      'Leaving CloudWatch Logs at "never expire" and paying for years of unneeded logs.',
    ],
    prosCons: [
      {
        option: 'CloudTrail',
        pros: ['Complete API audit trail', 'Org-wide trails', 'Integrity validation'],
        cons: ['Does not show resource state', 'Data events cost extra'],
        useWhen: 'You must know who did what, when.',
      },
      {
        option: 'AWS Config',
        pros: ['Configuration history and relationships', 'Compliance rules', 'Automatic remediation'],
        cons: ['Detective, not preventive', 'Cost scales with changes and evaluations'],
        useWhen: 'You must track configuration drift and compliance over time.',
      },
      {
        option: 'CloudWatch',
        pros: ['Metrics, alarms, logs and dashboards in one place', 'Native for every AWS service'],
        cons: ['Guest OS metrics need the agent', 'Log storage costs grow without retention'],
        useWhen: 'You must monitor performance and health, and alert on thresholds.',
      },
      {
        option: 'Service Catalog vs CloudFormation directly',
        pros: ['Catalog: governed self-service, users need no resource permissions', 'CloudFormation: full flexibility for platform teams'],
        cons: ['Catalog: admins curate products', 'CloudFormation: users need IAM rights for every resource'],
        useWhen: 'Catalog for end-user self-service of approved designs; CloudFormation for teams that own the infrastructure.',
      },
    ],
    services: ['cloudformation', 'cloudtrail', 'config', 'cloudwatch', 'cloudwatch-logs', 'systems-manager', 'parameter-store', 'trusted-advisor', 'control-tower', 'service-catalog', 'health-dashboard', 'license-manager', 'managed-grafana', 'managed-prometheus', 'eventbridge'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm5-compute-extra',
    module: 'm5',
    domain: 'performance',
    title: 'More Containers & Compute',
    minutes: 16,
    summary:
      'Recognise ECS Anywhere, EKS Anywhere, EKS Distro, VMware Cloud on AWS and the Serverless Application Repository, and know the steps (and tools like App2Container) for moving a legacy application into containers.',
    analogy: {
      title: 'A franchise kitchen manual',
      body:
        "A restaurant chain writes one standard recipe book and kitchen layout (the container image and orchestrator). **ECS Anywhere** and **EKS Anywhere** let a franchisee use that same book and head-office management system in their own building (your data centre). **EKS Distro** is the recipe book alone, free to copy, with no head-office support. **VMware Cloud on AWS** is moving your entire existing kitchen, appliances and all, into the chain's building without changing a single recipe.\n\n**Containerising a legacy app** is writing down grandma's cooking (all the hidden steps and ingredients) as a standard recipe card so any kitchen can reproduce it. **App2Container** is the assistant who watches grandma cook and writes the card for you.",
    },
    sections: [
      {
        heading: 'The problem: not everything can move to a Region today',
        body:
          "Some workloads must stay on-premises for a while (data residency, latency to factory equipment, sunk hardware investment), yet teams want one way to build and operate containers everywhere. Others are large VMware estates that need to leave a data centre fast, with no time to re-platform. And many legacy Java/.NET apps would benefit from containers but nobody knows exactly what is installed on their servers.\n\nThese in-scope services address each case. They appear mostly as one-liner recognition questions or distractors.",
      },
      {
        heading: 'Running AWS container tooling on-premises',
        body:
          "Compare the hybrid container options; Outposts is included because it is the usual alternative.",
        table: {
          headers: ['Option', 'What runs where', 'Exam trigger'],
          rows: [
            ['Amazon ECS Anywhere', 'ECS control plane stays in AWS; your on-prem servers/VMs register as external instances (via the SSM Agent) and run ECS tasks', '"Use the same ECS tooling for containers in the data centre"'],
            ['Amazon EKS Anywhere', 'Full Kubernetes clusters you deploy and operate on-prem (bare metal, VMware vSphere) with EKS-consistent tooling; optional paid AWS support', '"Run Kubernetes on-prem with an AWS-supported distribution and tooling"'],
            ['Amazon EKS Distro', 'The open-source Kubernetes distribution EKS itself uses (same versions and patches); you run and support it yourself anywhere', '"Same Kubernetes version/patches as EKS, self-managed anywhere"'],
            ['AWS Outposts (with ECS/EKS)', 'AWS-owned, AWS-managed racks or servers in your facility running AWS services locally', '"AWS-managed hardware on-prem with low latency to local systems"'],
          ],
        },
      },
      {
        heading: 'VMware Cloud on AWS and the Serverless Application Repository',
        body:
          "**VMware Cloud on AWS** runs VMware's software-defined data centre stack (**vSphere, vSAN, NSX**) on dedicated AWS bare-metal hosts. You migrate VMs with **vMotion / VMware HCX** without converting them, keep the same VMware tooling and skills, and reach native AWS services (S3, RDS) over a high-bandwidth connection. It is the **rehost/relocate** strategy for 'migrate thousands of VMware VMs quickly without changing tooling'. (Commercially it is now sold by Broadcom rather than resold by AWS, and in 2025 AWS added **Amazon Elastic VMware Service**, which runs VMware Cloud Foundation inside your own VPC; the exam trigger is unchanged.)\n\n**AWS Serverless Application Repository (SAR)** is a catalogue of serverless applications packaged with the **AWS Serverless Application Model (SAM)**. Teams publish apps privately (to their account or specific accounts) or publicly, and others deploy them in a few clicks. Trigger: 'reuse or share serverless application templates across teams'.",
      },
      {
        heading: 'Containerising a legacy application',
        body:
          "Moving an app into containers is mostly about making it **disposable**: any container can be killed and replaced without losing anything. Steps:\n\n- **Write a Dockerfile** that captures the runtime and dependencies (for example a Java 17 base image, the app JAR, OS packages).\n- **Externalise configuration** into environment variables, **SSM Parameter Store** and **Secrets Manager** (database passwords never baked into the image).\n- **Externalise state**: user uploads to **S3**, shared files to **EFS**, sessions to **ElastiCache or DynamoDB**, data to **RDS/DynamoDB**. This is the same statelessness rule as horizontal scaling.\n- **Push the image to Amazon ECR**, with scan-on-push for vulnerabilities.\n- **Run it** on **ECS with Fargate** for least operational overhead, **ECS on EC2** for cost control, GPUs or special instance types, or **EKS** if the team is Kubernetes-native or needs portability.\n- **Front it with an ALB** and scale on CPU or requests per target.\n\n**AWS App2Container (A2C)** is a command-line tool that discovers Java and .NET applications running on servers, analyses dependencies, builds the container image and generates ECS task definitions or Kubernetes manifests plus CloudFormation for deployment. Existing Docker Compose definitions map closely onto ECS task definitions, so containerised apps from developer laptops move with little change.",
      },
      {
        heading: 'Choosing the container platform',
        body:
          "Once containerised, the platform choice follows the qualifier:\n\n- **Least operational overhead** → ECS on **Fargate** (no instances to patch or scale).\n- **Kubernetes required** (existing manifests, Helm charts, multi-cloud portability) → **EKS** (Fargate or managed node groups).\n- **Lowest cost for steady load / GPUs / specific instance types** → ECS or EKS on EC2, possibly with Spot and Savings Plans.\n- **Must run in the data centre with AWS tooling** → ECS Anywhere or EKS Anywhere; **AWS-managed hardware on-prem** → Outposts.\n- **Simple web app or API from source or image, no cluster at all** → AWS App Runner.",
        beyond: true,
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Same ECS tooling for containers in our data centre' → **ECS Anywhere**.\n- 'Run Kubernetes on-prem with AWS support' → **EKS Anywhere**; 'same Kubernetes build as EKS, self-supported' → **EKS Distro**.\n- 'Migrate thousands of VMware VMs quickly without changing tooling or converting them' → **VMware Cloud on AWS**.\n- 'Modernise a legacy Java/.NET app into containers with minimal manual effort' → **App2Container** → ECR → ECS/EKS.\n- 'Share serverless app templates across teams' → **Serverless Application Repository**.\n- 'Containers must scale horizontally' → externalise state first (S3, EFS, ElastiCache, RDS).",
      },
    ],
    diagram: {
      title: 'Containerise once, run in AWS or on-prem',
      groups: [
        { id: 'g-dc', label: 'Data centre', kind: 'onprem', x: 4, y: 5, w: 29, h: 50 },
        { id: 'g-region', label: 'AWS Region', kind: 'region', x: 58, y: 5, w: 38, h: 50 },
      ],
      nodes: [
        { id: 'legacy', label: 'Legacy app', icon: 'server', x: 18, y: 16, sub: 'Java/.NET on a VM' },
        { id: 'ecsa', label: 'ECS Anywhere', icon: 'ecs', x: 18, y: 44, sub: 'external instance' },
        { id: 'a2c', label: 'App2Container', icon: 'server', x: 45, y: 16, sub: 'Dockerfile + task def' },
        { id: 'ecr', label: 'Amazon ECR', icon: 'ecr', x: 45, y: 44, sub: 'image + scan' },
        { id: 'fg', label: 'ECS on Fargate', icon: 'fargate', x: 70, y: 16, sub: 'least ops' },
        { id: 'eks', label: 'Amazon EKS', icon: 'eks', x: 70, y: 44, sub: 'Kubernetes teams' },
        { id: 'state', label: 'EFS / RDS', icon: 'efs', x: 88, y: 30, sub: 'external state' },
      ],
      edges: [
        { id: 'e-an', from: 'legacy', to: 'a2c', label: 'analyse' },
        { id: 'e-push', from: 'a2c', to: 'ecr', label: 'push image' },
        { id: 'e-fg', from: 'ecr', to: 'fg' },
        { id: 'e-eks', from: 'ecr', to: 'eks' },
        { id: 'e-any', from: 'ecr', to: 'ecsa', label: 'pull image' },
        { id: 'e-state', from: 'fg', to: 'state' },
      ],
      steps: [
        {
          caption: 'App2Container inspects the legacy Java/.NET app on its server and discovers its runtime, dependencies and ports.',
          highlight: ['legacy', 'a2c', 'e-an'],
          flow: [{ edge: 'e-an' }],
        },
        {
          caption: 'It builds a container image and deployment artifacts; the image is pushed to ECR, where scan-on-push checks it for CVEs.',
          highlight: ['a2c', 'ecr', 'e-push'],
          flow: [{ edge: 'e-push' }],
        },
        {
          caption: 'State is externalised first: files to EFS, data to RDS, secrets to Secrets Manager. The container itself becomes disposable.',
          highlight: ['state'],
        },
        {
          caption: 'For least operational overhead the image runs on ECS with Fargate behind an ALB, scaling on CPU or requests.',
          highlight: ['fg', 'e-fg', 'e-state'],
          flow: [{ edge: 'e-fg' }, { edge: 'e-state' }],
        },
        {
          caption: 'A Kubernetes-native team could run the same image on EKS instead; the image does not change.',
          highlight: ['eks', 'e-eks'],
          flow: [{ edge: 'e-eks' }],
        },
        {
          caption: 'Sites that must stay on-prem register servers with ECS Anywhere and pull the same image, managed by the same ECS control plane.',
          highlight: ['ecsa', 'e-any', 'g-dc'],
          flow: [{ edge: 'e-any' }],
        },
      ],
    },
    keyFacts: [
      'ECS Anywhere: ECS control plane in AWS, tasks on your own servers registered via the SSM Agent.',
      'EKS Anywhere: run and operate Kubernetes clusters on-prem (bare metal or vSphere) with EKS tooling; AWS support is optional and paid.',
      'EKS Distro: the open-source Kubernetes distribution EKS uses; self-managed, self-supported.',
      'VMware Cloud on AWS runs vSphere, vSAN and NSX on dedicated AWS bare-metal hosts; VMs migrate with vMotion/HCX without conversion.',
      'Serverless Application Repository shares SAM-packaged serverless apps privately or publicly.',
      'App2Container containerises Java and .NET apps and generates ECS or Kubernetes deployment artifacts.',
      'Containerising requires externalising config (Parameter Store, Secrets Manager) and state (S3, EFS, RDS, DynamoDB).',
      'Fargate = least operational overhead; ECS/EKS on EC2 = control, GPUs, cost tuning.',
    ],
    examTips: [
      '"Same ECS tooling for containers running in the data centre" → ECS Anywhere.',
      '"Kubernetes on-prem with AWS-supported distribution and tooling" → EKS Anywhere.',
      '"Migrate thousands of VMware VMs quickly without re-platforming" → VMware Cloud on AWS.',
      '"Containerise legacy Java/.NET apps with minimal manual effort" → App2Container, then ECR and ECS/EKS.',
      '"Reuse serverless application templates across teams" → Serverless Application Repository.',
      '"AWS-managed hardware in our facility" → Outposts, not ECS/EKS Anywhere (which use your hardware).',
    ],
    pitfalls: [
      'Confusing ECS/EKS Anywhere (your hardware) with Outposts (AWS hardware in your building).',
      'Choosing EKS Distro when the question asks for AWS support; Distro is self-supported.',
      'Containerising an app without moving its local state, so scaled-out containers lose data.',
      'Baking passwords or environment-specific config into the image instead of Secrets Manager/Parameter Store.',
    ],
    prosCons: [
      {
        option: 'ECS Anywhere / EKS Anywhere',
        pros: ['Consistent tooling on-prem and in AWS', 'Uses existing hardware'],
        cons: ['You manage the hardware', 'Not all AWS integrations available on-prem'],
        useWhen: 'Workloads must stay in your data centre but you want AWS container tooling.',
      },
      {
        option: 'VMware Cloud on AWS',
        pros: ['No VM conversion', 'Same VMware skills and tools', 'Fast data-centre exit'],
        cons: ['Dedicated host cost', 'Does not modernise the apps'],
        useWhen: 'Large VMware estates must relocate quickly.',
      },
      {
        option: 'Containerise with App2Container',
        pros: ['Automates discovery and packaging', 'Generates deployment artifacts'],
        cons: ['Java/.NET only', 'State still has to be externalised'],
        useWhen: 'Modernising legacy Java/.NET servers into ECS or EKS.',
      },
    ],
    services: ['ecs', 'eks', 'fargate', 'ecr', 'outposts', 'lambda', 'efs', 'rds', 'secrets-manager', 'parameter-store', 'alb', 'app-runner'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm5-integration-analytics',
    module: 'm5',
    domain: 'performance',
    title: 'More Integration, Analytics, Media & Mobile',
    minutes: 16,
    summary:
      'Recognise AppFlow, Data Exchange, Kinesis Video Streams, Elastic Transcoder and Device Farm by their one-line purpose, and lock down every ingestion point into a data lake or stream.',
    analogy: {
      title: 'A newsroom\'s intake desk',
      body:
        "A newsroom gets material from everywhere. **AppFlow** is the courier who collects reports from partner offices (SaaS apps like Salesforce) every night, no phone calls required. **Data Exchange** is the subscription desk that buys licensed wire-service feeds (third-party datasets). **Kinesis Video Streams** is the bank of live camera feeds flowing into the control room for analysis. **Elastic Transcoder** was the edit suite that converts footage into formats for TV, web and phones. **Device Farm** is the lab of real phones where you check the website and app look right on every model.\n\nAnd the **security guard at every door** (IAM, endpoints, KMS, Lake Formation) makes sure only the right people deliver and read material.",
    },
    sections: [
      {
        heading: 'The problem: data arrives from places you do not control',
        body:
          "Analytics pipelines need data from SaaS applications, from commercial data providers, from cameras and devices, and from mobile apps. Writing custom integration code for each source means handling authentication, pagination, retries and schema changes forever.\n\nAWS offers managed services for each source type. On the exam they are usually tested by **recognition** (which service matches this sentence?) or used as **distractors** (an answer that names the wrong one). Learn each one's job and what it is NOT.",
      },
      {
        heading: 'The services and their triggers',
        body:
          "One sentence each, plus the usual confusion.",
        table: {
          headers: ['Service', 'What it is', 'Exam trigger', 'It is NOT'],
          rows: [
            ['Amazon AppFlow', 'No-code managed flows moving data between SaaS apps (Salesforce, ServiceNow, Slack, Zendesk, SAP) and AWS (S3, Redshift), on schedule, event or demand; field mapping, filtering, validation, encryption, PrivateLink-capable', '"Ingest Salesforce/SaaS data into S3 or Redshift without writing integration code"', 'DataSync (file/object storage transfer) or a Lambda you maintain'],
            ['AWS Data Exchange', 'Find, subscribe to and use third-party datasets (financial, healthcare, weather) delivered into S3, via API, or as Redshift datashares; providers publish data products', '"Consume licensed third-party datasets for analytics"', 'A tool for sharing your own internal data between accounts'],
            ['Amazon Kinesis Video Streams', 'Ingest, store and process video/audio streams from cameras and devices; integrates with Rekognition Video and SageMaker AI; WebRTC for two-way real-time media; HLS playback', '"Stream video from cameras for ML analysis"', 'Kinesis Data Streams (records, not media)'],
            ['Amazon Elastic Transcoder', 'Legacy S3-to-S3 video transcoding into formats/resolutions for devices', '"Convert uploaded videos into multiple formats for mobile/web playback"', 'A streaming service; AWS discontinued it in November 2025 in favour of MediaConvert'],
            ['AWS Device Farm', 'Test mobile and web apps on real physical iOS/Android devices and desktop browsers hosted by AWS; automated test runs and remote manual access', '"Test the app on many real phone models without buying devices"', 'A load-testing or user-analytics service'],
          ],
        },
      },
      {
        heading: 'How AppFlow and Kinesis Video Streams work',
        body:
          "**AppFlow**: create a **connection** to the source (OAuth to Salesforce, for example, credentials stored in Secrets Manager), then a **flow**: source object (Opportunities), destination (an S3 bucket, as Parquet or CSV), trigger (**scheduled** nightly, **event-driven** on record changes, or **on demand**), field mappings, filters (only `Stage = Closed Won`), and validations. Data is encrypted in transit and at rest with KMS; for supported sources AppFlow can use **PrivateLink** so data never crosses the public internet. You pay per flow run and per GB processed. Landed data is then catalogued with Glue and queried with Athena.\n\n**Kinesis Video Streams (KVS)**: producers (cameras with the KVS Producer SDK) send media fragments to a **stream**; KVS stores them durably with a retention you choose (from none up to years). Consumers read in real time or replay: **Rekognition Video** detects faces or objects, custom models run in SageMaker AI, and browsers play back via **HLS/DASH**. **WebRTC** signalling supports two-way, low-latency audio/video (doorbells, telemedicine).",
      },
      {
        heading: 'Media and mobile notes',
        body:
          "**Elastic Transcoder** remains on the SAA-C03 in-scope list, so learn its one-liner: 'convert video files in S3 into formats for different devices'. In practice AWS ended the service on 13 November 2025 and points customers to **AWS Elemental MediaConvert**, which is itself listed as out of scope. If an exam option says Elastic Transcoder for a format-conversion requirement, it is the intended answer; if it says Elastic Transcoder for live streaming, it is wrong.\n\n**Device Farm** runs your test suites (Appium, Espresso, XCUITest) on real devices in parallel and returns logs, screenshots and video; it can also open a remote session to a specific device for manual testing, and run Selenium tests on desktop browsers. For building the mobile app and its backend, **AWS Amplify** (hosting, auth via Cognito, GraphQL via AppSync) is the related in-scope service.",
        beyond: true,
      },
      {
        heading: 'Securing every ingestion point',
        body:
          "Task statement 3.5 asks you to secure access to ingestion points. The pattern is the same for every entry door: authenticate with IAM, keep the path private, encrypt, and audit.\n\n- **Kinesis Data Streams and Data Firehose**: producers use **IAM roles** with `kinesis:PutRecord(s)` / `firehose:PutRecordBatch` on the specific stream; reach the service through **VPC interface endpoints** so no public internet path is needed; enable server-side encryption with KMS.\n- **S3 ingest**: bucket policies that **require TLS** (`aws:SecureTransport`), allow only specific principals or VPC endpoints (`aws:SourceVpce`), and enforce SSE-KMS; **presigned URLs** for external uploaders (time-limited, no AWS credentials needed); **Transfer Family** (SFTP/FTPS with SSH keys) for partners who only speak SFTP.\n- **API ingestion**: API Gateway with IAM, Cognito or Lambda authorizers, WAF, and throttling.\n- **After landing**: **Lake Formation** grants column-, row- and cell-level permissions on catalogued tables, so analysts see only what they should.\n- **Everywhere**: **KMS** encryption at rest, and **CloudTrail data events** to audit who read or wrote which object.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Marketing needs Salesforce data landed in S3 nightly, no custom integration code' → **AppFlow** flow from Salesforce to S3 on a schedule. A Lambda calling the Salesforce API is custom code; DataSync moves files between storage systems, not SaaS APIs.\n- 'Subscribe to a licensed third-party dataset' → **Data Exchange**.\n- 'Live video from cameras analysed by ML' → **Kinesis Video Streams** + Rekognition Video.\n- 'Convert uploaded videos into multiple formats' → **Elastic Transcoder** (as listed in scope).\n- 'Test on hundreds of real phone models' → **Device Farm**.\n- 'External partners upload files securely without AWS credentials' → presigned URLs (HTTP) or Transfer Family (SFTP).\n- 'Restrict analysts to certain columns in the data lake' → Lake Formation.",
      },
    ],
    diagram: {
      title: 'Locked-down entry points into a data lake',
      nodes: [
        { id: 'sf', label: 'Salesforce', icon: 'internet', x: 7, y: 10, sub: 'SaaS source' },
        { id: 'af', label: 'AppFlow', icon: 'appflow', x: 27, y: 10, sub: 'nightly, no code' },
        { id: 'dx', label: 'Data Exchange', icon: 'data-exchange', x: 27, y: 28, sub: '3rd-party datasets' },
        { id: 'cam', label: 'IP cameras', icon: 'server', x: 7, y: 47 },
        { id: 'kvs', label: 'Kinesis Video', icon: 'kinesis-video-streams', x: 27, y: 47, sub: 'media streams' },
        { id: 's3', label: 'S3 data lake', icon: 's3', x: 52, y: 28, sub: 'SSE-KMS, TLS only' },
        { id: 'rek', label: 'Rekognition Video', icon: 'rekognition', x: 52, y: 47, sub: 'labels, faces' },
        { id: 'lf', label: 'Lake Formation', icon: 'lake-formation', x: 76, y: 18, sub: 'column/row perms' },
        { id: 'ath', label: 'Athena', icon: 'athena', x: 76, y: 40, sub: 'analyst queries' },
      ],
      edges: [
        { id: 'e-sf', from: 'sf', to: 'af', label: 'OAuth' },
        { id: 'e-af', from: 'af', to: 's3', label: 'Parquet' },
        { id: 'e-dx', from: 'dx', to: 's3', label: 'subscribed' },
        { id: 'e-cam', from: 'cam', to: 'kvs', label: 'IAM-signed' },
        { id: 'e-kvs', from: 'kvs', to: 'rek' },
        { id: 'e-lf', from: 's3', to: 'lf', label: 'catalogued' },
        { id: 'e-ath', from: 'lf', to: 'ath', label: 'grants' },
      ],
      steps: [
        {
          caption: 'AppFlow connects to Salesforce with OAuth and, every night, lands opportunity records in S3 as Parquet. No integration code to maintain.',
          highlight: ['sf', 'af', 's3', 'e-sf', 'e-af'],
          flow: [{ edge: 'e-sf' }, { edge: 'e-af' }],
        },
        {
          caption: 'A licensed weather dataset arrives through a Data Exchange subscription, delivered straight into the same lake.',
          highlight: ['dx', 'e-dx'],
          flow: [{ edge: 'e-dx' }],
        },
        {
          caption: 'Cameras sign their requests with IAM credentials and stream video into Kinesis Video Streams.',
          highlight: ['cam', 'kvs', 'e-cam'],
          flow: [{ edge: 'e-cam' }],
        },
        {
          caption: 'Rekognition Video consumes the stream and detects labels and faces in near real time.',
          highlight: ['kvs', 'rek', 'e-kvs'],
          flow: [{ edge: 'e-kvs' }],
        },
        {
          caption: 'The bucket policy denies non-TLS requests and unknown principals, and SSE-KMS encrypts every object at rest.',
          highlight: ['s3'],
        },
        {
          caption: 'Lake Formation grants analysts column- and row-level access, so Athena users see only the fields they are allowed to.',
          highlight: ['lf', 'ath', 'e-lf', 'e-ath'],
          flow: [{ edge: 'e-lf' }, { edge: 'e-ath' }],
        },
      ],
    },
    keyFacts: [
      'AppFlow moves SaaS data (Salesforce, ServiceNow, Slack, Zendesk, SAP) to S3/Redshift on schedule, event or demand with no code.',
      'AppFlow supports field mapping, filtering, validation, KMS encryption and PrivateLink for supported sources.',
      'Data Exchange delivers subscribed third-party datasets to S3, via API, or as Redshift datashares.',
      'Kinesis Video Streams ingests and stores media; integrates with Rekognition Video and SageMaker AI; supports WebRTC and HLS playback.',
      'Elastic Transcoder is S3-to-S3 file transcoding; AWS discontinued it on 13 November 2025 in favour of MediaConvert, but it stays on the exam list.',
      'Device Farm tests apps on real physical devices and desktop browsers hosted by AWS.',
      'Secure ingestion: IAM roles, VPC interface endpoints, TLS-only bucket policies, presigned URLs, Transfer Family, KMS, CloudTrail data events.',
      'Lake Formation provides column-, row- and cell-level permissions on data lake tables.',
    ],
    examTips: [
      '"Salesforce data into S3 nightly, no custom integration code" → AppFlow (not Lambda, not DataSync).',
      '"Use licensed third-party datasets" → AWS Data Exchange.',
      '"Analyse live video from cameras with ML" → Kinesis Video Streams + Rekognition Video.',
      '"Convert uploaded videos into formats for different devices" → Elastic Transcoder (in-scope answer).',
      '"Test on many real phone models without buying devices" → Device Farm.',
      '"Producers in a VPC must send to Kinesis without traversing the internet" → interface VPC endpoint + IAM role.',
    ],
    pitfalls: [
      'Picking Kinesis Data Streams for video: Kinesis Video Streams is the media service.',
      'Picking DataSync for SaaS application data: it moves files and objects between storage systems.',
      'Treating Elastic Transcoder as a live-streaming service; it converts stored files.',
      'Securing the bucket but leaving producers on the public internet path when "no internet" is required.',
    ],
    services: ['appflow', 'data-exchange', 'kinesis-video-streams', 'device-farm', 'rekognition', 's3', 'lake-formation', 'athena', 'kinesis-data-streams', 'data-firehose', 'interface-endpoint', 'kms', 'transfer-family', 'amplify'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm5-task-concepts',
    module: 'm5',
    domain: 'resilient',
    title: 'Thin Spots: Immutable Infra, Quotas, NAT Instance, VPN Bandwidth',
    minutes: 20,
    summary:
      'Explain immutable infrastructure and how to implement it on AWS, plan service quotas and throttling for DR Regions, choose between a NAT instance and a NAT Gateway, and scale VPN bandwidth beyond 1.25 Gbps with Transit Gateway ECMP.',
    analogy: {
      title: 'Hotel rooms, credit limits, and extra lanes',
      body:
        "**Immutable infrastructure** is how hotels handle rooms: they do not let guests repaint the walls. If a room needs updating, it is refurbished to the standard design and handed out fresh. Every room is identical, so a complaint about room 7 never means 'room 7 is special'.\n\n**Service quotas** are credit limits on a second credit card you keep for emergencies: if you never raised the limit, the card declines exactly when you need it. **A NAT instance versus a NAT Gateway** is a private driver versus a taxi company: the driver is cheaper but gets sick. **VPN ECMP** is opening extra toll booths: one booth handles 1.25 Gbps of cars; four booths in parallel handle four times as many.",
    },
    sections: [
      {
        heading: 'Immutable infrastructure (Task 2.2)',
        body:
          "**Mutable** infrastructure is patched, updated and reconfigured in place over time. Servers drift apart, and 'it works on server 3 but not server 7' becomes normal. **Immutable** infrastructure is never modified after deployment: to change anything, you **build a new artifact** (a new AMI, container image or Lambda version), **replace** the running fleet with it, and discard the old one.\n\nBenefits: every instance is identical and reproducible; rollback is just redeploying the previous artifact; no configuration drift; and it forces statelessness (anything stored on the instance is lost on replacement, so state must live in S3, EFS, RDS or DynamoDB).\n\nAWS building blocks:\n\n- **EC2 Image Builder** pipelines bake and test **golden AMIs** (OS patches, agents, hardening) on a schedule.\n- A new **launch template version** references the new AMI.\n- **ASG instance refresh** replaces instances in rolling batches (set minimum healthy percentage, for example 90%, and optional checkpoints), with automatic rollback if health checks fail.\n- Containers: new image in **ECR** → new **ECS task definition revision** → rolling or blue/green deployment.\n- **CloudFormation** keeps stacks reproducible.\n- **Blue/green**: run the new version as a separate fleet and shift traffic with ALB weighted target groups or **Route 53 weighted records**; switch back instantly if needed.",
      },
      {
        heading: 'Service quotas and throttling for standby environments (Task 2.2)',
        body:
          "**Service quotas** (limits) are **per account, per Region**. Examples: On-Demand EC2 instances are limited by **vCPUs per instance family group**; **5 Elastic IPs** and **5 VPCs** per Region by default; **1,000 concurrent Lambda executions** per Region; API Gateway **10,000 requests per second** steady-state with a 5,000 burst per account per Region.\n\nThe DR trap: a pilot-light or warm-standby Region runs little, so its quotas are often still at **defaults**. On failover the ASG tries to scale from 4 to 80 instances and launches fail at the vCPU limit. Design step: **request quota increases in the DR Region ahead of time to match production**, and monitor usage with **Service Quotas** + **CloudWatch alarms** on usage metrics (and Trusted Advisor service-limit checks). In an Organization, **quota request templates** apply increases to new accounts automatically.\n\n**Throttling**: API Gateway (account, stage, method and usage-plan limits), Lambda concurrency, DynamoDB capacity and AWS API rate limits all return throttling errors (HTTP 429 or `ThrottlingException`). Clients should retry with **exponential backoff and jitter** (AWS SDKs do this by default). To **protect a backend** from being overwhelmed, use API Gateway throttling and **usage plans with API keys**, or put SQS in front as a buffer. Verify those limits are raised in the DR Region too.",
      },
      {
        heading: 'NAT instance vs NAT Gateway (Task 4.4)',
        body:
          "Both let private-subnet instances reach the internet without being reachable from it.",
        table: {
          headers: ['', 'NAT Gateway', 'NAT instance'],
          rows: [
            ['Managed?', 'Fully managed; highly available within its AZ', 'An EC2 instance you patch, size and monitor; single point of failure unless you script failover'],
            ['Cost', 'About $0.045/hour + $0.045/GB processed; can dominate small workloads\' bills', 'Just the instance (a t4g.nano is a few dollars a month) plus normal transfer'],
            ['Bandwidth', 'Scales automatically to 100 Gbps', 'Limited by the instance type'],
            ['Security', 'No security groups (use NACLs); cannot be a bastion', 'Has security groups; can double as a bastion or port-forwarder'],
            ['Setup', 'Create in a public subnet with an Elastic IP; route 0.0.0.0/0 to it', 'Must disable the source/destination check; route 0.0.0.0/0 to the instance'],
            ['Choose when', 'Production, HA, high throughput, low ops', '"Minimise cost for low-traffic non-production" or "bastion + NAT on one box"'],
          ],
        },
      },
      {
        heading: 'NAT placement: one per AZ or one shared',
        body:
          "A NAT Gateway lives in **one AZ**. A single shared NAT Gateway for a multi-AZ VPC is cheapest in hours, but instances in other AZs pay **cross-AZ data charges** to reach it and lose outbound access if that AZ fails. **One NAT Gateway per AZ**, each private route table pointing at its local NAT, costs more hours but avoids cross-AZ fees and survives an AZ loss.\n\n- Production answer → **one NAT Gateway per AZ**.\n- Cost-only dev/test answer → **one shared NAT Gateway, or a small NAT instance**.\n- 'Dev/test VPC with minimal outbound traffic pays more for NAT than for instances' → replace with a t4g.nano NAT instance (or a single shared NAT). Removing outbound access breaks package installs; adding a NAT per AZ increases cost.",
      },
      {
        heading: 'VPN bandwidth: single vs multiple tunnels (Task 4.4)',
        body:
          "A Site-to-Site VPN connection has **two tunnels of about 1.25 Gbps each**. When the VPN terminates on a **Virtual Private Gateway (VGW)**, only one tunnel carries traffic at a time (active/standby) and there is no aggregation across connections, so throughput is capped at roughly **1.25 Gbps**.\n\nTo go higher, terminate VPNs on a **Transit Gateway** and enable **ECMP (equal-cost multi-path)** routing with **BGP** (dynamic routing). Traffic flows are spread across all tunnels of all VPN connections: for example **4 connections × 2 tunnels × 1.25 Gbps ≈ 10 Gbps** aggregate. Each individual flow still tops out at about 1.25 Gbps. The customer gateway must also support ECMP.\n\n**Direct Connect** for consistent bandwidth and latency: **hosted connections** from a partner (50 Mbps to 10 Gbps) for moderate steady loads; **dedicated connections** of 1, 10, 100 or 400 Gbps for large ones. For resilience add a second DX at a different location, or a Site-to-Site VPN as backup. **Accelerated Site-to-Site VPN** (on a TGW) routes tunnels through the Global Accelerator edge network for more consistent performance over long distances.",
      },
      {
        heading: 'Exam angle',
        body:
          "- 'Ensure all instances are identical / eliminate configuration drift / fast reliable rollback' → immutable: bake an AMI (Image Builder), new launch template version, ASG instance refresh. Never SSH in to patch.\n- 'Failover to the secondary Region failed to scale beyond 20 instances although production runs 80' → **service quotas were never raised in the DR Region**. A wrong instance type would fail at instance 1; Route 53 cannot cause launch failures.\n- 'Protect the backend from being overwhelmed' → API Gateway throttling / usage plans (or an SQS buffer).\n- 'Lowest NAT cost for low-traffic dev/test' → NAT instance; 'production HA' → NAT Gateway per AZ.\n- 'VPN throughput capped around 1.25 Gbps must increase' → multiple VPN connections on a Transit Gateway with ECMP.\n- 'Consistent multi-Gbps, low latency' → Direct Connect.",
      },
    ],
    diagram: {
      title: 'Beating the 1.25 Gbps VPN cap with ECMP',
      groups: [
        { id: 'g-dc', label: 'Data centre', kind: 'onprem', x: 2, y: 18, w: 16, h: 24 },
        { id: 'g-aws', label: 'AWS Region', kind: 'region', x: 46, y: 4, w: 50, h: 52 },
      ],
      nodes: [
        { id: 'cgw', label: 'Customer GW', icon: 'onprem', x: 10, y: 30, sub: 'BGP + ECMP' },
        { id: 'v1', label: 'VPN conn 1', icon: 'site-to-site-vpn', x: 32, y: 12, sub: '2 x 1.25 Gbps' },
        { id: 'v2', label: 'VPN conn 2', icon: 'site-to-site-vpn', x: 32, y: 30, sub: '2 x 1.25 Gbps' },
        { id: 'v3', label: 'VPN conn 3', icon: 'site-to-site-vpn', x: 32, y: 48, sub: '2 x 1.25 Gbps' },
        { id: 'tgw', label: 'Transit Gateway', icon: 'transit-gateway', x: 60, y: 30, sub: 'ECMP enabled' },
        { id: 'vpca', label: 'Prod VPC', icon: 'vpc', x: 84, y: 16 },
        { id: 'vpcb', label: 'Analytics VPC', icon: 'vpc', x: 84, y: 44 },
      ],
      edges: [
        { id: 'e-c1', from: 'cgw', to: 'v1' },
        { id: 'e-c2', from: 'cgw', to: 'v2' },
        { id: 'e-c3', from: 'cgw', to: 'v3' },
        { id: 'e-t1', from: 'v1', to: 'tgw' },
        { id: 'e-t2', from: 'v2', to: 'tgw' },
        { id: 'e-t3', from: 'v3', to: 'tgw' },
        { id: 'e-a', from: 'tgw', to: 'vpca' },
        { id: 'e-b', from: 'tgw', to: 'vpcb' },
      ],
      steps: [
        {
          caption: 'Starting point: one VPN connection to a Virtual Private Gateway. Only one of its two tunnels is active, so throughput caps near 1.25 Gbps.',
          highlight: ['cgw', 'v1', 'e-c1'],
          flow: [{ edge: 'e-c1' }],
        },
        {
          caption: 'Move VPN termination to a Transit Gateway and add more VPN connections, each with two tunnels, using BGP dynamic routing.',
          highlight: ['tgw', 'v1', 'v2', 'v3'],
        },
        {
          caption: 'With ECMP on, the TGW and customer gateway spread flows across every tunnel. Three connections give up to about 7.5 Gbps aggregate.',
          highlight: ['e-c1', 'e-c2', 'e-c3', 'e-t1', 'e-t2', 'e-t3'],
          flow: [{ edge: 'e-c1' }, { edge: 'e-c2' }, { edge: 'e-c3' }, { edge: 'e-t1' }, { edge: 'e-t2' }, { edge: 'e-t3' }],
        },
        {
          caption: 'The TGW routes traffic on to every attached VPC, so the bandwidth upgrade serves the whole network.',
          highlight: ['tgw', 'vpca', 'vpcb', 'e-a', 'e-b'],
          flow: [{ edge: 'e-a' }, { edge: 'e-b' }],
        },
        {
          caption: 'If one VPN connection fails, BGP withdraws its routes and the remaining tunnels keep carrying traffic at reduced capacity.',
          highlight: ['v2', 'v1', 'v3'],
          fail: ['v2'],
          flow: [{ edge: 'e-t1' }, { edge: 'e-t3' }],
        },
        {
          caption: 'Each single flow still tops out near 1.25 Gbps. For consistent multi-Gbps bandwidth and latency, the answer is Direct Connect.',
          highlight: ['cgw', 'tgw'],
        },
      ],
    },
    keyFacts: [
      'Immutable infrastructure: replace, never modify; build a new AMI or image, roll it out, discard the old.',
      'ASG instance refresh replaces instances in rolling batches with a minimum healthy percentage and optional automatic rollback.',
      'Service quotas are per account, per Region; defaults include 5 Elastic IPs, 5 VPCs and 1,000 concurrent Lambda executions per Region.',
      'API Gateway default throttle: 10,000 requests per second steady-state, 5,000 burst, per account per Region.',
      'Throttled clients should retry with exponential backoff and jitter.',
      'NAT Gateway: managed, up to 100 Gbps, about $0.045/hour + $0.045/GB, no security groups.',
      'NAT instance: requires disabling source/destination check; has security groups; can double as a bastion.',
      'Site-to-Site VPN: 2 tunnels of about 1.25 Gbps; on a VGW only one is active.',
      'Transit Gateway + ECMP + BGP aggregates bandwidth across multiple VPN connections (4 connections ≈ 10 Gbps).',
      'Direct Connect: hosted 50 Mbps-10 Gbps; dedicated 1, 10, 100 or 400 Gbps.',
    ],
    examTips: [
      '"Eliminate configuration drift / identical instances / rapid rollback" → golden AMI + launch template version + ASG instance refresh.',
      '"DR Region failover could not scale past N instances" → raise service quotas in the DR Region ahead of time and alarm on quota usage.',
      '"Protect a backend API from traffic spikes" → API Gateway throttling and usage plans.',
      '"Cheapest outbound internet for a low-traffic dev VPC" → small NAT instance (or one shared NAT Gateway).',
      '"Production private subnets in 3 AZs need resilient outbound access" → one NAT Gateway per AZ.',
      '"VPN throughput must exceed 1.25 Gbps" → multiple VPN connections on a Transit Gateway with ECMP.',
    ],
    pitfalls: [
      'Patching instances in place with SSH when the question asks for consistency and fast rollback.',
      'Assuming quotas raised in the primary Region also apply in the DR Region.',
      'Forgetting to disable source/destination check on a NAT instance.',
      'Expecting a VGW to aggregate multiple VPN tunnels; ECMP aggregation requires a Transit Gateway.',
      'Thinking ECMP raises the speed of a single flow beyond about 1.25 Gbps.',
    ],
    prosCons: [
      {
        option: 'NAT Gateway',
        pros: ['Managed and HA within an AZ', 'Up to 100 Gbps', 'No patching'],
        cons: ['Hourly + per-GB cost', 'No security groups', 'One per AZ for full HA'],
        useWhen: 'Production or high-throughput outbound access.',
      },
      {
        option: 'NAT instance',
        pros: ['Very cheap for low traffic', 'Security groups', 'Can double as a bastion'],
        cons: ['Single point of failure', 'You patch and size it', 'Bandwidth limited by instance type'],
        useWhen: 'Low-traffic dev/test where cost matters more than availability.',
      },
      {
        option: 'VPN on Transit Gateway with ECMP',
        pros: ['Aggregates bandwidth across tunnels', 'Fast to deploy over the internet'],
        cons: ['Internet variability', 'Per-flow cap about 1.25 Gbps', 'TGW fees'],
        useWhen: 'More than 1.25 Gbps is needed quickly, or as backup to Direct Connect.',
      },
      {
        option: 'Direct Connect',
        pros: ['Consistent bandwidth and latency', 'Lower egress rates'],
        cons: ['Weeks to provision', 'Needs redundancy planning', 'Not encrypted by default'],
        useWhen: 'Steady multi-Gbps hybrid traffic.',
      },
    ],
    services: ['ami', 'launch-template', 'auto-scaling', 'service-quotas', 'trusted-advisor', 'cloudwatch', 'api-gateway', 'nat-gateway', 'nat-instance', 'site-to-site-vpn', 'transit-gateway', 'direct-connect', 'lambda', 'route53'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm5-names-scope',
    module: 'm5',
    domain: 'foundations',
    title: 'Renamed Services & What Is Out of Scope',
    minutes: 12,
    summary:
      'Translate old service names from courses and practice tests into their current names, and recognise which services the SAA-C03 guide lists as out of scope so you can discard them as distractors and stop studying them.',
    analogy: {
      title: 'Street names and a map\'s edges',
      body:
        "Cities rename streets. If your old guidebook says 'King Street' and the sign now says 'Queen Avenue', it is still the same road; you just need the translation. Many AWS services have been renamed, and older courses still use the old names.\n\nEvery map also has edges. Beyond them, the city still exists, but your delivery job does not go there. The exam guide's out-of-scope list is that edge: those services are real, but if one shows up as an answer, it is almost certainly a decoy.",
    },
    sections: [
      {
        heading: 'Why this matters',
        body:
          "Practice exams, videos and blog posts are often written years before you read them. You will meet names like 'Kinesis Data Firehose', 'AWS SSO' or 'Origin Access Identity'. The current exam guide uses the new names, and AWS updates question wording over time. Knowing both spellings stops you from treating a renamed service as a new, unknown one.\n\nAt the same time, the official guide lists services that are **out of scope**. Study time spent on them is wasted, and when they appear in an option they are distractors.",
      },
      {
        heading: 'Names that changed',
        body:
          "Left: names you may see in older material. Right: the current name.",
        table: {
          headers: ['Old name', 'Current name', 'Notes'],
          rows: [
            ['Amazon QuickSight', 'Amazon Quick Suite (QuickSight capabilities, now Quick Sight)', 'Same BI and dashboard service'],
            ['Amazon Kinesis Data Firehose', 'Amazon Data Firehose', 'Renamed February 2024'],
            ['Amazon Kinesis Data Analytics (for Apache Flink)', 'Amazon Managed Service for Apache Flink', 'Renamed 2023'],
            ['Amazon SageMaker', 'Amazon SageMaker AI', 'Renamed December 2024'],
            ['AWS Single Sign-On (SSO)', 'AWS IAM Identity Center', 'Renamed 2022'],
            ['CloudFront Origin Access Identity (OAI)', 'Origin Access Control (OAC)', 'OAC is the recommended replacement; supports SSE-KMS and all Regions'],
            ['CloudEndure Migration / Server Migration Service (SMS)', 'AWS Application Migration Service (MGN)', 'DR variant: AWS Elastic Disaster Recovery (from CloudEndure DR)'],
            ['AWS Snowmobile', 'Retired', 'Multi-PB transfers now use fleets of Snowball Edge devices or online transfer'],
            ['Amazon Elasticsearch Service', 'Amazon OpenSearch Service', 'Renamed 2021'],
            ['CloudWatch Events', 'Amazon EventBridge', 'Same event bus, more features'],
            ['S3 Glacier (original class)', 'S3 Glacier Flexible Retrieval', 'Alongside Glacier Instant Retrieval and Deep Archive'],
            ['Personal Health Dashboard / Service Health Dashboard', 'AWS Health Dashboard', 'Merged 2022'],
            ['ACM Private Certificate Authority', 'AWS Private CA', 'Renamed 2022'],
          ],
        },
      },
      {
        heading: 'Officially out of scope',
        body:
          "AWS lists these as out of scope for SAA-C03. If one appears in an answer choice, treat it as a distractor unless the question is explicitly about it (it will not be).",
        table: {
          headers: ['Category', 'Out-of-scope services'],
          rows: [
            ['Developer tools', 'CodeCommit, CodeBuild, CodeDeploy, CodeArtifact, CDK, CloudShell, Fault Injection Simulator (FIS), SDKs and tools'],
            ['Compute and database', 'Lightsail, Amazon RDS on VMware'],
            ['Machine learning', 'Personalize, DevOps Guru, HealthLake, Elastic Inference, Inferentia, Deep Learning AMIs/containers, MXNet/PyTorch/TensorFlow on AWS, DeepComposer'],
            ['Media', 'All Elemental services (MediaConvert, MediaLive, MediaPackage, MediaTailor, MediaConnect), Interactive Video Service (IVS)'],
            ['Other', 'All IoT services, Managed Workflows for Apache Airflow (MWAA), Managed Blockchain, Sumerian, GameLift, Location Service, Cloud Map, Migration Evaluator, Distro for OpenTelemetry, Console Mobile App, Braket, Ground Station'],
          ],
        },
      },
      {
        heading: 'Recognition-only services',
        body:
          "Earlier modules briefly mentioned **Lightsail, CDK, Personalize, Forecast, Fraud Detector, Kendra, Bedrock, QLDB and Timestream**. These are either out of scope or absent from the in-scope list. Know a one-line definition so you can eliminate them, and do not study them further:\n\n- **Lightsail**: simple fixed-price VPS bundles for small sites (out of scope).\n- **CDK**: define CloudFormation in programming languages (out of scope; the in-scope answer is CloudFormation).\n- **Forecast / Fraud Detector / Kendra / Personalize / Bedrock**: managed ML for time-series forecasting, fraud scoring, enterprise search, recommendations, and generative AI foundation models.\n- **QLDB**: a ledger database; AWS ended support for it in July 2025.\n- **Timestream**: a time-series database.\n\nSome in-scope services have also been retired or changed since the exam guide was written (Elastic Transcoder ended in November 2025; Snowmobile is retired). Learn the guide's one-liner for the exam and know the real-world status.",
        beyond: true,
      },
      {
        heading: 'How to handle an unfamiliar name in an answer',
        body:
          "- **Is it a renamed service?** Translate it and evaluate it normally.\n- **Is it on the out-of-scope list?** Eliminate it, unless every other option breaks a hard constraint (very rare).\n- **Is it a real in-scope service used for the wrong job?** That is the 'right service, wrong scope' distractor pattern: for example DataSync for SaaS data, Macie for image vulnerability scanning, Service Catalog for compliance detection.\n- **Never pick an option just because you recognise the name.** Pick the one that meets every constraint and the qualifier.",
      },
    ],
    diagram: {
      title: 'Triage for an unfamiliar answer option',
      nodes: [
        { id: 'opt', label: 'Answer option', x: 8, y: 30, sub: 'unfamiliar name' },
        { id: 'ren', label: 'Renamed?', icon: 'data-firehose', x: 32, y: 12, sub: 'Kinesis Firehose' },
        { id: 'oos', label: 'Out of scope?', icon: 'lightsail', x: 32, y: 48, sub: 'Lightsail, CDK' },
        { id: 'xlate', label: 'Translate name', x: 56, y: 12, sub: 'Data Firehose' },
        { id: 'elim', label: 'Eliminate', x: 56, y: 48, sub: 'decoy' },
        { id: 'check', label: 'Check constraints', x: 78, y: 30, sub: 'then the qualifier' },
        { id: 'pick', label: 'Choose', x: 92, y: 48, sub: 'best survivor' },
      ],
      edges: [
        { id: 'e-r', from: 'opt', to: 'ren' },
        { id: 'e-o', from: 'opt', to: 'oos' },
        { id: 'e-x', from: 'ren', to: 'xlate', label: 'same service' },
        { id: 'e-e', from: 'oos', to: 'elim', label: 'distractor' },
        { id: 'e-c', from: 'xlate', to: 'check' },
        { id: 'e-p', from: 'check', to: 'pick' },
      ],
      steps: [
        {
          caption: 'An option names a service you do not recognise. Before guessing, triage it.',
          highlight: ['opt'],
        },
        {
          caption: 'Is it an old name? "Kinesis Data Firehose" is today\'s Amazon Data Firehose: same service, evaluate it normally.',
          highlight: ['opt', 'ren', 'xlate', 'e-r', 'e-x'],
          flow: [{ edge: 'e-r' }, { edge: 'e-x' }],
        },
        {
          caption: 'Is it on the out-of-scope list (Lightsail, CDK, CodeDeploy, Elemental, IoT)? Then it is a decoy: eliminate it.',
          highlight: ['opt', 'oos', 'elim', 'e-o', 'e-e'],
          flow: [{ edge: 'e-o' }, { edge: 'e-e', color: 'bad' }],
          fail: ['elim'],
        },
        {
          caption: 'Surviving options are checked against every hard constraint, then ranked by the qualifier (cost, overhead, security, availability).',
          highlight: ['xlate', 'check', 'e-c'],
          flow: [{ edge: 'e-c' }],
        },
        {
          caption: 'Choose the best survivor, never the option that merely sounds familiar.',
          highlight: ['check', 'pick', 'e-p'],
          flow: [{ edge: 'e-p' }],
        },
      ],
    },
    keyFacts: [
      'Amazon Kinesis Data Firehose is now Amazon Data Firehose.',
      'Kinesis Data Analytics is now Amazon Managed Service for Apache Flink.',
      'AWS SSO is now AWS IAM Identity Center.',
      'CloudFront OAI is superseded by Origin Access Control (OAC).',
      'CloudEndure and Server Migration Service are replaced by AWS Application Migration Service (MGN); CloudEndure DR became Elastic Disaster Recovery.',
      'Amazon SageMaker is now SageMaker AI; Elasticsearch Service is now OpenSearch Service; CloudWatch Events is now EventBridge.',
      'Snowmobile is retired; multi-PB moves use fleets of Snowball Edge devices or online transfer.',
      'Out of scope: CodeCommit/CodeBuild/CodeDeploy/CodeArtifact, CDK, CloudShell, FIS, Lightsail, all Elemental and IoT services, MWAA, GameLift, Braket and others.',
    ],
    examTips: [
      'An option naming an out-of-scope service (CodeDeploy, Lightsail, MediaConvert, IoT Core) is almost always a distractor.',
      'Treat old and new names as the same service: "Kinesis Data Firehose" questions are Data Firehose questions.',
      '"Restrict S3 access to CloudFront" → Origin Access Control (OAI is legacy).',
      '"Lift-and-shift servers with minimal downtime" → Application Migration Service (MGN), not CloudEndure or SMS.',
      '"Infrastructure as code" on SAA-C03 → CloudFormation, not CDK.',
    ],
    pitfalls: [
      'Treating a renamed service as an unknown one and eliminating the right answer.',
      'Spending study hours on out-of-scope services such as Elemental, IoT or CodeDeploy.',
      'Choosing an option because the name is familiar rather than because it meets every constraint.',
    ],
    services: ['data-firehose', 'managed-flink', 'quicksight', 'sagemaker', 'iam-identity-center', 'cloudfront', 'mgn', 'snow-family', 'opensearch', 'eventbridge', 's3-glacier', 'health-dashboard', 'lightsail'],
  },
] satisfies Lesson[];
