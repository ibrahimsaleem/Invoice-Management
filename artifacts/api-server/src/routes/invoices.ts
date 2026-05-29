import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, paymentsTable, customersTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  UpdateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  DeleteInvoiceParams,
  MarkInvoicePaidParams,
  ListInvoicesResponse,
  GetInvoiceResponse,
  UpdateInvoiceResponse,
  MarkInvoicePaidResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildInvoiceResponse(invoiceId: number) {
  const [invoice] = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      serviceLocation: invoicesTable.serviceLocation,
      subtotal: invoicesTable.subtotal,
      discount: invoicesTable.discount,
      tax: invoicesTable.tax,
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      pendingAmount: invoicesTable.pendingAmount,
      status: invoicesTable.status,
      paymentMethod: invoicesTable.paymentMethod,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .where(eq(invoicesTable.id, invoiceId));

  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.invoiceId, invoiceId))
    .orderBy(desc(paymentsTable.createdAt));

  return {
    ...invoice,
    subtotal: parseFloat(invoice.subtotal ?? "0"),
    discount: parseFloat(invoice.discount ?? "0"),
    tax: parseFloat(invoice.tax ?? "0"),
    totalAmount: parseFloat(invoice.totalAmount ?? "0"),
    paidAmount: parseFloat(invoice.paidAmount ?? "0"),
    pendingAmount: parseFloat(invoice.pendingAmount ?? "0"),
    items: items.map((item) => ({
      ...item,
      quantity: parseFloat(item.quantity ?? "1"),
      unitPrice: parseFloat(item.unitPrice ?? "0"),
      total: parseFloat(item.total ?? "0"),
    })),
    payments: payments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount ?? "0"),
    })),
  };
}

async function recalcInvoice(invoiceId: number) {
  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));

  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));

  if (!inv) return;

  const subtotal = items.reduce(
    (acc, item) => acc + parseFloat(item.total ?? "0"),
    0
  );
  const discount = parseFloat(inv.discount ?? "0");
  const tax = parseFloat(inv.tax ?? "0");
  const totalAmount = subtotal - discount + tax;

  const paymentsRows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.invoiceId, invoiceId));

  const paidAmount = paymentsRows.reduce(
    (acc, p) => acc + parseFloat(p.amount ?? "0"),
    0
  );
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let status = "Unpaid";
  if (paidAmount >= totalAmount && totalAmount > 0) {
    status = "Paid";
  } else if (paidAmount > 0) {
    status = "Partially Paid";
  }

  await db
    .update(invoicesTable)
    .set({
      subtotal: subtotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      status,
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId));
}

router.get("/invoices", async (req, res): Promise<void> => {
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
    .orderBy(desc(invoicesTable.createdAt));

  const parsed = rows.map((r) => ({
    ...r,
    totalAmount: parseFloat(r.totalAmount ?? "0"),
    paidAmount: parseFloat(r.paidAmount ?? "0"),
    pendingAmount: parseFloat(r.pendingAmount ?? "0"),
  }));

  res.json(ListInvoicesResponse.parse(parsed));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, discount = 0, tax = 0, ...invoiceData } = parsed.data;

  const subtotal = (items ?? []).reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const totalAmount = subtotal - discount + tax;
  const pendingAmount = totalAmount;

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      ...invoiceData,
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      subtotal: subtotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paidAmount: "0.00",
      pendingAmount: pendingAmount.toFixed(2),
      status: "Unpaid",
    })
    .returning();

  if (items && items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      items.map((item) => ({
        invoiceId: invoice.id,
        serviceType: item.serviceType,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        total: (item.quantity * item.unitPrice).toFixed(2),
      }))
    );
  }

  const result = await buildInvoiceResponse(invoice.id);
  res.status(201).json(GetInvoiceResponse.parse(result));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await buildInvoiceResponse(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(GetInvoiceResponse.parse(result));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, discount, tax, ...invoiceData } = parsed.data;

  const updateData: Record<string, unknown> = { ...invoiceData, updatedAt: new Date() };
  if (discount !== undefined) updateData.discount = discount.toFixed(2);
  if (tax !== undefined) updateData.tax = tax.toFixed(2);

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  await db
    .update(invoicesTable)
    .set(updateData)
    .where(eq(invoicesTable.id, params.data.id));

  if (items !== undefined) {
    await db
      .delete(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, params.data.id));

    if (items.length > 0) {
      await db.insert(invoiceItemsTable).values(
        items.map((item) => ({
          invoiceId: params.data.id,
          serviceType: item.serviceType,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          total: (item.quantity * item.unitPrice).toFixed(2),
        }))
      );
    }
  }

  await recalcInvoice(params.data.id);

  const result = await buildInvoiceResponse(params.data.id);
  res.json(UpdateInvoiceResponse.parse(result));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .delete(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/invoices/:id/mark-paid", async (req, res): Promise<void> => {
  const params = MarkInvoicePaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const total = parseFloat(existing.totalAmount ?? "0");
  const paid = parseFloat(existing.paidAmount ?? "0");
  const remaining = total - paid;

  if (remaining > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(paymentsTable).values({
      invoiceId: params.data.id,
      amount: remaining.toFixed(2),
      paymentDate: today,
      paymentMethod: existing.paymentMethod ?? undefined,
      notes: "Marked as fully paid",
    });
  }

  await db
    .update(invoicesTable)
    .set({
      paidAmount: total.toFixed(2),
      pendingAmount: "0.00",
      status: "Paid",
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, params.data.id));

  const result = await buildInvoiceResponse(params.data.id);
  res.json(MarkInvoicePaidResponse.parse(result));
});

export { recalcInvoice };
export default router;
