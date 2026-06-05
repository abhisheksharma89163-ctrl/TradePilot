import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { OutstandingView, type PartyOutstanding } from "./outstanding";
import { PaymentsList, type PaymentRow } from "./payments-list";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: entries }, { data: parties }, { data: payments }] =
    await Promise.all([
      supabase
        .from("purchase_entries")
        .select(
          "id, entry_number, entry_date, supplier_id, total_amount, freight, advance_paid, balance_due, payment_status, due_date"
        )
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gt("balance_due", 0)
        .order("entry_date", { ascending: true }),
      supabase.from("parties").select("id, name").eq("company_id", companyId),
      supabase
        .from("payments")
        .select(
          "id, payment_number, payment_date, amount, payment_mode, bank_name, cheque_number, utr_number, purpose, paid_to, party_id, is_cancelled"
        )
        .eq("company_id", companyId)
        .order("payment_date", { ascending: false })
        .limit(50),
    ]);

  const nameById = new Map((parties ?? []).map((p) => [p.id, p.name]));

  // Group outstanding balances by supplier.
  const groups = new Map<string, PartyOutstanding>();
  for (const e of entries ?? []) {
    if (!e.supplier_id) continue;
    const g =
      groups.get(e.supplier_id) ??
      ({
        partyId: e.supplier_id,
        partyName: nameById.get(e.supplier_id) ?? "Unknown",
        total: 0,
        entries: [],
      } as PartyOutstanding);
    g.total += Number(e.balance_due);
    g.entries.push({
      id: e.id,
      entry_number: e.entry_number,
      entry_date: e.entry_date,
      total_amount: Number(e.total_amount),
      freight: Number(e.freight ?? 0),
      advance_paid: Number(e.advance_paid ?? 0),
      balance_due: Number(e.balance_due),
      payment_status: e.payment_status,
      due_date: e.due_date,
    });
    groups.set(e.supplier_id, g);
  }
  const outstanding = Array.from(groups.values()).sort(
    (a, b) => b.total - a.total
  );

  const paymentRows: PaymentRow[] = (payments ?? []).map((p) => ({
    ...p,
    payee: p.party_id ? nameById.get(p.party_id) ?? null : null,
  }));

  const partyOptions = (parties ?? []).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          What you still owe, and a record of everything paid.
        </p>
      </div>

      <OutstandingView outstanding={outstanding} partyOptions={partyOptions} />
      <PaymentsList payments={paymentRows} partyOptions={partyOptions} />
    </div>
  );
}
