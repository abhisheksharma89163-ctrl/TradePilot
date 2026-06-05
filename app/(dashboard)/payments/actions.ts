"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { postLedger, deleteLedgerFor } from "@/lib/ledger";

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

async function partyName(supabase: SB, id: string | null): Promise<string> {
  if (!id) return "Party";
  const { data } = await supabase.from("parties").select("name").eq("id", id).single();
  return data?.name ?? "Party";
}

// Allocate a payment across the party's unpaid purchase entries (oldest first),
// then post the party-side ledger debit.
async function applyPayment(
  supabase: SB,
  companyId: string,
  userId: string,
  paymentId: string
) {
  const { data: pay } = await supabase
    .from("payments")
    .select("id, party_id, amount, payment_date, payment_number, payment_type")
    .eq("id", paymentId)
    .single();
  if (!pay || !pay.party_id) return;

  const isMade = pay.payment_type !== "received";
  // Money made -> clear purchase balances; money received -> clear sale balances.
  const table = isMade ? "purchase_entries" : "sale_entries";
  const refType = isMade ? "purchase_entry" : "sale_entry";
  const partyCol = isMade ? "supplier_id" : "customer_id";

  let remaining = Number(pay.amount);
  const { data: entries } = await supabase
    .from(table)
    .select("id, balance_due")
    .eq("company_id", companyId)
    .eq(partyCol, pay.party_id)
    .eq("is_cancelled", false)
    .gt("balance_due", 0)
    .order("entry_date", { ascending: true });

  for (const e of entries ?? []) {
    if (remaining <= 0) break;
    const bal = Number(e.balance_due);
    const alloc = Math.min(remaining, bal);
    await supabase.from("payment_allocations").insert({
      payment_id: pay.id,
      reference_type: refType,
      reference_id: e.id,
      allocated_amount: alloc,
    });
    const newBal = bal - alloc;
    await supabase
      .from(table)
      .update({
        balance_due: newBal,
        payment_status: newBal <= 0 ? "paid" : "partial",
      })
      .eq("id", e.id);
    remaining -= alloc;
  }

  await postLedger(supabase, companyId, userId, [
    {
      date: pay.payment_date,
      account_type: "party",
      account_id: pay.party_id,
      account_name: await partyName(supabase, pay.party_id),
      entry_type: isMade ? "debit" : "credit",
      amount: Number(pay.amount),
      narration: `Payment ${isMade ? "made" : "received"} ${pay.payment_number}`,
      reference_type: "payment",
      reference_id: pay.id,
      reference_number: pay.payment_number,
    },
  ]);
}

// Undo a payment's allocations + ledger (restores purchase balances).
async function reversePayment(
  supabase: SB,
  companyId: string,
  paymentId: string
) {
  const { data: allocs } = await supabase
    .from("payment_allocations")
    .select("id, reference_type, reference_id, allocated_amount")
    .eq("payment_id", paymentId);

  for (const a of allocs ?? []) {
    const table = a.reference_type === "sale_entry" ? "sale_entries" : "purchase_entries";
    const { data: pe } = await supabase
      .from(table)
      .select("balance_due, total_amount")
      .eq("id", a.reference_id)
      .single();
    if (pe) {
      const restored = Number(pe.balance_due) + Number(a.allocated_amount);
      await supabase
        .from(table)
        .update({
          balance_due: restored,
          payment_status:
            restored >= Number(pe.total_amount) ? "pending" : "partial",
        })
        .eq("id", a.reference_id);
    }
  }
  await supabase.from("payment_allocations").delete().eq("payment_id", paymentId);
  await deleteLedgerFor(supabase, companyId, "payment", paymentId);
}

