# Requirements Document

## Introduction

This document defines the requirements for transforming the existing Billevo billing application into a world-class, enterprise-grade ERP solution purpose-built for businesses operating in Dubai, UAE. The transformed system — hereafter called **Billevo ERP** — must be functionally comparable to SAP Business One, Oracle NetSuite, Odoo Enterprise, Microsoft Dynamics 365, and Zoho Books/ERP.

The existing codebase is a React 18 + TypeScript + Vite + Tailwind CSS frontend with no backend; all data is currently stored in `localStorage`. The transformation covers: replacing the Indian GST/INR tax-and-currency model with UAE VAT/AED, introducing a real backend (Supabase/PostgreSQL), adding secure JWT-based authentication with RBAC, and delivering the full suite of ERP modules described below.

---

## Glossary

- **ERP**: Enterprise Resource Planning — integrated business management software.
- **AED**: UAE Dirham (د.إ), the official currency of the United Arab Emirates.
- **VAT**: Value Added Tax — the UAE applies a standard rate of 5%, with zero-rated and exempt categories per Federal Decree-Law No. 8 of 2017.
- **FTA**: Federal Tax Authority — the UAE government body responsible for VAT administration and compliance.
- **TRN**: Tax Registration Number — the 15-digit VAT registration number issued by the FTA to registered UAE businesses.
- **Tax_Invoice**: A VAT-compliant invoice containing all mandatory fields required by the FTA.
- **Zero-Rated_Supply**: A taxable supply on which VAT is charged at 0% (e.g., international exports, certain food items).
- **Exempt_Supply**: A supply outside the scope of VAT on which no VAT may be charged or reclaimed.
- **WPS**: Wage Protection System — the UAE Ministry of Human Resources electronic salary transfer system.
- **RBAC**: Role-Based Access Control — access permissions granted by role rather than by individual user.
- **JWT**: JSON Web Token — a compact, URL-safe means of representing claims for authentication.
- **2FA**: Two-Factor Authentication — a second verification step beyond username/password.
- **OTP**: One-Time Password — a single-use numeric code used for 2FA verification.
- **FIFO**: First In, First Out — an inventory valuation method where the earliest purchased stock is sold first.
- **Weighted_Average**: An inventory valuation method that recalculates average unit cost after each receipt.
- **GRN**: Goods Receipt Note — a document confirming receipt of goods from a supplier.
- **RFQ**: Request for Quotation — a document sent to suppliers asking for price quotes.
- **PO**: Purchase Order — a document authorising a purchase from a supplier.
- **RTL**: Right-To-Left — the text direction used for Arabic script.
- **KPI**: Key Performance Indicator — a measurable value indicating business performance.
- **Chart_of_Accounts**: A structured list of all general ledger accounts used by a business.
- **Audit_Trail**: An immutable, time-stamped log of all create, update, and delete actions performed by users.
- **Skeleton_Loader**: A UI placeholder animation displayed while content is loading.
- **BaaS**: Backend as a Service — a managed cloud platform (e.g., Supabase) providing database, authentication, and storage APIs.
- **Supabase**: The chosen BaaS platform, providing PostgreSQL database, REST/GraphQL API, Auth, and Storage.
- **System**: The Billevo ERP application as a whole.
- **UI**: The user interface rendered in the browser.
- **API**: The REST or GraphQL interface exposed by Supabase / backend services.
- **Session**: An authenticated user interaction period, bounded by login and logout or timeout.
- **Warehouse**: A physical or logical location where inventory is stored.
- **Cost_Centre**: An organisational unit for tracking costs independently within the Chart of Accounts.
- **Journal_Entry**: A double-entry bookkeeping record debiting one account and crediting another.
- **POS**: Point of Sale — the retail billing interface used for in-person transactions.
- **Pipeline**: The CRM sales pipeline tracking the stages of a prospective customer deal.
- **MIS**: Management Information System — high-level reports used by executives for decision-making.

---

## Requirements

---

### Requirement 1: UAE Localisation — Currency and Tax System

**User Story:** As a business owner in Dubai, I want all monetary values displayed in AED and all tax calculations to follow UAE VAT rules, so that my financial records are legally compliant with FTA regulations.

#### Acceptance Criteria

