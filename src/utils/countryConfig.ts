import { CountryCode, CountryConfig, GSTSlab, Account } from '../types';

// ─── COUNTRY CONFIGS ──────────────────────────────────────────────────────────

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    taxSystem: 'GST_INDIA',
    taxLabel: 'GST',
    taxIdLabel: 'GSTIN',
    defaultTaxRate: 18,
    hasMultipleTaxComponents: true,
    states: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
      'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
      'Dadra & Nagar Haveli and Daman & Diu', 'Lakshadweep', 'Andaman & Nicobar Islands',
    ],
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    locale: 'en-AE',
    taxSystem: 'VAT_UAE',
    taxLabel: 'VAT',
    taxIdLabel: 'TRN',
    defaultTaxRate: 5,
    hasMultipleTaxComponents: false,
    states: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    taxSystem: 'SALES_TAX',
    taxLabel: 'Sales Tax',
    taxIdLabel: 'EIN',
    defaultTaxRate: 0,
    hasMultipleTaxComponents: false,
    states: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    taxSystem: 'VAT_GENERIC',
    taxLabel: 'VAT',
    taxIdLabel: 'VAT Number',
    defaultTaxRate: 20,
    hasMultipleTaxComponents: false,
    states: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    locale: 'en-AU',
    taxSystem: 'GST_AU',
    taxLabel: 'GST',
    taxIdLabel: 'ABN',
    defaultTaxRate: 10,
    hasMultipleTaxComponents: false,
    states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'],
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    locale: 'en-SG',
    taxSystem: 'GST_SG',
    taxLabel: 'GST',
    taxIdLabel: 'GST Number',
    defaultTaxRate: 9,
    hasMultipleTaxComponents: false,
    states: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    locale: 'en-MY',
    taxSystem: 'SST_MY',
    taxLabel: 'SST',
    taxIdLabel: 'SST Number',
    defaultTaxRate: 6,
    hasMultipleTaxComponents: false,
    states: ['Johor','Kedah','Kelantan','Malacca','Negeri Sembilan','Pahang','Penang','Perak','Perlis','Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya'],
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    locale: 'ar-SA',
    taxSystem: 'VAT_GENERIC',
    taxLabel: 'VAT',
    taxIdLabel: 'VAT Number',
    defaultTaxRate: 15,
    hasMultipleTaxComponents: false,
    states: ['Riyadh', 'Mecca', 'Medina', 'Eastern Province', 'Asir', 'Jizan', 'Najran', 'Al Bahah', 'Northern Borders', 'Jawf', 'Hail', 'Tabuk', 'Qassim'],
  },
  OTHER: {
    code: 'OTHER',
    name: 'Other Country',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    taxSystem: 'CUSTOM',
    taxLabel: 'Tax',
    taxIdLabel: 'Tax ID',
    defaultTaxRate: 0,
    hasMultipleTaxComponents: false,
    states: [],
  },
};

// ─── INDIA GST SLABS ─────────────────────────────────────────────────────────

export const INDIA_GST_SLABS: GSTSlab[] = [
  { id: 'GST_0', name: 'GST 0%', rate: 0, cgst: 0, sgst: 0, igst: 0, applicableTo: 'Essential commodities, fresh food, books' },
  { id: 'GST_5', name: 'GST 5%', rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, applicableTo: 'Household necessities, coal, medicines' },
  { id: 'GST_12', name: 'GST 12%', rate: 12, cgst: 6, sgst: 6, igst: 12, applicableTo: 'Computers, processed food, mobile phones' },
  { id: 'GST_18', name: 'GST 18%', rate: 18, cgst: 9, sgst: 9, igst: 18, applicableTo: 'Most goods and services, IT services, restaurants' },
  { id: 'GST_28', name: 'GST 28%', rate: 28, cgst: 14, sgst: 14, igst: 28, cess: 0, applicableTo: 'Luxury goods, automobiles, tobacco, aerated drinks' },
];

// ─── FORMAT CURRENCY ─────────────────────────────────────────────────────────

