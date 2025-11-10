import React from 'react';
import { useData } from '../contexts/DataContext';
import { Package, Users, Truck, ShoppingCart, ShoppingBag, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { products, customers, suppliers, sales, purchases } = useData();

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const lowStockProducts = products.filter(product => product.stock < 10).length;

  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      name: 'Total Customers',
      value: totalCustomers,
      icon: Users,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      name: 'Total Suppliers',
      value: totalSuppliers,
      icon: Truck,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      name: 'Total Sales',
      value: `₹${totalSales.toLocaleString()}`,
      icon: ShoppingCart,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      name: 'Total Purchases',
      value: `₹${totalPurchases.toLocaleString()}`,
      icon: ShoppingBag,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
    {
      name: 'Low Stock Items',
      value: lowStockProducts,
      icon: TrendingUp,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
  ];

  const recentSales = sales.slice(-5).reverse();
  const recentPurchases = purchases.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Billing Management System</h1>
        <p className="text-blue-100">Manage your business operations efficiently with our comprehensive solution.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className={`${stat.bgColor} rounded-xl p-6 border border-gray-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{sale.customerName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">₹{sale.total.toLocaleString()}</p>
                    <p className={`text-xs px-2 py-1 rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales recorded yet</p>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchases</h3>
          {recentPurchases.length > 0 ? (
            <div className="space-y-3">
              {recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{purchase.supplierName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">₹{purchase.total.toLocaleString()}</p>
                    <p className={`text-xs px-2 py-1 rounded-full ${
                      purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                      purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No purchases recorded yet</p>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockProducts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Low Stock Alert</h3>
              <p className="text-red-700">
                {lowStockProducts} product{lowStockProducts > 1 ? 's' : ''} running low on stock (less than 10 units)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;