1. THE System SHALL display all monetary amounts using the AED currency symbol (د.إ) and two decimal places in all of the following surfaces: every UI screen, every API JSON response, every Excel export, and every PDF export.
2. THE System SHALL remove all references to Indian GST tax components (CGST, SGST, IGST) and the INR currency symbol from all of the following: user-facing UI, API responses, data models, and database schema; such references may remain only in source-code migration comments.
3. THE System SHALL support three UAE VAT categories for every product and service: Standard (5%), Zero-Rated (0%), and Exempt; each product record SHALL store exactly one VAT category from this enumeration.
4. WHEN a Tax_Invoice is generated, THE System SHALL include all FTA-mandatory fields: supplier TRN, customer TRN (included only when the customer record has a valid TRN; omitted when TRN is absent or marked invalid), invoice date, sequential invoice number (numeric, company-scoped, no annual reset, no gaps), description of goods/services, unit price (AED), VAT amount per line, total VAT, and total amount payable.
5. WHEN a user saves a customer or supplier record containing a TRN value, THE System SHALL validate the TRN against the 15-digit numeric format before persisting.
6. IF a TRN value does not conform to the 15-digit numeric format, THEN THE System SHALL save the record but mark the TRN field as invalid, display the message "TRN must be exactly 15 digits", and prevent the record from being selected as the counterparty on any Tax_Invoice until the TRN is corrected.
7. WHEN computing VAT for a Standard-rated line item, THE System SHALL calculate VAT as exactly 5% of the net taxable amount, rounded to 2 decimal places using half-up rounding.
8. WHEN computing VAT for a Zero-Rated or Exempt line item, THE System SHALL record a VAT amount of AED 0.00 without applying any percentage.
9. THE System SHALL support a configurable VAT registration date per company; WHEN a transaction date is earlier than the company's VAT registration date, THE System SHALL set VAT to AED 0.00 for all line items on that transaction and display a notice that VAT does not apply before the registration date.
10. THE System SHALL require that every product and service record has a VAT category assigned (Standard, Zero-Rated, or Exempt) before it can be added to any sales or purchase document.

---

### Requirement 2: Authentication and Security

**User Story:** As a system administrator, I want a secure, production-grade authentication system with role-based access, so that only authorised users can access sensitive financial data.

#### Acceptance Criteria

1. THE System SHALL replace the hardcoded `admin/admin123` login with Supabase Auth, using Supabase's email/password provider as the credential store.
2. IF a login attempt supplies invalid credentials, THEN THE System SHALL return an HTTP 401 response with no JWT issued and no session created.
3. WHEN a user submits valid credentials, THE System SHALL return a JWT with an expiry of no more than 8 hours and store it in an HttpOnly cookie or secure in-memory store — not in `localStorage`.
4. THE System SHALL enforce seven predefined RBAC roles: Admin, Manager, Accountant, Sales, Purchase, Warehouse, and Viewer.
5. THE System SHALL enforce module-level and action-level (Create, Read, Update, Delete) permissions per role at the API layer; WHEN an API request is made for an action not permitted by the caller's role, THE System SHALL return an HTTP 403 response with an error body indicating insufficient permissions.
6. THE System SHALL enforce module-level and action-level permissions at the UI layer by hiding or disabling controls for actions the current user's role does not permit.
7. WHERE the 2FA feature is enabled for a user account, THE System SHALL send a 6-digit OTP to the user's registered email address upon successful password verification and SHALL require OTP entry before granting access; IF OTP delivery fails, THE System SHALL display an error and offer a resend option without granting access.
8. IF an OTP is not submitted within 10 minutes of issuance, THEN THE System SHALL invalidate the OTP and require the user to restart the login flow.
9. WHEN a user's Session has been inactive for 30 consecutive minutes, THE System SHALL automatically terminate the session and redirect the user to the login page.
10. THE System SHALL record every login attempt (successful and failed) in the Audit_Trail, including timestamp, user identifier, IP address, and outcome.
11. THE System SHALL record every Create, Update, and Delete action in the Audit_Trail, including timestamp, user identifier, affected entity type, entity ID, and before/after field values truncated to 1,000 characters per field.
12. THE System SHALL provide an Admin UI enabling authorised administrators to: create and deactivate user accounts, assign and modify user roles, view Audit_Trail entries, and enable or disable 2FA per user account.
13. IF a user account is deactivated by an Admin, THEN THE System SHALL immediately invalidate all active sessions for that account.
14. WHERE the IP Restrictions feature is enabled, THE System SHALL reject login attempts from IP addresses not on the configured allow-list and return an HTTP 403 response.

---

### Requirement 3: Modern Enterprise UI/UX and Navigation

**User Story:** As a daily ERP user, I want a modern, responsive, and fast interface comparable to SAP or NetSuite, so that I can navigate and complete tasks efficiently on any device.

#### Acceptance Criteria

1. THE UI SHALL provide a collapsible sidebar navigation with grouped module sections, supporting both expanded (labelled) and collapsed (icon-only) states.
2. THE System SHALL render the full application correctly on screen widths of 320 px (mobile), 768 px (tablet), 1024 px (laptop), and 1440 px (desktop); "correctly" means: no horizontal scrollbar appears, all navigation items are reachable, and all interactive elements are usable.
3. THE System SHALL support a Light Mode and a Dark Mode theme, persisting the user's preference across sessions using browser storage; IF browser storage is unavailable due to privacy settings or quota limits, THE System SHALL fall back to the default Light Mode theme without error.
4. WHEN a user selects a display language (English or Arabic), THE System SHALL switch text direction (LTR for English, RTL for Arabic), font, and layout alignment without a page reload.
5. WHEN a page is loading data, THE UI SHALL display Skeleton_Loaders in place of content until the data is available.
6. THE System SHALL implement route-based code splitting so that the initial bundle size delivered to the browser is no larger than 250 KB (gzipped).
7. WHEN a user has completed typing in the global search bar (defined as 300 ms after the last keystroke), THE System SHALL return matching results across customers, suppliers, products, invoices, and transactions within 500 ms.
8. WHILE the current user has one or more unread notifications, THE UI SHALL display a notification centre badge in the header showing the unread count; WHEN the count exceeds 99, THE badge SHALL display "99+".
9. THE UI SHALL use Lucide React icons for all icons throughout the interface; THE System SHALL use Recharts as the single charting library.
10. WHEN a toast notification is displayed, THE UI SHALL remain interactive, display no full-page error state, and retain the current navigation state.

