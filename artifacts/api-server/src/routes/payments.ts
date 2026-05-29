import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, paymentsTable, invoicesTable, customersTable } from "@workspace/db";
import {
  CreatePaymentBody,
  DeletePaymentParams,
  ListInvoicePaymentsParams,
  ListPaymentsResponse,
  ListInvoicePaymentsResponse,
} from "@workspace/api-zod";
import { recalcInvoice } from "./invoices";

const router: IRouter = Router();

router.get("/payments", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: paymentsTable.id,
      invoiceId: paymentsTable.invoiceId,
      amount: paymentsTable.amount,
      paymentDate: paymentsTable.paymentDate,
      paymentMethod: paymentsTable.paymentMethod,
      notes: paymentsTable.notes,
    })
    .from(paymentsTable)
    .orderBy(desc(paymentsTable.createdAt));

  const parsed = rows.map((r) => ({
    ...r,
    amount: parseFloat(r.amount ?? "0"),
  }));

  res.json(ListPaymentsResponse.parse(parsed));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, parsed.data.invoiceId));

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      ...parsed.data,
      amount: parsed.data.amount.toFixed(2),
    })
    .returning();

  await recalcInvoice(parsed.data.invoiceId);

  res.status(201).json({
    ...payment,
    amount: parseFloat(payment.amount ?? "0"),
  });
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db
    .delete(paymentsTable)
    .where(eq(paymentsTable.id, params.data.id))
    .returning();

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  await recalcInvoice(payment.invoiceId);
  res.sendStatus(204);
});

router.get("/invoices/:id/payments", async (req, res): Promise<void> => {
  const params = ListInvoicePaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.invoiceId, params.data.id))
    .orderBy(desc(paymentsTable.createdAt));

  const parsed = rows.map((r) => ({
    ...r,
    amount: parseFloat(r.amount ?? "0"),
  }));

  res.json(ListInvoicePaymentsResponse.parse(parsed));
});

export default router;
