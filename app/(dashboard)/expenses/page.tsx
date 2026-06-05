import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Button } from "@/components/ui/button";
import { ExpensesList } from "./expenses-list";
import { ExpenseForm, type ExpenseRow } from "./expense-form";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: expenses }, { data: cats }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, expense_date, amount, paid_to, description, category_id")
      .eq("company_id", companyId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("company_id", companyId),
  ]);

  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const rows: ExpenseRow[] = (expenses ?? []).map((x) => ({
    id: x.id,
    expense_date: x.expense_date,
    amount: x.amount,
    paid_to: x.paid_to,
    description: x.description,
    category: x.category_id ? catName.get(x.category_id) ?? null : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Diesel, freight, labour and more — tracked for your profit view.
          </p>
        </div>
        <ExpenseForm
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
          }
        />
      </div>

      <ExpensesList expenses={rows} />
    </div>
  );
}
