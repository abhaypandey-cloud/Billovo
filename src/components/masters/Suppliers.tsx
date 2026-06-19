import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Supplier } from '../../types';
import { Plus, Search, Edit2, Trash2, Truck, X, Phone, Mail, MapPin } from 'lucide-react';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Immediate', 'Advance'];

const emptyForm = (): Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  emirate: 'Dubai',
  trn: '',
  iban: '',
  paymentTerms: 'Net 30',
  status: 'active',
});

const Suppliers: React.FC = () => {
  const { suppliers, setSuppliers } = useData();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    (s.trn && s.trn.includes(search))
  );

  const activeCount = suppliers.filter(s => s.status === 'active').length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      emirate: s.emirate,
      trn: s.trn ?? '',
      iban: s.iban ?? '',
      paymentTerms: s.paymentTerms,
      status: s.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    if (editing) {
      setSuppliers(prev => prev.map(s =>
        s.id === editing.id ? { ...s, ...form, updatedAt: new Date() } : s
      ));
    } else {
      setSuppliers(prev => [{
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }, ...prev]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 rounded-xl border ${errors[field] ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suppliers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your supplier accounts</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Active', value: activeCount, icon: Truck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers by name, email, phone, or TRN..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {suppliers.length === 0 ? 'No suppliers yet. Add your first supplier.' : 'No suppliers match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden xl:table-cell">IBAN</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                      {s.trn && <div className="text-xs text-slate-500 dark:text-slate-400">TRN: {s.trn}</div>}
                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.paymentTerms}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                        <Mail className="h-3 w-3" />{s.email}
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                        <Phone className="h-3 w-3" />{s.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                        <MapPin className="h-3 w-3" />{s.emirate}
                      </div>
                      {s.city && <div className="text-xs text-slate-500 dark:text-slate-500">{s.city}</div>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {s.iban ? s.iban.replace(/(.{4})/g, '$1 ').trim() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Company / Supplier Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls('name')} placeholder="Supplier name" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls('email')} placeholder="email@company.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls('phone')} placeholder="+971 4 000 0000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls('address')} placeholder="Street address, building" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">City</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputCls('city')} placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Emirate</label>
                  <select value={form.emirate} onChange={e => setForm({ ...form, emirate: e.target.value })} className={inputCls('emirate')}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">TRN (Tax Registration Number)</label>
                <input value={form.trn} onChange={e => setForm({ ...form, trn: e.target.value })} className={inputCls('trn')} placeholder="Optional — 15 digits" maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">IBAN</label>
                <input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className={inputCls('iban')} placeholder="AE00 0000 0000 0000 0000 000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Terms</label>
                  <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className={inputCls('paymentTerms')}>
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={inputCls('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">{editing ? 'Save Changes' : 'Add Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Supplier</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently delete the supplier. This action cannot be undone.</p>
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

export default Suppliers;
