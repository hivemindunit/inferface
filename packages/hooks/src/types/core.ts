// Core types for @inferface/hooks
// ---------------------------------------------------------------------------

/** Custom fetch-like transport function for streaming requests */
export type StreamTransport = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

/** Standard message roles in the chat interface */
export type MessageRole = "user" | "assistant" | "system" | "tool";

// ---------------------------------------------------------------------------
// Rich Content / Content Parts
// ---------------------------------------------------------------------------

/** Data shape for an embedded chart */
export interface ChartData {
  type: "bar" | "line" | "pie" | "scatter" | string;
  labels?: string[];
  datasets: {
    label?: string;
    data: number[];
    [key: string]: unknown;
  }[];
  options?: Record<string, unknown>;
}

/** Rich content part — supports text, images, charts, and custom components */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; alt?: string } }
  | { type: "chart"; data: ChartData }
  | { type: "custom"; component: string; props: unknown };

/** A single message in the chat history */
export interface Message {
  id: string;
  role: MessageRole;
  /**
   * String for plain-text messages; ContentPart[] for rich/multimodal content.
   * Hooks always return string during streaming accumulation.
   * Use `extractText(content)` to get a plain string in either case.
   */
  content: string | ContentPart[];
  createdAt?: Date;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/** An LLM-initiated tool/function call */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string — stream accumulates this
  };
}

/** Result of executing a tool call */
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: Error;
}

/** Supported LLM provider SSE formats */
export type ProviderFormat = "openai" | "anthropic" | "custom";

/**
 * Extract a plain text string from Message.content regardless of form.
 * Concatenates all `text` parts for ContentPart[] content.
 */
export function extractText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}
