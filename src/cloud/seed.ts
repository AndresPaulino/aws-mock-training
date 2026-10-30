import type { CloudState, IamPolicy } from './types';

const t0 = Date.UTC(2026, 0, 1);
export const ACCOUNT_ID = '123456789012';
export const REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)' },
  { id: 'us-east-2', name: 'US East (Ohio)' },
  { id: 'us-west-2', name: 'US West (Oregon)' },
  { id: 'eu-west-1', name: 'Europe (Ireland)' },
  { id: 'eu-central-1', name: 'Europe (Frankfurt)' },
  { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
];
export const azsOf = (region: string) => ['a', 'b', 'c'].map((s) => region + s);

export function rid(prefix: string): string {
  let h = '';
  for (let i = 0; i < 17; i++) h += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return `${prefix}-${h}`;
}

const awsPolicy = (id: string, name: string, description: string, statements: object[]): IamPolicy => ({
  id, name, region: 'global', createdAt: t0, managedBy: 'aws', description,
  document: JSON.stringify({ Version: '2012-10-17', Statement: statements }, null, 2),
});

export const awsManagedPolicies: IamPolicy[] = [
  awsPolicy('pol-admin', 'AdministratorAccess', 'Full access to all AWS services and resources.', [{ Effect: 'Allow', Action: '*', Resource: '*' }]),
  awsPolicy('pol-poweruser', 'PowerUserAccess', 'Full access except IAM and Organizations management.', [
    { Effect: 'Allow', NotAction: ['iam:*', 'organizations:*', 'account:*'], Resource: '*' },
    { Effect: 'Allow', Action: ['iam:CreateServiceLinkedRole', 'iam:ListRoles', 'organizations:DescribeOrganization'], Resource: '*' },
  ]),
  awsPolicy('pol-readonly', 'ReadOnlyAccess', 'Read-only access to AWS services and resources.', [{ Effect: 'Allow', Action: ['*:Describe*', '*:Get*', '*:List*'], Resource: '*' }]),
  awsPolicy('pol-s3-read', 'AmazonS3ReadOnlyAccess', 'Read-only access to all buckets.', [{ Effect: 'Allow', Action: ['s3:Get*', 's3:List*'], Resource: '*' }]),
  awsPolicy('pol-s3-full', 'AmazonS3FullAccess', 'Full access to all buckets.', [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }]),
  awsPolicy('pol-ec2-full', 'AmazonEC2FullAccess', 'Full access to Amazon EC2.', [{ Effect: 'Allow', Action: ['ec2:*', 'elasticloadbalancing:*', 'autoscaling:*', 'cloudwatch:*'], Resource: '*' }]),
  awsPolicy('pol-ddb-full', 'AmazonDynamoDBFullAccess', 'Full access to DynamoDB.', [{ Effect: 'Allow', Action: 'dynamodb:*', Resource: '*' }]),
  awsPolicy('pol-sqs-full', 'AmazonSQSFullAccess', 'Full access to SQS.', [{ Effect: 'Allow', Action: 'sqs:*', Resource: '*' }]),
  awsPolicy('pol-lambda-basic', 'AWSLambdaBasicExecutionRole', 'Lets a Lambda function write logs to CloudWatch Logs.', [{ Effect: 'Allow', Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'], Resource: '*' }]),
  awsPolicy('pol-lambda-sqs', 'AWSLambdaSQSQueueExecutionRole', 'Lets Lambda poll SQS queues and write logs.', [{ Effect: 'Allow', Action: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes', 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'], Resource: '*' }]),
  awsPolicy('pol-ssm-core', 'AmazonSSMManagedInstanceCore', 'Lets Systems Manager manage an EC2 instance (Session Manager, patching).', [{ Effect: 'Allow', Action: ['ssm:UpdateInstanceInformation', 'ssmmessages:*', 'ec2messages:*'], Resource: '*' }]),
  awsPolicy('pol-cw-agent', 'CloudWatchAgentServerPolicy', 'Lets the CloudWatch agent publish metrics and logs.', [{ Effect: 'Allow', Action: ['cloudwatch:PutMetricData', 'logs:PutLogEvents', 'logs:CreateLogStream'], Resource: '*' }]),
  awsPolicy('pol-billing', 'Billing', 'Access to billing and cost management.', [{ Effect: 'Allow', Action: ['aws-portal:*', 'ce:*', 'budgets:*', 'cur:*'], Resource: '*' }]),
  awsPolicy('pol-change-pw', 'IAMUserChangePassword', 'Lets a user change their own password.', [{ Effect: 'Allow', Action: 'iam:ChangePassword', Resource: 'arn:aws:iam::*:user/${aws:username}' }]),
];

/** A fresh account: like a brand-new real account, with a default VPC in the home region. */
export function seedCloud(region = 'us-east-1'): CloudState {
  const [a, b, c] = azsOf(region);
  const vpc = 'vpc-0default0000000';
  return {
    version: 1, accountId: ACCOUNT_ID, region, rootMfa: false, simHours: 0, accruedUsd: 0,
    vpcs: [{ id: vpc, name: 'default', region, createdAt: t0, cidr: '172.31.0.0/16', isDefault: true, dnsHostnames: true }],
    subnets: [
      { id: 'subnet-0def0000000000a', name: `default-${a}`, region, createdAt: t0, vpcId: vpc, cidr: '172.31.0.0/20', az: a, autoPublicIp: true },
      { id: 'subnet-0def0000000000b', name: `default-${b}`, region, createdAt: t0, vpcId: vpc, cidr: '172.31.16.0/20', az: b, autoPublicIp: true },
      { id: 'subnet-0def0000000000c', name: `default-${c}`, region, createdAt: t0, vpcId: vpc, cidr: '172.31.32.0/20', az: c, autoPublicIp: true },
    ],
    igws: [{ id: 'igw-0default0000000', name: 'default', region, createdAt: t0, vpcId: vpc }],
    natGateways: [],
    routeTables: [{ id: 'rtb-0default0000000', name: 'main', region, createdAt: t0, vpcId: vpc, main: true, subnetIds: [], routes: [{ dest: '172.31.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'igw-0default0000000' }] }],
    securityGroups: [{
      id: 'sg-0default0000000', name: 'default', region, createdAt: t0, vpcId: vpc, description: 'default VPC security group',
      inbound: [{ protocol: 'all', from: 0, to: 65535, source: 'sg-0default0000000', description: 'members of this SG' }],
      outbound: [{ protocol: 'all', from: 0, to: 65535, source: '0.0.0.0/0' }],
    }],
    nacls: [{
      id: 'acl-0default0000000', name: 'default', region, createdAt: t0, vpcId: vpc, isDefault: true, subnetIds: [],
      inbound: [{ num: 100, protocol: 'all', from: 0, to: 65535, cidr: '0.0.0.0/0', action: 'allow' }],
      outbound: [{ num: 100, protocol: 'all', from: 0, to: 65535, cidr: '0.0.0.0/0', action: 'allow' }],
    }],
    endpoints: [], peerings: [], instances: [], volumes: [], snapshots: [], elasticIps: [],
    launchTemplates: [], targetGroups: [], loadBalancers: [], asgs: [], buckets: [],
    iamPolicies: awsManagedPolicies, iamUsers: [], iamGroups: [], iamRoles: [],
    kmsKeys: [
      { id: 'key-aws-s3', name: 'aws/s3', alias: 'aws/s3', region, createdAt: t0, managedBy: 'aws', rotation: true, enabled: true, multiRegion: false, keyUsers: [] },
      { id: 'key-aws-ebs', name: 'aws/ebs', alias: 'aws/ebs', region, createdAt: t0, managedBy: 'aws', rotation: true, enabled: true, multiRegion: false, keyUsers: [] },
      { id: 'key-aws-rds', name: 'aws/rds', alias: 'aws/rds', region, createdAt: t0, managedBy: 'aws', rotation: true, enabled: true, multiRegion: false, keyUsers: [] },
    ],
    dbInstances: [], dynamoTables: [], lambdas: [], apis: [], queues: [], topics: [],
    hostedZones: [], healthChecks: [], distributions: [], alarms: [], logGroups: [], budgets: [], trails: [],
    events: [{ t: Date.now(), service: 'account', msg: 'Account created. Root user has no MFA. Fix that first!' }],
  };
}
