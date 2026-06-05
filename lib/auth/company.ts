import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_COMPANY_COOKIE = "bos_active_company";

export interface ActiveCompany {
  userId: string;
  companyId: string;
  role: string;
}

/**
 * Resolves the signed-in user and their active company.
 *
 * The active company id is held in a cookie. We always re-validate
 * that the user is an active member of it (RLS would block them
 * anyway, but this keeps the UI honest). Falls back to the first
 * membership when the cookie is missing or stale.
 *
 * Returns null when there is no session or no membership.
 */
export async function getActiveCompany(): Promise<ActiveCompany | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!memberships || memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  const match =
    memberships.find((m) => m.company_id === preferred) ?? memberships[0]!;

  return { userId: user.id, companyId: match.company_id, role: match.role };
}

/** Throws when there is no active company — use inside Server Actions. */
export async function requireActiveCompany(): Promise<ActiveCompany> {
  const active = await getActiveCompany();
  if (!active) {
    throw new Error("No active company. Create or join a company first.");
  }
  return active;
}
