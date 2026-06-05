"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { partySchema, type PartyInput } from "@/lib/validations/party";
import { createParty, updateParty } from "./actions";
import type { Party } from "@/lib/supabase/database.types";
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

export function PartyForm({
  party,
  trigger,
}: {
  party?: Party;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PartyInput>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      type: (party?.type as ("customer" | "supplier")[]) ?? ["supplier"],
      name: party?.name ?? "",
      alias: party?.alias ?? "",
      gst_number: party?.gst_number ?? "",
      pan_number: party?.pan_number ?? "",
      phone: party?.phone ?? "",
      whatsapp: party?.whatsapp ?? "",
      email: party?.email ?? "",
      address_line1: party?.address_line1 ?? "",
      city: party?.city ?? "",
      state: party?.state ?? "",
      state_code: party?.state_code ?? "",
      pincode: party?.pincode ?? "",
      bank_name: party?.bank_name ?? "",
      bank_account: party?.bank_account ?? "",
      bank_ifsc: party?.bank_ifsc ?? "",
      credit_limit: party?.credit_limit ?? 0,
      credit_days: party?.credit_days ?? 0,
      opening_balance: party?.opening_balance ?? 0,
      opening_balance_type:
        (party?.opening_balance_type as "debit" | "credit") ?? "debit",
      notes: party?.notes ?? "",
    },
  });

  const types = watch("type");

  function toggleType(t: "customer" | "supplier") {
    const set = new Set(types);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    setValue("type", Array.from(set) as ("customer" | "supplier")[], {
      shouldValidate: true,
    });
  }

  function onSubmit(values: PartyInput) {
    const fd = new FormData();
    values.type.forEach((t) => fd.append("type", t));
    Object.entries(values).forEach(([k, v]) => {
      if (k === "type") return;
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });

    startTransition(async () => {
      const res = party
        ? await updateParty(party.id, fd)
        : await createParty(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Validation failed");
        return;
      }
      toast.success(party ? "Party updated" : "Party created");
      setOpen(false);
      if (!party) reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{party ? "Edit party" : "Add party"}</DialogTitle>
          <DialogDescription>
            Customers and suppliers share one record. A party can be both.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Type" error={errors.type?.message}>
            <div className="flex gap-2">
              {(["customer", "supplier"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={types.includes(t) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(t)}
                  className="capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Sharma Traders" />
            </Field>
            <Field label="Alias / short name" error={errors.alias?.message}>
              <Input {...register("alias")} />
            </Field>
            <Field label="GSTIN" error={errors.gst_number?.message}>
              <Input {...register("gst_number")} placeholder="09ABCDE1234F1Z5" />
            </Field>
            <Field label="PAN" error={errors.pan_number?.message}>
              <Input {...register("pan_number")} placeholder="ABCDE1234F" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="9876543210" />
            </Field>
            <Field label="WhatsApp" error={errors.whatsapp?.message}>
              <Input {...register("whatsapp")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register("city")} />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <Input {...register("state")} placeholder="Uttar Pradesh" />
            </Field>
            <Field label="State code (GST)" error={errors.state_code?.message}>
              <Input {...register("state_code")} placeholder="09" />
            </Field>
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input {...register("pincode")} placeholder="226001" />
            </Field>
            <Field label="Address" error={errors.address_line1?.message}>
              <Input {...register("address_line1")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Bank name" error={errors.bank_name?.message}>
              <Input {...register("bank_name")} />
            </Field>
            <Field label="Account no." error={errors.bank_account?.message}>
              <Input {...register("bank_account")} />
            </Field>
            <Field label="IFSC" error={errors.bank_ifsc?.message}>
              <Input {...register("bank_ifsc")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Credit limit (₹)" error={errors.credit_limit?.message}>
              <Input type="number" step="0.01" {...register("credit_limit")} />
            </Field>
            <Field label="Credit days" error={errors.credit_days?.message}>
              <Input type="number" {...register("credit_days")} />
            </Field>
            <Field label="Opening balance (₹)" error={errors.opening_balance?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("opening_balance")}
              />
            </Field>
            <Field label="Balance type">
              <Select
                defaultValue={watch("opening_balance_type")}
                onValueChange={(v) =>
                  setValue("opening_balance_type", v as "debit" | "credit")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit (they owe us)</SelectItem>
                  <SelectItem value="credit">Credit (we owe them)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea {...register("notes")} rows={2} />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : party ? "Save changes" : "Create party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
