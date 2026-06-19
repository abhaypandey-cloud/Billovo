# Design Document — Billevo ERP Transformation

## Overview

This document describes the technical architecture and design for transforming the existing Billevo billing application into a world-class, enterprise-grade ERP solution for businesses in Dubai, UAE. It covers system architecture, database schema, frontend structure, component design, authentication, VAT engine, workflow design, reporting, UI/UX design system, performance strategy, and migration plan.

The existing system is a React 18 + TypeScript + Vite + Tailwind CSS single-page application with no backend — all data stored in `localStorage`. The target system introduces Supabase (PostgreSQL + Auth + Storage + Realtime) as the backend, replaces Indian GST/INR with UAE VAT/AED, and delivers a full ERP module suite comparable to SAP Business One, Oracle NetSuite, Odoo Enterprise, and Zoho ERP.

## Architecture

See Section 1 below for the full system architecture including diagrams, module boundaries, state management layers, and deployment topology.

## Components and Interfaces

See Section 4 below for the complete component architecture including the shared UI component library, domain components, and layout components.

## Data Models

See Section 2 below for the complete PostgreSQL database schema covering all 40+ tables with column definitions, constraints, indexes, and RLS policy descriptions.

## Correctness Properties

### Property 1: Double-Entry Balance
Every Journal Entry must have equal total debits and credits before it can be posted — enforced by a PostgreSQL check trigger and application-layer Zod validation.

**Validates: Requirements 10.2, 10.3**

### Property 2: Atomic Stock Movements
Stock movements are atomic — a warehouse transfer reduces source stock and increases destination stock in the same PostgreSQL transaction so either both succeed or neither commits.

**Validates: Requirements 9.2**

### Property 3: Immutable Audit Log
The audit log is append-only — the RLS policy grants INSERT to authenticated company users but grants no UPDATE or DELETE so no existing row can ever be modified or removed.

**Validates: Requirements 21.2**

### Property 4: Gap-Free Document Sequences
Document number sequences are monotonically increasing with no gaps per company per doc_type, enforced by the `next_doc_number()` DB function using `ON CONFLICT DO UPDATE` as an atomic counter increment.

**Validates: Requirements 1.4, 11.5**

### Property 5: Correct VAT Calculation
VAT is calculated at exactly 5% for Standard-rated line items and exactly 0% for Zero-Rated and Exempt line items, rounded half-up to 2 decimal places using the `calculateLineVAT()` utility.

**Validates: Requirements 1.7, 1.8**

### Property 6: Ordered Workflow Stage Transitions
A sales document can only be converted to the next workflow stage when its current status is "Confirmed" or "Finalised" — the application rejects conversions from any other status and the DB column CHECK constraint enforces the allowed status enum values.

**Validates: Requirements 7.1**

### Property 7: Company Data Isolation
Every row in every business table is scoped to exactly one company via the `company_id` foreign key and an RLS policy evaluating `company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())`, preventing cross-company data access at the database layer.

**Validates: Requirements 2.3, 18.1, 20.3**

## Error Handling

- All Supabase errors are caught at the React Query mutation/query layer and surfaced as toast notifications.
- Form validation errors are shown inline via React Hook Form + Zod, never as alerts.
- Journal Entry posting failures roll back the triggering document status change atomically.
- Stock operation failures roll back all affected warehouse_stock rows atomically via PostgreSQL transactions.
- Export failures (PDF/Excel) retain filter state for user retry.
- API errors (4xx/5xx) are logged to the `api_error_logs` Supabase table with request context.

## Testing Strategy

