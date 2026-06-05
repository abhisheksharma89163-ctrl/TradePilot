import type { ExtractionResult } from "./types";

/** Generic AI failure with a user-friendly message. */
export class AiError extends Error {}
/** Provider hit a rate limit (HTTP 429) — caller may retry / fall back. */
export class RateLimitError extends AiError {}
/** No provider keys configured at all. */
export class NotConfiguredError extends AiError {}

/** Parse a model's text response into ExtractionResult, tolerating markdown. */
export function parseExtraction(text: string): ExtractionResult {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  }

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(cleaned) as ExtractionResult;
  } catch {
    throw new AiError(
      "AI returned an unreadable result. Try again or use a clearer photo."
    );
  }

  return {
    document_type: parsed.document_type ?? "other",
    classification_confidence: parsed.classification_confidence ?? 0,
    document_date: parsed.document_date ?? null,
    fields: parsed.fields ?? {},
    remarks: parsed.remarks ?? null,
    raw_text: parsed.raw_text ?? null,
  };
}

/** Parse a model's text response into an ARRAY of ExtractionResults. */
export function parseExtractionArray(text: string): ExtractionResult[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  if (!cleaned.startsWith("[")) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  }

  let arr: unknown;
  try {
    arr = JSON.parse(cleaned);
  } catch {
    // Maybe the model returned a single object — wrap it.
    return [parseExtraction(text)];
  }
  if (!Array.isArray(arr)) return [parseExtraction(text)];

  return arr.map((item) => {
    const p = item as ExtractionResult;
    return {
      document_type: p.document_type ?? "other",
      classification_confidence: p.classification_confidence ?? 0,
      document_date: p.document_date ?? null,
      fields: p.fields ?? {},
      remarks: p.remarks ?? null,
      raw_text: p.raw_text ?? null,
    };
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
