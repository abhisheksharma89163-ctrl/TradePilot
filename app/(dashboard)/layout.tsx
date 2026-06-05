import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/auth/company";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OnboardingCompany } from "./onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveCompany();

  // No company yet -> onboarding (still inside the authed shell).
  if (!active) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <OnboardingCompany />
      </div>
    );
  }

  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", active.companyId).single(),
    supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          companyName={company?.name ?? "Company"}
          userName={profile?.full_name ?? user.email ?? "User"}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