- Unit tests: VAT calculator, invoice number sequencer, amount formatting utilities (Vitest).
- Integration tests: Supabase RPC functions (Trial Balance, P&L, VAT Summary) tested against seeded test data.
- Component tests: Key form components (InvoiceForm, PaymentForm) with React Testing Library.
- E2E tests: Critical paths — login, create invoice, post payment, generate VAT return (Playwright).

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema Design](#2-database-schema-design)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Component Architecture](#4-component-architecture)
5. [Authentication & Security Design](#5-authentication--security-design)
6. [UAE VAT Engine Design](#6-uae-vat-engine-design)
7. [Key Workflow Designs](#7-key-workflow-designs)
8. [Reporting Engine Design](#8-reporting-engine-design)
9. [UI/UX Design System](#9-uiux-design-system)
10. [Performance Strategy](#10-performance-strategy)
11. [Migration Strategy](#11-migration-strategy)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React 18 + TypeScript + Vite + Tailwind CSS                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Zustand │  │  React    │  │  React   │  │   i18next    │   │
│  │  (UI/   │  │  Query v5 │  │  Hook    │  │  (EN + AR)   │   │
│  │  Auth)  │  │  (Server  │  │  Form +  │  │              │   │
│  │         │  │  State)   │  │  Zod     │  │              │   │
│  └──────────┘  └───────────┘  └──────────┘  └──────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Recharts │ jsPDF │ xlsx │ Lucide React          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                    SUPABASE (BaaS)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Supabase   │  │  PostgreSQL  │  │ Storage  │  │Realtime │  │
│  │  Auth       │  │  (RLS +      │  │ (Docs,   │  │(Notif.  │  │
│  │  (JWT+2FA)  │  │  Triggers)   │  │ Avatars) │  │ Push)   │  │
│  └─────────────┘  └──────────────┘  └──────────┘  └─────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase Edge Functions (TypeScript)         │   │
│  │  • VAT Return generation  • Payroll SIF export           │   │
│  │  • Depreciation scheduler • Overdue payment checker      │   │
│  │  • WhatsApp notification  • Exchange rate fetcher        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Frontend Module Boundaries

Each ERP module is a lazy-loaded React chunk:

| Chunk | Routes | Approx. Size |
|---|---|---|
| `auth` | /login, /forgot-password, /2fa | < 40 KB |
| `dashboard` | / | < 60 KB |
| `crm` | /customers/*, /pipeline | < 80 KB |
| `suppliers` | /suppliers/* | < 60 KB |
| `products` | /products/*, /categories | < 60 KB |
| `sales` | /quotations/*, /orders/*, /invoices/*, /receipts/* | < 120 KB |
| `purchases` | /requisitions/*, /rfqs/*, /po/*, /grn/*, /purchase-invoices/* | < 120 KB |
| `inventory` | /inventory/*, /warehouses/*, /transfers/* | < 80 KB |
| `accounting` | /coa/*, /journal/*, /reports/financial/*, /bank-recon/* | < 100 KB |
| `vat` | /vat/*, /vat-returns/* | < 50 KB |
| `hr` | /employees/*, /attendance/*, /payroll/* | < 100 KB |
| `pos` | /pos | < 80 KB |
| `reports` | /reports/* | < 80 KB |
| `settings` | /settings/*, /users/*, /audit-log | < 60 KB |

### 1.3 State Management Layers

```
┌─────────────────────────────────────┐
│         SERVER STATE                │
│  React Query (TanStack Query v5)    │
│  • All Supabase data fetching       │
│  • Automatic cache & invalidation   │
│  • Optimistic mutations             │
│  • Pagination & infinite scroll     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         CLIENT UI STATE             │
│  Zustand stores                     │
│  • authStore: user, role, company   │
│  • uiStore: theme, lang, sidebar    │
│  • notificationStore: unread count  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         FORM STATE                  │
│  React Hook Form + Zod              │
│  • All CRUD forms                   │
│  • Client-side validation           │
│  • Type-safe schema validation      │
└─────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 Multi-Tenancy Strategy

Every table that contains business data includes a `company_id` foreign key. Row Level Security (RLS) policies on every table enforce that authenticated users can only access rows belonging to their company. Branch-level scoping uses an additional `branch_id` column where relevant.

### 2.2 Core Tables

#### `companies`
```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  trn             CHAR(15),
  vat_reg_date    DATE,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  logo_url        TEXT,
  base_currency   CHAR(3) NOT NULL DEFAULT 'AED',
  fiscal_year_start INT NOT NULL DEFAULT 1, -- month number 1-12
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `branches`
```sql
CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  name_ar     TEXT,
  address     TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX branches_company_id_idx ON branches(company_id);
```

#### `user_profiles` (extends `auth.users`)
```sql
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id  UUID NOT NULL REFERENCES companies(id),
  branch_id   UUID REFERENCES branches(id),
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN (
    'admin','manager','accountant','sales','purchase','warehouse','viewer'
  )),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  twofa_enabled BOOLEAN NOT NULL DEFAULT false,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_profiles_company_id_idx ON user_profiles(company_id);
-- RLS: users can read own row; admin can read/write all in same company
```

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id),
  user_id       UUID REFERENCES auth.users(id),
  action        TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','LOGIN_FAIL')),
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  ip_address    INET,
  before_data   JSONB,
  after_data    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_company_id_idx ON audit_logs(company_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(company_id, entity_type, entity_id);
-- RLS: append-only; no UPDATE or DELETE permitted via RLS policy
```

### 2.3 Master Data Tables

#### `customer_groups`
```sql
CREATE TABLE customer_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `customers`
```sql
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  trn             CHAR(15),
  trn_valid       BOOLEAN NOT NULL DEFAULT true,
  group_id        UUID REFERENCES customer_groups(id),
  email           TEXT,
  phone           TEXT NOT NULL,
  street          TEXT,
  emirate         TEXT,
  country         TEXT NOT NULL DEFAULT 'UAE',
  credit_limit    NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_terms   INT NOT NULL DEFAULT 30, -- days
  assigned_user_id UUID REFERENCES auth.users(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, trn) -- partial unique index for non-null TRN
);
CREATE INDEX customers_company_id_idx ON customers(company_id);
```

#### `suppliers`
```sql
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  trn             CHAR(15),
  trn_valid       BOOLEAN NOT NULL DEFAULT true,
  contact_name    TEXT,
  email           TEXT,
  phone           TEXT NOT NULL,
  street          TEXT,
  emirate         TEXT,
  country         TEXT NOT NULL DEFAULT 'UAE',
  payment_terms   INT NOT NULL DEFAULT 30,
  bank_account_name TEXT,
  bank_account_no   TEXT,
  bank_name         TEXT,
  iban              TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX suppliers_company_id_idx ON suppliers(company_id);
```

#### `product_categories`
```sql
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES product_categories(id)
);
```

#### `products`
```sql
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  name_ar          TEXT,
  description      TEXT,
  category_id      UUID REFERENCES product_categories(id),
  unit             TEXT NOT NULL DEFAULT 'pcs',
  sale_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_category     TEXT NOT NULL CHECK (vat_category IN ('STANDARD','ZERO_RATED','EXEMPT')),
  valuation_method TEXT NOT NULL DEFAULT 'WEIGHTED_AVG' CHECK (valuation_method IN ('FIFO','WEIGHTED_AVG')),
  reorder_level    NUMERIC(15,3),
  barcode          TEXT,
  is_stock_tracked BOOLEAN NOT NULL DEFAULT true,
  is_batch_tracked BOOLEAN NOT NULL DEFAULT false,
  is_serial_tracked BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX products_company_id_idx ON products(company_id);
CREATE INDEX products_barcode_idx ON products(company_id, barcode);
```

### 2.4 Inventory Tables

#### `warehouses`
```sql
CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (company_id, code)
);
```

#### `warehouse_stock`
```sql
CREATE TABLE warehouse_stock (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(15,3) NOT NULL DEFAULT 0,
  avg_cost        NUMERIC(15,4) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);
```

#### `inventory_movements`
```sql
CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  movement_type   TEXT NOT NULL CHECK (movement_type IN (
    'STOCK_IN','STOCK_OUT','TRANSFER_IN','TRANSFER_OUT',
    'ADJUSTMENT','GRN','DELIVERY','POS_SALE','RETURN'
  )),
  quantity        NUMERIC(15,3) NOT NULL,
  unit_cost       NUMERIC(15,4),
  reference_type  TEXT, -- 'grn','delivery_note','adjustment',etc.
  reference_id    UUID,
  reason          TEXT,
  batch_id        UUID,
  serial_id       UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inv_movements_product_idx ON inventory_movements(company_id, product_id, created_at DESC);
```

### 2.5 Sales Documents

```sql
-- Shared sequence function for invoice numbers
CREATE SEQUENCE sales_invoice_seq;

CREATE TABLE sales_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  branch_id       UUID REFERENCES branches(id),
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
    'QUOTATION','SALES_ORDER','DELIVERY_NOTE','INVOICE','CREDIT_NOTE'
  )),
  doc_number      TEXT NOT NULL,
  source_doc_id   UUID REFERENCES sales_documents(id), -- traceability
  customer_id     UUID NOT NULL REFERENCES customers(id),
  customer_name   TEXT NOT NULL,
  customer_trn    TEXT,
  doc_date        DATE NOT NULL,
  due_date        DATE,
  currency        CHAR(3) NOT NULL DEFAULT 'AED',
  exchange_rate   NUMERIC(12,6) NOT NULL DEFAULT 1,
  subtotal_aed    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_aed    NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount_aed  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_aed       NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_aed        NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_aed     NUMERIC(15,2) GENERATED ALWAYS AS (total_aed - paid_aed) STORED,
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  salesperson_id  UUID REFERENCES auth.users(id),
  notes           TEXT,
  journal_entry_id UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, doc_type, doc_number)
);

CREATE TABLE sales_document_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(15,3) NOT NULL,
  unit_price_aed  NUMERIC(15,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  net_amount_aed  NUMERIC(15,2) NOT NULL,
  vat_category    TEXT NOT NULL,
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount_aed  NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_amount_aed NUMERIC(15,2) NOT NULL,
  warehouse_id    UUID REFERENCES warehouses(id),
  sort_order      INT NOT NULL DEFAULT 0
);
CREATE INDEX sales_doc_items_doc_idx ON sales_document_items(document_id);
```

### 2.6 Purchase Documents

```sql
CREATE TABLE purchase_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  branch_id       UUID REFERENCES branches(id),
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
    'REQUISITION','RFQ','PURCHASE_ORDER','GRN','PURCHASE_INVOICE','DEBIT_NOTE'
  )),
  doc_number      TEXT NOT NULL,
  source_doc_id   UUID REFERENCES purchase_documents(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  supplier_name   TEXT NOT NULL,
  supplier_trn    TEXT,
  doc_date        DATE NOT NULL,
  due_date        DATE,
  delivery_date   DATE,
  currency        CHAR(3) NOT NULL DEFAULT 'AED',
  exchange_rate   NUMERIC(12,6) NOT NULL DEFAULT 1,
  subtotal_aed    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_aed    NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount_aed  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_aed       NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_aed        NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_aed     NUMERIC(15,2) GENERATED ALWAYS AS (total_aed - paid_aed) STORED,
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  notes           TEXT,
  journal_entry_id UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, doc_type, doc_number)
);

CREATE TABLE purchase_document_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES purchase_documents(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(15,3) NOT NULL,
  received_qty    NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_price_aed  NUMERIC(15,2) NOT NULL,
  net_amount_aed  NUMERIC(15,2) NOT NULL,
  vat_category    TEXT NOT NULL,
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount_aed  NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_amount_aed NUMERIC(15,2) NOT NULL,
  warehouse_id    UUID REFERENCES warehouses(id),
  sort_order      INT NOT NULL DEFAULT 0
);
```

### 2.7 Payments

```sql
CREATE TABLE customer_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  receipt_number  TEXT NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  receipt_date    DATE NOT NULL,
  amount_aed      NUMERIC(15,2) NOT NULL,
  payment_method  TEXT NOT NULL, -- CASH, BANK_TRANSFER, CHEQUE, CARD
  bank_account_id UUID,
  reference       TEXT,
  status          TEXT NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, REVERSED
  journal_entry_id UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receipt_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES customer_receipts(id),
  invoice_id      UUID NOT NULL REFERENCES sales_documents(id),
  allocated_aed   NUMERIC(15,2) NOT NULL
);

CREATE TABLE supplier_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  payment_number  TEXT NOT NULL,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  payment_date    DATE NOT NULL,
  amount_aed      NUMERIC(15,2) NOT NULL,
  payment_method  TEXT NOT NULL,
  bank_account_id UUID,
  reference       TEXT,
  status          TEXT NOT NULL DEFAULT 'PAID',
  journal_entry_id UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES supplier_payments(id),
  invoice_id      UUID NOT NULL REFERENCES purchase_documents(id),
  allocated_aed   NUMERIC(15,2) NOT NULL
);
```

### 2.8 Accounting Tables

```sql
CREATE TABLE chart_of_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  account_type    TEXT NOT NULL CHECK (account_type IN (
    'ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'
  )),
  cash_flow_type  TEXT CHECK (cash_flow_type IN ('OPERATING','INVESTING','FINANCING')),
  parent_id       UUID REFERENCES chart_of_accounts(id),
  level           INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  is_group        BOOLEAN NOT NULL DEFAULT false,
  is_control      BOOLEAN NOT NULL DEFAULT false, -- AR/AP control accounts
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (company_id, code)
);

CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  entry_number    TEXT NOT NULL,
  entry_date      DATE NOT NULL,
  reference_type  TEXT, -- INVOICE, RECEIPT, PAYMENT, ADJUSTMENT, etc.
  reference_id    UUID,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT','POSTED','REVERSED')),
  is_system       BOOLEAN NOT NULL DEFAULT false, -- auto-posted entries
  period_closed   BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journal_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_aed       NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_aed      NUMERIC(15,2) NOT NULL DEFAULT 0,
  description     TEXT,
  -- Constraint enforced in application and trigger: sum(debit) = sum(credit) per entry
  CONSTRAINT line_one_side CHECK (
    (debit_aed > 0 AND credit_aed = 0) OR
    (credit_aed > 0 AND debit_aed = 0) OR
    (debit_aed = 0 AND credit_aed = 0)
  )
);

CREATE TABLE closed_periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  closed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by   UUID REFERENCES auth.users(id),
  UNIQUE (company_id, period_year, period_month)
);

CREATE TABLE bank_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  account_no  TEXT,
  iban        TEXT,
  currency    CHAR(3) NOT NULL DEFAULT 'AED',
  coa_id      UUID REFERENCES chart_of_accounts(id),
  is_active   BOOLEAN NOT NULL DEFAULT true
);
```

### 2.9 VAT Tables

```sql
CREATE TABLE vat_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES companies(id),
  trn             CHAR(15),
  vat_reg_date    DATE,
  default_rate    NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  filing_period   TEXT NOT NULL DEFAULT 'QUARTERLY' CHECK (filing_period IN ('MONTHLY','QUARTERLY'))
);

CREATE TABLE vat_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','FILED')),
  -- Form 201 boxes (AED)
  standard_rated_sales     NUMERIC(15,2) DEFAULT 0,
  vat_on_sales             NUMERIC(15,2) DEFAULT 0,
  zero_rated_sales         NUMERIC(15,2) DEFAULT 0,
  exempt_sales             NUMERIC(15,2) DEFAULT 0,
  standard_rated_purchases NUMERIC(15,2) DEFAULT 0,
  vat_on_purchases         NUMERIC(15,2) DEFAULT 0,
  net_vat_payable          NUMERIC(15,2) DEFAULT 0,
  generated_at             TIMESTAMPTZ,
  filed_at                 TIMESTAMPTZ
);
```

### 2.10 HR & Payroll Tables

```sql
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  employee_no     TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  emirates_id     TEXT,
  passport_no     TEXT,
  visa_expiry     DATE,
  eid_expiry      DATE,
  passport_expiry DATE,
  designation     TEXT,
  department      TEXT,
  join_date       DATE NOT NULL,
  base_salary     NUMERIC(10,2) NOT NULL,
  bank_name       TEXT,
  iban            TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (company_id, employee_no)
);

CREATE TABLE payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  period_year     INT NOT NULL,
  period_month    INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','POSTED')),
  total_gross     NUMERIC(12,2),
  total_net       NUMERIC(12,2),
  journal_entry_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_year, period_month)
);

CREATE TABLE payroll_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  basic_salary    NUMERIC(10,2) NOT NULL,
  allowances      JSONB NOT NULL DEFAULT '[]',
  deductions      JSONB NOT NULL DEFAULT '[]',
  unpaid_leave_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  gross_pay       NUMERIC(10,2) NOT NULL,
  net_pay         NUMERIC(10,2) NOT NULL
);
```

### 2.11 POS Tables

```sql
CREATE TABLE pos_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  branch_id       UUID REFERENCES branches(id),
  cashier_id      UUID REFERENCES auth.users(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  opening_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_cash   NUMERIC(10,2),
  declared_cash   NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED'))
);

CREATE TABLE pos_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  session_id      UUID NOT NULL REFERENCES pos_sessions(id),
  sale_number     TEXT NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  sale_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal        NUMERIC(10,2) NOT NULL,
  vat_amount      NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  payment_method  TEXT NOT NULL,
  cash_received   NUMERIC(10,2),
  change_given    NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'COMPLETED',
  invoice_id      UUID REFERENCES sales_documents(id)
);
```

### 2.12 Supporting Tables

```sql
CREATE TABLE exchange_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  currency    CHAR(3) NOT NULL,
  rate_date   DATE NOT NULL,
  rate        NUMERIC(12,6) NOT NULL,
  UNIQUE (company_id, currency, rate_date)
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  user_id     UUID REFERENCES auth.users(id),
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  channel     TEXT NOT NULL DEFAULT 'IN_APP',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;

CREATE TABLE document_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       INT NOT NULL,
  mime_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  doc_type        TEXT NOT NULL,
  doc_id          UUID NOT NULL,
  approver_id     UUID REFERENCES auth.users(id),
  level           INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED')),
  rejection_reason TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  note        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales_pipeline_deals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  title       TEXT NOT NULL,
  stage       TEXT NOT NULL DEFAULT 'PROSPECT',
  value_aed   NUMERIC(15,2),
  expected_close DATE,
  assigned_to UUID REFERENCES auth.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Frontend Architecture

### 3.1 Route Map

```typescript
// src/router.tsx — All routes with lazy loading
const routes = [
  // Auth
  { path: '/login',           component: lazy(() => import('./pages/auth/Login')) },
  { path: '/forgot-password', component: lazy(() => import('./pages/auth/ForgotPassword')) },
  { path: '/2fa',             component: lazy(() => import('./pages/auth/TwoFactor')) },

  // Dashboard
  { path: '/',                component: lazy(() => import('./pages/Dashboard')) },

  // CRM
  { path: '/customers',       component: lazy(() => import('./pages/crm/CustomerList')) },
  { path: '/customers/new',   component: lazy(() => import('./pages/crm/CustomerForm')) },
  { path: '/customers/:id',   component: lazy(() => import('./pages/crm/CustomerDetail')) },
  { path: '/pipeline',        component: lazy(() => import('./pages/crm/Pipeline')) },

  // Suppliers
  { path: '/suppliers',       component: lazy(() => import('./pages/suppliers/SupplierList')) },
  { path: '/suppliers/:id',   component: lazy(() => import('./pages/suppliers/SupplierDetail')) },

  // Products
  { path: '/products',        component: lazy(() => import('./pages/products/ProductList')) },
  { path: '/products/:id',    component: lazy(() => import('./pages/products/ProductDetail')) },
  { path: '/categories',      component: lazy(() => import('./pages/products/Categories')) },

  // Sales
  { path: '/quotations',      component: lazy(() => import('./pages/sales/QuotationList')) },
  { path: '/quotations/:id',  component: lazy(() => import('./pages/sales/SalesDocForm')) },
  { path: '/sales-orders',    component: lazy(() => import('./pages/sales/SalesOrderList')) },
  { path: '/delivery-notes',  component: lazy(() => import('./pages/sales/DeliveryNoteList')) },
  { path: '/invoices',        component: lazy(() => import('./pages/sales/InvoiceList')) },
  { path: '/credit-notes',    component: lazy(() => import('./pages/sales/CreditNoteList')) },
  { path: '/receipts',        component: lazy(() => import('./pages/sales/ReceiptList')) },

  // Purchases
  { path: '/requisitions',    component: lazy(() => import('./pages/purchases/RequisitionList')) },
  { path: '/rfqs',            component: lazy(() => import('./pages/purchases/RFQList')) },
  { path: '/purchase-orders', component: lazy(() => import('./pages/purchases/POList')) },
  { path: '/grn',             component: lazy(() => import('./pages/purchases/GRNList')) },
  { path: '/purchase-invoices', component: lazy(() => import('./pages/purchases/PurchaseInvoiceList')) },
  { path: '/debit-notes',     component: lazy(() => import('./pages/purchases/DebitNoteList')) },
  { path: '/supplier-payments', component: lazy(() => import('./pages/purchases/SupplierPaymentList')) },

  // Inventory
  { path: '/inventory',       component: lazy(() => import('./pages/inventory/StockOverview')) },
  { path: '/warehouses',      component: lazy(() => import('./pages/inventory/Warehouses')) },
  { path: '/stock-transfers', component: lazy(() => import('./pages/inventory/StockTransfers')) },
  { path: '/adjustments',     component: lazy(() => import('./pages/inventory/Adjustments')) },

  // Accounting
  { path: '/coa',             component: lazy(() => import('./pages/accounting/ChartOfAccounts')) },
  { path: '/journal-entries', component: lazy(() => import('./pages/accounting/JournalEntries')) },
  { path: '/bank-recon',      component: lazy(() => import('./pages/accounting/BankReconciliation')) },
  { path: '/fixed-assets',    component: lazy(() => import('./pages/accounting/FixedAssets')) },

  // VAT
  { path: '/vat-config',      component: lazy(() => import('./pages/vat/VATConfig')) },
  { path: '/vat-returns',     component: lazy(() => import('./pages/vat/VATReturns')) },

  // HR
  { path: '/employees',       component: lazy(() => import('./pages/hr/EmployeeList')) },
  { path: '/attendance',      component: lazy(() => import('./pages/hr/Attendance')) },
  { path: '/payroll',         component: lazy(() => import('./pages/hr/Payroll')) },

  // Reports
  { path: '/reports/sales',    component: lazy(() => import('./pages/reports/SalesReport')) },
  { path: '/reports/purchases', component: lazy(() => import('./pages/reports/PurchaseReport')) },
  { path: '/reports/inventory', component: lazy(() => import('./pages/reports/InventoryReport')) },
  { path: '/reports/financial', component: lazy(() => import('./pages/reports/FinancialReports')) },
  { path: '/reports/vat',      component: lazy(() => import('./pages/reports/VATReport')) },
  { path: '/reports/custom',   component: lazy(() => import('./pages/reports/CustomReportBuilder')) },

  // POS
  { path: '/pos',              component: lazy(() => import('./pages/pos/POSTerminal')), layout: 'pos' },

  // Settings
  { path: '/settings',         component: lazy(() => import('./pages/settings/CompanySettings')) },
  { path: '/settings/users',   component: lazy(() => import('./pages/settings/UserManagement')) },
  { path: '/settings/audit',   component: lazy(() => import('./pages/settings/AuditLog')) },
  { path: '/settings/workflow', component: lazy(() => import('./pages/settings/WorkflowConfig')) },
];
```

### 3.2 Sidebar Navigation Structure

```typescript
const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  {
    group: 'Sales',
    icon: ShoppingCart,
    children: [
      { label: 'Quotations', href: '/quotations', icon: FileText },
      { label: 'Sales Orders', href: '/sales-orders', icon: ClipboardList },
      { label: 'Delivery Notes', href: '/delivery-notes', icon: Truck },
      { label: 'Invoices', href: '/invoices', icon: Receipt },
      { label: 'Credit Notes', href: '/credit-notes', icon: FileMinus },
      { label: 'Receipts', href: '/receipts', icon: Wallet },
    ],
  },
  {
    group: 'Purchases',
    icon: ShoppingBag,
    children: [
      { label: 'Requisitions', href: '/requisitions' },
      { label: 'RFQ', href: '/rfqs' },
      { label: 'Purchase Orders', href: '/purchase-orders' },
      { label: 'GRN', href: '/grn' },
      { label: 'Purchase Invoices', href: '/purchase-invoices' },
      { label: 'Debit Notes', href: '/debit-notes' },
      { label: 'Supplier Payments', href: '/supplier-payments' },
    ],
  },
  {
    group: 'Inventory',
    children: [
      { label: 'Stock Overview', href: '/inventory' },
      { label: 'Warehouses', href: '/warehouses' },
      { label: 'Stock Transfers', href: '/stock-transfers' },
      { label: 'Adjustments', href: '/adjustments' },
    ],
  },
  {
    group: 'CRM',
    children: [
      { label: 'Customers', href: '/customers' },
      { label: 'Sales Pipeline', href: '/pipeline' },
    ],
  },
  {
    group: 'Suppliers',
    children: [
      { label: 'Suppliers', href: '/suppliers' },
    ],
  },
  {
    group: 'Products',
    children: [
      { label: 'Products', href: '/products' },
      { label: 'Categories', href: '/categories' },
    ],
  },
  {
    group: 'Accounting',
    children: [
      { label: 'Chart of Accounts', href: '/coa' },
      { label: 'Journal Entries', href: '/journal-entries' },
      { label: 'Bank Reconciliation', href: '/bank-recon' },
      { label: 'Fixed Assets', href: '/fixed-assets' },
    ],
  },
  { label: 'VAT', group: 'VAT', children: [
      { label: 'VAT Configuration', href: '/vat-config' },
      { label: 'VAT Returns', href: '/vat-returns' },
  ]},
  { group: 'HR', children: [
      { label: 'Employees', href: '/employees' },
      { label: 'Attendance', href: '/attendance' },
      { label: 'Payroll', href: '/payroll' },
  ]},
  { group: 'Reports', children: [
      { label: 'Sales Report', href: '/reports/sales' },
      { label: 'Purchase Report', href: '/reports/purchases' },
      { label: 'Inventory Report', href: '/reports/inventory' },
      { label: 'Financial Reports', href: '/reports/financial' },
      { label: 'VAT Reports', href: '/reports/vat' },
      { label: 'Custom Builder', href: '/reports/custom' },
  ]},
  { label: 'POS', href: '/pos', icon: Monitor },
  { group: 'Settings', children: [
      { label: 'Company', href: '/settings' },
      { label: 'Users', href: '/settings/users' },
      { label: 'Audit Log', href: '/settings/audit' },
      { label: 'Workflows', href: '/settings/workflow' },
  ]},
];
```

### 3.3 Zustand Stores

```typescript
// src/stores/authStore.ts
interface AuthStore {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  company: Company | null;
  role: ERPRole | null;
  permissions: PermissionMatrix;
  setSession: (user, profile, company) => void;
  clearSession: () => void;
  can: (module: string, action: 'create'|'read'|'update'|'delete') => boolean;
}

// src/stores/uiStore.ts
interface UIStore {
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setLanguage: (lang) => void;
  toggleSidebar: () => void;
}

// src/stores/notificationStore.ts
interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
}
```

### 3.4 React Query Key Convention

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  customers: {
    all: (companyId: string) => ['customers', companyId] as const,
    list: (companyId: string, filters: object) => ['customers', companyId, 'list', filters] as const,
    detail: (companyId: string, id: string) => ['customers', companyId, 'detail', id] as const,
    statement: (companyId: string, id: string, dates: object) => ['customers', companyId, 'statement', id, dates] as const,
  },
  invoices: {
    all: (companyId: string) => ['invoices', companyId] as const,
    list: (companyId: string, filters: object) => ['invoices', companyId, 'list', filters] as const,
  },
  dashboard: {
    kpis: (companyId: string, dateRange: object) => ['dashboard', 'kpis', companyId, dateRange] as const,
    topProducts: (companyId: string, dateRange: object) => ['dashboard', 'topProducts', companyId, dateRange] as const,
  },
  // ... pattern repeats for all entities
};
```

---

## 4. Component Architecture

### 4.1 Shared UI Component Library (`src/components/ui/`)

```
Button         — primary | secondary | danger | ghost variants, loading state
Input          — with label, error, hint, left/right adornment
Select         — searchable dropdown, multi-select variant
DatePicker     — single date and date range
Table          — sortable columns, pagination, row selection, empty state
Modal          — size variants (sm|md|lg|xl|full), trap focus
Drawer         — slide-in panel for forms
Card           — with optional header/footer/accent
Badge          — status variants (success|warning|danger|info|neutral)
SkeletonBlock  — configurable placeholder shapes
Toast          — success|error|warning|info, auto-dismiss
Tabs           — horizontal and vertical variants
PageHeader     — title, breadcrumb, actions slot
SearchInput    — debounced with clear button
AmountDisplay  — AED formatted with proper RTL handling
FileUpload     — drag-and-drop, progress, validation
```

### 4.2 Domain Components

```
InvoiceLineItems    — reusable line items table for all sales/purchase docs
VATSummaryBlock     — shows VAT breakdown totals on any document
DocumentStatusBadge — maps document status to badge variant
ApprovalWidget      — shows approval chain and current status
AttachmentPanel     — file list + upload for any entity
AuditTrailPanel     — recent changes for any entity
CustomerSearch      — searchable customer picker with balance display
ProductSearch       — searchable product picker with stock indicator
AmountCard          — KPI card with AED amount, trend, icon
ChartWrapper        — Recharts wrapper with skeleton loading state
```

### 4.3 Layout Components

```typescript
// Three layouts
AppLayout    — sidebar + header + main content (all ERP screens)
AuthLayout   — centered card (login, 2FA, forgot password)
POSLayout    — full-screen, no sidebar (POS terminal only)
```

---

## 5. Authentication & Security Design

### 5.1 Login Flow

```
User enters email + password
        │
        ▼
Supabase Auth.signInWithPassword()
        │
   ┌────┴────┐
   │ Invalid │──► Show error, increment attempt counter
   └────┬────┘
        │ Valid
        ▼
Is 2FA enabled for this user?
   ┌────┴────┐
   │   No    │──► Fetch user_profile (role, company, branch)
   └────┬────┘         │
        │ Yes           │
        ▼               │
Send OTP via Email       │
        │               │
        ▼               │
User enters 6-digit OTP  │
        │               │
   ┌────┴────┐          │
   │ Invalid │──► Error, resend option
   │ Expired │──► Restart flow
   └────┬────┘          │
        │ Valid          │
        ▼               ▼
Store JWT in memory (Supabase session)
        │
        ▼
Write to authStore (user, profile, role, company)
        │
        ▼
Redirect to dashboard / return URL
```

### 5.2 RBAC Permission Matrix

| Module | Admin | Manager | Accountant | Sales | Purchase | Warehouse | Viewer |
|---|---|---|---|---|---|---|---|
| Dashboard | CRUD | R | R | R | R | R | R |
| Customers | CRUD | CRUD | R | CRUD | R | R | R |
| Suppliers | CRUD | CRUD | R | R | CRUD | R | R |
| Products | CRUD | CRUD | R | R | R | CRU | R |
| Quotations | CRUD | CRUD | R | CRUD | - | - | R |
| Sales Orders | CRUD | CRUD | R | CRU | - | - | R |
| Invoices | CRUD | CRU | R | CRU | - | - | R |
| Receipts | CRUD | CRUD | CRUD | CR | - | - | R |
| PO / Requisitions | CRUD | CRUD | R | - | CRUD | R | R |
| GRN | CRUD | CRUD | R | - | CRU | CRUD | R |
| Inventory | CRUD | CRUD | R | R | R | CRUD | R |
| Accounting / COA | CRUD | R | CRUD | - | - | - | R |
| Journal Entries | CRUD | R | CRUD | - | - | - | R |
| VAT | CRUD | R | CRUD | - | - | - | R |
| HR / Payroll | CRUD | CRU | R | - | - | - | R |
| POS | CRUD | CRUD | R | CRUD | - | - | - |
| Reports | CRUD | R | R | R | R | R | R |
| Settings / Users | CRUD | R | - | - | - | - | - |
| Audit Log | R | - | - | - | - | - | - |

### 5.3 RLS Policy Pattern

Every business table follows this pattern:

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their company's data
CREATE POLICY "company_isolation" ON customers
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Audit log: append-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_only" ON audit_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_read_own_company" ON audit_logs
  FOR SELECT USING (
    company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );
-- No UPDATE or DELETE policy = blocked for all users
```

---

## 6. UAE VAT Engine Design

### 6.1 VATCategory Enum and Calculator

```typescript
// src/lib/vat.ts

export type VATCategory = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT';

export interface VATResult {
  netAmount: number;    // before VAT
  vatAmount: number;    // VAT at 5% or 0
  grossAmount: number;  // net + VAT
  vatCategory: VATCategory;
  vatRate: number;      // 5 or 0
}

export function calculateLineVAT(
  unitPrice: number,
  quantity: number,
  discountPct: number,
  vatCategory: VATCategory,
  transactionDate: Date,
  vatRegDate: Date | null
): VATResult {
  const net = roundHalfUp(unitPrice * quantity * (1 - discountPct / 100), 2);
  
  // Pre-registration: no VAT
  const preReg = vatRegDate && transactionDate < vatRegDate;
  const isVatable = vatCategory === 'STANDARD' && !preReg;
  
  const vatRate = isVatable ? 5 : 0;
  const vat = isVatable ? roundHalfUp(net * 0.05, 2) : 0;
  
  return { netAmount: net, vatAmount: vat, grossAmount: net + vat, vatCategory, vatRate };
}

function roundHalfUp(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
```

### 6.2 Invoice Number Sequencing

```typescript
// Stored in DB as a sequence per company per doc_type
// Supabase function for atomic increment:
CREATE OR REPLACE FUNCTION next_doc_number(
  p_company_id UUID,
  p_doc_type TEXT,
  p_prefix TEXT DEFAULT ''
) RETURNS TEXT AS $$
DECLARE
  v_next INT;
BEGIN
  INSERT INTO doc_sequences (company_id, doc_type, last_seq)
  VALUES (p_company_id, p_doc_type, 1)
  ON CONFLICT (company_id, doc_type)
  DO UPDATE SET last_seq = doc_sequences.last_seq + 1
  RETURNING last_seq INTO v_next;
  
  RETURN p_prefix || LPAD(v_next::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
-- Example output: INV-000001, INV-000002, ...
```

### 6.3 FTA Form 201 Mapping

```typescript
interface Form201 {
  box1_standard_rated_supplies: number;      // total net amount, standard rated sales
  box2_vat_on_standard_supplies: number;     // 5% VAT collected
  box3_zero_rated_supplies: number;          // zero-rated sales net amount
  box4_exempt_supplies: number;              // exempt sales net amount
  box5_total_taxable_supplies: number;       // box1 + box3
  box9_standard_rated_purchases: number;     // standard rated purchase net
  box10_vat_on_standard_purchases: number;   // input VAT
  box11_total_input_tax: number;             // box10
  box12_net_vat_payable: number;             // box2 - box11 (positive = payable)
}
```

---

## 7. Key Workflow Designs

### 7.1 Sales Workflow State Machine

```
DRAFT ──► CONFIRMED ──► DELIVERED ──► INVOICED ──► PAID
  │           │              │             │
  │     (Sales Order)  (Delivery     (Tax Invoice
  │                      Note)       finalised +
  │                                  GL posted)
  │
  └──► CANCELLED (any stage, no GL reversal for DRAFT)

Credit Note: INVOICED ──► spawns CREDIT_NOTE → reversal GL posted
```

### 7.2 Purchase Workflow State Machine

```
DRAFT ──► SUBMITTED ──► APPROVED ──► RECEIVED ──► INVOICED ──► PAID
           (Requisition)    (PO      (GRN + stock    (Purchase
                          locked)    updated)        Invoice +
                                                     GL posted)

Debit Note: INVOICED ──► spawns DEBIT_NOTE → partial GL reversal
```

### 7.3 Journal Entry Automation

| Trigger Event | Dr | Cr |
|---|---|---|
| Sales Invoice finalised | Accounts Receivable | Revenue + VAT Payable |
| Customer Receipt recorded | Bank/Cash | Accounts Receivable |
| Credit Note confirmed | Revenue + VAT Payable | Accounts Receivable |
| Purchase Invoice posted | Purchases/Inventory + VAT Receivable | Accounts Payable |
| Supplier Payment recorded | Accounts Payable | Bank/Cash |
| Debit Note confirmed | Accounts Payable | Purchases + VAT Receivable |
| Stock Adjustment (increase) | Inventory Asset | Stock Variance/Expense |
| Stock Adjustment (decrease) | Stock Variance/Expense | Inventory Asset |
| Payroll confirmed | Salary Expense | Accrued Payroll + Bank |
| Depreciation (monthly) | Depreciation Expense | Accumulated Depreciation |

### 7.4 Approval Workflow Engine

```typescript
interface ApprovalConfig {
  docType: 'QUOTATION' | 'PURCHASE_ORDER' | 'REQUISITION' | 'JOURNAL_ENTRY';
  thresholdAED: number;      // 0 = always requires approval
  levels: ApprovalLevel[];
  escalationHours: number;   // default 48
}

interface ApprovalLevel {
  order: number;
  approverRole: ERPRole;     // or specific user
  approverUserId?: string;
}
```

Flow: Document submitted → create `workflow_approval_requests` row for level 1 → notify approver → approved → move to level 2 (if exists) → all approved → auto-advance doc status → escalation job checks every hour.

---

## 8. Reporting Engine Design

### 8.1 Report Query Patterns (Supabase RPC)

All complex reports are implemented as PostgreSQL functions exposed via Supabase RPC:

```sql
-- Example: P&L Report
CREATE OR REPLACE FUNCTION get_pl_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
) RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  balance NUMERIC
) AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2 Excel Export

```typescript
// src/lib/excelExport.ts
import * as XLSX from 'xlsx';

export function exportToExcel<T>(
  data: T[],
  columns: { key: keyof T; header: string; format?: 'currency' | 'date' | 'percent' }[],
  sheetName: string,
  fileName: string,
  companyName: string
): void {
  const header = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => {
    const val = row[c.key];
    if (c.format === 'currency') return `AED ${Number(val).toFixed(2)}`;
    if (c.format === 'date') return new Date(val as string).toLocaleDateString('en-AE');
    return val;
  }));
  
  const ws = XLSX.utils.aoa_to_sheet([
    [companyName], // row 1: company name
    [sheetName],   // row 2: report title
    [],            // row 3: blank
    header,        // row 4: column headers
    ...rows
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
```

### 8.3 PDF Export

```typescript
// src/lib/pdfExport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  company: { name: string; logoUrl?: string },
  dateRange: string
): void {
  const doc = new jsPDF();
  let y = 15;
  
  // Company logo (if available)
  if (company.logoUrl) {
    doc.addImage(company.logoUrl, 'PNG', 15, y, 30, 15);
    y += 20;
  } else {
    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text(company.name, 15, y);
    y += 10;
  }
  
  // Report title and date range
  doc.setFontSize(12).setFont('helvetica', 'normal');
  doc.text(title, 15, y); y += 7;
  doc.setFontSize(9).text(`Period: ${dateRange}`, 15, y); y += 10;
  
  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: y,
    didDrawPage: (data) => {
      // Page number footer
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    },
  });
  
  doc.save(`${title}.pdf`);
}
```

---

## 9. UI/UX Design System

### 9.1 Color Palette

```typescript
// tailwind.config.js — extended theme
const colors = {
  primary: {
    50:  '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',   // primary blue
    600: '#2563eb',   // hover state
    700: '#1d4ed8',   // active state
    900: '#1e3a8a',
  },
  surface: {
    // Light mode
    page:     '#f8fafc',  // bg-slate-50
    card:     '#ffffff',
    border:   '#e2e8f0',  // slate-200
    input:    '#f1f5f9',  // slate-100
    // Dark mode
    'dark-page':  '#0f172a',  // slate-950
    'dark-card':  '#1e293b',  // slate-800
    'dark-border':'#334155',  // slate-700
  },
  semantic: {
    success: '#10b981',  // emerald-500
    warning: '#f59e0b',  // amber-500
    danger:  '#ef4444',  // red-500
    info:    '#3b82f6',  // blue-500
  },
};
```

### 9.2 Typography Scale

```css
/* Inter for LTR (English), IBM Plex Arabic for RTL (Arabic) */
--font-sans: 'Inter', system-ui, sans-serif;
--font-arabic: 'IBM Plex Arabic', 'Noto Kufi Arabic', sans-serif;

/* Scale: text-xs(12) text-sm(14) text-base(16) text-lg(18) text-xl(20) text-2xl(24) text-3xl(30) */
/* Weights: font-normal(400) font-medium(500) font-semibold(600) font-bold(700) */
```

### 9.3 Arabic RTL Implementation

```typescript
// src/i18n/index.ts — i18next setup
i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: enTranslations }, ar: { translation: arTranslations } },
    lng: localStorage.getItem('billevo_lang') || 'en',
    fallbackLng: 'en',
  });

// src/App.tsx — direction switching without reload
const { language } = useUIStore();
useEffect(() => {
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  document.body.style.fontFamily = language === 'ar' ? 'IBM Plex Arabic, sans-serif' : 'Inter, sans-serif';
}, [language]);
```

All layout uses CSS logical properties (`margin-inline-start`, `padding-inline-end`) instead of `margin-left`/`margin-right` to automatically mirror for RTL.

### 9.4 Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| `sm` | ≥ 640px | Mobile portrait |
| `md` | ≥ 768px | Mobile landscape / tablet |
| `lg` | ≥ 1024px | Sidebar shows, laptop |
| `xl` | ≥ 1280px | Comfortable ERP layout |
| `2xl` | ≥ 1536px | Wide desktop, optional second column |

---

## 10. Performance Strategy

### 10.1 Code Splitting

- Each ERP module is a separate `React.lazy` import (see section 3.1).
- Shared components and utilities are in a non-lazy `vendor` chunk.
- Target: initial bundle ≤ 250 KB gzipped; per-route chunk ≤ 150 KB gzipped.

### 10.2 React Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min — data fresh for 5 min
      gcTime:    30 * 60 * 1000,   // 30 min — keep in cache
      retry: 2,
      refetchOnWindowFocus: false,  // reduce noise in ERP context
    },
  },
});
```

### 10.3 Pagination (Cursor-Based)

For large tables (sales documents, inventory movements, audit log):

```typescript
// Supabase cursor pagination
const { data } = useInfiniteQuery({
  queryKey: queryKeys.invoices.list(companyId, filters),
  queryFn: async ({ pageParam = null }) => {
    let query = supabase
      .from('sales_documents')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('doc_type', 'INVOICE')
      .order('created_at', { ascending: false })
      .limit(25);
    if (pageParam) query = query.lt('created_at', pageParam);
    return query;
  },
  getNextPageParam: (lastPage) =>
    lastPage.data?.length === 25
      ? lastPage.data[lastPage.data.length - 1].created_at
      : undefined,
});
```

### 10.4 Realtime Notifications

```typescript
// src/hooks/useRealtimeNotifications.ts
export function useRealtimeNotifications(userId: string) {
  const { incrementUnread } = useNotificationStore();
  
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => incrementUnread())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
```

---

## 11. Migration Strategy

### Phase 1 — Foundation (Weeks 1–3)
- Set up Supabase project, configure Auth, storage buckets
- Create all database tables, indexes, RLS policies
- Install new dependencies: `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `recharts`, `xlsx`, `jspdf`, `jspdf-autotable`, `i18next`, `react-i18next`
- Implement `AppLayout`, `AuthLayout`, Zustand stores
- Build login page with Supabase Auth, 2FA flow
- Build Settings → Company and Settings → Users screens
- Replace `localStorage` auth with Supabase session

### Phase 2 — Masters (Weeks 4–5)
- Products with VAT category, barcode, reorder level
- Product Categories
- Customers with UAE TRN, credit limit, groups
- Suppliers with UAE TRN, bank details
- Warehouses
- Chart of Accounts (seed UAE-standard COA)
- VAT Configuration

### Phase 3 — Core Transactions (Weeks 6–9)
- Sales: Quotation → Sales Order → Delivery Note → Invoice
- Customer Receipts and payment allocation
- Credit Notes
- Purchase: Requisition → RFQ → PO → GRN → Purchase Invoice
- Supplier Payments and payment allocation
- Debit Notes
- Inventory: stock movements, transfers, adjustments
- All automated Journal Entries for above

### Phase 4 — Accounting & VAT (Weeks 10–11)
- General Ledger viewer
- Trial Balance, P&L, Balance Sheet, Cash Flow reports
- Bank Reconciliation
- Fixed Assets & Depreciation
- VAT Return preparation and Form 201 export
- Period closing

### Phase 5 — Advanced Modules (Weeks 12–14)
- HR: Employees, Attendance, Leave, Payroll, WPS SIF export
- POS Terminal
- Notifications system (in-app, email, WhatsApp config)
- Workflow Approvals engine
- Document Attachments (Supabase Storage)

### Phase 6 — Polish & Reports (Weeks 15–16)
- All report pages with Excel/PDF export
- Custom Report Builder
- Dashboard with Recharts charts and real KPI data
- Dark mode persistence, Arabic RTL
- Global search
- Mobile responsive testing
- Performance audit (bundle size, query times)
- Security audit (RLS, permissions)

### localStorage Migration

On first login after upgrade, a one-time migration script reads all existing `localStorage` keys (`billing_products`, `billing_customers`, etc.) and imports them into Supabase via bulk insert, mapping old types to new schema. A `migrated_at` timestamp in `companies` tracks completion. The script runs silently in the background and clears old `localStorage` keys on success.
