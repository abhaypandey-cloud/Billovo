// ─── COUNTRY / TAX CONFIG ───────────────────────────────────────────────────

export type CountryCode = 'IN' | 'AE' | 'US' | 'UK' | 'AU' | 'SG' | 'MY' | 'SA' | 'OTHER';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxSystem: 'GST_INDIA' | 'VAT_UAE' | 'GST_AU' | 'GST_SG' | 'SST_MY' | 'VAT_GENERIC' | 'SALES_TAX' | 'CUSTOM';
  taxLabel: string;           // e.g. "GST", "VAT", "Sales Tax"
  taxIdLabel: string;         // e.g. "GSTIN", "TRN", "EIN"
  defaultTaxRate: number;
  hasMultipleTaxComponents: boolean; // India: CGST+SGST+IGST
  states?: string[];
}

// India GST Slab
export interface GSTSlab {
  id: string;
  name: string;
  rate: number;         // total GST rate e.g. 18
  cgst: number;         // 9
  sgst: number;         // 9
  igst: number;         // 18
  cess?: number;
  applicableTo: string; // description
}

// Company / Business Settings
export interface CompanySettings {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: CountryCode;
  phone: string;
  email: string;
  website: string;
  // Tax IDs
  gstin?: string;          // India
  pan?: string;            // India
  trn?: string;            // UAE
  ein?: string;            // US
  abn?: string;            // Australia
  gstNumber?: string;      // SG/AU/MY
  vatNumber?: string;      // UK/EU
  // Financial Year
  financialYearStart: string; // 'YYYY-MM-DD'
  financialYearEnd: string;
  // Registration
  taxRegistrationDate: string;
  defaultTaxRate: number;
}

// ─── PRODUCT ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  category: string;
  stock: number;
  unit: string;
  // Tax Classification
  taxCategory: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'GST_0' | 'GST_5' | 'GST_12' | 'GST_18' | 'GST_28';
  hsnCode?: string;         // India HSN/SAC code
  sacCode?: string;
  // Legacy compat
  vatCategory?: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT';
  createdAt: Date;
  updatedAt: Date;
}

// ─── CUSTOMER ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  country: string;
  // Tax IDs
  gstin?: string;       // India
  trn?: string;         // UAE
  pan?: string;         // India
  vatNumber?: string;   // Generic
  // Legacy compat
  emirate?: string;
  creditLimit: number;
  paymentTerms: string;
  status: 'active' | 'inactive';
  // Accounting
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr';
  createdAt: Date;
  updatedAt: Date;
}

// ─── SUPPLIER ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  country: string;
  // Tax IDs
  gstin?: string;
  trn?: string;
  pan?: string;
  vatNumber?: string;
  // Legacy compat
  emirate?: string;
  iban?: string;
  paymentTerms: string;
  status: 'active' | 'inactive';
  // Accounting
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr';
  createdAt: Date;
  updatedAt: Date;
}

// ─── TAX BREAKDOWN ───────────────────────────────────────────────────────────

export interface TaxBreakdown {
  taxableAmount: number;
  cgst?: number;          // India intra-state
  sgst?: number;          // India intra-state
  igst?: number;          // India inter-state
  cess?: number;          // India cess
  vat?: number;           // UAE/UK/Generic
  serviceTax?: number;
  totalTax: number;
  taxRate: number;
}

// ─── SALE ────────────────────────────────────────────────────────────────────

