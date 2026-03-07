import { NextResponse } from "next/server";

/**
 * POST /api/complete
 *
 * Proxy to OpenAI completions. If OPENAI_API_KEY is missing,
 * returns a mock SSE stream with a canned response.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { prompt?: string; [key: string]: unknown };
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    // Real OpenAI proxy
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: "You are a helpful assistant. Be concise." },
          { role: "user", content: body.prompt ?? "Hello" },
        ],
      }),
    });

    // Forward the SSE stream
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Mock SSE stream — no API key needed
  const mockResponse = getMockResponse(body.prompt ?? "");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const tokens = mockResponse.split(/(\s+)/);
      for (const token of tokens) {
        const chunk = JSON.stringify({
          id: "mock",
          choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        await new Promise((r) => setTimeout(r, 30));
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

function getMockResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("async") || lower.includes("await")) {
    return `## Async/Await Explained

\`async/await\` is syntactic sugar over Promises that makes asynchronous code read like synchronous code.

### Basic Example

\`\`\`typescript
async function fetchUser(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  const user = await response.json();
  return user;
}
\`\`\`

### Key Points

- \`async\` functions always return a Promise
- \`await\` pauses execution until the Promise resolves
- Use \`try/catch\` for error handling
- You can \`await\` multiple promises with \`Promise.all()\`

\`\`\`typescript
async function loadDashboard() {
  try {
    const [user, posts, notifications] = await Promise.all([
      fetchUser("123"),
      fetchPosts("123"),
      fetchNotifications("123"),
    ]);
    return { user, posts, notifications };
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    throw error;
  }
}
\`\`\`

The main advantage: your code reads top-to-bottom instead of nesting \`.then()\` callbacks.`;
  }

  if (lower.includes("state management") || lower.includes("react state")) {
    return `## React State Management Options

| Approach | Best For | Complexity |
|----------|----------|------------|
| useState | Local component state | Low |
| useReducer | Complex state logic | Medium |
| Context API | Shared state (small apps) | Medium |
| Zustand | Global state (any size) | Low |
| Jotai | Atomic state | Low |
| Redux Toolkit | Large enterprise apps | High |

### Quick Recommendations

- **Start simple**: \`useState\` + \`useReducer\` cover 80% of cases
- **Need global state?** Try Zustand — minimal boilerplate, great DX
- **Lots of derived state?** Jotai's atomic model shines here
- **Enterprise team?** Redux Toolkit has the best tooling and patterns

\`\`\`typescript
// Zustand example — this is all you need
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
\`\`\``;
  }

  return `This is a mock response from the inferface demo API.

Since no \`OPENAI_API_KEY\` is configured, you're seeing a canned response. The streaming behavior is real — tokens arrive one at a time via Server-Sent Events.

To use a real AI model, set \`OPENAI_API_KEY\` in your \`.env.local\` file.

**Prompt received:** "${prompt}"`;
}
