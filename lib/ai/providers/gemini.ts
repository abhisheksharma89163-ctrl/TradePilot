import { OCR_PROMPT, OCR_TEXT_PROMPT } from "../ocr/prompt";
import {
  AiError,
  RateLimitError,
  parseExtraction,
  parseExtractionArray,
} from "../ocr/parse";
import type { ExtractionResult } from "../ocr/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

async function callGemini(parts: object[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });

  if (res.status === 429) throw new RateLimitError("Gemini rate limit");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 400 && detail.includes("API_KEY_INVALID")) {
      throw new AiError("Your Gemini API key looks invalid. Re-check it in settings.");
    }
    throw new AiError(`Gemini error (${res.status}).`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AiError("Gemini returned an empty result.");
  return text;
}

/** Extract many entries from pasted text. */
export async function extractGeminiText(
  pastedText: string
): Promise<ExtractionResult[]> {
  const text = await callGemini([
    { text: OCR_TEXT_PROMPT + "\n\nPASTED TEXT:\n" + pastedText },
  ]);
  return parseExtractionArray(text);
}

/** Google Gemini Vision provider. Throws RateLimitError on HTTP 429. */
export async function extractGemini(
  base64: string,
  mimeType: string
): Promise<ExtractionResult> {
  const text = await callGemini([
    { text: OCR_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ]);
  return parseExtraction(text);
}
