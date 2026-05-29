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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className={`mt-1 text-xl font-bold leading-tight ${accent ?? ""}`}>{value}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
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
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your business</p>
        </div>

        {/* Stats grid — 2 cols on mobile, 3 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <StatCard title="Customers" value={summary?.totalCustomers ?? 0} icon={Users} loading={summaryLoading} />
          <StatCard title="Invoices" value={summary?.totalInvoices ?? 0} icon={FileText} loading={summaryLoading} />
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
            title="Pending"
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
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Unpaid", count: summary.unpaidCount, color: "bg-red-500", text: "text-red-600 dark:text-red-400" },
              { label: "Partial", count: summary.partialCount, color: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" },
              { label: "Paid", count: summary.paidCount, color: "bg-green-500", text: "text-green-600 dark:text-green-400" },
            ].map(({ label, count, color, text }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-card-border text-center">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <div className={`text-xl font-bold ${text}`}>{count}</div>
                <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent invoices */}
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <Link href="/invoices" className="text-xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoicesLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : !recentInvoices?.length ? (
              <div className="text-center py-10 text-muted-foreground text-sm px-4">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-primary hover:underline">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="md:hidden divide-y divide-border">
                  {recentInvoices.map((inv) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary text-sm">{inv.invoiceNumber}</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{inv.customerName}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm">{formatCurrency(inv.totalAmount)}</div>
                        {inv.pendingAmount > 0 && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">{formatCurrency(inv.pendingAmount)} due</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Pending</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                            <div className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                          </td>
                          <td className="px-4 py-3">{inv.customerName}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                          <td className="px-4 py-3 text-right text-yellow-600 dark:text-yellow-400">{formatCurrency(inv.pendingAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
