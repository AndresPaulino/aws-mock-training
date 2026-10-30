import type { Lesson } from '../types';

export default [
  // ---------------------------------------------------------------------------
  {
    id: 'm3a-storage-paradigms',
    module: 'm3a',
    domain: 'performance',
    title: 'Object vs Block vs File Storage',
    minutes: 12,
    summary:
      'Tell object, block and file storage apart from a single sentence of a scenario, and name the AWS product family that serves each access pattern.',
    analogy: {
      title: 'A coat check, a notebook and a shared filing cabinet',
      body: `Object storage is a **coat check**. You hand over the whole coat, get a ticket (the key), and later hand back the ticket to get the whole coat. You can't ask the attendant to sew a new button on while it hangs there: you take it out, change it, and check it in again. The cloakroom never runs out of hooks.

Block storage is **your own notebook**. You can open to any page and rewrite one word. It's fast because it's in your hands, but only one person writes in it at a time, and it has a fixed number of pages.

File storage is a **shared filing cabinet in the office**. It has drawers and folders with names, everybody on the team can open it at once, and there are rules about who can open which drawer.`,
    },
    sections: [
      {
        heading: 'The problem: programs want to touch data in different ways',
        body: `Every application stores data, but not the same way. A web server serving a product photo wants to fetch **the whole file** by name. A database wants to overwrite **8 KB in the middle of a 500 GB file** thousands of times per second. A team of 40 render servers wants to **open the same folder** and see each other's files instantly.

One storage design cannot do all three well. So AWS (like every storage vendor) sells three paradigms, each tuned for one access pattern: **object**, **block** and **file**. The exam's most common storage question is really "which access pattern is this?" in disguise. Only after you pick the paradigm do the product, tier and price matter.`,
      },
      {
        heading: 'Object storage: whole things, by key, over HTTPS (Amazon S3)',
        body: `An **object** is a blob of bytes (the data), a bag of **metadata** (content type, custom tags) and a **key** (its unique name, like \`photos/2026/08/cat.jpg\`). You talk to object storage with HTTPS API calls: \`PUT\` to write a whole object, \`GET\` to read it, \`DELETE\` to remove it.

- **No in-place edits.** To change one byte you upload a new version of the whole object. That is why you never run a database on S3.
- **Effectively unlimited scale.** No volume to size; you pay per GB actually stored (about $0.023 per GB-month in S3 Standard) plus requests.
- **Accessed from anywhere** with an internet or VPC endpoint path, by any number of clients at once.

Fits: static website assets, images and video, backups, logs, data lakes, anything "web-scale".`,
      },
      {
        heading: 'Block storage: a raw disk the operating system formats (EBS, instance store)',
        body: `**Block storage** presents a raw disk made of fixed-size blocks. The server's operating system formats it with a filesystem (ext4, XFS, NTFS) and can then read or write **any byte, randomly, with very low latency**. To the instance it looks exactly like a physical drive.

- **Amazon EBS** (Elastic Block Store) is a network-attached disk that lives in one Availability Zone (AZ) and survives the instance being stopped.
- **Instance store** is a disk physically inside the host machine: fastest of all, but data vanishes when the instance stops.
- You provision a **fixed size** (for example 500 GiB) and pay for it whether full or empty.
- Normally attached to **one instance at a time** (the exception, EBS Multi-Attach on io1/io2, needs a cluster-aware filesystem).

Fits: boot volumes, relational databases, anything that needs low-latency random I/O on one server.`,
      },
      {
        heading: 'File storage: folders shared over a network protocol (EFS, FSx)',
        body: `**File storage** gives you a hierarchy of folders and files, with permissions and locking, served over a network protocol:

- **NFS** (Network File System): the Linux/Unix standard, port 2049.
- **SMB** (Server Message Block): the Windows standard, port 445, usually tied to Active Directory.
- **Lustre**: a parallel filesystem for high-performance computing (HPC).

The killer feature is **many clients mounting the same share at the same time** and seeing a consistent view. **Amazon EFS** is elastic NFS for Linux; the **Amazon FSx** family gives you managed Windows File Server, Lustre, NetApp ONTAP and OpenZFS.

Fits: shared content directories, user home directories, CMS uploads shared by a web fleet, lift-and-shift apps that expect a mounted drive.`,
      },
      {
        heading: 'Side by side',
        body: `Memorise the rows of this table; most storage questions can be answered by locating the scenario on it.`,
        table: {
          headers: ['', 'Object (S3)', 'Block (EBS, instance store)', 'File (EFS, FSx)'],
          rows: [
            ['Unit of access', 'Whole object + metadata, by key', 'Raw blocks on a volume', 'Files and folders'],
            ['Interface', 'HTTPS REST API (GET/PUT)', 'Attached disk; OS formats it', 'NFS, SMB or Lustre mount'],
            ['Partial update', 'No: rewrite the whole object', 'Yes: any byte, random', 'Yes, with file locking'],
            ['Concurrent clients', 'Unlimited', 'One instance (Multi-Attach: up to 16, io1/io2)', 'Thousands at once'],
            ['Capacity', 'Unlimited, pay per GB stored', 'Fixed provisioned size', 'Elastic (EFS) or provisioned (FSx)'],
            ['Scope', 'Region (data in 3+ AZs)', 'One AZ (EBS) or one host (instance store)', 'Region (EFS Standard) or AZ(s)'],
            ['Typical use', 'Media, backups, data lakes, logs', 'Boot disks, databases', 'Shared content, home dirs, HPC'],
          ],
        },
      },
      {
        heading: 'Exam angle: access pattern first, product second',
        body: `Read the scenario and underline the verbs and nouns that describe **how** data is touched:

- "hundreds of instances need **shared** access", "**mount** on many servers", "**POSIX** permissions" → file (EFS for Linux, FSx for Windows)
- "database needs **low-latency** disk", "**boot** volume", "**IOPS**" → block (EBS; instance store if data is disposable)
- "serve **images to millions**", "**archive** logs", "**data lake**", "**unlimited**", "**static website**" → object (S3)

Then, and only then, worry about cost tiers (storage classes, volume types). A tempting distractor is a cheaper product from the **wrong paradigm**, such as "mount S3 on all 20 servers with a FUSE tool" for a shared POSIX directory. Object storage cannot do byte-level writes or file locks, so that answer is wrong however cheap it looks.`,
      },
    ],
    diagram: {
      title: 'Three ways to reach data',
      groups: [
        { id: 'g-vpc', label: 'VPC', kind: 'vpc', x: 30, y: 6, w: 66, h: 50 },
      ],
      nodes: [
        { id: 'user', label: 'Web users', icon: 'users', x: 10, y: 14 },
        { id: 's3', label: 'Amazon S3', icon: 's3', x: 10, y: 44, sub: 'object, HTTPS' },
        { id: 'db', label: 'DB server', icon: 'ec2', x: 44, y: 16 },
        { id: 'ebs', label: 'EBS volume', icon: 'ebs', x: 44, y: 44, sub: 'block, one AZ' },
        { id: 'web1', label: 'Web server A', icon: 'ec2', x: 66, y: 16 },
        { id: 'web2', label: 'Web server B', icon: 'ec2', x: 86, y: 16 },
        { id: 'efs', label: 'Amazon EFS', icon: 'efs', x: 76, y: 44, sub: 'file, NFS' },
      ],
      edges: [
        { id: 'e-user-s3', from: 'user', to: 's3', label: 'GET object' },
        { id: 'e-db-ebs', from: 'db', to: 'ebs', label: 'random I/O' },
        { id: 'e-w1-efs', from: 'web1', to: 'efs', label: 'mount' },
        { id: 'e-w2-efs', from: 'web2', to: 'efs', label: 'mount' },
      ],
      steps: [
        {
          caption: 'Users fetch a whole photo by its key with an HTTPS GET. Object storage hands back the entire object; there is no partial edit.',
          highlight: ['user', 's3', 'e-user-s3'],
          flow: [{ edge: 'e-user-s3' }],
        },
        {
          caption: 'The database server writes 8 KB pages at random offsets on its EBS volume. Block storage looks like a local disk to the OS.',
          highlight: ['db', 'ebs', 'e-db-ebs'],
          flow: [{ edge: 'e-db-ebs' }, { edge: 'e-db-ebs', reverse: true }],
        },
        {
          caption: 'Both web servers mount the same EFS filesystem over NFS. A file written by A is immediately visible to B: shared file storage.',
          highlight: ['web1', 'web2', 'efs', 'e-w1-efs', 'e-w2-efs'],
          flow: [{ edge: 'e-w1-efs' }, { edge: 'e-w2-efs', reverse: true }],
        },
        {
          caption: 'Wrong fit: web server B cannot also attach the DB server\'s gp3 EBS volume. Standard EBS attaches to one instance at a time.',
          highlight: ['ebs', 'web2'],
          fail: ['ebs'],
        },
        {
          caption: 'The exam skill: match the access pattern (whole objects, random blocks, shared files) to the paradigm, then pick the product.',
          highlight: ['s3', 'ebs', 'efs'],
        },
      ],
    },
    keyFacts: [
      'Object = whole objects by key over HTTPS; block = raw disk the OS formats; file = shared folders over NFS/SMB/Lustre.',
      'S3 objects cannot be edited in place; changing one byte means uploading the object again.',
      'EBS lives in one AZ and normally attaches to one instance at a time.',
      'EBS Multi-Attach: io1/io2 only, up to 16 Nitro instances in the same AZ, needs a cluster-aware filesystem.',
      'EFS = NFS for Linux (port 2049); FSx for Windows File Server = SMB (port 445) with Active Directory.',
      'S3 capacity is unlimited and billed per GB stored; EBS is billed per GB provisioned, used or not.',
      'Instance store is block storage physically in the host: fastest, but ephemeral.',
    ],
    examTips: [
      '"Many instances need shared access to the same files" → file storage (EFS for Linux, FSx for Windows), never EBS.',
      '"Database needs low-latency disk" or "boot volume" → block storage (EBS).',
      '"Serve images to millions", "archive logs", "data lake", "unlimited capacity" → object storage (S3).',
      'Decide the paradigm before you compare prices: a cheap answer from the wrong paradigm is still wrong.',
      '"POSIX permissions" or "file locking" across instances rules out S3 (not POSIX) and plain EBS (single attach).',
    ],
    pitfalls: [
      'Picking EBS Multi-Attach for a shared web directory: it is single-AZ, io1/io2 only, max 16 instances and needs a cluster filesystem.',
      'Mounting S3 with a FUSE tool to fake a shared filesystem: no locking, no partial writes, not POSIX.',
      'Assuming EBS is Regional: a volume lives in one AZ and only attaches to instances in that AZ.',
      'Treating instance store like EBS: its data is lost on stop, hibernate or terminate.',
    ],
    prosCons: [
      {
        option: 'Object storage (S3)',
        pros: ['Unlimited, pay-per-GB-stored', '11 nines durability across AZs', 'Any number of clients over HTTPS', 'Cheap archive tiers'],
        cons: ['No in-place edits or file locking', 'Higher per-request latency than a local disk', 'Not mountable as a real filesystem'],
        useWhen: 'Whole-file reads and writes at web scale: media, backups, logs, data lakes, static sites.',
      },
      {
        option: 'Block storage (EBS / instance store)',
        pros: ['Lowest latency, random byte-level I/O', 'Behaves like a local disk (boot, databases)', 'Tunable IOPS and throughput'],
        cons: ['Fixed provisioned size', 'One AZ, usually one instance', 'You manage the filesystem'],
        useWhen: 'A single server needs a fast disk: boot volumes, relational databases, transactional apps.',
      },
      {
        option: 'File storage (EFS / FSx)',
        pros: ['Many clients mount the same share', 'Folders, permissions and locking', 'Lift-and-shift friendly'],
        cons: ['Costs more per GB than S3', 'Protocol-specific (NFS vs SMB)', 'Higher latency than local block'],
        useWhen: 'Shared directories across a fleet, home directories, Windows shares, HPC scratch space.',
      },
    ],
    services: ['s3', 'ebs', 'instance-store', 'efs', 'fsx-windows', 'fsx-lustre'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-s3-basics',
    module: 'm3a',
    domain: 'performance',
    title: 'S3 Mental Model & Moving Data Efficiently',
    minutes: 18,
    summary:
      'Explain how buckets, keys, durability and consistency work in S3, and choose multipart upload, Transfer Acceleration, byte-range fetches, prefix design and event notifications for a given performance problem.',
    analogy: {
      title: 'A giant warehouse with numbered shelves and loading docks',
      body: `S3 is a warehouse that never fills up. Each **bucket** is a warehouse with a unique company name painted on it, built in one city (a Region). Every box (an object) gets a label (the key). There are no real rooms inside, just labels like "logs/2026/august/box-17"; the website draws them as folders to be helpful.

The warehouse makes three copies of every box in three separate buildings, so a fire in one doesn't lose your stuff (durability). Big shipments are split across many trucks that drive in parallel (multipart upload). Far-away customers drop parcels at a local depot that forwards them on the company's private highway (Transfer Acceleration). And every time a box arrives, a bell rings to call a worker (event notifications).`,
    },
    sections: [
      {
        heading: 'Buckets, keys and the "no folders" truth',
        body: `A **bucket** is a container for objects. Its name is **globally unique** across all AWS accounts (3–63 characters, lowercase, DNS-compatible), but the bucket and its data live in **one Region** you choose. Data never leaves that Region unless you copy or replicate it.

Each **object** is addressed by its **key**, the full string after the bucket name: in \`s3://acme-media/logs/2026/08/app.log\` the key is \`logs/2026/08/app.log\`. There are **no real directories**. The console shows "folders" by splitting keys on \`/\`, but to S3 that whole string is one flat name. The part before the object name (\`logs/2026/08/\`) is called a **prefix**, and prefixes matter for performance and lifecycle rules.

- Maximum object size: **5 TB** is the long-standing exam number. A single PUT can upload at most **5 GB**; bigger objects must use multipart upload.
- Each object can carry up to 10 **tags** (key-value pairs) used by lifecycle rules, IAM conditions and cost reports.
- A default limit of 10,000 general purpose buckets per account (raised from 100 in 2024; adjustable).`,
      },
      {
        heading: 'Durability, availability and consistency',
        body: `**Durability** is the odds of not **losing** data. S3 Standard is designed for **99.999999999% (11 nines)**: objects are stored redundantly across at least 3 AZs. In plain numbers: store 10 million objects and expect to lose one every 10,000 years.

**Availability** is the odds you can **reach** the data right now. It varies by class: 99.99% for Standard, 99.9% for Standard-IA, 99.5% for One Zone-IA. Durability stays 11 nines in every class (One Zone classes keep that within a single AZ, so an AZ destruction still loses them).

**Consistency**: since December 2020, S3 gives **strong read-after-write consistency** for all PUTs, overwrites and DELETEs, and for LIST operations. Read immediately after a successful write and you get the new data. Older courses that warn about "eventual consistency on overwrite" are obsolete; if an exam option relies on that caveat, it's a distractor.`,
      },
      {
        heading: 'Getting big data in and out fast',
        body: `Four features cover nearly every "upload/download is slow" question.`,
        table: {
          headers: ['Feature', 'What it does', 'Rule / number', 'Pick when'],
          rows: [
            ['Multipart upload', 'Splits one object into parts uploaded in parallel; failed parts are retried alone', 'Required above 5 GB, recommended above 100 MB; up to 10,000 parts of 5 MB–5 GB', 'Large files, flaky networks, maximising throughput'],
            ['Transfer Acceleration', 'Client uploads to the nearest CloudFront edge location, which forwards over the AWS backbone', 'Per-GB surcharge (about $0.04), only charged when it is faster; bucket name must be DNS-compliant, no dots', 'Users far from the bucket\'s Region uploading to one central bucket'],
            ['Byte-range fetch', 'GET with a Range header reads only part of an object; run many in parallel', 'Any range; retries are per range', 'Speed up big downloads, or read just a file header'],
            ['Prefix spreading', 'S3 scales request rate per prefix', '3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD per second per prefix; prefixes are unlimited', 'Very high request rates: spread keys across many prefixes'],
          ],
        },
      },
      {
        heading: 'How the request-rate limit really works',
        body: `S3 partitions a bucket by key prefix automatically. Each prefix supports **3,500 writes and 5,500 reads per second**, and there is **no limit on the number of prefixes**. So a bucket using 10 prefixes (\`img/0/\` … \`img/9/\`) can serve 55,000 GETs per second.

If an application gets **HTTP 503 Slow Down** errors, the fix is to spread keys over more prefixes (date-based like \`2026/08/30/\` or a short hash) and use retries with exponential backoff. S3 scales up partitions gradually, so a sudden 10x burst may see some 503s while it adapts.

For read-heavy content served to the public, the better fix is often **CloudFront** in front of the bucket: edge caching removes most GETs from S3 entirely.

**KMS caveat:** if objects use SSE-KMS encryption, every upload and download also calls AWS KMS, and KMS has its own per-Region request quota (from 5,500 to tens of thousands of requests per second, depending on Region). Enabling **S3 Bucket Keys** cuts those KMS calls by up to 99%.`,
      },
      {
        heading: 'Event notifications: the glue for "process every upload"',
        body: `S3 can emit an event when something happens to an object: \`s3:ObjectCreated:*\`, \`s3:ObjectRemoved:*\`, restore completed, replication failed, and more. Destinations:

- **AWS Lambda**: run code on each object (make a thumbnail, scan a file).
- **Amazon SQS** (standard queues): buffer events so workers process them at their own pace. FIFO queues are not a direct destination.
- **Amazon SNS**: fan out one event to many subscribers.
- **Amazon EventBridge**: turn it on once per bucket and **all** events flow to EventBridge, where rules can filter on any field (key, size, metadata) and send to 20+ target types, including several targets at once, with archive and replay.

Notifications are typically delivered in seconds and are **at-least-once**, so make consumers idempotent (safe to process the same event twice). Native notification filters only match key prefix and suffix (for example prefix \`uploads/\`, suffix \`.jpg\`); you need EventBridge for richer filtering or multiple targets for the same event type.`,
      },
      {
        heading: 'Newer S3 options worth recognising',
        beyond: true,
        body: `These are newer than most study material but can appear as answer options:

- **S3 Express One Zone**: a high-performance class in **directory buckets** located in a single AZ you choose. Single-digit millisecond latency, up to 10x faster than Standard, and hundreds of thousands of requests per second. Use it for ML training data or analytics scratch that sits next to compute in the same AZ. Because it's one AZ, it's not for the only copy of important data.
- **Larger objects**: in December 2025 AWS raised the maximum object size from 5 TB to **50 TB**. Exam questions written earlier still assume 5 TB; the multipart rule (single PUT limited to 5 GB) is unchanged.
- **S3 Select** is closed to new customers (since July 2024); use Amazon Athena to query data in place with SQL instead.`,
      },
    ],
    diagram: {
      title: 'Global upload into one bucket, then processing',
      groups: [
        { id: 'g-region', label: 'us-east-1', kind: 'region', x: 40, y: 6, w: 56, h: 50 },
      ],
      nodes: [
        { id: 'user', label: 'User in Sydney', icon: 'user', x: 8, y: 30 },
        { id: 'edge', label: 'Edge location', icon: 'cloudfront', x: 26, y: 30, sub: 'Sydney' },
        { id: 's3', label: 'Media bucket', icon: 's3', x: 52, y: 30, sub: 'uploads/' },
        { id: 'eb', label: 'EventBridge', icon: 'eventbridge', x: 72, y: 16 },
        { id: 'lambda', label: 'Thumbnail fn', icon: 'lambda', x: 88, y: 30 },
        { id: 'sqs', label: 'Audit queue', icon: 'sqs', x: 72, y: 46 },
      ],
      edges: [
        { id: 'e-user-edge', from: 'user', to: 'edge', label: 'parts' },
        { id: 'e-edge-s3', from: 'edge', to: 's3', label: 'AWS backbone' },
        { id: 'e-s3-eb', from: 's3', to: 'eb', label: 'ObjectCreated' },
        { id: 'e-eb-lambda', from: 'eb', to: 'lambda' },
        { id: 'e-eb-sqs', from: 'eb', to: 'sqs' },
      ],
      steps: [
        {
          caption: 'A 2 GB video is split into 100 MB parts by multipart upload. Parts upload in parallel; a failed part is retried alone.',
          highlight: ['user', 'e-user-edge'],
          flow: [{ edge: 'e-user-edge' }],
        },
        {
          caption: 'Transfer Acceleration: parts land at the nearest edge location and travel over the AWS backbone instead of the public internet.',
          highlight: ['edge', 'e-edge-s3', 's3'],
          flow: [{ edge: 'e-edge-s3' }],
        },
        {
          caption: 'S3 assembles the parts into one object. Strong read-after-write consistency: an immediate GET returns the new video.',
          highlight: ['s3', 'g-region'],
        },
        {
          caption: 'S3 emits an ObjectCreated event to EventBridge, which can filter on key, size or metadata.',
          highlight: ['s3', 'eb', 'e-s3-eb'],
          flow: [{ edge: 'e-s3-eb' }],
        },
        {
          caption: 'One event, two targets: EventBridge triggers the thumbnail Lambda and drops a copy in an SQS audit queue.',
          highlight: ['eb', 'lambda', 'sqs', 'e-eb-lambda', 'e-eb-sqs'],
          flow: [{ edge: 'e-eb-lambda' }, { edge: 'e-eb-sqs' }],
        },
      ],
    },
    keyFacts: [
      'Bucket names are globally unique; the bucket and its data live in one Region.',
      'Keys are flat strings; "folders" are just key prefixes rendered by the console.',
      'Max object size 5 TB (exam number; AWS raised it to 50 TB in Dec 2025); single PUT max 5 GB.',
      'Multipart upload: required above 5 GB, recommended above 100 MB, up to 10,000 parts.',
      'S3 durability is 11 nines (99.999999999%); Standard availability 99.99%.',
      'Strong read-after-write consistency for all operations since December 2020.',
      '3,500 writes and 5,500 reads per second per prefix, unlimited prefixes.',
      'Event destinations: Lambda, SQS standard, SNS, EventBridge (EventBridge = all events, rich filters, multiple targets).',
      'SSE-KMS adds a KMS call per request; S3 Bucket Keys cut KMS requests by up to 99%.',
    ],
    examTips: [
      '"Global users upload large files to a bucket in one Region, slow uploads" → S3 Transfer Acceleration (plus multipart upload).',
      '"Uploads of multi-GB files fail midway on an unreliable network" → multipart upload, which retries only failed parts.',
      '"503 Slow Down at high request rates" → spread keys across more prefixes; for public reads put CloudFront in front.',
      '"Process every uploaded file automatically" → S3 event notification to Lambda (or SQS to buffer bursts).',
      '"Several consumers need the same S3 event with advanced filtering" → EventBridge, not native notifications.',
      '"Download only the header of large files" or "parallelise a big download" → byte-range fetches.',
      'Durability = not losing data; availability = reaching it now. If a question asks about surviving an AZ loss, durability across AZs is the property.',
    ],
    pitfalls: [
      'Choosing Transfer Acceleration to beat a saturated office link: it speeds the long-distance path, not the customer\'s own last-mile bandwidth.',
      'Believing S3 has eventual consistency for overwrites: that changed in 2020.',
      'Assuming a bucket is global because its name is: the data lives in one Region.',
      'Using native event notifications when you need two destinations for the same event type and prefix: use EventBridge or SNS fan-out.',
      'Forgetting KMS request quotas when an SSE-KMS bucket is hammered: enable Bucket Keys.',
    ],
    prosCons: [
      {
        option: 'Native S3 event notifications',
        pros: ['Simple, no extra service', 'Direct to Lambda, SQS or SNS'],
        cons: ['Filters on key prefix/suffix only', 'Overlapping rules for one event type cannot target multiple destinations'],
        useWhen: 'One consumer per event type with simple key-based filtering.',
      },
      {
        option: 'EventBridge integration',
        pros: ['All events, filter on any field', 'Many targets per rule, archive and replay', 'Cross-account event buses'],
        cons: ['Slightly more setup', 'Per-event EventBridge cost'],
        useWhen: 'Several consumers, advanced filtering, or integration with many AWS targets.',
      },
      {
        option: 'Transfer Acceleration',
        pros: ['Faster long-distance uploads via edge network', 'No client architecture change beyond the endpoint'],
        cons: ['Per-GB surcharge', 'No help if the client\'s own link is the bottleneck'],
        useWhen: 'Geographically distant users uploading to a single bucket.',
      },
    ],
    services: ['s3', 'cloudfront', 'lambda', 'sqs', 'sns', 'eventbridge', 'kms'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-s3-protection',
    module: 'm3a',
    domain: 'resilient',
    title: 'S3 Versioning, Replication & Object Lock',
    minutes: 18,
    summary:
      'Protect S3 data against accidental deletion, Regional disaster and tampering by combining versioning, MFA Delete, CRR/SRR replication and Object Lock in the right mode.',
    analogy: {
      title: 'Drafts, a copy in another city, and a sealed evidence locker',
      body: `**Versioning** is a document app that keeps every draft. If someone "deletes" the file, the app just puts a sticky note saying "deleted" on top; peel off the note and the file is back.

**Replication** is a photocopier that mails a copy of every new page to an office in another city, so a flood in one city doesn't lose the records.

**Object Lock** is a police evidence locker with a time lock. In **Compliance** mode, nobody can open it before the date, not even the police chief. In **Governance** mode, the chief has a special key. A **legal hold** is a "do not open until further notice" tag with no end date.`,
    },
    sections: [
      {
        heading: 'Versioning: undo for every object',
        body: `**Versioning** is a bucket-level setting with three states: **unversioned** (the default), **enabled**, and **suspended**. Once enabled, you can never return to unversioned, only suspend (existing versions are kept).

With versioning on:

- Every **PUT** to an existing key creates a **new version** with its own version ID; the old one is kept.
- A plain **DELETE** doesn't remove anything. It adds a **delete marker**, which becomes the "current" version, so GETs return 404. **Delete the delete marker** and the object reappears.
- Deleting a **specific version ID** is a permanent delete, which is what you protect against with MFA Delete or Object Lock.
- Each version is billed as a full object. A 100 MB file overwritten 10 times costs 1 GB. Use lifecycle rules (**NoncurrentVersionExpiration**, for example "delete noncurrent versions after 30 days, keep the newest 3") to cap the cost.

Versioning is the **prerequisite for replication, Object Lock and MFA Delete**.`,
      },
      {
        heading: 'MFA Delete',
        body: `**MFA Delete** requires a multi-factor authentication code to (1) **permanently delete an object version** or (2) **change the bucket's versioning state**. Quirks the exam likes:

- Only the **bucket owner's root user** can enable it, and only via the CLI/API (not the console).
- It raises the bar against a compromised IAM user or a careless script, but an authorized root user with the MFA device can still permanently delete. It is **not** immutability.`,
      },
      {
        heading: 'Replication: CRR and SRR',
        body: `**S3 Replication** asynchronously copies new objects from a source bucket to one or more destination buckets, in the same or another account.

- **CRR (Cross-Region Replication)**: destination in another Region. Use for disaster recovery, compliance rules that require a copy at a distance, and lower latency for users near the other Region.
- **SRR (Same-Region Replication)**: destination in the same Region. Use to aggregate logs from many buckets into one, or keep a live copy for a test account while data stays in-country.

How it behaves:

- **Versioning must be on in both** source and destination.
- S3 needs an **IAM role** it assumes to read the source and write the destination.
- Only objects written **after** the rule is created replicate. Existing objects (and failed ones) need **S3 Batch Replication**.
- **Delete markers** replicate only if you turn that option on. **Deletes of a specific version are never replicated**, so a malicious permanent delete in the source can't wipe the replica.
- Replication is **not chained**: A→B and B→C does not copy A's objects to C.
- You can change the storage class (replicate to Glacier Deep Archive for a cheap DR copy) and the owner (to the destination account) on the way.
- Most objects replicate within 15 minutes. **S3 Replication Time Control (RTC)** adds an SLA: 99.99% of objects within **15 minutes**, plus metrics and alerts.
- SSE-KMS objects replicate only if you allow it in the rule and grant the role the destination KMS key.`,
      },
      {
        heading: 'Object Lock: write once, read many (WORM)',
        body: `**Object Lock** stops object versions from being deleted or overwritten for a period. It requires versioning (and enabling Object Lock turns versioning on permanently). It can be enabled at bucket creation or, since 2023, on existing buckets.

Two **retention modes**, set per object version or as a bucket default:

- **Compliance mode**: **no one**, including the root user, can delete the version or shorten its retention until the date passes. You can only lengthen it. This is the answer to SEC 17a-4 / FINRA / "regulators require immutability".
- **Governance mode**: users with the \`s3:BypassGovernanceRetention\` permission can delete or shorten retention by passing a bypass header. Use it to protect against most users while keeping an admin escape hatch, or to test a policy before switching to Compliance.

**Legal hold** is separate from retention: an on/off flag per version with **no expiry**, set or removed by anyone with \`s3:PutObjectLegalHold\`. It's for litigation ("keep everything about case 42 until we say so").

Object Lock protects **versions**. A user can still upload a newer version or add a delete marker (the locked version remains underneath).`,
      },
      {
        heading: 'Which protection stops what?',
        body: `Line up the threat with the control. Many questions offer weaker controls as distractors.`,
        table: {
          headers: ['Control', 'Protects against', 'Can an admin/root undo it?', 'Typical trigger phrase'],
          rows: [
            ['Versioning', 'Accidental overwrite or delete', 'Yes, by deleting versions', '"Recover a previous version", "accidental deletion"'],
            ['MFA Delete', 'Permanent deletes without MFA', 'Yes, root with the MFA device', '"Require MFA to delete versions"'],
            ['Bucket policy Deny on Delete', 'Most principals deleting', 'Yes, an admin edits the policy', 'Rarely the full answer'],
            ['Object Lock Governance', 'Deletes by most users', 'Yes, with BypassGovernanceRetention', '"Allow some admins to override"'],
            ['Object Lock Compliance', 'Deletes and retention changes by everyone', 'No, not even root, until expiry', '"No one, including administrators", "WORM", regulators'],
            ['Legal hold', 'Deletes, with no fixed end date', 'Yes, whoever has PutObjectLegalHold', '"Litigation", "indefinitely"'],
            ['CRR to another Region/account', 'Region loss; source account compromise', 'Only with access to the destination', '"Disaster recovery", "copy in another Region"'],
          ],
        },
      },
      {
        heading: 'Backups beyond replication',
        beyond: true,
        body: `Replication copies mistakes too: if a bad job overwrites 1 million objects, the new (bad) versions replicate. Two complements:

- **AWS Backup for S3** takes continuous or periodic backups of a bucket with point-in-time restore (up to 35 days for continuous), managed with the same backup plans as EBS, RDS and EFS. A **Backup Vault Lock** gives compliance-mode immutability to the backups themselves.
- **Cross-account replication** with Object Lock on the destination isolates a copy even from someone who fully compromises the source account.`,
      },
    ],
    diagram: {
      title: 'Versioned bucket, CRR copy and a blocked delete',
      groups: [
        { id: 'g-src', label: 'eu-west-1 (source)', kind: 'region', x: 22, y: 6, w: 32, h: 48 },
        { id: 'g-dst', label: 'eu-central-1 (DR)', kind: 'region', x: 62, y: 6, w: 32, h: 48 },
      ],
      nodes: [
        { id: 'app', label: 'Audit app', icon: 'server', x: 8, y: 18 },
        { id: 'admin', label: 'Admin', icon: 'user', x: 8, y: 44 },
        { id: 'src', label: 'Audit logs bucket', icon: 's3', x: 38, y: 30, sub: 'versioned + Lock' },
        { id: 'role', label: 'Replication role', icon: 'iam-role', x: 38, y: 46 },
        { id: 'dst', label: 'DR bucket', icon: 's3', x: 78, y: 30, sub: 'Deep Archive class' },
      ],
      edges: [
        { id: 'e-app-src', from: 'app', to: 'src', label: 'PUT log v1, v2' },
        { id: 'e-src-dst', from: 'src', to: 'dst', label: 'CRR (async)' },
        { id: 'e-admin-src', from: 'admin', to: 'src', label: 'DELETE version' },
      ],
      steps: [
        {
          caption: 'The app writes a log, then overwrites it. Versioning keeps both v1 and v2, each with its own version ID.',
          highlight: ['app', 'src', 'e-app-src'],
          flow: [{ edge: 'e-app-src' }],
        },
        {
          caption: 'A CRR rule, using an IAM role S3 assumes, asynchronously copies each new version to a DR bucket in another Region.',
          highlight: ['src', 'role', 'dst', 'e-src-dst'],
          flow: [{ edge: 'e-src-dst' }],
        },
        {
          caption: 'The destination rule writes replicas straight into Glacier Deep Archive: a cheap DR copy that is rarely read.',
          highlight: ['dst', 'g-dst'],
        },
        {
          caption: 'An admin tries to permanently delete v1. Object Lock in Compliance mode blocks it, even for the root user.',
          highlight: ['admin', 'e-admin-src', 'src'],
          flow: [{ edge: 'e-admin-src', color: 'bad' }],
          fail: ['e-admin-src'],
        },
        {
          caption: 'A plain DELETE only adds a delete marker. Remove the marker and the object is back; permanent version deletes never replicate.',
          highlight: ['src', 'dst'],
        },
      ],
    },
    keyFacts: [
      'Versioning states: unversioned, enabled, suspended. Once enabled it can never go back to unversioned.',
      'A DELETE without a version ID adds a delete marker; removing the marker restores the object.',
      'Every version is billed as a full object; use NoncurrentVersionExpiration lifecycle rules.',
      'MFA Delete: only the root user, only via CLI/API, guards permanent version deletes and versioning changes.',
      'Replication requires versioning on source and destination, plus an IAM role.',
      'Existing objects need S3 Batch Replication; replication is not chained (A→B→C).',
      'Version-specific deletes are never replicated; delete marker replication is optional.',
      'S3 RTC: 99.99% of objects replicated within 15 minutes, with metrics.',
      'Object Lock Compliance: nobody, including root, can delete or shorten retention. Governance: bypass with s3:BypassGovernanceRetention.',
      'Legal hold has no expiry and is independent of the retention period.',
    ],
    examTips: [
      '"Cannot be deleted or altered by anyone, including administrators, for N years" → Object Lock in Compliance mode with N-year retention. A bucket policy denying deletes fails because an admin can edit the policy; MFA Delete fails because root can still delete.',
      '"Protect against accidental deletion and allow recovery of previous versions" → enable versioning (add MFA Delete for extra protection).',
      '"Copy of data in another Region for DR" → CRR. "Aggregate logs from several buckets in the same Region" → SRR.',
      '"Replicate objects that already exist in the bucket" → S3 Batch Replication; a new replication rule only covers new writes.',
      '"Replication must complete within 15 minutes with an SLA" → S3 Replication Time Control.',
      '"Keep records indefinitely during litigation" → legal hold.',
    ],
    pitfalls: [
      'Thinking replication copies existing objects automatically: only new ones, unless you run Batch Replication.',
      'Expecting a delete in the source to delete the replica: version deletes are never replicated.',
      'Choosing Governance mode when the question says "no one, not even root": that is Compliance.',
      'Forgetting that versioning multiplies storage cost on frequently overwritten objects.',
      'Assuming chained replication: A→B and B→C does not move A\'s objects to C.',
    ],
    prosCons: [
      {
        option: 'Object Lock Compliance mode',
        pros: ['True immutability, even from root', 'Meets SEC 17a-4 / FINRA-style WORM rules'],
        cons: ['Mistakes are permanent: wrong retention cannot be shortened', 'You pay for the data until retention ends'],
        useWhen: 'Regulators require that nobody can delete or alter data for a fixed period.',
      },
      {
        option: 'Object Lock Governance mode',
        pros: ['Blocks almost everyone', 'Privileged users can override when needed'],
        cons: ['Not true WORM: a user with bypass permission can delete'],
        useWhen: 'Strong protection with an admin escape hatch, or testing retention settings before Compliance.',
      },
      {
        option: 'Versioning + MFA Delete',
        pros: ['Cheap protection against accidents', 'Easy recovery of old versions'],
        cons: ['Root with MFA can still delete', 'Root-only CLI setup'],
        useWhen: 'Accidental deletion is the main threat and immutability is not required.',
      },
      {
        option: 'Cross-Region Replication',
        pros: ['Survives loss of a Region', 'Can change storage class and owner', 'Can lower read latency for remote users'],
        cons: ['Copies bad writes too', 'Pays storage twice plus inter-Region transfer'],
        useWhen: 'DR or compliance needs a copy in another Region or account.',
      },
    ],
    services: ['s3', 's3-replication', 'iam-role', 's3-glacier', 'backup'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-s3-security',
    module: 'm3a',
    domain: 'secure',
    title: 'S3 Security Layers',
    minutes: 20,
    summary:
      'Lock down S3 from the outside in with Block Public Access, bucket policies, Object Ownership, presigned URLs, access points, encryption and CloudFront Origin Access Control, and pick the right layer for a given sharing requirement.',
    analogy: {
      title: 'A bank vault with a master lock, house rules and day passes',
      body: `**Block Public Access** is the bank's master lock on the front door: even if a clerk writes "the vault is open to the public" on a sign, the master lock wins.

The **bucket policy** is the vault's rulebook: "staff from the partner bank may enter", "only via the armoured entrance", "everything stored must be in a sealed bag".

A **presigned URL** is a day pass a manager signs: whoever holds it can collect one specific safe-deposit box until 5 pm, using the manager's authority.

**Access points** are separate side doors, each with its own guard and rule sheet, for different departments using the same vault.

**CloudFront with OAC** is the armoured courier: customers never enter the vault; the courier alone has a key and delivers copies from nearby branches.`,
    },
    sections: [
      {
        heading: 'How S3 decides: the evaluation logic',
        body: `Every request to S3 is checked against all policies that apply: the caller's **IAM policies** (identity-based), the **bucket policy** (resource-based), **ACLs** if still enabled, **Block Public Access**, any **SCPs** from AWS Organizations, and VPC endpoint policies.

Three rules decide the result:

- **Default deny.** Nothing is allowed unless something allows it.
- **An explicit Deny anywhere wins** over any Allow.
- **Same account:** an Allow in the IAM policy **or** the bucket policy is enough. **Cross-account:** you need an Allow in **both** the caller's IAM policy (in their account) **and** the bucket policy (in yours).

New buckets are private by default: Block Public Access on, ACLs disabled, and SSE-S3 encryption applied to every new object.`,
      },
      {
        heading: 'Block Public Access: the master switch',
        body: `**Block Public Access (BPA)** has four settings that can be applied at the **account** level and the **bucket** level (account level overrides bucket level):

- Block public access granted through **new ACLs** / through **any ACLs**.
- Block public access granted through **new bucket policies** / through **any public bucket or access point policies** (this one also restricts cross-account access for a bucket whose policy is public).

BPA **overrides** any policy or ACL that tries to make data public. It's on by default for all new buckets (since April 2023). In a "bucket was accidentally made public" question, BPA at the **account level** (or as an SCP-enforced organization standard) is the preventive control. **Amazon Macie** and **IAM Access Analyzer for S3** are the detective tools that report public or cross-account buckets.`,
      },
      {
        heading: 'Bucket policies: the main tool for bucket-wide rules',
        body: `A **bucket policy** is a resource-based JSON policy attached to the bucket (max 20 KB). It names a **Principal** (who), **Action** (what), **Resource** (which bucket/objects) and optional **Condition** keys. Use it to:

- **Grant cross-account access**: Principal \`arn:aws:iam::111122223333:root\`, plus an IAM Allow in that account.
- **Enforce TLS**: Deny when \`aws:SecureTransport\` is \`false\`.
- **Restrict to your organization**: Deny unless \`aws:PrincipalOrgID\` equals \`o-abc123\`, so one statement covers every current and future account.
- **Restrict to a network path**: Deny unless \`aws:SourceVpce\` is your VPC endpoint ID (or \`aws:SourceIp\` is your office range).
- **Require encryption headers**: Deny PutObject unless \`s3:x-amz-server-side-encryption\` is \`aws:kms\`.

Rule of thumb: IAM policies say "what can this **user** do across AWS"; bucket policies say "who can touch **this bucket**".`,
      },
      {
        heading: 'ACLs and Object Ownership: legacy, turn them off',
        body: `**ACLs** (access control lists) are the original per-bucket and per-object grant mechanism, predating IAM. They can't express conditions or denies and are hard to audit.

**S3 Object Ownership** controls them. The setting **Bucket owner enforced** (the default for new buckets since April 2023) **disables ACLs entirely** and makes the bucket owner own every object, even ones uploaded by other accounts. That fixes the classic problem where a partner account uploads a file and the bucket owner can't read it.

Only pick an ACL-based answer in a niche legacy case, such as S3 server access logging to a bucket that still requires the log-delivery ACL (modern log delivery uses a bucket policy instead).`,
      },
      {
        heading: 'Presigned URLs, access points and Object Lambda',
        body: `**Presigned URL**: a normal S3 URL with a signature and expiry in the query string, generated with someone's credentials. Anyone holding it can perform **that one operation** (GET or PUT) on **that one object** until it expires, using the **signer's permissions**. If the signer loses permission, the URL stops working.

- Max lifetime: up to **7 days** when signed with IAM user keys; it can't outlive temporary credentials (a role session of 1 hour gives at most about 1 hour). The console caps it at 12 hours.
- Patterns: "let a user download a private invoice for 24 hours"; "let the browser **upload directly to S3**" so app servers never handle the bytes.

**S3 Access Points**: named network endpoints for one bucket, each with **its own policy** (and optionally restricted to a single VPC). With 30 teams sharing a data-lake bucket, give each team an access point instead of one 20 KB monster bucket policy. Limit: 10,000 access points per Region per account by default.

**S3 Object Lambda**: an access point that runs a Lambda function on GET, so a consumer sees **transformed** data (PII redacted, images resized, format converted) without you storing a second copy. AWS stopped onboarding new customers to Object Lambda in November 2025, but it still appears as an exam answer for "transform on read without duplicating data".`,
      },
      {
        heading: 'Encryption options',
        beyond: true,
        body: `All new objects are encrypted at rest by default with **SSE-S3** (since January 2023). Your choices:`,
        table: {
          headers: ['Option', 'Who manages the key', 'Audit trail', 'Pick when'],
          rows: [
            ['SSE-S3', 'S3 (AES-256), fully managed', 'No per-key CloudTrail', 'Default; "encrypt at rest" with least effort'],
            ['SSE-KMS', 'AWS KMS key (AWS managed or customer managed)', 'Every use logged in CloudTrail; key policy controls who decrypts', '"Control and audit key usage", "rotate keys", separation of duties'],
            ['DSSE-KMS', 'KMS, two independent layers of encryption', 'CloudTrail', 'Compliance requiring dual-layer encryption'],
            ['SSE-C', 'You send the key with every request; S3 never stores it', 'You track it', '"Company must manage its own keys outside AWS" (S3 still does the crypto)'],
            ['Client-side', 'You encrypt before upload', 'Yours', '"Data must be encrypted before it leaves the premises"'],
          ],
        },
      },
      {
        heading: 'Static websites and the CloudFront + OAC pattern',
        body: `S3 **static website hosting** serves a bucket's files at a website endpoint like \`http://acme.s3-website-us-east-1.amazonaws.com\`. Limits: **HTTP only** (no HTTPS on the website endpoint), and the bucket must be **public**, which fights BPA.

The production pattern is **CloudFront in front of a private bucket** with **Origin Access Control (OAC)**:

- The bucket stays **fully private**, BPA on.
- The bucket policy allows only the \`cloudfront.amazonaws.com\` service principal, with a condition on your distribution's ARN.
- Viewers get **HTTPS**, a **custom domain** with a free certificate from **ACM** (which must be in us-east-1 for CloudFront), edge **caching** and optional **AWS WAF**.
- OAC replaces the legacy **OAI** (Origin Access Identity) and supports SSE-KMS objects, PUT/DELETE and all Regions. If you see OAI, it still works, but OAC is the current answer.

A related private-network control: EC2 instances in a private subnet should reach S3 through a **gateway VPC endpoint** (free), and the bucket policy can require \`aws:SourceVpce\` so the data is unreachable from the internet even with valid credentials.`,
      },
    ],
    diagram: {
      title: 'Private bucket behind CloudFront with OAC',
      groups: [
        { id: 'g-region', label: 'us-east-1', kind: 'region', x: 52, y: 6, w: 44, h: 50 },
      ],
      nodes: [
        { id: 'viewer', label: 'Viewer', icon: 'user', x: 8, y: 16 },
        { id: 'attacker', label: 'Direct request', icon: 'attacker', x: 8, y: 44 },
        { id: 'cf', label: 'CloudFront', icon: 'cloudfront', x: 32, y: 16, sub: 'HTTPS, ACM cert' },
        { id: 's3', label: 'Private bucket', icon: 's3', x: 72, y: 30, sub: 'BPA on, OAC policy' },
        { id: 'api', label: 'Upload API', icon: 'lambda', x: 32, y: 44, sub: 'signs URLs' },
        { id: 'kms', label: 'KMS key', icon: 'kms', x: 88, y: 46 },
      ],
      edges: [
        { id: 'e-viewer-cf', from: 'viewer', to: 'cf', label: 'HTTPS GET' },
        { id: 'e-cf-s3', from: 'cf', to: 's3', label: 'OAC signed' },
        { id: 'e-att-s3', from: 'attacker', to: 's3', label: 'GET object' },
        { id: 'e-viewer-api', from: 'viewer', to: 'api', label: 'request URL', dashed: true },
        { id: 'e-s3-kms', from: 's3', to: 'kms', label: 'SSE-KMS' },
      ],
      steps: [
        {
          caption: 'The viewer requests an image over HTTPS from CloudFront, using a custom domain with an ACM certificate.',
          highlight: ['viewer', 'cf', 'e-viewer-cf'],
          flow: [{ edge: 'e-viewer-cf' }],
        },
        {
          caption: 'On a cache miss CloudFront signs the origin request with OAC. The bucket policy allows only this distribution\'s ARN.',
          highlight: ['cf', 's3', 'e-cf-s3'],
          flow: [{ edge: 'e-cf-s3' }, { edge: 'e-cf-s3', reverse: true }],
        },
        {
          caption: 'Someone tries the S3 URL directly. Block Public Access and the policy deny it: the bucket is never public.',
          highlight: ['attacker', 'e-att-s3', 's3'],
          flow: [{ edge: 'e-att-s3', color: 'bad' }],
          fail: ['e-att-s3'],
        },
        {
          caption: 'For uploads, the viewer asks the API for a presigned PUT URL, valid for 15 minutes with the signer\'s permissions.',
          highlight: ['viewer', 'api', 'e-viewer-api'],
          flow: [{ edge: 'e-viewer-api' }],
        },
        {
          caption: 'Objects are encrypted with SSE-KMS: every decrypt is checked against the key policy and logged in CloudTrail.',
          highlight: ['s3', 'kms', 'e-s3-kms'],
          flow: [{ edge: 'e-s3-kms' }],
        },
      ],
    },
    keyFacts: [
      'Explicit Deny always wins; same-account needs one Allow (IAM or bucket policy); cross-account needs both.',
      'Block Public Access is on by default and overrides any public ACL or policy; set it at account level to cover every bucket.',
      'Object Ownership "Bucket owner enforced" disables ACLs (default since April 2023).',
      'Useful bucket policy conditions: aws:SecureTransport, aws:PrincipalOrgID, aws:SourceVpce, aws:SourceIp, s3:x-amz-server-side-encryption.',
      'Presigned URLs use the signer\'s permissions; max 7 days with IAM user keys, never longer than the signing credentials.',
      'Access points: one per application or team, each with its own policy, optionally VPC-only.',
      'SSE-S3 is applied to all new objects by default since January 2023.',
      'Website endpoints are HTTP only; use CloudFront + OAC for HTTPS with a private bucket. ACM certs for CloudFront live in us-east-1.',
      'OAC supersedes OAI and supports SSE-KMS.',
    ],
    examTips: [
      '"Share a private file with an external user for 24 hours without creating credentials" → presigned URL.',
      '"Users upload directly to S3 so the app servers do not handle the file" → presigned PUT URL issued by the backend.',
      '"Prevent any bucket in the account from ever being made public" → account-level Block Public Access (enforced with an SCP in an organization).',
      '"Allow access only from accounts in our AWS Organization" → bucket policy condition aws:PrincipalOrgID.',
      '"Enforce encryption in transit" → bucket policy Deny when aws:SecureTransport is false.',
      '"Static website with HTTPS and a private bucket" → CloudFront with Origin Access Control, not S3 website hosting alone.',
      '"Many applications share one bucket and the bucket policy is unmanageable" → S3 Access Points, one per application.',
      '"Audit who used the encryption key" or "control key rotation" → SSE-KMS with a customer managed key.',
    ],
    pitfalls: [
      'Using ACLs for new designs: AWS recommends disabling them with Bucket owner enforced.',
      'Forgetting the IAM side of cross-account access: the bucket policy alone is not enough.',
      'Picking S3 website hosting when the question requires HTTPS or a private bucket.',
      'Assuming a presigned URL works after the signer\'s role session expires: it stops at the credential expiry.',
      'Treating SSE-C as "AWS manages the key": the customer supplies the key on every request.',
      'Using a "Deny DeleteObject" bucket policy as an immutability control: admins can edit the policy (use Object Lock).',
    ],
    prosCons: [
      {
        option: 'Presigned URL',
        pros: ['No AWS credentials for the end user', 'Scoped to one object and one operation', 'Time-limited'],
        cons: ['Anyone holding the URL can use it until expiry', 'Must be generated by trusted backend code'],
        useWhen: 'Temporary download or direct browser upload of individual objects.',
      },
      {
        option: 'Bucket policy',
        pros: ['Central, bucket-wide rules', 'Rich conditions (org, VPC endpoint, TLS)', 'Enables cross-account access'],
        cons: ['20 KB size limit', 'Gets unwieldy with many consumers'],
        useWhen: 'Bucket-wide guardrails and cross-account grants.',
      },
      {
        option: 'Access points',
        pros: ['Per-application policy and endpoint', 'Can be restricted to a VPC', 'Scales to thousands of consumers'],
        cons: ['Another layer to audit', 'Bucket policy must delegate to access points'],
        useWhen: 'A shared data lake bucket used by many teams or apps.',
      },
      {
        option: 'CloudFront + OAC',
        pros: ['Bucket stays private', 'HTTPS, custom domain, caching, WAF', 'Lower S3 request load'],
        cons: ['Cache invalidation to consider', 'Extra service to configure'],
        useWhen: 'Serving S3 content to the public or a global audience.',
      },
    ],
    services: ['s3', 'iam', 'iam-policy', 'kms', 'cloudfront', 'acm', 'gateway-endpoint', 'macie'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-s3-classes',
    module: 'm3a',
    domain: 'cost',
    title: 'S3 Storage Classes & Lifecycle',
    minutes: 20,
    summary:
      'Choose the cheapest S3 storage class that meets a retrieval-time and resilience requirement, and design lifecycle rules that move and expire data automatically without hitting minimum-duration and small-object traps.',
    analogy: {
      title: 'Your house, a garage, a storage unit and a mountain vault',
      body: `Things you use daily stay **in the house** (Standard): instantly at hand but the most expensive space. Things you need now and then go **in the garage** (Infrequent Access): cheap space, but every trip out there costs a little effort. Old tax records go to a **storage unit across town** (Glacier Flexible): very cheap rent, but it takes hours to drive there. Grandma's papers you must keep for 10 years go to a **vault in the mountains** (Deep Archive): almost free, but retrieval takes a day.

Some storage units charge a minimum: "rent for at least 3 months, even if you leave after a week". And if you don't know what you'll need, you hire a **butler** (Intelligent-Tiering) who watches what you touch and moves boxes for you, for a small fee per box.`,
    },
    sections: [
      {
        heading: 'The problem: not all bytes are equally hot',
        body: `A typical dataset is accessed heavily for a few weeks and then rarely. Keeping 500 TB of three-year-old logs in S3 Standard costs about $11,500 per month; the same data in Glacier Deep Archive costs about $500. Storage classes are a **dial between storage price and access cost/latency**: the cheaper it is to store, the more you pay (in fees, wait time or minimum duration) to read.

All classes keep the same **11 nines durability** and the same API. You set the class per object (on upload or via lifecycle), not per bucket.`,
      },
      {
        heading: 'The class ladder',
        body: `Prices are approximate us-east-1 list prices per GB-month, for comparison only.`,
        table: {
          headers: ['Class', 'Storage $/GB-mo', 'Retrieval time', 'Retrieval fee', 'Min duration', 'AZs', 'Pick when'],
          rows: [
            ['S3 Standard', '0.023', 'Milliseconds', 'None', 'None', '3+', 'Hot data, frequent access'],
            ['Intelligent-Tiering', '0.023 down to 0.00099 + monitoring', 'Milliseconds (opt-in archive tiers: hours)', 'None', 'None', '3+', 'Unknown or changing access patterns'],
            ['Standard-IA', '0.0125', 'Milliseconds', 'Per GB (~0.01)', '30 days', '3+', 'Infrequent but must be instant: backups, DR copies'],
            ['One Zone-IA', '0.01', 'Milliseconds', 'Per GB (~0.01)', '30 days', '1', 'Infrequent and re-creatable: thumbnails, secondary copies'],
            ['Glacier Instant Retrieval', '0.004', 'Milliseconds', 'Per GB (~0.03)', '90 days', '3+', 'Archive read about once a quarter that needs instant access'],
            ['Glacier Flexible Retrieval', '0.0036', 'Expedited 1–5 min; Standard 3–5 h; Bulk 5–12 h (free)', 'Per GB except Bulk', '90 days', '3+', 'Archive where minutes to hours is fine'],
            ['Glacier Deep Archive', '0.00099', 'Standard within 12 h; Bulk within 48 h', 'Per GB', '180 days', '3+', 'Cheapest; 7–10 year retention, rarely if ever read'],
            ['Express One Zone (beyond)', '0.11', 'Single-digit ms', 'Per request', 'None', '1', 'Ultra-low-latency data next to compute'],
          ],
        },
      },
      {
        heading: 'Intelligent-Tiering: the "never guess wrong" class',
        body: `**S3 Intelligent-Tiering** monitors each object's access and moves it automatically between tiers:

- **Frequent Access** (Standard price), then **Infrequent Access** after **30 days** without access (about 40% cheaper), then **Archive Instant Access** after **90 days** (about 68% cheaper). All three are millisecond access.
- Optional, opt-in: **Archive Access** (after 90+ days, Glacier Flexible speed) and **Deep Archive Access** (after 180+ days). These need a restore before reading, so only enable them if the app can wait hours.
- When an object is accessed it moves back to Frequent Access automatically.
- **No retrieval fees** and **no minimum duration**. The cost is a monitoring fee of about **$0.0025 per 1,000 objects per month**.
- Objects **smaller than 128 KB are not monitored** and always stay in the Frequent tier (charged at the Standard rate, no monitoring fee).

Because retrieval fees can make IA classes **more** expensive than Standard if "infrequent" data turns out to be popular, Intelligent-Tiering is the safe answer whenever access is unknown or unpredictable.`,
      },
      {
        heading: 'Lifecycle rules: automate transitions and expirations',
        body: `A **lifecycle configuration** (up to 1,000 rules per bucket) applies actions to objects filtered by prefix, tags or object size:

- **Transition** actions: for example Standard → Standard-IA at 30 days → Glacier Flexible at 90 days → Deep Archive at 365 days.
- **Expiration** actions: delete current objects after N days (for example 7 years = 2,555 days); delete noncurrent versions after N days; remove expired delete markers.
- **AbortIncompleteMultipartUpload**: delete the parts of uploads that never completed after, say, 7 days. Those orphaned parts are invisible in the console but billed; this rule is a classic hidden cost saver.

Rules of the road:

- Transitions only go **down** the ladder (Standard → IA → Intelligent-Tiering → One Zone-IA → Glacier IR → Glacier Flexible → Deep Archive). To move back up, you copy the object.
- Objects must stay **at least 30 days in Standard** before a lifecycle transition to Standard-IA or One Zone-IA.
- By default lifecycle **does not transition objects smaller than 128 KB** (since September 2024), because per-object transition fees and metadata overhead would outweigh the savings.
- **S3 Storage Lens** and **Storage Class Analysis** show access patterns to help you choose transition ages.`,
      },
      {
        heading: 'Minimums, overheads and early deletion',
        body: `The hidden costs that make "cheap" classes expensive:

- **Minimum storage duration**: delete or transition an object out of Standard-IA after 10 days and you are still billed for **30 days**. Glacier IR and Flexible bill a 90-day minimum; Deep Archive 180 days.
- **Minimum billable object size**: Standard-IA, One Zone-IA and Glacier IR bill each object as at least **128 KB**. A 4 KB file costs as if it were 128 KB.
- **Archive metadata overhead**: every object in Glacier Flexible or Deep Archive carries about **40 KB** of extra billed metadata (32 KB at the Glacier rate, 8 KB at Standard). Millions of tiny files: zip or tar them first.
- **Per-request costs** rise as you go down the ladder; lifecycle transitions are charged per 1,000 objects.`,
      },
      {
        heading: 'Restoring archived objects',
        beyond: true,
        body: `Objects in **Glacier Flexible Retrieval** and **Deep Archive** (and Intelligent-Tiering's opt-in archive tiers) are not directly readable. You call **RestoreObject**, choosing a retrieval tier and a number of days. S3 creates a **temporary copy** (billed at the Standard rate for the days you asked for) while the archived original stays in place. An event \`s3:ObjectRestore:Completed\` can trigger the next step.

For thousands of objects use **S3 Batch Operations** to issue restores in bulk. Glacier Instant Retrieval needs no restore: that's the point of it.`,
      },
      {
        heading: 'Exam angle: match the SLA, then take the cheapest that qualifies',
        body: `Read the retrieval requirement first, then the resilience requirement, then pick the cheapest class that satisfies both:

- "Retrieval within **12 to 48 hours** is acceptable", "retain **7 years**", "almost never read" → **Deep Archive** (with a lifecycle rule). Standard-IA and Glacier IR work but pay for instant access you don't need.
- "Retrieve within **minutes**" occasionally → **Glacier Flexible** with Expedited (or Glacier IR if it must be milliseconds).
- "Accessed once a quarter, needs **milliseconds**" → **Glacier Instant Retrieval**.
- "Infrequent but **immediately available**" → **Standard-IA**.
- "Infrequent and **can be regenerated**" → **One Zone-IA**.
- "Access pattern **unknown/unpredictable**" → **Intelligent-Tiering**, always.`,
      },
    ],
    diagram: {
      title: 'An object\'s life under a lifecycle rule',
      groups: [
        { id: 'g-bucket', label: 'Bucket: originals/', kind: 'generic', x: 4, y: 8, w: 92, h: 44 },
      ],
      nodes: [
        { id: 'std', label: 'S3 Standard', icon: 's3', x: 12, y: 30, sub: 'day 0-30' },
        { id: 'ia', label: 'Standard-IA', icon: 's3', x: 32, y: 30, sub: 'day 30-90' },
        { id: 'gfr', label: 'Glacier Flexible', icon: 's3-glacier', x: 52, y: 30, sub: 'day 90-365' },
        { id: 'gda', label: 'Deep Archive', icon: 's3-glacier', x: 72, y: 30, sub: 'day 365+' },
        { id: 'exp', label: 'Expired', icon: 'database', x: 89, y: 30, sub: 'day 2,555' },
      ],
      edges: [
        { id: 'e-std-ia', from: 'std', to: 'ia', label: '30 d' },
        { id: 'e-ia-gfr', from: 'ia', to: 'gfr', label: '90 d' },
        { id: 'e-gfr-gda', from: 'gfr', to: 'gda', label: '365 d' },
        { id: 'e-gda-exp', from: 'gda', to: 'exp', label: '7 y' },
      ],
      steps: [
        {
          caption: 'A new upload lands in S3 Standard: millisecond reads, no retrieval fee, the highest storage price (~$0.023/GB-month).',
          highlight: ['std'],
        },
        {
          caption: 'After 30 days (the minimum before an IA transition) the rule moves it to Standard-IA: about half the storage price, a per-GB retrieval fee.',
          highlight: ['std', 'ia', 'e-std-ia'],
          flow: [{ edge: 'e-std-ia' }],
        },
        {
          caption: 'At 90 days it goes to Glacier Flexible Retrieval. Reads now need a restore: Expedited 1-5 min, Standard 3-5 h, Bulk 5-12 h.',
          highlight: ['ia', 'gfr', 'e-ia-gfr'],
          flow: [{ edge: 'e-ia-gfr' }],
        },
        {
          caption: 'At one year it reaches Deep Archive: about $1 per TB-month, 12-48 h retrieval, 180-day minimum.',
          highlight: ['gfr', 'gda', 'e-gfr-gda'],
          flow: [{ edge: 'e-gfr-gda' }],
        },
        {
          caption: 'Transitions only go down. Trying to lifecycle an object back up to Standard is not possible; you would copy it instead.',
          highlight: ['gda', 'std'],
          fail: ['e-std-ia'],
        },
        {
          caption: 'After 7 years an expiration action deletes it. The same rule also aborts incomplete multipart uploads after 7 days.',
          highlight: ['gda', 'exp', 'e-gda-exp'],
          flow: [{ edge: 'e-gda-exp' }],
        },
      ],
    },
    keyFacts: [
      'All S3 classes are designed for 11 nines durability; availability and AZ count differ.',
      'Minimum durations: Standard-IA and One Zone-IA 30 days; Glacier IR and Flexible 90 days; Deep Archive 180 days.',
      'Glacier Flexible retrieval: Expedited 1–5 min, Standard 3–5 h, Bulk 5–12 h (free).',
      'Deep Archive retrieval: Standard within 12 h, Bulk within 48 h; cheapest storage in AWS (~$0.00099/GB-month).',
      'IA classes and Glacier IR bill a minimum object size of 128 KB.',
      'Intelligent-Tiering: no retrieval fees, no minimum duration, small per-object monitoring fee; objects under 128 KB stay in the Frequent tier.',
      'Intelligent-Tiering moves to Infrequent after 30 days and Archive Instant after 90 days without access.',
      'Lifecycle transitions only go down the ladder; objects need 30 days in Standard before moving to an IA class.',
      'AbortIncompleteMultipartUpload lifecycle action removes billed but invisible orphaned parts.',
      'One Zone-IA keeps data in one AZ: lost if that AZ is destroyed.',
    ],
    examTips: [
      '"Retain 7 years, almost never read, retrieval within 24 hours acceptable, most cost-effective" → Glacier Deep Archive via lifecycle; Standard-IA and Glacier IR pay for instant access you do not need.',
      '"Access patterns are unknown or unpredictable" → Intelligent-Tiering.',
      '"Thumbnails/derived data, rarely accessed after 30 days, can be regenerated" → lifecycle to One Zone-IA (instant access, ~20% cheaper than Standard-IA). Glacier would break image serving.',
      '"Backups that must be immediately available but are rarely read" → Standard-IA.',
      '"Medical images read once a quarter that must load instantly" → Glacier Instant Retrieval.',
      '"Unexpected S3 charges with no visible objects" → incomplete multipart uploads; add an AbortIncompleteMultipartUpload rule.',
      '"Retrieve archived data within minutes in an emergency" → Glacier Flexible with Expedited retrieval.',
    ],
    pitfalls: [
      'Moving millions of tiny objects to IA or Glacier: 128 KB minimum billing and 40 KB archive overhead erase the savings.',
      'Choosing Standard-IA for data that turns out to be read often: retrieval fees can exceed Standard\'s cost.',
      'Deleting data in Glacier Flexible after 30 days: you are still billed the 90-day minimum.',
      'Using One Zone-IA for the only copy of data that cannot be recreated.',
      'Expecting to read a Glacier Flexible or Deep Archive object directly: it needs a restore first.',
    ],
    prosCons: [
      {
        option: 'Intelligent-Tiering',
        pros: ['Automatic, no guessing', 'No retrieval fees or minimum duration', 'Can reach archive pricing'],
        cons: ['Monitoring fee per object', 'Objects under 128 KB never tier down', 'Archive tiers need restores if enabled'],
        useWhen: 'Access patterns are unknown, changing or differ per object.',
      },
      {
        option: 'Lifecycle to Standard-IA / One Zone-IA',
        pros: ['About 45–55% cheaper storage than Standard', 'Still millisecond access'],
        cons: ['Per-GB retrieval fees', '30-day minimum and 128 KB minimum size'],
        useWhen: 'Access drops predictably after a known age.',
      },
      {
        option: 'Lifecycle to Glacier Flexible / Deep Archive',
        pros: ['Lowest storage price in AWS', 'Same 11 nines durability'],
        cons: ['Minutes to 48 hours to read', '90/180-day minimums', 'Per-object overhead'],
        useWhen: 'Long-term retention where retrieval delays are acceptable.',
      },
    ],
    services: ['s3', 's3-glacier'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-ebs',
    module: 'm3a',
    domain: 'performance',
    title: 'EBS Volumes, Snapshots & Encryption',
    minutes: 22,
    summary:
      'Pick the right EBS volume type from IOPS, throughput and boot requirements, size gp3 versus gp2 versus io2 cost-effectively, and use snapshots and KMS encryption to back up, move and encrypt volumes.',
    analogy: {
      title: 'A rented external hard drive on a long cable',
      body: `An EBS volume is like an external hard drive plugged into your computer through a long, fast cable. Because it isn't inside the computer, you can unplug it and plug it into another computer in the **same building** (the same AZ), and it keeps your files when the computer is switched off.

You choose the model when renting: a general SSD, a premium SSD with a guaranteed speed, or cheap spinning disks for big sequential files. The cable has its own speed limit, so a premium drive on a slow cable is wasted money.

A **snapshot** is a photo of the drive kept in the company safe (S3). Each new photo only records what changed since the last one. To move the drive to another building, you take a photo and build a new drive from it there.`,
    },
    sections: [
      {
        heading: 'How EBS works',
        body: `**Amazon EBS (Elastic Block Store)** provides network-attached block volumes for EC2. Key properties:

- A volume lives in **one AZ** and is replicated **within that AZ** to protect against a single hardware failure (it does **not** survive an AZ outage by itself).
- It attaches to **one instance at a time in the same AZ** (Multi-Attach is the io1/io2 exception).
- Because it's network storage, it **persists independently** of the instance: stop the instance and the data stays; detach and reattach to another instance in the AZ.
- **DeleteOnTermination**: true by default for the root volume, false by default for additional volumes. Terminate an instance and its root volume is deleted unless you change this flag.
- You pay for **provisioned** GB (and provisioned IOPS/throughput where applicable), even if the disk is empty.
- **Elastic Volumes** let you increase size, change type (gp2 → gp3) or change IOPS **without detaching**; you then extend the filesystem in the OS. You can never shrink a volume, and you must wait for a modification to complete (historically 6 hours) before the next one.

Performance is capped by **both** the volume's provisioned IOPS/throughput **and** the instance's **EBS bandwidth**. A 64,000-IOPS io2 volume on a small instance type is throttled to whatever that instance supports; check the instance's "EBS-optimized" limits before buying IOPS.`,
      },
      {
        heading: 'Volume types: decide by IOPS, throughput and boot',
        body: `**IOPS** is input/output operations per second (many small random reads/writes, like database pages). **Throughput** is MB per second (big sequential streams, like log processing). SSD types are measured mainly in IOPS; HDD types in throughput.`,
        table: {
          headers: ['Type', 'Media', 'Max IOPS', 'Max throughput', 'Boot?', 'Choose when'],
          rows: [
            ['gp3', 'SSD', '3,000 baseline at any size; up to 16,000 (raised to 80,000 in 2025)', '125 MB/s baseline; up to 1,000 MB/s (2,000 since 2025)', 'Yes', 'Default for boot, general workloads and most databases; ~20% cheaper per GB than gp2'],
            ['gp2', 'SSD', '3 IOPS per GB (min 100), burst to 3,000 under 1 TB, max 16,000 at 5,334 GB', '250 MB/s', 'Yes', 'Legacy: the "wrong current choice" in questions'],
            ['io2 Block Express', 'SSD', '256,000 (up to 1,000 IOPS per GB)', '4,000 MB/s', 'Yes', '>16,000 IOPS, sub-ms latency, 99.999% durability, Multi-Attach'],
            ['io1', 'SSD', '64,000 (50 IOPS per GB)', '1,000 MB/s', 'Yes', 'Older provisioned-IOPS type; io2 is better at the same price'],
            ['st1', 'HDD', '500', '500 MB/s', 'No', 'Sequential big data, logs, ETL, Kafka where MB/s matters'],
            ['sc1', 'HDD', '250', '250 MB/s', 'No', 'Cold sequential data kept on a volume; cheapest EBS'],
          ],
        },
      },
      {
        heading: 'gp2 vs gp3: the most tested storage fact',
        body: `**gp2** ties performance to size: **3 IOPS per GB**. A 500 GB gp2 volume gets 1,500 IOPS. To get 12,000 IOPS you would need a 4,000 GB volume, paying for 3.5 TB of space you don't need. Small gp2 volumes (under 1 TB) can burst to 3,000 IOPS using a credit bucket, then drop back to baseline when credits run out, which shows up as "the database is fast and then suddenly slow".

**gp3** decouples performance from size. Every gp3 volume, even 1 GB, gets **3,000 IOPS and 125 MB/s** baseline with no bursting, and you can buy extra IOPS (up to 500 per GB) and throughput independently. It costs about **$0.08 per GB-month** versus gp2's **$0.10**.

Worked example: 500 GB needing 12,000 IOPS.

- gp2: grow to 4,000 GB: about $400/month.
- gp3: 500 GB ($40) + 9,000 extra IOPS (about $45) = about $85/month.
- io2: 500 GB plus 12,000 provisioned IOPS: several hundred dollars a month, for durability and latency you didn't ask for.

Migrating gp2 → gp3 is an online Elastic Volumes change with no downtime.`,
      },
      {
        heading: 'io2 Block Express and Multi-Attach',
        body: `Choose **io2** when the requirement exceeds gp3, the workload is latency-critical (sub-millisecond, consistent), or the question demands high durability (**99.999%**, versus 99.8–99.9% for other types). All io2 volumes now run on the Block Express architecture: up to **64 TiB**, **256,000 IOPS** and **4,000 MB/s** on supported Nitro instances.

**Multi-Attach** (io1 and io2 only) attaches one volume to up to **16 Nitro instances in the same AZ**. Each instance gets full read/write access, so the application must coordinate writes with a **cluster-aware filesystem** (such as GFS2) or clustering software. Ordinary ext4 or XFS will corrupt. It's for clustered databases and high-availability apps, not for "share a folder across a web fleet" (that's EFS).`,
      },
      {
        heading: 'Snapshots: backups, DR and moving volumes',
        body: `An **EBS snapshot** is a point-in-time, **incremental**, block-level backup stored in S3 (in AWS-managed storage you don't see as a bucket). The first snapshot copies all used blocks; each later one stores only changed blocks, yet every snapshot can restore a full volume.

- **Copy** snapshots to another Region or **share** them with other accounts for DR.
- **Move a volume to another AZ or Region**: snapshot → (copy to the target Region) → create a new volume from it in the target AZ.
- **Lazy loading**: a volume restored from a snapshot pulls each block from S3 on first read, so the first pass is slow. Fix with **Fast Snapshot Restore (FSR)**, enabled per snapshot per AZ and billed per hour, which gives full performance immediately. Without FSR you can pre-warm by reading every block (\`fio\` or \`dd\`).
- **Amazon Data Lifecycle Manager (DLM)** automates snapshot schedules, retention and cross-Region copies; **AWS Backup** does the same centrally across services.
- **Recycle Bin** keeps deleted snapshots for a retention period you set, so an accidental or malicious delete can be undone.
- **EBS Snapshots Archive** is about 75% cheaper for snapshots kept for compliance; 90-day minimum and a 24 to 72 hour restore.`,
      },
      {
        heading: 'Encryption',
        body: `EBS encryption uses **AWS KMS** keys (AES-256). It's transparent to the OS and has **no meaningful performance penalty**. An encrypted volume protects:

- data at rest on the volume,
- data moving between the instance and the volume,
- all snapshots taken from it and all volumes created from those snapshots.

Encryption is chosen **at creation**; you can't toggle it on an existing volume. To encrypt an unencrypted volume: **snapshot it → copy the snapshot with encryption enabled** (or create a volume from the snapshot with encryption selected) → **create a new volume** → swap it in.

Turn on **EBS encryption by default** (a per-Region account setting) to force every new volume and snapshot copy to be encrypted. To share an encrypted snapshot with another account you must use a **customer managed KMS key** and grant that account use of it; snapshots encrypted with the default \`aws/ebs\` key can't be shared.`,
      },
      {
        heading: 'Newer EBS capabilities',
        beyond: true,
        body: `- In September 2025 AWS raised gp3 limits to **64 TiB, 80,000 IOPS and 2,000 MB/s** per volume. Exam items written earlier use 16 TiB / 16,000 IOPS / 1,000 MB/s; the principle (performance independent of size) is unchanged.
- **Provisioned rate for volume initialization** (2025) lets you pay for a predictable restore speed from a snapshot (up to 300 MB/s) as a cheaper alternative to FSR for large volumes.
- **AWS Backup** manages EBS snapshots alongside RDS, EFS, FSx and S3 backups, with cross-Region and cross-account copies in one backup plan; it's often the "least operational overhead" answer over custom snapshot scripts.`,
      },
    ],
    diagram: {
      title: 'Snapshot to move and encrypt a volume',
      groups: [
        { id: 'g-region', label: 'us-east-1', kind: 'region', x: 4, y: 4, w: 92, h: 52 },
        { id: 'g-aza', label: 'AZ a', kind: 'az', x: 8, y: 10, w: 26, h: 42 },
        { id: 'g-azb', label: 'AZ b', kind: 'az', x: 66, y: 10, w: 26, h: 42 },
      ],
      nodes: [
        { id: 'ec2a', label: 'DB instance', icon: 'ec2', x: 21, y: 20 },
        { id: 'vol', label: 'gp2 volume', icon: 'ebs', x: 21, y: 42, sub: 'unencrypted' },
        { id: 'snap', label: 'Snapshot', icon: 's3', x: 50, y: 42, sub: 'incremental' },
        { id: 'kms', label: 'KMS key', icon: 'kms', x: 50, y: 20 },
        { id: 'vol2', label: 'gp3 volume', icon: 'ebs', x: 79, y: 42, sub: 'encrypted' },
        { id: 'ec2b', label: 'New instance', icon: 'ec2', x: 79, y: 20 },
      ],
      edges: [
        { id: 'e-ec2a-vol', from: 'ec2a', to: 'vol', label: 'attached' },
        { id: 'e-vol-snap', from: 'vol', to: 'snap', label: 'snapshot' },
        { id: 'e-kms-snap', from: 'kms', to: 'snap', label: 'copy encrypted' },
        { id: 'e-snap-vol2', from: 'snap', to: 'vol2', label: 'create volume' },
        { id: 'e-vol2-ec2b', from: 'vol2', to: 'ec2b', label: 'attach' },
        { id: 'e-ec2b-vola', from: 'ec2b', to: 'vol', dashed: true },
      ],
      steps: [
        {
          caption: 'A database runs on an unencrypted gp2 volume in AZ a. The volume can only attach to instances in AZ a.',
          highlight: ['ec2a', 'vol', 'e-ec2a-vol', 'g-aza'],
          flow: [{ edge: 'e-ec2a-vol' }],
        },
        {
          caption: 'Attaching it directly to an instance in AZ b is impossible: EBS volumes are bound to their AZ.',
          highlight: ['ec2b', 'e-ec2b-vola'],
          fail: ['e-ec2b-vola'],
          flow: [{ edge: 'e-ec2b-vola', color: 'bad' }],
        },
        {
          caption: 'Take a snapshot: an incremental, block-level copy stored in S3, which is Regional and not tied to an AZ.',
          highlight: ['vol', 'snap', 'e-vol-snap'],
          flow: [{ edge: 'e-vol-snap' }],
        },
        {
          caption: 'Copy the snapshot with encryption enabled using a KMS key. Volumes and snapshots derived from it are now encrypted.',
          highlight: ['kms', 'snap', 'e-kms-snap'],
          flow: [{ edge: 'e-kms-snap' }],
        },
        {
          caption: 'Create a new gp3 volume in AZ b from the encrypted snapshot, provisioning 12,000 IOPS on just 500 GB.',
          highlight: ['snap', 'vol2', 'e-snap-vol2', 'g-azb'],
          flow: [{ edge: 'e-snap-vol2' }],
        },
        {
          caption: 'Attach it to the new instance. Blocks lazy-load from S3 on first read unless Fast Snapshot Restore was enabled.',
          highlight: ['vol2', 'ec2b', 'e-vol2-ec2b'],
          flow: [{ edge: 'e-vol2-ec2b' }],
        },
      ],
    },
    keyFacts: [
      'EBS volumes live in one AZ, are replicated within it, and attach to instances in that AZ only.',
      'gp3: 3,000 IOPS and 125 MB/s baseline at any size; IOPS and throughput provisioned independently; ~20% cheaper per GB than gp2.',
      'gp2: 3 IOPS per GB, burst to 3,000 under 1 TB, max 16,000 IOPS.',
      'io2 Block Express: up to 256,000 IOPS, 4,000 MB/s, 64 TiB, 99.999% durability.',
      'Multi-Attach: io1/io2 only, up to 16 Nitro instances in the same AZ, cluster-aware filesystem required.',
      'st1 and sc1 are HDD, throughput-oriented, and cannot be boot volumes.',
      'Performance is limited by both volume and instance EBS bandwidth.',
      'Snapshots are incremental, stored in S3, and can be copied across Regions and shared across accounts.',
      'Fast Snapshot Restore removes lazy-load latency; it is enabled per snapshot per AZ and billed hourly.',
      'Encrypt an unencrypted volume: snapshot → encrypted copy → new volume. Encryption by default is a per-Region setting.',
      'Root volume DeleteOnTermination defaults to true; additional volumes default to false.',
    ],
    examTips: [
      '"gp2 volume needs more IOPS but not more space, most cost-effective" → migrate to gp3 and provision the IOPS. Growing gp2 pays for unused GB; io2 works but costs more.',
      '"More than 16,000 IOPS (classic gp3 limit), sub-millisecond latency or 99.999% durability" → io2 Block Express.',
      '"Large sequential throughput for log processing or big data, cost-effective" → st1. "Cold data, lowest cost EBS" → sc1. Neither can boot.',
      '"Move an EBS volume to another AZ or Region" → snapshot, copy if cross-Region, create volume in the target.',
      '"Encrypt an existing unencrypted volume" → snapshot, copy with encryption, create a new volume and swap.',
      '"Volumes restored from snapshots are slow at first, must be fast immediately" → Fast Snapshot Restore.',
      '"Automate EBS snapshot creation and retention" → Data Lifecycle Manager or AWS Backup.',
      '"Recover accidentally deleted snapshots" → Recycle Bin retention rule.',
    ],
    pitfalls: [
      'Buying a huge io2 volume for a small instance whose EBS bandwidth caps the IOPS.',
      'Assuming EBS survives an AZ failure: it is replicated only within its AZ; use snapshots for cross-AZ recovery.',
      'Choosing Multi-Attach for a shared web content folder instead of EFS.',
      'Trying to enable encryption on an existing volume in place: it must be done via snapshot copy.',
      'Picking st1/sc1 for a boot volume or random-I/O database.',
      'Sharing a snapshot encrypted with the default aws/ebs key cross-account: it requires a customer managed key.',
    ],
    prosCons: [
      {
        option: 'gp3',
        pros: ['Cheapest SSD per GB', 'IOPS and throughput independent of size', 'No burst credits to run out'],
        cons: ['Classic cap 16,000 IOPS (80,000 since 2025)', 'Durability 99.8–99.9%'],
        useWhen: 'Default choice for boot volumes, dev/test and most databases.',
      },
      {
        option: 'io2 Block Express',
        pros: ['Up to 256,000 IOPS, sub-ms latency', '99.999% durability', 'Multi-Attach'],
        cons: ['Highest price (per GB and per IOPS)', 'Needs a large Nitro instance to use fully'],
        useWhen: 'Mission-critical, I/O-heavy databases (Oracle, SQL Server, SAP HANA) or clustered apps.',
      },
      {
        option: 'st1 / sc1 (HDD)',
        pros: ['Very cheap per GB', 'High sequential throughput (st1)'],
        cons: ['Poor random IOPS', 'Cannot boot', 'Minimum 125 GB'],
        useWhen: 'Large sequential workloads like log processing, data warehouses, or cold block data.',
      },
    ],
    services: ['ebs', 'ec2', 'kms', 'backup'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-instance-store',
    module: 'm3a',
    domain: 'performance',
    title: 'Instance Store: The Fast, Disposable Disk',
    minutes: 10,
    summary:
      'Recognise when ephemeral instance store beats EBS for raw I/O, know exactly which events wipe it, and design around its data loss with replication or checkpoints.',
    analogy: {
      title: 'A hotel room desk',
      body: `Instance store is the desk in your hotel room. It's right there, so working on it is as fast as it gets, and it comes free with the room. But when you check out (stop the instance), housekeeping clears everything off it. If you're moved to another room because the air conditioning broke (hardware failure), your papers stay behind and get thrown away.

So you only leave scratch notes on the hotel desk. Anything you need to keep goes in your suitcase (EBS) or gets mailed home (S3). A smart team that travels together keeps copies of each other's notes, so losing one desk doesn't matter (application-level replication).`,
    },
    sections: [
      {
        heading: 'What instance store is',
        body: `**Instance store** volumes are disks **physically attached to the host server** your instance runs on, typically local **NVMe SSDs** (a few types use HDDs). There is no network hop, so latency is in microseconds and a single instance can reach **millions of random IOPS** and many GB/s of throughput.

- Only some instance types include it, usually marked with a **d** in the name (m6id, c6gd, r6id) and the storage-optimized families (**i4i**, **i3en**, **im4gn**, **d3** for dense HDD).
- The number and size of disks are **fixed by the instance type**; for example an i4i.32xlarge has 8 × 3,750 GB NVMe drives. You can't resize them.
- The cost is **included in the instance price**; there's no separate storage bill.
- It can't be detached, attached to another instance, or snapshotted with EBS snapshots.`,
      },
      {
        heading: 'Exactly when the data disappears',
        body: `"Ephemeral" means the data's life is tied to the instance being on **that host**. Memorise this table; questions test the reboot row.`,
        table: {
          headers: ['Event', 'Instance store data', 'EBS data'],
          rows: [
            ['Reboot (OS restart)', 'Kept', 'Kept'],
            ['Stop / start', 'Lost (instance moves to a new host)', 'Kept'],
            ['Hibernate', 'Lost', 'Kept (RAM saved to the EBS root)'],
            ['Terminate', 'Lost', 'Root deleted by default; extra volumes kept by default'],
            ['Underlying disk or host failure', 'Lost', 'Kept (replicated within the AZ)'],
            ['Spot interruption (terminate)', 'Lost', 'Depends on DeleteOnTermination'],
          ],
        },
      },
      {
        heading: 'When instance store is the right answer',
        body: `Use it only for data you can **afford to lose** or that is **protected elsewhere**:

- **Caches and buffers**: a local cache layer, a CDN edge cache, temporary query spill space.
- **Scratch space**: video transcoding work files, genomics intermediate files, build artifacts.
- **Data replicated at the application layer**: distributed databases and streams like Cassandra, ScyllaDB, Elasticsearch/OpenSearch on EC2, Kafka, or Hadoop HDFS, which keep 3 copies across nodes (ideally across AZs). Losing one node's disk is a routine event the cluster heals from.
- **Highest possible storage IOPS** with **no durability requirement**: instance store beats even io2 Block Express, because there's no network.

The giveaway words: "temporary", "scratch", "cache", "can be regenerated", "replicated across nodes", "highest I/O performance", "lowest latency storage".`,
      },
      {
        heading: 'Designing around the risk',
        body: `- **Replicate across instances and AZs** so one host failure loses nothing (the Cassandra model).
- **Checkpoint to durable storage**: periodically copy results to S3 or an EBS volume, so a lost node only repeats the work since the last checkpoint.
- **Stripe disks with RAID 0** across several instance-store drives for more throughput; RAID 0 has no redundancy, which is fine because the data is disposable anyway.
- **Rebuild on boot**: use a launch template user-data script to format and mount the drives on first start, since they arrive empty after every stop/start.
- Keep the **boot volume on EBS** (EBS-backed AMIs). Old instance-store-backed AMIs can't even be stopped, only rebooted or terminated.`,
      },
      {
        heading: 'Instance store vs EBS at a glance',
        body: `Same paradigm (block), very different trade-offs.`,
        table: {
          headers: ['', 'Instance store', 'EBS (gp3 / io2)'],
          rows: [
            ['Location', 'Inside the host', 'Network-attached, same AZ'],
            ['Latency / IOPS', 'Microseconds, millions of IOPS', 'Sub-ms to ms; up to 256,000 IOPS (io2)'],
            ['Persistence', 'Lost on stop, hibernate, terminate, failure', 'Persists independently of the instance'],
            ['Snapshots / detach', 'No', 'Yes'],
            ['Size', 'Fixed by instance type', 'Chosen and resizable'],
            ['Cost', 'Included in instance price', 'Billed per GB (and IOPS/throughput)'],
          ],
        },
      },
      {
        heading: 'Exam angle: reading the clues',
        body: `Instance store questions are usually a trade between **speed** and **durability**. Ask two things:

- **Can the data be lost, or is it copied elsewhere?** If the scenario says "temporary", "cache", "scratch", "can be regenerated" or "the application replicates data across nodes", instance store is allowed. If it says "must persist", "after the instance is stopped" or "durable", it is ruled out.
- **Is the requirement the highest possible I/O or the lowest latency?** If yes, and data loss is allowed, instance store wins over every EBS type, including io2 Block Express.

A common distractor pairs "maximum IOPS" with "data must survive a stop". That combination points to **io2 Block Express**, not instance store. Another distractor offers EBS snapshots to back up instance store: they don't work on instance store, so the backup has to be an application-level copy to S3 or EBS.`,
      },
    ],
    diagram: {
      title: 'Instance store loss and the replication fix',
      groups: [
        { id: 'g-region', label: 'Region', kind: 'region', x: 4, y: 4, w: 92, h: 52 },
        { id: 'g-aza', label: 'AZ a', kind: 'az', x: 8, y: 10, w: 26, h: 42 },
        { id: 'g-azb', label: 'AZ b', kind: 'az', x: 38, y: 10, w: 26, h: 42 },
        { id: 'g-azc', label: 'AZ c', kind: 'az', x: 68, y: 10, w: 24, h: 42 },
      ],
      nodes: [
        { id: 'n1', label: 'Cassandra 1', icon: 'ec2', x: 21, y: 20, sub: 'i4i' },
        { id: 'd1', label: 'Local NVMe', icon: 'instance-store', x: 21, y: 40 },
        { id: 'n2', label: 'Cassandra 2', icon: 'ec2', x: 51, y: 20, sub: 'i4i' },
        { id: 'd2', label: 'Local NVMe', icon: 'instance-store', x: 51, y: 40 },
        { id: 'n3', label: 'Cassandra 3', icon: 'ec2', x: 80, y: 20, sub: 'i4i' },
        { id: 's3', label: 'S3 backups', icon: 's3', x: 80, y: 42 },
      ],
      edges: [
        { id: 'e-n1-d1', from: 'n1', to: 'd1', label: 'no network hop' },
        { id: 'e-n2-d2', from: 'n2', to: 'd2' },
        { id: 'e-n1-n2', from: 'n1', to: 'n2', label: 'replicate' },
        { id: 'e-n2-n3', from: 'n2', to: 'n3', label: 'replicate' },
        { id: 'e-n3-s3', from: 'n3', to: 's3', label: 'snapshot' },
      ],
      steps: [
        {
          caption: 'Each node writes to NVMe disks inside its host: microsecond latency and millions of IOPS, included in the instance price.',
          highlight: ['n1', 'd1', 'e-n1-d1'],
          flow: [{ edge: 'e-n1-d1' }],
        },
        {
          caption: 'The database keeps three copies of every row, one per AZ, by replicating writes between nodes.',
          highlight: ['n1', 'n2', 'n3', 'e-n1-n2', 'e-n2-n3'],
          flow: [{ edge: 'e-n1-n2' }, { edge: 'e-n2-n3' }],
        },
        {
          caption: 'Node 1 is stopped for maintenance. Its instance store data is wiped: on restart it lands on a new host with empty disks.',
          highlight: ['n1', 'd1', 'g-aza'],
          fail: ['d1'],
        },
        {
          caption: 'No data is lost: node 1 rejoins and streams its rows back from nodes 2 and 3.',
          highlight: ['n1', 'n2', 'e-n1-n2'],
          flow: [{ edge: 'e-n1-n2', reverse: true }],
        },
        {
          caption: 'Periodic backups to S3 protect against losing the whole cluster, since instance store cannot be snapshotted.',
          highlight: ['n3', 's3', 'e-n3-s3'],
          flow: [{ edge: 'e-n3-s3' }],
        },
      ],
    },
    keyFacts: [
      'Instance store = disks physically in the host; no network hop; millions of IOPS on storage-optimized types.',
      'Data survives a reboot but is lost on stop, hibernate, terminate, or host/disk failure.',
      'Cost is included in the instance price; size and count are fixed by instance type.',
      'Cannot be detached, reattached or snapshotted with EBS snapshots.',
      'Instance types with instance store: names with "d" (m6id, c6gd) and storage-optimized i4i, i3en, im4gn, d3.',
      'Disks arrive empty after every stop/start: format and mount them in user data.',
    ],
    examTips: [
      '"Highest possible IOPS / lowest latency storage, data can be lost or is replicated" → instance store (storage-optimized instance like i4i), beating io2.',
      '"Temporary files, scratch space, cache or buffer" → instance store.',
      '"Data must persist after the instance is stopped" → EBS, never instance store.',
      '"Distributed database that replicates data across nodes needs maximum disk performance" → instance store on storage-optimized instances.',
      'Remember the reboot exception: instance store data survives a reboot, not a stop/start.',
    ],
    pitfalls: [
      'Storing the only copy of important data on instance store.',
      'Thinking a reboot wipes instance store: only stop, hibernate, terminate or hardware failure do.',
      'Assuming you can snapshot or detach an instance store volume like EBS.',
      'Expecting to resize instance store or add it to an instance type that does not include it.',
    ],
    prosCons: [
      {
        option: 'Instance store',
        pros: ['Highest IOPS and lowest latency', 'No extra cost', 'No network contention'],
        cons: ['Ephemeral', 'Fixed size', 'No snapshots, no detach'],
        useWhen: 'Caches, scratch data, or app-replicated clusters needing maximum I/O.',
      },
      {
        option: 'EBS io2 Block Express',
        pros: ['Durable (99.999%)', 'Snapshots, encryption, resizing', 'Survives stop/start'],
        cons: ['Network-attached latency', 'Expensive at high IOPS'],
        useWhen: 'High-performance data that must persist, such as a primary database volume.',
      },
    ],
    services: ['instance-store', 'ec2', 'ebs', 's3'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-efs-fsx',
    module: 'm3a',
    domain: 'performance',
    title: 'EFS & the FSx Family',
    minutes: 22,
    summary:
      'Choose between Amazon EFS and the four FSx filesystems from protocol, operating system and performance clues, and configure EFS mount targets, storage classes and throughput modes correctly.',
    analogy: {
      title: 'Shared drives for different offices',
      body: `Picture a company with several offices, each used to a different kind of shared drive.

**EFS** is the open-plan office's shared drive for the Linux crowd: it grows when you add files, shrinks when you delete, and anyone in any building can open it.

**FSx for Windows** is the Windows office's familiar "S: drive", logged in with company accounts (Active Directory) and with "restore previous version" right-click.

**FSx for Lustre** is the race-car garage: a filesystem built purely for speed, feeding hundreds of supercomputer nodes at once, and it can pull its parts straight from the S3 warehouse.

**FSx for NetApp ONTAP** is the office that already runs NetApp and needs one drive that both Windows and Linux people use. **FSx for OpenZFS** is for the team moving off an existing ZFS server.`,
    },
    sections: [
      {
        heading: 'Amazon EFS: elastic NFS for Linux',
        body: `**Amazon EFS (Elastic File System)** is a fully managed **NFS** (v4.0/4.1) filesystem. Thousands of Linux clients mount it at the same time: EC2 instances, ECS tasks, EKS pods, Lambda functions, and on-premises servers over Direct Connect or VPN.

- **Elastic capacity**: no size to provision. It grows to petabytes and shrinks as files are deleted; you pay per GB actually stored (about $0.30 per GB-month in Standard).
- **Regional by default**: data and metadata are stored across multiple AZs, so it survives an AZ loss. **One Zone** storage costs about 47% less for data that doesn't need multi-AZ resilience (dev/test, re-creatable data), and AWS Backup is on by default for One Zone filesystems.
- **Mount targets**: one per AZ, each an **ENI** with an IP in a subnet you pick. Clients mount the target in their own AZ through its DNS name. Each mount target has **security groups** that must allow inbound **TCP 2049 (NFS)** from the clients' security group.
- **POSIX** permissions, file locking and strong read-after-write consistency.
- **Linux only**: Windows clients are not supported. A Windows question never ends at EFS.`,
      },
      {
        heading: 'EFS storage classes, throughput and performance modes',
        body: `EFS **lifecycle management** moves files that haven't been read for a set time (for example 30 days) to cheaper classes and, optionally, back to Standard on the next access. Cold data costs over 90% less than Standard.`,
        table: {
          headers: ['Setting', 'Options', 'What to pick'],
          rows: [
            ['Storage class', 'Standard (~$0.30/GB); Infrequent Access (~$0.016/GB + per-GB read fee); Archive (~$0.008/GB, for data read a few times a year)', 'Lifecycle policy: to IA after 30 days, to Archive after 90 days'],
            ['Availability', 'Regional (multi-AZ) or One Zone', 'Regional for production; One Zone for cheap, re-creatable data'],
            ['Throughput mode', 'Elastic (default): scales automatically, pay per GB transferred. Provisioned: fixed MB/s you buy. Bursting: scales with stored size using credits', 'Elastic unless the workload is steady and predictable (then Provisioned may be cheaper)'],
            ['Performance mode', 'General Purpose (default, lowest latency). Max I/O (legacy, higher latency, more parallelism)', 'General Purpose. Max I/O only if told thousands of clients need aggregate throughput and latency doesn\'t matter; not available with Elastic throughput or One Zone'],
          ],
        },
      },
      {
        heading: 'EFS security and multi-tenant access',
        body: `- **Network**: mount target security groups (TCP 2049). Nothing outside the VPC can reach the mount targets unless routed through DX/VPN or peering.
- **Identity**: an **EFS file system policy** (resource-based, like a bucket policy) can require IAM authorization, force TLS, or deny root access. Clients authorize using the EFS mount helper with \`-o iam\`.
- **EFS Access Points**: application-specific entry points that force a **POSIX user/group ID** and a **root directory**. Example: a Lambda function's access point maps every write to UID 1001 under \`/lambda-data\`, so it can't see other apps' folders.
- **Encryption at rest** with KMS is chosen **at creation** (to encrypt an existing unencrypted filesystem, create a new one and copy the data with DataSync). **Encryption in transit** is TLS, turned on with the mount helper option \`-o tls\`.
- **EFS Replication** keeps a read-only copy in another Region or AZ, with most changes copied within 15 minutes, for DR.`,
      },
      {
        heading: 'FSx for Windows File Server',
        body: `**Amazon FSx for Windows File Server** is a fully managed native Windows file server:

- **SMB** protocol (port 445), **NTFS** permissions and ACLs.
- Joins **Active Directory**: AWS Managed Microsoft AD or your self-managed on-premises AD. Users log in with their normal domain accounts.
- Windows features: **DFS Namespaces** (combine many shares under one path like \`\\\\corp\\share\`), **shadow copies** (users restore previous versions themselves), **data deduplication**, quotas.
- **Single-AZ** or **Multi-AZ** (an active file server plus a standby in another AZ with automatic failover): Multi-AZ for production.
- SSD or HDD storage; daily automatic backups to S3.
- Linux clients can also mount it over SMB, but Windows and AD are its reason to exist.

Trigger phrases: "Windows file share", "SMB", "Active Directory-integrated", "NTFS permissions", "lift-and-shift a Windows file server", "SharePoint / home directories for Windows users".`,
      },
      {
        heading: 'FSx for Lustre: HPC speed, linked to S3',
        body: `**Lustre** is an open-source parallel filesystem used in supercomputing. **Amazon FSx for Lustre** delivers **hundreds of GB/s** of aggregate throughput, **millions of IOPS** and sub-millisecond latency to thousands of Linux compute nodes.

- **S3 integration** (data repository association): link the filesystem to an S3 bucket or prefix. Objects appear as files immediately; their contents are **lazy-loaded** from S3 the first time a node reads them. Results can be **exported back to S3** automatically. The S3 bucket stays the system of record; Lustre is the fast working layer.
- **Scratch** deployment: no data replication, cheapest, high burst throughput. If a file server fails, data on it is lost. For **temporary** jobs lasting hours to weeks where the originals live in S3.
- **Persistent** deployment: data replicated within one AZ, failed servers replaced automatically. For long-running workloads and data that must survive hardware failure.
- Linux only (Lustre client).

Trigger phrases: "HPC", "high-performance computing", "machine-learning training", "genomics", "video rendering", "financial modelling", "process data in S3 as files at extreme speed".`,
      },
      {
        heading: 'FSx for NetApp ONTAP and FSx for OpenZFS',
        body: `**Amazon FSx for NetApp ONTAP** runs NetApp's ONTAP storage OS as a managed service:

- **Multi-protocol**: NFS, SMB, iSCSI and NVMe/TCP on the same data, so **Linux, Windows and macOS** clients share files, and block LUNs serve databases.
- NetApp features: **snapshots**, instant **FlexClone** copies, **deduplication and compression**, automatic tiering of cold data to a cheaper capacity pool, **SnapMirror** replication (including from on-premises NetApp arrays).
- Multi-AZ option. Trigger phrases: "both Linux and Windows clients on the same share", "migrate existing NetApp", "SnapMirror", "iSCSI".

**Amazon FSx for OpenZFS** runs the ZFS filesystem as a managed service:

- **NFS** (v3, v4.x) access for Linux and macOS (and Windows NFS clients).
- Very low latency (hundreds of microseconds) and up to 1 million+ IOPS, with ZFS snapshots, instant clones and compression.
- Single-AZ or Multi-AZ. Trigger phrases: "migrate an on-premises ZFS server", "instant clones for dev/test".`,
      },
      {
        heading: 'Decision table',
        body: `Four sentences answer a surprising number of questions verbatim: **Linux shared → EFS. Windows/AD → FSx for Windows. HPC/ML speed → FSx for Lustre. Mixed NFS + SMB → FSx for ONTAP.**`,
        table: {
          headers: ['Need', 'Service', 'Protocol', 'Clients', 'Key differentiator'],
          rows: [
            ['Shared Linux files, elastic, serverless', 'EFS', 'NFS v4', 'Linux, Lambda, ECS, EKS', 'No capacity planning; Regional multi-AZ'],
            ['Windows file shares with AD', 'FSx for Windows File Server', 'SMB', 'Windows (Linux via SMB)', 'NTFS, AD, DFS, shadow copies'],
            ['HPC / ML scratch at extreme speed', 'FSx for Lustre', 'Lustre (POSIX)', 'Linux', 'Hundreds of GB/s; S3-linked lazy loading'],
            ['Multi-protocol, NetApp features', 'FSx for NetApp ONTAP', 'NFS, SMB, iSCSI, NVMe/TCP', 'Linux, Windows, macOS', 'SnapMirror, FlexClone, dedup'],
            ['ZFS migration, low latency NFS', 'FSx for OpenZFS', 'NFS', 'Linux, macOS', 'ZFS snapshots and clones'],
          ],
        },
      },
    ],
    diagram: {
      title: 'EFS mounted across two AZs',
      groups: [
        { id: 'g-region', label: 'Region', kind: 'region', x: 4, y: 4, w: 92, h: 52 },
        { id: 'g-vpc', label: 'VPC', kind: 'vpc', x: 8, y: 8, w: 62, h: 45 },
        { id: 'g-suba', label: 'Private subnet a', kind: 'subnet-private', x: 11, y: 12, w: 26, h: 38 },
        { id: 'g-subb', label: 'Private subnet b', kind: 'subnet-private', x: 41, y: 12, w: 26, h: 38 },
      ],
      nodes: [
        { id: 'ec2a', label: 'Web server A', icon: 'ec2', x: 24, y: 20 },
        { id: 'mta', label: 'Mount target', icon: 'eni', x: 24, y: 40, sub: 'SG: TCP 2049' },
        { id: 'ec2b', label: 'Web server B', icon: 'ec2', x: 54, y: 20 },
        { id: 'mtb', label: 'Mount target', icon: 'eni', x: 54, y: 40, sub: 'SG: TCP 2049' },
        { id: 'efs', label: 'EFS filesystem', icon: 'efs', x: 84, y: 30, sub: 'Regional, Elastic' },
      ],
      edges: [
        { id: 'e-a-mta', from: 'ec2a', to: 'mta', label: 'NFS mount' },
        { id: 'e-b-mtb', from: 'ec2b', to: 'mtb', label: 'NFS mount' },
        { id: 'e-mta-efs', from: 'mta', to: 'efs' },
        { id: 'e-mtb-efs', from: 'mtb', to: 'efs' },
      ],
      steps: [
        {
          caption: 'EFS is Regional: one filesystem, with a mount target (an ENI) in each AZ where clients run.',
          highlight: ['efs', 'mta', 'mtb', 'g-region'],
        },
        {
          caption: 'Web server A mounts the mount target in its own AZ and writes an uploaded file.',
          highlight: ['ec2a', 'mta', 'e-a-mta', 'e-mta-efs'],
          flow: [{ edge: 'e-a-mta' }, { edge: 'e-mta-efs' }],
        },
        {
          caption: 'Web server B, in another AZ, reads the same file immediately through its local mount target: shared POSIX storage.',
          highlight: ['ec2b', 'mtb', 'e-b-mtb', 'e-mtb-efs'],
          flow: [{ edge: 'e-mtb-efs', reverse: true }, { edge: 'e-b-mtb', reverse: true }],
        },
        {
          caption: 'If the mount target security group does not allow TCP 2049 from the clients, mounts hang: the most common EFS misconfiguration.',
          highlight: ['mtb', 'e-b-mtb'],
          fail: ['e-b-mtb'],
          flow: [{ edge: 'e-b-mtb', color: 'bad' }],
        },
        {
          caption: 'Lifecycle management moves files unread for 30 days to Infrequent Access, then Archive, cutting cost for cold files by over 90%.',
          highlight: ['efs'],
        },
        {
          caption: 'If AZ a fails, server B keeps working: EFS Standard stores data across multiple AZs.',
          highlight: ['ec2b', 'efs', 'g-subb'],
          fail: ['g-suba'],
        },
      ],
    },
    keyFacts: [
      'EFS: managed NFS v4 for Linux only; thousands of concurrent clients; elastic capacity billed per GB used.',
      'EFS mount targets: one ENI per AZ; security group must allow TCP 2049.',
      'EFS storage classes: Standard, Infrequent Access, Archive; lifecycle can move files back to Standard on access.',
      'EFS throughput modes: Elastic (default, recommended), Provisioned, Bursting. Performance modes: General Purpose (default), Max I/O.',
      'EFS encryption at rest is set at creation; in transit uses TLS via the mount helper.',
      'EFS Access Points enforce a POSIX user/group and root directory per application.',
      'FSx for Windows: SMB, NTFS, Active Directory, DFS Namespaces, shadow copies; Multi-AZ option.',
      'FSx for Lustre: hundreds of GB/s, sub-ms; S3-linked lazy load and export; Scratch (temporary, no replication) vs Persistent.',
      'FSx for ONTAP: NFS + SMB + iSCSI + NVMe/TCP; SnapMirror; Linux, Windows and macOS clients.',
      'FSx for OpenZFS: NFS, ZFS snapshots and clones, very low latency.',
    ],
    examTips: [
      '"20 Linux instances across 3 AZs must read/write the same directory with POSIX permissions" → EFS. EBS Multi-Attach fails (single AZ, io1/io2, 16 max, cluster FS); S3 via FUSE fails (not POSIX).',
      '"Windows file share", "SMB", "Active Directory" → FSx for Windows File Server (Multi-AZ for HA).',
      '"HPC on 200 TB in S3, sub-ms file access, hundreds of GB/s, for a week" → FSx for Lustre Scratch linked to the bucket. EFS Max I/O is not in Lustre\'s throughput class.',
      '"Both Linux and Windows clients must access the same data", "migrate NetApp" → FSx for NetApp ONTAP.',
      '"Migrate an on-premises ZFS file server" → FSx for OpenZFS.',
      '"Lambda functions need a shared filesystem larger than /tmp" → EFS with an access point.',
      '"Reduce EFS cost for files rarely accessed after a month" → EFS lifecycle management to Infrequent Access / Archive.',
    ],
    pitfalls: [
      'Picking EFS for Windows workloads: EFS is NFS and Linux only.',
      'Choosing Max I/O performance mode by default: General Purpose has lower latency and suits almost everything.',
      'Using Lustre Scratch for data that must survive hardware failure: Scratch does not replicate.',
      'Forgetting the TCP 2049 security group rule on mount targets.',
      'Picking FSx for Windows when the question needs data stored in S3: that points to S3 File Gateway or Lustre-with-S3.',
    ],
    prosCons: [
      {
        option: 'Amazon EFS',
        pros: ['No capacity planning', 'Regional multi-AZ durability', 'Works with Lambda, ECS, EKS'],
        cons: ['Linux/NFS only', 'Higher per-GB cost than S3 or EBS in Standard class'],
        useWhen: 'Shared Linux file storage for fleets, containers or serverless.',
      },
      {
        option: 'FSx for Windows File Server',
        pros: ['Native SMB, NTFS and AD', 'Shadow copies, DFS, dedup', 'Multi-AZ failover'],
        cons: ['Provisioned capacity', 'Windows-centric'],
        useWhen: 'Windows applications and users needing domain-joined file shares.',
      },
      {
        option: 'FSx for Lustre',
        pros: ['Extreme throughput and IOPS', 'Transparent S3 lazy loading and export', 'Cheap Scratch option'],
        cons: ['Linux only', 'Scratch data not replicated', 'Overkill for general file sharing'],
        useWhen: 'HPC, ML training, rendering, genomics on large datasets, often stored in S3.',
      },
      {
        option: 'FSx for NetApp ONTAP',
        pros: ['Multi-protocol including iSCSI', 'Rich NetApp data management', 'SnapMirror from on-prem'],
        cons: ['More complex to operate', 'Higher cost than single-purpose options'],
        useWhen: 'Mixed Windows/Linux access or migrating existing NetApp workloads.',
      },
    ],
    services: ['efs', 'fsx-windows', 'fsx-lustre', 'fsx-ontap', 'fsx-openzfs', 'directory-service', 's3', 'security-group'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-storage-gateway',
    module: 'm3a',
    domain: 'performance',
    title: 'Hybrid Storage: Storage Gateway',
    minutes: 15,
    summary:
      'Match each AWS Storage Gateway type (S3 File, FSx File, Volume cached/stored, Tape) to the on-premises interface it presents and where the data lives, and tell Storage Gateway apart from DataSync.',
    analogy: {
      title: 'A local branch counter for a central warehouse',
      body: `Imagine your office keeps a small counter by the front door. Staff hand files to the counter and pick them up there, the same way they always have. Behind the scenes, the counter clerk sends everything to a huge central warehouse (AWS) and keeps copies of the most recently used items on a shelf behind the counter, so they're handed back instantly.

Staff never change how they work. The office stops buying filing cabinets. And if the building burns down, everything is safe in the warehouse. Storage Gateway is that counter: a familiar local interface (a file share, a disk, a tape library) in front of cloud storage.`,
    },
    sections: [
      {
        heading: 'The problem: datacenters that can\'t move everything yet',
        body: `Many companies have on-premises apps that expect a local file share, a block disk (iSCSI) or a tape library. They want AWS's durability, scale and cheap archive tiers, but they can't rewrite the apps or move them to the cloud yet. Some also have latency needs: users can't wait for every read to cross the WAN.

**AWS Storage Gateway** solves this. It's software you run **on premises** as a **virtual machine** (VMware ESXi, Microsoft Hyper-V or Linux KVM), or as an EC2 instance. It presents standard storage protocols to local servers and stores the data in AWS, keeping a **local cache** of hot data for low-latency access. Data is sent to AWS over **HTTPS** (internet, Direct Connect, or a VPC interface endpoint for private connectivity), compressed and encrypted in transit.`,
      },
      {
        heading: 'The flavours: match the interface to the scenario',
        body: `Pick the gateway type by **what the on-premises app speaks** and **where the primary copy should live**.`,
        table: {
          headers: ['Gateway type', 'Presents on-premises', 'Data lives in', 'Scenario'],
          rows: [
            ['S3 File Gateway', 'NFS (v3, v4.1) or SMB file share', 'S3 objects, one file = one object; recent files cached locally', '"On-prem apps write files, store them in S3, low-latency access to recent files"; feeds S3 lifecycle and analytics'],
            ['FSx File Gateway', 'SMB share', 'FSx for Windows File Server', 'Low-latency local cache for FSx Windows shares (closed to new customers since Oct 2024)'],
            ['Volume Gateway, cached', 'iSCSI block volumes', 'Primary copy in S3; hot blocks cached on-prem', '"Expand on-prem block storage without buying disks"'],
            ['Volume Gateway, stored', 'iSCSI block volumes', 'Primary copy on-prem; async point-in-time EBS snapshots to AWS', '"Keep all data local for latency/compliance, with cloud backup and DR"'],
            ['Tape Gateway', 'Virtual tape library (iSCSI VTL)', 'Virtual tapes in S3; archived tapes in Glacier Flexible or Deep Archive', '"Replace physical tapes, keep existing backup software (Veeam, NetBackup, Commvault)"'],
          ],
        },
      },
      {
        heading: 'S3 File Gateway in detail',
        body: `The most-tested type. Local servers mount an NFS or SMB share; each file written becomes an **S3 object** with the same name (key), so the data is immediately usable by cloud services (Athena, Lambda, analytics, CloudFront).

- **Cache**: recently written and read files are kept on the gateway's local disk (up to 64 TiB) for LAN-speed reads. Writes are acknowledged locally and uploaded asynchronously.
- **Storage classes**: files can land in S3 Standard, Standard-IA, One Zone-IA or Intelligent-Tiering, and **S3 lifecycle rules** can later archive them to Glacier. (Archived objects must be restored in S3 before the gateway can read them.)
- **SMB shares** authenticate against Active Directory; NFS shares use client IP allow lists and squash settings.
- If other processes write to the bucket directly, the gateway won't see those objects until you **refresh the cache** (RefreshCache API or an automated refresh schedule).
- Pricing: S3 storage and requests plus a small per-GB gateway fee for data written to AWS.`,
      },
      {
        heading: 'Volume and Tape Gateways in detail',
        body: `**Volume Gateway** presents iSCSI disks that servers format like local drives.

- **Cached mode**: the full dataset is in S3 (managed by the gateway, not visible as objects); only frequently used blocks stay local. Up to 32 volumes of 32 TiB each (1 PiB per gateway). Saves buying on-prem disk.
- **Stored mode**: the full dataset stays on local disks for lowest latency; the gateway asynchronously uploads **point-in-time snapshots** to AWS as **EBS snapshots**. Up to 32 volumes of 16 TiB each.
- In both modes you can restore a snapshot to an **EBS volume** and attach it to EC2, which makes Volume Gateway a simple DR path: "if the datacenter fails, run the server in AWS from the latest snapshot".

**Tape Gateway** emulates a tape library with drives and a media changer. Existing backup software writes to **virtual tapes** stored in S3. When the software **ejects/archives** a tape, it moves to **S3 Glacier Flexible Retrieval or Glacier Deep Archive**. Retrieving an archived tape takes hours (3–5 hours from Flexible, within 12 hours from Deep Archive). The win: no tape robots, no offsite truck, same backup jobs.`,
      },
      {
        heading: 'Storage Gateway vs DataSync (and friends)',
        body: `The verb in the question decides:

- **Ongoing ACCESS** from on-premises to cloud-backed storage ("users keep using the share every day", "the app must keep writing to a local share") → **Storage Gateway**.
- **TRANSFER / move / sync** data on a schedule ("nightly sync the NAS to S3", "migrate 50 TB of files") → **DataSync**.
- **Partners push files over SFTP** → **Transfer Family**.
- **Petabytes under a deadline with little bandwidth** → **Snowball**.

A common combo: DataSync (or Snowball) for the **initial bulk migration**, then an S3 File Gateway for **ongoing hybrid access**. Another: on-prem users who need a Windows share and nothing in S3 can simply use **FSx for Windows over Direct Connect/VPN**, but every read then crosses the WAN; add a gateway cache only if latency matters.`,
      },
    ],
    diagram: {
      title: 'S3 File Gateway: local share, data in S3',
      groups: [
        { id: 'g-onprem', label: 'On-premises DC', kind: 'onprem', x: 4, y: 6, w: 40, h: 48 },
        { id: 'g-region', label: 'AWS Region', kind: 'region', x: 56, y: 6, w: 40, h: 48 },
      ],
      nodes: [
        { id: 'app', label: 'Windows app', icon: 'server', x: 14, y: 18 },
        { id: 'gw', label: 'S3 File Gateway', icon: 'storage-gateway', x: 32, y: 30, sub: 'VM + local cache' },
        { id: 'backup', label: 'Backup server', icon: 'server', x: 14, y: 44 },
        { id: 's3', label: 'S3 bucket', icon: 's3', x: 70, y: 22, sub: 'one file = one object' },
        { id: 'glacier', label: 'Glacier Deep Arch.', icon: 's3-glacier', x: 86, y: 44, sub: 'lifecycle / tapes' },
      ],
      edges: [
        { id: 'e-app-gw', from: 'app', to: 'gw', label: 'SMB share' },
        { id: 'e-gw-s3', from: 'gw', to: 's3', label: 'HTTPS (DX/VPN/web)' },
        { id: 'e-s3-gl', from: 's3', to: 'glacier', label: 'lifecycle' },
        { id: 'e-bk-gw', from: 'backup', to: 'gw', label: 'virtual tapes', dashed: true },
      ],
      steps: [
        {
          caption: 'The unchanged Windows app writes to what looks like a local SMB share. The gateway acknowledges at LAN speed.',
          highlight: ['app', 'gw', 'e-app-gw'],
          flow: [{ edge: 'e-app-gw' }],
        },
        {
          caption: 'The gateway uploads each file asynchronously over HTTPS, where it becomes an S3 object with the same name.',
          highlight: ['gw', 's3', 'e-gw-s3'],
          flow: [{ edge: 'e-gw-s3' }],
        },
        {
          caption: 'A read of a recently used file is served from the local cache: no WAN round trip.',
          highlight: ['app', 'gw', 'e-app-gw'],
          flow: [{ edge: 'e-app-gw', reverse: true }],
        },
        {
          caption: 'A read of an older file misses the cache; the gateway fetches it from S3 and caches it.',
          highlight: ['gw', 's3', 'e-gw-s3'],
          flow: [{ edge: 'e-gw-s3', reverse: true }],
        },
        {
          caption: 'S3 lifecycle rules archive old objects to Glacier Deep Archive. A Tape Gateway would send ejected virtual tapes there too.',
          highlight: ['s3', 'glacier', 'e-s3-gl', 'backup', 'e-bk-gw'],
          flow: [{ edge: 'e-s3-gl' }, { edge: 'e-bk-gw' }],
        },
      ],
    },
    keyFacts: [
      'Storage Gateway runs on-prem as a VM (VMware, Hyper-V, KVM) or as an EC2 instance; data goes to AWS over HTTPS.',
      'S3 File Gateway: NFS/SMB share, each file stored as an S3 object, recent data cached locally.',
      'FSx File Gateway: SMB cache in front of FSx for Windows; no longer available to new customers since October 2024.',
      'Volume Gateway cached: primary data in S3, hot blocks local. Stored: primary data local, async EBS snapshots to AWS.',
      'Tape Gateway: iSCSI virtual tape library; archived tapes go to Glacier Flexible Retrieval or Deep Archive.',
      'Volume Gateway snapshots can be restored as EBS volumes for EC2: a simple DR path.',
      'S3 File Gateway objects can use S3 lifecycle rules and any S3 class except direct writes to Glacier tiers.',
      'Use RefreshCache when objects are added to the bucket outside the gateway.',
    ],
    examTips: [
      '"On-prem Windows app writes to a local share; store all files durably in S3 with LAN-speed access to recent files, no app changes" → S3 File Gateway with an SMB share. DataSync only moves data on a schedule; FSx for Windows puts every access across the WAN and the data isn\'t in S3.',
      '"Replace physical tape backups but keep the existing backup software" → Tape Gateway, archiving to Glacier Deep Archive.',
      '"Expand on-prem block storage capacity without buying hardware" → Volume Gateway cached mode.',
      '"Keep the full dataset on-prem for low latency but back it up to AWS" → Volume Gateway stored mode.',
      'Verbs decide: "keep using it daily" = Storage Gateway; "move/migrate/sync it" = DataSync.',
    ],
    pitfalls: [
      'Using Storage Gateway for a one-time bulk migration: DataSync or Snowball is the transfer tool.',
      'Confusing cached and stored Volume Gateway: cached keeps the primary copy in S3; stored keeps it on-prem.',
      'Expecting Volume Gateway data to be readable as S3 objects: only File Gateway maps files to objects.',
      'Recommending FSx File Gateway for a new deployment: it is closed to new customers.',
    ],
    prosCons: [
      {
        option: 'S3 File Gateway',
        pros: ['No app change; NFS/SMB', 'Data usable as S3 objects', 'Local cache for hot files'],
        cons: ['Cache misses cross the WAN', 'Objects written directly to S3 need a cache refresh'],
        useWhen: 'On-prem apps writing files that should live in S3 with fast local access.',
      },
      {
        option: 'Volume Gateway (cached / stored)',
        pros: ['Block storage for on-prem servers', 'EBS snapshots enable DR in EC2'],
        cons: ['Data not accessible as individual S3 objects', 'iSCSI management overhead'],
        useWhen: 'Block-level apps that need cloud capacity (cached) or cloud backup (stored).',
      },
      {
        option: 'Tape Gateway',
        pros: ['Works with existing backup software', 'Cheap archive in Glacier Deep Archive', 'No physical tapes'],
        cons: ['Archived tape retrieval takes hours', 'Only for backup workflows'],
        useWhen: 'Replacing tape libraries and offsite tape storage.',
      },
      {
        option: 'DataSync instead',
        pros: ['Fast, verified, scheduled transfers', 'Many sources and destinations'],
        cons: ['No live local share or cache'],
        useWhen: 'Moving or periodically syncing data rather than accessing it continuously.',
      },
    ],
    services: ['storage-gateway', 's3', 's3-glacier', 'fsx-windows', 'ebs', 'direct-connect', 'datasync'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-migration',
    module: 'm3a',
    domain: 'performance',
    title: 'Getting Data & Servers into AWS',
    minutes: 22,
    summary:
      'Do the bandwidth math to decide between online and offline transfer, then pick DataSync, the Snow family, Transfer Family, DMS (with schema conversion) or Application Migration Service from the verbs in a scenario.',
    analogy: {
      title: 'Moving house',
      body: `Moving a few boxes? Put them in your car and drive back and forth (online transfer over the network). Moving a whole house across the country? Driving 400 car trips would take months, so you hire a **moving truck** that you load at your own pace and ship (Snowball).

Your **mail** keeps arriving at the old address, so you set up forwarding: the old address stays live until the day you switch (database migration with continuous replication). Your **furniture** goes exactly as it is, no redesign (rehosting servers with MGN). And the **neighbours** who drop off packages keep using the same mailbox they always have (Transfer Family keeps partners on SFTP).`,
    },
    sections: [
      {
        heading: 'Online vs offline: do the bandwidth math first',
        body: `**Transfer time = data size ÷ usable bandwidth.** Convert carefully: 1 byte = 8 bits, and 1 Gbps moves about 125 MB per second, roughly **10.8 TB per day** at 100% utilisation. Real links rarely give you 100%, especially if production traffic shares them.

Rule of thumb: **if it would take more than about a week over the network, or the link is needed for the business, ship a device.** If the scenario gives you a data size, a link speed and a deadline, compute it; the numbers usually make the answer obvious.`,
        table: {
          headers: ['Data', '50 Mbps', '100 Mbps', '1 Gbps', '10 Gbps'],
          rows: [
            ['10 TB', '~19 days', '~9 days', '~22 hours', '~2 hours'],
            ['90 TB', '~5.5 months', '~83 days', '~8 days', '~20 hours'],
            ['100 TB', '~6 months', '~3 months', '~9 days', '~22 hours'],
            ['1 PB', '~5 years', '~2.5 years', '~3 months', '~9 days'],
          ],
        },
      },
      {
        heading: 'AWS DataSync: managed online transfer',
        body: `**AWS DataSync** moves file and object data over the network, much faster and more reliably than scripts (AWS quotes up to 10x faster than open-source tools like rsync).

- **Sources**: NFS, SMB, HDFS, self-managed object storage, other clouds, and AWS storage. A **DataSync agent** (a VM on-premises, or EC2) reads local storage; AWS-to-AWS transfers need no agent.
- **Destinations**: S3 (any storage class), EFS, and all four FSx filesystems.
- **Tasks** can run once or on a **schedule** (hourly, daily, weekly). Each run copies only what changed, **verifies integrity**, preserves metadata and permissions, and can be **bandwidth-throttled** so it doesn't starve production traffic.
- Encrypted in transit with TLS; can run over Direct Connect or VPN using a VPC endpoint for a fully private path.
- Pricing: a flat fee per GB copied (about $0.0125/GB).

Trigger phrases: "migrate file shares to EFS/FSx/S3", "nightly sync of the NAS to S3", "replicate between EFS filesystems", "copy data between AWS storage services".`,
      },
      {
        heading: 'The Snow family: offline transfer and edge computing',
        body: `**AWS Snowball Edge** devices are rugged, tamper-resistant, encrypted appliances that AWS ships to you. The workflow:

- Order the job in the console, choosing the target S3 bucket and a KMS key.
- The device arrives in days. Connect it to your LAN and copy data at local speed (using the S3-compatible interface, NFS, or the Snowball client).
- Ship it back; the E Ink label updates automatically. AWS imports the data into **S3**, then securely wipes the device to NIST standards.

Details the exam uses:

- **Snowball Edge Storage Optimized**: about **80 TB** usable on the long-standing model (a 210 TB NVMe model arrived in 2024). Order several devices in parallel for petabytes.
- **Snowball Edge Compute Optimized**: more vCPUs and optional GPU for **edge computing** in disconnected places (ships, mines, field hospitals), running EC2 instances and Lambda locally.
- Data lands in **S3**, not directly in Glacier. To archive, import to S3 and add a lifecycle rule.
- **Retired devices**: Snowmobile (the 100 PB truck) and Snowcone (the small 8 TB device) are no longer offered; an exam option naming them is outdated.`,
      },
      {
        heading: 'AWS Transfer Family: keep partners on SFTP',
        body: `**AWS Transfer Family** gives you fully managed **SFTP, FTPS, FTP and AS2** endpoints that store files directly in **S3** or **EFS**. External partners keep their existing scripts and tools; only the hostname changes (and with a Route 53 custom domain, not even that).

- Authentication: service-managed users with SSH keys, Active Directory, or a custom identity provider through Lambda or API Gateway.
- Endpoints can be public or inside a VPC (plain FTP is only allowed inside a VPC because it's unencrypted).
- Uploaded files land as S3 objects, so S3 events can trigger processing immediately; managed workflows can decrypt, tag or copy files after upload.
- Pricing: per hour per enabled protocol endpoint plus per GB transferred.

Trigger: "partners already upload via SFTP and must not change their process", "B2B file exchange", "AS2 for EDI".`,
      },
      {
        heading: 'Databases: DMS and schema conversion',
        body: `**AWS Database Migration Service (DMS)** migrates databases while the **source stays online**:

- A **replication instance** (or **DMS Serverless**, which scales capacity for you) connects a **source endpoint** and a **target endpoint**.
- **Full load** copies existing data; **CDC (change data capture)** then streams ongoing changes from the source's transaction log, so the target stays in sync until you cut over with minutes of downtime.
- Sources and targets include Oracle, SQL Server, MySQL, PostgreSQL, MariaDB, MongoDB, Aurora, and targets such as S3, DynamoDB, Redshift, Kinesis and OpenSearch.
- Use a **Multi-AZ** replication instance for a resilient migration.

**Homogeneous** migrations (MySQL → Aurora MySQL, Oracle → RDS for Oracle) need only DMS. **Heterogeneous** migrations (Oracle → Aurora PostgreSQL, SQL Server → MySQL) also need **schema conversion**: tables, views, stored procedures and functions rewritten for the new engine. Use the **AWS Schema Conversion Tool (SCT)** desktop app or **DMS Schema Conversion**, the managed version built into the DMS console. Both produce an assessment report of what can't be converted automatically.`,
      },
      {
        heading: 'Servers: Application Migration Service (MGN)',
        body: `**AWS Application Migration Service (MGN)** is the recommended tool for **lift-and-shift ("rehost")** of whole servers: physical machines, VMware, Hyper-V, or VMs in other clouds.

- Install the **replication agent** on each source server. It performs continuous **block-level replication** of every disk to a low-cost **staging area** in your AWS account (small EC2 replication servers and EBS volumes).
- Launch **test instances** at any time without disrupting the source.
- At **cutover**, MGN converts the replicated disks and launches the servers as **EC2 instances**, with downtime measured in minutes.
- Free for 90 days per server (you pay for the staging EC2 and EBS). It replaced CloudEndure Migration and the retired Server Migration Service (SMS); if an option says SMS, it's outdated.

The same replication engine powers **AWS Elastic Disaster Recovery** (continuous replication for DR rather than migration).`,
      },
      {
        heading: 'Planning: discovery, tracking and the 7 Rs',
        beyond: true,
        body: `- **AWS Application Discovery Service** inventories on-premises servers: specs, utilisation and network **dependencies** between them, either agentless (a collector in VMware vCenter) or with agents for deeper data. Use it to right-size EC2 and group servers into migration waves.
- **AWS Migration Hub** is the single place to track migration progress across MGN, DMS and partner tools.
- AWS now also offers **AWS Transform**, an AI-driven service that automates parts of VMware, mainframe and .NET migrations; exam questions still center on the tools above.
- The **7 Rs** of migration strategy: **Retire** (switch off), **Retain** (keep on-prem), **Rehost** (lift-and-shift with MGN), **Relocate** (move VMware as is to VMware Cloud on AWS), **Replatform** (small changes, such as self-managed MySQL → RDS), **Repurchase** (move to SaaS), **Refactor** (re-architect, for example to serverless).`,
      },
      {
        heading: 'Disambiguation drill',
        body: `The verb and the object in the question pick the tool.`,
        table: {
          headers: ['Scenario wording', 'Tool', 'Why not the others'],
          rows: [
            ['"Recurring/nightly sync of files over the network", "migrate NAS to EFS/FSx"', 'DataSync', 'Gateway is for ongoing access; Snowball is offline'],
            ['"Keep accessing the data from on-premises afterward"', 'Storage Gateway (S3 File Gateway)', 'DataSync moves data but presents no live share'],
            ['"Partners push files via SFTP, no change to their process"', 'Transfer Family', 'DataSync needs an agent on the partner side'],
            ['"Petabytes", "limited bandwidth", "deadline", "disconnected site"', 'Snowball Edge', 'Network transfer would take months'],
            ['"Migrate a database with minimal downtime"', 'DMS with CDC (+ SCT for different engines)', 'File tools do not understand transactions'],
            ['"Lift-and-shift hundreds of VMs/physical servers"', 'Application Migration Service (MGN)', 'DMS only moves databases; DataSync only files'],
          ],
        },
      },
    ],
    diagram: {
      title: 'Picking the migration tool per workload',
      groups: [
        { id: 'g-onprem', label: 'On-premises DC', kind: 'onprem', x: 4, y: 4, w: 22, h: 52 },
        { id: 'g-region', label: 'AWS Region', kind: 'region', x: 66, y: 4, w: 30, h: 52 },
      ],
      nodes: [
        { id: 'nas', label: 'NAS 90 TB', icon: 'server', x: 15, y: 14 },
        { id: 'db', label: 'Oracle DB', icon: 'database', x: 15, y: 32 },
        { id: 'srv', label: '200 VMs', icon: 'onprem', x: 15, y: 48 },
        { id: 'ds', label: 'DataSync', icon: 'datasync', x: 44, y: 10 },
        { id: 'snow', label: 'Snowball Edge', icon: 'snow-family', x: 44, y: 22 },
        { id: 'dms', label: 'DMS + SCT', icon: 'dms', x: 44, y: 34 },
        { id: 'mgn', label: 'MGN', icon: 'mgn', x: 44, y: 48 },
        { id: 's3', label: 'Amazon S3', icon: 's3', x: 81, y: 16 },
        { id: 'aurora', label: 'Aurora PostgreSQL', icon: 'aurora', x: 81, y: 34 },
        { id: 'ec2', label: 'EC2 instances', icon: 'ec2', x: 81, y: 48 },
      ],
      edges: [
        { id: 'e-nas-ds', from: 'nas', to: 'ds', label: '50 Mbps link' },
        { id: 'e-ds-s3', from: 'ds', to: 's3', label: 'nightly delta' },
        { id: 'e-nas-snow', from: 'nas', to: 'snow', label: 'LAN copy' },
        { id: 'e-snow-s3', from: 'snow', to: 's3', label: 'shipped', dashed: true },
        { id: 'e-db-dms', from: 'db', to: 'dms', label: 'full load + CDC' },
        { id: 'e-dms-aur', from: 'dms', to: 'aurora' },
        { id: 'e-srv-mgn', from: 'srv', to: 'mgn', label: 'block replication' },
        { id: 'e-mgn-ec2', from: 'mgn', to: 'ec2', label: 'cutover' },
      ],
      steps: [
        {
          caption: 'Bandwidth math: 90 TB over a busy 50 Mbps link would take about 5.5 months. A 3-week deadline rules out the network for the bulk copy.',
          highlight: ['nas', 'e-nas-ds'],
          flow: [{ edge: 'e-nas-ds', color: 'bad' }],
          fail: ['e-nas-ds'],
        },
        {
          caption: 'Order Snowball Edge devices, copy at LAN speed, ship them back. AWS imports the data into S3 within the deadline.',
          highlight: ['nas', 'snow', 's3', 'e-nas-snow', 'e-snow-s3'],
          flow: [{ edge: 'e-nas-snow' }, { edge: 'e-snow-s3' }],
        },
        {
          caption: 'After the bulk load, a scheduled DataSync task copies only each night\'s changes, verified and bandwidth-throttled.',
          highlight: ['ds', 's3', 'e-ds-s3'],
          flow: [{ edge: 'e-nas-ds' }, { edge: 'e-ds-s3' }],
        },
        {
          caption: 'The Oracle database moves to Aurora PostgreSQL: SCT converts the schema, then DMS runs a full load and streams changes with CDC.',
          highlight: ['db', 'dms', 'aurora', 'e-db-dms', 'e-dms-aur'],
          flow: [{ edge: 'e-db-dms' }, { edge: 'e-dms-aur' }],
        },
        {
          caption: 'The source stays online during replication. Cutover is a short pause while apps are repointed to Aurora.',
          highlight: ['db', 'aurora'],
        },
        {
          caption: 'The 200 VMs are rehosted with MGN: continuous block-level replication, test launches, then cutover to EC2 in minutes.',
          highlight: ['srv', 'mgn', 'ec2', 'e-srv-mgn', 'e-mgn-ec2'],
          flow: [{ edge: 'e-srv-mgn' }, { edge: 'e-mgn-ec2' }],
        },
      ],
    },
    keyFacts: [
      '1 Gbps ≈ 125 MB/s ≈ 10.8 TB/day at full utilisation; 100 TB over 1 Gbps ≈ 9–10 days; over 100 Mbps ≈ 3 months.',
      'If a network transfer takes more than about a week, or would saturate a production link, use Snowball.',
      'DataSync: agent-based online transfer from NFS/SMB/HDFS/object to S3, EFS or FSx; scheduled, incremental, verified, throttleable.',
      'Snowball Edge Storage Optimized: ~80 TB usable (210 TB on the 2024 model); data imports into S3, not directly into Glacier.',
      'Snowmobile and Snowcone are retired.',
      'Transfer Family: managed SFTP/FTPS/FTP/AS2 into S3 or EFS.',
      'DMS keeps the source online; full load + CDC for minimal downtime. Heterogeneous engines need SCT or DMS Schema Conversion.',
      'MGN: agent-based block-level replication of whole servers, cutover launches EC2 instances; replaced SMS and CloudEndure Migration.',
      'Application Discovery Service maps server inventory and dependencies; Migration Hub tracks progress.',
    ],
    examTips: [
      '"90 TB, 50 Mbps link saturated by daily business, must finish in 3 weeks" → Snowball Edge. DataSync would take 5+ months; Transfer Acceleration cannot exceed the 50 Mbps pipe.',
      '"Nightly sync of an on-prem NAS to S3" → DataSync scheduled task (not Storage Gateway, which is for ongoing access).',
      '"Partners upload via SFTP and must not change their process" → Transfer Family with an S3 backend.',
      '"Migrate Oracle to Aurora PostgreSQL with minimal downtime" → SCT (or DMS Schema Conversion) for the schema, then DMS with CDC.',
      '"Lift-and-shift hundreds of on-prem VMs with minimal downtime" → Application Migration Service.',
      '"Remote site with no connectivity needs local compute and data collection" → Snowball Edge Compute Optimized.',
      '"Understand server dependencies before migrating" → Application Discovery Service.',
    ],
    pitfalls: [
      'Forgetting bits vs bytes: 1 Gbps is 125 MB/s, not 1 GB/s.',
      'Choosing Transfer Acceleration or a faster S3 setting when the customer\'s own uplink is the bottleneck.',
      'Expecting Snowball to write directly into Glacier: it imports to S3; use lifecycle afterwards.',
      'Using DataSync when the question requires the data to remain accessible from on-prem as a share: that is Storage Gateway.',
      'Forgetting SCT for heterogeneous database migrations: DMS alone moves data, not stored procedures.',
      'Picking retired services (Server Migration Service, Snowmobile, Snowcone) from older question banks.',
    ],
    prosCons: [
      {
        option: 'DataSync (online)',
        pros: ['Automated, scheduled, incremental', 'Integrity verification', 'Many sources and AWS targets'],
        cons: ['Bound by network bandwidth', 'Agent to deploy for on-prem sources'],
        useWhen: 'The data fits through the network within the deadline, or ongoing sync is needed.',
      },
      {
        option: 'Snowball Edge (offline)',
        pros: ['Moves tens of TB per device regardless of WAN speed', 'Spares the production link', 'Edge compute option'],
        cons: ['Shipping turnaround of days', 'One-time snapshot; changes after loading need another tool'],
        useWhen: 'Large datasets, slow or busy links, tight deadlines, or disconnected sites.',
      },
      {
        option: 'DMS',
        pros: ['Source stays online', 'CDC for near-zero downtime', 'Many engines and targets'],
        cons: ['Needs SCT for different engines', 'Does not convert application code'],
        useWhen: 'Any database migration or ongoing database replication.',
      },
      {
        option: 'Application Migration Service',
        pros: ['Whole-server rehost with no app changes', 'Non-disruptive tests', 'Minutes of cutover downtime'],
        cons: ['Lift-and-shift only: no modernisation', 'Staging-area costs during replication'],
        useWhen: 'Moving fleets of VMs or physical servers to EC2 quickly.',
      },
    ],
    services: ['datasync', 'snow-family', 'transfer-family', 'dms', 'mgn', 'application-discovery', 'migration-hub', 's3', 'aurora'],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'm3a-ref-media',
    module: 'm3a',
    domain: 'performance',
    title: 'Reference Architecture: Media Asset Pipeline',
    minutes: 25,
    summary:
      'Derive a complete storage design for a global photo platform from its requirements, tier by tier, and defend each choice against the alternatives an exam question would offer.',
    analogy: {
      title: 'A photo lab with a mailroom, darkroom, shop window and archive',
      body: `Think of an old-fashioned photo lab. The **mailroom** accepts film from customers all over the world, who post it straight to the lab rather than through the front desk (direct upload). The **darkroom** makes small prints of every roll automatically as it arrives (thumbnails). The **shop window** shows prints to passers-by through glass, so nobody can reach in and grab the negatives (CDN in front of a private bucket).

Old negatives go to cheaper back rooms, then an off-site vault, and are destroyed after 10 years (lifecycle). Legal negatives sit in a time-locked safe (Object Lock) with a copy in another city (replication). And the editors' office down the road has a local cabinet that's secretly connected to the lab (File Gateway).`,
    },
    sections: [
      {
        heading: 'The requirements',
        body: `A photo platform has these requirements. Each one will select a specific feature; that mapping is the skill the exam tests.

- **R1**: Users worldwide upload originals (often 20–200 MB RAW files), and uploads must be fast from any continent.
- **R2**: The app servers should not become a bottleneck or a cost centre for file bytes.
- **R3**: Every upload gets thumbnails automatically.
- **R4**: Images are served to millions of viewers with low latency; the buckets must never be public.
- **R5**: Recent images are hot; access to older ones drops fast but unpredictably.
- **R6**: Originals must be kept **10 years** for legal reasons, unalterable, and survive a Regional disaster.
- **R7**: An editing office on-premises needs file-share access to recent work at LAN speed.
- **R8**: A 60 TB back-catalogue must be loaded, and camera-card dumps from the office arrive every night.`,
      },
      {
        heading: 'Tier 1: ingest (R1, R2)',
        body: `**Design**: the browser asks the API (API Gateway + Lambda) for a **presigned PUT URL**, then uploads **directly to S3** using **multipart upload** and the **Transfer Acceleration** endpoint.

**Why**:

- A presigned URL lets an unauthenticated browser write one specific key, for a few minutes, with the backend's permissions. The app servers only sign URLs (milliseconds of work); they never touch the bytes, so they don't need to scale with upload volume (R2).
- Multipart upload parallelises big RAW files and retries only failed parts.
- Transfer Acceleration routes uploads from Sydney or São Paulo into the nearest edge location, then over the AWS backbone to the bucket's Region (R1).

**Alternatives considered**:

- **Upload through EC2 behind an ALB**: works, but every byte crosses your fleet; you pay for instances and bandwidth and must scale them for upload spikes.
- **A bucket per Region near users**: lower latency, but you then have to aggregate data and manage many buckets. Acceleration gets most of the benefit with one bucket.
- **Transfer Family SFTP**: right for B2B partners with existing SFTP tooling, wrong for browsers and mobile apps.`,
      },
      {
        heading: 'Tier 2: processing (R3)',
        body: `**Design**: S3 sends **ObjectCreated** events for the \`originals/\` prefix to **EventBridge**; a rule invokes a **Lambda** function that writes thumbnails into a separate **derived bucket**.

**Why**:

- Events make the pipeline automatic and serverless: no polling, scales with uploads, pay per invocation.
- EventBridge lets you add consumers later (moderation, indexing, analytics) without touching the first rule, and filter on size or key.
- A **separate output bucket** avoids the classic **recursive loop**: if the Lambda wrote thumbnails back to the same bucket and prefix, each write would trigger it again.

**Alternatives considered**:

- **Native S3 → Lambda notification**: simpler and fine for one consumer; harder to extend.
- **S3 → SQS → EC2 or ECS workers**: better for long jobs (Lambda's limit is 15 minutes) or to smooth huge bursts; more to operate.
- **Video**: for transcoding, the managed answer is **AWS Elemental MediaConvert** triggered the same way.`,
      },
      {
        heading: 'Tier 3: serving (R4)',
        body: `**Design**: **CloudFront** in front of both buckets, using **Origin Access Control (OAC)**. Both buckets stay private with **Block Public Access** on; the bucket policies allow only the CloudFront distribution. A custom domain uses an **ACM** certificate.

**Why**:

- Edge caching gives low latency worldwide and removes most GETs from S3 (cheaper than S3 data transfer out for heavy traffic).
- OAC means the only path to the objects is through CloudFront, which can add AWS WAF, geo restrictions and signed URLs or cookies for paid content.

**Alternatives considered**:

- **S3 static website hosting**: HTTP only and requires a public bucket, which breaks R4.
- **EC2/ALB image servers**: unnecessary compute for static files.
- **Presigned GET URLs per image**: secure, but no edge caching for millions of viewers.`,
      },
      {
        heading: 'Tier 4: cost curve (R5)',
        body: `**Design**:

- **Originals** bucket: **S3 Intelligent-Tiering** (access drops unpredictably), plus lifecycle rules: transition to **Glacier Flexible Retrieval after 180 days**, to **Deep Archive after 2 years**, and **expire at 10 years**. Also **AbortIncompleteMultipartUpload after 7 days** for abandoned uploads.
- **Derived** bucket: **One Zone-IA** after 30 days, because thumbnails can be regenerated from originals.

**Why**:

- Intelligent-Tiering never guesses wrong: hot objects stay in Frequent Access, cold ones drop to cheaper tiers, with **no retrieval fees** if an old photo suddenly goes viral.
- After 180 days the business accepts restores taking hours for originals (viewers see thumbnails), so the deeper Glacier classes are safe.
- One Zone-IA is about 20% cheaper than Standard-IA. Losing an AZ only means regenerating thumbnails.

**Alternatives considered**:

- **Lifecycle straight to Standard-IA**: cheaper storage, but per-GB retrieval fees punish unpredictable re-access and a 128 KB minimum hurts small objects.
- **Glacier for thumbnails**: breaks serving; images would need a restore.
- **Everything in Standard**: simplest, but at hundreds of TB it can cost 10–20x more than the tiered design.`,
      },
      {
        heading: 'Tier 5: protection and DR (R6)',
        body: `**Design**: **versioning** + **S3 Object Lock in Compliance mode** with a default retention of 10 years on the originals bucket, and **Cross-Region Replication** to a bucket in a second Region (with Object Lock there too).

**Why**:

- Compliance mode means **no one, including root**, can delete or alter an original before 10 years. Lifecycle can still transition locked objects to cheaper classes; expiry succeeds once retention lapses.
- CRR keeps a copy in another Region for disaster recovery. Version deletes are never replicated, so a compromised source can't wipe the replica. The replica can land in a colder class (for example Glacier Flexible) if a slower recovery is acceptable.

**Alternatives considered**:

- **Governance mode**: privileged users can override, so it fails "unalterable".
- **MFA Delete or a Deny bucket policy**: root or an admin can still delete or edit the policy.
- **AWS Backup for S3**: good for point-in-time recovery from bad writes; complementary rather than a replacement for WORM retention.`,
      },
      {
        heading: 'Tier 6: hybrid access and migration (R7, R8)',
        body: `**Design**: the editing office mounts an **S3 File Gateway** SMB share backed by the originals bucket. The **60 TB back-catalogue** arrived on **Snowball Edge**. Nightly **camera-card dumps** sync with a scheduled **DataSync** task.

**Why**:

- The gateway keeps recent files cached locally at LAN speed while every file is an S3 object, so it flows into the same events, lifecycle and protection.
- 60 TB over a 100 Mbps office link would take about 55 days; a Snowball turns it into roughly a week, without saturating the office link.
- DataSync is built for recurring, incremental, verified transfers over the network.

**Alternatives considered**:

- **FSx for Windows over VPN**: a real SMB share, but every read crosses the WAN and the data isn't in S3, so it misses the pipeline.
- **DataSync for the back-catalogue**: technically possible, but months of transfer and a saturated link.
- **Storage Gateway for the nightly dumps**: it would work if editors also need the share, but for pure transfer DataSync is the purpose-built answer.`,
      },
      {
        heading: 'Re-derive it: requirement → feature',
        body: `Cover the right-hand column and try to name each feature from the requirement alone.`,
        table: {
          headers: ['Requirement', 'Feature chosen', 'Rejected alternative'],
          rows: [
            ['Fast global uploads', 'Transfer Acceleration + multipart', 'Per-Region buckets'],
            ['App servers never touch bytes', 'Presigned PUT URLs', 'Upload via EC2/ALB'],
            ['Automatic thumbnails', 'S3 event → EventBridge → Lambda, separate bucket', 'Polling with cron jobs'],
            ['Low-latency serving, private buckets', 'CloudFront + OAC + Block Public Access', 'S3 website hosting'],
            ['Unpredictable access decay', 'Intelligent-Tiering + lifecycle to Glacier', 'Fixed Standard-IA'],
            ['Re-creatable derived data', 'One Zone-IA', 'Standard-IA'],
            ['10-year unalterable retention', 'Versioning + Object Lock Compliance', 'Governance mode / MFA Delete'],
            ['Survive a Regional disaster', 'Cross-Region Replication', 'Same-Region Replication'],
            ['On-prem LAN-speed file access', 'S3 File Gateway', 'FSx for Windows over VPN'],
            ['60 TB initial load', 'Snowball Edge', 'DataSync over 100 Mbps'],
            ['Nightly incremental sync', 'DataSync scheduled task', 'Storage Gateway'],
          ],
        },
      },
    ],
    diagram: {
      title: 'Media asset pipeline end to end',
      groups: [
        { id: 'g-onprem', label: 'Editing office', kind: 'onprem', x: 4, y: 40, w: 24, h: 16 },
        { id: 'g-r1', label: 'Primary Region', kind: 'region', x: 32, y: 4, w: 50, h: 34 },
        { id: 'g-r2', label: 'DR Region', kind: 'region', x: 46, y: 42, w: 22, h: 14 },
      ],
      nodes: [
        { id: 'user', label: 'Global users', icon: 'users', x: 12, y: 20 },
        { id: 'api', label: 'Upload API', icon: 'api-gateway', x: 40, y: 12, sub: 'signs PUT URLs' },
        { id: 'orig', label: 'Originals bucket', icon: 's3', x: 40, y: 30, sub: 'Int-Tiering + Lock' },
        { id: 'eb', label: 'EventBridge', icon: 'eventbridge', x: 56, y: 12 },
        { id: 'fn', label: 'Thumbnail fn', icon: 'lambda', x: 72, y: 12 },
        { id: 'derived', label: 'Derived bucket', icon: 's3', x: 72, y: 30, sub: 'One Zone-IA' },
        { id: 'cf', label: 'CloudFront', icon: 'cloudfront', x: 91, y: 20, sub: 'OAC, ACM cert' },
        { id: 'gw', label: 'S3 File Gateway', icon: 'storage-gateway', x: 16, y: 48 },
        { id: 'dr', label: 'DR bucket', icon: 's3', x: 57, y: 49, sub: 'CRR + Lock' },
      ],
      edges: [
        { id: 'e-user-api', from: 'user', to: 'api', label: 'get URL' },
        { id: 'e-user-orig', from: 'user', to: 'orig', label: 'PUT, accelerated' },
        { id: 'e-orig-eb', from: 'orig', to: 'eb', label: 'ObjectCreated' },
        { id: 'e-eb-fn', from: 'eb', to: 'fn' },
        { id: 'e-fn-der', from: 'fn', to: 'derived', label: 'thumbnails' },
        { id: 'e-der-cf', from: 'derived', to: 'cf', label: 'OAC' },
        { id: 'e-cf-user', from: 'cf', to: 'user', label: 'HTTPS', dashed: true },
        { id: 'e-orig-dr', from: 'orig', to: 'dr', label: 'CRR' },
        { id: 'e-gw-orig', from: 'gw', to: 'orig', label: 'SMB share' },
      ],
      steps: [
        {
          caption: 'Ingest: the browser asks the API for a presigned PUT URL. The API signs it in milliseconds and never handles the file.',
          highlight: ['user', 'api', 'e-user-api'],
          flow: [{ edge: 'e-user-api' }, { edge: 'e-user-api', reverse: true }],
        },
        {
          caption: 'The browser uploads the RAW file directly to S3 with multipart upload via the Transfer Acceleration endpoint.',
          highlight: ['user', 'orig', 'e-user-orig'],
          flow: [{ edge: 'e-user-orig' }],
        },
        {
          caption: 'Processing: ObjectCreated goes to EventBridge, which runs the thumbnail Lambda. Output goes to a separate bucket to avoid a trigger loop.',
          highlight: ['orig', 'eb', 'fn', 'derived', 'e-orig-eb', 'e-eb-fn', 'e-fn-der'],
          flow: [{ edge: 'e-orig-eb' }, { edge: 'e-eb-fn' }, { edge: 'e-fn-der' }],
        },
        {
          caption: 'Serving: CloudFront with OAC reads the private derived bucket and caches thumbnails at the edge for millions of viewers.',
          highlight: ['derived', 'cf', 'e-der-cf', 'e-cf-user', 'user'],
          flow: [{ edge: 'e-der-cf' }, { edge: 'e-cf-user' }],
        },
        {
          caption: 'Cost: originals sit in Intelligent-Tiering, then lifecycle to Glacier Flexible at 180 days, Deep Archive at 2 years, expiry at 10 years.',
          highlight: ['orig', 'derived'],
        },
        {
          caption: 'Protection: Object Lock Compliance blocks any delete for 10 years, and CRR keeps a locked copy in a second Region.',
          highlight: ['orig', 'dr', 'e-orig-dr', 'g-r2'],
          flow: [{ edge: 'e-orig-dr' }],
        },
        {
          caption: 'Hybrid: editors use an S3 File Gateway share with recent files cached at LAN speed; every save lands in the originals bucket.',
          highlight: ['gw', 'orig', 'e-gw-orig', 'g-onprem'],
          flow: [{ edge: 'e-gw-orig' }],
        },
      ],
    },
    keyFacts: [
      'Presigned PUT URLs let clients upload directly to S3 so app servers never handle file bytes.',
      'Transfer Acceleration + multipart upload is the fast global upload pattern into one bucket.',
      'Write Lambda output to a different bucket or prefix than the trigger to avoid recursive invocations.',
      'CloudFront + OAC + Block Public Access serves content from fully private buckets.',
      'Intelligent-Tiering for unpredictable access; lifecycle rules can still transition Intelligent-Tiering objects to Glacier classes.',
      'One Zone-IA fits re-creatable derived data like thumbnails.',
      'Object Lock Compliance plus versioning meets "unalterable for N years"; lifecycle transitions still work on locked objects.',
      'CRR provides the cross-Region DR copy; version deletes never replicate.',
      'Snowball for the bulk back-catalogue, DataSync for recurring incremental sync, S3 File Gateway for ongoing on-prem access.',
    ],
    examTips: [
      'Map every requirement phrase to one feature before reading the options; most wrong options fail exactly one requirement.',
      '"Users upload large files directly without going through the web servers" → presigned URLs (with Transfer Acceleration for global users).',
      '"Generate thumbnails for every uploaded image, serverless" → S3 event (via EventBridge or directly) → Lambda writing to a separate bucket.',
      '"Serve images globally with low latency while keeping the bucket private" → CloudFront with OAC.',
      '"Keep originals 10 years, unalterable by anyone, cheapest storage over time" → Object Lock Compliance + lifecycle down to Deep Archive + expiration at 10 years.',
      '"On-prem editors need low-latency file access to data stored in S3" → S3 File Gateway; "initial 60 TB load over a slow link" → Snowball Edge.',
    ],
    pitfalls: [
      'Writing thumbnails back into the triggering bucket/prefix and creating an infinite Lambda loop.',
      'Using S3 website hosting for production serving: HTTP only and requires a public bucket.',
      'Putting the only copy of originals in One Zone-IA: reserve it for re-creatable data.',
      'Choosing Governance mode or MFA Delete for "unalterable": only Compliance mode stops root.',
      'Using one tool for every data movement: bulk load, recurring sync and live access each have their own service.',
    ],
    prosCons: [
      {
        option: 'Direct-to-S3 uploads with presigned URLs',
        pros: ['App tier does not scale with bytes', 'Combines with multipart and Transfer Acceleration', 'Fine-grained, time-limited permission'],
        cons: ['Backend must issue and scope URLs carefully', 'Validation happens after upload (via events)'],
        useWhen: 'Web or mobile clients upload user-generated files.',
      },
      {
        option: 'Uploads proxied through EC2/ALB',
        pros: ['Validate content before storage', 'Single endpoint to control'],
        cons: ['Fleet must scale with upload volume', 'Extra cost and latency'],
        useWhen: 'Files must be inspected or transformed before they ever reach storage.',
      },
      {
        option: 'Intelligent-Tiering + lifecycle',
        pros: ['Handles unpredictable access with no retrieval fees', 'Still reaches archive prices'],
        cons: ['Monitoring fee per object', 'Small objects never tier down'],
        useWhen: 'Large objects with access that decays unpredictably.',
      },
      {
        option: 'S3 File Gateway for editors',
        pros: ['LAN-speed access to recent files', 'Data lands in S3 and joins the pipeline'],
        cons: ['Cache misses cross the WAN', 'VM to run and size on-prem'],
        useWhen: 'On-prem users need a file share whose data should live in S3.',
      },
    ],
    services: ['s3', 'cloudfront', 'lambda', 'eventbridge', 'api-gateway', 'storage-gateway', 'datasync', 'snow-family', 's3-replication', 's3-glacier'],
  },
] satisfies Lesson[];