---

### Requirement 4: Dashboard and Business Intelligence

**User Story:** As a business owner or manager, I want a real-time, data-driven dashboard, so that I can monitor KPIs and make informed decisions at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following KPI cards on load, defaulting to the current calendar month: Total Revenue (AED, sum of all finalised sales invoice totals), Total Purchases (AED, sum of all posted purchase invoice totals), Gross Profit (AED, Total Revenue minus Cost of Goods Sold), Gross Margin (%, Gross Profit divided by Total Revenue, displayed as 0% when Total Revenue is zero), Outstanding Receivables (AED, sum of unpaid sales invoices), Outstanding Payables (AED, sum of unpaid purchase invoices), and Total Inventory Value (AED, sum of quantity-on-hand multiplied by weighted-average cost per product).
2. THE Dashboard SHALL display an interactive Sales Revenue chart (bar or line) showing daily, weekly, and monthly breakdowns, defaulting to the current calendar month date range, and filterable by a user-selected date range.
3. WHEN the Dashboard loads, THE System SHALL compute and display the top-10 selling products list ranked by revenue for the selected date range.
4. THE Dashboard SHALL display a low-stock alert panel listing all products whose current stock level is at or below the product's configured reorder level; IF no products breach their reorder level, THE panel SHALL display the message "All stock levels are healthy".
5. THE Dashboard SHALL display a recent transactions table showing the last 10 sales invoices and last 10 purchase invoices with status badges (Pending, Confirmed, Cancelled for sales; Draft, Posted, Cancelled for purchases).
6. THE Dashboard SHALL display a Cash Flow Summary card showing net cash position for the current calendar month, calculated as: sum of Customer Receipt amounts with status "Received" minus sum of Supplier Payment amounts with status "Paid".
7. WHEN a user selects a date range filter on the Dashboard, THE System SHALL recompute and re-render all KPI cards and the Revenue chart to reflect only transactions within that date range within 3 seconds; the low-stock alert panel and recent transactions table are not affected by the date range filter.

---

### Requirement 5: Customer Management (CRM)

**User Story:** As a sales manager, I want a complete customer management system, so that I can track customer relationships, credit, and outstanding balances.

#### Acceptance Criteria

1. THE System SHALL maintain a Customer Master record with the following mandatory fields: full name (max 200 characters), primary phone (max 20 characters), email address (max 254 characters, valid email format), billing address — street (max 200 characters), emirate (max 100 characters), country (max 100 characters) —, TRN (optional, 15 digits when provided), customer group (required, selected from the configured group list), credit limit (AED, range AED 0.00 to AED 999,999,999.99), and payment terms (1 to 365 days); THE System SHALL enforce uniqueness on TRN when provided, and on the combination of name and primary phone when TRN is absent.
2. THE System SHALL support customer groups and categories, allowing customers to be filtered and reported by group.
3. WHEN a sales transaction is created that would cause the customer's outstanding balance — defined as the sum of all finalised, unpaid sales invoices for that customer — to exceed their configured credit limit, THE System SHALL display a warning and require Manager or Admin role confirmation to proceed.
4. IF a customer's credit limit is set to exactly AED 0.00, THEN THE System SHALL treat this as no credit allowed and require Manager or Admin confirmation for any transaction amount greater than AED 0.00.
5. WHEN a user requests a Customer Statement, THE System SHALL generate a statement listing all invoices, credit notes, and receipts for the customer within the user-specified date range, with opening balance (sum of unpaid amounts before the start date) and closing balance (opening balance plus period movements) in AED; IF the date range yields no transactions, THE statement SHALL display opening and closing balances only with a note indicating no transactions in the period.
6. THE System SHALL maintain a contact log per customer, allowing sales staff to record follow-up notes with timestamps.
7. THE System SHALL provide a Sales Pipeline view, allowing deals to be tracked across configurable stages (e.g., Prospect, Qualified, Proposal, Won, Lost).
8. WHEN a customer payment is overdue by more than the configured number of days, THE System SHALL generate an in-app notification and an optional email reminder to the assigned sales user; IF no sales user is assigned to the customer, THE System SHALL send the notification to all users with the Sales role.

---

### Requirement 6: Supplier Management

**User Story:** As a purchase manager, I want complete supplier records and ledgers, so that I can manage payables and evaluate supplier performance.

#### Acceptance Criteria

