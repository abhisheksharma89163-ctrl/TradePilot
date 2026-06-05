"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { extractFromImage, GeminiError } from "@/lib/ai/gemini";
import type { ExtractionResult } from "@/lib/ai/ocr/types";

export interface ProcessResult {
  ok: boolean;
  error?: string;
  documentId?: string;
  fileUrl?: string;
  extraction?: ExtractionResult;
  duplicate?: boolean;
}

/**
 * Step 1 of the pipeline: upload the image, run OCR, store the document
 * row, and return the extracted fields for the user to review.
 * Does NOT create business records yet — that happens on confirm.
 */
export async function processDocument(
  formData: FormData
): Promise<ProcessResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "No file received." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");

    // Duplicate check — same image uploaded before?
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
    if (uploadError) {
      return { ok: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 60); // 1 hour preview link

    // Run OCR
    let extraction: ExtractionResult;
    try {
      extraction = await extractFromImage(bytes.toString("base64"), mime);
    } catch (e) {
      // Still record the upload so it isn't lost; mark failed.
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
        ocr_provider: "gemini",
      });
      const msg =
        e instanceof GeminiError ? e.message : "AI processing failed.";
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
        ocr_provider: "gemini",
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

    if (docError || !doc) {
      return { ok: false, error: docError?.message ?? "Could not save document." };
    }

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

// ------------------------------------------------------------
// Helpers: find-or-create party / vehicle / product
// ------------------------------------------------------------
async function findOrCreateParty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  name: string,
  asType: "customer" | "supplier"
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("parties")
    .select("id")
    .eq("company_id", companyId)
    .ilike("name", clean)
    .limit(1)
    .maybeSingle();
  if (found) return found.id;

  const { data: created } = await supabase
    .from("parties")
    .insert({ company_id: companyId, name: clean, type: [asType] })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function findOrCreateVehicle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  number: string
): Promise<string | null> {
  const clean = number.trim().toUpperCase();
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
  supabase: Awaited<ReturnType<typeof createClient>>,
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

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/** Step 2a: confirmed weighment slip -> create slip + party/vehicle/product. */
export async function saveWeighmentSlip(
  formData: FormData
): Promise<SaveResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const slipDate = str(formData.get("slip_date"));
    if (!slipDate) return { ok: false, error: "Slip date is required." };

    const partyName = str(formData.get("party_name"));
    const vehicleNumber = str(formData.get("vehicle_number"));
    const productName = str(formData.get("product_name"));
    const documentId = str(formData.get("document_id"));

    const partyId = partyName
      ? await findOrCreateParty(supabase, companyId, partyName, "supplier")
      : null;
    const vehicleId = vehicleNumber
      ? await findOrCreateVehicle(supabase, companyId, vehicleNumber)
      : null;
    const productId = productName
      ? await findOrCreateProduct(supabase, companyId, productName)
      : null;

    const rate = str(formData.get("rate"));
    const bags = num(formData.get("bags_count"));

    const { data: slip, error } = await supabase
      .from("weighment_slips")
      .insert({
        company_id: companyId,
        slip_number: str(formData.get("slip_number")),
        slip_date: slipDate,
        slip_type: str(formData.get("slip_type")) ?? "purchase",
        party_id: partyId,
        vehicle_id: vehicleId,
        vehicle_number: vehicleNumber,
        product_id: productId,
        gross_weight_kg: num(formData.get("gross_weight_kg")),
        tare_weight_kg: num(formData.get("tare_weight_kg")),
        remarks: str(formData.get("remarks")),
        document_id: documentId,
        custom_fields: {
          rate: rate ?? undefined,
          bags_count: bags ?? undefined,
          party_name: partyName ?? undefined,
          product_name: productName ?? undefined,
        },
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    if (documentId && slip) {
      await supabase
        .from("documents")
        .update({ linked_to: "weighment_slips", linked_id: slip.id })
        .eq("id", documentId)
        .eq("company_id", companyId);
    }

    revalidatePath("/documents");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Step 2b: confirmed payment (cheque/UTR) -> create payment record. */
export async function savePayment(formData: FormData): Promise<SaveResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const paymentDate = str(formData.get("payment_date"));
    if (!paymentDate) return { ok: false, error: "Payment date is required." };
    const amount = num(formData.get("amount"));
    if (amount == null) return { ok: false, error: "Amount is required." };

    const partyName = str(formData.get("party_name"));
    const documentId = str(formData.get("document_id"));
    const partyId = partyName
      ? await findOrCreateParty(supabase, companyId, partyName, "supplier")
      : null;

    const year = new Date(paymentDate).getFullYear();
    const paymentNumber = `PAY-${year}-${Date.now().toString().slice(-6)}`;

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        company_id: companyId,
        payment_number: paymentNumber,
        payment_date: paymentDate,
        payment_type: str(formData.get("payment_type")) ?? "made",
        party_id: partyId,
        amount,
        payment_mode: str(formData.get("payment_mode")),
        cheque_number: str(formData.get("cheque_number")),
        utr_number: str(formData.get("utr_number")),
        bank_name: str(formData.get("bank_name")),
        purpose: str(formData.get("purpose")),
        notes: str(formData.get("remarks")),
        document_id: documentId,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    if (documentId && payment) {
      await supabase
        .from("documents")
        .update({ linked_to: "payments", linked_id: payment.id })
        .eq("id", documentId)
        .eq("company_id", companyId);
    }

    revalidatePath("/documents");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
