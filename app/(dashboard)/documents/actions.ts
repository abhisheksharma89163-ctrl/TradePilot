"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { extractFromImage, extractFromText, GeminiError } from "@/lib/ai/gemini";
import type { ExtractionResult } from "@/lib/ai/ocr/types";

type SB = Awaited<ReturnType<typeof createClient>>;

export interface ProcessResult {
  ok: boolean;
  error?: string;
  documentId?: string;
  fileUrl?: string;
  extraction?: ExtractionResult;
  duplicate?: boolean;
}

// ============================================================
// STEP 1 (image): upload + OCR + store document, return fields
// ============================================================
export async function processDocument(
  formData: FormData
): Promise<ProcessResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file received." };

    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");

    const { data: existing } = await supabase
      .from("documents")
      .select("id")
      .eq("company_id", companyId)
      .eq("file_hash", hash)
      .limit(1)
      .maybeSingle();

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${companyId}/${Date.now()}-${hash.slice(0, 10)}.${ext}`;
    const mime = file.type || "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` };

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 60);

    let extraction: ExtractionResult;
    try {
      extraction = await extractFromImage(bytes.toString("base64"), mime);
    } catch (e) {
      await supabase.from("documents").insert({
        company_id: companyId,
        file_name: file.name,
        file_path: path,
        file_type: ext,
        file_size_bytes: bytes.length,
        mime_type: mime,
        file_hash: hash,
        uploaded_by: userId,
        ocr_status: "failed",
        ocr_provider: "ai",
      });
      const msg = e instanceof GeminiError ? e.message : "AI processing failed.";
      return { ok: false, error: msg };
    }

    const flagged = Object.entries(extraction.fields)
      .filter(([, f]) => (f?.confidence ?? 0) < 80)
      .map(([k]) => k);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        company_id: companyId,
        file_name: file.name,
        file_path: path,
        file_url: signed?.signedUrl ?? null,
        file_type: ext,
        file_size_bytes: bytes.length,
        mime_type: mime,
        file_hash: hash,
        uploaded_by: userId,
        document_date: extraction.document_date,
        ocr_status: "completed",
        ocr_provider: "ai",
        ocr_confidence: extraction.classification_confidence,
        ocr_raw_text: extraction.raw_text,
        ocr_extracted: extraction as unknown as Record<string, unknown>,
        ocr_flagged_fields: flagged,
        ocr_processed_at: new Date().toISOString(),
        doc_type: extraction.document_type,
        classification_confidence: extraction.classification_confidence,
        is_duplicate: Boolean(existing),
      })
      .select("id")
      .single();

    if (docError || !doc)
      return { ok: false, error: docError?.message ?? "Could not save document." };

    revalidatePath("/documents");
    return {
      ok: true,
      documentId: doc.id,
      fileUrl: signed?.signedUrl ?? undefined,
      extraction,
      duplicate: Boolean(existing),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============================================================
// STEP 1 (text): parse pasted text into one or many entries
// ============================================================
export interface TextEntry {
  documentId?: string;
  extraction: ExtractionResult;
}
export interface ProcessTextResult {
  ok: boolean;
  error?: string;
  entries?: TextEntry[];
}

export async function processText(text: string): Promise<ProcessTextResult> {
  try {
    if (!text || text.trim().length < 3)
      return { ok: false, error: "Paste some slip text first." };

    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    let results: ExtractionResult[];
    try {
      results = await extractFromText(text);
    } catch (e) {
      const msg = e instanceof GeminiError ? e.message : "AI processing failed.";
      return { ok: false, error: msg };
    }

    const entries: TextEntry[] = [];
    for (const extraction of results) {
      const { data: doc } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          file_name: "Pasted text",
          file_path: `text/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file_type: "text",
          uploaded_by: userId,
          document_date: extraction.document_date,
          ocr_status: "completed",
          ocr_provider: "ai-text",
          ocr_raw_text: extraction.raw_text ?? text,
          ocr_extracted: extraction as unknown as Record<string, unknown>,
          doc_type: extraction.document_type,
        })
        .select("id")
        .single();
      entries.push({ documentId: doc?.id, extraction });
    }

    revalidatePath("/documents");
    return { ok: true, entries };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============================================================
// Helpers: find-or-create with fuzzy party matching
// ============================================================
async function findOrCreateParty(
  supabase: SB,
  companyId: string,
  name: string,
  asType: "customer" | "supplier"
): Promise<{ id: string | null; name: string }> {
  const clean = name.trim();
  if (!clean) return { id: null, name: clean };

  // Smart fuzzy match: "Satish Sharma" ≈ "Satish Sarma".
  const { data: matchId } = await supabase.rpc("match_party", {
    p_company: companyId,
    p_name: clean,
  });
  if (matchId) return { id: matchId as string, name: clean };

  const { data: created } = await supabase
    .from("parties")
    .insert({ company_id: companyId, name: clean, type: [asType] })
    .select("id")
    .single();
  return { id: created?.id ?? null, name: clean };
}

async function findOrCreateVehicle(
  supabase: SB,
  companyId: string,
  number: string
): Promise<string | null> {
  const clean = number.trim().toUpperCase().replace(/\s+/g, " ");
  if (!clean) return null;
  const { data: found } = await supabase
    .from("vehicles")
    .select("id")
    .eq("company_id", companyId)
    .ilike("vehicle_number", clean)
    .limit(1)
    .maybeSingle();
  if (found) return found.id;
  const { data: created } = await supabase
    .from("vehicles")
    .insert({ company_id: companyId, vehicle_number: clean })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function findOrCreateProduct(
  supabase: SB,
  companyId: string,
  name: string
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("products")
    .select("id")
    .eq("company_id", companyId)
    .ilike("name", clean)
    .limit(1)
    .maybeSingle();
  if (found) return found.id;
  const { data: created } = await supabase
    .from("products")
    .insert({ company_id: companyId, name: clean, unit: "KG" })
    .select("id")
    .single();
  return created?.id ?? null;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

// ============================================================
// Content-based duplicate detection
// ============================================================
export interface DuplicateCheck {
  kind: "weighment" | "payment";
  slip_date?: string;
  slip_number?: string;
  vehicle_number?: string;
  net_weight?: number;
  payment_date?: string;
  amount?: number;
  cheque_number?: string;
  utr_number?: string;
}

export async function checkDuplicates(
  input: DuplicateCheck
): Promise<{ matches: string[] }> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const matches: string[] = [];

    if (input.kind === "weighment" && input.slip_date) {
      const { data } = await supabase
        .from("weighment_slips")
        .select("slip_number, slip_date, vehicle_number, net_weight_kg")
        .eq("company_id", companyId)
        .eq("slip_date", input.slip_date);
      for (const s of data ?? []) {
        const sameSlip =
          input.slip_number &&
          s.slip_number &&
          s.slip_number.toLowerCase() === input.slip_number.toLowerCase();
        const sameTruckWeight =
          input.vehicle_number &&
          s.vehicle_number &&
          s.vehicle_number.toUpperCase().replace(/\s+/g, "") ===
            input.vehicle_number.toUpperCase().replace(/\s+/g, "") &&
          input.net_weight != null &&
          s.net_weight_kg != null &&
          Math.abs(Number(s.net_weight_kg) - input.net_weight) < 5;
        if (sameSlip)
          matches.push(`Slip #${s.slip_number} already saved on ${s.slip_date}`);
        else if (sameTruckWeight)
          matches.push(
            `${s.vehicle_number} with net ${s.net_weight_kg}kg already saved on ${s.slip_date}`
          );
      }
    }

    if (input.kind === "payment") {
      let q = supabase
        .from("payments")
        .select("payment_date, amount, cheque_number, utr_number, payment_number")
        .eq("company_id", companyId);
      if (input.cheque_number) q = q.eq("cheque_number", input.cheque_number);
      const { data } = await q;
      for (const p of data ?? []) {
        if (
          input.utr_number &&
          p.utr_number &&
          p.utr_number === input.utr_number
        )
          matches.push(`UTR ${p.utr_number} already recorded (${p.payment_number})`);
        else if (input.cheque_number && p.cheque_number === input.cheque_number)
          matches.push(
            `Cheque ${p.cheque_number} already recorded (${p.payment_number})`
          );
        else if (
          input.amount != null &&
          input.payment_date &&
          Number(p.amount) === input.amount &&
          p.payment_date === input.payment_date
        )
          matches.push(`₹${p.amount} on ${p.payment_date} already recorded`);
      }
    }

    return { matches: Array.from(new Set(matches)) };
  } catch {
    return { matches: [] };
  }
}

