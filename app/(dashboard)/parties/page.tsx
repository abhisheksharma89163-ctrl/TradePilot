import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Button } from "@/components/ui/button";
import { PartiesTable } from "./parties-table";
import { PartyForm } from "./party-form";

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parties</h1>
          <p className="text-sm text-muted-foreground">
            Customers and suppliers in one place.
          </p>
        </div>
        <PartyForm
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Add party
            </Button>
          }
        />
      </div>

      <PartiesTable parties={parties ?? []} />
    </div>
  );
}
