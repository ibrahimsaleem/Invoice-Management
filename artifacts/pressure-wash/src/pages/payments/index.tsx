import { Link } from "wouter";
import { useListPayments, useListInvoices } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  const { data: payments, isLoading: paymentsLoading } = useListPayments();
  const { data: invoices } = useListInvoices();

  const invoiceMap = new Map((invoices ?? []).map((inv) => [inv.id, inv]));

  const totalCollected = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All payment records across invoices</p>
        </div>

        {/* Total collected summary */}
        {!paymentsLoading && (payments?.length ?? 0) > 0 && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Total Collected</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalCollected)}</div>
            </div>
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/40">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        )}

        {paymentsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-18 w-full rounded-xl" />)}
          </div>
        ) : !payments?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1 font-medium">No payments yet</p>
              <p className="text-sm text-muted-foreground">
                Go to an{" "}
                <Link href="/invoices" className="text-primary hover:underline">invoice</Link>{" "}
                to record a payment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
              {payments.map((payment) => {
                const inv = invoiceMap.get(payment.invoiceId);
                return (
                  <div key={payment.id} className="bg-card border border-card-border rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {inv ? (
                            <Link href={`/invoices/${payment.invoiceId}`} className="font-bold text-primary text-sm hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                          ) : (
                            <span className="font-semibold text-sm text-muted-foreground">#{payment.invoiceId}</span>
                          )}
                          {payment.paymentMethod && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                              {payment.paymentMethod}
                            </span>
                          )}
                        </div>
                        {inv && <div className="text-xs text-muted-foreground mt-0.5 truncate">{inv.customerName}</div>}
                        <div className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</div>
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground italic mt-0.5 truncate">{payment.notes}</div>
                        )}
                      </div>
                      <div className="font-bold text-lg text-green-600 dark:text-green-400 flex-shrink-0">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Method</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Notes</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const inv = invoiceMap.get(payment.invoiceId);
                    return (
                      <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-3">
                          {inv ? (
                            <Link href={`/invoices/${payment.invoiceId}`} className="text-primary hover:underline font-medium">
                              {inv.invoiceNumber}
                            </Link>
                          ) : <span className="text-muted-foreground">#{payment.invoiceId}</span>}
                        </td>
                        <td className="px-4 py-3">{inv?.customerName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{payment.paymentMethod ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{payment.notes ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/40">
                    <td colSpan={5} className="px-4 py-2.5 text-sm font-medium">Total Collected</td>
                    <td className="px-4 py-2.5 text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalCollected)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
