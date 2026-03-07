"use client";

import { useChat } from "@inferface/hooks";
import { ChatThread, PromptInput } from "@inferface/components";

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
  } = useChat({
    api: "/api/chat",
    providerFormat: "openai",
    systemPrompt: "You are a helpful assistant.",
  });

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="shrink-0 px-6 pt-20 pb-4 max-w-6xl w-full mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">
          Chat Interface
        </h1>
        <p className="mt-1 text-zinc-400">
          A full ChatGPT-style interface powered by{" "}
          <code className="text-emerald-400">useChat</code> — in ~20 lines of
          code.
        </p>
      </div>

      {/* Body — fills remaining height */}
      <div className="flex-1 min-h-0 px-6 pb-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left: Live chat — fills full height */}
          <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden min-h-0">
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
              }}
              className="flex-1 min-h-0"
            />

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-red-900/30 border-t border-red-800/50 text-red-400 text-xs">
                Error: {error.message}
              </div>
            )}

            {/* PromptInput */}
            <PromptInput
              onSubmit={send}
              isLoading={isLoading}
              onStop={abort}
              className="border-t border-zinc-800"
            />

            {messages.length > 0 && (
              <div className="px-3 pb-2">
                <button
                  onClick={clear}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </div>

          {/* Right: Code snippet — scrollable if content overflows */}
          <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            <div className="text-sm font-medium text-zinc-400">
              The code powering this:
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <pre className="text-sm leading-relaxed">
                <code className="text-emerald-300">{CODE_SNIPPET}</code>
              </pre>
            </div>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500 space-y-3">
              <p>
                <strong className="text-zinc-400">~20 lines.</strong> That&apos;s a
                full chat interface with streaming, abort, message history, and
                error handling.
              </p>
              <p>
                <code className="text-emerald-400/70">useChat</code> manages
                optimistic user messages, SSE stream parsing, and automatic
                rollback on errors. The{" "}
                <code className="text-emerald-400/70">streamingContent</code>{" "}
                prop gives you real-time token updates before the message is
                committed to history.
              </p>
              <p>
                <strong className="text-zinc-400">Provider agnostic.</strong>{" "}
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
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3"
                >
                  <div className="mt-1 text-xs font-medium text-zinc-300">
                    {feat.label}
                  </div>
                  <div className="text-xs text-zinc-600">{feat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
