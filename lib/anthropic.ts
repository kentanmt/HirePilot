/**
 * AI backend — powered by Google Gemini (free tier via AI Studio).
 * Auto-detects which model the API key has access to — no more hardcoding.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

// Preferred models in order — first available one wins
const PREFERRED_MODELS = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash",
  "gemini-pro",
];

let resolvedModel: string | null = null;

async function getModel(): Promise<string> {
  if (resolvedModel) return resolvedModel;

  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return PREFERRED_MODELS[0];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
    );
    const data = await res.json();
    const available: string[] = (data.models ?? [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => (m.name as string).replace("models/", ""));

    for (const preferred of PREFERRED_MODELS) {
      if (available.includes(preferred)) {
        resolvedModel = preferred;
        console.log("[AI] Using model:", resolvedModel);
        return resolvedModel;
      }
    }

    // Fallback: use whatever is available
    if (available.length > 0) {
      resolvedModel = available[0];
      console.log("[AI] Fallback model:", resolvedModel);
      return resolvedModel;
    }
  } catch (err) {
    console.error("[AI] Could not fetch model list:", err);
  }

  resolvedModel = PREFERRED_MODELS[0];
  return resolvedModel;
}

export const MODEL = "auto";
export const FAST_MODEL = "auto";

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

async function buildGeminiModel(system?: string, maxTokens?: number) {
  const modelName = await getModel();
  return genAI.getGenerativeModel({
    model: modelName,
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
      const model = await buildGeminiModel(opts.system, opts.max_tokens);
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
          const model = await buildGeminiModel(opts.system, opts.max_tokens);
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
