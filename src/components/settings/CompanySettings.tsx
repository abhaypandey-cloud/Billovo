import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { CompanySettings, CountryCode } from '../../types';
import { COUNTRY_CONFIGS, getDefaultAccounts } from '../../utils/countryConfig';
import {
  Building2, Globe, Save, CheckCircle2, AlertTriangle, Info,
  Phone, Mail, MapPin, FileText, Calendar, Percent
} from 'lucide-react';

const CompanySettingsPage: React.FC = () => {
  const { companySettings, setCompanySettings, setAccounts } = useData();
  const [form, setForm] = useState<CompanySettings>({ ...companySettings });
  const [saved, setSaved] = useState(false);
  const [showCountryWarning, setShowCountryWarning] = useState(false);

  const selectedCountry = COUNTRY_CONFIGS[form.country];
  const currentCountry = COUNTRY_CONFIGS[companySettings.country];
  const countryChanged = form.country !== companySettings.country;

  const handleCountryChange = (code: CountryCode) => {
    const config = COUNTRY_CONFIGS[code];
    setForm(prev => ({
      ...prev,
      country: code,
      defaultTaxRate: config.defaultTaxRate,
      state: config.states?.[0] ?? '',
      // Clear old tax IDs
      gstin: '', pan: '', trn: '', ein: '', abn: '', gstNumber: '', vatNumber: '',
    }));
    if (code !== companySettings.country) setShowCountryWarning(true);
    else setShowCountryWarning(false);
  };

  const handleSave = () => {
    setCompanySettings(form);
    // If country changed, reinitialize chart of accounts
    if (countryChanged) {
      const newAccounts = getDefaultAccounts(form.country).map((a, i) => ({
        ...a,
        id: `acc-${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      setAccounts(newAccounts);
    }
    setSaved(true);
    setShowCountryWarning(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

  const countryFlags: Record<CountryCode, string> = {
    IN: '🇮🇳', AE: '🇦🇪', US: '🇺🇸', UK: '🇬🇧', AU: '🇦🇺',
    SG: '🇸🇬', MY: '🇲🇾', SA: '🇸🇦', OTHER: '🌍'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Configure your business details, country and tax settings</p>
      </div>

      {/* Country Banner */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 ${
        form.country === 'IN' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
        form.country === 'AE' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      }`}>
        <div className="text-4xl">{countryFlags[form.country]}</div>
        <div className="flex-1">
          <div className="font-bold text-slate-900 dark:text-white text-lg">{selectedCountry.name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selectedCountry.taxLabel} ({selectedCountry.defaultTaxRate}%) · {selectedCountry.currency} · {selectedCountry.taxIdLabel}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
            Tax System: <span className="font-medium">{selectedCountry.taxSystem.replace(/_/g, ' ')}</span>
            {selectedCountry.hasMultipleTaxComponents && ' · Multi-component (CGST/SGST/IGST)'}
          </div>
        </div>
        {form.country === 'IN' && (
          <div className="text-right text-xs text-orange-700 dark:text-orange-300 font-medium">
            GSTR-1, GSTR-2, GSTR-3B<br/>reports available
          </div>
        )}
      </div>

      {/* Country Warning */}
      {showCountryWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <div className="font-semibold">Country Change Warning</div>
            <div className="mt-0.5">Changing country will reset the Chart of Accounts to country-specific defaults. Your existing transactions will be preserved. Save to apply.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Country Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" /> Country & Tax System
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {(Object.keys(COUNTRY_CONFIGS) as CountryCode[]).map(code => {
              const config = COUNTRY_CONFIGS[code];
              const isSelected = form.country === code;
              return (
                <button
                  key={code}
                  onClick={() => handleCountryChange(code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-2xl">{countryFlags[code]}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                      {config.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {config.taxLabel} · {config.currency} · {config.taxIdLabel}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Business Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Company Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Your Business Name" />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{selectedCountry.states?.length ? 'State / Region' : 'State'}</label>
                  {selectedCountry.states?.length ? (
                    <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className={inputCls}>
                      {selectedCountry.states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className={inputCls} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Pincode / ZIP</label>
                  <input value={form.pincode ?? ''} onChange={e => setForm({ ...form, pincode: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input value={form.website ?? ''} onChange={e => setForm({ ...form, website: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* Tax Registration */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-600" /> Tax Registration
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* India specific */}
              {form.country === 'IN' && (
                <>
                  <div>
                    <label className={labelCls}>GSTIN *</label>
                    <input value={form.gstin ?? ''} onChange={e => setForm({ ...form, gstin: e.target.value })} className={inputCls} placeholder="27AABCU9603R1ZX" maxLength={15} />
                    <p className="text-xs text-slate-400 mt-0.5">15-character GST Identification Number</p>
                  </div>
                  <div>
                    <label className={labelCls}>PAN</label>
                    <input value={form.pan ?? ''} onChange={e => setForm({ ...form, pan: e.target.value })} className={inputCls} placeholder="AABCU9603R" maxLength={10} />
                  </div>
                </>
              )}
              {/* UAE specific */}
              {form.country === 'AE' && (
                <div>
                  <label className={labelCls}>TRN (Tax Registration Number)</label>
                  <input value={form.trn ?? ''} onChange={e => setForm({ ...form, trn: e.target.value })} className={inputCls} placeholder="100123456700003" maxLength={15} />
                </div>
              )}
              {/* US specific */}
              {form.country === 'US' && (
                <div>
                  <label className={labelCls}>EIN</label>
                  <input value={form.ein ?? ''} onChange={e => setForm({ ...form, ein: e.target.value })} className={inputCls} placeholder="12-3456789" />
                </div>
              )}
              {/* Australia specific */}
              {form.country === 'AU' && (
                <div>
                  <label className={labelCls}>ABN</label>
                  <input value={form.abn ?? ''} onChange={e => setForm({ ...form, abn: e.target.value })} className={inputCls} placeholder="51 824 753 556" />
                </div>
              )}
              {/* SG/MY generic GST */}
              {(form.country === 'SG' || form.country === 'MY') && (
                <div>
                  <label className={labelCls}>GST Registration Number</label>
                  <input value={form.gstNumber ?? ''} onChange={e => setForm({ ...form, gstNumber: e.target.value })} className={inputCls} />
                </div>
              )}
              {/* UK/SA/Other VAT */}
              {(form.country === 'UK' || form.country === 'SA' || form.country === 'OTHER') && (
                <div>
                  <label className={labelCls}>VAT Number</label>
                  <input value={form.vatNumber ?? ''} onChange={e => setForm({ ...form, vatNumber: e.target.value })} className={inputCls} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Registration Date</label>
                  <input type="date" value={form.taxRegistrationDate} onChange={e => setForm({ ...form, taxRegistrationDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Default Tax Rate (%)</label>
                  <input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: parseFloat(e.target.value) || 0 })} className={inputCls} min={0} max={100} step={0.01} />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Year */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" /> Financial Year
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>FY Start Date</label>
                  <input type="date" value={form.financialYearStart} onChange={e => setForm({ ...form, financialYearStart: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>FY End Date</label>
                  <input type="date" value={form.financialYearEnd} onChange={e => setForm({ ...form, financialYearEnd: e.target.value })} className={inputCls} />
                </div>
              </div>
              {form.country === 'IN' && (
                <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  India Financial Year: April 1 to March 31
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-md shadow-blue-600/20"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CompanySettingsPage;
