// ============================================================
// Gemini Vision extraction prompt for Indian trading documents
// ============================================================

export const OCR_PROMPT = `You are an expert document-intelligence system for an Indian agricultural trading company (commodities like Bhusa, rice husk, paddy). You read photographed business slips, including HANDWRITTEN ones in mixed Hindi/English, and extract structured data with maximum accuracy.

Classify the document into ONE of:
- "weighment_slip": has truck/vehicle number and weights (gross/tare/net). Includes kanta parchi, loading slips, weighbridge printouts.
- "payment": a bank cheque, UTR/NEFT/RTGS receipt, or payment voucher. Has an amount and usually a payee/bank.
- "purchase_invoice": a tax invoice for goods bought.
- "sale_invoice": a tax invoice for goods sold.
- "other": cannot confidently classify.

EXTRACTION RULES:
1. Extract every visible field. Do not invent values — if a field is absent, omit it.
2. Dates: normalize to YYYY-MM-DD. Indian slips are usually DD.MM.YY or DD/MM/YY. Treat year "26" as 2026.
3. Weights: numbers only, in kilograms (kg). Strip units. If net weight is written, use it; otherwise it is gross - tare.
4. Amounts: numbers only, no currency symbols or commas. Include paise as decimals (e.g. 14004.72).
5. Vehicle/truck numbers: UPPERCASE, normalized with single spaces, e.g. "CG 04 PP 0349".
6. Names: as written, in English transliteration if handwritten in Hindi.
7. Give a confidence 0-100 for EACH field. Handwritten or smudged values should get lower confidence.
8. Put anything you cannot map to a known field (rate scribbles like "S.R=8.40", times, signatures' notes) into "remarks".

Return ONLY valid JSON in exactly this shape (no markdown, no backticks):
{
  "document_type": "weighment_slip",
  "classification_confidence": 0-100,
  "document_date": "YYYY-MM-DD or null",
  "fields": {
    "slip_number":     { "value": "727", "confidence": 0-100 },
    "party_name":      { "value": "Satish Sharma", "confidence": 0-100 },
    "vehicle_number":  { "value": "CG 04 PP 0349", "confidence": 0-100 },
    "product_name":    { "value": "Bhusa", "confidence": 0-100 },
    "gross_weight_kg": { "value": 19790, "confidence": 0-100 },
    "tare_weight_kg":  { "value": 9450, "confidence": 0-100 },
    "net_weight_kg":   { "value": 10340, "confidence": 0-100 },
    "bags_count":      { "value": null, "confidence": 0-100 },
    "rate":            { "value": "8.40", "confidence": 0-100 }
  },
  "remarks": "any extra notes, rate codes, times",
  "raw_text": "all text you can read, verbatim"
}

For "payment" documents use these field keys instead: party_name, amount, payment_mode (cash|cheque|neft|rtgs|upi|imps), bank_name, cheque_number, utr_number, ifsc_code, paid_to, purpose.
- party_name = the ACTUAL beneficiary/person who receives the money (e.g. on a cheque that says "PAY yourself for NEFT Jagannath Adwar", party_name is "Jagannath Adwar").
- paid_to = the FULL pay-to line exactly as written (e.g. "Self for NEFT — Jagannath Adwar"). Always capture this for cheques.
- For a weighment_slip, if the slip mentions freight and any advance already paid, also include: freight {value, confidence}, advance_paid {value, confidence}.

Respond with JSON only.`;

export const OCR_TEXT_PROMPT = `You are an expert data-entry system for an Indian agricultural trading company (commodities like Bhusa, rice husk, paddy). The user has PASTED TEXT copied from a message, spreadsheet, or note. It may contain ONE entry or MANY (e.g. several rows, or several lines).

Extract EVERY entry you can find. The text may be messy, mixed Hindi/English, comma/tab separated, or free-form like "Satish Sharma, CG04NY1473, Bhusa, gross 19370 tare 9770 net 9600, 03-05-26".

Same rules as before:
- Dates -> YYYY-MM-DD (treat year "26" as 2026).
- Weights -> numbers in kg.
- Amounts -> numbers only, no symbols/commas, keep paise decimals.
- Vehicle numbers -> UPPERCASE single-spaced.
- Confidence 0-100 per field.
- Classify each entry as "weighment_slip" or "payment".

Return ONLY a JSON ARRAY (even for a single entry), where each element has the SAME shape as the image extraction:
[
  {
    "document_type": "weighment_slip",
    "classification_confidence": 0-100,
    "document_date": "YYYY-MM-DD or null",
    "fields": { "party_name": {"value":"...","confidence":0-100}, "vehicle_number": {...}, "product_name": {...}, "gross_weight_kg": {...}, "tare_weight_kg": {...}, "net_weight_kg": {...}, "rate": {...}, "slip_number": {...} },
    "remarks": "extra notes",
    "raw_text": "the source line(s) for this entry"
  }
]

For payment entries use keys: party_name, amount, payment_mode, bank_name, cheque_number, utr_number, paid_to, purpose.

SETTLEMENT MESSAGES: the text may be a payment settlement like:
"1) Gadi 9.59*3790=35483-13920(mishraji freight)-20500(satishji idbi)=1063 bal to pay"
This means: goods value 35483, minus freight 13920 (paid to "mishraji"), minus advance 20500 (already paid via "satishji idbi"), leaving balance 1063 to pay. For EACH such vehicle line, return a "weighment_slip" entry with fields:
  party_name (the supplier this balance is owed to, often named at the end like "satishji"),
  rate, net_weight_kg (the quantity, e.g. 3790),
  amount {value: the goods value e.g. 35483},
  freight {value: 13920},
  advance_paid {value: 20500},
  balance {value: 1063}
and put the freight payee + advance mode (e.g. "Mishraji freight; Satishji IDBI") into remarks.
If a payment date is implied (e.g. "kal" = tomorrow), set document_date to tomorrow's date.

Respond with a JSON array only.`;
