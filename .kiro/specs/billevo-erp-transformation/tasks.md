# Implementation Plan: Billevo ERP Transformation

## Overview

This plan transforms Billevo from a basic localStorage billing app into a world-class UAE ERP system. The 38 tasks are organized into 9 dependency waves, each building on the previous. The implementation uses React 18 + TypeScript + Vite + Tailwind CSS on the frontend and Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) as the backend. All Indian GST/INR references are replaced with UAE VAT/AED throughout.

## Tasks

- [ ] 1. Install Dependencies and Configure Tooling
  - Install `@supabase/supabase-js`, `@tanstack/react-query`, `@tanstack/react-query-devtools`
  - Install `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`
  - Install `recharts`, `react-hot-toast`
  - Install `xlsx`, `jspdf`, `jspdf-autotable`
  - Install `i18next`, `react-i18next`
  - Update `tailwind.config.js` with custom color tokens, dark mode class, and `@tailwindcss/forms` plugin
  - Update `vite.config.ts` to enable manual chunks for code splitting
  - Create `src/lib/supabase.ts` Supabase client singleton
  - Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - _Requirements: R3, R20_

- [ ] 2. Supabase Project Setup and Database Schema
  - Create Supabase project and configure Auth email/password provider
  - Run migration for `companies`, `branches`, `user_profiles` tables
  - Run migration for `audit_logs` with append-only RLS policy
  - Run migration for all master data tables: customers, suppliers, products, warehouses, chart_of_accounts
  - Run migration for all sales document tables: sales_documents, sales_document_items
  - Run migration for all purchase document tables: purchase_documents, purchase_document_items
  - Run migration for payment tables: customer_receipts, receipt_allocations, supplier_payments, payment_allocations
  - Run migration for accounting tables: journal_entries, journal_lines, closed_periods, bank_accounts
  - Run migration for VAT tables: vat_config, vat_returns
  - Run migration for HR tables: employees, payroll_runs, payroll_lines
  - Run migration for POS tables: pos_sessions, pos_sales
  - Run migration for supporting tables: exchange_rates, notifications, document_attachments, workflow_approval_requests, customer_contacts, sales_pipeline_deals, doc_sequences
  - Create `next_doc_number()` PostgreSQL function for atomic sequential numbering
  - Enable RLS on every table with company_id isolation policy
  - Seed UAE-standard Chart of Accounts on company creation
  - _Requirements: R1, R2, R10, R20, R21_

- [ ] 3. Authentication and Security
  - Build `AuthLayout` component with centered card and Billevo branding
  - Build `LoginPage` with Supabase Auth email/password, error handling, and redirect logic
  - Build `ForgotPasswordPage` that sends Supabase password reset email
  - Build `TwoFactorPage` with 6-digit OTP entry, resend button, and 10-minute expiry countdown
  - Implement `authStore` Zustand store with user, profile, company, role, permissions, and `can()` helper
  - Create `RequireAuth` HOC that redirects unauthenticated users to `/login`
  - Create `RequirePermission` component that hides or disables UI elements based on `can()` result
  - Implement 30-minute inactivity auto-logout with `useActivityTimer` hook
  - Implement audit log writer utility called on every Create, Update, Delete operation
  - Build Settings → User Management page: list, invite, assign roles, deactivate, toggle 2FA per user
  - Build Settings → Audit Log page: searchable and filterable table with Excel/PDF export
  - _Requirements: R2, R21_

- [ ] 4. App Shell and Navigation
  - Build `AppLayout` with collapsible sidebar, sticky header, and Outlet
  - Implement sidebar with grouped navigation, active state highlighting, collapse to icon-only, and mobile overlay
  - Build header with debounced global search input, notification bell with unread badge, dark/light theme toggle with localStorage persistence, language toggle for EN/AR, and user profile dropdown
  - Implement `uiStore` Zustand store for theme, language, and sidebar state with localStorage persistence
  - Implement RTL switching: set `document.dir`, swap font family, use CSS logical properties throughout
  - Build `PageHeader` component with breadcrumbs, title, and actions slot
  - Build `SkeletonBlock` component with configurable rows and columns
  - Set up `react-hot-toast` with Billevo branded styling for success, error, warning, and info toasts
  - Build `NotificationCenter` dropdown with in-app notification list, mark-as-read, and navigation links
  - Implement `useRealtimeNotifications` hook using Supabase Realtime INSERT subscription
  - Set up `QueryClientProvider` and `ReactQueryDevtools` in `main.tsx`
  - Set up i18next with English and Arabic translation file stubs
  - Build `POSLayout` full-screen layout for the `/pos` route
  - _Requirements: R3, R4, R15_

