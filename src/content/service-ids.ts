// Canonical ServiceIds. Content tags (lesson.services, question.tags, diagram icons, scenarios) must use these.
// Generic diagram icons (not services): user, users, internet, onprem, server, database, mobile, attacker.
export const serviceIds = [
  // compute
  'ec2', 'ec2-spot', 'auto-scaling', 'launch-template', 'lambda', 'elastic-beanstalk', 'lightsail', 'batch',
  'outposts', 'wavelength', 'local-zones', 'app-runner', 'ami',
  // containers
  'ecs', 'eks', 'fargate', 'ecr',
  // storage
  's3', 's3-glacier', 's3-replication', 'ebs', 'instance-store', 'efs', 'fsx-windows', 'fsx-lustre', 'fsx-ontap',
  'fsx-openzfs', 'storage-gateway', 'backup', 'snow-family', 'datasync', 'transfer-family',
  // database
  'rds', 'rds-multi-az', 'rds-read-replica', 'rds-proxy', 'aurora', 'aurora-serverless', 'aurora-global-database',
  'dynamodb', 'dynamodb-global-tables', 'dax', 'elasticache', 'memorydb', 'redshift', 'documentdb', 'keyspaces',
  'neptune', 'timestream', 'opensearch',
  // networking & delivery
  'vpc', 'subnet', 'route-table', 'internet-gateway', 'nat-gateway', 'nat-instance', 'security-group', 'nacl',
  'gateway-endpoint', 'interface-endpoint', 'privatelink', 'vpc-peering', 'transit-gateway', 'site-to-site-vpn',
  'client-vpn', 'direct-connect', 'route53', 'cloudfront', 'global-accelerator', 'alb', 'nlb', 'gwlb', 'elb',
  'api-gateway', 'network-firewall', 'vpc-flow-logs', 'elastic-ip', 'eni', 'ram', 'vpc-lattice',
  // security, identity & compliance
  'iam', 'iam-role', 'iam-policy', 'sts', 'iam-identity-center', 'organizations', 'scp', 'control-tower', 'cognito',
  'directory-service', 'kms', 'cloudhsm', 'secrets-manager', 'parameter-store', 'acm', 'waf', 'shield', 'guardduty',
  'inspector', 'macie', 'security-hub', 'detective', 'firewall-manager', 'artifact', 'audit-manager',
  // management & governance
  'cloudwatch', 'cloudwatch-logs', 'cloudtrail', 'config', 'cloudformation', 'systems-manager', 'trusted-advisor',
  'service-catalog', 'health-dashboard', 'compute-optimizer', 'service-quotas', 'x-ray', 'license-manager',
  'managed-grafana', 'managed-prometheus',
  // application integration
  'sqs', 'sns', 'eventbridge', 'step-functions', 'mq', 'appflow', 'appsync', 'ses',
  // analytics & streaming
  'kinesis-data-streams', 'data-firehose', 'kinesis-video-streams', 'managed-flink', 'msk', 'athena', 'glue',
  'emr', 'lake-formation', 'quicksight', 'data-exchange',
  // migration & transfer
  'dms', 'mgn', 'migration-hub', 'application-discovery',
  // machine learning
  'sagemaker', 'rekognition', 'comprehend', 'textract', 'transcribe', 'polly', 'translate', 'lex', 'kendra',
  'personalize', 'forecast', 'fraud-detector', 'bedrock',
  // front-end, media, iot
  'amplify', 'device-farm', 'elemental-mediaconvert', 'iot-core',
  // cost management
  'cost-explorer', 'budgets', 'cost-usage-report', 'savings-plans', 'reserved-instances', 'cost-anomaly-detection',
  'pricing-calculator',
] as const;

export const genericIcons = ['user', 'users', 'internet', 'onprem', 'server', 'database', 'mobile', 'attacker'] as const;