// ============================================================
// Ledger helper — double-entry posting
// ============================================================
async function postLedger(
  supabase: SB,
  companyId: string,
  userId: string,
  rows: {
    date: string;
    account_type: string;
    account_id: string;
    account_name: string;
    entry_type: "debit" | "credit";
    amount: number;
    narration?: string;
    reference_type?: string;
    reference_id?: string;
    reference_number?: string;
  }[]
) {
  await supabase.from("ledger_entries").insert(
    rows.map((r) => ({
      company_id: companyId,
      entry_date: r.date,
      account_type: r.account_type,
      account_id: r.account_id,
      account_name: r.account_name,
      entry_type: r.entry_type,
      amount: r.amount,
      narration: r.narration ?? null,
      reference_type: r.reference_type ?? null,
      reference_id: r.reference_id ?? null,
      reference_number: r.reference_number ?? null,
      created_by: userId,
    }))
  );
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

// ============================================================
// STEP 2a: save weighment slip (+ purchase + ledger + balance)
// ============================================================
export async function saveWeighmentSlip(
  formData: FormData
): Promise<SaveResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const slipDate = str(formData.get("slip_date"));
    if (!slipDate) return { ok: false, error: "Slip date is required." };

    const slipType = str(formData.get("slip_type")) === "sale" ? "sale" : "purchase";
    const isSale = slipType === "sale";

    const partyNameRaw = str(formData.get("party_name"));
    const vehicleNumber = str(formData.get("vehicle_number"));
    const productName = str(formData.get("product_name"));
    const documentId = str(formData.get("document_id"));

    const party = partyNameRaw
      ? await findOrCreateParty(
          supabase,
          companyId,
          partyNameRaw,
          isSale ? "customer" : "supplier"
        )
      : { id: null as string | null, name: "" };
    const vehicleId = vehicleNumber
      ? await findOrCreateVehicle(supabase, companyId, vehicleNumber)
      : null;
    const productId = productName
      ? await findOrCreateProduct(supabase, companyId, productName)
      : null;

    const rate = num(formData.get("rate"));
    const bags = num(formData.get("bags_count"));
    const gross = num(formData.get("gross_weight_kg"));
    const tare = num(formData.get("tare_weight_kg"));
    const net = gross != null && tare != null ? gross - tare : null;
    const amount = num(formData.get("amount")); // goods value (net × rate)
    const freight = num(formData.get("freight")) ?? 0;
    const advance = num(formData.get("advance_paid")) ?? 0;
    const dueDate = str(formData.get("due_date"));
    const balanceDue =
      amount != null ? amount - freight - advance : null;

    const { data: slip, error } = await supabase
      .from("weighment_slips")
      .insert({
        company_id: companyId,
        slip_number: str(formData.get("slip_number")),
        slip_date: slipDate,
        slip_type: slipType,
        party_id: party.id,
        vehicle_id: vehicleId,
        vehicle_number: vehicleNumber,
        product_id: productId,
        gross_weight_kg: gross,
        tare_weight_kg: tare,
        remarks: str(formData.get("remarks")),
        document_id: documentId,
        custom_fields: {
          rate: rate ?? undefined,
          bags_count: bags ?? undefined,
          amount: amount ?? undefined,
          freight: freight || undefined,
          advance_paid: advance || undefined,
          balance_due: balanceDue ?? undefined,
          party_name: partyNameRaw ?? undefined,
          product_name: productName ?? undefined,
        },
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    const status =
      balanceDue != null && balanceDue <= 0
        ? "paid"
        : advance > 0 || freight > 0
          ? "partial"
          : "pending";

    // SALE: create a sale entry + receivable ledger (customer owes us).
    if (slip && isSale && amount != null && amount > 0 && party.id) {
      const { data: entryNumber } = await supabase.rpc("next_entry_number", {
        p_company: companyId,
        p_prefix: "SAL",
        p_table: "sale_entries",
      });
      const { data: sale } = await supabase
        .from("sale_entries")
        .insert({
          company_id: companyId,
          entry_number: (entryNumber as string) ?? `SAL-${Date.now()}`,
          entry_date: slipDate,
          customer_id: party.id,
          vehicle_id: vehicleId,
          weighment_slip_id: slip.id,
          product_id: productId,
          quantity_kg: net,
          rate_per_kg: rate,
          freight,
          advance_received: advance,
          total_amount: amount,
          balance_due: balanceDue ?? amount,
          payment_status: status,
          due_date: dueDate,
          created_by: userId,
        })
        .select("id, entry_number")
        .single();

      const rows = [
        {
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "debit" as const,
          amount,
          narration: `Sale ${productName ?? ""} ${net ?? ""}kg`.trim(),
          reference_type: "sale_entry",
          reference_id: sale?.id,
          reference_number: sale?.entry_number,
        },
      ];
      if (freight > 0)
        rows.push({
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "credit" as const,
          amount: freight,
          narration: "Freight adjusted",
          reference_type: "sale_entry",
          reference_id: sale?.id,
          reference_number: sale?.entry_number,
        });
      if (advance > 0)
        rows.push({
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "credit" as const,
          amount: advance,
          narration: "Advance received",
          reference_type: "sale_entry",
          reference_id: sale?.id,
          reference_number: sale?.entry_number,
        });
      await postLedger(supabase, companyId, userId, rows);
    }

    // PURCHASE: create a purchase entry + payable ledger (we owe supplier).
    if (slip && !isSale && amount != null && amount > 0 && party.id) {
      const { data: entryNumber } = await supabase.rpc("next_entry_number", {
        p_company: companyId,
        p_prefix: "PUR",
        p_table: "purchase_entries",
      });

      const { data: purchase } = await supabase
        .from("purchase_entries")
        .insert({
          company_id: companyId,
          entry_number: (entryNumber as string) ?? `PUR-${Date.now()}`,
          entry_date: slipDate,
          supplier_id: party.id,
          vehicle_id: vehicleId,
          weighment_slip_id: slip.id,
          product_id: productId,
          quantity_kg: net,
          rate_per_kg: rate,
          freight,
          advance_paid: advance,
          total_amount: amount,
          balance_due: balanceDue ?? amount,
          payment_status: status,
          due_date: dueDate,
          created_by: userId,
        })
        .select("id, entry_number")
        .single();

      // Party ledger: credit goods value (we owe), debit freight + advance
      // (those reduce what's still owed). Net = balance to pay.
      const rows = [
        {
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "credit" as const,
          amount,
          narration: `Purchase ${productName ?? ""} ${net ?? ""}kg`.trim(),
          reference_type: "purchase_entry",
          reference_id: purchase?.id,
          reference_number: purchase?.entry_number,
        },
      ];
      if (freight > 0)
        rows.push({
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "debit" as const,
          amount: freight,
          narration: "Freight deducted",
          reference_type: "purchase_entry",
          reference_id: purchase?.id,
          reference_number: purchase?.entry_number,
        });
      if (advance > 0)
        rows.push({
          date: slipDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: "debit" as const,
          amount: advance,
          narration: "Advance already paid",
          reference_type: "purchase_entry",
          reference_id: purchase?.id,
          reference_number: purchase?.entry_number,
        });
      await postLedger(supabase, companyId, userId, rows);
    }

    if (documentId && slip) {
      await supabase
        .from("documents")
        .update({ linked_to: "weighment_slips", linked_id: slip.id })
        .eq("id", documentId)
        .eq("company_id", companyId);
    }

    revalidatePath("/documents");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============================================================
// STEP 2b: save payment (+ ledger so party balance updates)
// ============================================================
export async function savePayment(formData: FormData): Promise<SaveResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const paymentDate = str(formData.get("payment_date"));
    if (!paymentDate) return { ok: false, error: "Payment date is required." };
    const amount = num(formData.get("amount"));
    if (amount == null) return { ok: false, error: "Amount is required." };

    const partyNameRaw = str(formData.get("party_name"));
    const documentId = str(formData.get("document_id"));
    const party = partyNameRaw
      ? await findOrCreateParty(supabase, companyId, partyNameRaw, "supplier")
      : { id: null as string | null, name: "" };

    const paymentType = str(formData.get("payment_type")) ?? "made";
    const year = new Date(paymentDate).getFullYear();
    const paymentNumber = `PAY-${year}-${Date.now().toString().slice(-6)}`;

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        company_id: companyId,
        payment_number: paymentNumber,
        payment_date: paymentDate,
        payment_type: paymentType,
        party_id: party.id,
        amount,
        payment_mode: str(formData.get("payment_mode")),
        cheque_number: str(formData.get("cheque_number")),
        utr_number: str(formData.get("utr_number")),
        bank_name: str(formData.get("bank_name")),
        purpose: str(formData.get("purpose")),
        paid_to: str(formData.get("paid_to")),
        notes: str(formData.get("remarks")),
        document_id: documentId,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    // Ledger: payment made -> debit supplier (we owe less); credit bank/cash.
    if (payment && party.id) {
      const isMade = paymentType === "made";
      await postLedger(supabase, companyId, userId, [
        {
          date: paymentDate,
          account_type: "party",
          account_id: party.id,
          account_name: party.name,
          entry_type: isMade ? "debit" : "credit",
          amount,
          narration: `Payment ${isMade ? "made" : "received"} ${paymentNumber}`,
          reference_type: "payment",
          reference_id: payment.id,
          reference_number: paymentNumber,
        },
      ]);
    }

    if (documentId && payment) {
      await supabase
        .from("documents")
        .update({ linked_to: "payments", linked_id: payment.id })
        .eq("id", documentId)
        .eq("company_id", companyId);
    }

    revalidatePath("/documents");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
