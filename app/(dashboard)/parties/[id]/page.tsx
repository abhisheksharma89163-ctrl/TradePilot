import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Button } from "@/components/ui/button";
import { StatementView, type LedgerRow } from "./statement-view";

export const dynamic = "force-dynamic";

export default async function PartyStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (!party) notFound();

  const [{ data: company }, { data: ledger }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).single(),
    supabase
      .from("ledger_entries")
      .select("entry_date, narration, entry_type, amount, reference_number")
      .eq("company_id", companyId)
      .eq("account_type", "party")
      .eq("account_id", id)
      .order("entry_date", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{party.name}</h1>
          <p className="text-sm text-muted-foreground">Statement of account</p>
        </div>
      </div>

      <StatementView
        companyName={company?.name ?? "Company"}
        partyName={party.name}
        rows={(ledger ?? []) as unknown as LedgerRow[]}
      />
    </div>
  );
}
