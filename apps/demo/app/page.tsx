"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { CodeSnippet } from "./components/code-snippet";

const MotionLink = motion(Link);

/* ─── Data ───────────────────────────────────────────────────────────── */

const DEMO_CARDS = [
  {
    title: "Streaming Text",
    href: "/demo/streaming",
    hook: "useCompletion",
    description:
      "Stream AI responses with live markdown rendering and syntax highlighting.",
    code: `const { completion, complete, isLoading } =
  useCompletion({ api: "/api/complete" });

<StreamingText content={completion}
  isStreaming={isLoading} />`,
  },
  {
    title: "Chat Interface",
    href: "/demo/chat",
    hook: "useChat",
    description:
      "Full ChatGPT-style conversation with optimistic updates, abort, and regeneration.",
    code: `const { messages, send, isLoading, abort } =
  useChat({ api: "/api/chat" });

<ChatThread chat={{ messages, isLoading }} />
<PromptInput onSubmit={send} />`,
  },
  {
    title: "Tool Call Approval",
    href: "/demo/tools",
    hook: "useToolCalls",
    description:
      "Human-in-the-loop approval flows for AI tool execution.",
    code: `const { pendingCalls, resolveToolCall } =
  useToolCalls({ stream: content });

{pendingCalls.map(call =>
  <ApprovalCard onApprove={...} />)}`,
  },
];

const HOOKS_TABLE = [
  {
    name: "useStream",
    description: "Low-level SSE/ReadableStream primitive",
    returns: "content, isStreaming, start, abort, reset",
  },
  {
    name: "useCompletion",
    description: "Single-turn text completion with streaming",
    returns: "completion, complete, isLoading, abort",
  },
  {
    name: "useChat",
    description: "Full conversational state with optimistic UI",
    returns: "messages, send, isLoading, streamingContent, regenerate",
  },
  {
    name: "useToolCalls",
    description: "Parse and manage tool call approval flows",
    returns: "toolCalls, pendingCalls, resolveToolCall, rejectToolCall",
  },
];

