import type { Question } from '../types';

export default [
  {
    id: "sec-b-001",
    domain: "secure",
    lessonIds: ["m1-vpc-cidr"],
    difficulty: 1,
    stem: "A solutions architect is planning a subnet with the CIDR block 10.0.5.0/24 for a fleet of EC2 instances. How many IPv4 addresses in this subnet can be assigned to instances?",
    options: ["256", "254", "251", "250"],
    answer: [2],
    explanation: "A /24 contains 256 addresses, and AWS **reserves 5 addresses in every subnet**: the network address, the VPC router (.1), the DNS server (.2), one reserved for future use (.3), and the broadcast address (.255). 256 - 5 = 251 usable addresses.",
    optionExplanations: [
      "Wrong. 256 is the total size of a /24, but AWS reserves 5 of them.",
      "Wrong. 254 is the traditional on-premises answer (minus network and broadcast). AWS reserves 3 more.",
      "Correct. 256 total minus the 5 addresses AWS reserves in every subnet = 251.",
      "Wrong. AWS reserves exactly 5 addresses per subnet, not 6."
    ],
    tags: ["vpc", "subnet"]
  },
  {
    id: "sec-b-002",
    domain: "secure",
    lessonIds: ["m1-vpc-cidr", "m1-subnets-routing"],
    difficulty: 2,
    stem: "A company is creating a new VPC that will later connect to its data center, which uses 10.0.0.0/16. The VPC needs a public and a private subnet in each of four Availability Zones, and each subnet must hold about 1,000 hosts with room to add more subnets later. Which CIDR plan meets these requirements?",
    options: [
      "Use 10.0.0.0/16 for the VPC and carve it into /22 subnets.",
      "Use 10.1.0.0/16 for the VPC and carve it into /22 subnets.",
      "Use 10.1.0.0/24 for the VPC and carve it into /27 subnets.",
      "Use 172.16.0.0/12 for the VPC and carve it into /20 subnets."
    ],
    answer: [1],
    explanation: "The deciding constraints are **no overlap with on-premises** and **about 1,000 hosts per subnet**. A /22 gives 1,024 - 5 = 1,019 usable IPs, and 10.1.0.0/16 holds 64 such subnets, so eight are used and plenty remain. VPC CIDRs must be between /16 and /28.",
    optionExplanations: [
      "Wrong. 10.0.0.0/16 overlaps the data center range, so a VPN or Direct Connect link could not route between them.",
      "Correct. It does not overlap 10.0.0.0/16, each /22 gives 1,019 usable IPs, and the /16 leaves room for 56 more /22 subnets.",
      "Wrong. A /24 VPC has only 256 addresses in total, and a /27 subnet gives only 27 usable IPs.",
      "Wrong. A VPC CIDR block can be no larger than /16, so a /12 is not allowed."
    ],
    tags: ["vpc", "subnet"]
  },
  {
    id: "sec-b-003",
    domain: "secure",
    lessonIds: ["m1-subnets-routing"],
    difficulty: 2,
    stem: "EC2 instances in a private subnet must download operating system patches from the internet. The instances must not be reachable by connections that start on the internet. The team wants the LEAST operational overhead. What should a solutions architect do?",
    options: [
      "Add a 0.0.0.0/0 route to the internet gateway in the private subnet's route table.",
      "Create a NAT gateway in the private subnet and point the private route table's 0.0.0.0/0 route at it.",
      "Launch a NAT instance in a public subnet, disable the source/destination check, and route 0.0.0.0/0 to it.",
      "Create a NAT gateway in a public subnet and add a 0.0.0.0/0 route to it in the private subnet's route table."
    ],
    answer: [3],
    explanation: "**Outbound only** plus **least operational overhead** points to a managed NAT gateway. It must sit in a **public** subnet (one whose route table points to the internet gateway), and the private subnet's default route points to it. NAT allows only outbound-initiated connections, so the internet cannot open connections to the instances.",
    optionExplanations: [
      "Wrong. That would make the subnet public, and instances without public IPs still could not use the internet gateway.",
      "Wrong. A NAT gateway in a private subnet has no path to the internet gateway, so it cannot forward traffic out.",
      "Wrong. A NAT instance works, but you must patch, scale and fail it over yourself, which is more operational overhead.",
      "Correct. A managed NAT gateway in a public subnet gives private instances outbound-only internet access with no servers to manage."
    ],
    tags: ["nat-gateway", "route-table", "subnet"]
  },
  {
    id: "sec-b-004",
    domain: "secure",
    lessonIds: ["m1-subnets-routing", "m5-task-concepts"],
    difficulty: 3,
    stem: "A production VPC has private subnets in three Availability Zones. All three private route tables send 0.0.0.0/0 to a single NAT gateway in AZ-a. An AZ-a outage recently cut off internet egress for every tier, and the bill shows cross-AZ data transfer charges. Which change fixes both problems?",
    options: [
      "Create a NAT gateway in a public subnet in each AZ, and point each AZ's private route table at the NAT gateway in the same AZ.",
      "Create a second NAT gateway in AZ-a and add both to the private route tables for load sharing.",
      "Replace the NAT gateway with a NAT instance in an Auto Scaling group with a desired capacity of one.",
      "Replace the NAT gateway with an egress-only internet gateway and point all private route tables at it."
    ],
    answer: [0],
    explanation: "A zonal NAT gateway is redundant only **within its own AZ**. The production pattern is **one NAT gateway per AZ**, with each AZ's private route table pointing at its local NAT gateway. That removes the single-AZ dependency and the cross-AZ data processing charge.",
    optionExplanations: [
      "Correct. Each AZ keeps its own egress path, so an AZ failure affects only that AZ and traffic never crosses AZs.",
      "Wrong. Both gateways would still be in AZ-a, which leaves the same single point of failure. A route table also cannot have two routes for the same destination.",
      "Wrong. A NAT instance adds management work and still takes time to replace after a failure. It also does not remove cross-AZ traffic.",
      "Wrong. An egress-only internet gateway handles IPv6 traffic only, and these instances use IPv4."
    ],
    tags: ["nat-gateway", "route-table", "vpc"]
  },
  {
    id: "sec-b-005",
    domain: "secure",
    lessonIds: ["m1-subnets-routing"],
    difficulty: 1,
    stem: "A new engineer asks what makes a subnet in a VPC a public subnet. Which statement is correct?",
    options: [
      "The subnet has the auto-assign public IPv4 address setting enabled.",
      "The subnet's route table has a route for 0.0.0.0/0 that points to an internet gateway.",
      "The subnet's network ACL allows inbound traffic from 0.0.0.0/0.",
      "The subnet contains a NAT gateway."
    ],
    answer: [1],
    explanation: "A subnet is public because of **routing**: its associated route table sends internet-bound traffic (0.0.0.0/0) to an internet gateway. Public IPs and permissive rules are also needed for an instance to be reachable, but the route is what makes the subnet itself public.",
    optionExplanations: [
      "Wrong. Auto-assign gives instances public IPs, but without an internet gateway route the subnet is still private.",
      "Correct. A route to an internet gateway is the definition of a public subnet.",
      "Wrong. The default network ACL already allows all traffic, including in private subnets.",
      "Wrong. A NAT gateway is placed in a public subnet, but its presence does not make a subnet public."
    ],
    tags: ["subnet", "route-table", "internet-gateway"]
  },
  {
    id: "sec-b-006",
    domain: "secure",
    lessonIds: ["m1-subnets-routing", "m1-sg-nacl"],
    difficulty: 2,
    stem: "A web server runs in a subnet whose route table sends 0.0.0.0/0 to an internet gateway. The subnet uses the default network ACL. Users still cannot reach the website on HTTPS. Which TWO actions are required to make the server reachable from the internet? (Choose TWO.)",
    options: [
      "Associate an Elastic IP address or a public IPv4 address with the instance.",
      "Add an inbound security group rule that allows TCP 443 from 0.0.0.0/0.",
      "Create a NAT gateway and route the subnet's traffic through it.",
      "Create a VPC gateway endpoint for the web server.",
      "Disable the source/destination check on the instance."
    ],
    answer: [0, 1],
    explanation: "Reaching an instance from the internet needs four things: an **internet gateway route**, a **public IP**, a **security group** that allows the port, and a network ACL that allows the traffic. The route and the default ACL are already in place, so the instance still needs a public or Elastic IP and an inbound 443 rule. New security groups have no inbound rules.",
    optionExplanations: [
      "Correct. Without a public or Elastic IP, the internet gateway has no public address to translate to the instance's private IP.",
      "Correct. Security groups deny all inbound traffic by default, so HTTPS must be allowed explicitly.",
      "Wrong. NAT allows only outbound-initiated traffic and is used by private subnets. It does not accept inbound connections.",
      "Wrong. Gateway endpoints give private access to S3 and DynamoDB. They have nothing to do with inbound internet traffic.",
      "Wrong. The source/destination check is disabled only on instances that forward traffic, such as NAT instances."
    ],
    tags: ["internet-gateway", "elastic-ip", "security-group", "ec2"]
  },
  {
    id: "sec-b-007",
    domain: "secure",
    lessonIds: ["m5-task-concepts", "m1-subnets-routing"],
    difficulty: 2,
    stem: "A startup runs a small development VPC with a handful of private instances that download packages a few times a day. The team wants the LOWEST monthly cost for outbound internet access and accepts brief outages and manual maintenance. Which solution meets these requirements?",
    options: [
      "Deploy a NAT gateway in each Availability Zone.",
      "Route all egress through a Transit Gateway to a shared egress VPC.",
      "Launch a small NAT instance in a public subnet with the source/destination check disabled, and route private subnets to it.",
      "Create interface VPC endpoints for every external package repository."
    ],
    answer: [2],
    explanation: "**Lowest cost** together with **accepts outages and manual maintenance** in a **non-production** environment is the classic case for a NAT instance. A tiny instance such as a t4g.nano costs far less than a NAT gateway's hourly charge plus its per-GB processing fee. It must be in a public subnet with the source/destination check disabled.",
    optionExplanations: [
      "Wrong. A NAT gateway per AZ is the production high-availability answer and the most expensive choice here.",
      "Wrong. Centralized egress adds Transit Gateway attachment and data processing costs and suits many VPCs, not one small dev VPC.",
      "Correct. A small NAT instance is the cheapest egress option, and the team has said it accepts the management and availability trade-offs.",
      "Wrong. Interface endpoints reach AWS services and PrivateLink services, not arbitrary public package repositories, and each one bills hourly."
    ],
    tags: ["nat-instance", "nat-gateway", "ec2"]
  },
  {
    id: "sec-b-008",
    domain: "secure",
    lessonIds: ["m1-subnets-routing"],
    difficulty: 2,
    stem: "An application uses IPv6 and must reach IPv6 endpoints on the internet. Security policy says no instance in the subnet may ever accept an inbound IPv6 connection that starts on the internet, even if someone misconfigures a security group. What should a solutions architect use?",
    options: [
      "A NAT gateway with a ::/0 route in the subnet's route table.",
      "An internet gateway, with security groups that have no inbound rules.",
      "An internet gateway, with a network ACL that denies inbound IPv6 traffic.",
      "An egress-only internet gateway with a ::/0 route in the subnet's route table."
    ],
    answer: [3],
    explanation: "IPv6 addresses are globally routable, so NAT is not used to hide instances. An **egress-only internet gateway** is the IPv6 equivalent of NAT for this purpose: it allows outbound connections and their responses but blocks connections that start on the internet, **at the routing level**, whatever the security groups say.",
    optionExplanations: [
      "Wrong. A NAT gateway translates IPv4. Its NAT64 feature lets IPv6 clients reach IPv4 destinations and does not provide IPv6 egress.",
      "Wrong. This works only while the security groups stay correct. The requirement is to stay safe even when a security group is misconfigured.",
      "Wrong. A network ACL is stateless, so denying inbound IPv6 would also drop the return traffic for outbound connections.",
      "Correct. The egress-only internet gateway permits outbound IPv6 only and blocks inbound-initiated connections regardless of security groups."
    ],
    tags: ["internet-gateway", "route-table", "vpc"]
  },
  {
    id: "sec-b-009",
    domain: "secure",
    lessonIds: ["m1-vpc-cidr"],
    difficulty: 2,
    stem: "A VPC created with 10.20.0.0/22 is running out of IP addresses as the application grows. The team wants to add capacity without migrating existing instances or rebuilding the VPC. What should a solutions architect do?",
    options: [
      "Associate a secondary IPv4 CIDR block, such as 10.21.0.0/16, with the VPC and create new subnets in it.",
      "Edit the VPC's primary CIDR block from /22 to /16.",
      "Change the subnet masks of the existing subnets so that each one holds more addresses.",
      "Create a new VPC and peer it with the existing VPC."
    ],
    answer: [0],
    explanation: "A VPC's primary CIDR and existing subnet CIDRs **cannot be changed** after creation. You can **add secondary CIDR blocks** to the VPC and place new subnets in them, and the new range is routed locally like the original. This is the least disruptive way to grow.",
    optionExplanations: [
      "Correct. Secondary CIDRs extend the VPC in place, and new subnets in the added range route locally to the existing ones.",
      "Wrong. The primary CIDR block of a VPC cannot be modified.",
      "Wrong. Subnet CIDRs are fixed once created. You would have to delete and recreate the subnets.",
      "Wrong. Peering works, but it adds a second VPC to manage and routes to maintain when a secondary CIDR solves the problem directly."
    ],
    tags: ["vpc", "subnet"]
  },
  {
    id: "sec-b-010",
    domain: "secure",
    lessonIds: ["m1-sg-nacl"],
    difficulty: 1,
    stem: "Which statement correctly compares security groups and network ACLs?",
    options: [
      "Security groups support both allow and deny rules, and network ACLs support only allow rules.",
      "Network ACLs are stateful, so return traffic is allowed automatically.",
      "Security groups are stateful and allow return traffic automatically. Network ACLs are stateless and evaluate numbered rules in order.",
      "Network ACLs are attached to each instance's network interface, and security groups are attached to subnets."
    ],
    answer: [2],
    explanation: "The key words are **stateful vs stateless**. Security groups work at the instance (ENI) level, support only allow rules, and remember connections, so responses go back automatically. Network ACLs work at the subnet level, support allow and deny rules evaluated from the lowest number up, and need explicit rules for return traffic.",
    optionExplanations: [
      "Wrong. This is reversed: security groups are allow-only, and network ACLs support both allow and deny.",
      "Wrong. Network ACLs are stateless, which is why they need rules for ephemeral return ports.",
      "Correct. This is the core difference the exam tests.",
      "Wrong. This is reversed: security groups attach to ENIs, and network ACLs attach to subnets."
    ],
    tags: ["security-group", "nacl"]
  },
  {
    id: "sec-b-011",
    domain: "secure",
    lessonIds: ["m1-sg-nacl"],
    difficulty: 2,
    stem: "A team replaces the default network ACL on a public web subnet with a custom ACL. It has two rules: inbound allow TCP 443 from 0.0.0.0/0 and outbound allow TCP 443 to 0.0.0.0/0. The security group allows inbound 443. Users now see the site time out. What is the fix?",
    options: [
      "Add an inbound network ACL rule that allows TCP 1024-65535 from 0.0.0.0/0.",
      "Add an outbound network ACL rule that allows TCP 1024-65535 to 0.0.0.0/0.",
      "Add an outbound security group rule that allows TCP 443 to 0.0.0.0/0.",
      "Associate the subnet with a second network ACL that allows all traffic."
    ],
    answer: [1],
    explanation: "Network ACLs are **stateless**. The server's responses go back to the client's **ephemeral port** (1024-65535), not to port 443, so the custom ACL drops them. Allowing outbound TCP 1024-65535 fixes the problem.",
    optionExplanations: [
      "Wrong. Inbound ephemeral ports matter for responses to connections the server starts, not for responses to user requests.",
      "Correct. Return traffic to clients uses ephemeral destination ports, which a stateless network ACL must allow explicitly.",
      "Wrong. Security groups are stateful, so responses are already allowed. The block is in the network ACL.",
      "Wrong. A subnet can be associated with only one network ACL at a time."
    ],
    tags: ["nacl", "security-group"]
  },
  {
    id: "sec-b-012",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m1-threat-protection"],
    difficulty: 3,
    stem: "EC2 instances in a public subnet sit behind a Network Load Balancer that preserves client IPs. The subnet's network ACL has rule 100: allow all inbound traffic. Abusive traffic is arriving from 198.51.100.0/24, and the security team must block that range for the whole subnet immediately. What should a solutions architect do?",
    options: [
      "Associate an AWS WAF web ACL with the EC2 instances and add an IP set rule that blocks the range.",
      "Add a deny rule for 198.51.100.0/24 to the instances' security group.",
      "Add network ACL rule 200 that denies inbound traffic from 198.51.100.0/24.",
      "Add network ACL rule 90 that denies inbound traffic from 198.51.100.0/24."
    ],
    answer: [3],
    explanation: "Only **network ACLs** can explicitly **deny** an IP range, and they apply to the whole subnet. Rules are evaluated **from the lowest number up, and the first match wins**, so the deny must have a lower number than the allow-all rule 100.",
    optionExplanations: [
      "Wrong. AWS WAF attaches to CloudFront, ALB, API Gateway, AppSync, Cognito and some other services. It cannot attach to EC2 instances or a Network Load Balancer.",
      "Wrong. Security groups support only allow rules, so you cannot write a deny.",
      "Wrong. Rule 100 matches first and allows the traffic, so rule 200 is never evaluated for these packets.",
      "Correct. Rule 90 is evaluated before rule 100, so traffic from the abusive range is denied at the subnet boundary."
    ],
    tags: ["nacl", "security-group", "waf", "nlb"]
  },
  {
    id: "sec-b-013",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m1-ref-3tier"],
    difficulty: 3,
    stem: "A three-tier application has an internet-facing ALB, an application tier in an Auto Scaling group listening on port 8080, and an Aurora MySQL cluster on port 3306. Instances are replaced often, so their IP addresses change. Only the ALB may reach the application tier, and only the application tier may reach the database, using the LEAST privilege possible. Which TWO rules should a solutions architect create? (Choose TWO.)",
    options: [
      "On the database security group, allow inbound TCP 3306 with the application tier's security group as the source.",
      "On the application security group, allow inbound TCP 8080 with the ALB's security group as the source.",
      "On the database security group, allow inbound TCP 3306 from the application subnets' CIDR blocks.",
      "On the database subnet's network ACL, allow TCP 3306 only from the application instances' current private IPs.",
      "On the application security group, allow inbound TCP 8080 from 0.0.0.0/0."
    ],
    answer: [0, 1],
    explanation: "**Security group referencing** (chaining) means using another security group's ID as the source of a rule. Any ENI in the source group is allowed, whatever its IP, so it suits instances that are replaced often and is tighter than CIDR rules. Chain ALB SG to app SG on 8080, then app SG to DB SG on 3306.",
    optionExplanations: [
      "Correct. Only ENIs in the application security group can reach the database, whatever their IPs.",
      "Correct. Only the ALB's ENIs can send traffic to the application port.",
      "Wrong. This works, but any other resource in those subnets could also reach the database, so it is not least privilege.",
      "Wrong. Instance IPs change when the Auto Scaling group replaces instances, so these rules would break and need constant updates.",
      "Wrong. This lets anyone reach the application tier directly and bypass the ALB."
    ],
    tags: ["security-group", "alb", "aurora", "auto-scaling"]
  },
  {
    id: "sec-b-014",
    domain: "secure",
    lessonIds: ["m1-sg-nacl"],
    difficulty: 2,
    stem: "An engineer creates a new network ACL and associates it with an application subnet. Immediately afterwards, all traffic to and from the instances in that subnet stops, although no security groups changed. What is the MOST likely cause?",
    options: [
      "A newly created custom network ACL denies all inbound and outbound traffic until allow rules are added.",
      "Associating a network ACL resets the security groups of every instance in the subnet.",
      "Associating a network ACL removes the subnet's route table association.",
      "A network ACL needs an internet gateway attached before it passes traffic."
    ],
    answer: [0],
    explanation: "This is a **defaults** question. The **default** network ACL allows all inbound and outbound traffic, but a **new custom** network ACL contains only the final `*` deny rule, so it blocks everything until you add allow rules, including ephemeral return ports.",
    optionExplanations: [
      "Correct. A custom network ACL starts with deny-all in both directions.",
      "Wrong. Network ACLs and security groups are independent. Changing one never changes the other.",
      "Wrong. Route table and network ACL associations are separate settings.",
      "Wrong. Network ACLs filter all traffic crossing the subnet boundary, including traffic inside the VPC, and do not depend on an internet gateway."
    ],
    tags: ["nacl"]
  },
  {
    id: "sec-b-015",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m1-private-connectivity"],
    difficulty: 3,
    stem: "Administrators need shell access to EC2 instances in private subnets that have no internet route. Security requires no open inbound ports, no bastion hosts to maintain, and a log of every session. Which solution meets these requirements with the LEAST operational overhead?",
    options: [
      "Deploy a bastion host in a public subnet, allowing SSH only from the corporate IP range, and allow SSH from the bastion's security group on the private instances.",
      "Use AWS Systems Manager Session Manager with an instance profile, interface VPC endpoints for Systems Manager, and session logging to CloudWatch Logs or Amazon S3.",
      "Set up AWS Client VPN and allow SSH from the Client VPN CIDR in the instances' security groups.",
      "Assign public IPs to the instances and use EC2 Instance Connect over the internet."
    ],
    answer: [1],
    explanation: "**No inbound ports**, **no bastions** and **session logging** together point to **Session Manager**. The SSM agent makes outbound HTTPS connections to Systems Manager, here through interface endpoints because the subnets have no internet route, and sessions can be logged to CloudWatch Logs or S3. Access is controlled with IAM.",
    optionExplanations: [
      "Wrong. A bastion is a server you must patch and harden, and it needs an open inbound SSH port.",
      "Correct. No inbound rules are needed, nothing extra is exposed, and every session can be logged.",
      "Wrong. Client VPN works, but the instances still need inbound SSH open and you must manage SSH keys and session logging yourself.",
      "Wrong. This exposes the instances to the internet with public IPs and inbound SSH."
    ],
    tags: ["systems-manager", "interface-endpoint", "security-group", "ec2"]
  },
  {
    id: "sec-b-016",
    domain: "secure",
    lessonIds: ["m1-sg-nacl"],
    difficulty: 2,
    stem: "A subnet's network ACL has two inbound rules: rule 100 allows TCP 22 from 0.0.0.0/0, and rule 110 denies TCP 22 from 203.0.113.0/24. The instance's security group allows SSH from anywhere. What happens to an SSH connection attempt from 203.0.113.25?",
    options: [
      "It is denied, because an explicit deny always overrides an allow.",
      "It is denied by the final * rule of the network ACL.",
      "It is allowed, because rule 100 is the lowest-numbered matching rule and evaluation stops there.",
      "It is allowed only if the security group also contains a deny rule for the range."
    ],
    answer: [2],
    explanation: "Network ACL rules are evaluated **in ascending number order, and the first match wins**. Rule 100 matches the packet and allows it, so rule 110 is never reached. To block the range, the deny must have a lower number, such as 90.",
    optionExplanations: [
      "Wrong. 'Explicit deny wins' is IAM policy evaluation logic. Network ACLs use first-match ordering.",
      "Wrong. The * rule applies only when no numbered rule matches, and rule 100 matches.",
      "Correct. First match wins, and rule 100 allows the traffic.",
      "Wrong. Security groups cannot contain deny rules."
    ],
    tags: ["nacl", "security-group"]
  },
  {
    id: "sec-b-017",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 2,
    stem: "A data processing fleet in private subnets reads and writes several terabytes per day to Amazon S3 buckets in the same Region. Today the traffic goes through a NAT gateway, and the NAT data processing charges are high. Which solution is the MOST cost-effective while keeping traffic off the internet?",
    options: [
      "Add a second NAT gateway and split the traffic between them.",
      "Create an S3 interface VPC endpoint in each private subnet.",
      "Create an S3 gateway VPC endpoint and associate it with the private subnets' route tables.",
      "Order an AWS Direct Connect connection for S3 traffic."
    ],
    answer: [2],
    explanation: "**S3 or DynamoDB, same Region, MOST cost-effective** means a **gateway endpoint**. It is free (no hourly or per-GB charge) and works by adding a prefix-list route to the selected route tables, so S3 traffic stays on the AWS network and no longer pays NAT processing fees.",
    optionExplanations: [
      "Wrong. NAT gateways charge per GB processed, so two of them cost the same or more.",
      "Wrong. An interface endpoint works but bills per hour per AZ plus per GB. A gateway endpoint is free.",
      "Correct. A gateway endpoint has no charge and routes S3 traffic privately through the route table.",
      "Wrong. Direct Connect links on-premises sites to AWS. It does not help instances already inside the VPC."
    ],
    tags: ["gateway-endpoint", "s3", "nat-gateway", "route-table"]
  },
  {
    id: "sec-b-018",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 3,
    stem: "A company connects its data center to a VPC with AWS Direct Connect using a private virtual interface. On-premises applications must upload to Amazon S3 using only private IP addresses, and the traffic must not cross the internet or use public IP space. Which solution meets these requirements?",
    options: [
      "Create an S3 gateway endpoint in the VPC and advertise its prefix list to the data center over the private VIF.",
      "Deploy a proxy fleet behind a NAT gateway in the VPC and route on-premises S3 traffic through it.",
      "Create a public virtual interface on the Direct Connect connection and send traffic to the public S3 endpoints.",
      "Create an S3 interface VPC endpoint in the VPC and have on-premises clients use its endpoint-specific DNS names over the private VIF."
    ],
    answer: [3],
    explanation: "**Gateway endpoints cannot be reached from on-premises**, peered VPCs or VPN connections, because they work only through the VPC's own route tables. An **interface endpoint** (PrivateLink) creates ENIs with private IPs in your subnets, and on-premises clients can reach those IPs over Direct Connect or VPN.",
    optionExplanations: [
      "Wrong. Traffic arriving over a VIF cannot use a gateway endpoint. It is reachable only from inside that VPC.",
      "Wrong. A NAT gateway sends traffic to S3's public endpoints and adds per-GB charges and servers to manage.",
      "Wrong. A public VIF reaches S3 through public IP addresses, which breaks the private-IP requirement.",
      "Correct. Interface endpoint ENIs have private IPs that are reachable over the private VIF, so the uploads stay on private addressing."
    ],
    tags: ["interface-endpoint", "gateway-endpoint", "direct-connect", "s3"]
  },
  {
    id: "sec-b-019",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 2,
    stem: "A SaaS provider wants to offer its API privately to hundreds of customers, each in its own AWS account and VPC. Many customer VPCs use overlapping CIDR ranges, and customers must reach only this one service, not the provider's whole network. What should the provider use?",
    options: [
      "A VPC endpoint service (AWS PrivateLink) backed by a Network Load Balancer, with customers creating interface endpoints.",
      "A VPC peering connection with each customer VPC.",
      "A Transit Gateway shared with all customer accounts through AWS RAM.",
      "A public ALB with AWS WAF rules that allow only customer IP addresses."
    ],
    answer: [0],
    explanation: "**Overlapping CIDRs**, **hundreds of consumers** and **expose one service, not the network** all point to **PrivateLink**. The provider publishes an endpoint service behind an NLB (or GWLB), and each consumer gets an interface endpoint with private IPs from its own CIDR, so overlaps do not matter and traffic flows only from consumer to service.",
    optionExplanations: [
      "Correct. PrivateLink tolerates overlapping CIDRs, scales to many consumers, and exposes only the service.",
      "Wrong. Peering fails with overlapping CIDRs and exposes whole VPCs to each other.",
      "Wrong. Transit Gateway routing also breaks with overlapping CIDRs and connects networks rather than a single service.",
      "Wrong. The traffic would cross the public internet, which breaks the private requirement."
    ],
    tags: ["privatelink", "interface-endpoint", "nlb"]
  },
  {
    id: "sec-b-020",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 2,
    stem: "VPC A is peered with VPC B, and VPC B is peered with VPC C. Instances in VPC A cannot reach instances in VPC C. The team also failed to create a peering connection between VPC A and a new VPC D. Which TWO statements explain these problems? (Choose TWO.)",
    options: [
      "VPC peering is not transitive, so VPC A cannot reach VPC C through VPC B.",
      "VPC peering cannot be created between VPCs that have overlapping CIDR blocks.",
      "VPC peering requires a Site-to-Site VPN between the VPCs.",
      "VPC peering works only between VPCs in the same AWS Region.",
      "VPC peering is limited to 1.25 Gbps per connection."
    ],
    answer: [0, 1],
    explanation: "Two classic peering limits: **no transitive routing** (A to B to C does not work, so you need a direct A-C peering or a Transit Gateway) and **no overlapping CIDRs**. Peering does work across Regions and accounts and has no bandwidth limit of its own.",
    optionExplanations: [
      "Correct. Each peering connection carries traffic only between its two VPCs.",
      "Correct. Overlapping CIDRs are the usual reason a peering request fails.",
      "Wrong. Peering uses the AWS network directly. No VPN is involved.",
      "Wrong. Inter-Region peering is supported.",
      "Wrong. The 1.25 Gbps figure is the Site-to-Site VPN per-tunnel limit. Peering has no bandwidth limit of its own."
    ],
    tags: ["vpc-peering", "vpc"]
  },
  {
    id: "sec-b-021",
    domain: "secure",
    lessonIds: ["m1-private-connectivity", "m5-networking"],
    difficulty: 3,
    stem: "A company has 60 VPCs across 15 AWS accounts in AWS Organizations, plus a data center connected by Site-to-Site VPN. Every VPC must reach the data center and selected other VPCs, and the networking team wants central routing control with the LEAST operational overhead. What should a solutions architect recommend?",
    options: [
      "Create a full mesh of VPC peering connections, plus a VPN connection from each VPC to the data center.",
      "Deploy a Transit Gateway in a network account, share it with AWS RAM, attach every VPC and the VPN, and control traffic with Transit Gateway route tables.",
      "Build a transit VPC with third-party router appliances on EC2 that terminate VPNs to every VPC.",
      "Expose each VPC's services with AWS PrivateLink endpoint services that the other VPCs consume."
    ],
    answer: [1],
    explanation: "**Many VPCs, multiple accounts, on-premises, transitive routing, central control** means **Transit Gateway**. It is a regional hub router: each VPC and the VPN attach once, Transit Gateway route tables segment traffic, and AWS RAM shares it across accounts. A full mesh of 60 VPCs would need 1,770 peering connections.",
    optionExplanations: [
      "Wrong. 60 x 59 / 2 = 1,770 peering connections plus 60 VPNs is very hard to operate, and peering is not transitive.",
      "Correct. A hub-and-spoke Transit Gateway shared through RAM scales to thousands of attachments with central routing.",
      "Wrong. A transit VPC is the legacy pattern, with EC2 routers you must scale, patch and make highly available.",
      "Wrong. PrivateLink exposes individual services, not network routing, and it does not connect the data center to every VPC."
    ],
    tags: ["transit-gateway", "ram", "site-to-site-vpn", "organizations"]
  },
  {
    id: "sec-b-022",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 1,
    stem: "A company must connect its office network to a VPC within the next two days. The traffic must be encrypted, and variable internet latency is acceptable. Which service should a solutions architect use?",
    options: [
      "A dedicated AWS Direct Connect connection",
      "AWS Client VPN",
      "A VPC peering connection to the office network",
      "AWS Site-to-Site VPN"
    ],
    answer: [3],
    explanation: "**Within days**, **encrypted** and **over the internet** mean **Site-to-Site VPN**: IPsec tunnels between a customer gateway in the office and a virtual private gateway or Transit Gateway. Direct Connect can take weeks and is not encrypted by default.",
    optionExplanations: [
      "Wrong. Direct Connect takes weeks or more to provision and is not encrypted by default.",
      "Wrong. Client VPN connects individual user devices, not a whole office network.",
      "Wrong. VPC peering connects VPCs to each other, not to on-premises networks.",
      "Correct. Site-to-Site VPN can be set up in hours and encrypts traffic with IPsec."
    ],
    tags: ["site-to-site-vpn"]
  },
  {
    id: "sec-b-023",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 3,
    stem: "A company reaches its VPCs through a 1 Gbps hosted AWS Direct Connect connection from a partner. A new compliance rule requires all traffic between the data center and AWS to be encrypted in transit, and the company wants to keep Direct Connect's consistent latency. What should a solutions architect do?",
    options: [
      "Enable MACsec on the existing 1 Gbps hosted connection.",
      "Do nothing, because Direct Connect is a private circuit and is encrypted by default.",
      "Run an AWS Site-to-Site VPN (IPsec) over the Direct Connect connection, terminating on a Transit Gateway or virtual private gateway.",
      "Replace Direct Connect with a Site-to-Site VPN over the internet."
    ],
    answer: [2],
    explanation: "**Direct Connect is not encrypted by default.** For a hosted 1 Gbps connection, the answer is an **IPsec VPN over Direct Connect** (over a public VIF, or a transit VIF with a private IP VPN). MACsec is supported only on certain dedicated connections (10 Gbps and higher), not on hosted connections like this one.",
    optionExplanations: [
      "Wrong. MACsec needs a supported dedicated connection, and this is a 1 Gbps hosted connection.",
      "Wrong. A private circuit is not the same as encryption. Direct Connect traffic is not encrypted by default.",
      "Correct. IPsec over Direct Connect adds encryption and keeps the dedicated path's consistent latency.",
      "Wrong. An internet VPN is encrypted but gives up the consistent latency the company wants to keep."
    ],
    tags: ["direct-connect", "site-to-site-vpn", "transit-gateway"]
  },
  {
    id: "sec-b-024",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 3,
    stem: "A company's only link to AWS is a single 10 Gbps Direct Connect connection. Leadership wants a backup path if the connection fails, at the LOWEST cost, and accepts reduced bandwidth during an outage. The traffic must stay encrypted on the backup path. What should a solutions architect recommend?",
    options: [
      "Configure an AWS Site-to-Site VPN over the internet to the same virtual private gateway or Transit Gateway as a backup path.",
      "Order a second 10 Gbps Direct Connect connection at a different Direct Connect location.",
      "Deploy AWS Client VPN for every on-premises server.",
      "Keep an AWS Snowball Edge device on site for use during outages."
    ],
    answer: [0],
    explanation: "**Lowest cost** plus **accepts reduced bandwidth** for a backup path means a **Site-to-Site VPN backup**. BGP prefers the Direct Connect path, and traffic fails over to the IPsec VPN if Direct Connect goes down. A second Direct Connect location gives maximum resilience but costs far more.",
    optionExplanations: [
      "Correct. A VPN costs very little to keep ready, is encrypted, and takes over automatically through BGP.",
      "Wrong. This is the most resilient design but costs much more than a VPN, so it fails the lowest-cost requirement.",
      "Wrong. Client VPN is for individual user devices, not server-to-VPC network connectivity.",
      "Wrong. Snowball moves data offline. It is not a network failover path."
    ],
    tags: ["direct-connect", "site-to-site-vpn"]
  },
  {
    id: "sec-b-025",
    domain: "secure",
    lessonIds: ["m1-private-connectivity", "m5-networking"],
    difficulty: 2,
    stem: "A company has 300 employees who work remotely from laptops. They need secure access to internal applications in private subnets of a VPC, using their existing corporate identity provider over SAML 2.0. The company wants a fully managed service. What should a solutions architect use?",
    options: [
      "A Site-to-Site VPN connection for each employee's home router.",
      "An AWS Client VPN endpoint with SAML-based federated authentication, associated with the VPC's subnets.",
      "A bastion host in a public subnet that employees SSH through.",
      "An AWS Direct Connect hosted connection for the remote employees."
    ],
    answer: [1],
    explanation: "**Individual users on laptops** connecting to a VPC means **AWS Client VPN**. It is a managed OpenVPN-based endpoint that supports Active Directory, mutual certificate and SAML authentication, and authorization rules limit which CIDRs each group can reach.",
    optionExplanations: [
      "Wrong. Site-to-Site VPN connects networks, and running 300 of them would be impractical.",
      "Correct. Client VPN is managed, integrates with SAML identity providers, and gives users access to private subnets.",
      "Wrong. A bastion exposes an SSH port, needs patching, and suits administrators rather than application users.",
      "Wrong. Direct Connect is a physical circuit to a data center or colocation site, not to remote laptops."
    ],
    tags: ["client-vpn", "vpc"]
  },
  {
    id: "sec-b-026",
    domain: "secure",
    lessonIds: ["m5-task-concepts", "m1-private-connectivity"],
    difficulty: 3,
    stem: "A company's Site-to-Site VPN to a virtual private gateway is saturated at about 1.25 Gbps. The company needs about 4 Gbps of encrypted throughput to AWS within a month, and Direct Connect cannot be installed at the site. What should a solutions architect do?",
    options: [
      "Ask AWS Support to raise the bandwidth of the virtual private gateway.",
      "Enable accelerated VPN on the existing connection to raise its per-tunnel limit.",
      "Terminate several Site-to-Site VPN connections on a Transit Gateway and enable equal-cost multi-path (ECMP) routing with BGP.",
      "Replace the VPN with VPC peering to the on-premises network."
    ],
    answer: [2],
    explanation: "Each VPN tunnel is limited to about **1.25 Gbps**, and a virtual private gateway uses one tunnel at a time. To go beyond that, terminate multiple VPN connections on a **Transit Gateway with ECMP**, which spreads flows across all the active tunnels and adds their bandwidth together.",
    optionExplanations: [
      "Wrong. The per-tunnel limit is fixed, and a virtual private gateway does not do ECMP across connections.",
      "Wrong. Accelerated VPN routes traffic through the AWS global network for better latency and stability. It does not raise the per-tunnel limit.",
      "Correct. ECMP across multiple tunnels on a Transit Gateway scales encrypted throughput beyond 1.25 Gbps.",
      "Wrong. VPC peering cannot connect to on-premises networks."
    ],
    tags: ["site-to-site-vpn", "transit-gateway"]
  },
  {
    id: "sec-b-027",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 3,
    stem: "Lambda functions attached to private subnets with no NAT gateway must read from an Amazon DynamoDB table and write objects to an Amazon S3 bucket, both in the same Region. The company wants the MOST cost-effective private connectivity. Which TWO actions should a solutions architect take? (Choose TWO.)",
    options: [
      "Create a NAT gateway and route the private subnets through it.",
      "Create an S3 gateway endpoint and associate it with the Lambda subnets' route tables.",
      "Create an S3 interface endpoint in each Lambda subnet.",
      "Create a DynamoDB gateway endpoint and associate it with the Lambda subnets' route tables.",
      "Create a DynamoDB interface endpoint in each Lambda subnet."
    ],
    answer: [1, 3],
    explanation: "Only **S3 and DynamoDB** have **gateway endpoints**, and they are free. Interface endpoints for both services also exist, but they bill hourly per AZ plus per GB, so for in-VPC access in the same Region the gateway endpoints are the cost-effective answer.",
    optionExplanations: [
      "Wrong. NAT adds hourly and per-GB charges and sends traffic to public endpoints.",
      "Correct. A free gateway endpoint gives private S3 access through the route table.",
      "Wrong. This works but costs money, while the gateway endpoint does the same job for free inside the VPC.",
      "Correct. A free gateway endpoint gives private DynamoDB access through the route table.",
      "Wrong. DynamoDB interface endpoints exist but cost money. They are mainly useful for access from on-premises."
    ],
    tags: ["gateway-endpoint", "interface-endpoint", "lambda", "dynamodb", "s3"]
  },
  {
    id: "sec-b-028",
    domain: "secure",
    lessonIds: ["m1-private-connectivity", "m1-threat-protection"],
    difficulty: 3,
    stem: "A financial firm uses an S3 gateway endpoint so that private EC2 instances can reach a sensitive bucket. The security team wants to stop data exfiltration: instances must not copy data to buckets outside the firm, and the sensitive bucket must reject any request that does not come through the endpoint. Which solution meets these requirements?",
    options: [
      "Attach an endpoint policy that allows access only to the firm's bucket ARNs, and add a bucket policy that denies requests unless aws:SourceVpce equals the endpoint ID.",
      "Attach a security group to the gateway endpoint that allows only the firm's bucket IP ranges.",
      "Add network ACL rules that reference the S3 managed prefix list and allow only the firm's buckets.",
      "Add a bucket policy that allows only the instances' private IP addresses through the aws:SourceIp condition."
    ],
    answer: [0],
    explanation: "Control both directions. The **endpoint policy** limits which buckets traffic through the endpoint can reach, which blocks exfiltration to outside buckets. The **bucket policy** with **`aws:SourceVpce`** makes the bucket reject requests that do not arrive through that endpoint.",
    optionExplanations: [
      "Correct. The endpoint policy restricts where data can go, and the aws:SourceVpce condition restricts where requests can come from.",
      "Wrong. Gateway endpoints have no security groups. Only interface endpoints do.",
      "Wrong. Network ACLs cannot reference prefix lists, and IP rules cannot tell one bucket from another because all buckets share S3's IP ranges.",
      "Wrong. aws:SourceIp does not match private IPs for requests through a VPC endpoint. Use aws:SourceVpce or aws:VpcSourceIp instead."
    ],
    tags: ["gateway-endpoint", "s3", "iam-policy"]
  },
  {
    id: "sec-b-029",
    domain: "secure",
    lessonIds: ["m1-private-connectivity"],
    difficulty: 1,
    stem: "Applications in private subnets with no internet access must send messages to Amazon SQS without code changes to the SQS endpoint URL. Which solution should a solutions architect use?",
    options: [
      "A gateway VPC endpoint for Amazon SQS",
      "A VPC peering connection to the Amazon SQS service VPC",
      "An egress-only internet gateway",
      "An interface VPC endpoint for Amazon SQS with private DNS enabled"
    ],
    answer: [3],
    explanation: "Most AWS services, including SQS, are reached privately through **interface endpoints** (PrivateLink). With **private DNS enabled**, the standard public hostname resolves to the endpoint's private IPs inside the VPC, so applications need no code changes.",
    optionExplanations: [
      "Wrong. Gateway endpoints exist only for S3 and DynamoDB.",
      "Wrong. You cannot peer with an AWS-managed service VPC.",
      "Wrong. An egress-only internet gateway is for IPv6 internet egress and does not provide private connectivity to AWS services.",
      "Correct. An interface endpoint with private DNS gives private SQS access through the default endpoint name."
    ],
    tags: ["interface-endpoint", "privatelink", "sqs"]
  },
  {
    id: "sec-b-030",
    domain: "secure",
    lessonIds: ["m1-private-connectivity", "m5-networking"],
    difficulty: 3,
    stem: "A company has one Direct Connect connection in North America and Transit Gateways in us-east-1, us-west-2 and eu-west-1, each with dozens of VPC attachments. The data center must reach VPCs in all three Regions over Direct Connect with the fewest virtual interfaces and the least ongoing management. What should a solutions architect do?",
    options: [
      "Create a Site-to-Site VPN from the data center to each VPC.",
      "Create a Direct Connect gateway, connect it to the connection with a transit VIF, and associate all three Transit Gateways with it.",
      "Peer every VPC with a hub VPC in us-east-1 and attach the hub VPC to a private VIF.",
      "Create a public VIF and reach the VPCs through their public endpoints."
    ],
    answer: [1],
    explanation: "A **Direct Connect gateway** is a global object that links one Direct Connect connection to gateways in **multiple Regions**. A single **transit VIF** to the Direct Connect gateway, associated with each Region's Transit Gateway, reaches every attached VPC.",
    optionExplanations: [
      "Wrong. This is dozens of VPN connections that do not use Direct Connect at all.",
      "Correct. One transit VIF and one Direct Connect gateway reach all three Transit Gateways and their VPCs.",
      "Wrong. Peering is not transitive, so traffic from the data center could not pass through the hub VPC to the peered VPCs.",
      "Wrong. A public VIF reaches public AWS endpoints, not private VPC resources."
    ],
    tags: ["direct-connect", "transit-gateway"]
  },
  {
    id: "sec-b-031",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 1,
    stem: "A security team wants a managed service that continuously analyzes CloudTrail events, VPC Flow Logs and DNS logs to detect threats such as cryptocurrency mining and credential misuse, without deploying agents or managing log pipelines. Which service should they enable?",
    options: ["Amazon Inspector", "Amazon Macie", "Amazon GuardDuty", "AWS Shield Standard"],
    answer: [2],
    explanation: "**Threat detection from CloudTrail, VPC Flow Logs and DNS logs** describes **Amazon GuardDuty**. It reads these sources directly (you do not have to enable or store the logs yourself) and uses threat intelligence and machine learning to raise findings such as crypto-mining or unusual API calls.",
    optionExplanations: [
      "Wrong. Inspector scans EC2, ECR images and Lambda for software vulnerabilities and network exposure. It does not detect threats from logs.",
      "Wrong. Macie discovers sensitive data such as PII in S3.",
      "Correct. GuardDuty is the managed threat detection service built on these log sources.",
      "Wrong. Shield Standard protects against layer 3 and layer 4 DDoS attacks. It does not analyze account activity."
    ],
    tags: ["guardduty", "cloudtrail", "vpc-flow-logs"]
  },
  {
    id: "sec-b-032",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "A healthcare company stores millions of objects across hundreds of S3 buckets in several accounts. Auditors want to know which buckets contain personally identifiable information, such as names and patient IDs, and which of those buckets are publicly accessible. Which solution requires the LEAST effort?",
    options: [
      "Enable Amazon Macie with automated sensitive data discovery across the organization.",
      "Enable Amazon GuardDuty S3 Protection in every account.",
      "Run Amazon Inspector scans against the S3 buckets.",
      "Write AWS Config rules that inspect the contents of each object."
    ],
    answer: [0],
    explanation: "**Sensitive data or PII in S3** points to **Amazon Macie**. It uses machine learning and pattern matching to find PII, works across an AWS Organizations setup, and also reports bucket security posture such as public access.",
    optionExplanations: [
      "Correct. Macie is built for discovering PII in S3, with organization-wide automated discovery.",
      "Wrong. GuardDuty S3 Protection detects suspicious access activity. It does not classify object contents.",
      "Wrong. Inspector scans workloads for vulnerabilities, not S3 object contents.",
      "Wrong. Config evaluates resource configuration, not data inside objects, and custom rules would take a lot of effort."
    ],
    tags: ["macie", "s3", "organizations"]
  },
  {
    id: "sec-b-033",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "A company runs workloads on EC2 instances, container images in Amazon ECR and Lambda functions. The security team needs continuous, automatic scanning for known software vulnerabilities (CVEs) and unintended network exposure, re-scanning whenever a new CVE is published. Which service meets this requirement?",
    options: ["Amazon Detective", "Amazon Inspector", "Amazon GuardDuty", "AWS Trusted Advisor"],
    answer: [1],
    explanation: "**CVEs and vulnerability scanning** for **EC2, ECR and Lambda** describe **Amazon Inspector**. It discovers resources automatically, scans continuously, and re-evaluates them when new CVEs are published, with a risk score for each finding.",
    optionExplanations: [
      "Wrong. Detective helps investigate the root cause of findings. It does not scan for vulnerabilities.",
      "Correct. Inspector continuously scans EC2, ECR images and Lambda for CVEs and network reachability.",
      "Wrong. GuardDuty detects active threats from activity logs, not unpatched software.",
      "Wrong. Trusted Advisor gives best-practice checks on cost, limits and some security settings. It does not scan for CVEs."
    ],
    tags: ["inspector", "ec2", "ecr", "lambda"]
  },
  {
    id: "sec-b-034",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 3,
    stem: "A ticketing website on an internet-facing ALB faces SQL injection attempts and large DDoS attacks during major sales. The company wants protection against both, access to the AWS Shield Response Team (SRT) during attacks, and credits for scaling charges caused by DDoS. Which TWO services should a solutions architect use? (Choose TWO.)",
    options: [
      "AWS Shield Standard",
      "Amazon GuardDuty",
      "AWS WAF with a web ACL using the SQL injection managed rule group, associated with the ALB",
      "AWS Network Firewall in front of the ALB",
      "AWS Shield Advanced on the ALB"
    ],
    answer: [2, 4],
    explanation: "**SQL injection** is a layer 7 attack, which **AWS WAF** blocks with managed rule groups. **SRT access** and **DDoS cost protection** are features of **Shield Advanced** only. Shield Advanced also includes WAF usage at no extra charge for protected resources.",
    optionExplanations: [
      "Wrong. Shield Standard is free and automatic, but it does not include the SRT or cost protection.",
      "Wrong. GuardDuty detects threats in account activity. It does not block web requests.",
      "Correct. WAF managed rules inspect HTTP requests and block SQL injection.",
      "Wrong. Network Firewall filters VPC traffic and does not provide SRT support or DDoS cost protection.",
      "Correct. Shield Advanced adds the 24/7 SRT, advanced DDoS mitigation and cost protection."
    ],
    tags: ["waf", "shield", "alb"]
  },
  {
    id: "sec-b-035",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "A company with 30 accounts in AWS Organizations uses GuardDuty, Inspector and Macie. The CISO wants one place that collects and prioritizes findings from all of these services across every account and automatically checks accounts against the AWS Foundational Security Best Practices standard. Which service should be enabled with a delegated administrator?",
    options: ["Amazon Detective", "An AWS Config aggregator", "AWS CloudTrail Lake", "AWS Security Hub"],
    answer: [3],
    explanation: "**Aggregate findings** across services and accounts plus **security standards checks** (FSBP, CIS, PCI DSS) describe **AWS Security Hub**. It normalizes findings into one format and integrates with Organizations through a delegated administrator account.",
    optionExplanations: [
      "Wrong. Detective is for investigating individual findings, not for aggregating them or checking compliance.",
      "Wrong. A Config aggregator collects configuration and compliance data but does not bring together GuardDuty, Inspector and Macie findings.",
      "Wrong. CloudTrail Lake stores and queries API activity. It is not a findings aggregator.",
      "Correct. Security Hub centralizes findings and runs automated best-practice checks across the organization."
    ],
    tags: ["security-hub", "guardduty", "inspector", "macie", "organizations"]
  },
  {
    id: "sec-b-036",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "GuardDuty has raised a finding that an IAM role is making API calls from an unusual location. An analyst needs to see the role's activity over time, related IP addresses and the resources it touched, to find the root cause quickly without building queries. Which service should the analyst use?",
    options: ["Amazon Detective", "Amazon Inspector", "Amazon Macie", "AWS Audit Manager"],
    answer: [0],
    explanation: "**Investigate**, **root cause** and **visualize relationships** point to **Amazon Detective**. It automatically builds a behavior graph from CloudTrail, VPC Flow Logs and GuardDuty findings, so you can move from a finding to the related entities and timelines.",
    optionExplanations: [
      "Correct. Detective is built for investigating security findings with prebuilt visualizations.",
      "Wrong. Inspector finds vulnerabilities. It does not investigate activity.",
      "Wrong. Macie classifies sensitive data in S3.",
      "Wrong. Audit Manager collects evidence for compliance audits, not for incident investigation."
    ],
    tags: ["detective", "guardduty", "iam-role"]
  },
  {
    id: "sec-b-037",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 3,
    stem: "A company with 40 accounts in AWS Organizations must make sure every ALB and CloudFront distribution, including those created later in new accounts, has a standard AWS WAF web ACL attached. Non-compliant resources should be fixed automatically, with the LEAST operational overhead. What should a solutions architect do?",
    options: [
      "Use CloudFormation StackSets to deploy the web ACL to every account, and attach it manually to new resources.",
      "Write a service control policy that requires a WAF web ACL on every ALB and distribution.",
      "Create an AWS Firewall Manager WAF policy from the Firewall Manager administrator account with automatic remediation enabled.",
      "Create an AWS Config rule that detects resources without a web ACL and emails the owners."
    ],
    answer: [2],
    explanation: "**Central, organization-wide** enforcement of **WAF, Shield Advanced, security groups or Network Firewall** rules, **including new accounts and resources**, is **Firewall Manager**. Its prerequisites are AWS Organizations, a Firewall Manager administrator account, and AWS Config enabled in the member accounts.",
    optionExplanations: [
      "Wrong. StackSets can deploy the web ACL, but attaching it to resources created later would stay a manual job.",
      "Wrong. SCPs only allow or deny API calls. They cannot attach a web ACL or require a resource association.",
      "Correct. Firewall Manager applies the policy to existing and new in-scope resources and remediates automatically.",
      "Wrong. This only detects and notifies. People still have to fix every resource."
    ],
    tags: ["firewall-manager", "waf", "organizations", "config"]
  },
  {
    id: "sec-b-038",
    domain: "secure",
    lessonIds: ["m1-threat-protection", "m5-networking"],
    difficulty: 3,
    stem: "A company routes all VPC egress through a central inspection VPC attached to a Transit Gateway. Security requires that workloads reach only an approved list of domain names, such as updates.example.com, and that traffic be inspected with stateful intrusion prevention signatures. Which solution meets these requirements?",
    options: [
      "Security groups on each workload with outbound rules for the approved domain names.",
      "AWS Network Firewall in the inspection VPC, with a stateful domain-list rule group and Suricata-compatible IPS rules.",
      "Network ACLs on the inspection VPC subnets that allow only the approved domains.",
      "An AWS WAF web ACL associated with the NAT gateways."
    ],
    answer: [1],
    explanation: "**Domain allow-listing for egress** and **stateful IDS/IPS** across VPCs describe **AWS Network Firewall**. It is a managed firewall placed in firewall subnets (often in a central inspection VPC behind a Transit Gateway), with stateless rules, stateful 5-tuple rules, domain lists and Suricata-compatible signatures.",
    optionExplanations: [
      "Wrong. Security group rules use IPs, CIDRs, prefix lists or security group IDs, never domain names.",
      "Correct. Network Firewall supports FQDN filtering and intrusion prevention in a central inspection design.",
      "Wrong. Network ACLs match only IPs, ports and protocols.",
      "Wrong. WAF cannot be associated with NAT gateways and inspects only HTTP traffic to supported front ends."
    ],
    tags: ["network-firewall", "transit-gateway", "vpc"]
  },
  {
    id: "sec-b-039",
    domain: "secure",
    lessonIds: ["m1-threat-protection", "m3b-api-gateway"],
    difficulty: 2,
    stem: "A public REST API on Amazon API Gateway has a /login resource that bots are hitting with thousands of credential-stuffing requests per minute from rotating IP addresses. The company wants to automatically block any single IP that sends more than 100 requests in 5 minutes. What should a solutions architect do?",
    options: [
      "Associate an AWS WAF web ACL with the API stage and add a rate-based rule scoped to the /login path.",
      "Rely on AWS Shield Standard, which automatically blocks credential stuffing.",
      "Add network ACL deny rules for each offending IP address.",
      "Enable Amazon GuardDuty to block the offending IP addresses."
    ],
    answer: [0],
    explanation: "**Block an IP that exceeds N requests in a time window** describes a **WAF rate-based rule**, which can be scoped down to a URI path. WAF can be associated with API Gateway REST API stages. The AWS Managed Rules account takeover prevention (ATP) rule group can add more protection for login pages.",
    optionExplanations: [
      "Correct. A rate-based rule automatically blocks IPs above the threshold and unblocks them when they fall below it.",
      "Wrong. Shield Standard handles layer 3 and layer 4 DDoS attacks, not application-layer login abuse.",
      "Wrong. API Gateway is not in your VPC subnets, and manually blocking rotating IPs does not scale.",
      "Wrong. GuardDuty detects and reports threats. It does not block requests itself."
    ],
    tags: ["waf", "api-gateway"]
  },
  {
    id: "sec-b-040",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "Because of sanctions rules, a company must block all requests from two countries to an application served directly by an internet-facing ALB. CloudFront is not used. Which solution meets this requirement?",
    options: [
      "Add an ALB listener rule that matches on the client's country.",
      "Associate an AWS WAF web ACL with the ALB, with a geographic match rule that blocks the two countries.",
      "Use a Route 53 geolocation routing policy that has no record for the two countries.",
      "Add security group rules that deny the two countries' IP ranges."
    ],
    answer: [1],
    explanation: "Without CloudFront, **block by country** at the ALB is done with an **AWS WAF geographic match** rule. WAF resolves the source IP to a country and blocks matching requests before they reach the targets.",
    optionExplanations: [
      "Wrong. ALB listener rules match host, path, headers, methods, query strings and source IP, but not country.",
      "Correct. A WAF geo match rule on the ALB blocks requests from the listed countries.",
      "Wrong. Geolocation routing only affects DNS answers. Clients can still reach the ALB directly by its IP or name.",
      "Wrong. Security groups have no deny rules, and listing every IP range for a country would be impractical."
    ],
    tags: ["waf", "alb", "route53"]
  },
  {
    id: "sec-b-041",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 2,
    stem: "When GuardDuty reports that an EC2 instance is communicating with a known command-and-control server, the company wants to isolate the instance automatically within minutes, without human action. Which TWO components should a solutions architect combine? (Choose TWO.)",
    options: [
      "An Amazon Inspector assessment triggered by the finding",
      "An Amazon Macie classification job",
      "An AWS CloudTrail Lake query run on a schedule",
      "An Amazon EventBridge rule that matches GuardDuty findings of that type",
      "An AWS Lambda function that replaces the instance's security groups with an isolation security group that has no rules"
    ],
    answer: [3, 4],
    explanation: "GuardDuty sends every finding to **EventBridge**. A rule that matches the finding type triggers a **Lambda** function (or a Systems Manager Automation runbook) that moves the instance into an isolation security group, so remediation happens automatically.",
    optionExplanations: [
      "Wrong. Inspector scans for vulnerabilities. It does not isolate compromised instances.",
      "Wrong. Macie is for sensitive data in S3.",
      "Wrong. A scheduled query adds delay and takes no action.",
      "Correct. EventBridge is how GuardDuty findings trigger automated responses.",
      "Correct. Swapping in an empty security group cuts off new network connections from the instance while keeping it for forensics."
    ],
    tags: ["guardduty", "eventbridge", "lambda", "security-group"]
  },
  {
    id: "sec-b-042",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 1,
    stem: "Which AWS service automatically protects all AWS customers against common network and transport layer DDoS attacks, such as SYN floods, at no additional cost?",
    options: ["AWS Shield Advanced", "AWS WAF", "AWS Firewall Manager", "AWS Shield Standard"],
    answer: [3],
    explanation: "**Free and automatic** layer 3 and layer 4 DDoS protection is **Shield Standard**. It is always on for every customer, especially at the edge (CloudFront, Route 53, Global Accelerator). Shield Advanced costs about $3,000 per month per organization and adds the SRT, cost protection and advanced detection.",
    optionExplanations: [
      "Wrong. Shield Advanced is a paid subscription.",
      "Wrong. WAF is a paid layer 7 filter that you configure. It is not automatic DDoS protection.",
      "Wrong. Firewall Manager manages policies centrally. It does not mitigate DDoS attacks itself.",
      "Correct. Shield Standard is included for all customers at no charge."
    ],
    tags: ["shield"]
  },
  {
    id: "sec-b-043",
    domain: "secure",
    lessonIds: ["m1-ref-3tier"],
    difficulty: 2,
    stem: "A company is moving a web application with a web tier, an application tier and a MySQL database to AWS. The design must be highly available across Availability Zones, expose only the load balancer to the internet, and follow least-privilege network access. Which architecture is MOST secure and highly available?",
    options: [
      "Put every tier in public subnets in one AZ and restrict access with security groups.",
      "An ALB in public subnets in two AZs, EC2 instances in an Auto Scaling group in private subnets in two AZs, and RDS Multi-AZ in private database subnets, with security groups chained from tier to tier.",
      "An ALB in public subnets, EC2 instances in public subnets with Elastic IPs, and RDS in a private subnet.",
      "A Network Load Balancer and all tiers in private subnets in a single AZ."
    ],
    answer: [1],
    explanation: "This is the **secure 3-tier reference design**: only the ALB is in **public subnets**, the app and database tiers are in **private subnets** across **at least two AZs**, RDS is **Multi-AZ**, and security groups reference each other (ALB SG to app SG to DB SG).",
    optionExplanations: [
      "Wrong. One AZ is a single point of failure, and putting the app and database tiers in public subnets exposes them more than needed.",
      "Correct. This is multi-AZ at every tier with only the load balancer facing the internet.",
      "Wrong. Instances with Elastic IPs in public subnets can be reached directly, bypassing the ALB.",
      "Wrong. A single AZ is not highly available, and an internet-facing load balancer must be in public subnets."
    ],
    tags: ["alb", "auto-scaling", "rds-multi-az", "security-group", "subnet"]
  },
  {
    id: "sec-b-044",
    domain: "secure",
    lessonIds: ["m1-ref-3tier", "m1-subnets-routing"],
    difficulty: 3,
    stem: "In a three-tier VPC, the application tier uses a NAT gateway to download updates. A new audit rule states that the database tier, an Amazon RDS for PostgreSQL Multi-AZ instance, must have no network path to or from the internet in either direction, while still receiving engine patches. What should a solutions architect do?",
    options: [
      "Set the RDS instance to publicly accessible and restrict its security group to the application tier.",
      "Keep the database in private subnets whose route table has a 0.0.0.0/0 route to the NAT gateway so that patches can download.",
      "Move the database to public subnets and block inbound traffic with network ACLs.",
      "Place the database in subnets whose route table has only the local VPC route, and allow TCP 5432 only from the application tier's security group."
    ],
    answer: [3],
    explanation: "**No path to the internet in either direction** means **isolated subnets** whose route table has only the local route. RDS engine patching is managed by AWS through the service, so the database does not need NAT. The security group then allows only the application tier on 5432.",
    optionExplanations: [
      "Wrong. Publicly accessible gives the database a public DNS name and IP, which contradicts the audit rule.",
      "Wrong. A NAT route is an outbound internet path, and RDS does not need it for patching.",
      "Wrong. Public subnets have an internet gateway route, so a path to the internet exists.",
      "Correct. An isolated route table plus security group chaining meets the rule, and RDS keeps receiving managed patches."
    ],
    tags: ["rds", "route-table", "subnet", "security-group"]
  },
  {
    id: "sec-b-045",
    domain: "secure",
    lessonIds: ["m1-ref-3tier"],
    difficulty: 2,
    stem: "A public website runs on EC2 instances in private subnets. The company needs HTTPS for its custom domain with certificates that renew automatically, and protection against common web exploits, with the LEAST operational overhead. What should a solutions architect do?",
    options: [
      "Use an ALB with an HTTPS listener and a public certificate from AWS Certificate Manager, and associate an AWS WAF web ACL with the ALB.",
      "Use a Network Load Balancer with a TLS listener and associate an AWS WAF web ACL with it.",
      "Use an ALB with a certificate from a third-party CA uploaded to IAM, and renew it manually every year.",
      "Install certificates on each EC2 instance with a cron job that renews them."
    ],
    answer: [0],
    explanation: "**Auto-renewing certificates** point to **ACM** public certificates, which are free and renew automatically when attached to integrated services such as an ALB. **Web exploits** point to **WAF**, which attaches to an ALB but not to an NLB.",
    optionExplanations: [
      "Correct. ACM handles certificates with no effort, the ALB terminates TLS, and WAF filters layer 7 attacks.",
      "Wrong. AWS WAF cannot be associated with a Network Load Balancer.",
      "Wrong. Manual renewal adds work and the risk of an expired certificate.",
      "Wrong. Managing certificates on every instance is the most work and adds no WAF protection."
    ],
    tags: ["alb", "acm", "waf", "ec2"]
  },
  {
    id: "sec-b-046",
    domain: "secure",
    lessonIds: ["m1-ref-3tier", "m3b-cloudfront"],
    difficulty: 3,
    stem: "A company serves its application through CloudFront with an internet-facing ALB as the origin and an AWS WAF web ACL on the distribution. Attackers have discovered the ALB's DNS name and are bypassing CloudFront and WAF. The company must allow only traffic that comes through its own distribution, with the LEAST operational overhead. What should a solutions architect do?",
    options: [
      "Add network ACL rules on the ALB subnets that allow each CloudFront edge IP range.",
      "Leave the ALB security group open to 0.0.0.0/0, because the WAF on CloudFront already protects the origin.",
      "Allow inbound HTTPS on the ALB security group only from the CloudFront origin-facing managed prefix list, and have CloudFront add a secret custom header that an ALB listener rule requires.",
      "Create a Route 53 private hosted zone for the ALB's DNS name."
    ],
    answer: [2],
    explanation: "The **CloudFront origin-facing managed prefix list** (com.amazonaws.global.cloudfront.origin-facing) restricts the ALB to CloudFront IPs, and AWS keeps it up to date. Because other customers' distributions use the same IPs, a **secret custom header** checked by a listener rule (or WAF) proves the request came from **your** distribution. CloudFront VPC origins, which let the ALB sit in a private subnet, is another option.",
    optionExplanations: [
      "Wrong. Network ACLs allow only a limited number of rules, CloudFront has many IP ranges, and the ranges change.",
      "Wrong. That is exactly what lets attackers bypass CloudFront and WAF.",
      "Correct. The prefix list limits traffic to CloudFront, and the custom header limits it to your distribution, both with no manual IP upkeep.",
      "Wrong. A private hosted zone changes DNS resolution only inside VPCs. The public ALB name still resolves and accepts traffic."
    ],
    tags: ["cloudfront", "alb", "security-group", "waf"]
  },
  {
    id: "sec-b-047",
    domain: "secure",
    lessonIds: ["m1-ref-3tier"],
    difficulty: 2,
    stem: "The application tier of a three-tier app connects to an Amazon RDS database. The database password is currently in a configuration file baked into the AMI. Security requires that the password is never stored on the instances and is rotated automatically every 30 days. What should a solutions architect do?",
    options: [
      "Store the password in the EC2 user data script and rotate it by redeploying.",
      "Store the password in AWS Secrets Manager with automatic rotation, and give the instances' IAM role permission to retrieve it at runtime.",
      "Store the password in an encrypted S3 object and download it at boot.",
      "Keep the password in the AMI but encrypt the EBS root volume with KMS."
    ],
    answer: [1],
    explanation: "**Automatic rotation** of **database credentials** points to **AWS Secrets Manager**, which has built-in rotation for RDS. The app calls GetSecretValue using its **instance role**, so no secret is stored on disk or in the AMI.",
    optionExplanations: [
      "Wrong. Anyone who can view the instance attributes can read user data, and it gives no automatic rotation.",
      "Correct. Secrets Manager stores and rotates the secret, and access is controlled through the IAM role.",
      "Wrong. This leaves a copy of the password on the instance and gives no automatic rotation.",
      "Wrong. Encryption at rest does not stop the password from being in the image, and it is still never rotated."
    ],
    tags: ["secrets-manager", "rds", "iam-role", "ec2"]
  },
  {
    id: "sec-b-048",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 2,
    stem: "A company serves a single-page application from an Amazon S3 bucket through CloudFront. Users must not be able to bypass CloudFront and fetch objects from the bucket directly, and the bucket must keep Block Public Access enabled. Which TWO steps should a solutions architect take? (Choose TWO.)",
    options: [
      "Create an origin access control (OAC) and attach it to the distribution's S3 REST API origin.",
      "Enable S3 static website hosting and make the bucket publicly readable.",
      "Add a bucket policy that allows requests only when the Referer header matches the site's domain.",
      "Add a bucket policy that allows s3:GetObject to the cloudfront.amazonaws.com service principal, with an aws:SourceArn condition set to the distribution's ARN.",
      "Configure an origin access identity (OAI) on the bucket's S3 website endpoint origin."
    ],
    answer: [0, 3],
    explanation: "**Origin access control (OAC)** is the current way to keep an S3 origin private. CloudFront signs its requests with SigV4, and the bucket policy allows only the CloudFront service principal for that specific distribution through **aws:SourceArn**. OAC (and the legacy OAI) works with the S3 REST endpoint, not with the website endpoint.",
    optionExplanations: [
      "Correct. OAC lets CloudFront authenticate to a private bucket.",
      "Wrong. Making the bucket public breaks the Block Public Access requirement and lets users bypass CloudFront.",
      "Wrong. The Referer header is easy to fake and requires public access to the bucket.",
      "Correct. This bucket policy grants read access only to your distribution.",
      "Wrong. OAI is the legacy option, and neither OAI nor OAC works with S3 website endpoints."
    ],
    tags: ["cloudfront", "s3"]
  },
  {
    id: "sec-b-049",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 2,
    stem: "A streaming service delivers HLS video through CloudFront. Each movie is made of thousands of segment files, and only logged-in subscribers may watch. The player is a web app, and the company does not want to rewrite every segment URL. What should a solutions architect use?",
    options: [
      "CloudFront signed URLs for each segment file",
      "CloudFront signed cookies issued after login",
      "S3 presigned URLs for each segment",
      "CloudFront geographic restrictions"
    ],
    answer: [1],
    explanation: "**Many files** and **do not change the URLs** point to **signed cookies**. One set of cookies, signed with a key in a trusted key group, grants access to every path that matches the policy (for example /movies/123/*). Signed URLs are better for single files or clients that cannot handle cookies.",
    optionExplanations: [
      "Wrong. This works, but it means generating and rewriting a signed URL for every segment, which the company wants to avoid.",
      "Correct. Signed cookies cover many files with one credential and leave the URLs unchanged.",
      "Wrong. S3 presigned URLs bypass CloudFront caching and would still have to be generated for each segment.",
      "Wrong. Geographic restrictions filter by country, not by subscriber."
    ],
    tags: ["cloudfront"]
  },
  {
    id: "sec-b-050",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 2,
    stem: "A software vendor distributes a licensed installer through CloudFront. Each paying customer must get a download link that works for 24 hours, and the vendor's command-line download tool cannot store or send cookies. What should a solutions architect implement?",
    options: [
      "CloudFront signed cookies issued after purchase",
      "An origin access control on the S3 origin, with no other change",
      "An AWS WAF IP set that allows only customer IP addresses",
      "CloudFront signed URLs with a 24-hour expiry, signed with a key in a trusted key group"
    ],
    answer: [3],
    explanation: "**One file**, **a time-limited link** and **clients that cannot use cookies** all point to **CloudFront signed URLs**. The backend signs a URL with a private key whose public key is in a trusted key group on the distribution, and the policy sets an expiry such as 24 hours.",
    optionExplanations: [
      "Wrong. The download tool cannot handle cookies.",
      "Wrong. OAC stops direct S3 access, but anyone with the CloudFront URL could still download the file.",
      "Wrong. Customer IPs change and are not known in advance, so this would block paying customers or let others in.",
      "Correct. Signed URLs give access to one object for a limited time without cookies."
    ],
    tags: ["cloudfront", "s3"]
  },
  {
    id: "sec-b-051",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 3,
    stem: "An e-commerce checkout form posts credit card numbers through CloudFront to an origin made up of several microservices. HTTPS is used end to end, but compliance requires that only the payment service can read the card number, even though logging, analytics and other services in the request path see the rest of the request. What should a solutions architect use?",
    options: [
      "CloudFront field-level encryption with a public key for the card number field, with the payment service holding the private key.",
      "HTTPS between viewers and CloudFront and between CloudFront and the origin.",
      "SSE-KMS encryption on the origin's database.",
      "A Lambda@Edge function that hashes the card number before forwarding."
    ],
    answer: [0],
    explanation: "**Only one specific service can read one specific field** describes **field-level encryption**. CloudFront encrypts the chosen POST fields at the edge with a public key you provide, the fields stay encrypted through the whole application stack, and only the service with the matching private key can decrypt them.",
    optionExplanations: [
      "Correct. Field-level encryption protects specific fields beyond TLS, all the way to the authorized service.",
      "Wrong. TLS ends at each hop, so every service in the path could still read the card number.",
      "Wrong. Encryption at rest does not protect data while it moves between services.",
      "Wrong. A hash cannot be reversed, so the payment service could not recover the card number to charge it."
    ],
    tags: ["cloudfront"]
  },
  {
    id: "sec-b-052",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 1,
    stem: "A media company's licensing agreement forbids streaming its content in three specific countries. All content is delivered through Amazon CloudFront. What is the SIMPLEST way to block viewers in those countries?",
    options: [
      "A Route 53 geolocation routing policy",
      "Network ACL rules on the origin subnets",
      "CloudFront geographic restrictions with a block list of the three countries",
      "A Lambda@Edge function that looks up each viewer's IP address"
    ],
    answer: [2],
    explanation: "CloudFront has **built-in geographic restrictions** (allow list or block list by country). Viewers in blocked countries get HTTP 403 at the edge. Use WAF geo match instead if you need finer rules, such as combining country with other conditions.",
    optionExplanations: [
      "Wrong. Geolocation routing changes DNS answers and does not stop requests made directly to CloudFront.",
      "Wrong. Requests reach the origin from CloudFront edge IPs, not viewer IPs, so origin network ACLs cannot filter by viewer country.",
      "Correct. A geo restriction block list is a built-in setting with no code.",
      "Wrong. This works, but custom code is more effort than the built-in feature."
    ],
    tags: ["cloudfront", "route53"]
  },
  {
    id: "sec-b-053",
    domain: "secure",
    lessonIds: ["m3b-cloudfront"],
    difficulty: 2,
    stem: "A company runs its application in eu-west-1 behind an ALB and is adding a CloudFront distribution with the custom domain www.example.com. It wants to use a free certificate from AWS Certificate Manager on the distribution. Where must the ACM certificate be requested?",
    options: [
      "In eu-west-1, the same Region as the origin",
      "In us-east-1 (N. Virginia)",
      "In any Region, because CloudFront copies certificates automatically",
      "Only in IAM, because CloudFront does not support ACM"
    ],
    answer: [1],
    explanation: "CloudFront is a **global** service that reads certificates only from ACM in **us-east-1**. A certificate for the ALB origin itself must be in the ALB's Region (eu-west-1), so a setup like this often uses two certificates.",
    optionExplanations: [
      "Wrong. An eu-west-1 certificate can be used on the ALB, but not on the CloudFront distribution.",
      "Correct. CloudFront viewer certificates from ACM must be in us-east-1.",
      "Wrong. ACM certificates are regional, and CloudFront does not copy them between Regions.",
      "Wrong. CloudFront supports ACM, and ACM is the recommended choice."
    ],
    tags: ["cloudfront", "acm", "alb"]
  },
  {
    id: "sec-b-054",
    domain: "secure",
    lessonIds: ["m3b-api-gateway"],
    difficulty: 2,
    stem: "A mobile app's users sign up and sign in with email and password, or with Google. The REST API on API Gateway must accept only requests from signed-in users and must validate their JSON Web Tokens without any custom code. What should a solutions architect configure?",
    options: [
      "IAM authorization, with each user signing requests with SigV4",
      "API keys distributed in the mobile app",
      "A resource policy that allows only the mobile carriers' IP ranges",
      "An Amazon Cognito user pool, with a Cognito user pool authorizer on the API methods"
    ],
    answer: [3],
    explanation: "**User sign-up and sign-in (including social logins) plus JWT validation without code** means a **Cognito user pool authorizer**. API Gateway checks the token's signature, expiry and audience natively, and no Lambda function is needed.",
    optionExplanations: [
      "Wrong. SigV4 requires AWS credentials for every user, which does not suit a sign-in with email or Google.",
      "Wrong. API keys are for metering and throttling, and a key embedded in an app is not user authentication.",
      "Wrong. Carrier IP ranges do not identify users and change often.",
      "Correct. A Cognito user pool handles users and federation, and the authorizer validates JWTs natively."
    ],
    tags: ["api-gateway", "cognito"]
  },
  {
    id: "sec-b-055",
    domain: "secure",
    lessonIds: ["m3b-api-gateway", "m1-private-connectivity"],
    difficulty: 3,
    stem: "An internal REST API on Amazon API Gateway must be reachable only from workloads in one specific VPC and must never be reachable from the internet. Which TWO actions should a solutions architect take? (Choose TWO.)",
    options: [
      "Deploy the API as an edge-optimized endpoint and attach an AWS WAF web ACL that allows only the VPC's CIDR.",
      "Deploy the API as a private endpoint type, with a resource policy that allows execute-api:Invoke only when aws:SourceVpce equals the VPC's endpoint ID.",
      "Create a gateway VPC endpoint for API Gateway in the VPC.",
      "Route API calls from the VPC through a NAT gateway.",
      "Create an interface VPC endpoint for execute-api in the VPC."
    ],
    answer: [1, 4],
    explanation: "A **private API** can be invoked only through an **interface VPC endpoint for execute-api**, and it requires a **resource policy**, which uses aws:SourceVpce (or aws:SourceVpc) to say which endpoints or VPCs may call it. Nothing about it is exposed to the internet.",
    optionExplanations: [
      "Wrong. An edge-optimized API is public, and requests arriving through CloudFront do not carry the VPC's private CIDR.",
      "Correct. The private endpoint type plus a resource policy limits invocation to the chosen endpoint.",
      "Wrong. Gateway endpoints exist only for S3 and DynamoDB.",
      "Wrong. NAT sends traffic to public endpoints, and a private API cannot be reached that way.",
      "Correct. The execute-api interface endpoint is the network path a private API requires."
    ],
    tags: ["api-gateway", "interface-endpoint", "privatelink"]
  },
  {
    id: "sec-b-056",
    domain: "secure",
    lessonIds: ["m3b-api-gateway"],
    difficulty: 2,
    stem: "A company is exposing legacy services through API Gateway. Clients already send a bearer token issued by the company's in-house identity system, which is neither OIDC-compliant nor SAML-based, and access decisions depend on the token plus a custom tenant header. Which authorization option should a solutions architect use?",
    options: [
      "An Amazon Cognito user pool authorizer",
      "IAM authorization with SigV4",
      "A Lambda authorizer that validates the token and header and returns an IAM policy",
      "A usage plan with API keys"
    ],
    answer: [2],
    explanation: "**Custom or third-party tokens** and **custom logic on headers** point to a **Lambda authorizer** (formerly called a custom authorizer). The function validates the token against the in-house system and returns an IAM policy, which API Gateway can cache for a TTL.",
    optionExplanations: [
      "Wrong. A Cognito authorizer accepts only tokens issued by a Cognito user pool.",
      "Wrong. IAM authorization requires AWS credentials and SigV4 signatures, not in-house bearer tokens.",
      "Correct. A Lambda authorizer can apply any custom validation logic and return an allow or deny policy.",
      "Wrong. API keys identify and throttle clients. They are not an authorization mechanism."
    ],
    tags: ["api-gateway", "lambda"]
  },
  {
    id: "sec-b-057",
    domain: "secure",
    lessonIds: ["m3b-api-gateway"],
    difficulty: 2,
    stem: "Backend services in another AWS account run on ECS tasks with IAM task roles and must call a REST API in the company's account. The company wants to authenticate these callers with their existing AWS identities and avoid distributing any long-lived secrets. What should a solutions architect do?",
    options: [
      "Issue an API key to the other account and require it on every method.",
      "Create Cognito user pool accounts for each service.",
      "Use a Lambda authorizer that checks a shared secret header.",
      "Enable IAM authorization on the methods, have callers sign requests with SigV4, and add a resource policy that allows the other account's task roles."
    ],
    answer: [3],
    explanation: "**Callers that are AWS principals** (roles in the same or another account) point to **IAM authorization**. Requests are signed with SigV4 using temporary role credentials, and for cross-account access the API's **resource policy** must also allow those principals.",
    optionExplanations: [
      "Wrong. An API key is a long-lived shared value and is not real authentication.",
      "Wrong. Cognito user pools are for application users, not service-to-service calls between AWS roles.",
      "Wrong. A shared secret is a long-lived credential the company wants to avoid.",
      "Correct. SigV4 with role credentials plus a cross-account resource policy uses existing identities with no stored secrets."
    ],
    tags: ["api-gateway", "iam-role", "iam-policy", "ecs"]
  },
  {
    id: "sec-b-058",
    domain: "secure",
    lessonIds: ["m3b-api-gateway"],
    difficulty: 1,
    stem: "A developer plans to protect a REST API on API Gateway using only API keys. Which statement about API keys and usage plans is accurate?",
    options: [
      "Usage plans with API keys meter and throttle clients, but API keys should not be the only authorization for an API.",
      "API keys are a strong authentication mechanism, equivalent to IAM authorization.",
      "API keys encrypt the request payload between the client and API Gateway.",
      "Usage plans and API keys are available for both REST APIs and HTTP APIs."
    ],
    answer: [0],
    explanation: "**API keys plus usage plans** are for **quotas, throttling and metering** of clients, for example separate tiers for paying customers. AWS says not to rely on them for authentication or authorization. Use IAM, Cognito or a Lambda authorizer instead. Usage plans are a REST API feature.",
    optionExplanations: [
      "Correct. API keys identify clients for usage plans but are not a security control on their own.",
      "Wrong. API keys are static strings that are easily shared or leaked.",
      "Wrong. TLS encrypts traffic in transit. API keys do not encrypt anything.",
      "Wrong. HTTP APIs do not support usage plans or API keys."
    ],
    tags: ["api-gateway"]
  },
  {
    id: "sec-b-059",
    domain: "secure",
    lessonIds: ["m3b-api-gateway", "m1-threat-protection"],
    difficulty: 3,
    stem: "A public REST API (regional endpoint) is used only by partners who call from fixed corporate IP ranges. The security team also sees SQL injection probes in the request bodies. The company wants a single managed control that enforces both requirements with the LEAST operational overhead. What should a solutions architect do?",
    options: [
      "Attach a security group to the API Gateway stage that allows only the partner IP ranges.",
      "Associate an AWS WAF web ACL with the API stage, with an IP set rule that allows only partner ranges and the SQL injection managed rule group.",
      "Subscribe to AWS Shield Advanced for the API.",
      "Deploy AWS Network Firewall in a VPC in front of the API."
    ],
    answer: [1],
    explanation: "One **web ACL** can do both jobs: an **IP set** match limits callers to the partners, and the **SQL injection managed rule group** inspects request bodies. WAF associates directly with REST API stages. A resource policy with aws:SourceIp could also enforce the IP ranges, but it cannot inspect for SQL injection.",
    optionExplanations: [
      "Wrong. Public API Gateway endpoints do not use security groups.",
      "Correct. One managed WAF web ACL enforces the IP allow list and the layer 7 SQL injection protection.",
      "Wrong. Shield Advanced is for DDoS protection and does not restrict callers or block SQL injection by itself.",
      "Wrong. A public API endpoint is not in your VPC, so Network Firewall cannot sit in front of it."
    ],
    tags: ["api-gateway", "waf"]
  },
  {
    id: "sec-b-060",
    domain: "secure",
    lessonIds: ["m1-threat-protection"],
    difficulty: 3,
    stem: "A mobile app lets users upload photos of up to 50 MB directly to an Amazon S3 bucket so that uploads do not pass through the company's servers. No long-term AWS credentials may be embedded in the app, and users must not be able to write to each other's prefixes. Which TWO approaches meet these requirements? (Choose TWO.)",
    options: [
      "Embed an IAM user's access keys in the app with s3:PutObject permission.",
      "Make the bucket publicly writable and rename uploaded objects with a Lambda function.",
      "Have a backend API generate short-lived S3 presigned PUT URLs for the user's own prefix.",
      "Use an Amazon Cognito identity pool to give each signed-in user temporary credentials scoped to a prefix containing their identity ID.",
      "Grant write access in a bucket ACL to the Authenticated Users group."
    ],
    answer: [2, 3],
    explanation: "Secure **direct-to-S3 ingestion** uses **temporary, scoped access**. A **presigned URL** allows one specific PUT to one key for a limited time. A **Cognito identity pool** issues temporary STS credentials, and its IAM policy can use the ${cognito-identity.amazonaws.com:sub} variable to restrict each user to their own prefix.",
    optionExplanations: [
      "Wrong. Embedded long-term keys can be extracted from the app and shared by every user.",
      "Wrong. A publicly writable bucket lets anyone upload anything.",
      "Correct. Presigned URLs are short-lived and limited to a single object key.",
      "Correct. Identity pool credentials are temporary, and policy variables keep each user in their own prefix.",
      "Wrong. Authenticated Users means any AWS account, not your app's users, and ACLs are disabled by default."
    ],
    tags: ["s3", "cognito", "sts"]
  },
  {
    id: "sec-b-061",
    domain: "secure",
    lessonIds: ["m1-private-connectivity", "m1-threat-protection"],
    difficulty: 3,
    stem: "On-premises sensors send telemetry to Amazon Kinesis Data Streams over an existing Direct Connect private VIF to a VPC. Security requires that the data never crosses the internet and that the stream rejects any PutRecords call that does not arrive through the company's private network path. What should a solutions architect do?",
    options: [
      "Create a gateway VPC endpoint for Kinesis Data Streams and route the sensors to it.",
      "Send the data to the public Kinesis endpoints over the internet with TLS and restrict the stream with aws:SourceIp.",
      "Route the sensor traffic through a NAT gateway in the VPC.",
      "Create an interface VPC endpoint for Kinesis Data Streams, have sensors use its DNS name over Direct Connect, and add a policy that denies kinesis:PutRecords unless aws:SourceVpce matches the endpoint."
    ],
    answer: [3],
    explanation: "**Private ingestion from on-premises** to an AWS service uses an **interface endpoint** reached over Direct Connect or VPN. An IAM or resource-based policy with an **aws:SourceVpce** condition makes the stream reject calls that bypass the endpoint.",
    optionExplanations: [
      "Wrong. Gateway endpoints exist only for S3 and DynamoDB and cannot be reached from on-premises.",
      "Wrong. Data would cross the internet, which the requirement forbids.",
      "Wrong. NAT sends traffic to public endpoints, and on-premises traffic cannot use a NAT gateway this way.",
      "Correct. A PrivateLink endpoint over Direct Connect keeps the data private, and aws:SourceVpce enforces the path."
    ],
    tags: ["kinesis-data-streams", "interface-endpoint", "direct-connect"]
  },
  {
    id: "sec-b-062",
    domain: "secure",
    lessonIds: ["m5-networking", "m1-sg-nacl"],
    difficulty: 2,
    stem: "Fifty external partners must upload files by SFTP into Amazon S3. Only the partners' known static IP ranges may connect, and the company wants a fully managed service with no servers to patch. What should a solutions architect do?",
    options: [
      "Run an SFTP server on EC2 in a public subnet and restrict it with a security group.",
      "Use AWS DataSync agents at each partner site.",
      "Create an AWS Transfer Family SFTP server with a VPC-hosted, internet-facing endpoint using Elastic IPs, and restrict its security group to the partner IP ranges.",
      "Give partners write access to a public S3 bucket over HTTPS."
    ],
    answer: [2],
    explanation: "**Managed SFTP into S3** means **AWS Transfer Family**. Choosing the **VPC endpoint type** with Elastic IPs lets you attach a **security group** that allow-lists partner CIDRs, which the public endpoint type cannot do.",
    optionExplanations: [
      "Wrong. This works, but it is a server you must patch, scale and make highly available.",
      "Wrong. DataSync needs agents installed at partner sites and does not offer partners an SFTP endpoint.",
      "Correct. A managed SFTP endpoint with security group allow-listing meets every requirement.",
      "Wrong. A public writable bucket is insecure and is not SFTP."
    ],
    tags: ["transfer-family", "s3", "security-group", "elastic-ip"]
  },
  {
    id: "sec-b-063",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m5-networking"],
    difficulty: 1,
    stem: "A security analyst enables VPC Flow Logs on a VPC. What information do the flow log records contain?",
    options: [
      "The full packet payloads for each connection",
      "The contents of DNS queries made by instances",
      "Metadata about IP traffic, such as source and destination IPs, ports, protocol, bytes, and whether the traffic was ACCEPTed or REJECTed",
      "HTTP headers and URLs of web requests"
    ],
    answer: [2],
    explanation: "VPC Flow Logs capture **metadata, not content**: for each flow, the 5-tuple, packet and byte counts, and the **ACCEPT or REJECT** result from security groups and network ACLs. They can be published to CloudWatch Logs, S3 or Amazon Data Firehose. For full packets, use VPC Traffic Mirroring.",
    optionExplanations: [
      "Wrong. Flow logs never include payloads. Traffic Mirroring copies packets.",
      "Wrong. DNS queries are captured by Route 53 Resolver query logging.",
      "Correct. Flow logs record IP traffic metadata and the accept or reject action.",
      "Wrong. Layer 7 details come from ALB access logs or WAF logs."
    ],
    tags: ["vpc-flow-logs"]
  },
  {
    id: "sec-b-064",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m5-networking"],
    difficulty: 2,
    stem: "A company must keep VPC Flow Logs for every VPC for one year for audits and occasionally run SQL queries to investigate rejected traffic. It wants the MOST cost-effective solution. Which TWO steps should a solutions architect take? (Choose TWO.)",
    options: [
      "Publish the flow logs to Amazon S3 in Parquet format.",
      "Publish the flow logs to CloudWatch Logs with one-year retention and query them with Logs Insights.",
      "Stream the flow logs into Amazon Kinesis Data Streams.",
      "Enable Amazon Inspector to store and analyze the flow logs.",
      "Query the flow logs in S3 with Amazon Athena when needed."
    ],
    answer: [0, 4],
    explanation: "**Long retention plus occasional SQL** at **lowest cost** means flow logs **to S3** (Parquet is cheaper to scan) queried with **Athena**, which bills only per TB scanned. CloudWatch Logs works, but ingesting and storing a year of logs there costs much more than S3.",
    optionExplanations: [
      "Correct. S3 is the cheapest durable store for flow logs, and Parquet reduces Athena scan costs.",
      "Wrong. This works, but CloudWatch Logs ingestion and storage for a year cost much more than S3.",
      "Wrong. Kinesis Data Streams is for real-time processing, not a cheap archive, and flow logs do not publish to it directly.",
      "Wrong. Inspector scans for vulnerabilities and does not store or query flow logs.",
      "Correct. Athena runs serverless, pay-per-query SQL directly on the logs in S3."
    ],
    tags: ["vpc-flow-logs", "s3", "athena"]
  },
  {
    id: "sec-b-065",
    domain: "secure",
    lessonIds: ["m1-sg-nacl", "m5-networking"],
    difficulty: 3,
    stem: "Clients report that an API on EC2 times out. VPC Flow Logs for the instance's ENI show an inbound record from the client to port 443 marked ACCEPT, followed by an outbound record from port 443 to the client's port 51544 marked REJECT. The instance's security group allows inbound 443 and has no outbound rules. What is the MOST likely cause?",
    options: [
      "The subnet's network ACL has no outbound rule that allows TCP 1024-65535 to the clients.",
      "The security group has no outbound rule, so the response is blocked.",
      "The subnet's route table is missing a route to the internet gateway.",
      "The operating system firewall on the instance is dropping the response."
    ],
    answer: [0],
    explanation: "An **inbound ACCEPT followed by an outbound REJECT** on the same flow points to a **stateless network ACL**. Security groups are stateful, so if a security group had allowed the request, the response would be allowed automatically. The reply goes to ephemeral port 51544, and the network ACL must allow it outbound.",
    optionExplanations: [
      "Correct. A network ACL without outbound ephemeral ports produces exactly this ACCEPT then REJECT pattern.",
      "Wrong. Security groups track connections and always allow return traffic for permitted inbound requests.",
      "Wrong. A missing route would not show up as a REJECT record. REJECT comes from security group or network ACL decisions.",
      "Wrong. Flow logs record AWS-level security group and network ACL decisions. A guest OS firewall drop would not appear as REJECT."
    ],
    tags: ["vpc-flow-logs", "nacl", "security-group"]
  },
] satisfies Question[];
