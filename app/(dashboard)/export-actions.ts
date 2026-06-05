"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveCompany } from "@/lib/auth/company";
import { toCsv } from "@/lib/csv";

export interface ExportFile {
  name: string;
  content: string;
}
export interface ExportResult {
  ok: boolean;
  error?: string;
  files?: ExportFile[];
}

/** Builds CSV backups of parties, slips and payments for the active company. */
export async function exportAll(): Promise<ExportResult> {
  try {
    const { companyId } = await requireActiveCompany();
    const supabase = await createClient();

    const [{ data: parties }, { data: slips }, { data: payments }] =
      await Promise.all([
        supabase
          .from("parties")
          .select("name, type, gst_number, phone, city, state, opening_balance")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("weighment_slips")
          .select(
            "slip_date, slip_number, vehicle_number, net_weight_kg, custom_fields, is_cancelled"
          )
          .eq("company_id", companyId)
          .order("slip_date", { ascending: true }),
        supabase
          .from("payments")
          .select(
            "payment_date, payment_number, amount, payment_mode, bank_name, paid_to, party_id, is_cancelled"
          )
          .eq("company_id", companyId)
          .order("payment_date", { ascending: true }),
      ]);

    const { data: partyIds } = await supabase
      .from("parties")
      .select("id, name")
      .eq("company_id", companyId);
    const idToName = new Map((partyIds ?? []).map((p) => [p.id, p.name]));

    const partiesCsv = toCsv(
      ["Name", "Type", "GSTIN", "Phone", "City", "State", "Opening balance"],
      (parties ?? []).map((p) => [
        p.name,
        Array.isArray(p.type) ? p.type.join("+") : p.type,
        p.gst_number ?? "",
        p.phone ?? "",
        p.city ?? "",
        p.state ?? "",
        p.opening_balance ?? 0,
      ])
    );

    const slipsCsv = toCsv(
      ["Date", "Slip #", "Party", "Vehicle", "Product", "Net kg", "Goods ₹", "Freight ₹", "Advance ₹", "Balance ₹", "Status"],
      (slips ?? []).map((s) => {
        const cf = (s.custom_fields ?? {}) as Record<string, unknown>;
        return [
          s.slip_date,
          s.slip_number ?? "",
          (cf.party_name as string) ?? "",
          s.vehicle_number ?? "",
          (cf.product_name as string) ?? "",
          s.net_weight_kg ?? "",
          (cf.amount as number) ?? "",
          (cf.freight as number) ?? "",
          (cf.advance_paid as number) ?? "",
          (cf.balance_due as number) ?? "",
          s.is_cancelled ? "TRASHED" : "active",
        ];
      })
    );

    const paymentsCsv = toCsv(
      ["Date", "Payment #", "Paid to", "Mode", "Bank", "Pay-to line", "Amount ₹", "Status"],
      (payments ?? []).map((p) => [
        p.payment_date,
        p.payment_number,
        p.party_id ? idToName.get(p.party_id) ?? "" : "",
        p.payment_mode ?? "",
        p.bank_name ?? "",
        p.paid_to ?? "",
        p.amount,
        p.is_cancelled ? "TRASHED" : "active",
      ])
    );

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      files: [
        { name: `parties_${stamp}.csv`, content: partiesCsv },
        { name: `slips_${stamp}.csv`, content: slipsCsv },
        { name: `payments_${stamp}.csv`, content: paymentsCsv },
      ],
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
