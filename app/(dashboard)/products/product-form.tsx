"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { UNITS, GST_RATES } from "@/lib/constants";
import { createProduct, updateProduct } from "./actions";
import type { Product, ProductCategory } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const NONE = "__none__";

export function ProductForm({
  product,
  categories,
  trigger,
}: {
  product?: Product;
  categories: ProductCategory[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      code: product?.code ?? "",
      category_id: product?.category_id ?? undefined,
      hsn_code: product?.hsn_code ?? "",
      unit: (product?.unit as (typeof UNITS)[number]) ?? "KG",
      gst_rate: product?.gst_rate ?? 0,
      description: product?.description ?? "",
    },
  });

  function onSubmit(values: ProductInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    startTransition(async () => {
      const res = product
        ? await updateProduct(product.id, fd)
        : await createProduct(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Validation failed");
        return;
      }
      toast.success(product ? "Product updated" : "Product created");
      setOpen(false);
      if (!product) reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            Unlimited products. HSN and GST rate drive tax calculation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Rice Husk" />
            </Field>
            <Field label="Code" error={errors.code?.message}>
              <Input {...register("code")} placeholder="RH-001" />
            </Field>

            <Field label="Category">
              <Select
                defaultValue={product?.category_id ?? NONE}
                onValueChange={(v) =>
                  setValue("category_id", v === NONE ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Unit">
              <Select
                defaultValue={watch("unit")}
                onValueChange={(v) =>
                  setValue("unit", v as (typeof UNITS)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="HSN code" error={errors.hsn_code?.message}>
              <Input {...register("hsn_code")} placeholder="2302" />
            </Field>

            <Field label="GST rate (%)">
              <Select
                defaultValue={String(watch("gst_rate") ?? 0)}
                onValueChange={(v) =>
                  setValue("gst_rate", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GST_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register("description")} rows={2} />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
