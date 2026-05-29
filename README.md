# Power Clean Pro — Business Manager

A premium, full-stack business management application built for pressure washing businesses. Manage customers, generate professional invoices/quotations, track payments, monitor customer outstanding balances, and download invoices as PDFs.

---

## Tech Stack

- **Monorepo**: Built using `pnpm` workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack React Query
- **Backend API**: Express 5 + Node.js (bundled with `esbuild`)
- **Database**: PostgreSQL (Supabase) + Drizzle ORM
- **API Contract & Validation**: OpenAPI spec source of truth + Orval (automatic React Query & Zod schema generation)
- **PDF Generation**: Native browser printing (`window.print()`) with customized `@media print` CSS overrides

---

## Features Built

- **Vibrant Dashboard**: Quick summaries of total customers, total invoices, amounts billed, paid, and outstanding balances. View recent invoices and a breakdown of payment statuses.
- **Customer Directory**: Full CRUD with search capabilities. Categorize customers as Home, Gas Station, Commercial, or Other.
- **Invoice Creator**: Generate detailed invoices with multiple line items, tax, discounts, and payment methods. Subtotals and totals are automatically calculated on the server to prevent synchronization mismatches.
- **Invoice Details & PDF**: View details, add payments directly to the invoice, and print/download clean, professional PDF invoices.
- **Global Payment History**: View list of all received payments across all invoices.
- **Customer Balances Tracker**: See which customers owe money, how much they have paid, and their total outstanding balance.
- **Manager Authentication**: Standalone login page using cryptographically secure session cookies (PBKDF2) to protect business metrics.

---

## Local Setup & Installation

### 1. Prerequisites
- **Node.js**: v20.19+ or v22.12+ (Node.js v22 is recommended)
- **pnpm**: Make sure `pnpm` is installed globally:
  ```bash
  npm install -g pnpm
  ```

### 2. Clone and Install Dependencies
Install all package dependencies in the workspace root:
```bash
pnpm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
# PostgreSQL connection string (Supabase)
# Note: Wrap in quotes, and if your password contains special characters like '#',
# you MUST URL-encode them (e.g. '#' becomes '%23')
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Session Secret (any long random string used for signed cookie sessions)
SESSION_SECRET="your-long-random-string-here"
```

### 4. Database Setup & Sync
Push the Drizzle schema directly to your Supabase PostgreSQL database:
```bash
pnpm --filter @workspace/db run push
```
This automatically syncs the tables (`customers`, `invoices`, `invoice_items`, `payments`, `users`) without manual migrations.

### 5. Running the Application
Open two separate terminals in the project root:

- **Terminal 1 — API Server (Backend)**:
  ```bash
  pnpm --filter @workspace/api-server run dev
  ```
  *(Runs on port `8080`)*

- **Terminal 2 — React Client (Frontend)**:
  ```bash
  pnpm --filter @workspace/pressure-wash run dev
  ```
  *(Runs on port `5173`)*

Open [http://localhost:5173/](http://localhost:5173/) in your web browser. You will be redirected to the login page.

---

## App Usage Guide

### 1. Logging In
- The database is configured to automatically seed a default manager user on startup if the `users` table is empty.
- **Username**: `admin`
- **Password**: `admin123`
- Use these credentials to log in. You can log out at any time using the logout icon in the sidebar (desktop) or the mobile top bar.

### 2. Creating a Customer
1. Navigate to the **Customers** tab.
2. Click **Add Customer** in the top right.
3. Fill in the name, contact info, address, and select a **Customer Type** (Home / Gas Station / Commercial / Other).
4. Save the customer profile.

### 3. Creating an Invoice
1. Navigate to the **Invoices** tab or click **New** in the sidebar.
2. Select a customer from the dropdown.
3. Input the invoice date, due date, and service location.
4. Add line items: fill in the description, quantity, and unit price. Click **Add Item** for additional rows.
5. Set discount and tax rates (e.g., input `10` for a 10% tax).
6. Click **Create Invoice**. The subtotal, tax, discount, and final balance will calculate automatically.

### 4. Recording Payments
1. Search/click the invoice number to open the **Invoice Details** page.
2. Click the **Add Payment** button.
3. Input the amount paid, payment date, and payment method (Cash / Card / Zelle / Check / Bank Transfer / Other).
4. Save. The invoice totals, pending balance, and payment status (Unpaid → Partially Paid → Paid) will automatically update.

---

## Deploying to Render

To make your application public, you can deploy both components directly to Render.

### Deployment Architecture
- **API Server** will run as a **Web Service** (Node.js).
- **Vite Frontend** will run as a **Static Site** (React Static Site).

---

### Step 1: Deploy the Backend (Web Service)
1. Go to **Render Dashboard** → **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `power-clean-api` (or any custom name)
   - **Language**: `Node`
   - **Build Command**: `pnpm install && pnpm --filter @workspace/api-server run build`
   - **Start Command**: `pnpm --filter @workspace/api-server run start`
4. Under **Environment Variables**, add:
   - `DATABASE_URL`: `your-supabase-connection-uri` (remember to URL-encode password special characters)
   - `SESSION_SECRET`: `your-secure-random-string`
   - `NODE_ENV`: `production`
   - `PORT`: `8080` (Render will automatically bind this port)
5. Save and deploy. Copy the deployed service URL (e.g., `https://power-clean-api.onrender.com`).

---

### Step 2: Deploy the Frontend (Static Site)
1. Go to **Render Dashboard** → **New +** → **Static Site**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `power-clean-pro` (or any custom name)
   - **Build Command**: `pnpm install && pnpm --filter @workspace/pressure-wash run build`
   - **Publish Directory**: `artifacts/pressure-wash/dist/public`
4. Under **Environment Variables**, add:
   - `PORT`: `5173`
   - `BASE_PATH`: `/`
5. **CORS & Rewrite Rules (CRITICAL)**:
   Since the React app runs in the browser, requests to `/api/*` must be routed to your backend Web Service. On the Render Static Site page:
   - Go to **Redirects/Rewrites** in the sidebar.
   - Click **Add Rule**.
   - **Source**: `/api/*`
   - **Destination**: `https://your-api-url.onrender.com/api/*` (replace with your actual backend Web Service URL)
   - **Action**: `Rewrite` (do NOT use redirect, this acts as a reverse proxy)
   - Click **Save**.
6. Save and deploy the Static Site.

Once built, you can access your production app via your Render Static Site URL!