- [ ] 5. Shared UI Component Library
  - Build `Button` component with primary, secondary, danger, ghost variants, loading spinner, and sm/md/lg sizes
  - Build `Input` component with label, placeholder, error message, helper text, and left/right icon slots
  - Build `Select` component with searchable dropdown and multi-select variant
  - Build `DatePicker` component for single date and date range selection
  - Build `Table` component with sortable columns, sticky header, loading skeleton, empty state, and pagination controls
  - Build `Modal` component with sm/md/lg/xl sizes, focus trap, backdrop close, and accessibility attributes
  - Build `Drawer` component as right-side slide panel for forms on narrow screens
  - Build `Card` component with optional header, footer, and accent border
  - Build `Badge` component with success, warning, danger, info, neutral variants
  - Build `AmountDisplay` component that formats AED amounts with symbol and 2 decimal places, RTL-safe
  - Build `FileUpload` component with drag-and-drop, progress bar, and file type and size validation
  - Build `SearchInput` component with debounce, clear button, and loading indicator
  - Build `Tabs` component with horizontal tab strips and panel content areas
  - Build `AmountCard` KPI card with icon, title, AED value, trend arrow, and subtitle
  - _Requirements: R3_

- [ ] 6. Company and VAT Configuration Settings
  - Build `CompanySettings` page with company name, logo upload, address, TRN (15-digit validated), fiscal year start, and base currency fields
  - Build `VATConfig` page with TRN, VAT registration date, filing period selector, and zero-rated/exempt product category management
  - Implement configurable VAT retention period setting (5 to 15 years, default 5)
  - _Requirements: R1, R11_

- [ ] 7. Product and Category Management
  - Build `CategoryList` page with tree view of categories and CRUD operations
  - Build `ProductList` page with paginated table, search by name/code/barcode, and category filter
  - Build `ProductForm` modal with all fields including required VAT category, valuation method, reorder level, barcode, and batch/serial tracking flags
  - Implement barcode keyboard scan listener for rapid scan input in product search fields
  - Build `ProductDetail` page with stock-per-warehouse widget and movement history tab
  - Enforce VAT category required before product can be used in any document
  - Block valuation method change when stock transactions already exist for the product
  - _Requirements: R1.10, R9.8, R9.11_

- [ ] 8. Customer Management
  - Build `CustomerList` page with paginated table, search, filter by group, and outstanding balance column
  - Build `CustomerForm` modal with all UAE fields, 15-digit TRN validation with invalid marking, credit limit, payment terms, and group assignment
  - Build `CustomerDetail` page with tabs for Overview, Transactions, Contacts, Statement, Pipeline Deals, and Attachments
  - Build Customer Statement generator with date range picker and PDF/Excel export
  - Build contact log for adding timestamped follow-up notes per customer
  - Build `CustomerGroup` CRUD management screen
  - Implement credit limit enforcement with warning modal and Manager/Admin confirmation bypass
  - Wire up overdue payment notification trigger via daily Edge Function check
  - _Requirements: R5_

- [ ] 9. Supplier Management
  - Build `SupplierList` page with paginated table, search, and outstanding payables column
  - Build `SupplierForm` modal with all UAE fields, 15-digit TRN validation, and bank details including IBAN
  - Build `SupplierDetail` page with tabs for Overview, Transactions, Ledger, Analytics, Statement, and Attachments
  - Build Supplier Statement generator with date range picker and PDF/Excel export
  - Build Supplier Ledger view showing all transactions in chronological order
  - Build per-supplier purchase analytics showing spend, orders, average order value, and on-time delivery rate
  - Implement duplicate TRN rejection on save with descriptive error message
  - _Requirements: R6_

- [ ] 10. Warehouse Management
  - Build `WarehouseList` page with CRUD for warehouses (code, name, default flag)
  - Build per-warehouse stock summary widget used in inventory and product pages
  - Integrate warehouse selector into all product and transaction forms
  - _Requirements: R9.1_

