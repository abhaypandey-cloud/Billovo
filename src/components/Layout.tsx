import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { COUNTRY_CONFIGS } from '../utils/countryConfig';
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart, ShoppingBag,
  BarChart3, FileText, Menu, X, Bell, Moon, Sun, ChevronDown,
  ChevronRight, Wallet, TrendingUp, LogOut, Boxes,
  Receipt, Zap, Search, Percent, Building2, BookOpen, Scale,
  Globe, Settings, PieChart, ClipboardList
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  children?: { label: string; icon: React.ElementType; to: string }[];
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('billevo_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('billevo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('billevo_theme', 'light');
    }
  }, [dark]);
  return { dark, toggleDark: () => setDark(d => !d) };
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { companySettings } = useData();
  const countryConfig = COUNTRY_CONFIGS[companySettings.country];

  const NAV: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    {
      label: 'Masters', icon: Building2, children: [
        { label: 'Products', icon: Package, to: '/products' },
        { label: 'Customers', icon: Users, to: '/customers' },
        { label: 'Suppliers', icon: Truck, to: '/suppliers' },
        { label: 'Tax Settings', icon: Percent, to: '/vat' },
      ],
    },
    {
      label: 'Sales', icon: ShoppingCart, children: [
        { label: 'Sales Orders', icon: Receipt, to: '/sales' },
      ],
    },
    {
      label: 'Purchases', icon: ShoppingBag, children: [
        { label: 'Purchase Orders', icon: FileText, to: '/purchases' },
      ],
    },
    {
      label: 'Inventory', icon: Boxes, children: [
        { label: 'Stock Overview', icon: Package, to: '/inventory' },
      ],
    },
    {
      label: 'Accounting', icon: Wallet, children: [
        { label: 'Chart of Accounts', icon: BookOpen, to: '/accounting/accounts' },
        { label: 'Journal Entries', icon: ClipboardList, to: '/accounting/journals' },
        { label: 'Ledger & Reports', icon: Scale, to: '/accounting/reports' },
      ],
    },
    {
      label: 'Tax Returns', icon: PieChart, children: [
        {
          label: countryConfig.taxSystem === 'GST_INDIA' ? 'GSTR-1/2/3B' : `${countryConfig.taxLabel} Returns`,
          icon: Percent, to: '/tax/returns',
        },
        { label: 'Business Reports', icon: BarChart3, to: '/reports' },
      ],
    },
    {
      label: 'Settings', icon: Settings, children: [
        { label: 'Company Settings', icon: Globe, to: '/settings/company' },
      ],
    },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['Masters', 'Sales', 'Purchases', 'Inventory', 'Accounting', 'Tax Returns'])
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    accountant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    sales: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    purchase: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    warehouse: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/40">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-lg leading-none">Billevo</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {countryConfig.name} · {countryConfig.taxLabel}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          if (!item.children) {
            const active = isActive(item.to!);
            return (
              <Link key={item.label} to={item.to!} onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}>
                <item.icon className="h-4 w-4 flex-shrink-0" /><span>{item.label}</span>
              </Link>
            );
          }
          const isExpanded = expandedSections.has(item.label);
          const anyChildActive = item.children.some(c => isActive(c.to));
          return (
            <div key={item.label}>
              <button onClick={() => toggleSection(item.label)}
                className={`sidebar-link sidebar-link-inactive w-full ${anyChildActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </button>
              {isExpanded && (
                <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-0.5 mt-0.5 mb-1">
                  {item.children.map(child => {
                    const childActive = isActive(child.to);
                    return (
                      <Link key={child.label} to={child.to} onClick={() => setSidebarOpen(false)}
                        className={`sidebar-link ${childActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}>
                        <child.icon className="h-3.5 w-3.5 flex-shrink-0" /><span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.fullName?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.fullName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full mt-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
          <LogOut className="h-4 w-4" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 fixed h-full z-30">
        <SidebarContent />
      </aside>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-full z-50 shadow-2xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggleDark} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="relative">
              <button onClick={() => setProfileOpen(p => !p)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.fullName?.charAt(0) ?? 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-slate-900 dark:text-white leading-none">{user?.fullName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{user?.fullName?.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{user?.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
                        </div>
                      </div>
                      <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[user?.role ?? 'viewer']}`}>{user?.role}</span>
                    </div>
                    <div className="p-2">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
};

export default Layout;
