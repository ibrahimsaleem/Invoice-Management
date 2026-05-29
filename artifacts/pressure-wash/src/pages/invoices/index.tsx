import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { useListInvoices, useDeleteInvoice, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, statusColor } from "@/lib/format";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useListInvoices();
  const deleteInvoice = useDeleteInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = (invoices ?? []).filter((inv) => {
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteInvoice.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "Invoice deleted" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete invoice", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All invoices and quotations</p>
          </div>
          <Button asChild data-testid="button-new-invoice">
            <Link href="/invoices/new">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices or customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-invoices"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partially Paid">Partially Paid</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-3">
                {search || statusFilter !== "All" ? "No invoices match your filters." : "No invoices yet."}
              </p>
              {!search && statusFilter === "All" && (
                <Button asChild>
                  <Link href="/invoices/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first invoice
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice #</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Paid</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Pending</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-invoice-${inv.id}`}>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline" data-testid={`link-invoice-${inv.id}`}>
                        {inv.invoiceNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground sm:hidden">{inv.customerName}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-foreground">{inv.customerName}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-green-600 dark:text-green-400">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-yellow-600 dark:text-yellow-400">{formatCurrency(inv.pendingAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(inv.status)}`} data-testid={`status-invoice-${inv.id}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                          <Link href={`/invoices/${inv.id}`} data-testid={`button-view-invoice-${inv.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                          <Link href={`/invoices/${inv.id}/edit`} data-testid={`button-edit-invoice-${inv.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(inv.id)}
                          data-testid={`button-delete-invoice-${inv.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice and all associated payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