1. THE System SHALL maintain a Supplier Master record with the following mandatory fields: company name (max 200 characters), primary contact name (max 200 characters), phone (max 20 characters), email (max 254 characters, valid email format), address — street (max 200 characters), emirate (max 100 characters), country (max 100 characters) —, TRN (optional, exactly 15 digits when provided), payment terms (1 to 365 days), and bank account details — account name (max 200 characters), account number (max 30 characters), bank name (max 200 characters), IBAN (max 34 characters).
2. IF a new supplier record has the same TRN as an existing active supplier (when TRN is provided), THEN THE System SHALL reject the record and display the message "A supplier with this TRN already exists".
3. WHEN a user requests a Supplier Statement for a specified date range, THE System SHALL generate a statement listing all purchase invoices, debit notes, and payments for the supplier within that date range, with opening balance and closing balance in AED.
4. WHEN a user opens the Supplier Ledger for a supplier and specifies a date range, THE System SHALL display all financial transactions with that supplier in chronological order within the date range.
5. WHEN a user views per-supplier purchase analytics for a selected date range, THE System SHALL display: total spend (AED), number of orders, average order value (AED), and on-time delivery rate (percentage of purchase orders where GRN date is on or before the confirmed delivery date on the purchase order).
6. WHEN a supplier payment due date falls within 7 calendar days from today, THE System SHALL generate one in-app notification per payment to all users with the Purchase or Accountant role.

---

### Requirement 7: Sales Management

**User Story:** As a sales executive, I want to manage the full sales cycle from quotation to invoice, so that all sales documents are linked and VAT-compliant.

#### Acceptance Criteria

1. THE System SHALL support the following document workflow for sales: Quotation → Sales Order → Delivery Note → Tax_Invoice, where each stage can be created by converting the immediately preceding document only when that document has status "Confirmed" or "Finalised".
2. WHEN a Quotation with status "Confirmed" is converted to a Sales Order, THE System SHALL copy all line items (product ID, description, quantity, unit price, discount, VAT category, VAT rate), customer details, and VAT breakdowns to the new Sales Order record with no field omitted.
3. WHEN a Delivery Note is confirmed, THE System SHALL reduce the inventory stock quantity for each delivered item by the delivered quantity; IF the delivered quantity exceeds the available stock for any line item, THE System SHALL reject the confirmation and display a list of the affected line items with available quantities.
4. WHEN a Tax_Invoice is finalised, THE System SHALL atomically: (a) set the invoice status to "Finalised", (b) post the corresponding Journal_Entry (debit Accounts Receivable, credit Revenue, credit VAT Payable); IF the Journal_Entry posting fails, THE System SHALL roll back the status change, leave the invoice in "Draft" status, and display a descriptive error.
5. WHEN a Credit Note is created against a finalised Tax_Invoice, THE System SHALL post a new Journal_Entry that is the equal-and-opposite of the original Journal_Entry (debit Revenue, debit VAT Payable, credit Accounts Receivable), leaving the original Journal_Entry unmodified.
6. THE System SHALL record Customer Receipts matched against outstanding invoices; a receipt may fully or partially match one or more invoices; the customer's outstanding balance SHALL be reduced by the receipt amount applied to each matched invoice.
7. WHEN a Customer Receipt is recorded, THE System SHALL atomically post a Journal_Entry (debit Bank or Cash, credit Accounts Receivable); IF the Journal_Entry posting fails, THE System SHALL prevent the receipt from being saved and display a descriptive error.
8. THE System SHALL generate a Sales Report filterable by customer, product, salesperson, date range, and VAT category, exportable to Excel and PDF; IF the export generation fails, THE System SHALL display an error and retain the report filter state so the user can retry.
9. WHEN a sales line item is added, THE System SHALL automatically apply the VAT category and rate configured on the product master record, displaying the net amount, VAT amount, and gross amount per line; IF the product has no VAT category configured, THE System SHALL prevent the line item from being added and display the message "Product VAT category is not configured".

---

### Requirement 8: Purchase Management

**User Story:** As a purchase officer, I want to manage the full procurement cycle from requisition to invoice, so that all purchases are authorised, traceable, and accurately recorded.

#### Acceptance Criteria

1. THE System SHALL support the following document workflow for purchases: Purchase Requisition → RFQ → PO → GRN → Purchase Invoice, where each stage can be created by converting the preceding document; each converted document SHALL store the source document ID as a non-editable reference field for traceability.
2. WHEN a PO is approved, THE System SHALL lock the PO from further editing unless explicitly unlocked by a user with Manager or Admin role.
3. WHEN a GRN is confirmed, THE System SHALL increase the inventory stock quantity for each received item by the received quantity; IF the received quantity for any line item exceeds the corresponding PO quantity, THE System SHALL display a warning message identifying the affected lines and require explicit confirmation before saving.
4. WHEN a Purchase Invoice is posted, THE System SHALL post the corresponding Journal_Entry: debit the appropriate Purchases or Inventory account (Inventory account when the product is stock-tracked; Purchases expense account otherwise), debit VAT Receivable for the VAT amount, and credit Accounts Payable; IF any referenced account is missing or inactive, THE System SHALL prevent posting and display a list of the missing accounts.
5. THE System SHALL support creation of a Purchase Return (Debit Note) against an existing Purchase Invoice for a quantity up to and including the original invoiced quantity per line; WHEN a Debit Note is confirmed, THE System SHALL post a proportional reversal Journal_Entry and reduce the outstanding invoice amount accordingly.
6. THE System SHALL record Supplier Payments matched against outstanding purchase invoices; IF a payment amount exceeds the total outstanding balance for the matched invoices, THE System SHALL reject the payment and display the message "Payment amount exceeds outstanding balance".
7. WHEN a Supplier Payment is recorded, THE System SHALL post a Journal_Entry debiting Accounts Payable and crediting the Bank or Cash account selected by the user at the time of payment.
8. THE System SHALL generate a Purchase Report filterable by supplier, product, date range (up to 366 days), and PO status, exportable to Excel and PDF; IF the report yields no results, THE System SHALL display the message "No purchase records match the selected filters".

