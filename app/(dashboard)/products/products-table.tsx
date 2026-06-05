"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductCategory } from "@/lib/supabase/database.types";
import { deleteProduct } from "./actions";
import { ProductForm } from "./product-form";
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

export function ProductsTable({
  products,
  categories,
}: {
  products: Product[];
  categories: ProductCategory[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.hsn_code?.includes(q)
    );
  }, [products, query]);

  function onDelete(p: Product) {
    if (!confirm(`Archive "${p.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not archive");
        return;
      }
      toast.success("Product archived");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, code, HSN…"
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
              <TableHead className="hidden sm:table-cell">Code</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="hidden sm:table-cell">HSN</TableHead>
              <TableHead className="text-right">GST</TableHead>
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
                  No products yet. Add your first product.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {p.code ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {categoryName(p.category_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.unit}</Badge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {p.hsn_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{p.gst_rate}%</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ProductForm
                        product={p}
                        categories={categories}
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
        {filtered.length} of {products.length} products
      </p>
    </div>
  );
}
