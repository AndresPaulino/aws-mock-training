// IAM + KMS labs: lock down root, users & groups, least-privilege role, customer managed key.
import type { CloudState, IamGroup } from '../cloud/types';
import type { Lab } from './index';

const policyNamed = (c: CloudState, name: string) => c.iamPolicies.find((p) => p.name === name)?.id;
const adminsGroups = (c: CloudState): IamGroup[] => { const admin = policyNamed(c, 'AdministratorAccess'); return c.iamGroups.filter((g) => g.name === 'Admins' && !!admin && g.policyIds.includes(admin)); };
const adminUsers = (c: CloudState) => c.iamUsers.filter((u) => u.consoleAccess && u.policyIds.length === 0 && adminsGroups(c).some((g) => u.groupIds.includes(g.id)));

const statementsOf = (doc: string): Record<string, unknown>[] => {
  try { const d = JSON.parse(doc); return Array.isArray(d.Statement) ? d.Statement : d.Statement ? [d.Statement] : []; } catch { return []; }
};
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)]);
/** A customer managed policy that allows s3:GetObject on a specific bucket ARN (not "*"). */
const getObjectPolicies = (c: CloudState) => c.iamPolicies.filter((p) => p.managedBy === 'customer' && p.document.includes('s3:GetObject')
  && statementsOf(p.document).some((s) => s.Effect === 'Allow' && arr(s.Action).includes('s3:GetObject') && arr(s.Resource).length > 0 && arr(s.Resource).every((r) => r.startsWith('arn:aws:s3:::') && !r.startsWith('arn:aws:s3:::*') && r.length > 'arn:aws:s3:::'.length)));
const ec2RolesWithPolicy = (c: CloudState) => { const ids = getObjectPolicies(c).map((p) => p.id); return c.iamRoles.filter((r) => r.trustedEntity === 'ec2.amazonaws.com' && r.policyIds.some((x) => ids.includes(x))); };

const appKeys = (c: CloudState) => c.kmsKeys.filter((k) => k.managedBy === 'customer' && (k.alias === 'app-data' || k.alias === 'alias/app-data') && !k.deletionDate);

