import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  ShoppingCart,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { ExportAllButton } from "./export-all-button";

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "parties" | "products" | "weighment_slips",
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

  const today = new Date().toISOString().slice(0, 10);

  const [parties, slips, { data: outstanding }, { data: receivable }, { data: parties2 }] =
    await Promise.all([
      count(supabase, "parties", companyId),
      count(supabase, "weighment_slips", companyId),
      supabase
        .from("purchase_entries")
        .select("supplier_id, balance_due, due_date")
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gt("balance_due", 0),
      supabase
        .from("sale_entries")
        .select("balance_due")
        .eq("company_id", companyId)
        .eq("is_cancelled", false)
        .gt("balance_due", 0),
      supabase.from("parties").select("id, name").eq("company_id", companyId),
    ]);

  const nameById = new Map((parties2 ?? []).map((p) => [p.id, p.name]));
  const totalToPay = (outstanding ?? []).reduce(
    (s, e) => s + Number(e.balance_due),
    0
  );
  const totalToReceive = (receivable ?? []).reduce(
    (s, e) => s + Number(e.balance_due),
    0
  );
  const overdue = (outstanding ?? []).filter(
    (e) => e.due_date && e.due_date < today
  );
  const overdueTotal = overdue.reduce((s, e) => s + Number(e.balance_due), 0);

  const cards = [
    { label: "Parties", value: String(parties), href: "/parties", icon: Users },
    {
      label: "Slips",
      value: String(slips),
      href: "/purchases",
      icon: ShoppingCart,
    },
    {
      label: "To Pay",
      value: formatINR(totalToPay),
      href: "/payments",
      icon: Wallet,
      accent: "pay" as const,
    },
    {
      label: "To Receive",
      value: formatINR(totalToReceive),
      href: "/sales",
      icon: TrendingUp,
      accent: "receive" as const,
    },
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
        {cards.map(({ label, value, href, icon: Icon, accent }) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={
                    accent === "pay"
                      ? "text-2xl font-bold text-destructive"
                      : accent === "receive"
                        ? "text-2xl font-bold text-amber-600"
                        : "text-3xl font-bold"
                  }
                >
                  {value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue payments — {formatINR(overdueTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {overdue.slice(0, 6).map((e, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {e.supplier_id ? nameById.get(e.supplier_id) ?? "—" : "—"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    due {e.due_date ? format(new Date(e.due_date), "dd MMM") : ""}
                  </span>
                </span>
                <span className="font-medium">{formatINR(e.balance_due)}</span>
              </div>
            ))}
            <Link
              href="/payments"
              className="inline-block pt-1 text-sm text-primary hover:underline"
            >
              Go to Payments →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <ExportAllButton />
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/documents" className="text-primary hover:underline">
            Upload / paste slips
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/payments" className="text-primary hover:underline">
            See what you owe
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/reports" className="text-primary hover:underline">
            Download report
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