const EDGE_CASES = [
  {
    title: "Mid-stream abort",
    description:
      "User cancelled? abort() stops the stream and rolls back state cleanly.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    title: "Lost connections",
    description:
      "Network hiccup mid-stream? The hook tracks error state so your UI can recover gracefully.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M3.5 2A1.5 1.5 0 002 3.5v13A1.5 1.5 0 003.5 18h13a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-13zM10 13.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75zm0-8a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    ),
  },
  {
    title: "Nested tool calls",
    description:
      "When the AI calls a tool that calls another tool, useToolCalls tracks the dependency chain.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

const STREAMED_TEXT =
  "useChat manages the full conversation lifecycle — messages array, optimistic updates, streaming state, abort, and regeneration. It's built on useStream under the hood.";

/* ─── Icons ──────────────────────────────────────────────────────────── */

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="10" height="14" rx="2" />
      <path d="M7 5V3.5A1.5 1.5 0 018.5 2h3A1.5 1.5 0 0113 3.5V5" />
      <rect x="7" y="1.5" width="6" height="3" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M14.5 10a4.5 4.5 0 004.284-5.882c-.105-.324-.51-.391-.752-.15L15.34 6.66a.454.454 0 01-.493.101 3.046 3.046 0 01-1.607-1.607.454.454 0 01.1-.493l2.693-2.692c.24-.241.174-.647-.15-.752a4.5 4.5 0 00-5.873 4.575c.055.873-.128 1.808-.8 2.368l-7.23 6.024a2.724 2.724 0 103.837 3.837l6.024-7.23c.56-.672 1.495-.855 2.368-.8.096.007.193.01.291.01zM5 16a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ─── Streaming Preview ──────────────────────────────────────────────── */

function StreamingPreview() {
  const [displayedText, setDisplayedText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "resetting">(
    "typing"
  );

  useEffect(() => {
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      const interval = setInterval(() => {
        idx++;
        if (idx > STREAMED_TEXT.length) {
          clearInterval(interval);
          setPhase("pausing");
          return;
        }
        setDisplayedText(STREAMED_TEXT.slice(0, idx));
      }, 18);
      return () => clearInterval(interval);
    } else if (phase === "pausing") {
      timer = setTimeout(() => setPhase("resetting"), 2000);
      return () => clearTimeout(timer);
    } else {
      timer = setTimeout(() => {
        setDisplayedText("");
        setPhase("typing");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="rounded-2xl border bg-card shadow-lg p-4 w-full max-w-md">
      {/* User message */}
      <div className="flex justify-end mb-3">
        <div className="rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm max-w-[80%]">
          How does useChat work?
        </div>
      </div>
      {/* Assistant message — streaming */}
      <div className="flex justify-start">
        <div className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground max-w-[90%] min-h-[3.5rem]">
          {displayedText}
          <span className="inline-block w-[2px] h-4 bg-emerald-500 ml-0.5 align-text-bottom animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ─── Copy Button ────────────────────────────────────────────────────── */

function CopyInstallButton() {
  const [copied, setCopied] = useState(false);
  const cmd = "npx shadcn add https://inferface.dev/registry/use-chat";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cmd]);

  return (
    <div className="font-mono text-sm bg-muted rounded-xl px-6 py-3 flex items-center justify-between gap-4">
      <code className="text-foreground truncate">
        <span className="text-muted-foreground select-none">$ </span>
        {cmd}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded-md hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Copy install command"
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-emerald-500" />
        ) : (
          <ClipboardIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function Home() {
  const [stars, setStars] = useState<number | null>(null);
  const cardsRef = useRef(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-80px" });
  const edgeCasesRef = useRef(null);
  const edgeCasesInView = useInView(edgeCasesRef, { once: true, margin: "-80px" });
  const hitlRef = useRef(null);
  const hitlInView = useInView(hitlRef, { once: true, margin: "-80px" });

  useEffect(() => {
    fetch("https://api.github.com/repos/hivemindunit/inferface")
      .then((r) => r.json())
      .then((d) => setStars(d.stargazers_count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="px-6 pt-28 pb-20">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-6">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M6 0l1.76 3.57L12 4.16 8.82 7.07l.94 4.93L6 9.94 2.24 12l.94-4.93L0 4.16l4.24-.59z" />
              </svg>
              Zero runtime dependencies &middot; &lt;10KB gzipped
            </span>
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter text-foreground">
              inferface
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-lg">
              Ship streaming AI interfaces in minutes, not weeks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#demos"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Start Building <span aria-hidden="true">&rarr;</span>
              </a>
              <a
                href="https://github.com/hivemindunit/inferface"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border bg-muted px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <GitHubIcon className="h-4 w-4" />
                GitHub
                <span className="text-xs text-muted-foreground/60 ml-1">
                  {stars !== null ? `★ ${stars}` : "★ –"}
                </span>
              </a>
            </div>
          </motion.div>

          {/* Right column — animated chat preview */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <StreamingPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Install Command ─────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl">
          <CopyInstallButton />
        </div>
      </section>

      {/* ── Demo Cards ──────────────────────────────────────────── */}
      <section id="demos" className="px-6 pb-24 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">
            Explore the primitives
          </h2>
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_CARDS.map((card, index) => (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 20 }}
                animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <MotionLink
                  href={card.href}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="group flex flex-col rounded-2xl glow-card bg-card/50 p-6 h-full"
                >
                  <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 mb-2">
                    {card.hook}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {card.title}
                    <span
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    >
                      &rarr;
                    </span>
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground flex-1">
                    {card.description}
                  </p>
                  <div className="mt-4 rounded-lg bg-muted border border-border p-3 overflow-hidden">
                    <CodeSnippet
                      code={card.code}
                      lang="tsx"
                      className="text-[11px] leading-relaxed"
                    />
                  </div>
                </MotionLink>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HITL Section ────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight">
              Human-in-the-loop, first-class
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Most frameworks handle chat. inferface handles the moment the AI
              asks for permission.
            </p>
          </div>
          <div ref={hitlRef} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left — description */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={hitlInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1 text-emerald-500">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Pending tool calls surface as typed React components, not raw
                  JSON
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1 text-emerald-500">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Approve, reject, or modify — your UI, your rules
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1 text-emerald-500">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Nested tool calls and dependency chains handled automatically
                </li>
              </ul>
            </motion.div>

            {/* Right — mock approval card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={hitlInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
            <div className="rounded-xl border bg-card p-4 max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-mono text-foreground">
                  <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                  search_web
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Pending
                </span>
              </div>
              <div className="border-t border-border mb-3" />
              <div className="font-mono text-xs text-muted-foreground mb-4">
                <span className="text-muted-foreground/60">query:</span>{" "}
                &quot;React streaming patterns 2024&quot;
              </div>
              <div className="flex gap-2">
                <span className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white">
                  Approve
                </span>
                <span className="rounded-lg border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  Reject
                </span>
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Edge Cases ──────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">
            Built for when things get weird
          </h2>
          <div ref={edgeCasesRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EDGE_CASES.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={edgeCasesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-xl glow-card bg-card/50 p-5"
              >
                <div className="text-emerald-600 dark:text-emerald-400 mb-3">
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hooks API Reference ─────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-12">
            Hooks API
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Hook
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Key Returns
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {HOOKS_TABLE.map((hook) => (
                  <tr
                    key={hook.name}
                    className="group border-b border-border/50 last:border-0 border-l-2 border-l-transparent hover:border-l-emerald-500 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <code className="text-emerald-700 dark:text-emerald-400 text-xs font-mono">
                        {hook.name}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {hook.description}
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-muted-foreground text-xs font-mono">
                        {hook.returns}
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <ArrowIcon className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-semibold">inferface</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              0.0.1-alpha
            </span>
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
