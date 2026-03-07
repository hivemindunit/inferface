// Public API for @inferface/hooks
// ---------------------------------------------------------------------------

// Types
export type {
  StreamTransport,
  MessageRole,
  ChartData,
  ContentPart,
  Message,
  ToolCall,
  ToolResult,
  ProviderFormat,
} from "./types/core";

// Utilities
export { extractText } from "./types/core";
export { parseSSEStream, parseOpenAIChunk, parseAnthropicChunk } from "./utils/parseSSE";

// Hooks
export { useStream } from "./hooks/useStream";
export type { UseStreamOptions, UseStreamReturn } from "./hooks/useStream";

export { useCompletion } from "./hooks/useCompletion";
export type { UseCompletionOptions, UseCompletionReturn } from "./hooks/useCompletion";

export { useChat } from "./hooks/useChat";
export type { UseChatOptions, UseChatReturn } from "./hooks/useChat";

export { useToolCalls } from "./hooks/useToolCalls";
export type { UseToolCallsOptions, UseToolCallsReturn } from "./hooks/useToolCalls";
