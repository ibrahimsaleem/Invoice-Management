import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Eye, Pencil, Trash2, DollarSign } from "lucide-react";
import {
  useListInvoices,
  useDeleteInvoice,
  useCreatePayment,
  getListInvoicesQueryKey,
  getGetInvoiceQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRecentInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, statusColor } from "@/lib/format";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["Cash", "Card", "Zelle", "Check", "Bank Transfer", "Other"]).optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

type PayInvoiceState = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  pendingAmount: number;
};

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useListInvoices();
  const deleteInvoice = useDeleteInvoice();
  const createPayment = useCreatePayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [payInvoice, setPayInvoice] = useState<PayInvoiceState | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const filtered = (invoices ?? []).filter((inv) => {
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openPayDialog = (inv: PayInvoiceState) => {
    form.reset({
      amount: inv.pendingAmount,
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setPayInvoice(inv);
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteInvoice.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentInvoicesQueryKey() });
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

  const handlePaySubmit = (values: PaymentFormData) => {
    if (!payInvoice) return;
    createPayment.mutate(
      {
        data: {
          invoiceId: payInvoice.id,
          amount: values.amount,
          paymentDate: values.paymentDate,
          paymentMethod: values.paymentMethod,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(payInvoice.id) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
          toast({ title: `Payment of ${formatCurrency(values.amount)} recorded` });
          setPayInvoice(null);
        },
        onError: () => {
          toast({ title: "Failed to record payment", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoices?.length ?? 0} total
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/invoices/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 md:w-40 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partially Paid">Partial</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
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
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
              {filtered.map((inv) => (
                <div key={inv.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <Link href={`/invoices/${inv.id}`} className="block p-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary text-sm">{inv.invoiceNumber}</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-sm text-foreground font-medium mt-0.5 truncate">{inv.customerName}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-base">{formatCurrency(inv.totalAmount)}</div>
                        {inv.pendingAmount > 0 && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">{formatCurrency(inv.pendingAmount)} due</div>
                        )}
                        {inv.paidAmount > 0 && inv.pendingAmount === 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400">Paid in full</div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className={`flex border-t border-border ${inv.pendingAmount > 0 ? "divide-x divide-border" : "divide-x divide-border"}`}>
                    {inv.pendingAmount > 0 && (
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                        onClick={() => openPayDialog({
                          id: inv.id,
                          invoiceNumber: inv.invoiceNumber,
                          customerName: inv.customerName,
                          pendingAmount: inv.pendingAmount,
                        })}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Record Payment
                      </button>
                    )}
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                      onClick={() => setDeleteId(inv.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice #</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Pending</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="px-4 py-3">{inv.customerName}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(inv.paidAmount)}</td>
                      <td className="px-4 py-3 text-right text-yellow-600 dark:text-yellow-400">{formatCurrency(inv.pendingAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {inv.pendingAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs text-primary border-primary/30 hover:bg-primary/5"
                              onClick={() => openPayDialog({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                customerName: inv.customerName,
                                pendingAmount: inv.pendingAmount,
                              })}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" />
                              Pay
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <Link href={`/invoices/${inv.id}`}><Eye className="w-3.5 h-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <Link href={`/invoices/${inv.id}/edit`}><Pencil className="w-3.5 h-3.5" /></Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(inv.id)}
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
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick pay dialog */}
      <Dialog open={payInvoice != null} onOpenChange={(open) => !open && setPayInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{payInvoice?.invoiceNumber}</span>
              {" · "}{payInvoice?.customerName}
              <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                {formatCurrency(payInvoice?.pendingAmount ?? 0)} outstanding
              </span>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePaySubmit)} className="space-y-4 pt-1">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Cash", "Card", "Zelle", "Check", "Bank Transfer", "Other"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional note..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayInvoice(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Saving..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