const labs: Lab[] = [
  {
    id: 'lab-root',
    title: 'Secure the root user and create an admin',
    lessonId: 'm1-iam-identities',
    minutes: 12,
    start: '/console/iam',
    intro: 'A brand-new AWS account has only the root user, with no MFA. Do what every security checklist (and the exam) says on day one: protect root, then create an everyday admin identity managed through a group.',
    steps: [
      { title: 'Enable MFA on the root user', detail: 'On the **IAM Dashboard**, under *Security recommendations*, click **Assign MFA device**. Pick *Authenticator app*, then enter two different 6-digit codes.', hint: 'IAM → Dashboard → "Add MFA for root user" → Assign MFA device → Next → type e.g. 123456 and 654321 → Add MFA.', check: (c) => c.rootMfa },
      { title: 'Create an IAM user with console access', detail: 'Open **Users → Create user**. Give it a name (e.g. `alice`) and tick **Provide user access to the AWS Management Console**.', hint: 'Users → Create user → name → tick the console access box → Next. You can set permissions in the next step or later.', check: (c) => c.iamUsers.some((u) => u.consoleAccess) },
      { title: 'Create an "Admins" group with AdministratorAccess', detail: 'Open **User groups → Create group**, name it exactly `Admins` and attach the AWS managed policy **AdministratorAccess**.', hint: 'User groups → Create group → name "Admins" → in the policy list filter for "Administrator" and tick AdministratorAccess → Create user group.', check: (c) => adminsGroups(c).length > 0 },
      { title: 'Put the user in Admins, with no directly attached policies', detail: 'Add your console user to **Admins**. The user itself should have **no** policies attached directly; all permissions come from the group.', hint: 'Open the group → Users tab → Add users, or open the user → Groups tab → Add user to groups. If you attached policies directly, remove them on the user\'s Permissions tab.', check: (c) => adminUsers(c).length > 0 },
      { title: 'Turn on MFA for that user', detail: 'Open the user → **Security credentials** tab → **Assign MFA device** and finish the virtual MFA flow.', hint: 'Users → your user → Security credentials → Multi-factor authentication → Assign MFA device.', check: (c) => adminUsers(c).some((u) => u.mfa) },
    ],
    debrief: 'You applied the root-user best practices: MFA on root, no daily use of root, and an admin IAM identity whose permissions come from a group rather than direct attachments. Exam questions like "what should you do first in a new account?" want MFA on root plus an IAM admin; "how do you manage permissions for many users?" wants groups. Remember: groups can\'t be nested and can\'t be a Principal in a policy.',
  },
  {
    id: 'lab-iam',
    title: 'Least-privilege role for EC2 + policy simulator',
    lessonId: 'm1-iam-policies',
    minutes: 15,
    start: '/console/iam/policies',
    intro: 'An application on EC2 must read objects from one bucket, and nothing else. Write a customer managed policy scoped to that bucket, wrap it in a role EC2 can assume, then prove the effective permissions with the policy simulator.',
    steps: [
      { title: 'Create a customer managed policy for s3:GetObject on one bucket', detail: 'Open **Policies → Create policy**. In the JSON editor allow `s3:GetObject` on a single bucket\'s objects, e.g. `arn:aws:s3:::my-app-bucket/*`. Name it (e.g. `AppBucketRead`).', hint: 'The default template is almost right: { "Effect": "Allow", "Action": ["s3:GetObject"], "Resource": ["arn:aws:s3:::my-app-bucket/*"] }. Don\'t use "*" as the resource.', check: (c) => getObjectPolicies(c).length > 0 },
      { title: 'Create a role trusted by EC2', detail: 'Open **Roles → Create role**. Trusted entity type **AWS service**, use case **EC2**.', hint: 'Roles → Create role → AWS service → EC2 → Next.', check: (c) => c.iamRoles.some((r) => r.trustedEntity === 'ec2.amazonaws.com') },
      { title: 'Attach your policy to that role', detail: 'In the role wizard\'s **Add permissions** step (or later on the role\'s Permissions tab), attach your customer managed policy. Name the role e.g. `AppServerRole` and create it.', hint: 'Filter the policy list by your policy name and tick it. Avoid AmazonS3FullAccess: least privilege!', check: (c) => ec2RolesWithPolicy(c).length > 0 },
      { title: 'Prove it with the policy simulator', detail: 'Open **Policy simulator**, choose **Roles** and your role. Simulate `s3:GetObject` on `arn:aws:s3:::my-app-bucket/report.csv` (allowed), then `s3:PutObject` and `s3:GetObject` on another bucket (implicitly denied). Read the trace.', hint: 'The simulator result isn\'t saved, so this step completes once the role with your policy exists. Try a wrong ARN like arn:aws:s3:::my-app-bucket (no /*) to see the S3 object-vs-bucket ARN trap.', check: (c) => ec2RolesWithPolicy(c).length > 0 && getObjectPolicies(c).some((p) => p.document.includes('"s3:GetObject"')) },
    ],
    debrief: 'You built least privilege the way the exam expects: a customer managed policy scoped to one bucket ARN, attached to an EC2 role (temporary credentials via the instance profile, no access keys). The simulator showed IAM\'s evaluation order: explicit Deny beats Allow, Allow beats the default implicit deny, and a boundary must also allow. Watch for the trap that object actions need arn:aws:s3:::bucket/* while s3:ListBucket needs arn:aws:s3:::bucket.',
  },
  {
    id: 'lab-kms',
    title: 'Customer managed KMS key with rotation',
    lessonId: 'm1-encryption-kms',
    minutes: 10,
    start: '/console/kms',
    intro: 'Your app needs its own encryption key that you control: who can use it, rotation, and the option to share it later. Create a customer managed key and grant an IAM role permission to use it.',
    steps: [
      { title: 'Have an IAM role to grant', detail: 'You need a role to make a key user. If you did the IAM lab you already have one; otherwise create any role in **IAM → Roles → Create role** (e.g. EC2).', hint: 'IAM → Roles → Create role → AWS service → EC2 → Next → Next → name it → Create role.', check: (c) => c.iamRoles.length > 0 },
      { title: 'Create a customer managed key with alias app-data', detail: 'Open **KMS → Customer managed keys → Create key**. Keep **Symmetric / Encrypt and decrypt**, and on *Add labels* set the alias to `app-data`.', hint: 'Create key → Next → Alias: app-data → Next … → Finish.', check: (c) => appKeys(c).length > 0 },
      { title: 'Enable automatic rotation', detail: 'Make sure **Key rotation** is on: tick it in the wizard\'s advanced options, or open the key → **Key rotation** tab.', hint: 'Open alias app-data → Key rotation tab → tick "Automatically rotate this KMS key every year".', check: (c) => appKeys(c).some((k) => k.rotation) },
      { title: 'Give an IAM role key-user access', detail: 'In the wizard step **Define key usage permissions**, tick your role. Or open the key → **Key policy** tab → *Key users* → **Add**.', hint: 'Key users can Encrypt, Decrypt and GenerateDataKey. Look at the key policy JSON: your role appears under "Allow use of the key".', check: (c) => appKeys(c).some((k) => k.keyUsers.length > 0 && k.keyUsers.some((u) => c.iamRoles.some((r) => r.id === u))) },
    ],
    debrief: 'You created a customer managed key: you own its key policy (admins vs users), rotation and lifecycle, unlike AWS managed keys (aws/s3), whose policy you can\'t change and which can\'t be shared cross-account. Exam hooks: envelope encryption (GenerateDataKey: the data key encrypts data, the KMS key encrypts the data key), key material never leaves KMS, rotation keeps the same key ID, and deletion always has a 7–30 day waiting period.',
  },
];

export default labs;
