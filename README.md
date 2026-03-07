# inferface

> Composable React primitives for streaming AI interfaces

[![npm version](https://img.shields.io/npm/v/@inferface/hooks?label=%40inferface%2Fhooks)](https://www.npmjs.com/package/@inferface/hooks)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-emerald.svg)](https://www.npmjs.com/package/@inferface/hooks)

Hooks for state. Components for UI. Zero lock-in. Ship AI features in minutes, not weeks.

**[Live Demo](https://inferface.dev)** · **[GitHub](https://github.com/hivemindunit/inferface)**

---

## Install

```bash
# Via shadcn registry (copy into your project)
npx shadcn add https://inferface.dev/registry/use-chat.json

# Or install the hooks package
pnpm add @inferface/hooks

# Optional: styled components
pnpm add @inferface/components
```

## Quick Start — 20 Lines

```tsx
import { useChat } from "@inferface/hooks";
import { ChatThread, PromptInput } from "@inferface/components";

export default function Chat() {
  const { messages, send, isLoading, abort, streamingContent, regenerate,
          appendMessage, updateMessage, deleteMessage, editAndResend } =
    useChat({
      api: "/api/chat",
      systemPrompt: "You are a helpful assistant.",
    });

  return (
    <div className="h-screen flex flex-col">
      <ChatThread
        chat={{ messages, send, isLoading, abort, streamingContent,
                regenerate, appendMessage, updateMessage, deleteMessage, editAndResend }}
        className="flex-1"
      />
      <PromptInput
        onSubmit={send}
        isLoading={isLoading}
        onStop={abort}
      />
    </div>
  );
}
```

That's it. Full ChatGPT-style interface with streaming, abort, regeneration, and error handling.

---

## Hooks API

| Hook | Signature | Key Options | Returns |
|------|-----------|-------------|---------|
| `useStream` | `useStream(options)` | `api`, `providerFormat`, `onChunk`, `onFinish` | `content`, `isStreaming`, `start`, `abort`, `reset` |
| `useCompletion` | `useCompletion(options)` | `api`, `providerFormat`, `onFinish` | `completion`, `complete`, `isLoading`, `abort`, `reset` |
| `useChat` | `useChat(options)` | `api`, `systemPrompt`, `body`, `storage` | `messages`, `send`, `isLoading`, `streamingContent`, `regenerate`, `clear` |
| `useToolCalls` | `useToolCalls(options)` | `stream`, `providerFormat`, `onToolCall` | `toolCalls`, `pendingCalls`, `resolveToolCall`, `rejectToolCall`, `isExecuting` |

All hooks are **provider-agnostic** — they work with OpenAI, Anthropic, or any SSE-compatible endpoint.

## Components

| Component | Key Props |
|-----------|-----------|
| `<StreamingText />` | `content`, `isStreaming`, `markdown`, `codeTheme`, `showCursor` |
| `<ChatThread />` | `chat` (useChat return) or `messages`/`isLoading`/`streamingContent`, `slots`, `classNames` |
| `<PromptInput />` | `onSubmit`, `isLoading`, `onStop`, `submitOn`, `models`, `contextSlot` |

---

## Zero Dependencies

`@inferface/hooks` has **zero runtime dependencies**. Less than 10KB gzipped. Just React.

No transitive deps to audit. No supply chain risk. No bloat.

---

## Contributing

```bash
# Clone and install
git clone https://github.com/hivemindunit/inferface.git
cd inferface
pnpm install

# Dev (all packages + demo)
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

Uses **Turborepo** + **pnpm workspaces**. Packages build with **tsup**, test with **Vitest**.

---

## License

MIT
