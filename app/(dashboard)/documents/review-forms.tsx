"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import type { ExtractionResult } from "@/lib/ai/ocr/types";
import { saveWeighmentSlip, savePayment } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function val(ex: ExtractionResult, key: string): string {
  const v = ex.fields[key]?.value;
  return v == null ? "" : String(v);
}
function flagged(ex: ExtractionResult, key: string): boolean {
  return (ex.fields[key]?.confidence ?? 0) < 80;
}

function ReviewField({
  label,
  name,
  defaultValue,
  isFlagged,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  isFlagged?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={name}>{label}</Label>
        {isFlagged && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            check
          </Badge>
        )}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className={cn(
          isFlagged &&
            "border-yellow-500 bg-yellow-50 focus-visible:ring-yellow-500 dark:bg-yellow-950/30"
        )}
      />
    </div>
  );
}

export function WeighmentReviewForm({
  extraction,
  documentId,
  onSaved,
}: {
  extraction: ExtractionResult;
  documentId?: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gross, setGross] = useState(val(extraction, "gross_weight_kg"));
  const [tare, setTare] = useState(val(extraction, "tare_weight_kg"));

  const net =
    gross && tare ? (Number(gross) - Number(tare)).toLocaleString("en-IN") : "—";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveWeighmentSlip(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      toast.success("Weighment slip saved");
      onSaved();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {documentId && (
        <input type="hidden" name="document_id" value={documentId} />
      )}
      <input type="hidden" name="slip_type" value="purchase" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ReviewField
          label="Date *"
          name="slip_date"
          type="date"
          required
          defaultValue={extraction.document_date ?? ""}
          isFlagged={!extraction.document_date}
        />
        <ReviewField
          label="Slip number"
          name="slip_number"
          defaultValue={val(extraction, "slip_number")}
          isFlagged={flagged(extraction, "slip_number")}
        />
        <ReviewField
          label="Party / Name"
          name="party_name"
          defaultValue={val(extraction, "party_name")}
          isFlagged={flagged(extraction, "party_name")}
        />
        <ReviewField
          label="Truck / Vehicle no."
          name="vehicle_number"
          defaultValue={val(extraction, "vehicle_number")}
          isFlagged={flagged(extraction, "vehicle_number")}
        />
        <ReviewField
          label="Goods / Product"
          name="product_name"
          defaultValue={val(extraction, "product_name") || "Bhusa"}
          isFlagged={flagged(extraction, "product_name")}
        />
        <ReviewField
          label="Rate"
          name="rate"
          defaultValue={val(extraction, "rate")}
          isFlagged={flagged(extraction, "rate")}
        />

        <div className="space-y-1.5">
          <Label htmlFor="gross_weight_kg">Gross weight (kg)</Label>
          <Input
            id="gross_weight_kg"
            name="gross_weight_kg"
            inputMode="decimal"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
            className={cn(
              flagged(extraction, "gross_weight_kg") &&
                "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tare_weight_kg">Tare weight (kg)</Label>
          <Input
            id="tare_weight_kg"
            name="tare_weight_kg"
            inputMode="decimal"
            value={tare}
            onChange={(e) => setTare(e.target.value)}
            className={cn(
              flagged(extraction, "tare_weight_kg") &&
                "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Net weight (kg)</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
            {net}
          </div>
        </div>
        <ReviewField
          label="Bags / Packets"
          name="bags_count"
          defaultValue={val(extraction, "bags_count")}
          isFlagged={flagged(extraction, "bags_count")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (rate codes, times, notes)</Label>
        <Textarea
          id="remarks"
          name="remarks"
          rows={2}
          defaultValue={extraction.remarks ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        <Save className="h-4 w-4" />
        {pending ? "Saving…" : "Save weighment slip"}
      </Button>
    </form>
  );
}

export function PaymentReviewForm({
  extraction,
  documentId,
  onSaved,
}: {
  extraction: ExtractionResult;
  documentId?: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await savePayment(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      toast.success("Payment saved");
      onSaved();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {documentId && (
        <input type="hidden" name="document_id" value={documentId} />
      )}
      <input type="hidden" name="payment_type" value="made" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ReviewField
          label="Date *"
          name="payment_date"
          type="date"
          required
          defaultValue={extraction.document_date ?? ""}
          isFlagged={!extraction.document_date}
        />
        <ReviewField
          label="Amount (₹) *"
          name="amount"
          required
          defaultValue={val(extraction, "amount")}
          isFlagged={flagged(extraction, "amount")}
        />
        <ReviewField
          label="Party / Payee"
          name="party_name"
          defaultValue={val(extraction, "party_name")}
          isFlagged={flagged(extraction, "party_name")}
        />
        <ReviewField
          label="Mode (cash/cheque/neft…)"
          name="payment_mode"
          defaultValue={val(extraction, "payment_mode")}
          isFlagged={flagged(extraction, "payment_mode")}
        />
        <ReviewField
          label="Bank"
          name="bank_name"
          defaultValue={val(extraction, "bank_name")}
          isFlagged={flagged(extraction, "bank_name")}
        />
        <ReviewField
          label="Cheque no."
          name="cheque_number"
          defaultValue={val(extraction, "cheque_number")}
          isFlagged={flagged(extraction, "cheque_number")}
        />
        <ReviewField
          label="UTR / Reference"
          name="utr_number"
          defaultValue={val(extraction, "utr_number")}
          isFlagged={flagged(extraction, "utr_number")}
        />
        <ReviewField
          label="Purpose"
          name="purpose"
          defaultValue={val(extraction, "purpose")}
          isFlagged={flagged(extraction, "purpose")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p_remarks">Remarks</Label>
        <Textarea
          id="p_remarks"
          name="remarks"
          rows={2}
          defaultValue={extraction.remarks ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        <Save className="h-4 w-4" />
        {pending ? "Saving…" : "Save payment"}
      </Button>
    </form>
  );
}

export function SavedCard() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      <p className="font-medium">Saved to your records</p>
      <p className="text-sm text-muted-foreground">
        View it in Reports or the relevant module.
      </p>
    </div>
  );
}
