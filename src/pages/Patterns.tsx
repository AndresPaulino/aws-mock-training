import { Link, useParams } from 'react-router-dom';
import { patterns, DOMAINS, getLesson } from '../content';
import { Diagram } from '../ui/Diagram';
import { Md } from '../ui/Md';
import { PageTitle, Empty } from '../ui/bits';
import { useTutorContext } from '../ui/Tutor';

export default function Patterns() {
  const { id } = useParams();
  const p = id ? patterns.find((x) => x.id === id) : undefined;
  useTutorContext(p ? `Pattern: ${p.title}` : '', p ? `${p.title}\nProblem: ${p.problem}\nHow: ${p.howItWorks}\nPros: ${p.pros.join('; ')}\nCons: ${p.cons.join('; ')}` : '');

  if (id) {
    if (!p) return <Empty title="Pattern not found" />;
    const dom = DOMAINS.find((d) => d.id === p.domain)!;
    return (
      <article className="max-w-[900px] mx-auto">
        <Link to="/patterns" className="text-sm text-muted hover:underline">← Architecture patterns</Link>
        <h1 className="font-display text-4xl font-extrabold mt-2">{p.title}</h1>
        <span className="inline-block mt-2 text-sm px-2.5 py-0.5 rounded-full text-white" style={{ background: dom.color }}>{dom.short}</span>
        <div className="mt-5 rounded-2xl bg-sunk p-4"><div className="font-display font-bold mb-1">The problem</div><Md text={p.problem} /></div>
        <div className="mt-6"><Diagram diagram={p.diagram} /></div>
        <section className="mt-6"><h2 className="font-display text-2xl font-bold mb-2">How it works</h2><Md text={p.howItWorks} /></section>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold text-ok mb-2">Pros</div><ul className="space-y-1.5">{p.pros.map((x) => <li key={x}>＋ {x}</li>)}</ul></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold text-bad mb-2">Cons</div><ul className="space-y-1.5">{p.cons.map((x) => <li key={x}>− {x}</li>)}</ul></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold mb-2">Use when</div><ul className="space-y-1.5 list-disc ml-5">{p.useWhen.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-display font-bold mb-2">Avoid when</div><ul className="space-y-1.5 list-disc ml-5">{p.avoidWhen.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
        <section className="mt-6"><h2 className="font-display text-2xl font-bold mb-2">Alternatives</h2>
          <div className="rounded-2xl border border-line overflow-hidden">{p.alternatives.map((a, i) => <div key={a.name} className={`flex flex-col sm:flex-row gap-1 sm:gap-4 px-4 py-3 ${i ? 'border-t border-line' : ''}`}><b className="sm:w-56 shrink-0">{a.name}</b><span className="text-[15px]">{a.tradeoff}</span></div>)}</div>
        </section>
        <div className="rounded-2xl border border-line bg-surface p-4 mt-6"><div className="font-display font-bold mb-2">🎯 Exam signals</div><div className="flex flex-wrap gap-2">{p.examSignals.map((x) => <span key={x} className="px-3 py-1 rounded-full bg-sunk text-sm">“{x}”</span>)}</div></div>
        {p.lessonIds.length > 0 && <p className="mt-6 text-sm">Lessons: {p.lessonIds.map((l, i) => <span key={l}>{i > 0 && ', '}<Link className="underline" to={`/lesson/${l}`}>{getLesson(l)?.title ?? l}</Link></span>)}</p>}
      </article>
    );
  }
  return (
    <div>
      <PageTitle title="Architecture patterns" sub="The recurring designs behind most exam scenarios: what problem each one solves, how it works step by step, and the trade-offs that decide when it's the right answer." />
      {!patterns.length ? <Empty title="Patterns are still being written" /> : DOMAINS.map((d) => {
        const list = patterns.filter((x) => x.domain === d.id);
        if (!list.length) return null;
        return (
          <section key={d.id} className="mb-8">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: d.color }} />{d.name}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((x) => <Link key={x.id} to={`/patterns/${x.id}`} className="rounded-2xl border border-line bg-surface p-4 hover:bg-sunk"><div className="font-display font-bold leading-tight">{x.title}</div><div className="text-sm text-muted mt-1 line-clamp-3">{x.problem}</div></Link>)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
