# inferface

> Composable GenAI UI components for React/Next.js — shadcn-compatible, hooks-included.

**Status:** 🚧 Early development — Phase 1

---

## What is this?

Most component libraries give you UI shells. `inferface` gives you functional primitives — hooks + components bundled together — so you can drop in a `<ChatThread />` and it *works*, not just looks good.

Built for AI-app developers who are tired of rebuilding the same patterns.

- ✅ shadcn/ui compatible
- ✅ Provider-agnostic (OpenAI, Anthropic, Gemini, local)
- ✅ Streaming-first
- ✅ TypeScript
- ✅ Tailwind CSS

---

## Packages

| Package | Description | Status |
|---|---|---|
| `@inferface/hooks` | Core engine: `useChat`, `useStream`, `useCompletion`, `useToolCalls` | 🚧 |
| `@inferface/components` | UI primitives: ChatThread, StreamingText, PromptInput, ToolCallCard, and more | 🚧 |

---

## Installation

```bash
# Coming soon via shadcn registry
npx shadcn add @inferface/chat-thread
```

---

## Roadmap

### Phase 1 — Free & Open Source
- [ ] `useStream()` hook
- [ ] `useChat()` hook
- [ ] `useCompletion()` hook
- [ ] `useToolCalls()` hook
- [ ] `<ChatThread />` component
- [ ] `<StreamingText />` component
- [ ] `<PromptInput />` component
- [ ] `<ToolCallCard />` component
- [ ] `<ThinkingIndicator />` component
- [ ] `<RAGSourceList />` component
- [ ] `<AgentStepTrace />` component
- [ ] `<TokenUsageBadge />` component
- [ ] Registry setup + demo site

---

## Contributing

Internal — not open for contributions yet.

---

## License

MIT (to be confirmed before public launch)
