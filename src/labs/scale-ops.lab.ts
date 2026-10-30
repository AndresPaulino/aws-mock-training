import type { Lab } from './index';
import type { AutoScalingGroup, CloudState } from '../cloud/types';

const azCount = (c: CloudState, subnetIds: string[]) => new Set(subnetIds.map((s) => c.subnets.find((x) => x.id === s)?.az)).size;
const tgExists = (c: CloudState, id: string) => c.targetGroups.some((t) => t.id === id);
const goodAlbs = (c: CloudState) => c.loadBalancers.filter((lb) => lb.type === 'application' && lb.scheme === 'internet-facing' && azCount(c, lb.subnetIds) >= 2 && lb.listeners.some((l) => tgExists(c, l.targetGroupId)));
const goodAlb = (c: CloudState) => goodAlbs(c).length > 0;
const albTgs = (c: CloudState) => goodAlbs(c).flatMap((lb) => lb.listeners.map((l) => l.targetGroupId));
const attachedAsg = (c: CloudState, a: AutoScalingGroup) => azCount(c, a.subnetIds) >= 2 && a.targetGroupIds.some((t) => albTgs(c).includes(t)) && a.healthCheck === 'ELB';
const cpuTT = (a: AutoScalingGroup) => a.policies.some((p) => p.type === 'target-tracking' && p.metric === 'cpu');
const running = (c: CloudState, a: AutoScalingGroup) => c.instances.filter((i) => i.asgId === a.id && i.state === 'running').length;
const isCpuAlarm = (c: CloudState) => c.alarms.filter((a) => a.metric === 'CPUUtilization' && (c.instances.some((i) => i.id === a.resourceId) || c.asgs.some((g) => g.id === a.resourceId)));

