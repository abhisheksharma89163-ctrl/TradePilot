import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { DocumentUploader } from "./uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  weighment_slip: "Weighment slip",
  payment: "Payment",
  purchase_invoice: "Purchase invoice",
  sale_invoice: "Sale invoice",
  other: "Other",
};

export default async function DocumentsPage() {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: recent } = await supabase
    .from("documents")
    .select("id, file_name, doc_type, ocr_status, linked_to, created_at, document_date")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload slip photos — the AI reads them and fills the entry. You review
          and save.
        </p>
      </div>

      <DocumentUploader />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing uploaded yet.
            </p>
          ) : (
            recent.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.document_date
                      ? format(new Date(d.document_date), "dd MMM yyyy")
                      : format(new Date(d.created_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.doc_type && (
                    <Badge variant="secondary">
                      {TYPE_LABEL[d.doc_type] ?? d.doc_type}
                    </Badge>
                  )}
                  {d.linked_to ? (
                    <Badge variant="success">Saved</Badge>
                  ) : d.ocr_status === "failed" ? (
                    <Badge variant="destructive">Failed</Badge>
                  ) : (
                    <Badge variant="outline">Not saved</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
