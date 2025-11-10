import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { InventoryMovement } from '../../types';
import { Plus, Search, Package, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';

const Inventory: React.FC = () => {
  const { products, inventory, setInventory, setProducts } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');

  const [formData, setFormData] = useState({
    productId: '',
    type: 'adjustment' as 'in' | 'out' | 'adjustment',
    quantity: '',
    reason: '',
    reference: '',
  });

  const filteredInventory = inventory.filter(movement => {
    const matchesSearch = movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || movement.type === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      productId: '',
      type: 'adjustment',
      quantity: '',
      reason: '',
      reference: '',
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const product = products.find(p => p.id === formData.productId);
    if (!product) {
      alert('Please select a product');
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    // Check if we have enough stock for 'out' movements
    if (formData.type === 'out' && product.stock < quantity) {
      alert('Insufficient stock for this operation');
      return;
    }

    // Create inventory movement
    const newMovement: InventoryMovement = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      type: formData.type,
      quantity,
      reference: formData.reference,
      reason: formData.reason,
      createdAt: new Date(),
    };

    setInventory(prev => [newMovement, ...prev]);

    // Update product stock
    let stockChange = 0;
    if (formData.type === 'in' || formData.type === 'adjustment') {
      stockChange = quantity;
    } else if (formData.type === 'out') {
      stockChange = -quantity;
    }

    setProducts(prev => prev.map(p => 
      p.id === product.id
        ? { ...p, stock: Math.max(0, p.stock + stockChange) }
        : p
    ));

    resetForm();
  };

  const lowStockProducts = products.filter(product => product.stock < 10);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Movement
        </button>
      </div>

      {/* Inventory Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Total Products</h3>
              <p className="text-2xl font-bold text-green-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Low Stock</h3>
              <p className="text-2xl font-bold text-yellow-900">{lowStockProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Out of Stock</h3>
              <p className="text-2xl font-bold text-red-900">{outOfStockProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="space-y-4">
          {outOfStockProducts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Out of Stock Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outOfStockProducts.slice(0, 6).map(product => (
                  <div key={product.id} className="bg-white p-3 rounded-lg border border-red-200">
                    <p className="font-medium text-red-900">{product.name}</p>
                    <p className="text-sm text-red-700">{product.category}</p>
                  </div>
                ))}
              </div>
              {outOfStockProducts.length > 6 && (
                <p className="text-sm text-red-700 mt-3">
                  +{outOfStockProducts.length - 6} more products out of stock
                </p>
              )}
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Low Stock Products (less than 10 units)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockProducts.slice(0, 6).map(product => (
                  <div key={product.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                    <p className="font-medium text-yellow-900">{product.name}</p>
                    <p className="text-sm text-yellow-700">{product.category} - {product.stock} {product.unit} left</p>
                  </div>
                ))}
              </div>
              {lowStockProducts.length > 6 && (
                <p className="text-sm text-yellow-700 mt-3">
                  +{lowStockProducts.length - 6} more products with low stock
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory movements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Movements</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjustment">Adjustments</option>
        </select>
      </div>

      {/* Current Stock Levels */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(product.stock * product.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      product.stock === 0 ? 'bg-red-100 text-red-800' :
                      product.stock < 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' :
                       product.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Movements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {movement.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {movement.type === 'in' && <TrendingUp className="h-4 w-4 mr-2 text-green-500" />}
                      {movement.type === 'out' && <TrendingDown className="h-4 w-4 mr-2 text-red-500" />}
                      {movement.type === 'adjustment' && <Package className="h-4 w-4 mr-2 text-blue-500" />}
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        movement.type === 'in' ? 'bg-green-100 text-green-800' :
                        movement.type === 'out' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {movement.type === 'in' ? 'Stock In' :
                         movement.type === 'out' ? 'Stock Out' : 'Adjustment'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No inventory movements found</p>
        </div>
      )}

      {/* Add Movement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Inventory Movement</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Current: {product.stock} {product.unit})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Stock Adjustment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., PO#123, Sale#456, Manual Adjustment"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    required
                    placeholder="Reason for this inventory movement"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
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
                    Add Movement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;