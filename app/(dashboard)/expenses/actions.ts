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

async function findOrCreateCategory(
  supabase: SB,
  companyId: string,
  name: string
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("company_id", companyId)
    .ilike("name", clean)
    .limit(1)
    .maybeSingle();
  if (found) return found.id;
  const { data: created } = await supabase
    .from("expense_categories")
    .insert({ company_id: companyId, name: clean })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function createExpense(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();

    const date = str(formData.get("expense_date"));
    const amount = num(formData.get("amount"));
    if (!date) return { ok: false, error: "Date is required." };
    if (amount == null || amount <= 0)
      return { ok: false, error: "Enter a valid amount." };

    const categoryName = str(formData.get("category")) ?? "General";
    const categoryId = await findOrCreateCategory(supabase, companyId, categoryName);

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        company_id: companyId,
        expense_date: date,
        category_id: categoryId,
        amount,
        paid_to: str(formData.get("paid_to")),
        description: str(formData.get("description")),
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    if (expense) {
      await postLedger(supabase, companyId, userId, [
        {
          date,
          account_type: "expense",
          account_id: categoryId ?? companyId,
          account_name: categoryName,
          entry_type: "debit",
          amount,
          narration: str(formData.get("description")) ?? categoryName,
          reference_type: "expense",
          reference_id: expense.id,
        },
      ]);
    }

    revalidatePath("/expenses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateExpense(formData: FormData): Promise<ActionResult> {
  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    const id = str(formData.get("id"));
    if (!id) return { ok: false, error: "Missing id." };

    const date = str(formData.get("expense_date"));
    const amount = num(formData.get("amount"));
    if (!date || amount == null)
      return { ok: false, error: "Date and amount required." };

    const categoryName = str(formData.get("category")) ?? "General";
    const categoryId = await findOrCreateCategory(supabase, companyId, categoryName);

    const { error } = await supabase
      .from("expenses")
      .update({
        expense_date: date,
        category_id: categoryId,
        amount,
        paid_to: str(formData.get("paid_to")),
        description: str(formData.get("description")),
      })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };

    // Re-post ledger.
    await deleteLedgerFor(supabase, companyId, "expense", id);
    await postLedger(supabase, companyId, userId, [
      {
        date,
        account_type: "expense",
        account_id: categoryId ?? companyId,
        account_name: categoryName,
        entry_type: "debit",
        amount,
        narration: str(formData.get("description")) ?? categoryName,
        reference_type: "expense",
        reference_id: id,
      },
    ]);

    revalidatePath("/expenses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    await deleteLedgerFor(supabase, companyId, "expense", id);
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/expenses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
