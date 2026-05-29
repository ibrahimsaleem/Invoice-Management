import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useGetCustomer,
  getListCustomersQueryKey,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  customerType: z.enum(["Home", "Gas Station", "Commercial", "Other"]).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormProps {
  customerId?: number;
}

export default function CustomerForm({ customerId }: CustomerFormProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = customerId != null;

  const { data: existing, isLoading: loadingExisting } = useGetCustomer(
    customerId!,
    { query: { enabled: isEdit, queryKey: getGetCustomerQueryKey(customerId!) } }
  );

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isEdit && existing
      ? {
          name: existing.name,
          phone: existing.phone ?? "",
          email: existing.email ?? "",
          address: existing.address ?? "",
          customerType: (existing.customerType as FormData["customerType"]) ?? "Home",
          notes: existing.notes ?? "",
        }
      : {
          name: "",
          phone: "",
          email: "",
          address: "",
          customerType: "Home",
          notes: "",
        },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      customerType: data.customerType,
      notes: data.notes || undefined,
    };

    if (isEdit) {
      updateCustomer.mutate(
        { id: customerId!, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId!) });
            toast({ title: "Customer updated" });
            setLocation("/customers");
          },
          onError: () => toast({ title: "Failed to update customer", variant: "destructive" }),
        }
      );
    } else {
      createCustomer.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            toast({ title: "Customer created" });
            setLocation("/customers");
          },
          onError: () => toast({ title: "Failed to create customer", variant: "destructive" }),
        }
      );
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Layout>
    );
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Customers
            </Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isEdit ? "Edit Customer" : "New Customer"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Update customer information" : "Add a new customer to your records"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" type="email" {...field} data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, City, TX 78701" {...field} data-testid="input-customer-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Gas Station">Gas Station</SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
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
                        <Textarea
                          placeholder="Any additional notes..."
                          rows={3}
                          {...field}
                          data-testid="input-customer-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isPending} data-testid="button-save-customer">
                    {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Customer"}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/customers">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
