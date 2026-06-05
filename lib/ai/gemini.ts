import "server-only";
import { OCR_PROMPT } from "./ocr/prompt";
import type { ExtractionResult } from "./ocr/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiError extends Error {}

/**
 * Sends an image to Google Gemini Vision and returns the structured
 * extraction. Throws GeminiError with a user-friendly message on failure.
 *
 * @param base64    Base64-encoded image bytes (no data: prefix)
 * @param mimeType  e.g. "image/jpeg", "image/png"
 */
export async function extractFromImage(
  base64: string,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(
      "AI is not configured yet. Add your GEMINI_API_KEY in the environment settings."
    );
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: OCR_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiError("Could not reach the AI service. Check your internet and try again.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 400 && detail.includes("API_KEY_INVALID")) {
      throw new GeminiError("Your Gemini API key looks invalid. Re-check it in settings.");
    }
    if (res.status === 429) {
      throw new GeminiError("AI is busy (rate limit). Wait a few seconds and try again.");
    }
    throw new GeminiError(`AI service error (${res.status}). Please try again.`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("AI returned an empty result. Try a clearer photo.");
  }

  return parseExtraction(text);
}

/** Parse Gemini's text into our ExtractionResult, tolerating stray markdown. */
function parseExtraction(text: string): ExtractionResult {
  let cleaned = text.trim();
  // Strip ```json ... ``` fences if the model added them.
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  // Fallback: grab the outermost { ... }.
  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  }

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(cleaned) as ExtractionResult;
  } catch {
    throw new GeminiError("AI returned an unreadable result. Try again or use a clearer photo.");
  }

  // Defensive defaults so the UI never crashes on a missing key.
  return {
    document_type: parsed.document_type ?? "other",
    classification_confidence: parsed.classification_confidence ?? 0,
    document_date: parsed.document_date ?? null,
    fields: parsed.fields ?? {},
    remarks: parsed.remarks ?? null,
    raw_text: parsed.raw_text ?? null,
  };
}