// ============================================================
// Settle: record a payment to a party and clear oldest balances
// ============================================================
export async function settlePayment(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const partyId = str(formData.get("party_id"));
    const amount = num(formData.get("amount"));
    const date = str(formData.get("payment_date"));
    if (!partyId) return { ok: false, error: "Party is required." };
    if (amount == null || amount <= 0)
      return { ok: false, error: "Enter a valid amount." };
    if (!date) return { ok: false, error: "Date is required." };

    const year = new Date(date).getFullYear();
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        company_id: companyId,
        payment_number: `PAY-${year}-${Date.now().toString().slice(-6)}`,
        payment_date: date,
        payment_type: "made",
        party_id: partyId,
        amount,
        payment_mode: str(formData.get("payment_mode")),
        bank_name: str(formData.get("bank_name")),
        utr_number: str(formData.get("utr_number")),
        cheque_number: str(formData.get("cheque_number")),
        paid_to: str(formData.get("paid_to")),
        purpose: str(formData.get("purpose")) ?? "Settlement",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !payment) return { ok: false, error: error?.message ?? "Failed" };

    await applyPayment(supabase, companyId, userId, payment.id);

    revalidatePath("/payments");
    revalidatePath("/parties");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============================================================
// Receive: record money received from a customer; clears sale balances
// ============================================================
export async function settleReceipt(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const partyId = str(formData.get("party_id"));
    const amount = num(formData.get("amount"));
    const date = str(formData.get("payment_date"));
    if (!partyId) return { ok: false, error: "Party is required." };
    if (amount == null || amount <= 0)
      return { ok: false, error: "Enter a valid amount." };
    if (!date) return { ok: false, error: "Date is required." };

    const year = new Date(date).getFullYear();
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        company_id: companyId,
        payment_number: `RCP-${year}-${Date.now().toString().slice(-6)}`,
        payment_date: date,
        payment_type: "received",
        party_id: partyId,
        amount,
        payment_mode: str(formData.get("payment_mode")),
        bank_name: str(formData.get("bank_name")),
        utr_number: str(formData.get("utr_number")),
        cheque_number: str(formData.get("cheque_number")),
        purpose: str(formData.get("purpose")) ?? "Receipt",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !payment) return { ok: false, error: error?.message ?? "Failed" };

    await applyPayment(supabase, companyId, userId, payment.id);

    revalidatePath("/sales");
    revalidatePath("/payments");
    revalidatePath("/parties");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============================================================
// Edit / trash / restore payments
// ============================================================
export async function updatePayment(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    const id = str(formData.get("id"));
    if (!id) return { ok: false, error: "Missing payment id." };

    const amount = num(formData.get("amount"));
    if (amount == null) return { ok: false, error: "Amount is required." };

    await reversePayment(supabase, companyId, id);

    const { error } = await supabase
      .from("payments")
      .update({
        payment_date: str(formData.get("payment_date")) ?? undefined,
        amount,
        payment_mode: str(formData.get("payment_mode")),
        bank_name: str(formData.get("bank_name")),
        cheque_number: str(formData.get("cheque_number")),
        utr_number: str(formData.get("utr_number")),
        paid_to: str(formData.get("paid_to")),
        purpose: str(formData.get("purpose")),
      })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };

    await applyPayment(supabase, companyId, userId, id);

    revalidatePath("/payments");
    revalidatePath("/parties");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function cancelPayment(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    await reversePayment(supabase, companyId, id);
    const { error } = await supabase
      .from("payments")
      .update({ is_cancelled: true })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/payments");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function restorePayment(id: string): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("payments")
      .update({ is_cancelled: false })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };
    await applyPayment(supabase, companyId, userId, id);
    revalidatePath("/payments");
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Owner-only: permanently remove a payment (and undo its effects first).
export async function deletePaymentPermanent(id: string): Promise<ActionResult> {
  try {
    const { companyId, role } = await requireActiveCompany();
    if (role !== "owner")
      return { ok: false, error: "Only the company owner can permanently delete." };
    const supabase = await createClient();

    await reversePayment(supabase, companyId, id);
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/payments");
    revalidatePath("/parties");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
