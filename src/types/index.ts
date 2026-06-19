export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  category: string;
  stock: number;
  unit: string;
  vatCategory: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  emirate: string;
  trn?: string;
  creditLimit: number;
  paymentTerms: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  emirate: string;
  trn?: string;
  iban?: string;
  paymentTerms: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface VATConfig {
  companyTRN: string;
  companyName: string;
  vatRegistrationDate: string;
  defaultVATRate: number;
}

// Legacy compatibility aliases
export type GST = VATConfig;
