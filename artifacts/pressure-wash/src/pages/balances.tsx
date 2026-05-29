import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Phone, FileText, Search, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type CustomerBalance = {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  paymentStatus: string;
};

function useCustomerBalances() {
  return useQuery<CustomerBalance[]>({
    queryKey: ["customer-balances"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/customer-balances");
      if (!res.ok) throw new Error("Failed to fetch customer balances");
      return res.json();
    },
  });
}

function statusBadge(status: string) {
  if (status === "Unpaid") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (status === "Partially Paid") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (status === "Paid") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return "bg-muted text-muted-foreground";
}

function statusIcon(status: string) {
  if (status === "Unpaid") return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === "Partially Paid") return <Clock className="w-4 h-4 text-yellow-500" />;
  if (status === "Paid") return <CheckCircle className="w-4 h-4 text-green-500" />;
  return null;
}

export default function BalancesPage() {
  const { data: customers, isLoading, error } = useCustomerBalances();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Unpaid" | "Partially Paid" | "Paid">("All");

  const filtered = (customers ?? []).filter((c) => {
    const matchSearch = c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerPhone ?? "").includes(search);
    const matchFilter = filter === "All" || c.paymentStatus === filter;
    return matchSearch && matchFilter;
  });

  const totalOwed = filtered.reduce((sum, c) => sum + c.totalPending, 0);
  const totalCollected = filtered.reduce((sum, c) => sum + c.totalPaid, 0);
  const unpaidCount = (customers ?? []).filter((c) => c.paymentStatus === "Unpaid").length;
  const partialCount = (customers ?? []).filter((c) => c.paymentStatus === "Partially Paid").length;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold">Customer Balances</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track who has paid and who still owes</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <button
            onClick={() => setFilter("Unpaid")}
            className={`rounded-xl p-3 text-center border transition-colors ${filter === "Unpaid" ? "border-red-400 bg-red-50 dark:bg-red-900/20" : "border-border bg-card"}`}
          >
            <div className="text-lg font-bold text-red-600 dark:text-red-400">{unpaidCount}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Unpaid</div>
          </button>
          <button
            onClick={() => setFilter("Partially Paid")}
            className={`rounded-xl p-3 text-center border transition-colors ${filter === "Partially Paid" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : "border-border bg-card"}`}
          >
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{partialCount}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Partial</div>
          </button>
          <button
            onClick={() => setFilter("Paid")}
            className={`rounded-xl p-3 text-center border transition-colors ${filter === "Paid" ? "border-green-400 bg-green-50 dark:bg-green-900/20" : "border-border bg-card"}`}
          >
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {(customers ?? []).filter((c) => c.paymentStatus === "Paid").length}
            </div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Paid</div>
          </button>
        </div>

        {/* Total owed / collected */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(totalOwed)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(totalCollected)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + filter reset */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filter !== "All" && (
            <button
              onClick={() => setFilter("All")}
              className="px-3 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              Failed to load customer balances.
            </CardContent>
          </Card>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No customers found.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
              {filtered.map((c) => (
                <div key={c.customerId} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusIcon(c.paymentStatus)}
                        <span className="font-semibold text-sm truncate">{c.customerName}</span>
                      </div>
                      {c.customerPhone && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {c.customerPhone}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        {c.invoiceCount} invoice{c.invoiceCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${statusBadge(c.paymentStatus)}`}>
                        {c.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Billed</div>
                      <div className="text-sm font-bold mt-0.5">{formatCurrency(c.totalBilled)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Paid</div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(c.totalPaid)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Owes</div>
                      <div className={`text-sm font-bold mt-0.5 ${c.totalPending > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {formatCurrency(c.totalPending)}
                      </div>
                    </div>
                  </div>

                  {c.totalPending > 0 && (
                    <Link
                      href={`/invoices?customer=${c.customerId}`}
                      className="mt-3 flex items-center justify-center w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      View Invoices → Record Payment
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Phone</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoices</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Billed</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Owes</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.customerId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.customerPhone ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{c.invoiceCount}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.totalBilled)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(c.totalPaid)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${c.totalPending > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {formatCurrency(c.totalPending)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusBadge(c.paymentStatus)}`}>
                          {c.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.totalPending > 0 ? (
                          <Link
                            href={`/invoices`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View Invoices
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
