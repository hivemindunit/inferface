/**
 * Test helpers — build mock fetch responses for SSE streams.
 * Uses vi.fn() to mock globalThis.fetch directly (avoids jsdom AbortSignal issues with MSW).
 */

/**
 * Encode tokens into an OpenAI-format SSE ReadableStream.
 */
export function openAIStream(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const token of tokens) {
        const chunk = JSON.stringify({
          id: "chatcmpl-test",
          choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/**
 * Encode tokens into an Anthropic-format SSE ReadableStream.
 */
export function anthropicStream(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const token of tokens) {
        const event = "event: content_block_delta\n";
        const data = `data: ${JSON.stringify({
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: token },
        })}\n\n`;
        controller.enqueue(encoder.encode(event + data));
      }
      controller.enqueue(
        encoder.encode(
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`
        )
      );
      controller.close();
    },
  });
}

/**
 * Build a mock Response object for SSE streaming.
 */
export function mockSSEResponse(
  body: ReadableStream<Uint8Array>
): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/**
 * Build a mock error Response.
 */
export function mockErrorResponse(
  status: number,
  message: string
): Response {
  return new Response(
    JSON.stringify({ error: { message } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Build a mock JSON (non-streaming) response.
 */
export function mockJSONResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Build a slow SSE stream that yields tokens with delays (for abort testing).
 */
export function slowOpenAIStream(
  tokens: string[],
  delayMs: number
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        await new Promise((r) => setTimeout(r, delayMs));
        const chunk = JSON.stringify({
          id: "chatcmpl-test",
          choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