const labs: Lab[] = [
  {
    id: 'lab-alb-asg',
    title: 'Highly available web tier: ALB + Auto Scaling',
    lessonId: 'm2-auto-scaling',
    minutes: 25,
    start: '/console/ec2/launch-templates',
    intro: 'Build the classic exam architecture: an internet-facing Application Load Balancer across two AZs in front of an Auto Scaling group that heals itself and scales on CPU. Then push load and watch it scale out.',
    steps: [
      {
        title: 'Create a launch template',
        detail: 'In **EC2 → Launch templates**, choose **Create launch template**. Pick **Amazon Linux 2023**, instance type **t3.micro**, and keep the sample user data that installs a web server.',
        hint: 'Name it something like `web-template`. Security groups are optional for this lab.',
        check: (c) => c.launchTemplates.some((l) => l.region === c.region),
      },
      {
        title: 'Create a target group',
        detail: 'In **EC2 → Target groups**, choose **Create target group**: target type **Instances**, protocol **HTTP**, port **80**, the default VPC, health check path `/`. You don\'t need to register targets: the Auto Scaling group will.',
        hint: 'Name it `web-tg`. HTTP target groups are what an ALB forwards to.',
        check: (c) => c.targetGroups.some((t) => t.protocol !== 'TCP'),
      },
      {
        title: 'Create an internet-facing ALB in 2+ AZs',
        detail: 'In **EC2 → Load balancers → Create load balancer**, pick **Application Load Balancer**. Scheme **Internet-facing**, select at least **two Availability Zones** with public subnets, and add an **HTTP:80** listener that forwards to your target group.',
        hint: 'The default VPC\'s subnets are all public (their route table has 0.0.0.0/0 → igw). Tick two AZs, then pick the target group in the listener\'s "Forward to" box.',
        check: goodAlb,
      },
      {
        title: 'Create an Auto Scaling group across 2+ AZs, attached to the target group',
        detail: 'In **EC2 → Auto Scaling groups → Create Auto Scaling group**, choose your launch template, select subnets in **at least two AZs**, attach the **target group your ALB forwards to**, and tick **Turn on Elastic Load Balancing health checks**.',
        hint: 'Desired 1, min 1, max 4 works well. ELB health checks need the target group to be attached.',
        check: (c) => c.asgs.some((a) => attachedAsg(c, a)),
      },
      {
        title: 'Add a CPU target-tracking policy',
        detail: 'Give that group a **target tracking** policy on **Average CPU utilization** (e.g. target 50%). Choose it in the wizard\'s step 4, or later on the group\'s **Automatic scaling** tab.',
        hint: 'Automatic scaling tab → Create scaling policy → Target tracking scaling → Average CPU utilization, 50.',
        check: (c) => c.asgs.some((a) => attachedAsg(c, a) && cpuTT(a)),
      },
      {
        title: 'Push load until it scales out',
        detail: 'Open the group and drag the **Load simulator** slider up (try 80–100%). Watch **Activity** and **Instance management**: the policy should raise desired capacity and launch more instances in both AZs.',
        hint: 'Wait for the first instance to be running, then raise the load. Each scale-out step takes a tick or two (2 s each). Done when more instances are running than the minimum.',
        check: (c) => c.asgs.some((a) => attachedAsg(c, a) && cpuTT(a) && running(c, a) > a.min),
      },
    ],
    debrief: 'You built the exam\'s default answer for "highly available and scalable web application": ALB across multiple AZs + Auto Scaling group across the same AZs with ELB health checks. Target tracking is the right policy for "keep CPU around X%"; ELB health checks make the group replace instances whose app is broken, not just dead VMs; and spreading across AZs means an AZ outage only removes capacity that the group then relaunches elsewhere.',
  },
  {
    id: 'lab-cloudwatch',
    title: 'CloudWatch alarms and log retention',
    lessonId: 'm5-governance',
    minutes: 12,
    start: '/console/cloudwatch',
    intro: 'Alarm on CPU and send a notification through SNS, then stop a log group from keeping data (and charging for it) forever.',
    steps: [
      {
        title: 'Have something to monitor',
        detail: 'You need a running EC2 instance or an Auto Scaling group. Launch an instance in **EC2 → Instances**, or reuse the group from the ALB + Auto Scaling lab.',
        hint: 'Any instance in the running state works, or any Auto Scaling group.',
        check: (c) => c.instances.some((i) => i.state === 'running') || c.asgs.length > 0,
      },
      {
        title: 'Create a CPU alarm',
        detail: 'In **CloudWatch → Alarms → Create alarm**, pick the **CPUUtilization** metric for your instance or Auto Scaling group, condition **Greater than**, threshold e.g. **70**.',
        hint: 'Metrics named "AWS/EC2 › CPUUtilization › InstanceId=…" or "…AutoScalingGroupName=…".',
        check: (c) => isCpuAlarm(c).length > 0,
      },
      {
        title: 'Notify an SNS topic',
        detail: 'The alarm must send to an **SNS topic** when in ALARM. In step 2 choose an existing topic or **Create new topic** with your email.',
        hint: 'If you already created the alarm without an action, delete it and recreate it with a topic.',
        check: (c) => isCpuAlarm(c).some((a) => a.actions.some((x) => x.startsWith('arn:aws:sns:'))),
      },
      {
        title: 'Create a log group',
        detail: 'In **CloudWatch → Log groups**, choose **Create log group** (e.g. `/aws/ec2/web`). Notice the default retention: **Never expire**.',
        hint: 'Leave retention at the default for now so you can see what it looks like.',
        check: (c) => c.logGroups.length > 0,
      },
      {
        title: 'Set retention to 30 days',
        detail: 'Select the log group and choose **Edit retention setting** → **30 days (1 month)**.',
        hint: 'Retention is per log group. Pick "30 days (1 month)" from the list.',
        check: (c) => c.logGroups.some((l) => l.retentionDays === 30),
      },
    ],
    debrief: 'CloudWatch alarms watch a metric and act: SNS for notifications (email, SMS, Lambda, SQS fan-out), Auto Scaling policies, or EC2 actions such as recover. Log groups never expire by default, so setting retention (and exporting old logs to S3) is a standard cost answer. Keep the triad straight: CloudWatch = performance, CloudTrail = who called which API, Config = resource configuration and compliance.',
  },
  {
    id: 'lab-budget',
    title: 'Monthly cost budget with an 80% alert',
    lessonId: 'm4-cost-tools',
    minutes: 6,
    start: '/console/billing/budgets',
    intro: 'Make sure you hear about spend before the bill arrives: a monthly cost budget that emails you at 80%.',
    steps: [
      {
        title: 'Create a cost budget',
        detail: 'In **Billing and Cost Management → Budgets**, choose **Create budget** and keep the type **Cost budget**.',
        hint: 'A usage budget tracks hours or GB; this lab needs a cost (dollar) budget.',
        check: (c) => c.budgets.some((b) => b.kind === 'cost'),
      },
      {
        title: 'Make it monthly',
        detail: 'Set **Period** to **Monthly** and enter a budgeted amount (e.g. $10).',
        hint: 'Monthly is the default period.',
        check: (c) => c.budgets.some((b) => b.kind === 'cost' && (b.period ?? 'MONTHLY') === 'MONTHLY' && b.amount > 0),
      },
      {
        title: 'Alert at 80%',
        detail: 'Under **Configure alerts**, set the threshold to **80%** of the budgeted amount.',
        hint: 'Threshold field: 80.',
        check: (c) => c.budgets.some((b) => b.kind === 'cost' && (b.period ?? 'MONTHLY') === 'MONTHLY' && b.alertPercent === 80),
      },
      {
        title: 'Send it to your email',
        detail: 'Add an **email recipient** for the alert and create the budget. Then compare its % used with **Home** and **Cost Explorer**.',
        hint: 'Any valid email address works in the simulator.',
        check: (c) => c.budgets.some((b) => b.kind === 'cost' && (b.period ?? 'MONTHLY') === 'MONTHLY' && b.alertPercent === 80 && /@/.test(b.email)),
      },
    ],
    debrief: 'AWS Budgets is the answer to "notify me when spend reaches X% of a limit" (actual or forecasted), and Budget actions can even apply an SCP/IAM policy or stop instances automatically. Compare: Cost Explorer = analyse and forecast, Cost Anomaly Detection = ML-detected unusual spend, CUR = detailed line items in S3, CloudWatch billing alarm = the older EstimatedCharges metric in us-east-1.',
  },
];

export default labs;
