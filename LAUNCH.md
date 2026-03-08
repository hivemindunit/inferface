# Launch Copy

## X / Twitter thread

**Tweet 1 (main)**
Shipping inferface — headless React primitives for streaming AI interfaces.

useStream · useCompletion · useChat · useToolCalls

Zero runtime dependencies. Works with OpenAI, Anthropic, or any SSE backend.

→ inferface.dev

**Tweet 2**
The primitives you keep rewriting in every AI project:

```tsx
const { messages, send, isLoading } = useChat({
  api: "/api/chat"
});
```

State, streaming, optimistic updates, abort — handled.

**Tweet 3**
My favorite part: useToolCalls.

When your AI wants to run code, search the web, or call an API — you decide what gets approved.

Human-in-the-loop as a first-class primitive.

**Tweet 4**
3.8KB gzipped. No deps. shadcn-compatible registry.

npx shadcn add https://inferface.dev/registry/use-chat

GitHub: github.com/hivemindunit/inferface

---

## Hacker News — Show HN

**Title:** Show HN: inferface – headless React hooks for streaming AI interfaces (zero deps)

**Body:**
I built inferface because I kept copy-pasting the same streaming state management code into every AI project.

It's four hooks:
- useStream — raw SSE/ReadableStream with abort
- useCompletion — single-turn streaming (like useCompletion from ai-sdk, but ~3KB)
- useChat — full chat state: optimistic UI, regenerate, edit-in-place, storage adapters
- useToolCalls — human-in-the-loop approval flows for tool calls

Zero runtime dependencies. The entire hooks package is 3.8KB gzipped.

There are also three React components (StreamingText, ChatThread, PromptInput) if you want a head start on the UI.

Works with OpenAI, Anthropic, or any backend that returns SSE. shadcn-compatible registry for copy-paste installation.

Demo: inferface.dev
GitHub: github.com/hivemindunit/inferface

---

## Reddit — r/reactjs

**Title:** I built headless React hooks for streaming AI interfaces — zero dependencies, 3.8KB

**Body:**
[same content as HN body, slightly more casual tone]
