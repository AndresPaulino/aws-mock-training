import type { Lab } from './index';
import type { CloudState } from '../cloud/types';
import { isPublicSubnet, subnetRouteTable } from '../cloud/reach';

const custom = (c: CloudState) => c.vpcs.filter((v) => !v.isDefault);
const subnetsOf = (c: CloudState, vpcId: string) => c.subnets.filter((s) => s.vpcId === vpcId);
const natRouted = (c: CloudState, sId: string) => { const s = c.subnets.find((x) => x.id === sId)!; const rt = subnetRouteTable(c, s); return !!rt?.routes.some((r) => r.dest === '0.0.0.0/0' && r.target.startsWith('nat-') && c.natGateways.some((n) => n.id === r.target && n.state === 'available')); };
const sgById = (c: CloudState, id: string) => c.securityGroups.find((s) => s.id === id);
const running = (c: CloudState) => c.instances.filter((i) => i.state === 'running' || i.state === 'pending');

export default [
  {
    id: 'lab-vpc', title: 'Build a production VPC by hand', lessonId: 'm1-subnets-routing', minutes: 25, start: '/console/vpc/vpcs/create',
    intro: 'Build the classic two-AZ VPC from scratch: public subnets for load balancers and NAT, private subnets for apps and databases. Choose **VPC only** on the create page. The wizard would do it all for you, but building it by hand is how it sticks.',
    steps: [
      { title: 'Create a VPC with a /16 CIDR', detail: 'VPC → Your VPCs → **Create VPC** → *VPC only*. Name it `prod`, CIDR `10.0.0.0/16`.', hint: 'Any non-default VPC with a /16 block passes. 10.0.0.0/16 gives 65,536 addresses.', check: (c) => custom(c).some((v) => v.cidr.endsWith('/16')) },
      { title: 'Create four subnets across two AZs', detail: 'Subnets → **Create subnet**: two public (`10.0.0.0/24` in AZ a, `10.0.1.0/24` in AZ b) and two private (`10.0.128.0/24` in a, `10.0.129.0/24` in b). Use "Add new subnet" to create all four at once.', hint: 'Pick your new VPC, and give each subnet a different CIDR inside 10.0.0.0/16. At least 2 different AZs.', check: (c) => custom(c).some((v) => subnetsOf(c, v.id).length >= 4 && new Set(subnetsOf(c, v.id).map((s) => s.az)).size >= 2) },
      { title: 'Create and attach an internet gateway', detail: 'Internet gateways → **Create internet gateway**, then select it → **Attach to VPC** → your VPC.', hint: 'Creating it isn\'t enough: the state must be *Attached*.', check: (c) => custom(c).some((v) => c.igws.some((g) => g.vpcId === v.id)) },
      { title: 'Make two subnets public', detail: 'Route tables → **Create route table** `public-rtb` in your VPC. **Edit routes**: add `0.0.0.0/0` → your internet gateway. **Edit subnet associations**: tick the two public subnets.', hint: 'A subnet is public only because its route table has 0.0.0.0/0 → igw-…. The Subnets list shows "Public" when you get it right.', check: (c) => custom(c).some((v) => { const pub = subnetsOf(c, v.id).filter((s) => isPublicSubnet(c, s)); return new Set(pub.map((s) => s.az)).size >= 2; }) },
      { title: 'Auto-assign public IPs on the public subnets', detail: 'Subnets → select a public subnet → **Edit subnet settings** → enable auto-assign public IPv4. Do both.', hint: 'Without this, instances launched there get no public IP and can\'t use the IGW.', check: (c) => custom(c).some((v) => subnetsOf(c, v.id).filter((s) => isPublicSubnet(c, s) && s.autoPublicIp).length >= 2) },
      { title: 'Create a NAT gateway in a public subnet', detail: 'NAT gateways → **Create NAT gateway** → pick a **public** subnet.', hint: 'The wizard warns you if you pick a private subnet. NAT in a private subnet is a classic broken design.', check: (c) => c.natGateways.some((n) => { const s = c.subnets.find((x) => x.id === n.subnetId); return n.state === 'available' && !!s && isPublicSubnet(c, s) && custom(c).some((v) => v.id === s.vpcId); }) },
      { title: 'Route the private subnets through NAT', detail: 'Create `private-rtb`, add route `0.0.0.0/0` → the NAT gateway, and associate both private subnets.', hint: 'Private subnets must NOT have an IGW route. Their default route goes to nat-….', check: (c) => custom(c).some((v) => subnetsOf(c, v.id).filter((s) => !isPublicSubnet(c, s) && natRouted(c, s.id)).length >= 2) },
    ],
    debrief: 'You built the reference VPC. Exam takeaways: **public = route to IGW**, private instances get **outbound-only** internet through a NAT gateway that sits in a **public** subnet, and HA means subnets in **2+ AZs** (and ideally one NAT per AZ).',
  },
  {
    id: 'lab-sg', title: 'Chain security groups for a 3-tier app', lessonId: 'm1-sg-nacl', minutes: 15, start: '/console/vpc/security-groups/create',
    intro: 'Build the tiered firewall pattern the exam loves: the internet reaches only the load balancer; the app tier accepts traffic only from the load balancer\'s security group; the database only from the app tier. Then block a bad IP range with a NACL.',
    steps: [
      { title: 'Create the load balancer SG', detail: 'Security groups → **Create security group** `alb-sg`: inbound **HTTPS 443 from 0.0.0.0/0**.', hint: 'Type HTTPS, source 0.0.0.0/0.', check: (c) => c.securityGroups.some((s) => s.inbound.some((r) => r.from <= 443 && r.to >= 443 && r.source === '0.0.0.0/0')) },
      { title: 'Create the app SG that trusts only the ALB SG', detail: 'Create `app-sg` in the same VPC: inbound **Custom TCP 8080** with source = the **alb-sg id** (sg-…), not a CIDR.', hint: 'In the source box, pick the sg-… from the dropdown. Referencing an SG means "any ENI wearing that SG".', check: (c) => c.securityGroups.some((app) => app.inbound.some((r) => { const src = sgById(c, r.source); return !!src && src.id !== app.id && src.inbound.some((x) => x.source === '0.0.0.0/0'); })) },
      { title: 'Create the DB SG that trusts only the app SG', detail: 'Create `db-sg`: inbound **MYSQL/Aurora 3306** (or PostgreSQL 5432) from **app-sg**.', hint: 'Chain: db-sg ← app-sg ← alb-sg ← internet.', check: (c) => c.securityGroups.some((db) => db.inbound.some((r) => { const app = sgById(c, r.source); return !!app && app.id !== db.id && app.inbound.some((x) => { const alb = sgById(c, x.source); return !!alb && alb.id !== app.id; }); })) },
      { title: 'Block a malicious range with a NACL deny', detail: 'Network ACLs → pick your VPC\'s NACL → **Edit inbound rules** → add rule **#50 DENY all traffic from 203.0.113.0/24** (keep an allow rule with a higher number).', hint: 'Security groups can\'t deny. NACL rules are evaluated lowest number first, so #50 beats #100.', check: (c) => c.nacls.some((n) => n.inbound.some((d) => d.action === 'deny' && d.cidr !== '0.0.0.0/0' && n.inbound.some((a) => a.action === 'allow' && a.num > d.num))) },
    ],
    debrief: 'SGs are **stateful allow-lists on ENIs**. Reference SGs instead of IPs so rules follow instances as Auto Scaling replaces them. NACLs are **stateless, numbered, allow+deny** at the subnet edge: the only way to explicitly block an IP range inside a VPC (WAF does it at layer 7).',
  },
  {
    id: 'lab-endpoint', title: 'Private subnets: S3 without NAT, SSH without ports', lessonId: 'm1-private-connectivity', minutes: 20, start: '/console/ec2/instances/launch',
    intro: 'A fully private instance (no internet route at all) still needs S3 and remote shell access. Do it the secure and cheap way: a free **gateway endpoint** for S3 and **interface endpoints** for Systems Manager. Use the Reachability Analyzer to see the before and after.',
    steps: [
      { title: 'Launch an instance in a private subnet', detail: 'Launch an instance into a subnet that has **no route to an internet gateway** (e.g. a private subnet from the VPC lab), with auto-assign public IP disabled.', hint: 'In the launch wizard, the subnet list shows public/private. Pick private.', check: (c) => running(c).some((i) => { const s = c.subnets.find((x) => x.id === i.subnetId); return !!s && !isPublicSubnet(c, s) && !i.publicIp; }) },
      { title: 'Add an S3 gateway endpoint to its route table', detail: 'VPC → Endpoints → **Create endpoint** → service `…s3` → type **Gateway** → tick the private subnet\'s route table. Then run Reachability Analyzer: instance → Amazon S3.', hint: 'Gateway endpoints are free and add a prefix-list route to the route tables you tick.', check: (c) => running(c).some((i) => { const s = c.subnets.find((x) => x.id === i.subnetId); const rt = s && subnetRouteTable(c, s); return !!rt && !isPublicSubnet(c, s!) && c.endpoints.some((e) => e.type === 'Gateway' && e.service.endsWith('.s3') && e.routeTableIds.includes(rt.id)); }) },
      { title: 'Create interface endpoints for Session Manager', detail: 'Create **Interface** endpoints for `ssm`, `ssmmessages` and `ec2messages` in that VPC (subnet = the private subnet, private DNS on).', hint: 'Three endpoints. Session Manager needs all of them when there is no NAT.', check: (c) => ['ssm', 'ssmmessages', 'ec2messages'].every((svc) => c.endpoints.some((e) => e.type === 'Interface' && e.service.endsWith(`.${svc}`))) },
      { title: 'Give the instance the SSM role', detail: 'IAM → create a role trusted by **EC2** with **AmazonSSMManagedInstanceCore**; then EC2 → Instances → **Modify IAM role** on the private instance.', hint: 'The policy lets the SSM agent register. No inbound port 22 needed at all.', check: (c) => running(c).some((i) => { const s = c.subnets.find((x) => x.id === i.subnetId); const role = c.iamRoles.find((r) => r.name === i.iamRole); return !!s && !isPublicSubnet(c, s) && !!role && role.policyIds.includes('pol-ssm-core'); }) },
    ],
    debrief: '"Private subnet must access S3 **without traversing the internet**, cheapest" → **S3 gateway endpoint** (DynamoDB too). "Access from **on-premises** over Direct Connect/VPN" or other services → **interface endpoint (PrivateLink)**. "Remote shell with **no inbound ports or bastion**" → **Session Manager**.',
  },
  {
    id: 'lab-ec2-role', title: 'Credentials the right way: an instance role', lessonId: 'm3b-ec2-networking', minutes: 10, start: '/console/iam',
    intro: 'Applications on EC2 should never hold access keys. Give the instance a role; it receives short-lived credentials through the metadata service (IMDSv2).',
    steps: [
      { title: 'Create a role trusted by EC2 with S3 read access', detail: 'IAM → Roles → **Create role** → AWS service → **EC2** → attach **AmazonS3ReadOnlyAccess**.', hint: 'The trusted entity must be ec2.amazonaws.com.', check: (c) => c.iamRoles.some((r) => r.trustedEntity.includes('ec2') && r.policyIds.includes('pol-s3-read')) },
      { title: 'Launch an instance with that role and IMDSv2 required', detail: 'EC2 → **Launch instances** → Advanced details → IAM instance profile = your role; metadata = **IMDSv2 only**.', hint: 'Both settings are under "Advanced details".', check: (c) => running(c).some((i) => i.imdsv2 && c.iamRoles.some((r) => r.name === i.iamRole && r.policyIds.includes('pol-s3-read'))) },
      { title: 'Don\'t open SSH to the world', detail: 'Make sure that instance\'s security groups do **not** allow port 22 from 0.0.0.0/0.', hint: 'Untick "Allow SSH traffic from anywhere", or edit the SG inbound rules.', check: (c) => running(c).some((i) => !!i.iamRole && !i.sgIds.some((id) => sgById(c, id)?.inbound.some((r) => r.source === '0.0.0.0/0' && (r.protocol === 'all' || (r.from <= 22 && r.to >= 22))))) },
    ],
    debrief: 'Instance profile → role → **temporary credentials** auto-rotated via IMDS. On the exam, any answer that stores access keys on an instance, in code or in user data is wrong. **IMDSv2** protects those credentials from SSRF.',
  },
  {
    id: 'lab-ebs', title: 'EBS: attach, snapshot, move across AZs and Regions', lessonId: 'm3a-ebs', minutes: 15, start: '/console/ec2/volumes',
    intro: 'Prove to yourself that EBS volumes are locked to one AZ, and that snapshots are how data moves.',
    steps: [
      { title: 'Create an encrypted gp3 volume and attach it', detail: 'EC2 → Volumes → **Create volume**: 20 GiB **gp3**, encrypted, **in the same AZ as a running instance**. Then **Attach volume**.', hint: 'The attach dialog only lists instances in the volume\'s AZ. That is the lesson.', check: (c) => c.volumes.some((v) => v.type === 'gp3' && v.encrypted && v.sizeGb >= 20 && !!v.attachedTo && c.instances.find((i) => i.id === v.attachedTo)?.state !== 'terminated') },
      { title: 'Snapshot it', detail: 'Select the volume → **Create snapshot**.', hint: 'Snapshots are incremental and live in S3 (Regional).', check: (c) => c.snapshots.some((s) => s.region === c.region && c.volumes.some((v) => v.id === s.volumeId && v.encrypted)) },
      { title: 'Restore it into a different AZ', detail: 'Snapshots → select → **Create volume from snapshot** in a **different AZ** than the original volume.', hint: 'This is how you "move" an EBS volume between AZs.', check: (c) => c.snapshots.some((s) => { const src = c.volumes.find((v) => v.id === s.volumeId); return !!src && c.volumes.some((v) => v.id !== src.id && v.sizeGb === s.sizeGb && v.az !== src.az && v.createdAt > s.createdAt); }) },
      { title: 'Copy the snapshot to another Region for DR', detail: 'Snapshots → select → **Copy snapshot** → destination Region `us-west-2` (or any other).', hint: 'Cross-Region snapshot copy is the backbone of backup-and-restore DR for EC2.', check: (c) => c.snapshots.some((s) => s.region !== c.region) },
    ],
    debrief: 'EBS = **one AZ**; snapshots = **Regional** (S3-backed) and **copyable cross-Region**. Encrypt an unencrypted volume via snapshot → encrypted copy. Automate with **Data Lifecycle Manager** or **AWS Backup**. Need shared storage across AZs? That\'s **EFS**, not EBS.',
  },
] satisfies Lab[];
