# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-alpha.1] — 2026-03-07

### Added

#### `@inferface/hooks`
- `useStream` — low-level SSE and ReadableStream hook with abort, reset, error state
- `useCompletion` — single-turn streaming text completion; supports OpenAI, Anthropic, and custom SSE formats
- `useChat` — full conversational state with optimistic UI, `regenerate()`, `editAndResend()`, `deleteMessage()`, `appendMessage()`, storage adapter support, concurrent abort
- `useToolCalls` — human-in-the-loop tool call parsing and approval flow with depth tracking and dependency chain support
- `ContentPart` model for rich message content (text, charts, images, custom components)
- `extractText()` utility for backwards-compatible text extraction from messages
- Zero runtime dependencies

#### `@inferface/components`
- `<StreamingText />` — streaming markdown renderer with shiki syntax highlighting (dual light/dark theme), inline code detection, animated cursor
- `<ChatThread />` — full chat UI with smart auto-scroll, copy button, regenerate, edit-in-place, both hook-wired and headless modes
- `<PromptInput />` — auto-resizing textarea with token estimator, model selector, `contextSlot` for persistent structured context

#### Demo site
- Live demos for all three primitives
- shadcn-compatible registry at `/registry/`
- Dark/light theme toggle

### Technical
- Turborepo monorepo with `@inferface/hooks`, `@inferface/components`, `apps/demo`
- 97.9% line coverage on hooks, 72.2% on components
- Hooks bundle: 3.8KB gzipped
- Components bundle: 6.6KB gzipped (shiki is a peer/external dep)
