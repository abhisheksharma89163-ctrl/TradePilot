import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { SlipsList } from "../purchases/slips-list";
import type { SlipRow } from "../purchases/slip-edit-form";
import { ReceivablesView, type PartyReceivable } from "./receivables";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { companyId, role } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: slips }, { data: entries }, { data: parties }] =
    await Promise.all([
      supabase
        .from("weighment_slips")
        .select(
          "id, slip_number, slip_date, vehicle_number, gross_weight_kg, tare_weight_kg, net_weight_kg, is_cancelled, custom_fields"
        )
        .eq("company_id", companyId)
        .eq("slip_type", "sale")
        .order("slip_date", { ascending: false }),
      supabase
        .from("sale_entries")
        .select("id, entry_number, entry_date, customer_id, balance_due, payment_status, due_date")
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gt("balance_due", 0)
        .order("entry_date", { ascending: true }),
      supabase.from("parties").select("id, name").eq("company_id", companyId),
    ]);

  const nameById = new Map((parties ?? []).map((p) => [p.id, p.name]));

  const groups = new Map<string, PartyReceivable>();
  for (const e of entries ?? []) {
    if (!e.customer_id) continue;
    const g =
      groups.get(e.customer_id) ??
      ({
        partyId: e.customer_id,
        partyName: nameById.get(e.customer_id) ?? "Unknown",
        total: 0,
        entries: [],
      } as PartyReceivable);
    g.total += Number(e.balance_due);
    g.entries.push({
      id: e.id,
      entry_number: e.entry_number,
      entry_date: e.entry_date,
      balance_due: Number(e.balance_due),
      payment_status: e.payment_status,
      due_date: e.due_date,
    });
    groups.set(e.customer_id, g);
  }
  const receivables = Array.from(groups.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Sales</h1>
        <p className="text-sm text-muted-foreground">
          What customers owe you, and every sale slip.
        </p>
      </div>

      <ReceivablesView receivables={receivables} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Sale slips</h2>
        <SlipsList
          slips={(slips ?? []) as unknown as SlipRow[]}
          isOwner={role === "owner"}
        />
      </div>
    </div>
  );
}
