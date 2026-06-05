import {
  AiError,
  RateLimitError,
  NotConfiguredError,
  sleep,
} from "../ocr/parse";
import type { ExtractionResult } from "../ocr/types";
import { extractGemini, extractGeminiText } from "./gemini";
import {
  extractOpenAICompatible,
  extractOpenAICompatibleText,
  type OpenAICompatOptions,
} from "./openai-compatible";

interface Provider {
  name: string;
  image: (base64: string, mime: string) => Promise<ExtractionResult>;
  text: (pasted: string) => Promise<ExtractionResult[]>;
}

function groqOpts(): OpenAICompatOptions {
  return {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
  };
}

function openRouterOpts(): OpenAICompatOptions {
  return {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    model:
      process.env.OPENROUTER_MODEL ||
      "meta-llama/llama-3.2-11b-vision-instruct:free",
    referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

/** Ordered list of providers that have keys configured. */
function getProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "Gemini",
      image: extractGemini,
      text: extractGeminiText,
    });
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "Groq",
      image: (b, m) => extractOpenAICompatible(b, m, groqOpts()),
      text: (t) => extractOpenAICompatibleText(t, groqOpts()),
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "OpenRouter",
      image: (b, m) => extractOpenAICompatible(b, m, openRouterOpts()),
      text: (t) => extractOpenAICompatibleText(t, openRouterOpts()),
    });
  }

  return providers;
}

/**
 * Run a per-provider operation across the provider chain, retrying on
 * rate limits with backoff before falling back to the next provider.
 */
async function runWithFallback<T>(
  pick: (p: Provider) => Promise<T>
): Promise<T> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new NotConfiguredError(
      "AI is not configured yet. Add your GEMINI_API_KEY (and optionally GROQ_API_KEY / OPENROUTER_API_KEY) in the environment settings."
    );
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    const backoffs = [0, 2500, 5000];
    for (const wait of backoffs) {
      if (wait) await sleep(wait);
      try {
        return await pick(provider);
      } catch (e) {
        lastError = e as Error;
        if (e instanceof RateLimitError) continue; // retry same provider
        break; // try next provider
      }
    }
  }

  if (lastError instanceof RateLimitError) {
    throw new RateLimitError(
      "All AI providers are busy right now. Wait ~30 seconds and try again, or add another free provider key (Groq / OpenRouter)."
    );
  }
  throw new AiError(lastError?.message ?? "AI processing failed.");
}

export function extractWithFallback(
  base64: string,
  mime: string
): Promise<ExtractionResult> {
  return runWithFallback((p) => p.image(base64, mime));
}

export function extractTextWithFallback(
  pasted: string
): Promise<ExtractionResult[]> {
  return runWithFallback((p) => p.text(pasted));
}
