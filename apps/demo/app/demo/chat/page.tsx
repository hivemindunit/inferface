"use client";

import { useChat } from "@inferface/hooks";
import { StreamingText } from "@inferface/components";
import { useRef, useEffect, useState } from "react";

const CODE_SNIPPET = `const { messages, send, isLoading, abort } = useChat({
  api: "/api/chat",
  systemPrompt: "You are a helpful assistant.",
});

return (
  <>
    <ChatThread chat={{ messages, isLoading }} />
    <PromptInput
      onSubmit={send}
      isLoading={isLoading}
      onStop={abort}
    />
  </>
);`;

export default function ChatDemo() {
  const { messages, send, isLoading, abort, streamingContent, error, clear, editAndResend } =
    useChat({
      api: "/api/chat",
      providerFormat: "openai",
      systemPrompt: "You are a helpful assistant.",
    });

  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await send(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-4 max-w-6xl w-full mx-auto">
        <a
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← inferface
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
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
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 && !streamingContent && (
                <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">💬</div>
                    <p>Send a message to start chatting</p>
                    <p className="text-xs text-zinc-700">
                      Try &quot;What is inferface?&quot; or &quot;Show me a code example&quot;
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex group ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Edit button — only for user messages */}
                  {msg.role === "user" && editingId !== msg.id && (
                    <button
                      onClick={() => {
                        setEditingId(msg.id);
                        setEditingContent(
                          typeof msg.content === "string"
                            ? msg.content
                            : msg.content
                                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                                .map((p) => p.text)
                                .join("")
                        );
                      }}
                      className="self-center mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-400 text-xs"
                      title="Edit message"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-3 .8.8-3 8.7-8.5z"/></svg>
                    </button>
                  )}

                  <div className={`max-w-[80%] ${msg.role === "user" ? "" : ""}`}>
                    {/* Inline edit mode */}
                    {msg.role === "user" && editingId === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (editingContent.trim()) {
                                editAndResend(msg.id, editingContent.trim());
                                setEditingId(null);
                              }
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          rows={3}
                          className="w-full min-w-[240px] rounded-xl border border-emerald-500/50 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editingContent.trim()) {
                                editAndResend(msg.id, editingContent.trim());
                                setEditingId(null);
                              }
                            }}
                            disabled={!editingContent.trim()}
                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V3m-4 4l4-4 4 4"/></svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <StreamingText
                            content={
                              typeof msg.content === "string"
                                ? msg.content
                                : msg.content
                                    .filter(
                                      (p): p is { type: "text"; text: string } =>
                                        p.type === "text"
                                    )
                                    .map((p) => p.text)
                                    .join("")
                            }
                            isStreaming={false}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans">
                            {typeof msg.content === "string"
                              ? msg.content
                              : msg.content
                                  .filter(
                                    (p): p is { type: "text"; text: string } =>
                                      p.type === "text"
                                  )
                                  .map((p) => p.text)
                                  .join("")}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-zinc-800 text-zinc-200">
                    <StreamingText
                      content={streamingContent}
                      isStreaming={true}
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator (before streaming starts) */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 bg-zinc-800 text-zinc-500 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-red-900/30 border-t border-red-800/50 text-red-400 text-xs">
                Error: {error.message}
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                {isLoading ? (
                  <button
                    onClick={abort}
                    className="flex items-center gap-1.5 shrink-0 rounded-xl bg-red-900/50 border border-red-800 px-4 py-2.5 text-sm text-red-300 hover:bg-red-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg> Stop
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="flex items-center gap-1.5 shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V3m-4 4l4-4 4 4"/></svg>
                  </button>
                )}
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </div>
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
                { icon: "⚡", label: "Optimistic UI", desc: "Messages appear instantly" },
                { icon: "↩", label: "Auto rollback", desc: "Failed requests undo cleanly" },
                { icon: "◼", label: "Abort support", desc: "Cancel mid-stream" },
                { icon: "⊡", label: "Storage adapters", desc: "Persist to localStorage/DB" },
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
          </div>
        </div>
      </div>
    </main>
  );
}
