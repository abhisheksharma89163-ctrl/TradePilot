import { OCR_PROMPT } from "../ocr/prompt";
import { AiError, RateLimitError, parseExtraction } from "../ocr/parse";
import type { ExtractionResult } from "../ocr/types";

export interface OpenAICompatOptions {
  name: string;
  baseUrl: string; // e.g. https://api.groq.com/openai/v1
  apiKey: string;
  model: string;
  /** Some hosts (OpenRouter) like an HTTP-Referer / X-Title header. */
  referer?: string;
}

/**
 * Works for any OpenAI-compatible vision endpoint (Groq, OpenRouter, etc.).
 * Sends the image as a data URL. Throws RateLimitError on HTTP 429.
 */
export async function extractOpenAICompatible(
  base64: string,
  mimeType: string,
  opts: OpenAICompatOptions
): Promise<ExtractionResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
  };
  if (opts.referer) {
    headers["HTTP-Referer"] = opts.referer;
    headers["X-Title"] = "BOS Trading ERP";
  }

  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (res.status === 429) throw new RateLimitError(`${opts.name} rate limit`);
  if (!res.ok) {
    throw new AiError(`${opts.name} error (${res.status}).`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiError(`${opts.name} returned an empty result.`);
  return parseExtraction(text);
}
