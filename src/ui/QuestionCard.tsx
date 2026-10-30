import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '../content/types';
import { useStore } from '../store/store';
import { isCorrect } from '../lib/adaptive';
import { domainOf, getLesson } from '../content';
import { Md } from './Md';
import { useTutor, useTutorContext } from './Tutor';

export const LETTERS = 'ABCDEF';

export function questionContext(q: Question, picked?: number[] | null) {
  return `Practice question (${domainOf(q.domain).short} domain):\n${q.stem}\n${q.options.map((o, i) => `${LETTERS[i]}. ${o}`).join('\n')}\n` +
    (picked ? `Learner picked: ${picked.map((i) => LETTERS[i]).join(', ') || 'nothing'}\nCorrect: ${q.answer.map((i) => LETTERS[i]).join(', ')}\nOfficial explanation: ${q.explanation}` : 'Learner has not answered yet. Give hints, not the answer, unless asked.');
}

/** Interactive question with instant feedback. `review` shows a fixed past answer. */
export function QuestionCard({ q, onAnswered, review, index, total }: { q: Question; onAnswered?: (correct: boolean, picked: number[]) => void; review?: number[] | null; index?: number; total?: number }) {
  const multi = q.answer.length > 1;
  const [picked, setPicked] = useState<number[]>(review ?? []);
  const [done, setDone] = useState(review !== undefined);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const toggleFlag = useStore((s) => s.toggleFlag);
  const flagged = useStore((s) => !!s.questions[q.id]?.flagged);
  const tutor = useTutor();
  useTutorContext(`Question ${q.id}`, questionContext(q, done ? picked : null));
  useEffect(() => { setPicked(review ?? []); setDone(review !== undefined); }, [q.id, review]);

  const toggle = (i: number) => {
    if (done) return;
    if (!multi) return setPicked([i]);
    setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : picked.length < q.answer.length ? [...picked, i] : picked);
  };
  const submit = () => {
    if (!picked.length || done) return;
    const ok = isCorrect(q, picked);
    setDone(true);
    recordAnswer(q.id, ok);
    onAnswered?.(ok, picked);
  };
  const ok = done && isCorrect(q, picked);
  const dom = domainOf(q.domain);

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 lg:p-6">
      <div className="flex items-center gap-2 text-xs text-muted mb-3">
        {index !== undefined && <span className="tabular-nums font-medium text-ink">Question {index + 1}{total ? ` of ${total}` : ''}</span>}
        <span className="px-2 py-0.5 rounded-full text-white" style={{ background: dom.color }}>{dom.short}</span>
        <span>{'●'.repeat(q.difficulty)}{'○'.repeat(3 - q.difficulty)} difficulty</span>
        <button onClick={() => toggleFlag(q.id)} className={`ml-auto px-2 py-0.5 rounded ${flagged ? 'bg-xp/20 text-xp-ink' : 'hover:bg-sunk'}`}>{flagged ? '⚑ Flagged' : '⚐ Flag'}</button>
      </div>
      <div className="text-[17px] leading-relaxed mb-4"><Md text={q.stem} /></div>
      {multi && !done && <p className="text-sm text-muted -mt-2 mb-3">Select {q.answer.length}.</p>}
      <div className="space-y-2" role={multi ? 'group' : 'radiogroup'}>
        {q.options.map((o, i) => {
          const isAns = q.answer.includes(i), isPicked = picked.includes(i);
          const tone = !done ? (isPicked ? 'border-ink bg-sunk' : 'border-line hover:border-muted') : isAns ? 'border-ok bg-ok/10' : isPicked ? 'border-bad bg-bad/10' : 'border-line opacity-80';
          return (
            <div key={i}>
              <button onClick={() => toggle(i)} disabled={done} role={multi ? 'checkbox' : 'radio'} aria-checked={isPicked}
                className={`w-full text-left flex gap-3 items-start rounded-xl border-2 px-4 py-3 transition-colors ${tone}`}>
                <span className={`shrink-0 w-7 h-7 grid place-items-center ${multi ? 'rounded-md' : 'rounded-full'} border-2 font-semibold text-sm ${isPicked ? 'bg-ink text-paper border-ink' : 'border-line'}`}>{LETTERS[i]}</span>
                <span className="pt-0.5">{o}</span>
                {done && <span className="ml-auto shrink-0 pt-0.5">{isAns ? '✓' : isPicked ? '✕' : ''}</span>}
              </button>
              {done && <div className={`ml-10 mt-1 mb-2 text-sm ${isAns ? 'text-ok' : 'text-muted'}`}>{q.optionExplanations[i]}</div>}
            </div>
          );
        })}
      </div>
      {!done ? (
        <button onClick={submit} disabled={!picked.length || (multi && picked.length !== q.answer.length)} className="mt-5 px-5 py-2.5 rounded-xl bg-ink text-paper font-semibold disabled:opacity-40">Check answer</button>
      ) : (
        <div className={`mt-5 rounded-xl p-4 ${ok ? 'bg-ok/10' : 'bg-bad/10'}`}>
          <div className="font-display font-bold text-lg mb-1">{ok ? 'Correct' : `Not quite. The answer is ${q.answer.map((i) => LETTERS[i]).join(' and ')}.`}</div>
          <Md text={q.explanation} />
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            {!ok && <button className="px-3 py-1.5 rounded-lg bg-ink text-paper" onClick={() => tutor.open('Why is my answer wrong? Walk me through the misconception.')}>Ask the tutor why</button>}
            <button className="px-3 py-1.5 rounded-lg border border-line" onClick={() => tutor.open('Give me a real-world example of this scenario and how I would spot it on the exam.')}>Real-world example</button>
            {q.lessonIds.slice(0, 2).map((l) => getLesson(l) && <Link key={l} to={`/lesson/${l}`} className="px-3 py-1.5 rounded-lg border border-line hover:bg-sunk">Review: {getLesson(l)!.title}</Link>)}
          </div>
        </div>
      )}
    </article>
  );
}
