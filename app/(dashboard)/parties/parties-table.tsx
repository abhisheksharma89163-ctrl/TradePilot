"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Party } from "@/lib/supabase/database.types";
import { deleteParty } from "./actions";
import { PartyForm } from "./party-form";
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

export function PartiesTable({ parties }: { parties: Party[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.alias?.toLowerCase().includes(q) ||
        p.gst_number?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }, [parties, query]);

  function onDelete(p: Party) {
    if (!confirm(`Archive "${p.name}"? It will be hidden but history is kept.`))
      return;
    startTransition(async () => {
      const res = await deleteParty(p.id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not archive");
        return;
      }
      toast.success("Party archived");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, GSTIN, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">GSTIN</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No parties yet. Add your first customer or supplier.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    {p.alias && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({p.alias})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.type.map((t) => (
                        <Badge
                          key={t}
                          variant={t === "customer" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {p.gst_number ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {p.phone ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.city ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatINR(p.opening_balance)}{" "}
                    <span className="text-xs text-muted-foreground">
                      {p.opening_balance_type === "credit" ? "Cr" : "Dr"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <PartyForm
                        party={p}
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
                        onClick={() => onDelete(p)}
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
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {parties.length} parties
      </p>
    </div>
  );
}
