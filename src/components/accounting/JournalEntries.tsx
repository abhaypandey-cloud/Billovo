// src/components/accounting/JournalEntries.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { JournalEntry, JournalLine } from '../../types';
import {
  Plus, Edit2, Trash2, Search, X, Eye, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, BookOpen, CreditCard, DollarSign,
  ArrowLeftRight, ShoppingCart, ShoppingBag, FileText, Minus, PlusCircle
} from 'lucide-react';

// ─── VOUCHER CONFIG ───────────────────────────────────────────────────────────

type VoucherType = 'Journal' | 'Payment' | 'Receipt' | 'Contra' | 'Purchase' | 'Sales' | 'Credit Note' | 'Debit Note';

const VOUCHER_CONFIG: Record<VoucherType, { prefix: string; color: string; badge: string; icon: React.ElementType }> = {
  Journal:      { prefix: 'JV',   color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',     badge: 'bg-blue-600',   icon: BookOpen },
  Payment:      { prefix: 'PMT',  color: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300',         badge: 'bg-red-600',    icon: CreditCard },
  Receipt:      { prefix: 'RCT',  color: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300', badge: 'bg-green-600',  icon: DollarSign },
  Contra:       { prefix: 'CON',  color: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300', badge: 'bg-purple-600', icon: ArrowLeftRight },
  Purchase:     { prefix: 'PUR',  color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300', badge: 'bg-orange-600', icon: ShoppingBag },
  Sales:        { prefix: 'SAL',  color: 'text-teal-700 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300',     badge: 'bg-teal-600',   icon: ShoppingCart },
  'Credit Note':{ prefix: 'CN',   color: 'text-pink-700 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300',     badge: 'bg-pink-600',   icon: Minus },
  'Debit Note': { prefix: 'DN',   color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300', badge: 'bg-amber-600',  icon: PlusCircle },
};

const VOUCHER_TYPES = Object.keys(VOUCHER_CONFIG) as VoucherType[];
const PAGE_SIZE = 20;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

const newLine = (): JournalLine => ({
  id: crypto.randomUUID(), accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, narration: '',
});

interface LineTotal { debit: number; credit: number; diff: number; balanced: boolean }
const calcTotals = (lines: JournalLine[]): LineTotal => {
  const debit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const diff = Math.abs(debit - credit);
  return { debit, credit, diff, balanced: debit > 0 && diff < 0.01 };
};

// ─── VOUCHER FORM MODAL ───────────────────────────────────────────────────────

interface VoucherFormProps {
  entry: Partial<JournalEntry> | null;
  accounts: ReturnType<typeof useData>['accounts'];
  formatAmount: (n: number) => string;
  onSave: (e: Partial<JournalEntry>) => void;
  onClose: () => void;
  nextJvNumber: () => string;
}

const VoucherForm: React.FC<VoucherFormProps> = ({ entry, accounts, formatAmount, onSave, onClose, nextJvNumber }) => {
  const isNew = !entry?.id;
  const [voucherType, setVoucherType] = useState<VoucherType>((entry?.entryNumber?.split('-')[0] as VoucherType) ?? 'Journal');
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState(entry?.narration ?? '');
  const [reference, setReference] = useState(entry?.reference ?? '');
  const [lines, setLines] = useState<JournalLine[]>(entry?.lines?.length ? entry.lines : [newLine(), newLine()]);
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const totals = useMemo(() => calcTotals(lines), [lines]);

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const setLineAccount = (lineId: string, acc: typeof accounts[0]) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, accountId: acc.id, accountName: acc.name, accountCode: acc.code } : l));
    setShowDropdown(null);
    setAccountSearch(prev => ({ ...prev, [lineId]: `${acc.code} — ${acc.name}` }));
  };

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (id: string) => { if (lines.length > 2) setLines(prev => prev.filter(l => l.id !== id)); };

  const filteredAccounts = useCallback((search: string) =>
    accounts.filter(a => a.isActive && (a.name.toLowerCase().includes(search.toLowerCase()) || a.code.includes(search))).slice(0, 10),
    [accounts]);

  const handleSave = () => {
    const cfg = VOUCHER_CONFIG[voucherType];
    const num = isNew ? `${cfg.prefix}-${nextJvNumber().split('-')[1]}` : (entry?.entryNumber ?? '');
    const validLines = lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0));
    onSave({
      ...(entry ?? {}),
      entryNumber: num, date, narration, reference, lines: validLines,
      totalDebit: totals.debit, totalCredit: totals.credit,
      status: 'posted', source: 'manual',
      createdAt: entry?.createdAt ?? new Date(), updatedAt: new Date(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{isNew ? 'New Voucher' : 'Edit Voucher'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Voucher Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Voucher Type</label>
            <div className="flex flex-wrap gap-2">
              {VOUCHER_TYPES.map(vt => {
                const cfg = VOUCHER_CONFIG[vt];
                const Icon = cfg.icon;
                return (
                  <button key={vt} onClick={() => setVoucherType(vt)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${voucherType === vt ? `${cfg.badge} text-white border-transparent shadow-sm` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <Icon className="h-3.5 w-3.5" />{vt}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-1001" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Narration</label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Description of this entry" className={inputCls} />
            </div>
          </div>
          {/* Lines Table */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Journal Lines</label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Account</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Narration</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Debit</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lines.map(line => (
                    <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-3 py-2 relative">
                        <input
                          value={accountSearch[line.id] ?? (line.accountId ? `${line.accountCode} — ${line.accountName}` : '')}
                          onChange={e => { setAccountSearch(p => ({ ...p, [line.id]: e.target.value })); setShowDropdown(line.id); }}
                          onFocus={() => setShowDropdown(line.id)}
                          placeholder="Search account..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {showDropdown === line.id && (
                          <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-48 overflow-y-auto">
                            {filteredAccounts(accountSearch[line.id] ?? '').map(a => (
                              <button key={a.id} onMouseDown={() => setLineAccount(line.id, a)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs">
                                <span className="font-mono text-slate-500 dark:text-slate-400 mr-2">{a.code}</span>
                                <span className="text-slate-900 dark:text-white">{a.name}</span>
                              </button>
                            ))}
                            {filteredAccounts(accountSearch[line.id] ?? '').length === 0 && (
                              <div className="px-3 py-2 text-xs text-slate-400">No accounts found</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <input value={line.narration ?? ''} onChange={e => updateLine(line.id, 'narration', e.target.value)} placeholder="Line narration" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step={0.01} value={line.debit || ''} onChange={e => { updateLine(line.id, 'debit', parseFloat(e.target.value) || 0); updateLine(line.id, 'credit', 0); }} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0.00" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step={0.01} value={line.credit || ''} onChange={e => { updateLine(line.id, 'credit', parseFloat(e.target.value) || 0); updateLine(line.id, 'debit', 0); }} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0.00" />
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeLine(line.id)} disabled={lines.length <= 2} className="p-1 text-slate-300 hover:text-red-500 disabled:cursor-not-allowed transition rounded">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addLine} className="mt-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          </div>
          {/* Totals + Balance Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-6 text-sm">
              <div><span className="text-slate-500 dark:text-slate-400">Total Debit: </span><span className="font-bold text-slate-900 dark:text-white">{formatAmount(totals.debit)}</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">Total Credit: </span><span className="font-bold text-slate-900 dark:text-white">{formatAmount(totals.credit)}</span></div>
            </div>
            {totals.balanced ? (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold"><CheckCircle className="h-4 w-4" /> Balanced ✓</div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-sm font-semibold"><AlertCircle className="h-4 w-4" /> Unbalanced ✗ (diff: {formatAmount(totals.diff)})</div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
          <button onClick={handleSave} disabled={!totals.balanced}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition">
            {isNew ? 'Post Entry' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── VIEW MODAL ───────────────────────────────────────────────────────────────

interface ViewModalProps {
  entry: JournalEntry;
  formatAmount: (n: number) => string;
  onClose: () => void;
  onEdit: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ entry, formatAmount, onClose, onEdit }) => {
  const vt = entry.entryNumber.split('-')[0] as VoucherType;
  const cfg = VOUCHER_CONFIG[vt] ?? VOUCHER_CONFIG.Journal;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{entry.entryNumber}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
          </div>
          <div className="flex gap-2">
            {entry.status === 'draft' && <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"><Edit2 className="h-3 w-3" /> Edit</button>}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500 dark:text-slate-400">Narration: </span><span className="text-slate-900 dark:text-white font-medium">{entry.narration || '—'}</span></div>
            <div><span className="text-slate-500 dark:text-slate-400">Reference: </span><span className="text-slate-900 dark:text-white font-medium">{entry.reference || '—'}</span></div>
            <div><span className="text-slate-500 dark:text-slate-400">Status: </span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.status === 'posted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : entry.status === 'reversed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{entry.status}</span></div>
            <div><span className="text-slate-500 dark:text-slate-400">Source: </span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.source === 'manual' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{entry.source ?? 'manual'}</span></div>
          </div>
          <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Account</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Narration</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Debit</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entry.lines.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-slate-400 mr-1">{l.accountCode}</span><span className="text-slate-900 dark:text-white">{l.accountName}</span></td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{l.narration || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">{l.debit > 0 ? formatAmount(l.debit) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">{l.credit > 0 ? formatAmount(l.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
              <tr>
                <td colSpan={2} className="px-4 py-2 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Total</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">{formatAmount(entry.totalDebit)}</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">{formatAmount(entry.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const JournalEntries: React.FC = () => {
  const { journalEntries, setJournalEntries, accounts, nextJvNumber, formatAmount } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<VoucherType | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return journalEntries.filter(e => {
      if (search && !e.entryNumber.toLowerCase().includes(search.toLowerCase()) && !e.narration.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && !e.entryNumber.startsWith(VOUCHER_CONFIG[filterType].prefix)) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries, search, filterType, filterStatus, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = (data: Partial<JournalEntry>) => {
    if (editEntry) {
      setJournalEntries(prev => prev.map(e => e.id === editEntry.id ? { ...e, ...data, id: editEntry.id } as JournalEntry : e));
    } else {
      setJournalEntries(prev => [...prev, { ...data, id: crypto.randomUUID() } as JournalEntry]);
    }
    setFormOpen(false);
    setEditEntry(null);
  };

  const handleDelete = (id: string) => {
    const entry = journalEntries.find(e => e.id === id);
    if (entry?.status === 'posted') {
      setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'reversed', updatedAt: new Date() } : e));
    } else {
      setJournalEntries(prev => prev.filter(e => e.id !== id));
    }
    setDeleteConfirm(null);
  };

  const getVoucherColor = (entryNumber: string) => {
    const prefix = entryNumber.split('-')[0] as VoucherType;
    return VOUCHER_CONFIG[prefix]?.color ?? VOUCHER_CONFIG.Journal.color;
  };

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      reversed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return cls[status] ?? cls.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Journal Entries</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{journalEntries.length} vouchers total</p>
        </div>
        <button onClick={() => { setEditEntry(null); setFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" /> New Voucher
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search voucher # or narration..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value as VoucherType | ''); setPage(1); }} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option>
            {VOUCHER_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Date:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {(dateFrom || dateTo || filterType || filterStatus || search) && (
            <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 transition">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {paged.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No journal entries found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Create your first voucher to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  {['Voucher #', 'Type', 'Date', 'Narration', 'Debit', 'Credit', 'Status', 'Source', 'Actions'].map(h => (
                    <th key={h} className={`text-left px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide ${['Debit', 'Credit'].includes(h) ? 'text-right hidden sm:table-cell' : ''} ${['Narration'].includes(h) ? 'hidden md:table-cell' : ''} ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paged.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${getVoucherColor(entry.entryNumber)}`}>{entry.entryNumber}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{entry.entryNumber.split('-')[0]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-xs hidden md:table-cell">{entry.narration || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white hidden sm:table-cell">{formatAmount(entry.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white hidden sm:table-cell">{formatAmount(entry.totalCredit)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(entry.status)}`}>{entry.status}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${entry.source === 'manual' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{entry.source ?? 'manual'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewEntry(entry)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Eye className="h-3.5 w-3.5" /></button>
                        {entry.status === 'draft' && <button onClick={() => { setEditEntry(entry); setFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"><Edit2 className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {formOpen && <VoucherForm entry={editEntry} accounts={accounts} formatAmount={formatAmount} onSave={handleSave} onClose={() => { setFormOpen(false); setEditEntry(null); }} nextJvNumber={nextJvNumber} />}
      {viewEntry && <ViewModal entry={viewEntry} formatAmount={formatAmount} onClose={() => setViewEntry(null)} onEdit={() => { setEditEntry(viewEntry); setViewEntry(null); setFormOpen(true); }} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Entry?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Posted entries will be marked as reversed instead of deleted.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mb-6">Draft entries will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntries;
