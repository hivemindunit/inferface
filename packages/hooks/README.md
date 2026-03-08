# @inferface/hooks

Headless React hooks for streaming AI interfaces. Zero runtime dependencies.

## Install

```bash
pnpm add @inferface/hooks
# or
npm install @inferface/hooks
```

## Hooks

- `useStream` — low-level SSE/ReadableStream primitive
- `useCompletion` — single-turn text completion with streaming
- `useChat` — full conversational state with optimistic UI
- `useToolCalls` — human-in-the-loop tool call approval flows

## Quick start

```tsx
import { useChat } from "@inferface/hooks";

function Chat() {
  const { messages, send, isLoading } = useChat({ api: "/api/chat" });
  return (
    <div>
      {messages.map(m => <p key={m.id}>{m.content as string}</p>)}
      <button onClick={() => send("Hello")} disabled={isLoading}>Send</button>
    </div>
  );
}
```

## Documentation

Full docs and live demos at [inferface.dev](https://inferface.dev)

## License

MIT