- [ ] 11. Chart of Accounts
  - Build `ChartOfAccounts` page with tree view up to 10 levels and account type color coding
  - Implement add, edit, and deactivate operations for account nodes
  - Seed UAE-standard COA automatically on company creation
  - Implement account search component used in journal entry forms
  - _Requirements: R10.1_

- [ ] 12. UAE VAT Engine Utilities
  - Implement `calculateLineVAT()` utility function: 5% for Standard, 0% for Zero-Rated and Exempt, half-up rounding, pre-registration date check
  - Implement invoice number sequence via `next_doc_number()` DB function
  - Build Form 201 data mapping function that aggregates transaction data into FTA box values
  - Write unit tests for VAT calculator covering all three categories and pre-registration date edge case
  - _Requirements: R1, R11_

- [ ] 13. Sales Documents Full Workflow
  - Build unified `SalesDocForm` component that adapts fields for Quotation, Sales Order, Delivery Note, and Invoice doc types
  - Build line items table component with product search, auto-VAT application from product master, quantity, discount, and real-time totals calculation
  - Build VAT summary block showing net, VAT amount, and gross per VAT category
  - Display customer TRN on Invoice only when customer TRN is marked valid
  - Build document conversion buttons that check source document status before allowing conversion
  - Implement stock deduction on Delivery Note confirmation with insufficient stock error listing affected lines
  - Implement atomic Journal Entry posting on Invoice finalisation with rollback on failure
  - Build `InvoiceList`, `QuotationList`, `SalesOrderList`, and `DeliveryNoteList` pages with status filters and search
  - Build FTA-compliant Invoice PDF template with all mandatory fields
  - Implement sequential invoice number generation via DB function
  - _Requirements: R7_

- [ ] 14. Credit Notes and Customer Receipts
  - Build Credit Note form that pre-fills line items from source Invoice and posts reversal Journal Entry on confirmation
  - Build `CreditNoteList` page
  - Build `ReceiptForm` with customer selector, amount, payment method, bank account selector, and invoice allocation table
  - Implement partial allocation of receipt amount across one or more outstanding invoices
  - Implement atomic Journal Entry posting on receipt save with rollback on failure
  - Build `ReceiptList` page with status filter
  - _Requirements: R7.5, R7.6, R7.7_

- [ ] 15. Purchase Documents Full Workflow
  - Build unified `PurchaseDocForm` component that adapts for Requisition, RFQ, PO, GRN, and Purchase Invoice
  - Implement document conversion chain with source_doc_id traceability reference stored on each converted document
  - Implement PO lock on approval with Manager/Admin unlock capability
  - Implement GRN over-receipt warning when received quantity exceeds PO quantity
  - Implement stock increment on GRN confirmation
  - Implement Purchase Invoice Journal Entry posting: Purchases/Inventory Dr + VAT Receivable Dr + AP Cr, with missing account error
  - Build `POList`, `RequisitionList`, `RFQList`, `GRNList`, and `PurchaseInvoiceList` pages
  - Build Purchase document PDF/print template
  - _Requirements: R8_

- [ ] 16. Debit Notes and Supplier Payments
  - Build Debit Note form supporting partial returns with proportional GL reversal Journal Entry
  - Build `SupplierPaymentForm` with supplier, amount, payment method, bank account, and invoice allocation
  - Implement over-payment rejection with "Payment amount exceeds outstanding balance" error message
  - Implement atomic Journal Entry posting on supplier payment (AP Dr, Bank/Cash Cr)
  - Build `SupplierPaymentList` page
  - Deploy Edge Function for daily 7-day due-date alert for supplier payments
  - _Requirements: R8.5, R8.6, R8.7, R6.6_

- [ ] 17. Inventory Management
  - Build `StockOverview` page with stock per product per warehouse, search, and low-stock row highlighting
  - Build `StockTransferForm` with source/destination warehouse, product, quantity, and atomic two-warehouse stock update
  - Build `AdjustmentForm` with product, warehouse, direction (increase/decrease), mandatory reason code, quantity, and atomic GL Journal Entry post
  - Build `InventoryMovements` log page filterable by product, warehouse, date range, and movement type
  - Build Batch tracking entry form for batch number, manufacture date, and expiry date per GRN line
  - Build Serial tracking entry form for unique serial number per unit in GRN
  - Implement reorder level check on every stock movement with in-app and email alert within 5 minutes
  - Build `StockMovementHistoryReport` filtered by product and date range
  - Build `InventoryValuationReport` as-at-date showing quantity and value per product per warehouse
  - _Requirements: R9_

