"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TrendingUp, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { settleReceipt } from "../payments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/utils";

export interface ReceivableEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  balance_due: number;
  payment_status: string;
  due_date: string | null;
}
export interface PartyReceivable {
  partyId: string;
  partyName: string;
  total: number;
  entries: ReceivableEntry[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ReceiveDialog({ party }: { party: PartyReceivable }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await settleReceipt(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not record receipt");
        return;
      }
      toast.success("Receipt recorded");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <HandCoins className="h-4 w-4" />
          Receive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive from {party.partyName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="party_id" value={party.partyId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={party.total.toFixed(2)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Date *</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                defaultValue={todayISO()}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_mode">Mode</Label>
              <Input id="payment_mode" name="payment_mode" placeholder="neft / cheque / cash" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_name">Bank</Label>
              <Input id="bank_name" name="bank_name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utr_number">UTR / Ref</Label>
              <Input id="utr_number" name="utr_number" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cheque_number">Cheque no.</Label>
              <Input id="cheque_number" name="cheque_number" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Clears the oldest sales first. Outstanding: {formatINR(party.total)}.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Recording…" : "Record receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReceivablesView({
  receivables,
}: {
  receivables: PartyReceivable[];
}) {
  const grandTotal = receivables.reduce((s, p) => s + p.total, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5" />
          To Receive (Outstanding)
        </h2>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total to receive</p>
          <p className="text-xl font-bold text-amber-600">
            {formatINR(grandTotal)}
          </p>
        </div>
      </div>

      {receivables.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nothing outstanding from customers. 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {receivables.map((p) => (
            <Card key={p.partyId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{p.partyName}</CardTitle>
                <ReceiveDialog party={p} />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{formatINR(p.total)}</div>
                <div className="space-y-1">
                  {p.entries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(e.entry_date), "dd-MM-yy")} · {e.entry_number}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatINR(e.balance_due)}
                        <Badge variant={e.payment_status === "partial" ? "secondary" : "outline"}>
                          {e.payment_status}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
