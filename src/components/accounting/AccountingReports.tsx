// src/components/accounting/AccountingReports.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Account, JournalEntry, AccountType } from '../../types';
import { BookOpen, Scale, TrendingUp, BarChart3, CalendarDays, Download, Printer, CheckCircle, AlertCircle } from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getAccountBalance(accountId: string, entries: JournalEntry[], openingBalance: number, openingBalanceType: 'Dr' | 'Cr') {
  let dr = openingBalanceType === 'Dr' ? openingBalance : 0;
  let cr = openingBalanceType === 'Cr' ? openingBalance : 0;
  entries.forEach(e => e.lines.forEach(l => {
    if (l.accountId === accountId) { dr += l.debit; cr += l.credit; }
  }));
  return { debit: dr, credit: cr, net: dr - cr };
}

function filterEntries(entries: JournalEntry[], from: string, to: string) {
  return entries.filter(e => e.status !== 'reversed' && (!from || e.date >= from) && (!to || e.date <= to));
}

const tabCls = (active: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`;

const tdCls = 'px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300';
const thCls = 'px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left';
const amtCls = 'px-4 py-2.5 text-sm text-right font-medium text-slate-900 dark:text-white';

interface DateRange { from: string; to: string }

// ─── DATE RANGE PICKER ────────────────────────────────────────────────────────

const DateRangePicker: React.FC<{ range: DateRange; onChange: (r: DateRange) => void; label?: string }> = ({ range, onChange, label }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {label && <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>}
    <input type="date" value={range.from} onChange={e => onChange({ ...range, from: e.target.value })}
      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    <span className="text-xs text-slate-400">to</span>
    <input type="date" value={range.to} onChange={e => onChange({ ...range, to: e.target.value })}
      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>
);

// ─── GENERAL LEDGER ───────────────────────────────────────────────────────────

const GeneralLedger: React.FC<{ accounts: Account[]; entries: JournalEntry[]; formatAmount: (n: number) => string; fyStart: string; fyEnd: string }> = ({ accounts, entries, formatAmount, fyStart, fyEnd }) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [range, setRange] = useState<DateRange>({ from: fyStart, to: fyEnd });

  const account = accounts.find(a => a.id === accountId);
  const periodEntries = useMemo(() => filterEntries(entries, range.from, range.to), [entries, range]);

  const ledgerLines = useMemo(() => {
    if (!account) return [];
    let balance = account.openingBalanceType === 'Dr' ? account.openingBalance : -account.openingBalance;
    return periodEntries.flatMap(e =>
      e.lines.filter(l => l.accountId === accountId).map(l => {
        balance += l.debit - l.credit;
        return { date: e.date, voucherNo: e.entryNumber, voucherType: e.entryNumber.split('-')[0], narration: l.narration || e.narration, debit: l.debit, credit: l.credit, balance: Math.abs(balance), balanceType: (balance >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr' };
      })
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [periodEntries, accountId, account]);

  const closing = useMemo(() => account ? getAccountBalance(accountId, periodEntries, account.openingBalance, account.openingBalanceType) : null, [periodEntries, accountId, account]);

  const exportCSV = () => {
    const rows = [['Date', 'Voucher#', 'Type', 'Narration', 'Debit', 'Credit', 'Balance', 'Dr/Cr'], ...ledgerLines.map(l => [l.date, l.voucherNo, l.voucherType, l.narration, l.debit, l.credit, l.balance, l.balanceType])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = `ledger_${account?.code}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <DateRangePicker range={range} onChange={setRange} label="Period:" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"><Printer className="h-3.5 w-3.5" /> Print</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>
      </div>
      {account && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-white">{account.code} — {account.name}</span>
            <span className="ml-3 text-xs text-slate-500 dark:text-slate-400">{account.type} / {account.group}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30">
              <tr>{['Date', 'Voucher #', 'Type', 'Narration', 'Debit', 'Credit', 'Balance', 'Dr/Cr'].map(h => <th key={h} className={`${thCls} ${['Debit','Credit','Balance'].includes(h) ? 'text-right' : ''} ${h === 'Narration' ? 'hidden md:table-cell' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr className="bg-blue-50/50 dark:bg-blue-900/10 font-medium">
                <td className={tdCls}>—</td><td className={tdCls}>Opening Balance</td><td className={tdCls} /><td className={`${tdCls} hidden md:table-cell`} />
                <td className={amtCls}>{account.openingBalanceType === 'Dr' ? formatAmount(account.openingBalance) : '—'}</td>
                <td className={amtCls}>{account.openingBalanceType === 'Cr' ? formatAmount(account.openingBalance) : '—'}</td>
                <td className={amtCls}>{formatAmount(account.openingBalance)}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${account.openingBalanceType === 'Dr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{account.openingBalanceType}</span></td>
              </tr>
              {ledgerLines.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                  <td className={tdCls}>{new Date(l.date).toLocaleDateString()}</td>
                  <td className={tdCls}><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{l.voucherNo}</span></td>
                  <td className={tdCls}><span className="text-xs text-slate-500 dark:text-slate-400">{l.voucherType}</span></td>
                  <td className={`${tdCls} hidden md:table-cell max-w-xs truncate`}>{l.narration || '—'}</td>
                  <td className={amtCls}>{l.debit > 0 ? formatAmount(l.debit) : '—'}</td>
                  <td className={amtCls}>{l.credit > 0 ? formatAmount(l.credit) : '—'}</td>
                  <td className={amtCls}>{formatAmount(l.balance)}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${l.balanceType === 'Dr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{l.balanceType}</span></td>
                </tr>
              ))}
              {closing && (
                <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold border-t-2 border-slate-200 dark:border-slate-600">
                  <td className={tdCls}>—</td><td className={tdCls}>Closing Balance</td><td className={tdCls}/><td className={`${tdCls} hidden md:table-cell`} />
                  <td className={amtCls}>{formatAmount(closing.debit)}</td>
                  <td className={amtCls}>{formatAmount(closing.credit)}</td>
                  <td className={amtCls}>{formatAmount(Math.abs(closing.net))}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${closing.net >= 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{closing.net >= 0 ? 'Dr' : 'Cr'}</span></td>
                </tr>
              )}
            </tbody>
          </table>
          {ledgerLines.length === 0 && <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No transactions in selected period</div>}
        </div>
      )}
    </div>
  );
};

// ─── TRIAL BALANCE ────────────────────────────────────────────────────────────

const TrialBalance: React.FC<{ accounts: Account[]; entries: JournalEntry[]; formatAmount: (n: number) => string; fyStart: string; fyEnd: string }> = ({ accounts, entries, formatAmount, fyStart, fyEnd }) => {
  const [range, setRange] = useState<DateRange>({ from: fyStart, to: fyEnd });
  const [groupByType, setGroupByType] = useState(false);

  const periodEntries = useMemo(() => filterEntries(entries, range.from, range.to), [entries, range]);

  const rows = useMemo(() => accounts.filter(a => a.isActive).map(a => {
    const bal = getAccountBalance(a.id, periodEntries, a.openingBalance, a.openingBalanceType);
    const openDr = a.openingBalanceType === 'Dr' ? a.openingBalance : 0;
    const openCr = a.openingBalanceType === 'Cr' ? a.openingBalance : 0;
    const periodDr = periodEntries.reduce((s, e) => s + e.lines.filter(l => l.accountId === a.id).reduce((ss, l) => ss + l.debit, 0), 0);
    const periodCr = periodEntries.reduce((s, e) => s + e.lines.filter(l => l.accountId === a.id).reduce((ss, l) => ss + l.credit, 0), 0);
    return { account: a, openDr, openCr, periodDr, periodCr, closingDr: bal.debit, closingCr: bal.credit };
  }).filter(r => r.openDr + r.openCr + r.periodDr + r.periodCr > 0), [accounts, periodEntries]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({ openDr: acc.openDr + r.openDr, openCr: acc.openCr + r.openCr, periodDr: acc.periodDr + r.periodDr, periodCr: acc.periodCr + r.periodCr, closingDr: acc.closingDr + r.closingDr, closingCr: acc.closingCr + r.closingCr }), { openDr: 0, openCr: 0, periodDr: 0, periodCr: 0, closingDr: 0, closingCr: 0 }), [rows]);

  const balanced = Math.abs(totals.closingDr - totals.closingCr) < 0.01;

  const displayRows = groupByType
    ? (['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as AccountType[]).flatMap(type => {
        const typeRows = rows.filter(r => r.account.type === type);
        return typeRows.length > 0 ? [{ isHeader: true, type, rows: typeRows }, ...typeRows.map(r => ({ ...r, isHeader: false }))] : [];
      })
    : rows.map(r => ({ ...r, isHeader: false }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <DateRangePicker range={range} onChange={setRange} label="Period:" />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={groupByType} onChange={e => setGroupByType(e.target.checked)} className="rounded" />
            Group by type
          </label>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${balanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {balanced ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {balanced ? 'Balanced' : 'Not Balanced'}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className={thCls}>Code</th><th className={thCls}>Account Name</th><th className={`${thCls} hidden md:table-cell`}>Type</th>
                <th className={`${thCls} text-right`}>Open Dr</th><th className={`${thCls} text-right`}>Open Cr</th>
                <th className={`${thCls} text-right`}>Period Dr</th><th className={`${thCls} text-right`}>Period Cr</th>
                <th className={`${thCls} text-right`}>Close Dr</th><th className={`${thCls} text-right`}>Close Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {(displayRows as (typeof rows[0] & { isHeader: boolean; type?: AccountType })[]).map((r, i) => {
                if (r.isHeader) return (
                  <tr key={`h-${r.type}`} className="bg-slate-100 dark:bg-slate-700/60">
                    <td colSpan={9} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{r.type}</td>
                  </tr>
                );
                return (
                  <tr key={r.account.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{r.account.code}</td>
                    <td className={tdCls}>{r.account.name}</td>
                    <td className={`${tdCls} hidden md:table-cell text-xs text-slate-500`}>{r.account.type}</td>
                    <td className={amtCls}>{r.openDr > 0 ? formatAmount(r.openDr) : '—'}</td>
                    <td className={amtCls}>{r.openCr > 0 ? formatAmount(r.openCr) : '—'}</td>
                    <td className={amtCls}>{r.periodDr > 0 ? formatAmount(r.periodDr) : '—'}</td>
                    <td className={amtCls}>{r.periodCr > 0 ? formatAmount(r.periodCr) : '—'}</td>
                    <td className={amtCls}>{r.closingDr > 0 ? formatAmount(r.closingDr) : '—'}</td>
                    <td className={amtCls}>{r.closingCr > 0 ? formatAmount(r.closingCr) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <tr className="font-bold">
                <td colSpan={3} className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">Total</td>
                <td className={amtCls}>{formatAmount(totals.openDr)}</td>
                <td className={amtCls}>{formatAmount(totals.openCr)}</td>
                <td className={amtCls}>{formatAmount(totals.periodDr)}</td>
                <td className={amtCls}>{formatAmount(totals.periodCr)}</td>
                <td className={`${amtCls} ${balanced ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatAmount(totals.closingDr)}</td>
                <td className={`${amtCls} ${balanced ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatAmount(totals.closingCr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {rows.length === 0 && <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No account activity in selected period</div>}
      </div>
    </div>
  );
};

// ─── P&L ─────────────────────────────────────────────────────────────────────

const ProfitLoss: React.FC<{ accounts: Account[]; entries: JournalEntry[]; formatAmount: (n: number) => string; fyStart: string; fyEnd: string }> = ({ accounts, entries, formatAmount, fyStart, fyEnd }) => {
  const [range, setRange] = useState<DateRange>({ from: fyStart, to: fyEnd });
  const periodEntries = useMemo(() => filterEntries(entries, range.from, range.to), [entries, range]);

  const incomeAccounts = accounts.filter(a => a.type === 'Income' && a.isActive);
  const cogsAccounts = accounts.filter(a => a.type === 'Expense' && a.group === 'Cost of Goods Sold' && a.isActive);
  const opexAccounts = accounts.filter(a => a.type === 'Expense' && a.group !== 'Cost of Goods Sold' && a.isActive);

  const getNet = (acc: Account) => {
    const b = getAccountBalance(acc.id, periodEntries, acc.openingBalance, acc.openingBalanceType);
    return acc.type === 'Income' ? b.credit - b.debit : b.debit - b.credit;
  };

  const totalIncome = incomeAccounts.reduce((s, a) => s + getNet(a), 0);
  const totalCOGS = cogsAccounts.reduce((s, a) => s + getNet(a), 0);
  const grossProfit = totalIncome - totalCOGS;
  const totalOpex = opexAccounts.reduce((s, a) => s + getNet(a), 0);
  const netProfit = grossProfit - totalOpex;

  const SectionRow: React.FC<{ account: Account }> = ({ account }) => {
    const net = getNet(account);
    if (net === 0) return null;
    return (
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
        <td className="px-4 py-2 pl-8 text-sm text-slate-700 dark:text-slate-300">{account.name}</td>
        <td className="px-4 py-2 text-right text-sm font-medium text-slate-900 dark:text-white">{formatAmount(net)}</td>
      </tr>
    );
  };

  const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
    <tr className="bg-slate-100 dark:bg-slate-700/60"><td colSpan={2} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{label}</td></tr>
  );

  const TotalRow: React.FC<{ label: string; amount: number; highlight?: boolean; big?: boolean }> = ({ label, amount, highlight, big }) => (
    <tr className={`${highlight ? (amount >= 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10') : 'bg-slate-50 dark:bg-slate-700/40'} border-t border-slate-200 dark:border-slate-600`}>
      <td className={`px-4 py-2.5 font-semibold ${big ? 'text-base' : 'text-sm'} text-slate-800 dark:text-white`}>{label}</td>
      <td className={`px-4 py-2.5 text-right font-bold ${big ? 'text-lg' : 'text-sm'} ${highlight ? (amount >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400') : 'text-slate-900 dark:text-white'}`}>{formatAmount(amount)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <DateRangePicker range={range} onChange={setRange} label="Period:" />
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-w-2xl">
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
          <span className="font-bold text-slate-900 dark:text-white text-lg">Profit & Loss Statement</span>
        </div>
        <table className="w-full">
          <tbody>
            <SectionHeader label="Income" />
            {incomeAccounts.map(a => <SectionRow key={a.id} account={a} />)}
            <TotalRow label="Total Income (A)" amount={totalIncome} />
            <SectionHeader label="Cost of Goods Sold" />
            {cogsAccounts.map(a => <SectionRow key={a.id} account={a} />)}
            <TotalRow label="Total COGS (B)" amount={totalCOGS} />
            <TotalRow label="Gross Profit (A − B)" amount={grossProfit} highlight big />
            <SectionHeader label="Operating Expenses" />
            {opexAccounts.map(a => <SectionRow key={a.id} account={a} />)}
            <TotalRow label="Total Operating Expenses (C)" amount={totalOpex} />
            <TotalRow label="Net Profit / (Loss)" amount={netProfit} highlight big />
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── BALANCE SHEET ────────────────────────────────────────────────────────────

const BalanceSheet: React.FC<{ accounts: Account[]; entries: JournalEntry[]; formatAmount: (n: number) => string; fyEnd: string }> = ({ accounts, entries, formatAmount, fyEnd }) => {
  const [asOf, setAsOf] = useState(fyEnd);
  const periodEntries = useMemo(() => filterEntries(entries, '', asOf), [entries, asOf]);

  const getNetBalance = (acc: Account) => {
    const b = getAccountBalance(acc.id, periodEntries, acc.openingBalance, acc.openingBalanceType);
    return acc.openingBalanceType === 'Dr' ? b.debit - b.credit : b.credit - b.debit;
  };

  const groups: Record<string, Account[]> = {
    'Current Assets': accounts.filter(a => a.type === 'Asset' && ['Cash', 'Bank', 'Current Asset'].includes(a.group) && a.isActive),
    'Fixed Assets': accounts.filter(a => a.type === 'Asset' && a.group === 'Fixed Asset' && a.isActive),
    'Current Liabilities': accounts.filter(a => a.type === 'Liability' && a.group === 'Current Liability' && a.isActive),
    'Long-term Liabilities': accounts.filter(a => a.type === 'Liability' && a.group === 'Long-Term Liability' && a.isActive),
    'Capital': accounts.filter(a => a.type === 'Equity' && a.isActive),
  };

  const sum = (accs: Account[]) => accs.reduce((s, a) => s + getNetBalance(a), 0);

  const totalCurrentAssets = sum(groups['Current Assets']);
  const totalFixedAssets = sum(groups['Fixed Assets']);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const incomeAccs = accounts.filter(a => a.type === 'Income' && a.isActive);
  const expAccs = accounts.filter(a => a.type === 'Expense' && a.isActive);
  const retainedEarnings = incomeAccs.reduce((s, a) => s + getNetBalance(a), 0) - expAccs.reduce((s, a) => s + getNetBalance(a), 0);

  const totalCurrentLiab = sum(groups['Current Liabilities']);
  const totalLTLiab = sum(groups['Long-term Liabilities']);
  const totalCapital = sum(groups['Capital']);
  const totalLE = totalCurrentLiab + totalLTLiab + totalCapital + retainedEarnings;
  const balanced = Math.abs(totalAssets - totalLE) < 1;

  const GroupBlock: React.FC<{ title: string; accs: Account[]; total: number }> = ({ title, accs, total }) => (
    <>
      <tr className="bg-slate-100 dark:bg-slate-700/60"><td colSpan={2} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{title}</td></tr>
      {accs.filter(a => getNetBalance(a) !== 0).map(a => (
        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
          <td className="px-4 py-2 pl-8 text-sm text-slate-700 dark:text-slate-300">{a.name}</td>
          <td className="px-4 py-2 text-right text-sm font-medium text-slate-900 dark:text-white">{formatAmount(getNetBalance(a))}</td>
        </tr>
      ))}
      <tr className="bg-slate-50 dark:bg-slate-700/40 border-t border-slate-200 dark:border-slate-600">
        <td className="px-4 py-2 text-sm font-semibold text-slate-800 dark:text-white">Total {title}</td>
        <td className="px-4 py-2 text-right text-sm font-bold text-slate-900 dark:text-white">{formatAmount(total)}</td>
      </tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">As of:</span>
        <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${balanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {balanced ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          Assets {balanced ? '=' : '≠'} Liabilities + Equity
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700"><span className="font-bold text-blue-700 dark:text-blue-300 uppercase text-xs tracking-wide">Assets</span></div>
          <table className="w-full">
            <tbody>
              <GroupBlock title="Current Assets" accs={groups['Current Assets']} total={totalCurrentAssets} />
              <GroupBlock title="Fixed Assets" accs={groups['Fixed Assets']} total={totalFixedAssets} />
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-700">
                <td className="px-4 py-3 text-base font-bold text-blue-800 dark:text-blue-200">Total Assets</td>
                <td className="px-4 py-3 text-right text-base font-bold text-blue-800 dark:text-blue-200">{formatAmount(totalAssets)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-slate-200 dark:border-slate-700"><span className="font-bold text-purple-700 dark:text-purple-300 uppercase text-xs tracking-wide">Liabilities & Equity</span></div>
          <table className="w-full">
            <tbody>
              <GroupBlock title="Current Liabilities" accs={groups['Current Liabilities']} total={totalCurrentLiab} />
              <GroupBlock title="Long-term Liabilities" accs={groups['Long-term Liabilities']} total={totalLTLiab} />
              <GroupBlock title="Capital & Equity" accs={groups['Capital']} total={totalCapital} />
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                <td className="px-4 py-2 pl-8 text-sm text-slate-700 dark:text-slate-300">Retained Earnings / Net P&L</td>
                <td className={`px-4 py-2 text-right text-sm font-medium ${retainedEarnings >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatAmount(retainedEarnings)}</td>
              </tr>
              <tr className="bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-200 dark:border-purple-700">
                <td className="px-4 py-3 text-base font-bold text-purple-800 dark:text-purple-200">Total L + E</td>
                <td className="px-4 py-3 text-right text-base font-bold text-purple-800 dark:text-purple-200">{formatAmount(totalLE)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── DAY BOOK ─────────────────────────────────────────────────────────────────

const DayBook: React.FC<{ entries: JournalEntry[]; formatAmount: (n: number) => string }> = ({ entries, formatAmount }) => {
  const today = new Date().toISOString().split('T')[0];
  const [range, setRange] = useState<DateRange>({ from: today, to: today });
  const periodEntries = useMemo(() =>
    filterEntries(entries, range.from, range.to).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, range]);

  const totalDebit = periodEntries.reduce((s, e) => s + e.totalDebit, 0);
  const totalCredit = periodEntries.reduce((s, e) => s + e.totalCredit, 0);

  return (
    <div className="space-y-4">
      <DateRangePicker range={range} onChange={setRange} label="Date range:" />
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {periodEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No transactions for selected date range</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className={thCls}>Date</th><th className={thCls}>Voucher #</th><th className={thCls}>Type</th>
                  <th className={thCls}>Narration</th><th className={`${thCls} text-right`}>Debit</th><th className={`${thCls} text-right`}>Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {periodEntries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className={tdCls}>{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{e.entryNumber}</span></td>
                    <td className={tdCls}><span className="text-xs text-slate-500 dark:text-slate-400">{e.entryNumber.split('-')[0]}</span></td>
                    <td className={`${tdCls} truncate max-w-xs`}>{e.narration || '—'}</td>
                    <td className={amtCls}>{formatAmount(e.totalDebit)}</td>
                    <td className={amtCls}>{formatAmount(e.totalCredit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                <tr className="font-bold">
                  <td colSpan={4} className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">Total ({periodEntries.length} entries)</td>
                  <td className={amtCls}>{formatAmount(totalDebit)}</td>
                  <td className={amtCls}>{formatAmount(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

type Tab = 'ledger' | 'trial' | 'pl' | 'bs' | 'daybook';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'ledger',   label: 'General Ledger', icon: BookOpen },
  { id: 'trial',    label: 'Trial Balance',  icon: Scale },
  { id: 'pl',       label: 'Profit & Loss',  icon: TrendingUp },
  { id: 'bs',       label: 'Balance Sheet',  icon: BarChart3 },
  { id: 'daybook',  label: 'Day Book',       icon: CalendarDays },
];

const AccountingReports: React.FC = () => {
  const { accounts, journalEntries, formatAmount, companySettings } = useData();
  const [tab, setTab] = useState<Tab>('ledger');

  const fyStart = companySettings.financialYearStart;
  const fyEnd = companySettings.financialYearEnd;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accounting Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Financial year: {fyStart} to {fyEnd}</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={tabCls(tab === t.id)}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'ledger'  && <GeneralLedger accounts={accounts} entries={journalEntries} formatAmount={formatAmount} fyStart={fyStart} fyEnd={fyEnd} />}
      {tab === 'trial'   && <TrialBalance accounts={accounts} entries={journalEntries} formatAmount={formatAmount} fyStart={fyStart} fyEnd={fyEnd} />}
      {tab === 'pl'      && <ProfitLoss accounts={accounts} entries={journalEntries} formatAmount={formatAmount} fyStart={fyStart} fyEnd={fyEnd} />}
      {tab === 'bs'      && <BalanceSheet accounts={accounts} entries={journalEntries} formatAmount={formatAmount} fyEnd={fyEnd} />}
      {tab === 'daybook' && <DayBook entries={journalEntries} formatAmount={formatAmount} />}
    </div>
  );
};

export default AccountingReports;