- [ ] 18. General Ledger and Journal Entries
  - Build `JournalEntryList` page filterable by date, account, reference type, and status
  - Build manual Journal Entry form with date, description, and line items with debit/credit amounts and real-time balance validation
  - Implement debit-equals-credit validation with "Debits (AED X) do not equal credits (AED Y)" error message
  - Build Journal Entry detail view showing all lines
  - Build `ClosedPeriods` management screen and enforce period-closed posting block
  - _Requirements: R10.2, R10.3, R10.11_

- [ ] 19. Financial Reports
  - Build `TrialBalance` report with as-at date picker, opening/period/closing columns, and per-account reconciliation check
  - Build `ProfitAndLoss` report with current and comparative period columns
  - Build `BalanceSheet` report with as-at date and same-duration prior period comparative column
  - Build `CashFlowStatement` report auto-classified by account type assigned in COA
  - Wire up Excel and PDF export for all four financial reports with company logo, title, date range, and page numbers
  - _Requirements: R10.4, R10.5, R10.6, R10.7, R16.4_

- [ ] 20. Bank Reconciliation
  - Build `BankReconciliation` page with bank account selector and bank statement line import or manual entry
  - Implement matching of statement lines to system transactions (receipts and payments)
  - Display unmatched items on both sides and allow mark-as-reconciled action
  - _Requirements: R10.8_

- [ ] 21. Fixed Assets and Depreciation
  - Build `FixedAssetList` page with CRUD for assets including purchase date, cost, depreciation method, and useful life
  - Build depreciation schedule preview per asset
  - Implement monthly depreciation auto-post via Edge Function or manual "Run Depreciation" button
  - _Requirements: R10.10_

- [ ] 22. UAE VAT Reporting
  - Build `VATSummaryReport` page with period selector and Form 201 box values including standard, zero-rated, and exempt breakdowns
  - Build `VATAuditReport` page listing all transactions for the period with TRN, amounts, and VAT category
  - Implement VAT Return CSV export in FTA Form 201 column format including zero-value export for empty periods
  - Implement data retention enforcement: block deletion of records within retention window and display retention policy notice
  - _Requirements: R11_

- [ ] 23. HR and Payroll Module
  - Build `EmployeeList` and `EmployeeForm` pages with all fields including Emirates ID, passport, visa expiry
  - Deploy Edge Function for daily 60/30-day document expiry check generating in-app notifications
  - Build `AttendancePage` with daily grid per employee and status entry
  - Build leave type configuration screen (up to 20 types) and leave request form with line manager approval routing
  - Build `PayrollRun` page that initiates period run and auto-calculates gross and net pay per employee
  - Implement WPS SIF file generation excluding employees with missing IBAN with a warning summary
  - Implement payroll Journal Entry posting on confirmation with error state if posting fails
  - Implement payslip PDF generation per employee with all required fields
  - _Requirements: R12_

- [ ] 24. POS Terminal Module
  - Build `POSTerminal` full-screen page in POSLayout with product search panel, basket, and totals
  - Implement barcode keyboard scan listener with product lookup within 300ms and "Product not found" error
  - Build Cash, Card, and Split payment settlement forms
  - Implement atomic settlement: VAT-compliant receipt display/print + stock update + GL Journal Entry + session summary update, all with rollback on any failure
  - Build End-of-Day closing routine with declared cash entry and variance reconciliation report generated within 10 seconds
  - Build POS session open/close management
  - Implement ERP sync indicator with 5-second latency bound and 30-second auto-retry on failure
  - _Requirements: R13_

- [ ] 25. Document Attachments
  - Build `AttachmentPanel` shared component with file list, version history display, and upload button
  - Configure Supabase Storage bucket with RLS policies per company
  - Implement file upload with type validation (PDF/JPG/PNG/XLSX), 20MB size limit, and server-side content scan
  - Implement document versioning retaining previous versions with uploader identity and timestamp
  - Integrate `AttachmentPanel` into Customer, Supplier, Sales Invoice, Purchase Invoice, Employee, and Journal Entry detail pages
  - _Requirements: R14_

