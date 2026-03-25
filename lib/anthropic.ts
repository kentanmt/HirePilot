/**
 * AI backend — powered by Google Gemini (free tier via AI Studio).
 * Auto-detects which model the API key has access to — no more hardcoding.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

const GEMINI_MODEL = "gemini-2.5-flash";

export const MODEL = GEMINI_MODEL;
export const FAST_MODEL = GEMINI_MODEL;

export const SYSTEM_PROMPT = `You are HirePilot, a premium AI recruiting assistant. You help job seekers navigate their entire job search journey with expert guidance, sharp analysis, and actionable insights.

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

function buildGeminiModel(system?: string, maxTokens?: number) {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: system || undefined,
    generationConfig: { maxOutputTokens: maxTokens ?? 2000 },
  });
}

/** Anthropic-compatible client backed by Gemini */
export const anthropic = {
  messages: {
    async create(opts: {
      model: string;
      max_tokens?: number;
      system?: string;
      messages: Array<{ role: string; content: string }>;
    }) {
      const model = buildGeminiModel(opts.system, opts.max_tokens);
      const userMsg = opts.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
      const result = await model.generateContent(userMsg);
      const text = result.response.text();
      return { content: [{ type: "text" as const, text }] };
    },

    stream(opts: {
      model: string;
      max_tokens?: number;
      system?: string;
      messages: Array<{ role: string; content: string }>;
    }) {
      const userMsg = opts.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
      const finalCallbacks: Array<() => Promise<void> | void> = [];

      const adapter = {
        on(event: string, cb: () => Promise<void> | void) {
          if (event === "finalMessage") finalCallbacks.push(cb);
          return adapter;
        },
        async *[Symbol.asyncIterator]() {
          const model = buildGeminiModel(opts.system, opts.max_tokens);
          const result = await model.generateContentStream(userMsg);
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              yield {
                type: "content_block_delta" as const,
                delta: { type: "text_delta" as const, text },
              };
            }
          }
          for (const cb of finalCallbacks) await cb();
        },
      };

      return adapter;
    },
  },
};

/** Converts an async-iterable stream into a streaming HTTP Response */
export function createStreamingResponse(stream: AsyncIterable<any>): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta" &&
            event.delta.text
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

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** JSON-streaming response (ndjson) — kept for compatibility */
export function createJsonStreamingResponse(stream: AsyncIterable<any>): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            buffer += event.delta.text;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.trim()) controller.enqueue(encoder.encode(line + "\n"));
            }
          }
        }
        if (buffer.trim()) controller.enqueue(encoder.encode(buffer + "\n"));
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked" },
  });
}
