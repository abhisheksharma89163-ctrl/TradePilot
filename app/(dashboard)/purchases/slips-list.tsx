"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, RotateCcw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelSlip, restoreSlip, deleteSlipPermanent } from "./actions";
import { SlipEditForm, type SlipRow } from "./slip-edit-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function SlipsList({
  slips,
  isOwner,
  isSale = false,
}: {
  slips: SlipRow[];
  isOwner: boolean;
  isSale?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [pending, startTransition] = useTransition();

  function deleteForever(s: SlipRow) {
    if (
      !confirm(
        "Permanently delete this slip? This CANNOT be undone and removes it from all reports and balances."
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteSlipPermanent(s.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Permanently deleted");
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slips.filter((s) => {
      if (s.is_cancelled !== showTrash) return false;
      if (!q) return true;
      const cf = s.custom_fields ?? {};
      return (
        s.slip_number?.toLowerCase().includes(q) ||
        s.vehicle_number?.toLowerCase().includes(q) ||
        cf.party_name?.toLowerCase().includes(q)
      );
    });
  }, [slips, query, showTrash]);

  function trash(s: SlipRow) {
    if (!confirm("Move this slip to trash? Its balance is removed from reports."))
      return;
    startTransition(async () => {
      const res = await cancelSlip(s.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Moved to trash");
      router.refresh();
    });
  }
  function restore(s: SlipRow) {
    startTransition(async () => {
      const res = await restoreSlip(s.id);
      if (!res.ok) return toast.error(res.error ?? "Failed");
      toast.success("Restored");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search party, vehicle, slip #…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant={showTrash ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTrash((v) => !v)}
        >
          {showTrash ? "Showing trash" : "View trash"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Slip #</TableHead>
              <TableHead>Party</TableHead>
              <TableHead className="hidden md:table-cell">Vehicle</TableHead>
              <TableHead className="text-right">Net (kg)</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {showTrash ? "Trash is empty." : "No slips yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const cf = s.custom_fields ?? {};
                return (
                  <TableRow key={s.id}>
                    <TableCell>{format(new Date(s.slip_date), "dd-MM-yy")}</TableCell>
                    <TableCell>{s.slip_number ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      {cf.party_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.vehicle_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.net_weight_kg?.toLocaleString("en-IN") ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {cf.balance_due != null ? (
                        <Badge
                          variant={cf.balance_due > 0 ? "secondary" : "success"}
                        >
                          {formatINR(cf.balance_due)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {showTrash ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={pending}
                              onClick={() => restore(s)}
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={pending}
                                onClick={() => deleteForever(s)}
                                title="Delete permanently (owner)"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <SlipEditForm slip={s} isSale={isSale} />
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={pending}
                              onClick={() => trash(s)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
