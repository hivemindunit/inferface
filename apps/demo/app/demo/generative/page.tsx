"use client";

import { useStream, useToolCalls, useGenerativeUI } from "@inferface/hooks";
import type { GenerativeUIComponentProps, GenerativeUIRegistry } from "@inferface/hooks";
import { StreamingText } from "@inferface/components";
import { useState, useCallback, useRef, useEffect } from "react";
import { CodeSnippet } from "../../components/code-snippet";

// ---------------------------------------------------------------------------
// OptionPicker — generic Generative UI Component
// ---------------------------------------------------------------------------

interface Option {
  id: string;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

interface OptionPickerProps {
  label: string;
  options: Option[];
  multiSelect?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  blue: "bg-blue-600 text-white",
  amber: "bg-amber-600 text-white",
  purple: "bg-purple-600 text-white",
  emerald: "bg-emerald-600 text-white",
  rose: "bg-rose-600 text-white",
};

function OptionPicker({ props, onSubmit }: GenerativeUIComponentProps<OptionPickerProps>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (props.multiSelect) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else {
      setSelected(new Set([id]));
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{props.label}</div>
      <div className="grid gap-2">
        {props.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-950/20"
                  : "border-border bg-card/50 hover:bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                {opt.badge && (
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      BADGE_COLORS[opt.badgeColor ?? "blue"] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">{opt.description}</div>
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <button
          onClick={() =>
            onSubmit(
              props.multiSelect ? { selected: [...selected] } : { selected: [...selected][0] }
            )
          }
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 transition-colors"
        >
          Confirm
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const componentRegistry: GenerativeUIRegistry = {
  "option-picker": OptionPicker as React.ComponentType<GenerativeUIComponentProps<unknown>>,
};

// ---------------------------------------------------------------------------
// Code snippet
// ---------------------------------------------------------------------------

const CODE_SNIPPET = `import { useGenerativeUI } from "@inferface/hooks";

const registry = {
  "option-picker": OptionPicker,
};

const { renderToolCall } = useGenerativeUI({
  registry,
  onResult: (toolCallId, result) => {
    // Feed result back to the agent
    resolveToolCall(toolCallId, result);
    // Trigger follow-up completion
    stream.start({ phase: "after_tools", toolResults: { [toolCallId]: result } });
  },
});

// In your render:
{pendingCalls.map(tc => {
  const ui = renderToolCall(tc);
  return ui ?? <FallbackApprovalCard key={tc.id} />;
})}`;

// ---------------------------------------------------------------------------
// Demo page
// ---------------------------------------------------------------------------

type DemoPhase = "idle" | "streaming" | "awaiting_ui" | "streaming_final" | "done";

export default function GenerativeUIDemo() {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [initialContent, setInitialContent] = useState("");
  const [finalContent, setFinalContent] = useState("");

  const initialStream = useStream({
    api: "/api/generative",
    providerFormat: "openai",
    body: { phase: "initial" },
    onFinish: (content) => {
      setInitialContent(content);
      setPhase("awaiting_ui");
    },
  });

  const {
    toolCalls,
    pendingCalls,
    resolveToolCall,
    results,
    reset: resetToolCalls,
  } = useToolCalls({
    stream: initialStream.content,
    providerFormat: "openai",
  });

  const { renderToolCall } = useGenerativeUI({
    registry: componentRegistry,
    onResult: (toolCallId, result) => {
      resolveToolCall(toolCallId, result);
      setPhase("streaming_final");
      finalStream.start({ phase: "after_tools", toolResults: { [toolCallId]: result } });
    },
  });

  const finalStream = useStream({
    api: "/api/generative",
    providerFormat: "openai",
    onFinish: (content) => {
      setFinalContent(content);
      setPhase("done");
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [initialStream.content, finalStream.content, toolCalls.length, phase]);

  const handleRun = useCallback(async () => {
    setPhase("streaming");
    setInitialContent("");
    setFinalContent("");
    initialStream.reset();
    finalStream.reset();
    resetToolCalls();
    await initialStream.start({ phase: "initial" });
  }, [initialStream, finalStream, resetToolCalls]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setInitialContent("");
    setFinalContent("");
    initialStream.reset();
    finalStream.reset();
    resetToolCalls();
  }, [initialStream, finalStream, resetToolCalls]);

  const displayContent =
    initialContent.split("[TOOL_CALLS]")[0] ||
    initialStream.content.split("[TOOL_CALLS]")[0];

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <div className="shrink-0 px-6 pt-20 pb-4 max-w-6xl w-full mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Generative UI</h1>
        <p className="mt-1 text-muted-foreground">
          <code className="text-emerald-700 dark:text-emerald-400">useGenerativeUI</code> — render
          interactive components as tool call responses.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left: Interactive demo */}
          <div className="flex flex-col h-full min-h-0">
            <div className="shrink-0 space-y-3 mb-3">
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <div className="text-xs text-muted-foreground mb-2">Prompt</div>
                <div className="text-sm text-foreground">
                  &quot;Set up my AI assistant&quot;
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  disabled={phase !== "idle" && phase !== "done"}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M3 2l10 6-10 6V2z" />
                  </svg>{" "}
                  Run
                </button>
                {phase !== "idle" && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground/70">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      phase === "idle" || phase === "done"
                        ? "bg-muted-foreground/30"
                        : phase === "awaiting_ui"
                          ? "bg-purple-400 animate-pulse"
                          : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  {phase === "idle" && "Ready"}
                  {phase === "streaming" && "Streaming..."}
                  {phase === "awaiting_ui" && "Awaiting selection..."}
                  {phase === "streaming_final" && "Generating response..."}
                  {phase === "done" && "Complete"}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {displayContent && (
                <div className="rounded-xl border border-border bg-card/50 p-4">
                  <StreamingText
                    content={displayContent}
                    isStreaming={phase === "streaming"}
                    className="text-sm text-foreground"
                  />
                </div>
              )}

              {toolCalls.length > 0 &&
                phase !== "idle" &&
                toolCalls.map((tc) => {
                  const isPending = pendingCalls.some((p) => p.id === tc.id);
                  const result = results.get(tc.id);

                  if (result && !result.error) {
                    return (
                      <div
                        key={tc.id}
                        className="rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4"
                      >
                        <div className="text-sm text-emerald-400 font-medium">
                          Selection confirmed ✓
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(result.result)}
                        </div>
                      </div>
                    );
                  }

                  if (isPending) {
                    const node = renderToolCall(tc);
                    if (node) {
                      return (
                        <div
                          key={tc.id}
                          className="rounded-xl border border-purple-700/50 bg-purple-950/10 p-4"
                        >
                          {node}
                        </div>
                      );
                    }
                  }

                  return null;
                })}

              {(finalStream.content || finalContent) && (
                <div className="rounded-xl border border-border bg-card/50 p-4">
                  <StreamingText
                    content={finalStream.content || finalContent}
                    isStreaming={phase === "streaming_final"}
                    className="text-sm text-foreground"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Code + info */}
          <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            <div className="text-sm font-medium text-muted-foreground">The code:</div>
            <div className="rounded-xl border border-border bg-card p-6">
              <CodeSnippet code={CODE_SNIPPET} lang="tsx" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/30 p-4 text-sm text-muted-foreground space-y-3">
              <p>
                <strong className="text-foreground">Generative UI.</strong> The agent emits a tool
                call naming a component (e.g.{" "}
                <code className="text-emerald-700 dark:text-emerald-400/70">option-picker</code>).
                Your registry maps it to a real React component that renders inline.
              </p>
              <p>
                The user interacts — making selections, adjusting values, confirming choices. When
                they submit, the result flows back to the agent as a tool result, enabling the next
                phase of the conversation.
              </p>
              <p>
                <strong className="text-foreground">Unregistered tool calls</strong> fall through to
                the standard HITL approve/reject UI from{" "}
                <code className="text-emerald-700 dark:text-emerald-400/70">useToolCalls</code>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🧩", label: "Component registry", desc: "Map tool names to React components" },
                { icon: "🔄", label: "Full loop", desc: "User input feeds back to the agent" },
                { icon: "🛡️", label: "HITL fallback", desc: "Unregistered calls get approve/reject" },
                { icon: "⚡", label: "Streaming compatible", desc: "Works with SSE streaming" },
              ].map((feat) => (
                <div key={feat.label} className="rounded-lg border border-border/50 bg-card/30 p-3">
                  <div className="text-lg">{feat.icon}</div>
                  <div className="mt-1 text-xs font-medium text-foreground">{feat.label}</div>
                  <div className="text-xs text-muted-foreground/70">{feat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