- [ ] 26. Workflow Approvals Engine
  - Build `WorkflowConfig` settings page to configure approval chains per document type and AED threshold
  - Implement approval request creation on document submission
  - Build `PendingApprovals` dashboard widget listing documents awaiting current user's approval
  - Build Approve and Reject actions with rejection reason input and document status revert to Draft on rejection
  - Implement approval chain auto-advancement on full approval that advances document status
  - Deploy escalation Edge Function checking every hour for approvals overdue by 48 hours
  - _Requirements: R17_

- [ ] 27. Notifications and Communication
  - Build `NotificationConfig` settings page to enable or disable in-app, email, and WhatsApp channels per event type
  - Wire in-app notification delivery via Supabase Realtime channel INSERT subscription
  - Deploy email notification Edge Function using configured SMTP or transactional email provider
  - Integrate WhatsApp Business API notification sending via Edge Function when API key is configured
  - Wire all notification events: invoice overdue, low stock, PO approved, payroll complete, document expiry, payment due
  - _Requirements: R15_

- [ ] 28. Multi-Company, Multi-Branch, and Multi-Currency
  - Build company switcher in header for users with access to multiple companies
  - Build branch selector to filter transactions and reports by branch
  - Build `ExchangeRateTable` settings page for manual rate entry per currency per day
  - Deploy exchange rate auto-fetch Edge Function with configurable provider
  - Implement foreign currency transaction recording: store foreign amount, AED equivalent, and exchange rate
  - Implement period-end FX revaluation: compute and post revaluation Journal Entries for outstanding foreign currency balances
  - _Requirements: R18_

- [ ] 29. Data Import and Export
  - Build Excel/CSV import screens for Customers, Suppliers, Products, and Opening Balances with template download
  - Implement row-level validation before commit: report all errors with row numbers; block commit if critical errors exist
  - Enforce 10,000-row per file limit with clear error message
  - Implement bulk export for all master and transaction data to Excel and CSV
  - Verify Supabase PostgREST REST API endpoints are accessible with JWT auth, pagination, and filtering
  - _Requirements: R19_

- [ ] 30. Sales Pipeline CRM
  - Build `PipelinePage` Kanban board with configurable stages and drag-and-drop stage movement
  - Build deal cards showing customer name, value, and expected close date
  - Build Deal form for create and edit with customer assignment and sales user assignment
  - _Requirements: R5.6_

- [ ] 31. Comprehensive Reports Module
  - Build `SalesReport` page with all filters (customer, product, salesperson, date range, VAT category) and chart visualization plus Excel/PDF export
  - Build `PurchaseReport` page with all filters and Excel/PDF export
  - Build `InventoryReport` page with Stock Ageing (0-30/31-60/61-90/90+ days buckets), Valuation, and Movement History sections plus Excel/PDF export
  - Build `CustomerStatements` bulk generation page
  - Build `SupplierStatements` bulk generation page
  - Build `ProfitabilityReport` at item level and customer level with gross margin display
  - Build `MISReport` page with 5 named KPIs for selected period and executive-friendly layout with export
  - Build `CustomReportBuilder` with entity/field selector, filter builder, grouping options, and saved template support (max 50 templates)
  - _Requirements: R16_

- [ ] 32. Real-Time Dashboard
  - Replace static dashboard stats with live Supabase RPC query data via React Query
  - Build 7 KPI cards using `AmountCard` component with computed AED values from requirements definitions
  - Build interactive Revenue chart using Recharts with daily/weekly/monthly breakdown and date range filter
  - Build Top-10 selling products table refreshed on each load
  - Build low-stock alert panel with "All stock levels are healthy" message when no alerts exist
  - Build recent transactions table showing last 10 sales and 10 purchase invoices with status badges
  - Build Cash Flow Summary card for current month
  - Implement date range filter that recomputes KPI cards and Revenue chart within 3 seconds
  - _Requirements: R4_

- [ ] 33. Global Search
  - Implement header search handler with 300ms debounce
  - Build parallel Supabase queries covering customers, suppliers, products, sales invoices, and purchase documents
  - Build result dropdown with grouped sections (Customers, Products, Invoices, etc.) and keyboard navigation
  - Navigate to the appropriate detail page on result item click
  - _Requirements: R3.7_

