"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown when the signed-in user belongs to no company.
 * Creates a company and an owner membership in one step.
 */
export function OnboardingCompany() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error("Session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single();

    if (companyError || !company) {
      setLoading(false);
      toast.error(companyError?.message ?? "Could not create company");
      return;
    }

    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: "owner",
        is_active: true,
      });

    setLoading(false);
    if (memberError) {
      toast.error(memberError.message);
      return;
    }

    toast.success("Company created");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your company</CardTitle>
        <CardDescription>
          BOS is multi-company. This becomes your first workspace — you can add
          more later from Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={createCompany} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company name</Label>
            <Input
              id="company"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma Trading Co."
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create company"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
