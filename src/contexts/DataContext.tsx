import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  Product, Customer, Supplier, Sale, Purchase, InventoryMovement,
  VATConfig, Account, JournalEntry, Payment, CompanySettings, CountryCode,
} from '../types';
import { getDefaultAccounts, COUNTRY_CONFIGS } from '../utils/countryConfig';

// ─── DEFAULTS ────────────────────────────────────────────────────────────────

const DEFAULT_COMPANY: CompanySettings = {
  name: 'Billevo Trading Co.',
  address: 'Building 1, Main Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'IN',
  phone: '+91 98765 43210',
  email: 'info@billevo.in',
  website: 'www.billevo.in',
  gstin: '27AABCU9603R1ZX',
  pan: 'AABCU9603R',
  financialYearStart: '2024-04-01',
  financialYearEnd: '2025-03-31',
  taxRegistrationDate: '2017-07-01',
  defaultTaxRate: 18,
};

const DEFAULT_VAT_CONFIG: VATConfig = {
  companyTRN: '100123456700003',
  companyName: 'Billevo Trading LLC',
  vatRegistrationDate: '2018-01-01',
  defaultVATRate: 5,
};

// ─── CONTEXT TYPE ────────────────────────────────────────────────────────────

interface DataContextType {
  // Products
  products: Product[];
  setProducts: (v: Product[] | ((p: Product[]) => Product[])) => void;
  // Customers
  customers: Customer[];
  setCustomers: (v: Customer[] | ((p: Customer[]) => Customer[])) => void;
  // Suppliers
  suppliers: Supplier[];
  setSuppliers: (v: Supplier[] | ((p: Supplier[]) => Supplier[])) => void;
  // Sales
  sales: Sale[];
  setSales: (v: Sale[] | ((p: Sale[]) => Sale[])) => void;
  // Purchases
  purchases: Purchase[];
  setPurchases: (v: Purchase[] | ((p: Purchase[]) => Purchase[])) => void;
  // Inventory
  inventory: InventoryMovement[];
  setInventory: (v: InventoryMovement[] | ((p: InventoryMovement[]) => InventoryMovement[])) => void;
  // Legacy VAT Config (UAE)
  vatConfig: VATConfig;
  setVatConfig: (v: VATConfig | ((p: VATConfig) => VATConfig)) => void;
  // Accounting
  accounts: Account[];
  setAccounts: (v: Account[] | ((p: Account[]) => Account[])) => void;
  journalEntries: JournalEntry[];
  setJournalEntries: (v: JournalEntry[] | ((p: JournalEntry[]) => JournalEntry[])) => void;
  payments: Payment[];
  setPayments: (v: Payment[] | ((p: Payment[]) => Payment[])) => void;
  // Company / Country Settings
  companySettings: CompanySettings;
  setCompanySettings: (v: CompanySettings | ((p: CompanySettings) => CompanySettings)) => void;
  // Counters
  invoiceCounter: number;
  setInvoiceCounter: (v: number | ((p: number) => number)) => void;
  poCounter: number;
  setPoCounter: (v: number | ((p: number) => number)) => void;
  jvCounter: number;
  setJvCounter: (v: number | ((p: number) => number)) => void;
  paymentCounter: number;
  setPaymentCounter: (v: number | ((p: number) => number)) => void;
  // Helpers
  nextInvoiceNumber: () => string;
  nextPoNumber: () => string;
  nextJvNumber: () => string;
  nextPaymentNumber: () => string;
  currentCountry: CountryCode;
  currencySymbol: string;
  formatAmount: (n: number) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useLocalStorage<Product[]>('billevo_products', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('billevo_customers', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('billevo_suppliers', []);
  const [sales, setSales] = useLocalStorage<Sale[]>('billevo_sales', []);
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('billevo_purchases', []);
  const [inventory, setInventory] = useLocalStorage<InventoryMovement[]>('billevo_inventory', []);
  const [vatConfig, setVatConfig] = useLocalStorage<VATConfig>('billevo_vat_config', DEFAULT_VAT_CONFIG);
  const [companySettings, setCompanySettings] = useLocalStorage<CompanySettings>('billevo_company_v2', DEFAULT_COMPANY);

  // Accounting — with sanitization to prevent stale data crashes
  const [accountsRaw, setAccountsRaw] = useLocalStorage<Account[]>('billevo_accounts', () =>
    getDefaultAccounts(DEFAULT_COMPANY.country).map((a, i) => ({
      ...a,
      id: `acc-${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );
  const accounts: Account[] = (Array.isArray(accountsRaw) ? accountsRaw : []).map((a: any) => ({
    id: a.id ?? crypto.randomUUID(),
    code: a.code ?? '',
    name: a.name ?? '',
    type: a.type ?? 'Asset',
    group: a.group ?? 'Current Asset',
    description: a.description ?? '',
    isSystem: a.isSystem ?? false,
    isActive: a.isActive ?? true,
    openingBalance: Number(a.openingBalance) || 0,
    openingBalanceType: a.openingBalanceType ?? 'Dr',
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
    updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
  }));
  const setAccounts = setAccountsRaw as typeof setAccountsRaw;

  const [journalEntriesRaw, setJournalEntriesRaw] = useLocalStorage<JournalEntry[]>('billevo_journals', []);
  const journalEntries: JournalEntry[] = (Array.isArray(journalEntriesRaw) ? journalEntriesRaw : []).map((e: any) => ({
    id: e.id ?? crypto.randomUUID(),
    entryNumber: e.entryNumber ?? 'JV-0',
    date: e.date ?? new Date().toISOString().split('T')[0],
    narration: e.narration ?? '',
    reference: e.reference ?? '',
    lines: Array.isArray(e.lines) ? e.lines.map((l: any) => ({
      id: l.id ?? crypto.randomUUID(),
      accountId: l.accountId ?? '',
      accountName: l.accountName ?? '',
      accountCode: l.accountCode ?? '',
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      narration: l.narration ?? '',
    })) : [],
    totalDebit: Number(e.totalDebit) || 0,
    totalCredit: Number(e.totalCredit) || 0,
    status: e.status ?? 'posted',
    source: e.source ?? 'manual',
    sourceId: e.sourceId,
    createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
    updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
  }));
  const setJournalEntries = setJournalEntriesRaw as typeof setJournalEntriesRaw;

  const [payments, setPayments] = useLocalStorage<Payment[]>('billevo_payments', []);

  // Counters
  const [invoiceCounter, setInvoiceCounter] = useLocalStorage<number>('billevo_invoice_counter', 1000);
  const [poCounter, setPoCounter] = useLocalStorage<number>('billevo_po_counter', 1000);
  const [jvCounter, setJvCounter] = useLocalStorage<number>('billevo_jv_counter', 1000);
  const [paymentCounter, setPaymentCounter] = useLocalStorage<number>('billevo_payment_counter', 1000);

  const currentCountry = companySettings.country;
  const countryConfig = COUNTRY_CONFIGS[currentCountry];
  const currencySymbol = countryConfig.currencySymbol;

  const formatAmount = (n: number): string => {
    try {
      return new Intl.NumberFormat(countryConfig.locale, {
        style: 'currency',
        currency: countryConfig.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${currencySymbol} ${n.toFixed(2)}`;
    }
  };

  const nextInvoiceNumber = (): string => {
    const num = invoiceCounter + 1;
    setInvoiceCounter(num);
    return `INV-${num}`;
  };
  const nextPoNumber = (): string => {
    const num = poCounter + 1;
    setPoCounter(num);
    return `PO-${num}`;
  };
  const nextJvNumber = (): string => {
    const num = jvCounter + 1;
    setJvCounter(num);
    return `JV-${num}`;
  };
  const nextPaymentNumber = (): string => {
    const num = paymentCounter + 1;
    setPaymentCounter(num);
    return `PMT-${num}`;
  };

  return (
    <DataContext.Provider value={{
      products, setProducts,
      customers, setCustomers,
      suppliers, setSuppliers,
      sales, setSales,
      purchases, setPurchases,
      inventory, setInventory,
      vatConfig, setVatConfig,
      accounts, setAccounts,
      journalEntries, setJournalEntries,
      payments, setPayments,
      companySettings, setCompanySettings,
      invoiceCounter, setInvoiceCounter,
      poCounter, setPoCounter,
      jvCounter, setJvCounter,
      paymentCounter, setPaymentCounter,
      nextInvoiceNumber,
      nextPoNumber,
      nextJvNumber,
      nextPaymentNumber,
      currentCountry,
      currencySymbol,
      formatAmount,
    }}>
      {children}
    </DataContext.Provider>
  );
};
