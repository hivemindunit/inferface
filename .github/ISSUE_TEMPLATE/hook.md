---
name: "🔧 Hook: New hook spec"
about: Spec and track a new engine hook
title: "[Hook] "
labels: hook, phase-1
---

## Hook name
`useHookName()`

## Purpose
What state/side-effect does this manage?

## API sketch
```ts
const { ... } = useHookName(options)
```

## Provider compatibility
- [ ] OpenAI (SSE)
- [ ] Anthropic (SSE)
- [ ] Google Gemini
- [ ] Local / Ollama
- [ ] Generic fetch (custom)

## Acceptance criteria
- [ ] TypeScript types fully exported
- [ ] Abort/cleanup handled
- [ ] Error state handled
- [ ] Loading state handled
- [ ] Unit tests written
