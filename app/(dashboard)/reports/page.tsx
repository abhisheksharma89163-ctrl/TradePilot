import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { ReportView, type SlipRow, type PaymentRow } from "./report-view";

export const dynamic = "force-dynamic";

function defaultRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(first), to: iso(now) };
}

export default async function ReportsPage({
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

  const [{ data: company }, { data: slips }, { data: payments }, { data: parties }] =
    await Promise.all([
      supabase.from("companies").select("name, settings").eq("id", companyId).single(),
      supabase
        .from("weighment_slips")
        .select(
          "slip_date, slip_number, slip_type, vehicle_number, gross_weight_kg, tare_weight_kg, net_weight_kg, remarks, custom_fields"
        )
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gte("slip_date", from)
        .lte("slip_date", to)
        .order("slip_date", { ascending: true }),
      supabase
        .from("payments")
        .select(
          "payment_date, payment_number, amount, payment_mode, bank_name, purpose, paid_to, party_id"
        )
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gte("payment_date", from)
        .lte("payment_date", to)
        .order("payment_date", { ascending: true }),
      supabase
        .from("parties")
        .select("id, name")
        .eq("company_id", companyId),
    ]);

  const nameById = new Map((parties ?? []).map((p) => [p.id, p.name]));
  const paymentRows = (payments ?? []).map((p) => ({
    payment_date: p.payment_date,
    payment_number: p.payment_number,
    amount: p.amount,
    payment_mode: p.payment_mode,
    bank_name: p.bank_name,
    purpose: p.purpose,
    paid_to: p.paid_to,
    payee: p.party_id ? nameById.get(p.party_id) ?? null : null,
  }));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Pick a date range and download a clean, date-wise PDF.
        </p>
      </div>

      <ReportView
        companyName={company?.name ?? "Company"}
        signatureUrl={
          ((company?.settings as Record<string, unknown>)?.signature as string) ??
          null
        }
        from={from}
        to={to}
        slips={(slips ?? []) as unknown as SlipRow[]}
        payments={paymentRows as unknown as PaymentRow[]}
      />
    </div>
  );
}
