import type { Flashcard } from '../types';

export default [
  // m3a-storage-paradigms
  { id: "fc-m3a-storage-paradigms-1", lessonId: "m3a-storage-paradigms", front: "Object vs block vs file storage, one line each?", back: "Object (S3): whole objects + metadata over an HTTPS API. Block (EBS, instance store): a raw disk the OS formats. File (EFS, FSx): a shared filesystem over NFS/SMB/Lustre." },
  { id: "fc-m3a-storage-paradigms-2", lessonId: "m3a-storage-paradigms", front: "Scenario: hundreds of instances need the same files at once → which paradigm?", back: "File storage: EFS for Linux/NFS, FSx for Windows/SMB, Lustre, ONTAP or OpenZFS." },
  { id: "fc-m3a-storage-paradigms-3", lessonId: "m3a-storage-paradigms", front: "Scenario: a database needs a low-latency disk on one instance → which paradigm?", back: "Block storage: EBS (gp3, or io2 for heavy I/O), or instance store if the data is disposable." },
  { id: "fc-m3a-storage-paradigms-4", lessonId: "m3a-storage-paradigms", front: "Scenario: serve images to millions / archive logs → which paradigm?", back: "Object storage: S3. Effectively unlimited capacity, pay only for what's stored, accessed over HTTPS." },
  { id: "fc-m3a-storage-paradigms-5", lessonId: "m3a-storage-paradigms", front: "Can you edit part of an S3 object in place?", back: "No. Standard S3 has no partial in-place writes: you PUT the whole object again. Block storage lets you rewrite any byte." },
  { id: "fc-m3a-storage-paradigms-6", lessonId: "m3a-storage-paradigms", front: "First step for any storage question?", back: "Match the ACCESS PATTERN to the paradigm (shared file / single-instance block / web-scale object), then pick the product, then the cost tier." },

  // m3a-s3-basics
  { id: "fc-m3a-s3-basics-1", lessonId: "m3a-s3-basics", front: "Max size of a single S3 object?", back: "5 TB is the long-standing exam answer (AWS raised the limit to 50 TB in late 2025). A single PUT tops out at 5 GB, so bigger objects need multipart upload." },
  { id: "fc-m3a-s3-basics-2", lessonId: "m3a-s3-basics", front: "S3 Standard durability vs availability?", back: "Durability 11 nines (99.999999999%) across at least 3 AZs = not losing data. Availability 99.99% = reaching it right now." },
  { id: "fc-m3a-s3-basics-3", lessonId: "m3a-s3-basics", front: "S3 consistency model today?", back: "Strong read-after-write consistency for every PUT and DELETE (since Dec 2020). 'Eventual consistency' caveats in old courses are obsolete." },
  { id: "fc-m3a-s3-basics-4", lessonId: "m3a-s3-basics", front: "When is multipart upload required, and when recommended?", back: "Required above 5 GB, recommended above 100 MB. Parts upload in parallel and only failed parts are retried." },
  { id: "fc-m3a-s3-basics-5", lessonId: "m3a-s3-basics", front: "S3 request rate limit per prefix?", back: "3,500 writes and 5,500 reads per second PER PREFIX, with unlimited prefixes. Spread keys across prefixes to scale." },
  { id: "fc-m3a-s3-basics-6", lessonId: "m3a-s3-basics", front: "Scenario: users worldwide upload large files slowly to one bucket → ?", back: "S3 Transfer Acceleration: upload to the nearest edge location, then ride AWS's backbone to the bucket's Region." },

  // m3a-s3-protection
  { id: "fc-m3a-s3-protection-1", lessonId: "m3a-s3-protection", front: "What does DELETE do in a versioned bucket?", back: "Adds a delete marker; older versions stay. Remove the marker and the object is back. Versioning can be suspended but never turned off." },
  { id: "fc-m3a-s3-protection-2", lessonId: "m3a-s3-protection", front: "S3 replication prerequisites, and what about existing objects?", back: "Versioning on BOTH buckets plus an IAM role. Only new objects replicate; existing objects need S3 Batch Replication." },
  { id: "fc-m3a-s3-protection-3", lessonId: "m3a-s3-protection", front: "CRR vs SRR: when each?", back: "Cross-Region: DR, compliance copies, lower latency for distant users. Same-Region: aggregate logs into one bucket, prod → test copies." },
  { id: "fc-m3a-s3-protection-4", lessonId: "m3a-s3-protection", front: "Object Lock compliance vs governance mode?", back: "Compliance: NOBODY, not even root, can delete or shorten retention. Governance: users with a special permission can override." },
  { id: "fc-m3a-s3-protection-5", lessonId: "m3a-s3-protection", front: "Scenario: audit logs must be undeletable by anyone, including admins, for 5 years → ?", back: "Versioning + S3 Object Lock in Compliance mode with 5-year retention. 'Not even admins' is the Compliance-mode fingerprint." },
  { id: "fc-m3a-s3-protection-6", lessonId: "m3a-s3-protection", front: "Object Lock legal hold vs retention period? And MFA Delete?", back: "Retention: fixed until a date. Legal hold: indefinite, toggled per object. MFA Delete requires MFA to permanently delete versions, but root can still do it." },

  // m3a-s3-security
  { id: "fc-m3a-s3-security-1", lessonId: "m3a-s3-security", front: "First thing to check when a bucket is accidentally public?", back: "Block Public Access, at account and bucket level. It overrides any policy or ACL that tries to make data public, and is on by default." },
  { id: "fc-m3a-s3-security-2", lessonId: "m3a-s3-security", front: "Scenario: share one private file for 24 hours without giving credentials → ?", back: "Presigned URL: time-limited, carries the signer's permissions. Works for downloads (GET) and direct uploads (PUT)." },
  { id: "fc-m3a-s3-security-3", lessonId: "m3a-s3-security", front: "How do you force TLS-only access to a bucket?", back: "Bucket policy that Denies any request where aws:SecureTransport is false." },
  { id: "fc-m3a-s3-security-4", lessonId: "m3a-s3-security", front: "S3 ACLs: use them or disable them?", back: "Disable: Object Ownership = Bucket owner enforced (the default for new buckets). Use bucket and IAM policies; ACLs only fit niche legacy cases." },
  { id: "fc-m3a-s3-security-5", lessonId: "m3a-s3-security", front: "Scenario: many apps share one huge bucket, each with different permissions → ?", back: "S3 Access Points: named endpoints, each with its own policy, instead of one monster bucket policy." },
  { id: "fc-m3a-s3-security-6", lessonId: "m3a-s3-security", front: "Serve a private bucket over HTTPS with a custom domain → ?", back: "CloudFront with Origin Access Control (OAC) and an ACM cert; the bucket stays private. S3 static website endpoints are HTTP-only." },

  // m3a-s3-classes
  { id: "fc-m3a-s3-classes-1", lessonId: "m3a-s3-classes", front: "Scenario: access pattern unknown or changing → which S3 class?", back: "Intelligent-Tiering: auto-moves objects between tiers, small per-object monitoring fee, NO retrieval fees. You can't guess wrong." },
  { id: "fc-m3a-s3-classes-2", lessonId: "m3a-s3-classes", front: "Minimum storage durations by class?", back: "Standard-IA and One Zone-IA: 30 days. Glacier Instant and Flexible Retrieval: 90 days. Deep Archive: 180 days. Deleting early still bills the minimum." },
  { id: "fc-m3a-s3-classes-3", lessonId: "m3a-s3-classes", front: "Glacier Flexible Retrieval: retrieval times?", back: "Expedited 1-5 min, Standard 3-5 h, Bulk 5-12 h (free). Glacier Instant Retrieval gives milliseconds for data read about once a quarter." },
  { id: "fc-m3a-s3-classes-4", lessonId: "m3a-s3-classes", front: "Glacier Deep Archive: retrieval times and use?", back: "Standard within 12 h, Bulk within 48 h. Cheapest storage in AWS, for 7-10 year compliance archives that are rarely if ever read." },
  { id: "fc-m3a-s3-classes-5", lessonId: "m3a-s3-classes", front: "Scenario: infrequently accessed but re-creatable data (thumbnails) → ?", back: "S3 One Zone-IA: instant access, ~20% cheaper than Standard-IA, single AZ. Fine because the data can be regenerated." },
  { id: "fc-m3a-s3-classes-6", lessonId: "m3a-s3-classes", front: "Sneaky lifecycle-rule cost saver, and which way can transitions go?", back: "Abort incomplete multipart uploads (and expire old noncurrent versions). Transitions only move DOWN the ladder, toward colder classes." },

  // m3a-ebs
  { id: "fc-m3a-ebs-1", lessonId: "m3a-ebs", front: "gp3 baseline performance?", back: "3,000 IOPS and 125 MB/s at any size, with IOPS and throughput provisioned independently of size (exam max 16,000 IOPS; AWS raised gp3 limits in 2025). ~20% cheaper per GB than gp2." },
  { id: "fc-m3a-ebs-2", lessonId: "m3a-ebs", front: "Scenario: 500 GB gp2 volume needs 12,000 IOPS, cheapest fix → ?", back: "Migrate to gp3 and provision 12,000 IOPS. gp2 gives 3 IOPS per GB, so it would need a 4 TB volume to get there." },
  { id: "fc-m3a-ebs-3", lessonId: "m3a-ebs", front: "io2 Block Express headline limits?", back: "Up to 256,000 IOPS, sub-millisecond latency, 99.999% durability, Multi-Attach to up to 16 Nitro instances in one AZ (needs a cluster-aware filesystem)." },
  { id: "fc-m3a-ebs-4", lessonId: "m3a-ebs", front: "st1 vs sc1?", back: "st1: throughput-optimized HDD (up to 500 MB/s) for big sequential streams like logs and ETL. sc1: cold HDD, cheapest EBS. Neither can be a boot volume." },
  { id: "fc-m3a-ebs-5", lessonId: "m3a-ebs", front: "EBS scope, and how do you move a volume to another AZ?", back: "An EBS volume lives in one AZ and attaches to instances in that AZ. To move: snapshot it, then create a new volume from the snapshot in the target AZ (copy the snapshot for another Region)." },
  { id: "fc-m3a-ebs-6", lessonId: "m3a-ebs", front: "Scenario: a volume restored from snapshot is slow on first reads → ?", back: "Blocks lazy-load from S3. Fast Snapshot Restore pre-warms for full performance immediately (extra cost)." },

  // m3a-instance-store
  { id: "fc-m3a-instance-store-1", lessonId: "m3a-instance-store", front: "Which events does instance store data survive?", back: "A reboot only. Data is lost on stop, hibernate, terminate, or host hardware failure." },
  { id: "fc-m3a-instance-store-2", lessonId: "m3a-instance-store", front: "When is instance store the right choice?", back: "Data you can afford to lose: caches, buffers, scratch space, or data replicated at the app layer (e.g. Cassandra or Kafka nodes)." },
  { id: "fc-m3a-instance-store-3", lessonId: "m3a-instance-store", front: "Scenario: highest possible storage IOPS, no durability requirement → ?", back: "Instance store NVMe: millions of IOPS with no network hop, beating even io2." },
  { id: "fc-m3a-instance-store-4", lessonId: "m3a-instance-store", front: "How is instance store billed?", back: "Included in the instance price, on instance types that have it (e.g. i4i, d3, or 'd' variants like m6id)." },
  { id: "fc-m3a-instance-store-5", lessonId: "m3a-instance-store", front: "Can you snapshot or detach an instance store volume?", back: "No. To keep the data, copy it to EBS or S3 from the application." },
  { id: "fc-m3a-instance-store-6", lessonId: "m3a-instance-store", front: "EBS vs instance store in one line?", back: "EBS: network-attached, persistent, snapshot-able, detachable. Instance store: physically on the host, fastest, ephemeral." },

  // m3a-efs-fsx
  { id: "fc-m3a-efs-fsx-1", lessonId: "m3a-efs-fsx", front: "Scenario: 20 Linux instances across 3 AZs share a directory with POSIX permissions → ?", back: "EFS: Regional managed NFS that thousands of clients mount at once, elastic with no capacity planning. Linux only." },
  { id: "fc-m3a-efs-fsx-2", lessonId: "m3a-efs-fsx", front: "How do clients reach EFS, and which port must the SG allow?", back: "Through mount targets (one ENI per AZ). Their security group must allow NFS on TCP 2049." },
  { id: "fc-m3a-efs-fsx-3", lessonId: "m3a-efs-fsx", front: "EFS cost levers?", back: "Lifecycle to Infrequent Access and Archive tiers (up to ~90% savings), One Zone classes for non-critical data, Elastic throughput instead of over-provisioning." },
  { id: "fc-m3a-efs-fsx-4", lessonId: "m3a-efs-fsx", front: "Scenario: Windows file share with Active Directory and NTFS permissions → ?", back: "FSx for Windows File Server: SMB, AD integration, DFS namespaces, shadow copies, Multi-AZ option. EFS doesn't do Windows." },
  { id: "fc-m3a-efs-fsx-5", lessonId: "m3a-efs-fsx", front: "Scenario: HPC/ML needs hundreds of GB/s on data that lives in S3 → ?", back: "FSx for Lustre linked to the S3 bucket: lazy-loads objects as files, writes results back. Scratch = temporary and cheap; Persistent = long-lived, replicated." },
  { id: "fc-m3a-efs-fsx-6", lessonId: "m3a-efs-fsx", front: "Scenario: Linux AND Windows clients on one share, or migrating NetApp → ?", back: "FSx for NetApp ONTAP: NFS + SMB + iSCSI, snapshots, dedupe, SnapMirror. Migrating a ZFS server → FSx for OpenZFS." },

  // m3a-storage-gateway
  { id: "fc-m3a-storage-gateway-1", lessonId: "m3a-storage-gateway", front: "Scenario: on-prem apps write to an NFS/SMB share; files must land in S3 with fast local access → ?", back: "S3 File Gateway: local share, objects in S3, recently used files cached on-prem." },
  { id: "fc-m3a-storage-gateway-2", lessonId: "m3a-storage-gateway", front: "Scenario: replace physical backup tapes but keep Veeam/NetBackup → ?", back: "Tape Gateway: a virtual tape library over iSCSI; tapes stored in S3 and archived to Glacier or Deep Archive." },
  { id: "fc-m3a-storage-gateway-3", lessonId: "m3a-storage-gateway", front: "Volume Gateway cached vs stored mode?", back: "Cached: primary data in S3, hot blocks cached locally (expand capacity). Stored: all data kept on-prem, async EBS snapshots to AWS for backup/DR." },
  { id: "fc-m3a-storage-gateway-4", lessonId: "m3a-storage-gateway", front: "What did FSx File Gateway do?", back: "Gave on-prem users a low-latency cache of FSx for Windows shares. AWS stopped offering it to new customers in 2024, but it may still appear as an option." },
  { id: "fc-m3a-storage-gateway-5", lessonId: "m3a-storage-gateway", front: "Storage Gateway vs DataSync?", back: "Gateway = ongoing hybrid ACCESS (apps keep using a local share). DataSync = MOVING or syncing data, one-time or on a schedule." },
  { id: "fc-m3a-storage-gateway-6", lessonId: "m3a-storage-gateway", front: "How is Storage Gateway deployed?", back: "As a VM on-prem (VMware, Hyper-V, KVM) or an EC2 instance. It presents familiar local interfaces while the data lives durably in AWS." },

  // m3a-migration
  { id: "fc-m3a-migration-1", lessonId: "m3a-migration", front: "Roughly how long does 100 TB take over a dedicated 1 Gbps link?", back: "About 10 days (100 Mbps: 3+ months). Rule of thumb: if it takes more than ~a week over the wire, ship a Snowball." },
  { id: "fc-m3a-migration-2", lessonId: "m3a-migration", front: "Scenario: nightly sync of an on-prem NAS to S3 → ?", back: "AWS DataSync: managed agent, incremental, scheduled, bandwidth-throttled, verified, preserves metadata. Not Storage Gateway, which is for ongoing access." },
  { id: "fc-m3a-migration-3", lessonId: "m3a-migration", front: "Scenario: partners upload via SFTP and must not change their process → ?", back: "AWS Transfer Family: managed SFTP/FTPS/FTP/AS2 endpoints storing straight into S3 or EFS." },
  { id: "fc-m3a-migration-4", lessonId: "m3a-migration", front: "Scenario: 90 TB, a saturated 50 Mbps link, 3-week deadline → ?", back: "Snowball Edge Storage Optimized: load at LAN speed and ship. Do the bandwidth math first; when the wire loses, ship. (Snowmobile is retired.)" },
  { id: "fc-m3a-migration-5", lessonId: "m3a-migration", front: "Scenario: Oracle → Aurora PostgreSQL with under 30 min downtime → ?", back: "Schema Conversion Tool converts the schema; DMS does full load + ongoing CDC replication; cut over once caught up." },
  { id: "fc-m3a-migration-6", lessonId: "m3a-migration", front: "Scenario: lift-and-shift hundreds of VMs and physical servers to EC2 → ?", back: "AWS Application Migration Service (MGN): agent-based block-level replication; cutover launches them as EC2 instances." },

  // m3a-ref-media
  { id: "fc-m3a-ref-media-1", lessonId: "m3a-ref-media", front: "How do users upload originals without app servers touching the bytes?", back: "The API hands out a presigned PUT URL; the browser uploads directly to S3, with Transfer Acceleration for distant users." },
  { id: "fc-m3a-ref-media-2", lessonId: "m3a-ref-media", front: "What generates thumbnails in the media pipeline?", back: "S3 object-created event → EventBridge → Lambda, which writes thumbnails to a separate 'derived' bucket." },
  { id: "fc-m3a-ref-media-3", lessonId: "m3a-ref-media", front: "Storage class for derived thumbnails, and why?", back: "One Zone-IA: they can be regenerated from originals, so single-AZ risk is acceptable for ~20% savings over Standard-IA." },
  { id: "fc-m3a-ref-media-4", lessonId: "m3a-ref-media", front: "Cost curve for originals?", back: "Intelligent-Tiering (unpredictable access) plus lifecycle: Glacier Flexible at 180 days, Deep Archive at 2 years, expire at 10 years." },
  { id: "fc-m3a-ref-media-5", lessonId: "m3a-ref-media", front: "How are originals protected for the 10-year legal requirement and DR?", back: "Versioning + Object Lock in Compliance mode (10 years), plus Cross-Region Replication to a second Region." },
  { id: "fc-m3a-ref-media-6", lessonId: "m3a-ref-media", front: "Hybrid pieces: editor access, 60 TB back-catalog, nightly dumps?", back: "S3 File Gateway for LAN-speed cached access; Snowball for the initial 60 TB; DataSync for nightly camera-card dumps." },
] satisfies Flashcard[];
