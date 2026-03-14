/**
 * Mock "Generative UI" AI endpoint.
 * Streams text then emits a material-picker tool call.
 * On phase=after_tools, responds with a recommendation based on the user's selection.
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
          "I'd love to help you pick the perfect flooring! Let me show you some options based on your room.\n\n";
        for (const char of intro) {
          sendDelta(char);
          await sleep(15);
        }

        // Emit a material-picker tool call
        const toolCalls = [
          {
            id: "call_material_1",
            type: "function",
            function: {
              name: "material-picker",
              arguments: JSON.stringify({
                label: "Choose your flooring grade",
                category: "flooring",
                options: [
                  {
                    grade: "economy",
                    label: "Laminate",
                    description: "Durable and budget-friendly. Great for high-traffic areas.",
                    priceHint: "$2–$5 / sq ft",
                  },
                  {
                    grade: "mid-range",
                    label: "Engineered Hardwood",
                    description: "Real wood veneer over plywood. Looks great, handles moisture better than solid.",
                    priceHint: "$6–$12 / sq ft",
                  },
                  {
                    grade: "luxury",
                    label: "Solid Hardwood",
                    description: "Timeless beauty. White oak or walnut, sanded and refinished for decades.",
                    priceHint: "$12–$25 / sq ft",
                  },
                ],
              }),
            },
          },
        ];

        sendDelta(`[TOOL_CALLS]${JSON.stringify(toolCalls)}`);
      } else if (phase === "after_tools") {
        const materialResult = toolResults["call_material_1"];

        let grade = "mid-range";
        if (materialResult && typeof materialResult === "object" && "grade" in materialResult) {
          grade = (materialResult as { grade: string }).grade;
        }

        const recommendations: Record<string, string[]> = {
          economy: [
            "## Great Choice — Laminate Flooring! 🏠\n\n",
            "Here's what I'd recommend for your space:\n\n",
            "- **Pergo TimberCraft** — waterproof laminate, realistic wood look — ~$3.50/sq ft\n",
            "- **Shaw Repel** — scratch-resistant, perfect with pets — ~$2.80/sq ft\n",
            "- **Mohawk RevWood** — eco-friendly option with 30-year warranty — ~$4.20/sq ft\n\n",
            "**Pro tip:** Budget ~$500–$1,200 for a 200 sq ft room including installation.\n",
          ],
          "mid-range": [
            "## Excellent Pick — Engineered Hardwood! 🌳\n\n",
            "For your room, I'd suggest:\n\n",
            "- **Shaw Floorté Pantheon** — wide plank, white oak look — ~$8/sq ft\n",
            "- **Mohawk UltraWood** — hickory, hand-scraped finish — ~$9.50/sq ft\n",
            "- **Bruce Hydropel** — waterproof engineered oak — ~$7/sq ft\n\n",
            "**Pro tip:** Budget ~$1,800–$3,500 for a 200 sq ft room including installation.\n",
          ],
          luxury: [
            "## Beautiful Selection — Solid Hardwood! ✨\n\n",
            "Premium options for your space:\n\n",
            "- **Carlisle Wide Plank White Oak** — custom widths, stunning grain — ~$15/sq ft\n",
            "- **Mirage Sweet Memories Walnut** — rich, warm tones — ~$18/sq ft\n",
            "- **Lauzon Designer Collection** — FSC certified, pure genius finish — ~$14/sq ft\n\n",
            "**Pro tip:** Budget ~$3,500–$6,000 for a 200 sq ft room including professional installation.\n",
          ],
        };

        const lines = recommendations[grade] ?? recommendations["mid-range"];

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
