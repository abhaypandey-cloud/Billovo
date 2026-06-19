import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Product } from '../../types';
import { Plus, Search, Edit2, Trash2, Package, X, Filter } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Clothing', 'Food & Beverage', 'Cosmetics', 'Stationery', 'Other'];
const VAT_CATEGORIES = [
  { value: 'STANDARD', label: 'Standard Rate (5%)' },
  { value: 'ZERO_RATED', label: 'Zero-Rated (0%)' },
  { value: 'EXEMPT', label: 'Exempt' },
] as const;
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'pair', 'set', 'roll', 'm', 'sqm'];

const fmt = (n: number) => `د.إ ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyForm = (): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  description: '',
  price: 0,
  costPrice: 0,
  category: 'Electronics',
  stock: 0,
  unit: 'pcs',
  vatCategory: 'STANDARD',
});

const Products: React.FC = () => {
  const { products, setProducts } = useData();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat ? p.category === filterCat : true;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      costPrice: p.costPrice,
      category: p.category,
      stock: p.stock,
      unit: p.unit,
      vatCategory: p.vatCategory,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (form.price < 0) e.price = 'Price cannot be negative';
    if (form.costPrice < 0) e.costPrice = 'Cost price cannot be negative';
    if (form.stock < 0) e.stock = 'Stock cannot be negative';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    if (editing) {
      setProducts(prev => prev.map(p =>
        p.id === editing.id ? { ...p, ...form, updatedAt: new Date() } : p
      ));
    } else {
      const newProduct: Product = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  };

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock < 10) return { label: 'Low Stock', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: 'In Stock', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 rounded-xl border ${errors[field] ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">{products.length}</span> total products
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <Package className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {products.length === 0 ? 'No products yet. Add your first product.' : 'No products match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const stock = stockStatus(p.stock);
            return (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-0.5 truncate">{p.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">{p.description || p.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{fmt(p.price)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stock.cls}`}>{stock.label}</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{p.category}</span>
                  <span className="font-medium">{p.stock} {p.unit}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  VAT: {p.vatCategory === 'STANDARD' ? '5%' : p.vatCategory === 'ZERO_RATED' ? '0%' : 'Exempt'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Product Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls('name')} placeholder="e.g. Laptop Stand" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls('description')} placeholder="Product description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Selling Price (AED) *</label>
                  <input type="number" min={0} step={0.01} value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className={inputCls('price')} />
                  {errors.price && <p className="text-xs text-red-500 mt-0.5">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cost Price (AED)</label>
                  <input type="number" min={0} step={0.01} value={form.costPrice} onChange={e => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} className={inputCls('costPrice')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">VAT Category</label>
                  <select value={form.vatCategory} onChange={e => setForm({ ...form, vatCategory: e.target.value as Product['vatCategory'] })} className={inputCls('vatCategory')}>
                    {VAT_CATEGORIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Current Stock</label>
                  <input type="number" min={0} value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className={inputCls('stock')} />
                  {errors.stock && <p className="text-xs text-red-500 mt-0.5">{errors.stock}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputCls('unit')}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Product</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
