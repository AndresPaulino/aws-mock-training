// "Ask the tutor": a drawer that streams answers from the local /api/tutor proxy.
// Pages call setTutorContext(...) so the tutor knows what you're looking at.
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useStore } from '../store/store';
import { Md } from './Md';

interface Msg { role: 'user' | 'assistant'; content: string }
interface TutorUi {
  isOpen: boolean; context: string; contextLabel: string; messages: Msg[]; draft: string;
  open: (prompt?: string) => void; close: () => void; setContext: (label: string, text: string) => void; setMessages: (m: Msg[]) => void; setDraft: (d: string) => void;
}
export const useTutor = create<TutorUi>((set) => ({
  isOpen: false, context: '', contextLabel: '', messages: [], draft: '',
  open: (prompt) => set((s) => ({ isOpen: true, draft: prompt ?? s.draft })),
  close: () => set({ isOpen: false }),
  setContext: (contextLabel, context) => set({ contextLabel, context }),
  setMessages: (messages) => set({ messages }),
  setDraft: (draft) => set({ draft }),
}));

/** Register what the learner is looking at; cleared on unmount. */
export function useTutorContext(label: string, text: string) {
  const setContext = useTutor((s) => s.setContext);
  useEffect(() => { setContext(label, text); return () => setContext('', ''); }, [label, text, setContext]);
}

let statusCache: boolean | null = null;
async function tutorEnabled(): Promise<boolean> {
  if (statusCache !== null) return statusCache;
  try {
    const r = await fetch('/api/tutor/status');
    statusCache = r.ok && (r.headers.get('content-type') ?? '').includes('json') ? (await r.json()).enabled : false;
  } catch { statusCache = false; }
  return statusCache!;
}

export function TutorDrawer() {
  const t = useTutor();
  const model = useStore((s) => s.profile.tutorModel);
  const setProfile = useStore((s) => s.setProfile);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { if (t.isOpen) void tutorEnabled().then(setEnabled); }, [t.isOpen]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [t.messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history: Msg[] = [...t.messages, { role: 'user', content: text }];
    t.setMessages([...history, { role: 'assistant', content: '' }]);
    t.setDraft('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      const r = await fetch('/api/tutor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.current.signal,
        body: JSON.stringify({ model, context: t.context ? `[${t.contextLabel}]\n${t.context}` : '', messages: history }),
      });
      if (!r.ok || !r.body) {
        const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        throw new Error(err.error);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        t.setMessages([...history, { role: 'assistant', content: acc }]);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') t.setMessages([...history, { role: 'assistant', content: `**Couldn't reach the tutor:** ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  if (!t.isOpen) return null;
  const quick = t.contextLabel
    ? ['Explain this like I’m new to AWS', 'Why is my answer wrong?', 'Give me a real-world example', 'What will the exam try to trick me with here?']
    : ['Quiz me on IAM policy evaluation', 'When do I pick NLB over ALB?', 'Explain the 4 DR strategies with costs', 'Make me a 30-minute study session'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Tutor">
      <div className="absolute inset-0 bg-black/30" onClick={t.close} />
      <div className="relative w-full max-w-[460px] h-full bg-surface border-l border-line flex flex-col shadow-2xl">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-line">
          <div className="font-display font-bold text-lg">Tutor</div>
          <select className="ml-2 text-sm bg-sunk rounded px-2 py-1" value={model} onChange={(e) => setProfile({ tutorModel: e.target.value as 'sonnet' | 'opus' })} aria-label="Tutor model">
            <option value="sonnet">Sonnet 5.5 · fast</option>
            <option value="opus">Opus 5.5 · deepest</option>
          </select>
          <button className="ml-auto text-sm px-2 py-1 rounded hover:bg-sunk" onClick={() => t.setMessages([])}>Clear</button>
          <button className="text-lg px-2 rounded hover:bg-sunk" onClick={t.close} aria-label="Close tutor">✕</button>
        </div>
        {t.contextLabel && <div className="px-4 py-2 text-xs text-muted border-b border-line bg-sunk">Looking at: <b className="text-ink">{t.contextLabel}</b></div>}
        <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {enabled === false && (
            <div className="rounded-lg border border-line p-4 text-sm prose-lite">
              <p><b>The tutor needs your Anthropic API key.</b></p>
              <p>1. Copy <code>.env.example</code> to <code>.env</code> in the project folder.<br />2. Paste your key after <code>ANTHROPIC_API_KEY=</code>.<br />3. Restart <code>npm run dev</code>.</p>
              <p className="text-muted">The key stays on your machine: the local dev server calls Claude, so your browser never sees it. Hosted static copies of the app have no tutor.</p>
            </div>
          )}
          {t.messages.length === 0 && enabled !== false && <p className="text-sm text-muted">Ask anything about AWS or the exam. I can see the lesson, question or lab you have open.</p>}
          {t.messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-8 rounded-2xl rounded-br-sm bg-ink text-paper px-4 py-2.5 text-[15px]' : 'text-[15px] prose-lite'}>
              {m.role === 'user' ? m.content : m.content ? <Md text={m.content} /> : <span className="text-muted">Thinking…</span>}
            </div>
          ))}
        </div>
        <div className="border-t border-line p-3">
          {t.messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quick.map((q) => <button key={q} onClick={() => send(q)} disabled={enabled === false} className="text-xs px-2.5 py-1 rounded-full border border-line hover:bg-sunk disabled:opacity-40">{q}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); void send(t.draft); }} className="flex gap-2">
            <textarea value={t.draft} onChange={(e) => t.setDraft(e.target.value)} rows={2} placeholder="Ask a question…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(t.draft); } }}
              className="flex-1 resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[15px]" />
            {busy
              ? <button type="button" onClick={() => abort.current?.abort()} className="px-4 rounded-lg border border-line">Stop</button>
              : <button type="submit" disabled={enabled === false} className="px-4 rounded-lg bg-ink text-paper font-medium disabled:opacity-40">Send</button>}
          </form>
        </div>
      </div>
    </div>
  );
}
