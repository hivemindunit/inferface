"use client";

import { useChat } from "@inferface/hooks";
import { ChatThread, PromptInput } from "@inferface/components";
import { CodeSnippet } from "../../components/code-snippet";

const CODE_SNIPPET = `const { messages, send, isLoading, abort, streamingContent, error, clear, editAndResend } =
  useChat({ api: "/api/chat", systemPrompt: "You are a helpful assistant." });

return (
  <main className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
    <ChatThread
      chat={{ messages, send, isLoading, abort, streamingContent, error, clear,
              regenerate, appendMessage, updateMessage, deleteMessage, editAndResend }}
      className="flex-1 min-h-0"
    />
    <PromptInput
      onSubmit={send}
      isLoading={isLoading}
      onStop={abort}
      className="border-t border-zinc-800"
    />
  </main>
);`;

export default function ChatDemo() {
  const {
    messages,
    send,
    isLoading,
    abort,
    streamingContent,
    error,
    clear,
    regenerate,
    appendMessage,
    updateMessage,
    deleteMessage,
    editAndResend,
    submitToolResults,
  } = useChat({
    api: "/api/chat",
    providerFormat: "openai",
    systemPrompt: "You are a helpful assistant.",
  });

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="shrink-0 px-6 pt-20 pb-4 max-w-6xl w-full mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">
          Chat Interface
        </h1>
        <p className="mt-1 text-muted-foreground">
          A full ChatGPT-style interface powered by{" "}
          <code className="text-emerald-700 dark:text-emerald-400">useChat</code> — in ~20 lines of
          code.
        </p>
      </div>

      {/* Body — fills remaining height */}
      <div className="flex-1 min-h-0 px-6 pb-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left: Live chat — fills full height */}
          <div className="flex flex-col h-full rounded-xl border border-border bg-card/50 overflow-hidden min-h-0">
            {/* ChatThread — fills available space */}
            <ChatThread
              chat={{
                messages,
                send,
                isLoading,
                abort,
                streamingContent,
                error,
                clear,
                regenerate,
                appendMessage,
                updateMessage,
                deleteMessage,
                editAndResend,
                submitToolResults,
              }}
              className="flex-1 min-h-0"
            />

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30 text-destructive text-xs">
                Error: {error.message}
              </div>
            )}

            {/* PromptInput */}
            <PromptInput
              onSubmit={send}
              isLoading={isLoading}
              onStop={abort}
              className="border-t border-border"
            />

            {messages.length > 0 && (
              <div className="px-3 pb-2">
                <button
                  onClick={clear}
                  className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </div>

          {/* Right: Code snippet — scrollable if content overflows */}
          <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            <div className="text-sm font-medium text-muted-foreground">
              The code powering this:
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <CodeSnippet code={CODE_SNIPPET} lang="tsx" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/30 p-4 text-sm text-muted-foreground space-y-3">
              <p>
                <strong className="text-foreground">~20 lines.</strong> That&apos;s a
                full chat interface with streaming, abort, message history, and
                error handling.
              </p>
              <p>
                <code className="text-emerald-700 dark:text-emerald-400/70">useChat</code> manages
                optimistic user messages, SSE stream parsing, and automatic
                rollback on errors. The{" "}
                <code className="text-emerald-700 dark:text-emerald-400/70">streamingContent</code>{" "}
                prop gives you real-time token updates before the message is
                committed to history.
              </p>
              <p>
                <strong className="text-foreground">Provider agnostic.</strong>{" "}
                Works with OpenAI, Anthropic, or any endpoint that returns
                Server-Sent Events. Zero dependencies.
              </p>
            </div>

            {/* Feature callouts */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Optimistic UI", desc: "Messages appear instantly" },
                { label: "Auto rollback", desc: "Failed requests undo cleanly" },
                { label: "Abort support", desc: "Cancel mid-stream" },
                { label: "Storage adapters", desc: "Persist to localStorage/DB" },
              ].map((feat) => (
                <div
                  key={feat.label}
                  className="rounded-lg border border-border/50 bg-card/30 p-3"
                >
                  <div className="mt-1 text-xs font-medium text-foreground">
                    {feat.label}
                  </div>
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
