/**
 * Mock "Travel Planner" AI endpoint.
 * Returns an SSE stream that includes tool call events in OpenAI-ish format.
 *
 * The tool calls are embedded as a [TOOL_CALLS] JSON block in the text stream
 * so `useToolCalls` can parse them from the accumulated content string.
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const body = await req.json();
  const phase = body.phase ?? "initial"; // "initial" | "after_tools"
  const toolResults = body.toolResults ?? {};

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendDelta(text: string) {
        const chunk = JSON.stringify({
          id: "chatcmpl-tools-demo",
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }

      if (phase === "initial") {
        // Stream some text first
        const intro = "Great! Let me help you plan your trip from Toronto to Paris in June. I'll need to check a few things...\n\n";
        for (const char of intro) {
          sendDelta(char);
          await sleep(15);
        }

        // Now emit tool calls as a [TOOL_CALLS] block
        const toolCalls = [
          {
            id: "call_flights_1",
            type: "function",
            function: {
              name: "search_flights",
              arguments: JSON.stringify({
                origin: "YYZ",
                destination: "CDG",
                date: "2026-06-15",
              }),
            },
          },
          {
            id: "call_weather_1",
            type: "function",
            function: {
              name: "get_weather",
              arguments: JSON.stringify({
                city: "Paris",
              }),
            },
          },
        ];

        sendDelta(`[TOOL_CALLS]${JSON.stringify(toolCalls)}`);
      } else if (phase === "after_tools") {
        // Generate a response based on tool results
        const flightResult = toolResults["call_flights_1"];
        const weatherResult = toolResults["call_weather_1"];

        const lines = [
          "## Your Toronto → Paris Trip Plan 🇫🇷\n\n",
        ];

        if (flightResult) {
          lines.push(
            `### ✈️ Flights\n`,
            `I found great options for you:\n\n`,
            `- **Air Canada AC870** — Departs June 15 at 7:30 PM, arrives June 16 at 8:45 AM — **$847 CAD** round trip\n`,
            `- **Air France AF357** — Departs June 15 at 9:15 PM, arrives June 16 at 10:30 AM — **$923 CAD** round trip\n\n`,
          );
        } else {
          lines.push("### ✈️ Flights\n_Flight search was declined._\n\n");
        }

        if (weatherResult) {
          lines.push(
            `### 🌤️ Weather in Paris (June)\n`,
            `Expect pleasant weather:\n`,
            `- **Average high:** 23°C (73°F)\n`,
            `- **Average low:** 14°C (57°F)\n`,
            `- **Rainfall:** Light showers possible — pack a light jacket\n\n`,
          );
        } else {
          lines.push("### 🌤️ Weather\n_Weather check was declined._\n\n");
        }

        lines.push(
          "### 💡 Tips\n",
          "- Book flights 6-8 weeks ahead for best prices\n",
          "- The Fête de la Musique on June 21 is not to be missed!\n",
          "- Consider the Museum Pass for unlimited access to 50+ museums\n",
        );

        for (const line of lines) {
          for (const char of line) {
            sendDelta(char);
            await sleep(10);
          }
        }
      }

      // End stream
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
