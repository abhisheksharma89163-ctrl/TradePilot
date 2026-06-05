"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { Printer, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";
import { SignatureBlock } from "@/components/shared/signature-block";

export interface SlipRow {
  slip_date: string;
  slip_number: string | null;
  slip_type: string | null;
  vehicle_number: string | null;
  gross_weight_kg: number | null;
  tare_weight_kg: number | null;
  net_weight_kg: number | null;
  remarks: string | null;
  custom_fields: {
    party_name?: string;
    product_name?: string;
    rate?: string;
    balance_due?: number;
  } | null;
}

/** Human label for a slip's payment status, shown in the PDF. */
function paymentStatusLabel(s: SlipRow): { text: string; tone: "paid" | "pay" | "receive" | "none" } {
  const bal = s.custom_fields?.balance_due;
  if (bal == null) return { text: "—", tone: "none" };
  if (bal <= 0) return { text: "Paid", tone: "paid" };
  const isSale = s.slip_type === "sale";
  return isSale
    ? { text: `To receive ${formatINR(bal)}`, tone: "receive" }
    : { text: `To pay ${formatINR(bal)}`, tone: "pay" };
}

export interface PaymentRow {
  payment_date: string;
  payment_number: string;
  amount: number;
  payment_mode: string | null;
  bank_name: string | null;
  purpose: string | null;
  payee: string | null;
  paid_to: string | null;
}

export function ReportView({
  companyName,
  signatureUrl,
  from,
  to,
  slips,
  payments,
}: {
  companyName: string;
  signatureUrl?: string | null;
  from: string;
  to: string;
  slips: SlipRow[];
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply() {
    const p = new URLSearchParams(params.toString());
    p.set("from", f);
    p.set("to", t);
    router.push(`/reports?${p.toString()}`);
  }

  const totalNet = slips.reduce((s, r) => s + (r.net_weight_kg ?? 0), 0);
  const totalPay = payments.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Controls — hidden when printing */}
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={f} onChange={(e) => setF(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={t} onChange={(e) => setT(e.target.value)} />
        </div>
        <Button variant="outline" onClick={apply}>
          <Filter className="h-4 w-4" />
          Apply
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Printable area */}
      <div className="print-area space-y-8">
        <div className="border-b pb-3">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-sm text-muted-foreground">
            Business Report · {format(new Date(from), "dd MMM yyyy")} –{" "}
            {format(new Date(to), "dd MMM yyyy")}
          </p>
        </div>

        {/* Weighment slips / purchases */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            Weighment Slips ({slips.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Slip #</th>
                  <th className="p-2">Party</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Gross</th>
                  <th className="p-2 text-right">Tare</th>
                  <th className="p-2 text-right">Net (kg)</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {slips.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-muted-foreground">
                      No weighment slips in this period.
                    </td>
                  </tr>
                ) : (
                  slips.map((r, i) => {
                    const ps = paymentStatusLabel(r);
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2">{format(new Date(r.slip_date), "dd-MM-yy")}</td>
                        <td className="p-2">{r.slip_number ?? "—"}</td>
                        <td className="p-2">{r.custom_fields?.party_name ?? "—"}</td>
                        <td className="p-2">{r.vehicle_number ?? "—"}</td>
                        <td className="p-2">{r.custom_fields?.product_name ?? "—"}</td>
                        <td className="p-2 text-right">{r.gross_weight_kg ?? "—"}</td>
                        <td className="p-2 text-right">{r.tare_weight_kg ?? "—"}</td>
                        <td className="p-2 text-right font-medium">
                          {r.net_weight_kg?.toLocaleString("en-IN") ?? "—"}
                        </td>
                        <td className="p-2 text-right">{r.custom_fields?.rate ?? "—"}</td>
                        <td
                          className={
                            "p-2 whitespace-nowrap " +
                            (ps.tone === "pay"
                              ? "text-red-600"
                              : ps.tone === "receive"
                                ? "text-amber-600"
                                : ps.tone === "paid"
                                  ? "text-emerald-600"
                                  : "text-muted-foreground")
                          }
                        >
                          {ps.text}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {slips.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="p-2" colSpan={7}>
                      Total Net Weight
                    </td>
                    <td className="p-2 text-right">
                      {totalNet.toLocaleString("en-IN")} kg
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        {/* Payments */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Payments ({payments.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Paid to</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Bank</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No payments in this period.
                    </td>
                  </tr>
                ) : (
                  payments.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{format(new Date(r.payment_date), "dd-MM-yy")}</td>
                      <td className="p-2">
                        <div className="font-medium">{r.payee ?? "—"}</div>
                        {r.paid_to && (
                          <div className="text-xs text-muted-foreground">
                            {r.paid_to}
                          </div>
                        )}
                      </td>
                      <td className="p-2">{r.payment_mode ?? "—"}</td>
                      <td className="p-2">{r.bank_name ?? "—"}</td>
                      <td className="p-2 text-right font-medium">{formatINR(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="p-2" colSpan={4}>
                      Total Payments
                    </td>
                    <td className="p-2 text-right">{formatINR(totalPay)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <SignatureBlock companyName={companyName} signatureUrl={signatureUrl} />

        <p className="pt-4 text-xs text-muted-foreground">
          Generated by BOS on {format(new Date(), "dd MMM yyyy, HH:mm")}
        </p>
      </div>
    </div>
  );
}
