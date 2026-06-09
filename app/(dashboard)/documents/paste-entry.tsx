"use client";

import { useState } from "react";
import { Loader2, ClipboardPaste, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ExtractionResult } from "@/lib/ai/ocr/types";
import { processText } from "./actions";
import {
  WeighmentReviewForm,
  PaymentReviewForm,
  SavedCard,
} from "./review-forms";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Entry {
  id: string;
  extraction: ExtractionResult;
  documentId?: string;
  docType: "weighment_slip" | "payment";
  saved?: boolean;
}

const EXAMPLE =
  "e.g. <party name>, <vehicle no>, Bhusa, gross 19370 tare 9770 net 9600, rate 8.40, 03-06-26";

export function PasteEntry() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function read() {
    setLoading(true);
    setError(null);
    const res = await processText(text);
    setLoading(false);
    if (!res.ok || !res.entries) {
      setError(res.error ?? "Could not read the text.");
      toast.error(res.error ?? "Could not read the text.");
      return;
    }
    if (res.entries.length === 0) {
      setError("No entries found in that text. Try adding more detail.");
      return;
    }
    setEntries(
      res.entries.map((e, i) => ({
        id: `${Date.now()}-${i}`,
        extraction: e.extraction,
        documentId: e.documentId,
        docType:
          e.extraction.document_type === "payment"
            ? "payment"
            : "weighment_slip",
      }))
    );
    toast.success(
      `Found ${res.entries.length} entr${res.entries.length > 1 ? "ies" : "y"}`
    );
  }

  function setType(id: string, docType: Entry["docType"]) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, docType } : e))
    );
  }
  function markSaved(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, saved: true } : e))
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Paste slip or payment text here. One or many entries.\n${EXAMPLE}`}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Tip: you can paste several rows copied from Excel/WhatsApp at once.
            </p>
            <Button onClick={read} disabled={loading || text.trim().length < 3}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading…
                </>
              ) : (
                <>
                  <ClipboardPaste className="h-4 w-4" />
                  Read text with AI
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {entries.map((e) => (
          <Card key={e.id}>
            <CardContent className="space-y-3 pt-6">
              {e.saved ? (
                <SavedCard />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Button
                      size="sm"
                      variant={
                        e.docType === "weighment_slip" ? "default" : "outline"
                      }
                      onClick={() => setType(e.id, "weighment_slip")}
                    >
                      Weighment slip
                    </Button>
                    <Button
                      size="sm"
                      variant={e.docType === "payment" ? "default" : "outline"}
                      onClick={() => setType(e.id, "payment")}
                    >
                      Payment
                    </Button>
                  </div>
                  {e.docType === "payment" ? (
                    <PaymentReviewForm
                      extraction={e.extraction}
                      documentId={e.documentId}
                      onSaved={() => markSaved(e.id)}
                    />
                  ) : (
                    <WeighmentReviewForm
                      extraction={e.extraction}
                      documentId={e.documentId}
                      onSaved={() => markSaved(e.id)}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
