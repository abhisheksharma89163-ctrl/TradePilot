"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { repostPurchaseLedger, deleteLedgerFor } from "@/lib/ledger";

type SB = Awaited<ReturnType<typeof createClient>>;

export interface ActionResult {
  ok: boolean;
  error?: string;
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

async function allocatedFor(supabase: SB, purchaseId: string): Promise<number> {
  const { data } = await supabase
    .from("payment_allocations")
    .select("allocated_amount")
    .eq("reference_id", purchaseId);
  return (data ?? []).reduce((s, a) => s + Number(a.allocated_amount), 0);
}

// ============================================================
// Edit a saved weighment slip (and its linked purchase + ledger)
// ============================================================
export async function updateSlip(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    const id = str(formData.get("id"));
    if (!id) return { ok: false, error: "Missing slip id." };

    const slipDate = str(formData.get("slip_date"));
    if (!slipDate) return { ok: false, error: "Date is required." };

    const gross = num(formData.get("gross_weight_kg"));
    const tare = num(formData.get("tare_weight_kg"));
    const net = gross != null && tare != null ? gross - tare : null;
    const rate = num(formData.get("rate"));
    const amount = num(formData.get("amount"));
    const freight = num(formData.get("freight")) ?? 0;
    const advance = num(formData.get("advance_paid")) ?? 0;
    const vehicleNumber = str(formData.get("vehicle_number"));
    const partyName = str(formData.get("party_name"));
    const productName = str(formData.get("product_name"));

    const { error: slipErr } = await supabase
      .from("weighment_slips")
      .update({
        slip_date: slipDate,
        slip_number: str(formData.get("slip_number")),
        vehicle_number: vehicleNumber,
        gross_weight_kg: gross,
        tare_weight_kg: tare,
        remarks: str(formData.get("remarks")),
        custom_fields: {
          rate: rate ?? undefined,
          amount: amount ?? undefined,
          freight: freight || undefined,
          advance_paid: advance || undefined,
          party_name: partyName ?? undefined,
          product_name: productName ?? undefined,
        },
      })
      .eq("id", id)
      .eq("company_id", companyId);
    if (slipErr) return { ok: false, error: slipErr.message };

    // Update the linked purchase entry + re-post ledger.
    const { data: pe } = await supabase
      .from("purchase_entries")
      .select("id, total_amount")
      .eq("company_id", companyId)
      .eq("weighment_slip_id", id)
      .maybeSingle();

    if (pe && amount != null) {
      const allocated = await allocatedFor(supabase, pe.id);
      const balance = amount - freight - advance - allocated;
      await supabase
        .from("purchase_entries")
        .update({
          quantity_kg: net,
          rate_per_kg: rate,
          freight,
          advance_paid: advance,
          total_amount: amount,
          balance_due: balance,
          payment_status:
            balance <= 0 ? "paid" : allocated > 0 || advance > 0 || freight > 0 ? "partial" : "pending",
        })
        .eq("id", pe.id);
      await repostPurchaseLedger(supabase, companyId, userId, pe.id);
    }

    revalidatePath("/purchases");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function setSlipCancelled(
  supabase: SB,
  companyId: string,
  userId: string,
  id: string,
  cancelled: boolean
) {
  await supabase
    .from("weighment_slips")
    .update({ is_cancelled: cancelled })
    .eq("id", id)
    .eq("company_id", companyId);

  const { data: pe } = await supabase
    .from("purchase_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("weighment_slip_id", id)
    .maybeSingle();

  if (pe) {
    await supabase
      .from("purchase_entries")
      .update({ is_cancelled: cancelled })
      .eq("id", pe.id);
    if (cancelled) {
      await deleteLedgerFor(supabase, companyId, "purchase_entry", pe.id);
    } else {
      await repostPurchaseLedger(supabase, companyId, userId, pe.id);
    }
  }
}

export async function cancelSlip(id: string): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    await setSlipCancelled(supabase, companyId, userId, id, true);
    revalidatePath("/purchases");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function restoreSlip(id: string): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    await setSlipCancelled(supabase, companyId, userId, id, false);
    revalidatePath("/purchases");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
