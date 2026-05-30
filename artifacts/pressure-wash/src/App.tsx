import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/customers/index";
import CustomerForm from "@/pages/customers/CustomerForm";
import InvoicesPage from "@/pages/invoices/index";
import InvoiceForm from "@/pages/invoices/InvoiceForm";
import InvoiceDetail from "@/pages/invoices/InvoiceDetail";
import PaymentsPage from "@/pages/payments/index";
import BalancesPage from "@/pages/balances";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-slate-400">Loading Power Clean Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      {/* Protected Routes */}
      {!user ? (
        <Route>
          <Redirect to="/login" />
        </Route>
      ) : (
        <Switch>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/dashboard" component={DashboardPage} />

          <Route path="/customers" component={CustomersPage} />
          <Route path="/customers/new">
            <CustomerForm />
          </Route>
          <Route path="/customers/:id/edit">
            {(params) => <CustomerForm customerId={Number(params.id)} />}
          </Route>

          <Route path="/invoices" component={InvoicesPage} />
          <Route path="/invoices/new">
            <InvoiceForm />
          </Route>
          <Route path="/invoices/:id/edit">
            {(params) => <InvoiceForm invoiceId={Number(params.id)} />}
          </Route>
          <Route path="/invoices/:id">
            {(params) => <InvoiceDetail invoiceId={Number(params.id)} />}
          </Route>

          <Route path="/payments" component={PaymentsPage} />
          <Route path="/balances" component={BalancesPage} />

          <Route component={NotFound} />
        </Switch>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
