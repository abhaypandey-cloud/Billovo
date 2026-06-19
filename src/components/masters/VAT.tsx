import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { VATConfig } from '../../types';
import { Percent, Save, CheckCircle2, Building2, Calendar, FileText } from 'lucide-react';

const VAT_CATEGORIES = [
  {
    code: 'STANDARD',
    label: 'Standard Rate',
    rate: '5%',
    description: 'Applies to most goods and services in the UAE',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  {
    code: 'ZERO_RATED',
    label: 'Zero-Rated',
    rate: '0%',
    description: 'Exports, international transport, certain food items, healthcare, education',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  {
    code: 'EXEMPT',
    label: 'Exempt',
    rate: 'N/A',
    description: 'Financial services, residential properties, bare land, local passenger transport',
    color: 'text-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-700/30',
    border: 'border-slate-200 dark:border-slate-700',
  },
];

const VAT: React.FC = () => {
  const { vatConfig, setVatConfig } = useData();
  const [form, setForm] = useState<VATConfig>({ ...vatConfig });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setVatConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">VAT Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">UAE Federal Tax Authority (FTA) configuration</p>
      </div>

      {/* Current Settings Banner */}
      <div className="bg-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Percent className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold">UAE VAT — 5%</div>
            <div className="text-blue-100 text-sm mt-0.5">Standard rate effective from 1 January 2018</div>
            <div className="mt-2 text-xs text-blue-200">
              TRN: <span className="font-mono font-medium text-white">{vatConfig.companyTRN || 'Not configured'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company VAT Registration */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">Company VAT Registration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your FTA-registered company details</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <Building2 className="h-3.5 w-3.5" /> Company Name
              </label>
              <input
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className={inputCls}
                placeholder="Your trading name as registered with FTA"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <FileText className="h-3.5 w-3.5" /> Tax Registration Number (TRN)
              </label>
              <input
                value={form.companyTRN}
                onChange={e => setForm({ ...form, companyTRN: e.target.value })}
                className={inputCls}
                placeholder="15-digit TRN (e.g. 100123456700003)"
                maxLength={15}
              />
              <p className="text-xs text-slate-400 mt-1">This will appear on all your tax invoices</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <Calendar className="h-3.5 w-3.5" /> VAT Registration Date
              </label>
              <input
                type="date"
                value={form.vatRegistrationDate}
                onChange={e => setForm({ ...form, vatRegistrationDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <Percent className="h-3.5 w-3.5" /> Default VAT Rate (%)
              </label>
              <input
                type="number"
                value={form.defaultVATRate}
                onChange={e => setForm({ ...form, defaultVATRate: parseFloat(e.target.value) || 5 })}
                className={inputCls}
                min={0}
                max={100}
                step={0.01}
              />
              <p className="text-xs text-slate-400 mt-1">UAE standard VAT rate is 5%</p>
            </div>

            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-md shadow-blue-600/20"
            >
              {saved ? (
                <><CheckCircle2 className="h-4 w-4" />Saved!</>
              ) : (
                <><Save className="h-4 w-4" />Save Settings</>
              )}
            </button>
          </div>
        </div>

        {/* VAT Categories Reference */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">VAT Categories</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">UAE FTA VAT treatment classification</p>
          </div>
          <div className="p-6 space-y-4">
            {VAT_CATEGORIES.map(cat => (
              <div key={cat.code} className={`border ${cat.border} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-2 font-semibold text-sm ${cat.color}`}>
                    <div className={`w-7 h-7 rounded-lg ${cat.bg} flex items-center justify-center`}>
                      <Percent className="h-3.5 w-3.5" />
                    </div>
                    {cat.label}
                  </div>
                  <span className={`text-sm font-bold ${cat.color}`}>{cat.rate}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FTA Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 text-sm">UAE VAT Compliance Reminder</h3>
        <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 list-disc list-inside">
          <li>Businesses with taxable supplies exceeding AED 375,000/year must register for VAT</li>
          <li>Voluntary registration is available for businesses exceeding AED 187,500/year</li>
          <li>Tax invoices must include your TRN for B2B transactions above AED 10,000</li>
          <li>VAT returns are filed quarterly (or monthly for some businesses)</li>
          <li>The current standard rate is 5% (effective from 1 January 2018)</li>
        </ul>
      </div>
    </div>
  );
};

export default VAT;
