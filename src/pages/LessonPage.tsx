import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import { getLesson, outline, modules, DOMAINS, flashcards, serviceMap } from '../content';
import { lessonQuiz } from '../lib/adaptive';
import { labsForLesson } from '../labs';
import { Diagram } from '../ui/Diagram';
import { Md } from '../ui/Md';
import { QuestionCard } from '../ui/QuestionCard';
import { ServiceIcon } from '../ui/ServiceIcon';
import { useTutor, useTutorContext } from '../ui/Tutor';
import { Btn, Empty } from '../ui/bits';
import { toast } from '../ui/Celebrate';

const Beyond = () => <span className="text-[11px] px-2 py-0.5 rounded-full border border-xp text-xp-ink align-middle whitespace-nowrap" title="Not in your cheat-sheet PDFs; added from the SAA-C03 exam guide">beyond your cheat sheets</span>;

export default function LessonPage() {
  const { id = '' } = useParams();
  const lesson = getLesson(id);
  const entry = outline.find((o) => o.id === id);
  const idx = outline.findIndex((o) => o.id === id);
  const prev = outline[idx - 1], next = outline[idx + 1];
  const visit = useStore((s) => s.visitLesson);
  const complete = useStore((s) => s.completeLesson);
  const done = useStore((s) => !!s.lessons[id]?.completedAt);
  const labState = useStore((s) => s.labs);
  const tutor = useTutor();
  const quiz = useMemo(() => lessonQuiz(id, 5), [id]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [answered, setAnswered] = useState(false);
  useEffect(() => { visit(id); setQi(0); setScore(0); setQuizDone(false); }, [id, visit]);
  useTutorContext(lesson ? `Lesson: ${lesson.title}` : '', lesson ? `Lesson "${lesson.title}". Summary: ${lesson.summary}\nKey facts:\n- ${lesson.keyFacts.join('\n- ')}\nExam tips:\n- ${lesson.examTips.join('\n- ')}` : '');

  if (!entry) return <Empty title="Lesson not found" />;
  if (!lesson) return <Empty title={entry.title}>This lesson's content is still being written. Try another waypoint.</Empty>;
  const mod = modules.find((m) => m.id === lesson.module)!;
  const dom = DOMAINS.find((d) => d.id === lesson.domain);
  const labs = labsForLesson(id);
  const cards = flashcards.filter((c) => c.lessonId === id).length;

  const finish = () => {
    complete(id);
    toast({ icon: '🏁', title: 'Waypoint cleared', body: `+50 XP · ${lesson.title}` });
  };

  return (
    <article className="max-w-[820px] mx-auto">
      <div className="text-sm text-muted flex flex-wrap items-center gap-2">
        <Link to="/path" className="hover:underline">The Gauntlet</Link><span>/</span><span>Module {mod.id.slice(1).toUpperCase()}: {mod.title}</span>
      </div>
      <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight mt-2 leading-[1.05]">{lesson.title}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
        <span className="px-2.5 py-0.5 rounded-full text-white" style={{ background: dom?.color ?? 'var(--d-foundations)' }}>{dom?.short ?? 'Foundations'}</span>
        <span className="text-muted">{lesson.minutes} min</span>
        {lesson.beyond && <Beyond />}
        {done && <span className="text-ok font-medium">✓ Cleared</span>}
      </div>
      <p className="text-lg mt-4 text-muted max-w-[65ch]">{lesson.summary}</p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {lesson.services.map((s) => <Link key={s} to={`/services/${s}`} className="flex items-center gap-1.5 text-sm pl-1 pr-2.5 py-1 rounded-full border border-line hover:bg-sunk"><ServiceIcon id={s} size={20} />{serviceMap.get(s)?.name ?? s}</Link>)}
      </div>

      <aside className="mt-8 rounded-2xl p-5 border-l-4" style={{ borderColor: 'var(--xp)', background: 'color-mix(in srgb, var(--xp) 8%, var(--surface))' }}>
        <div className="font-display font-bold text-lg mb-1">Think of it like this: {lesson.analogy.title}</div>
        <Md text={lesson.analogy.body} />
      </aside>

      {lesson.diagram && <div className="mt-8"><Diagram diagram={lesson.diagram} /></div>}

      {lesson.sections.map((s, i) => (
        <section key={i} className="mt-9">
          <h2 className="font-display text-2xl font-bold mb-3">{s.heading} {s.beyond && <Beyond />}</h2>
          <div className="text-[16.5px]"><Md text={s.body} /></div>
          {s.table && (
            <div className="overflow-x-auto mt-3 rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-sunk"><tr>{s.table.headers.map((h) => <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, j) => <tr key={j} className="border-t border-line">{r.map((c, k) => <td key={k} className={`px-3 py-2 align-top ${k === 0 ? 'font-medium' : ''}`}><Md text={c} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {lesson.prosCons && lesson.prosCons.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold mb-3">Trade-offs</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {lesson.prosCons.map((pc) => (
              <div key={pc.option} className="rounded-2xl border border-line bg-surface p-4">
                <div className="font-display font-bold text-lg">{pc.option}</div>
                <ul className="mt-2 text-sm space-y-1">{pc.pros.map((x) => <li key={x} className="flex gap-2"><span className="text-ok">＋</span>{x}</li>)}</ul>
                <ul className="mt-2 text-sm space-y-1">{pc.cons.map((x) => <li key={x} className="flex gap-2"><span className="text-bad">−</span>{x}</li>)}</ul>
                <div className="mt-3 text-sm rounded-lg bg-sunk px-3 py-2"><b>Use when:</b> {pc.useWhen}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 grid md:grid-cols-3 gap-4">
        {([['Key facts', lesson.keyFacts, '📌'], ['Exam tips', lesson.examTips, '🎯'], ['Traps', lesson.pitfalls, '🪤']] as const).map(([t, list, ic]) => (
          <div key={t} className="rounded-2xl border border-line bg-surface p-4">
            <div className="font-display font-bold mb-2">{ic} {t}</div>
            <ul className="space-y-2 text-[14.5px]">{list.map((x, i) => <li key={i} className="leading-snug"><Md text={x} /></li>)}</ul>
          </div>
        ))}
      </section>

      {labs.length > 0 && (
        <section className="mt-10 rounded-2xl bg-ink text-paper p-5">
          <div className="font-display text-xl font-bold">Do it in the console</div>
          <p className="text-paper/75 text-sm">Build it yourself in the simulated AWS console. Each step is checked live.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {labs.map((l) => <Link key={l.id} to={`/console?lab=${l.id}`} className="px-4 py-2 rounded-xl bg-xp text-[#1b1200] font-semibold">{labState[l.id]?.completedAt ? '✓ ' : ''}{l.title} · {l.minutes} min</Link>)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-display text-2xl font-bold">Quick check</h2>
          {quiz.length > 0 && <span className="text-muted text-sm">{quizDone ? `${score}/${quiz.length} correct` : `${qi + 1} of ${quiz.length}`}</span>}
          <button className="ml-auto text-sm underline" onClick={() => tutor.open(`Quiz me with 3 new questions about "${lesson.title}", one at a time.`)}>Ask the tutor to quiz me</button>
        </div>
        {quiz.length === 0 ? <p className="text-muted">No questions for this lesson yet.</p> : !quizDone ? (
          <div>
            <QuestionCard key={quiz[qi].id} q={quiz[qi]} index={qi} total={quiz.length} onAnswered={(ok) => { setAnswered(true); if (ok) setScore((s) => s + 1); }} />
            <div className="mt-3 flex justify-end"><Btn kind={answered ? 'primary' : 'ghost'} onClick={() => { setAnswered(false); if (qi + 1 < quiz.length) setQi(qi + 1); else setQuizDone(true); }}>{!answered ? 'Skip' : qi + 1 < quiz.length ? 'Next question' : 'See result'}</Btn></div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="font-display text-2xl font-bold">{score}/{quiz.length}: {score / quiz.length >= 0.8 ? 'nailed it.' : score / quiz.length >= 0.6 ? 'solid.' : 'worth another pass.'}</div>
            <p className="text-muted mt-1">{score / quiz.length < 0.6 ? 'Reread the traps section and the diagram, then retry. Missed questions come back in Practice automatically.' : 'Missed questions come back in Practice automatically.'}</p>
            <div className="flex gap-2 mt-3"><Btn kind="ghost" onClick={() => { setQi(0); setScore(0); setQuizDone(false); }}>Retry quiz</Btn>{cards > 0 && <Btn kind="ghost" to={`/flashcards?lesson=${id}`}>Study {cards} flashcards</Btn>}</div>
          </div>
        )}
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {prev && <Btn kind="ghost" to={`/lesson/${prev.id}`}>← {prev.title}</Btn>}
        <div className="ml-auto flex gap-2">
          {!done && <Btn kind="xp" onClick={finish}>Mark lesson complete · +50 XP</Btn>}
          {next && <Btn to={`/lesson/${next.id}`}>Next: {next.title}</Btn>}
        </div>
      </div>
    </article>
  );
}
