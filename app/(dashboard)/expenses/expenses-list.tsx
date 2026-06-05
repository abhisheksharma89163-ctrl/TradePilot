"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "./actions";
import { ExpenseForm, type ExpenseRow } from "./expense-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/utils";

export function ExpensesList({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(x: ExpenseRow) {
    if (!confirm("Delete this expense?")) return;
    startTransition(async () => {
      const res = await deleteExpense(x.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Deleted");
      router.refresh();
    });
  }

  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Paid to</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No expenses yet.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>{format(new Date(x.expense_date), "dd-MM-yy")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{x.category ?? "General"}</Badge>
                  </TableCell>
                  <TableCell>{x.paid_to ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {x.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatINR(x.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ExpenseForm
                        expense={x}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() => remove(x)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end text-sm font-semibold">
        Total expenses: {formatINR(total)}
      </div>
    </div>
  );
}
