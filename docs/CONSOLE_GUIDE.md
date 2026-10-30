# Mock console authoring guide

The mock AWS console (`/console`) is a high-fidelity simulation of the real AWS Management Console for a learner with no AWS account. It should **look and behave like the real console** (Cloudscape design: white panels, blue links, orange primary buttons, resource tables with radio selection, a "Create X" wizard, detail pages with tabs) and **teach while you click**: use `<Teach>` callouts to explain exam-relevant choices at the moment the learner makes them.

## Architecture (read these files first)
- `src/cloud/types.ts`: `CloudState`, the whole simulated account, and every resource interface. Resources live in arrays with string `id`s.
- `src/store/store.ts`: the zustand store. Read state with `useCloud(c => c.buckets)` (from `kit.tsx`). Write with `useCloudActions()`: `put(collection, item)`, `patch(collection, id, partial)`, `remove(collection, id)`, `mutate(draft => { ... })` (a deep-cloned draft you may mutate freely), and `log(service, msg)` for the CloudTrail-style activity feed. Log every create/delete/modify.
- `src/cloud/seed.ts`: `rid(prefix)` makes AWS-style ids (`rid('vpc')` → `vpc-0a1b…`). `azsOf(region)`. AWS-managed IAM policies and KMS keys are pre-seeded.
- `src/cloud/net.ts`: CIDR helpers. `src/cloud/pricing.ts`: hourly cost model (already covers most resource types). `src/cloud/sim.ts`: a 2-second tick that moves states (pending→running, RDS creating→available, failover), runs ASGs and accrues cost. You may add small lifecycle steps there only if your owner brief says so.
- `src/console/kit.tsx`: **use these components**: `Page`, `Panel`, `Button`, `Status`, `Table`, `Field`, `Input`, `Select`, `Check`, `MultiCheck`, `Radios`, `KV`, `Tabs`, `Teach`, `Alert`, `Modal`, `ConfirmDelete`, `FormFooter`, `SideNav`, `fmtDate`. CSS classes: `aws-btn`, `aws-input`, `aws-panel`, `aws-table`, `link`.
- `src/console/registry.ts`: one entry per service. Its `component` is the default export of `src/console/services/<svc>/<Name>Console.tsx` (currently stubs). Each console root renders a left `SideNav` plus nested routes:

```tsx
import { Routes, Route } from 'react-router-dom';
export default function S3Console() {
  return (
    <div className="flex">
      <SideNav title="Amazon S3" items={[{ label: 'Buckets', to: '/console/s3' }, { section: 'Storage Lens' }, ...]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<BucketList />} />
          <Route path="create" element={<CreateBucket />} />
          <Route path="buckets/:name" element={<BucketDetail />} />
        </Routes>
      </div>
    </div>
  );
}
```
Routes inside are relative to `/console/<svc>/`. Use absolute links (`/console/s3/buckets/x`) with `<Link>` / `useNavigate()`.

## Labs
A lab is a guided exercise whose steps are checked live against `CloudState`. Write labs in `src/labs/<area>.lab.ts`, default-exporting `Lab[]` (see `src/labs/index.ts`). Use the lab ids your brief gives you (they're pre-ordered in `ORDER`). `check(c)` must be a pure function of the cloud state: check for *any* resource meeting the condition, not specific ids. 4–7 steps; `detail` says exactly which page to open and what to set; `hint` is more explicit; `debrief` ties the lab to exam questions. `lessonId` must be an id from `src/content/outline.ts`. `start` is the console route to open.

## Realism checklist
- Name things as AWS does: "Create bucket", "Launch instances", ARNs `arn:aws:s3:::name`, endpoints like `mydb.c9akciq32.us-east-1.rds.amazonaws.com`.
- Validate like AWS does (bucket naming rules, CIDR overlap, required fields) with inline `Field error`s.
- Show the defaults AWS shows (Block Public Access on, SSE-S3 default encryption, versioning off, etc.).
- Where a choice is exam-relevant (Multi-AZ vs read replica, SQS visibility timeout, Lambda timeout max 900 s, S3 storage class minimum durations, ALB vs NLB), add a `<Teach>` explaining it in one or two sentences.
- Make "simulate" actions where the real console would need real traffic: e.g. "Send test message", "Invoke", "Reboot with failover", "Simulate health check failure", "Upload file (simulated)". They should change state visibly and log events.
- Regional services: filter lists by `c.region` where it matters (S3 buckets show their region; IAM, Route 53 and CloudFront are global).

## Rules
- Only edit the files your brief assigns you. Don't edit `kit.tsx`, `types.ts`, `store.ts`, `registry.ts` or other agents' service folders. If you truly need a new field on a resource type, add it as **optional** in `src/cloud/types.ts` and say so in your report (keep it minimal; another agent may also touch types.ts, so re-read the file immediately before editing it and make one small Edit).
- No new npm dependencies.
- Validate with `npx tsc -p tsconfig.wip.json` (no errors in your files) and `npm test`. A dev server is already running at http://localhost:5173; don't start another one. If you have a browser tool, you may look at `http://localhost:5173/#/console/<svc>`, but don't spend long on it.