---

### Requirement 9: Inventory Management

**User Story:** As a warehouse manager, I want a multi-warehouse inventory system with full traceability, so that I know exactly what stock I have, where it is, and what it is worth.

#### Acceptance Criteria

1. THE System SHALL support multiple Warehouses, each with a unique code and name, and SHALL maintain separate stock balances per product per warehouse.
2. WHEN a Stock Transfer is initiated between two warehouses, THE System SHALL atomically reduce stock at the source warehouse and increase stock at the destination warehouse by the transferred quantity; IF the source warehouse has insufficient stock, THE System SHALL reject the transfer and display the available quantity.
3. THE System SHALL support Stock Adjustment entries (increase or decrease) with a mandatory reason code (e.g., Damage, Found, Count Correction).
4. WHEN a Stock Adjustment is saved, THE System SHALL atomically post a corresponding Journal_Entry to reflect the inventory value change; IF the Journal_Entry posting fails, THE System SHALL roll back the stock adjustment and display an error.
5. THE System SHALL support optional Batch Tracking for products configured with batch control, recording batch number, manufacture date, and expiry date per stock receipt.
6. THE System SHALL support optional Serial Number Tracking for products configured with serial control, recording one unique serial number per unit received.
7. WHEN a product's stock level falls to or below its configured Reorder Level, THE System SHALL generate an in-app notification and, if configured, deliver an email alert within 5 minutes of the stock movement; IF a product has no Reorder Level configured, THE System SHALL suppress all low-stock notifications for that product.
8. THE System SHALL support two inventory valuation methods per product: FIFO and Weighted_Average; the chosen method SHALL be applied to every stock movement for that product; WHEN stock transactions already exist for a product, THE System SHALL prevent changing the valuation method and display an error.
9. THE System SHALL produce a Stock Movement History report for any product, listing all inflows, outflows, transfers, and adjustments with dates and references.
10. THE System SHALL produce an Inventory Valuation Report showing quantity on hand and value on hand per product per warehouse, as at any user-specified date.
11. THE System SHALL support product barcodes and QR codes, allowing products to be looked up by scanning in the Sales, Purchases, and POS modules; IF a scanned code does not match any product, THE System SHALL display the message "Product not found" without clearing the current document.

---

### Requirement 10: Accounting Module

**User Story:** As an accountant, I want a full double-entry accounting system with UAE-standard Chart of Accounts and statutory financial statements, so that the books are always accurate and audit-ready.

#### Acceptance Criteria

1. THE System SHALL provide a Chart_of_Accounts structured into five root categories: Assets, Liabilities, Equity, Revenue, and Expenses, with up to 10 sub-levels of hierarchy.
2. THE System SHALL enforce double-entry bookkeeping: every Journal_Entry SHALL have equal total debit and credit amounts before it can be posted.
3. IF a Journal_Entry's total debits do not equal total credits, THEN THE System SHALL reject the entry and display the message "Debits (AED X) do not equal credits (AED Y)" with the actual calculated amounts.
4. THE System SHALL generate a Trial Balance report as at any user-specified date, displaying opening balance, period movements, and closing balance per account; before rendering, THE System SHALL verify that closing balance equals opening balance plus period movements for every account, and SHALL display a reconciliation error identifying any account that fails this check.
5. THE System SHALL generate a Profit & Loss Statement for any user-specified period, structured as: Revenue minus Cost of Goods Sold equals Gross Profit, minus Operating Expenses equals Net Profit.
6. THE System SHALL generate a Balance Sheet as at any user-specified date, structured as Assets equals Liabilities plus Equity, with a comparative column for the same-duration period immediately preceding the selected date.
7. THE System SHALL generate a Cash Flow Statement for any user-specified period, classified into Operating, Investing, and Financing activities; THE System SHALL automatically classify Journal_Entry lines into the appropriate activity based on the account type assigned in the Chart_of_Accounts.
8. THE System SHALL support Bank Reconciliation by allowing the user to match imported or manually-entered bank statement lines against system transactions, flagging unmatched items on both sides.
9. THE System SHALL maintain separate Accounts Receivable and Accounts Payable sub-ledgers, each reconcilable against its General Ledger control account at any time by generating a sub-ledger reconciliation report.
10. THE System SHALL support Fixed Asset records with configurable straight-line or declining-balance depreciation; at month-end, THE System SHALL automatically post depreciation Journal_Entries for all active fixed assets.
11. WHEN a financial period is closed by an Admin or Accountant, THE System SHALL prevent further posting of Journal_Entries to dates within that closed period and return an HTTP 400 response with the message "Financial period is closed" for any such attempt.

