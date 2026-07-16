// src/components/accounting/ChartOfAccounts.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Account, AccountType, AccountGroup } from '../../types';
import { getDefaultAccounts } from '../../utils/countryConfig';
import {
  Plus, Edit2, Trash2, Search, X, Lock, Printer,
  RotateCcw, ChevronDown, ChevronRight, Filter
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const ACCOUNT_GROUPS: Record<AccountType, AccountGroup[]> = {
  Asset: ['Cash', 'Bank', 'Current Asset', 'Fixed Asset'],
  Liability: ['Current Liability', 'Long-Term Liability'],
  Equity: ['Capital', 'Retained Earnings'],
  Income: ['Sales Revenue', 'Other Income'],
  Expense: ['Cost of Goods Sold', 'Operating Expense', 'Tax Expense'],
};

const TYPE_COLORS: Record<AccountType, { badge: string; header: string; dot: string }> = {
  Asset:     { badge: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',     header: 'bg-blue-50 dark:bg-blue-900/10',     dot: 'bg-blue-500' },
  Liability: { badge: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300',         header: 'bg-red-50 dark:bg-red-900/10',         dot: 'bg-red-500' },
  Equity:    { badge: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300', header: 'bg-purple-50 dark:bg-purple-900/10', dot: 'bg-purple-500' },
  Income:    { badge: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300', header: 'bg-green-50 dark:bg-green-900/10',     dot: 'bg-green-500' },
  Expense:   { badge: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300', header: 'bg-orange-50 dark:bg-orange-900/10', dot: 'bg-orange-500' },
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

type FormData = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm = (): FormData => ({
  code: '', name: '', type: 'Asset', group: 'Current Asset',
  description: '', isSystem: false, isActive: true,
  openingBalance: 0, openingBalanceType: 'Dr',
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full px-3 py-2 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
    err ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
  }`;

// ─── MODAL ────────────────────────────────────────────────────────────────────

interface AccountModalProps {
  editing: Account | null;
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  onSave: () => void;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ editing, form, setForm, errors, onSave, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
      <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Account' : 'Add Account'}</h2>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Code *</label>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputCls(errors.code)} placeholder="e.g. 1005" />
            {errors.code && <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Type *</label>
            <select value={form.type} onChange={e => {
              const t = e.target.value as AccountType;
              setForm(f => ({ ...f, type: t, group: ACCOUNT_GROUPS[t][0] }));
            }} className={inputCls()}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls(errors.name)} placeholder="e.g. Petty Cash" />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Group</label>
          <select value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value as AccountGroup }))} className={inputCls()}>
            {ACCOUNT_GROUPS[form.type].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls()} placeholder="Optional description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Opening Balance</label>
            <input type="number" min={0} step={0.01} value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))} className={inputCls()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dr / Cr</label>
            <select value={form.openingBalanceType} onChange={e => setForm(f => ({ ...f, openingBalanceType: e.target.value as 'Dr' | 'Cr' }))} className={inputCls()}>
              <option value="Dr">Debit (Dr)</option>
              <option value="Cr">Credit (Cr)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
          <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))} className={inputCls()}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
        <button onClick={onSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">{editing ? 'Save Changes' : 'Add Account'}</button>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const ChartOfAccounts: React.FC = () => {
  const { accounts, setAccounts, formatAmount, currentCountry } = useData();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetConfirm, setResetConfirm] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => accounts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || a.type === filterType;
    return matchSearch && matchType;
  }), [accounts, search, filterType]);

  const grouped = useMemo(() => ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type);
    return acc;
  }, {} as Record<AccountType, Account[]>), [filtered]);

  const counts = useMemo(() => ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter(a => a.type === type).length;
    return acc;
  }, {} as Record<AccountType, number>), [accounts]);

  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setErrors({}); setModalOpen(true); };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, type: a.type, group: a.group, description: a.description ?? '', isSystem: a.isSystem, isActive: a.isActive, openingBalance: a.openingBalance, openingBalanceType: a.openingBalanceType });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Account code is required';
    if (!form.name.trim()) e.name = 'Account name is required';
    const dupCode = accounts.find(a => a.code === form.code.trim() && a.id !== editing?.id);
    if (dupCode) e.code = `Code "${form.code}" already used by "${dupCode.name}"`;
    const dupName = accounts.find(a => a.name.toLowerCase() === form.name.trim().toLowerCase() && a.id !== editing?.id);
    if (dupName) e.name = `Name "${form.name}" already exists (code: ${dupName.code})`;
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const now = new Date();
    if (editing) {
      setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, ...form, updatedAt: now } : a));
    } else {
      setAccounts(prev => [...prev, { ...form, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => { setAccounts(prev => prev.filter(a => a.id !== id)); setDeleteConfirm(null); };

  const handleReset = () => {
    const defaults = getDefaultAccounts(currentCountry).map((a, i) => ({
      ...a, id: `acc-${i + 1}`, createdAt: new Date(), updatedAt: new Date(),
    }));
    setAccounts(defaults);
    setResetConfirm(false);
  };

  const handlePrint = () => window.print();

  const TABS: (AccountType | 'All')[] = ['All', ...ACCOUNT_TYPES];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{accounts.length} accounts configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={() => setResetConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium transition">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ACCOUNT_TYPES.map(type => (
          <button key={type} onClick={() => setFilterType(filterType === type ? 'All' : type)}
            className={`rounded-2xl border p-3 text-left transition ${filterType === type ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${TYPE_COLORS[type].badge}`}>{type}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts[type]}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">accounts</div>
          </button>
        ))}
      </div>

      {/* Search + Filter Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              {t}{t !== 'All' && ` (${counts[t as AccountType]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Account Tables */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Filter className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No accounts match your search</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting the search or filter</p>
        </div>
      ) : (
        ACCOUNT_TYPES.map(type => {
          const typeAccounts = grouped[type];
          if (typeAccounts.length === 0) return null;
          const isCollapsed = collapsedGroups.has(type);
          return (
            <div key={type} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <button onClick={() => toggleGroup(type)} className={`w-full px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between transition ${TYPE_COLORS[type].header}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type].dot}`} />
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${TYPE_COLORS[type].badge}`}>{type}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{typeAccounts.length} accounts</span>
                </div>
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50">
                        {['Code', 'Account Name', 'Group', 'Opening Balance', 'Dr/Cr', 'Status', 'Actions'].map(h => (
                          <th key={h} className={`text-left px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide ${h === 'Opening Balance' || h === 'Dr/Cr' ? 'hidden sm:table-cell' : ''} ${h === 'Group' ? 'hidden md:table-cell' : ''} ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {typeAccounts.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400 font-medium">{a.code}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {a.isSystem && <span title="System account — cannot be deleted"><Lock className="h-3 w-3 text-slate-400 flex-shrink-0" /></span>}
                              <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                            </div>
                            {a.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{a.description}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">{a.group}</td>
                          <td className="px-4 py-2.5 text-right hidden sm:table-cell font-medium text-slate-700 dark:text-slate-300">
                            {a.openingBalance > 0 ? formatAmount(a.openingBalance) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            {a.openingBalance > 0 && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${a.openingBalanceType === 'Dr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{a.openingBalanceType}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                              {a.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {!a.isSystem ? (
                                <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="p-1.5 text-slate-200 dark:text-slate-700 cursor-not-allowed" title="System account cannot be deleted">
                                  <Lock className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add/Edit Modal */}
      {modalOpen && <AccountModal editing={editing} form={form} setForm={setForm} errors={errors} onSave={handleSave} onClose={() => setModalOpen(false)} />}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Account?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently remove the account and cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResetConfirm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Reset to Defaults?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">This will replace all accounts with the default chart of accounts for your country.</p>
            <p className="text-amber-600 dark:text-amber-400 text-xs font-medium mb-6">⚠ Any custom accounts and changes will be lost.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetConfirm(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button onClick={handleReset} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition">Reset to Defaults</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
