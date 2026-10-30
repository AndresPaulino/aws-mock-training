// Minimal markdown: paragraphs, "- " bullets, numbered lines, **bold**, *italic*, `code`, ### headings.
// Content and tutor output only. Rendered as React nodes, never as raw HTML.
import { Fragment, type ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className={`prose-lite ${className ?? ''}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-*•] /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•] /, ''))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)] /.test(l))) return <ol key={i} className="list-decimal ml-5 mb-3">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)] /, ''))}</li>)}</ol>;
        if (/^#{1,4} /.test(lines[0])) return <Fragment key={i}><p className="font-semibold mt-2">{inline(lines[0].replace(/^#+ /, ''))}</p>{lines.length > 1 && <Md text={lines.slice(1).join('\n')} />}</Fragment>;
        // Mixed block: render bullets inside paragraph groups
        if (lines.some((l) => /^\s*[-*•] /.test(l))) {
          const parts: ReactNode[] = [];
          let bullets: string[] = [];
          const flush = () => { if (bullets.length) parts.push(<ul key={parts.length}>{bullets.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>); bullets = []; };
          for (const l of lines) {
            if (/^\s*[-*•] /.test(l)) bullets.push(l.replace(/^\s*[-*•] /, ''));
            else { flush(); parts.push(<p key={parts.length}>{inline(l)}</p>); }
          }
          flush();
          return <Fragment key={i}>{parts}</Fragment>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
