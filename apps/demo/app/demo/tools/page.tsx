"use client";

import { useStream, useToolCalls } from "@inferface/hooks";
import { StreamingText } from "@inferface/components";
import { useState, useCallback, useRef, useEffect } from "react";

const CODE_SNIPPET = `const { content, start, isStreaming } = useStream({
  api: "/api/tools",
  providerFormat: "openai",
});

const { toolCalls, pendingCalls, resolveToolCall, rejectToolCall, isExecuting } =
  useToolCalls({
    stream: content,
    providerFormat: "openai",
  });

// Render pending calls as approval cards
{pendingCalls.map(call => (
  <ToolApprovalCard
    key={call.id}
    toolCall={call}
    onApprove={() => resolveToolCall(call.id, mockResult)}
    onDeny={() => rejectToolCall(call.id, new Error("Denied"))}
  />
))}`;

const TOOL_DESCRIPTIONS: Record<string, { label: string; icon: string; desc: string }> = {
  search_flights: {
    label: "Search Flights",
    icon: "✈️",
    desc: "Search for available flights",
  },
  get_weather: {
    label: "Check Weather",
    icon: "🌤️",
    desc: "Check the weather forecast",
  },
};

const MOCK_RESULTS: Record<string, unknown> = {
  search_flights: {
    flights: [
      { airline: "Air Canada", flight: "AC870", price: 847, currency: "CAD" },
      { airline: "Air France", flight: "AF357", price: 923, currency: "CAD" },
    ],
  },
  get_weather: {
    city: "Paris",
    month: "June",
    avgHigh: "23°C",
    avgLow: "14°C",
    condition: "Mostly sunny",
  },
};

type DemoPhase = "idle" | "streaming" | "awaiting_tools" | "streaming_final" | "done";

