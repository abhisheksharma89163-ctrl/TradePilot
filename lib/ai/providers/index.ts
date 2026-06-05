import {
  AiError,
  RateLimitError,
  NotConfiguredError,
  sleep,
} from "../ocr/parse";
import type { ExtractionResult } from "../ocr/types";
import { extractGemini } from "./gemini";
import { extractOpenAICompatible } from "./openai-compatible";

interface Provider {
  name: string;
  run: (base64: string, mime: string) => Promise<ExtractionResult>;
}

/** Build the ordered list of providers that have keys configured. */
function getProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: "Gemini", run: extractGemini });
  }

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "Groq",
      run: (b, m) =>
        extractOpenAICompatible(b, m, {
          name: "Groq",
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: process.env.GROQ_API_KEY!,
          model:
            process.env.GROQ_MODEL ||
            "meta-llama/llama-4-scout-17b-16e-instruct",
        }),
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "OpenRouter",
      run: (b, m) =>
        extractOpenAICompatible(b, m, {
          name: "OpenRouter",
          baseUrl: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY!,
          model:
            process.env.OPENROUTER_MODEL ||
            "meta-llama/llama-3.2-11b-vision-instruct:free",
          referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        }),
    });
  }

  return providers;
}

/**
 * Try each configured provider in order. Within a provider, retry a couple
 * of times with backoff on rate limits before moving to the next provider.
 * This makes bulk uploads survive free-tier rate limits.
 */
export async function extractWithFallback(
  base64: string,
  mime: string
): Promise<ExtractionResult> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new NotConfiguredError(
      "AI is not configured yet. Add your GEMINI_API_KEY (and optionally GROQ_API_KEY / OPENROUTER_API_KEY) in the environment settings."
    );
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    const backoffs = [0, 2500, 5000]; // immediate, then waits before retry
    for (const wait of backoffs) {
      if (wait) await sleep(wait);
      try {
        return await provider.run(base64, mime);
      } catch (e) {
        lastError = e as Error;
        if (e instanceof RateLimitError) {
          // retry same provider after backoff
          continue;
        }
        // non-rate-limit error: stop retrying this provider, try next
        break;
      }
    }
    // exhausted this provider's retries — fall through to the next provider
  }

  if (lastError instanceof RateLimitError) {
    throw new RateLimitError(
      "All AI providers are busy right now. Wait ~30 seconds and click Read again, or add another free provider key (Groq / OpenRouter)."
    );
  }
  throw new AiError(lastError?.message ?? "AI processing failed.");
}
