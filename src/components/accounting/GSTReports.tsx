// src/components/accounting/GSTReports.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Sale, Purchase } from '../../types';
import { COUNTRY_CONFIGS } from '../../utils/countryConfig';
import { Download, AlertCircle, CheckCircle, Calendar, FileText, Info } from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const tabCls = (active: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`;

const thCls = 'px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left';
const tdCls = 'px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300';
const amtCls = 'px-3 py-2.5 text-sm text-right font-medium text-slate-900 dark:text-white';

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
    <div className={`text-xl font-bold ${color ?? 'text-slate-900 dark:text-white'}`}>{value}</div>
    {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

function getMonths(): { label: string; value: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`, value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  }
  return months;
}

function filterByPeriod<T extends { invoiceDate?: string; createdAt?: Date | string }>(items: T[], period: string): T[] {
  return items.filter(i => {
    // Use invoiceDate if available, fall back to createdAt
    const dateStr = i.invoiceDate
      ? String(i.invoiceDate)
      : i.createdAt
        ? new Date(i.createdAt).toISOString().split('T')[0]
        : '';
    return dateStr.startsWith(period);
  });
}

// Safe date formatter — handles undefined/null invoiceDate by falling back to createdAt
function safeDate(invoiceDate?: string, createdAt?: Date | string, locale = 'en-IN'): string {
  try {
    const d = invoiceDate || (createdAt ? new Date(createdAt).toISOString().split('T')[0] : '');
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale);
  } catch {
    return '—';
  }
}

// Safe tax breakdown extraction with fallbacks
function getTax(item: { taxBreakdown?: { cgst?: number; sgst?: number; igst?: number; vat?: number; totalTax?: number; taxableAmount?: number }; subtotal?: number; vatAmount?: number }, field: 'cgst' | 'sgst' | 'igst' | 'vat' | 'totalTax' | 'taxableAmount'): number {
  if (field === 'taxableAmount') return item.taxBreakdown?.taxableAmount ?? item.subtotal ?? 0;
  if (field === 'totalTax') return item.taxBreakdown?.totalTax ?? item.vatAmount ?? 0;
  return item.taxBreakdown?.[field] ?? 0;
}

function exportJSON(data: unknown, filename: string) {
  const a = document.createElement('a');
  a.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  a.download = filename;
  a.click();
}

// ─── INDIA GSTR-1 ────────────────────────────────────────────────────────────

