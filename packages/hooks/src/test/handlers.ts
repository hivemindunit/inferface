import { http, HttpResponse } from "msw";

/**
 * Helper: encode a series of SSE lines into a ReadableStream body.
 */
function sseStream(lines: string[], delayMs = 0): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
        controller.enqueue(encoder.encode(line + "\n"));
      }
      controller.close();
    },
  });
}

/**
 * Build OpenAI-format SSE lines for the given text tokens.
 */
export function openAISSELines(tokens: string[]): string[] {
  const lines: string[] = [];
  for (const token of tokens) {
    lines.push(
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
      })}`
    );
    lines.push("");
  }
  lines.push("data: [DONE]");
  lines.push("");
  return lines;
}

/**
 * Build Anthropic-format SSE lines for the given text tokens.
 */
export function anthropicSSELines(tokens: string[]): string[] {
  const lines: string[] = [];
  // message_start
  lines.push("event: message_start");
  lines.push(
    `data: ${JSON.stringify({
      type: "message_start",
      message: { id: "msg_test", role: "assistant" },
    })}`
  );
  lines.push("");
  // content_block_start
  lines.push("event: content_block_start");
  lines.push(
    `data: ${JSON.stringify({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    })}`
  );
  lines.push("");
  // content deltas
  for (const token of tokens) {
    lines.push("event: content_block_delta");
    lines.push(
      `data: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: token },
      })}`
    );
    lines.push("");
  }
  // message_delta + message_stop
  lines.push("event: message_delta");
  lines.push(
    `data: ${JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
    })}`
  );
  lines.push("");
  lines.push("event: message_stop");
  lines.push(`data: ${JSON.stringify({ type: "message_stop" })}`);
  lines.push("");
  return lines;
}

export const handlers = [
  // OpenAI-format streaming endpoint
  http.post("https://test.api/openai/stream", () => {
    const tokens = ["Hello", " ", "world", "!"];
    return new HttpResponse(sseStream(openAISSELines(tokens)), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),

  // Anthropic-format streaming endpoint
  http.post("https://test.api/anthropic/stream", () => {
    const tokens = ["Hello", " ", "world", "!"];
    return new HttpResponse(sseStream(anthropicSSELines(tokens)), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),

  // Error endpoint
  http.post("https://test.api/error", () => {
    return HttpResponse.json(
      { error: { message: "Internal Server Error" } },
      { status: 500 }
    );
  }),

  // Slow stream (for abort testing) — sends tokens with delay
  http.post("https://test.api/slow", () => {
    const tokens = ["Slow", " ", "response", "..."];
    return new HttpResponse(sseStream(openAISSELines(tokens), 100), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),

  // Non-streaming JSON endpoint (for useCompletion non-SSE fallback)
  http.post("https://test.api/json-complete", () => {
    return HttpResponse.json(
      {
        choices: [{ message: { content: "Hello from JSON!" } }],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
];
