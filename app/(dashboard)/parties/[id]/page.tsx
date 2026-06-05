import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Button } from "@/components/ui/button";
import {
  PartyFolderView,
  type FolderSlip,
  type FolderPayment,
  type FolderLedger,
  type PartyInfo,
} from "./party-folder-view";

export const dynamic = "force-dynamic";

export default async function PartyFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, name, gst_number, phone, city, state")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (!party) notFound();

  const [{ data: company }, { data: slips }, { data: payments }, { data: ledger }] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", companyId).single(),
      supabase
        .from("weighment_slips")
        .select("slip_date, slip_number, vehicle_number, net_weight_kg, custom_fields")
        .eq("company_id", companyId)
        .eq("party_id", id)
        .eq("is_cancelled", false)
        .order("slip_date", { ascending: true }),
      supabase
        .from("payments")
        .select("payment_date, payment_number, amount, payment_mode, bank_name, paid_to")
        .eq("company_id", companyId)
        .eq("party_id", id)
        .eq("is_cancelled", false)
        .order("payment_date", { ascending: true }),
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
          <p className="text-sm text-muted-foreground">Account folder</p>
        </div>
      </div>

      <PartyFolderView
        companyName={company?.name ?? "Company"}
        party={party as unknown as PartyInfo}
        slips={(slips ?? []) as unknown as FolderSlip[]}
        payments={(payments ?? []) as unknown as FolderPayment[]}
        ledger={(ledger ?? []) as unknown as FolderLedger[]}
      />
    </div>
  );
}