---

### Requirement 11: UAE VAT Compliance and Reporting

**User Story:** As an accountant, I want the system to fully manage UAE VAT calculations, produce FTA-compliant reports, and prepare VAT return data, so that I can meet FTA filing deadlines.

#### Acceptance Criteria

1. THE System SHALL maintain a VAT Configuration master with: company TRN (15 digits), VAT registration date, default VAT rate (5%), and the classified list of zero-rated and exempt product/service categories.
2. WHEN a user requests a VAT Summary Report for a specified period, THE System SHALL produce a report showing: total standard-rated sales (AED), total VAT collected on standard-rated sales (AED), total zero-rated sales (AED), total exempt sales (AED), total standard-rated purchases (AED), total VAT paid on standard-rated purchases (AED), and net VAT payable or reclaimable (AED).
3. WHEN a user requests a VAT Return export, THE System SHALL produce a CSV file with FTA column ordering covering all boxes of the UAE VAT Return Form 201; IF the selected period has no VAT transactions, THE System SHALL still generate the file with all monetary boxes set to zero.
4. WHEN a user requests a VAT Audit Report for a specified period, THE System SHALL list every transaction that contributed to the VAT Return, with: document number, date, counterparty TRN, net amount, VAT category, and VAT amount.
5. WHEN a user attempts to finalise a Tax_Invoice, THE System SHALL validate that the invoice contains: a sequential invoice number, the supplier TRN, an invoice date, and at least one line item.
6. IF a Tax_Invoice is missing any FTA-mandatory field, THEN THE System SHALL prevent finalisation and display a list of the missing fields without saving any changes.
7. THE System SHALL retain all VAT-related documents and Journal_Entries for a retention period configurable between 5 and 15 years (default: 5 years), preventing deletion of records within the retention window.
8. WHEN a user requests a VAT Return export for a period in which no VAT transactions exist, THE System SHALL generate the export file with all monetary fields set to zero and include a note in the file indicating no transactions were recorded for the period.

---

### Requirement 12: HR and Payroll Module

**User Story:** As an HR manager, I want an employee management and payroll system compliant with UAE WPS requirements, so that salaries are processed correctly and disbursed via the Wage Protection System.

#### Acceptance Criteria

1. THE System SHALL maintain an Employee Master with: full name, Emirates ID, passport number, visa expiry date, designation, department, date of joining, base salary (AED), and bank account details for WPS (IBAN, bank name, account name).
2. WHEN an attendance record is submitted for an employee for a given date, THE System SHALL save the status (Present, Absent, Leave, Holiday) and reject duplicate entries for the same employee and date with a validation error.
3. THE System SHALL support Leave Management with up to 20 configurable leave types (e.g., Annual, Sick, Unpaid), recording leave balances in whole days; leave requests SHALL be routed to the employee's line manager for approval or rejection.
4. WHEN the payroll run is initiated for a period, THE System SHALL calculate net pay per employee as: base salary plus configured allowance line items minus configured deduction line items minus (daily rate × unpaid leave days in the period), where daily rate equals base salary divided by the number of working days in the period; UAE personal income tax SHALL be applied at 0%.
5. WHEN a payroll run is confirmed, THE System SHALL generate a WPS-compliant Salary Information File (SIF) for the confirmed period; IF any employee's IBAN is missing or invalid, THE System SHALL exclude that employee from the SIF file, list the excluded employees in a warning summary, and continue generating the SIF for the remaining employees.
6. WHEN a payroll run is confirmed, THE System SHALL post Journal_Entries debiting Salary Expense accounts and crediting Bank and liability accounts; IF the posting fails, THE System SHALL retain the payroll run in "Confirmed" status and display an error indicating the journal was not posted.
7. THE System SHALL generate Employee Payslips in PDF format containing at minimum: employee name, employee ID, period, base salary, each allowance and deduction with amount, unpaid leave deduction, and net pay.
8. WHEN an employee document expiry date (visa, Emirates ID, or passport) falls within 60 days from today, THE System SHALL generate an in-app notification containing the employee name, document type, and expiry date; WHEN the expiry date falls within 30 days, THE System SHALL generate a second notification with the same content.

---

### Requirement 13: Point of Sale (POS) Module

**User Story:** As a retail cashier, I want a fast, touch-friendly POS interface, so that I can process in-store sales quickly and accurately.

#### Acceptance Criteria

