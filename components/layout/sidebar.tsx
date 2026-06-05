"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Boxes,
  Truck,
  Users,
  Wallet,
  Landmark,
  BookOpen,
  BookText,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: TrendingUp },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/vehicles", label: "Vehicles", icon: Truck },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/bank", label: "Bank", icon: Landmark },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/daybook", label: "Day Book", icon: BookText },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/settings/company", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="mb-4 flex items-center gap-2 px-2 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          B
        </div>
        <span className="text-lg font-semibold">BOS</span>
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
