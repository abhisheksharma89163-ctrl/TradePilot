"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Owner-only: store the signature image (data URL) in company settings. */
export async function saveSignature(dataUrl: string): Promise<ActionResult> {
  try {
    const { companyId, role } = await requireActiveCompany();
    if (role !== "owner")
      return { ok: false, error: "Only the owner can change the signature." };
    if (!dataUrl.startsWith("data:image/"))
      return { ok: false, error: "Invalid image." };
    if (dataUrl.length > 500_000)
      return { ok: false, error: "Image too large — use a smaller/cropped signature." };

    const supabase = await createClient();
    const { data: company } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    const settings = {
      ...((company?.settings as Record<string, unknown>) ?? {}),
      signature: dataUrl,
    };
    const { error } = await supabase
      .from("companies")
      .update({ settings })
      .eq("id", companyId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/settings/company");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeSignature(): Promise<ActionResult> {
  try {
    const { companyId, role } = await requireActiveCompany();
    if (role !== "owner")
      return { ok: false, error: "Only the owner can change the signature." };
    const supabase = await createClient();
    const { data: company } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();
    const settings = { ...((company?.settings as Record<string, unknown>) ?? {}) };
    delete settings.signature;
    const { error } = await supabase
      .from("companies")
      .update({ settings })
      .eq("id", companyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
