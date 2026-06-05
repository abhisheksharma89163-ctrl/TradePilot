import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { SlipsList } from "./slips-list";
import type { SlipRow } from "./slip-edit-form";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: slips } = await supabase
    .from("weighment_slips")
    .select(
      "id, slip_number, slip_date, vehicle_number, gross_weight_kg, tare_weight_kg, net_weight_kg, is_cancelled, custom_fields"
    )
    .eq("company_id", companyId)
    .eq("slip_type", "purchase")
    .order("slip_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Purchases</h1>
        <p className="text-sm text-muted-foreground">
          Every saved weighment slip — edit, correct, or move to trash.
        </p>
      </div>

      <SlipsList slips={(slips ?? []) as unknown as SlipRow[]} />
    </div>
  );
}
