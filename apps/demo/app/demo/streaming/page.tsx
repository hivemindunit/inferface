"use client";

import { useCompletion } from "@inferface/hooks";
import { StreamingText } from "@inferface/components";
import { useRef, useEffect } from "react";

const EXAMPLE_PROMPTS = [
  "Explain async/await with code examples",
  "Compare React state management options",
  "What makes a good API design?",
];

const CODE_SNIPPET = `import { useCompletion } from "@inferface/hooks";

const { completion, complete, isLoading, abort } =
  useCompletion({ api: "/api/complete" });

// Fire a completion
await complete("Explain async/await");

// Stream renders automatically via \`completion\``;

export default function StreamingDemo() {
  const { completion, complete, isLoading, abort, reset, error } =
    useCompletion({
      api: "/api/complete",
      providerFormat: "openai",
    });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as content streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [completion]);

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-4 max-w-6xl w-full mx-auto">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← inferface
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Streaming Text</h1>
        <p className="mt-1 text-zinc-400">
          <code className="text-emerald-400">useCompletion</code> — hook streaming AI responses in real time.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 pb-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

          {/* Left: Interactive demo */}
          <div className="flex flex-col h-full min-h-0">
            {/* Prompts + controls — fixed */}
            <div className="shrink-0 space-y-3 mb-3">
              <div className="text-sm font-medium text-zinc-400">Try a prompt:</div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => complete(prompt)}
                    disabled={isLoading}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {isLoading && (
                  <button
                    onClick={abort}
                    className="flex items-center gap-1.5 rounded-lg bg-red-900/50 border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg> Stop
                  </button>
                )}
                {(completion || error) && !isLoading && (
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M1 4s1-3 7-3a7 7 0 0 1 0 14c-3 0-5.5-1.5-6.5-3.5"/><path d="M1 1v3h3"/></svg> Reset
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
                  <span className={`inline-block h-2 w-2 rounded-full ${isLoading ? "bg-emerald-400 animate-pulse" : "bg-zinc-700"}`} />
                  {isLoading ? "Streaming..." : "Ready"}
                </div>
              </div>
            </div>

            {/* Scrollable output */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              {error ? (
                <div className="text-red-400 text-sm">Error: {error.message}</div>
              ) : completion ? (
                <StreamingText
                  content={completion}
                  isStreaming={isLoading}
                  className="text-sm leading-relaxed text-zinc-200"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
                  Click a prompt above to see streaming in action
                </div>
              )}
            </div>
          </div>

          {/* Right: Code snippet — scrollable */}
          <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            <div className="text-sm font-medium text-zinc-400">The code:</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <pre className="text-sm leading-relaxed">
                <code className="text-emerald-300">{CODE_SNIPPET}</code>
              </pre>
            </div>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500">
              <p>
                <strong className="text-zinc-400">Zero dependencies.</strong>{" "}
                <code className="text-emerald-400/70">@inferface/hooks</code>{" "}
                handles SSE parsing, abort, error recovery, and state management.
                Works with OpenAI, Anthropic, or any SSE-compatible endpoint.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
