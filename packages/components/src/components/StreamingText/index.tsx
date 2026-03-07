"use client";

import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHighlighter, type Highlighter } from "shiki";
import { cn } from "../../lib/utils";
import type { StreamingTextProps } from "./types";

// ---------------------------------------------------------------------------
// Shiki singleton — only created once across all StreamingText instances
// ---------------------------------------------------------------------------

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light-high-contrast"],
      langs: [
        "typescript",
        "javascript",
        "tsx",
        "jsx",
        "bash",
        "json",
        "python",
        "css",
        "html",
        "markdown",
      ],
    });
  }
  return highlighterPromise!;
}

// ---------------------------------------------------------------------------
// Cursor CSS — injected once via <style>
// ---------------------------------------------------------------------------

const CURSOR_STYLES = `
@keyframes inferface-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes inferface-cursor-fadeout {
  from { opacity: 1; }
  to { opacity: 0; }
}
.inferface-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background-color: currentColor;
  animation: inferface-cursor-blink 1s step-end infinite;
}
.inferface-cursor--fading {
  animation: inferface-cursor-fadeout 0.5s ease-out forwards;
}
`;

// ---------------------------------------------------------------------------
// Lightweight inline code detector for streaming mode
// ---------------------------------------------------------------------------

function renderPlainText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <code
        key={match.index}
        className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-sm font-mono text-emerald-700 dark:text-emerald-300"
      >
        {match[1]}
      </code>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StreamingText({
  content,
  isStreaming = false,
  markdown = true,
  codeTheme = "github-dark",
  showCursor = true,
  cursor,
  className,
  classNames,
  onStreamComplete,
}: StreamingTextProps) {
  const prevStreamingRef = useRef(isStreaming);
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [cursorFading, setCursorFading] = useState(false);

  // Initialize shiki highlighter
  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (!cancelled) setHighlighter(hl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Detect streaming → done transition
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      // Streaming just ended
      setCursorFading(true);
      const timer = setTimeout(() => setCursorFading(false), 500);
      onStreamComplete?.(content);
      return () => clearTimeout(timer);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, content, onStreamComplete]);

  // Memoized markdown render — only when not streaming
  const markdownContent = useMemo(() => {
    if (isStreaming || !markdown || !content) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(codeProps: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
            const { className: codeClassName, children, ...props } = codeProps;
            const match = /language-(\w+)/.exec(codeClassName || "");
            const lang = match?.[1];
            const codeStr = String(children).replace(/\n$/, "");

            // Inline code
            if (!lang && !codeStr.includes("\n")) {
              return (
                <code
                  className={cn(
                    "rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-sm font-mono text-emerald-700 dark:text-emerald-300",
                    classNames?.inlineCode
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Code block with shiki
            if (highlighter && lang) {
              try {
                const html = highlighter.codeToHtml(codeStr, {
                  lang,
                  themes: { light: "github-light-high-contrast", dark: "github-dark" },
                  defaultColor: false,
                });
                return (
                  <div
                    className={cn("inferface-code-block rounded-lg overflow-hidden my-3 text-sm", classNames?.codeBlock)}
                    role="region"
                    aria-label={`Code block: ${lang}`}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              } catch {
                // Fallback if language isn't loaded
              }
            }

            // Fallback code block
            return (
              <pre
                className={cn(
                  "rounded-lg bg-zinc-100 dark:bg-zinc-900 p-4 overflow-x-auto my-3 text-sm",
                  classNames?.codeBlock
                )}
                role="region"
                aria-label={`Code block${lang ? `: ${lang}` : ""}`}
              >
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, isStreaming, markdown, highlighter, codeTheme, classNames?.codeBlock, classNames?.inlineCode]);

  // Cursor element
  const showCursorNow = showCursor && (isStreaming || cursorFading);
  const cursorEl = showCursorNow ? (
    cursor ?? (
      <span
        className={cn(
          "inferface-cursor",
          cursorFading && "inferface-cursor--fading",
          classNames?.cursor
        )}
        aria-hidden="true"
      />
    )
  ) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CURSOR_STYLES }} />
      <div
        className={cn("inferface-streaming-text", classNames?.root, className)}
        aria-live="polite"
        aria-atomic={isStreaming ? "false" : "true"}
      >
        {isStreaming ? (
          // Streaming mode — lightweight render, same prose base as done mode
          <div className={cn("prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap break-words", classNames?.prose)}>
            {markdown ? renderPlainText(content) : content}
            {cursorEl}
          </div>
        ) : (
          // Done mode — full markdown render
          <div className={cn("prose dark:prose-invert prose-sm max-w-none", classNames?.prose)}>
            {markdown ? markdownContent : <div className="whitespace-pre-wrap">{content}</div>}
            {cursorEl}
          </div>
        )}
      </div>
    </>
  );
}

export type { StreamingTextProps };
