import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  ShoppingBag,
  BarChart3,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      name: 'Masters',
      children: [
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Suppliers', href: '/suppliers', icon: Truck },
      ],
    },
    {
      name: 'Transactions',
      children: [
        { name: 'Sales', href: '/sales', icon: ShoppingCart },
        { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
        { name: 'Inventory', href: '/inventory', icon: BarChart3 },
      ],
    },
    { name: 'Reports', href: '/reports', icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Billevo</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          {navigation.map((item) => (
            <div key={item.name} className="mb-2">
              {item.children ? (
                <div>
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 uppercase tracking-wider">
                    {item.name}
                  </div>
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                        isActive(child.href)
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <child.icon className="mr-3 h-5 w-5" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow-sm border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden px-4 text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-between px-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {navigation
                .flatMap(item => item.children || [item])
                .find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;