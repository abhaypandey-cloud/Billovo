import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Sale, SaleItem } from '../../types';
import {
  Plus, Search, Eye, Printer, X, Trash2, ShoppingCart,
  ChevronDown, FileText, CheckCircle, XCircle, Clock
} from 'lucide-react';

const fmt = (n: number) => `د.إ ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const VAT_RATE = 0.05;

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vatRate: number;
}

const emptyLine = (): LineItem => ({ productId: '', productName: '', quantity: 1, price: 0, vatRate: 5 });

type Tab = 'all' | 'pending' | 'completed' | 'cancelled';

const Sales: React.FC = () => {
  const { sales, setSales, products, setProducts, customers, nextInvoiceNumber, setInventory } = useData();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formLines, setFormLines] = useState<LineItem[]>([emptyLine()]);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formStatus, setFormStatus] = useState<Sale['status']>('pending');
  const [formNotes, setFormNotes] = useState('');

  const filtered = sales.filter(s => {
    const matchTab = tab === 'all' || s.status === tab;
    const matchSearch = s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // Computed totals
  const subtotal = formLines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const vatAmount = formLines.reduce((sum, l) => {
    const product = products.find(p => p.id === l.productId);
    if (!product || product.vatCategory === 'ZERO_RATED' || product.vatCategory === 'EXEMPT') return sum;
    return sum + l.price * l.quantity * VAT_RATE;
  }, 0);
  const grandTotal = subtotal + vatAmount - formDiscount;

  const openAdd = () => {
    setFormCustomerId('');
    setFormLines([emptyLine()]);
    setFormDiscount(0);
    setFormPaymentMethod('Cash');
    setFormStatus('pending');
    setFormNotes('');
    setModalOpen(true);
  };

  const setLine = (i: number, field: keyof LineItem, value: string | number) => {
    setFormLines(prev => {
      const next = [...prev];
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        next[i] = {
          ...next[i],
          productId: value as string,
          productName: product?.name ?? '',
          price: product?.price ?? 0,
          vatRate: product?.vatCategory === 'STANDARD' ? 5 : 0,
        };
      } else {
        next[i] = { ...next[i], [field]: value };
      }
      return next;
    });
  };

  const addLine = () => setFormLines(prev => [...prev, emptyLine()]);
  const removeLine = (i: number) => setFormLines(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!formCustomerId) { alert('Please select a customer'); return; }
    const validLines = formLines.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) { alert('Please add at least one item'); return; }

    const customer = customers.find(c => c.id === formCustomerId);
    const items: SaleItem[] = validLines.map(l => {
      const product = products.find(p => p.id === l.productId);
      const vatAmt = (product?.vatCategory === 'STANDARD' ? VAT_RATE : 0) * l.price * l.quantity;
      return {
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        price: l.price,
        vatRate: product?.vatCategory === 'STANDARD' ? 5 : 0,
        vatAmount: vatAmt,
        total: l.price * l.quantity + vatAmt,
      };
    });

    const sub = items.reduce((a, item) => a + item.price * item.quantity, 0);
    const vat = items.reduce((a, item) => a + item.vatAmount, 0);
    const total = sub + vat - formDiscount;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      invoiceNumber: nextInvoiceNumber(),
      customerId: formCustomerId,
      customerName: customer?.name ?? '',
      items,
      subtotal: sub,
      vatAmount: vat,
      discount: formDiscount,
      total,
      paymentMethod: formPaymentMethod,
      status: formStatus,
      notes: formNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Deduct stock only for completed sales
    if (formStatus === 'completed') {
      setProducts(prev => prev.map(p => {
        const lineItem = validLines.find(l => l.productId === p.id);
        if (lineItem) {
          const newStock = Math.max(0, p.stock - lineItem.quantity);
          return { ...p, stock: newStock, updatedAt: new Date() };
        }
        return p;
      }));
      // Log inventory movements
      setInventory(prev => [
        ...prev,
        ...validLines.map(l => ({
          id: crypto.randomUUID(),
          productId: l.productId,
          productName: l.productName,
          type: 'out' as const,
          quantity: l.quantity,
          reference: newSale.invoiceNumber,
          reason: 'Sale completed',
          createdAt: new Date(),
        })),
      ]);
    }

    setSales(prev => [newSale, ...prev]);
    setModalOpen(false);
  };

  const handleStatusChange = (saleId: string, newStatus: Sale['status']) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const oldStatus = sale.status;

    // If changing from non-completed to completed → deduct stock
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      setProducts(prev => prev.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity), updatedAt: new Date() };
        return p;
      }));
    }

    // If changing FROM completed to something else → restore stock
    if (oldStatus === 'completed' && newStatus !== 'completed') {
      setProducts(prev => prev.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: p.stock + item.quantity, updatedAt: new Date() };
        return p;
      }));
    }

    setSales(prev => prev.map(s =>
      s.id === saleId ? { ...s, status: newStatus, updatedAt: new Date() } : s
    ));
  };

  const handleDelete = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (sale?.status === 'completed') {
      // Restore stock
      setProducts(prev => prev.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: p.stock + item.quantity, updatedAt: new Date() };
        return p;
      }));
    }
    setSales(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const handlePrint = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const fmtAED = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const invoiceDate = new Date(sale.createdAt);
    const dueDateObj = new Date(invoiceDate);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const formatDate = (d: Date) => d.toLocaleDateString('en-AE', { day: '2-digit', month: 'long', year: 'numeric' });

    const statusColor = sale.status === 'completed' ? '#16a34a' : sale.status === 'pending' ? '#d97706' : '#dc2626';
    const statusBg   = sale.status === 'completed' ? '#f0fdf4' : sale.status === 'pending' ? '#fffbeb' : '#fef2f2';
    const statusText = sale.status === 'completed' ? 'PAID' : sale.status === 'pending' ? 'PENDING' : 'CANCELLED';

    const itemRows = sale.items.map((item, idx) => `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-left">${idx + 1}</td>
        <td class="td-left td-product">${item.productName}</td>
        <td class="td-center">${item.quantity}</td>
        <td class="td-right">${fmtAED(item.price)}</td>
        <td class="td-center vat-badge">${item.vatRate > 0 ? `${item.vatRate}%` : 'Exempt'}</td>
        <td class="td-right">${fmtAED(item.vatAmount)}</td>
        <td class="td-right td-bold">${fmtAED(item.total)}</td>
      </tr>`).join('');

    const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tax Invoice — ${sale.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      min-height: 100vh;
    }

    /* ── TOP BANNER ── */
    .banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%);
      padding: 32px 40px 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      color: #fff;
    }
    .banner-left .company-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
    .banner-left .company-sub  { font-size: 11px; opacity: 0.75; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
    .banner-left .company-info { font-size: 11.5px; opacity: 0.85; margin-top: 10px; line-height: 1.7; }
    .banner-right { text-align: right; }
    .banner-right .doc-type    { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; }
    .banner-right .doc-number  { font-size: 14px; font-weight: 600; opacity: 0.85; margin-top: 4px; font-family: monospace; }
    .banner-right .trn-badge   {
      display: inline-block;
      margin-top: 8px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* ── META STRIP ── */
    .meta-strip {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 0;
    }
    .meta-item {
      flex: 1;
      padding: 14px 20px;
      border-right: 1px solid #e2e8f0;
    }
    .meta-item:last-child { border-right: none; }
    .meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }

    /* ── PARTIES ── */
    .parties {
      display: flex;
      gap: 24px;
      padding: 28px 40px;
      border-bottom: 1px solid #e2e8f0;
    }
    .party-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px 20px;
    }
    .party-box.seller { border-top: 3px solid #1d4ed8; }
    .party-box.buyer  { border-top: 3px solid #64748b; }
    .party-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #64748b; margin-bottom: 8px;
    }
    .party-name { font-size: 15px; font-weight: 700; color: #1e293b; }
    .party-detail { font-size: 12px; color: #475569; margin-top: 4px; line-height: 1.6; }
    .party-trn { font-size: 11px; color: #1d4ed8; font-weight: 600; margin-top: 6px; font-family: monospace; }

    /* ── LINE ITEMS TABLE ── */
    .table-wrap { padding: 0 40px 24px; }
    .table-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e3a8a; color: #fff; }
    thead th { padding: 10px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .td-left   { text-align: left;   padding: 10px 12px; }
    .td-right  { text-align: right;  padding: 10px 12px; }
    .td-center { text-align: center; padding: 10px 12px; }
    .td-product { font-weight: 500; }
    .td-bold   { font-weight: 700; }
    .row-even { background: #f8fafc; }
    .row-odd  { background: #ffffff; }
    tbody tr td { border-bottom: 1px solid #e2e8f0; color: #374151; font-size: 12.5px; }
    .vat-badge { font-size: 11px; color: #1d4ed8; font-weight: 600; }

    /* ── TOTALS ── */
    .totals-wrap { display: flex; justify-content: flex-end; padding: 0 40px 28px; }
    .totals-box { width: 320px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .total-row-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .total-row-item:last-child { border-bottom: none; }
    .total-row-item.subtotal   { background: #f8fafc; color: #475569; }
    .total-row-item.vat-row    { background: #f8fafc; color: #475569; }
    .total-row-item.discount   { background: #f0fdf4; color: #16a34a; }
    .total-row-item.grand      {
      background: #1e3a8a;
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      padding: 13px 16px;
    }
    .total-label { font-weight: 500; }
    .total-amount { font-weight: 700; font-family: monospace; }

    /* ── STATUS STAMP ── */
    .stamp-wrap { display: flex; justify-content: flex-end; padding: 0 40px 20px; }
    .stamp {
      border: 3px solid;
      border-radius: 8px;
      padding: 6px 20px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.85;
      transform: rotate(-5deg);
    }

    /* ── NOTES ── */
    .notes-wrap { padding: 0 40px 24px; }
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #92400e;
    }
    .notes-title { font-weight: 700; margin-bottom: 4px; }

    /* ── PAYMENT TERMS ── */
    .terms-strip {
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      padding: 16px 40px;
      display: flex;
      gap: 32px;
    }
    .term-item { }
    .term-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }
    .term-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 1px; }

    /* ── FOOTER ── */
    .footer {
      background: #1e293b;
      padding: 18px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left  { font-size: 11px; color: #94a3b8; }
    .footer-right { font-size: 11px; color: #94a3b8; text-align: right; }
    .footer-brand { font-size: 13px; font-weight: 700; color: #e2e8f0; }

    @media print {
      body { background: #fff; }
      .page { max-width: 100%; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- TOP BANNER -->
  <div class="banner">
    <div class="banner-left">
      <div class="company-name">Billevo Trading LLC</div>
      <div class="company-sub">Enterprise ERP Platform</div>
      <div class="company-info">
        P.O. Box 12345, Dubai, UAE<br/>
        Tel: +971 4 123 4567 &nbsp;|&nbsp; info@billevo.ae<br/>
        www.billevo.ae
      </div>
    </div>
    <div class="banner-right">
      <div class="doc-type">Tax Invoice</div>
      <div class="doc-number">${sale.invoiceNumber}</div>
      <div class="trn-badge">TRN: 100123456700003</div>
    </div>
  </div>

  <!-- META STRIP -->
  <div class="meta-strip">
    <div class="meta-item">
      <div class="meta-label">Invoice Date</div>
      <div class="meta-value">${formatDate(invoiceDate)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Due Date</div>
      <div class="meta-value">${formatDate(dueDateObj)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Payment Method</div>
      <div class="meta-value">${sale.paymentMethod}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Status</div>
      <div class="meta-value" style="color:${statusColor}; font-weight:700;">${statusText}</div>
    </div>
  </div>

  <!-- PARTIES -->
  <div class="parties">
    <div class="party-box seller">
      <div class="party-label">Billed From (Seller)</div>
      <div class="party-name">Billevo Trading LLC</div>
      <div class="party-detail">
        P.O. Box 12345, Dubai, UAE<br/>
        Tel: +971 4 123 4567<br/>
        info@billevo.ae
      </div>
      <div class="party-trn">TRN: 100123456700003</div>
    </div>
    <div class="party-box buyer">
      <div class="party-label">Billed To (Customer)</div>
      <div class="party-name">${sale.customerName}</div>
      <div class="party-detail">
        ${customer?.address ? customer.address + '<br/>' : ''}
        ${customer?.emirate ? customer.emirate + ', UAE' : 'UAE'}<br/>
        ${customer?.phone ? 'Tel: ' + customer.phone : ''}
        ${customer?.email ? '<br/>' + customer.email : ''}
      </div>
      ${customer?.trn ? `<div class="party-trn">TRN: ${customer.trn}</div>` : ''}
    </div>
  </div>

  <!-- LINE ITEMS -->
  <div class="table-wrap">
    <div class="table-title">Invoice Line Items</div>
    <table>
      <thead>
        <tr>
          <th class="td-left"  style="width:36px">#</th>
          <th class="td-left">Description</th>
          <th class="td-center" style="width:60px">Qty</th>
          <th class="td-right"  style="width:110px">Unit Price</th>
          <th class="td-center" style="width:70px">VAT %</th>
          <th class="td-right"  style="width:100px">VAT Amt</th>
          <th class="td-right"  style="width:110px">Total (AED)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="total-row-item subtotal">
        <span class="total-label">Subtotal (excl. VAT)</span>
        <span class="total-amount">${fmtAED(sale.subtotal)}</span>
      </div>
      <div class="total-row-item vat-row">
        <span class="total-label">VAT (5%)</span>
        <span class="total-amount">${fmtAED(sale.vatAmount)}</span>
      </div>
      ${sale.discount > 0 ? `
      <div class="total-row-item discount">
        <span class="total-label">Discount</span>
        <span class="total-amount">− ${fmtAED(sale.discount)}</span>
      </div>` : ''}
      <div class="total-row-item grand">
        <span class="total-label">Total Amount Due</span>
        <span class="total-amount">${fmtAED(sale.total)}</span>
      </div>
    </div>
  </div>

  <!-- STATUS STAMP -->
  <div class="stamp-wrap">
    <div class="stamp" style="border-color:${statusColor}; color:${statusColor}; background:${statusBg};">
      ${statusText}
    </div>
  </div>

  ${sale.notes ? `
  <!-- NOTES -->
  <div class="notes-wrap">
    <div class="notes-box">
      <div class="notes-title">Notes / Remarks</div>
      <div>${sale.notes}</div>
    </div>
  </div>` : ''}

  <!-- PAYMENT TERMS -->
  <div class="terms-strip">
    <div class="term-item">
      <div class="term-label">Payment Terms</div>
      <div class="term-value">Net 30 Days</div>
    </div>
    <div class="term-item">
      <div class="term-label">Bank Name</div>
      <div class="term-value">Emirates NBD</div>
    </div>
    <div class="term-item">
      <div class="term-label">Account Name</div>
      <div class="term-value">Billevo Trading LLC</div>
    </div>
    <div class="term-item">
      <div class="term-label">IBAN</div>
      <div class="term-value">AE07 0331 2345 6789 0123 456</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Billevo ERP</div>
      <div style="margin-top:3px">This is a computer-generated document. No signature required.</div>
      <div>Generated: ${new Date().toLocaleString('en-AE')}</div>
    </div>
    <div class="footer-right">
      <div>UAE VAT registered under Federal Decree-Law No. 8 of 2017</div>
      <div style="margin-top:3px">For queries: accounts@billevo.ae &nbsp;|&nbsp; +971 4 123 4567</div>
    </div>
  </div>

</div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) {
      w.document.open();
      w.document.write(content);
      w.document.close();
      w.onload = () => { w.focus(); w.print(); };
    }
  };

  const statusBadge = (status: Sale['status']) => {
    const map = {
      completed: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      pending: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      cancelled: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    };
    const s = map[status];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.cls}`}>{status}</span>;
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All Sales', count: sales.length },
    { id: 'pending', label: 'Pending', count: sales.filter(s => s.status === 'pending').length },
    { id: 'completed', label: 'Completed', count: sales.filter(s => s.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: sales.filter(s => s.status === 'cancelled').length },
  ];

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage sales orders and invoices</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" />New Sale
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or invoice number..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">{sales.length === 0 ? 'No sales yet. Create your first sale.' : 'No sales match your filter.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Subtotal</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">VAT 5%</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.customerName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">{new Date(s.createdAt).toLocaleDateString('en-AE')}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden sm:table-cell">{fmt(s.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden lg:table-cell">{fmt(s.vatAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{fmt(s.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <select
                          value={s.status}
                          onChange={e => handleStatusChange(s.id, e.target.value as Sale['status'])}
                          className={`text-xs pl-2 pr-6 py-1 rounded-full font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none ${
                            s.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            s.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewSale(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handlePrint(s)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition" title="Print">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Sale</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Customer *</label>
                <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)} className={inputCls}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Items</label>
                  <button onClick={addLine} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" />Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formLines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        {i === 0 && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Product</div>}
                        <select value={line.productId} onChange={e => setLine(i, 'productId', e.target.value)} className={inputCls}>
                          <option value="">Select...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Qty</div>}
                        <input type="number" min={1} value={line.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value) || 1)} className={inputCls} />
                      </div>
                      <div className="col-span-3">
                        {i === 0 && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Price (AED)</div>}
                        <input type="number" min={0} step={0.01} value={line.price} onChange={e => setLine(i, 'price', parseFloat(e.target.value) || 0)} className={inputCls} />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        {i === 0 && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Subtotal</div>}
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 text-right">{fmt(line.price * line.quantity)}</span>
                        {formLines.length > 1 && (
                          <button onClick={() => removeLine(i)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Method</label>
                  <select value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)} className={inputCls}>
                    {['Cash', 'Bank Transfer', 'Cheque', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as Sale['status'])} className={inputCls}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Discount (AED)</label>
                <input type="number" min={0} step={0.01} value={formDiscount} onChange={e => setFormDiscount(parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className={inputCls} placeholder="Optional notes..." />
              </div>

              {/* Totals */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT (5%)</span><span>{fmt(vatAmount)}</span>
                </div>
                {formDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span><span>- {fmt(formDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white text-base pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span>Grand Total</span><span>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">Create Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewSale(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Tax Invoice</div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewSale.invoiceNumber}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrint(viewSale)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                  <Printer className="h-3.5 w-3.5" />Print
                </button>
                <button onClick={() => setViewSale(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Customer</div>
                  <div className="font-medium text-slate-900 dark:text-white">{viewSale.customerName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Date</div>
                  <div className="font-medium text-slate-900 dark:text-white">{new Date(viewSale.createdAt).toLocaleDateString('en-AE')}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Payment</div>
                  <div className="font-medium text-slate-900 dark:text-white">{viewSale.paymentMethod}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
                  {statusBadge(viewSale.status)}
                </div>
              </div>

              <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Item</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">VAT</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {viewSale.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-900 dark:text-white">{item.productName}</td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{fmt(item.price)}</td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{item.vatRate}%</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{fmt(viewSale.subtotal)}</span></div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>VAT (5%)</span><span>{fmt(viewSale.vatAmount)}</span></div>
                {viewSale.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- {fmt(viewSale.discount)}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white text-base pt-1.5 border-t border-slate-200 dark:border-slate-600"><span>Total</span><span>{fmt(viewSale.total)}</span></div>
              </div>

              {viewSale.notes && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Notes:</span> {viewSale.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Sale</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently delete this sale and restore stock if it was completed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
