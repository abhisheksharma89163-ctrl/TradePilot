import Link from "next/link";
import { Users, Boxes, ShoppingCart, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "parties" | "products" | "purchase_entries" | "sale_entries",
  companyId: string
) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  return count ?? 0;
}

export default async function DashboardPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [parties, products, purchases, sales] = await Promise.all([
    count(supabase, "parties", companyId),
    count(supabase, "products", companyId),
    count(supabase, "purchase_entries", companyId),
    count(supabase, "sale_entries", companyId),
  ]);

  const cards = [
    { label: "Parties", value: parties, href: "/parties", icon: Users },
    { label: "Products", value: products, href: "/products", icon: Boxes },
    {
      label: "Purchases",
      value: purchases,
      href: "/purchases",
      icon: ShoppingCart,
    },
    { label: "Sales", value: sales, href: "/sales", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today&apos;s snapshot of your operations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This is the MVP foundation. The{" "}
            <Link href="/parties" className="text-primary hover:underline">
              Parties
            </Link>{" "}
            and{" "}
            <Link href="/products" className="text-primary hover:underline">
              Products
            </Link>{" "}
            modules are fully built as reference implementations — full CRUD,
            server-side validation, and audit logging.
          </p>
          <p>
            Remaining modules (purchases, sales, payments, OCR, GST, reports)
            follow the same pattern against the schema already migrated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