export default function ToolsDemo() {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [initialContent, setInitialContent] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [resolvedTools, setResolvedTools] = useState<Record<string, unknown>>({});

  // Initial stream — gets tool calls
  const initialStream = useStream({
    api: "/api/tools",
    providerFormat: "openai",
    body: { phase: "initial" },
    onFinish: (content) => {
      setInitialContent(content);
      setPhase("awaiting_tools");
    },
  });

  // Tool calls parser
  const { toolCalls, pendingCalls, resolveToolCall, rejectToolCall, isExecuting, results, reset: resetToolCalls } =
    useToolCalls({
      stream: initialStream.content,
      providerFormat: "openai",
    });

  // Final stream — after tool results
  const finalStream = useStream({
    api: "/api/tools",
    providerFormat: "openai",
    onFinish: (content) => {
      setFinalContent(content);
      setPhase("done");
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [initialStream.content, finalStream.content, toolCalls.length]);

  const handleRun = useCallback(async () => {
    setPhase("streaming");
    setInitialContent("");
    setFinalContent("");
    setResolvedTools({});
    initialStream.reset();
    finalStream.reset();
    resetToolCalls();
    await initialStream.start({ phase: "initial" });
  }, [initialStream, finalStream, resetToolCalls]);

  const handleApprove = useCallback(
    (toolCallId: string, functionName: string) => {
      const mockResult = MOCK_RESULTS[functionName] ?? { ok: true };
      resolveToolCall(toolCallId, mockResult);

      setResolvedTools((prev) => {
        const next = { ...prev, [toolCallId]: mockResult };

        // Check if all tool calls are resolved
        const allResolved = toolCalls.every(
          (tc) => next[tc.id] !== undefined || results.has(tc.id)
        );
        if (allResolved && toolCalls.length > 0) {
          // Build tool results map and fire the final stream
          const toolResultsMap: Record<string, unknown> = {};
          for (const tc of toolCalls) {
            toolResultsMap[tc.id] = next[tc.id] ?? results.get(tc.id)?.result;
          }
          setPhase("streaming_final");
          finalStream.start({ phase: "after_tools", toolResults: toolResultsMap });
        }
        return next;
      });
    },
    [toolCalls, results, resolveToolCall, finalStream]
  );

  const handleDeny = useCallback(
    (toolCallId: string) => {
      rejectToolCall(toolCallId, new Error("User denied"));

      setResolvedTools((prev) => {
        const next = { ...prev, [toolCallId]: null };

        const allResolved = toolCalls.every(
          (tc) => next[tc.id] !== undefined || results.has(tc.id)
        );
        if (allResolved && toolCalls.length > 0) {
          const toolResultsMap: Record<string, unknown> = {};
          for (const tc of toolCalls) {
            const val = next[tc.id];
            toolResultsMap[tc.id] = val === null ? null : (val ?? results.get(tc.id)?.result);
          }
          setPhase("streaming_final");
          finalStream.start({ phase: "after_tools", toolResults: toolResultsMap });
        }
        return next;
      });
    },
    [toolCalls, results, rejectToolCall, finalStream]
  );

  const handleReset = useCallback(() => {
    setPhase("idle");
    setInitialContent("");
    setFinalContent("");
    setResolvedTools({});
    initialStream.reset();
    finalStream.reset();
    resetToolCalls();
  }, [initialStream, finalStream, resetToolCalls]);

  // Extract text before [TOOL_CALLS] marker for display
  const displayContent = initialContent.split("[TOOL_CALLS]")[0] || initialStream.content.split("[TOOL_CALLS]")[0];

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-4 max-w-6xl w-full mx-auto">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← inferface
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Tool Calls with UI Confirmation
        </h1>
        <p className="mt-1 text-zinc-400">
          <code className="text-emerald-400">useToolCalls</code> — human-in-the-loop
          approval for AI tool execution.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 pb-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left: Interactive demo — scrollable */}
          <div className="flex flex-col h-full min-h-0">
            {/* Prompt + buttons — fixed */}
            <div className="shrink-0 space-y-3 mb-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-xs text-zinc-500 mb-2">Prompt</div>
                <div className="text-sm text-zinc-200">
                  &quot;Plan a trip from Toronto to Paris in June&quot;
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  disabled={phase !== "idle" && phase !== "done"}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ▶ Run
                </button>
                {phase !== "idle" && (
                  <button
                    onClick={handleReset}
                    className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    ↺ Reset
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    phase === "idle" || phase === "done" ? "bg-zinc-700"
                    : phase === "awaiting_tools" ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400 animate-pulse"
                  }`} />
                  {phase === "idle" && "Ready"}
                  {phase === "streaming" && "Streaming..."}
                  {phase === "awaiting_tools" && "Awaiting approval..."}
                  {phase === "streaming_final" && "Generating response..."}
                  {phase === "done" && "Complete"}
                </div>
              </div>
            </div>

            {/* Scrollable output area */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">

            {/* Initial AI response */}
            {displayContent && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <StreamingText
                  content={displayContent}
                  isStreaming={phase === "streaming"}
                  className="text-sm text-zinc-200"
                />
              </div>
            )}

            {/* Tool call approval cards */}
            {toolCalls.length > 0 && phase !== "idle" && (
              <div className="space-y-3">
                {toolCalls.map((tc) => {
                  const meta = TOOL_DESCRIPTIONS[tc.function.name] ?? {
                    label: tc.function.name,
                    icon: "🔧",
                    desc: "Execute tool",
                  };
                  const isPending = pendingCalls.some((p) => p.id === tc.id);
                  const result = results.get(tc.id);
                  const isApproved = result && !result.error;
                  const isDenied = result?.error;

                  let args: Record<string, unknown> = {};
                  try {
                    args = JSON.parse(tc.function.arguments);
                  } catch {
                    // ignore
                  }

                  return (
                    <div
                      key={tc.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isPending
                          ? "border-amber-700/50 bg-amber-950/20"
                          : isApproved
                          ? "border-emerald-700/50 bg-emerald-950/20"
                          : isDenied
                          ? "border-red-700/50 bg-red-950/20"
                          : "border-zinc-800 bg-zinc-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-zinc-200">
                              {isPending
                                ? `The AI wants to: ${meta.label}`
                                : isApproved
                                ? `${meta.label} — Approved ✓`
                                : isDenied
                                ? `${meta.label} — Denied ✗`
                                : meta.label}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {Object.entries(args)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")}
                            </div>
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(tc.id, tc.function.name)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors"
                            >
                              Allow
                            </button>
                            <button
                              onClick={() => handleDeny(tc.id)}
                              className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/50 transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Final AI response */}
            {(finalStream.content || finalContent) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <StreamingText
                  content={finalStream.content || finalContent}
                  isStreaming={phase === "streaming_final"}
                  className="text-sm text-zinc-200"
                />
              </div>
            )}
            </div>{/* end scrollable area */}
          </div>{/* end left column */}

          {/* Right: Code snippet — scrollable */}
          <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            <div className="text-sm font-medium text-zinc-400">The code:</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <pre className="text-sm leading-relaxed overflow-x-auto">
                <code className="text-emerald-300">{CODE_SNIPPET}</code>
              </pre>
            </div>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500 space-y-3">
              <p>
                <strong className="text-zinc-400">Human-in-the-loop.</strong>{" "}
                <code className="text-emerald-400/70">useToolCalls</code> parses
                tool calls from the stream and gives you{" "}
                <code className="text-emerald-400/70">resolveToolCall</code> /{" "}
                <code className="text-emerald-400/70">rejectToolCall</code> for
                UI-confirmed execution.
              </p>
              <p>
                Pending calls render as approval cards. The user decides what the
                AI is allowed to do. Once approved, results flow back and the AI
                generates a final response.
              </p>
              <p>
                <strong className="text-zinc-400">
                  Real production pattern.
                </strong>{" "}
                Build agentic approval workflows, human-verified tool use, or
                auditable AI pipelines — in ~20 lines of hook code.
              </p>
            </div>

            {/* Feature callouts */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🛡️", label: "Approval flow", desc: "Users control tool execution" },
                { icon: "⚡", label: "Streaming", desc: "Tool calls arrive mid-stream" },
                { icon: "🔄", label: "Parallel calls", desc: "Multiple tools at once" },
                { icon: "🔌", label: "Provider agnostic", desc: "OpenAI & Anthropic formats" },
              ].map((feat) => (
                <div
                  key={feat.label}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3"
                >
                  <div className="text-lg">{feat.icon}</div>
                  <div className="mt-1 text-xs font-medium text-zinc-300">
                    {feat.label}
                  </div>
                  <div className="text-xs text-zinc-600">{feat.desc}</div>
                </div>
              ))}
            </div>
          </div>{/* end right column */}
        </div>{/* end grid */}
      </div>{/* end body */}
    </main>
  );
}
