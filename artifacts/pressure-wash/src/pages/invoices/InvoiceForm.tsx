import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  useCreateInvoice,
  useUpdateInvoice,
  useGetInvoice,
  useListCustomers,
  getListInvoicesQueryKey,
  getGetInvoiceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { useEffect } from "react";

const itemSchema = z.object({
  serviceType: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Must be > 0"),
  unitPrice: z.coerce.number().min(0, "Must be >= 0"),
});

const schema = z.object({
  customerId: z.coerce.number().min(1, "Please select a customer"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  serviceLocation: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["Cash", "Card", "Zelle", "Check", "Bank Transfer", "Other"]).optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one service item"),
});

type FormData = z.infer<typeof schema>;

interface InvoiceFormProps {
  invoiceId?: number;
}

export default function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = invoiceId != null;

  const { data: customers } = useListCustomers();
  const { data: existing, isLoading: loadingExisting } = useGetInvoice(
    invoiceId!,
    { query: { enabled: isEdit, queryKey: getGetInvoiceQueryKey(invoiceId!) } }
  );

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const defaultItems = [{ serviceType: "", description: "", quantity: 1, unitPrice: 0 }];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: 0,
      invoiceNumber: `INV-${String(Date.now()).slice(-4)}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      serviceLocation: "",
      discount: 0,
      tax: 0,
      notes: "",
      items: defaultItems,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (isEdit && existing) {
      form.reset({
        customerId: existing.customerId,
        invoiceNumber: existing.invoiceNumber,
        invoiceDate: existing.invoiceDate,
        dueDate: existing.dueDate ?? "",
        serviceLocation: existing.serviceLocation ?? "",
        discount: existing.discount,
        tax: existing.tax,
        paymentMethod: (existing.paymentMethod as FormData["paymentMethod"]) ?? undefined,
        notes: existing.notes ?? "",
        items: existing.items.map((item) => ({
          serviceType: item.serviceType ?? "",
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }, [existing, isEdit]);

  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount") || 0;
  const watchedTax = form.watch("tax") || 0;

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const total = subtotal - Number(watchedDiscount) + Number(watchedTax);

  const onSubmit = (data: FormData) => {
    const payload = {
      customerId: data.customerId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate || undefined,
      serviceLocation: data.serviceLocation || undefined,
      discount: data.discount,
      tax: data.tax,
      paymentMethod: data.paymentMethod,
      notes: data.notes || undefined,
      items: data.items,
    };

    if (isEdit) {
      updateInvoice.mutate(
        { id: invoiceId!, data: payload },
        {
          onSuccess: (inv) => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId!) });
            toast({ title: "Invoice updated" });
            setLocation(`/invoices/${inv.id}`);
          },
          onError: () => toast({ title: "Failed to update invoice", variant: "destructive" }),
        }
      );
    } else {
      createInvoice.mutate(
        { data: payload },
        {
          onSuccess: (inv) => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            toast({ title: "Invoice created" });
            setLocation(`/invoices/${inv.id}`);
          },
          onError: () => toast({ title: "Failed to create invoice", variant: "destructive" }),
        }
      );
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </Layout>
    );
  }

  const isPending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
            <Link href="/invoices">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Invoices
            </Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isEdit ? "Edit Invoice" : "New Invoice"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Update invoice details" : "Create a new invoice or quotation"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Header info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={field.value ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice-customer">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(customers ?? []).map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-invoice-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-invoice-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-invoice-due-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serviceLocation"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Service Location</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City TX 78701" {...field} data-testid="input-service-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Service Items</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ serviceType: "", description: "", quantity: 1, unitPrice: 0 })}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {form.formState.errors.items?.root && (
                  <p className="text-sm text-destructive mb-3">{form.formState.errors.items.root.message}</p>
                )}
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const qty = Number(form.watch(`items.${index}.quantity`)) || 0;
                    const price = Number(form.watch(`items.${index}.unitPrice`)) || 0;
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start" data-testid={`item-row-${index}`}>
                        <div className="col-span-12 sm:col-span-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.serviceType`}
                            render={({ field: f }) => (
                              <FormItem>
                                {index === 0 && <FormLabel className="text-xs">Service Type</FormLabel>}
                                <FormControl>
                                  <Input placeholder="Pressure Washing" {...f} data-testid={`input-item-service-type-${index}`} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field: f }) => (
                              <FormItem>
                                {index === 0 && <FormLabel className="text-xs">Description *</FormLabel>}
                                <FormControl>
                                  <Input placeholder="Driveway cleaning" {...f} data-testid={`input-item-description-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: f }) => (
                              <FormItem>
                                {index === 0 && <FormLabel className="text-xs">Qty</FormLabel>}
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" {...f} data-testid={`input-item-quantity-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field: f }) => (
                              <FormItem>
                                {index === 0 && <FormLabel className="text-xs">Unit Price</FormLabel>}
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...f} data-testid={`input-item-unit-price-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex items-end justify-between gap-1">
                          <div>
                            {index === 0 && <div className="text-xs font-medium mb-2">Total</div>}
                            <div className="text-sm font-medium py-2">{formatCurrency(qty * price)}</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground flex-1">Discount ($)</span>
                        <FormField
                          control={form.control}
                          name="discount"
                          render={({ field: f }) => (
                            <FormItem className="flex-shrink-0 w-28">
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...f} className="h-7 text-sm text-right" data-testid="input-discount" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground flex-1">Tax ($)</span>
                        <FormField
                          control={form.control}
                          name="tax"
                          render={({ field: f }) => (
                            <FormItem className="flex-shrink-0 w-28">
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...f} className="h-7 text-sm text-right" data-testid="input-tax" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                        <span>Total</span>
                        <span data-testid="text-total">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment & Notes */}
            <Card>
              <CardHeader><CardTitle className="text-base">Payment & Notes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
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
                        <Textarea placeholder="Any additional notes..." rows={3} {...field} data-testid="input-invoice-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending} data-testid="button-save-invoice">
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Invoice"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/invoices">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