export const formatCurrency = (amount: number, country: CountryCode): string => {
  const config = COUNTRY_CONFIGS[country];
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${config.currencySymbol} ${amount.toFixed(2)}`;
  }
};

// ─── CALCULATE TAX ───────────────────────────────────────────────────────────

export interface TaxCalcResult {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  vat: number;
  totalTax: number;
  totalAmount: number;
  taxRate: number;
}

export const calculateTax = (
  baseAmount: number,
  taxRate: number,
  country: CountryCode,
  isInterState = false
): TaxCalcResult => {
  const config = COUNTRY_CONFIGS[country];
  const result: TaxCalcResult = {
    taxableAmount: baseAmount,
    cgst: 0, sgst: 0, igst: 0, cess: 0, vat: 0,
    totalTax: 0,
    totalAmount: baseAmount,
    taxRate,
  };

  if (taxRate === 0) return result;
  const taxAmount = (baseAmount * taxRate) / 100;

  if (country === 'IN' && config.hasMultipleTaxComponents) {
    if (isInterState) {
      result.igst = taxAmount;
    } else {
      result.cgst = taxAmount / 2;
      result.sgst = taxAmount / 2;
    }
  } else {
    result.vat = taxAmount;
  }

  result.totalTax = taxAmount;
  result.totalAmount = baseAmount + taxAmount;
  return result;
};

// ─── DEFAULT CHART OF ACCOUNTS ───────────────────────────────────────────────

export const getDefaultAccounts = (country: CountryCode): Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const now = new Date();
  const base: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // ASSETS
    { code: '1001', name: 'Cash in Hand', type: 'Asset', group: 'Cash', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '1002', name: 'Bank Account (Primary)', type: 'Asset', group: 'Bank', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '1003', name: 'Accounts Receivable', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '1004', name: 'Inventory', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '1005', name: 'Prepaid Expenses', type: 'Asset', group: 'Current Asset', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '1010', name: 'Fixed Assets', type: 'Asset', group: 'Fixed Asset', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    // LIABILITIES
    { code: '2001', name: 'Accounts Payable', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '2002', name: 'Tax Payable', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '2003', name: 'Salary Payable', type: 'Liability', group: 'Current Liability', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '2004', name: 'Loans Payable', type: 'Liability', group: 'Long-Term Liability', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    // EQUITY
    { code: '3001', name: "Owner's Capital", type: 'Equity', group: 'Capital', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '3002', name: 'Retained Earnings', type: 'Equity', group: 'Retained Earnings', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    // INCOME
    { code: '4001', name: 'Sales Revenue', type: 'Income', group: 'Sales Revenue', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '4002', name: 'Other Income', type: 'Income', group: 'Other Income', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    { code: '4003', name: 'Discount Received', type: 'Income', group: 'Other Income', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
    // EXPENSES
    { code: '5001', name: 'Cost of Goods Sold', type: 'Expense', group: 'Cost of Goods Sold', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5002', name: 'Salaries & Wages', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5003', name: 'Rent Expense', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5004', name: 'Utilities', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5005', name: 'Office Supplies', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5006', name: 'Marketing & Advertising', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5007', name: 'Depreciation', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    { code: '5008', name: 'Discount Given', type: 'Expense', group: 'Operating Expense', isSystem: false, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
  ];

  // Country-specific tax accounts
  if (country === 'IN') {
    base.push(
      { code: '2010', name: 'CGST Payable', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
      { code: '2011', name: 'SGST Payable', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
      { code: '2012', name: 'IGST Payable', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
      { code: '1020', name: 'Input CGST (ITC)', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
      { code: '1021', name: 'Input SGST (ITC)', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
      { code: '1022', name: 'Input IGST (ITC)', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    );
  } else if (country === 'AE') {
    base.push(
      { code: '2010', name: 'VAT Payable (Output)', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
      { code: '1020', name: 'Input VAT (Reclaimable)', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    );
  } else {
    base.push(
      { code: '2010', name: 'Tax Payable (Output)', type: 'Liability', group: 'Current Liability', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Cr' },
      { code: '1020', name: 'Input Tax Credit', type: 'Asset', group: 'Current Asset', isSystem: true, isActive: true, openingBalance: 0, openingBalanceType: 'Dr' },
    );
  }

  return base;
};

// ─── INDIA STATE CODES FOR GST ───────────────────────────────────────────────
export const INDIA_STATE_CODES: Record<string, string> = {
  'Jammu & Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04',
  'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08',
  'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12',
  'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15', 'Tripura': '16',
  'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20',
  'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24',
  'Dadra & Nagar Haveli and Daman & Diu': '26', 'Maharashtra': '27',
  'Andhra Pradesh': '28', 'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31',
  'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34', 'Andaman & Nicobar Islands': '35',
  'Telangana': '36', 'Ladakh': '38',
};
