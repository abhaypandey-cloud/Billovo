import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Account, AccountType, JournalEntry } from '../../types';
import { BarChart3, BookOpen, Scale, TrendingUp, Download, Filter } from 'lucide-react';

type ReportTab = 'ledger' | 'trial_balance' | 'balance_sheet' | 'profit_loss';

// Helper: compute account balance from journal entries
function getAccountBalance(accountId: string, entries: JournalEntry[], openingBalance: number, openingBalanceType: 'Dr' | 'Cr') {
  let debit = openingBalanceType === 'Dr' ? openingBalance : 0;
  let credit = openingBalanceType === 'Cr' ? openingBalance : 0;
  entries.forEach(e => e.lines.forEach(l => {
    if (l.accountId === accountId) { debit += l.debit; credit += l.credit; }
  }));
  return { debit, credit, net: debit - credit };
}

const AccountingReports: React.FC = () => {
  const { accounts, journalEntries, formatAmount, companySettings } = useData();
  const [tab, setTab] = useState<ReportTab>('ledger');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState(companySettings.financialYearStart);
  const [dateTo, setDateTo] = useState(companySettings.financialYearEnd);

  const postedEntries = journalEntries.filter(e => e.status === 'posted');
  const filteredEntries = postedEntries.filter(e => e.date >= dateFrom && e.date <= dateTo);

  // ── LEDGER ────────────────────────────────────────────────────────────────
  const ledgerData = useMemo(() => {
    if (!selectedAccountId) return [];
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return [];
    let runningBalance = account.openingBalanceType === 'Dr' ? account.openingBalance : -account.openingBalance;
    const rows: { date: string; narration: string; ref: string; debit: number; credit: number; balance: number; balanceType: 'Dr' | 'Cr' }[] = [];
    const relevantEntries = filteredEntries
      .filter(e => e.lines.some(l => l.accountId === selectedAccountId))
      .sort((a, b) => a.date.localeCompare(b.date));
    relevantEntries.forEach(e => {
      e.lines.filter(l => l.accountId === selectedAccountId).forEach(l => {
        runningBalance += l.debit - l.credit;
        rows.push({ date: e.date, narration: e.narration, ref: e.entryNumber, debit: l.debit, credit: l.credit, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' });
      });
    });
    return rows;
  }, [selectedAccountId, filteredEntries, accounts]);

  // ── TRIAL BALANCE ─────────────────────────────────────────────────────────
  const trialBalance = useMemo(() => {
    return accounts.filter(a => a.isActive).map(a => {
      const { debit, credit } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
      return { ...a, totalDebit: debit, totalCredit: credit };
    }).filter(a => a.totalDebit > 0 || a.totalCredit > 0);
  }, [accounts, filteredEntries]);

  const tbTotalDebit = trialBalance.reduce((s, a) => s + a.totalDebit, 0);
  const tbTotalCredit = trialBalance.reduce((s, a) => s + a.totalCredit, 0);

  // ── BALANCE SHEET ─────────────────────────────────────────────────────────
  const bsData = useMemo(() => {
    const getNet = (type: AccountType, balanceType: 'Dr' | 'Cr') =>
      accounts.filter(a => a.type === type && a.isActive).map(a => {
        const { net } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
        return { name: a.name, code: a.code, amount: balanceType === 'Dr' ? net : -net };
      }).filter(r => r.amount !== 0);
    const assets = getNet('Asset', 'Dr');
    const liabilities = getNet('Liability', 'Cr');
    const equity = getNet('Equity', 'Cr');
    const income = accounts.filter(a => a.type === 'Income' && a.isActive).reduce((s, a) => {
      const { net } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
      return s + (-net);
    }, 0);
    const expense = accounts.filter(a => a.type === 'Expense' && a.isActive).reduce((s, a) => {
      const { net } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
      return s + net;
    }, 0);
    const netProfit = income - expense;
    return { assets, liabilities, equity, netProfit, totalAssets: assets.reduce((s, a) => s + a.amount, 0), totalLiabEquity: liabilities.reduce((s, a) => s + a.amount, 0) + equity.reduce((s, a) => s + a.amount, 0) + netProfit };
  }, [accounts, filteredEntries]);

  // ── P&L ───────────────────────────────────────────────────────────────────
  const plData = useMemo(() => {
    const incomeAccs = accounts.filter(a => a.type === 'Income' && a.isActive).map(a => {
      const { net } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
      return { name: a.name, code: a.code, amount: -net };
    }).filter(r => r.amount !== 0);
    const expenseAccs = accounts.filter(a => a.type === 'Expense' && a.isActive).map(a => {
      const { net } = getAccountBalance(a.id, filteredEntries, a.openingBalance, a.openingBalanceType);
      return { name: a.name, code: a.code, amount: net };
    }).filter(r => r.amount !== 0);
    const totalIncome = incomeAccs.reduce((s, a) => s + a.amount, 0);
    const totalExpense = expenseAccs.reduce((s, a) => s + a.amount, 0);
    const cogs = expenseAccs.filter(a => a.name.toLowerCase().includes('cost') || a.name.toLowerCase().includes('cogs'));
    const opex = expenseAccs.filter(a => !a.name.toLowerCase().includes('cost') && !a.name.toLowerCase().includes('cogs'));
    const grossProfit = totalIncome - cogs.reduce((s, a) => s + a.amount, 0);
    return { incomeAccs, expenseAccs, cogs, opex, totalIncome, totalExpense, grossProfit, netProfit: totalIncome - totalExpense };
  }, [accounts, filteredEntries]);

  const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';
  const tabs = [
    { id: 'ledger' as ReportTab, label: 'Ledger', icon: BookOpen },
    { id: 'trial_balance' as ReportTab, label: 'Trial Balance', icon: Scale },
    { id: 'balance_sheet' as ReportTab, label: 'Balance Sheet', icon: BarChart3 },
    { id: 'profit_loss' as ReportTab, label: 'Profit & Loss', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accounting Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Ledger, Trial Balance, Balance Sheet, Profit & Loss</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition flex-1 justify-center ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            <t.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
        </div>
        {tab === 'ledger' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">Account</label>
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className={inputCls + ' min-w-48'}>
              <option value="">Select account...</option>
              {accounts.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* LEDGER */}
      {tab === 'ledger' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {selectedAccountId ? accounts.find(a => a.id === selectedAccountId)?.name : 'Select an account to view ledger'}
            </h3>
          </div>
          {!selectedAccountId ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />Please select an account above</div>
          ) : ledgerData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">No transactions in selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Narration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Ref</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Debit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Credit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Balance</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {ledgerData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{row.date}</td>
                      <td className="px-4 py-2.5 text-slate-900 dark:text-white">{row.narration}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-mono hidden md:table-cell">{row.ref}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400 font-medium">{row.debit > 0 ? formatAmount(row.debit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400 font-medium">{row.credit > 0 ? formatAmount(row.credit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">{formatAmount(row.balance)} <span className="text-xs text-slate-400">{row.balanceType}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TRIAL BALANCE */}
      {tab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Trial Balance</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${Math.abs(tbTotalDebit - tbTotalCredit) < 0.01 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {Math.abs(tbTotalDebit - tbTotalCredit) < 0.01 ? 'Balanced ✓' : 'Not Balanced ✗'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Account Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Debit</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Credit</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {trialBalance.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{a.code}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{a.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell text-xs">{a.type}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900 dark:text-white">{a.totalDebit > 0 ? formatAmount(a.totalDebit) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900 dark:text-white">{a.totalCredit > 0 ? formatAmount(a.totalCredit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-50 dark:bg-slate-700/50 font-bold">
                <td colSpan={3} className="px-4 py-3 text-slate-700 dark:text-slate-300">Total</td>
                <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatAmount(tbTotalDebit)}</td>
                <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatAmount(tbTotalCredit)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* BALANCE SHEET */}
      {tab === 'balance_sheet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">Assets</h3>
            </div>
            <div className="p-4 space-y-1.5">
              {bsData.assets.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatAmount(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
                <span className="text-slate-900 dark:text-white">Total Assets</span>
                <span className="text-blue-600 dark:text-blue-400">{formatAmount(bsData.totalAssets)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-red-50 dark:bg-red-900/20">
                <h3 className="font-semibold text-red-800 dark:text-red-300">Liabilities</h3>
              </div>
              <div className="p-4 space-y-1.5">
                {bsData.liabilities.map((a, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatAmount(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
                <h3 className="font-semibold text-purple-800 dark:text-purple-300">Equity</h3>
              </div>
              <div className="p-4 space-y-1.5">
                {bsData.equity.map((a, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatAmount(a.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Net Profit (Current Period)</span>
                  <span className={`font-medium ${bsData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatAmount(bsData.netProfit)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
                  <span className="text-slate-900 dark:text-white">Total Liabilities + Equity</span>
                  <span className="text-purple-600 dark:text-purple-400">{formatAmount(bsData.totalLiabEquity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFIT & LOSS */}
      {tab === 'profit_loss' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-green-50 dark:bg-green-900/20">
              <h3 className="font-semibold text-green-800 dark:text-green-300">Income</h3>
            </div>
            <div className="p-4 space-y-1.5">
              {plData.incomeAccs.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatAmount(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                <span className="text-slate-900 dark:text-white">Total Income</span>
                <span className="text-green-600 dark:text-green-400">{formatAmount(plData.totalIncome)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
              <h3 className="font-semibold text-orange-800 dark:text-orange-300">Cost of Goods Sold</h3>
            </div>
            <div className="p-4 space-y-1.5">
              {plData.cogs.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{formatAmount(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                <span className="text-slate-900 dark:text-white">Gross Profit</span>
                <span className={plData.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{formatAmount(plData.grossProfit)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-red-50 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-800 dark:text-red-300">Operating Expenses</h3>
            </div>
            <div className="p-4 space-y-1.5">
              {plData.opex.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{formatAmount(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-slate-300 dark:border-slate-600 mt-3">
                <span className="text-slate-900 dark:text-white">Net Profit / (Loss)</span>
                <span className={plData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{formatAmount(plData.netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingReports;
