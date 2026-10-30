import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, CARD_INTERVALS } from '../store/store';
import { flashcards, modules, outline, getLesson } from '../content';
import type { Flashcard } from '../content/types';
import { Md } from '../ui/Md';
import { PageTitle, Btn, Empty } from '../ui/bits';

export default function Flashcards() {
  const [params] = useSearchParams();
  const cards = useStore((s) => s.cards);
  const lessons = useStore((s) => s.lessons);
  const review = useStore((s) => s.reviewCard);
  const [deck, setDeck] = useState<Flashcard[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const due = useMemo(() => flashcards.filter((c) => cards[c.id] && cards[c.id].due <= Date.now()), [cards]);
  const fresh = (pool: Flashcard[]) => pool.filter((c) => !cards[c.id]);
  const unlockedNew = fresh(flashcards.filter((c) => lessons[c.lessonId]?.completedAt));

  useEffect(() => {
    const l = params.get('lesson');
    if (l) { setDeck(flashcards.filter((c) => c.lessonId === l)); setI(0); }
  }, [params]);
  useEffect(() => {
    if (!deck) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1 as 0 | 1 | 2 | 3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const start = (pool: Flashcard[]) => { setDeck([...pool].sort(() => Math.random() - 0.5).slice(0, 30)); setI(0); setFlipped(false); };
  const grade = (g: 0 | 1 | 2 | 3) => {
    if (!deck) return;
    const c = deck[i];
    review(c.id, g);
    // "Again" re-queues the card at the end of this session.
    if (g === 0) setDeck([...deck, c]);
    setFlipped(false);
    setI(i + 1);
  };

  if (deck) {
    if (i >= deck.length) return (
      <div className="text-center py-16"><div className="text-5xl">🃏</div><h1 className="font-display text-3xl font-extrabold mt-3">Session done</h1><p className="text-muted">Each card is scheduled to come back right before you'd forget it.</p><Btn className="mt-6" onClick={() => setDeck(null)}>Back to decks</Btn></div>
    );
    const c = deck[i];
    const st = cards[c.id];
    const next = (g: number) => { const box = g === 0 ? 1 : g === 1 ? Math.max(1, st?.box ?? 0) : Math.min(6, (st?.box ?? 0) + g - 1); const d = CARD_INTERVALS[box]; return d === 0 ? 'now' : `${d}d`; };
    return (
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center text-sm text-muted mb-3"><button className="underline" onClick={() => setDeck(null)}>Exit</button><span className="ml-auto tabular-nums">{i + 1} / {deck.length}</span></div>
        <button onClick={() => setFlipped(!flipped)} className="w-full min-h-[320px] rounded-3xl border border-line bg-surface p-8 text-left flex flex-col shadow-sm" aria-label="Flip card">
          <span className="text-xs text-muted">{getLesson(c.lessonId)?.title ?? outline.find((o) => o.id === c.lessonId)?.title}</span>
          <span className="font-display text-2xl font-bold mt-4 leading-snug">{c.front}</span>
          {flipped ? <div className="mt-6 pt-6 border-t border-line text-[17px]"><Md text={c.back} /></div> : <span className="mt-auto text-sm text-muted">Tap or press Space to reveal</span>}
        </button>
        {flipped && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {(['Again', 'Hard', 'Good', 'Easy'] as const).map((l, g) => (
              <button key={l} onClick={() => grade(g as 0 | 1 | 2 | 3)} className={`rounded-xl py-3 font-semibold border-2 ${g === 0 ? 'border-bad text-bad' : g === 3 ? 'border-ok text-ok' : 'border-line'}`}>
                {l}<span className="block text-xs font-normal text-muted">{next(g)} · key {g + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Flashcards" sub={`${flashcards.length} cards on spaced repetition. Cards unlock as you clear lessons, and you can study any deck early.`} />
      <div className="grid sm:grid-cols-2 gap-4">
        <button disabled={!due.length} onClick={() => start(due)} className="text-left rounded-2xl bg-ink text-paper p-6 disabled:opacity-50">
          <div className="font-display text-4xl font-extrabold">{due.length}</div><div className="font-semibold">due for review</div><div className="text-sm text-paper/70">Do these first: they're the ones you're about to forget.</div>
        </button>
        <button disabled={!unlockedNew.length} onClick={() => start(unlockedNew)} className="text-left rounded-2xl border-2 border-line bg-surface p-6 disabled:opacity-50">
          <div className="font-display text-4xl font-extrabold">{unlockedNew.length}</div><div className="font-semibold">new from cleared lessons</div><div className="text-sm text-muted">Learn up to 30 at a time.</div>
        </button>
      </div>
      <h2 className="font-display text-xl font-bold mt-8 mb-3">Decks by module</h2>
      {!flashcards.length ? <Empty title="No flashcards yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((m) => {
            const pool = flashcards.filter((c) => outline.find((o) => o.id === c.lessonId)?.module === m.id);
            const learned = pool.filter((c) => (cards[c.id]?.box ?? 0) >= 3).length;
            return (
              <button key={m.id} onClick={() => start(pool)} className="text-left rounded-2xl border border-line bg-surface p-4 hover:bg-sunk">
                <div className="font-display font-bold">{m.id.toUpperCase()}: {m.title}</div>
                <div className="text-sm text-muted">{pool.length} cards · {learned} well learned</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