export interface SaleItem {
  productId: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  price: number;
  discount?: number;
  taxRate: number;
  taxBreakdown: TaxBreakdown;
  vatRate?: number;       // Legacy
  vatAmount?: number;     // Legacy
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerGSTIN?: string;
  customerState?: string;
  // Dates
  invoiceDate: string;    // ISO date string
  dueDate?: string;
  items: SaleItem[];
  subtotal: number;
  taxBreakdown: TaxBreakdown;
  discount: number;
  total: number;
  // India GST flags
  isInterState?: boolean;
  placeOfSupply?: string;
  // Payment
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paidAmount?: number;
  notes?: string;
  // Legacy
  vatAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── PURCHASE ────────────────────────────────────────────────────────────────

export interface PurchaseItem {
  productId: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  price: number;
  taxRate: number;
  taxBreakdown: TaxBreakdown;
  vatRate?: number;
  vatAmount?: number;
  total: number;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGSTIN?: string;
  supplierState?: string;
  invoiceDate: string;
  items: PurchaseItem[];
  subtotal: number;
  taxBreakdown: TaxBreakdown;
  discount: number;
  total: number;
  isInterState?: boolean;
  placeOfSupply?: string;
  paymentMethod: string;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  vatAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference: string;
  reason: string;
  createdAt: Date;
}

// ─── ACCOUNTING ──────────────────────────────────────────────────────────────

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
export type AccountGroup =
  | 'Current Asset' | 'Fixed Asset' | 'Bank' | 'Cash'
  | 'Current Liability' | 'Long-Term Liability'
  | 'Capital' | 'Retained Earnings'
  | 'Sales Revenue' | 'Other Income'
  | 'Cost of Goods Sold' | 'Operating Expense' | 'Tax Expense';

export interface Account {
  id: string;
  code: string;           // e.g. "1001"
  name: string;
  type: AccountType;
  group: AccountGroup;
  description?: string;
  parentId?: string;
  isSystem: boolean;      // system accounts cannot be deleted
  isActive: boolean;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;    // e.g. "JV-1001"
  date: string;           // ISO date
  narration: string;
  reference?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  source?: 'manual' | 'sale' | 'purchase' | 'payment';
  sourceId?: string;      // Sale/Purchase ID
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  narration?: string;
}

// ─── ACCOUNTING REPORTS ──────────────────────────────────────────────────────

export interface LedgerEntry {
  date: string;
  narration: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  paymentNumber: string;
  type: 'receipt' | 'payment';  // receipt = received from customer, payment = paid to supplier
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'supplier';
  amount: number;
  paymentMethod: string;
  referenceId?: string;       // Invoice or PO number
  accountId: string;          // Bank/Cash account
  date: string;
  narration?: string;
  status: 'pending' | 'cleared';
  createdAt: Date;
  updatedAt: Date;
}

// ─── INDIA GST SPECIFIC ──────────────────────────────────────────────────────

// GSTR-1: Outward Supplies
export interface GSTR1Summary {
  period: string;           // 'YYYY-MM'
  b2b: GSTR1B2BEntry[];     // B2B registered customers
  b2c: GSTR1B2CEntry[];     // B2C unregistered / < 2.5L
  b2cLarge: GSTR1B2CEntry[]; // B2C > 2.5L inter-state
  exports: GSTR1ExportEntry[];
  cdnr: GSTR1CDNEntry[];    // Credit/Debit notes
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
}

export interface GSTR1B2BEntry {
  gstin: string;
  receiverName: string;
  invoices: {
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string;
    reverseCharge: boolean;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }[];
}

export interface GSTR1B2CEntry {
  placeOfSupply: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface GSTR1ExportEntry {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  portCode?: string;
  shippingBillNumber?: string;
}

export interface GSTR1CDNEntry {
  gstin: string;
  noteNumber: string;
  noteDate: string;
  noteType: 'C' | 'D';
  noteValue: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
}

// GSTR-2: Inward Supplies (auto-populated from GSTR-1 of suppliers)
export interface GSTR2Summary {
  period: string;
  b2b: GSTR2B2BEntry[];
  importOfGoods: GSTR2ImportEntry[];
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  itcEligible: number;
}

export interface GSTR2B2BEntry {
  gstin: string;
  supplierName: string;
  invoices: {
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string;
    reverseCharge: boolean;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    itcEligible: boolean;
  }[];
}

export interface GSTR2ImportEntry {
  billOfEntryNumber: string;
  billOfEntryDate: string;
  portCode: string;
  importedValue: number;
  igst: number;
  cess: number;
}

// GSTR-3B: Monthly Return Summary
export interface GSTR3BSummary {
  period: string;
  // Table 3.1 - Outward Supplies
  outwardTaxable: number;
  outwardTaxableIGST: number;
  outwardTaxableCGST: number;
  outwardTaxableSGST: number;
  outwardZeroRated: number;
  outwardNilExempt: number;
  // Table 4 - ITC
  itcOnImport: number;
  itcOnPurchases: number;
  itcReversed: number;
  netITC: number;
  // Table 5 - Exempt
  nilRatedSupplies: number;
  exemptSupplies: number;
  nonGSTSupplies: number;
  // Tax payable
  igstPayable: number;
  cgstPayable: number;
  sgstPayable: number;
  cessPayable: number;
  totalTaxPayable: number;
  itcUtilized: number;
  cashLedgerBalance: number;
  taxAfterITC: number;
}

// ─── VAT CONFIG (legacy + new) ───────────────────────────────────────────────

export interface VATConfig {
  companyTRN: string;
  companyName: string;
  vatRegistrationDate: string;
  defaultVATRate: number;
}

// Legacy alias
export type GST = VATConfig;
