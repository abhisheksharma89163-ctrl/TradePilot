import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "./products-table";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("product_categories")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Your tradeable catalog — unlimited products and categories.
          </p>
        </div>
        <ProductForm
          categories={categories ?? []}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          }
        />
      </div>

      <ProductsTable
        products={products ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
