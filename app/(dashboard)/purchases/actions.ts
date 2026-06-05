"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { repostPurchaseLedger, repostSaleLedger, deleteLedgerFor } from "@/lib/ledger";

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

async function allocatedFor(supabase: SB, entryId: string): Promise<number> {
  const { data } = await supabase
    .from("payment_allocations")
    .select("allocated_amount")
    .eq("reference_id", entryId);
  return (data ?? []).reduce((s, a) => s + Number(a.allocated_amount), 0);
}

/** Finds the financial entry linked to a slip (purchase or sale). */
async function linkedEntry(
  supabase: SB,
  companyId: string,
  slipId: string
): Promise<{ table: "purchase_entries" | "sale_entries"; id: string; isSale: boolean } | null> {
  const { data: pe } = await supabase
    .from("purchase_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("weighment_slip_id", slipId)
    .maybeSingle();
  if (pe) return { table: "purchase_entries", id: pe.id, isSale: false };
  const { data: se } = await supabase
    .from("sale_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("weighment_slip_id", slipId)
    .maybeSingle();
  if (se) return { table: "sale_entries", id: se.id, isSale: true };
  return null;
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

    // Update the linked entry (purchase or sale) + re-post ledger.
    const link = await linkedEntry(supabase, companyId, id);
    if (link && amount != null) {
      const allocated = await allocatedFor(supabase, link.id);
      const balance = amount - freight - advance - allocated;
      const status =
        balance <= 0
          ? "paid"
          : allocated > 0 || advance > 0 || freight > 0
            ? "partial"
            : "pending";
      if (link.isSale) {
        await supabase
          .from("sale_entries")
          .update({
            quantity_kg: net,
            rate_per_kg: rate,
            freight,
            advance_received: advance,
            total_amount: amount,
            balance_due: balance,
            payment_status: status,
          })
          .eq("id", link.id);
        await repostSaleLedger(supabase, companyId, userId, link.id);
      } else {
        await supabase
          .from("purchase_entries")
          .update({
            quantity_kg: net,
            rate_per_kg: rate,
            freight,
            advance_paid: advance,
            total_amount: amount,
            balance_due: balance,
            payment_status: status,
          })
          .eq("id", link.id);
        await repostPurchaseLedger(supabase, companyId, userId, link.id);
      }
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

  const link = await linkedEntry(supabase, companyId, id);
  if (link) {
    await supabase
      .from(link.table)
      .update({ is_cancelled: cancelled })
      .eq("id", link.id);
    const refType = link.isSale ? "sale_entry" : "purchase_entry";
    if (cancelled) {
      await deleteLedgerFor(supabase, companyId, refType, link.id);
    } else if (link.isSale) {
      await repostSaleLedger(supabase, companyId, userId, link.id);
    } else {
      await repostPurchaseLedger(supabase, companyId, userId, link.id);
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

// Owner-only: permanently remove a slip and everything derived from it.
export async function deleteSlipPermanent(id: string): Promise<ActionResult> {
  try {
    const { companyId, role } = await requireActiveCompany();
    if (role !== "owner")
      return { ok: false, error: "Only the company owner can permanently delete." };
    const supabase = await createClient();

    const link = await linkedEntry(supabase, companyId, id);
    if (link) {
      const refType = link.isSale ? "sale_entry" : "purchase_entry";
      await supabase.from("payment_allocations").delete().eq("reference_id", link.id);
      await supabase
        .from("ledger_entries")
        .delete()
        .eq("company_id", companyId)
        .eq("reference_type", refType)
        .eq("reference_id", link.id);
      await supabase.from(link.table).delete().eq("id", link.id).eq("company_id", companyId);
    }

    const { error } = await supabase
      .from("weighment_slips")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/purchases");
    revalidatePath("/reports");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
