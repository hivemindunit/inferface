"use client";

import Link from "next/link";
import { CodeSnippet } from "./components/code-snippet";

const DEMO_CARDS = [
  {
    title: "Streaming Text",
    href: "/demo/streaming",
    hook: "useCompletion",
    description: "Stream AI responses with live markdown rendering and syntax highlighting.",
    code: `const { completion, complete, isLoading } =
  useCompletion({ api: "/api/complete" });

<StreamingText content={completion}
  isStreaming={isLoading} />`,
  },
  {
    title: "Chat Interface",
    href: "/demo/chat",
    hook: "useChat",
    description: "Full ChatGPT-style conversation with optimistic updates, abort, and regeneration.",
    code: `const { messages, send, isLoading, abort } =
  useChat({ api: "/api/chat" });

<ChatThread chat={{ messages, isLoading }} />
<PromptInput onSubmit={send} />`,
  },
  {
    title: "Tool Call Approval",
    href: "/demo/tools",
    hook: "useToolCalls",
    description: "Human-in-the-loop approval flows for AI tool execution.",
    code: `const { pendingCalls, resolveToolCall } =
  useToolCalls({ stream: content });

{pendingCalls.map(call =>
  <ApprovalCard onApprove={...} />)}`,
  },
];

const HOOKS_TABLE = [
  { name: "useStream", description: "Low-level SSE/ReadableStream primitive", returns: "content, isStreaming, start, abort, reset" },
  { name: "useCompletion", description: "Single-turn text completion with streaming", returns: "completion, complete, isLoading, abort" },
  { name: "useChat", description: "Full conversational state with optimistic UI", returns: "messages, send, isLoading, streamingContent, regenerate" },
  { name: "useToolCalls", description: "Parse and manage tool call approval flows", returns: "toolCalls, pendingCalls, resolveToolCall, rejectToolCall" },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter text-foreground">
          inferface
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-xl">
          Composable React primitives for streaming AI interfaces
        </p>
        <p className="mt-2 text-sm text-muted-foreground/70 max-w-md">
          Hooks for state. Components for UI. Zero lock-in. Ship AI features in minutes, not weeks.
        </p>
        <div className="mt-8 flex gap-4">
          <a
            href="#demos"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            View demos <span aria-hidden="true">&rarr;</span>
          </a>
          <a
            href="https://github.com/hivemindunit/inferface"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-muted px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </section>

      {/* Zero Dependencies Callout */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-700/50 dark:border-emerald-800/50 bg-emerald-700/10 dark:bg-emerald-950/30 px-8 py-5">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Zero runtime dependencies</div>
              <div className="text-xs text-muted-foreground">
                <code className="text-emerald-700 dark:text-emerald-400/70">@inferface/hooks</code> — &lt;10KB gzipped. No transitive deps. Just React.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Cards */}
      <section id="demos" className="px-6 pb-24 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">See it in action</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl border border-border bg-card/50 p-6 hover:border-foreground/20 hover:bg-card transition-all"
              >
                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 mb-2">{card.hook}</div>
                <h3 className="text-lg font-semibold text-foreground">
                  {card.title}
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">&rarr;</span>
                </h3>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{card.description}</p>
                <div className="mt-4 rounded-lg bg-muted border border-border p-3 overflow-hidden">
                  <CodeSnippet code={card.code} lang="tsx" className="text-[11px] leading-relaxed" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hooks API Reference */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">Hooks API</h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Hook</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Key Returns</th>
                </tr>
              </thead>
              <tbody>
                {HOOKS_TABLE.map((hook) => (
                  <tr key={hook.name} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-3">
                      <code className="text-emerald-700 dark:text-emerald-400 text-xs font-mono">{hook.name}</code>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{hook.description}</td>
                    <td className="px-6 py-3">
                      <code className="text-muted-foreground text-xs font-mono">{hook.returns}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-semibold">inferface</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">0.0.1-alpha</span>
          </div>
          <div className="text-muted-foreground/60">built with inferface</div>
          <a
            href="https://github.com/hivemindunit/inferface"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
