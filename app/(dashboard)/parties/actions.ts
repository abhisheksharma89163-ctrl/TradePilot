"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { partySchema } from "@/lib/validations/party";
import { postLedger } from "@/lib/ledger";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parse(formData: FormData) {
  // type[] arrives as repeated "type" fields
  const types = formData.getAll("type").map(String).filter(Boolean);

  return partySchema.safeParse({
    type: types,
    name: formData.get("name") ?? "",
    alias: formData.get("alias") ?? "",
    gst_number: formData.get("gst_number") ?? "",
    pan_number: formData.get("pan_number") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    state_code: formData.get("state_code") ?? "",
    pincode: formData.get("pincode") ?? "",
    bank_name: formData.get("bank_name") ?? "",
    bank_account: formData.get("bank_account") ?? "",
    bank_ifsc: formData.get("bank_ifsc") ?? "",
    credit_limit: formData.get("credit_limit") ?? 0,
    credit_days: formData.get("credit_days") ?? 0,
    opening_balance: formData.get("opening_balance") ?? 0,
    opening_balance_type: formData.get("opening_balance_type") ?? "debit",
    notes: formData.get("notes") ?? "",
  });
}

export async function createParty(formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { companyId, userId } = await requireActiveCompany();
    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from("parties")
      .insert({ ...parsed.data, company_id: companyId })
      .select("id, name, opening_balance, opening_balance_type")
      .single();

    if (error) return { ok: false, error: error.message };

    // Post the opening balance into the ledger so the party's running
    // balance is correct from day one.
    const ob = Number(created?.opening_balance ?? 0);
    if (created && ob !== 0) {
      await postLedger(supabase, companyId, userId, [
        {
          date: new Date().toISOString().slice(0, 10),
          account_type: "party",
          account_id: created.id,
          account_name: created.name,
          entry_type:
            created.opening_balance_type === "credit" ? "credit" : "debit",
          amount: ob,
          narration: "Opening balance",
          reference_type: "opening",
          reference_id: created.id,
        },
      ]);
    }

    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateParty(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("parties")
      .update(parsed.data)
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteParty(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    // Soft delete — keep history/ledger references intact.
    const { error } = await supabase
      .from("parties")
      .update({ is_active: false })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/parties");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
