"use client";

import { format } from "date-fns";
import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { toCsv, downloadFile } from "@/lib/csv";

export interface FolderSlip {
  slip_date: string;
  slip_number: string | null;
  vehicle_number: string | null;
  net_weight_kg: number | null;
  custom_fields: {
    product_name?: string;
    rate?: string | number;
    amount?: number;
    freight?: number;
    advance_paid?: number;
    balance_due?: number;
  } | null;
}
export interface FolderPayment {
  payment_date: string;
  payment_number: string;
  amount: number;
  payment_mode: string | null;
  bank_name: string | null;
  paid_to: string | null;
}
export interface FolderLedger {
  entry_date: string;
  narration: string | null;
  entry_type: string;
  amount: number;
  reference_number: string | null;
}
export interface PartyInfo {
  name: string;
  gst_number: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export function PartyFolderView({
  companyName,
  party,
  slips,
  payments,
  ledger,
}: {
  companyName: string;
  party: PartyInfo;
  slips: FolderSlip[];
  payments: FolderPayment[];
  ledger: FolderLedger[];
}) {
  // Running balance: credit = we owe (payable), debit = reduces it.
  let running = 0;
  const withBalance = ledger.map((r) => {
    running += (r.entry_type === "credit" ? 1 : -1) * Number(r.amount);
    return { ...r, balance: running };
  });
  const balanceLabel =
    running > 0
      ? `Payable (we owe): ${formatINR(running)}`
      : running < 0
        ? `Receivable (they owe): ${formatINR(-running)}`
        : "Settled: ₹0";

  function exportExcel() {
    const slipCsv = toCsv(
      ["Date", "Slip #", "Vehicle", "Product", "Net (kg)", "Goods ₹", "Freight ₹", "Advance ₹", "Balance ₹"],
      slips.map((s) => [
        s.slip_date,
        s.slip_number ?? "",
        s.vehicle_number ?? "",
        s.custom_fields?.product_name ?? "",
        s.net_weight_kg ?? "",
        s.custom_fields?.amount ?? "",
        s.custom_fields?.freight ?? "",
        s.custom_fields?.advance_paid ?? "",
        s.custom_fields?.balance_due ?? "",
      ])
    );
    const payCsv = toCsv(
      ["Date", "Payment #", "Mode", "Bank", "Paid to", "Amount ₹"],
      payments.map((p) => [
        p.payment_date,
        p.payment_number,
        p.payment_mode ?? "",
        p.bank_name ?? "",
        p.paid_to ?? "",
        p.amount,
      ])
    );
    const content = `${party.name} — Slips\n${slipCsv}\n\n${party.name} — Payments\n${payCsv}\n`;
    const safe = party.name.replace(/[^a-z0-9]+/gi, "_");
    downloadFile(`${safe}_statement.csv`, content);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={exportExcel}>
          <FileDown className="h-4 w-4" />
          Export to Excel
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="print-area space-y-6">
        <div className="border-b pb-3">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-sm">Account: {party.name}</p>
          <p className="text-xs text-muted-foreground">
            {[party.gst_number, party.phone, party.city, party.state]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className="mt-1 text-sm font-semibold">{balanceLabel}</p>
        </div>

        {/* Slips */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Weighment Slips ({slips.length})</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Slip #</th>
                <th className="p-2">Vehicle</th>
                <th className="p-2">Product</th>
                <th className="p-2 text-right">Net</th>
                <th className="p-2 text-right">Goods ₹</th>
                <th className="p-2 text-right">Balance ₹</th>
              </tr>
            </thead>
            <tbody>
              {slips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-muted-foreground">None</td>
                </tr>
              ) : (
                slips.map((s, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{format(new Date(s.slip_date), "dd-MM-yy")}</td>
                    <td className="p-2">{s.slip_number ?? "—"}</td>
                    <td className="p-2">{s.vehicle_number ?? "—"}</td>
                    <td className="p-2">{s.custom_fields?.product_name ?? "—"}</td>
                    <td className="p-2 text-right">{s.net_weight_kg ?? "—"}</td>
                    <td className="p-2 text-right">
                      {s.custom_fields?.amount != null ? formatINR(s.custom_fields.amount) : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {s.custom_fields?.balance_due != null
                        ? formatINR(s.custom_fields.balance_due)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Payments */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Payments ({payments.length})</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Payment #</th>
                <th className="p-2">Mode</th>
                <th className="p-2">Paid to</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">None</td>
                </tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{format(new Date(p.payment_date), "dd-MM-yy")}</td>
                    <td className="p-2">{p.payment_number}</td>
                    <td className="p-2">{p.payment_mode ?? "—"}</td>
                    <td className="p-2">{p.paid_to ?? "—"}</td>
                    <td className="p-2 text-right font-medium">{formatINR(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Ledger statement */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Statement (running balance)</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Particulars</th>
                <th className="p-2 text-right">Debit</th>
                <th className="p-2 text-right">Credit</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">No entries</td>
                </tr>
              ) : (
                withBalance.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{format(new Date(r.entry_date), "dd-MM-yy")}</td>
                    <td className="p-2">{r.narration ?? r.reference_number ?? "—"}</td>
                    <td className="p-2 text-right">
                      {r.entry_type === "debit" ? formatINR(r.amount) : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {r.entry_type === "credit" ? formatINR(r.amount) : "—"}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatINR(Math.abs(r.balance))} {r.balance >= 0 ? "Cr" : "Dr"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <div className="flex justify-end pt-10">
          <div className="text-center">
            <div className="mb-1 border-t border-foreground px-8 pt-1" />
            <p className="text-sm font-medium">For {companyName}</p>
            <p className="text-xs text-muted-foreground">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
