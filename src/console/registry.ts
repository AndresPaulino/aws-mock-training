// Mock-console services. Each `component` is the service's console root and handles its own sub-routes
// under /console/<path>/* with a nested <Routes>.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface ConsoleService { path: string; name: string; desc: string; category: string; icon: string; component: LazyExoticComponent<ComponentType> }

export const CONSOLE_SERVICES: ConsoleService[] = [
  { path: 'ec2', name: 'EC2', desc: 'Virtual servers in the cloud', category: 'Compute', icon: 'ec2', component: lazy(() => import('./services/ec2/Ec2Console')) },
  { path: 'lambda', name: 'Lambda', desc: 'Run code without thinking about servers', category: 'Compute', icon: 'lambda', component: lazy(() => import('./services/lambda/LambdaConsole')) },
  { path: 's3', name: 'S3', desc: 'Scalable storage in the cloud', category: 'Storage', icon: 's3', component: lazy(() => import('./services/s3/S3Console')) },
  { path: 'rds', name: 'Aurora and RDS', desc: 'Managed relational database service', category: 'Database', icon: 'rds', component: lazy(() => import('./services/rds/RdsConsole')) },
  { path: 'dynamodb', name: 'DynamoDB', desc: 'Managed NoSQL database', category: 'Database', icon: 'dynamodb', component: lazy(() => import('./services/dynamodb/DynamoConsole')) },
  { path: 'vpc', name: 'VPC', desc: 'Isolated cloud resources', category: 'Networking & Content Delivery', icon: 'vpc', component: lazy(() => import('./services/vpc/VpcConsole')) },
  { path: 'route53', name: 'Route 53', desc: 'Scalable DNS and domain name registration', category: 'Networking & Content Delivery', icon: 'route53', component: lazy(() => import('./services/route53/Route53Console')) },
  { path: 'cloudfront', name: 'CloudFront', desc: 'Global content delivery network', category: 'Networking & Content Delivery', icon: 'cloudfront', component: lazy(() => import('./services/cloudfront/CloudFrontConsole')) },
  { path: 'apigateway', name: 'API Gateway', desc: 'Build, deploy, and manage APIs', category: 'Networking & Content Delivery', icon: 'api-gateway', component: lazy(() => import('./services/apigateway/ApiGatewayConsole')) },
  { path: 'iam', name: 'IAM', desc: 'Manage access to AWS resources', category: 'Security, Identity & Compliance', icon: 'iam', component: lazy(() => import('./services/iam/IamConsole')) },
  { path: 'kms', name: 'Key Management Service', desc: 'Create and control encryption keys', category: 'Security, Identity & Compliance', icon: 'kms', component: lazy(() => import('./services/kms/KmsConsole')) },
  { path: 'sqs', name: 'Simple Queue Service', desc: 'Managed message queues', category: 'Application Integration', icon: 'sqs', component: lazy(() => import('./services/sqs/SqsConsole')) },
  { path: 'sns', name: 'Simple Notification Service', desc: 'Pub/sub, SMS, email and push notifications', category: 'Application Integration', icon: 'sns', component: lazy(() => import('./services/sns/SnsConsole')) },
  { path: 'cloudwatch', name: 'CloudWatch', desc: 'Monitor resources and applications', category: 'Management & Governance', icon: 'cloudwatch', component: lazy(() => import('./services/cloudwatch/CloudWatchConsole')) },
  { path: 'billing', name: 'Billing and Cost Management', desc: 'Costs, budgets and Cost Explorer', category: 'Cloud Financial Management', icon: 'cost-explorer', component: lazy(() => import('./services/billing/BillingConsole')) },
];
