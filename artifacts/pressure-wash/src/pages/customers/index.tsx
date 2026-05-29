import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { useListCustomers, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatDate } from "@/lib/format";

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  Home: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Gas Station": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Commercial: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function CustomersPage() {
  const { data: customers, isLoading } = useListCustomers();
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = (customers ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteCustomer.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: "Customer deleted" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete customer", variant: "destructive" });
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
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your customer records</p>
          </div>
          <Button asChild data-testid="button-new-customer">
            <Link href="/customers/new">
              <Plus className="w-4 h-4 mr-2" />
              New Customer
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !filtered.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-3">
                {search ? "No customers match your search." : "No customers yet."}
              </p>
              {!search && (
                <Button asChild>
                  <Link href="/customers/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first customer
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
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Since</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-customer-${customer.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      {customer.address && (
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{customer.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {customer.customerType && (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CUSTOMER_TYPE_COLORS[customer.customerType] ?? CUSTOMER_TYPE_COLORS.Other}`}>
                          {customer.customerType}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                          <Link href={`/customers/${customer.id}/edit`} data-testid={`button-edit-customer-${customer.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(customer.id)}
                          data-testid={`button-delete-customer-${customer.id}`}
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
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer record. Any associated invoices will remain.
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
