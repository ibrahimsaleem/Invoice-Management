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

  const isLoading = paymentsLoading;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All payment records across invoices</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !payments?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1 font-medium">No payments recorded yet</p>
              <p className="text-sm text-muted-foreground">
                Go to an{" "}
                <Link href="/invoices" className="text-primary hover:underline">
                  invoice
                </Link>{" "}
                to add a payment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Invoice</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Customer</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Method</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Notes</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const inv = invoiceMap.get(payment.invoiceId);
                  return (
                    <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-payment-${payment.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{formatDate(payment.paymentDate)}</div>
                        {inv && <div className="text-xs text-muted-foreground sm:hidden">{inv.invoiceNumber}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {inv ? (
                          <Link href={`/invoices/${payment.invoiceId}`} className="text-primary hover:underline font-medium" data-testid={`link-invoice-${payment.invoiceId}`}>
                            {inv.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">#{payment.invoiceId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-foreground">
                        {inv?.customerName ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {payment.paymentMethod ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {payment.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400" data-testid={`amount-payment-${payment.id}`}>
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
                    {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
