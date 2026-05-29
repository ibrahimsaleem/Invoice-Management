import { Link } from "wouter";
import { Users, FileText, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useGetDashboardSummary, useGetRecentInvoices } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, statusColor } from "@/lib/format";

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <p className={`mt-1.5 text-2xl font-bold ${accent ?? ""}`}>{value}</p>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 ml-3 flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: recentInvoices, isLoading: invoicesLoading } = useGetRecentInvoices();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your business</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Customers" value={summary?.totalCustomers ?? 0} icon={Users} loading={summaryLoading} />
          <StatCard title="Total Invoices" value={summary?.totalInvoices ?? 0} icon={FileText} loading={summaryLoading} />
          <StatCard
            title="Total Billed"
            value={summary ? formatCurrency(summary.totalBilled) : "$0.00"}
            icon={DollarSign}
            loading={summaryLoading}
          />
          <StatCard
            title="Total Paid"
            value={summary ? formatCurrency(summary.totalPaid) : "$0.00"}
            icon={TrendingUp}
            loading={summaryLoading}
            accent="text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Pending Balance"
            value={summary ? formatCurrency(summary.totalPending) : "$0.00"}
            icon={Clock}
            loading={summaryLoading}
            accent="text-yellow-600 dark:text-yellow-400"
          />
          <StatCard
            title="Paid Invoices"
            value={summary?.paidCount ?? 0}
            icon={CheckCircle}
            loading={summaryLoading}
            accent="text-green-600 dark:text-green-400"
          />
        </div>

        {/* Status breakdown */}
        {!summaryLoading && summary && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Unpaid", count: summary.unpaidCount, color: "bg-red-500" },
              { label: "Partially Paid", count: summary.partialCount, color: "bg-yellow-500" },
              { label: "Paid", count: summary.paidCount, color: "bg-green-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border">
                <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <Link href="/invoices" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoicesLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !recentInvoices?.length ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-primary hover:underline">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Pending</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline" data-testid={`link-invoice-${inv.id}`}>
                            {inv.invoiceNumber}
                          </Link>
                          <div className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{inv.customerName}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-yellow-600 dark:text-yellow-400">
                          {formatCurrency(inv.pendingAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(inv.status)}`} data-testid={`status-invoice-${inv.id}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