- [ ] 34. Mobile and Responsive Polish
  - Audit every page at 320px, 768px, 1024px, and 1440px viewport widths and fix any horizontal overflow
  - Replace overflow-triggering tables with card-based mobile layouts on screens below 768px
  - Verify sidebar, modal, and drawer components work correctly on mobile
  - Audit all POS and mobile interactive elements for 44x44px minimum touch target size
  - Test full application layout with Arabic RTL enabled at all breakpoints
  - _Requirements: R3.2, R13.1_

- [ ] 35. Performance and Bundle Audit
  - Run `vite build` with bundle analyzer and verify initial bundle is at or below 250KB gzipped
  - Verify each individual route chunk is at or below 150KB gzipped and add further splits where needed
  - Confirm skeleton loaders are present on all data-fetching pages for fetches longer than 200ms
  - Tune React Query staleTime to 5 minutes and gcTime to 30 minutes across all queries
  - Verify large tables (1000+ rows) use cursor-based pagination and not full data fetches
  - _Requirements: R3.5, R3.6, R20.2, R20.4_

- [ ] 36. Security Hardening
  - Review all RLS policies in Supabase to verify no cross-company data leakage
  - Confirm JWT session is stored in Supabase in-memory session store and never written to localStorage
  - Test that every UI control is hidden or disabled when `can()` returns false for the current role
  - Test 2FA OTP expiry at exactly 10 minutes (OTP is invalidated and login must restart)
  - Test session auto-logout fires at 30 minutes of inactivity
  - Test that audit log rows cannot be updated or deleted via any API call
  - Test that records within the 5-year retention window cannot be deleted (block + retention notice)
  - _Requirements: R2, R21_

- [ ] 37. i18n Translations
  - Complete `en.json` translation file covering all UI labels, validation messages, error messages, and action labels
  - Complete `ar.json` translation file with accurate Arabic translations for all keys
  - Verify all AED amount displays render correctly in RTL layout with proper symbol placement
  - Verify all date displays use DD/MM/YYYY format in both English and Arabic modes
  - _Requirements: R3.4_

- [ ] 38. localStorage Data Migration Script
  - Detect legacy localStorage keys on first login after upgrade (`billing_products`, `billing_customers`, etc.)
  - Map `billing_products` to new `products` schema: add VAT category defaulting to STANDARD, add required fields
  - Map `billing_customers` to new `customers` schema: add UAE fields, set country to UAE
  - Map `billing_suppliers` to new `suppliers` schema
  - Map `billing_sales` to new `sales_documents` and `sales_document_items` tables
  - Map `billing_purchases` to new `purchase_documents` and `purchase_document_items` tables
  - Map `billing_inventory` to new `inventory_movements` table
  - Clear all legacy localStorage keys on successful migration
  - Set `migrated_at` timestamp on the company record to prevent re-running migration
  - _Requirements: R20.1_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3"] },
    { "wave": 3, "tasks": ["4", "5"] },
    { "wave": 4, "tasks": ["6"] },
    { "wave": 5, "tasks": ["7", "8", "9", "10", "11", "12"] },
    { "wave": 6, "tasks": ["13", "15", "17", "18", "38"] },
    { "wave": 7, "tasks": ["14", "16", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"] },
    { "wave": 8, "tasks": ["31", "32", "33"] },
    { "wave": 9, "tasks": ["34", "35", "36", "37"] }
  ]
}
```

## Notes

- All monetary calculations use AED (د.إ) and Indian GST references (CGST, SGST, IGST) are fully removed.
- The Supabase free tier supports this project in development; production deployment requires a Pro plan for custom SMTP, Edge Functions, and increased database size.
- Tasks 23 (HR/Payroll) and 24 (POS) are optional ERP modules — they can be deferred without blocking the core business workflow (Tasks 13–22).
- Each task is independently deployable; the app remains functional after each task completes because new routes are behind `RequireAuth` and the existing UI is preserved until replaced.
- Arabic translations (Task 37) can be done in parallel with any feature task once the i18next setup in Task 4 is complete.
- The Custom Report Builder (Task 31) is the most complex UI task and should be built last within the reports group.
