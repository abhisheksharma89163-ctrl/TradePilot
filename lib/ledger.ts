import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

export interface LedgerRowInput {
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
}

export async function postLedger(
  supabase: SB,
  companyId: string,
  userId: string,
  rows: LedgerRowInput[]
) {
  if (rows.length === 0) return;
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

/**
 * Re-creates the party ledger lines for one purchase entry (the credit for
 * goods value plus debits for freight + advance). Deletes the previous
 * purchase-side lines first so edits don't double-count. Payment lines
 * (reference_type='payment') are left untouched.
 */
export async function repostPurchaseLedger(
  supabase: SB,
  companyId: string,
  userId: string,
  purchaseId: string
) {
  const { data: pe } = await supabase
    .from("purchase_entries")
    .select(
      "id, entry_number, entry_date, supplier_id, total_amount, freight, advance_paid, quantity_kg"
    )
    .eq("id", purchaseId)
    .eq("company_id", companyId)
    .single();
  if (!pe || !pe.supplier_id) return;

  // Remove old purchase-side ledger lines for this entry.
  await supabase
    .from("ledger_entries")
    .delete()
    .eq("company_id", companyId)
    .eq("reference_type", "purchase_entry")
    .eq("reference_id", purchaseId);

  const { data: party } = await supabase
    .from("parties")
    .select("name")
    .eq("id", pe.supplier_id)
    .single();
  const name = party?.name ?? "Party";

  const rows: LedgerRowInput[] = [
    {
      date: pe.entry_date,
      account_type: "party",
      account_id: pe.supplier_id,
      account_name: name,
      entry_type: "credit",
      amount: Number(pe.total_amount),
      narration: `Purchase ${pe.quantity_kg ?? ""}kg`.trim(),
      reference_type: "purchase_entry",
      reference_id: pe.id,
      reference_number: pe.entry_number,
    },
  ];
  const freight = Number(pe.freight ?? 0);
  const advance = Number(pe.advance_paid ?? 0);
  if (freight > 0)
    rows.push({
      date: pe.entry_date,
      account_type: "party",
      account_id: pe.supplier_id,
      account_name: name,
      entry_type: "debit",
      amount: freight,
      narration: "Freight deducted",
      reference_type: "purchase_entry",
      reference_id: pe.id,
      reference_number: pe.entry_number,
    });
  if (advance > 0)
    rows.push({
      date: pe.entry_date,
      account_type: "party",
      account_id: pe.supplier_id,
      account_name: name,
      entry_type: "debit",
      amount: advance,
      narration: "Advance already paid",
      reference_type: "purchase_entry",
      reference_id: pe.id,
      reference_number: pe.entry_number,
    });

  await postLedger(supabase, companyId, userId, rows);
}

/** Removes all ledger lines tied to a reference (used on trash). */
export async function deleteLedgerFor(
  supabase: SB,
  companyId: string,
  referenceType: string,
  referenceId: string
) {
  await supabase
    .from("ledger_entries")
    .delete()
    .eq("company_id", companyId)
    .eq("reference_type", referenceType)
    .eq("reference_id", referenceId);
}
