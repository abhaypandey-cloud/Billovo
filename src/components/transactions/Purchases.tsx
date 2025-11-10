import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Purchase, PurchaseItem } from '../../types';
import { Plus, Edit, Trash2, Search, Eye, X } from 'lucide-react';

const Purchases: React.FC = () => {
  const { purchases, setPurchases, suppliers, products, setProducts } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    items: [] as PurchaseItem[],
    discount: '',
    tax: '',
    status: 'pending' as 'pending' | 'received' | 'cancelled',
  });

  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '',
    price: '',
  });

  const filteredPurchases = purchases.filter(purchase =>
    purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [],
      discount: '',
      tax: '',
      status: 'pending',
    });
    setNewItem({ productId: '', quantity: '', price: '' });
    setEditingPurchase(null);
    setShowForm(false);
  };

  const addItem = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.price) return;

    const product = products.find(p => p.id === newItem.productId);
    if (!product) return;

    const quantity = parseInt(newItem.quantity);
    const price = parseFloat(newItem.price);
    const total = price * quantity;

    const item: PurchaseItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      price,
      total,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({ productId: '', quantity: '', price: '' });
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(formData.discount) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal + tax - discount;
    return { subtotal, discount, tax, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const supplier = suppliers.find(s => s.id === formData.supplierId);
    if (!supplier) {
      alert('Please select a supplier');
      return;
    }

    const { subtotal, discount, tax, total } = calculateTotals();

    if (editingPurchase) {
      // Update existing purchase
      setPurchases(prev => prev.map(purchase => 
        purchase.id === editingPurchase.id
          ? {
              ...purchase,
              supplierId: formData.supplierId,
              supplierName: supplier.name,
              items: formData.items,
              subtotal,
              tax,
              discount,
              total,
              status: formData.status,
              updatedAt: new Date(),
            }
          : purchase
      ));
    } else {
      // Add new purchase
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        supplierId: formData.supplierId,
        supplierName: supplier.name,
        items: formData.items,
        subtotal,
        tax,
        discount,
        total,
        status: formData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPurchases(prev => [...prev, newPurchase]);

      // Update product stock if status is received
      if (formData.status === 'received') {
        formData.items.forEach(item => {
          setProducts(prev => prev.map(product => 
            product.id === item.productId
              ? { ...product, stock: product.stock + item.quantity, price: item.price }
              : product
          ));
        });
      }
    }

    resetForm();
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierId: purchase.supplierId,
      items: purchase.items,
      discount: purchase.discount.toString(),
      tax: purchase.tax.toString(),
      status: purchase.status,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      setPurchases(prev => prev.filter(purchase => purchase.id !== id));
    }
  };

  const { subtotal, discount, tax, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Purchase
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search purchases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{purchase.id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.items.length} item{purchase.items.length > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    ₹{purchase.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                      purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setViewingPurchase(purchase)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPurchases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No purchases found</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingPurchase ? 'Edit Purchase' : 'New Purchase'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Items */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
                  
                  {/* Add Item Form */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <select
                        value={newItem.productId}
                        onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">₹{item.price}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">₹{item.total}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Totals and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tax}
                        onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="text-sm font-medium">₹{discount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tax:</span>
                        <span className="text-sm font-medium">₹{tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total:</span>
                        <span>₹{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingPurchase ? 'Update' : 'Create'} Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Purchase Details</h2>
                <button
                  onClick={() => setViewingPurchase(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Purchase ID:</span>
                    <p className="font-medium">#{viewingPurchase.id.slice(-6)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Supplier:</span>
                    <p className="font-medium">{viewingPurchase.supplierName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Date:</span>
                    <p className="font-medium">{new Date(viewingPurchase.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      viewingPurchase.status === 'received' ? 'bg-green-100 text-green-800' :
                      viewingPurchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {viewingPurchase.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingPurchase.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{item.price}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium">₹{viewingPurchase.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="text-sm font-medium">₹{viewingPurchase.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="text-sm font-medium">₹{viewingPurchase.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>₹{viewingPurchase.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;