1. THE POS Module SHALL provide a dedicated full-screen billing interface, separate from the main ERP navigation; all interactive controls SHALL have a minimum touch target size of 44×44 px and the interface SHALL be fully operable at a viewport width of 1024 px.
2. THE System SHALL allow product lookup in the POS by barcode scan, QR code scan, or text search.
3. WHEN a user enters 3 or more characters in the POS text search field, THE System SHALL return matching products within 500 ms.
4. WHEN a barcode is scanned in the POS, THE System SHALL add the corresponding product to the active sale within 300 ms; IF the scanned barcode does not match any product, THE System SHALL display the message "Product not found" without modifying the current sale.
5. THE POS Module SHALL support cash, card, and split-payment settlement methods.
6. WHEN a POS sale is settled, THE System SHALL within 2,000 ms atomically: print or display a VAT-compliant receipt (print only when a printer is connected; display on screen when no printer is available), reduce inventory stock for each line item, post the Journal_Entry to the General Ledger, and update the daily POS summary; IF any sub-operation fails, THE System SHALL roll back all sub-operations and display a descriptive error to the cashier.
7. WHEN a POS sale is settled and receipt printing is required but the printer is unavailable, THE System SHALL display the receipt on screen and record the sale normally without blocking.
8. WHEN an authorised user initiates the End-of-Day closing routine, THE System SHALL produce a reconciliation report within 10 seconds showing: expected cash (system-calculated), declared cash (entered by the cashier), and variance (declared minus expected); a positive variance indicates the cashier declared more cash than expected; a negative variance indicates a shortfall.
9. WHEN a POS sale is settled, THE System SHALL synchronise the transaction with the main ERP Accounts Receivable and Inventory modules within 5 seconds; IF synchronisation fails, THE System SHALL display a sync-failure indicator and automatically retry every 30 seconds until synchronisation succeeds.

---

### Requirement 14: Document Management

**User Story:** As any ERP user, I want to attach and retrieve files against any ERP record, so that all supporting documents are stored in one place and easy to find.

#### Acceptance Criteria

1. THE System SHALL support file attachments (PDF, JPG, PNG, XLSX; maximum 20 MB per file) on Customer, Supplier, Sales Invoice, Purchase Invoice, Employee, and Journal_Entry records.
2. THE System SHALL store attachments in Supabase Storage, not in the PostgreSQL database columns.
3. THE System SHALL support document versioning, retaining previous versions of replaced attachments with upload timestamp and uploader identity.
4. WHEN a user uploads a file, THE System SHALL perform a single server-side malicious content scan before storing it; zero-byte files SHALL be allowed to pass the scan and be stored normally; files that pass the initial scan SHALL be considered safe with no secondary detection mechanism required.
5. THE System SHALL restrict file download to users whose role has Read permission on the parent record.

---

### Requirement 15: Notifications and Communication

**User Story:** As an ERP user, I want to receive timely in-app, email, and optional WhatsApp notifications for key business events, so that I never miss an important action.

#### Acceptance Criteria

1. THE System SHALL send in-app notifications for the following events: new sales order received, invoice overdue, purchase order approved, low stock alert, employee document expiry, and payroll run complete.
2. THE System SHALL send email notifications for the same events listed in criterion 1, using configured SMTP or a transactional email provider.
3. WHERE the WhatsApp Business API integration is configured, THE System SHALL send WhatsApp notifications for invoice due reminders and payment confirmations to the customer's registered WhatsApp number.
4. THE System SHALL allow Admin users to configure which notification channels (in-app, email, WhatsApp) are active for each event type.
5. WHEN a notification is generated, THE System SHALL attempt to record it in the notification log with: event type, recipient user/contact, channel, timestamp, and delivery status; IF the log write fails, THE System SHALL continue without the log entry and SHALL not block notification delivery.

---

### Requirement 16: Reports and Analytics

**User Story:** As a manager or accountant, I want comprehensive, exportable reports covering all business dimensions, so that I can analyse performance and meet audit requirements.

#### Acceptance Criteria

1. THE System SHALL provide Sales Reports filterable by customer, product, product category, salesperson, date range, and VAT category, exportable to Excel (.xlsx) and PDF.
2. THE System SHALL provide Purchase Reports filterable by supplier, product, date range, and PO status, exportable to Excel and PDF.
3. THE System SHALL provide Inventory Reports including: Stock Ageing (grouped by 0–30, 31–60, 61–90, 90+ days since last movement), Stock Movement History, and Inventory Valuation, all exportable to Excel and PDF.
4. THE System SHALL provide Financial Reports: Profit & Loss, Balance Sheet, Cash Flow Statement, and Trial Balance, all exportable to Excel and PDF, with configurable comparative periods.
5. THE System SHALL provide UAE VAT Reports as described in Requirement 11.
6. THE System SHALL provide Customer Statements and Supplier Statements as described in Requirements 5 and 6.
7. THE System SHALL provide Profitability Reports at item level and customer level, showing revenue, cost, gross profit, and gross margin for any selected period.
8. THE System SHALL provide a Management MIS Report summarising the top 5 business KPIs for a selected period, suitable for executive presentation.
9. THE System SHALL provide a Custom Report Builder allowing users to select data entities, fields, filter criteria, and grouping, and save the configuration as a named report template.
10. WHEN any report is exported to PDF, THE System SHALL include the company logo, company name, report title, date range, and page numbers on every page; this requirement applies only when a PDF export is explicitly requested and does not apply to on-screen report rendering.

---

### Requirement 17: Workflow Approvals

**User Story:** As a finance controller, I want configurable multi-level approval workflows for key financial documents, so that high-value transactions are authorised before execution.

#### Acceptance Criteria

