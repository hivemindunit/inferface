"use client";

import { useCompletion } from "@inferface/hooks";

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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← inferface
          </a>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Streaming Text
          </h1>
          <p className="mt-2 text-zinc-400">
            <code className="text-emerald-400">useCompletion</code> hook
            streaming AI responses in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Interactive demo */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-zinc-400">
              Try a prompt:
            </div>

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

            {/* Controls */}
            <div className="flex gap-2">
              {isLoading && (
                <button
                  onClick={abort}
                  className="rounded-lg bg-red-900/50 border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900 transition-colors"
                >
                  ⏹ Stop
                </button>
              )}
              {(completion || error) && !isLoading && (
                <button
                  onClick={reset}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  ↺ Reset
                </button>
              )}
            </div>

            {/* Output */}
            <div className="min-h-[300px] rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              {error ? (
                <div className="text-red-400 text-sm">
                  Error: {error.message}
                </div>
              ) : completion ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200 font-sans">
                    {completion}
                    {isLoading && (
                      <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 animate-pulse" />
                    )}
                  </pre>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
                  Click a prompt above to see streaming in action
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isLoading ? "bg-emerald-400 animate-pulse" : "bg-zinc-700"
                }`}
              />
              {isLoading ? "Streaming..." : "Ready"}
            </div>
          </div>

          {/* Right: Code snippet */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-zinc-400">
              The code:
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <pre className="text-sm leading-relaxed">
                <code className="text-emerald-300">{CODE_SNIPPET}</code>
              </pre>
            </div>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500">
              <p>
                <strong className="text-zinc-400">Zero dependencies.</strong>{" "}
                <code className="text-emerald-400/70">@inferface/hooks</code>{" "}
                handles SSE parsing, abort, error recovery, and state
                management. Works with OpenAI, Anthropic, or any SSE-compatible
                endpoint.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
