# @inferface/components

React components for streaming AI interfaces. Built on top of `@inferface/hooks`.

## Install

```bash
pnpm add @inferface/components
# or
npm install @inferface/components
```

## Components

- `<StreamingText />` — streaming markdown renderer with syntax highlighting and animated cursor
- `<ChatThread />` — full chat UI with smart auto-scroll, copy, regenerate, edit-in-place
- `<PromptInput />` — auto-resizing textarea with token estimator and model selector

## Quick start

```tsx
import { ChatThread } from "@inferface/components";
import { useChat } from "@inferface/hooks";

function App() {
  const chat = useChat({ api: "/api/chat" });
  return <ChatThread chat={chat} />;
}
```

## Documentation

Full docs and live demos at [inferface.dev](https://inferface.dev)

## License

MIT
