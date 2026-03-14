/**
 * Mock "Generative UI" AI endpoint.
 * Streams text then emits an option-picker tool call.
 * On phase=after_tools, responds based on the user's selection.
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const body = await req.json();
  const phase = body.phase ?? "initial";
  const toolResults = body.toolResults ?? {};

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendDelta(text: string) {
        const chunk = JSON.stringify({
          id: "chatcmpl-genui-demo",
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }

      if (phase === "initial") {
        const intro =
          "Sure! To set up your assistant, I need to know how you'd like it to communicate. Choose the style that fits best.\n\n";
        for (const char of intro) {
          sendDelta(char);
          await sleep(15);
        }

        const toolCalls = [
          {
            id: "call_style_1",
            type: "function",
            function: {
              name: "option-picker",
              arguments: JSON.stringify({
                label: "Choose a response style",
                options: [
                  {
                    id: "concise",
                    label: "Concise",
                    description: "Short, direct answers. No preamble, no filler.",
                    badge: "fast",
                    badgeColor: "blue",
                  },
                  {
                    id: "balanced",
                    label: "Balanced",
                    description: "Clear explanations with just enough context.",
                    badge: "default",
                    badgeColor: "emerald",
                  },
                  {
                    id: "detailed",
                    label: "Detailed",
                    description: "Thorough responses with examples, caveats, and reasoning.",
                    badge: "thorough",
                    badgeColor: "purple",
                  },
                ],
              }),
            },
          },
        ];

        sendDelta(`[TOOL_CALLS]${JSON.stringify(toolCalls)}`);
      } else if (phase === "after_tools") {
        const styleResult = toolResults["call_style_1"];
        const selected =
          styleResult && typeof styleResult === "object" && "selected" in styleResult
            ? (styleResult as { selected: string }).selected
            : "balanced";

        const responses: Record<string, string[]> = {
          concise: [
            "Got it — **Concise** mode enabled.\n\n",
            "Your assistant will:\n",
            "- Skip preamble and filler\n",
            "- Lead with the answer\n",
            "- Use bullet points over paragraphs\n\n",
            "You can change this any time by asking to switch styles.\n",
          ],
          balanced: [
            "**Balanced** mode enabled.\n\n",
            "Your assistant will give clear, well-structured answers — enough context to be useful, not so much that it buries the point.\n\n",
            "This is the default for most workflows. Switch to Concise when speed matters, or Detailed when you need depth.\n",
          ],
          detailed: [
            "**Detailed** mode enabled.\n\n",
            "Your assistant will:\n",
            "- Explain reasoning, not just conclusions\n",
            "- Surface edge cases and tradeoffs\n",
            "- Include examples where helpful\n",
            "- Flag assumptions it's making\n\n",
            "Great for research, code review, or any task where you want full transparency. Switch to Balanced or Concise when you want faster responses.\n",
          ],
        };

        const lines = responses[selected] ?? responses["balanced"];
        for (const line of lines) {
          for (const char of line) {
            sendDelta(char);
            await sleep(10);
          }
        }
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
