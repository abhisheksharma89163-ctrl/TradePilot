"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, ImageIcon, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import type { ExtractionResult } from "@/lib/ai/ocr/types";
import { processDocument } from "./actions";
import {
  WeighmentReviewForm,
  PaymentReviewForm,
  SavedCard,
} from "./review-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "queued" | "processing" | "review" | "saved" | "error";

interface Item {
  id: string;
  file: File;
  previewUrl: string;
  status: Status;
  extraction?: ExtractionResult;
  documentId?: string;
  docType?: "weighment_slip" | "payment";
  duplicate?: boolean;
  error?: string;
}

export function DocumentUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Item[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
    }));
    setItems((prev) => [...prev, ...next]);
  }

  function update(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function readAll() {
    setRunning(true);
    // Process sequentially to stay within rate limits and memory.
    for (const it of items) {
      if (it.status !== "queued") continue;
      update(it.id, { status: "processing" });
      const fd = new FormData();
      fd.append("file", it.file);
      const res = await processDocument(fd);
      if (!res.ok || !res.extraction) {
        update(it.id, { status: "error", error: res.error ?? "Failed" });
        toast.error(`${it.file.name}: ${res.error ?? "failed"}`);
        continue;
      }
      const dt: "weighment_slip" | "payment" =
        res.extraction.document_type === "payment"
          ? "payment"
          : "weighment_slip";
      update(it.id, {
        status: "review",
        extraction: res.extraction,
        documentId: res.documentId,
        docType: dt,
        duplicate: res.duplicate,
      });
    }
    setRunning(false);
  }

  const queuedCount = items.filter((i) => i.status === "queued").length;

  return (
    <div className="space-y-5">
      {/* Upload dropzone */}
      <Card
        className="cursor-pointer border-dashed transition-colors hover:bg-accent/30"
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Tap to add slip photos</p>
          <p className="text-sm text-muted-foreground">
            Weighment slips, cheques, receipts — one or many at once. JPG / PNG.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {queuedCount > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
          <span className="text-sm">
            {queuedCount} image{queuedCount > 1 ? "s" : ""} ready
          </span>
          <Button onClick={readAll} disabled={running}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading…
              </>
            ) : (
              <>Read with AI</>
            )}
          </Button>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id} className="overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.previewUrl}
                alt={it.file.name}
                className="h-48 w-full object-contain bg-black/5"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={() => removeItem(it.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              {it.duplicate && (
                <Badge
                  variant="destructive"
                  className="absolute left-2 top-2"
                >
                  Possible duplicate
                </Badge>
              )}
            </div>

            <CardContent className="pt-4">
              {it.status === "queued" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /> Ready — click “Read with AI”.
                </p>
              )}

              {it.status === "processing" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading the
                  image…
                </p>
              )}

              {it.status === "error" && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{it.error}</span>
                </div>
              )}

              {it.status === "saved" && <SavedCard />}

              {it.status === "review" && it.extraction && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Detected:
                    </span>
                    <Button
                      size="sm"
                      variant={
                        it.docType === "weighment_slip" ? "default" : "outline"
                      }
                      onClick={() =>
                        update(it.id, { docType: "weighment_slip" })
                      }
                    >
                      Weighment slip
                    </Button>
                    <Button
                      size="sm"
                      variant={it.docType === "payment" ? "default" : "outline"}
                      onClick={() => update(it.id, { docType: "payment" })}
                    >
                      Payment
                    </Button>
                  </div>

                  <p
                    className={cn(
                      "rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                    )}
                  >
                    Yellow fields are low-confidence — please double-check them.
                  </p>

                  {it.docType === "payment" ? (
                    <PaymentReviewForm
                      extraction={it.extraction}
                      documentId={it.documentId}
                      onSaved={() => update(it.id, { status: "saved" })}
                    />
                  ) : (
                    <WeighmentReviewForm
                      extraction={it.extraction}
                      documentId={it.documentId}
                      onSaved={() => update(it.id, { status: "saved" })}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
