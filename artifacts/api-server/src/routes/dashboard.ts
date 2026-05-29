import { Router, type IRouter } from "express";
import { eq, desc, count, sum } from "drizzle-orm";
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

export default router;
