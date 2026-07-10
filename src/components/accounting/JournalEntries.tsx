import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { JournalEntry, JournalLine } from '../../types';
import { Plus, Eye, Trash2, X, Search, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

const emptyLine = (): JournalLine => ({
  id: crypto.randomUUID(),
  accountId: '', accountName: '', accountCode: '',
  debit: 0, credit: 0, narration: '',
});

const JournalEntries: React.FC = () => {
  const { journalEntries, setJournalEntries, accounts, nextJvNumber, formatAmount } = useData();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNarration, setFormNarration] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formLines, setFormLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState<string[]>([]);

  const totalDebit = formLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = formLines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const filtered = journalEntries.filter(e =>
    e.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
    e.narration.toLowerCase().includes(search.toLowerCase()) ||
    (e.reference ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNarration('');
    setFormReference('');
    setFormLines([emptyLine(), emptyLine()]);
    setErrors([]);
    setModalOpen(true);
  };

  const setLine = (i: number, field: keyof JournalLine, value: string | number) => {
    setFormLines(prev => {
      const next = [...prev];
      if (field === 'accountId') {
        const acc = accounts.find(a => a.id === value);
        next[i] = { ...next[i], accountId: value as string, accountName: acc?.name ?? '', accountCode: acc?.code ?? '' };
      } else {
        next[i] = { ...next[i], [field]: value };
      }
      return next;
    });
  };

  const addLine = () => setFormLines(prev => [...prev, emptyLine()]);
  const removeLine = (i: number) => {
    if (formLines.length <= 2) return;
    setFormLines(prev => prev.filter((_, idx) => idx !== i));
  };

  const validate = (): string[] => {
    const e: string[] = [];
    if (!formDate) e.push('Date is required');
    if (!formNarration.trim()) e.push('Narration is required');
    const validLines = formLines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) e.push('At least 2 account lines required');
    if (!isBalanced) e.push(`Debit (${formatAmount(totalDebit)}) must equal Credit (${formatAmount(totalCredit)})`);
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (e.length > 0) { setErrors(e); return; }
    const validLines = formLines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0));
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      entryNumber: nextJvNumber(),
      date: formDate,
      narration: formNarration,
      reference: formReference,
      lines: validLines,
      totalDebit,
      totalCredit,
      status: 'posted',
      source: 'manual',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setJournalEntries(prev => [entry, ...prev]);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Journal Entries</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{journalEntries.length} entries recorded</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" /> New Journal Entry
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by JV number, narration or reference..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">{journalEntries.length === 0 ? 'No journal entries yet.' : 'No entries match your search.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">JV #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Narration</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Debit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Credit</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">{e.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{e.date}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      <div className="truncate max-w-xs">{e.narration}</div>
                      {e.reference && <div className="text-xs text-slate-400">{e.reference}</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">{formatAmount(e.totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">{formatAmount(e.totalCredit)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        e.status === 'posted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        e.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewEntry(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Journal Entry</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              {errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium mb-2">
                    <AlertCircle className="h-4 w-4" /> Validation Errors
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {errors.map((e, i) => <li key={i} className="text-xs text-red-600 dark:text-red-400">{e}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reference</label>
                  <input value={formReference} onChange={e => setFormReference(e.target.value)} className={inputCls} placeholder="e.g. INV-1001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Narration *</label>
                  <input value={formNarration} onChange={e => setFormNarration(e.target.value)} className={inputCls} placeholder="Journal description" />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Journal Lines</label>
                  <button onClick={addLine} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Line
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Account</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Narration</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Debit</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Credit</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {formLines.map((line, i) => (
                        <tr key={line.id}>
                          <td className="px-2 py-1.5">
                            <select value={line.accountId} onChange={e => setLine(i, 'accountId', e.target.value)} className={inputCls}>
                              <option value="">Select account...</option>
                              {accounts.filter(a => a.isActive).map(a => (
                                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 hidden md:table-cell">
                            <input value={line.narration ?? ''} onChange={e => setLine(i, 'narration', e.target.value)} className={inputCls} placeholder="Optional" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step={0.01} value={line.debit || ''} onChange={e => setLine(i, 'debit', parseFloat(e.target.value) || 0)} className={inputCls + ' text-right'} placeholder="0.00" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step={0.01} value={line.credit || ''} onChange={e => setLine(i, 'credit', parseFloat(e.target.value) || 0)} className={inputCls + ' text-right'} placeholder="0.00" />
                          </td>
                          <td className="px-2 py-1.5">
                            {formLines.length > 2 && (
                              <button onClick={() => removeLine(i)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={`${isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Totals</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">{formatAmount(totalDebit)}</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">{formatAmount(totalCredit)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className={`mt-2 flex items-center gap-1.5 text-xs ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isBalanced ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {isBalanced ? 'Journal entry is balanced' : `Difference: ${formatAmount(Math.abs(totalDebit - totalCredit))}`}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSave} disabled={!isBalanced} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition">Post Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* View Entry Modal */}
      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewEntry(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Journal Entry</div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewEntry.entryNumber}</h2>
              </div>
              <button onClick={() => setViewEntry(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-slate-500 dark:text-slate-400">Date</div><div className="font-medium text-slate-900 dark:text-white">{viewEntry.date}</div></div>
                <div><div className="text-xs text-slate-500 dark:text-slate-400">Reference</div><div className="font-medium text-slate-900 dark:text-white">{viewEntry.reference || '—'}</div></div>
                <div className="col-span-2"><div className="text-xs text-slate-500 dark:text-slate-400">Narration</div><div className="font-medium text-slate-900 dark:text-white">{viewEntry.narration}</div></div>
              </div>
              <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Account</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {viewEntry.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-white">{line.accountName}</div>
                        <div className="text-xs text-slate-400">{line.accountCode}{line.narration ? ` — ${line.narration}` : ''}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">{line.debit > 0 ? formatAmount(line.debit) : '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">{line.credit > 0 ? formatAmount(line.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Total</td>
                    <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{formatAmount(viewEntry.totalDebit)}</td>
                    <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{formatAmount(viewEntry.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Journal Entry</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently delete this entry. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntries;
