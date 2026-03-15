# inferface Server Contract

## Request format

useChat sends POST requests with body:

```json
{
  "messages": [],
  "tools": [],
  "...body": "any extra body params from UseChatOptions.body"
}
```

### Fields

- `messages` — full conversation history including tool messages (see below)
- `tools` — tool definitions from `UseChatOptions.tools` (omitted if not configured)
- All additional fields from `UseChatOptions.body` are spread into the top level

## Message roles in history

- `role: "user"` — user message, `content: string | ContentPart[]`
- `role: "assistant"` — assistant reply, `content: string`, `toolCalls?: ToolCall[]`
- `role: "tool"` — tool result, `content: string` (JSON-stringified), `toolCallId: string`
- `role: "system"` — system prompt (prepended by the hook if `systemPrompt` is set)

## Tool call flow

1. Assistant message arrives with `toolCalls[]` (parsed from `[TOOL_CALLS]` marker in stream)
2. Client resolves tool calls (user interaction via generative UI, or auto-execute via `onToolCall`)
3. Client calls `submitToolResults({ [toolCallId]: result })`
4. Tool result messages (`role: "tool"`) are appended to history after the assistant message
5. If `autoSubmitToolResults` is enabled, a follow-up completion is triggered with full history
6. Server receives history including tool messages and continues the conversation

## Converting to OpenAI format (server-side)

The messages array sent by inferface uses a slightly different shape than the raw OpenAI API.
Convert as follows:

```js
messages.map(m => {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  }
  if (m.role === "assistant" && m.toolCalls) {
    return {
      role: "assistant",
      content: m.content,
      tool_calls: m.toolCalls.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
    };
  }
  return { role: m.role, content: m.content };
})
```

## Vision (multimodal)

User messages may have `content: ContentPart[]` when file attachments are present.
This happens when `chat.send(text, [file1, file2])` is called with File objects.

The content array will include:
- `{ type: "text", text: "..." }` — the text portion
- `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }` — base64-encoded images

Convert to OpenAI format by passing the content array directly:

```json
{ "role": "user", "content": [
  { "type": "text", "text": "Describe this image" },
  { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
]}
```

## Per-request body

`send(content, attachments?, requestBody?)` accepts an optional `requestBody` parameter.
When provided, it is shallow-merged with the base `body` (requestBody wins on conflicts)
for that single request only. This is useful for sending extra context with specific messages
(e.g., an image reference for the first message only).

The base body can also be updated reactively via `chat.setBody(newBody)`.

## SSE streaming format

The server should respond with `Content-Type: text/event-stream`.

### OpenAI format (default)
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

### Tool calls in stream

Client-side tool calls should be emitted as a `[TOOL_CALLS]` marker followed by a JSON array
within the streamed text content:

```
data: {"choices":[{"delta":{"content":"Let me search for that.\n[TOOL_CALLS][{\"id\":\"call_1\",\"type\":\"function\",\"function\":{\"name\":\"search\",\"arguments\":\"{\\\"q\\\":\\\"test\\\"}\"}}]"}}]}
```

The client will:
1. Split the content at `[TOOL_CALLS]`
2. Store the text before the marker as the visible `content`
3. Parse the JSON after the marker and store as `toolCalls` on the message
