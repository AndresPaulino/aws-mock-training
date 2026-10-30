// Simulated AWS account state. Plain JSON (it is saved to progress.json).
// Every collection is an array of resources with a string `id`; use the generic
// store actions (put / patch / remove) from src/store/cloud.ts to change them.

export type Az = string; // e.g. 'us-east-1a'

export interface Tagged { id: string; name: string; region: string; createdAt: number }

export interface Vpc extends Tagged { cidr: string; isDefault: boolean; dnsHostnames: boolean }
export interface Subnet extends Tagged { vpcId: string; cidr: string; az: Az; autoPublicIp: boolean }
export interface InternetGateway extends Tagged { vpcId?: string }
export interface NatGateway extends Tagged { subnetId: string; state: 'available' | 'deleted'; publicIp: string; kind: 'gateway' | 'instance' }
export interface Route { dest: string; target: string } // target: 'local' | igw-.. | nat-.. | vpce-.. | pcx-.. | tgw-.. | eni/instance id
export interface RouteTable extends Tagged { vpcId: string; main: boolean; routes: Route[]; subnetIds: string[] }

export type Protocol = 'tcp' | 'udp' | 'icmp' | 'all';
export interface SgRule { protocol: Protocol; from: number; to: number; source: string; description?: string } // source: CIDR or sg-id
export interface SecurityGroup extends Tagged { vpcId: string; description: string; inbound: SgRule[]; outbound: SgRule[] }
export interface NaclRule { num: number; protocol: Protocol; from: number; to: number; cidr: string; action: 'allow' | 'deny' }
export interface Nacl extends Tagged { vpcId: string; isDefault: boolean; subnetIds: string[]; inbound: NaclRule[]; outbound: NaclRule[] }
export interface VpcEndpoint extends Tagged { vpcId: string; service: string; type: 'Gateway' | 'Interface'; routeTableIds: string[]; subnetIds: string[]; sgIds: string[]; privateDns: boolean }
export interface PeeringConnection extends Tagged { requesterVpcId: string; accepterVpcId: string; status: 'pending-acceptance' | 'active' }

export type InstanceState = 'pending' | 'running' | 'stopping' | 'stopped' | 'terminated';
export interface Instance extends Tagged {
  type: string; ami: string; subnetId: string; sgIds: string[]; state: InstanceState;
  privateIp: string; publicIp?: string; elasticIp?: string; iamRole?: string; keyPair?: string;
  userData?: string; volumeIds: string[]; launchedAt: number; asgId?: string; purchase: 'on-demand' | 'spot';
  imdsv2: boolean; cpu: number; // simulated CPU %
}
export interface Volume extends Tagged { sizeGb: number; type: 'gp3' | 'gp2' | 'io2' | 'io1' | 'st1' | 'sc1'; iops: number; throughput: number; az: Az; attachedTo?: string; encrypted: boolean; kmsKeyId?: string; deleteOnTermination: boolean }
export interface Snapshot extends Tagged { volumeId: string; sizeGb: number; encrypted: boolean; tier: 'standard' | 'archive' }
export interface ElasticIp extends Tagged { publicIp: string; instanceId?: string }