const GSTR1Tab: React.FC<{ sales: Sale[]; period: string; formatAmount: (n: number) => string; companyState: string }> = ({ sales, period, formatAmount, companyState }) => {
  const periodSales = useMemo(() => filterByPeriod(sales.filter(s => s.status !== 'cancelled'), period), [sales, period]);

  const b2b = useMemo(() => periodSales.filter(s => s.customerGSTIN), [periodSales]);
  const b2c = useMemo(() => periodSales.filter(s => !s.customerGSTIN), [periodSales]);

  const totals = useMemo(() => periodSales.reduce((acc, s) => ({
    taxable: acc.taxable + (s.taxBreakdown?.taxableAmount ?? s.subtotal),
    cgst: acc.cgst + (s.taxBreakdown?.cgst ?? 0),
    sgst: acc.sgst + (s.taxBreakdown?.sgst ?? 0),
    igst: acc.igst + (s.taxBreakdown?.igst ?? 0),
    total: acc.total + (s.taxBreakdown?.totalTax ?? 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }), [periodSales]);

  const hsnMap = useMemo(() => {
    const map: Record<string, { qty: number; taxable: number; cgst: number; sgst: number; igst: number; desc: string }> = {};
    periodSales.forEach(s => s.items.forEach(item => {
      const hsn = item.hsnCode ?? 'N/A';
      if (!map[hsn]) map[hsn] = { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, desc: item.productName };
      map[hsn].qty += item.quantity;
      map[hsn].taxable += item.taxBreakdown?.taxableAmount ?? (item.price * item.quantity);
      map[hsn].cgst += item.taxBreakdown?.cgst ?? 0;
      map[hsn].sgst += item.taxBreakdown?.sgst ?? 0;
      map[hsn].igst += item.taxBreakdown?.igst ?? 0;
    }));
    return map;
  }, [periodSales]);

  const dueDateStr = (() => {
    const [y, m] = period.split('-').map(Number);
    const due = new Date(y, m, 11);
    return due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const handleExportJSON = () => exportJSON({ version: '1.1', hash: '#', gstin_of_supplier: '', fp: period.replace('-', ''), gt: totals.taxable, cur_gt: totals.taxable, b2b: b2b.map(s => ({ ctin: s.customerGSTIN, inv: [{ inum: s.invoiceNumber, idt: s.invoiceDate, val: s.total, pos: s.placeOfSupply, rchrg: 'N', inv_typ: 'R', itms: [{ num: 1, itm_det: { rt: 18, txval: s.taxBreakdown?.taxableAmount, iamt: s.taxBreakdown?.igst, camt: s.taxBreakdown?.cgst, samt: s.taxBreakdown?.sgst, csamt: 0 } }] }] })) }, `GSTR1_${period}.json`);

  return (
    <div className="space-y-6">
      {/* Filing Reminder */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">Filing Deadline: </span>GSTR-1 for {period} is due on <strong>{dueDateStr}</strong>. Ensure all invoices are uploaded before the deadline.
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Taxable Value" value={formatAmount(totals.taxable)} />
        <SummaryCard label="CGST" value={formatAmount(totals.cgst)} color="text-blue-700 dark:text-blue-400" />
        <SummaryCard label="SGST" value={formatAmount(totals.sgst)} color="text-blue-700 dark:text-blue-400" />
        <SummaryCard label="IGST" value={formatAmount(totals.igst)} color="text-purple-700 dark:text-purple-400" />
        <SummaryCard label="Total Tax" value={formatAmount(totals.total)} color="text-green-700 dark:text-green-400" />
      </div>

      {/* B2B */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-white text-sm">B2B — Registered Customers ({b2b.length})</span>
          <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"><Download className="h-3.5 w-3.5" /> Export JSON</button>
        </div>
        {b2b.length === 0 ? <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No B2B sales in this period</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>{['GSTIN', 'Receiver', 'Invoice #', 'Date', 'Invoice Value', 'Place', 'Taxable', 'CGST', 'SGST', 'IGST'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {b2b.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{s.customerGSTIN}</td>
                    <td className={tdCls}>{s.customerName}</td>
                    <td className={tdCls}>{s.invoiceNumber}</td>
                    <td className={tdCls}>{safeDate(s.invoiceDate, s.createdAt, 'en-IN')}</td>
                    <td className={amtCls}>{formatAmount(s.total)}</td>
                    <td className={tdCls}>{s.placeOfSupply ?? '—'}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'taxableAmount'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'cgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'sgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'igst'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* B2C */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700"><span className="font-semibold text-slate-900 dark:text-white text-sm">B2C — Unregistered Customers ({b2c.length})</span></div>
        {b2c.length === 0 ? <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No B2C sales in this period</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>{['Customer', 'Invoice #', 'Date', 'Taxable', 'CGST', 'SGST', 'IGST'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {b2c.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className={tdCls}>{s.customerName}</td>
                    <td className={tdCls}>{s.invoiceNumber}</td>
                    <td className={tdCls}>{safeDate(s.invoiceDate, s.createdAt, 'en-IN')}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'taxableAmount'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'cgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'sgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'igst'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HSN Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700"><span className="font-semibold text-slate-900 dark:text-white text-sm">HSN Summary</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>{['HSN', 'Description', 'Qty', 'Taxable', 'CGST', 'SGST', 'IGST'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {Object.entries(hsnMap).map(([hsn, data]) => (
                <tr key={hsn} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{hsn}</td>
                  <td className={tdCls}>{data.desc}</td>
                  <td className={amtCls}>{data.qty}</td>
                  <td className={amtCls}>{formatAmount(data.taxable)}</td>
                  <td className={amtCls}>{formatAmount(data.cgst)}</td>
                  <td className={amtCls}>{formatAmount(data.sgst)}</td>
                  <td className={amtCls}>{formatAmount(data.igst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(hsnMap).length === 0 && <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No HSN data available</div>}
        </div>
      </div>
    </div>
  );
};

// ─── INDIA GSTR-2 ────────────────────────────────────────────────────────────

const GSTR2Tab: React.FC<{ purchases: Purchase[]; period: string; formatAmount: (n: number) => string }> = ({ purchases, period, formatAmount }) => {
  const periodPurchases = useMemo(() => filterByPeriod(purchases.filter(p => p.status !== 'cancelled'), period), [purchases, period]);

  const totals = useMemo(() => periodPurchases.reduce((acc, p) => ({
    value: acc.value + p.total,
    taxable: acc.taxable + (p.taxBreakdown?.taxableAmount ?? p.subtotal),
    cgst: acc.cgst + (p.taxBreakdown?.cgst ?? 0),
    sgst: acc.sgst + (p.taxBreakdown?.sgst ?? 0),
    igst: acc.igst + (p.taxBreakdown?.igst ?? 0),
    itc: acc.itc + (p.taxBreakdown?.totalTax ?? 0),
  }), { value: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, itc: 0 }), [periodPurchases]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Total Purchases" value={formatAmount(totals.value)} />
        <SummaryCard label="Input CGST" value={formatAmount(totals.cgst)} color="text-blue-700 dark:text-blue-400" />
        <SummaryCard label="Input SGST" value={formatAmount(totals.sgst)} color="text-blue-700 dark:text-blue-400" />
        <SummaryCard label="Input IGST" value={formatAmount(totals.igst)} color="text-purple-700 dark:text-purple-400" />
        <SummaryCard label="Total ITC" value={formatAmount(totals.itc)} color="text-green-700 dark:text-green-400" sub="Input Tax Credit" />
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-2xl flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800 dark:text-green-200">
          <span className="font-semibold">ITC Available: {formatAmount(totals.itc)}</span>
          <p className="text-xs mt-0.5 text-green-700 dark:text-green-300">Eligible input tax credit on purchases. Reconcile with supplier GSTR-1 before claiming.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700"><span className="font-semibold text-slate-900 dark:text-white text-sm">Purchase Register ({periodPurchases.length} invoices)</span></div>
        {periodPurchases.length === 0 ? <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No purchases in this period</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>{['GSTIN', 'Supplier', 'Invoice #', 'Date', 'Value', 'Taxable', 'CGST', 'SGST', 'IGST', 'ITC'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {periodPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{p.supplierGSTIN ?? '—'}</td>
                    <td className={tdCls}>{p.supplierName}</td>
                    <td className={tdCls}>{p.poNumber}</td>
                    <td className={tdCls}>{safeDate(p.invoiceDate, p.createdAt, 'en-IN')}</td>
                    <td className={amtCls}>{formatAmount(p.total)}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'taxableAmount'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'cgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'sgst'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'igst'))}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Eligible</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">GSTR-2 is auto-populated from supplier GSTR-1 filings on the GSTN portal. Reconcile these entries with the portal data before claiming ITC.</p>
      </div>
    </div>
  );
};

// ─── INDIA GSTR-3B ───────────────────────────────────────────────────────────

const GSTR3BTab: React.FC<{ sales: Sale[]; purchases: Purchase[]; period: string; formatAmount: (n: number) => string }> = ({ sales, purchases, period, formatAmount }) => {
  const periodSales = useMemo(() => filterByPeriod(sales.filter(s => s.status !== 'cancelled'), period), [sales, period]);
  const periodPurchases = useMemo(() => filterByPeriod(purchases.filter(p => p.status !== 'cancelled'), period), [purchases, period]);

  const outward = useMemo(() => periodSales.reduce((acc, s) => ({
    taxable: acc.taxable + (s.taxBreakdown?.taxableAmount ?? s.subtotal),
    cgst: acc.cgst + (s.taxBreakdown?.cgst ?? 0),
    sgst: acc.sgst + (s.taxBreakdown?.sgst ?? 0),
    igst: acc.igst + (s.taxBreakdown?.igst ?? 0),
    total: acc.total + (s.taxBreakdown?.totalTax ?? 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }), [periodSales]);

  const inward = useMemo(() => periodPurchases.reduce((acc, p) => ({
    taxable: acc.taxable + (p.taxBreakdown?.taxableAmount ?? p.subtotal),
    cgst: acc.cgst + (p.taxBreakdown?.cgst ?? 0),
    sgst: acc.sgst + (p.taxBreakdown?.sgst ?? 0),
    igst: acc.igst + (p.taxBreakdown?.igst ?? 0),
    itc: acc.itc + (p.taxBreakdown?.totalTax ?? 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, itc: 0 }), [periodPurchases]);

  const netCGST = outward.cgst - inward.cgst;
  const netSGST = outward.sgst - inward.sgst;
  const netIGST = outward.igst - inward.igst;
  const netTax = netCGST + netSGST + netIGST;

  const dueDateStr = (() => {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m, 20).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const handleExportJSON = () => exportJSON({
    version: '1.0', gstin: '', ret_period: period.replace('-', ''),
    '3_1': { txval: outward.taxable, iamt: outward.igst, camt: outward.cgst, samt: outward.sgst, csamt: 0 },
    '4': { itc_avl: { others: { iamt: inward.igst, camt: inward.cgst, samt: inward.sgst, csamt: 0 } }, itc_rev: { iamt: 0, camt: 0, samt: 0, csamt: 0 } },
  }, `GSTR3B_${period}.json`);

  const SectionRow: React.FC<{ label: string; taxable?: number; igst: number; cgst: number; sgst: number; indent?: boolean }> = ({ label, taxable, igst, cgst, sgst, indent }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
      <td className={`px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 ${indent ? 'pl-8' : ''}`}>{label}</td>
      {taxable !== undefined && <td className={amtCls}>{formatAmount(taxable)}</td>}
      <td className={amtCls}>{formatAmount(igst)}</td>
      <td className={amtCls}>{formatAmount(cgst)}</td>
      <td className={amtCls}>{formatAmount(sgst)}</td>
      <td className={amtCls}>{formatAmount(igst + cgst + sgst)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200"><span className="font-semibold">Filing Deadline: </span>GSTR-3B for {period} is due on <strong>{dueDateStr}</strong>.</div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"><Download className="h-4 w-4" /> Export JSON</button>
      </div>

      {/* Section 3.1 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50"><span className="font-bold text-slate-800 dark:text-white text-sm">3.1 — Details of Outward Supplies</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30"><tr><th className={thCls}>Nature of Supplies</th><th className={`${thCls} text-right`}>Taxable Value</th><th className={`${thCls} text-right`}>IGST</th><th className={`${thCls} text-right`}>CGST</th><th className={`${thCls} text-right`}>SGST/UTGST</th><th className={`${thCls} text-right`}>Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <SectionRow label="(a) Taxable supplies (other than zero/nil)" taxable={outward.taxable} igst={outward.igst} cgst={outward.cgst} sgst={outward.sgst} />
              <SectionRow label="(b) Zero rated supplies" taxable={0} igst={0} cgst={0} sgst={0} />
              <SectionRow label="(c) Nil rated / exempted" taxable={0} igst={0} cgst={0} sgst={0} />
              <SectionRow label="(d) Inward supplies (reverse charge)" taxable={0} igst={0} cgst={0} sgst={0} />
            </tbody>
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <tr className="font-bold">
                <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-white">Total Output Tax Liability</td>
                <td className={amtCls}>{formatAmount(outward.taxable)}</td>
                <td className={amtCls}>{formatAmount(outward.igst)}</td>
                <td className={amtCls}>{formatAmount(outward.cgst)}</td>
                <td className={amtCls}>{formatAmount(outward.sgst)}</td>
                <td className={amtCls}>{formatAmount(outward.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 4 — ITC */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50"><span className="font-bold text-slate-800 dark:text-white text-sm">4 — Eligible ITC</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30"><tr><th className={thCls}>ITC Details</th><th className={`${thCls} text-right`}>IGST</th><th className={`${thCls} text-right`}>CGST</th><th className={`${thCls} text-right`}>SGST/UTGST</th><th className={`${thCls} text-right`}>Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20"><td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">(A) ITC Available — All other ITC</td><td className={amtCls}>{formatAmount(inward.igst)}</td><td className={amtCls}>{formatAmount(inward.cgst)}</td><td className={amtCls}>{formatAmount(inward.sgst)}</td><td className={amtCls}>{formatAmount(inward.itc)}</td></tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20"><td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">(B) ITC Reversed</td><td className={amtCls}>—</td><td className={amtCls}>—</td><td className={amtCls}>—</td><td className={amtCls}>—</td></tr>
            </tbody>
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <tr className="font-bold">
                <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-white">(C) Net ITC Available</td>
                <td className={amtCls}>{formatAmount(inward.igst)}</td>
                <td className={amtCls}>{formatAmount(inward.cgst)}</td>
                <td className={amtCls}>{formatAmount(inward.sgst)}</td>
                <td className={amtCls}>{formatAmount(inward.itc)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net Tax Payable */}
      <div className={`rounded-2xl border p-6 ${netTax > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'}`}>
        <div className="flex items-center gap-3 mb-4">
          {netTax > 0 ? <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" /> : <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
          <span className={`font-bold text-base ${netTax > 0 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
            {netTax > 0 ? 'Tax Payable' : 'Tax Refund Due'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[['IGST', netIGST], ['CGST', netCGST], ['SGST', netSGST], ['Net Total', netTax]].map(([label, val]) => (
            <div key={label as string}>
              <div className={`text-xs mb-1 ${netTax > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>{label as string}</div>
              <div className={`text-lg font-bold ${netTax > 0 ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>{formatAmount(val as number)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── GENERIC TAX REPORT (non-India) ──────────────────────────────────────────

const GenericTaxReport: React.FC<{ sales: Sale[]; purchases: Purchase[]; period: string; formatAmount: (n: number) => string; taxLabel: string; taxIdLabel: string; companyTaxId: string }> = ({ sales, purchases, period, formatAmount, taxLabel, taxIdLabel, companyTaxId }) => {
  const periodSales = useMemo(() => filterByPeriod(sales.filter(s => s.status !== 'cancelled'), period), [sales, period]);
  const periodPurchases = useMemo(() => filterByPeriod(purchases.filter(p => p.status !== 'cancelled'), period), [purchases, period]);

  const outputTax = useMemo(() => periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.totalTax ?? sale.vatAmount ?? 0), 0), [periodSales]);
  const inputTax = useMemo(() => periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.totalTax ?? p.vatAmount ?? 0), 0), [periodPurchases]);
  const taxableSales = useMemo(() => periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.taxableAmount ?? sale.subtotal), 0), [periodSales]);
  const taxablePurchases = useMemo(() => periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.taxableAmount ?? p.subtotal), 0), [periodPurchases]);
  const netTax = outputTax - inputTax;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <SummaryCard label="Taxable Sales" value={formatAmount(taxableSales)} />
        <SummaryCard label={`Output ${taxLabel}`} value={formatAmount(outputTax)} color="text-red-700 dark:text-red-400" />
        <SummaryCard label="Taxable Purchases" value={formatAmount(taxablePurchases)} />
        <SummaryCard label={`Input ${taxLabel}`} value={formatAmount(inputTax)} color="text-blue-700 dark:text-blue-400" />
        <SummaryCard label={`Net ${taxLabel} Payable`} value={formatAmount(netTax)} color={netTax > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'} sub={netTax > 0 ? 'Amount due' : 'Refund due'} />
      </div>

      {/* Output Tax */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700"><span className="font-semibold text-slate-900 dark:text-white text-sm">Output {taxLabel} — Sales ({periodSales.length})</span></div>
        {periodSales.length === 0 ? <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No sales in this period</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>{['Invoice #', 'Customer', 'Date', 'Taxable', taxLabel, 'Total'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {periodSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className={tdCls}>{s.invoiceNumber}</td>
                    <td className={tdCls}>{s.customerName}</td>
                    <td className={tdCls}>{safeDate(s.invoiceDate, s.createdAt)}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'taxableAmount'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(s, 'totalTax'))}</td>
                    <td className={amtCls}>{formatAmount(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Input Tax */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700"><span className="font-semibold text-slate-900 dark:text-white text-sm">Input {taxLabel} — Purchases ({periodPurchases.length})</span></div>
        {periodPurchases.length === 0 ? <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No purchases in this period</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>{['PO #', 'Supplier', 'Date', 'Taxable', taxLabel, 'Total'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {periodPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className={tdCls}>{p.poNumber}</td>
                    <td className={tdCls}>{p.supplierName}</td>
                    <td className={tdCls}>{safeDate(p.invoiceDate, p.createdAt)}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'taxableAmount'))}</td>
                    <td className={amtCls}>{formatAmount(getTax(p, 'totalTax'))}</td>
                    <td className={amtCls}>{formatAmount(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${netTax > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'}`}>
        <div className="flex items-center gap-3">
          {netTax > 0 ? <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" /> : <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />}
          <div>
            <div className={`font-bold text-lg ${netTax > 0 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>{netTax > 0 ? `Net ${taxLabel} Payable` : `${taxLabel} Refund Due`}: {formatAmount(Math.abs(netTax))}</div>
            <div className={`text-xs mt-0.5 ${netTax > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>Output {taxLabel} ({formatAmount(outputTax)}) — Input {taxLabel} ({formatAmount(inputTax)})</div>
          </div>
        </div>
        {companyTaxId && <div className="text-xs text-slate-600 dark:text-slate-400"><span className="font-medium">{taxIdLabel}:</span> {companyTaxId}</div>}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

type GSTTab = 'gstr1' | 'gstr2' | 'gstr3b' | 'generic';

const GSTReports: React.FC = () => {
  const { sales, purchases, companySettings, formatAmount, currentCountry } = useData();
  const months = useMemo(() => getMonths(), []);
  const [period, setPeriod] = useState(months[0]?.value ?? '');
  const [tab, setTab] = useState<GSTTab>('gstr1');

  const countryConfig = COUNTRY_CONFIGS[currentCountry];
  const isIndia = currentCountry === 'IN';
  const taxLabel = countryConfig.taxLabel;
  const taxIdLabel = countryConfig.taxIdLabel;
  const companyTaxId = isIndia ? (companySettings.gstin ?? '') : (companySettings.trn ?? companySettings.vatNumber ?? companySettings.gstNumber ?? '');

  const TABS = isIndia
    ? [{ id: 'gstr1' as GSTTab, label: 'GSTR-1 (Outward)' }, { id: 'gstr2' as GSTTab, label: 'GSTR-2 (Inward)' }, { id: 'gstr3b' as GSTTab, label: 'GSTR-3B (Summary)' }]
    : [{ id: 'generic' as GSTTab, label: `${taxLabel} Returns` }];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isIndia ? 'GST Returns' : `${taxLabel} Returns`}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{companySettings.name}</span>
              {companyTaxId && <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg">{taxIdLabel}: {companyTaxId}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={tabCls(tab === t.id)}>
            <FileText className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'gstr1'   && <GSTR1Tab sales={sales} period={period} formatAmount={formatAmount} companyState={companySettings.state} />}
      {tab === 'gstr2'   && <GSTR2Tab purchases={purchases} period={period} formatAmount={formatAmount} />}
      {tab === 'gstr3b'  && <GSTR3BTab sales={sales} purchases={purchases} period={period} formatAmount={formatAmount} />}
      {tab === 'generic' && <GenericTaxReport sales={sales} purchases={purchases} period={period} formatAmount={formatAmount} taxLabel={taxLabel} taxIdLabel={taxIdLabel} companyTaxId={companyTaxId} />}
    </div>
  );
};

export default GSTReports;
