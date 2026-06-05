import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureUploader } from "./signature-uploader";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const { companyId, role } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("name, gst_number, settings")
    .eq("id", companyId)
    .single();

  const settings = (company?.settings as Record<string, unknown>) ?? {};
  const signature = (settings.signature as string) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">{company?.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signature</CardTitle>
          <CardDescription>
            This appears above &ldquo;For {company?.name}&rdquo; on every PDF
            (reports, party statements, day book).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {role === "owner" ? (
            <SignatureUploader current={signature} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the company owner can change the signature.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
