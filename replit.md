# Pressure Wash Manager

A business management web app for a pressure washing company — manage customers, create invoices/quotations, track payments, and download PDF invoices.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port varies)
- `pnpm --filter @workspace/pressure-wash run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned automatically)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter
- API: Express 5 (artifact: api-server)
- DB: PostgreSQL + Drizzle ORM (Replit built-in)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- PDF: Browser print (`window.print()`) with `@media print` CSS

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (customers, invoices, invoice_items, payments)
- `artifacts/api-server/src/routes/` — Express route handlers (customers, invoices, payments, dashboard)
- `artifacts/pressure-wash/src/pages/` — React pages (dashboard, customers, invoices, payments)
- `artifacts/pressure-wash/src/components/Layout.tsx` — Sidebar layout
- `artifacts/pressure-wash/src/lib/format.ts` — Currency/date formatters

## Architecture decisions

- Supabase compatibility: Uses Replit's built-in PostgreSQL + Drizzle ORM. Since Supabase is built on Postgres, you can point `DATABASE_URL` at a Supabase connection string without any code changes.
- All calculations (subtotal, total, paidAmount, pendingAmount, status) are computed server-side to stay consistent across all clients.
- PDF generation uses `window.print()` with `@media print` CSS — no external library needed. The invoice area has `id="printable-invoice"` and all other UI is hidden during print.
- Payment records are stored separately in a `payments` table; the invoice totals are recalculated whenever a payment is added or deleted.
- OpenAPI-first: All API contracts are defined in `openapi.yaml`, then codegen produces typed React Query hooks and Zod validation schemas.

## Product

- Dashboard: Summary stats (customers, invoices, billed/paid/pending totals) + invoice status breakdown + recent invoices table
- Customers: Full CRUD with search — name, phone, email, address, type (Home/Gas Station/Commercial/Other), notes
- Invoices: Create with multiple service line items, discount, tax, payment method, notes; auto-calculates subtotal/total/balance
- Invoice Detail: Full view with PDF download (print), add payments, mark as paid, payment history
- Payments: Global payment history across all invoices with totals
- Status auto-updates: Unpaid → Partially Paid → Paid based on payments recorded

## Gotchas

- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Always run `pnpm --filter @workspace/db run push` after schema changes
- The `recalcInvoice` helper in `invoices.ts` must be called after any payment add/delete to keep totals in sync
- `window.print()` is the PDF mechanism — browser must allow popups/print

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
