"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportAll } from "./export-actions";
import { downloadFile } from "@/lib/csv";
import { Button } from "@/components/ui/button";

export function ExportAllButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await exportAll();
    setLoading(false);
    if (!res.ok || !res.files) {
      toast.error(res.error ?? "Export failed");
      return;
    }
    res.files.forEach((f) => downloadFile(f.name, f.content));
    toast.success("Backup downloaded");
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Backup all to Excel
    </Button>
  );
}
