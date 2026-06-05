"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateSlip } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/utils";

export interface SlipRow {
  id: string;
  slip_number: string | null;
  slip_date: string;
  vehicle_number: string | null;
  gross_weight_kg: number | null;
  tare_weight_kg: number | null;
  net_weight_kg: number | null;
  is_cancelled: boolean;
  custom_fields: {
    party_name?: string;
    product_name?: string;
    rate?: string | number;
    amount?: number;
    freight?: number;
    advance_paid?: number;
    balance_due?: number;
  } | null;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={onChange ? undefined : defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </div>
  );
}

export function SlipEditForm({ slip }: { slip: SlipRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const cf = slip.custom_fields ?? {};

  const [gross, setGross] = useState(String(slip.gross_weight_kg ?? ""));
  const [tare, setTare] = useState(String(slip.tare_weight_kg ?? ""));
  const [rate, setRate] = useState(String(cf.rate ?? ""));
  const [amount, setAmount] = useState(String(cf.amount ?? ""));
  const [freight, setFreight] = useState(String(cf.freight ?? ""));
  const [advance, setAdvance] = useState(String(cf.advance_paid ?? ""));

  const net =
    gross !== "" && tare !== "" ? Number(gross) - Number(tare) : null;
  const balance =
    amount !== ""
      ? Number(amount) - (Number(freight) || 0) - (Number(advance) || 0)
      : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSlip(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      toast.success("Slip updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit weighment slip</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={slip.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" name="slip_date" type="date" defaultValue={slip.slip_date} />
            <Field label="Slip number" name="slip_number" defaultValue={slip.slip_number ?? ""} />
            <Field label="Party" name="party_name" defaultValue={cf.party_name ?? ""} />
            <Field label="Vehicle" name="vehicle_number" defaultValue={slip.vehicle_number ?? ""} />
            <Field label="Product" name="product_name" defaultValue={cf.product_name ?? ""} />
            <Field label="Rate (₹/kg)" name="rate" value={rate} onChange={setRate} />
            <Field label="Gross (kg)" name="gross_weight_kg" value={gross} onChange={setGross} />
            <Field label="Tare (kg)" name="tare_weight_kg" value={tare} onChange={setTare} />
            <div className="space-y-1.5">
              <Label>Net (kg)</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                {net != null ? net.toLocaleString("en-IN") : "—"}
              </div>
            </div>
            <Field label="Goods value (₹)" name="amount" value={amount} onChange={setAmount} />
            <Field label="− Freight (₹)" name="freight" value={freight} onChange={setFreight} />
            <Field label="− Advance paid (₹)" name="advance_paid" value={advance} onChange={setAdvance} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" rows={2} />
          </div>
          {balance != null && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">Balance to pay</span>
              <span className="text-lg font-bold">{formatINR(balance)}</span>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
