import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import {
  BarChart3, TrendingUp, TrendingDown, Package, Users, Truck,
  Download, Percent, DollarSign, ShoppingCart, ShoppingBag
} from 'lucide-react';

const fmt = (n: number) => `د.إ ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 0 });

type Tab = 'overview' | 'sales' | 'purchases' | 'inventory' | 'vat';

const Reports: React.FC = () => {
  const { sales, purchases, products, customers, suppliers, vatConfig } = useData();
  const [tab, setTab] = useState<Tab>('overview');

  // Core calculations
  const completedSales = sales.filter(s => s.status === 'completed');
  const receivedPurchases = purchases.filter(p => p.status === 'received');
  const totalRevenue = completedSales.reduce((a, s) => a + s.total, 0);
  const totalPurchaseCost = receivedPurchases.reduce((a, p) => a + p.total, 0);
  const totalVATCollected = completedSales.reduce((a, s) => a + (s.vatAmount ?? 0), 0);
  const totalInputVAT = receivedPurchases.reduce((a, p) => a + (p.vatAmount ?? 0), 0);
  const netVAT = totalVATCollected - totalInputVAT;

  const totalCOGS = completedSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((s, item) => {
      const product = products.find(p => p.id === item.productId);
      return s + (product?.costPrice ?? 0) * item.quantity;
    }, 0);
  }, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Monthly data (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mSales = completedSales
      .filter(s => { const sd = new Date(s.createdAt); return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear(); })
      .reduce((a, s) => a + s.total, 0);
    const mPurchases = receivedPurchases
      .filter(p => { const pd = new Date(p.createdAt); return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear(); })
      .reduce((a, p) => a + p.total, 0);
    return {
      month: d.toLocaleDateString('en-AE', { month: 'short', year: '2-digit' }),
      sales: mSales,
      purchases: mPurchases,
      profit: mSales - mPurchases,
    };
  });

  // Top products by revenue
  const productRevenue = products.map(p => {
    const rev = completedSales.reduce((sum, s) => {
      const item = s.items.find(i => i.productId === p.id);
      return sum + (item ? item.total : 0);
    }, 0);
    const qty = completedSales.reduce((sum, s) => {
      const item = s.items.find(i => i.productId === p.id);
      return sum + (item ? item.quantity : 0);
    }, 0);
    return { ...p, revenue: rev, soldQty: qty };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top customers
  const customerRevenue = customers.map(c => {
    const rev = completedSales.filter(s => s.customerId === c.id).reduce((a, s) => a + s.total, 0);
    const count = completedSales.filter(s => s.customerId === c.id).length;
    return { ...c, revenue: rev, orderCount: count };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top suppliers
  const supplierSpend = suppliers.map(s => {
    const spend = receivedPurchases.filter(p => p.supplierId === s.id).reduce((a, p) => a + p.total, 0);
    const count = receivedPurchases.filter(p => p.supplierId === s.id).length;
    return { ...s, spend, orderCount: count };
  }).sort((a, b) => b.spend - a.spend).slice(0, 5);

  // Inventory valuation
  const inventoryVal = products.map(p => ({
    ...p,
    valuation: (p.costPrice ?? 0) * p.stock,
    retailValue: p.price * p.stock,
  })).sort((a, b) => b.valuation - a.valuation);

  const totalInventoryVal = inventoryVal.reduce((a, p) => a + p.valuation, 0);
  const totalRetailVal = inventoryVal.reduce((a, p) => a + p.retailValue, 0);

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'sales' as Tab, label: 'Sales', icon: ShoppingCart },
    { id: 'purchases' as Tab, label: 'Purchases', icon: ShoppingBag },
    { id: 'inventory' as Tab, label: 'Inventory', icon: Package },
    { id: 'vat' as Tab, label: 'VAT Report', icon: Percent },
  ];

  const StatCard = ({ label, value, sub, icon: Icon, color, bg }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType; color: string; bg: string;
  }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Business analytics and insights</p>
        </div>
        <button
          onClick={() => alert('Export feature available in production')}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-medium transition hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
        >
          <Download className="h-4 w-4" />Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition flex-1 justify-center ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${completedSales.length} completed sales`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Total Purchases" value={fmt(totalPurchaseCost)} sub={`${receivedPurchases.length} received`} icon={TrendingDown} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
            <StatCard label="Gross Profit" value={fmt(grossProfit)} sub={`Margin: ${profitMargin.toFixed(1)}%`} icon={DollarSign} color={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'} bg={grossProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} />
            <StatCard label="Net VAT Payable" value={fmt(netVAT)} sub="Collected - Input" icon={Percent} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" />
          </div>

          {/* Monthly trend table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">6-Month Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue (AED)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purchases (AED)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {monthlyData.map(m => (
                    <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{m.month}</td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-medium">{fmt(m.sales)}</td>
                      <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 font-medium">{fmt(m.purchases)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(m.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products & Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Top Products by Revenue</h3>
              </div>
              {productRevenue.length === 0 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No data</div>
              ) : (
                <div className="p-4 space-y-3">
                  {productRevenue.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{p.soldQty} units sold</div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{fmt(p.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Top Customers by Revenue</h3>
              </div>
              {customerRevenue.length === 0 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No data</div>
              ) : (
                <div className="p-4 space-y-3">
                  {customerRevenue.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{c.orderCount} orders</div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{fmt(c.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SALES TAB */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Sales" value={fmtN(sales.length)} sub="All orders" icon={ShoppingCart} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Completed Revenue" value={fmt(totalRevenue)} sub={`${completedSales.length} completed`} icon={TrendingUp} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
            <StatCard label="Pending" value={fmtN(sales.filter(s => s.status === 'pending').length)} icon={ShoppingCart} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
            <StatCard label="Cancelled" value={fmtN(sales.filter(s => s.status === 'cancelled').length)} icon={TrendingDown} color="text-red-600" bg="bg-red-50 dark:bg-red-900/20" />
          </div>

          {/* Status Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['completed', 'pending', 'cancelled'] as const).map(status => {
                const count = sales.filter(s => s.status === status).length;
                const pct = sales.length > 0 ? (count / sales.length) * 100 : 0;
                const colors = {
                  completed: 'bg-green-500',
                  pending: 'bg-yellow-400',
                  cancelled: 'bg-red-400',
                };
                return (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 capitalize mb-2">{status}</div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[status]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Recent Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subtotal</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">VAT</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {[...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{s.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.customerName}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(s.subtotal)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(s.vatAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{fmt(s.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${s.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASES TAB */}
      {tab === 'purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Purchases" value={fmtN(purchases.length)} sub="All orders" icon={ShoppingBag} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
            <StatCard label="Total Spend" value={fmt(totalPurchaseCost)} sub={`${receivedPurchases.length} received`} icon={TrendingDown} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Input VAT" value={fmt(totalInputVAT)} sub="Reclaimable" icon={Percent} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
          </div>

          {/* Top Suppliers */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Top Suppliers by Spend</h3>
            </div>
            {supplierSpend.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No data</div>
            ) : (
              <div className="p-4 space-y-3">
                {supplierSpend.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.orderCount} orders · {s.emirate}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{fmt(s.spend)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Purchases */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Recent Purchases</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subtotal</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">VAT</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {[...purchases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-purple-600 dark:text-purple-400">{p.poNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.supplierName}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(p.subtotal)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmt(p.vatAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{fmt(p.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.status === 'received' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total SKUs" value={fmtN(products.length)} icon={Package} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Inventory Value (Cost)" value={fmt(totalInventoryVal)} sub="At cost price" icon={DollarSign} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
            <StatCard label="Retail Value" value={fmt(totalRetailVal)} sub="At selling price" icon={TrendingUp} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Inventory Valuation by Product</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Cost Price</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cost Value</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Retail Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {inventoryVal.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{p.category}</td>
                      <td className={`px-4 py-3 text-center font-bold ${p.stock === 0 ? 'text-red-600 dark:text-red-400' : p.stock < 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-900 dark:text-white'}`}>{p.stock}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden md:table-cell">{fmt(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{fmt(p.valuation)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden lg:table-cell">{fmt(p.retailValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 hidden md:table-cell">Total</td>
                    <td colSpan={2} className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 md:hidden">Total</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{fmt(totalInventoryVal)}</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white hidden lg:table-cell">{fmt(totalRetailVal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VAT TAB */}
      {tab === 'vat' && (
        <div className="space-y-6">
          {/* TRN Banner */}
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-blue-200 mb-1">Registered Business</div>
                <div className="text-2xl font-bold">{vatConfig.companyName}</div>
                <div className="text-blue-200 mt-1">TRN: <span className="font-mono font-semibold text-white">{vatConfig.companyTRN}</span></div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">5%</div>
                <div className="text-blue-200 text-sm">UAE VAT Rate</div>
              </div>
            </div>
          </div>

          {/* VAT Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Taxable Sales</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(totalRevenue)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">From {completedSales.length} completed invoices</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Output VAT (Collected)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalVATCollected)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">5% of taxable sales</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Purchases</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(totalPurchaseCost)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">From {receivedPurchases.length} received orders</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Input VAT (Paid)</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmt(totalInputVAT)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reclaimable from FTA</div>
            </div>
            <div className={`rounded-2xl border shadow-sm p-5 sm:col-span-2 ${netVAT >= 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
              <div className={`text-xs mb-1 ${netVAT >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {netVAT >= 0 ? 'Net VAT Payable to FTA' : 'VAT Refund Due from FTA'}
              </div>
              <div className={`text-3xl font-bold ${netVAT >= 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                {fmt(Math.abs(netVAT))}
              </div>
              <div className={`text-xs mt-1 ${netVAT >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                Output VAT ({fmt(totalVATCollected)}) − Input VAT ({fmt(totalInputVAT)})
              </div>
            </div>
          </div>

          {/* VAT Note */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2">Important Notes</h3>
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside">
              <li>This report is a summary for internal tracking. Always consult your FTA-registered accountant for official VAT returns.</li>
              <li>VAT returns in the UAE are typically filed quarterly (or monthly for some businesses).</li>
              <li>Only standard-rated (5%) transactions are included in output/input VAT calculations.</li>
              <li>Zero-rated and exempt supplies are tracked separately per FTA regulations.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
