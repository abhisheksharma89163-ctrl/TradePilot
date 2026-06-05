import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { DayBookView, type DayEntry } from "./daybook-view";

export const dynamic = "force-dynamic";

function defaultRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(first), to: iso(now) };
}

export default async function DayBookPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const dr = defaultRange();
  const from = sp.from ?? dr.from;
  const to = sp.to ?? dr.to;

  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: company }, { data: slips }, { data: payments }, { data: expenses }, { data: parties }, { data: cats }] =
    await Promise.all([
      supabase.from("companies").select("name, settings").eq("id", companyId).single(),
      supabase
        .from("weighment_slips")
        .select("slip_date, slip_number, slip_type, custom_fields")
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gte("slip_date", from)
        .lte("slip_date", to),
      supabase
        .from("payments")
        .select("payment_date, payment_number, amount, payment_type, party_id")
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gte("payment_date", from)
        .lte("payment_date", to),
      supabase
        .from("expenses")
        .select("expense_date, amount, paid_to, description, category_id")
        .eq("company_id", companyId)
        .gte("expense_date", from)
        .lte("expense_date", to),
      supabase.from("parties").select("id, name").eq("company_id", companyId),
      supabase.from("expense_categories").select("id, name").eq("company_id", companyId),
    ]);

  const nameById = new Map((parties ?? []).map((p) => [p.id, p.name]));
  const catById = new Map((cats ?? []).map((c) => [c.id, c.name]));

  const entries: DayEntry[] = [];

  for (const s of slips ?? []) {
    const cf = (s.custom_fields ?? {}) as Record<string, unknown>;
    entries.push({
      date: s.slip_date,
      type: s.slip_type === "sale" ? "Sale" : "Purchase",
      particulars: (cf.party_name as string) ?? "—",
      ref: s.slip_number ?? null,
      amount: Number((cf.amount as number) ?? 0),
    });
  }
  for (const p of payments ?? []) {
    entries.push({
      date: p.payment_date,
      type: p.payment_type === "received" ? "Receipt" : "Payment",
      particulars: p.party_id ? nameById.get(p.party_id) ?? "—" : "—",
      ref: p.payment_number,
      amount: Number(p.amount),
    });
  }
  for (const x of expenses ?? []) {
    entries.push({
      date: x.expense_date,
      type: "Expense",
      particulars:
        (x.category_id ? catById.get(x.category_id) : null) ??
        x.description ??
        x.paid_to ??
        "Expense",
      ref: null,
      amount: Number(x.amount),
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-semibold">Day Book</h1>
        <p className="text-sm text-muted-foreground">
          Every transaction in date order — purchases, payments, expenses.
        </p>
      </div>

      <DayBookView
        companyName={company?.name ?? "Company"}
        signatureUrl={
          ((company?.settings as Record<string, unknown>)?.signature as string) ??
          null
        }
        from={from}
        to={to}
        entries={entries}
      />
    </div>
  );
}