1. THE System SHALL support configurable approval chains for: Sales Quotations above a configurable threshold (AED), Purchase Orders above a configurable threshold (AED), Purchase Requisitions, and Journal_Entries above a configurable threshold (AED).
2. WHEN a document requiring approval is submitted, THE System SHALL notify the next approver in the chain via in-app notification and email.
3. WHEN an approver rejects a document, THE System SHALL record the rejection reason, notify the originator, and return the document to Draft status.
4. WHEN all approvers in the chain have approved a document, THE System SHALL automatically advance the document to the next workflow stage (e.g., from PO to GRN).
5. IF an approver has not acted on a pending approval within the configured escalation period (default: 48 hours), THEN THE System SHALL escalate the notification to the next approver level.

---

### Requirement 18: Multi-Company, Multi-Branch, and Multi-Currency

**User Story:** As a business group owner, I want to manage multiple companies and branches within one Billevo ERP instance, with full multi-currency support, so that I can consolidate reporting across entities.

#### Acceptance Criteria

1. THE System SHALL support multiple Company entities within a single installation, each with its own Chart_of_Accounts, VAT configuration, TRN, and financial data.
2. THE System SHALL support multiple Branches per Company, with transactions and reports filterable at the Branch level.
3. THE System SHALL support transactions in currencies other than AED, storing the exchange rate at the time of transaction.
4. THE System SHALL maintain a daily Exchange Rate table for configured currencies, allowing manual entry or automated fetch from a configurable exchange rate provider.
5. WHEN a transaction is posted in a foreign currency, THE System SHALL record both the foreign currency amount and the AED equivalent, using the exchange rate on the transaction date.
6. THE System SHALL calculate and post Foreign Currency Revaluation Journal_Entries for outstanding foreign currency receivables and payables at period end.

---

### Requirement 19: Data Import/Export and Integration

**User Story:** As an IT administrator, I want bulk data import/export capabilities and a REST API, so that I can migrate existing data and integrate with third-party systems.

#### Acceptance Criteria

1. THE System SHALL support bulk import of Customers, Suppliers, Products, and Opening Balances from Excel (.xlsx) and CSV files, with a downloadable template per entity.
2. WHEN a bulk import file is uploaded, THE System SHALL validate every row, report all validation errors with row numbers before committing any data, and reject the entire import if critical errors exist.
3. THE System SHALL support bulk export of any master data or transaction data to Excel (.xlsx) and CSV.
4. THE System SHALL expose a REST API with JWT authentication, providing CRUD endpoints for all major entities (customers, suppliers, products, invoices, payments).
5. THE API SHALL conform to HTTP status code conventions: 200 for success, 201 for creation, 400 for validation errors, 401 for unauthenticated, 403 for unauthorised, 404 for not found, and 500 for server errors.
6. THE API SHALL support pagination (page and pageSize parameters) and filtering on all list endpoints.

---

### Requirement 20: Performance, Scalability, and Technical Architecture

**User Story:** As a system architect, I want the ERP to be built on a scalable, maintainable, and secure technical foundation, so that it can grow with the business without requiring a complete rewrite.

#### Acceptance Criteria

1. THE System SHALL use Supabase (PostgreSQL) as the backend database and authentication provider, replacing all `localStorage` data persistence.
2. THE System SHALL implement React lazy loading and code splitting by module, so that no single route chunk exceeds 150 KB (gzipped).
3. THE System SHALL use Row Level Security (RLS) policies in Supabase to enforce data access control at the database layer in addition to the API layer.
4. THE System SHALL display a Skeleton_Loader for any data fetch that takes longer than 200 ms.
5. THE System SHALL implement optimistic UI updates for list edits (e.g., inline status changes) to reduce perceived latency.
6. THE System SHALL log all API errors (4xx and 5xx) with request context (endpoint, method, user ID, timestamp) to a configured logging service or Supabase table.
7. THE System SHALL support a configurable database backup schedule (minimum: daily) with point-in-time recovery capability provided by Supabase.
8. WHEN a database migration is applied, THE System SHALL maintain backward compatibility for at least one prior schema version to allow rollback.

---

### Requirement 21: Audit Compliance and Data Retention

**User Story:** As a compliance officer, I want all data changes to be fully auditable and retained for the legally required period, so that the business can respond to FTA audits without gaps.

#### Acceptance Criteria

1. THE System SHALL write an immutable Audit_Trail entry for every Create, Update, and Delete action on any financial record, capturing: user ID, timestamp (UTC), entity type, entity ID, action, and changed field values (before and after).
2. THE Audit_Trail table SHALL be append-only; no application code SHALL permit updating or deleting Audit_Trail entries.
3. THE System SHALL retain all financial records and associated Audit_Trail entries for a minimum of 5 years from the transaction date, in line with FTA requirements.
4. THE System SHALL allow Admin users to query the Audit_Trail by user, date range, entity type, and action, and export the results to Excel or PDF.
5. WHEN THE System detects that a record is within the 5-year retention window — in any context including viewing, editing, or deletion attempts — THE System SHALL display a retention policy notice indicating the record is protected; WHEN a deletion is attempted on a protected record, THE System SHALL block the deletion and display a retention policy error message.