export interface LaunchTemplate extends Tagged { ami: string; type: string; sgIds: string[]; iamRole?: string; userData?: string; version: number; versions?: { version: number; ami: string; type: string; sgIds: string[]; iamRole?: string; userData?: string; description?: string; createdAt: number }[] }
export interface TargetGroup extends Tagged { vpcId: string; protocol: 'HTTP' | 'HTTPS' | 'TCP'; port: number; healthPath: string; targets: string[] }
export interface Listener { port: number; protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS'; targetGroupId: string; certificate?: string; redirectToHttps?: boolean }
export interface LoadBalancer extends Tagged { type: 'application' | 'network'; scheme: 'internet-facing' | 'internal'; vpcId: string; subnetIds: string[]; sgIds: string[]; listeners: Listener[]; dnsName: string; crossZone: boolean; wafAclId?: string }
export interface ScalingPolicy { id: string; type: 'target-tracking' | 'step' | 'scheduled'; metric: 'cpu' | 'requests' | 'queue-depth'; target: number; schedule?: string }
export interface AutoScalingGroup extends Tagged { launchTemplateId: string; subnetIds: string[]; min: number; max: number; desired: number; targetGroupIds: string[]; healthCheck: 'EC2' | 'ELB'; policies: ScalingPolicy[]; load: number /* simulated demand % */; healthGraceSec?: number; cooldownSec?: number }

export interface S3Object { key: string; sizeKb: number; storageClass: StorageClass; versionId: string; isDeleteMarker?: boolean; lastModified: number; encryption: 'SSE-S3' | 'SSE-KMS' | 'none' }
export type StorageClass = 'STANDARD' | 'INTELLIGENT_TIERING' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER_IR' | 'GLACIER' | 'DEEP_ARCHIVE' | 'EXPRESS_ONEZONE';
export interface LifecycleRule { id: string; prefix: string; transitions: { days: number; storageClass: StorageClass }[]; expireDays?: number; noncurrentExpireDays?: number }
export interface Bucket extends Tagged {
  versioning: 'Disabled' | 'Enabled' | 'Suspended'; blockPublicAccess: boolean; defaultEncryption: 'SSE-S3' | 'SSE-KMS'; kmsKeyId?: string;
  policy?: string; objects: S3Object[]; lifecycle: LifecycleRule[]; replicationTo?: string; objectLock: boolean; staticWebsite: boolean; transferAcceleration: boolean;
  /** S3 console extras: the four BPA settings, ACL mode, bucket key, dual-layer (DSSE-KMS) on top of defaultEncryption 'SSE-KMS'. */
  publicAccessBlock?: boolean[]; objectOwnership?: 'BucketOwnerEnforced' | 'BucketOwnerPreferred' | 'ObjectWriter'; bucketKey?: boolean; dsse?: boolean;
}

export interface IamStatement { Effect: 'Allow' | 'Deny'; Action: string | string[]; Resource: string | string[]; Principal?: unknown; Condition?: unknown }
export interface IamPolicy extends Tagged { managedBy: 'aws' | 'customer'; description: string; document: string /* JSON */ }
export interface IamUser extends Tagged { groupIds: string[]; policyIds: string[]; mfa: boolean; consoleAccess: boolean; accessKeys: number; boundaryPolicyId?: string }
export interface IamGroup extends Tagged { policyIds: string[] }
export interface IamRole extends Tagged { trustedEntity: string /* 'ec2.amazonaws.com' | 'lambda.amazonaws.com' | 'arn:aws:iam::<acct>:root' | ... */; policyIds: string[]; description: string }

export interface KmsKey extends Tagged { alias: string; managedBy: 'aws' | 'customer'; rotation: boolean; enabled: boolean; multiRegion: boolean; keyUsers: string[] /* IAM user/role ids */; keyAdmins?: string[]; keySpec?: string /* SYMMETRIC_DEFAULT | RSA_2048 | ECC_NIST_P256 ... */; description?: string; deletionDate?: number /* set while pending deletion */ }

export interface DbInstance extends Tagged {
  engine: 'mysql' | 'postgres' | 'mariadb' | 'aurora-mysql' | 'aurora-postgresql' | 'sqlserver' | 'oracle';
  instanceClass: string; storageGb: number; multiAz: boolean; az: Az; standbyAz?: Az; subnetIds: string[]; sgIds: string[];
  encrypted: boolean; publiclyAccessible: boolean; backupRetentionDays: number; status: 'available' | 'rebooting' | 'failing-over' | 'creating' | 'modifying';
  readReplicaOf?: string; endpoint: string; events: { t: number; msg: string }[];
  kmsKeyId?: string; multiAzCluster?: boolean; snapshots?: { id: string; t: number }[];
}
export interface DynamoTable extends Tagged {
  partitionKey: string; sortKey?: string; mode: 'on-demand' | 'provisioned'; rcu: number; wcu: number;
  gsis: { name: string; pk: string; sk?: string }[]; itemCount: number; pitr: boolean; streams: boolean; globalReplicas: string[]; ttlAttribute?: string;
  items: Record<string, string>[];
  tableClass?: 'STANDARD' | 'STANDARD_IA'; backups?: { name: string; t: number }[];
}

export interface LambdaFunction extends Tagged {
  runtime: string; memoryMb: number; timeoutSec: number; roleId?: string; handler: string; code: string;
  triggers: { type: 'sqs' | 'api-gateway' | 's3' | 'eventbridge' | 'sns' | 'dynamodb-stream'; source: string }[];
  vpcSubnetIds: string[]; reservedConcurrency?: number; provisionedConcurrency?: number; invocations: { t: number; ok: boolean; ms: number; msg: string }[];
}
export interface ApiGateway extends Tagged { kind: 'HTTP' | 'REST' | 'WebSocket'; routes: { method: string; path: string; lambda: string }[]; stage: string; throttleRps: number; caching: boolean; authorizer?: 'IAM' | 'Cognito' | 'Lambda' }

export interface SqsMessage { id: string; body: string; receiveCount: number; visibleAt: number; sentAt: number }
export interface Queue extends Tagged { fifo: boolean; visibilityTimeoutSec: number; retentionDays: number; delaySec: number; receiveWaitSec: number; dlqId?: string; maxReceiveCount: number; messages: SqsMessage[] }
export interface Topic extends Tagged { fifo: boolean; subscriptions: { id: string; protocol: 'sqs' | 'lambda' | 'email' | 'https' | 'sms'; endpoint: string; filter?: string }[]; published: number }

export interface DnsRecord {
  id: string; name: string; type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA'; value: string; ttl: number; alias: boolean;
  policy: 'simple' | 'weighted' | 'latency' | 'failover' | 'geolocation' | 'multivalue'; setId?: string; weight?: number; region?: string;
  failover?: 'PRIMARY' | 'SECONDARY'; location?: string; healthCheckId?: string;
}
export interface HostedZone extends Tagged { domain: string; private: boolean; vpcIds: string[]; records: DnsRecord[] }
export interface HealthCheck extends Tagged { target: string; path: string; healthy: boolean }

export interface Distribution extends Tagged {
  domainName: string; origins: { id: string; type: 's3' | 'alb' | 'custom'; target: string; oac: boolean }[];
  viewerProtocol: 'allow-all' | 'redirect-to-https' | 'https-only'; priceClass: 'All' | '200' | '100'; defaultTtl: number;
  wafAclId?: string; geoRestriction?: string; enabled: boolean; cacheHitRate: number;
  cachePolicy?: string; aliases?: string[];
}

export interface Alarm extends Tagged { metric: string; resourceId: string; comparison: '>' | '<'; threshold: number; periodMin: number; actions: string[]; state: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA' }
export interface LogGroup extends Tagged { retentionDays: number | null; storedMb: number }
export interface Budget extends Tagged { amount: number; alertPercent: number; email: string; kind: 'cost' | 'usage'; period?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' }
export interface TrailCfg extends Tagged { multiRegion: boolean; bucket: string; dataEvents: boolean; logValidation: boolean }

export interface CloudEvent { t: number; service: string; msg: string } // CloudTrail-ish activity log

export interface CloudState {
  version: 1;
  accountId: string;
  region: string;
  rootMfa: boolean;
  /** Simulated hours elapsed (drives cost accrual and lifecycle sims). */
  simHours: number;
  /** Month-to-date simulated spend accumulated so far in USD. */
  accruedUsd: number;
  vpcs: Vpc[]; subnets: Subnet[]; igws: InternetGateway[]; natGateways: NatGateway[]; routeTables: RouteTable[];
  securityGroups: SecurityGroup[]; nacls: Nacl[]; endpoints: VpcEndpoint[]; peerings: PeeringConnection[];
  instances: Instance[]; volumes: Volume[]; snapshots: Snapshot[]; elasticIps: ElasticIp[];
  launchTemplates: LaunchTemplate[]; targetGroups: TargetGroup[]; loadBalancers: LoadBalancer[]; asgs: AutoScalingGroup[];
  buckets: Bucket[];
  iamPolicies: IamPolicy[]; iamUsers: IamUser[]; iamGroups: IamGroup[]; iamRoles: IamRole[];
  kmsKeys: KmsKey[];
  dbInstances: DbInstance[]; dynamoTables: DynamoTable[];
  lambdas: LambdaFunction[]; apis: ApiGateway[]; queues: Queue[]; topics: Topic[];
  hostedZones: HostedZone[]; healthChecks: HealthCheck[]; distributions: Distribution[];
  alarms: Alarm[]; logGroups: LogGroup[]; budgets: Budget[]; trails: TrailCfg[];
  events: CloudEvent[];
}

/** Keys of CloudState that hold resource arrays. */
export type Collection = {
  [K in keyof CloudState]: CloudState[K] extends { id: string }[] ? K : never
}[keyof CloudState];
export type ItemOf<K extends Collection> = CloudState[K][number];
