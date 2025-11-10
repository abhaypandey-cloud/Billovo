import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Filter
} from 'lucide-react';

const Reports: React.FC = () => {
  const { products, customers, suppliers, sales, purchases, inventory } = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  // Calculate date ranges
  const now = new Date();
  const getDateRange = (period: string) => {
    const end = new Date(now);
    const start = new Date(now);
    
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  };

  const { start: periodStart, end: periodEnd } = getDateRange(selectedPeriod);

  // Filter data by period
  const periodSales = sales.filter(sale => 
    new Date(sale.createdAt) >= periodStart && new Date(sale.createdAt) <= periodEnd
  );
  const periodPurchases = purchases.filter(purchase => 
    new Date(purchase.createdAt) >= periodStart && new Date(purchase.createdAt) <= periodEnd
  );

  // Calculate metrics
  const totalSales = periodSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPurchases = periodPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const grossProfit = totalSales - totalPurchases;
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0';

  // Top products by sales
  const productSales = periodSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      if (!acc[item.productId]) {
        acc[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0
        };
      }
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.total;
    });
    return acc;
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top customers by sales
  const customerSales = periodSales.reduce((acc, sale) => {
    if (!acc[sale.customerId]) {
      acc[sale.customerId] = {
        name: sale.customerName,
        orders: 0,
        revenue: 0
      };
    }
    acc[sale.customerId].orders += 1;
    acc[sale.customerId].revenue += sale.total;
    return acc;
  }, {} as Record<string, { name: string; orders: number; revenue: number }>);

  const topCustomers = Object.values(customerSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Low stock analysis
  const lowStockProducts = products.filter(product => product.stock < 10);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  // Recent inventory movements
  const recentMovements = inventory.slice(0, 10);

  // Monthly trends (last 6 months)
  const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthSales = sales.filter(sale => 
      new Date(sale.createdAt) >= monthStart && new Date(sale.createdAt) <= monthEnd
    );
    const monthPurchases = purchases.filter(purchase => 
      new Date(purchase.createdAt) >= monthStart && new Date(purchase.createdAt) <= monthEnd
    );
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      sales: monthSales.reduce((sum, sale) => sum + sale.total, 0),
      purchases: monthPurchases.reduce((sum, purchase) => sum + purchase.total, 0),
      orders: monthSales.length
    };
  }).reverse();

  const OverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-900">₹{totalSales.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Purchases</p>
              <p className="text-2xl font-bold text-blue-900">₹{totalPurchases.toLocaleString()}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Gross Profit</p>
              <p className="text-2xl font-bold text-purple-900">₹{grossProfit.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Profit Margin</p>
              <p className="text-2xl font-bold text-orange-900">{profitMargin}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-medium text-gray-600">Month</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600">Sales</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600">Purchases</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600">Orders</th>
                <th className="text-right py-2 text-sm font-medium text-gray-600">Profit</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTrends.map((trend, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-900">{trend.month}</td>
                  <td className="py-3 text-sm text-gray-900 text-right">₹{trend.sales.toLocaleString()}</td>
                  <td className="py-3 text-sm text-gray-900 text-right">₹{trend.purchases.toLocaleString()}</td>
                  <td className="py-3 text-sm text-gray-900 text-right">{trend.orders}</td>
                  <td className="py-3 text-sm text-gray-900 text-right">
                    <span className={trend.sales - trend.purchases >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₹{(trend.sales - trend.purchases).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">₹{product.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-gray-500 text-center py-4">No sales data for this period</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">₹{customer.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No sales data for this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const InventoryReport = () => (
    <div className="space-y-6">
      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-900">{products.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-900">{lowStockProducts.length}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-900">{outOfStockProducts.length}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Inventory Value */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Value Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(product.stock * product.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      product.stock === 0 ? 'bg-red-100 text-red-800' :
                      product.stock < 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' :
                       product.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Inventory Movements</h3>
        <div className="space-y-3">
          {recentMovements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {movement.type === 'in' && <TrendingUp className="h-5 w-5 text-green-500 mr-3" />}
                {movement.type === 'out' && <TrendingDown className="h-5 w-5 text-red-500 mr-3" />}
                {movement.type === 'adjustment' && <Package className="h-5 w-5 text-blue-500 mr-3" />}
                <div>
                  <p className="font-medium text-gray-900">{movement.productName}</p>
                  <p className="text-sm text-gray-500">{movement.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(movement.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
          {recentMovements.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent inventory movements</p>
          )}
        </div>
      </div>
    </div>
  );

  const SalesReport = () => (
    <div className="space-y-6">
      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-900">₹{totalSales.toLocaleString()}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{periodSales.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Average Order</p>
              <p className="text-2xl font-bold text-purple-900">
                ₹{periodSales.length > 0 ? Math.round(totalSales / periodSales.length).toLocaleString() : '0'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Completed Orders</p>
              <p className="text-2xl font-bold text-orange-900">
                {periodSales.filter(sale => sale.status === 'completed').length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Sales by Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['completed', 'pending', 'cancelled'].map(status => {
            const statusSales = periodSales.filter(sale => sale.status === status);
            const statusTotal = statusSales.reduce((sum, sale) => sum + sale.total, 0);
            return (
              <div key={status} className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-600 capitalize">{status}</p>
                <p className="text-xl font-bold text-gray-900">{statusSales.length} orders</p>
                <p className="text-sm text-gray-500">₹{statusTotal.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periodSales.slice(0, 10).map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{sale.id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{sale.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const PurchaseReport = () => (
    <div className="space-y-6">
      {/* Purchase Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Purchases</p>
              <p className="text-2xl font-bold text-blue-900">₹{totalPurchases.toLocaleString()}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Orders</p>
              <p className="text-2xl font-bold text-purple-900">{periodPurchases.length}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Received Orders</p>
              <p className="text-2xl font-bold text-green-900">
                {periodPurchases.filter(purchase => purchase.status === 'received').length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-900">
                {periodPurchases.filter(purchase => purchase.status === 'pending').length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers by Purchase Value</h3>
        <div className="space-y-3">
          {Object.values(
            periodPurchases.reduce((acc, purchase) => {
              if (!acc[purchase.supplierId]) {
                acc[purchase.supplierId] = {
                  name: purchase.supplierName,
                  orders: 0,
                  total: 0
                };
              }
              acc[purchase.supplierId].orders += 1;
              acc[purchase.supplierId].total += purchase.total;
              return acc;
            }, {} as Record<string, { name: string; orders: number; total: number }>)
          )
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  <p className="text-sm text-gray-500">{supplier.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">₹{supplier.total.toLocaleString()}</p>
                </div>
              </div>
            ))
          }
          {periodPurchases.length === 0 && (
            <p className="text-gray-500 text-center py-4">No purchase data for this period</p>
          )}
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchases</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periodPurchases.slice(0, 10).map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{purchase.id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{purchase.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                      purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    switch (selectedReport) {
      case 'sales':
        return <SalesReport />;
      case 'purchase':
        return <PurchaseReport />;
      case 'inventory':
        return <InventoryReport />;
      default:
        return <OverviewReport />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <button
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="overview">Overview</option>
              <option value="sales">Sales Report</option>
              <option value="purchase">Purchase Report</option>
              <option value="inventory">Inventory Report</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReport()}
    </div>
  );
};

export default Reports;