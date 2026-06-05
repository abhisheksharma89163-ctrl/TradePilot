import "server-only";
import { extractWithFallback, extractTextWithFallback } from "./providers";
import { AiError } from "./ocr/parse";
import type { ExtractionResult } from "./ocr/types";

/**
 * Reads a document image using whichever AI providers are configured
 * (Gemini, then Groq, then OpenRouter), with automatic retry on rate
 * limits and fallback between providers.
 *
 * @param base64    Base64-encoded image bytes (no data: prefix)
 * @param mimeType  e.g. "image/jpeg", "image/png"
 */
export async function extractFromImage(
  base64: string,
  mimeType: string
): Promise<ExtractionResult> {
  return extractWithFallback(base64, mimeType);
}

/** Reads one or more entries from pasted text. */
export async function extractFromText(
  pastedText: string
): Promise<ExtractionResult[]> {
  return extractTextWithFallback(pastedText);
}

/** Back-compat alias used by server actions. */
export { AiError as GeminiError };
