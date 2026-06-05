"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { productSchema, categorySchema } from "@/lib/validations/product";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name") ?? "",
    code: formData.get("code") ?? "",
    category_id: formData.get("category_id") ?? "",
    hsn_code: formData.get("hsn_code") ?? "",
    unit: formData.get("unit") ?? "KG",
    unit_weight: formData.get("unit_weight") ?? "",
    gst_rate: formData.get("gst_rate") ?? 0,
    description: formData.get("description") ?? "",
  });
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .insert({ ...parsed.data, company_id: companyId });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update(parsed.data)
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const { error } = await supabase
      .from("product_categories")
      .insert({ ...parsed.data, company_id: companyId });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
