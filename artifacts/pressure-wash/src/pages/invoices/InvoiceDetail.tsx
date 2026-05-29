import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Download, Pencil, Plus, CheckCircle2, Trash2 } from "lucide-react";
import {
  useGetInvoice,
  useMarkInvoicePaid,
  useCreatePayment,
  useDeletePayment,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Droplets } from "lucide-react";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["Cash", "Card", "Zelle", "Check", "Bank Transfer", "Other"]).optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface InvoiceDetailProps {
  invoiceId: number;
}

export default function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, {
    query: { queryKey: getGetInvoiceQueryKey(invoiceId) },
  });
  const markPaid = useMarkInvoicePaid();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentInvoicesQueryKey() });
  };

  const handleMarkPaid = () => {
    markPaid.mutate(
      { id: invoiceId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Invoice marked as paid" });
        },
        onError: () => toast({ title: "Failed to mark as paid", variant: "destructive" }),
      }
    );
  };

  const handleAddPayment = (data: PaymentFormData) => {
    createPayment.mutate(
      {
        data: {
          invoiceId,
          amount: data.amount,
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          notes: data.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Payment added" });
          setPaymentOpen(false);
          form.reset({ amount: 0, paymentDate: new Date().toISOString().slice(0, 10), notes: "" });
        },
        onError: () => toast({ title: "Failed to add payment", variant: "destructive" }),
      }
    );
  };

  const handleDeletePayment = (paymentId: number) => {
    deletePayment.mutate(
      { id: paymentId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Payment removed" });
        },
        onError: () => toast({ title: "Failed to delete payment", variant: "destructive" }),
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-3">Invoice not found.</p>
          <Button asChild><Link href="/invoices">Back to Invoices</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto print:p-0">
        {/* Navigation & actions — hidden when printing */}
        <div className="print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
              <Link href="/invoices">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Invoices
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{invoice.customerName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-download-pdf">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/invoices/${invoiceId}/edit`} data-testid="button-edit-invoice">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)} data-testid="button-add-payment">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Payment
              </Button>
              {invoice.status !== "Paid" && (
                <Button
                  size="sm"
                  onClick={handleMarkPaid}
                  disabled={markPaid.isPending}
                  data-testid="button-mark-paid"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Printable invoice */}
        <div id="printable-invoice">
          {/* Print header */}
          <div className="hidden print:flex print:items-center print:justify-between print:mb-8 print:pb-4 print:border-b-2 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl">Power Clean Pro</div>
                <div className="text-sm text-gray-500">Professional Pressure Washing</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-2xl text-gray-800">INVOICE</div>
              <div className="text-gray-600 font-medium">{invoice.invoiceNumber}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Customer info */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bill To</CardTitle></CardHeader>
              <CardContent>
                <div className="font-semibold text-foreground text-base">{invoice.customerName}</div>
                {invoice.serviceLocation && (
                  <div className="text-sm text-muted-foreground mt-0.5">{invoice.serviceLocation}</div>
                )}
              </CardContent>
            </Card>

            {/* Invoice meta */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice Info</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date</span>
                  <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                )}
                {invoice.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium">{invoice.paymentMethod}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line items */}
          <Card className="mb-5">
            <CardHeader className="pb-2"><CardTitle className="text-base">Services</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Type</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Qty</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.serviceType ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              <div className="px-4 py-4 border-t border-border">
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(invoice.subtotal ?? 0)}</span>
                    </div>
                    {(invoice.discount ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-green-600">-{formatCurrency(invoice.discount ?? 0)}</span>
                      </div>
                    )}
                    {(invoice.tax ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(invoice.tax ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                      <span>Total</span>
                      <span data-testid="text-invoice-total">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Paid</span>
                      <span data-testid="text-paid-amount">{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-yellow-600 dark:text-yellow-400">
                      <span>Balance Due</span>
                      <span data-testid="text-pending-amount">{formatCurrency(invoice.pendingAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card className="mb-5">
              <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Thank you message */}
          <div className="hidden print:block text-center py-8 border-t border-gray-200 mt-4">
            <p className="text-gray-600 font-medium">Thank you for your business!</p>
            <p className="text-sm text-gray-400 mt-1">We appreciate your trust in Power Clean Pro.</p>
          </div>
        </div>

        {/* Payments history — hidden when printing */}
        {invoice.payments.length > 0 && (
          <Card className="mt-5 print:hidden">
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Method</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Notes</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
                    <th className="w-10 px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0" data-testid={`row-payment-${payment.id}`}>
                      <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{payment.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{payment.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePayment(payment.id)}
                          data-testid={`button-delete-payment-${payment.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-payment-amount" />
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
                      <Input type="date" {...field} data-testid="input-payment-date" />
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method-dialog">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Zelle">Zelle</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                      <Input placeholder="Optional notes..." {...field} data-testid="input-payment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPayment.isPending} data-testid="button-submit-payment">
                  {createPayment.isPending ? "Adding..." : "Add Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
