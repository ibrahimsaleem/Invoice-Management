import { Router, type IRouter } from "express";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { db, invoicesTable, customersTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentInvoicesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [customerCount] = await db
    .select({ count: count() })
    .from(customersTable);

  const [invoiceTotals] = await db
    .select({
      count: count(),
      totalBilled: sum(invoicesTable.totalAmount),
      totalPaid: sum(invoicesTable.paidAmount),
      totalPending: sum(invoicesTable.pendingAmount),
    })
    .from(invoicesTable);

  const statusRows = await db
    .select({ status: invoicesTable.status, count: count() })
    .from(invoicesTable)
    .groupBy(invoicesTable.status);

  const statusMap: Record<string, number> = {};
  for (const row of statusRows) {
    statusMap[row.status] = row.count;
  }

  const summary = {
    totalCustomers: customerCount.count,
    totalInvoices: invoiceTotals.count,
    totalBilled: parseFloat(invoiceTotals.totalBilled ?? "0"),
    totalPaid: parseFloat(invoiceTotals.totalPaid ?? "0"),
    totalPending: parseFloat(invoiceTotals.totalPending ?? "0"),
    unpaidCount: statusMap["Unpaid"] ?? 0,
    partialCount: statusMap["Partially Paid"] ?? 0,
    paidCount: statusMap["Paid"] ?? 0,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/recent-invoices", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      pendingAmount: invoicesTable.pendingAmount,
      status: invoicesTable.status,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
    })
    .from(invoicesTable)
    .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .orderBy(desc(invoicesTable.createdAt))
    .limit(10);

  const parsed = rows.map((r) => ({
    ...r,
    totalAmount: parseFloat(r.totalAmount ?? "0"),
    paidAmount: parseFloat(r.paidAmount ?? "0"),
    pendingAmount: parseFloat(r.pendingAmount ?? "0"),
  }));

  res.json(GetRecentInvoicesResponse.parse(parsed));
});

router.get("/dashboard/customer-balances", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      customerId: customersTable.id,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
      invoiceCount: count(invoicesTable.id),
      totalBilled: sum(invoicesTable.totalAmount),
      totalPaid: sum(invoicesTable.paidAmount),
      totalPending: sum(invoicesTable.pendingAmount),
    })
    .from(customersTable)
    .leftJoin(invoicesTable, eq(invoicesTable.customerId, customersTable.id))
    .groupBy(customersTable.id, customersTable.name, customersTable.phone);

  const result = rows
    .map((r) => {
      const billed = parseFloat(r.totalBilled ?? "0");
      const paid = parseFloat(r.totalPaid ?? "0");
      const pending = parseFloat(r.totalPending ?? "0");
      const invoiceCount = r.invoiceCount;
      let paymentStatus = "No Invoices";
      if (invoiceCount > 0) {
        if (pending > 0 && paid === 0) paymentStatus = "Unpaid";
        else if (pending > 0) paymentStatus = "Partially Paid";
        else paymentStatus = "Paid";
      }
      return {
        customerId: r.customerId,
        customerName: r.customerName,
        customerPhone: r.customerPhone ?? null,
        invoiceCount,
        totalBilled: billed,
        totalPaid: paid,
        totalPending: pending,
        paymentStatus,
      };
    })
    .sort((a, b) => b.totalPending - a.totalPending);

  res.json(result);
});

export default router;
