import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/customers/index";
import CustomerForm from "@/pages/customers/CustomerForm";
import InvoicesPage from "@/pages/invoices/index";
import InvoiceForm from "@/pages/invoices/InvoiceForm";
import InvoiceDetail from "@/pages/invoices/InvoiceDetail";
import PaymentsPage from "@/pages/payments/index";
import BalancesPage from "@/pages/balances";

const queryClient = new QueryClient();

function Router() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
