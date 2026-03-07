"use client";
import { useEffect, useState } from "react";
import { createHighlighter } from "shiki";

// Module-level singleton (same pattern as StreamingText)
let highlighterPromise: Promise<any> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: ["typescript", "tsx", "javascript", "jsx", "bash"],
    });
  }
  return highlighterPromise;
}

interface CodeSnippetProps {
  code: string;
  lang?: string;
  className?: string;
}

export function CodeSnippet({ code, lang = "tsx", className }: CodeSnippetProps) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    getHighlighter().then((hl) => {
      const result = hl.codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false, // use CSS vars for dual theme
      });
      setHtml(result);
    });
  }, [code, lang]);

  if (!html) {
    // Fallback while loading
    return (
      <pre className={className}>
        <code className="text-muted-foreground text-[11px]">{code}</code>
      </pre>
    );
  }
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
