import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Account, AccountType, AccountGroup } from '../../types';
import { Plus, Edit2, Trash2, Search, BookOpen, X, Lock } from 'lucide-react';

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const ACCOUNT_GROUPS: Record<AccountType, AccountGroup[]> = {
  Asset: ['Cash', 'Bank', 'Current Asset', 'Fixed Asset'],
  Liability: ['Current Liability', 'Long-Term Liability'],
  Equity: ['Capital', 'Retained Earnings'],
  Income: ['Sales Revenue', 'Other Income'],
  Expense: ['Cost of Goods Sold', 'Operating Expense', 'Tax Expense'],
};

const TYPE_COLORS: Record<AccountType, string> = {
  Asset: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  Liability: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  Equity: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  Income: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  Expense: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
};

const emptyForm = (): Omit<Account, 'id' | 'createdAt' | 'updatedAt'> => ({
  code: '',
  name: '',
  type: 'Asset',
  group: 'Current Asset',
  description: '',
  isSystem: false,
  isActive: true,
  openingBalance: 0,
  openingBalanceType: 'Dr',
});

const ChartOfAccounts: React.FC = () => {
  const { accounts, setAccounts, formatAmount } = useData();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = accounts.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? a.type === filterType : true;
    return matchSearch && matchType;
  });

  // Group by type for display
  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type);
    return acc;
  }, {} as Record<AccountType, Account[]>);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      code: a.code, name: a.name, type: a.type, group: a.group,
      description: a.description ?? '', isSystem: a.isSystem, isActive: a.isActive,
      openingBalance: a.openingBalance, openingBalanceType: a.openingBalanceType,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Account code is required';
    if (!form.name.trim()) e.name = 'Account name is required';
    // Check duplicate code
    const dup = accounts.find(a => a.code === form.code && a.id !== editing?.id);
    if (dup) e.code = 'Account code already exists';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (editing) {
      setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, ...form, updatedAt: new Date() } : a));
    } else {
      setAccounts(prev => [...prev, {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setDeleteConfirm(null);
  };

  const inputCls = (f: string) =>
    `w-full px-3 py-2 rounded-xl border ${errors[f] ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition`;

  const totalsByType = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter(a => a.type === type).reduce((sum, a) => sum + a.openingBalance, 0);
    return acc;
  }, {} as Record<AccountType, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{accounts.length} accounts configured</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ACCOUNT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? '' : type)}
            className={`rounded-xl border p-3 text-left transition ${
              filterType === type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${TYPE_COLORS[type]}`}>{type}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{accounts.filter(a => a.type === type).length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">accounts</div>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or name..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        {filterType && (
          <button onClick={() => setFilterType('')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Account Tables by Type */}
      {ACCOUNT_TYPES.map(type => {
        const typeAccounts = grouped[type];
        if (typeAccounts.length === 0) return null;
        return (
          <div key={type} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${TYPE_COLORS[type]}`}>{type}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{typeAccounts.length} accounts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Account Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Group</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Opening Balance</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {typeAccounts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{a.code}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.isSystem && <Lock className="h-3 w-3 text-slate-400" title="System account" />}
                          <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                        </div>
                        {a.description && <div className="text-xs text-slate-400 mt-0.5">{a.description}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">{a.group}</td>
                      <td className="px-4 py-2.5 text-right hidden sm:table-cell text-slate-700 dark:text-slate-300 font-medium">
                        {a.openingBalance > 0 ? `${formatAmount(a.openingBalance)} ${a.openingBalanceType}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {!a.isSystem && (
                            <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Account' : 'Add Account'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className={inputCls('code')} placeholder="e.g. 1005" />
                  {errors.code && <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Type *</label>
                  <select value={form.type} onChange={e => {
                    const t = e.target.value as AccountType;
                    setForm({ ...form, type: t, group: ACCOUNT_GROUPS[t][0] });
                  }} className={inputCls('type')}>
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls('name')} placeholder="e.g. Petty Cash" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Group</label>
                <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value as AccountGroup })} className={inputCls('group')}>
                  {ACCOUNT_GROUPS[form.type].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <input value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls('description')} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Opening Balance</label>
                  <input type="number" min={0} step={0.01} value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })} className={inputCls('openingBalance')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dr / Cr</label>
                  <select value={form.openingBalanceType} onChange={e => setForm({ ...form, openingBalanceType: e.target.value as 'Dr' | 'Cr' })} className={inputCls('openingBalanceType')}>
                    <option value="Dr">Debit (Dr)</option>
                    <option value="Cr">Credit (Cr)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })} className={inputCls('isActive')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">{editing ? 'Save Changes' : 'Add Account'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Account</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently delete this account.</p>
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

export default ChartOfAccounts;
