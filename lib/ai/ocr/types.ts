// ============================================================
// OCR extraction result shape (what Gemini returns to us)
// ============================================================

export type DocType =
  | "weighment_slip"
  | "payment" // bank cheque / UTR / payment receipt
  | "purchase_invoice"
  | "sale_invoice"
  | "other";

export interface ExtractedField {
  value: string | number | null;
  /** 0–100. Below CONFIDENCE_THRESHOLD we highlight it for review. */
  confidence: number;
}

export interface ExtractionResult {
  document_type: DocType;
  classification_confidence: number;
  document_date: string | null; // YYYY-MM-DD
  fields: Record<string, ExtractedField>;
  remarks: string | null;
  raw_text: string | null;
}

/** Fields scoring below this are flagged yellow in the review screen. */
export const CONFIDENCE_THRESHOLD = 80;

/** Canonical field keys we try to extract per document type. */
export const WEIGHMENT_FIELDS = [
  "slip_number",
  "party_name",
  "vehicle_number",
  "product_name",
  "gross_weight_kg",
  "tare_weight_kg",
  "net_weight_kg",
  "bags_count",
  "rate",
  "amount",
  "freight",
  "advance_paid",
  "balance",
] as const;

export const PAYMENT_FIELDS = [
  "party_name",
  "amount",
  "payment_mode",
  "bank_name",
  "cheque_number",
  "utr_number",
  "ifsc_code",
  "paid_to",
  "purpose",
] as const;

export function isFlagged(field?: ExtractedField): boolean {
  if (!field) return true;
  return (field.confidence ?? 0) < CONFIDENCE_THRESHOLD;
}
