import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-opus-4-6";

/**
 * Creates a streaming response from Anthropic for use in Next.js API routes.
 */
export function createStreamingResponse(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>
): Response {
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Creates a JSON-streaming response that emits newline-delimited JSON objects.
 * Useful for structured data (job listings, contacts, etc.)
 */
export function createJsonStreamingResponse(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>
): Response {
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            buffer += event.delta.text;
            // Try to flush complete JSON objects
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.trim()) {
                controller.enqueue(encoder.encode(line + "\n"));
              }
            }
          }
        }
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(buffer + "\n"));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}

export const SYSTEM_PROMPT = `You are Copilot, a premium AI recruiting assistant. You help job seekers navigate their entire job search journey with expert guidance, sharp analysis, and actionable insights.

Your tone is:
- Professional but warm — like a brilliant recruiter friend
- Concise and specific — no filler, no fluff
- Encouraging but honest — you tell users what they need to hear

You have deep expertise in:
- Tech industry hiring processes and expectations
- Resume writing, ATS optimization, and positioning
- Networking and outreach strategy
- Interview preparation and feedback
- Job market trends and salary benchmarks`;
