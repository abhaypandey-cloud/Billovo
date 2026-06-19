export const summaryCards = [
  {
    id: '1',
    title: 'Total Revenue',
    value: '₹12.4M',
    subtitle: '24% increase from last month',
    icon: 'TrendingUp',
    accent: 'text-emerald-600 bg-emerald-100',
  },
  {
    id: '2',
    title: 'Total Customers',
    value: '3,210',
    subtitle: '8% growth in 30 days',
    icon: 'Users',
    accent: 'text-sky-600 bg-sky-100',
  },
  {
    id: '3',
    title: 'Total Invoices',
    value: '4,820',
    subtitle: 'Invoice volume remaining strong',
    icon: 'FileText',
    accent: 'text-violet-600 bg-violet-100',
  },
  {
    id: '4',
    title: 'Pending Payments',
    value: '₹1.2M',
    subtitle: '12 overdue invoices',
    icon: 'Clock',
    accent: 'text-orange-600 bg-orange-100',
  },
];

export const revenueSeries = [
  { month: 'Jan', value: 60 },
  { month: 'Feb', value: 75 },
  { month: 'Mar', value: 82 },
  { month: 'Apr', value: 95 },
  { month: 'May', value: 88 },
  { month: 'Jun', value: 102 },
  { month: 'Jul', value: 120 },
  { month: 'Aug', value: 108 },
  { month: 'Sep', value: 95 },
  { month: 'Oct', value: 112 },
  { month: 'Nov', value: 125 },
  { month: 'Dec', value: 138 },
];

export const paymentStatus = [
  { label: 'Paid', value: 64, color: '#38bdf8' },
  { label: 'Pending', value: 24, color: '#a78bfa' },
  { label: 'Overdue', value: 12, color: '#f97316' },
];

export const latestInvoices = [
  { id: '#INV-1290', customer: 'Abby Krueger', amount: '₹28,540', status: 'Paid', due: 'Today' },
  { id: '#INV-1287', customer: 'Evan Singh', amount: '₹14,200', status: 'Pending', due: 'Tomorrow' },
  { id: '#INV-1276', customer: 'Melanie James', amount: '₹39,800', status: 'Past Due', due: '2 days ago' },
  { id: '#INV-1263', customer: 'Ravi Mehta', amount: '₹21,340', status: 'Paid', due: 'Today' },
];

export const recentPayments = [
  { id: '#PAY-4578', customer: 'Aanya Patel', amount: '₹9,200', method: 'Credit Card', status: 'Completed' },
  { id: '#PAY-4552', customer: 'Sanjay Rao', amount: '₹5,000', method: 'UPI', status: 'Completed' },
  { id: '#PAY-4529', customer: 'Nisha Verma', amount: '₹3,800', method: 'Bank Transfer', status: 'Pending' },
  { id: '#PAY-4511', customer: 'Kartik Shah', amount: '₹12,100', method: 'Card', status: 'Completed' },
];
