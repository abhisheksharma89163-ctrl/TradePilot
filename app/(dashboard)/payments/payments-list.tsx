"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2, RotateCcw, Receipt, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  updatePayment,
  cancelPayment,
  restorePayment,
  deletePaymentPermanent,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/utils";

export interface PaymentRow {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  bank_name: string | null;
  cheque_number: string | null;
  utr_number: string | null;
  purpose: string | null;
  paid_to: string | null;
  party_id: string | null;
  is_cancelled: boolean;
  payee: string | null;
}

function EditDialog({ p }: { p: PaymentRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePayment(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not update");
        return;
      }
      toast.success("Payment updated");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit payment {p.payment_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Date</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                defaultValue={p.payment_date}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={String(p.amount)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paid_to">Paid to (line)</Label>
              <Input id="paid_to" name="paid_to" defaultValue={p.paid_to ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_mode">Mode</Label>
              <Input
                id="payment_mode"
                name="payment_mode"
                defaultValue={p.payment_mode ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_name">Bank</Label>
              <Input id="bank_name" name="bank_name" defaultValue={p.bank_name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cheque_number">Cheque no.</Label>
              <Input
                id="cheque_number"
                name="cheque_number"
                defaultValue={p.cheque_number ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utr_number">UTR / Ref</Label>
              <Input
                id="utr_number"
                name="utr_number"
                defaultValue={p.utr_number ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose</Label>
              <Input id="purpose" name="purpose" defaultValue={p.purpose ?? ""} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Changing the amount re-applies it against this party&apos;s
            outstanding slips.
          </p>
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

export function PaymentsList({
  payments,
  isOwner,
}: {
  payments: PaymentRow[];
  partyOptions: { id: string; name: string }[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function deleteForever(p: PaymentRow) {
    if (
      !confirm(
        "Permanently delete this payment? This CANNOT be undone. Any cleared balances will be restored."
      )
    )
      return;
    startTransition(async () => {
      const res = await deletePaymentPermanent(p.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Permanently deleted");
      router.refresh();
    });
  }

  function trash(p: PaymentRow) {
    if (!confirm(`Move payment ${p.payment_number} to trash?`)) return;
    startTransition(async () => {
      const res = await cancelPayment(p.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Moved to trash");
      router.refresh();
    });
  }
  function restore(p: PaymentRow) {
    startTransition(async () => {
      const res = await restorePayment(p.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Restored");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Recorded payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Paid to</TableHead>
                  <TableHead className="hidden sm:table-cell">Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No payments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow
                      key={p.id}
                      className={p.is_cancelled ? "opacity-50" : ""}
                    >
                      <TableCell>
                        {format(new Date(p.payment_date), "dd-MM-yy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {p.payee ?? "—"}
                          {p.is_cancelled && (
                            <Badge variant="destructive" className="ml-2">
                              trashed
                            </Badge>
                          )}
                        </div>
                        {p.paid_to && (
                          <div className="text-xs text-muted-foreground">
                            {p.paid_to}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {p.payment_mode ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(p.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {p.is_cancelled ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={pending}
                                onClick={() => restore(p)}
                                title="Restore"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={pending}
                                  onClick={() => deleteForever(p)}
                                  title="Delete permanently (owner)"
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <EditDialog p={p} />
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={pending}
                                onClick={() => trash(p)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
