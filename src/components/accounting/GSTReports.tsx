import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { FileText, Download, Info, CheckCircle, AlertTriangle } from 'lucide-react';

type GSTTab = 'gstr1' | 'gstr2' | 'gstr3b';

const GSTReports: React.FC = () => {
  const { sales, purchases, companySettings, formatAmount } = useData();
  const [tab, setTab] = useState<GSTTab>('gstr1');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [year, month] = period.split('-').map(Number);
  const isIndia = companySettings.country === 'IN';

  // Filter sales/purchases for selected period
  const periodSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getFullYear() === year && (d.getMonth() + 1) === month && s.status === 'completed';
  }), [sales, year, month]);

  const periodPurchases = useMemo(() => purchases.filter(p => {
    const d = new Date(p.createdAt);
    return d.getFullYear() === year && (d.getMonth() + 1) === month && p.status === 'received';
  }), [purchases, year, month]);

  // GSTR-1 calculations
  const gstr1 = useMemo(() => {
    const b2b = periodSales.filter(s => s.customerGSTIN);
    const b2c = periodSales.filter(s => !s.customerGSTIN);
    const totalTaxable = periodSales.reduce((s, sale) => s + sale.subtotal, 0);
    const totalCGST = periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.cgst ?? 0), 0);
    const totalSGST = periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.sgst ?? 0), 0);
    const totalIGST = periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.igst ?? 0), 0);
    const totalVAT = periodSales.reduce((s, sale) => s + (sale.taxBreakdown?.vat ?? sale.vatAmount ?? 0), 0);
    return { b2b, b2c, totalTaxable, totalCGST, totalSGST, totalIGST, totalVAT, totalTax: totalCGST + totalSGST + totalIGST + totalVAT };
  }, [periodSales]);

  // GSTR-2 calculations
  const gstr2 = useMemo(() => {
    const b2b = periodPurchases.filter(p => p.supplierGSTIN);
    const totalTaxable = periodPurchases.reduce((s, p) => s + p.subtotal, 0);
    const totalCGST = periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.cgst ?? 0), 0);
    const totalSGST = periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.sgst ?? 0), 0);
    const totalIGST = periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.igst ?? 0), 0);
    const totalVAT = periodPurchases.reduce((s, p) => s + (p.taxBreakdown?.vat ?? p.vatAmount ?? 0), 0);
    const itcEligible = totalCGST + totalSGST + totalIGST + totalVAT;
    return { b2b, totalTaxable, totalCGST, totalSGST, totalIGST, totalVAT, itcEligible };
  }, [periodPurchases]);

  // GSTR-3B
  const gstr3b = useMemo(() => {
    const outwardTaxable = gstr1.totalTaxable;
    const outputCGST = gstr1.totalCGST;
    const outputSGST = gstr1.totalSGST;
    const outputIGST = gstr1.totalIGST;
    const outputVAT = gstr1.totalVAT;
    const itc = gstr2.itcEligible;
    const netPayable = gstr1.totalTax - itc;
    return { outwardTaxable, outputCGST, outputSGST, outputIGST, outputVAT, outputTax: gstr1.totalTax, itc, netPayable };
  }, [gstr1, gstr2]);

  const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';

  const tabs = [
    { id: 'gstr1' as GSTTab, label: isIndia ? 'GSTR-1' : 'Output Tax', sub: 'Outward Supplies' },
    { id: 'gstr2' as GSTTab, label: isIndia ? 'GSTR-2' : 'Input Tax', sub: 'Inward Supplies' },
    { id: 'gstr3b' as GSTTab, label: isIndia ? 'GSTR-3B' : 'Net Tax', sub: 'Monthly Summary' },
  ];

  const taxLabel = companySettings.country === 'IN' ? 'GST' : companySettings.country === 'AE' ? 'VAT' : 'Tax';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isIndia ? 'GST Returns (GSTR)' : `${taxLabel} Returns`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isIndia ? 'GSTR-1, GSTR-2, GSTR-3B for ' : 'Output/Input Tax Returns for '}
            {companySettings.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inputCls} />
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Company Info Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-orange-100 mb-1">{isIndia ? 'Registered Taxpayer' : 'Registered Business'}</div>
            <div className="text-xl font-bold">{companySettings.name}</div>
            <div className="text-orange-100 text-sm mt-1">
              {isIndia ? `GSTIN: ${companySettings.gstin || 'Not configured'}` :
               companySettings.country === 'AE' ? `TRN: ${companySettings.trn || 'Not configured'}` :
               `Tax ID: ${companySettings.gstin || companySettings.vatNumber || 'Not configured'}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{period}</div>
            <div className="text-orange-100 text-sm">Return Period</div>
            <div className="text-orange-100 text-sm mt-1">{companySettings.state}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-xl border-2 p-3 text-center transition ${tab === t.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <div className={`font-bold text-sm ${tab === t.id ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* GSTR-1 */}
      {tab === 'gstr1' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Taxable Turnover', value: formatAmount(gstr1.totalTaxable), color: 'text-slate-900 dark:text-white' },
              ...(isIndia ? [
                { label: 'CGST Collected', value: formatAmount(gstr1.totalCGST), color: 'text-orange-600 dark:text-orange-400' },
                { label: 'SGST Collected', value: formatAmount(gstr1.totalSGST), color: 'text-orange-600 dark:text-orange-400' },
                { label: 'IGST Collected', value: formatAmount(gstr1.totalIGST), color: 'text-orange-600 dark:text-orange-400' },
              ] : [
                { label: `${taxLabel} Collected`, value: formatAmount(gstr1.totalVAT), color: 'text-orange-600 dark:text-orange-400' },
              ]),
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{c.label}</div>
                <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {isIndia ? 'B2B Invoices (Registered Customers)' : 'Sales Invoices'}
              </h3>
            </div>
            {periodSales.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No sales for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                    {isIndia && <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">GSTIN</th>}
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taxable</th>
                    {isIndia ? <>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">CGST</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">SGST</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">IGST</th>
                    </> : <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{taxLabel}</th>}
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {periodSales.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">{s.invoiceNumber}</td>
                        <td className="px-4 py-2.5 text-slate-900 dark:text-white font-medium">{s.customerName}</td>
                        {isIndia && <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs font-mono hidden md:table-cell">{s.customerGSTIN || '—'}</td>}
                        <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.subtotal)}</td>
                        {isIndia ? <>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.taxBreakdown?.cgst ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.taxBreakdown?.sgst ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.taxBreakdown?.igst ?? 0)}</td>
                        </> : <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.taxBreakdown?.vat ?? s.vatAmount ?? 0)}</td>}
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">{formatAmount(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSTR-2 */}
      {tab === 'gstr2' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Purchases', value: formatAmount(gstr2.totalTaxable), color: 'text-slate-900 dark:text-white' },
              ...(isIndia ? [
                { label: 'Input CGST', value: formatAmount(gstr2.totalCGST), color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Input SGST', value: formatAmount(gstr2.totalSGST), color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Input IGST', value: formatAmount(gstr2.totalIGST), color: 'text-blue-600 dark:text-blue-400' },
              ] : [
                { label: `Input ${taxLabel}`, value: formatAmount(gstr2.totalVAT), color: 'text-blue-600 dark:text-blue-400' },
              ]),
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{c.label}</div>
                <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-green-800 dark:text-green-300">Eligible Input Tax Credit (ITC)</div>
              <div className="text-sm text-green-700 dark:text-green-400 mt-0.5">Reclaimable from {isIndia ? 'GSTN' : 'Tax Authority'}</div>
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{formatAmount(gstr2.itcEligible)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Purchase Invoices</h3>
            </div>
            {periodPurchases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No purchases for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">PO #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Supplier</th>
                    {isIndia && <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">GSTIN</th>}
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taxable</th>
                    {isIndia ? <>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">CGST</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">SGST</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">IGST</th>
                    </> : <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{taxLabel}</th>}
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {periodPurchases.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-purple-600 dark:text-purple-400">{p.poNumber}</td>
                        <td className="px-4 py-2.5 text-slate-900 dark:text-white font-medium">{p.supplierName}</td>
                        {isIndia && <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs font-mono hidden md:table-cell">{p.supplierGSTIN || '—'}</td>}
                        <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.subtotal)}</td>
                        {isIndia ? <>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.taxBreakdown?.cgst ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.taxBreakdown?.sgst ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.taxBreakdown?.igst ?? 0)}</td>
                        </> : <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.taxBreakdown?.vat ?? p.vatAmount ?? 0)}</td>}
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">{formatAmount(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSTR-3B */}
      {tab === 'gstr3b' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
                <h3 className="font-semibold text-orange-800 dark:text-orange-300">3.1 — Outward Supplies & Tax Liability</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Taxable Outward Supplies', value: gstr3b.outwardTaxable },
                  ...(isIndia ? [
                    { label: 'CGST (Output)', value: gstr3b.outputCGST },
                    { label: 'SGST (Output)', value: gstr3b.outputSGST },
                    { label: 'IGST (Output)', value: gstr3b.outputIGST },
                  ] : [
                    { label: `${taxLabel} Output`, value: gstr3b.outputVAT },
                  ]),
                  { label: `Total ${taxLabel} Liability`, value: gstr3b.outputTax, bold: true },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between text-sm ${(r as any).bold ? 'font-bold pt-2 border-t border-slate-200 dark:border-slate-700 mt-2' : ''}`}>
                    <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">{formatAmount(r.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300">4 — Input Tax Credit (ITC)</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'ITC from Purchases', value: gstr3b.itc, positive: true },
                  { label: 'ITC Reversed', value: 0, positive: false },
                  { label: 'Net ITC Available', value: gstr3b.itc, positive: true, bold: true },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between text-sm ${(r as any).bold ? 'font-bold pt-2 border-t border-slate-200 dark:border-slate-700 mt-2' : ''}`}>
                    <span className="text-slate-700 dark:text-slate-300">{r.label}</span>
                    <span className={`${r.positive ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} font-medium`}>{formatAmount(r.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Net Tax Summary */}
          <div className={`rounded-2xl p-6 ${gstr3b.netPayable >= 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium mb-1 ${gstr3b.netPayable >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  {gstr3b.netPayable >= 0 ? `Net ${taxLabel} Payable to Government` : `${taxLabel} Refund Due`}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Output Tax ({formatAmount(gstr3b.outputTax)}) − ITC ({formatAmount(gstr3b.itc)})
                </div>
              </div>
              <div className={`text-3xl font-bold ${gstr3b.netPayable >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                {formatAmount(Math.abs(gstr3b.netPayable))}
              </div>
            </div>
          </div>

          {/* Compliance notes */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" /> Filing Reminders
            </h3>
            <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 list-disc list-inside">
              {isIndia ? <>
                <li>GSTR-1 is due by 11th of the following month (monthly filers) or end of the quarter (quarterly filers).</li>
                <li>GSTR-3B is due by 20th of the following month. Late filing attracts ₹50/day (₹20/day for NIL returns).</li>
                <li>ITC can only be claimed for invoices filed by the supplier in their GSTR-1.</li>
                <li>Always reconcile GSTR-2B (auto-drafted) before claiming ITC.</li>
                <li>This report is for reference only. File through the official GSTN portal: www.gst.gov.in</li>
              </> : <>
                <li>This report summarizes your tax position for the period. Always verify with your accountant.</li>
                <li>File your tax return through the official portal of your country's tax authority.</li>
                <li>Keep all invoices and supporting documents for at least 5 years.</li>
              </>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTReports;
