import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { InventoryMovement } from '../../types';
import { Package, ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus, X, Search, AlertTriangle, Boxes } from 'lucide-react';

const fmt = (n: number) => `د.إ ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type MovType = 'in' | 'out' | 'adjustment';

const Inventory: React.FC = () => {
  const { products, setProducts, inventory, setInventory } = useData();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [formProductId, setFormProductId] = useState('');
  const [formType, setFormType] = useState<MovType>('in');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formReference, setFormReference] = useState('');
  const [formReason, setFormReason] = useState('');

  const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.costPrice ?? 0) * p.stock, 0);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const sortedMovements = [...inventory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock < 10) return { label: 'Low Stock', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    if (stock < 25) return { label: 'Adequate', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    return { label: 'Well Stocked', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  const openAdd = () => {
    setFormProductId('');
    setFormType('in');
    setFormQuantity(1);
    setFormReference('');
    setFormReason('');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formProductId) { alert('Please select a product'); return; }
    if (formQuantity <= 0) { alert('Quantity must be greater than 0'); return; }

    const product = products.find(p => p.id === formProductId);
    if (!product) return;

    let newStock = product.stock;
    if (formType === 'in') newStock = product.stock + formQuantity;
    else if (formType === 'out') newStock = Math.max(0, product.stock - formQuantity);
    else newStock = formQuantity; // adjustment sets absolute value

    setProducts(prev => prev.map(p =>
      p.id === formProductId ? { ...p, stock: newStock, updatedAt: new Date() } : p
    ));

    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      productId: formProductId,
      productName: product.name,
      type: formType,
      quantity: formQuantity,
      reference: formReference || 'Manual',
      reason: formReason || `Stock ${formType}`,
      createdAt: new Date(),
    };

    setInventory(prev => [movement, ...prev]);
    setModalOpen(false);
  };

  const movIcon = (type: MovType) => {
    if (type === 'in') return <ArrowDownCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (type === 'out') return <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  const movColor = (type: MovType) => {
    if (type === 'in') return 'text-green-600 dark:text-green-400';
    if (type === 'out') return 'text-red-600 dark:text-red-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Track stock levels and movements</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-md shadow-blue-600/20 text-sm">
          <Plus className="h-4 w-4" />Add Movement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', sub: 'In catalog' },
          { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', sub: 'Below 10 units' },
          { label: 'Out of Stock', value: outOfStock, icon: Boxes, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', sub: 'Need restocking' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.label}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Stock Levels Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="font-semibold text-slate-900 dark:text-white flex-1">Stock Levels</h2>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Value: <span className="font-semibold text-slate-900 dark:text-white">{fmt(totalValue)}</span>
          </div>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Unit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Valuation</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map(p => {
                  const status = stockStatus(p.stock);
                  const valuation = (p.costPrice ?? 0) * p.stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:hidden">{p.category}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{p.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-600 dark:text-red-400' : p.stock < 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-900 dark:text-white'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{p.unit}</td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-medium hidden lg:table-cell">{fmt(valuation)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Log */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Stock Movement Log</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recent inventory changes</p>
        </div>
        {sortedMovements.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No movements recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Reason</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sortedMovements.slice(0, 30).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {movIcon(m.type)}
                        <span className={`text-xs font-medium capitalize ${movColor(m.type)}`}>{m.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{m.productName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${movColor(m.type)}`}>
                        {m.type === 'out' ? '-' : '+'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell font-mono text-xs">{m.reference}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell">{m.reason}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">{new Date(m.createdAt).toLocaleDateString('en-AE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Movement Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md z-10">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Stock Movement</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Product *</label>
                <select value={formProductId} onChange={e => setFormProductId(e.target.value)} className={inputCls}>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock} {p.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Movement Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'in', label: 'Stock In', icon: ArrowDownCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' },
                    { value: 'out', label: 'Stock Out', icon: ArrowUpCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' },
                    { value: 'adjustment', label: 'Adjustment', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' },
                  ] as const).map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${formType === t.value ? `${t.bg} border-current` : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <t.icon className={`h-5 w-5 ${formType === t.value ? t.color : 'text-slate-400'}`} />
                      <span className={`text-xs font-medium ${formType === t.value ? t.color : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
                {formType === 'adjustment' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adjustment sets the absolute stock quantity</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {formType === 'adjustment' ? 'Set Stock To' : 'Quantity'}
                </label>
                <input type="number" min={1} value={formQuantity} onChange={e => setFormQuantity(parseInt(e.target.value) || 1)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reference (e.g. PO number)</label>
                <input value={formReference} onChange={e => setFormReference(e.target.value)} className={inputCls} placeholder="e.g. PO-1001, INV-1001" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reason</label>
                <input value={formReason} onChange={e => setFormReason(e.target.value)} className={inputCls} placeholder="e.g. Stock adjustment, Return, Damage" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">Save Movement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
