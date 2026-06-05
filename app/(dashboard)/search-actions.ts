"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";

export interface SearchHit {
  label: string;
  sub: string;
  href: string;
  group: "Parties" | "Vehicles" | "Slips" | "Payments";
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();
    const like = `%${q}%`;
    const hits: SearchHit[] = [];

    const [parties, vehicles, slips, payments] = await Promise.all([
      supabase
        .from("parties")
        .select("id, name, phone, gst_number")
        .eq("company_id", companyId)
        .or(`name.ilike.${like},phone.ilike.${like},gst_number.ilike.${like}`)
        .limit(6),
      supabase
        .from("vehicles")
        .select("id, vehicle_number, owner_name")
        .eq("company_id", companyId)
        .ilike("vehicle_number", like)
        .limit(5),
      supabase
        .from("weighment_slips")
        .select("id, slip_number, vehicle_number, slip_date, custom_fields")
        .eq("company_id", companyId)
        .or(`slip_number.ilike.${like},vehicle_number.ilike.${like}`)
        .limit(6),
      supabase
        .from("payments")
        .select("id, payment_number, paid_to, amount")
        .eq("company_id", companyId)
        .or(`payment_number.ilike.${like},paid_to.ilike.${like},utr_number.ilike.${like}`)
        .limit(6),
    ]);

    for (const p of parties.data ?? [])
      hits.push({
        group: "Parties",
        label: p.name,
        sub: p.phone ?? p.gst_number ?? "Party",
        href: `/parties/${p.id}`,
      });
    for (const v of vehicles.data ?? [])
      hits.push({
        group: "Vehicles",
        label: v.vehicle_number,
        sub: v.owner_name ?? "Vehicle",
        href: `/vehicles`,
      });
    for (const s of slips.data ?? []) {
      const cf = (s.custom_fields ?? {}) as Record<string, unknown>;
      hits.push({
        group: "Slips",
        label: `Slip ${s.slip_number ?? "—"} · ${s.vehicle_number ?? ""}`,
        sub: (cf.party_name as string) ?? s.slip_date,
        href: `/purchases`,
      });
    }
    for (const p of payments.data ?? [])
      hits.push({
        group: "Payments",
        label: `${p.paid_to ?? p.payment_number}`,
        sub: `₹${p.amount}`,
        href: `/payments`,
      });

    return hits;
  } catch {
    return [];
  }
}
