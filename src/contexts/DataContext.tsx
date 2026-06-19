import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Product, Customer, Supplier, Sale, Purchase, InventoryMovement, VATConfig } from '../types';

interface DataContextType {
  // Products
  products: Product[];
  setProducts: (products: Product[] | ((prev: Product[]) => Product[])) => void;

  // Customers
  customers: Customer[];
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;

  // Suppliers
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;

  // Sales
  sales: Sale[];
  setSales: (sales: Sale[] | ((prev: Sale[]) => Sale[])) => void;

  // Purchases
  purchases: Purchase[];
  setPurchases: (purchases: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;

  // Inventory
  inventory: InventoryMovement[];
  setInventory: (inventory: InventoryMovement[] | ((prev: InventoryMovement[]) => InventoryMovement[])) => void;

  // VAT Config
  vatConfig: VATConfig;
  setVatConfig: (config: VATConfig | ((prev: VATConfig) => VATConfig)) => void;

  // Counters
  invoiceCounter: number;
  setInvoiceCounter: (v: number | ((prev: number) => number)) => void;
  poCounter: number;
  setPoCounter: (v: number | ((prev: number) => number)) => void;

  // Helpers
  nextInvoiceNumber: () => string;
  nextPoNumber: () => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

const DEFAULT_VAT_CONFIG: VATConfig = {
  companyTRN: '100123456700003',
  companyName: 'Billevo Trading LLC',
  vatRegistrationDate: '2018-01-01',
  defaultVATRate: 5,
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useLocalStorage<Product[]>('billevo_products', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('billevo_customers', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('billevo_suppliers', []);
  const [sales, setSales] = useLocalStorage<Sale[]>('billevo_sales', []);
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('billevo_purchases', []);
  const [inventory, setInventory] = useLocalStorage<InventoryMovement[]>('billevo_inventory', []);
  const [vatConfig, setVatConfig] = useLocalStorage<VATConfig>('billevo_vat_config', DEFAULT_VAT_CONFIG);
  const [invoiceCounter, setInvoiceCounter] = useLocalStorage<number>('billevo_invoice_counter', 1000);
  const [poCounter, setPoCounter] = useLocalStorage<number>('billevo_po_counter', 1000);

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

  return (
    <DataContext.Provider
      value={{
        products,
        setProducts,
        customers,
        setCustomers,
        suppliers,
        setSuppliers,
        sales,
        setSales,
        purchases,
        setPurchases,
        inventory,
        setInventory,
        vatConfig,
        setVatConfig,
        invoiceCounter,
        setInvoiceCounter,
        poCounter,
        setPoCounter,
        nextInvoiceNumber,
        nextPoNumber,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
