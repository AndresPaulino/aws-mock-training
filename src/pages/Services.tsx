import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { services, serviceMap, getLesson } from '../content';
import type { ServiceCategory } from '../content/types';
import { ServiceIcon, CATEGORY_COLOR } from '../ui/ServiceIcon';
import { PageTitle, Empty } from '../ui/bits';
import { useTutorContext } from '../ui/Tutor';

const CONSOLE_ROUTE: Record<string, string> = { iam: 'iam', vpc: 'vpc', ec2: 'ec2', ebs: 'ec2', elb: 'ec2', alb: 'ec2', 'auto-scaling': 'ec2', s3: 's3', rds: 'rds', dynamodb: 'dynamodb', lambda: 'lambda', route53: 'route53', cloudfront: 'cloudfront', cloudwatch: 'cloudwatch', kms: 'kms', sqs: 'sqs', sns: 'sns', 'cost-explorer': 'billing', budgets: 'billing' };

export default function Services() {
  const { id } = useParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ServiceCategory | ''>('');
  const s = id ? serviceMap.get(id) : undefined;
  useTutorContext(s ? `Service: ${s.name}` : '', s ? `${s.name}: ${s.whatItIs}\nUse when: ${s.useWhen.join('; ')}\nNot for: ${s.notFor.join('; ')}` : '');

  if (id) {
    if (!s) return <Empty title="Unknown service" />;
    return (
      <article className="max-w-[820px] mx-auto">
        <Link to="/services" className="text-sm text-muted hover:underline">← Service atlas</Link>
        <div className="flex items-center gap-4 mt-3">
          <ServiceIcon id={s.id} size={64} />
          <div><h1 className="font-display text-4xl font-extrabold">{s.name}</h1><p className="text-muted">{s.oneLiner}</p></div>
        </div>
        <p className="mt-6 text-[17px] leading-relaxed">{s.whatItIs}</p>
        {CONSOLE_ROUTE[s.id] && <Link to={`/console/${CONSOLE_ROUTE[s.id]}`} className="inline-block mt-4 px-4 py-2 rounded-xl bg-xp text-[#1b1200] font-semibold">Open in the mock console</Link>}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold mb-2 text-ok">Use it when</div><ul className="space-y-1.5 text-[15px]">{s.useWhen.map((x) => <li key={x}>＋ {x}</li>)}</ul></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold mb-2 text-bad">Not for</div><ul className="space-y-1.5 text-[15px]">{s.notFor.map((x) => <li key={x}>− {x}</li>)}</ul></div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 mt-4"><div className="font-display font-bold mb-1">💲 How it bills</div><p>{s.pricing}</p></div>
        <div className="rounded-2xl border border-line bg-surface p-4 mt-4"><div className="font-display font-bold mb-2">🎯 Exam signals: words in a question that point here</div><div className="flex flex-wrap gap-2">{s.examSignals.map((x) => <span key={x} className="px-3 py-1 rounded-full bg-sunk text-sm">“{x}”</span>)}</div></div>
        {s.related.length > 0 && <div className="mt-6"><div className="font-display font-bold mb-2">Often confused with or paired with</div><div className="flex flex-wrap gap-2">{s.related.map((r) => <Link key={r} to={`/services/${r}`} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line hover:bg-sunk text-sm"><ServiceIcon id={r} size={22} />{serviceMap.get(r)?.name ?? r}</Link>)}</div></div>}
        {s.lessonIds.length > 0 && <div className="mt-6"><div className="font-display font-bold mb-2">Lessons</div><ul className="space-y-1">{s.lessonIds.map((l) => <li key={l}><Link className="underline" to={`/lesson/${l}`}>{getLesson(l)?.title ?? l}</Link></li>)}</ul></div>}
      </article>
    );
  }

  const cats = [...new Set(services.map((x) => x.category))];
  const needle = q.toLowerCase();
  const list = services.filter((x) => (!cat || x.category === cat) && (!needle || `${x.name} ${x.short} ${x.oneLiner} ${x.examSignals.join(' ')}`.toLowerCase().includes(needle)));
  return (
    <div>
      <PageTitle title="Service atlas" sub={`${services.length} services and features, each with when to use it, when not to, how it bills, and the exam phrases that point to it.`} />
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: “shared file system”, “sub-millisecond”, “Kinesis”…" className="flex-1 min-w-[240px] rounded-xl border border-line bg-surface px-4 py-2" />
        <select value={cat} onChange={(e) => setCat(e.target.value as ServiceCategory)} className="rounded-xl border border-line bg-surface px-3 py-2"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {!services.length ? <Empty title="The atlas is still being written" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((x) => (
            <Link key={x.id} to={`/services/${x.id}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-3 hover:bg-sunk">
              <ServiceIcon id={x.id} size={44} />
              <span className="min-w-0"><span className="block font-semibold leading-tight">{x.name}</span><span className="block text-sm text-muted leading-snug">{x.oneLiner}</span><span className="text-[11px] capitalize" style={{ color: CATEGORY_COLOR[x.category] }}>{x.category}{x.console ? ' · in console' : ''}</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
