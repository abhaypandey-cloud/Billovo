import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  TrendingUp, TrendingDown, Package, Users, ShoppingCart, ShoppingBag,
  AlertTriangle, ArrowUpRight, ArrowRight, DollarSign, Percent
} from 'lucide-react';

const fmt = (n: number) => `د.إ ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { products, customers, sales, purchases } = useData();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // KPI calculations
  const completedSales = sales.filter(s => s.status === 'completed');
  const totalRevenue = completedSales.reduce((a, s) => a + s.total, 0);

  const receivedPurchases = purchases.filter(p => p.status === 'received');
  const totalPurchases = receivedPurchases.reduce((a, p) => a + p.total, 0);

  const totalCOGS = completedSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((s, item) => {
      const product = products.find(p => p.id === item.productId);
      return s + (product?.costPrice ?? 0) * item.quantity;
    }, 0);
  }, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const lowStockProducts = products.filter(p => p.stock < 10);
  const outOfStock = products.filter(p => p.stock === 0);
  const activeCustomers = customers.filter(c => c.status === 'active').length;

  const totalVATCollected = completedSales.reduce((a, s) => a + (s.vatAmount ?? 0), 0);

  // Recent data
  const recentSales = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentPurchases = [...purchases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Monthly chart data (last 6 months simulated from actual data)
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthSales = sales.filter(s => {
        const sd = new Date(s.createdAt);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear() && s.status === 'completed';
      }).reduce((a, s) => a + s.total, 0);
      const monthPurchases = purchases.filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.status === 'received';
      }).reduce((a, p) => a + p.total, 0);
      months.push({
        label: d.toLocaleDateString('en-AE', { month: 'short' }),
        sales: monthSales,
        purchases: monthPurchases,
      });
    }
    return months;
  };
  const chartData = getMonthlyData();
  const chartMax = Math.max(...chartData.map(d => Math.max(d.sales, d.purchases)), 1);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? map.pending}`;
  };

  const kpis = [
    {
      label: 'Total Revenue',
      value: fmt(totalRevenue),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      sub: `${completedSales.length} completed sales`,
    },
    {
      label: 'Total Purchases',
      value: fmt(totalPurchases),
      icon: ShoppingBag,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      sub: `${receivedPurchases.length} received orders`,
    },
    {
      label: 'Gross Profit',
      value: fmt(grossProfit),
      icon: DollarSign,
      color: grossProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bg: grossProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      sub: `Margin: ${profitMargin.toFixed(1)}%`,
    },
    {
      label: 'VAT Collected',
      value: fmt(totalVATCollected),
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      sub: '5% UAE VAT',
    },
    {
      label: 'Total Customers',
      value: customers.length.toString(),
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      sub: `${activeCustomers} active`,
    },
    {
      label: 'Total Products',
      value: products.length.toString(),
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      sub: `${outOfStock.length} out of stock`,
    },
    {
      label: 'Low Stock Alerts',
      value: lowStockProducts.length.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      sub: 'Below 10 units',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {greeting}, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{dateStr}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/sales"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-md shadow-blue-600/20"
          >
            <ShoppingCart className="h-4 w-4" />
            New Sale
          </Link>
          <Link
            to="/purchases"
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            <ShoppingBag className="h-4 w-4" />
            New Purchase
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{kpi.value}</div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{kpi.label}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Revenue vs Purchases</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 6 months (AED)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-400 inline-block" />Purchases</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {chartData.map(d => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-32">
                  <div
                    className="flex-1 bg-blue-500 rounded-t-md transition-all"
                    style={{ height: `${(d.sales / chartMax) * 100}%`, minHeight: d.sales > 0 ? '4px' : '0' }}
                    title={`Sales: ${fmt(d.sales)}`}
                  />
                  <div
                    className="flex-1 bg-purple-400 rounded-t-md transition-all"
                    style={{ height: `${(d.purchases / chartMax) * 100}%`, minHeight: d.purchases > 0 ? '4px' : '0' }}
                    title={`Purchases: ${fmt(d.purchases)}`}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">All stock levels OK</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.category}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ml-2 flex-shrink-0 ${p.stock === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {p.stock} {p.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales & Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Sales</h3>
            <Link to="/sales" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No sales yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{s.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium truncate max-w-[120px]">{s.customerName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{fmt(s.total)}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(s.status)}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Purchases</h3>
            <Link to="/purchases" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No purchases yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.poNumber}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium truncate max-w-[120px]">{p.supplierName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{fmt(p.total)}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
