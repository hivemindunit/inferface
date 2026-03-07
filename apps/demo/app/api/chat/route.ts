import { NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * Proxy to OpenAI chat completions (streaming). If OPENAI_API_KEY is missing,
 * returns a canned mock SSE stream that simulates a realistic chat response.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    [key: string]: unknown;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  const incomingMessages = body.messages ?? [];

  if (apiKey) {
    // Real OpenAI proxy
    const messages = [...incomingMessages];
    // If systemPrompt is provided at top level and not already in messages
    if (
      body.systemPrompt &&
      !messages.some((m) => m.role === "system")
    ) {
      messages.unshift({ role: "system", content: body.systemPrompt });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages,
      }),
    });

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Mock SSE stream — no API key needed
  const lastUserMessage =
    [...incomingMessages].reverse().find((m) => m.role === "user")?.content ??
    "Hello";
  const mockResponse = getMockResponse(lastUserMessage);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const tokens = mockResponse.split(/(\s+)/);
      for (const token of tokens) {
        const chunk = JSON.stringify({
          id: "mock-chat",
          choices: [
            { index: 0, delta: { content: token }, finish_reason: null },
          ],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hey there! 👋 I'm the inferface demo assistant. I'm running on a mock SSE stream right now — no API key configured — but the streaming behavior is 100% real.\n\nTry asking me something like:\n- \"What's inferface?\"\n- \"How does useChat work?\"\n- \"Write a code example\"";
  }

  if (lower.includes("inferface") || lower.includes("what is") || lower.includes("what's")) {
    return "**inferface** is a composable GenAI UI library for React and Next.js.\n\nThe philosophy: **hooks are the engine, components are the skin.**\n\n### What you get:\n\n- `useChat` — Full conversational state management with streaming\n- `useCompletion` — Single-turn text completion\n- `useStream` — Low-level SSE streaming primitive\n- `<ChatThread />` — Drop-in chat UI component\n- `<StreamingText />` — Live markdown renderer\n- `<PromptInput />` — Smart textarea with submit handling\n\n### The pitch:\n\nA ChatGPT-style interface in ~20 lines of code. Zero dependencies in the hooks package. Works with OpenAI, Anthropic, or any SSE-compatible endpoint.\n\n```tsx\nconst { messages, send, isLoading } = useChat({\n  api: \"/api/chat\",\n});\n```\n\nThat's it. You're streaming.";
  }

  if (lower.includes("code") || lower.includes("example") || lower.includes("how")) {
    return "Here's how `useChat` works under the hood:\n\n```typescript\n// 1. Send a message\nawait send(\"Hello!\");\n\n// What happens:\n// → User message optimistically added to messages[]\n// → POST to your API endpoint with full message history\n// → SSE stream parsed in real-time\n// → streamingContent updates on every token\n// → On finish: assistant message committed to messages[]\n```\n\n### Key features:\n\n- **Optimistic updates** — user message appears instantly\n- **Automatic rollback** — if the request fails, the user message is removed\n- **Abort support** — `abort()` cancels mid-stream\n- **Regenerate** — `regenerate()` retries the last assistant response\n- **Storage adapters** — plug in localStorage, IndexedDB, whatever\n\n```tsx\nconst { messages, send, abort, regenerate, clear } = useChat({\n  api: \"/api/chat\",\n  systemPrompt: \"You are helpful.\",\n  onFinish: (msg) => console.log(\"Done:\", msg.content),\n});\n```\n\nThe hook manages all the streaming complexity so you don't have to.";
  }

  return `That's a great question! Here's what I think:\n\nWhile I'm running in mock mode (no \`OPENAI_API_KEY\` configured), I can still demonstrate the full streaming experience. Every token you see arrives via Server-Sent Events, just like a real AI response.\n\n**Your message was:** "${input}"\n\nTo connect to a real AI model, add \`OPENAI_API_KEY\` to your \`.env.local\` file. The \`useChat\` hook handles everything — SSE parsing, state management, error recovery, and abort control.\n\nPretty neat for ~20 lines of code, right? 🚀`;
}
