"use client";

import { useEffect, useRef, useState } from "react";

// A scrollable reader for a session transcript stored as Markdown under
// public/transcripts/.
//
// The Markdown is rendered into React elements rather than injected as HTML:
// the transcripts are our own files, but building the tree by hand costs
// nothing here and removes the question entirely. Only the subset the
// transcripts actually use is supported -- headings, paragraphs, bullet and
// numbered lists, fenced code, pipe tables, rules, bold and inline code -- and
// anything unrecognised falls through as plain text rather than disappearing.

export type TranscriptData = {
  /** Path under public/, already run through withBasePath. */
  src: string;
  title: string;
  label: string;
};

// --- inline: **bold** and `code` --------------------------------------------

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      out.push(
        <strong key={`${keyPrefix}-b${i}`} className="text-[var(--accent-deep)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      out.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-[var(--surface-soft)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--accent-deep)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// --- blocks -----------------------------------------------------------------

function renderMarkdown(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code. Unterminated fences run to the end rather than swallowing
    // the rest of the document into a dropped block.
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-lg bg-[var(--surface-soft)] p-3 font-mono text-[0.78rem] leading-6 text-[var(--foreground)]"
        >
          {body.join("\n")}
        </pre>,
      );
      continue;
    }

    // Horizontal rule.
    if (/^-{3,}$/.test(line.trim())) {
      out.push(
        <hr key={key++} className="my-5 border-t border-[color:var(--line)]" />,
      );
      i++;
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      out.push(
        level <= 1 ? (
          <h3
            key={key++}
            className="mt-5 text-lg font-medium tracking-[-0.02em] text-[var(--accent-deep)]"
          >
            {content}
          </h3>
        ) : level === 2 ? (
          <h4
            key={key++}
            className="mt-5 border-t border-[color:var(--line)] pt-4 text-base font-medium text-[var(--accent-deep)]"
          >
            {content}
          </h4>
        ) : (
          <h5
            key={key++}
            className="mt-4 text-sm font-medium text-[var(--accent-deep)]"
          >
            {content}
          </h5>
        ),
      );
      i++;
      continue;
    }

    // Pipe table. The |---|---| separator row is dropped; the first row is the
    // header only when that separator follows it.
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      const hasHeader =
        rows.length > 1 && rows[1].every((c) => /^:?-{2,}:?$/.test(c));
      const body = hasHeader ? rows.slice(2) : rows;
      out.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-[0.8rem]">
            {hasHeader ? (
              <thead>
                <tr>
                  {rows[0].map((cell, c) => (
                    <th
                      key={c}
                      className="border-b border-[color:var(--line)] px-2 py-1.5 text-left font-medium text-[var(--accent-deep)]"
                    >
                      {renderInline(cell, `th${key}-${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border-b border-[color:var(--line)] px-2 py-1.5 align-top text-[var(--muted)]"
                    >
                      {renderInline(cell, `td${key}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists. Continuation lines (indented under an item) join the item above.
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered
          ? /^\s*\d+\.\s+(.*)$/.exec(lines[i])
          : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (m) {
          items.push(m[1]);
          i++;
        } else if (/^\s+\S/.test(lines[i]) && items.length > 0) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        } else {
          break;
        }
      }
      const content = items.map((item, n) => (
        <li key={n} className="ml-4 list-outside pl-1">
          {renderInline(item, `li${key}-${n}`)}
        </li>
      ));
      out.push(
        ordered ? (
          <ol key={key++} className="my-2 list-decimal space-y-1">
            {content}
          </ol>
        ) : (
          <ul key={key++} className="my-2 list-disc space-y-1">
            {content}
          </ul>
        ),
      );
      continue;
    }

    // Paragraph: consecutive non-blank lines that start no other block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].trim().startsWith("|") &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^-{3,}$/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length > 0) {
      out.push(
        <p key={key++} className="my-2">
          {renderInline(para.join(" "), `p${key}`)}
        </p>,
      );
    } else {
      i++; // nothing matched; do not spin
    }
  }

  return out;
}

// --- modal ------------------------------------------------------------------

export function TranscriptModal({
  transcript,
  onClose,
}: {
  transcript: TranscriptData;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // No synchronous reset of text/error here: the caller keys this component on
  // `src`, so a different transcript remounts it with fresh state rather than
  // briefly showing the previous one's body.
  useEffect(() => {
    let cancelled = false;
    fetch(transcript.src, { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((body) => {
        if (!cancelled) setText(body);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [transcript.src]);

  // Escape closes, and the page behind does not scroll while the reader is
  // open -- otherwise the wheel falls through to the article once the
  // transcript hits its end.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={transcript.title}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] px-6 py-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Session transcript
            </p>
            <h3 className="mt-1 truncate text-base font-medium text-[var(--accent-deep)]">
              {transcript.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={transcript.src}
              download
              className="rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-[var(--muted)] transition hover:bg-black/5"
            >
              Raw
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-[var(--muted)] transition hover:bg-black/5"
            >
              Close
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain px-6 py-5 text-sm leading-7 text-[var(--muted)]"
        >
          {error ? (
            <p>
              Could not load the transcript: {error}
            </p>
          ) : text === null ? (
            <p>Loading the transcript…</p>
          ) : (
            renderMarkdown(text)
          )}
        </div>
      </div>
    </div>
  );
}
