import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Product, Customer, Supplier, Sale, Purchase, InventoryMovement } from '../types';

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [products, setProducts] = useLocalStorage<Product[]>('billing_products', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('billing_customers', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('billing_suppliers', []);
  const [sales, setSales] = useLocalStorage<Sale[]>('billing_sales', []);
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('billing_purchases', []);
  const [inventory, setInventory] = useLocalStorage<InventoryMovement[]>('billing_inventory', []);

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
      }}
    >
      {children}
    </DataContext.Provider>
  );
};