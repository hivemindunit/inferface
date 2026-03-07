/**
 * Parse OpenAI SSE chunk.
 * Format: data: {"choices":[{"delta":{"content":"hello"},...}]}
 * Sentinel: data: [DONE]
 */
export function parseOpenAIChunk(raw: string): string | null {
  if (raw === "[DONE]") return null;
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Parse Anthropic SSE chunk.
 * Requires the event type from the preceding `event:` line.
 */
export function parseAnthropicChunk(raw: string, eventType?: string): string | null {
  if (eventType === "message_stop" || eventType === "message_delta") return null;
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
      return parsed.delta.text ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a raw SSE stream body into text deltas.
 * Handles both OpenAI and Anthropic formats.
 */
export function* parseSSEStream(
  chunk: string,
  format: "openai" | "anthropic" | "custom"
): Generator<string> {
  const lines = chunk.split("\n");
  let currentEvent: string | undefined;

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      const data = line.slice(5).trim();
      if (!data) continue;

      let text: string | null = null;
      if (format === "openai") {
        text = parseOpenAIChunk(data);
      } else if (format === "anthropic") {
        text = parseAnthropicChunk(data, currentEvent);
      }

      if (text !== null) {
        yield text;
      }
      currentEvent = undefined;
    }
  }
}
